import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import InvoiceOverlay from "../components/InvoiceOverlay";

import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import {
  BedDouble, RefreshCw, Users, XCircle, Ticket, X, Clock,
  Plus, CreditCard, FileText, LogOut, Loader2
} from "lucide-react";

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

  // Occupied room drawer
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

  /*  Reserve / Walk-in  */
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

  /*  Occupied room drawer  */
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

  // Extend preview calculation
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
    return { targetOut, addedNights: newNights - currentNights, addedAmount: (newNights - currentNights) * nightly };
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
    setPayForm({ amount: folio && folio.balance > 0 ? folio.balance : "", method: "cash", reference: "", note: "" });
    setShowPay(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!activeRes) return;
    try {
      setPaying(true);
      await api.post("/payments", {
        reservationId: activeRes._id,
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference,
        note: payForm.note,
      });
      addToast(t("paymentRecorded"));
      setShowPay(false);
      await loadAll();
      loadFolio(activeRes._id);
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

  /*  Board rendering  */
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

  const guest = folio?.reservation?.guest || activeRes?.guest || {};
  const folioRoom = folio?.reservation?.roomId || activeRes?.roomId || {};
  const ps = folio?.reservation?.priceSnapshot || {};

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-purple-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="roomboard-root space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("roomBoardTitle")}</h1>
          <p className="page-subtitle-dark">{t("roomBoardSubtitle")}</p>
        </div>
        <button onClick={loadAll} className="btn-secondary flex items-center gap-2">
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
                <div
                  key={room._id}
                  onClick={() => room.status === "occupied" && openOccupied(room)}
                  className={`bg-gradient-to-br ${config.bg} ${config.border} border-2 rounded-2xl p-5 hover:shadow-glow transition-all duration-300 group ${room.status === "occupied" ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BedDouble className={`w-5 h-5 ${config.text}`} />
                      <span className="text-lg font-extrabold text-white">{room.roomNumber}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${config.badge} animate-pulse`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${config.text}`}>{room.roomType}</p>
                    <span className="badge-purple flex items-center gap-1"><Users className="w-3 h-3" /> {room.maxGuests || 2}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-2">{formatMoney(room.basePrice)}/{t("night")}</p>
                  <p className={`text-xs font-bold mt-2 capitalize ${config.text}`}>{t(room.status)}</p>

                  <div className="mt-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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

      {/*  OCCUPIED ROOM DRAWER  */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto animate-slide-up">
            <div className="p-6 space-y-6">
              {/* Drawer header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    {t("room")} {folioRoom.roomNumber || activeRes?.roomId?.roomNumber || "-"}
                  </h2>
                  <p className="text-xs text-gray-500">{folioRoom.roomType || activeRes?.roomId?.roomType || ""}</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!activeRes ? (
                <div className="alert-dark-warning">{t("noActiveReservation")}</div>
              ) : folioLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
              ) : (
                <>
                  {/* Guest info */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("guestInformation")}</h3>
                    <p className="text-base font-bold text-white">{guest.name || "-"}</p>
                    <div className="mt-1.5 text-xs text-gray-400 space-y-1">
                      {guest.phone && <p>{t("guestPhone")}: {guest.phone}</p>}
                      <p>
                        <strong>{guest.guestType === "foreigner" ? t("passport") : t("nrc")}:</strong>{" "}
                        {guest.guestType === "foreigner" ? guest.passport : guest.nrc}
                      </p>
                      <p>{t("guests")}: {folio?.reservation?.adults ?? activeRes?.adults ?? 0} {t("adults")} • {folio?.reservation?.children ?? activeRes?.children ?? 0} {t("children")} • {folio?.reservation?.extraBeds ?? activeRes?.extraBeds ?? 0} {t("extraBeds")}</p>
                    </div>
                  </div>

                  {/* Stay info */}
                  <div className="card-dark p-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("stayDetails")}</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-gray-500">{t("checkIn")}</p><p className="font-bold text-white">{formatDateTime(activeRes.scheduledCheckIn)}</p></div>
                      <div><p className="text-gray-500">{t("checkOut")}</p><p className="font-bold text-white">{formatDateTime(activeRes.scheduledCheckOut)}</p></div>
                      <div>
                        <p className="text-gray-500">{t("timeLeft")}</p>
                        <p className="font-bold text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLeft(activeRes.scheduledCheckOut)}</p>
                      </div>
                      <div><p className="text-gray-500">{t("booking")}</p><p className="font-bold text-white">{activeRes.bookingNo}</p></div>
                    </div>
                  </div>

                  {/* Live charges */}
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
                            <span className="text-gray-400">{p.receiptNo} • {t(p.method)}</span>
                            <span className="text-emerald-400 font-semibold">{formatMoney(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extend stay */}
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
                    <button onClick={confirmExtend} disabled={extending || !extendPreview()} className="btn-primary w-full flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> {extending ? t("loading") : t("confirmExtension")}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={openPayForm} className="btn-success flex items-center justify-center gap-2">
                      <CreditCard className="w-4 h-4" /> {t("recordPayment")}
                    </button>
                    <button onClick={() => setInvoiceFor(activeRes._id)} className="btn-secondary flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" /> {t("viewInvoice")}
                    </button>
                    <button onClick={doCheckOut} className="btn-danger flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" /> {t("checkOut")}
                    </button>
                  </div>

                  {/* Payment form */}
                  {showPay && (
                    <form onSubmit={submitPayment} className="card-dark p-4 space-y-4">
                      <h3 className="text-sm font-bold text-white">{t("recordPayment")}</h3>
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
      {invoiceFor && (
        <InvoiceOverlay reservationId={invoiceFor} onClose={() => setInvoiceFor(null)} />
      )}
    </div>
  );
}