import UserModel from '../models/user.model.js';
import LoginActivityModel from '../models/loginActivity.model.js';
import RoleModel from '../models/role.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import bcryptjs from 'bcryptjs';

export const createUserController = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, role, status } = req.body;

    if (!firstName || !email || !password || !role) {
        return res.status(400).json({
            message: "Please provide all required fields (First Name, Email, Password, Role)",
            error: true,
            success: false
        });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            message: "User already exists with this email",
            error: true,
            success: false
        });
    }

    const name = `${firstName} ${lastName || ''}`.trim();
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = new UserModel({
        name,
        email,
        password: hashedPassword,
        role,
        status: status || 'Active',
        verify_email: true // Admin created users are verified by default
    });

    await newUser.save();

    return res.status(201).json({
        message: "User created successfully",
        error: false,
        success: true,
        data: newUser
    });
});

export const getAllUsersController = asyncHandler(async (req, res) => {
    const users = await UserModel.find().populate('role').sort({ createdAt: -1 });
    return res.status(200).json({
        message: "Users fetched successfully",
        error: false,
        success: true,
        data: users
    });
});

export const getAllRolesController = asyncHandler(async (req, res) => {
    const roles = await RoleModel.find();
    return res.status(200).json({
        message: "Roles fetched successfully",
        error: false,
        success: true,
        data: roles
    });
});

export const getLoginActivityController = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { ipAddress: { $regex: search, $options: 'i' } }
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
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
         return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
});

export const unlockUserController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found", error: true, success: false });
    }
    user.status = 'Active';
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    await user.save();
    return res.status(200).json({ message: "User unlocked successfully", error: false, success: true });
});

export const updateUserRoleController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    const user = await UserModel.findByIdAndUpdate(userId, { role: roleId }, { new: true });
    if (!user) {
        return res.status(404).json({ message: "User not found", error: true, success: false });
    }
    return res.status(200).json({ message: "User role updated successfully", error: false, success: true });
});

export const updateUserStatusController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    const user = await UserModel.findByIdAndUpdate(userId, { status }, { new: true });
    if (!user) {
        return res.status(404).json({ message: "User not found", error: true, success: false });
    }
    return res.status(200).json({ message: "User status updated successfully", error: false, success: true });
});
