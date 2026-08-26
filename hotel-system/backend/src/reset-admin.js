require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

const resetAdmin = async () => {
  await connectDB();

  let admin = await User.findOne({ username: "admin" });

  if (!admin) {
    console.log("Admin user not found. Creating new admin...");
    const passwordHash = await bcrypt.hash("admin123", 10);
    admin = await User.create({
      name: "Admin User",
      username: "admin",
      passwordHash,
      role: "admin",
      active: true
    });
  } else {
    console.log("Admin user found. Resetting password and activating...");
    admin.passwordHash = await bcrypt.hash("admin123", 10);
    admin.active = true;
    await admin.save();
  }

  console.log("SUCCESS! You can now login with:");
  console.log("Username: admin");
  console.log("Password: admin123");
  
  process.exit(0);
};

resetAdmin().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});