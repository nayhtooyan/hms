import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import ResponsiveTable from "../components/ResponsiveTable.jsx";

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AuditLogs() {
  const { formatDateTime } = useSettings();

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const today = toInputDate(new Date());
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    userId: "",
    entity: "",
    action: ""
  });

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.entity) params.append("entity", filters.entity);
      if (filters.action) params.append("action", filters.action);

      const response = await api.get(`/audit?${params.toString()}`);
      setLogs(response.data.logs);
      setUsers(response.data.users);
    } catch (err) {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    loadLogs();
  };

  const columns = [
    {
      key: "createdAt",
      label: "Time",
      render: (row) => formatDateTime(row.createdAt)
    },
    {
      key: "userName",
      label: "User",
      render: (row) => (
        <span>
          <strong>{row.userName}</strong> <br />
          <small style={{ color: "#6b7280" }}>{row.userRole}</small>
        </span>
      )
    },
    {
      key: "action",
      label: "Action",
      render: (row) => <span className="ad-badge ad-badge-blue">{row.action}</span>
    },
    {
      key: "entity",
      label: "Target",
      render: (row) => row.entity
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (row) => row.ipAddress || "-"
    },
    {
      key: "actions",
      label: "Details",
      render: (row) => (
        <button className="btn btn-secondary" onClick={() => setSelectedLog(row)}>
          View Changes
        </button>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Audit Logs</h2>
            <div className="page-subtitle">Track all system activities and data changes.</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>From Date</label>
            <input type="date" name="from" value={filters.from} onChange={handleFilterChange} />
          </div>
          <div className="form-field">
            <label>To Date</label>
            <input type="date" name="to" value={filters.to} onChange={handleFilterChange} />
          </div>
          <div className="form-field">
            <label>User</label>
            <select name="userId" value={filters.userId} onChange={handleFilterChange}>
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Entity</label>
            <select name="entity" value={filters.entity} onChange={handleFilterChange}>
              <option value="">All Entities</option>
              <option value="Room">Room</option>
              <option value="Reservation">Reservation</option>
              <option value="Payment">Payment</option>
              <option value="Voucher">Voucher</option>
              <option value="User">User</option>
              <option value="Settings">Settings</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={applyFilters}>
              Search Logs
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="page-card">
        {loading ? (
          <div>Loading activities...</div>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={logs}
            emptyMessage="No activities found for this filter."
          />
        )}
      </div>

      {/* Modal to show Before/After data */}
      {selectedLog && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000
        }} onClick={() => setSelectedLog(null)}>
          <div className="page-card" style={{ maxWidth: "600px", width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h3 className="page-title">{selectedLog.action} {selectedLog.entity}</h3>
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
            <p><strong>User:</strong> {selectedLog.userName}</p>
            <p><strong>Time:</strong> {formatDateTime(selectedLog.createdAt)}</p>
            <p><strong>Device:</strong> <small>{selectedLog.userAgent}</small></p>
            
            <hr />
            <h4>Before:</h4>
            <pre style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
              {JSON.stringify(selectedLog.before, null, 2) || "None"}
            </pre>

            <h4>After:</h4>
            <pre style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
              {JSON.stringify(selectedLog.after, null, 2) || "None"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}