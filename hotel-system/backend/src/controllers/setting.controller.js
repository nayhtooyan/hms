const fs = require("fs");
const path = require("path");
const Settings = require("../models/Setting");
const asyncHandler = require("../utils/asyncHandler");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json(settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  const allowed = [
    "hotelName", "language", "currency", "currencySymbol", "timezone",
    "checkInTime", "checkOutTime", "taxRate", "overtimeGraceMinutes",
    "invoiceFooter", "contactEmail", "contactPhone", "address"
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  });

  await settings.save();
  res.json(settings);
});

/* ===== UPLOAD LOGO ===== */
const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  // Delete old logo file if exists
  if (settings.logoUrl) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(settings.logoUrl));
    fs.unlink(oldPath, () => {});
  }

  settings.logoUrl = `/uploads/${req.file.filename}`;
  await settings.save();

  res.json(settings);
});

/* ===== REMOVE LOGO ===== */
const removeLogo = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne();
  if (!settings) return res.json({});

  if (settings.logoUrl) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(settings.logoUrl));
    fs.unlink(oldPath, () => {});
    settings.logoUrl = "";
    await settings.save();
  }

  res.json(settings);
});

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  removeLogo
};