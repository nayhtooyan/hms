import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Loader2, Search, Eye } from "lucide-react";
import { useLanguage } from "../LanguageContext";

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export default function AuditLogs() {
  const { formatDateTime } = useSettings();
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const { t } = useLanguage();

  const today = toInputDate(new Date());
  const [filters, setFilters] = useState({ from: today, to: today, userId: "", entity: "", action: "" });

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.entity) params.append("entity", filters.entity);
      if (filters.action) params.append("action", filters.action);
      const res = await api.get(`/audit?${params.toString()}`);
      setLogs(res.data.logs); setUsers(res.data.users);
    } catch { addToast("Failed to load logs", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const actionColors = {
    CREATE: "bg-emerald-100 text-emerald-700",
    UPDATE: "bg-blue-100 text-blue-700",
    UPDATE_STATUS: "bg-amber-100 text-amber-700",
    DELETE: "bg-red-100 text-red-700",
    CHECK_IN: "bg-emerald-100 text-emerald-700",
    CHECK_OUT: "bg-gray-100 text-gray-600",
    CANCEL: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">{t("auditTitle")}</h1><p className="text-gray-500 text-sm mt-1">{t("auditSubtitle")}</p></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="label-primary">{t("from")}</label><input type="date" value={filters.from} onChange={(e) => setFilters({...filters, from: e.target.value})} className="input-primary" /></div>
          <div><label className="label-primary">{t("to")}</label><input type="date" value={filters.to} onChange={(e) => setFilters({...filters, to: e.target.value})} className="input-primary" /></div>
          <div><label className="label-primary">{t("user")}</label><select value={filters.userId} onChange={(e) => setFilters({...filters, userId: e.target.value})} className="input-primary"><option value="">{t("all")}</option>{users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
          <div><label className="label-primary">{t("entity")}</label><select value={filters.entity} onChange={(e) => setFilters({...filters, entity: e.target.value})} className="input-primary"><option value="">{t("all")}</option><option>{t("room")}</option><option>{t("reservations")}</option><option>{t("paymentsTitle")}</option><option>{t("vouchers")}</option><option>{t("user")}</option><option>{t("settings")}</option></select></div>
          <button onClick={load} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Search className="w-4 h-4 inline mr-2" />{t("search")}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("time")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("user")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("actions")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t("entity")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("ip")}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">{t("details")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-4"><div><p className="text-sm font-semibold">{log.userName}</p><p className="text-xs text-gray-400 capitalize">{log.userRole}</p></div></td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`}>{log.action}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.entity}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden md:table-cell">{log.ipAddress || "-"}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setSelectedLog(log)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Eye className="w-5 h-5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="text-center py-16 text-gray-400">{t("noActivities")}</div>}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={`${selectedLog?.action} ${selectedLog?.entity}`} size="lg">
        {selectedLog && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400 uppercase font-bold">{t("user")}</p><p className="font-medium">{selectedLog.userName}</p></div>
              <div><p className="text-xs text-gray-400 uppercase font-bold">{t("time")}</p><p className="font-medium">{formatDateTime(selectedLog.createdAt)}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-400 uppercase font-bold">{t("device")}</p><p className="text-xs text-gray-500 break-all">{selectedLog.userAgent}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold mb-2">{t("before")}</p>
              <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-x-auto max-h-60">{JSON.stringify(selectedLog.before, null, 2) || "None"}</pre>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold mb-2">{t("after")}</p>
              <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-x-auto max-h-60">{JSON.stringify(selectedLog.after, null, 2) || "None"}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}