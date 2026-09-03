const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const HousekeepingTask = require("../models/HousekeepingTask");
const asyncHandler = require("../utils/asyncHandler");

const parseDateRange = (req) => {
  const now = new Date();
  let start, end;

  if (req.query.from) {
    start = new Date(`${req.query.from}T00:00:00`);
  } else {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  }

  if (req.query.to) {
    end = new Date(`${req.query.to}T23:59:59.999`);
  } else {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (start > end) {
    return { start: end, end: start };
  }

  return { start, end };
};

// ===== OVERVIEW REPORT =====
const getReportsOverview = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);
  if (!range) return res.status(400).json({ message: "Invalid date range" });

  const { start, end } = range;

  const revenueAggregation = await Payment.aggregate([
    { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalRevenue = revenueAggregation[0]?.total || 0;

  const revenueByDate = await Payment.aggregate([
    { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const paymentsByMethod = await Payment.aggregate([
    { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]);

  const reservationsBySource = await Reservation.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const voucherUsage = await Reservation.aggregate([
    { $match: { scheduledCheckIn: { $gte: start, $lte: end }, status: { $ne: "cancelled" }, voucherCode: { $exists: true, $nin: [null, ""] } } },
    { $group: { _id: "$voucherCode", count: { $sum: 1 }, discount: { $sum: "$priceSnapshot.voucherDiscount" } } },
    { $sort: { discount: -1 } }
  ]);

  const housekeepingSummary = await HousekeepingTask.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { type: "$type", status: "$status" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const formattedHousekeeping = housekeepingSummary.map(item => ({
    type: item._id.type, status: item._id.status, count: item.count
  }));

  const [totalPaymentsCount, totalReservationsCreated, totalArrivals, totalDepartures, totalCancellations] = await Promise.all([
    Payment.countDocuments({ status: "completed", createdAt: { $gte: start, $lte: end } }),
    Reservation.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Reservation.countDocuments({ scheduledCheckIn: { $gte: start, $lte: end }, status: { $nin: ["cancelled"] } }),
    Reservation.countDocuments({ scheduledCheckOut: { $gte: start, $lte: end }, status: { $nin: ["cancelled"] } }),
    Reservation.countDocuments({ status: "cancelled", cancelledAt: { $gte: start, $lte: end } })
  ]);

  const roomStatusAgg = await Room.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const roomStatus = roomStatusAgg.map(item => ({ status: item._id, count: item.count }));

  const totalRooms = await Room.countDocuments({ active: true });
  const occupiedRooms = await Room.countDocuments({ active: true, status: "occupied" });
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Unpaid reservations
  const activeReservations = await Reservation.find({
    status: { $in: ["reserved", "checked_in", "checked_out"] }
  }).select("bookingNo status guest priceSnapshot scheduledCheckOut roomId").populate("roomId", "roomNumber").lean();

  const paymentAgg = await Payment.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$reservationId", paid: { $sum: "$amount" } } }
  ]);

  const paidMap = new Map(paymentAgg.map(item => [String(item._id), item.paid]));

  const unpaidAll = activeReservations.map(r => {
    const total = Number(r.priceSnapshot?.total || 0);
    const paid = Number(paidMap.get(String(r._id)) || 0);
    return {
      id: r._id, bookingNo: r.bookingNo, room: r.roomId?.roomNumber || "-",
      guest: r.guest?.name || "-", status: r.status, total, paid, balance: total - paid
    };
  }).filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);

  const totalUnpaid = unpaidAll.reduce((sum, r) => sum + Number(r.balance || 0), 0);
  const unpaidReservations = unpaidAll.slice(0, 50);

  res.json({
    range: { from: start, to: end },
    stats: { totalRevenue, totalPaymentsCount, totalReservationsCreated, totalArrivals, totalDepartures, totalCancellations, totalRooms, occupiedRooms, occupancyPercentage, totalUnpaid },
    revenueByDate, paymentsByMethod, reservationsBySource, voucherUsage,
    housekeepingSummary: formattedHousekeeping, roomStatus, unpaidReservations
  });
});

// ===== DETAILED GUEST LIST REPORT =====
const getGuestReport = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);
  if (!range) return res.status(400).json({ message: "Invalid date range" });

  const { start, end } = range;

  // Get all reservations in date range
  const reservations = await Reservation.find({
    createdAt: { $gte: start, $lte: end }
  }).populate("roomId", "roomNumber roomType floor maxGuests").sort({ createdAt: -1 }).lean();

  // Get all payments
  const payments = await Payment.find({ status: "completed" }).lean();

  // Build payment map
  const paymentMap = {};
  payments.forEach(p => {
    const key = String(p.reservationId);
    if (!paymentMap[key]) paymentMap[key] = { totalPaid: 0, methods: [], transactions: [] };
    paymentMap[key].totalPaid += Number(p.amount || 0);
    if (!paymentMap[key].methods.includes(p.method)) paymentMap[key].methods.push(p.method);
    paymentMap[key].transactions.push({
      receiptNo: p.receiptNo, amount: p.amount, method: p.method, date: p.createdAt
    });
  });

  // Build guest report
  const guestReport = reservations.map(r => {
    const roomTotal = Number(r.priceSnapshot?.total || 0);
    const paymentInfo = paymentMap[String(r._id)] || { totalPaid: 0, methods: [], transactions: [] };
    const balance = roomTotal - paymentInfo.totalPaid;

    return {
      bookingNo: r.bookingNo,
      source: r.source,
      status: r.status,
      guest: {
        name: r.guest?.name || "-",
        phone: r.guest?.phone || "-",
        guestType: r.guest?.guestType || "local",
        nrc: r.guest?.nrc || "-",
        passport: r.guest?.passport || "-",
      },
      room: {
        number: r.roomId?.roomNumber || "-",
        type: r.roomId?.roomType || "-",
        floor: r.roomId?.floor || "-",
        maxGuests: r.roomId?.maxGuests || 2,
      },
      checkIn: r.scheduledCheckIn,
      checkOut: r.scheduledCheckOut,
      actualCheckIn: r.actualCheckIn || null,
      actualCheckOut: r.actualCheckOut || null,
      adults: r.adults || 0,
      children: r.children || 0,
      totalGuests: (r.adults || 0) + (r.children || 0),
      totalAmount: roomTotal,
      paidAmount: paymentInfo.totalPaid,
      balance: balance,
      paymentMethods: paymentInfo.methods,
      transactions: paymentInfo.transactions,
      voucherCode: r.voucherCode || null,
      voucherDiscount: Number(r.priceSnapshot?.voucherDiscount || 0),
      createdAt: r.createdAt,
    };
  });

  res.json(guestReport);
});

// ===== DETAILED PAYMENT REPORT =====
const getPaymentReport = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);
  if (!range) return res.status(400).json({ message: "Invalid date range" });

  const { start, end } = range;

  const payments = await Payment.find({
    status: "completed",
    createdAt: { $gte: start, $lte: end }
  }).populate({
    path: "reservationId",
    select: "bookingNo guest roomId",
    populate: { path: "roomId", select: "roomNumber roomType" }
  }).sort({ createdAt: -1 }).lean();

  const paymentReport = payments.map(p => ({
    receiptNo: p.receiptNo,
    amount: p.amount,
    method: p.method,
    reference: p.reference || "-",
    note: p.note || "-",
    date: p.createdAt,
    bookingNo: p.reservationId?.bookingNo || "-",
    guestName: p.reservationId?.guest?.name || "-",
    guestPhone: p.reservationId?.guest?.phone || "-",
    roomNumber: p.reservationId?.roomId?.roomNumber || "-",
    roomType: p.reservationId?.roomId?.roomType || "-",
  }));

  // Summary by method
  const methodSummary = {};
  paymentReport.forEach(p => {
    if (!methodSummary[p.method]) methodSummary[p.method] = { count: 0, total: 0 };
    methodSummary[p.method].count++;
    methodSummary[p.method].total += Number(p.amount || 0);
  });

  res.json({
    payments: paymentReport,
    summary: methodSummary,
    totalAmount: paymentReport.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    totalCount: paymentReport.length,
  });
});

// ===== EXPORT CSV =====
const exportReport = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);
  if (!range) return res.status(400).json({ message: "Invalid date range" });

  const { start, end } = range;
  const type = req.params.type;

  let columns = [];
  let rows = [];
  let filename = `${type}-report.csv`;

  if (type === "guests") {
    const reservations = await Reservation.find({
      createdAt: { $gte: start, $lte: end }
    }).populate("roomId", "roomNumber roomType floor").sort({ createdAt: -1 }).lean();

    const payments = await Payment.find({ status: "completed" }).lean();
    const paymentMap = {};
    payments.forEach(p => {
      const key = String(p.reservationId);
      if (!paymentMap[key]) paymentMap[key] = 0;
      paymentMap[key] += Number(p.amount || 0);
    });

    columns = [
      { key: "bookingNo", label: "Booking No" },
      { key: "guestName", label: "Guest Name" },
      { key: "guestPhone", label: "Phone" },
      { key: "guestType", label: "Guest Type" },
      { key: "nrc", label: "NRC" },
      { key: "passport", label: "Passport" },
      { key: "roomNumber", label: "Room" },
      { key: "roomType", label: "Room Type" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "adults", label: "Adults" },
      { key: "children", label: "Children" },
      { key: "totalAmount", label: "Total" },
      { key: "paidAmount", label: "Paid" },
      { key: "balance", label: "Balance" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
    ];

    rows = reservations.map(r => {
      const total = Number(r.priceSnapshot?.total || 0);
      const paid = paymentMap[String(r._id)] || 0;
      return {
        bookingNo: r.bookingNo,
        guestName: r.guest?.name || "-",
        guestPhone: r.guest?.phone || "-",
        guestType: r.guest?.guestType || "local",
        nrc: r.guest?.nrc || "-",
        passport: r.guest?.passport || "-",
        roomNumber: r.roomId?.roomNumber || "-",
        roomType: r.roomId?.roomType || "-",
        checkIn: r.scheduledCheckIn ? new Date(r.scheduledCheckIn).toLocaleString() : "-",
        checkOut: r.scheduledCheckOut ? new Date(r.scheduledCheckOut).toLocaleString() : "-",
        adults: r.adults || 0,
        children: r.children || 0,
        totalAmount: total,
        paidAmount: paid,
        balance: total - paid,
        status: r.status,
        source: r.source,
      };
    });

  } else if (type === "payments") {
    const payments = await Payment.find({
      status: "completed",
      createdAt: { $gte: start, $lte: end }
    }).populate({
      path: "reservationId",
      select: "bookingNo guest roomId",
      populate: { path: "roomId", select: "roomNumber" }
    }).sort({ createdAt: -1 }).lean();

    columns = [
      { key: "receiptNo", label: "Receipt No" },
      { key: "bookingNo", label: "Booking No" },
      { key: "guestName", label: "Guest" },
      { key: "roomNumber", label: "Room" },
      { key: "amount", label: "Amount" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
      { key: "date", label: "Date" },
    ];

    rows = payments.map(p => ({
      receiptNo: p.receiptNo,
      bookingNo: p.reservationId?.bookingNo || "-",
      guestName: p.reservationId?.guest?.name || "-",
      roomNumber: p.reservationId?.roomId?.roomNumber || "-",
      amount: p.amount,
      method: p.method,
      reference: p.reference || "-",
      date: p.createdAt ? new Date(p.createdAt).toLocaleString() : "-",
    }));

  } else if (type === "revenue-by-date") {
    const data = await Payment.aggregate([
      { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    columns = [
      { key: "date", label: "Date" },
      { key: "payments", label: "Payments" },
      { key: "revenue", label: "Revenue" },
    ];

    rows = data.map(item => ({ date: item._id, payments: item.count, revenue: item.total }));

  } else if (type === "payments-by-method") {
    const data = await Payment.aggregate([
      { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    columns = [
      { key: "method", label: "Method" },
      { key: "count", label: "Count" },
      { key: "total", label: "Amount" },
    ];

    rows = data.map(item => ({ method: item._id || "unknown", count: item.count, total: item.total }));

  } else if (type === "unpaid") {
    const activeReservations = await Reservation.find({
      status: { $in: ["reserved", "checked_in", "checked_out"] }
    }).select("bookingNo status guest priceSnapshot roomId").populate("roomId", "roomNumber").lean();

    const paymentAgg = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$reservationId", paid: { $sum: "$amount" } } }
    ]);
    const paidMap = new Map(paymentAgg.map(item => [String(item._id), item.paid]));

    columns = [
      { key: "bookingNo", label: "Booking No" },
      { key: "room", label: "Room" },
      { key: "guest", label: "Guest" },
      { key: "total", label: "Total" },
      { key: "paid", label: "Paid" },
      { key: "balance", label: "Balance" },
      { key: "status", label: "Status" },
    ];

    rows = activeReservations.map(r => {
      const total = Number(r.priceSnapshot?.total || 0);
      const paid = Number(paidMap.get(String(r._id)) || 0);
      return { bookingNo: r.bookingNo, room: r.roomId?.roomNumber || "-", guest: r.guest?.name || "-", total, paid, balance: total - paid, status: r.status };
    }).filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);

  } else {
    return res.status(400).json({ message: "Invalid report type" });
  }

  // Generate CSV
  const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => csvEscape(c.label)).join(",");
  const lines = rows.map(row => columns.map(c => csvEscape(row[c.key])).join(","));
  const csv = "\uFEFF" + [header, ...lines].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(csv);
});

module.exports = {
  getReportsOverview,
  getGuestReport,
  getPaymentReport,
  exportReport
};