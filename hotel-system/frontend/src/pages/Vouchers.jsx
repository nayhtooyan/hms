import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import { Plus, Search, Trash2, Ticket } from "lucide-react";

export default function Vouchers() {
  const { formatMoney, formatDate } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    code: "", type: "fixed", value: "", maxDiscount: "",
    usageLimit: "1", validFrom: "", validTo: ""
  });

  const loadVouchers = async () => {
    try {
      const res = await api.get("/vouchers");
      setVouchers(res.data);
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadVouchers(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const createVoucher = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vouchers", {
        code: form.code.toUpperCase(), type: form.type, value: Number(form.value),
        maxDiscount: Number(form.maxDiscount || 0), usageLimit: Number(form.usageLimit || 1),
        validFrom: new Date(form.validFrom).toISOString(), validTo: new Date(form.validTo).toISOString()
      });
      addToast(t("voucherCreated"));
      setIsModalOpen(false);
      setForm({ code: "", type: "fixed", value: "", maxDiscount: "", usageLimit: "1", validFrom: "", validTo: "" });
      loadVouchers();
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const disableVoucher = async (id) => {
    try {
      await api.delete(`/vouchers/${id}`);
      addToast(t("voucherDisabled"));
      loadVouchers();
    } catch { addToast(t("error"), "error"); }
  };

  const filtered = vouchers.filter(v => v.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("vouchersTitle")}</h1>
          <p className="page-subtitle-dark">{t("vouchersSubtitle")}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> {t("newVoucher")}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" placeholder={t("voucherSearchPlaceholder")} className="input-dark pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500">{t("loading")}</div> : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("code")}</th>
                <th>{t("type")}</th>
                <th>{t("value")}</th>
                <th>{t("usage")}</th>
                <th className="hidden md:table-cell">{t("validTo")}</th>
                <th>{t("status")}</th>
                <th className="text-right">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-white">{v.code}</span>
                      </div>
                    </td>
                    <td className="capitalize">{t(v.type === "fixed" ? "fixedAmount" : "percentage")}</td>
                    <td className="font-semibold text-white">{v.type === "fixed" ? formatMoney(v.value) : `${v.value}%`}</td>
                    <td>{v.usedCount} / {v.usageLimit}</td>
                    <td className="hidden md:table-cell">{formatDate(v.validTo)}</td>
                    <td>
                      <span className={v.active ? "badge-emerald" : "badge-gray"}>
                        {t(v.active ? "active" : "disabled")}
                      </span>
                    </td>
                    <td className="text-right">
                      {v.active && (
                        <button onClick={() => disableVoucher(v._id)} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("createVoucherBtn")}>
        <form onSubmit={createVoucher} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-dark">{t("code")}</label><input name="code" value={form.code} onChange={handleChange} required className="input-dark" placeholder="WELCOME50" /></div>
            <div>
              <label className="label-dark">{t("type")}</label>
              <select name="type" value={form.type} onChange={handleChange} className="input-dark">
                <option value="fixed">{t("fixedAmount")}</option>
                <option value="percentage">{t("percentage")}</option>
              </select>
            </div>
            <div><label className="label-dark">{t("value")}</label><input type="number" name="value" value={form.value} onChange={handleChange} required className="input-dark" /></div>
            <div><label className="label-dark">{t("maxDiscount")}</label><input type="number" name="maxDiscount" value={form.maxDiscount} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("usageLimit")}</label><input type="number" name="usageLimit" value={form.usageLimit} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("validFrom")}</label><input type="date" name="validFrom" value={form.validFrom} onChange={handleChange} required className="input-dark" /></div>
            <div><label className="label-dark">{t("validTo")}</label><input type="date" name="validTo" value={form.validTo} onChange={handleChange} required className="input-dark" /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{t("createVoucherBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}