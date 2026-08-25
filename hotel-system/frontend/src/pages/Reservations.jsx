import { useEffect, useState } from "react";

import api from "../api";

import ResponsiveTable from "../components/ResponsiveTable.jsx";
import { useSettings } from "../SettingsContext";


export default function Reservations() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { formatMoney, formatDateTime } = useSettings();

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

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState("");

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms?active=true");

      setRooms(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReservations = async () => {
    try {
      const response = await api.get("/reservations");

      setReservations(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load reservations"
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

  const calculateSubtotal = () => {
    const room = rooms.find((item) => item._id === form.roomId);

    if (!room || !form.scheduledCheckIn || !form.scheduledCheckOut) {
      return 0;
    }

    const checkIn = new Date(form.scheduledCheckIn);
    const checkOut = new Date(form.scheduledCheckOut);

    const nights = Math.max(
      1,
      Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000))
    );

    const roomCharge = nights * Number(room.basePrice || 0);

    const extraBedCharge =
      Number(form.extraBeds || 0) *
      nights *
      Number(room.extraBedPrice || 0);

    return roomCharge + extraBedCharge;
  };

  const validateVoucher = async () => {
    try {
      setMessage("");
      setError("");
      setVoucherMessage("");

      const subtotal = calculateSubtotal();

      if (subtotal <= 0) {
        setVoucherMessage("Select room and dates first.");
        return;
      }

      const response = await api.post("/vouchers/validate", {
        code: voucherCode,
        subtotal
      });

      setAppliedVoucher(response.data);

      setVoucherMessage(
        `Applied: -${formatMoney(response.data.discount)}`
      );
    } catch (err) {
      setAppliedVoucher(null);

      setVoucherMessage(
        err.response?.data?.message || "Invalid voucher code"
      );
    }
  };

  const createReservation = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      if (!form.roomId || !form.scheduledCheckIn || !form.scheduledCheckOut) {
        setError("Please select room, check-in and check-out");
        return;
      }

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
        extraBeds: Number(form.extraBeds || 0),
        voucherId: appliedVoucher?.voucherId || null
      };

      await api.post("/reservations", payload);

      setMessage("Reservation created successfully");

      setForm({
        roomId: "",
        guestName: "",
        guestPhone: "",
        scheduledCheckIn: "",
        scheduledCheckOut: "",
        adults: 1,
        children: 0,
        extraBeds: 0
      });

      setVoucherCode("");
      setAppliedVoucher(null);
      setVoucherMessage("");

      loadReservations();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create reservation"
      );
    }
  };

  const checkIn = async (id) => {
    try {
      await api.post(`/reservations/${id}/check-in`);

      setMessage("Checked in successfully");

      loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Check-in failed");
    }
  };

  const checkOut = async (id) => {
    try {
      await api.post(`/reservations/${id}/check-out`);

      setMessage("Checked out successfully");

      loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Check-out failed");
    }
  };

  const cancelReservation = async (id) => {
    try {
      await api.post(`/reservations/${id}/cancel`, {});

      setMessage("Reservation cancelled");

      loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Cancel failed");
    }
  };

  const columns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.roomId?.roomNumber || "-"
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => row.guest?.name || "-"
    },
    {
      key: "scheduledCheckIn",
      label: "Check In",
      render: (row) => formatDateTime(row.scheduledCheckIn)
    },
    {
      key: "scheduledCheckOut",
      label: "Check Out",
      render: (row) => formatDateTime(row.scheduledCheckOut)
    },
    {
      key: "voucher",
      label: "Voucher",
      render: (row) => row.voucherCode || "-"
    },
    {
      key: "total",
      label: "Total",
      render: (row) => formatMoney(row.priceSnapshot?.total)
    },
    {
      key: "status",
      label: "Status"
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="action-stack">
          {row.status === "reserved" ? (
            <>
              <button
                className="btn btn-primary"
                onClick={() => checkIn(row._id)}
              >
                Check In
              </button>

              <button
                className="btn btn-danger"
                onClick={() => cancelReservation(row._id)}
              >
                Cancel
              </button>
            </>
          ) : null}

          {row.status === "checked_in" ? (
            <button
              className="btn btn-success"
              onClick={() => checkOut(row._id)}
            >
              Check Out
            </button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Create Reservation</h2>

            <div className="page-subtitle">
              Book a room for a guest.
            </div>
          </div>
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={createReservation} className="form-grid">
          <div className="form-field">
            <label>Room</label>

            <select
              name="roomId"
              value={form.roomId}
              onChange={handleChange}
              required
            >
              <option value="">Select room</option>

              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.roomNumber} - {room.roomType} -{" "}
                  {formatMoney(room.basePrice)}/night
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Guest Name</label>

            <input
              name="guestName"
              placeholder="Guest name"
              value={form.guestName}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Guest Phone</label>

            <input
              name="guestPhone"
              placeholder="Guest phone"
              value={form.guestPhone}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Check In</label>

            <input
              type="datetime-local"
              name="scheduledCheckIn"
              value={form.scheduledCheckIn}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Check Out</label>

            <input
              type="datetime-local"
              name="scheduledCheckOut"
              value={form.scheduledCheckOut}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Adults</label>

            <input
              type="number"
              name="adults"
              value={form.adults}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Children</label>

            <input
              type="number"
              name="children"
              value={form.children}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Extra Beds</label>

            <input
              type="number"
              name="extraBeds"
              value={form.extraBeds}
              onChange={handleChange}
            />
          </div>

          <div className="form-field field-full">
            <label>Voucher Code</label>

            <div className="action-stack">
              <input
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setAppliedVoucher(null);
                  setVoucherMessage("");
                }}
                placeholder="Enter voucher code"
              />

              <button
                type="button"
                className="btn btn-secondary"
                onClick={validateVoucher}
              >
                Apply
              </button>
            </div>

            {voucherMessage ? (
              <div
                className={
                  voucherMessage.includes("Applied")
                    ? "alert alert-success"
                    : "alert alert-error"
                }
              >
                {voucherMessage}
              </div>
            ) : null}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create Reservation
            </button>
          </div>
        </form>
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Reservations</h2>

            <div className="page-subtitle">
              Manage bookings, check-in and check-out.
            </div>
          </div>
        </div>

        <ResponsiveTable
          columns={columns}
          data={reservations}
          emptyMessage="No reservations found."
        />
      </div>
    </div>
  );
}