import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export const uploadToCloudinary = async (filePath, folder, filenameOverride, isDoc = false) => {
    try {
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
