import { useEffect, useState } from "react";

import api from "../api";
import { useSettings } from "../SettingsContext";

export default function RoomBoard() {
  const [board, setBoard] = useState({
    rooms: [],
    tasks: []
  });

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { formatMoney } = useSettings();

  const loadBoard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/housekeeping/board");

      setBoard(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const selectedRoom = board.rooms.find(
    (room) => String(room._id) === String(selectedRoomId)
  );

  const selectedRoomTasks = board.tasks.filter((task) => {
    const taskRoomId = task.roomId?._id || task.roomId;

    return String(taskRoomId) === String(selectedRoomId);
  });

  const getActiveTaskCount = (roomId) => {
    return board.tasks.filter((task) => {
      const taskRoomId = task.roomId?._id || task.roomId;

      return String(taskRoomId) === String(roomId);
    }).length;
  };

  const changeRoomStatus = async (status) => {
    try {
      setMessage("");
      setError("");

      await api.patch(`/housekeeping/room-status/${selectedRoomId}`, {
        status
      });

      setMessage(`Room status changed to ${status}`);

      loadBoard();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update room");
    }
  };

  const createTask = async (type) => {
    try {
      setMessage("");
      setError("");

      await api.post("/housekeeping/tasks", {
        roomId: selectedRoomId,
        type,
        priority: "normal",
        notes: ""
      });

      setMessage(`${type} task created`);

      loadBoard();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create task");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Room Status Board</h2>

        {loading ? <div>Loading...</div> : null}

        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <div className="room-board">
          {board.rooms.map((room) => (
            <div
              key={room._id}
              className={`room-card status-${room.status} ${
                String(room._id) === String(selectedRoomId) ? "selected" : ""
              }`}
              onClick={() => setSelectedRoomId(room._id)}
            >
              <h3>{room.roomNumber}</h3>

              <div>{room.roomType}</div>
              <div>{formatMoney(room.basePrice)}</div>
              <div className="room-status-label">{room.status}</div>
              <div>Tasks: {getActiveTaskCount(room._id)}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedRoom ? (
        <div className="card">
          <h2>Room {selectedRoom.roomNumber}</h2>

          <p>
            <strong>Status:</strong> {selectedRoom.status}
          </p>

          <p>
            <strong>Floor:</strong> {selectedRoom.floor}
          </p>

          <p>
            <strong>Type:</strong> {selectedRoom.roomType}
          </p>

          {selectedRoom.status === "occupied" ? (
            <p className="error">
              This room is occupied. Checkout must be done from Reservations.
            </p>
          ) : (
            <div>
              <button onClick={() => changeRoomStatus("available")}>
                Set Available
              </button>

              <button onClick={() => changeRoomStatus("cleaning")}>
                Set Cleaning
              </button>

              <button onClick={() => changeRoomStatus("maintenance")}>
                Set Maintenance
              </button>

              <button onClick={() => changeRoomStatus("blocked")}>
                Set Blocked
              </button>

              <button onClick={() => createTask("cleaning")}>
                Create Cleaning Task
              </button>

              <button onClick={() => createTask("maintenance")}>
                Create Maintenance Task
              </button>
            </div>
          )}

          <h3>Active Tasks</h3>

          {selectedRoomTasks.length === 0 ? (
            <p>No active tasks for this room.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                </tr>
              </thead>

              <tbody>
                {selectedRoomTasks.map((task) => (
                  <tr key={task._id}>
                    <td>{task.type}</td>
                    <td>{task.priority}</td>
                    <td>{task.status}</td>
                    <td>{task.assignedTo?.name || "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          Click a room to manage housekeeping status.
        </div>
      )}
    </div>
  );
}