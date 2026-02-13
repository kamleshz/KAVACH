import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists at root using process.cwd()
const uploadDir = path.join(process.cwd(), 'uploads');

try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`[Upload Middleware] Created uploads directory at: ${uploadDir}`);
    } else {
        console.log(`[Upload Middleware] Uploads directory exists at: ${uploadDir}`);
    }
} catch (error) {
    console.error(`[Upload Middleware] Failed to check/create uploads directory at ${uploadDir}:`, error);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Double check existence inside the callback to be safe
        if (!fs.existsSync(uploadDir)) {
             try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log(`[Multer] Re-created missing uploads directory at: ${uploadDir}`);
             } catch (err) {
                 console.error(`[Multer] Failed to re-create uploads directory:`, err);
                 return cb(err);
             }
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize filename
        const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + sanitizedOriginalName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and documents (PDF, DOC, DOCX, XLS, XLSX) are allowed!'));
    }
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});
