import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Search, Loader2, Trash2, Ticket } from "lucide-react";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { useLanguage } from "../LanguageContext";

export default function Vouchers() {
  const { formatMoney, formatDate } = useSettings();
  const { addToast } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  const [form, setForm] = useState({ code: "", type: "fixed", value: "", maxDiscount: "", usageLimit: "1", validFrom: "", validTo: "" });

  const loadVouchers = async () => {
    try { const res = await api.get("/vouchers"); setVouchers(res.data); } catch { addToast("Failed to load vouchers", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadVouchers(); }, []);
  useRealTimeRefresh(loadVouchers, ["vouchers:updated"]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const createVoucher = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vouchers", {
        code: form.code.toUpperCase(), type: form.type, value: Number(form.value),
        maxDiscount: Number(form.maxDiscount || 0), usageLimit: Number(form.usageLimit || 1),
        validFrom: new Date(form.validFrom).toISOString(), validTo: new Date(form.validTo).toISOString()
      });
      addToast("Voucher created");
      setIsModalOpen(false);
      setForm({ code: "", type: "fixed", value: "", maxDiscount: "", usageLimit: "1", validFrom: "", validTo: "" });
      loadVouchers();
    } catch (err) { addToast(err.response?.data?.message || "Failed to create voucher", "error"); }
  };

  const disableVoucher = async (id) => {
    try { await api.delete(`/vouchers/${id}`); addToast("Voucher disabled"); loadVouchers(); } catch { addToast("Failed to disable", "error"); }
  };

  const filtered = vouchers.filter(v => v.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{t("vouchersTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("vouchersSubtitle")}</p></div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"><Plus className="w-5 h-5" /> {t("newVoucher")}</button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder={t("voucherSearchPlaceholder")} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("code")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("type")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("value")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("usage")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("validTo")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><Ticket className="w-4 h-4 text-indigo-500" /><span className="font-bold text-sm">{v.code}</span></div></td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{v.type}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{v.type === "fixed" ? formatMoney(v.value) : `${v.value}%`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{v.usedCount} / {v.usageLimit}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(v.validTo)}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{v.active ? "Active" : "Disabled"}</span></td>
                    <td className="px-6 py-4 text-right">{v.active && <button onClick={() => disableVoucher(v._id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-5 h-5" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-400">No vouchers found.</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('createVoucherBtn')}>
        <form onSubmit={createVoucher} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">{t("code")}</label><input name="code" value={form.code} onChange={handleChange} required className="input-primary" placeholder="WELCOME50" /></div>
            <div><label className="label-primary">{t("type")}</label><select name="type" value={form.type} onChange={handleChange} className="input-primary"><option value="fixed">{t("fixedAmount")}</option><option value="percentage">{t("percentage")}</option></select></div>
            <div><label className="label-primary">{t("value")}</label><input type="number" name="value" value={form.value} onChange={handleChange} required className="input-primary" /></div>
            <div><label className="label-primary">{t("maxDiscount")}</label><input type="number" name="maxDiscount" value={form.maxDiscount} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("usageLimit")}</label><input type="number" name="usageLimit" value={form.usageLimit} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("validFrom")}</label><input type="date" name="validFrom" value={form.validFrom} onChange={handleChange} required className="input-primary" /></div>
            <div><label className="label-primary">{t("validTo")}</label><input type="date" name="validTo" value={form.validTo} onChange={handleChange} required className="input-primary" /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">{t("cancel")}</button>
            <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">{t("createVoucherBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}