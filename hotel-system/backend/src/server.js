require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Create Socket.IO server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  // Store io on app so controllers can access it
  app.set("io", io);

  io.on("connection", (socket) => {
    console.log(`[Socket] Device connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[Socket] Device disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`[Socket] WebSocket server ready`);
  });
};

start();