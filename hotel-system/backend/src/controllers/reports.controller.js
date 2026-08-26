const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const HousekeepingTask = require("../models/HousekeepingTask");

const asyncHandler = require("../utils/asyncHandler");

const parseDateRange = (req) => {
  const now = new Date();

  let start;
  let end;

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
    return {
      start: end,
      end: start
    };
  }

  return {
    start,
    end
  };
};

const getReportsOverview = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);

  if (!range) {
    return res.status(400).json({
      message: "Invalid date range"
    });
  }

  const { start, end } = range;

  const revenueAggregation = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: {
          $gte: start,
          $lte: end
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

  const totalRevenue = revenueAggregation[0]?.total || 0;

  const revenueByDate = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        },
        total: {
          $sum: "$amount"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        _id: 1
      }
    }
  ]);

  const paymentsByMethod = await Payment.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: "$method",
        total: {
          $sum: "$amount"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        total: -1
      }
    }
  ]);

  const reservationsBySource = await Reservation.aggregate([
    {
      $match: {
        createdAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: "$source",
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]);

  const voucherUsage = await Reservation.aggregate([
    {
      $match: {
        scheduledCheckIn: {
          $gte: start,
          $lte: end
        },
        status: {
          $ne: "cancelled"
        },
        voucherCode: {
          $exists: true,
          $nin: [null, ""]
        }
      }
    },
    {
      $group: {
        _id: "$voucherCode",
        count: {
          $sum: 1
        },
        discount: {
          $sum: "$priceSnapshot.voucherDiscount"
        }
      }
    },
    {
      $sort: {
        discount: -1
      }
    }
  ]);

  const housekeepingSummary = await HousekeepingTask.aggregate([
    {
      $match: {
        createdAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: {
          type: "$type",
          status: "$status"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]);

  const formattedHousekeepingSummary = housekeepingSummary.map((item) => {
    return {
      type: item._id.type,
      status: item._id.status,
      count: item.count
    };
  });

  const [
    totalPaymentsCount,
    totalReservationsCreated,
    totalArrivals,
    totalDepartures,
    totalCancellations
  ] = await Promise.all([
    Payment.countDocuments({
      status: "completed",
      createdAt: {
        $gte: start,
        $lte: end
      }
    }),

    Reservation.countDocuments({
      createdAt: {
        $gte: start,
        $lte: end
      }
    }),

    Reservation.countDocuments({
      scheduledCheckIn: {
        $gte: start,
        $lte: end
      },
      status: {
        $nin: ["cancelled"]
      }
    }),

    Reservation.countDocuments({
      scheduledCheckOut: {
        $gte: start,
        $lte: end
      },
      status: {
        $nin: ["cancelled"]
      }
    }),

    Reservation.countDocuments({
      status: "cancelled",
      cancelledAt: {
        $gte: start,
        $lte: end
      }
    })
  ]);

  const roomStatusAggregation = await Room.aggregate([
    {
      $match: {
        active: true
      }
    },
    {
      $group: {
        _id: "$status",
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]);

  const roomStatus = roomStatusAggregation.map((item) => {
    return {
      status: item._id,
      count: item.count
    };
  });

  const totalRooms = await Room.countDocuments({
    active: true
  });

  const occupiedRooms = await Room.countDocuments({
    active: true,
    status: "occupied"
  });

  const occupancyPercentage =
    totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : 0;

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

  const unpaidAll = activeReservations
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
    .sort((a, b) => b.balance - a.balance);

  const totalUnpaid = unpaidAll.reduce((sum, reservation) => {
    return sum + Number(reservation.balance || 0);
  }, 0);

  const unpaidReservations = unpaidAll.slice(0, 20);

  res.json({
    range: {
      from: start,
      to: end
    },

    stats: {
      totalRevenue,
      totalPaymentsCount,
      totalReservationsCreated,
      totalArrivals,
      totalDepartures,
      totalCancellations,
      totalRooms,
      occupiedRooms,
      occupancyPercentage,
      totalUnpaid
    },

    revenueByDate,
    paymentsByMethod,
    reservationsBySource,
    voucherUsage,
    housekeepingSummary: formattedHousekeepingSummary,
    roomStatus,
    unpaidReservations
  });
});

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

const toCsv = (columns, rows) => {
  const header = columns
    .map((column) => csvEscape(column.label))
    .join(",");

  const lines = rows.map((row) => {
    return columns
      .map((column) => {
        const rawValue =
          typeof column.value === "function"
            ? column.value(row)
            : row[column.key];

        return csvEscape(rawValue);
      })
      .join(",");
  });

  return [header, ...lines].join("\n");
};

const getUnpaidRows = async () => {
  const activeReservations = await Reservation.find({
    status: {
      $in: ["reserved", "checked_in", "checked_out"]
    }
  })
    .select(
      "bookingNo status guest priceSnapshot roomId"
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

  return activeReservations
    .map((reservation) => {
      const total = Number(reservation.priceSnapshot?.total || 0);

      const paid = Number(paidMap.get(String(reservation._id)) || 0);

      const balance = total - paid;

      return {
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
    .sort((a, b) => b.balance - a.balance);
};

const exportReport = asyncHandler(async (req, res) => {
  const range = parseDateRange(req);

  if (!range) {
    return res.status(400).json({
      message: "Invalid date range"
    });
  }

  const { start, end } = range;

  const type = req.params.type;

  let columns = [];
  let rows = [];
  let filename = `${type}-report.csv`;

  if (type === "revenue-by-date") {
    filename = `revenue-by-date-${req.query.from || "all"}-to-${
      req.query.to || "all"
    }.csv`;

    const data = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          total: {
            $sum: "$amount"
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    columns = [
      {
        key: "date",
        label: "Date"
      },
      {
        key: "payments",
        label: "Payments"
      },
      {
        key: "revenue",
        label: "Revenue"
      }
    ];

    rows = data.map((item) => {
      return {
        date: item._id,
        payments: item.count,
        revenue: item.total
      };
    });
  } else if (type === "payments-by-method") {
    filename = `payments-by-method-${req.query.from || "all"}-to-${
      req.query.to || "all"
    }.csv`;

    const data = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: "$method",
          total: {
            $sum: "$amount"
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          total: -1
        }
      }
    ]);

    columns = [
      {
        key: "method",
        label: "Method"
      },
      {
        key: "count",
        label: "Count"
      },
      {
        key: "amount",
        label: "Amount"
      }
    ];

    rows = data.map((item) => {
      return {
        method: item._id || "unknown",
        count: item.count,
        amount: item.total
      };
    });
  } else if (type === "reservations-by-source") {
    filename = `reservations-by-source-${req.query.from || "all"}-to-${
      req.query.to || "all"
    }.csv`;

    const data = await Reservation.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: "$source",
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);

    columns = [
      {
        key: "source",
        label: "Source"
      },
      {
        key: "count",
        label: "Reservations"
      }
    ];

    rows = data.map((item) => {
      return {
        source: item._id || "unknown",
        count: item.count
      };
    });
  } else if (type === "voucher-usage") {
    filename = `voucher-usage-${req.query.from || "all"}-to-${
      req.query.to || "all"
    }.csv`;

    const data = await Reservation.aggregate([
      {
        $match: {
          scheduledCheckIn: {
            $gte: start,
            $lte: end
          },
          status: {
            $ne: "cancelled"
          },
          voucherCode: {
            $exists: true,
            $nin: [null, ""]
          }
        }
      },
      {
        $group: {
          _id: "$voucherCode",
          count: {
            $sum: 1
          },
          discount: {
            $sum: "$priceSnapshot.voucherDiscount"
          }
        }
      },
      {
        $sort: {
          discount: -1
        }
      }
    ]);

    columns = [
      {
        key: "voucherCode",
        label: "Voucher Code"
      },
      {
        key: "bookings",
        label: "Bookings"
      },
      {
        key: "discount",
        label: "Discount"
      }
    ];

    rows = data.map((item) => {
      return {
        voucherCode: item._id,
        bookings: item.count,
        discount: item.discount
      };
    });
  } else if (type === "housekeeping") {
    filename = `housekeeping-${req.query.from || "all"}-to-${
      req.query.to || "all"
    }.csv`;

    const data = await HousekeepingTask.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            type: "$type",
            status: "$status"
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);

    columns = [
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

    rows = data.map((item) => {
      return {
        type: item._id.type,
        status: item._id.status,
        count: item.count
      };
    });
  } else if (type === "room-status") {
    filename = "current-room-status.csv";

    const data = await Room.aggregate([
      {
        $match: {
          active: true
        }
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);

    columns = [
      {
        key: "status",
        label: "Status"
      },
      {
        key: "rooms",
        label: "Rooms"
      }
    ];

    rows = data.map((item) => {
      return {
        status: item._id,
        rooms: item.count
      };
    });
  } else if (type === "unpaid") {
    filename = "unpaid-reservations.csv";

    rows = await getUnpaidRows();

    columns = [
      {
        key: "bookingNo",
        label: "Booking No"
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
        label: "Total"
      },
      {
        key: "paid",
        label: "Paid"
      },
      {
        key: "balance",
        label: "Balance"
      }
    ];
  } else {
    return res.status(400).json({
      message: "Invalid report type"
    });
  }

  const csv = "\uFEFF" + toCsv(columns, rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${filename}`
  );

  res.send(csv);
});

module.exports = {
  getReportsOverview,
  exportReport
};