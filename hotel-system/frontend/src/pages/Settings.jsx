import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useLanguage } from "../LanguageContext";
import { useToast } from "../components/ToastContext";
import { Loader2, Save } from "lucide-react";



const currencyOptions = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "MMK", symbol: "Ks", label: "Myanmar Kyat" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
  { code: "THB", symbol: "฿", label: "Thai Baht" },
];
const timezoneOptions = [
  { value: "Auto", label: "Auto (Browser)" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Yangon", label: "Asia/Yangon" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
];

const defaultForm = {
  hotelName: "", language: "en", currency: "USD", currencySymbol: "$", timezone: "Auto",
  checkInTime: "14:00", checkOutTime: "12:00", taxRate: "", overtimeGraceMinutes: "",
  invoiceFooter: "", contactEmail: "", contactPhone: "", address: "",
  autoBackupEnabled: "true", autoBackupTime: "02:00", autoBackupRetentionDays: "7"
};

export default function Settings() {
  const { refreshSettings } = useSettings();
  const { changeLanguage } = useLanguage();
  const { addToast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try { const res = await api.get("/settings"); setForm({ ...defaultForm, ...res.data }); } catch { addToast("Failed to load settings", "error"); } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleCurrencyChange = (e) => {
    const opt = currencyOptions.find(c => c.code === e.target.value);
    setForm({ ...form, currency: e.target.value, currencySymbol: opt?.symbol || form.currencySymbol });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, taxRate: Number(form.taxRate || 0), overtimeGraceMinutes: Number(form.overtimeGraceMinutes || 0), autoBackupEnabled: form.autoBackupEnabled === true || form.autoBackupEnabled === "true", autoBackupRetentionDays: Number(form.autoBackupRetentionDays || 7) };
      const res = await api.put("/settings", payload);
      setForm({ ...defaultForm, ...res.data });
      if (res.data.language) changeLanguage(res.data.language);
      await refreshSettings();
      addToast("Settings saved successfully");
    } catch (err) { addToast(err.response?.data?.message || "Failed to save", "error"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">{t("settingsTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("settingsSubtitle")}</p></div>

      <form onSubmit={save} className="space-y-6">
        {/* Hotel Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">{t("hotelInfo")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2"><label className="label-primary">{t("hotelName")}</label><input name="hotelName" value={form.hotelName} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("contactEmail")}</label><input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("contactPhone")}</label><input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="input-primary" /></div>
            <div className="sm:col-span-2"><label className="label-primary">{t("address")}</label><textarea name="address" rows={2} value={form.address} onChange={handleChange} className="input-primary" /></div>
          </div>
        </div>

        {/* Regional */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">{t("regionalSettings")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">{t("language")}</label><select name="language" value={form.language} onChange={handleChange} className="input-primary"><option value="en">English</option><option value="my">Myanmar</option></select></div>
            <div><label className="label-primary">{t("currency")}</label><select name="currency" value={form.currency} onChange={handleCurrencyChange} className="input-primary">{currencyOptions.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}</select></div>
            <div><label className="label-primary">{t("currencySymbol")}</label><input name="currencySymbol" value={form.currencySymbol} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("timezone")}</label><select name="timezone" value={form.timezone} onChange={handleChange} className="input-primary">{timezoneOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          </div>
        </div>

        {/* Operations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">{t("operations")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">{t("checkInTime")}</label><input type="time" name="checkInTime" value={form.checkInTime} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("checkOutTime")}</label><input type="time" name="checkOutTime" value={form.checkOutTime} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("taxRate")}</label><input type="number" name="taxRate" value={form.taxRate} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("overtimeGrace")}</label><input type="number" name="overtimeGraceMinutes" value={form.overtimeGraceMinutes} onChange={handleChange} className="input-primary" /></div>
            <div className="sm:col-span-2"><label className="label-primary">{t("invoiceFooter")}</label><textarea name="invoiceFooter" rows={2} value={form.invoiceFooter} onChange={handleChange} className="input-primary" /></div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? t("saving") : t("saveSettings")}
        </button>
      </form>
    </div>
  );
}