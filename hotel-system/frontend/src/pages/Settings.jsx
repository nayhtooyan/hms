import { useEffect, useState } from "react";

import api from "../api";

import { useSettings } from "../SettingsContext";
import { useLanguage } from "../LanguageContext";

const currencyOptions = [
  {
    code: "USD",
    symbol: "$",
    label: "US Dollar"
  },
  {
    code: "MMK",
    symbol: "Ks",
    label: "Myanmar Kyat"
  },
  {
    code: "CNY",
    symbol: "¥",
    label: "Chinese Yuan"
  },
  {
    code: "THB",
    symbol: "฿",
    label: "Thai Baht"
  }
];

const timezoneOptions = [
  {
    value: "Auto",
    label: "Auto / Browser Timezone"
  },
  {
    value: "UTC",
    label: "UTC"
  },
  {
    value: "Asia/Yangon",
    label: "Asia/Yangon"
  },
  {
    value: "Asia/Bangkok",
    label: "Asia/Bangkok"
  },
  {
    value: "Asia/Shanghai",
    label: "Asia/Shanghai"
  },
  {
    value: "Asia/Singapore",
    label: "Asia/Singapore"
  }
];

const languageOptions = [
  {
    value: "en",
    label: "English"
  },
  {
    value: "my",
    label: "Myanmar"
  }
];

const defaultForm = {
  hotelName: "",
  language: "en",
  currency: "USD",
  currencySymbol: "$",
  timezone: "Auto",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  taxRate: "",
  overtimeGraceMinutes: "",
  invoiceFooter: "",
  contactEmail: "",
  contactPhone: "",
  address: ""
};

export default function Settings() {
  const { refreshSettings } = useSettings();

  const { changeLanguage } = useLanguage();

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/settings");

      setForm({
        ...defaultForm,
        ...response.data
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleCurrencyChange = (e) => {
    const selectedCurrency = e.target.value;

    const selectedOption = currencyOptions.find(
      (item) => item.code === selectedCurrency
    );

    setForm({
      ...form,
      currency: selectedCurrency,
      currencySymbol: selectedOption?.symbol || form.currencySymbol
    });
  };

  const saveSettings = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        ...form,
        taxRate: Number(form.taxRate || 0),
        overtimeGraceMinutes: Number(form.overtimeGraceMinutes || 0)
      };

      const response = await api.put("/settings", payload);

      setForm({
        ...defaultForm,
        ...response.data
      });

      setMessage("Settings saved successfully");

      if (response.data.language) {
        changeLanguage(response.data.language);
      }

      await refreshSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-card">Loading settings...</div>;
  }

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Hotel Settings</h2>

            <div className="page-subtitle">
              Manage hotel information, currency, timezone and language.
            </div>
          </div>
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={saveSettings} className="form-grid">
          <div className="form-field">
            <label>Hotel Name</label>

            <input
              name="hotelName"
              value={form.hotelName}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Default Language</label>

            <select
              name="language"
              value={form.language}
              onChange={handleChange}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Currency</label>

            <select
              name="currency"
              value={form.currency}
              onChange={handleCurrencyChange}
            >
              {currencyOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} ({option.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Currency Symbol</label>

            <input
              name="currencySymbol"
              value={form.currencySymbol}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Timezone</label>

            <select
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Check-In Time</label>

            <input
              type="time"
              name="checkInTime"
              value={form.checkInTime}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Check-Out Time</label>

            <input
              type="time"
              name="checkOutTime"
              value={form.checkOutTime}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Tax Rate %</label>

            <input
              type="number"
              name="taxRate"
              value={form.taxRate}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Overtime Grace Minutes</label>

            <input
              type="number"
              name="overtimeGraceMinutes"
              value={form.overtimeGraceMinutes}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Contact Email</label>

            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Contact Phone</label>

            <input
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
            />
          </div>

          <div className="form-field field-full">
            <label>Address</label>

            <textarea
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-field field-full">
            <label>Invoice Footer</label>

            <textarea
              name="invoiceFooter"
              rows={3}
              value={form.invoiceFooter}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}