import { useEffect, useState } from "react";

import api from "../api";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    roomNumber: "",
    floor: "",
    roomType: "Standard",
    basePrice: 0,
    extraBedPrice: 0,
    overtimeHourlyRate: 0
  });

  const loadRooms = async () => {
    try {
      const res = await api.get("/rooms");

      setRooms(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load rooms");
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
      const payload = {
        roomNumber: form.roomNumber,
        floor: form.floor ? Number(form.floor) : 1,
        roomType: form.roomType,
        basePrice: Number(form.basePrice || 0),
        extraBedPrice: Number(form.extraBedPrice || 0),
        overtimeHourlyRate: Number(form.overtimeHourlyRate || 0)
      };

      await api.post("/rooms", payload);

      setMessage("Room created");

      setForm({
        roomNumber: "",
        floor: "",
        roomType: "Standard",
        basePrice: 0,
        extraBedPrice: 0,
        overtimeHourlyRate: 0
      });

      loadRooms();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create room");
    }
  };

  const disableRoom = async (id) => {
    try {
      await api.delete(`/rooms/${id}`);

      setMessage("Room disabled");

      loadRooms();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to disable room");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Add Room</h2>

        {message ? <div>{message}</div> : null}

        <form onSubmit={createRoom}>
          <input
            name="roomNumber"
            placeholder="Room Number"
            value={form.roomNumber}
            onChange={handleChange}
          />

          <input
            name="floor"
            placeholder="Floor"
            value={form.floor}
            onChange={handleChange}
          />

          <input
            name="roomType"
            placeholder="Room Type"
            value={form.roomType}
            onChange={handleChange}
          />

          <input
            name="basePrice"
            type="number"
            placeholder="Base Price"
            value={form.basePrice}
            onChange={handleChange}
          />

          <input
            name="extraBedPrice"
            type="number"
            placeholder="Extra Bed Price"
            value={form.extraBedPrice}
            onChange={handleChange}
          />

          <input
            name="overtimeHourlyRate"
            type="number"
            placeholder="Overtime Hourly Rate"
            value={form.overtimeHourlyRate}
            onChange={handleChange}
          />

          <button type="submit">Create Room</button>
        </form>
      </div>

      <div className="card">
        <h2>Rooms</h2>

        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Floor</th>
              <th>Type</th>
              <th>Status</th>
              <th>Price</th>
              <th>Active</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {rooms.map((room) => (
              <tr key={room._id}>
                <td>{room.roomNumber}</td>
                <td>{room.floor}</td>
                <td>{room.roomType}</td>
                <td>{room.status}</td>
                <td>{room.basePrice}</td>
                <td>{room.active ? "Yes" : "No"}</td>
                <td>
                  <button onClick={() => disableRoom(room._id)}>
                    Disable
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}