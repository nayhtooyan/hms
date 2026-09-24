import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { Plus, Loader2, Play, CheckCircle, XCircle, Broom, Wrench, Eye } from "lucide-react";

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
    roomId: "", type: "cleaning", priority: "normal", assignedTo: "", notes: ""
  });

  const role = user?.role || "reception";
  const isStaff = role === "cleaner" || role === "maintenance";

  const loadAll = async () => {
    try {
      setLoading(true);
      const [taskRes, roomRes, staffRes] = await Promise.all([
        api.get("/housekeeping/tasks"),
        api.get("/rooms?active=true"),
        api.get("/users?role=cleaner,maintenance"),
      ]);

      setRooms(roomRes.data);
      setStaffUsers(staffRes.data || []);

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
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useRealTimeRefresh(loadAll, ["housekeeping:updated", "rooms:updated"]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreateModal = () => {
    setForm({
      roomId: "",
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
        assignedTo: isStaff ? user._id : (form.assignedTo || undefined),
      };
      await api.post("/housekeeping/tasks", payload);
      addToast(t("taskCreated"));
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    }
  };

  const startTask = async (id) => {
    try { await api.post(`/housekeeping/tasks/${id}/start`); loadAll(); }
    catch (e) { addToast(e.response?.data?.message || t("error"), "error"); }
  };

  const completeTask = async (id) => {
    try { await api.post(`/housekeeping/tasks/${id}/complete`); addToast(t("taskCompleted")); loadAll(); }
    catch (e) { addToast(e.response?.data?.message || t("error"), "error"); }
  };

  const cancelTask = async (id) => {
    try { await api.post(`/housekeeping/tasks/${id}/cancel`); loadAll(); }
    catch (e) { addToast(e.response?.data?.message || t("error"), "error"); }
  };

  const priorityStyles = {
    low: "badge-gray", normal: "badge-blue",
    high: "badge-amber", urgent: "badge-red"
  };

  const statusStyles = {
    pending: "badge-amber", in_progress: "badge-blue",
    completed: "badge-emerald", cancelled: "badge-gray"
  };

  const typeIcons = {
    cleaning: <span></span>,
    maintenance: <span></span>,
    inspection: <span></span>,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("housekeepingTitle")}</h1>
          <p className="page-subtitle-dark">
            {isStaff ? `${t("yourTasks")} (${t(role)})` : t("housekeepingSubtitle")}
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> {t("newTask")}
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>{t("room")}</th>
                  <th>{t("type")}</th>
                  <th>{t("priority")}</th>
                  <th>{t("status")}</th>
                  <th className="hidden md:table-cell">{t("assigned")}</th>
                  <th className="hidden lg:table-cell">{t("created")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td className="font-bold text-white">{task.roomId?.roomNumber || "-"}</td>
                    <td>
                      <div className="flex items-center gap-2 capitalize">
                        <span className="text-purple-400">{typeIcons[task.type] || typeIcons.cleaning}</span>
                        {t(`${task.type}Type`) || task.type}
                      </div>
                    </td>
                    <td><span className={priorityStyles[task.priority]}>{t(task.priority)}</span></td>
                    <td><span className={statusStyles[task.status]}>{t(task.status)}</span></td>
                    <td className="hidden md:table-cell">{task.assignedTo?.name || t("unassigned")}</td>
                    <td className="hidden lg:table-cell">{formatDateTime(task.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {task.status === "pending" && (
                          <>
                            <button onClick={() => startTask(task._id)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10" title={t("start")}><span>{t("start")}</span></button>
                            <button onClick={() => cancelTask(task._id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title={t("cancel")}><span>{t("cancle")}</span></button>
                          </>
                        )}
                        {task.status === "in_progress" && (
                          <>
                            <button onClick={() => completeTask(task._id)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title={t("completed")}><span>{t("completed")}</span></button>
                            <button onClick={() => cancelTask(task._id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title={t("cancel")}><span>{t("cancle")}</span></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                {isStaff ? t("noTasksAssigned") : t("noData")}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("newTask")}>
        <form onSubmit={createTask} className="space-y-5">
          {isStaff && <div className="alert-dark-info">{t("autoAssignNotice")}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label-dark">{t("room")}</label>
              <select name="roomId" value={form.roomId} onChange={handleChange} required className="input-dark">
                <option value="">{t("selectRoom")}</option>
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    {room.roomNumber} - {room.roomType} ({t(room.status)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-dark">{t("type")}</label>
              <select name="type" value={form.type} onChange={handleChange} className="input-dark">
                <option value="cleaning">{t("cleaningType")}</option>
                <option value="maintenance">{t("maintenanceType")}</option>
                <option value="inspection">{t("inspection")}</option>
              </select>
            </div>

            <div>
              <label className="label-dark">{t("priority")}</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="input-dark">
                <option value="low">{t("low")}</option>
                <option value="normal">{t("normal")}</option>
                <option value="high">{t("high")}</option>
                <option value="urgent">{t("urgent")}</option>
              </select>
            </div>

            {!isStaff && staffUsers.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label-dark">{t("assignTo")}</label>
                <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="input-dark">
                  <option value="">{t("unassigned")}</option>
                  {staffUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({t(u.role)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="label-dark">{t("notes")}</label>
              <input name="notes" value={form.notes} onChange={handleChange} className="input-dark" placeholder={t("optionalNotes")} />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{t("createTaskBtn")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}