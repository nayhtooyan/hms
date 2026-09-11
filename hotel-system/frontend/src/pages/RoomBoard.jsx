import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { BedDouble, RefreshCw, Users, XCircle, Ticket ,Bed } from "lucide-react";

export default function RoomBoard() {
  const { formatMoney } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [form, setForm] = useState({
    roomId: "", guestName: "", guestPhone: "",
    guestType: "local", nrc: "", passport: "",
    scheduledCheckIn: "", scheduledCheckOut: "",
    adults: 1, children: 0, extraBeds: 0
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState("");

  const nowForMin = new Date();
  const minDateTime = new Date(nowForMin.getTime() - nowForMin.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms?active=true");
      setRooms(response.data);
    } catch (error) {
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);
  useRealTimeRefresh(loadRooms, ["rooms:updated", "reservations:updated"]);

  const updateStatus = async (roomId, status) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status });
      addToast(t("success"));
      loadRooms();
    } catch (error) {
      addToast(t("error"), "error");
    }
  };

  const openReserve = (room) => {
    setIsWalkIn(false);
    setForm({ roomId: room._id, guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "", scheduledCheckIn: "", scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const openWalkIn = (room) => {
    setIsWalkIn(true);
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ roomId: room._id, guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "", scheduledCheckIn: localISO, scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const canAddExtraBed = (room) => {
    if (!room) return false;
    return !["Standard"].includes(room.roomType);
  };

  const handleCheckOutChange = (e) => {
    const val = e.target.value;
    const datePart = val.split("T")[0];
    setForm({ ...form, scheduledCheckOut: `${datePart}T12:00` });
  };

  const validateVoucher = async () => {
    try {
      const room = rooms.find(r => r._id === form.roomId);
      if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) { setVoucherMessage(t("error")); return; }
      const nights = Math.max(1, Math.ceil((new Date(form.scheduledCheckOut) - new Date(form.scheduledCheckIn)) / 86400000));
      const subtotal = (nights * Number(room.basePrice || 0));
      const res = await api.post("/vouchers/validate", { code: voucherCode, subtotal });
      setAppliedVoucher(res.data);
      setVoucherMessage(`${t("voucherDiscount")}: -${formatMoney(res.data.discount)}`);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherMessage(err.response?.data?.message || t("error"));
    }
  };

  const createReservation = async (e) => {
    e.preventDefault();
    try {
      const selectedRoom = rooms.find(r => r._id === form.roomId);
      const payload = {
        roomId: form.roomId,
        guest: { name: form.guestName, phone: form.guestPhone, guestType: form.guestType, nrc: form.guestType === "local" ? form.nrc : "", passport: form.guestType === "foreigner" ? form.passport : "" },
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
      setIsModalOpen(false);
      loadRooms();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    }
  };

  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const totalGuests = Number(form.adults || 0) + Number(form.children || 0);

  const statusConfig = {
    available: { bg: "from-emerald-500/20 to-emerald-600/10", border: "border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500" },
    occupied: { bg: "from-red-500/20 to-red-600/10", border: "border-red-500/40", text: "text-red-300", badge: "bg-red-500" },
    reserved: { bg: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/40", text: "text-blue-300", badge: "bg-blue-500" },
    cleaning: { bg: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/40", text: "text-amber-300", badge: "bg-amber-500" },
    maintenance: { bg: "from-orange-500/20 to-orange-600/10", border: "border-orange-500/40", text: "text-orange-300", badge: "bg-orange-500" },
    blocked: { bg: "from-gray-500/20 to-gray-600/10", border: "border-gray-500/40", text: "text-gray-400", badge: "bg-gray-500" },
  };

  const filteredRooms = filter === "all" ? rooms : rooms.filter(r => r.status === filter);
  const floors = filteredRooms.reduce((acc, room) => { const floor = room.floor || 1; if (!acc[floor]) acc[floor] = []; acc[floor].push(room); return acc; }, {});
  const sortedFloors = Object.keys(floors).sort((a, b) => Number(a) - Number(b));

  const counts = {
    all: rooms.length,
    available: rooms.filter(r => r.status === "available").length,
    occupied: rooms.filter(r => r.status === "occupied").length,
    reserved: rooms.filter(r => r.status === "reserved").length,
    cleaning: rooms.filter(r => r.status === "cleaning").length,
    maintenance: rooms.filter(r => r.status === "maintenance").length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-purple-400">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("roomBoardTitle")}</h1>
          <p className="page-subtitle-dark">{t("roomBoardSubtitle")}</p>
        </div>
        <button onClick={loadRooms} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> {t("refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === key ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow" : "bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white"}`}>
            {key === "all" ? t("all") : t(key)} ({count})
          </button>
        ))}
      </div>

      {sortedFloors.map((floor) => (
        <div key={floor} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-glow">
              <span className="text-white font-extrabold">{floor}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t("floor")} {floor}</h2>
              <p className="text-xs text-gray-500">{floors[floor].length} {t("roomsText")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {floors[floor].map((room) => {
              const config = statusConfig[room.status] || statusConfig.blocked;
              return (
                <div key={room._id} className={`bg-gradient-to-br ${config.bg} ${config.border} border-2 rounded-2xl p-5 hover:shadow-glow transition-all duration-300 group`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bed className={`w-5 h-5 ${config.text}`} />
                      <span className="text-lg font-extrabold text-white">{room.roomNumber}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${config.badge} animate-pulse`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${config.text}`}>{room.roomType}</p>
                    <span className="badge-purple flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.maxGuests || 2}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-2">{formatMoney(room.basePrice)}/{t("night")}</p>
                  <p className={`text-xs font-bold mt-2 capitalize ${config.text}`}>{t(room.status)}</p>

                  <div className="mt-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {room.status === "available" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => openReserve(room)} className="flex-1 btn-primary text-xs py-2">{t("reserve")}</button>
                        <button onClick={() => openWalkIn(room)} className="flex-1 btn-success text-xs py-2">{t("walkIn")}</button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {room.status !== "available" && <button onClick={() => updateStatus(room._id, "available")} className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold hover:bg-emerald-500/30">{t("available")}</button>}
                      {room.status !== "cleaning" && <button onClick={() => updateStatus(room._id, "cleaning")} className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hover:bg-amber-500/30">{t("cleaning")}</button>}
                      {room.status !== "maintenance" && <button onClick={() => updateStatus(room._id, "maintenance")} className="px-2.5 py-1 text-xs rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold hover:bg-orange-500/30">{t("maintenance")}</button>}
                      {room.status !== "blocked" && <button onClick={() => updateStatus(room._id, "blocked")} className="px-2.5 py-1 text-xs rounded-lg bg-gray-500/20 text-gray-300 border border-gray-500/30 font-semibold hover:bg-gray-500/30">{t("blocked")}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isWalkIn ? t("walkIn") : t("reserve")} size="lg">
        <form onSubmit={createReservation} className="space-y-5">
          {isWalkIn && <div className="alert-dark-success">{t("walkInMode")}</div>}
          <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <p className="font-bold text-white">{t("room")} {selectedRoom?.roomNumber} - {selectedRoom?.roomType}</p>
            <p className="text-sm text-gray-400">{formatMoney(selectedRoom?.basePrice || 0)}/{t("night")} • {t("floor")} {selectedRoom?.floor || 1} • {t("capacityLabel")}: {selectedRoom?.maxGuests || 2}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

            <div><label className="label-dark">{t("checkIn")}</label><input type="datetime-local" name="scheduledCheckIn" value={form.scheduledCheckIn} onChange={handleChange} required className="input-dark" disabled={isWalkIn} min={isWalkIn ? undefined : minDateTime} /></div>
            <div><label className="label-dark">{t("checkOut")}</label><input type="datetime-local" name="scheduledCheckOut" value={form.scheduledCheckOut} onChange={handleCheckOutChange} required className="input-dark" min={form.scheduledCheckIn || minDateTime} /></div>

            <div><label className="label-dark">{t("adults")}</label><input type="number" name="adults" value={form.adults} onChange={handleChange} className="input-dark" /></div>
            <div><label className="label-dark">{t("children")}</label><input type="number" name="children" value={form.children} onChange={handleChange} className="input-dark" /></div>

            {canAddExtraBed(selectedRoom) && <div><label className="label-dark">{t("extraBeds")}</label><input type="number" name="extraBeds" value={form.extraBeds} onChange={handleChange} className="input-dark" /></div>}
            {selectedRoom && !canAddExtraBed(selectedRoom) && <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-gray-500 text-sm"><XCircle className="w-4 h-4" /> {t("extraBeds")}: N/A</div>}

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
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className={`flex-1 ${isWalkIn ? "btn-success" : "btn-primary"}`}>{isWalkIn ? t("checkInWalkInGuest") : t("createReservationBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}