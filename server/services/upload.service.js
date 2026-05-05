import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import ApiError from "../utils/ApiError.js";
import {
  createSignedDownloadUrl,
  uploadConfidentialBase64ToCloudinary,
  uploadConfidentialToCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import {
  getMimeType,
  isAbsoluteUrl,
  isCloudinaryAssetRef,
  isLocalUploadPath,
  normalizeUploadPath,
  sanitizeDownloadName,
} from "../utils/fileSecurity.js";

class UploadService {
  static async storePublicAsset(
    file,
    { folder, filenameOverride, isDocument = false } = {},
  ) {
    if (!file?.path) {
      throw new ApiError(400, "No file uploaded");
    }

    return uploadToCloudinary(file.path, folder, filenameOverride, isDocument);
  }

  static async storeConfidentialAsset(
    file,
    { folder, filenameOverride, originalFilename } = {},
  ) {
    if (!file?.path) {
      throw new ApiError(400, "No file uploaded");
    }

    return uploadConfidentialToCloudinary(
      file.path,
      folder,
      filenameOverride,
      originalFilename || file.originalname || path.basename(file.path),
    );
  }

  static async storeConfidentialBase64Image(
    dataUri,
    { folder, filenameOverride, originalFilename } = {},
  ) {
    if (!dataUri || typeof dataUri !== "string") {
      throw new ApiError(400, "Invalid image payload");
    }

    return uploadConfidentialBase64ToCloudinary(
      dataUri,
      folder,
      filenameOverride,
      originalFilename,
    );
  }

  static createProtectedFileUrl(req, clientId, fileRef) {
    const origin = `${req.protocol}://${req.get("host")}`;
    const search = new URLSearchParams({ fileRef });
    return `${origin}/api/client/${clientId}/file-access?${search.toString()}`;
  }

  static async resolveProtectedFile(fileRef, { downloadName } = {}) {
    if (!fileRef || typeof fileRef !== "string") {
      throw new ApiError(400, "File reference is required");
    }

    if (isCloudinaryAssetRef(fileRef)) {
      return {
        mode: "redirect",
        url: createSignedDownloadUrl(fileRef, { downloadName }),
      };
    }

    if (isLocalUploadPath(fileRef)) {
      const relativePath = normalizeUploadPath(fileRef);
      const absolutePath = path.join(process.cwd(), relativePath);

      try {
        await fsPromises.access(absolutePath, fs.constants.R_OK);
      } catch {
        throw new ApiError(404, "File not found");
      }

      return {
        mode: "local",
        absolutePath,
        contentType: getMimeType(relativePath),
        filename: sanitizeDownloadName(
          downloadName || path.basename(relativePath),
        ),
      };
    }

    if (isAbsoluteUrl(fileRef)) {
      return {
        mode: "redirect",
        url: fileRef,
      };
    }

    throw new ApiError(400, "Unsupported file reference");
  }

  static async sendProtectedFile(res, fileRef, options = {}) {
    const resolved = await this.resolveProtectedFile(fileRef, options);

    if (resolved.mode === "redirect") {
      return res.redirect(resolved.url);
    }

    res.setHeader(
      "Content-Type",
      resolved.contentType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${resolved.filename}"`,
    );

    const stream = fs.createReadStream(resolved.absolutePath);
    stream.on("error", (error) => {
      if (!res.headersSent) {
        res.status(500).json({
          message: error.message || "Failed to read file",
          error: true,
          success: false,
        });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
    return undefined;
  }
}

export default UploadService;
