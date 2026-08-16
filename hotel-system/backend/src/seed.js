require("dotenv").config();

const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const User = require("./models/User");
const Room = require("./models/Room");

const seed = async () => {
  await connectDB();

  await User.deleteMany({});
  await Room.deleteMany({});

  const passwordHash = await bcrypt.hash("admin123", 10);

  await User.create({
    name: "Admin User",
    username: "admin",
    passwordHash,
    role: "admin"
  });

  await Room.create([
    {
      roomNumber: "101",
      floor: 1,
      roomType: "Standard",
      basePrice: 100,
      extraBedPrice: 20,
      overtimeHourlyRate: 10,
      status: "available"
    },
    {
      roomNumber: "102",
      floor: 1,
      roomType: "Standard",
      basePrice: 100,
      extraBedPrice: 20,
      overtimeHourlyRate: 10,
      status: "available"
    },
    {
      roomNumber: "201",
      floor: 2,
      roomType: "Deluxe",
      basePrice: 180,
      extraBedPrice: 30,
      overtimeHourlyRate: 15,
      status: "available"
    }
  ]);

  console.log("Seed completed");
  console.log("Admin login: admin / admin123");

  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});