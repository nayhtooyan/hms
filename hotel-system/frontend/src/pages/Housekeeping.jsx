import { useEffect, useState } from "react";

import api from "../api";

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

export default function Housekeeping() {
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    roomId: "",
    type: "cleaning",
    priority: "normal",
    assignedTo: "",
    notes: ""
  });

  const loadTasks = async () => {
    try {
      const response = await api.get("/housekeeping/tasks");

      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load tasks");
    }
  };

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms?active=true");

      setRooms(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get("/users");

      setUsers(response.data);
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);

      await Promise.all([loadTasks(), loadRooms(), loadUsers()]);

      setLoading(false);
    };

    loadAll();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const createTask = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      const payload = {
        roomId: form.roomId,
        type: form.type,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        notes: form.notes
      };

      await api.post("/housekeeping/tasks", payload);

      setMessage("Task created");

      setForm({
        roomId: "",
        type: "cleaning",
        priority: "normal",
        assignedTo: "",
        notes: ""
      });

      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create task");
    }
  };

  const startTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/start`);

      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to start task");
    }
  };

  const completeTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/complete`);

      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to complete task");
    }
  };

  const cancelTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/cancel`);

      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to cancel task");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Create Housekeeping Task</h2>

        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <form onSubmit={createTask}>
          <select
            name="roomId"
            value={form.roomId}
            onChange={handleChange}
            required
          >
            <option value="">Select room</option>

            {rooms.map((room) => (
              <option key={room._id} value={room._id}>
                {room.roomNumber} - {room.roomType} - {room.status}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
          >
            <option value="cleaning">Cleaning</option>
            <option value="maintenance">Maintenance</option>
            <option value="inspection">Inspection</option>
          </select>

          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {users.length > 0 ? (
            <select
              name="assignedTo"
              value={form.assignedTo}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>

              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          ) : null}

          <input
            name="notes"
            placeholder="Notes"
            value={form.notes}
            onChange={handleChange}
          />

          <button type="submit">Create Task</button>
        </form>
      </div>

      <div className="card">
        <h2>Housekeeping Tasks</h2>

        {loading ? <div>Loading...</div> : null}

        {!loading && tasks.length === 0 ? (
          <div>No housekeeping tasks found.</div>
        ) : null}

        {!loading && tasks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>{task.roomId?.roomNumber || "-"}</td>
                  <td>{task.type}</td>
                  <td>{task.priority}</td>
                  <td>{task.status}</td>
                  <td>{task.assignedTo?.name || "Unassigned"}</td>
                  <td>{formatDateTime(task.createdAt)}</td>
                  <td>
                    {task.status === "pending" ? (
                      <>
                        <button onClick={() => startTask(task._id)}>
                          Start
                        </button>

                        <button
                          onClick={() => cancelTask(task._id)}
                          style={{ background: "red" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}

                    {task.status === "in_progress" ? (
                      <>
                        <button onClick={() => completeTask(task._id)}>
                          Complete
                        </button>

                        <button
                          onClick={() => cancelTask(task._id)}
                          style={{ background: "red" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}