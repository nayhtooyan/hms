const fs = require("fs/promises");
const path = require("path");

const User = require("../models/User");
const Room = require("../models/Room");
const Reservation = require("../models/Reservation");
const Payment = require("../models/Payment");
const Voucher = require("../models/Voucher");
const HousekeepingTask = require("../models/HousekeepingTask");
const Setting = require("../models/Setting");

const asyncHandler = require("../utils/asyncHandler");

const BACKUP_DIR = path.join(__dirname, "../../backups");

const collectionMap = {
  users: User,
  rooms: Room,
  reservations: Reservation,
  payments: Payment,
  vouchers: Voucher,
  housekeepingTasks: HousekeepingTask,
  settings: Setting
};

const ensureBackupDir = async () => {
  await fs.mkdir(BACKUP_DIR, {
    recursive: true
  });
};

const generateBackupFilename = (prefix = "backup") => {
  const now = new Date();

  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-");

  return `${prefix}-${timestamp}.json`;
};

const createBackupData = async () => {
  const data = {};

  const meta = {
    createdAt: new Date(),
    collections: {}
  };

  for (const [key, Model] of Object.entries(collectionMap)) {
    const documents = await Model.find().lean();

    data[key] = documents;

    meta.collections[key] = documents.length;
  }

  return {
    meta,
    data
  };
};

const writeBackupFile = async (filename, backupData) => {
  await ensureBackupDir();

  const filePath = path.join(BACKUP_DIR, filename);

  await fs.writeFile(
    filePath,
    JSON.stringify(backupData, null, 2),
    "utf8"
  );

  return filePath;
};

const createBackup = asyncHandler(async (req, res) => {
  const backupData = await createBackupData();

  const filename = generateBackupFilename("backup");

  await writeBackupFile(filename, backupData);

  res.status(201).json({
    message: "Backup created successfully",
    filename,
    collections: backupData.meta.collections
  });
});

const listBackups = asyncHandler(async (req, res) => {
  await ensureBackupDir();

  const files = await fs.readdir(BACKUP_DIR);

  const backups = [];

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(BACKUP_DIR, file);

    const stat = await fs.stat(filePath);

    backups.push({
      filename: file,
      size: stat.size,
      createdAt: stat.mtime
    });
  }

  backups.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(backups);
});

const downloadBackup = asyncHandler(async (req, res) => {
  const safeFilename = path.basename(req.params.filename);

  if (!safeFilename.endsWith(".json")) {
    return res.status(400).json({
      message: "Invalid backup file"
    });
  }

  const filePath = path.join(BACKUP_DIR, safeFilename);

  try {
    await fs.access(filePath);
  } catch (error) {
    return res.status(404).json({
      message: "Backup file not found"
    });
  }

  res.download(filePath);
});

const deleteBackup = asyncHandler(async (req, res) => {
  const safeFilename = path.basename(req.params.filename);

  if (!safeFilename.endsWith(".json")) {
    return res.status(400).json({
      message: "Invalid backup file"
    });
  }

  const filePath = path.join(BACKUP_DIR, safeFilename);

  try {
    await fs.access(filePath);
  } catch (error) {
    return res.status(404).json({
      message: "Backup file not found"
    });
  }

  await fs.unlink(filePath);

  res.json({
    message: "Backup deleted successfully"
  });
});

const restoreBackup = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Backup file is required"
    });
  }

  if (req.body.confirm !== "YES") {
    return res.status(400).json({
      message: "Restore confirmation required"
    });
  }

  let backupData;

  try {
    backupData = JSON.parse(req.file.buffer.toString("utf8"));
  } catch (error) {
    return res.status(400).json({
      message: "Invalid JSON backup file"
    });
  }

  if (!backupData.data) {
    return res.status(400).json({
      message: "Invalid backup format"
    });
  }

  const safetyBackupData = await createBackupData();

  const safetyFilename = generateBackupFilename("pre-restore-backup");

  await writeBackupFile(safetyFilename, safetyBackupData);

  const restoreSummary = {};

  for (const [key, Model] of Object.entries(collectionMap)) {
    const documents = backupData.data[key];

    if (!Array.isArray(documents)) {
      restoreSummary[key] = 0;
      continue;
    }

    await Model.deleteMany({});

    if (documents.length > 0) {
      await Model.insertMany(documents, {
        ordered: false
      });
    }

    restoreSummary[key] = documents.length;
  }

  res.json({
    message: "Restore completed successfully",
    safetyBackup: safetyFilename,
    restoreSummary
  });
});

module.exports = {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  restoreBackup
};