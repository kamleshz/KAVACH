import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { EventEmitter } from 'events'
dotenv.config({ override: true })
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import hpp from 'hpp'
import connectDB from './config/connectDB.js';
import authRouter from './routes/auth.route.js';
import clientRouter from './routes/client.route.js';
import adminRouter from './routes/admin.route.js';
import userRouter from './routes/user.route.js';
import aiRouter from './routes/ai.route.js';
import analysisRouter from './routes/analysis.route.js';
import { seedRoles } from './utils/roleSeeder.js';
import { initAuditCron } from './cron/auditCron.js';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';

const app = express()
app.set('trust proxy', 1); // Trust first proxy (Render/Vercel) for secure cookies

// Ensure uploads directory exists at startup
try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.info(`[Startup] Created uploads directory at: ${uploadDir}`);
    } else {
        logger.info(`[Startup] Uploads directory exists at: ${uploadDir}`);
    }
} catch (error) {
    logger.error(`[Startup] Failed to create uploads directory: ${error.message}`);
}

// Debug Environment Variables
if (!process.env.SECRET_KEY_ACCESS_TOKEN) {
    logger.error("CRITICAL: SECRET_KEY_ACCESS_TOKEN is missing in environment variables!");
}
if (!process.env.MONGODB_URI) {
    logger.error("CRITICAL: MONGODB_URI is missing in environment variables!");
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    logger.error("CRITICAL: CLOUDINARY configuration is missing in environment variables!");
}

const realtimeEmitter = new EventEmitter()
app.set('realtimeEmitter', realtimeEmitter)
const allowedOriginsRaw = process.env.FRONTEND_URL || "";
logger.info(`Allowed Origins Raw: ${allowedOriginsRaw}`);
const allowedOrigins = allowedOriginsRaw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
logger.info(`Allowed Origins Parsed: ${JSON.stringify(allowedOrigins)}`);
app.use(cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any local network origin (192.168.x.x) for mobile testing
        if (origin.startsWith('http://192.168.') || origin.startsWith('https://192.168.')) return callback(null, true);
        
        // Hardcoded allowed origins for debugging/safety
        const hardcodedAllowed = [
            'http://localhost:5254',
            'https://localhost:5254',
            'http://localhost:8284',
            'http://localhost:8285',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://192.168.5.172:5254',
            'http://192.168.5.172:8080'
        ];
        
        if (hardcodedAllowed.includes(origin)) return callback(null, true);

        if (allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        
        logger.warn(`DEBUG CORS FAIL: Origin = ${origin} | Allowed = ${JSON.stringify(allowedOrigins)}`);
        // Don't error immediately, let it pass but log it (or strictly block?)
        // Strict block is safer, but causes 401s if misconfigured.
        // Returning error here causes a CORS error in browser, not 401.
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(morgan('dev'))
app.use(helmet({
	crossOriginResourcePolicy : false
}))

// Data sanitization against NoSQL query injection
// Custom middleware to avoid Express 5 req.query getter issue
app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (obj instanceof Object) {
            for (const key in obj) {
                if (/^\$/.test(key)) {
                    delete obj[key];
                } else {
                    sanitize(obj[key]);
                }
            }
        }
    };
    
    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);
    if (req.query) sanitize(req.query);
    next();
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Prevent parameter pollution
// app.use(hpp());

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 8080;

app.get("/",(request,response)=>{
	response.json({
		message : "Server is running " + PORT
	})
})

app.use('/api/auth', authRouter);
app.use('/api/client', clientRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);
app.use('/api/analysis', analysisRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    // In production, send generic message for 500 errors, but specific message for operational errors (4xx)
    const isProduction = process.env.NODE_ENV === 'production';
    const responseMessage = (isProduction && statusCode === 500) ? 'Internal Server Error' : message;

    res.status(statusCode).json({
        success: false,
        error: true,
        message: responseMessage,
        stack: isProduction ? undefined : err.stack
    });
});

connectDB().then(async ()=>{
    try {
        await seedRoles();
        initAuditCron();
        app.listen(PORT, '0.0.0.0', ()=>{
            logger.info(`Server is running ${PORT}`)
        });
    } catch (startupError) {
        logger.error("Error during startup sequence:", startupError);
    }
}).catch((err) => {
    logger.error("CRITICAL: Database connection failed. Server starting in limited mode.", err);
    // Start server anyway to provide health check and logs
    app.listen(PORT, '0.0.0.0', ()=>{
        logger.info(`Server started (LIMITED MODE - NO DB) on ${PORT}`);
    });
});
