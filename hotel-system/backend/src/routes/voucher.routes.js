const router = require("express").Router();
const { getVouchers, createVoucher, deleteVoucher, validateVoucher } = require("../controllers/voucher.controller");
const { authenticate, requirePermission } = require("../middleware/auth");

router.use(authenticate);

router.post("/validate", requirePermission("vouchers.validate"), validateVoucher);
router.get("/", requirePermission("vouchers.view"), getVouchers);
router.post("/", requirePermission("vouchers.create"), createVoucher);
router.delete("/:id", requirePermission("vouchers.delete"), deleteVoucher);

module.exports = router;