import { useEffect, useState } from "react";
import api from "../api";

export default function Reservations() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    roomId: "", guestName: "", guestPhone: "",
    scheduledCheckIn: "", scheduledCheckOut: "",
    adults: 1, children: 0, extraBeds: 0
  });

  // Voucher States
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMsg, setVoucherMsg] = useState("");

  const loadRooms = async () => {
    const res = await api.get("/rooms?active=true");
    setRooms(res.data);
  };

  const loadReservations = async () => {
    const res = await api.get("/reservations");
    setReservations(res.data);
  };

  useEffect(() => { loadRooms(); loadReservations(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Calculate current subtotal for voucher validation
  const calculateSubtotal = () => {
    const room = rooms.find(r => r._id === form.roomId);
    if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) return 0;
    
    const checkIn = new Date(form.scheduledCheckIn);
    const checkOut = new Date(form.scheduledCheckOut);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000)));
    
    const roomCharge = nights * Number(room.basePrice || 0);
    const extraBedCharge = Number(form.extraBeds || 0) * nights * Number(room.extraBedPrice || 0);
    return roomCharge + extraBedCharge;
  };

  const validateVoucher = async () => {
    if (!voucherCode) return;
    const subtotal = calculateSubtotal();
    if (subtotal <= 0) {
      setVoucherMsg("Please select room and dates first.");
      return;
    }

    try {
      const res = await api.post("/vouchers/validate", { code: voucherCode, subtotal });
      setAppliedVoucher(res.data);
      setVoucherMsg(`Applied: -$${res.data.discount}`);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherMsg(`${err.response?.data?.message || "Invalid code"}`);
    }
  };

  const createReservation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: form.roomId,
        guest: { name: form.guestName, phone: form.guestPhone },
        scheduledCheckIn: new Date(form.scheduledCheckIn).toISOString(),
        scheduledCheckOut: new Date(form.scheduledCheckOut).toISOString(),
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        extraBeds: Number(form.extraBeds || 0),
        voucherId: appliedVoucher?.voucherId || null
      };

      await api.post("/reservations", payload);
      setMessage("Reservation created successfully!");
      
      // Reset form
      setForm({ roomId: "", guestName: "", guestPhone: "", scheduledCheckIn: "", scheduledCheckOut: "", adults: 1, children: 0, extraBeds: 0 });
      setVoucherCode("");
      setAppliedVoucher(null);
      setVoucherMsg("");
      
      loadReservations();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create reservation");
    }
  };

  // 
  const checkIn = async (id) => { await api.post(`/reservations/${id}/check-in`); loadReservations(); };
  const checkOut = async (id) => { await api.post(`/reservations/${id}/check-out`); loadReservations(); };
  const cancelReservation = async (id) => { await api.post(`/reservations/${id}/cancel`, {}); loadReservations(); };

  return (
    <div>
      <div className="card">
        <h2>Create Reservation</h2>
        {message && <div className="success">{message}</div>}
        
        <form onSubmit={createReservation} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "500px" }}>
          <select name="roomId" value={form.roomId} onChange={handleChange} required>
            <option value="">Select room</option>
            {rooms.map((room) => (
              <option key={room._id} value={room._id}>
                {room.roomNumber} - {room.roomType} - ${room.basePrice}/night
              </option>
            ))}
          </select>

          <input name="guestName" placeholder="Guest Name" value={form.guestName} onChange={handleChange} required />
          <input name="guestPhone" placeholder="Guest Phone" value={form.guestPhone} onChange={handleChange} />

          <div style={{display: "flex", gap: "10px"}}>
            <label>Check-In:<br/><input type="datetime-local" name="scheduledCheckIn" value={form.scheduledCheckIn} onChange={handleChange} required /></label>
            <label>Check-Out:<br/><input type="datetime-local" name="scheduledCheckOut" value={form.scheduledCheckOut} onChange={handleChange} required /></label>
          </div>

          <div style={{display: "flex", gap: "10px"}}>
            <input type="number" name="adults" placeholder="Adults" value={form.adults} onChange={handleChange} />
            <input type="number" name="children" placeholder="Children" value={form.children} onChange={handleChange} />
            <input type="number" name="extraBeds" placeholder="Extra Beds" value={form.extraBeds} onChange={handleChange} />
          </div>

          {/* Voucher Section */}
          <div style={{ border: "1px solid #ddd", padding: "10px", borderRadius: "8px", marginTop: "10px" }}>
            <label>Voucher Code:</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input 
                value={voucherCode} 
                onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); setVoucherMsg(""); }} 
                placeholder="e.g. WELCOME50" 
                style={{flex: 1}}
              />
              <button type="button" onClick={validateVoucher} style={{background: "#16a34a"}}>Apply</button>
            </div>
            {voucherMsg && <small style={{ color: voucherMsg.includes("❌") ? "red" : "green" }}>{voucherMsg}</small>}
          </div>

          <button type="submit" style={{marginTop: "20px", padding: "12px", fontSize: "16px"}}>Create Reservation</button>
        </form>
      </div>

      <div className="card">
        <h2>Reservations</h2>
        <table>
          <thead>
            <tr>
              <th>Booking No</th>
              <th>Room</th>
              <th>Guest</th>
              <th>Dates</th>
              <th>Voucher</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r._id}>
                <td>{r.bookingNo}</td>
                <td>{r.roomId?.roomNumber}</td>
                <td>{r.guest?.name}</td>
                <td>
                  {new Date(r.scheduledCheckIn).toLocaleDateString()} <br/>
                  <small>to {new Date(r.scheduledCheckOut).toLocaleDateString()}</small>
                </td>
                <td>{r.voucherCode ? <strong>{r.voucherCode}</strong> : "-"}</td>
                <td>${r.priceSnapshot?.total} <br/> <small style={{color:"green"}}>Disc: ${r.priceSnapshot?.voucherDiscount}</small></td>
                <td>{r.status}</td>
                <td>
                  {r.status === "reserved" && (
                    <>
                      <button onClick={() => checkIn(r._id)}>Check In</button>
                      <button onClick={() => cancelReservation(r._id)} style={{background:"red"}}>Cancel</button>
                    </>
                  )}
                  {r.status === "checked_in" && <button onClick={() => checkOut(r._id)}>Check Out</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}