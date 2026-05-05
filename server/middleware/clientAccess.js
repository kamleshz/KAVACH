import UserModel from "../models/user.model.js";
import {
  getRoleName,
  isClientRole,
  normalizeObjectId,
} from "../utils/accessControl.js";

const getAuthenticatedUser = async (req) => {
  if (req.authUser) return req.authUser;

  const user = await UserModel.findById(req.userId)
    .populate("role")
    .populate("linkedClient", "clientName tradeName companyGroupName");

  req.authUser = user;
  return user;
};

export const restrictClientScope = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        error: true,
        success: false,
      });
    }

    const roleName = getRoleName(user);
    if (!isClientRole(roleName)) {
      return next();
    }

    const requestClientId =
      req.params?.clientId || req.body?.clientId || req.query?.clientId;
    if (!requestClientId) {
      return res.status(403).json({
        message: "Client account is not authorized for this action.",
        error: true,
        success: false,
      });
    }

    if (
      normalizeObjectId(user.linkedClient) !==
      normalizeObjectId(requestClientId)
    ) {
      return res.status(403).json({
        message:
          "Access denied. You can only access your assigned client data.",
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

export const requireInternalUser = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        error: true,
        success: false,
      });
    }

    if (isClientRole(getRoleName(user))) {
      return res.status(403).json({
        message: "Client users have view-only access.",
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
