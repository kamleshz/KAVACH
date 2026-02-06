import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let bucket;

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        bucket = admin.storage().bucket();
        console.log("Firebase Admin initialized successfully.");
    } else {
        console.warn("Warning: serviceAccountKey.json not found in server/config/. Firebase upload will not work.");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin:", error);
}

export { bucket };
