import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import { Plus, Search, Pencil, Key, ToggleLeft, ToggleRight } from "lucide-react";

const roles = ["admin", "manager", "reception", "cleaner", "maintenance"];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();

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

  const loadUsers = async () => {
    try {
      const res = await api.get("/users?includeInactive=true");
      setUsers(res.data);
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => { setEditingUser(null); setForm({ name: "", username: "", password: "", role: "reception" }); setIsModalOpen(true); };
  const openEdit = (u) => { setEditingUser(u); setForm({ name: u.name, username: u.username, password: "", role: u.role }); setIsModalOpen(true); };
  const openPassword = (u) => { setPasswordUser(u); setNewPassword(""); setConfirmPassword(""); setIsPasswordModalOpen(true); };

  const submitUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, { name: form.name, username: form.username, role: form.role });
        addToast(t("userUpdated"));
      } else {
        if (!form.password) { addToast(t("minSixChars"), "error"); return; }
        await api.post("/users", form);
        addToast(t("userCreated"));
      }
      setIsModalOpen(false); loadUsers();
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { addToast(t("minSixChars"), "error"); return; }
    if (newPassword !== confirmPassword) { addToast(t("passwordMismatch"), "error"); return; }
    try {
      await api.patch(`/users/${passwordUser._id}/password`, { password: newPassword });
      addToast(t("passwordUpdated"));
      setIsPasswordModalOpen(false);
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u._id}/active`, { active: !u.active });
      addToast(u.active ? t("userDisabled") : t("userEnabled"));
      loadUsers();
    } catch (err) { addToast(err.response?.data?.message || t("error"), "error"); }
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const roleStyles = {
    admin: "badge-purple", manager: "badge-blue",
    reception: "badge-emerald", cleaner: "badge-amber",
    maintenance: "badge-red"
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("usersTitle")}</h1>
          <p className="page-subtitle-dark">{t("usersSubtitle")}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> {t("addUser")}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" placeholder={t("userSearchPlaceholder")} className="input-dark pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500">{t("loading")}</div> : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("user")}</th>
                <th>{t("username")}</th>
                <th>{t("role")}</th>
                <th>{t("status")}</th>
                <th className="text-right">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u._id || u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm uppercase text-white">
                          {u.name?.charAt(0)}
                        </div>
                        <span className="font-bold text-white">{u.name}</span>
                      </div>
                    </td>
                    <td>{u.username}</td>
                    <td><span className={roleStyles[u.role] || "badge-gray"}>{t(u.role)}</span></td>
                    <td>
                      <span className={u.active ? "badge-emerald" : "badge-red"}>
                        {t(u.active ? "active" : "disabled")}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openPassword(u)} className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"><Key className="w-4 h-4" /></button>
                        {String(currentUser?.id) !== String(u._id || u.id) && (
                          <button onClick={() => toggleActive(u)} className={`p-2 rounded-lg ${u.active ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"}`}>
                            {u.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? t("editUser") : t("createUserBtn")}>
        <form onSubmit={submitUser} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-dark">{t("name")}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-dark" /></div>
            <div><label className="label-dark">{t("username")}</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="input-dark" /></div>
            {!editingUser && <div><label className="label-dark">{t("password")}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-dark" placeholder={t("minSixChars")} /></div>}
            <div>
              <label className="label-dark">{t("role")}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-dark">
                {roles.map(r => <option key={r} value={r}>{t(r)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{editingUser ? t("save") : t("create")}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={t("resetPassword")}>
        <form onSubmit={submitPassword} className="space-y-5">
          <p className="text-sm text-gray-400">{t("user")}: <strong className="text-white">{passwordUser?.name}</strong></p>
          <div><label className="label-dark">{t("newPassword")}</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="input-dark" /></div>
          <div><label className="label-dark">{t("confirmPassword")}</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input-dark" /></div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{t("updatePassword")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}