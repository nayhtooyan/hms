const router = require("express").Router();

const {
  getUsers
} = require("../controllers/user.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/",
  requirePermission("users.view"),
  getUsers
);

module.exports = router;