import bcryptjs from "bcryptjs";
import sharp from "sharp";
import geoip from "geoip-lite";
import UserModel from "../models/user.model.js";
import RoleModel from "../models/role.model.js";
import LoginActivityModel from "../models/loginActivity.model.js";
import LoginLogModel from "../models/loginLog.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/generateToken.js";
import {
  generateOTP,
  getOTPExpiry,
  isOTPExpired,
} from "../utils/generateOtp.js";
import sendEmail from "../config/sendEmail.js";
import {
  verifyEmailTemplate,
  forgotPasswordTemplate,
  loginOtpTemplate,
} from "../utils/verifyEmailTemplate.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";
import UploadService from "./upload.service.js";
import logger from "../utils/logger.js";

const shouldLogDevOtpFallback = process.env.NODE_ENV !== "production";

const logOtpFallback = (label, email, otp, error) => {
  logger.warn(
    {
      email,
      err: error,
    },
    `${label} email delivery failed`,
  );

  if (!shouldLogDevOtpFallback) return;

  logger.warn("---------------------------------------------------");
  logger.warn(`[DEV] ${label} OTP for ${email}: ${otp}`);
  logger.warn("---------------------------------------------------");
};

class AuthService {
  static ensureDbReady() {
    if (mongoose.connection.readyState !== 1) {
      throw new ApiError(
        503,
        "Database connection is not ready. Please try again.",
      );
    }
  }

  /**
   * Register a new user
   * @param {object} userData
   */
  static async registerUser({ name, email, password, mobile }) {
    AuthService.ensureDbReady();
    if (!name || !email || !password) {
      throw new ApiError(400, "Please provide all required fields");
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, "Email already registered");
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(10);

    const role = await RoleModel.findOne({ name: "USER" });
    if (!role) {
      throw new ApiError(500, "Default role not found");
    }

    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
      mobile: mobile || null,
      forgot_password_otp: otp,
      forgot_password_expiry: otpExpiry,
      role: role._id,
    });

    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email - EPR Kavach Audit",
        html: verifyEmailTemplate({ name, otp }),
      });
    } catch (emailError) {
      logOtpFallback("Registration", email, otp, emailError);
    }

    return {
      userId: user._id,
      email: user.email,
    };
  }

  /**
   * Verify email with OTP
   * @param {string} email
   * @param {string} otp
   */
  static async verifyEmail(email, otp) {
    AuthService.ensureDbReady();
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.verify_email) {
      throw new ApiError(400, "Email already verified");
    }

    if (user.forgot_password_otp !== otp) {
      throw new ApiError(400, "Invalid OTP");
    }

    if (isOTPExpired(user.forgot_password_expiry)) {
      throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    user.verify_email = true;
    user.forgot_password_otp = null;
    user.forgot_password_expiry = null;

    if (!user.last_login_date) user.last_login_date = null;

    await user.save();

    return true;
  }

  /**
   * Resend verification OTP
   * @param {string} email
   */
  static async resendVerifyEmailOtp(email) {
    AuthService.ensureDbReady();
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.verify_email) {
      throw new ApiError(400, "Email already verified");
    }

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(10);

    user.forgot_password_otp = otp;
    user.forgot_password_expiry = otpExpiry;
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email - EPR Kavach Audit",
        html: verifyEmailTemplate({ name: user.name, otp }),
      });
    } catch (emailError) {
      logOtpFallback("Verification", email, otp, emailError);
    }

    return true;
  }

  /**
   * Login user (Step 1: Validate credentials and send OTP)
   * @param {string} email
   * @param {string} password
   */
  static async loginUser(email, password) {
    AuthService.ensureDbReady();

    if (!email || !password) {
      throw new ApiError(400, "Please provide email and password");
    }

    const user = await UserModel.findOne({ email })
      .populate("role")
      .populate("linkedClient", "clientName tradeName companyGroupName");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.verify_email) {
      throw new ApiError(403, "Please verify your email before logging in");
    }

    if (user.status !== "Active") {
      throw new ApiError(
        403,
        `Account is ${user.status}. Please contact administrator.`,
      );
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLogin = new Date();

      await user.save();
      const progressiveDelayMs = Math.min(
        Math.max(user.failedLoginAttempts - 1, 0) * 1500,
        8000,
      );
      if (progressiveDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, progressiveDelayMs));
      }
      throw new ApiError(401, "Invalid credentials");
    }

    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(10);

    user.forgot_password_otp = otp;
    user.forgot_password_expiry = otpExpiry;

    // Removed redundant last_login_date check to prevent potential validation issues
    // if (!user.last_login_date) user.last_login_date = null;

    try {
      await user.save();
    } catch (saveError) {
      logger.error({ err: saveError, email }, "User save failed during login OTP creation");
      if (saveError.name === "ValidationError") {
        const messages = Object.values(saveError.errors).map(
          (val) => val.message,
        );
        throw new Error(`Validation Error: ${messages.join(", ")}`);
      }
      throw new Error(`Database save failed: ${saveError.message}`);
    }

    // NON-BLOCKING: Send email asynchronously to improve response time
    sendEmail({
      to: email,
      subject: "Login OTP - EPR Kavach Audit",
      html: loginOtpTemplate({ name: user.name, otp }),
    }).catch((emailError) => {
      logOtpFallback("Login", email, otp, emailError);
    });

    return {
      requireOtp: true,
      email: user.email,
    };
  }

  /**
   * Verify Login OTP (Step 2: Validate OTP, Photo, and Generate Tokens)
   * @param {object} params
   */
  static async verifyLoginOtp({
    email,
    otp,
    photo,
    location,
    ipAddress,
    userAgent,
  }) {
    AuthService.ensureDbReady();
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const user = await UserModel.findOne({ email })
      .populate("role")
      .populate("linkedClient", "clientName tradeName companyGroupName");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (String(user.forgot_password_otp) !== String(otp)) {
      throw new ApiError(400, "Invalid OTP");
    }

    if (isOTPExpired(user.forgot_password_expiry)) {
      throw new ApiError(400, "OTP has expired. Please login again.");
    }

    // Store login log with photo if provided (NON-BLOCKING)
    (async () => {
      if (photo) {
        // Check for black screen if photo is long enough to be a valid base64 image
        if (photo.length > 1000) {
          try {
            const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
            const imgBuffer = Buffer.from(base64Data, "base64");

            const stats = await sharp(imgBuffer).stats();
            const { channels } = stats;
            const isBlack = channels.every((c) => c.mean < 10);

            if (isBlack) {
              logger.warn(
                { email },
                "[AUTH] Black screen detected during login photo verification",
              );
              logger.info(
                { email },
                "Allowing black screen login photo based on current fallback behavior",
              );
            }
          } catch (imgError) {
            logger.error({ err: imgError, email }, "Image analysis failed during login OTP verification");
          }
        }

        try {
          const storedPhotoRef =
            await UploadService.storeConfidentialBase64Image(photo, {
              folder: "epr-kavach/login-photos",
              filenameOverride: `login-${user._id}-${Date.now()}`,
              originalFilename: `login-${user._id}.jpg`,
            });

          const logData = {
            userId: user._id,
            photo: storedPhotoRef,
            ipAddress,
            userAgent,
          };

          if (location && location.latitude && location.longitude) {
            logData.latitude = location.latitude;
            logData.longitude = location.longitude;
          }

          await LoginLogModel.create(logData);
        } catch (logError) {
          logger.error({ err: logError, email, userId: user._id }, "Failed to save login photo log");
        }
      } else {
        try {
          const logData = {
            userId: user._id,
            photo: "SKIPPED_BY_USER", // Valid string to satisfy required: true
            ipAddress,
            userAgent,
          };
          if (location && location.latitude && location.longitude) {
            logData.latitude = location.latitude;
            logData.longitude = location.longitude;
          }
          await LoginLogModel.create(logData);
        } catch (logError) {
          logger.error({ err: logError, email, userId: user._id }, "Failed to save login log");
        }
      }
    })().catch((err) =>
      logger.error({ err, email, userId: user._id }, "Async login logging failed"),
    );

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
      const geo = geoip.lookup(ipAddress);

      // NON-BLOCKING: Record login activity asynchronously
      LoginActivityModel.create({
        user: user._id,
        email: user.email,
        name: user.name,
        role: user.role?.name || "",
        ipAddress,
        userAgent,
        latitude: location?.latitude,
        longitude: location?.longitude,
        city: geo?.city || "",
        region: geo?.region || "",
        country: geo?.country || "",
      }).catch((logError) => {
        logger.error(
          { err: logError, email, userId: user._id },
          "Failed to record login activity asynchronously",
        );
      });
    } catch (error) {
      logger.error({ err: error, email, userId: user._id }, "Error in login activity setup");
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        userType: user.userType,
        linkedClientModel: user.linkedClientModel,
        linkedClient: user.linkedClient,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user
   * @param {string} userId
   */
  static async logoutUser(userId) {
    AuthService.ensureDbReady();
    const user = await UserModel.findById(userId);
    if (user) {
      user.refresh_token = "";
      await user.save();
    }
    return true;
  }

  /**
   * Refresh access token
   * @param {string} token
   */
  static async refreshToken(token) {
    AuthService.ensureDbReady();
    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw new ApiError(401, "Session expired. Please login again.");
    }

    const user = await UserModel.findById(decoded.id).populate("role");

    if (!user || !user.refresh_token) {
      throw new ApiError(401, "Session invalid. Please login again.");
    }

    let isMatch = false;
    const stored = user.refresh_token;

    if (stored.startsWith("$2")) {
      isMatch = await bcryptjs.compare(token, stored);
    } else {
      isMatch = stored === token;
    }

    if (!isMatch) {
      user.refresh_token = "";
      await user.save();
      throw new ApiError(401, "Session invalid. Please login again.");
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    const newRefreshTokenHash = await bcryptjs.hash(newRefreshToken, 10);

    user.refresh_token = newRefreshTokenHash;
    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Request password reset
   * @param {string} email
   */
  static async forgotPassword(email) {
    AuthService.ensureDbReady();
    if (!email) {
      throw new ApiError(400, "Email is required");
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
        subject: "Password Reset Request - EPR Kavach Audit",
        html: forgotPasswordTemplate({ name: user.name, otp }),
      });
    }

    return true;
  }

  /**
   * Verify Forgot Password OTP
   * @param {string} email
   * @param {string} otp
   */
  static async verifyForgotPasswordOtp(email, otp) {
    AuthService.ensureDbReady();
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.forgot_password_otp !== otp) {
      throw new ApiError(400, "Invalid OTP");
    }

    if (isOTPExpired(user.forgot_password_expiry)) {
      throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    return true;
  }

  /**
   * Reset password
   * @param {string} email
   * @param {string} otp
   * @param {string} newPassword
   */
  static async resetPassword(email, otp, newPassword) {
    AuthService.ensureDbReady();
    if (!email || !otp || !newPassword) {
      throw new ApiError(400, "Email, OTP and new password are required");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new ApiError(400, "Invalid email or OTP");
    }

    if (user.forgot_password_otp !== otp) {
      throw new ApiError(400, "Invalid email or OTP");
    }

    if (isOTPExpired(user.forgot_password_expiry)) {
      throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    user.password = hashedPassword;
    user.forgot_password_otp = null;
    user.forgot_password_expiry = null;

    if (!user.last_login_date) user.last_login_date = null;

    await user.save();

    return true;
  }

  /**
   * Get User Details
   * @param {string} userId
   */
  static async getUserDetails(userId) {
    AuthService.ensureDbReady();
    const user = await UserModel.findById(userId)
      .select(
        "-password -refresh_token -forgot_password_otp -forgot_password_expiry",
      )
      .populate("role")
      .populate("linkedClient", "clientName tradeName companyGroupName");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  }
}

export default AuthService;
