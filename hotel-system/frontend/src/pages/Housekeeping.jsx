import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { Plus, Loader2, Play, CheckCircle, XCircle } from "lucide-react";

export default function Housekeeping() {
  const { formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    roomId: "",
    type: "cleaning",
    priority: "normal",
    assignedTo: "",
    notes: ""
  });

  const role = user?.role || "reception";
  const isStaff = role === "cleaner" || role === "maintenance";

  const loadAll = async () => {
    try {
      setLoading(true);

      // Fetch tasks, rooms, and staff users in parallel
      const [taskRes, roomRes, staffRes] = await Promise.all([
        api.get("/housekeeping/tasks"),
        api.get("/rooms?active=true"),
        // FIX: Only fetch cleaner + maintenance users for the assign dropdown
        api.get("/users?role=cleaner,maintenance"),
      ]);

      setRooms(roomRes.data);
      setStaffUsers(staffRes.data || []);

      // FIX: If user is cleaner/maintenance, only show tasks assigned to them
      if (isStaff) {
        const myTasks = taskRes.data.filter((task) => {
          const assignedId = task.assignedTo?._id || task.assignedTo;
          return String(assignedId) === String(user._id);
        });
        setTasks(myTasks);
      } else {
        setTasks(taskRes.data);
      }
    } catch (error) {
      console.error("Load housekeeping error:", error);
      addToast("Failed to load housekeeping data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Real-time refresh
  useRealTimeRefresh(loadAll, ["housekeeping:updated", "rooms:updated"]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreateModal = () => {
    setForm({
      roomId: "",
      // FIX: Default type based on user role
      type: role === "maintenance" ? "maintenance" : "cleaning",
      priority: "normal",
      assignedTo: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: form.roomId,
        type: form.type,
        priority: form.priority,
        notes: form.notes,
        // FIX: Auto-assign to self if cleaner/maintenance creates task
        // Otherwise use the selected assignedTo (for reception/manager/admin)
        assignedTo: isStaff ? user._id : (form.assignedTo || undefined),
      };

      await api.post("/housekeeping/tasks", payload);
      addToast(t("taskCreated"));
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      console.error("Create task error:", err);
      addToast(err.response?.data?.message || "Failed to create task", "error");
    }
  };

  const startTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/start`);
      loadAll();
    } catch (e) {
      addToast(e.response?.data?.message || "Failed to start task", "error");
    }
  };

  const completeTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/complete`);
      addToast(t("taskCompleted"));
      loadAll();
    } catch (e) {
      addToast(e.response?.data?.message || "Failed to complete task", "error");
    }
  };

  const cancelTask = async (id) => {
    try {
      await api.post(`/housekeeping/tasks/${id}/cancel`);
      loadAll();
    } catch (e) {
      addToast(e.response?.data?.message || "Failed to cancel task", "error");
    }
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-600",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700",
    urgent: "bg-red-100 text-red-700"
  };

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-100 text-gray-500"
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("housekeepingTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isStaff
              ? `${t("yourTasks")} (${role})`
              : t("housekeepingSubtitle")}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> {t("newTask")}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("type")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("priority")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("assigned")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("created")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-sm">{task.roomId?.roomNumber || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{task.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {task.assignedTo?.name || t("unassigned")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDateTime(task.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {task.status === "pending" && (
                          <>
                            <button
                              onClick={() => startTask(task._id)}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="Start"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelTask(task._id)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {task.status === "in_progress" && (
                          <>
                            <button
                              onClick={() => completeTask(task._id)}
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="Complete"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelTask(task._id)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                {isStaff ? "No tasks assigned to you yet." : t("noData")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("newTask")}
      >
        <form onSubmit={createTask} className="space-y-5">
          {/* FIX: Show auto-assign notice for staff */}
          {isStaff && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
              This task will be automatically assigned to you.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label-primary">{t("room")}</label>
              <select
                name="roomId"
                value={form.roomId}
                onChange={handleChange}
                required
                className="input-primary"
              >
                <option value="">{t("selectRoom")}</option>
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    {room.roomNumber} - {room.roomType} ({room.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-primary">{t("type")}</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="input-primary"
              >
                <option value="cleaning">{t("cleaningType")}</option>
                <option value="maintenance">{t("maintenanceType")}</option>
                <option value="inspection">{t("inspection")}</option>
              </select>
            </div>

            <div>
              <label className="label-primary">{t("priority")}</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="input-primary"
              >
                <option value="low">{t("low")}</option>
                <option value="normal">{t("normal")}</option>
                <option value="high">{t("high")}</option>
                <option value="urgent">{t("urgent")}</option>
              </select>
            </div>

            {/* FIX: Only show Assign To dropdown for admin/manager/reception */}
            {!isStaff && staffUsers.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label-primary">{t("assignTo")}</label>
                <select
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  className="input-primary"
                >
                  <option value="">{t("unassigned")}</option>
                  {staffUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="label-primary">{t("notes")}</label>
              <input
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="input-primary"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              {t("createTaskBtn")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}