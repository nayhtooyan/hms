const emitEvent = (req, event, data = {}) => {
  try {
    const io = req.app.get("io");
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        user: req.user?.name || "System",
      });
      console.log(`[Socket Emit] ${event}`, data.action || "");
    } else {
      console.warn("[Socket Emit] io not found on app");
    }
  } catch (error) {
    console.error("[Socket Emit] Error:", error);
  }
};

module.exports = { emitEvent };