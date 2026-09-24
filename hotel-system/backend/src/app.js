const express = require("express");
const cors = require("cors");
const voucherRoutes = require("./routes/voucher.routes");

const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const reservationRoutes = require("./routes/reservation.routes");
const paymentRoutes = require("./routes/payment.routes");
const housekeepingRoutes = require("./routes/housekeeping.routes");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const settingRoutes = require("./routes/setting.routes");
const reportsRoutes = require("./routes/reports.routes");
const backupRoutes = require("./routes/backup.routes");
const auditRoutes = require("./routes/audit.routes");
const autoAudit = require("./middleware/auditMiddleware");
const notificationRoutes = require("./routes/notification.routes");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(autoAudit);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.statusCode || 500).json({
    message: error.message || "Server error"
  });
});

module.exports = app;