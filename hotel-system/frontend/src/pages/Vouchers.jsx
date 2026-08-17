import { useEffect, useState } from "react";
import api from "../api";

export default function Vouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    code: "",
    type: "fixed",
    value: "",
    maxDiscount: 0,
    validFrom: "",
    validTo: "",
    usageLimit: 1
  });

  const loadVouchers = async () => {
    const res = await api.get("/vouchers");
    setVouchers(res.data);
  };

  useEffect(() => { loadVouchers(); }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createVoucher = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        value: Number(form.value),
        maxDiscount: Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit),
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString()
      };
      await api.post("/vouchers", payload);
      setMessage("Voucher created!");
      setForm({ code: "", type: "fixed", value: "", maxDiscount: 0, validFrom: "", validTo: "", usageLimit: 1 });
      loadVouchers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create voucher");
    }
  };

  const deleteVoucher = async (id) => {
    await api.delete(`/vouchers/${id}`);
    loadVouchers();
  };

  return (
    <div>
      <div className="card">
        <h2>Create Voucher</h2>
        {message && <div className="success">{message}</div>}
        <form onSubmit={createVoucher} style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <input name="code" placeholder="Code (e.g. SAVE20)" value={form.code} onChange={handleChange} required />
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="fixed">Fixed Amount ($)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
          <input type="number" name="value" placeholder="Value" value={form.value} onChange={handleChange} required />
          {form.type === "percentage" && (
            <input type="number" name="maxDiscount" placeholder="Max Discount ($)" value={form.maxDiscount} onChange={handleChange} />
          )}
          <input type="number" name="usageLimit" placeholder="Usage Limit" value={form.usageLimit} onChange={handleChange} required />
          <input type="date" name="validFrom" value={form.validFrom} onChange={handleChange} required />
          <input type="date" name="validTo" value={form.validTo} onChange={handleChange} required />
          <button type="submit">Create</button>
        </form>
      </div>

      <div className="card">
        <h2>Existing Vouchers</h2>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Usage</th>
              <th>Valid To</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v._id}>
                <td><strong>{v.code}</strong></td>
                <td>{v.type}</td>
                <td>{v.type === 'fixed' ? `$${v.value}` : `${v.value}%`}</td>
                <td>{v.usedCount} / {v.usageLimit}</td>
                <td>{new Date(v.validTo).toLocaleDateString()}</td>
                <td>{v.active ? "Active" : "Disabled"}</td>
                <td>
                  {v.active && <button onClick={() => deleteVoucher(v._id)} style={{background:'red'}}>Disable</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}