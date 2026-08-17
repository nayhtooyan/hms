const express = require("express");
const cors = require("cors");
const voucherRoutes = require("./routes/voucher.routes");

const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const reservationRoutes = require("./routes/reservation.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/vouchers", voucherRoutes);

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