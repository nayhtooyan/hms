import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Search, Loader2, Pencil, Key, ToggleLeft, ToggleRight } from "lucide-react";
import { useLanguage } from "../LanguageContext";

const roles = ["admin", "manager", "reception", "cleaner", "maintenance"];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "reception" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { t } = useLanguage();

  const loadUsers = async () => {
    try { const res = await api.get("/users?includeInactive=true"); setUsers(res.data); } catch { addToast("Failed to load users", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => { setEditingUser(null); setForm({ name: "", username: "", password: "", role: "reception" }); setIsModalOpen(true); };
  const openEdit = (u) => { setEditingUser(u); setForm({ name: u.name, username: u.username, password: "", role: u.role }); setIsModalOpen(true); };
  const openPassword = (u) => { setPasswordUser(u); setNewPassword(""); setConfirmPassword(""); setIsPasswordModalOpen(true); };

  const submitUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) { await api.patch(`/users/${editingUser._id}`, { name: form.name, username: form.username, role: form.role }); addToast("User updated"); }
      else { if (!form.password) { addToast("Password required", "error"); return; } await api.post("/users", form); addToast("User created"); }
      setIsModalOpen(false); loadUsers();
    } catch (err) { addToast(err.response?.data?.message || "Failed", "error"); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { addToast("Min 6 characters", "error"); return; }
    if (newPassword !== confirmPassword) { addToast("Passwords don't match", "error"); return; }
    try { await api.patch(`/users/${passwordUser._id}/password`, { password: newPassword }); addToast("Password updated"); setIsPasswordModalOpen(false); } catch (err) { addToast(err.response?.data?.message || "Failed", "error"); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/users/${u._id}/active`, { active: !u.active }); addToast(u.active ? "User disabled" : "User enabled"); loadUsers(); } catch (err) { addToast(err.response?.data?.message || "Failed", "error"); }
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{t("usersTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("usersSubtitle")}</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"><Plus className="w-5 h-5" /> {t("addUser")}</button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search users..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("user")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("username")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("role")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u._id || u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">{u.name?.charAt(0)}</div><span className="font-bold text-sm">{u.name}</span></div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.username}</td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 capitalize">{u.role}</span></td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{u.active ? "Active" : "Disabled"}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openPassword(u)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"><Key className="w-4 h-4" /></button>
                        {String(currentUser?.id) !== String(u._id || u.id) && (
                          <button onClick={() => toggleActive(u)} className={`p-2 rounded-lg ${u.active ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                            {u.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-400">No users found.</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? t("editUser") : t("create")}>
        <form onSubmit={submitUser} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-primary">{t("name")}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-primary" /></div>
            <div><label className="label-primary">{t("username")}</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="input-primary" /></div>
            {!editingUser && <div><label className="label-primary">{t("password")}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-primary" placeholder="Min 6 characters" /></div>}
            <div><label className="label-primary">{t("role")}</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-primary">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">{editingUser ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Reset Password">
        <form onSubmit={submitPassword} className="space-y-5">
          <p className="text-sm text-gray-500">User: <strong>{passwordUser?.name}</strong></p>
          <div><label className="label-primary">{t("newPassword")}</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="input-primary" /></div>
          <div><label className="label-primary">{t("confirmPassword")}</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input-primary" /></div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">{t("updatePassword")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}