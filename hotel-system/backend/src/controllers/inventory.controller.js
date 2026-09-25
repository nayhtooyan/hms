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
  if (name !== undefined) item.name = String(name).trim();
  if (category !== undefined) item.category = category;
  if (unit !== undefined) item.unit = unit;
  if (price !== undefined) item.price = Number(price || 0);
  if (minStock !== undefined) item.minStock = Number(minStock || 0);

  await item.save();
  emit(req, { action: "item_updated", itemId: item._id });
  res.json(item);
});

/*  DEACTIVATE ITEM  */
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

/*  CREATE MOVEMENT (stock in / out / adjust)  */
const createMovement = asyncHandler(async (req, res) => {
  const { type, qty, reason, note } = req.body;
  const item = await InventoryItem.findById(req.params.id);
  if (!item || !item.active) return res.status(404).json({ message: "Item not found" });

  // role rules
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
    change = q; // adjust = signed correction
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

/*  SEED DEFAULT ITEMS */
const seedDefaults = asyncHandler(async (req, res) => {
  const defaults = [
    ["Bedsheets", "linen"], ["Pillowcases", "linen"], ["Blankets", "linen"],
    ["Towels", "linen"], ["Bath mats", "linen"],
    ["Shampoo", "housekeeping"], ["Soap", "housekeeping"], ["Toilet paper", "housekeeping"],
    ["Tissue", "housekeeping"], ["Cleaning chemicals", "housekeeping"], ["Trash bags", "housekeeping"],
    ["Light bulbs", "maintenance"], ["Batteries", "maintenance"], ["Electrical parts", "maintenance"],
    ["Plumbing parts", "maintenance"], ["Tools/supplies", "maintenance"]
  ];

  let created = 0;
  for (const [name, category] of defaults) {
    const exists = await InventoryItem.findOne({ name, category });
    if (!exists) {
      await InventoryItem.create({ name, category, unit: "pcs", price: 0, stock: 0, minStock: 0 });
      created++;
    }
  }

  emit(req, { action: "seeded" });
  res.json({ created });
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