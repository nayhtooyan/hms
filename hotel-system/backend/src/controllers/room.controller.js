const { emitEvent } = require("../utils/socketEmit");
const Room = require("../models/Room");
const asyncHandler = require("../utils/asyncHandler");

const { logAudit } = require("../utils/auditLogger");


const getRooms = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.active === "true") {
    filter.active = true;
  }

  const rooms = await Room.find(filter).sort({
    roomNumber: 1
  });

  res.json(rooms);
});

//Create Room
const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create({
    ...req.body,
    active: true
  });

  await logAudit(req, "CREATE", "Room", room._id, null, room.toObject());

  emitEvent(req, "rooms:updated", { action: "created", roomId: room._id });
  res.status(201).json(room);
});

//Update Room
const updateRoom = asyncHandler(async (req, res) => {
  const oldRoom = await Room.findById(req.params.id);

  if (!oldRoom) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  await logAudit(req, "UPDATE", "Room", room._id, oldRoom.toObject(), room.toObject());

  emitEvent(req, "rooms:updated", { action: "updated", roomId: room._id });
  res.json(room);
});

//Update Room Status
const updateRoomStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const oldRoom = await Room.findById(req.params.id);

  if (!oldRoom) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    {
      status
    },
    {
      new: true
    }
  );

  if (!room) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  await logAudit(req, "UPDATE_STATUS", "Room", room._id, oldRoom.toObject(), room.toObject());

  emitEvent(req, "rooms:updated", { action: "status_changed", roomId: room._id, status: room.status });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.json(room);
});

//Delete Rooom
const deleteRoom = asyncHandler(async (req, res) => {
  const oldRoom = await Room.findById(req.params.id);

  if (!oldRoom) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    {
      active: false,
      deletedAt: new Date(),
      status: "blocked"
    },
    {
      new: true
    }
  );

  if (!room) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  await logAudit(req, "DELETE", "Room", room._id, oldRoom.toObject(), room.toObject());

  emitEvent(req, "rooms:updated", { action: "deleted", roomId: room._id });
  res.json({
    message: "Room disabled"
  });
});

module.exports = {
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom
};