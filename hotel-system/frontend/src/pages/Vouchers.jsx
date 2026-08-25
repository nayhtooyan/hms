import { useEffect, useState } from "react";

import api from "../api";

import ResponsiveTable from "../components/ResponsiveTable.jsx";
import { useSettings } from "../SettingsContext";


export default function Vouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { formatMoney, formatDate } = useSettings();

  const [form, setForm] = useState({
    code: "",
    type: "fixed",
    value: "",
    maxDiscount: "",
    usageLimit: "1",
    validFrom: "",
    validTo: ""
  });

  const loadVouchers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/vouchers");

      setVouchers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const createVoucher = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        maxDiscount: Number(form.maxDiscount || 0),
        usageLimit: Number(form.usageLimit || 1),
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString()
      };

      await api.post("/vouchers", payload);

      setMessage("Voucher created successfully");

      setForm({
        code: "",
        type: "fixed",
        value: "",
        maxDiscount: "",
        usageLimit: "1",
        validFrom: "",
        validTo: ""
      });

      loadVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create voucher");
    }
  };

  const disableVoucher = async (id) => {
    try {
      await api.delete(`/vouchers/${id}`);

      setMessage("Voucher disabled");

      loadVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disable voucher");
    }
  };

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (row) => <strong>{row.code}</strong>
    },
    {
      key: "type",
      label: "Type"
    },
    {
      key: "value",
      label: "Value",
      render: (row) =>
        row.type === "fixed"
          ? formatMoney(row.value)
            : `${row.value}%`
    },
    {
      key: "usage",
      label: "Usage",
      render: (row) => `${row.usedCount} / ${row.usageLimit}`
    },
    {
      key: "validTo",
      label: "Valid To",
      render: (row) => formatDate(row.validTo)
    },
    {
      key: "active",
      label: "Status",
      render: (row) => (row.active ? "Active" : "Disabled")
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="action-stack">
          {row.active ? (
            <button
              className="btn btn-danger"
              onClick={() => disableVoucher(row._id)}
            >
              Disable
            </button>
          ) : (
            <span>-</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Create Voucher</h2>

            <div className="page-subtitle">
              Add discount codes for reservations.
            </div>
          </div>
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={createVoucher} className="form-grid">
          <div className="form-field">
            <label>Code</label>

            <input
              name="code"
              placeholder="Example: WELCOME50"
              value={form.code}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Type</label>

            <select
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div className="form-field">
            <label>Value</label>

            <input
              type="number"
              name="value"
              placeholder="Example: 50 or 20"
              value={form.value}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Max Discount</label>

            <input
              type="number"
              name="maxDiscount"
              placeholder="For percentage vouchers"
              value={form.maxDiscount}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Usage Limit</label>

            <input
              type="number"
              name="usageLimit"
              value={form.usageLimit}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Valid From</label>

            <input
              type="date"
              name="validFrom"
              value={form.validFrom}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Valid To</label>

            <input
              type="date"
              name="validTo"
              value={form.validTo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create Voucher
            </button>
          </div>
        </form>
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Vouchers</h2>

            <div className="page-subtitle">
              Manage existing voucher codes.
            </div>
          </div>
        </div>

        {loading ? <div>Loading vouchers...</div> : null}

        {!loading ? (
          <ResponsiveTable
            columns={columns}
            data={vouchers}
            emptyMessage="No vouchers found."
          />
        ) : null}
      </div>
    </div>
  );
}