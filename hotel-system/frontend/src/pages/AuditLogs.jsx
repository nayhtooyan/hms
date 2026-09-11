import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import { Loader2, Search, Eye } from "lucide-react";

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AuditLogs() {
  const { formatDateTime } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

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
      setLogs(res.data.logs);
      setUsers(res.data.users);
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const actionStyles = {
    CREATE: "badge-emerald", UPDATE: "badge-blue",
    UPDATE_STATUS: "badge-amber", DELETE: "badge-red",
    CHECK_IN: "badge-emerald", CHECK_OUT: "badge-gray",
    CANCEL: "badge-red",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title-dark">{t("auditTitle")}</h1>
        <p className="page-subtitle-dark">{t("auditSubtitle")}</p>
      </div>

      {/* Filters */}
      <div className="card-dark p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="label-dark">{t("from")}</label><input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="input-dark" /></div>
          <div><label className="label-dark">{t("to")}</label><input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="input-dark" /></div>
          <div>
            <label className="label-dark">{t("user")}</label>
            <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} className="input-dark">
              <option value="">{t("allUsers")}</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-dark">{t("entity")}</label>
            <select value={filters.entity} onChange={(e) => setFilters({ ...filters, entity: e.target.value })} className="input-dark">
              <option value="">{t("allEntities")}</option>
              <option>Room</option>
              <option>Reservation</option>
              <option>Payment</option>
              <option>Voucher</option>
              <option>User</option>
              <option>Settings</option>
            </select>
          </div>
          <button onClick={load} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" /> {t("auditSearch")}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th>{t("time")}</th>
                <th>{t("user")}</th>
                <th>{t("actions")}</th>
                <th>{t("entity")}</th>
                <th className="hidden md:table-cell">{t("ip")}</th>
                <th className="text-right">{t("details")}</th>
              </tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-gray-400">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <p className="font-semibold text-white">{log.userName}</p>
                      <p className="text-xs text-gray-500 capitalize">{t(log.userRole) || log.userRole}</p>
                    </td>
                    <td>
                      <span className={actionStyles[log.action] || "badge-gray"}>{log.action}</span>
                    </td>
                    <td>{log.entity}</td>
                    <td className="hidden md:table-cell text-gray-500">{log.ipAddress || "-"}</td>
                    <td className="text-right">
                      <button onClick={() => setSelectedLog(log)} className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="text-center py-16 text-gray-500">{t("noActivities")}</div>}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={`${selectedLog?.action} ${selectedLog?.entity}`} size="lg">
        {selectedLog && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="label-dark">{t("user")}</p><p className="font-medium text-white">{selectedLog.userName}</p></div>
              <div><p className="label-dark">{t("time")}</p><p className="font-medium text-white">{formatDateTime(selectedLog.createdAt)}</p></div>
              <div className="col-span-2"><p className="label-dark">{t("device")}</p><p className="text-xs text-gray-400 break-all">{selectedLog.userAgent}</p></div>
            </div>
            <div>
              <p className="label-dark">{t("before")}</p>
              <pre className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl text-xs text-gray-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.before, null, 2) || "None"}
              </pre>
            </div>
            <div>
              <p className="label-dark">{t("after")}</p>
              <pre className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl text-xs text-gray-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.after, null, 2) || "None"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}