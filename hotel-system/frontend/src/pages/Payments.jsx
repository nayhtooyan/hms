import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Search, Loader2, CreditCard, FileText } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function Payments() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();

  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("balances");
  const { t } = useLanguage();

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "", note: "" });

  const loadData = async () => {
    try {
      const [resRes, payRes] = await Promise.all([api.get("/reservations"), api.get("/payments")]);
      setReservations(resRes.data);
      setPayments(payRes.data);
    } catch { addToast("Failed to load data", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

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
      addToast("Payment recorded");
      setSelectedReservation(null);
      loadData();
    } catch (err) { addToast(err.response?.data?.message || "Payment failed", "error"); }
  };

  const filteredReservations = reservations.filter(r =>
    (r.bookingNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.guest?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    (p.receiptNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.reservationId?.bookingNo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">{t("paymentsTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("paymentsSubtitle")}</p></div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("balances")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "balances" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>{t("balances")}</button>
          <button onClick={() => setTab("history")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>{t("paymentHistory")}</button>
        </div>
        <div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading...</div> : tab === "balances" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("total")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("paid")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("balance")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReservations.map((r) => {
                  const total = Number(r.priceSnapshot?.total || 0); const paid = getPaid(r._id); const balance = total - paid;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-sm">{r.bookingNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.guest?.name || "-"}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{formatMoney(total)}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-semibold">{formatMoney(paid)}</td>
                      <td className="px-6 py-4 text-sm font-bold">{balance > 0 ? <span className="text-red-600">{formatMoney(balance)}</span> : <span className="text-emerald-600">Paid</span>}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {balance > 0 && r.status !== "cancelled" && <button onClick={() => openPayForm(r)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"><CreditCard className="w-5 h-5" /></button>}
                          <Link to={`/invoice/${r._id}`} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"><FileText className="w-5 h-5" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredReservations.length === 0 && <div className="text-center py-16 text-gray-400">No reservations found.</div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("recepit")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Booking</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("method")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("amount")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("date")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-sm">{p.receiptNo}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.reservationId?.bookingNo || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{p.method}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPayments.length === 0 && <div className="text-center py-16 text-gray-400">No payments found.</div>}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedReservation} onClose={() => setSelectedReservation(null)} title="Record Payment">
        <form onSubmit={submitPayment} className="space-y-5">
          <p className="text-sm text-gray-500">Booking: <strong>{selectedReservation?.bookingNo}</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">Amount</label><input type="number" name="amount" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="input-primary" /></div>
            <div><label className="label-primary">Method</label><select name="method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-primary"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select></div>
            <div><label className="label-primary">Reference</label><input name="reference" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="input-primary" /></div>
            <div><label className="label-primary">Note</label><input name="note" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="input-primary" /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setSelectedReservation(null)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Save Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}