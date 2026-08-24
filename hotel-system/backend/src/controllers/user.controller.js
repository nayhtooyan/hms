const bcrypt = require("bcryptjs");

const User = require("../models/User");

const asyncHandler = require("../utils/asyncHandler");

const allowedRoles = [
  "admin",
  "manager",
  "reception",
  "cleaner",
  "maintenance"
];

const safeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt
  };
};

const getUsers = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.includeInactive !== "true") {
    filter.active = true;
  }

  const users = await User.find(filter)
    .select("name username role active createdAt")
    .sort({
      createdAt: -1
    });

  res.json(users);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({
      message: "name, username and password are required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters"
    });
  }

  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role"
    });
  }

  const existingUser = await User.findOne({
    username: username.toLowerCase()
  });

  if (existingUser) {
    return res.status(400).json({
      message: "Username already exists"
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    passwordHash,
    role: role || "reception",
    active: true
  });

  res.status(201).json(safeUser(user));
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, username, role, active } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  if (name) {
    user.name = name;
  }

  if (username) {
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
      _id: {
        $ne: user._id
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists"
      });
    }

    user.username = username.toLowerCase();
  }

  if (role) {
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    user.role = role;
  }

  if (typeof active === "boolean") {
    user.active = active;
  }

  await user.save();

  res.json(safeUser(user));
});

const setUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters"
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  user.passwordHash = await bcrypt.hash(password, 10);

  await user.save();

  res.json({
    message: "Password updated successfully"
  });
});

const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({
      message: "active must be true or false"
    });
  }

  if (
    String(req.user._id) === String(req.params.id) &&
    active === false
  ) {
    return res.status(400).json({
      message: "You cannot deactivate your own account"
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      active
    },
    {
      new: true
    }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  res.json(safeUser(user));
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  setUserPassword,
  setUserActiveStatus
};