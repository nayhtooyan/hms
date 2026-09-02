const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    username: username?.toLowerCase()
  });

  if (!user || !user.active) {
    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  const passwordOk = await bcrypt.compare(password || "", user.passwordHash);

  if (!passwordOk) {
    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  const token = jwt.sign(
    {
      sub: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "12h"
    }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = {
  login,
  me
};

