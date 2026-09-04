import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Search, Loader2, LogIn, LogOut, XCircle, Ticket, UserPlus, Clock, AlertTriangle } from "lucide-react";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { useLanguage } from "../LanguageContext";

function StatusBadge({ status }) {
  const styles = {
    reserved: "bg-blue-100 text-blue-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status || "-"}
    </span>
  );
}

function CountdownTimer({ checkOutTime }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(checkOutTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Overdue");
        setIsExpired(true);
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
      setIsUrgent(hours < 1);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [checkOutTime]);

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
      isExpired ? "bg-red-100 text-red-700" : isUrgent ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
    }`}>
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
    roomId: "", guestName: "", guestPhone: "",
    guestType: "local", nrc: "", passport: "",
    scheduledCheckIn: "", scheduledCheckOut: "",
    adults: 1, children: 0, extraBeds: 0
  });

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState("");

  const loadData = async () => {
    try {
      const [roomsRes, reservationsRes] = await Promise.all([
        api.get("/rooms?active=true"),
        api.get("/reservations")
      ]);
      setRooms(roomsRes.data.filter(r => r.status === "available"));
      setReservations(reservationsRes.data);
    } catch (error) {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useRealTimeRefresh(loadData, ["reservations:updated", "rooms:updated", "payments:updated"]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Auto set checkout time to 12:00 PM
  const handleCheckOutChange = (e) => {
    const val = e.target.value;
    const datePart = val.split("T")[0];
    setForm({ ...form, scheduledCheckOut: `${datePart}T12:00` });
  };

  const resetForm = () => {
    setForm({
      roomId: "", guestName: "", guestPhone: "",
      guestType: "local", nrc: "", passport: "",
      scheduledCheckIn: "", scheduledCheckOut: "",
      adults: 1, children: 0, extraBeds: 0
    });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage(""); setIsWalkIn(false);
  };

  const openNewReservation = () => { resetForm(); setIsWalkIn(false); setIsModalOpen(true); };

  const openWalkIn = () => {
    resetForm();
    setIsWalkIn(true);
    setForm(prev => ({ ...prev, scheduledCheckIn: currentDateTimeLocal }));
    setIsModalOpen(true);
  };

  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const totalGuests = Number(form.adults || 0) + Number(form.children || 0);

  // Extra bed logic: Only Superior, Deluxe, Premium, Executive, Family Room
  const canAddExtraBed = (room) => {
    if (!room) return false;
    const noExtraBedTypes = ["Standard"];
    if (noExtraBedTypes.includes(room.roomType)) return false;
    return true;
  };

  const calculateSubtotal = () => {
    const room = rooms.find(r => r._id === form.roomId);
    if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) return 0;
    const nights = Math.max(1, Math.ceil((new Date(form.scheduledCheckOut) - new Date(form.scheduledCheckIn)) / 86400000));
    return (nights * Number(room.basePrice || 0)) + (Number(form.extraBeds || 0) * nights * Number(room.extraBedPrice || 0));
  };

  const validateVoucher = async () => {
    try {
      const subtotal = calculateSubtotal();
      if (subtotal <= 0) { setVoucherMessage("Select room and dates first."); return; }
      const res = await api.post("/vouchers/validate", { code: voucherCode, subtotal });
      setAppliedVoucher(res.data);
      setVoucherMessage(`Discount: -${formatMoney(res.data.discount)}`);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherMessage(err.response?.data?.message || "Invalid voucher");
    }
  };

  const createReservation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: form.roomId,
        guest: {
          name: form.guestName, phone: form.guestPhone,
          guestType: form.guestType,
          nrc: form.guestType === "local" ? form.nrc : "",
          passport: form.guestType === "foreigner" ? form.passport : "",
        },
        scheduledCheckIn: new Date(form.scheduledCheckIn).toISOString(),
        scheduledCheckOut: new Date(form.scheduledCheckOut).toISOString(),
        adults: Number(form.adults || 1), children: Number(form.children || 0),
        extraBeds: canAddExtraBed(selectedRoom) ? Number(form.extraBeds || 0) : 0,
        voucherId: appliedVoucher?.voucherId || null,
        source: isWalkIn ? "walk_in" : "reception",
      };
      const res = await api.post("/reservations", payload);
      if (isWalkIn && res.data?._id) {
        await api.post(`/reservations/${res.data._id}/check-in`);
        addToast(t("walkInSuccess"));
      } else {
        addToast(t("reservationCreated"));
      }
      setIsModalOpen(false); resetForm(); loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create reservation", "error");
    }
  };

  const checkIn = async (id) => { try { await api.post(`/reservations/${id}/check-in`); addToast(t("checkedIn")); loadData(); } catch (e) { addToast(e.response?.data?.message || "Check-in failed", "error"); } };
  const checkOut = async (id) => { try { await api.post(`/reservations/${id}/check-out`); addToast(t("checkedOut")); loadData(); } catch (e) { addToast(e.response?.data?.message || "Check-out failed", "error"); } };
  const cancel = async (id) => { try { await api.post(`/reservations/${id}/cancel`, {}); addToast(t("reservationCancelled")); loadData(); } catch (e) { addToast(e.response?.data?.message || "Cancel failed", "error"); } };

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
          <h1 className="text-2xl font-bold text-gray-900">{t("reservationsTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("reservationsSubtitle")}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openWalkIn} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95">
            <UserPlus className="w-5 h-5" /> {t("walkIn")}
          </button>
          <button onClick={openNewReservation} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> {t("newReservation")}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder={t("reservationSearchPlaceholder")} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("idLabel")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("checkIn")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("checkOut")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("total")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        {r.bookingNo}
                        {r.source === "walk_in" && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">{t("walkInBadge")}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.roomId?.roomNumber || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.guest?.name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {r.guest?.guestType === "foreigner"
                        ? <span className="text-blue-600">{r.guest?.passport || "-"}</span>
                        : <span>{r.guest?.nrc || "-"}</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDateTime(r.scheduledCheckIn)}</td>
                    <td className="px-6 py-4 text-sm hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{formatDateTime(r.scheduledCheckOut)}</span>
                        {r.status === "checked_in" && <CountdownTimer checkOutTime={r.scheduledCheckOut} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatMoney(r.priceSnapshot?.total)}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "reserved" && (
                          <>
                            <button onClick={() => checkIn(r._id)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title={t("checkIn")}><LogIn className="w-4 h-4" /></button>
                            <button onClick={() => cancel(r._id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title={t("cancel")}><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                        {r.status === "checked_in" && (
                          <button onClick={() => checkOut(r._id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title={t("checkOut")}><LogOut className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-400">{t("noData")}</div>}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isWalkIn ? t("walkIn") : t("newReservation")} size="lg">
        <form onSubmit={createReservation} className="space-y-5">
          {isWalkIn && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{t("walkInMode")}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label-primary">{t("room")}</label>
              <select name="roomId" value={form.roomId} onChange={(e) => { setForm({ ...form, roomId: e.target.value, extraBeds: 0 }); }} required className="input-primary">
                <option value="">{t("selectRoom")}</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>{r.roomNumber} - {r.roomType} ({r.maxGuests || 2} {t("guests")}) - {formatMoney(r.basePrice)}/{t("night")}</option>
                ))}
              </select>
              {selectedRoom && <p className="text-xs text-gray-400 mt-1">{t("capacityLabel")}: {selectedRoom.maxGuests || 2} {t("guestsMax")}</p>}
            </div>

            <div><label className="label-primary">{t("guestName")}</label><input name="guestName" value={form.guestName} onChange={handleChange} className="input-primary" required /></div>
            <div><label className="label-primary">{t("guestPhone")}</label><input name="guestPhone" value={form.guestPhone} onChange={handleChange} className="input-primary" /></div>

            <div className="sm:col-span-2">
              <label className="label-primary">{t("guestType")}</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setForm({ ...form, guestType: "local" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "local" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{t("local")}</button>
                <button type="button" onClick={() => setForm({ ...form, guestType: "foreigner" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "foreigner" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{t("foreigner")}</button>
              </div>
            </div>

            {form.guestType === "local" ? (
              <div className="sm:col-span-2"><label className="label-primary">{t("nrc")}</label><input name="nrc" value={form.nrc} onChange={handleChange} className="input-primary" placeholder={t("nrcPlaceholder")} /></div>
            ) : (
              <div className="sm:col-span-2"><label className="label-primary">{t("passport")}</label><input name="passport" value={form.passport} onChange={handleChange} className="input-primary" placeholder={t("passportPlaceholder")} /></div>
            )}

            <div>
              <label className="label-primary">{t("checkIn")}</label>
              <input type="datetime-local" name="scheduledCheckIn" value={form.scheduledCheckIn} onChange={handleChange} required className="input-primary" disabled={isWalkIn} min={isWalkIn ? undefined : currentDateTimeLocal} />
              {isWalkIn && <p className="text-xs text-gray-400 mt-1">{t("walkInCheckInNote")}</p>}
            </div>
            <div>
              <label className="label-primary">{t("checkOut")}</label>
              <input type="datetime-local" name="scheduledCheckOut" value={form.scheduledCheckOut} onChange={handleCheckOutChange} required className="input-primary" min={form.scheduledCheckIn || currentDateTimeLocal} />
              <p className="text-xs text-gray-400 mt-1">Check-out time: 12:00 PM (auto)</p>
            </div>

            <div><label className="label-primary">{t("adults")}</label><input type="number" name="adults" value={form.adults} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">{t("children")}</label><input type="number" name="children" value={form.children} onChange={handleChange} className="input-primary" /></div>

            {/* Extra bed only for Superior and above */}
            {canAddExtraBed(selectedRoom) && (
              <div><label className="label-primary">{t("extraBeds")}</label><input type="number" name="extraBeds" value={form.extraBeds} onChange={handleChange} className="input-primary" /></div>
            )}
            {selectedRoom && !canAddExtraBed(selectedRoom) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-sm">
                <XCircle className="w-4 h-4" /> {t("extraBeds")}: N/A ({selectedRoom.roomType})
              </div>
            )}

            {selectedRoom && totalGuests > (selectedRoom?.maxGuests || 2) && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                {t("capacityWarning")}
              </div>
            )}

            <div>
              <label className="label-primary">{t("voucherCode")}</label>
              <div className="flex gap-2">
                <input value={voucherCode} onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); setVoucherMessage(""); }} className="input-primary" placeholder={t("enterCode")} />
                <button type="button" onClick={validateVoucher} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors whitespace-nowrap"><Ticket className="w-4 h-4" /></button>
              </div>
              {voucherMessage && <p className={`text-xs mt-2 font-medium ${appliedVoucher ? "text-emerald-600" : "text-red-500"}`}>{voucherMessage}</p>}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">{t("cancel")}</button>
            <button type="submit" className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all ${isWalkIn ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700"}`}>
              {isWalkIn ? t("checkInWalkInGuest") : t("createReservationBtn")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}