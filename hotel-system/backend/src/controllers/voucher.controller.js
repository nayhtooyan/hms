const Voucher = require("../models/Voucher");
const asyncHandler = require("../utils/asyncHandler");

const getVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find().sort({ createdAt: -1 });
  res.json(vouchers);
});

const createVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.create(req.body);
  res.status(201).json(voucher);
});

const deleteVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );
  res.json({ message: "Voucher disabled", voucher });
});

// Endpoint to check if a voucher code is valid and calculate discount
const validateVoucher = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code || subtotal === undefined) {
    return res.status(400).json({ message: "Code and subtotal are required" });
  }

  const voucher = await Voucher.findOne({ code: code.toUpperCase(), active: true });

  if (!voucher) {
    return res.status(404).json({ message: "Invalid or expired voucher code" });
  }

  const now = new Date();
  if (now < voucher.validFrom || now > voucher.validTo) {
    return res.status(400).json({ message: "Voucher is not valid for these dates" });
  }

  if (voucher.usedCount >= voucher.usageLimit) {
    return res.status(400).json({ message: "Voucher usage limit reached" });
  }

  // Calculate discount
  let discount = 0;
  if (voucher.type === "fixed") {
    discount = voucher.value;
  } else if (voucher.type === "percentage") {
    discount = subtotal * (voucher.value / 100);
    if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
      discount = voucher.maxDiscount;
    }
  }

  // Ensure discount doesn't exceed subtotal
  if (discount > subtotal) discount = subtotal;

  res.json({
    valid: true,
    voucherId: voucher._id,
    code: voucher.code,
    type: voucher.type,
    discount: Math.round(discount * 100) / 100 // Round to 2 decimals
  });
});

module.exports = { getVouchers, createVoucher, deleteVoucher, validateVoucher };