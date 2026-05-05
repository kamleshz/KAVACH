import path from "path";

const CLOUDINARY_PRIVATE_PREFIX = "cld-private://";

const MIME_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export const isAbsoluteUrl = (value = "") =>
  typeof value === "string" &&
  (value.startsWith("http://") || value.startsWith("https://"));

export const isCloudinaryAssetRef = (value = "") =>
  typeof value === "string" && value.startsWith(CLOUDINARY_PRIVATE_PREFIX);

export const createCloudinaryAssetRef = ({
  resourceType = "raw",
  publicId,
  format = "",
  originalFilename = "",
}) => {
  const encodedPublicId = encodeURIComponent(String(publicId || "").trim());
  const search = new URLSearchParams();

  if (format) search.set("format", String(format).trim());
  if (originalFilename) search.set("name", String(originalFilename).trim());

  return `${CLOUDINARY_PRIVATE_PREFIX}${resourceType}/${encodedPublicId}${search.toString() ? `?${search.toString()}` : ""}`;
};

export const parseCloudinaryAssetRef = (value = "") => {
  if (!isCloudinaryAssetRef(value)) return null;

  const raw = value.slice(CLOUDINARY_PRIVATE_PREFIX.length);
  const [pathPart, queryPart = ""] = raw.split("?");
  const [resourceType, ...publicIdParts] = pathPart.split("/");
  const search = new URLSearchParams(queryPart);

  return {
    resourceType: resourceType || "raw",
    publicId: decodeURIComponent(publicIdParts.join("/")),
    format: search.get("format") || "",
    originalFilename: search.get("name") || "",
  };
};

export const isLocalUploadPath = (value = "") =>
  typeof value === "string" &&
  !isAbsoluteUrl(value) &&
  !isCloudinaryAssetRef(value) &&
  /^(\/)?uploads[\\/]/i.test(value);

export const normalizeUploadPath = (value = "") =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

export const sanitizeDownloadName = (value = "", fallback = "document") => {
  const normalized = String(value || "").trim() || fallback;
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const getFileExtension = (value = "") =>
  path
    .extname(String(value || ""))
    .replace(".", "")
    .toLowerCase();

export const getMimeType = (value = "") =>
  MIME_TYPES[getFileExtension(value)] || "application/octet-stream";
