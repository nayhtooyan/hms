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
  const {
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth
  } = getDateRanges();

  const [
    totalRooms,
    availableRooms,
    occupiedRooms,
    reservedRooms,
    cleaningRooms,
    maintenanceRooms,
    blockedRooms
  ] = await Promise.all([
    Room.countDocuments({
      active: true
    }),

    Room.countDocuments({
      active: true,
      status: "available"
    }),

    Room.countDocuments({
      active: true,
      status: "occupied"
    }),

    Room.countDocuments({
      active: true,
      status: "reserved"
    }),

    Room.countDocuments({
      active: true,
      status: "cleaning"
    }),

    Room.countDocuments({
      active: true,
      status: "maintenance"
    }),

    Room.countDocuments({
      active: true,
      status: "blocked"
    })
  ]);

  const arrivalFilter = {
    scheduledCheckIn: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: {
      $nin: ["cancelled"]
    }
  };

  const departureFilter = {
    scheduledCheckOut: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: {
      $nin: ["cancelled"]
    }
  };

  const [
    todayArrivals,
    todayDepartures,
    arrivals,
    departures
  ] = await Promise.all([
    Reservation.countDocuments(arrivalFilter),

    Reservation.countDocuments(departureFilter),

    Reservation.find(arrivalFilter)
      .populate("roomId", "roomNumber roomType")
      .sort({
        scheduledCheckIn: 1
      })
      .limit(10),

    Reservation.find(departureFilter)
      .populate("roomId", "roomNumber roomType")
      .sort({
        scheduledCheckOut: 1
      })
      .limit(10)
  ]);

  const todayRevenueResult = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount"
        }
      }
    }
  ]);

  const monthlyRevenueResult = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      }
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount"
        }
      }
    }
  ]);

  const todayRevenue = todayRevenueResult[0]?.total || 0;
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

  const [
    pendingCleanTasks,
    pendingMaintenanceTasks
  ] = await Promise.all([
    HousekeepingTask.countDocuments({
      type: "cleaning",
      status: {
        $in: ["pending", "in_progress"]
      }
    }),

    HousekeepingTask.countDocuments({
      type: "maintenance",
      status: {
        $in: ["pending", "in_progress"]
      }
    })
  ]);

  const roomsNeedingAttention = await Room.find({
    active: true,
    status: {
      $in: ["cleaning", "maintenance", "blocked"]
    }
  })
    .sort({
      floor: 1,
      roomNumber: 1
    })
    .limit(12);

  const recentReservations = await Reservation.find()
    .sort({
      createdAt: -1
    })
    .limit(8)
    .populate("roomId", "roomNumber roomType");

  const recentPayments = await Payment.find()
    .sort({
      createdAt: -1
    })
    .limit(8)
    .populate({
      path: "reservationId",
      select: "bookingNo guest roomId",
      populate: {
        path: "roomId",
        select: "roomNumber"
      }
    });

  const activeReservations = await Reservation.find({
    status: {
      $in: ["reserved", "checked_in", "checked_out"]
    }
  })
    .select(
      "bookingNo status guest priceSnapshot scheduledCheckOut roomId"
    )
    .populate("roomId", "roomNumber")
    .lean();

  const paymentAggregation = await Payment.aggregate([
    {
      $match: {
        status: "completed"
      }
    },
    {
      $group: {
        _id: "$reservationId",
        paid: {
          $sum: "$amount"
        }
      }
    }
  ]);

  const paidMap = new Map(
    paymentAggregation.map((item) => [
      String(item._id),
      item.paid
    ])
  );

  const unpaidReservations = activeReservations
    .map((reservation) => {
      const total = Number(reservation.priceSnapshot?.total || 0);

      const paid = Number(paidMap.get(String(reservation._id)) || 0);

      const balance = total - paid;

      return {
        id: reservation._id,
        bookingNo: reservation.bookingNo,
        room: reservation.roomId?.roomNumber || "-",
        guest: reservation.guest?.name || "-",
        status: reservation.status,
        total,
        paid,
        balance
      };
    })
    .filter((reservation) => reservation.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);

  const occupancyPercentage =
    totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : 0;

  res.json({
    stats: {
      totalRooms,
      availableRooms,
      occupiedRooms,
      reservedRooms,
      cleaningRooms,
      maintenanceRooms,
      blockedRooms,
      todayArrivals,
      todayDepartures,
      todayRevenue,
      monthlyRevenue,
      occupancyPercentage,
      pendingCleanTasks,
      pendingMaintenanceTasks
    },

    arrivals,
    departures,
    unpaidReservations,
    roomsNeedingAttention,
    recentReservations,
    recentPayments
  });
});

module.exports = {
  getDashboardSummary
};