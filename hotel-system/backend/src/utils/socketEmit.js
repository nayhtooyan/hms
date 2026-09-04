const emitEvent = (req, event, data = {}) => {
  try {
    const io = req.app.get("io");
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        user: req.user?.name || "System",
      });
    }
  } catch (error) {
    console.error("Socket emit error:", error);
  }
};

module.exports = { emitEvent };