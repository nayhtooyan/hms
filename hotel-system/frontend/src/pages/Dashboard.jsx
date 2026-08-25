import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api";

import "./dashboard.css";
import { useSettings } from "../SettingsContext";


function StatusBadge({ status }) {
  const value = String(status || "").toLowerCase();

  let color = "gray";

  if (value === "available") color = "green";
  if (value === "checked_in") color = "green";
  if (value === "reserved") color = "blue";
  if (value === "occupied") color = "red";
  if (value === "cancelled") color = "red";
  if (value === "cleaning") color = "amber";
  if (value === "maintenance") color = "orange";
  if (value === "blocked") color = "gray";
  if (value === "checked_out") color = "gray";

  return (
    <span className={`ad-badge ad-badge-${color}`}>
      {status || "-"}
    </span>
  );
}

function StatCard({ icon, label, value, tone = "blue" }) {
  return (
    <div className={`ad-card ad-stat ad-stat-${tone}`}>
      <div className="ad-stat-top">
        <div className="ad-stat-icon">{icon}</div>
        <div className="ad-stat-label">{label}</div>
      </div>

      <div className="ad-stat-value">{value}</div>
    </div>
  );
}

function OccupancyCard({ value }) {
  const occupancy = Math.min(100, Math.max(0, Number(value || 0)));

  return (
    <div className="ad-card ad-stat ad-stat-purple">
      <div className="ad-stat-top">
        <div className="ad-stat-icon">📈</div>
        <div className="ad-stat-label">Occupancy</div>
      </div>

      <div className="ad-stat-value">{occupancy}%</div>

      <div className="ad-progress">
        <div
          className="ad-progress-fill"
          style={{ width: `${occupancy}%` }}
        />
      </div>
    </div>
  );
}

function ResponsiveTable({
  columns,
  data,
  keyField = "_id",
  emptyMessage
}) {
  if (!data || data.length === 0) {
    return <div className="ad-empty">{emptyMessage || "No data found."}</div>;
  }

  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={row[keyField] || index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const { formatMoney, formatDateTime } = useSettings();

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      setError("");

      const response = await api.get("/dashboard/summary");

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  if (loading) {
    return (
      <div className="advanced-dashboard">
        <div className="ad-card">Loading dashboard...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="advanced-dashboard">
        <div className="ad-card">
          <div className="ad-alert-error">{error}</div>

          <br />

          <button className="ad-btn ad-btn-primary" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  const arrivals = data?.arrivals || [];
  const departures = data?.departures || [];
  const unpaidReservations = data?.unpaidReservations || [];
  const roomsNeedingAttention = data?.roomsNeedingAttention || [];
  const recentReservations = data?.recentReservations || [];
  const recentPayments = data?.recentPayments || [];

  const arrivalColumns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.roomId?.roomNumber || "-"
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => row.guest?.name || "-"
    },
    {
      key: "scheduledCheckIn",
      label: "Check-In",
      render: (row) => formatDateTime(row.scheduledCheckIn)
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />
    }
  ];

  const departureColumns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.roomId?.roomNumber || "-"
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => row.guest?.name || "-"
    },
    {
      key: "scheduledCheckOut",
      label: "Check-Out",
      render: (row) => formatDateTime(row.scheduledCheckOut)
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />
    }
  ];

  const unpaidColumns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room"
    },
    {
      key: "guest",
      label: "Guest"
    },
    {
      key: "total",
      label: "Total",
      render: (row) => formatMoney(row.total)
    },
    {
      key: "paid",
      label: "Paid",
      render: (row) => formatMoney(row.paid)
    },
    {
      key: "balance",
      label: "Balance",
      render: (row) => (
        <span className="ad-negative">
          {formatMoney(row.balance)}
        </span>
      )
    }
  ];

  const roomsAttentionColumns = [
    {
      key: "roomNumber",
      label: "Room"
    },
    {
      key: "roomType",
      label: "Type"
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />
    }
  ];

  const recentReservationColumns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.roomId?.roomNumber || "-"
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => row.guest?.name || "-"
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => formatDateTime(row.createdAt)
    }
  ];

  const recentPaymentColumns = [
    {
      key: "receiptNo",
      label: "Receipt"
    },
    {
      key: "booking",
      label: "Booking",
      render: (row) => row.reservationId?.bookingNo || "-"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.reservationId?.roomId?.roomNumber || "-"
    },
    {
      key: "method",
      label: "Method"
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span className="ad-positive">
          {formatMoney(row.amount)}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => formatDateTime(row.createdAt)
    }
  ];

  return (
    <div className="advanced-dashboard">
      <div className="ad-card ad-header">
        <div>
          <h2>Hotel Dashboard</h2>

          <div className="ad-subtitle">{today}</div>
        </div>

        <div className="ad-header-actions">
          <Link className="ad-btn" to="/room-board">
            Room Board
          </Link>

          <Link className="ad-btn" to="/reservations">
            Reservations
          </Link>

          <Link className="ad-btn" to="/payments">
            Payments
          </Link>

          <Link className="ad-btn" to="/housekeeping">
            Housekeeping
          </Link>

          <button
            className="ad-btn ad-btn-primary"
            onClick={loadDashboard}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <div className="ad-alert-error">{error}</div> : null}

      <div className="ad-kpi-grid">
        <StatCard
          icon=""
          label="Total Rooms"
          value={stats.totalRooms || 0}
          tone="blue"
        />

        <StatCard
          icon=""
          label="Available Rooms"
          value={stats.availableRooms || 0}
          tone="green"
        />

        <StatCard
          icon=""
          label="Occupied Rooms"
          value={stats.occupiedRooms || 0}
          tone="red"
        />

        <StatCard
          icon=""
          label="Reserved Rooms"
          value={stats.reservedRooms || 0}
          tone="blue"
        />

        <StatCard
          icon=""
          label="Cleaning Rooms"
          value={stats.cleaningRooms || 0}
          tone="amber"
        />

        <StatCard
          icon=""
          label="Maintenance Rooms"
          value={stats.maintenanceRooms || 0}
          tone="orange"
        />

        <StatCard
          icon=""
          label="Blocked Rooms"
          value={stats.blockedRooms || 0}
          tone="gray"
        />

        <StatCard
          icon=""
          label="Arrivals Today"
          value={stats.todayArrivals || 0}
          tone="purple"
        />

        <StatCard
          icon=""
          label="Departures Today"
          value={stats.todayDepartures || 0}
          tone="purple"
        />

        <OccupancyCard value={stats.occupancyPercentage || 0} />

        <StatCard
          icon=""
          label="Today Revenue"
          value={formatMoney(stats.todayRevenue)}
          tone="green"
        />

        <StatCard
          icon=""
          label="Monthly Revenue"
          value={formatMoney(stats.monthlyRevenue)}
          tone="green"
        />

        <StatCard
          icon=""
          label="Cleaning Tasks"
          value={stats.pendingCleanTasks || 0}
          tone="amber"
        />

        <StatCard
          icon=""
          label="Maintenance Tasks"
          value={stats.pendingMaintenanceTasks || 0}
          tone="orange"
        />
      </div>

      <div className="ad-content-grid">
        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Today Arrivals</h3>
            <span className="ad-count">{arrivals.length}</span>
          </div>

          <ResponsiveTable
            columns={arrivalColumns}
            data={arrivals}
            emptyMessage="No arrivals today."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Today Departures</h3>
            <span className="ad-count">{departures.length}</span>
          </div>

          <ResponsiveTable
            columns={departureColumns}
            data={departures}
            emptyMessage="No departures today."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Unpaid Reservations</h3>
            <span className="ad-count">{unpaidReservations.length}</span>
          </div>

          <ResponsiveTable
            columns={unpaidColumns}
            data={unpaidReservations}
            keyField="id"
            emptyMessage="No unpaid reservations found."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Rooms Needing Attention</h3>
            <span className="ad-count">{roomsNeedingAttention.length}</span>
          </div>

          <ResponsiveTable
            columns={roomsAttentionColumns}
            data={roomsNeedingAttention}
            emptyMessage="All rooms are okay."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Recent Reservations</h3>
            <span className="ad-count">{recentReservations.length}</span>
          </div>

          <ResponsiveTable
            columns={recentReservationColumns}
            data={recentReservations}
            emptyMessage="No reservations found."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <h3>Recent Payments</h3>
            <span className="ad-count">{recentPayments.length}</span>
          </div>

          <ResponsiveTable
            columns={recentPaymentColumns}
            data={recentPayments}
            emptyMessage="No payments found."
          />
        </div>
      </div>
    </div>
  );
}