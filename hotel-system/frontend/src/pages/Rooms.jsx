import { useEffect, useState } from "react";

import api from "../api";

import ResponsiveTable from "../components/ResponsiveTable.jsx";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    roomNumber: "",
    floor: "",
    roomType: "Standard",
    basePrice: "",
    extraBedPrice: "",
    overtimeHourlyRate: ""
  });

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms");

      setRooms(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rooms");
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const createRoom = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      const payload = {
        roomNumber: form.roomNumber,
        floor: form.floor ? Number(form.floor) : 1,
        roomType: form.roomType,
        basePrice: Number(form.basePrice || 0),
        extraBedPrice: Number(form.extraBedPrice || 0),
        overtimeHourlyRate: Number(form.overtimeHourlyRate || 0)
      };

      await api.post("/rooms", payload);

      setMessage("Room created successfully");

      setForm({
        roomNumber: "",
        floor: "",
        roomType: "Standard",
        basePrice: "",
        extraBedPrice: "",
        overtimeHourlyRate: ""
      });

      loadRooms();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const disableRoom = async (id) => {
    try {
      setMessage("");
      setError("");

      await api.delete(`/rooms/${id}`);

      setMessage("Room disabled");

      loadRooms();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disable room");
    }
  };

  const columns = [
    {
      key: "roomNumber",
      label: "Room"
    },
    {
      key: "floor",
      label: "Floor"
    },
    {
      key: "roomType",
      label: "Type"
    },
    {
      key: "status",
      label: "Status"
    },
    {
      key: "basePrice",
      label: "Price",
      render: (room) => `$${Number(room.basePrice || 0)}`
    },
    {
      key: "active",
      label: "Active",
      render: (room) => (room.active ? "Yes" : "No")
    },
    {
      key: "actions",
      label: "Actions",
      render: (room) => (
        <div className="action-stack">
          {room.active ? (
            <button
              className="btn btn-danger"
              onClick={() => disableRoom(room._id)}
            >
              Disable
            </button>
          ) : (
            <span>-</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Add Room</h2>

            <div className="page-subtitle">
              Create a new room for reservations.
            </div>
          </div>
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={createRoom} className="form-grid">
          <div className="form-field">
            <label>Room Number</label>

            <input
              name="roomNumber"
              placeholder="Example: 101"
              value={form.roomNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Floor</label>

            <input
              type="number"
              name="floor"
              placeholder="Example: 1"
              value={form.floor}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Room Type</label>

            <input
              name="roomType"
              placeholder="Example: Deluxe"
              value={form.roomType}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Base Price</label>

            <input
              type="number"
              name="basePrice"
              placeholder="Example: 100"
              value={form.basePrice}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Extra Bed Price</label>

            <input
              type="number"
              name="extraBedPrice"
              placeholder="Example: 20"
              value={form.extraBedPrice}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Overtime Hourly Rate</label>

            <input
              type="number"
              name="overtimeHourlyRate"
              placeholder="Example: 10"
              value={form.overtimeHourlyRate}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Rooms</h2>

            <div className="page-subtitle">
              Manage hotel rooms.
            </div>
          </div>
        </div>

        <ResponsiveTable
          columns={columns}
          data={rooms}
          emptyMessage="No rooms found."
        />
      </div>
    </div>
  );
}