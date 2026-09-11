import { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import { Loader2, Download, Trash2, Upload, HardDrive, AlertTriangle } from "lucide-react";

const formatBytes = (b) => {
  if (!b) return "-";
  const s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${s[i]}`;
};

const formatDT = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleString();
};

export default function Backups() {
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/backups");
      setBackups(res.data);
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      setCreating(true);
      await api.post("/backups/create");
      addToast(t("backupCreated"));
      load();
    } catch { addToast(t("error"), "error"); } finally { setCreating(false); }
  };

  const download = async (f) => {
    try {
      setDownloading(f);
      const res = await api.get(`/backups/download/${encodeURIComponent(f)}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", f);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { addToast(t("error"), "error"); } finally { setDownloading(null); }
  };

  const del = async (f) => {
    if (!window.confirm(t("disableRoomConfirm"))) return;
    try {
      await api.delete(`/backups/${encodeURIComponent(f)}`);
      addToast(t("backupDeleted"));
      load();
    } catch { addToast(t("error"), "error"); }
  };

  const restore = async () => {
    if (!restoreFile) { addToast(t("chooseFile"), "error"); return; }
    if (!confirmRestore) { addToast(t("pleaseConfirm"), "error"); return; }
    if (!window.confirm(t("overwriteConfirm"))) return;
    try {
      setRestoring(true);
      const fd = new FormData();
      fd.append("backup", restoreFile);
      fd.append("confirm", "YES");
      await api.post("/backups/restore", fd);
      addToast(t("restoreCompleted"));
      setRestoreFile(null);
      setConfirmRestore(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || t("error"), "error");
    } finally { setRestoring(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("backupsTitle")}</h1>
          <p className="page-subtitle-dark">{t("backupsSubtitle")}</p>
        </div>
        <button onClick={create} disabled={creating} className="btn-primary flex items-center gap-2">
          <HardDrive className="w-5 h-5" /> {creating ? t("creating") : t("createBackupBtn")}
        </button>
      </div>

      {/* Restore Section */}
      <div className="card-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white">{t("restoreFromFile")}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">{t("restoreWarning")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <input type="file" accept=".json" onChange={(e) => setRestoreFile(e.target.files[0])} className="input-dark w-auto" />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={confirmRestore} onChange={(e) => setConfirmRestore(e.target.checked)} className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500" />
            {t("iUnderstand")}
          </label>
          <button onClick={restore} disabled={restoring} className="btn-danger flex items-center gap-2">
            <Upload className="w-4 h-4" /> {restoring ? t("restoring") : t("restoreBtn")}
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("filename")}</th>
                <th>{t("created")}</th>
                <th>{t("size")}</th>
                <th className="text-right">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td className="font-medium text-white">{b.filename}</td>
                    <td>{formatDT(b.createdAt)}</td>
                    <td>{formatBytes(b.size)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => download(b.filename)} disabled={downloading === b.filename} className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10">
                          <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => del(b.filename)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {backups.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>
    </div>
  );
}