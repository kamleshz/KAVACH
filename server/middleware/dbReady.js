import mongoose from "mongoose";

export const requireDb = (req, res, next) => {
  try {
    if (req.path === "/health") return next();
    if (mongoose.connection.readyState === 1) return next();

    return res.status(503).json({
      message:
        "Database connection is not ready. Please try again in a moment.",
      error: true,
      success: false,
    });
  } catch (error) {
    return res.status(503).json({
      message: "Database is unavailable.",
      error: true,
      success: false,
    });
  }
};
