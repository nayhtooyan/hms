const User = require("../models/User");

const asyncHandler = require("../utils/asyncHandler");

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({
    active: true
  })
    .select("name username role")
    .sort({
      name: 1
    });

  res.json(users);
});

module.exports = {
  getUsers
};