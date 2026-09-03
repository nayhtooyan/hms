import { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../components/ToastContext";
import { Loader2, Download, Trash2, Upload, HardDrive, AlertTriangle } from "lucide-react";
import { useLanguage } from "../LanguageContext";

const formatBytes = (b) => { if (!b) return "-"; const s = ["B","KB","MB","GB"]; const i = Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(2)} ${s[i]}`; };
const formatDT = (v) => { if (!v) return "-"; return new Date(v).toLocaleString(); };

export default function Backups() {
  const { addToast } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { t } = useLanguage();

  const load = async () => { try { setLoading(true); const res = await api.get("/backups"); setBackups(res.data); } catch { addToast("Failed to load", "error"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async () => { try { setCreating(true); await api.post("/backups/create"); addToast(t("backupCreated")); load(); } catch { addToast("Failed", "error"); } finally { setCreating(false); } };

  const download = async (f) => {
    try { setDownloading(f); const res = await api.get(`/backups/download/${encodeURIComponent(f)}`, { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement("a"); link.href = url; link.setAttribute("download", f); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url); } catch { addToast("Download failed", "error"); } finally { setDownloading(null); }
  };

  const del = async (f) => { if (!window.confirm(`Delete ${f}?`)) return; try { await api.delete(`/backups/${encodeURIComponent(f)}`); addToast( t("backupDeleted")); load(); } catch { addToast("Failed", "error"); } };

  const restore = async () => {
    if (!restoreFile) { addToast("Choose a file", "error"); return; }
    if (!confirmRestore) { addToast("Please confirm", "error"); return; }
    if (!window.confirm("This will overwrite all current data. Are you sure?")) return;
    try { setRestoring(true); const fd = new FormData(); fd.append("backup", restoreFile); fd.append("confirm", "YES"); await api.post("/backups/restore", fd); addToast("Restore completed"); setRestoreFile(null); setConfirmRestore(false); load(); } catch (err) { addToast(err.response?.data?.message || "Failed", "error"); } finally { setRestoring(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{t("backupsTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("backupsSubtitle")}</p></div>
        <button onClick={create} disabled={creating} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70"><HardDrive className="w-5 h-5" /> {creating ? t("creating") : t("backupsSubtitle")}</button>
      </div>

      {/* Restore */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-gray-800">{t("restoreFromFile")}</h3></div>
        <p className="text-sm text-gray-500 mb-4">{t("restoreWarning")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <input type="file" accept=".json" onChange={(e) => setRestoreFile(e.target.files[0])} className="text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmRestore} onChange={(e) => setConfirmRestore(e.target.checked)} className="rounded" /> {t("iUnderstand")}</label>
          <button onClick={restore} disabled={restoring} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-70"><Upload className="w-4 h-4" /> {restoring ? "Restoring..." :  t("restoreBtn")}</button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("filename")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("created")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("size")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-sm">{b.filename}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDT(b.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatBytes(b.size)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => download(b.filename)} disabled={downloading === b.filename} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"><Download className="w-5 h-5" /></button>
                        <button onClick={() => del(b.filename)} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {backups.length === 0 && <div className="text-center py-16 text-gray-400">No backups found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}