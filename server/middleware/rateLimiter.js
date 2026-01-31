import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 login/register requests per windowMs
    message: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
        error: true,
        success: false
    },
    standardHeaders: true,
    legacyHeaders: false,
});
