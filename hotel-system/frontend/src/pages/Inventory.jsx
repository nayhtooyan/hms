import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";

const REASONS = {
  in: ["purchase", "opening_balance", "return_supplier", "other"],
  out: ["housekeeping_use", "maintenance_use", "damaged", "missing_lost", "expired", "other"],
  adjust: ["count_correction", "damaged", "missing_lost", "other"]
};

const CATEGORIES = ["linen", "housekeeping", "maintenance"];
const UNITS = ["pcs", "box", "pack", "bottle", "can", "case", "bag", "roll", "set", "pair", "liter", "tube"];

export default function Inventory() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const [itemModal, setItemModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "linen", unit: "pcs", price: "", minStock: "", openingStock: "" });
  const [savingItem, setSavingItem] = useState(false);

  const [moveModal, setMoveModal] = useState(false);
  const [moveItem, setMoveItem] = useState(null);
  const [moveType, setMoveType] = useState("in");
  const [moveForm, setMoveForm] = useState({ qty: "", reason: "purchase", note: "" });
  const [savingMove, setSavingMove] = useState(false);

  const [historyItem, setHistoryItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = ["admin", "manager"].includes(user?.role);
  const canOut = ["admin", "manager", "cleaner", "maintenance"].includes(user?.role);

  /* translation helpers */
  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const displayName = (item) => (item?.nameKey ? tr(item.nameKey, item.name) : item?.name || "-");
  const displayUnit = (u) => tr(`unit_${u}`, u);

  const load = async () => {
    try {
      const res = await api.get("/inventory");
      setItems(res.data);
    } catch {
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useRealTimeRefresh(load, ["inventory:updated"]);

  /* item form */
  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "linen", unit: "pcs", price: "", minStock: "", openingStock: "" });
    setItemModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: displayName(item),
      category: item.category,
      unit: item.unit,
      price: item.price,
      minStock: item.minStock,
      openingStock: ""
    });
    setItemModal(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    try {
      setSavingItem(true);
      if (editing) {
        await api.put(`/inventory/${editing._id}`, {
          name: form.name, category: form.category, unit: form.unit,
          price: Number(form.price || 0), minStock: Number(form.minStock || 0)
        });
      } else {
        await api.post("/inventory", {
          name: form.name, category: form.category, unit: form.unit,
          price: Number(form.price || 0), minStock: Number(form.minStock || 0),
          openingStock: Number(form.openingStock || 0)
        });
      }
      addToast(t("itemSaved"));
      setItemModal(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setSavingItem(false);
    }
  };

  /* delete */
  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/inventory/${confirmDelete._id}`);
      addToast(t("itemDeleted"));
      setConfirmDelete(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setDeleting(false);
    }
  };

  /* movements */
  const openMove = (item, type) => {
    setMoveItem(item);
    setMoveType(type);
    setMoveForm({ qty: "", reason: REASONS[type][0], note: "" });
    setMoveModal(true);
  };

  const saveMove = async (e) => {
    e.preventDefault();
    try {
      setSavingMove(true);
      await api.post(`/inventory/${moveItem._id}/movement`, {
        type: moveType,
        qty: Number(moveForm.qty),
        reason: moveForm.reason,
        note: moveForm.note
      });
      addToast(t("movementSaved"));
      setMoveModal(false);
      load();
      if (historyItem && historyItem._id === moveItem._id) openHistory(moveItem);
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setSavingMove(false);
    }
  };

  const openHistory = async (item) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/inventory/${item._id}/movements`);
      setMovements(res.data);
    } catch {
      setMovements([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const seed = async () => {
    try {
      setSeeding(true);
      const res = await api.post("/inventory/seed");
      addToast(`${t("seedDone")} (+${res.data.created} / ↺${res.data.restored})`);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setSeeding(false);
    }
  };

  /* derived */
  const filtered = tab === "all" ? items : items.filter((i) => i.category === tab);
  const lowCount = items.filter((i) => i.minStock > 0 && i.stock <= i.minStock).length;
  const totalValue = items.reduce((s, i) => s + i.stock * i.price, 0);

  const stockClass = (i) => {
    if (i.minStock > 0 && i.stock <= i.minStock) return "text-red-400 font-bold";
    if (i.minStock > 0 && i.stock <= i.minStock * 1.5) return "text-amber-400 font-bold";
    return "text-white font-bold";
  };

  const typeBadge = { in: "badge-emerald", out: "badge-red", adjust: "badge-amber" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title-dark">{t("inventoryTitle")}</h1>
          <p className="page-subtitle-dark">{t("inventorySubtitle")}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {items.length === 0 && (
              <button onClick={seed} disabled={seeding} className="btn-secondary text-sm py-2">
                {seeding ? t("loading") : t("seedDefaults")}
              </button>
            )}
            <button onClick={openAdd} className="btn-primary text-sm py-2">+ {t("addItem")}</button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-dark p-4">
          <p className="text-[10px] uppercase font-bold text-gray-500">{t("totalItems")}</p>
          <p className="text-2xl font-extrabold text-white mt-1">{items.length}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-[10px] uppercase font-bold text-gray-500">{t("lowStock")}</p>
          <p className={`text-2xl font-extrabold mt-1 ${lowCount > 0 ? "text-red-400" : "text-emerald-400"}`}>{lowCount}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-[10px] uppercase font-bold text-gray-500">{t("inventoryValue")}</p>
          <p className="text-2xl font-extrabold text-purple-300 mt-1">{formatMoney(totalValue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {["all", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === c
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                : "bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {c === "all" ? t("all") : t(c)} · {c === "all" ? items.length : items.filter((i) => i.category === c).length}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>{t("itemName")}</th>
                <th>{t("currentStock")}</th>
                <th>{t("unit")}</th>
                <th>{t("pricePerUnit")}</th>
                <th>{t("stockValue")}</th>
                <th>{t("minStock")}</th>
                <th className="text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id}>
                  <td>
                    <p className="font-semibold text-white">{displayName(item)}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{t(item.category)}</p>
                  </td>
                  <td className={stockClass(item)}>{item.stock}</td>
                  <td className="text-gray-400">{displayUnit(item.unit)}</td>
                  <td className="text-gray-300">{formatMoney(item.price)}</td>
                  <td className="text-gray-300">{formatMoney(item.stock * item.price)}</td>
                  <td className="text-gray-500">{item.minStock}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {canManage && (
                        <button onClick={() => openMove(item, "in")} className="px-2 py-1 text-[10px] rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold hover:bg-emerald-500/25">
                          + {t("stockIn")}
                        </button>
                      )}
                      {canOut && (
                        <button onClick={() => openMove(item, "out")} className="px-2 py-1 text-[10px] rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 font-bold hover:bg-red-500/25">
                          − {t("stockOut")}
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => openMove(item, "adjust")} className="px-2 py-1 text-[10px] rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/25">
                          ± {t("adjustment")}
                        </button>
                      )}
                      <button onClick={() => openHistory(item)} className="px-2 py-1 text-[10px] rounded-lg bg-gray-700/40 text-gray-300 border border-gray-600/40 font-bold hover:bg-gray-700/60">
                        {t("history")}
                      </button>
                      {canManage && (
                        <button onClick={() => openEdit(item)} className="px-2 py-1 text-[10px] rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold hover:bg-purple-500/25">
                          {t("editItem")}
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => setConfirmDelete(item)} className="px-2 py-1 text-[10px] rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 font-bold hover:bg-red-500/25">
                          {t("deleteBtn")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">{t("noItems")}</div>
          )}
        </div>
      </div>

      {/* ADD / EDIT ITEM MODAL */}
      <Modal isOpen={itemModal} onClose={() => setItemModal(false)} title={editing ? t("editItem") : t("addItem")}>
        <form onSubmit={saveItem} className="space-y-4">
          <div>
            <label className="label-dark">{t("itemName")}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark">{t("category")}</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-dark">
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">{t("unit")}</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-dark">
                {UNITS.map((u) => <option key={u} value={u}>{displayUnit(u)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">{t("pricePerUnit")}</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">{t("minStock")}</label>
              <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="input-dark" />
            </div>
            {!editing && (
              <div className="col-span-2">
                <label className="label-dark">{t("openingBalance")}</label>
                <input type="number" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} className="input-dark" />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setItemModal(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" disabled={savingItem} className="flex-1 btn-primary">{savingItem ? t("loading") : t("saveSettings")}</button>
          </div>
        </form>
      </Modal>

      {/* MOVEMENT MODAL */}
      <Modal isOpen={moveModal} onClose={() => setMoveModal(false)} title={`${moveType === "in" ? t("stockIn") : moveType === "out" ? t("stockOut") : t("adjustment")} — ${displayName(moveItem)}`}>
        <form onSubmit={saveMove} className="space-y-4">
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-sm text-gray-300">
            {t("currentStock")}: <strong className="text-white">{moveItem?.stock}</strong> {displayUnit(moveItem?.unit || "pcs")}
          </div>
          <div>
            <label className="label-dark">{moveType === "adjust" ? `${t("adjustment")} (+/−)` : t("qty")}</label>
            <input
              type="number"
              step="any"
              value={moveForm.qty}
              onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })}
              className="input-dark"
              required
            />
          </div>
          <div>
            <label className="label-dark">{t("reason")}</label>
            <select value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} className="input-dark">
              {REASONS[moveType].map((r) => <option key={r} value={r}>{t(r)}</option>)}
            </select>
          </div>
          <div>
            <label className="label-dark">{t("note")}</label>
            <input value={moveForm.note} onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })} className="input-dark" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setMoveModal(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" disabled={savingMove} className="flex-1 btn-primary">{savingMove ? t("loading") : t("saveSettings")}</button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t("deleteItem")}>
        <div className="space-y-5">
          <p className="text-sm text-gray-300 leading-relaxed">{t("confirmDeleteMsg")}</p>
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white font-bold text-center">
            {displayName(confirmDelete)}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button onClick={doDelete} disabled={deleting} className="flex-1 btn-danger">
              {deleting ? t("loading") : t("deleteBtn")}
            </button>
          </div>
        </div>
      </Modal>

      {/* HISTORY DRAWER */}
      {historyItem && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setHistoryItem(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">{displayName(historyItem)}</h2>
                  <p className="text-xs text-gray-500">{t("currentStock")}: {historyItem.stock} {displayUnit(historyItem.unit)}</p>
                </div>
                <button onClick={() => setHistoryItem(null)} className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-bold">×</button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">{t("noData")}</div>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div key={m._id} className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className={typeBadge[m.type]}>
                          {m.type === "in" ? t("stockIn") : m.type === "out" ? t("stockOut") : t("adjustment")}
                        </span>
                        <span className={`font-extrabold text-sm ${m.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {m.change >= 0 ? "+" : ""}{m.change}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                        <span>{t(m.reason)}{m.note ? ` — ${m.note}` : ""}</span>
                        <span>{t("balance")}: {m.balanceAfter}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-600">
                        <span>{m.performedByName}</span>
                        <span>{formatDateTime(m.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}