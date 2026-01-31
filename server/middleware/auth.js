import { verifyAccessToken } from "../utils/generateToken.js";

export const auth = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                error: true,
                success: false
            });
        }

        const decoded = verifyAccessToken(token);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({
            message: error.message || "Invalid authentication token",
            error: true,
            success: false
        });
    }
};

export const admin = async (req, res, next) => {
    try {
        const User = (await import('../models/user.model.js')).default;
        // Need to ensure Role model is registered for populate to work
        await import('../models/role.model.js');
        
        const user = await User.findById(req.userId).populate('role');

        if (!user || !user.role || user.role.name !== 'ADMIN') {
            console.warn("Permission denied for non-admin user", {
                userId: req.userId,
                path: req.originalUrl,
                method: req.method
            });
            return res.status(403).json({
                message: "Access denied. Admin privileges required.",
                error: true,
                success: false
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Authorization error",
            error: true,
            success: false
        });
    }
};
