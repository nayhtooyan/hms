const { emitEvent } = require("../utils/socketEmit");
const HousekeepingTask = require("../models/HousekeepingTask");
const Room = require("../models/Room");

const asyncHandler = require("../utils/asyncHandler");

const populateTask = (task) => {
  return task.populate([
    {
      path: "roomId",
      select: "roomNumber floor status roomType"
    },
    {
      path: "assignedTo",
      select: "name username role"
    },
    {
      path: "createdBy",
      select: "name username"
    }
  ]);
};

const getBoard = asyncHandler(async (req, res) => {
  const rooms = await Room.find({
    active: true
  }).sort({
    floor: 1,
    roomNumber: 1
  });

  const tasks = await HousekeepingTask.find({
    status: {
      $in: ["pending", "in_progress"]
    }
  })
    .populate("roomId", "roomNumber floor status")
    .populate("assignedTo", "name username")
    .sort({
      createdAt: -1
    });

  res.json({
    rooms,
    tasks
  });
});

const getTasks = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.roomId) {
    filter.roomId = req.query.roomId;
  }

  if (req.query.type) {
    filter.type = req.query.type;
  }

  const tasks = await HousekeepingTask.find(filter)
    .populate("roomId", "roomNumber floor status roomType")
    .populate("assignedTo", "name username role")
    .populate("createdBy", "name username")
    .sort({
      createdAt: -1
    });

  res.json(tasks);
});

//Create Task
const createTask = asyncHandler(async (req, res) => {
  const { roomId, type, priority, assignedTo, notes } = req.body;

  if (!roomId) {
    return res.status(400).json({
      message: "roomId is required"
    });
  }

  const room = await Room.findOne({
    _id: roomId,
    active: true
  });

  if (!room) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  const task = await HousekeepingTask.create({
    roomId,
    type,
    priority,
    assignedTo: assignedTo || undefined,
    notes,
    status: "pending",
    createdBy: req.user._id
  });

  if (room.status === "available") {
    if (type === "cleaning") {
      room.status = "cleaning";
    }

    if (type === "maintenance") {
      room.status = "maintenance";
    }

    await room.save();
  }

  const populated = await populateTask(task);

  emitEvent(req, "housekeeping:updated", { action: "created" });
  res.status(201).json(populated);
});

//Start Task
const startTask = asyncHandler(async (req, res) => {
  const task = await HousekeepingTask.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (task.status === "completed" || task.status === "cancelled") {
    return res.status(400).json({
      message: "Task is already closed"
    });
  }

  task.status = "in_progress";

  await task.save();

  const populated = await populateTask(task);

  emitEvent(req, "housekeeping:updated", { action: "started" });
  res.json(populated);
});

//Complete Task
const completeTask = asyncHandler(async (req, res) => {
  const task = await HousekeepingTask.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (task.status === "completed") {
    return res.status(400).json({
      message: "Task is already completed"
    });
  }

  if (task.status === "cancelled") {
    return res.status(400).json({
      message: "Cannot complete a cancelled task"
    });
  }

  task.status = "completed";
  task.completedAt = new Date();

  await task.save();

  const activeTaskCount = await HousekeepingTask.countDocuments({
    roomId: task.roomId,
    _id: {
      $ne: task._id
    },
    status: {
      $in: ["pending", "in_progress"]
    }
  });

  const room = await Room.findById(task.roomId);

  if (
    room &&
    activeTaskCount === 0 &&
    ["cleaning", "maintenance"].includes(room.status)
  ) {
    room.status = "available";
    await room.save();
  }

  const populated = await populateTask(task);

  emitEvent(req, "housekeeping:updated", { action: "completed" });
  emitEvent(req, "rooms:updated", { action: "status_changed" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.json(populated);
});

//Cancel Task
const cancelTask = asyncHandler(async (req, res) => {
  const task = await HousekeepingTask.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (task.status === "completed") {
    return res.status(400).json({
      message: "Cannot cancel a completed task"
    });
  }

  if (task.status === "cancelled") {
    return res.status(400).json({
      message: "Task is already cancelled"
    });
  }

  task.status = "cancelled";

  await task.save();

  const activeTaskCount = await HousekeepingTask.countDocuments({
    roomId: task.roomId,
    _id: {
      $ne: task._id
    },
    status: {
      $in: ["pending", "in_progress"]
    }
  });

  const room = await Room.findById(task.roomId);

  if (
    room &&
    activeTaskCount === 0 &&
    ["cleaning", "maintenance"].includes(room.status)
  ) {
    room.status = "available";
    await room.save();
  }

  const populated = await populateTask(task);

  emitEvent(req, "housekeeping:updated", { action: "cancelled" });
  res.json(populated);
});

const updateRoomStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const allowedStatuses = [
    "available",
    "cleaning",
    "maintenance",
    "blocked"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid room status"
    });
  }

  const room = await Room.findOne({
    _id: req.params.roomId,
    active: true
  });

  if (!room) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  if (room.status === "occupied") {
    return res.status(400).json({
      message: "Occupied room status must be changed through check-out"
    });
  }

  room.status = status;

  await room.save();

  res.json(room);
  emitEvent(req, "rooms:updated", { action: "status_changed" });
});

module.exports = {
  getBoard,
  getTasks,
  createTask,
  startTask,
  completeTask,
  cancelTask,
  updateRoomStatus
};