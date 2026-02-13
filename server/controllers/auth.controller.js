import asyncHandler from '../utils/asyncHandler.js';
import AuthService from '../services/auth.service.js';
import ApiError from '../utils/ApiError.js';

export const registerController = asyncHandler(async (req, res) => {
    try {
        const result = await AuthService.registerUser(req.body);
        return res.status(201).json({
            message: "Registration successful! Please check your email for verification code.",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Registration failed: " + (error.message || "Unknown error"));
    }
});

export const verifyEmailController = asyncHandler(async (req, res) => {
    try {
        const { email, otp } = req.body;
        await AuthService.verifyEmail(email, otp);
        return res.status(200).json({
            message: "Email verified successfully! You can now login.",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Email verification failed: " + (error.message || "Unknown error"));
    }
});

export const resendVerifyEmailOtpController = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        await AuthService.resendVerifyEmailOtp(email);
        return res.status(200).json({
            message: "Verification OTP resent successfully",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to resend OTP: " + (error.message || "Unknown error"));
    }
});

export const loginController = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.loginUser(email, password);
        return res.status(200).json({
            message: "OTP sent to your email",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        console.error("[Login Error]", error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Login failed: " + (error.message || "Unknown error"));
    }
});

export const verifyLoginOtpController = asyncHandler(async (req, res) => {
    try {
        const { email, otp, photo, location } = req.body;
        
        // Get IP and User Agent from request
        const ipHeader = req.headers['x-forwarded-for'];
        const ipAddress = Array.isArray(ipHeader)
            ? ipHeader[0]
            : (ipHeader || req.ip || '');
        const userAgent = req.headers['user-agent'] || '';

        const { user, accessToken, refreshToken } = await AuthService.verifyLoginOtp({
            email,
            otp,
            photo,
            location,
            ipAddress,
            userAgent
        });

        const cookieOptions = {
            httpOnly: true,
            secure: true, // Always secure for cross-site
            sameSite: 'none', // Allow cross-site cookies
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        res.cookie('accessToken', accessToken, cookieOptions);
        res.cookie('refreshToken', refreshToken, cookieOptions);

        return res.status(200).json({
            message: "Login successful",
            error: false,
            success: true,
            data: {
                user,
                accessToken
            }
        });
    } catch (error) {
        console.error("[Login Verification Error]", error); // Detailed logging
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "OTP verification failed: " + (error.message || "Unknown error"));
    }
});

export const logoutController = asyncHandler(async (req, res) => {
    try {
        const userId = req.userId;
        await AuthService.logoutUser(userId);

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.status(200).json({
            message: "Logout successful",
            error: false,
            success: true
        });
    } catch (error) {
        throw new ApiError(500, "Logout failed: " + (error.message || "Unknown error"));
    }
});

export const refreshTokenController = asyncHandler(async (req, res) => {
    try {
        const rawHeader = req.headers?.authorization || "";
        const headerToken = rawHeader.startsWith('Bearer ') ? rawHeader.split(' ')[1] : "";
        const token = req.cookies?.refreshToken || headerToken;

        const { accessToken, refreshToken } = await AuthService.refreshToken(token);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        res.cookie('accessToken', accessToken, cookieOptions);
        res.cookie('refreshToken', refreshToken, cookieOptions);

        return res.status(200).json({
            message: "Session refreshed",
            error: false,
            success: true,
            data: {
                accessToken
            }
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Token refresh failed: " + (error.message || "Unknown error"));
    }
});

export const forgotPasswordController = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        await AuthService.forgotPassword(email);

        return res.status(200).json({
            message: "If an account exists for this email, a password reset OTP has been sent.",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Forgot password request failed: " + (error.message || "Unknown error"));
    }
});

export const verifyForgotPasswordOtpController = asyncHandler(async (req, res) => {
    try {
        const { email, otp } = req.body;
        await AuthService.verifyForgotPasswordOtp(email, otp);

        return res.status(200).json({
            message: "OTP verified successfully. You can now reset your password.",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "OTP verification failed: " + (error.message || "Unknown error"));
    }
});

export const resetPasswordController = asyncHandler(async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        await AuthService.resetPassword(email, otp, newPassword);

        return res.status(200).json({
            message: "Password reset successful. You can now login with your new password.",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Password reset failed: " + (error.message || "Unknown error"));
    }
});

export const getUserDetailsController = asyncHandler(async (req, res) => {
    try {
        const userId = req.userId;
        const user = await AuthService.getUserDetails(userId);

        return res.status(200).json({
            message: "User details fetched successfully",
            error: false,
            success: true,
            data: user
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to fetch user details: " + (error.message || "Unknown error"));
    }
});
