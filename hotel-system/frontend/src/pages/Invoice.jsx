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
      } catch (err) {
        setError(err.response?.data?.message || t("error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reservationId]);

  // Professional print title
  useEffect(() => {
    if (!data) return;
    const original = document.title;
    const ci = new Date(data.reservation.scheduledCheckIn);
    document.title = `Invoice-${ci.getFullYear()}${String(ci.getMonth() + 1).padStart(2, "0")}-${data.reservation.bookingNo}`;
    return () => { document.title = original; };
  }, [data]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-purple-400">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/payments" className="btn-secondary">{t("back")}</Link>
      </div>
    );
  }

  if (!data) return null;

  const { reservation, payments, total, paid, balance } = data;
  const ps = reservation.priceSnapshot || {};
  const guest = reservation.guest || {};
  const room = reservation.roomId || {};

  const checkIn = new Date(reservation.scheduledCheckIn);
  const checkOut = new Date(reservation.scheduledCheckOut);
  const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

  const invoiceNumber = `INV-${checkIn.getFullYear()}${String(checkIn.getMonth() + 1).padStart(2, "0")}-${reservation.bookingNo}`;
  const issueDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const roomRate =
    room?.basePrice ??
    ps.basePrice ??
    (nights > 0 ? Math.round((ps.roomCharge || 0) / nights) : null);

  const extraBedQty = (reservation.extraBeds || 1) * nights;
  const extraBedRate =
    room?.extraBedPrice ??
    ps.extraBedPrice ??
    (extraBedQty > 0 ? Math.round((ps.extraBedCharge || 0) / extraBedQty) : null);

  const overtimeRate =
    room?.overtimeHourlyRate ??
    ps.overtimeHourlyRate ??
    null;

  const rateOrDash = (rate) => (rate == null ? "-" : formatMoney(rate));

  const methodLabels = {
    cash: t("cash"),
    card: t("card"),
    bank_transfer: t("bankTransfer"),
    other: t("other")
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Buttons - hidden in print */}
      <div className="flex gap-3 mb-6 no-print">
        <Link to="/payments" className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </Link>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer className="w-4 h-4" /> {t("print")}
        </button>
      </div>

      {/*  INVOICE  */}
      <div className="invoice-container bg-white text-black rounded-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="invoice-header bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-8 py-5">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{settings?.hotelName || "Hotel Name"}</h1>
              <div className="text-xs opacity-90 space-y-0.5">
                {settings?.address && <p>{settings.address}</p>}
                <div className="flex flex-wrap gap-x-4">
                  {settings?.contactPhone && <span>Tel: {settings.contactPhone}</span>}
                  {settings?.contactEmail && <span>Email: {settings.contactEmail}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black tracking-tight">INVOICE</h2>
              <p className="text-xs mt-1.5"><strong>No:</strong> {invoiceNumber}</p>
              <p className="text-xs"><strong>Date:</strong> {issueDate}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Bill To + Stay Details */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="print-box border border-gray-300 rounded-md p-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
              <p className="text-base font-bold text-gray-900">{guest.name || "-"}</p>
              <div className="mt-1.5 text-xs text-gray-600 space-y-1">
                {guest.phone && <p>Tel: {guest.phone}</p>}
                <p>
                  <strong>{guest.guestType === "foreigner" ? "Passport" : "NRC"}:</strong>{" "}
                  {guest.guestType === "foreigner" ? guest.passport : guest.nrc}
                </p>
                <p><strong>Guest Type:</strong> {guest.guestType === "foreigner" ? "Foreigner" : "Local"}</p>
              </div>
            </div>

            <div className="print-box border border-gray-300 rounded-md p-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Stay Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div><p className="text-gray-500">Booking No</p><p className="font-bold">{reservation.bookingNo}</p></div>
                <div><p className="text-gray-500">Room</p><p className="font-bold">{room.roomNumber} ({room.roomType})</p></div>
                <div><p className="text-gray-500">Check-In</p><p className="font-bold">{formatDateTime(reservation.scheduledCheckIn)}</p></div>
                <div><p className="text-gray-500">Check-Out</p><p className="font-bold">{formatDateTime(reservation.scheduledCheckOut)}</p></div>
                <div><p className="text-gray-500">Nights</p><p className="font-bold">{nights} night(s)</p></div>
                <div><p className="text-gray-500">Guests</p><p className="font-bold">{reservation.adults || 0} Adult(s){reservation.children > 0 && `, ${reservation.children} Child(ren)`}</p></div>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b-2 border-gray-800">Description</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b-2 border-gray-800">Qty</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b-2 border-gray-800">Rate</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b-2 border-gray-800">Amount</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {/* Room Charges */}
              <tr className="border-b border-gray-300">
                <td className="py-2.5 px-3">
                  <p className="font-medium text-gray-900">Room Charges ({room.roomType})</p>
                  <p className="text-[10px] text-gray-500">{formatDate(reservation.scheduledCheckIn)} to {formatDate(reservation.scheduledCheckOut)}</p>
                </td>
                <td className="py-2.5 px-3 text-center">{nights} night(s)</td>
                <td className="py-2.5 px-3 text-right">{rateOrDash(roomRate)}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(ps.roomCharge || 0)}</td>
              </tr>

              {/* Extra Bed */}
              {(ps.extraBedCharge || 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-gray-900">Extra Bed</p>
                    <p className="text-[10px] text-gray-500">Additional bed charge</p>
                  </td>
                  <td className="py-2.5 px-3 text-center">{reservation.extraBeds || 1}</td>
                  <td className="py-2.5 px-3 text-right">{rateOrDash(extraBedRate)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(ps.extraBedCharge)}</td>
                </tr>
              )}

              {/* Extra Person */}
              {(ps.extraPersonCharge || 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 px-3"><p className="font-medium text-gray-900">Extra Person</p></td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3 text-right">-</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(ps.extraPersonCharge)}</td>
                </tr>
              )}

              {/* Overtime — FIXED RATE */}
              {(ps.overtimeCharge || 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-gray-900">Overtime Charges</p>
                    <p className="text-[10px] text-gray-500">Late check-out fee</p>
                  </td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3 text-right">
                    {overtimeRate == null ? "-" : `${formatMoney(overtimeRate)}/hr`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(ps.overtimeCharge)}</td>
                </tr>
              )}

              {/* Voucher Discount */}
              {(ps.voucherDiscount || 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-gray-900">Voucher Discount</p>
                    {reservation.voucherCode && <p className="text-[10px] text-gray-500">Code: {reservation.voucherCode}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3 text-right">-</td>
                  <td className="py-2.5 px-3 text-right font-semibold">-{formatMoney(ps.voucherDiscount)}</td>
                </tr>
              )}

              {/* Tax */}
              {(ps.taxAmount || 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 px-3"><p className="font-medium text-gray-900">Tax ({settings?.taxRate || 0}%)</p></td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3 text-right">-</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(ps.taxAmount)}</td>
                </tr>
              )}

              {/* Subtotal */}
              <tr>
                <td colSpan={3} className="py-2.5 px-3 text-right font-bold text-gray-700">Subtotal:</td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {formatMoney((ps.roomCharge || 0) + (ps.extraBedCharge || 0) + (ps.extraPersonCharge || 0) + (ps.overtimeCharge || 0))}
                </td>
              </tr>

              {/* Discount */}
              {(ps.voucherDiscount || 0) > 0 && (
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right font-bold text-gray-700">Discount:</td>
                  <td className="py-2.5 px-3 text-right font-bold">-{formatMoney(ps.voucherDiscount)}</td>
                </tr>
              )}

              {/* Total */}
              <tr className="border-t-2 border-gray-900 bg-gray-100">
                <td colSpan={3} className="py-3 px-3 text-right text-base font-black text-gray-900">TOTAL AMOUNT:</td>
                <td className="py-3 px-3 text-right text-base font-black text-gray-900">{formatMoney(total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment + Summary */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Payment Details</h3>
              {payments && payments.length > 0 ? (
                <div className="space-y-1.5">
                  {payments.map((payment, idx) => (
                    <div key={idx} className="print-box flex justify-between items-center p-2.5 bg-gray-50 rounded-md text-xs">
                      <div>
                        <p className="font-medium text-gray-900">{payment.receiptNo}</p>
                        <p className="text-[10px] text-gray-500">{formatDateTime(payment.createdAt)} • {methodLabels[payment.method] || payment.method}</p>
                      </div>
                      <span className="font-bold">{formatMoney(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No payments recorded</p>
              )}
            </div>

            <div className="print-box bg-gray-50 rounded-md p-4">
              <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2.5">Amount Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Total Amount:</span><span className="font-bold">{formatMoney(total)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Amount Paid:</span><span className="font-bold">{formatMoney(paid)}</span></div>
                <div className="flex justify-between border-t border-gray-400 pt-2">
                  <span className="font-bold">Balance Due:</span>
                  <span className={`text-lg font-black ${balance > 0 ? "text-red-600" : "text-green-700"}`}>{formatMoney(balance)}</span>
                </div>
              </div>
              <div className="mt-3">
                {balance === 0 ? (
                  <div className="print-banner bg-green-100 text-green-800 text-center py-1.5 rounded-md text-xs font-bold">✓ PAID IN FULL</div>
                ) : (
                  <div className="print-banner bg-red-100 text-red-800 text-center py-1.5 rounded-md text-xs font-bold">⚠ BALANCE DUE: {formatMoney(balance)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="border-t border-gray-400 pt-3 mb-4">
            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Terms & Conditions</h3>
            <ul className="print-fine text-[10px] text-gray-600 space-y-0.5">
              <li>• Check-in: {settings?.checkInTime || "14:00"} | Check-out: {settings?.checkOutTime || "12:00"} | Late check-out subject to overtime charges.</li>
              <li>• Payment is due at check-out unless otherwise arranged. This invoice is computer generated and valid without signature.</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-300 text-center">
            <p className="text-xs font-medium text-gray-800">
              {settings?.invoiceFooter || `Thank you for choosing ${settings?.hotelName || "our hotel"}. We hope to serve you again!`}
            </p>
            <p className="print-fine text-[10px] text-gray-500 mt-1">Generated on {issueDate} • Invoice No: {invoiceNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}