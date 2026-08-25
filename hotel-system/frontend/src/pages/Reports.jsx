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

function ReportStat({ label, value }) {
  return (
    <div className="page-card" style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "22px",
          fontWeight: "800"
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#6b7280",
          fontSize: "13px",
          marginTop: "4px"
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Reports() {
  const { formatMoney } = useSettings();

  const [from, setFrom] = useState(() => {
    const now = new Date();

    return toInputDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
  });

  const [to, setTo] = useState(() => {
    const now = new Date();

    return toInputDate(
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
    );
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async (rangeFrom = from, rangeTo = to) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/reports/overview?from=${rangeFrom}&to=${rangeTo}`
      );

      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const applyRange = () => {
    loadReports(from, to);
  };

  const setToday = () => {
    const today = toInputDate(new Date());

    setFrom(today);
    setTo(today);

    loadReports(today, today);
  };

  const setThisMonth = () => {
    const now = new Date();

    const monthStart = toInputDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    const monthEnd = toInputDate(
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
    );

    setFrom(monthStart);
    setTo(monthEnd);

    loadReports(monthStart, monthEnd);
  };

  const revenueByDateColumns = [
    {
      key: "_id",
      label: "Date"
    },
    {
      key: "count",
      label: "Payments"
    },
    {
      key: "total",
      label: "Revenue",
      render: (row) => formatMoney(row.total)
    }
  ];

  const paymentsByMethodColumns = [
    {
      key: "_id",
      label: "Method"
    },
    {
      key: "count",
      label: "Count"
    },
    {
      key: "total",
      label: "Amount",
      render: (row) => formatMoney(row.total)
    }
  ];

  const reservationsBySourceColumns = [
    {
      key: "_id",
      label: "Source"
    },
    {
      key: "count",
      label: "Reservations"
    }
  ];

  const voucherUsageColumns = [
    {
      key: "_id",
      label: "Voucher Code"
    },
    {
      key: "count",
      label: "Bookings"
    },
    {
      key: "discount",
      label: "Discount",
      render: (row) => formatMoney(row.discount)
    }
  ];

  const housekeepingColumns = [
    {
      key: "type",
      label: "Type"
    },
    {
      key: "status",
      label: "Status"
    },
    {
      key: "count",
      label: "Count"
    }
  ];

  const roomStatusColumns = [
    {
      key: "status",
      label: "Status"
    },
    {
      key: "count",
      label: "Rooms"
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
      key: "status",
      label: "Status"
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

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Reports</h2>

            <div className="page-subtitle">
              Revenue, reservations, payments, vouchers and room reports.
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>From</label>

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>To</label>

            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={applyRange}>
              Apply
            </button>

            <button className="btn btn-secondary" onClick={setToday}>
              Today
            </button>

            <button className="btn btn-secondary" onClick={setThisMonth}>
              This Month
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className="page-card">Loading reports...</div>
      ) : null}

      {!loading && data ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "16px"
            }}
          >
            <ReportStat
              label="Total Revenue"
              value={formatMoney(data.stats.totalRevenue)}
            />

            <ReportStat
              label="Payments"
              value={data.stats.totalPaymentsCount}
            />

            <ReportStat
              label="Reservations Created"
              value={data.stats.totalReservationsCreated}
            />

            <ReportStat
              label="Arrivals"
              value={data.stats.totalArrivals}
            />

            <ReportStat
              label="Departures"
              value={data.stats.totalDepartures}
            />

            <ReportStat
              label="Cancellations"
              value={data.stats.totalCancellations}
            />

            <ReportStat
              label="Occupancy"
              value={`${data.stats.occupancyPercentage}%`}
            />

            <ReportStat
              label="Total Unpaid"
              value={formatMoney(data.stats.totalUnpaid)}
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Revenue By Date</h3>
            </div>

            <ResponsiveTable
              columns={revenueByDateColumns}
              data={data.revenueByDate}
              emptyMessage="No revenue found for this date range."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Payments By Method</h3>
            </div>

            <ResponsiveTable
              columns={paymentsByMethodColumns}
              data={data.paymentsByMethod}
              emptyMessage="No payments found for this date range."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Reservations By Source</h3>
            </div>

            <ResponsiveTable
              columns={reservationsBySourceColumns}
              data={data.reservationsBySource}
              emptyMessage="No reservations found for this date range."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Voucher Usage</h3>
            </div>

            <ResponsiveTable
              columns={voucherUsageColumns}
              data={data.voucherUsage}
              emptyMessage="No voucher usage found for this date range."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Housekeeping Summary</h3>
            </div>

            <ResponsiveTable
              columns={housekeepingColumns}
              data={data.housekeepingSummary}
              keyField="none"
              emptyMessage="No housekeeping tasks found for this date range."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Current Room Status</h3>
            </div>

            <ResponsiveTable
              columns={roomStatusColumns}
              data={data.roomStatus}
              keyField="status"
              emptyMessage="No rooms found."
            />
          </div>

          <div className="page-card">
            <div className="page-header">
              <h3 className="page-title">Unpaid Reservations</h3>
            </div>

            <ResponsiveTable
              columns={unpaidColumns}
              data={data.unpaidReservations}
              keyField="id"
              emptyMessage="No unpaid reservations found."
            />
          </div>
        </>
      ) : null}
    </div>
  );
}