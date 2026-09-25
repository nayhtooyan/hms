const router = require("express").Router();

const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getMovements,
  createMovement,
  seedDefaults
} = require("../controllers/inventory.controller");

const { authenticate } = require("../middleware/auth");

const MANAGE_ROLES = ["admin", "manager"];

const canManage = (req, res, next) => {
  if (MANAGE_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ message: "Not authorized" });
};

router.use(authenticate);

router.get("/", getItems);
router.post("/", canManage, createItem);
router.post("/seed", canManage, seedDefaults);
router.put("/:id", canManage, updateItem);
router.delete("/:id", canManage, deleteItem);
router.get("/:id/movements", getMovements);
router.post("/:id/movement", createMovement);

module.exports = router;