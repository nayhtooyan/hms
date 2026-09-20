import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import { Loader2, Search, Eye, Code, X } from "lucide-react";

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* TECHNICAL FIELDS  */
const IGNORED = [
  "_id", "__v", "createdAt", "updatedAt", "deletedAt",
  "password", "ipAddress", "userAgent", "voucherId",
  "reservationId", "roomId", "assignedTo", "triggeredByUser"
];

/* Money fields formatted with currency setting */
const MONEY = [
  "basePrice", "extraBedPrice", "extraPersonPrice", "overtimeHourlyRate",
  "amount", "maxDiscount", "total", "roomCharge", "extraBedCharge",
  "extraPersonCharge", "overtimeCharge", "voucherDiscount", "taxAmount",
  "discount", "paid", "balance"
];

/* Date fields readable date-time */
const DATES = [
  "scheduledCheckIn", "scheduledCheckOut", "actualCheckIn", "actualCheckOut",
  "validFrom", "validTo", "cancelledAt", "expiresAt"
];

/* Enum fields  translated values */
const ENUMS = ["status", "priority", "type", "role", "method", "guestType", "source", "action"];

/* Friendly labels mapped to translation keys */
const LABEL_KEYS = {
  roomNumber: "roomNumber", floor: "floor", roomType: "roomType",
  maxGuests: "maxGuests", status: "status", basePrice: "basePrice",
  extraBedPrice: "extraBedPrice", extraPersonPrice: "extraPersonPrice",
  overtimeHourlyRate: "overtimeRate", amenities: "amenities",
  active: "active", notes: "notes", note: "note",
  "guest.name": "guestName", "guest.phone": "guestPhone",
  "guest.guestType": "guestType", "guest.nrc": "nrc", "guest.passport": "passport",
  adults: "adults", children: "children", extraBeds: "extraBeds",
  scheduledCheckIn: "checkIn", scheduledCheckOut: "checkOut",
  actualCheckIn: "actualCheckIn", actualCheckOut: "actualCheckOut",
  method: "method", amount: "amount", reference: "reference",
  code: "code", value: "value", usageLimit: "usageLimit",
  validFrom: "validFrom", validTo: "validTo", maxDiscount: "maxDiscount",
  name: "name", username: "username", role: "role",
  hotelName: "hotelName", language: "language", currency: "currency",
  currencySymbol: "currencySymbol", timezone: "timezone",
  checkInTime: "checkInTime", checkOutTime: "checkOutTime",
  taxRate: "taxRate", invoiceFooter: "invoiceFooter",
  address: "address", contactEmail: "contactEmail", contactPhone: "contactPhone",
  type: "type", priority: "priority",
  "priceSnapshot.total": "total",
  "priceSnapshot.roomCharge": "roomCharge",
  "priceSnapshot.extraBedCharge": "extraBed",
  "priceSnapshot.overtimeCharge": "overtime",
  "priceSnapshot.voucherDiscount": "voucherDiscount",
  "priceSnapshot.taxAmount": "taxAmount",
  voucherCode: "voucherCode", source: "source",
  receiptNo: "receiptNo", bookingNo: "bookingNo",
  "roomId.roomNumber": "room", "assignedTo.name": "assignTo",
};

/* Fields shown for CREATE / DELETE summaries */
const SUMMARY_ORDER = [
  "roomNumber", "roomType", "floor", "maxGuests", "basePrice", "status",
  "guest.name", "guest.phone", "guest.guestType", "guest.nrc", "guest.passport",
  "scheduledCheckIn", "scheduledCheckOut", "adults", "children", "extraBeds",
  "amount", "method", "receiptNo", "bookingNo", "code", "value",
  "name", "username", "role", "type", "priority", "notes"
];

/* Flatten nested objects */
const flatten = (obj, prefix = "") => {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  Object.keys(obj).forEach((k) => {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, path));
    } else {
      out[path] = v;
    }
  });
  return out;
};

/* "extraPersonPrice" */
const humanize = (s) =>
  String(s)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditLogs() {
  const { formatDateTime, formatMoney } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

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
    } catch {
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openLog = (log) => {
    setSelectedLog(log);
    setShowRaw(false);
  };

  /*  Friendly label  */
  const labelFor = (path) => {
    const leaf = path.split(".").pop();
    const key = LABEL_KEYS[path] || LABEL_KEYS[leaf];
    return key ? t(key) : humanize(leaf);
  };

  /*  Translate enum values  */
  const translateEnum = (v) => {
    const str = String(v);
    const direct = t(str);
    if (direct !== str) return direct;
    const camel = str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const camelTr = t(camel);
    if (camelTr !== camel) return camelTr;
    return humanize(str);
  };

  /*  Smart value formatting  */
  const formatValue = (path, v) => {
    const leaf = path.split(".").pop();
    if (v === null || v === undefined || v === "") return "-";
    if (Array.isArray(v)) return v.length ? v.join(", ") : t("none");
    if (typeof v === "boolean") {
      return leaf === "active" ? (v ? t("active") : t("disabled")) : (v ? t("yes") : t("no"));
    }
    if (leaf === "language") {
      return v === "en" ? t("english") : v === "my" ? t("myanmar") : String(v);
    }
    if (typeof v === "number" && MONEY.includes(leaf)) return formatMoney(v);
    if (typeof v === "string" && DATES.includes(leaf) && !isNaN(Date.parse(v))) return formatDateTime(v);
    if (ENUMS.includes(leaf)) return translateEnum(v);
    return String(v);
  };

  /*  Diff engine: only changed fields  */
  const computeDiff = (before, after) => {
    const b = flatten(before || {});
    const a = flatten(after || {});
    const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
    const changes = [];
    keys.forEach((path) => {
      const leaf = path.split(".").pop();
      if (IGNORED.includes(leaf) || IGNORED.includes(path)) return;
      const bv = b[path] ?? null;
      const av = a[path] ?? null;
      if (JSON.stringify(bv) === JSON.stringify(av)) return;
      changes.push({ path, before: bv, after: av });
    });
    return changes;
  };

  /*  Summary list for CREATE / DELETE  */
  const summaryList = (obj) => {
    const f = flatten(obj || {});
    return SUMMARY_ORDER
      .filter((k) => f[k] !== undefined && f[k] !== null && f[k] !== "")
      .map((k) => ({ path: k, value: f[k] }))
      .slice(0, 12);
  };

  const actionStyles = {
    CREATE: "badge-emerald", UPDATE: "badge-blue",
    UPDATE_STATUS: "badge-amber", DELETE: "badge-red",
    CHECK_IN: "badge-emerald", CHECK_OUT: "badge-gray",
    CANCEL: "badge-red",
  };

  /*  Render modal body  */
  const renderChanges = () => {
    if (!selectedLog) return null;

    const hasBefore = selectedLog.before && Object.keys(selectedLog.before).length > 0;
    const hasAfter = selectedLog.after && Object.keys(selectedLog.after).length > 0;
    const diff = hasBefore && hasAfter ? computeDiff(selectedLog.before, selectedLog.after) : [];
    const list = !hasBefore && hasAfter
      ? summaryList(selectedLog.after)
      : hasBefore && !hasAfter
        ? summaryList(selectedLog.before)
        : [];

    return (
      <div className="space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div><p className="label-dark">{t("user")}</p><p className="font-medium text-white">{selectedLog.userName}</p></div>
          <div><p className="label-dark">{t("time")}</p><p className="font-medium text-white">{formatDateTime(selectedLog.createdAt)}</p></div>
          <div><p className="label-dark">{t("ip")}</p><p className="text-sm text-gray-400">{selectedLog.ipAddress || "-"}</p></div>
          <div><p className="label-dark">{t("entity")}</p><p className="text-sm text-gray-400">{selectedLog.entity}</p></div>
          <div className="col-span-2"><p className="label-dark">{t("device")}</p><p className="text-xs text-gray-500 break-all">{selectedLog.userAgent || "-"}</p></div>
        </div>

        {/* UPDATE → only changed fields */}
        {hasBefore && hasAfter && diff.length > 0 && (
          <div className="card-dark p-4">
            <h4 className="text-sm font-bold text-white mb-3">
              {t("changes")} <span className="badge-purple">{diff.length} {t("fieldsChanged")}</span>
            </h4>
            <div className="space-y-2">
              {diff.map((c) => (
                <div key={c.path} className="grid grid-cols-3 gap-3 items-center p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/40">
                  <p className="text-xs font-bold text-gray-300">{labelFor(c.path)}</p>
                  <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 break-words">
                    {formatValue(c.path, c.before)}
                  </p>
                  <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 break-words">
                    {formatValue(c.path, c.after)}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2 px-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{t("field")}</p>
              <p className="text-[10px] font-bold text-red-400 uppercase">{t("before")}</p>
              <p className="text-[10px] font-bold text-emerald-400 uppercase">{t("after")}</p>
            </div>
          </div>
        )}

        {/* UPDATE but nothing visible changed */}
        {hasBefore && hasAfter && diff.length === 0 && (
          <div className="alert-dark-info">{t("noVisibleChanges")}</div>
        )}

        {/* CREATE / DELETE key fields summary */}
        {((!hasBefore && hasAfter) || (hasBefore && !hasAfter)) && list.length > 0 && (
          <div className="card-dark p-4">
            <h4 className="text-sm font-bold text-white mb-3">
              {!hasBefore ? t("newRecordCreated") : t("recordDeleted")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {list.map((item) => (
                <div key={item.path} className="flex justify-between gap-3 p-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                  <p className="text-xs text-gray-400">{labelFor(item.path)}</p>
                  <p className="text-xs font-semibold text-white text-right break-words">{formatValue(item.path, item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw JSON toggle  */}
        <div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="btn-secondary text-xs py-2 px-4 flex items-center gap-2"
          >
            {showRaw ? <X className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            {showRaw ? t("hideRaw") : t("viewRaw")}
          </button>

          {showRaw && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="label-dark">{t("before")}</p>
                <pre className="bg-gray-800/50 border border-gray-700/50 p-3 rounded-xl text-[10px] text-gray-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.before, null, 2) || t("none")}
                </pre>
              </div>
              <div>
                <p className="label-dark">{t("after")}</p>
                <pre className="bg-gray-800/50 border border-gray-700/50 p-3 rounded-xl text-[10px] text-gray-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.after, null, 2) || t("none")}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
                      <p className="text-xs text-gray-500 capitalize">{t(log.userRole) !== log.userRole ? t(log.userRole) : log.userRole}</p>
                    </td>
                    <td><span className={actionStyles[log.action] || "badge-gray"}>{log.action}</span></td>
                    <td>{log.entity}</td>
                    <td className="hidden md:table-cell text-gray-500">{log.ipAddress || "-"}</td>
                    <td className="text-right">
                      <button onClick={() => openLog(log)} className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
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
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`${selectedLog?.action || ""} • ${selectedLog?.entity || ""}`}
        size="lg"
      >
        {renderChanges()}
      </Modal>
    </div>
  );
}