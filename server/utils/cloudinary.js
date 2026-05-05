import { v2 as cloudinary } from "cloudinary";
import path from "path";
import dotenv from "dotenv";
import {
  createCloudinaryAssetRef,
  parseCloudinaryAssetRef,
  sanitizeDownloadName,
} from "./fileSecurity.js";

dotenv.config();

// Validate config before use
const missingKeys = [];
if (!process.env.CLOUDINARY_CLOUD_NAME)
  missingKeys.push("CLOUDINARY_CLOUD_NAME");
if (!process.env.CLOUDINARY_API_KEY) missingKeys.push("CLOUDINARY_API_KEY");
if (!process.env.CLOUDINARY_API_SECRET)
  missingKeys.push("CLOUDINARY_API_SECRET");

if (missingKeys.length > 0) {
  console.error(
    `[Cloudinary Config] CRITICAL: Missing environment variables: ${missingKeys.join(", ")}`,
  );
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = async (
  filePath,
  folder,
  filenameOverride,
  isDoc = false,
) => {
  try {
    if (missingKeys.length > 0) {
      throw new Error(
        `Cloudinary configuration is missing: ${missingKeys.join(", ")}. Please add them to your environment variables.`,
      );
    }

    const ext = path.extname(filePath || "").toLowerCase();
    const isPdf = ext === ".pdf";
    const resourceType = isPdf ? "image" : isDoc ? "raw" : "image";
    const options = {
      resource_type: resourceType,
      folder: folder,
      type: "upload",
      access_mode: "public",
    };

    if (filenameOverride) {
      options.public_id = filenameOverride;
      options.overwrite = true;
    }
    if (isPdf) {
      options.format = "pdf";
    }

    const uploadResult = await cloudinary.uploader.upload(filePath, options);
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

export const uploadConfidentialToCloudinary = async (
  filePath,
  folder,
  filenameOverride,
  originalFilename = "",
) => {
  try {
    if (missingKeys.length > 0) {
      throw new Error(
        `Cloudinary configuration is missing: ${missingKeys.join(", ")}. Please add them to your environment variables.`,
      );
    }

    const ext = path.extname(filePath || "").toLowerCase();
    const isPdf = ext === ".pdf";
    const resourceType = isPdf ? "image" : "raw";
    const safeOriginalFilename =
      originalFilename || path.basename(filePath || "");

    const options = {
      resource_type: resourceType,
      folder,
      type: "private",
      overwrite: true,
    };

    if (filenameOverride) {
      options.public_id = filenameOverride;
    }

    if (isPdf) {
      options.format = "pdf";
    }

    const uploadResult = await cloudinary.uploader.upload(filePath, options);
    return createCloudinaryAssetRef({
      resourceType,
      publicId: uploadResult.public_id,
      format: uploadResult.format || ext.replace(".", ""),
      originalFilename: safeOriginalFilename,
    });
  } catch (error) {
    console.error("Confidential Cloudinary Upload Error:", error);
    throw error;
  }
};

export const uploadConfidentialBase64ToCloudinary = async (
  dataUri,
  folder,
  filenameOverride,
  originalFilename = "login-photo.jpg",
) => {
  try {
    if (missingKeys.length > 0) {
      throw new Error(
        `Cloudinary configuration is missing: ${missingKeys.join(", ")}. Please add them to your environment variables.`,
      );
    }

    const ext = path.extname(originalFilename || "").toLowerCase();
    const format = ext.replace(".", "") || "jpg";
    const resourceType = "image";

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      resource_type: resourceType,
      folder,
      type: "private",
      public_id: filenameOverride,
      overwrite: true,
      format,
    });

    return createCloudinaryAssetRef({
      resourceType,
      publicId: uploadResult.public_id,
      format: uploadResult.format || format,
      originalFilename,
    });
  } catch (error) {
    console.error("Confidential Base64 Upload Error:", error);
    throw error;
  }
};

export const createSignedDownloadUrl = (
  assetRef,
  { expiresAt, downloadName } = {},
) => {
  const parsed = parseCloudinaryAssetRef(assetRef);
  if (!parsed) {
    throw new Error("Invalid Cloudinary asset reference");
  }

  const expiresAtSeconds =
    typeof expiresAt === "number"
      ? Math.floor(expiresAt)
      : Math.floor(Date.now() / 1000) + 60 * 5;

  const extension = parsed.format ? `.${parsed.format}` : "";
  const filename = sanitizeDownloadName(
    downloadName ||
      parsed.originalFilename ||
      `${parsed.publicId.split("/").pop() || "document"}${extension}`,
  );

  return cloudinary.utils.private_download_url(
    parsed.publicId,
    parsed.format || undefined,
    {
      resource_type: parsed.resourceType || "raw",
      type: "private",
      expires_at: expiresAtSeconds,
      attachment: filename,
    },
  );
};
