const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const HousekeepingTask = require("../models/HousekeepingTask");

const asyncHandler = require("../utils/asyncHandler");

const getDateRanges = () => {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return {
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth
  };
};

const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Room stats
  const totalRooms = await Room.countDocuments({ active: true });
  const roomStatusCounts = await Room.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const roomStatusMap = {};
  roomStatusCounts.forEach(item => { roomStatusMap[item._id] = item.count; });

  const occupiedRooms = roomStatusMap["occupied"] || 0;
  const availableRooms = roomStatusMap["available"] || 0;
  const reservedRooms = roomStatusMap["reserved"] || 0;
  const cleaningRooms = roomStatusMap["cleaning"] || 0;
  const maintenanceRooms = roomStatusMap["maintenance"] || 0;
  const blockedRooms = roomStatusMap["blocked"] || 0;
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Today's revenue
  const todayRevenueAgg = await Payment.aggregate([
    { $match: { status: "completed", createdAt: { $gte: startOfToday, $lte: endOfToday } } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const todayRevenue = todayRevenueAgg[0]?.total || 0;

  // Monthly revenue
  const monthlyRevenueAgg = await Payment.aggregate([
    { $match: { status: "completed", createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

  // Total payments count this month
  const totalPaymentsCount = await Payment.countDocuments({
    status: "completed",
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Today arrivals & departures
  const todayArrivals = await Reservation.countDocuments({
    scheduledCheckIn: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ["cancelled"] }
  });
  const todayDepartures = await Reservation.countDocuments({
    scheduledCheckOut: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ["cancelled"] }
  });

  // Arrivals list
  const arrivals = await Reservation.find({
    scheduledCheckIn: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ["cancelled"] }
  }).populate("roomId", "roomNumber").limit(20).lean();

  // Departures list
  const departures = await Reservation.find({
    scheduledCheckOut: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ["cancelled"] }
  }).populate("roomId", "roomNumber").limit(20).lean();

  // Recent payments
  const recentPayments = await Payment.find({ status: "completed" })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({
      path: "reservationId",
      select: "bookingNo roomId",
      populate: { path: "roomId", select: "roomNumber" }
    })
    .lean();

  // Rooms needing attention
  const roomsNeedingAttention = await Room.find({
    active: true,
    status: { $in: ["cleaning", "maintenance", "blocked"] }
  }).limit(20).lean();

  // Housekeeping task counts
  const pendingCleanTasks = await HousekeepingTask.countDocuments({
    type: "cleaning",
    status: { $in: ["pending", "in_progress"] }
  });
  const pendingMaintenanceTasks = await HousekeepingTask.countDocuments({
    type: "maintenance",
    status: { $in: ["pending", "in_progress"] }
  });

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const revenueByDateAgg = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: ninetyDaysAgo, $lte: endOfToday }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const revenueMap = {};
  revenueByDateAgg.forEach(item => { revenueMap[item._id] = { total: item.total, count: item.count }; });

  const revenueByDate = [];
  const fillDate = new Date(ninetyDaysAgo);
  while (fillDate <= endOfToday) {
    const dateStr = fillDate.toISOString().split("T")[0];
    revenueByDate.push({
      _id: dateStr,
      total: revenueMap[dateStr]?.total || 0,
      count: revenueMap[dateStr]?.count || 0,
    });
    fillDate.setDate(fillDate.getDate() + 1);
  }

  res.json({
    stats: {
      totalRooms,
      availableRooms,
      occupiedRooms,
      reservedRooms,
      cleaningRooms,
      maintenanceRooms,
      blockedRooms,
      occupancyPercentage,
      todayRevenue,
      monthlyRevenue,
      totalPaymentsCount,
      todayArrivals,
      todayDepartures,
      pendingCleanTasks,
      pendingMaintenanceTasks,
    },
    arrivals,
    departures,
    recentPayments,
    roomsNeedingAttention,
    revenueByDate,  
  });
});

module.exports = {
  getDashboardSummary
};