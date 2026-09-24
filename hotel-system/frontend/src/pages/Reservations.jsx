import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { Plus, Search, LogIn, LogOut, XCircle, Ticket, UserPlus, Clock, AlertTriangle } from "lucide-react";

function StatusBadge({ status, t }) {
  const value = String(status || "").toLowerCase();
  const styles = {
    reserved: "badge-blue", checked_in: "badge-emerald",
    checked_out: "badge-gray", cancelled: "badge-red",
  };
  return <span className={styles[value] || "badge-gray"}>{t(status)}</span>;
}

function CountdownTimer({ checkOutTime, t }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(checkOutTime).getTime();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft(t("expired") || "Overdue"); setIsExpired(true); setIsUrgent(true); return; }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
      setIsUrgent(hours < 1);
      setIsExpired(false);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [checkOutTime, t]);

  const badgeClass = isExpired ? "badge-red" : isUrgent ? "badge-amber" : "badge-blue";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
      {isExpired || isUrgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {timeLeft}
    </div>
  );
}

export default function Reservations() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const now = new Date();
  const currentDateTimeLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    roomId: "", guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "",
    scheduledCheckIn: "", scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState("");

  const loadData = async () => {
    try {
      const [roomsRes, reservationsRes] = await Promise.all([api.get("/rooms?active=true"), api.get("/reservations")]);
      setRooms(roomsRes.data.filter(r => r.status === "available"));
      setReservations(reservationsRes.data);
    } catch (error) { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useRealTimeRefresh(loadData, ["reservations:updated", "rooms:updated", "payments:updated"]);
  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleCheckOutChange = (e) => { const val = e.target.value; const datePart = val.split("T")[0]; setForm({ ...form, scheduledCheckOut: `${datePart}T12:00` }); };

  const resetForm = () => {
    setForm({ roomId: "", guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "", scheduledCheckIn: "", scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage(""); setIsWalkIn(false);
  };

  const openNewReservation = () => { resetForm(); setIsWalkIn(false); setIsModalOpen(true); };
  const openWalkIn = () => { resetForm(); setIsWalkIn(true); setForm(prev => ({ ...prev, scheduledCheckIn: currentDateTimeLocal })); setIsModalOpen(true); };

  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const totalGuests = Number(form.adults || 0) + Number(form.children || 0);
  const canAddExtraBed = (room) => room && !["Standard"].includes(room.roomType);

  const validateVoucher = async () => {
    try {
      const room = rooms.find(r => r._id === form.roomId);
      if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) { setVoucherMessage(t("error")); return; }
      const nights = Math.max(1, Math.ceil((new Date(form.scheduledCheckOut) - new Date(form.scheduledCheckIn)) / 86400000));
      const subtotal = nights * Number(room.basePrice || 0);
      const res = await api.post("/vouchers/validate", { code: voucherCode, subtotal });
      setAppliedVoucher(res.data);
      setVoucherMessage(`${t("voucherDiscount")}: -${formatMoney(res.data.discount)}`);
    } catch (err) { setAppliedVoucher(null); setVoucherMessage(err.response?.data?.message || t("error")); }
  };

  const createReservation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: form.roomId,
        guest: { name: form.guestName, phone: form.guestPhone, guestType: form.guestType, nrc: form.guestType === "local" ? form.nrc : "", passport: form.guestType === "foreigner" ? form.passport : "" },
        scheduledCheckIn: new Date(form.scheduledCheckIn).toISOString(),
        scheduledCheckOut: new Date(form.scheduledCheckOut).toISOString(),
        adults: Number(form.adults || 1), children: Number(form.children || 0),
        extraBeds: canAddExtraBed(selectedRoom) ? Number(form.extraBeds || 0) : 0,
        voucherId: appliedVoucher?.voucherId || null, source: isWalkIn ? "walk_in" : "reception",
      };
      const res = await api.post("/reservations", payload);
      if (isWalkIn && res.data?._id) { await api.post(`/reservations/${res.data._id}/check-in`); addToast(t("walkInSuccess")); }
      else addToast(t("reservationCreated"));
      setIsModalOpen(false); resetForm(); loadData();
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const checkIn = async (id) => { try { await api.post(`/reservations/${id}/check-in`); addToast(t("checkedIn")); loadData(); } catch (e) { addToast(e.response?.data?.message || t("error"), "error"); } };
  const checkOut = async (id) => { try { await api.post(`/reservations/${id}/check-out`); addToast(t("checkedOut")); loadData(); } catch (e) { addToast(e.response?.data?.message || t("error"), "error"); } };
  const cancel = async (id) => { try { await api.post(`/reservations/${id}/cancel`, {}); addToast(t("reservationCancelled")); loadData(); } catch (e) { addToast(e.response?.data?.message || t("error"), "error"); } };

  const filtered = reservations.filter(r =>
    (r.bookingNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.guest?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.roomId?.roomNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.guest?.nrc || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.guest?.passport || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("reservationsTitle")}</h1>
          <p className="page-subtitle-dark">{t("reservationsSubtitle")}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openWalkIn} className="btn-success flex items-center gap-2"><UserPlus className="w-5 h-5" /> {t("walkIn")}</button>
          <button onClick={openNewReservation} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" /> {t("newReservation")}</button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" placeholder={t("reservationSearchPlaceholder")} className="input-dark pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500">{t("loading")}</div> : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("booking")}</th><th>{t("room")}</th><th>{t("guest")}</th><th>{t("idLabel")}</th>
                <th className="hidden lg:table-cell">{t("checkIn")}</th><th className="hidden lg:table-cell">{t("checkOut")}</th>
                <th>{t("total")}</th><th>{t("status")}</th><th className="text-right">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td className="font-bold text-white">
                      <div className="flex items-center gap-2">
                        {r.bookingNo}
                        {r.source === "walk_in" && <span className="badge-emerald">{t("walkInBadge")}</span>}
                      </div>
                    </td>
                    <td>{r.roomId?.roomNumber || "-"}</td>
                    <td>{r.guest?.name || "-"}</td>
                    <td>{r.guest?.guestType === "foreigner" ? <span className="text-blue-400">{r.guest?.passport || "-"}</span> : <span>{r.guest?.nrc || "-"}</span>}</td>
                    <td className="hidden lg:table-cell">{formatDateTime(r.scheduledCheckIn)}</td>
                    <td className="hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        <span>{formatDateTime(r.scheduledCheckOut)}</span>
                        {r.status === "checked_in" && <CountdownTimer checkOutTime={r.scheduledCheckOut} t={t} />}
                      </div>
                    </td>
                    <td className="font-semibold text-white">{formatMoney(r.priceSnapshot?.total)}</td>
                    <td><StatusBadge status={r.status} t={t} /></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "reserved" && (<>
                          <button onClick={() => checkIn(r._id)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10"><LogIn className="w-4 h-4" /></button>
                          <button onClick={() => cancel(r._id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"><XCircle className="w-4 h-4" /></button>
                        </>)}
                        {r.status === "checked_in" && <button onClick={() => checkOut(r._id)} className="p-1 rounded-sm bg-lg text-blue-400 hover:bg-blue-500/10"><LogOut className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isWalkIn ? t("walkIn") : t("newReservation")} size="lg">
        <form onSubmit={createReservation} className="space-y-5">
          {isWalkIn && <div className="alert-dark-success">{t("walkInMode")}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label-dark">{t("room")}</label>
              <select name="roomId" value={form.roomId} onChange={(e) => { setForm({ ...form, roomId: e.target.value, extraBeds: 0 }); }} required className="input-dark">
                <option value="">{t("selectRoom")}</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.roomNumber} - {r.roomType} ({r.maxGuests || 2}) - {formatMoney(r.basePrice)}/{t("night")}</option>)}
              </select>
            </div>
            <div><label className="label-dark">{t("guestName")}</label><input name="guestName" value={form.guestName} onChange={handleChange} className="input-dark" required /></div>
            <div><label className="label-dark">{t("guestPhone")}</label><input name="guestPhone" value={form.guestPhone} onChange={handleChange} className="input-dark" /></div>
            <div className="sm:col-span-2">
              <label className="label-dark">{t("guestType")}</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setForm({ ...form, guestType: "local" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "local" ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-gray-800/50 border-gray-700 text-gray-400"}`}>{t("local")}</button>
                <button type="button" onClick={() => setForm({ ...form, guestType: "foreigner" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "foreigner" ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-gray-800/50 border-gray-700 text-gray-400"}`}>{t("foreigner")}</button>
              </div>
            </div>
            {form.guestType === "local" ? (
              <div className="sm:col-span-2"><label className="label-dark">{t("nrc")}</label><input name="nrc" value={form.nrc} onChange={handleChange} className="input-dark" placeholder={t("nrcPlaceholder")} /></div>
            ) : (
              <div className="sm:col-span-2"><label className="label-dark">{t("passport")}</label><input name="passport" value={form.passport} onChange={handleChange} className="input-dark" placeholder={t("passportPlaceholder")} /></div>
            )}
            <div><label className="label-dark">{t("checkIn")}</label><input type="datetime-local" name="scheduledCheckIn" value={form.scheduledCheckIn} onChange={handleChange} required className="input-dark" disabled={isWalkIn} min={isWalkIn ? undefined : currentDateTimeLocal} /></div>
            <div><label className="label-dark">{t("checkOut")}</label><input type="datetime-local" name="scheduledCheckOut" value={form.scheduledCheckOut} onChange={handleCheckOutChange} required className="input-dark" min={form.scheduledCheckIn || currentDateTimeLocal} /></div>
            <div><label className="label-dark">{t("adults")}</label><input type="number" name="adults" value={form.adults} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("children")}</label><input type="number" name="children" value={form.children} onChange={handleChange} className="input-dark" /></div>
            {canAddExtraBed(selectedRoom) && <div><label className="label-dark">{t("extraBeds")}</label><input type="number" name="extraBeds" value={form.extraBeds} onChange={handleChange} className="input-dark" /></div>}
            {selectedRoom && totalGuests > (selectedRoom?.maxGuests || 2) && <div className="sm:col-span-2 alert-dark-warning">{t("capacityWarning")}</div>}
            <div>
              <label className="label-dark">{t("voucherCode")}</label>
              <div className="flex gap-2">
                <input value={voucherCode} onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); setVoucherMessage(""); }} className="input-dark" placeholder={t("enterCode")} />
                <button type="button" onClick={validateVoucher} className="btn-secondary whitespace-nowrap"><Ticket className="w-4 h-4" /></button>
              </div>
              {voucherMessage && <p className={`text-xs mt-2 font-medium ${appliedVoucher ? "text-emerald-400" : "text-red-400"}`}>{voucherMessage}</p>}
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className={`flex-1 ${isWalkIn ? "btn-success" : "btn-primary"}`}>{isWalkIn ? t("checkInWalkInGuest") : t("createReservationBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}