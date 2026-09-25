const InventoryItem = require("../models/InventoryItem");
const InventoryMovement = require("../models/InventoryMovement");
const asyncHandler = require("../utils/asyncHandler");

const MANAGE_ROLES = ["admin", "manager"];
const OUT_ROLES = ["admin", "manager", "cleaner", "maintenance"];

const emit = (req, payload) => {
  try {
    const io = req.app.get("io");
    if (io) io.emit("inventory:updated", payload);
  } catch (e) { /* silent */ }
};

/*  LIST ITEMS  */
const getItems = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ active: true })
    .sort({ category: 1, name: 1 })
    .lean();
  res.json(items);
});

/*  CREATE ITEM  */
const createItem = asyncHandler(async (req, res) => {
  const { name, category, unit, price, minStock, openingStock } = req.body;
  if (!name || !category) {
    return res.status(400).json({ message: "Name and category are required" });
  }

  const exists = await InventoryItem.findOne({
    name: new RegExp(`^${String(name).trim()}$`, "i"),
    active: true
  });
  if (exists) return res.status(400).json({ message: "Item already exists" });

  const open = Number(openingStock || 0);
  const item = await InventoryItem.create({
    name: String(name).trim(),
    nameKey: null,
    category,
    unit: unit || "pcs",
    price: Number(price || 0),
    minStock: Number(minStock || 0),
    stock: open
  });

  if (open !== 0) {
    await InventoryMovement.create({
      itemId: item._id,
      type: "in",
      qty: Math.abs(open),
      change: open,
      balanceAfter: open,
      reason: "opening_balance",
      note: "",
      unitPrice: item.price,
      performedBy: req.user._id,
      performedByName: req.user.name
    });
  }

  emit(req, { action: "item_created", itemId: item._id });
  res.status(201).json(item);
});

/*  UPDATE ITEM  */
const updateItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });

  const { name, category, unit, price, minStock } = req.body;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed !== item.name) {
      item.name = trimmed;
      item.nameKey = null; // renamed → switch to custom name
    }
  }
  if (category !== undefined) item.category = category;
  if (unit !== undefined) item.unit = unit;
  if (price !== undefined) item.price = Number(price || 0);
  if (minStock !== undefined) item.minStock = Number(minStock || 0);

  await item.save();
  emit(req, { action: "item_updated", itemId: item._id });
  res.json(item);
});

/*  DELETE (soft) ITEM  */
const deleteItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  item.active = false;
  await item.save();
  emit(req, { action: "item_deleted", itemId: item._id });
  res.json(item);
});

/*  MOVEMENT LEDGER  */
const getMovements = asyncHandler(async (req, res) => {
  const movements = await InventoryMovement.find({ itemId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  res.json(movements);
});

/*  CREATE MOVEMENT  */
const createMovement = asyncHandler(async (req, res) => {
  const { type, qty, reason, note } = req.body;
  const item = await InventoryItem.findById(req.params.id);
  if (!item || !item.active) return res.status(404).json({ message: "Item not found" });

  if (type === "out" && !OUT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  if ((type === "in" || type === "adjust") && !MANAGE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const q = Number(qty);
  if (isNaN(q) || q === 0) return res.status(400).json({ message: "Valid quantity is required" });

  let change;
  if (type === "in") {
    if (q <= 0) return res.status(400).json({ message: "Quantity must be positive" });
    change = q;
  } else if (type === "out") {
    if (q <= 0) return res.status(400).json({ message: "Quantity must be positive" });
    change = -q;
  } else {
    change = q;
  }

  const newStock = item.stock + change;
  if (newStock < 0) {
    return res.status(400).json({ message: "Not enough stock" });
  }

  item.stock = newStock;
  await item.save();

  const movement = await InventoryMovement.create({
    itemId: item._id,
    type,
    qty: Math.abs(q),
    change,
    balanceAfter: newStock,
    reason: reason || "other",
    note: note || "",
    unitPrice: item.price,
    performedBy: req.user._id,
    performedByName: req.user.name
  });

  emit(req, { action: "movement", itemId: item._id, type });
  res.status(201).json(movement);
});

/*  SEED 40 DEFAULT ITEMS */
const DEFAULT_ITEMS = [
  // Linen
  ["item_bedsheets", "Bedsheets", "linen", "pcs"],
  ["item_pillowcases", "Pillowcases", "linen", "pcs"],
  ["item_duvet_covers", "Duvet Covers", "linen", "pcs"],
  ["item_mattress_protectors", "Mattress Protectors", "linen", "pcs"],
  ["item_blankets", "Blankets", "linen", "pcs"],
  ["item_towels", "Towels", "linen", "pcs"],
  ["item_bath_mats", "Bath Mats", "linen", "pcs"],
  ["item_laundry_bags", "Laundry Bags", "linen", "bag"],
  // Housekeeping
  ["item_shampoo", "Shampoo", "housekeeping", "bottle"],
  ["item_conditioner", "Conditioner", "housekeeping", "bottle"],
  ["item_body_soap", "Body Soap", "housekeeping", "pcs"],
  ["item_hand_soap", "Hand Soap", "housekeeping", "bottle"],
  ["item_toilet_paper", "Toilet Paper", "housekeeping", "roll"],
  ["item_facial_tissue", "Facial Tissue", "housekeeping", "box"],
  ["item_cleaning_chemicals", "Cleaning Chemicals", "housekeeping", "bottle"],
  ["item_floor_cleaner", "Floor Cleaner", "housekeeping", "bottle"],
  ["item_glass_cleaner", "Glass Cleaner", "housekeeping", "bottle"],
  ["item_air_freshener", "Air Freshener", "housekeeping", "can"],
  ["item_trash_bags", "Trash Bags", "housekeeping", "pack"],
  ["item_sponges_cloths", "Sponges & Cloths", "housekeeping", "pcs"],
  ["item_rubber_gloves", "Rubber Gloves", "housekeeping", "pair"],
  ["item_toothbrush_kits", "Toothbrush Kits", "housekeeping", "set"],
  ["item_slippers", "Slippers", "housekeeping", "pair"],
  ["item_shower_caps", "Shower Caps", "housekeeping", "pcs"],
  ["item_cotton_buds", "Cotton Buds", "housekeeping", "pack"],
  ["item_sewing_kits", "Sewing Kits", "housekeeping", "set"],
  ["item_coffee_tea", "Coffee & Tea", "housekeeping", "pack"],
  ["item_water_bottles", "Water Bottles", "housekeeping", "case"],
  // Maintenance
  ["item_light_bulbs", "Light Bulbs", "maintenance", "pcs"],
  ["item_batteries", "Batteries", "maintenance", "pcs"],
  ["item_wires_cables", "Wires & Cables", "maintenance", "pcs"],
  ["item_switches_sockets", "Switches & Sockets", "maintenance", "pcs"],
  ["item_plumbing_parts", "Plumbing Parts", "maintenance", "pcs"],
  ["item_faucets_taps", "Faucets & Taps", "maintenance", "pcs"],
  ["item_washers_seals", "Washers & Seals", "maintenance", "pack"],
  ["item_tools_supplies", "Tools & Supplies", "maintenance", "set"],
  ["item_screws_nails", "Screws & Nails", "maintenance", "box"],
  ["item_adhesive_tape", "Adhesive Tape", "maintenance", "roll"],
  ["item_lubricant", "Lubricant", "maintenance", "can"],
  ["item_fuses", "Fuses", "maintenance", "pcs"]
];

const seedDefaults = asyncHandler(async (req, res) => {
  let created = 0;
  let restored = 0;
  let upgraded = 0;

  for (const [key, name, category, unit] of DEFAULT_ITEMS) {
    const exists = await InventoryItem.findOne({ name, category });

    if (exists) {
      let changed = false;

      if (!exists.active) {
        exists.active = true;
        exists.unit = unit;
        changed = true;
        restored++;
      }

      if (exists.nameKey !== key) {
        exists.nameKey = key;
        changed = true;
        upgraded++;
      }

      if (changed) await exists.save();
      continue;
    }

    await InventoryItem.create({ name, nameKey: key, category, unit, price: 0, stock: 0, minStock: 0 });
    created++;
  }

  emit(req, { action: "seeded" });
  res.json({ created, restored, upgraded });
});

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getMovements,
  createMovement,
  seedDefaults
};