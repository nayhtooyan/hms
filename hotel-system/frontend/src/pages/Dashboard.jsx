import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";

/* 
   AREA CHART - Interactive with tooltips
    */
function AreaChart({ data, height = 280, formatValue, activePoint, onHover }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height }}>
        No data available
      </div>
    );
  }

  const padding = { top: 30, right: 30, bottom: 40, left: 70 };
  const width = 900;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 1);

  const points = data.map((d, i) => {
    const x = data.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  // Smooth curve using cubic bezier
  const buildSmoothPath = (pts) => {
    if (pts.length < 2) return `M ${pts[0]?.x || 0} ${pts[0]?.y || 0}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y} ${xc} ${yc}`;
    }
    const last = pts[pts.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  };

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y-axis grid
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    value: pct * maxValue,
    y: padding.top + chartHeight - pct * chartHeight,
  }));

  const formatAxis = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return Math.round(val).toString();
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoveredIndex(closest);
    if (onHover) onHover(closest);
  };

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredIndex(null); if (onHover) onHover(null); }}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid Lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left} y1={tick.y}
              x2={width - padding.right} y2={tick.y}
              stroke="#1e293b" strokeWidth="1"
            />
            <text
              x={padding.left - 12} y={tick.y + 4}
              textAnchor="end" fill="#475569"
              fontSize="11" fontFamily="Inter, sans-serif"
            >
              {formatAxis(tick.value)}
            </text>
          </g>
        ))}

        {/* Area Fill */}
        <path d={areaPath} fill="url(#areaFill)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />

        {/* Data Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={hoveredIndex === i ? 6 : 3}
            fill={hoveredIndex === i ? "#a78bfa" : "#0f172a"}
            stroke="#8b5cf6"
            strokeWidth="2"
            className="transition-all duration-150"
          />
        ))}

        {/* X-axis Labels */}
        {points.map((p, i) => {
          const showLabel = points.length <= 12 || i % Math.ceil(points.length / 10) === 0;
          return showLabel ? (
            <text
              key={`label-${i}`}
              x={p.x} y={height - 8}
              textAnchor="middle" fill="#475569"
              fontSize="10" fontFamily="Inter, sans-serif"
            >
              {p.label}
            </text>
          ) : null;
        })}

        {/* Hover Line */}
        {hovered && (
          <line
            x1={hovered.x} y1={padding.top}
            x2={hovered.x} y2={padding.top + chartHeight}
            stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${(hovered.x / width) * 100}%`,
            top: `${(hovered.y / height) * 100 - 15}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-gray-900 border border-purple-500/40 rounded-xl px-4 py-2 shadow-glow">
            <p className="text-xs text-gray-400">{hovered.label}</p>
            <p className="text-sm font-bold text-white">{formatValue ? formatValue(hovered.value) : hovered.value}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* 
   STATUS BADGE
    */
function StatusBadge({ status, t }) {
  const value = String(status || "").toLowerCase();
  const styles = {
    available: "badge-emerald", checked_in: "badge-emerald",
    reserved: "badge-blue", occupied: "badge-red",
    cancelled: "badge-red", cleaning: "badge-amber",
    maintenance: "badge-amber", blocked: "badge-gray",
    checked_out: "badge-gray",
  };
  return <span className={styles[value] || "badge-gray"}>{t(status) || status}</span>;
}

/* 
   MAIN DASHBOARD
    */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chartView, setChartView] = useState("daily");

  const { formatMoney, formatDateTime } = useSettings();
  const { user } = useAuth();
  const { t } = useLanguage();

  const role = user?.role || "reception";
  const canSeeFinancial = ["admin", "manager", "reception"].includes(role);
  const isStaff = role === "cleaner" || role === "maintenance";

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      setError("");
      const response = await api.get("/dashboard/summary");
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || t("error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useRealTimeRefresh(loadDashboard, ["rooms:updated", "reservations:updated", "payments:updated", "housekeeping:updated"]);
  useEffect(() => { loadDashboard(); }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Build chart data based on view mode
  const chartData = useMemo(() => {
    const revenueByDate = data?.revenueByDate || [];

    if (chartView === "daily") {
      // Show each day of current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Build a map of existing revenue data
      const revenueMap = {};
      revenueByDate.forEach(item => {
        const day = item._id?.split("-")[2];
        if (day) revenueMap[parseInt(day)] = item.total || 0;
      });

      return Array.from({ length: daysInMonth }, (_, i) => ({
        label: String(i + 1),
        value: revenueMap[i + 1] || 0,
      }));
    } else {
      // Monthly view: aggregate by month for the year
      const now = new Date();
      const year = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Aggregate revenue by month
      const monthlyRevenue = Array(12).fill(0);
      revenueByDate.forEach(item => {
        if (item._id) {
          const parts = item._id.split("-");
          const monthIndex = parseInt(parts[1]) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyRevenue[monthIndex] += item.total || 0;
          }
        }
      });

      return monthNames.map((name, i) => ({
        label: name,
        value: monthlyRevenue[i],
      }));
    }
  }, [data, chartView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-32">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={loadDashboard} className="btn-primary">{t("retry")}</button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const arrivals = data?.arrivals || [];
  const departures = data?.departures || [];
  const recentPayments = data?.recentPayments || [];
  const roomsNeedingAttention = data?.roomsNeedingAttention || [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* 
          HEADER ROW
           */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {t("dashboardTitle")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>
        <button onClick={loadDashboard} disabled={refreshing} className="btn-secondary text-sm">
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      {/* 
          HERO ROW: Revenue + Key Metrics
           */}
      {canSeeFinancial ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hero Revenue Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-indigo-900/70 to-gray-900" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative p-8 lg:p-10">
              <p className="text-xs font-bold text-purple-300/70 uppercase tracking-[0.2em] mb-3">
                {t("todayRevenue")}
              </p>
              <p className="text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                {formatMoney(stats.todayRevenue)}
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{t("monthlyRevenue")}</p>
                  <p className="text-lg font-bold text-white">{formatMoney(stats.monthlyRevenue)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{t("occupancyRate")}</p>
                  <p className="text-lg font-bold text-white">{stats.occupancyPercentage || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Metrics Column */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="card-dark p-5 flex flex-col justify-center border-l-4 border-l-blue-500">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("arrivalsToday")}</p>
              <p className="text-3xl font-extrabold text-white mt-1">{stats.todayArrivals || 0}</p>
            </div>
            <div className="card-dark p-5 flex flex-col justify-center border-l-4 border-l-amber-500">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("departuresToday")}</p>
              <p className="text-3xl font-extrabold text-white mt-1">{stats.todayDepartures || 0}</p>
            </div>
            <div className="card-dark p-5 flex flex-col justify-center border-l-4 border-l-emerald-500 hidden lg:flex">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("totalPayments")}</p>
              <p className="text-3xl font-extrabold text-white mt-1">{stats.totalPaymentsCount || 0}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Staff Hero */
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-indigo-900/60 to-gray-900" />
          <div className="relative p-8 lg:p-10">
            <p className="text-xs font-bold text-purple-300/70 uppercase tracking-[0.2em] mb-3">
              {t("housekeepingTitle")}
            </p>
            <p className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              {stats.pendingCleanTasks || 0} {t("cleaning")} • {stats.pendingMaintenanceTasks || 0} {t("maintenance")}
            </p>
            <p className="text-gray-400 mt-3 text-sm">{t("yourTasks")}</p>
          </div>
        </div>
      )}

      {/* 
          AREA CHART with Daily/Monthly Toggle
           */}
      {canSeeFinancial && (
        <div className="card-dark p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">{t("revenueByDate")}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {chartView === "daily" ? t("thisMonth") : new Date().getFullYear()}
              </p>
            </div>
            <div className="flex bg-gray-800/80 rounded-xl p-1 border border-gray-700/50">
              <button
                onClick={() => setChartView("daily")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  chartView === "daily"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("daily")}
              </button>
              <button
                onClick={() => setChartView("monthly")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  chartView === "monthly"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("monthly")}
              </button>
            </div>
          </div>
          <AreaChart data={chartData} height={280} formatValue={(v) => formatMoney(v)} />
        </div>
      )}

      {/* 
          ROOM STATUS ROW
           */}
      {!isStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: t("available"), value: stats.availableRooms, color: "emerald" },
            { label: t("occupied"), value: stats.occupiedRooms, color: "red" },
            { label: t("reserved"), value: stats.reservedRooms, color: "blue" },
            { label: t("cleaning"), value: stats.cleaningRooms, color: "amber" },
            { label: t("maintenance"), value: stats.maintenanceRooms, color: "orange" },
            { label: t("blocked"), value: stats.blockedRooms, color: "gray" },
          ].map((item) => (
            <div key={item.label} className="card-dark p-4 text-center hover:border-purple-500/30 transition-all">
              <p className={`text-3xl font-extrabold text-${item.color}-400`}>{item.value || 0}</p>
              <p className="text-[11px] font-semibold text-gray-500 mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 
          OCCUPANCY PROGRESS
           */}
      {!isStaff && (
        <div className="card-dark p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">{t("occupancyRate")}</h3>
            <span className="text-sm font-extrabold text-purple-400">{stats.occupancyPercentage || 0}%</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(stats.occupancyPercentage || 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">{stats.occupiedRooms || 0} {t("occupied")}</span>
            <span className="text-xs text-gray-500">{stats.totalRooms || 0} {t("roomsText")}</span>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS*/}
      {!isStaff && (
        <div className="flex flex-wrap gap-3">
          <Link to="/reservations" className="btn-primary">{t("newReservation")}</Link>
          <Link to="/room-board" className="btn-secondary">{t("viewRoomBoard")}</Link>
          <Link to="/payments" className="btn-secondary">{t("recordPayment")}</Link>
        </div>
      )}

      {/* TABLES - 2 Column Grid*/}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Arrivals */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <h3 className="font-bold text-white">{t("todayArrivals")}</h3>
            <span className="badge-blue">{arrivals.length}</span>
          </div>
          {arrivals.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">{t("noArrivals")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead><tr>
                  <th>{t("booking")}</th>
                  <th>{t("room")}</th>
                  <th>{t("guest")}</th>
                  <th>{t("status")}</th>
                </tr></thead>
                <tbody>
                  {arrivals.map((row) => (
                    <tr key={row._id}>
                      <td className="font-medium text-white">{row.bookingNo}</td>
                      <td>{row.roomId?.roomNumber || "-"}</td>
                      <td>{row.guest?.name || "-"}</td>
                      <td><StatusBadge status={row.status} t={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <h3 className="font-bold text-white">{t("todayDepartures")}</h3>
            <span className="badge-amber">{departures.length}</span>
          </div>
          {departures.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">{t("noDepartures")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead><tr>
                  <th>{t("booking")}</th>
                  <th>{t("room")}</th>
                  <th>{t("guest")}</th>
                  <th>{t("status")}</th>
                </tr></thead>
                <tbody>
                  {departures.map((row) => (
                    <tr key={row._id}>
                      <td className="font-medium text-white">{row.bookingNo}</td>
                      <td>{row.roomId?.roomNumber || "-"}</td>
                      <td>{row.guest?.name || "-"}</td>
                      <td><StatusBadge status={row.status} t={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        {!isStaff && (
          <div className="card-dark overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white">{t("recentPayments")}</h3>
            </div>
            {recentPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">{t("noRecentPayments")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead><tr>
                    <th>{t("receiptNo")}</th>
                    <th>{t("room")}</th>
                    <th>{t("method")}</th>
                    <th>{t("amount")}</th>
                  </tr></thead>
                  <tbody>
                    {recentPayments.map((row) => (
                      <tr key={row._id}>
                        <td className="font-medium text-white">{row.receiptNo}</td>
                        <td>{row.reservationId?.roomId?.roomNumber || "-"}</td>
                        <td className="capitalize">{row.method}</td>
                        <td className="font-bold text-emerald-400">{formatMoney(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Needs Attention */}
        {!isStaff && (
          <div className="card-dark overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white">{t("needsAttention")}</h3>
              <span className="badge-red">{roomsNeedingAttention.length}</span>
            </div>
            {roomsNeedingAttention.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">{t("allRoomsOkay")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead><tr>
                    <th>{t("room")}</th>
                    <th>{t("type")}</th>
                    <th>{t("status")}</th>
                  </tr></thead>
                  <tbody>
                    {roomsNeedingAttention.map((row) => (
                      <tr key={row._id}>
                        <td className="font-bold text-white">{row.roomNumber}</td>
                        <td>{row.roomType}</td>
                        <td><StatusBadge status={row.status} t={t} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}