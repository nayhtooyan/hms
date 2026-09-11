import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import { Loader2, Download, Users, CreditCard, TrendingUp, DollarSign, Search, ChevronDown, ChevronUp } from "lucide-react";

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function StatCard({ label, value, gradient = "from-purple-500 to-indigo-500", icon: Icon }) {
  return (
    <div className="card-dark p-6 hover:border-purple-500/30 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold text-white mt-2 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-glow transition-all`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportTable({ title, columns, data, type, from, to, exporting, onExport, emptyMessage }) {
  const { t } = useLanguage();
  return (
    <div className="card-dark overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
        <h3 className="font-bold text-white">{title}</h3>
        <button onClick={() => onExport(type)} disabled={exporting === type} className="btn-secondary flex items-center gap-2 text-xs py-2 px-4">
          <Download className="w-4 h-4" /> {exporting === type ? t("loading") : t("exportCsv")}
        </button>
      </div>
      {!data || data.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">{emptyMessage || t("noData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
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
  const { t } = useLanguage();

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
    } catch { addToast(t("error"), "error"); } finally { setLoading(false); }
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
    } catch { addToast(t("error"), "error"); } finally { setExporting(null); }
  };

  const setToday = () => { const d = toInputDate(new Date()); setFrom(d); setTo(d); loadAll(d, d); };
  const setThisMonth = () => { const n = new Date(); const s = toInputDate(new Date(n.getFullYear(), n.getMonth(), 1)); const e = toInputDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)); setFrom(s); setTo(e); loadAll(s, e); };

  const tabs = [
    { id: "overview", label: t("overview") },
    { id: "guests", label: t("guestList") },
    { id: "payments", label: t("paymentsTab") },
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

  const methodStyles = {
    cash: "badge-emerald", card: "badge-blue",
    bank_transfer: "badge-purple", other: "badge-gray",
  };

  const statusStyles = {
    reserved: "badge-blue", checked_in: "badge-emerald",
    checked_out: "badge-gray", cancelled: "badge-red",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title-dark">{t("reportsTitle")}</h1>
        <p className="page-subtitle-dark">{t("reportsSubtitle")}</p>
      </div>

      {/* Date Filter */}
      <div className="card-dark p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="label-dark">{t("from")}</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-dark" /></div>
          <div><label className="label-dark">{t("to")}</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-dark" /></div>
          <button onClick={() => loadAll(from, to)} className="btn-primary">{t("apply")}</button>
          <button onClick={setToday} className="btn-secondary">{t("today")}</button>
          <button onClick={setThisMonth} className="btn-secondary">{t("thisMonth")}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow" : "bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-purple-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" /> {t("loading")}
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label={t("totalRevenueLabel")} value={formatMoney(data.stats?.totalRevenue)} gradient="from-emerald-500 to-teal-500" icon={DollarSign} />
                <StatCard label={t("totalPayments")} value={data.stats?.totalPaymentsCount || 0} gradient="from-blue-500 to-cyan-500" icon={CreditCard} />
                <StatCard label={t("reservationsLabel")} value={data.stats?.totalReservationsCreated || 0} gradient="from-purple-500 to-pink-500" icon={Users} />
                <StatCard label={t("occupancy")} value={`${data.stats?.occupancyPercentage || 0}%`} gradient="from-amber-500 to-orange-500" icon={TrendingUp} />
                <StatCard label={t("arrivals")} value={data.stats?.totalArrivals || 0} gradient="from-blue-500 to-cyan-500" icon={Users} />
                <StatCard label={t("departures")} value={data.stats?.totalDepartures || 0} gradient="from-amber-500 to-orange-500" icon={Users} />
                <StatCard label={t("cancellations")} value={data.stats?.totalCancellations || 0} gradient="from-red-500 to-rose-500" icon={Users} />
                <StatCard label={t("totalUnpaid")} value={formatMoney(data.stats?.totalUnpaid)} gradient="from-red-500 to-rose-500" icon={DollarSign} />
              </div>

              <ReportTable
                title={t("revenueByDate")}
                columns={[
                  { key: "_id", label: t("date") },
                  { key: "count", label: t("totalPayments") },
                  { key: "total", label: t("revenue"), render: r => <span className="font-bold text-emerald-400">{formatMoney(r.total)}</span> }
                ]}
                data={data.revenueByDate || []}
                type="revenue-by-date" from={from} to={to} exporting={exporting} onExport={exportReport}
              />

              <ReportTable
                title={t("paymentsByMethod")}
                columns={[
                  { key: "_id", label: t("method"), render: r => <span className={methodStyles[r._id] || "badge-gray"}>{t(r._id)}</span> },
                  { key: "count", label: t("totalPayments") },
                  { key: "total", label: t("amount"), render: r => formatMoney(r.total) }
                ]}
                data={data.paymentsByMethod || []}
                type="payments-by-method" from={from} to={to} exporting={exporting} onExport={exportReport}
              />
            </div>
          )}

          {/* GUEST LIST TAB */}
          {activeTab === "guests" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" placeholder={t("guestSearchPlaceholder")} className="input-dark pl-11" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} />
                </div>
                <button onClick={() => exportReport("guests")} disabled={exporting === "guests"} className="btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> {exporting === "guests" ? t("loading") : t("exportAllGuests")}
                </button>
              </div>

              <div className="card-dark overflow-hidden">
                {!filteredGuests || filteredGuests.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">{t("noData")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-dark">
                      <thead><tr>
                        <th>{t("booking")}</th>
                        <th>{t("guest")}</th>
                        <th>{t("idLabel")}</th>
                        <th>{t("room")}</th>
                        <th className="hidden lg:table-cell">{t("checkIn")}</th>
                        <th className="hidden lg:table-cell">{t("checkOut")}</th>
                        <th>{t("adults")}</th>
                        <th>{t("total")}</th>
                        <th>{t("paid")}</th>
                        <th>{t("balance")}</th>
                        <th>{t("status")}</th>
                        <th className="text-right">{t("details")}</th>
                      </tr></thead>
                      <tbody>
                        {filteredGuests.map((g, i) => (
                          <>
                            <tr key={i}>
                              <td className="font-bold text-white">
                                <div className="flex items-center gap-1.5">
                                  {g.bookingNo}
                                  {g.source === "walk_in" && <span className="badge-emerald">{t("walkInBadge")}</span>}
                                </div>
                              </td>
                              <td>
                                <p className="font-semibold text-white">{g.guest?.name}</p>
                                <p className="text-xs text-gray-500">{g.guest?.phone}</p>
                              </td>
                              <td>
                                {g.guest?.guestType === "foreigner" ? (
                                  <div><span className="text-[10px] font-bold text-blue-400 uppercase">{t("passport")}</span><p className="text-blue-300 font-medium">{g.guest?.passport}</p></div>
                                ) : (
                                  <div><span className="text-[10px] font-bold text-gray-500 uppercase">{t("nrc")}</span><p className="font-medium">{g.guest?.nrc}</p></div>
                                )}
                              </td>
                              <td>
                                <p className="font-semibold text-white">{g.room?.number}</p>
                                <p className="text-xs text-gray-500">{g.room?.type} • {t("floor")} {g.room?.floor}</p>
                              </td>
                              <td className="hidden lg:table-cell">{formatDateTime(g.checkIn)}</td>
                              <td className="hidden lg:table-cell">{formatDateTime(g.checkOut)}</td>
                              <td><span className="badge-purple">{g.totalGuests} {t("pax")}</span></td>
                              <td className="font-semibold text-white">{formatMoney(g.totalAmount)}</td>
                              <td className="text-emerald-400 font-semibold">{formatMoney(g.paidAmount)}</td>
                              <td>{g.balance > 0 ? <span className="text-red-400 font-bold">{formatMoney(g.balance)}</span> : <span className="text-emerald-400 font-bold">{t("paidInFull")}</span>}</td>
                              <td><span className={statusStyles[g.status] || "badge-gray"}>{t(g.status)}</span></td>
                              <td className="text-right">
                                <button onClick={() => setExpandedGuest(expandedGuest === i ? null : i)} className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
                                  {expandedGuest === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                            {expandedGuest === i && (
                              <tr key={`${i}-detail`}>
                                <td colSpan={12} className="bg-gray-800/30">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
                                    <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t("paymentMethods")}</p>
                                      <div className="flex flex-wrap gap-2">
                                        {g.paymentMethods?.length > 0 ? g.paymentMethods.map((m, mi) => (
                                          <span key={mi} className={methodStyles[m] || "badge-gray"}>{t(m)}</span>
                                        )) : <span className="text-sm text-gray-500">{t("noPayments")}</span>}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t("transactions")}</p>
                                      {g.transactions?.length > 0 ? g.transactions.map((tx, ti) => (
                                        <p key={ti} className="text-sm text-gray-300">{tx.receiptNo} — {formatMoney(tx.amount)} ({t(tx.method)})</p>
                                      )) : <p className="text-sm text-gray-500">{t("noTransactions")}</p>}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t("additionalInfo")}</p>
                                      <p className="text-sm text-gray-300">{t("adults")}: {g.adults} • {t("children")}: {g.children}</p>
                                      {g.voucherCode && <p className="text-sm text-gray-300">{t("voucherCode")}: {g.voucherCode} (-{formatMoney(g.voucherDiscount)})</p>}
                                      <p className="text-sm text-gray-300">{t("booked")}: {formatDateTime(g.createdAt)}</p>
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

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && paymentData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label={t("totalAmount")} value={formatMoney(paymentData.totalAmount)} gradient="from-emerald-500 to-teal-500" icon={DollarSign} />
                <StatCard label={t("totalTransactions")} value={paymentData.totalCount} gradient="from-blue-500 to-cyan-500" icon={CreditCard} />
                {Object.entries(paymentData.summary || {}).map(([method, info]) => (
                  <StatCard key={method} label={t(method)} value={formatMoney(info.total)} gradient={method === "cash" ? "from-emerald-500 to-teal-500" : method === "card" ? "from-blue-500 to-cyan-500" : "from-purple-500 to-pink-500"} icon={CreditCard} />
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={() => exportReport("payments")} disabled={exporting === "payments"} className="btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> {exporting === "payments" ? t("loading") : t("exportPayments")}
                </button>
              </div>

              <div className="card-dark overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-dark">
                    <thead><tr>
                      <th>{t("receiptNo")}</th>
                      <th>{t("booking")}</th>
                      <th>{t("guest")}</th>
                      <th>{t("room")}</th>
                      <th>{t("amount")}</th>
                      <th>{t("method")}</th>
                      <th className="hidden md:table-cell">{t("reference")}</th>
                      <th>{t("date")}</th>
                    </tr></thead>
                    <tbody>
                      {(paymentData.payments || []).map((p, i) => (
                        <tr key={i}>
                          <td className="font-bold text-white">{p.receiptNo}</td>
                          <td>{p.bookingNo}</td>
                          <td>{p.guestName}</td>
                          <td>{p.roomNumber}</td>
                          <td className="font-bold text-emerald-400">{formatMoney(p.amount)}</td>
                          <td><span className={methodStyles[p.method] || "badge-gray"}>{t(p.method)}</span></td>
                          <td className="hidden md:table-cell">{p.reference}</td>
                          <td>{formatDateTime(p.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!paymentData.payments || paymentData.payments.length === 0) && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
                </div>
              </div>
            </div>
          )}

          {/* REVENUE TAB */}
          {activeTab === "revenue" && data && (
            <div className="space-y-6">
              <ReportTable
                title={t("revenueByDate")}
                columns={[
                  { key: "_id", label: t("date") },
                  { key: "count", label: t("totalPayments") },
                  { key: "total", label: t("revenue"), render: r => <span className="font-bold text-emerald-400">{formatMoney(r.total)}</span> }
                ]}
                data={data.revenueByDate || []}
                type="revenue-by-date" from={from} to={to} exporting={exporting} onExport={exportReport}
              />
              <ReportTable
                title={t("paymentsByMethod")}
                columns={[
                  { key: "_id", label: t("method"), render: r => <span className={methodStyles[r._id] || "badge-gray"}>{t(r._id)}</span> },
                  { key: "count", label: t("totalPayments") },
                  { key: "total", label: t("amount"), render: r => formatMoney(r.total) }
                ]}
                data={data.paymentsByMethod || []}
                type="payments-by-method" from={from} to={to} exporting={exporting} onExport={exportReport}
              />
            </div>
          )}

          {/* UNPAID TAB */}
          {activeTab === "unpaid" && data && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="card-dark p-4 border-red-500/30">
                  <p className="text-sm font-semibold text-red-300">{t("outstandingBalance")}</p>
                  <p className="text-2xl font-extrabold text-red-400">{formatMoney(data.stats?.totalUnpaid)}</p>
                </div>
                <button onClick={() => exportReport("unpaid")} disabled={exporting === "unpaid"} className="btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> {exporting === "unpaid" ? t("loading") : t("exportUnpaid")}
                </button>
              </div>

              <ReportTable
                title={t("unpaid")}
                columns={[
                  { key: "bookingNo", label: t("booking") },
                  { key: "room", label: t("room") },
                  { key: "guest", label: t("guest") },
                  { key: "total", label: t("total"), render: r => formatMoney(r.total) },
                  { key: "paid", label: t("paid"), render: r => <span className="text-emerald-400">{formatMoney(r.paid)}</span> },
                  { key: "balance", label: t("balance"), render: r => <span className="text-red-400 font-bold">{formatMoney(r.balance)}</span> },
                  { key: "status", label: t("status"), render: r => <span className={statusStyles[r.status] || "badge-gray"}>{t(r.status)}</span> },
                ]}
                data={data.unpaidReservations || []}
                type="unpaid" from={from} to={to} exporting={exporting} onExport={exportReport}
                emptyMessage={t("allClear")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}