const Setting = require("../models/Setting");

const asyncHandler = require("../utils/asyncHandler");

const SETTINGS_KEY = "hotel_settings";

const defaultSettings = {
  hotelName: "Hotel Management System",
  language: "en",
  currency: "USD",
  currencySymbol: "$",
  timezone: "Auto",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  taxRate: 0,
  overtimeGraceMinutes: 30,
  invoiceFooter: "Thank you for staying with us.",
  contactEmail: "",
  contactPhone: "",
  address: ""
};

const getSettings = asyncHandler(async (req, res) => {
  let settingsDoc = await Setting.findOne({
    key: SETTINGS_KEY
  });

  if (!settingsDoc) {
    settingsDoc = await Setting.create({
      key: SETTINGS_KEY,
      value: defaultSettings
    });
  }

  res.json({
    ...defaultSettings,
    ...settingsDoc.value
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const allowedFields = Object.keys(defaultSettings);

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (updates.taxRate !== undefined) {
    updates.taxRate = Number(updates.taxRate || 0);
  }

  if (updates.overtimeGraceMinutes !== undefined) {
    updates.overtimeGraceMinutes = Number(
      updates.overtimeGraceMinutes || 0
    );
  }

  let settingsDoc = await Setting.findOne({
    key: SETTINGS_KEY
  });

  if (!settingsDoc) {
    settingsDoc = new Setting({
      key: SETTINGS_KEY,
      value: defaultSettings
    });
  }

  settingsDoc.value = {
    ...defaultSettings,
    ...settingsDoc.value,
    ...updates
  };

  await settingsDoc.save();

  res.json({
    ...defaultSettings,
    ...settingsDoc.value
  });
});

module.exports = {
  getSettings,
  updateSettings
};