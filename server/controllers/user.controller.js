import UserModel from "../models/user.model.js";
import LoginActivityModel from "../models/loginActivity.model.js";
import RoleModel from "../models/role.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcryptjs from "bcryptjs";
import { isClientRole, resolveClientLink } from "../utils/accessControl.js";

const getActorAndTargetUsers = async (actorUserId, targetUserId) => {
  const [actor, target] = await Promise.all([
    UserModel.findById(actorUserId).populate("role"),
    UserModel.findById(targetUserId).populate("role"),
  ]);

  return { actor, target };
};

const ensureAdminCanManageUser = ({ actor, target, nextRoleName, action }) => {
  const actorRole = actor?.role?.name;
  const targetRole = target?.role?.name;

  if (!actor || !actorRole) {
    return {
      status: 403,
      body: {
        message: "Access denied. Insufficient privileges.",
        error: true,
        success: false,
      },
    };
  }

  if (actorRole === "SUPER ADMIN") {
    return null;
  }

  if (targetRole === "SUPER ADMIN") {
    return {
      status: 403,
      body: {
        message: `Only SUPER ADMIN can ${action} a SUPER ADMIN user`,
        error: true,
        success: false,
      },
    };
  }

  if (nextRoleName === "SUPER ADMIN") {
    return {
      status: 403,
      body: {
        message: "Only SUPER ADMIN can assign the SUPER ADMIN role",
        error: true,
        success: false,
      },
    };
  }

  return null;
};

export const createUserController = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, status, linkedClientId } =
    req.body;

  if (!firstName || !email || !password || !role) {
    return res.status(400).json({
      message:
        "Please provide all required fields (First Name, Email, Password, Role)",
      error: true,
      success: false,
    });
  }

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: "User already exists with this email",
      error: true,
      success: false,
    });
  }

  const name = `${firstName} ${lastName || ""}`.trim();
  const salt = await bcryptjs.genSalt(10);
  const hashedPassword = await bcryptjs.hash(password, salt);
  const roleDoc = await RoleModel.findById(role);

  if (!roleDoc) {
    return res.status(400).json({
      message: "Selected role does not exist",
      error: true,
      success: false,
    });
  }

  let clientLink = null;
  if (isClientRole(roleDoc.name)) {
    if (!linkedClientId) {
      return res.status(400).json({
        message: "Please select a client for CLIENT login access",
        error: true,
        success: false,
      });
    }

    clientLink = await resolveClientLink(linkedClientId);
    if (!clientLink) {
      return res.status(404).json({
        message: "Selected client was not found",
        error: true,
        success: false,
      });
    }
  }

  const newUser = new UserModel({
    name,
    email,
    password: hashedPassword,
    role,
    userType: isClientRole(roleDoc.name) ? "CLIENT" : "INTERNAL",
    linkedClient: clientLink?.linkedClient || null,
    linkedClientModel: clientLink?.linkedClientModel || null,
    status: status || "Active",
    verify_email: true, // Admin created users are verified by default
  });

  await newUser.save();

  const createdUser = await UserModel.findById(newUser._id)
    .select(
      "-password -refresh_token -forgot_password_otp -forgot_password_expiry",
    )
    .populate("role")
    .populate("linkedClient", "clientName tradeName companyGroupName");

  return res.status(201).json({
    message: "User created successfully",
    error: false,
    success: true,
    data: createdUser,
  });
});

export const getAllUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, skip = 0 } = req.pagination || {};
  const search = String(req.query.search || "").trim();

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const usersQuery = UserModel.find(query)
    .select(
      "-password -refresh_token -forgot_password_otp -forgot_password_expiry",
    )
    .populate("role")
    .populate("linkedClient", "clientName tradeName companyGroupName")
    .sort({ createdAt: -1 });

  usersQuery.skip(skip).limit(limit);

  const [users, total] = await Promise.all([
    usersQuery,
    UserModel.countDocuments(query),
  ]);

  return res.status(200).json({
    message: "Users fetched successfully",
    error: false,
    success: true,
    ...res.paginate({
      data: users,
      total,
    }),
  });
});

export const getAllRolesController = asyncHandler(async (req, res) => {
  const roles = await RoleModel.find();
  return res.status(200).json({
    message: "Roles fetched successfully",
    error: false,
    success: true,
    data: roles,
  });
});

export const getLoginActivityController = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    const logs = await LoginActivityModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LoginActivityModel.countDocuments(query);

    return res.status(200).json({
      message: "Login logs fetched successfully",
      error: false,
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
});

export const unlockUserController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { actor, target } = await getActorAndTargetUsers(req.userId, userId);
  if (!target) {
    return res
      .status(404)
      .json({ message: "User not found", error: true, success: false });
  }

  const permissionError = ensureAdminCanManageUser({
    actor,
    target,
    action: "unlock",
  });
  if (permissionError) {
    return res.status(permissionError.status).json(permissionError.body);
  }

  target.status = "Active";
  target.failedLoginAttempts = 0;
  target.lastFailedLogin = null;
  await target.save();
  return res.status(200).json({
    message: "User unlocked successfully",
    error: false,
    success: true,
  });
});

export const updateUserRoleController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roleId, linkedClientId } = req.body;
  const role = await RoleModel.findById(roleId);
  if (!role) {
    return res
      .status(404)
      .json({ message: "Role not found", error: true, success: false });
  }

  const { actor, target: existingUser } = await getActorAndTargetUsers(
    req.userId,
    userId,
  );
  if (!existingUser) {
    return res
      .status(404)
      .json({ message: "User not found", error: true, success: false });
  }

  const permissionError = ensureAdminCanManageUser({
    actor,
    target: existingUser,
    nextRoleName: role.name,
    action: "change role of",
  });
  if (permissionError) {
    return res.status(permissionError.status).json(permissionError.body);
  }

  const updatePayload = {
    role: roleId,
    userType: isClientRole(role.name) ? "CLIENT" : "INTERNAL",
  };

  if (!isClientRole(role.name)) {
    updatePayload.linkedClient = null;
    updatePayload.linkedClientModel = null;
  }

  if (isClientRole(role.name)) {
    if (!existingUser.linkedClient && !linkedClientId) {
      return res.status(400).json({
        message: "Please provide linkedClientId for CLIENT role",
        error: true,
        success: false,
      });
    }

    if (linkedClientId) {
      const clientLink = await resolveClientLink(linkedClientId);
      if (!clientLink) {
        return res.status(404).json({
          message: "Selected client was not found",
          error: true,
          success: false,
        });
      }
      updatePayload.linkedClient = clientLink.linkedClient;
      updatePayload.linkedClientModel = clientLink.linkedClientModel;
    }
  }

  const user = await UserModel.findByIdAndUpdate(userId, updatePayload, {
    new: true,
  })
    .populate("role")
    .populate("linkedClient", "clientName tradeName companyGroupName");

  if (!user) {
    return res
      .status(404)
      .json({ message: "User not found", error: true, success: false });
  }
  return res.status(200).json({
    message: "User role updated successfully",
    error: false,
    success: true,
    data: user,
  });
});

export const updateUserStatusController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const { actor, target } = await getActorAndTargetUsers(req.userId, userId);

  if (!target) {
    return res
      .status(404)
      .json({ message: "User not found", error: true, success: false });
  }

  const permissionError = ensureAdminCanManageUser({
    actor,
    target,
    action: "change status of",
  });
  if (permissionError) {
    return res.status(permissionError.status).json(permissionError.body);
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { status },
    { new: true },
  );
  if (!user) {
    return res
      .status(404)
      .json({ message: "User not found", error: true, success: false });
  }
  return res.status(200).json({
    message: "User status updated successfully",
    error: false,
    success: true,
  });
});
