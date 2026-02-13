import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Validate config before use
const missingKeys = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) missingKeys.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_API_KEY) missingKeys.push('CLOUDINARY_API_KEY');
if (!process.env.CLOUDINARY_API_SECRET) missingKeys.push('CLOUDINARY_API_SECRET');

if (missingKeys.length > 0) {
    console.error(`[Cloudinary Config] CRITICAL: Missing environment variables: ${missingKeys.join(', ')}`);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export const uploadToCloudinary = async (filePath, folder, filenameOverride, isDoc = false) => {
    try {
        if (missingKeys.length > 0) {
            throw new Error(`Cloudinary configuration is missing: ${missingKeys.join(', ')}. Please add them to your environment variables.`);
        }
        
        const ext = path.extname(filePath || '').toLowerCase();
        const isPdf = ext === '.pdf';
        const resourceType = isPdf ? 'image' : (isDoc ? 'raw' : 'image');
        
        const options = {
            resource_type: resourceType,
            folder: folder,
            type: 'upload',
            access_mode: 'public',
        };

        if (filenameOverride) {
            options.public_id = filenameOverride;
            options.overwrite = true;
        }
        if (isPdf) {
            options.format = 'pdf';
        }

        const uploadResult = await cloudinary.uploader.upload(filePath, options);
        return uploadResult.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw error;
    }
};
