import { useEffect, useState } from "react";

import api from "../api";

export default function Reservations() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    roomId: "",
    guestName: "",
    guestPhone: "",
    scheduledCheckIn: "",
    scheduledCheckOut: "",
    adults: 1,
    children: 0,
    extraBeds: 0
  });

  const loadRooms = async () => {
    try {
      const res = await api.get("/rooms?active=true");

      setRooms(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load rooms");
    }
  };

  const loadReservations = async () => {
    try {
      const res = await api.get("/reservations");

      setReservations(res.data);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load reservations"
      );
    }
  };

  useEffect(() => {
    loadRooms();
    loadReservations();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const createReservation = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        roomId: form.roomId,
        guest: {
          name: form.guestName,
          phone: form.guestPhone
        },
        scheduledCheckIn: new Date(form.scheduledCheckIn).toISOString(),
        scheduledCheckOut: new Date(form.scheduledCheckOut).toISOString(),
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        extraBeds: Number(form.extraBeds || 0)
      };

      await api.post("/reservations", payload);

      setMessage("Reservation created");

      loadReservations();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to create reservation"
      );
    }
  };

  const checkIn = async (id) => {
    try {
      await api.post(`/reservations/${id}/check-in`);

      setMessage("Checked in");

      loadReservations();
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-in failed");
    }
  };

  const checkOut = async (id) => {
    try {
      await api.post(`/reservations/${id}/check-out`);

      setMessage("Checked out");

      loadReservations();
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-out failed");
    }
  };

  const cancelReservation = async (id) => {
    try {
      await api.post(`/reservations/${id}/cancel`, {});

      setMessage("Reservation cancelled");

      loadReservations();
    } catch (error) {
      setMessage(error.response?.data?.message || "Cancel failed");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Create Reservation</h2>

        {message ? <div>{message}</div> : null}

        <form onSubmit={createReservation}>
          <select
            name="roomId"
            value={form.roomId}
            onChange={handleChange}
          >
            <option value="">Select room</option>

            {rooms.map((room) => (
              <option key={room._id} value={room._id}>
                {room.roomNumber} - {room.roomType} - {room.basePrice}
              </option>
            ))}
          </select>

          <input
            name="guestName"
            placeholder="Guest Name"
            value={form.guestName}
            onChange={handleChange}
          />

          <input
            name="guestPhone"
            placeholder="Guest Phone"
            value={form.guestPhone}
            onChange={handleChange}
          />

          <input
            type="datetime-local"
            name="scheduledCheckIn"
            value={form.scheduledCheckIn}
            onChange={handleChange}
          />

          <input
            type="datetime-local"
            name="scheduledCheckOut"
            value={form.scheduledCheckOut}
            onChange={handleChange}
          />

          <input
            type="number"
            name="adults"
            placeholder="Adults"
            value={form.adults}
            onChange={handleChange}
          />

          <input
            type="number"
            name="children"
            placeholder="Children"
            value={form.children}
            onChange={handleChange}
          />

          <input
            type="number"
            name="extraBeds"
            placeholder="Extra Beds"
            value={form.extraBeds}
            onChange={handleChange}
          />

          <button type="submit">Create Reservation</button>
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
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation._id}>
                <td>{reservation.bookingNo}</td>
                <td>{reservation.roomId?.roomNumber}</td>
                <td>{reservation.guest?.name}</td>
                <td>
                  {new Date(reservation.scheduledCheckIn).toLocaleString()}
                </td>
                <td>
                  {new Date(reservation.scheduledCheckOut).toLocaleString()}
                </td>
                <td>{reservation.status}</td>
                <td>{reservation.priceSnapshot?.total}</td>
                <td>
                  {reservation.status === "reserved" ? (
                    <>
                      <button onClick={() => checkIn(reservation._id)}>
                        Check In
                      </button>

                      <button
                        onClick={() => cancelReservation(reservation._id)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}

                  {reservation.status === "checked_in" ? (
                    <button onClick={() => checkOut(reservation._id)}>
                      Check Out
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}