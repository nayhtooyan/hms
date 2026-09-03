import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { Loader2, Download, Users, CreditCard, TrendingUp, DollarSign, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../LanguageContext";

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function StatCard({ label, value, icon: Icon, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ReportTable({ title, columns, data, type, from, to, exporting, onExport, emptyMessage = "No data found." }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h3 className="font-bold text-gray-800">{title}</h3>
        <button onClick={() => onExport(type)} disabled={exporting === type} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">
          <Download className="w-4 h-4" /> {exporting === type ? "..." : "CSV"}
        </button>
      </div>
      {!data || data.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50/50">{columns.map(c => <th key={c.key} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{c.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  {columns.map(c => <td key={c.key} className="px-6 py-3 text-sm whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { formatMoney, formatDateTime } = useSettings();
  const { addToast } = useToast();

  const [from, setFrom] = useState(() => toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => toInputDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
  const [data, setData] = useState(null);
  const [guestData, setGuestData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [guestSearch, setGuestSearch] = useState("");
  const [expandedGuest, setExpandedGuest] = useState(null);
  const { t } = useLanguage();

  const loadAll = async (f = from, t = to) => {
    try {
      setLoading(true);
      const [overviewRes, guestRes, paymentRes] = await Promise.all([
        api.get(`/reports/overview?from=${f}&to=${t}`),
        api.get(`/reports/guests?from=${f}&to=${t}`),
        api.get(`/reports/payments?from=${f}&to=${t}`),
      ]);
      setData(overviewRes.data);
      setGuestData(guestRes.data);
      setPaymentData(paymentRes.data);
    } catch { addToast("Failed to load reports", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const exportReport = async (type) => {
    try {
      setExporting(type);
      const res = await api.get(`/reports/export/${type}?from=${from}&to=${to}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}-${from}-to-${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { addToast("Export failed", "error"); } finally { setExporting(null); }
  };

  const setToday = () => { const d = toInputDate(new Date()); setFrom(d); setTo(d); loadAll(d, d); };
  const setThisMonth = () => { const n = new Date(); const s = toInputDate(new Date(n.getFullYear(), n.getMonth(), 1)); const e = toInputDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)); setFrom(s); setTo(e); loadAll(s, e); };

  const tabs = [
    { id: "overview", label: t("overview") },
    { id: "guests", label: t("guestList") },
    { id: "payments", label: t("paymentsTitle") },
    { id: "revenue", label: t("revenue") },
    { id: "unpaid", label: t("unpaid") },
  ];

  const filteredGuests = (guestData || []).filter(g =>
    (g.guest?.name || "").toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.bookingNo || "").toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.guest?.nrc || "").toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.guest?.passport || "").toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.room?.number || "").toLowerCase().includes(guestSearch.toLowerCase())
  );

  const methodColors = {
    cash: "bg-emerald-100 text-emerald-700",
    card: "bg-blue-100 text-blue-700",
    bank_transfer: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-600",
  };

  const statusStyles = {
    reserved: "bg-blue-100 text-blue-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("reportsTitle")}</h1>
        <p className="text-gray-500 text-sm mt-1">{t("reportsSubtitle")}</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="label-primary">{t("from")}</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-primary" /></div>
          <div><label className="label-primary">{t("to")}</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-primary" /></div>
          <button onClick={() => loadAll(from, to)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">{t("apply")}</button>
          <button onClick={setToday} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">{t("today")}</button>
          <button onClick={setThisMonth} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">{t("thisMonth")}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : (
        <>
          {/*  OVERVIEW TAB  */}
          {activeTab === "overview" && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label={t("totalRevenueLabel")} value={formatMoney(data.stats?.totalRevenue)} icon={DollarSign} color="emerald" />
                <StatCard label= {t("totalPayments")} value={data.stats?.totalPaymentsCount || 0} icon={CreditCard} color="blue" />
                <StatCard label={t("reservationsLabel")} value={data.stats?.totalReservationsCreated || 0} icon={Users} color="indigo" />
                <StatCard label={t("occupancy")} value={`${data.stats?.occupancyPercentage || 0}%`} icon={TrendingUp} color="purple" />
                <StatCard label={t("arrivals")} value={data.stats?.totalArrivals || 0} icon={Users} color="blue" />
                <StatCard label={t("departures")} value={data.stats?.totalDepartures || 0} icon={Users} color="amber" />
                <StatCard label={t("cancellations")} value={data.stats?.totalCancellations || 0} icon={Users} color="red" />
                <StatCard label={t("totalUnpaid")} value={formatMoney(data.stats?.totalUnpaid)} icon={DollarSign} color="red" />
              </div>

              <ReportTable title="Revenue By Date" columns={[{ key: "_id", label: "Date" }, { key: "count", label: t("paymentsTitle") }, { key: "total", label: "Revenue", render: r => formatMoney(r.total) }]} data={data.revenueByDate || []} type="revenue-by-date" from={from} to={to} exporting={exporting} onExport={exportReport} />
              <ReportTable title="Payments By Method" columns={[{ key: "_id", label: "Method", render: r => <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${methodColors[r._id] || "bg-gray-100 text-gray-600"}`}>{r._id || "unknown"}</span> }, { key: "count", label: "Count" }, { key: "total", label: "Amount", render: r => formatMoney(r.total) }]} data={data.paymentsByMethod || []} type="payments-by-method" from={from} to={to} exporting={exporting} onExport={exportReport} />
            </div>
          )}

          {/*  GUEST LIST TAB  */}
          {activeTab === "guests" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search by name, booking, NRC, passport, room..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} />
                </div>
                <button onClick={() => exportReport("guests")} disabled={exporting === "guests"} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50">
                  <Download className="w-4 h-4" /> {exporting === "guests" ? "Exporting..." : "Export All Guests"}
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {!filteredGuests || filteredGuests.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No guests found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("idLabel")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("checkIn")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">{t("checkOut")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("guests")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("total")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("paid")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("balance")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{t("status")}</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">{t("deatils")}</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredGuests.map((g, i) => (
                          <>
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-bold text-sm">
                                <div className="flex items-center gap-1.5">
                                  {g.bookingNo}
                                  {g.source === "walk_in" && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">WALK-IN</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <p className="font-semibold">{g.guest?.name}</p>
                                <p className="text-xs text-gray-400">{g.guest?.phone}</p>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {g.guest?.guestType === "foreigner" ? (
                                  <div><span className="text-[10px] font-bold text-blue-500 uppercase">{t("passport")}</span><p className="text-blue-600 font-medium">{g.guest?.passport}</p></div>
                                ) : (
                                  <div><span className="text-[10px] font-bold text-gray-400 uppercase">{t("nrc")}</span><p className="font-medium">{g.guest?.nrc}</p></div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <p className="font-semibold">{g.room?.number}</p>
                                <p className="text-xs text-gray-400">{g.room?.type} • Floor {g.room?.floor}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDateTime(g.checkIn)}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDateTime(g.checkOut)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">{g.totalGuests} PAX</span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold">{formatMoney(g.totalAmount)}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{formatMoney(g.paidAmount)}</td>
                              <td className="px-4 py-3 text-sm">
                                {g.balance > 0 ? <span className="text-red-600 font-bold">{formatMoney(g.balance)}</span> : <span className="text-emerald-600 font-bold">{t("paid")}</span>}
                              </td>
                              <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyles[g.status] || "bg-gray-100 text-gray-600"}`}>{g.status}</span></td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setExpandedGuest(expandedGuest === i ? null : i)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                  {expandedGuest === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                            {expandedGuest === i && (
                              <tr key={`${i}-detail`}>
                                <td colSpan={12} className="px-6 py-4 bg-gray-50/50">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Payment Methods</p>
                                      <div className="flex flex-wrap gap-2">
                                        {g.paymentMethods?.length > 0 ? g.paymentMethods.map((m, mi) => (
                                          <span key={mi} className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${methodColors[m] || "bg-gray-100 text-gray-600"}`}>{m}</span>
                                        )) : <span className="text-sm text-gray-400">No payments</span>}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Transactions</p>
                                      {g.transactions?.length > 0 ? g.transactions.map((t, ti) => (
                                        <p key={ti} className="text-sm text-gray-600">{t.receiptNo} — {formatMoney(t.amount)} ({t.method})</p>
                                      )) : <p className="text-sm text-gray-400">No transactions</p>}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Additional Info</p>
                                      <p className="text-sm text-gray-600">Adults: {g.adults} • Children: {g.children}</p>
                                      {g.voucherCode && <p className="text-sm text-gray-600">Voucher: {g.voucherCode} (-{formatMoney(g.voucherDiscount)})</p>}
                                      <p className="text-sm text-gray-600">Booked: {formatDateTime(g.createdAt)}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/*  PAYMENTS TAB  */}
          {activeTab === "payments" && paymentData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Amount" value={formatMoney(paymentData.totalAmount)} icon={DollarSign} color="emerald" />
                <StatCard label="Total Transactions" value={paymentData.totalCount} icon={CreditCard} color="blue" />
                {Object.entries(paymentData.summary || {}).map(([method, info]) => (
                  <StatCard key={method} label={method.replace("_", " ").toUpperCase()} value={formatMoney(info.total)} icon={CreditCard} color={method === "cash" ? "emerald" : method === "card" ? "blue" : "purple"} />
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={() => exportReport("payments")} disabled={exporting === "payments"} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50">
                  <Download className="w-4 h-4" /> {exporting === "payments" ? "Exporting..." : "Export Payments"}
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("recepit")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("booking")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("guest")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("room")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("amount")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("method")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">{t("reference")}</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{t("date")}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {(paymentData.payments || []).map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3 font-bold text-sm">{p.receiptNo}</td>
                          <td className="px-6 py-3 text-sm">{p.bookingNo}</td>
                          <td className="px-6 py-3 text-sm">{p.guestName}</td>
                          <td className="px-6 py-3 text-sm">{p.roomNumber}</td>
                          <td className="px-6 py-3 text-sm font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                          <td className="px-6 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${methodColors[p.method] || "bg-gray-100 text-gray-600"}`}>{p.method}</span></td>
                          <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">{p.reference}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{formatDateTime(p.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!paymentData.payments || paymentData.payments.length === 0) && <div className="text-center py-16 text-gray-400">No payments found.</div>}
                </div>
              </div>
            </div>
          )}

          {/*  REVENUE TAB  */}
          {activeTab === "revenue" && data && (
            <div className="space-y-6">
              <ReportTable title="Revenue By Date" columns={[{ key: "_id", label: t("date") }, { key: "count", label: t("paymentsTitle") }, { key: "total", label: t("revenue"), render: r => <span className="font-bold text-emerald-600">{formatMoney(r.total)}</span> }]} data={data.revenueByDate || []} type="revenue-by-date" from={from} to={to} exporting={exporting} onExport={exportReport} />
              <ReportTable title="Payments By Method" columns={[{ key: "_id", label: t("method"), render: r => <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${methodColors[r._id] || "bg-gray-100 text-gray-600"}`}>{r._id || "unknown"}</span> }, { key: "count", label: t("count") }, { key: "total", label: t("amount"), render: r => formatMoney(r.total) }]} data={data.paymentsByMethod || []} type="payments-by-method" from={from} to={to} exporting={exporting} onExport={exportReport} />
            </div>
          )}

          {/* UNPAID TAB */}
          {activeTab === "unpaid" && data && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm font-semibold text-red-700">Total Outstanding Balance</p>
                  <p className="text-2xl font-extrabold text-red-600">{formatMoney(data.stats?.totalUnpaid)}</p>
                </div>
                <button onClick={() => exportReport("unpaid")} disabled={exporting === "unpaid"} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50">
                  <Download className="w-4 h-4" /> {exporting === "unpaid" ? "Exporting..." : "Export Unpaid"}
                </button>
              </div>

              <ReportTable title="Unpaid Reservations" columns={[
                { key: "bookingNo", label: t("booking") },
                { key: "room", label: t("room") },
                { key: "guest", label: t("guest") },
                { key: "total", label: t("total"), render: r => formatMoney(r.total) },
                { key: "paid", label: t("paid"), render: r => <span className="text-emerald-600">{formatMoney(r.paid)}</span> },
                { key: "balance", label: t("balance"), render: r => <span className="text-red-600 font-bold">{formatMoney(r.balance)}</span> },
                { key: "status", label: t("status"), render: r => <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyles[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span> },
              ]} data={data.unpaidReservations || []} type="unpaid" from={from} to={to} exporting={exporting} onExport={exportReport} emptyMessage="No unpaid reservations. All clear!" />
            </div>
          )}
        </>
      )}
    </div>
  );
}