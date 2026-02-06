import bcryptjs from 'bcryptjs';
import sharp from 'sharp';
import geoip from 'geoip-lite';
import UserModel from '../models/user.model.js';
import RoleModel from '../models/role.model.js';
import LoginActivityModel from '../models/loginActivity.model.js';
import LoginLogModel from '../models/loginLog.model.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { generateOTP, getOTPExpiry, isOTPExpired } from '../utils/generateOtp.js';
import sendEmail from '../config/sendEmail.js';
import { verifyEmailTemplate, forgotPasswordTemplate, loginOtpTemplate } from '../utils/verifyEmailTemplate.js';

export const registerController = async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please provide all required fields",
                error: true,
                success: false
            });
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered",
                error: true,
                success: false
            });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10);

        const role = await RoleModel.findOne({ name: 'USER' });
        if (!role) {
            throw new Error("Default role not found");
        }

        const user = new UserModel({
            name,
            email,
            password: hashedPassword,
            mobile: mobile || null,
            forgot_password_otp: otp,
            forgot_password_expiry: otpExpiry,
            role: role._id
        });

        await user.save();

        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email - EPR Kavach Audit',
                html: verifyEmailTemplate({ name, otp })
            });
        } catch (emailError) {
            console.log("---------------------------------------------------");
            console.log(`[DEV] Registration OTP for ${email}: ${otp}`);
            console.log("---------------------------------------------------");
        }

        return res.status(201).json({
            message: "Registration successful! Please check your email for verification code.",
            error: false,
            success: true,
            data: {
                userId: user._id,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const verifyEmailController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (user.verify_email) {
            return res.status(400).json({
                message: "Email already verified",
                error: true,
                success: false
            });
        }

        if (user.forgot_password_otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP",
                error: true,
                success: false
            });
        }

        if (isOTPExpired(user.forgot_password_expiry)) {
            return res.status(400).json({
                message: "OTP has expired. Please request a new one.",
                error: true,
                success: false
            });
        }

        user.verify_email = true;
        user.forgot_password_otp = null;
        user.forgot_password_expiry = null;

        // Fix for legacy data
        if (!user.last_login_date) user.last_login_date = null;

        await user.save();

        return res.status(200).json({
            message: "Email verified successfully! You can now login.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const resendVerifyEmailOtpController = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (user.verify_email) {
            return res.status(400).json({
                message: "Email already verified",
                error: true,
                success: false
            });
        }

        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10);

        user.forgot_password_otp = otp;
        user.forgot_password_expiry = otpExpiry;
        await user.save();

        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email - EPR Kavach Audit',
                html: verifyEmailTemplate({ name: user.name, otp })
            });
        } catch (emailError) {
            console.log("---------------------------------------------------");
            console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
            console.log("---------------------------------------------------");
        }

        return res.status(200).json({
            message: "Verification OTP resent successfully",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login attempt:", { email });

        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide email and password",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email }).populate('role');
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (!user.verify_email) {
            return res.status(403).json({
                message: "Please verify your email before logging in",
                error: true,
                success: false
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                message: `Account is ${user.status}. Please contact administrator.`,
                error: true,
                success: false
            });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if (!isPasswordValid) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            user.lastFailedLogin = new Date();

            if (user.failedLoginAttempts >= 3) {
                user.status = 'Suspended';
                await user.save();

                return res.status(403).json({
                    message: "Account locked due to multiple failed login attempts. Kindly contact admin to reactivate your account.",
                    error: true,
                    success: false
                });
            }

            await user.save();

            const remainingAttempts = 3 - user.failedLoginAttempts;

            return res.status(401).json({
                message: remainingAttempts > 0
                    ? `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lock.`
                    : "Invalid credentials",
                error: true,
                success: false
            });
        }

        user.failedLoginAttempts = 0;
        user.lastFailedLogin = null;

        // Generate Login OTP
        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10); // 10 minutes expiry

        user.forgot_password_otp = otp; // Reusing this field for Login OTP as well
        user.forgot_password_expiry = otpExpiry;
        
        // Fix for legacy data: ensure empty date fields are null
        if (!user.last_login_date) user.last_login_date = null;

        try {
            await user.save();
        } catch (saveError) {
            console.error("User save failed:", saveError);
            if (saveError.name === 'ValidationError') {
                const messages = Object.values(saveError.errors).map(val => val.message);
                throw new Error(`Validation Error: ${messages.join(', ')}`);
            }
            throw new Error(`Database save failed: ${saveError.message}`);
        }

        // Send OTP Email
        try {
            await sendEmail({
                to: email,
                subject: 'Login OTP - EPR Kavach Audit',
                html: loginOtpTemplate({ name: user.name, otp })
            });
        } catch (emailError) {
            console.log("---------------------------------------------------");
            console.log(`[DEV] Login OTP for ${email}: ${otp}`);
            console.log("---------------------------------------------------");
        }

        return res.status(200).json({
            message: "OTP sent to your email",
            error: false,
            success: true,
            data: {
                requireOtp: true,
                email: user.email,
                // DEV ONLY: Return OTP in response for easier testing
                otp: process.env.NODE_ENV !== 'production' ? otp : undefined
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const verifyLoginOtpController = async (req, res) => {
    try {
        const { email, otp, photo, location } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email }).populate('role');
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (String(user.forgot_password_otp) !== String(otp)) {
            return res.status(400).json({
                message: "Invalid OTP",
                error: true,
                success: false
            });
        }

        if (isOTPExpired(user.forgot_password_expiry)) {
            return res.status(400).json({
                message: "OTP has expired. Please login again.",
                error: true,
                success: false
            });
        }

        const ipHeader = req.headers['x-forwarded-for'];
        const ipAddress = Array.isArray(ipHeader)
            ? ipHeader[0]
            : (ipHeader || req.ip || '');

        // Store login log with photo if provided
        if (photo) {
            // Check if photo is a valid base64 image and not too small
            if (photo.length < 1000) { 
                 return res.status(400).json({
                    message: "Invalid photo captured. Please try again.",
                    error: true,
                    success: false
                });
            }

            // Check for black screen
            try {
                // Remove data:image/jpeg;base64, prefix if present
                const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
                const imgBuffer = Buffer.from(base64Data, 'base64');
                
                const stats = await sharp(imgBuffer).stats();
                // stats.isOpaque checks alpha, but for black screen we check brightness/channels
                // A completely black image has very low mean values across RGB channels
                const { channels } = stats;
                const isBlack = channels.every(c => c.mean < 10); // Threshold for "blackness" (0-255)

                if (isBlack) {
                    console.warn(`[AUTH] Login blocked: Black screen detected for ${email}`);
                    return res.status(400).json({
                        message: "Photo is too dark or blocked. Please ensure your face is visible.",
                        error: true,
                        success: false
                    });
                }
            } catch (imgError) {
                console.error("Image analysis failed:", imgError);
                // If analysis fails, we might choose to fail open or closed. 
                // For now, let's log it but allow (or fail if critical).
            }

            console.log(`[AUTH] Received login photo for ${email}. Size: ${photo.length} chars`);
            try {
                const logData = {
                    userId: user._id,
                    photo,
                    ipAddress,
                    userAgent: req.headers['user-agent'] || '',
                };

                if (location && location.latitude && location.longitude) {
                    logData.latitude = location.latitude;
                    logData.longitude = location.longitude;
                }

                await LoginLogModel.create(logData);

                // Also update the user record for easy verification
                user.last_login_photo = photo;
                
            } catch (logError) {
                console.error("Failed to save login photo log:", logError);
            }
        } else {
             return res.status(400).json({
                message: "Live photo capture is required for login",
                error: true,
                success: false
            });
        }

        if (location && location.latitude && location.longitude) {
            user.last_login_latitude = location.latitude;
            user.last_login_longitude = location.longitude;
        }
        user.last_login_ip = ipAddress;

        user.forgot_password_otp = null;
        user.forgot_password_expiry = null;

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        const refreshTokenHash = await bcryptjs.hash(refreshToken, 10);

        user.refresh_token = refreshTokenHash;
        user.last_login_date = new Date();
        await user.save();

        try {
            const ipHeader = req.headers['x-forwarded-for'];
            const ipAddress = Array.isArray(ipHeader)
                ? ipHeader[0]
                : (ipHeader || req.ip || '');

            const geo = geoip.lookup(ipAddress);

            await LoginActivityModel.create({
                user: user._id,
                email: user.email,
                name: user.name,
                role: user.role?.name || '',
                ipAddress,
                userAgent: req.headers['user-agent'] || '',
                latitude: location?.latitude,
                longitude: location?.longitude,
                city: geo?.city || '',
                region: geo?.region || '',
                country: geo?.country || ''
            });
        } catch (logError) {
            console.error("Failed to record login activity:", logError);
        }

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
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role
                },
                accessToken
            }
        });

    } catch (error) {
        console.error("Verify Login OTP error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const logoutController = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId);
        if (user) {
            user.refresh_token = "";
            await user.save();
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.status(200).json({
            message: "Logout successful",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const refreshTokenController = async (req, res) => {
    try {
        const rawHeader = req.headers?.authorization || "";
        const headerToken = rawHeader.startsWith('Bearer ') ? rawHeader.split(' ')[1] : "";
        const token = req.cookies?.refreshToken || headerToken;

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                error: true,
                success: false
            });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (err) {
            console.warn("Refresh token verification failed", {
                reason: err.message,
                ip: req.ip,
                path: req.originalUrl
            });

            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            return res.status(401).json({
                message: "Session expired. Please login again.",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(decoded.id).populate('role');

        if (!user || !user.refresh_token) {
            console.warn("Refresh token used for user without stored token", {
                userId: decoded.id,
                ip: req.ip,
                path: req.originalUrl
            });

            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            return res.status(401).json({
                message: "Session invalid. Please login again.",
                error: true,
                success: false
            });
        }

        let isMatch = false;
        const stored = user.refresh_token;

        if (stored.startsWith('$2')) {
            isMatch = await bcryptjs.compare(token, stored);
        } else {
            isMatch = stored === token;
        }

        if (!isMatch) {
            console.warn("Possible refresh token reuse detected", {
                userId: user._id,
                ip: req.ip,
                path: req.originalUrl
            });

            user.refresh_token = "";
            await user.save();

            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            return res.status(401).json({
                message: "Session invalid. Please login again.",
                error: true,
                success: false
            });
        }

        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);
        const newRefreshTokenHash = await bcryptjs.hash(newRefreshToken, 10);

        user.refresh_token = newRefreshTokenHash;
        await user.save();

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        res.cookie('accessToken', newAccessToken, cookieOptions);
        res.cookie('refreshToken', newRefreshToken, cookieOptions);

        return res.status(200).json({
            message: "Session refreshed",
            error: false,
            success: true,
            data: {
                accessToken: newAccessToken
            }
        });
    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
}

export const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email });

        if (user) {
            const otp = generateOTP();
            const otpExpiry = getOTPExpiry(10);

            user.forgot_password_otp = otp;
            user.forgot_password_expiry = otpExpiry;
            await user.save();

            await sendEmail({
                to: email,
                subject: 'Password Reset Request - EPR Kavach Audit',
                html: forgotPasswordTemplate({ name: user.name, otp })
            });
        }

        console.log("Password reset requested", {
            email,
            exists: Boolean(user),
            ip: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });

        return res.status(200).json({
            message: "If an account exists for this email, a password reset OTP has been sent.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const verifyForgotPasswordOtpController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (user.forgot_password_otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP",
                error: true,
                success: false
            });
        }

        if (isOTPExpired(user.forgot_password_expiry)) {
            return res.status(400).json({
                message: "OTP has expired. Please request a new one.",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "OTP verified successfully. You can now reset your password.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const resetPasswordController = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "Email, OTP and new password are required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or OTP",
                error: true,
                success: false
            });
        }

        if (user.forgot_password_otp !== otp) {
            console.warn("Password reset invalid OTP", {
                email,
                ip: req.ip
            });
            return res.status(400).json({
                message: "Invalid email or OTP",
                error: true,
                success: false
            });
        }

        if (isOTPExpired(user.forgot_password_expiry)) {
            console.warn("Password reset expired OTP", {
                email,
                ip: req.ip
            });
            return res.status(400).json({
                message: "OTP has expired. Please request a new one.",
                error: true,
                success: false
            });
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        user.password = hashedPassword;
        user.forgot_password_otp = null;
        user.forgot_password_expiry = null;
        
        // Fix for legacy data
        if (!user.last_login_date) user.last_login_date = null;

        await user.save();

        console.log("Password reset successful", {
            email,
            ip: req.ip
        });

        return res.status(200).json({
            message: "Password reset successful. You can now login with your new password.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getUserDetailsController = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId).select('-password -refresh_token -forgot_password_otp -forgot_password_expiry').populate('role');

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "User details fetched successfully",
            error: false,
            success: true,
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};
