const router = require("express").Router();

const {
  getUsers,
  createUser,
  updateUser,
  setUserPassword,
  setUserActiveStatus
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

router.post(
  "/",
  requirePermission("users.manage"),
  createUser
);

router.patch(
  "/:id",
  requirePermission("users.manage"),
  updateUser
);

router.patch(
  "/:id/password",
  requirePermission("users.manage"),
  setUserPassword
);

router.patch(
  "/:id/active",
  requirePermission("users.manage"),
  setUserActiveStatus
);

module.exports = router;