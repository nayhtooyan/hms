import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { Search, CreditCard, FileText } from "lucide-react";

export default function Payments() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("balances");

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "", note: "" });

  const loadData = async () => {
    try {
      const [resRes, payRes] = await Promise.all([api.get("/reservations"), api.get("/payments")]);
      setReservations(resRes.data);
      setPayments(payRes.data);
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useRealTimeRefresh(loadData, ["payments:updated", "reservations:updated"]);

  const getPaid = (id) => payments.filter(p => p.status === "completed" && String(p.reservationId?._id || p.reservationId) === String(id)).reduce((s, p) => s + Number(p.amount || 0), 0);

  const openPayForm = (r) => {
    const balance = Number(r.priceSnapshot?.total || 0) - getPaid(r._id);
    setSelectedReservation(r);
    setPayForm({ amount: balance > 0 ? balance : "", method: "cash", reference: "", note: "" });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payments", { reservationId: selectedReservation._id, amount: Number(payForm.amount), method: payForm.method, reference: payForm.reference, note: payForm.note });
      addToast(t("paymentRecorded"));
      setSelectedReservation(null);
      loadData();
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const filteredReservations = reservations.filter(r =>
    (r.bookingNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.guest?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    (p.receiptNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.reservationId?.bookingNo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const methodColors = {
    cash: "badge-emerald", card: "badge-blue",
    bank_transfer: "badge-purple", other: "badge-gray",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title-dark">{t("paymentsTitle")}</h1>
        <p className="page-subtitle-dark">{t("paymentsSubtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
          <button onClick={() => setTab("balances")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "balances" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow" : "text-gray-400 hover:text-white"}`}>{t("balances")}</button>
          <button onClick={() => setTab("history")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "history" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow" : "text-gray-400 hover:text-white"}`}>{t("paymentHistory")}</button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input type="text" placeholder={t("paymentSearchPlaceholder")} className="input-dark pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500">{t("loading")}</div> : tab === "balances" ? (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("booking")}</th>
                <th>{t("guest")}</th>
                <th>{t("total")}</th>
                <th>{t("paid")}</th>
                <th>{t("balance")}</th>
                <th className="text-right">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {filteredReservations.map((r) => {
                  const total = Number(r.priceSnapshot?.total || 0);
                  const paid = getPaid(r._id);
                  const balance = total - paid;
                  return (
                    <tr key={r._id}>
                      <td className="font-bold text-white">{r.bookingNo}</td>
                      <td>{r.guest?.name || "-"}</td>
                      <td className="font-semibold text-white">{formatMoney(total)}</td>
                      <td className="text-emerald-400 font-semibold">{formatMoney(paid)}</td>
                      <td>{balance > 0 ? <span className="text-red-400 font-bold">{formatMoney(balance)}</span> : <span className="text-emerald-400 font-bold">{t("paidInFull")}</span>}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {balance > 0 && r.status !== "cancelled" && (
                            <button onClick={() => openPayForm(r)} className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10"><CreditCard className="w-5 h-5" /></button>
                          )}
                          <Link to={`/invoice/${r._id}`} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"><FileText className="w-5 h-5" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredReservations.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("receiptNo")}</th>
                <th>{t("booking")}</th>
                <th>{t("method")}</th>
                <th>{t("amount")}</th>
                <th className="hidden md:table-cell">{t("date")}</th>
              </tr></thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p._id}>
                    <td className="font-bold text-white">{p.receiptNo}</td>
                    <td>{p.reservationId?.bookingNo || "-"}</td>
                    <td><span className={methodColors[p.method] || "badge-gray"}>{t(p.method)}</span></td>
                    <td className="font-bold text-emerald-400">{formatMoney(p.amount)}</td>
                    <td className="hidden md:table-cell">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPayments.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedReservation} onClose={() => setSelectedReservation(null)} title={t("recordPayment")}>
        <form onSubmit={submitPayment} className="space-y-5">
          <p className="text-sm text-gray-400">{t("booking")}: <strong className="text-white">{selectedReservation?.bookingNo}</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-dark">{t("amount")}</label><input type="number" name="amount" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="input-dark" /></div>
            <div>
              <label className="label-dark">{t("method")}</label>
              <select name="method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-dark">
                <option value="cash">{t("cash")}</option>
                <option value="card">{t("card")}</option>
                <option value="bank_transfer">{t("bankTransfer")}</option>
                <option value="other">{t("other")}</option>
              </select>
            </div>
            <div><label className="label-dark">{t("reference")}</label><input name="reference" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="input-dark" /></div>
            <div><label className="label-dark">{t("note")}</label><input name="note" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="input-dark" /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setSelectedReservation(null)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{t("savePaymentBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}