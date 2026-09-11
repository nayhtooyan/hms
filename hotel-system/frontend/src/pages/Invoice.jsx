import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useLanguage } from "../LanguageContext";
import { Printer, ArrowLeft } from "lucide-react";

export default function Invoice() {
  const { reservationId } = useParams();
  const { settings, formatMoney, formatDate, formatDateTime } = useSettings();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/payments/invoice/${reservationId}`);
        setData(res.data);
      } catch (err) { setError(err.response?.data?.message || t("error")); } finally { setLoading(false); }
    };
    load();
  }, [reservationId]);

  if (loading) return <div className="flex items-center justify-center py-32 text-purple-400">{t("loading")}</div>;
  if (error) return <div className="text-center py-32 text-red-400">{error}</div>;
  if (!data) return <div className="text-center py-32 text-gray-500">{t("noData")}</div>;

  const { reservation, payments, total, paid, balance } = data;
  const ps = reservation.priceSnapshot || {};

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex gap-3 mb-6 no-print">
        <Link to="/payments" className="btn-secondary flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> {t("back")}</Link>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2"><Printer className="w-4 h-4" /> {t("print")}</button>
      </div>

      <div className="card-dark p-8 no-print">
        <div className="text-center mb-8 pb-8 border-b border-gray-700/50">
          <h1 className="text-3xl font-extrabold text-white">{settings?.hotelName || t("hotelInvoice")}</h1>
          {settings?.address && <p className="text-gray-400 mt-1">{settings.address}</p>}
          {settings?.contactPhone && <p className="text-gray-400">{t("phone")}: {settings.contactPhone}</p>}
          {settings?.contactEmail && <p className="text-gray-400">Email: {settings.contactEmail}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("bookingNo")}</p><p className="font-bold text-white">{reservation.bookingNo}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("invoiceDate")}</p><p className="font-medium">{formatDateTime(new Date())}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("guest")}</p><p className="font-medium">{reservation.guest?.name || "-"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("phone")}</p><p className="font-medium">{reservation.guest?.phone || "-"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("room")}</p><p className="font-medium">{reservation.roomId?.roomNumber} - {reservation.roomId?.roomType}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("status")}</p><p className="font-bold capitalize">{t(reservation.status)}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("checkIn")}</p><p className="font-medium">{formatDate(reservation.scheduledCheckIn)}</p></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">{t("checkOut")}</p><p className="font-medium">{formatDate(reservation.scheduledCheckOut)}</p></div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">{t("charges")}</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-400">{t("roomCharge")}</span><span className="font-semibold text-white">{formatMoney(ps.roomCharge || 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">{t("extraBed")}</span><span className="font-semibold text-white">{formatMoney(ps.extraBedCharge || 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">{t("overtime")}</span><span className="font-semibold text-white">{formatMoney(ps.overtimeCharge || 0)}</span></div>
            <div className="flex justify-between text-red-400"><span>{t("voucherDiscount")}</span><span className="font-semibold">-{formatMoney(ps.voucherDiscount || 0)}</span></div>
            <div className="flex justify-between pt-3 border-t border-gray-700/50"><span className="text-lg font-bold text-white">{t("totalLabel")}</span><span className="text-lg font-extrabold text-white">{formatMoney(total)}</span></div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">{t("paymentsLabel")}</h3>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p._id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <div>
                    <p className="text-sm font-medium text-white">{p.receiptNo}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(p.createdAt)} • {t(p.method)}</p>
                  </div>
                  <span className="font-bold text-emerald-400">{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 text-center">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-gray-500 uppercase font-bold">{t("totalLabel")}</p><p className="text-xl font-extrabold text-white">{formatMoney(total)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-bold">{t("paidLabel")}</p><p className="text-xl font-extrabold text-emerald-400">{formatMoney(paid)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-bold">{t("balanceLabel")}</p><p className="text-xl font-extrabold text-red-400">{formatMoney(balance)}</p></div>
          </div>
          {balance === 0 ? <p className="text-emerald-400 font-bold text-lg">{t("paidInFullLabel")}</p> : <p className="text-red-400 font-bold text-lg">{t("balanceDue")}</p>}
        </div>

        {settings?.invoiceFooter && <p className="text-center text-gray-500 text-sm mt-8">{settings.invoiceFooter}</p>}
      </div>
    </div>
  );
}