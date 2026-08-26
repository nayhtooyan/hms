import { useEffect, useState } from "react";

import api from "../api";

import ResponsiveTable from "../components/ResponsiveTable.jsx";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) {
    return "-";
  }

  const sizes = ["Bytes", "KB", "MB", "GB"];

  if (bytes === 0) {
    return "0 Bytes";
  }

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/backups");

      setBackups(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const createBackup = async () => {
    try {
      setCreating(true);
      setMessage("");
      setError("");

      const response = await api.post("/backups/create");

      setMessage(response.data.message || "Backup created");

      loadBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filename) => {
    try {
      setDownloading(filename);
      setError("");

      const response = await api.get(
        `/backups/download/${encodeURIComponent(filename)}`,
        {
          responseType: "blob"
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", filename);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download backup error:", err);

      setError("Failed to download backup");
    } finally {
      setDownloading(null);
    }
  };

  const deleteBackup = async (filename) => {
    const confirmed = window.confirm(
      `Delete backup ${filename}?`
    );

    if (!confirmed) return;

    try {
      setMessage("");
      setError("");

      await api.delete(`/backups/${encodeURIComponent(filename)}`);

      setMessage("Backup deleted");

      loadBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete backup");
    }
  };

  const restoreBackup = async () => {
    if (!restoreFile) {
      setError("Please choose a backup file first");
      return;
    }

    if (!confirmRestore) {
      setError("Please confirm restore warning");
      return;
    }

    const confirmed = window.confirm(
      "Restore will overwrite current data. Are you sure?"
    );

    if (!confirmed) return;

    try {
      setRestoring(true);
      setMessage("");
      setError("");

      const formData = new FormData();

      formData.append("backup", restoreFile);
      formData.append("confirm", "YES");

      const response = await api.post("/backups/restore", formData);

      setMessage(response.data.message || "Restore completed");

      setRestoreFile(null);
      setConfirmRestore(false);

      loadBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  const columns = [
    {
      key: "filename",
      label: "Filename"
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (row) => formatDateTime(row.createdAt)
    },
    {
      key: "size",
      label: "Size",
      render: (row) => formatBytes(row.size)
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="action-stack">
          <button
            className="btn btn-primary"
            onClick={() => downloadBackup(row.filename)}
            disabled={downloading === row.filename}
          >
            {downloading === row.filename
              ? "Downloading..."
              : "Download"}
          </button>

          <button
            className="btn btn-danger"
            onClick={() => deleteBackup(row.filename)}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Backup And Restore</h2>

            <div className="page-subtitle">
              Create, download, restore and delete database backups.
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={createBackup}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Backup"}
          </button>
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h3 className="page-title">Restore From Backup File</h3>

            <div className="page-subtitle">
              Warning: restore will overwrite current database data.
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>Backup JSON File</label>

            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setRestoreFile(e.target.files[0])}
            />
          </div>

          <div className="form-field">
            <label>Confirmation</label>

            <label style={{ display: "flex", gap: "8px" }}>
              <input
                type="checkbox"
                checked={confirmRestore}
                onChange={(e) => setConfirmRestore(e.target.checked)}
              />

              I understand restore will overwrite current data
            </label>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-danger"
              onClick={restoreBackup}
              disabled={restoring}
            >
              {restoring ? "Restoring..." : "Restore Backup"}
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h3 className="page-title">Existing Backups</h3>

            <div className="page-subtitle">
              Backup files stored on server.
            </div>
          </div>
        </div>

        {loading ? <div>Loading backups...</div> : null}

        {!loading ? (
          <ResponsiveTable
            columns={columns}
            data={backups}
            keyField="filename"
            emptyMessage="No backups found."
          />
        ) : null}
      </div>
    </div>
  );
}