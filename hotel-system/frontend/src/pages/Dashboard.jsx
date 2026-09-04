import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useSettings } from "../SettingsContext";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { useLanguage } from "../LanguageContext";
import {
  Hotel, BedDouble, Users, CalendarCheck, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, AlertTriangle,
  Clock, CreditCard
} from "lucide-react";

function KpiCard({ icon: Icon, label, value, color = "indigo", subtitle }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "").toLowerCase();
  const styles = {
    available: "bg-emerald-100 text-emerald-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    reserved: "bg-blue-100 text-blue-700",
    occupied: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    cleaning: "bg-amber-100 text-amber-700",
    maintenance: "bg-orange-100 text-orange-700",
    blocked: "bg-gray-100 text-gray-600",
    checked_out: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${styles[value] || "bg-gray-100 text-gray-600"}`}>
      {status || "-"}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { formatMoney, formatDateTime } = useSettings();
  const { t } = useLanguage();

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      setError("");
      const response = await api.get("/dashboard/summary");
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  useRealTimeRefresh(loadDashboard, ["rooms:updated", "reservations:updated", "payments:updated", "housekeeping:updated"]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-32">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadDashboard} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold">Retry</button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const arrivals = data?.arrivals || [];
  const departures = data?.departures || [];
  const recentPayments = data?.recentPayments || [];
  const roomsNeedingAttention = data?.roomsNeedingAttention || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">{t("dashboardTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={DollarSign} label={t("todayRevenue")} value={formatMoney(stats.todayRevenue)} color="emerald"  />
        <KpiCard icon={TrendingUp} label={t("monthlyRevenue")} value={formatMoney(stats.monthlyRevenue)} color="emerald" />
        <KpiCard icon={ArrowUpRight} label={t("arrivalsToday")} value={stats.todayArrivals || 0} color="blue" />
        <KpiCard icon={ArrowDownRight} label={t("departuresToday")} value={stats.todayDepartures || 0} color="amber" />
      </div>

      {/* Occupancy & Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">{t("occupancyRate")}</h3>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-extrabold text-gray-900">{stats.occupancyPercentage || 0}%</p>
            <p className="text-sm text-gray-400 mb-1">{stats.occupiedRooms || 0} of {stats.totalRooms || 0} rooms</p>
          </div>
          <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${stats.occupancyPercentage || 0}%` }} />
          </div>
        </div>

        {/* Room Status Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">{t("roomStatusOverview")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t("available"), value: stats.availableRooms, color: "emerald" },
              { label: t("occupied"), value: stats.occupiedRooms, color: "red" },
              { label: t("reserved"), value: stats.reservedRooms, color: "blue" },
              { label: t("cleaning"), value: stats.cleaningRooms, color: "amber" },
            ].map((item) => (
              <div key={item.label} className={`p-4 rounded-xl bg-${item.color}-50 text-center`}>
                <p className={`text-2xl font-extrabold text-${item.color}-600`}>{item.value || 0}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/reservations" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all text-sm">{t("newReservation")}</Link>
        <Link to="/room-board" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm">{t("roomBoard")}</Link>
        <Link to="/payments" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm">{t("recordPayment")}</Link>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Arrivals */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800">{t("todayArrivals")}</h3>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{arrivals.length}</span>
          </div>
          {arrivals.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t("noArrivals")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {arrivals.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-medium">{row.bookingNo}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.roomId?.roomNumber || "-"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.guest?.name || "-"}</td>
                      <td className="px-6 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800">{t("todayDepartures")}</h3>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">{departures.length}</span>
          </div>
          {departures.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t("noDepartures")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {departures.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-medium">{row.bookingNo}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.roomId?.roomNumber || "-"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.guest?.name || "-"}</td>
                      <td className="px-6 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800">{t("recentPayments")}</h3>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t("noRecentPayments")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("receipt")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("method")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("amount")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPayments.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-medium">{row.receiptNo}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.reservationId?.roomId?.roomNumber || "-"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 capitalize">{row.method}</td>
                      <td className="px-6 py-3 text-sm font-bold text-emerald-600">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800">{t("needsAttention")}</h3>
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{roomsNeedingAttention.length}</span>
          </div>
          {roomsNeedingAttention.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t("allRoomsOkay")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {roomsNeedingAttention.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-bold">{row.roomNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.roomType}</td>
                      <td className="px-6 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}