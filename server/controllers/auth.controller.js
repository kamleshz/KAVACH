import asyncHandler from '../utils/asyncHandler.js';
import AuthService from '../services/auth.service.js';

export const registerController = asyncHandler(async (req, res) => {
    const result = await AuthService.registerUser(req.body);
    return res.status(201).json({
        message: "Registration successful! Please check your email for verification code.",
        error: false,
        success: true,
        data: result
    });
});

export const verifyEmailController = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    await AuthService.verifyEmail(email, otp);
    return res.status(200).json({
        message: "Email verified successfully! You can now login.",
        error: false,
        success: true
    });
});

export const resendVerifyEmailOtpController = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await AuthService.resendVerifyEmailOtp(email);
    return res.status(200).json({
        message: "Verification OTP resent successfully",
        error: false,
        success: true
    });
});

export const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);
    return res.status(200).json({
        message: "OTP sent to your email",
        error: false,
        success: true,
        data: result
    });
});

export const verifyLoginOtpController = asyncHandler(async (req, res) => {
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
});

export const logoutController = asyncHandler(async (req, res) => {
    const userId = req.userId;
    await AuthService.logoutUser(userId);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json({
        message: "Logout successful",
        error: false,
        success: true
    });
});

export const refreshTokenController = asyncHandler(async (req, res) => {
    const rawHeader = req.headers?.authorization || "";
    const headerToken = rawHeader.startsWith('Bearer ') ? rawHeader.split(' ')[1] : "";
    const token = req.cookies?.refreshToken || headerToken;

    // Optional: catch error to clear cookies if refresh fails?
    // For now, letting global handler handle it. 
    // If the token is invalid, the user receives 401 and should log in again.
    
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
});

export const forgotPasswordController = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await AuthService.forgotPassword(email);

    return res.status(200).json({
        message: "If an account exists for this email, a password reset OTP has been sent.",
        error: false,
        success: true
    });
});

export const verifyForgotPasswordOtpController = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    await AuthService.verifyForgotPasswordOtp(email, otp);

    return res.status(200).json({
        message: "OTP verified successfully. You can now reset your password.",
        error: false,
        success: true
    });
});

export const resetPasswordController = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    await AuthService.resetPassword(email, otp, newPassword);

    return res.status(200).json({
        message: "Password reset successful. You can now login with your new password.",
        error: false,
        success: true
    });
});

export const getUserDetailsController = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const user = await AuthService.getUserDetails(userId);

    return res.status(200).json({
        message: "User details fetched successfully",
        error: false,
        success: true,
        data: user
    });
});