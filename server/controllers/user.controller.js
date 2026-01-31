import UserModel from '../models/user.model.js';
import LoginActivityModel from '../models/loginActivity.model.js';
import RoleModel from '../models/role.model.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getAllRolesController = asyncHandler(async (req, res) => {
    const roles = await RoleModel.find({}).sort({ name: 1 });
    return res.status(200).json({
        message: "Roles fetched successfully",
        error: false,
        success: true,
        data: roles
    });
});

export const getAllUsersController = asyncHandler(async (req, res) => {
    const users = await UserModel.find({})
        .select('name email role status verify_email last_login_date failedLoginAttempts last_login_photo last_login_ip last_login_latitude last_login_longitude')
        .populate('role', 'name')
        .sort({ name: 1 });

    return res.status(200).json({
        message: "Users fetched successfully",
        error: false,
        success: true,
        data: users
    });
});

export const getLoginActivityController = asyncHandler(async (req, res) => {
    const { userId, limit } = req.query;

    const query = {};
    if (userId) {
        query.user = userId;
    }

    const parsedLimit = Number(limit);
    const effectiveLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? 50
        : Math.min(parsedLimit, 500);

    const logs = await LoginActivityModel.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(effectiveLimit);

    return res.status(200).json({
        message: "Login activity fetched successfully",
        error: false,
        success: true,
        data: logs
    });
});

export const updateUserRoleController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;

    const user = await UserModel.findByIdAndUpdate(
        userId, 
        { role: roleId }, 
        { new: true }
    ).populate('role', 'name');

    if (!user) {
        return res.status(404).json({
            message: "User not found",
            error: true,
            success: false
        });
    }

    return res.status(200).json({
        message: "User role updated successfully",
        error: false,
        success: true,
        data: user
    });
});

export const unlockUserController = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await UserModel.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: "User not found",
            error: true,
            success: false
        });
    }

    if (user.status === 'Active') {
        return res.status(400).json({
            message: "User account is already active",
            error: true,
            success: false
        });
    }

    user.status = 'Active';
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;

    await user.save();

    return res.status(200).json({
        message: "User account activated successfully",
        error: false,
        success: true,
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status
        }
    });
});
