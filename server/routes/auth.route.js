import express from 'express';
import {
    registerController,
    verifyEmailController,
    loginController,
    logoutController,
    forgotPasswordController,
    verifyForgotPasswordOtpController,
    resetPasswordController,
    getUserDetailsController,
    resendVerifyEmailOtpController,
    verifyLoginOtpController,
    refreshTokenController
} from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { 
    registerSchema, 
    loginSchema, 
    verifyEmailSchema, 
    verifyLoginOtpSchema, 
    emailOnlySchema,
    resetPasswordSchema
} from '../validators/auth.validator.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), registerController);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmailController);
router.post('/resend-verify-email-otp', authLimiter, validate(emailOnlySchema), resendVerifyEmailOtpController);
router.post('/login', authLimiter, validate(loginSchema), loginController);
router.post('/verify-login-otp', authLimiter, validate(verifyLoginOtpSchema), verifyLoginOtpController);
router.post('/refresh-token', authLimiter, refreshTokenController);
router.post('/logout', auth, logoutController);
router.post('/forgot-password', authLimiter, validate(emailOnlySchema), forgotPasswordController);
router.post('/verify-forgot-password-otp', authLimiter, validate(verifyEmailSchema), verifyForgotPasswordOtpController);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPasswordController);
router.get('/user-details', auth, getUserDetailsController);

export default router;
