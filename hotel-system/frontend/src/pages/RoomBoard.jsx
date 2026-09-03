import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Loader2, RefreshCw, BedDouble, Plus, UserPlus, Ticket, Users } from "lucide-react";

export default function RoomBoard() {
  const { formatMoney } = useSettings();
  const { addToast } = useToast();
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

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms?active=true");
      setRooms(response.data);
    } catch (error) {
      addToast("Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const updateStatus = async (roomId, status) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status });
      addToast(`Room status updated to ${status}`);
      loadRooms();
    } catch (error) {
      addToast("Failed to update room status", "error");
    }
  };

  const openReserve = (room) => {
    setIsWalkIn(false);
    setForm({
      roomId: room._id,
      guestName: "", guestPhone: "",
      guestType: "local", nrc: "", passport: "",
      scheduledCheckIn: "", scheduledCheckOut: "",
      adults: 1, children: 0, extraBeds: 0
    });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const openWalkIn = (room) => {
    setIsWalkIn(true);
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      roomId: room._id,
      guestName: "", guestPhone: "",
      guestType: "local", nrc: "", passport: "",
      scheduledCheckIn: localISO, scheduledCheckOut: "",
      adults: 1, children: 0, extraBeds: 0
    });
    setVoucherCode(""); setAppliedVoucher(null); setVoucherMessage("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculateSubtotal = () => {
    const room = rooms.find(r => r._id === form.roomId);
    if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) return 0;
    const nights = Math.max(1, Math.ceil((new Date(form.scheduledCheckOut) - new Date(form.scheduledCheckIn)) / 86400000));
    return (nights * Number(room.basePrice || 0)) + (Number(form.extraBeds || 0) * nights * Number(room.extraBedPrice || 0));
  };

  const validateVoucher = async () => {
    try {
      const subtotal = calculateSubtotal();
      if (subtotal <= 0) { setVoucherMessage("Select dates first."); return; }
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
          name: form.guestName,
          phone: form.guestPhone,
          guestType: form.guestType,
          nrc: form.guestType === "local" ? form.nrc : "",
          passport: form.guestType === "foreigner" ? form.passport : "",
        },
        scheduledCheckIn: new Date(form.scheduledCheckIn).toISOString(),
        scheduledCheckOut: new Date(form.scheduledCheckOut).toISOString(),
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        extraBeds: Number(form.extraBeds || 0),
        voucherId: appliedVoucher?.voucherId || null,
        source: isWalkIn ? "walk_in" : "reception",
      };

      const res = await api.post("/reservations", payload);

      if (isWalkIn && res.data?._id) {
        await api.post(`/reservations/${res.data._id}/check-in`);
        addToast("Walk-in guest checked in successfully");
      } else {
        addToast("Reservation created successfully");
      }

      setIsModalOpen(false);
      loadRooms();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create reservation", "error");
    }
  };

  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const totalGuests = Number(form.adults || 0) + Number(form.children || 0);

  const statusConfig = {
    available: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-500" },
    occupied: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-500" },
    reserved: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-500" },
    cleaning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-500" },
    maintenance: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-500" },
    blocked: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-400" },
  };

  const filteredRooms = filter === "all" ? rooms : rooms.filter(r => r.status === filter);

  const floors = filteredRooms.reduce((acc, room) => {
    const floor = room.floor || 1;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

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
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Board</h1>
          <p className="text-gray-500 text-sm mt-1">Visual overview of all room statuses by floor.</p>
        </div>
        <button onClick={loadRooms} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === key
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)} ({count})
          </button>
        ))}
      </div>

      {sortedFloors.map((floor) => (
        <div key={floor}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-extrabold text-lg">{floor}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Floor {floor}</h2>
              <p className="text-xs text-gray-400">{floors[floor].length} rooms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {floors[floor].map((room) => {
              const config = statusConfig[room.status] || statusConfig.blocked;
              return (
                <div key={room._id} className={`${config.bg} ${config.border} border-2 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BedDouble className={`w-5 h-5 ${config.text}`} />
                      <span className="text-lg font-extrabold text-gray-900">{room.roomNumber}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${config.badge}`} />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 font-medium">{room.roomType}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600">
                      <Users className="w-3 h-3" /> {room.maxGuests || 2}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 mt-1">{formatMoney(room.basePrice)}/night</p>
                  <p className={`text-xs font-bold mt-2 capitalize ${config.text}`}>{room.status}</p>

                  <div className="mt-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {room.status === "available" && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openReserve(room)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Reserve
                        </button>
                        <button
                          onClick={() => openWalkIn(room)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" /> Walk-In
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {room.status !== "available" && (
                        <button onClick={() => updateStatus(room._id, "available")} className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition-colors">Available</button>
                      )}
                      {room.status !== "cleaning" && (
                        <button onClick={() => updateStatus(room._id, "cleaning")} className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors">Cleaning</button>
                      )}
                      {room.status !== "maintenance" && (
                        <button onClick={() => updateStatus(room._id, "maintenance")} className="px-2.5 py-1 text-xs rounded-lg bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition-colors">Maint.</button>
                      )}
                      {room.status !== "blocked" && (
                        <button onClick={() => updateStatus(room._id, "blocked")} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors">Block</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredRooms.length === 0 && (
        <div className="text-center py-16 text-gray-400">No rooms found for this filter.</div>
      )}

      {/* Reservation / Walk-In Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isWalkIn ? `Walk-In — Room ${selectedRoom?.roomNumber || ""}` : `Reserve — Room ${selectedRoom?.roomNumber || ""}`}
        size="lg"
      >
        <form onSubmit={createReservation} className="space-y-5">
          {isWalkIn && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
              Walk-in mode: Guest will be checked in immediately after creation.
            </div>
          )}

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <BedDouble className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-bold text-gray-900">Room {selectedRoom?.roomNumber} — {selectedRoom?.roomType}</p>
                <p className="text-sm text-gray-500">
                  {formatMoney(selectedRoom?.basePrice || 0)}/night • Floor {selectedRoom?.floor || 1} • Max {selectedRoom?.maxGuests || 2} guests
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">Guest Name</label><input name="guestName" value={form.guestName} onChange={handleChange} className="input-primary" required /></div>
            <div><label className="label-primary">Guest Phone</label><input name="guestPhone" value={form.guestPhone} onChange={handleChange} className="input-primary" /></div>

            <div className="sm:col-span-2">
              <label className="label-primary">Guest Type</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setForm({ ...form, guestType: "local" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "local" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  Local (NRC)
                </button>
                <button type="button" onClick={() => setForm({ ...form, guestType: "foreigner" })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.guestType === "foreigner" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  Foreigner (Passport)
                </button>
              </div>
            </div>

            {form.guestType === "local" ? (
              <div className="sm:col-span-2"><label className="label-primary">NRC Number</label><input name="nrc" value={form.nrc} onChange={handleChange} className="input-primary" placeholder="e.g. 12/YGN(N)123456" /></div>
            ) : (
              <div className="sm:col-span-2"><label className="label-primary">Passport Number</label><input name="passport" value={form.passport} onChange={handleChange} className="input-primary" placeholder="e.g. MA123456" /></div>
            )}

            <div>
              <label className="label-primary">Check In</label>
              <input type="datetime-local" name="scheduledCheckIn" value={form.scheduledCheckIn} onChange={handleChange} required className="input-primary" disabled={isWalkIn} />
              {isWalkIn && <p className="text-xs text-gray-400 mt-1">Walk-in: check-in is set to now</p>}
            </div>
            <div><label className="label-primary">Check Out</label><input type="datetime-local" name="scheduledCheckOut" value={form.scheduledCheckOut} onChange={handleChange} required className="input-primary" /></div>

            <div><label className="label-primary">Adults</label><input type="number" name="adults" value={form.adults} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">Children</label><input type="number" name="children" value={form.children} onChange={handleChange} className="input-primary" /></div>
            <div><label className="label-primary">Extra Beds</label><input type="number" name="extraBeds" value={form.extraBeds} onChange={handleChange} className="input-primary" /></div>

            {selectedRoom && totalGuests > (selectedRoom?.maxGuests || 2) && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                Warning: Total guests ({totalGuests}) exceeds room capacity ({selectedRoom?.maxGuests || 2}). You can still proceed.
              </div>
            )}

            <div>
              <label className="label-primary">Voucher Code</label>
              <div className="flex gap-2">
                <input value={voucherCode} onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); setVoucherMessage(""); }} className="input-primary" placeholder="Enter code" />
                <button type="button" onClick={validateVoucher} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors whitespace-nowrap"><Ticket className="w-4 h-4" /></button>
              </div>
              {voucherMessage && <p className={`text-xs mt-2 font-medium ${appliedVoucher ? "text-emerald-600" : "text-red-500"}`}>{voucherMessage}</p>}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all ${isWalkIn ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700"}`}>
              {isWalkIn ? "Check In Walk-In Guest" : "Create Reservation"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}