import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function Invoice() {
  const { reservationId } = useParams();
  const { settings, formatMoney, formatDate, formatDateTime } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try { const res = await api.get(`/payments/invoice/${reservationId}`); setData(res.data); } catch (err) { setError(err.response?.data?.message || "Failed to load invoice"); } finally { setLoading(false); }
    };
    load();
  }, [reservationId]);

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="text-center py-32 text-red-500">{error}</div>;
  if (!data) return <div className="text-center py-32 text-gray-400">Invoice not found</div>;

  const { reservation, payments, total, paid, balance } = data;
  const ps = reservation.priceSnapshot || {};

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex gap-3 mb-6 print:hidden">
        <Link to="/payments" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Printer className="w-4 h-4" /> Print</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center mb-8 pb-8 border-b border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900">{settings?.hotelName || "Hotel Invoice"}</h1>
          {settings?.address && <p className="text-gray-500 mt-1">{settings.address}</p>}
          {settings?.contactPhone && <p className="text-gray-500">Phone: {settings.contactPhone}</p>}
          {settings?.contactEmail && <p className="text-gray-500">Email: {settings.contactEmail}</p>}
        </div>

        {/* Booking Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div><p className="text-xs text-gray-400 uppercase font-bold">Booking No</p><p className="font-bold">{reservation.bookingNo}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Date</p><p className="font-medium">{formatDateTime(new Date())}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Guest</p><p className="font-medium">{reservation.guest?.name || "-"}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Phone</p><p className="font-medium">{reservation.guest?.phone || "-"}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Room</p><p className="font-medium">{reservation.roomId?.roomNumber} - {reservation.roomId?.roomType}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Status</p><p className="font-bold capitalize">{reservation.status}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Check In</p><p className="font-medium">{formatDate(reservation.scheduledCheckIn)}</p></div>
          <div><p className="text-xs text-gray-400 uppercase font-bold">Check Out</p><p className="font-medium">{formatDate(reservation.scheduledCheckOut)}</p></div>
        </div>

        {/* Charges */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Charges</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Room Charge</span><span className="font-semibold">{formatMoney(ps.roomCharge || 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Extra Bed</span><span className="font-semibold">{formatMoney(ps.extraBedCharge || 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Overtime</span><span className="font-semibold">{formatMoney(ps.overtimeCharge || 0)}</span></div>
            <div className="flex justify-between text-red-600"><span>Voucher Discount</span><span className="font-semibold">-{formatMoney(ps.voucherDiscount || 0)}</span></div>
            <div className="flex justify-between pt-3 border-t border-gray-100"><span className="text-lg font-bold">Total</span><span className="text-lg font-extrabold">{formatMoney(total)}</span></div>
          </div>
        </div>

        {/* Payments */}
        {payments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Payments</h3>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div><p className="text-sm font-medium">{p.receiptNo}</p><p className="text-xs text-gray-400">{formatDateTime(p.createdAt)} • {p.method}</p></div>
                  <span className="font-bold text-emerald-600">{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-6 rounded-2xl bg-gray-50 text-center">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-gray-400 uppercase font-bold">Total</p><p className="text-xl font-extrabold">{formatMoney(total)}</p></div>
            <div><p className="text-xs text-gray-400 uppercase font-bold">Paid</p><p className="text-xl font-extrabold text-emerald-600">{formatMoney(paid)}</p></div>
            <div><p className="text-xs text-gray-400 uppercase font-bold">Balance</p><p className="text-xl font-extrabold text-red-600">{formatMoney(balance)}</p></div>
          </div>
          {balance === 0 ? <p className="text-emerald-600 font-bold text-lg">✓ PAID IN FULL</p> : <p className="text-red-600 font-bold text-lg">BALANCE DUE</p>}
        </div>

        {settings?.invoiceFooter && <p className="text-center text-gray-400 text-sm mt-8">{settings.invoiceFooter}</p>}
      </div>
    </div>
  );
}