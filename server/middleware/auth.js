import { verifyAccessToken } from "../utils/generateToken.js";
import logger from "../utils/logger.js";

export const auth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];

    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      req.log?.debug?.("[Auth Middleware] Authenticating request");
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
        error: true,
        success: false,
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token structure",
        error: true,
        success: false,
      });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    (req.log || logger).warn(
      { error: error.message },
      "[Auth Middleware Error]",
    );
    return res.status(401).json({
      message: error.message || "Invalid authentication token",
      error: true,
      success: false,
    });
  }
};

export const admin = async (req, res, next) => {
  return requireRoles("ADMIN", "SUPER ADMIN")(req, res, next);
};

export const requireRoles =
  (...allowedRoles) =>
  async (req, res, next) => {
    try {
      const User = (await import("../models/user.model.js")).default;
      await import("../models/role.model.js");

      const user = await User.findById(req.userId).populate("role");
      const roleName = user?.role?.name;

      if (!user || !roleName || !allowedRoles.includes(roleName)) {
        (req.log || logger).warn(
          {
            userId: req.userId,
            path: req.originalUrl,
            method: req.method,
          },
          "Permission denied for non-admin user",
        );
        return res.status(403).json({
          message: "Access denied. Insufficient privileges.",
          error: true,
          success: false,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Authorization error",
        error: true,
        success: false,
      });
    }
  };
