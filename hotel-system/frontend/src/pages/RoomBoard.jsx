import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import InvoiceOverlay from "../components/InvoiceOverlay";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";

const statusConfig = {
  available: { strip: "bg-emerald-500", tint: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300" },
  occupied: { strip: "bg-red-500", tint: "bg-red-500/10", border: "border-red-500/40", text: "text-red-300" },
  reserved: { strip: "bg-blue-500", tint: "bg-blue-500/10", border: "border-blue-500/40", text: "text-blue-300" },
  cleaning: { strip: "bg-amber-500", tint: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-300" },
  maintenance: { strip: "bg-orange-500", tint: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-300" },
  blocked: { strip: "bg-gray-500", tint: "bg-gray-500/10", border: "border-gray-500/40", text: "text-gray-400" },
};

const statusOrder = ["available", "cleaning", "maintenance", "blocked"];

export default function RoomBoard() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Reserve / Walk-in modal
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

  // Action sheet (non-occupied tiles)
  const [sheetRoom, setSheetRoom] = useState(null);

  // Occupied drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRes, setActiveRes] = useState(null);
  const [folio, setFolio] = useState(null);
  const [folioLoading, setFolioLoading] = useState(false);
  const [extendNights, setExtendNights] = useState(1);
  const [extendCustom, setExtendCustom] = useState("");
  const [extending, setExtending] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "", note: "" });
  const [paying, setPaying] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState(null);

  const nowForMin = new Date();
  const minDateTime = new Date(nowForMin.getTime() - nowForMin.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const loadRooms = async () => {
    const response = await api.get("/rooms?active=true");
    setRooms(response.data);
  };

  const loadReservations = async () => {
    const response = await api.get("/reservations");
    setReservations(response.data);
  };

  const loadFolio = async (id) => {
    try {
      setFolioLoading(true);
      const res = await api.get(`/payments/invoice/${id}`);
      setFolio(res.data);
    } catch {
      setFolio(null);
    } finally {
      setFolioLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      await Promise.all([loadRooms(), loadReservations()]);
    } catch {
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useRealTimeRefresh(loadAll, ["rooms:updated", "reservations:updated", "payments:updated", "housekeeping:updated"]);

  /*  status / reserve / walk-in  */
  const updateStatus = async (roomId, status) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status });
      addToast(t("success"));
      loadAll();
    } catch { addToast(t("error"), "error"); }
  };

  const openReserve = (room) => {
    setIsWalkIn(false);
    setForm({ roomId: room._id, guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "", scheduledCheckIn: "", scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const openWalkIn = (room) => {
    setIsWalkIn(true);
    const localISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ roomId: room._id, guestName: "", guestPhone: "", guestType: "local", nrc: "", passport: "", scheduledCheckIn: localISO, scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const canAddExtraBed = (room) => room && !["Standard"].includes(room.roomType);
  const handleCheckOutChange = (e) => {
    const datePart = e.target.value.split("T")[0];
    setForm({ ...form, scheduledCheckOut: `${datePart}T12:00` });
  };

  const validateVoucher = async () => {
    try {
      const room = rooms.find(r => r._id === form.roomId);
      if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) { setVoucherMessage(t("error")); return; }
      const nights = Math.max(1, Math.ceil((new Date(form.scheduledCheckOut) - new Date(form.scheduledCheckIn)) / 86400000));
      const subtotal = nights * Number(room.basePrice || 0);
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
      loadAll();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    }
  };

  /*  occupied drawer  */
  const openOccupied = (room) => {
    const res = reservations.find(r => r.status === "checked_in" && String(r.roomId?._id || r.roomId) === String(room._id));
    setActiveRes(res || null);
    setDrawerOpen(true);
    setShowPay(false);
    setExtendNights(1);
    setExtendCustom("");
    setFolio(null);
    if (res) loadFolio(res._id);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveRes(null);
    setFolio(null);
  };

  const extendPreview = () => {
    if (!activeRes) return null;
    const checkIn = new Date(activeRes.scheduledCheckIn);
    const currentOut = new Date(activeRes.scheduledCheckOut);
    const currentNights = Math.max(1, Math.ceil((currentOut - checkIn) / 86400000));
    const targetOut = extendCustom
      ? new Date(`${extendCustom}T12:00:00`)
      : new Date(currentOut.getTime() + extendNights * 86400000);
    if (targetOut <= currentOut) return null;
    const newNights = Math.max(1, Math.ceil((targetOut - checkIn) / 86400000));
    const room = rooms.find(r => String(r._id) === String(activeRes.roomId?._id || activeRes.roomId));
    const nightly = Number(room?.basePrice || 0) + Number(activeRes.extraBeds || 0) * Number(room?.extraBedPrice || 0);
    return { addedNights: newNights - currentNights, addedAmount: (newNights - currentNights) * nightly };
  };

  const confirmExtend = async () => {
    if (!activeRes) return;
    try {
      setExtending(true);
      const payload = extendCustom
        ? { newCheckOut: new Date(`${extendCustom}T12:00:00`).toISOString() }
        : { additionalNights: extendNights };
      await api.post(`/reservations/${activeRes._id}/extend`, payload);
      addToast(t("extensionSuccess"));
      setExtendCustom("");
      setExtendNights(1);
      await loadAll();
      loadFolio(activeRes._id);
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setExtending(false);
    }
  };

  const openPayForm = () => {
    const bal = folio?.balance || 0;
    setPayForm({ amount: bal > 0 ? bal : "", method: "cash", reference: "", note: "" });
    setShowPay(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!activeRes) return;
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      addToast(t("invalidAmount"), "error");
      return;
    }
    try {
      setPaying(true);
      await api.post("/payments", {
        reservationId: activeRes._id,
        amount: amt,
        method: payForm.method,
        reference: payForm.reference,
        note: payForm.note,
      });
      addToast(t("paymentRecorded"));
      setShowPay(false);
      await loadAll();
      await loadFolio(activeRes._id);
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally {
      setPaying(false);
    }
  };

  const doCheckOut = async () => {
    if (!activeRes) return;
    try {
      await api.post(`/reservations/${activeRes._id}/check-out`);
      addToast(t("checkedOut"));
      closeDrawer();
      loadAll();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    }
  };

  const timeLeft = (checkOut) => {
    const diff = new Date(checkOut).getTime() - Date.now();
    if (diff <= 0) return t("expired");
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const onTileClick = (room) => {
    if (room.status === "occupied") openOccupied(room);
    else setSheetRoom(room);
  };

  /*  derived  */
  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const totalGuests = Number(form.adults || 0) + Number(form.children || 0);

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

  const guest = folio?.reservation?.guest || activeRes?.guest || {};
  const folioRoom = folio?.reservation?.roomId || activeRes?.roomId || {};
  const ps = folio?.reservation?.priceSnapshot || {};
  const activeRoomId = activeRes?.roomId?._id || activeRes?.roomId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="roomboard-root space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title-dark">{t("roomBoardTitle")}</h1>
          <p className="page-subtitle-dark">{t("roomBoardSubtitle")}</p>
        </div>
        <button onClick={loadAll} className="btn-secondary text-sm py-2">{t("refresh")}</button>
      </div>

      {/* Filters + legend */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(counts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === key
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                  : "bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {key === "all" ? t("all") : t(key)} · {count}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(statusConfig).map(([key, c]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${c.strip}`} /> {t(key)}
            </span>
          ))}
        </div>
      </div>

      {/* Floors + tiles */}
      {sortedFloors.map((floor) => (
        <div key={floor} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300">{t("floor")} {floor}</span>
            <span className="text-[10px] text-gray-500">{floors[floor].length} {t("roomsText")}</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {floors[floor].map((room) => {
              const c = statusConfig[room.status] || statusConfig.blocked;
              return (
                <div
                  key={room._id}
                  onClick={() => onTileClick(room)}
                  className={`${c.tint} ${c.border} border rounded-xl overflow-hidden cursor-pointer hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className={`h-1 ${c.strip}`} />
                  <div className="p-2.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-white leading-none">{room.roomNumber}</span>
                      <span className={`text-[8px] font-bold uppercase ${c.text}`}>{t(room.status)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-1">{room.roomType} · {room.maxGuests || 2}P</p>
                    <p className="text-[10px] font-semibold text-gray-300 truncate">{formatMoney(room.basePrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/*  ACTION SHEET (non-occupied)  */}
      {sheetRoom && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-backdrop-in"
            onClick={() => setSheetRoom(null)}
          />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
            <div className="action-panel pointer-events-auto w-full sm:max-w-[480px] bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
              {/* Status color strip */}
              <div className={`h-1.5 ${(statusConfig[sheetRoom.status] || statusConfig.blocked).strip}`} />

              <div className="p-5 sm:p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-extrabold text-white leading-none">
                      {t("room")} {sheetRoom.roomNumber}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {sheetRoom.roomType} · {sheetRoom.maxGuests || 2}P · {t("floor")} {sheetRoom.floor || 1}
                    </p>
                    <p className="text-sm font-bold text-purple-300 mt-1">
                      {formatMoney(sheetRoom.basePrice)} / {t("night")}
                    </p>
                  </div>
                  <button
                    onClick={() => setSheetRoom(null)}
                    className="px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* Primary actions */}
                {sheetRoom.status === "available" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { openReserve(sheetRoom); setSheetRoom(null); }}
                      className="btn-primary py-3.5 text-sm font-bold"
                    >
                      {t("reserve")}
                    </button>
                    <button
                      onClick={() => { openWalkIn(sheetRoom); setSheetRoom(null); }}
                      className="btn-success py-3.5 text-sm font-bold"
                    >
                      {t("walkIn")}
                    </button>
                  </div>
                )}

                {/* Status changes */}
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">{t("changeStatus")}</p>
                  <div className="flex flex-wrap gap-2">
                    {statusOrder.filter(s => s !== sheetRoom.status).map((s) => {
                      const sc = statusConfig[s];
                      return (
                        <button
                          key={s}
                          onClick={() => { updateStatus(sheetRoom._id, s); setSheetRoom(null); }}
                          className={`px-4 py-2.5 text-xs rounded-lg font-semibold border ${sc.tint} ${sc.text} ${sc.border}`}
                        >
                          {t(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/*  OCCUPIED DRAWER  */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto animate-slide-up">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">{t("room")} {folioRoom.roomNumber || activeRes?.roomId?.roomNumber || "-"}</h2>
                  <p className="text-xs text-gray-500">{folioRoom.roomType || activeRes?.roomId?.roomType || ""}</p>
                </div>
                <button onClick={closeDrawer} className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-bold">×</button>
              </div>

              {!activeRes ? (
                <div className="alert-dark-warning">{t("noActiveReservation")}</div>
              ) : folioLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Guest */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("guestInformation")}</h3>
                    <p className="text-base font-bold text-white">{guest.name || "-"}</p>
                    <div className="mt-1.5 text-xs text-gray-400 space-y-1">
                      {guest.phone && <p>{t("guestPhone")}: {guest.phone}</p>}
                      <p><strong>{guest.guestType === "foreigner" ? t("passport") : t("nrc")}:</strong> {guest.guestType === "foreigner" ? guest.passport : guest.nrc}</p>
                      <p>{folio?.reservation?.adults ?? activeRes?.adults ?? 0} {t("adults")} · {folio?.reservation?.children ?? activeRes?.children ?? 0} {t("children")} · {folio?.reservation?.extraBeds ?? activeRes?.extraBeds ?? 0} {t("extraBeds")}</p>
                    </div>
                  </div>

                  {/* Stay */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("stayDetails")}</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-gray-500">{t("checkIn")}</p><p className="font-bold text-white">{formatDateTime(activeRes.scheduledCheckIn)}</p></div>
                      <div><p className="text-gray-500">{t("checkOut")}</p><p className="font-bold text-white">{formatDateTime(activeRes.scheduledCheckOut)}</p></div>
                      <div><p className="text-gray-500">{t("timeLeft")}</p><p className="font-bold text-amber-400">{timeLeft(activeRes.scheduledCheckOut)}</p></div>
                      <div><p className="text-gray-500">{t("booking")}</p><p className="font-bold text-white">{activeRes.bookingNo}</p></div>
                    </div>
                  </div>

                  {/* Charges */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("charges")}</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">{t("roomCharge")}</span><span className="text-white font-semibold">{formatMoney(ps.roomCharge || 0)}</span></div>
                      {(ps.extraBedCharge || 0) > 0 && <div className="flex justify-between"><span className="text-gray-400">{t("extraBed")}</span><span className="text-white font-semibold">{formatMoney(ps.extraBedCharge)}</span></div>}
                      {(ps.overtimeCharge || 0) > 0 && <div className="flex justify-between"><span className="text-gray-400">{t("overtime")}</span><span className="text-white font-semibold">{formatMoney(ps.overtimeCharge)}</span></div>}
                      {(ps.voucherDiscount || 0) > 0 && <div className="flex justify-between"><span className="text-gray-400">{t("voucherDiscount")}</span><span className="text-emerald-400 font-semibold">-{formatMoney(ps.voucherDiscount)}</span></div>}
                      <div className="flex justify-between border-t border-gray-700 pt-1.5"><span className="text-gray-300 font-bold">{t("totalLabel")}</span><span className="text-white font-bold">{formatMoney(folio?.total || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-300 font-bold">{t("paidLabel")}</span><span className="text-emerald-400 font-bold">{formatMoney(folio?.paid || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-300 font-bold">{t("balanceLabel")}</span><span className={`font-black ${folio?.balance > 0 ? "text-red-400" : "text-emerald-400"}`}>{formatMoney(folio?.balance || 0)}</span></div>
                    </div>

                    {folio?.payments?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t("paymentsMade")}</p>
                        {folio.payments.map((p) => (
                          <div key={p._id} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-gray-400">{p.receiptNo} · {t(p.method)}</span>
                            <span className="text-emerald-400 font-semibold">{formatMoney(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extend */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">{t("extendStay")}</h3>
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          onClick={() => { setExtendNights(n); setExtendCustom(""); }}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!extendCustom && extendNights === n ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}
                        >
                          +{n} {t("night")}
                        </button>
                      ))}
                    </div>
                    <div className="mb-3">
                      <label className="label-dark">{t("customDate")}</label>
                      <input
                        type="date"
                        value={extendCustom}
                        min={new Date(activeRes.scheduledCheckOut).toISOString().split("T")[0]}
                        onChange={(e) => setExtendCustom(e.target.value)}
                        className="input-dark"
                      />
                    </div>
                    {extendPreview() && (
                      <div className="alert-dark-info mb-3">
                        {t("addsAmount")}: <strong>+{formatMoney(extendPreview().addedAmount)}</strong> ({extendPreview().addedNights} {t("nights")})
                      </div>
                    )}
                    <button onClick={confirmExtend} disabled={extending || !extendPreview()} className="btn-primary w-full">
                      {extending ? t("loading") : t("confirmExtension")}
                    </button>
                  </div>

                  {/* Change status (moved here for occupied rooms) */}
                  <div className="card-dark p-4">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">{t("changeStatus")}</p>
                    <div className="flex flex-wrap gap-2">
                      {statusOrder.map((s) => {
                        const sc = statusConfig[s];
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(activeRoomId, s)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold border ${sc.tint} ${sc.text} ${sc.border}`}
                          >
                            {t(s)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={openPayForm} className="btn-success">{t("recordPayment")}</button>
                    <button onClick={() => setInvoiceFor(activeRes._id)} className="btn-secondary">{t("viewInvoice")}</button>
                    <button onClick={doCheckOut} className="btn-danger">{t("checkOut")}</button>
                  </div>

                  {/* Payment form */}
                  {showPay && (
                    <form onSubmit={submitPayment} className="card-dark p-4 space-y-4">
                      <h3 className="text-sm font-bold text-white">{t("recordPayment")}</h3>
                      {(folio?.balance || 0) <= 0 && <div className="alert-dark-info">{t("noBalanceDue")}</div>}
                      <div>
                        <label className="label-dark">{t("amount")}</label>
                        <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="input-dark" />
                      </div>
                      <div>
                        <label className="label-dark">{t("method")}</label>
                        <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-dark">
                          <option value="cash">{t("cash")}</option>
                          <option value="card">{t("card")}</option>
                          <option value="bank_transfer">{t("bankTransfer")}</option>
                          <option value="other">{t("other")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-dark">{t("reference")}</label>
                        <input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="input-dark" />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setShowPay(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
                        <button type="submit" disabled={paying} className="flex-1 btn-primary">{paying ? t("loading") : t("savePaymentBtn")}</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/*  RESERVE / WALK-IN MODAL  */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isWalkIn ? t("walkIn") : t("reserve")} size="lg">
        <form onSubmit={createReservation} className="space-y-5">
          {isWalkIn && <div className="alert-dark-success">{t("walkInMode")}</div>}
          <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <p className="font-bold text-white">{t("room")} {selectedRoom?.roomNumber} - {selectedRoom?.roomType}</p>
            <p className="text-sm text-gray-400">{formatMoney(selectedRoom?.basePrice || 0)}/{t("night")} · {t("floor")} {selectedRoom?.floor || 1} · {t("capacityLabel")}: {selectedRoom?.maxGuests || 2}</p>
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
            {selectedRoom && !canAddExtraBed(selectedRoom) && <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-gray-500 text-sm">{t("extraBeds")}: N/A</div>}

            {selectedRoom && totalGuests > (selectedRoom?.maxGuests || 2) && <div className="sm:col-span-2 alert-dark-warning">{t("capacityWarning")}</div>}

            <div>
              <label className="label-dark">{t("voucherCode")}</label>
              <div className="flex gap-2">
                <input value={voucherCode} onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); setVoucherMessage(""); }} className="input-dark" placeholder={t("enterCode")} />
                <button type="button" onClick={validateVoucher} className="btn-secondary whitespace-nowrap">{t("checkVoucher")}</button>
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

      {/* Invoice overlay */}
      {invoiceFor && (
        <InvoiceOverlay reservationId={invoiceFor} onClose={() => setInvoiceFor(null)} />
      )}
    </div>
  );
}