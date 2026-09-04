import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Loader2, Play, CheckCircle, XCircle } from "lucide-react";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { useLanguage } from "../LanguageContext";

export default function Housekeeping() {
  const { formatDateTime } = useSettings();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ roomId: "", type: "cleaning", priority: "normal", assignedTo: "", notes: "" });
  const { t } = useLanguage();

  const loadAll = async () => {
    try {
      const [t, r, u] = await Promise.all([api.get("/housekeeping/tasks"), api.get("/rooms?active=true"), api.get("/users").catch(() => ({ data: [] }))]);
      setTasks(t.data); setRooms(r.data); setUsers(u.data);
    } catch { addToast("Failed to load data", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);
  useRealTimeRefresh(loadAll, ["housekeeping:updated", "rooms:updated"]);

  const createTask = async (e) => {
    e.preventDefault();
    try { await api.post("/housekeeping/tasks", { ...form, assignedTo: form.assignedTo || undefined }); addToast("Task created"); setIsModalOpen(false); setForm({ roomId: "", type: "cleaning", priority: "normal", assignedTo: "", notes: "" }); loadAll(); } catch (err) { addToast(err.response?.data?.message || "Failed", "error"); }
  };

  const startTask = async (id) => { try { await api.post(`/housekeeping/tasks/${id}/start`); loadAll(); } catch (e) { addToast(e.response?.data?.message || "Failed", "error"); } };
  const completeTask = async (id) => { try { await api.post(`/housekeeping/tasks/${id}/complete`); addToast("Task completed"); loadAll(); } catch (e) { addToast(e.response?.data?.message || "Failed", "error"); } };
  const cancelTask = async (id) => { try { await api.post(`/housekeeping/tasks/${id}/cancel`); loadAll(); } catch (e) { addToast(e.response?.data?.message || "Failed", "error"); } };

  const priorityColors = { low: "bg-gray-100 text-gray-600", normal: "bg-blue-100 text-blue-700", high: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700" };
  const statusColors = { pending: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-gray-100 text-gray-500" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{t("housekeepingTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("housekeepingSubtitle")}</p></div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"><Plus className="w-5 h-5" /> {t("newTask")}</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("type")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("priority")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("assigned")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("created")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-sm">{t.roomId?.roomNumber || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{t.type}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusColors[t.status]}`}>{t.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{t.assignedTo?.name || "Unassigned"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDateTime(t.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === "pending" && <><button onClick={() => startTask(t._id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"><Play className="w-4 h-4" /></button><button onClick={() => cancelTask(t._id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><XCircle className="w-4 h-4" /></button></>}
                        {t.status === "in_progress" && <><button onClick={() => completeTask(t._id)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"><CheckCircle className="w-4 h-4" /></button><button onClick={() => cancelTask(t._id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><XCircle className="w-4 h-4" /></button></>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && <div className="text-center py-16 text-gray-400">No tasks found.</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Task">
        <form onSubmit={createTask} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">{t("room")}</label><select name="roomId" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required className="input-primary"><option value="">{t("selectRoom")}</option>{rooms.map(r => <option key={r._id} value={r._id}>{r.roomNumber} - {r.roomType}</option>)}</select></div>
            <div><label className="label-primary">{t("type")}</label><select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-primary"><option value="cleaning">{t("cleaning")}</option><option value="maintenance">{t("maintenance")}</option><option value="inspection">{t("inspection")}</option></select></div>
            <div><label className="label-primary">{t("priority")}</label><select name="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-primary"><option value="low">Low</option><option value="normal">{t("normal")}</option><option value="high">{t("high")}</option><option value="urgent">{t("urgent")}</option></select></div>
            {users.length > 0 && <div><label className="label-primary">{t("assignTo")}</label><select name="assignedTo" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="input-primary"><option value="">{t("unassigned")}</option>{users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>}
            <div className="sm:col-span-2"><label className="label-primary">{t("notes")}</label><input name="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-primary" /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">{t("cancel")}</button>
            <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">{t("newTask")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}