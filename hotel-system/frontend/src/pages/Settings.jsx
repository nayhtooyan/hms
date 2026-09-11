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
};

export default function Settings() {
  const { refreshSettings } = useSettings();
  const { changeLanguage } = useLanguage();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/settings");
        setForm({ ...defaultForm, ...res.data });
      } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
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
      const payload = {
        ...form,
        taxRate: Number(form.taxRate || 0),
        overtimeGraceMinutes: Number(form.overtimeGraceMinutes || 0),
      };
      const res = await api.put("/settings", payload);
      setForm({ ...defaultForm, ...res.data });
      if (res.data.language) changeLanguage(res.data.language);
      await refreshSettings();
      addToast(t("settingsSaved"));
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-32 text-purple-400">{t("loading")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title-dark">{t("settingsTitle")}</h1>
        <p className="page-subtitle-dark">{t("settingsSubtitle")}</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Hotel Info */}
        <div className="card-dark p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> {t("hotelInfo")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2"><label className="label-dark">{t("hotelName")}</label><input name="hotelName" value={form.hotelName} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("contactEmail")}</label><input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("contactPhone")}</label><input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="input-dark" /></div>
            <div className="sm:col-span-2"><label className="label-dark">{t("address")}</label><textarea name="address" rows={2} value={form.address} onChange={handleChange} className="input-dark" /></div>
          </div>
        </div>

        {/* Regional */}
        <div className="card-dark p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> {t("regionalSettings")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label-dark">{t("language")}</label>
              <select name="language" value={form.language} onChange={handleChange} className="input-dark">
                <option value="en">{t("english")}</option>
                <option value="my">{t("myanmar")}</option>
              </select>
            </div>
            <div>
              <label className="label-dark">{t("currency")}</label>
              <select name="currency" value={form.currency} onChange={handleCurrencyChange} className="input-dark">
                {currencyOptions.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
              </select>
            </div>
            <div><label className="label-dark">{t("currencySymbol")}</label><input name="currencySymbol" value={form.currencySymbol} onChange={handleChange} className="input-dark" /></div>
            <div>
              <label className="label-dark">{t("timezone")}</label>
              <select name="timezone" value={form.timezone} onChange={handleChange} className="input-dark">
                {timezoneOptions.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Operations */}
        <div className="card-dark p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500" /> {t("operations")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-dark">{t("checkInTime")}</label><input type="time" name="checkInTime" value={form.checkInTime} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("checkOutTime")}</label><input type="time" name="checkOutTime" value={form.checkOutTime} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("taxRate")}</label><input type="number" name="taxRate" value={form.taxRate} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("overtimeGrace")}</label><input type="number" name="overtimeGraceMinutes" value={form.overtimeGraceMinutes} onChange={handleChange} className="input-dark" /></div>
            <div className="sm:col-span-2"><label className="label-dark">{t("invoiceFooter")}</label><textarea name="invoiceFooter" rows={2} value={form.invoiceFooter} onChange={handleChange} className="input-dark" /></div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-full sm:w-auto">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? t("saving") : t("saveSettings")}
        </button>
      </form>
    </div>
  );
}