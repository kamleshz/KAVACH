import ClientModel from "../models/client.model.js";
import PWPModel from "../models/pwp.model.js";
import ProductComplianceModel from "../models/productCompliance.model.js";
import MonthlyProcurementModel from "../models/monthlyProcurement.model.js";
import ProcurementModel from "../models/procurement.model.js";
import SkuComplianceModel from "../models/skuCompliance.model.js";
import UserModel from "../models/user.model.js";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import ClientService from "../services/client.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  canUserAccessClient,
  getRoleName,
  isAdminRole,
  isClientRole,
} from "../utils/accessControl.js";
import UploadService from "../services/upload.service.js";
import HistoryService from "../services/history.service.js";
import CacheService from "../services/cache.service.js";
import AuditLogService from "../services/auditLog.service.js";
import logger from "../utils/logger.js";
import {
  applyClientStatusTransition,
  buildClientWorkflowSnapshot,
  getClientBusinessValidationErrors,
  normalizeClientBusinessFields,
} from "../utils/clientBusinessRules.js";
import { redactSensitiveClientData } from "../utils/clientSecurity.js";

const CLIENT_ANALYTICS_CACHE_PREFIX = "dashboard:client-stats:";
const COMPLIANCE_SNAPSHOT_CACHE_PREFIX = "compliance:snapshot:";

const makeComplianceSnapshotCacheKey = (scope, clientId, type, itemId) =>
  `${COMPLIANCE_SNAPSHOT_CACHE_PREFIX}${scope}:${clientId}:${type}:${itemId}`;

const getClientStatsCacheKey = (userId, roleName = "unknown") =>
  `${CLIENT_ANALYTICS_CACHE_PREFIX}${roleName}:${userId || "anonymous"}`;

const invalidateClientStatsCache = () =>
  CacheService.invalidateCache(CLIENT_ANALYTICS_CACHE_PREFIX);

const invalidateComplianceSnapshotCache = async (clientId, type, itemId) => {
  if (!clientId || !type || !itemId) return;

  await Promise.all([
    CacheService.invalidateCache(COMPLIANCE_SNAPSHOT_CACHE_PREFIX),
    CacheService.invalidateCache(`${clientId}:${type}:${itemId}`),
    CacheService.invalidateCache(`:${clientId}:${type}:${itemId}:`),
  ]);
};

const formatDateOnly = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const dayFirstMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dayFirstMatch) {
      return `${dayFirstMatch[1].padStart(2, "0")}-${dayFirstMatch[2].padStart(
        2,
        "0",
      )}-${dayFirstMatch[3]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

const serializeMonthlyProcurementRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const baseRow = row?.toObject ? row.toObject() : row;
    return {
      ...baseRow,
      dateOfInvoice: formatDateOnly(baseRow?.dateOfInvoice),
    };
  });

const recordClientAuditLog = async ({
  actorId,
  clientId,
  module,
  action,
  message,
  status = "success",
  metadata = {},
}) =>
  AuditLogService.record({
    actorId,
    clientId,
    module,
    action,
    entityType: "client",
    entityId: clientId,
    status,
    message,
    metadata,
  });

const findDuplicateIdentifierRecord = async ({
  pan = "",
  cin = "",
  excludeId = null,
}) => {
  const normalizedExcludeId = excludeId ? String(excludeId) : null;
  const checks = [
    {
      field: "PAN",
      value: pan,
      queryKey: "companyDetails.pan",
    },
    {
      field: "CIN",
      value: cin,
      queryKey: "companyDetails.cin",
    },
  ].filter((entry) => entry.value);

  for (const check of checks) {
    const [clientMatch, pwpMatch] = await Promise.all([
      ClientModel.findOne({
        [check.queryKey]: check.value,
        ...(normalizedExcludeId ? { _id: { $ne: normalizedExcludeId } } : {}),
      })
        .select("_id clientName entityType")
        .lean(),
      PWPModel.findOne({
        [check.queryKey]: check.value,
        ...(normalizedExcludeId ? { _id: { $ne: normalizedExcludeId } } : {}),
      })
        .select("_id clientName entityType")
        .lean(),
    ]);

    const match = clientMatch || pwpMatch;
    if (match) {
      return {
        field: check.field,
        record: match,
      };
    }
  }

  return null;
};

export const uploadClientDocumentController = asyncHandler(async (req, res) => {
  try {
    const { clientId } = req.params;
    const { documentType, documentName, certificateNumber, certificateDate } =
      req.body;

    if (!req.file) {
      throw new ApiError(400, "No document file uploaded");
    }

    const result = await ClientService.uploadDocument(clientId, req.file, {
      documentType,
      documentName,
      certificateNumber,
      certificateDate,
    });
    await recordClientAuditLog({
      actorId: req.userId,
      clientId,
      module: "client-document",
      action: "upload",
      message: "Client document uploaded",
      metadata: {
        documentType: result?.newDoc?.documentType || documentType || "",
        documentName: result?.newDoc?.documentName || documentName || "",
      },
    });

    return res.status(200).json({
      message: "Document uploaded successfully",
      error: false,
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "Failed to upload document: " + (error.message || "Unknown error"),
    );
  }
});

export const deleteClientDocumentController = asyncHandler(async (req, res) => {
  try {
    const { clientId, docId } = req.params;

    const result = await ClientService.deleteDocument(clientId, docId);
    await recordClientAuditLog({
      actorId: req.userId,
      clientId,
      module: "client-document",
      action: "delete",
      message: "Client document deleted",
      metadata: {
        documentId: docId,
        documentType: result?.deletedDocument?.documentType || "",
        documentName: result?.deletedDocument?.documentName || "",
      },
    });

    return res.status(200).json({
      message: "Document deleted successfully",
      error: false,
      success: true,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "Failed to delete document: " + (error.message || "Unknown error"),
    );
  }
});

export const accessProtectedFileController = asyncHandler(async (req, res) => {
  const { fileRef, downloadName } = req.query;
  await UploadService.sendProtectedFile(res, fileRef, { downloadName });
});

export const getAllClientsController = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 25, skip = 0 } = req.pagination || {};
    const user =
      req.authUser ||
      (await UserModel.findById(req.userId)
        .populate("role")
        .populate("linkedClient", "clientName tradeName companyGroupName"));
    const roleName = getRoleName(user);
    const isUserAdmin = isAdminRole(roleName);
    const isLinkedClientUser = isClientRole(roleName);

    let clientBaseQuery = {};
    let pwpBaseQuery = {};

    if (!isUserAdmin) {
      if (isLinkedClientUser) {
        clientBaseQuery =
          user?.linkedClientModel === "Client"
            ? { _id: user.linkedClient }
            : { _id: null };
        pwpBaseQuery =
          user?.linkedClientModel === "PWP"
            ? { _id: user.linkedClient }
            : { _id: null };
      } else {
        clientBaseQuery = {
          $or: [{ assignedTo: req.userId }, { assignedManager: req.userId }],
        };
        pwpBaseQuery = { ...clientBaseQuery };
      }
    }

    const buildQuery = (baseQuery) => {
      const filters = [];
      if (baseQuery && Object.keys(baseQuery).length > 0) {
        filters.push(baseQuery);
      }

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i");
        filters.push({
          $or: [
            { clientName: searchRegex },
            { companyGroupName: searchRegex },
            { entityType: searchRegex },
          ],
        });
      }

      if (req.query.validationStatus) {
        filters.push({ validationStatus: req.query.validationStatus });
      }

      if (filters.length === 0) return {};
      if (filters.length === 1) return filters[0];
      return { $and: filters };
    };

    const clients = await ClientModel.find(buildQuery(clientBaseQuery))
      .populate("assignedTo", "name email")
      .populate("assignedManager", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const pwps = await PWPModel.find(buildQuery(pwpBaseQuery))
      .populate("assignedTo", "name email")
      .populate("assignedManager", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const allClients = [...clients, ...pwps].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const paginatedClients = allClients.slice(skip, skip + limit);

    return res.status(200).json({
      message: "Clients fetched successfully",
      error: false,
      success: true,
      ...res.paginate({
        data: paginatedClients,
        total: allClients.length,
      }),
    });
  } catch (error) {
    throw new ApiError(
      500,
      "Failed to fetch clients: " + (error.message || "Unknown error"),
    );
  }
});

export const createClientController = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const clientData = req.body || {};
  const financialYearRaw =
    clientData.financialYear ??
    clientData.financial_year ??
    clientData.financialyear ??
    "";
  const normalizedClientData = {
    ...clientData,
    financialYear: financialYearRaw ? String(financialYearRaw) : "",
  };
  const businessReadyClientData =
    normalizeClientBusinessFields(normalizedClientData);
  const validationErrors =
    getClientBusinessValidationErrors(businessReadyClientData);
  if (validationErrors.length > 0) {
    throw new ApiError(400, validationErrors[0]);
  }

  const duplicateRecord = await findDuplicateIdentifierRecord({
    pan: businessReadyClientData.companyDetails?.pan,
    cin: businessReadyClientData.companyDetails?.cin,
  });
  if (duplicateRecord) {
    throw new ApiError(
      409,
      `${duplicateRecord.field} already exists for '${duplicateRecord.record.clientName}'`,
    );
  }

  const isPWP =
    businessReadyClientData.category === "PWP" ||
    businessReadyClientData.entityType === "PWP";
  const Model = isPWP ? PWPModel : ClientModel;

  const newClient = new Model({
    ...businessReadyClientData,
    createdBy: userId,
  });

  if (businessReadyClientData.clientStatus) {
    try {
      applyClientStatusTransition({
        client: newClient,
        targetStatus: businessReadyClientData.clientStatus,
        changedBy: userId,
        reason:
          businessReadyClientData.statusChangeReason ||
          "Initial lifecycle status set during client creation",
      });
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }

  try {
    await newClient.save();
    await invalidateClientStatsCache();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Client/PWP with this name already exists");
    }
    if (error.name === "ValidationError") {
      throw new ApiError(400, "Validation Error: " + error.message);
    }
    throw new ApiError(500, "Failed to create client: " + error.message);
  }

  return res.status(201).json({
    message: "Client created successfully",
    error: false,
    success: true,
    data: newClient,
  });
});

export const updatePlantProcessProgressController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, completedSteps } = req.body;

      if (!type || !itemId || !completedSteps) {
        throw new ApiError(
          400,
          "Missing required fields: type, itemId, completedSteps",
        );
      }

      const client = await ClientService.findClientOrPwp(clientId);

      const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
      const item = client.productionFacility[listKey].id(itemId);

      if (!item) {
        throw new ApiError(404, `${type} detail not found`);
      }

      // Parse steps if string
      let steps = completedSteps;
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(steps);
        } catch (e) {
          steps = [];
        }
      }
      if (!Array.isArray(steps)) {
        steps = [];
      }

      // Update completed steps
      item.completedSteps = steps;

      await client.save();

      return res.status(200).json({
        message: "Progress updated successfully",
        error: false,
        success: true,
        data: { completedSteps: item.completedSteps },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to update progress: " + (error.message || "Unknown error"),
      );
    }
  },
);

export const verifyFacilityController = asyncHandler(async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      type,
      itemId,
      verificationStatus,
      verificationRemark,
      completedSteps,
    } = req.body; // type: 'CTE' or 'CTO'

    // If we are just saving steps, we don't strictly need a file or status.
    // If completedSteps is provided, we skip the strict file check for verificationStatus
    if (!completedSteps && !req.file && verificationStatus !== "Rejected") {
      throw new ApiError(400, "No verification document uploaded");
    }

    const client = await ClientService.findClientOrPwp(clientId);

    let fileUrl = "";
    if (req.file) {
      try {
        const filenameOverride = `verify_${type}_${itemId}_${Date.now()}`;
        fileUrl = await UploadService.storeConfidentialAsset(req.file, {
          folder: "eprkavach/verification",
          filenameOverride,
        });
      } catch (err) {
        throw new ApiError(
          500,
          "Cloud upload failed: " + (err.message || "Unknown error"),
        );
      }
    }

    // Determine target array and find item
    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const item = client.productionFacility[listKey].id(itemId);

    if (!item) {
      throw new ApiError(404, `${type} detail not found`);
    }

    // --- HISTORY TRACKING PREPARE ---
    const toText = (v) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string") return v;
      return String(v);
    };

    const beforeStatus = toText(item.verification?.status);
    const beforeRemark = toText(item.verification?.remark);
    const beforeDoc = toText(item.verification?.document);
    const beforeSteps = Array.isArray(item.completedSteps)
      ? item.completedSteps.join(", ")
      : "";
    // --------------------------------

    // Update fields
    if (verificationStatus) {
      item.verification.status = verificationStatus;
      item.verification.verifiedBy = req.userId;
      item.verification.verifiedAt = new Date();
    }
    if (verificationRemark) item.verification.remark = verificationRemark;
    if (fileUrl) item.verification.document = fileUrl;

    // Update completedSteps if provided
    if (completedSteps) {
      let steps = completedSteps;
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(steps);
        } catch (e) {
          steps = [];
        }
      }
      if (!Array.isArray(steps)) {
        steps = [];
      }
      item.completedSteps = steps;
    }

    // --- HISTORY TRACKING SAVE ---
    const afterStatus = toText(item.verification?.status);
    const afterRemark = toText(item.verification?.remark);
    const afterDoc = toText(item.verification?.document);
    const afterSteps = Array.isArray(item.completedSteps)
      ? item.completedSteps.join(", ")
      : "";

    const changes = [];
    if (beforeStatus !== afterStatus)
      changes.push({
        field: "Verification Status",
        prev: beforeStatus,
        curr: afterStatus,
      });
    if (beforeRemark !== afterRemark)
      changes.push({
        field: "Verification Remark",
        prev: beforeRemark,
        curr: afterRemark,
      });
    if (beforeDoc !== afterDoc)
      changes.push({
        field: "Verification Document",
        prev: beforeDoc,
        curr: afterDoc,
      });
    if (beforeSteps !== afterSteps)
      changes.push({
        field: "Completed Steps",
        prev: beforeSteps,
        curr: afterSteps,
      });

    if (changes.length > 0) {
      const at = new Date();
      await HistoryService.appendEntries({
        clientId,
        type,
        itemId,
        userId: req.userId,
        entries: changes.map((c) => ({
          table: "Verification",
          row: 0,
          field: c.field,
          prev: c.prev || "-",
          curr: c.curr || "-",
          user: req.userId || null,
          userName: "",
          at,
        })),
      });
    }
    // -----------------------------

    await client.save();
    await recordClientAuditLog({
      actorId: req.userId,
      clientId,
      module: "facility-verification",
      action: "update",
      message: "Facility verification updated",
      metadata: {
        type,
        itemId,
        verificationStatus: item.verification?.status || "",
        changeCount: changes.length,
      },
    });

    return res.status(200).json({
      message: "Verification updated successfully",
      error: false,
      success: true,
      data: client,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "Failed to verify facility: " + (error.message || "Unknown error"),
    );
  }
});

export const saveProductComplianceController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, rows, rowIndex, row, plantName } = req.body;
      const userId = req.userId;
      const emitter = req.app.get("realtimeEmitter");

      const result = await ClientService.saveProductCompliance(
        clientId,
        type,
        itemId,
        rows,
        rowIndex,
        row,
        userId,
        emitter,
        plantName,
      );

      await invalidateComplianceSnapshotCache(clientId, type, itemId);

      return res.status(200).json({
        message: "Product compliance saved",
        error: false,
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to save product compliance: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const getProductComplianceController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeComplianceSnapshotCacheKey(
      "product",
      clientId,
      type,
      itemId,
    );
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    const doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    const rows = Array.isArray(doc?.rows)
      ? doc.rows.filter((r) => r && typeof r === "object")
      : [];
    const payload = {
      message: "Product compliance fetched",
      error: false,
      success: true,
      data: rows,
      hasDoc: !!doc,
    };
    await CacheService.setCache(cacheKey, payload, CacheService.ttl.compliance);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getAllProductComplianceRowsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const docs = await ProductComplianceModel.find({ client: clientId });

    let allRows = [];
    docs.forEach((doc) => {
      if (Array.isArray(doc.rows)) {
        allRows = allRows.concat(
          doc.rows.filter((r) => r && typeof r === "object"),
        );
      }
    });

    // Deduplicate by skuCode + componentCode to keep all components per SKU
    const uniqueRows = [];
    const seenKeys = new Set();

    allRows.forEach((row) => {
      const skuCode = (row.skuCode || "").trim();
      const componentCode = (row.componentCode || "").trim();
      const key = `${skuCode}::${componentCode}`;
      if (skuCode && !seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRows.push(row);
      }
    });

    return res.status(200).json({
      message: "All product compliance rows fetched",
      error: false,
      success: true,
      data: uniqueRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

const normalizeSupplierComplianceRowsForDoc = (doc) => {
  const normalizeSystemCode = (value) =>
    (value || "").toString().replace(/\s+/g, "").toLowerCase();
  const extractComponentCode = (value) => {
    const raw = (value || "").toString();
    if (!raw) return "";
    const parts = raw
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length >= 2 ? parts[1] : "";
  };

  const systemCodeMap = new Map();
  (doc?.rows || []).forEach((row) => {
    const key = normalizeSystemCode(row?.systemCode);
    if (!key) return;
    systemCodeMap.set(key, {
      componentCode: row?.componentCode || "",
      componentDescription: row?.componentDescription || "",
      supplierName: row?.supplierName || "",
      supplierState: row?.supplierState || "",
      supplierType: row?.supplierType || "",
      skuCode: row?.skuCode || "",
    });
  });
  (doc?.componentDetails || []).forEach((row) => {
    const key = normalizeSystemCode(row?.systemCode);
    if (!key) return;
    const existing = systemCodeMap.get(key) || {};
    systemCodeMap.set(key, {
      ...existing,
      componentCode: row?.componentCode || existing.componentCode || "",
      componentDescription:
        row?.componentDescription || existing.componentDescription || "",
      supplierName: row?.supplierName || existing.supplierName || "",
      skuCode: row?.skuCode || existing.skuCode || "",
    });
  });

  return (doc?.supplierCompliance || []).map((row) => {
    const key = normalizeSystemCode(row?.systemCode);
    const mapped = systemCodeMap.get(key) || {};
    const parsedComponentCode = extractComponentCode(row?.systemCode);
    return {
      ...(row.toObject?.() || row),
      skuCode: mapped.skuCode || row?.skuCode || "",
      componentCode:
        mapped.componentCode || parsedComponentCode || row?.componentCode || "",
      componentDescription:
        mapped.componentDescription || row?.componentDescription || "",
      supplierName: mapped.supplierName || row?.supplierName || "",
      supplierState: mapped.supplierState || row?.supplierState || "",
      supplierType: mapped.supplierType || row?.supplierType || "",
    };
  });
};

export const getAllProductComponentDetailsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const docs = await ProductComplianceModel.find({ client: clientId });

    const allRows = docs.flatMap((doc) =>
      Array.isArray(doc?.componentDetails)
        ? doc.componentDetails
            .filter((row) => row && typeof row === "object")
            .map((row) => row.toObject?.() || row)
        : [],
    );

    return res.status(200).json({
      message: "All component details fetched",
      error: false,
      success: true,
      data: allRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getAllProductSupplierComplianceController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const docs = await ProductComplianceModel.find({ client: clientId });

    const allRows = docs.flatMap((doc) =>
      normalizeSupplierComplianceRowsForDoc(doc).filter(
        (row) => row && typeof row === "object",
      ),
    );

    return res.status(200).json({
      message: "All supplier compliance rows fetched",
      error: false,
      success: true,
      data: allRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getAllRecycledQuantityUsedController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const docs = await ProductComplianceModel.find({ client: clientId });

    const allRows = docs.flatMap((doc) =>
      Array.isArray(doc?.recycledQuantityUsed)
        ? doc.recycledQuantityUsed
            .filter((row) => row && typeof row === "object")
            .map((row) => row.toObject?.() || row)
        : [],
    );

    return res.status(200).json({
      message: "All recycled quantity rows fetched",
      error: false,
      success: true,
      data: allRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getAllMonthlyProcurementRowsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const docs = await MonthlyProcurementModel.find({ client: clientId });

    const allRows = docs.flatMap((doc) =>
      serializeMonthlyProcurementRows(doc?.rows || []).filter(
        (row) => row && typeof row === "object",
      ),
    );

    return res.status(200).json({
      message: "All monthly procurement rows fetched",
      error: false,
      success: true,
      data: allRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const uploadProductComplianceRowController = async (req, res) => {
  try {
    logger.debug(
      {
        clientId: req.params.clientId,
        type: req.body.type,
        itemId: req.body.itemId,
        rowIndex: req.body.rowIndex,
      },
      "[Product Compliance Upload] Request received",
    );

    const { clientId } = req.params;
    const { type, itemId, rowIndex, row } = req.body;

    if (!clientId || !type || !itemId || rowIndex === undefined) {
      logger.error(
        { clientId, type, itemId, rowIndex },
        "[Product Compliance Upload] Missing required fields",
      );
      return res.status(400).json({
        message: "Missing required fields",
        error: true,
        success: false,
      });
    }

    const clientExists = await ClientService.findClientOrPwp(clientId);
    if (!clientExists) {
      logger.error({ clientId }, "[Product Compliance Upload] Client not found");
      return res
        .status(404)
        .json({ message: "Client not found", error: true, success: false });
    }

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility?.[listKey]?.id(itemId);

    // Only check for itemFound if productionFacility exists and listKey is valid
    // Some clients might not have productionFacility structured this way if they are PWP
    // But the original code assumed this structure, so we'll keep it but add safety checks
    if (
      clientExists.productionFacility &&
      clientExists.productionFacility[listKey] &&
      !itemFound
    ) {
      logger.error(
        { clientId, itemId, listKey },
        "[Product Compliance Upload] Facility item not found",
      );
      return res.status(404).json({
        message: `${type} detail not found`,
        error: true,
        success: false,
      });
    }

    let single = row;
    if (typeof single === "string") {
      try {
        single = JSON.parse(single);
      } catch (e) {
        logger.error({ err: e, clientId, itemId }, "[Product Compliance Upload] JSON parse error for row");
        single = {};
      }
    }
    const idx = parseInt(rowIndex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      logger.error({ rowIndex, clientId, itemId }, "[Product Compliance Upload] Invalid row index");
      return res
        .status(400)
        .json({ message: "Invalid rowIndex", error: true, success: false });
    }

    let productImageUrl = single.productImage || "";
    let componentImageUrl = single.componentImage || "";
    let additionalDocumentUrl = single.additionalDocument || "";
    const productFile = req.files?.productImage?.[0] || null;
    const componentFile = req.files?.componentImage?.[0] || null;
    const additionalDocFile = req.files?.additionalDocument?.[0] || null;

    if (productFile) {
      const filenameOverride = `pc_product_${type}_${itemId}_${Date.now()}`;
      productImageUrl = await UploadService.storePublicAsset(productFile, {
        folder: "eprkavach/product_compliance",
        filenameOverride,
        isDocument: false,
      });
    }
    if (componentFile) {
      const filenameOverride = `pc_component_${type}_${itemId}_${Date.now()}`;
      componentImageUrl = await UploadService.storePublicAsset(componentFile, {
        folder: "eprkavach/product_compliance",
        filenameOverride,
        isDocument: false,
      });
    }
    if (additionalDocFile) {
      const filenameOverride = `pc_doc_${type}_${itemId}_${Date.now()}`;
      additionalDocumentUrl = await UploadService.storeConfidentialAsset(
        additionalDocFile,
        {
          folder: "eprkavach/product_compliance",
          filenameOverride,
        },
      );
    }

    const rowData = {
      generate: single.generate || "No",
      systemCode: single.systemCode || "",
      packagingType: single.packagingType || "",
      clientName: single.clientName || "",
      clientState: single.clientState || "",
      skuCode: single.skuCode || "",
      skuDescription: single.skuDescription || "",
      skuUom: single.skuUom || "",
      productImage: productImageUrl || "",
      componentCode: single.componentCode || "",
      componentDescription: single.componentDescription || "",
      supplierName: single.supplierName || "",
      supplierState: single.supplierState || "",
      supplierType: single.supplierType || "",
      supplierCategory: single.supplierCategory || "",
      generateSupplierCode: single.generateSupplierCode || "No",
      supplierCode: single.supplierCode || "",
      componentImage: componentImageUrl || "",
      thickness: single.thickness ? Number(single.thickness) : 0,
      rcPercent: single.rcPercent ? Number(single.rcPercent) : 0,
      auditorRemarks: single.auditorRemarks || "",
      managerRemarks: single.managerRemarks || "",
      componentComplianceStatus:
        single.componentComplianceStatus || single.complianceStatus || "",
      productComplianceStatus: single.productComplianceStatus || "",
      clientRemarks: single.clientRemarks || "",
      additionalDocument: additionalDocumentUrl || "",
      rowKey: single.rowKey || "",
      skuKey: single.skuKey || "",
      componentKey: single.componentKey || "",
      supplierKey: single.supplierKey || "",
    };
    const savedRows = await ClientService.saveProductCompliance(
      clientId,
      type,
      itemId,
      undefined,
      idx,
      rowData,
      req.userId,
      req.app.get("realtimeEmitter"),
      undefined,
    );
    await invalidateComplianceSnapshotCache(clientId, type, itemId);

    return res.status(200).json({
      message: "Row saved",
      error: false,
      success: true,
      data: { index: idx, row: savedRows?.[idx] || rowData },
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const uploadProductSupplierCtoDocumentController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId, rowIndex } = req.body;

    if (!clientId || !type || !itemId || rowIndex === undefined) {
      return res.status(400).json({
        message: "Missing required fields",
        error: true,
        success: false,
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No document uploaded", error: true, success: false });
    }

    const idx = parseInt(rowIndex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res
        .status(400)
        .json({ message: "Invalid rowIndex", error: true, success: false });
    }

    const filenameOverride = `supplier_cto_${type}_${itemId}_${Date.now()}`;
    const docUrl = await UploadService.storeConfidentialAsset(req.file, {
      folder: "eprkavach/supplier_cto",
      filenameOverride,
    });

    let doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    if (!doc) {
      doc = new ProductComplianceModel({
        client: clientId,
        type,
        itemId,
        rows: [],
        componentDetails: [],
        supplierCompliance: [],
      });
      await doc.save();
    }

    const existingRow = doc.supplierCompliance?.[idx] || {};
    const mergedRow = { ...existingRow, ctoCcaDocument: docUrl || "" };

    const emitter = req.app.get("realtimeEmitter");
    const updated = await ClientService.saveSupplierCompliance(
      clientId,
      type,
      itemId,
      undefined,
      idx,
      mergedRow,
      req.userId,
      emitter,
      undefined,
    );

    return res.status(200).json({
      message: "Supplier CTO/CCA document uploaded successfully",
      error: false,
      success: true,
      data: {
        url: docUrl || "",
        rows: updated,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getSupplierCtoChecksController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;

    if (!clientId || !type || !itemId) {
      return res.status(400).json({
        message: "Missing required parameters",
        error: true,
        success: false,
      });
    }

    const rows = await ClientService.getSupplierCtoChecks(
      clientId,
      type,
      itemId,
    );
    return res.status(200).json({
      message: "Supplier CTO checks fetched successfully",
      error: false,
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveSupplierCtoChecksController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId, rows, rowIndex, row } = req.body;

    if (!clientId || !type || !itemId) {
      return res.status(400).json({
        message: "Missing required fields",
        error: true,
        success: false,
      });
    }

    const emitter = req.app.get("realtimeEmitter");
    const saved = await ClientService.saveSupplierCtoChecks(
      clientId,
      type,
      itemId,
      rows,
      rowIndex,
      row,
      req.userId,
      emitter,
    );

    return res.status(200).json({
      message: "Supplier CTO checks saved successfully",
      error: false,
      success: true,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const uploadSupplierCtoCcaDocumentController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId, rowIndex, supplierName } = req.body;

    if (!clientId || !type || !itemId || rowIndex === undefined) {
      return res.status(400).json({
        message: "Missing required fields",
        error: true,
        success: false,
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No document uploaded", error: true, success: false });
    }

    const idx = parseInt(rowIndex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res
        .status(400)
        .json({ message: "Invalid rowIndex", error: true, success: false });
    }

    const filenameOverride = `supplier_cto_check_${type}_${itemId}_${Date.now()}`;
    const docUrl = await UploadService.storeConfidentialAsset(req.file, {
      folder: "eprkavach/supplier_cto_check",
      filenameOverride,
    });

    const existingRows = await ClientService.getSupplierCtoChecks(
      clientId,
      type,
      itemId,
    );
    const current = existingRows[idx] || {};

    if (
      (current?.ctoAvailability || "").toString().trim() === "Not Available"
    ) {
      return res.status(400).json({
        message: "CTO is marked Not Available for this supplier",
        error: true,
        success: false,
      });
    }
    const merged = {
      ...current,
      supplierName: (current?.supplierName || supplierName || "")
        .toString()
        .trim(),
      ctoCcaDocument: docUrl || "",
    };

    if (!merged.supplierName) {
      return res.status(400).json({
        message: "Supplier Name is required for upload",
        error: true,
        success: false,
      });
    }

    const emitter = req.app.get("realtimeEmitter");
    const updated = await ClientService.saveSupplierCtoChecks(
      clientId,
      type,
      itemId,
      undefined,
      idx,
      merged,
      req.userId,
      emitter,
    );

    return res.status(200).json({
      message: "CTO/CCA document uploaded successfully",
      error: false,
      success: true,
      data: { url: docUrl || "", rows: updated },
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveProductComponentDetailsController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, rows, rowIndex, row, plantName } = req.body;
      const userId = req.userId;
      const emitter = req.app.get("realtimeEmitter");

      const result = await ClientService.saveProductComponentDetails(
        clientId,
        type,
        itemId,
        rows,
        rowIndex,
        row,
        userId,
        emitter,
        plantName,
      );

      await invalidateComplianceSnapshotCache(clientId, type, itemId);

      return res.status(200).json({
        message: "Component details saved",
        error: false,
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to save component details: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const getProductComponentDetailsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeComplianceSnapshotCacheKey(
      "components",
      clientId,
      type,
      itemId,
    );
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    const doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    const payload = {
      message: "Component details fetched",
      error: false,
      success: true,
      data: doc?.componentDetails || [],
    };
    await CacheService.setCache(cacheKey, payload, CacheService.ttl.compliance);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveProductSupplierComplianceController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, rows, rowIndex, row, plantName } = req.body;

      logger.debug(
        { clientId, type, itemId, rowIndex, plantName },
        "[Save Supplier Compliance] Request received",
      );
      if (rows && Array.isArray(rows)) {
        logger.debug({ clientId, rowsCount: rows.length }, "[Save Supplier Compliance] Rows count");
        if (rows.length > 0) {
          logger.debug(
            { clientId, firstRowSample: JSON.stringify(rows[0]) },
            "[Save Supplier Compliance] First row sample",
          );
        }
      }

      const userId = req.userId;
      const emitter = req.app.get("realtimeEmitter");

      const result = await ClientService.saveSupplierCompliance(
        clientId,
        type,
        itemId,
        rows,
        rowIndex,
        row,
        userId,
        emitter,
        plantName,
      );

      await invalidateComplianceSnapshotCache(clientId, type, itemId);

      return res.status(200).json({
        message: "Supplier compliance saved",
        error: false,
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to save supplier compliance: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const getProductSupplierComplianceController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeComplianceSnapshotCacheKey(
      "suppliers",
      clientId,
      type,
      itemId,
    );
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    const doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    const normalizeSystemCode = (value) =>
      (value || "").toString().replace(/\s+/g, "").toLowerCase();
    const extractComponentCode = (value) => {
      const raw = (value || "").toString();
      if (!raw) return "";
      const parts = raw
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      return parts.length >= 2 ? parts[1] : "";
    };

    const systemCodeMap = new Map();
    (doc?.rows || []).forEach((row) => {
      const key = normalizeSystemCode(row?.systemCode);
      if (!key) return;
      systemCodeMap.set(key, {
        componentCode: row?.componentCode || "",
        componentDescription: row?.componentDescription || "",
        supplierName: row?.supplierName || "",
        supplierState: row?.supplierState || "",
        supplierType: row?.supplierType || "",
      });
    });
    (doc?.componentDetails || []).forEach((row) => {
      const key = normalizeSystemCode(row?.systemCode);
      if (!key) return;
      const existing = systemCodeMap.get(key) || {};
      systemCodeMap.set(key, {
        ...existing,
        componentCode: row?.componentCode || existing.componentCode || "",
        componentDescription:
          row?.componentDescription || existing.componentDescription || "",
        supplierName: row?.supplierName || existing.supplierName || "",
      });
    });

    let changed = false;
    const normalizedSupplierRows = (doc?.supplierCompliance || []).map(
      (row) => {
        const key = normalizeSystemCode(row?.systemCode);
        const mapped = systemCodeMap.get(key) || {};
        const parsedComponentCode = extractComponentCode(row?.systemCode);
        const nextRow = {
          ...(row.toObject?.() || row),
          componentCode:
            mapped.componentCode ||
            parsedComponentCode ||
            row?.componentCode ||
            "",
          componentDescription:
            mapped.componentDescription || row?.componentDescription || "",
          supplierName: mapped.supplierName || row?.supplierName || "",
          supplierState: mapped.supplierState || row?.supplierState || "",
          supplierType: mapped.supplierType || row?.supplierType || "",
        };

        if (
          (nextRow.componentCode || "") !== (row?.componentCode || "") ||
          (nextRow.componentDescription || "") !==
            (row?.componentDescription || "") ||
          (nextRow.supplierName || "") !== (row?.supplierName || "") ||
          (nextRow.supplierState || "") !== (row?.supplierState || "") ||
          (nextRow.supplierType || "") !== (row?.supplierType || "")
        ) {
          changed = true;
        }
        return nextRow;
      },
    );

    if (doc && changed) {
      doc.supplierCompliance = normalizedSupplierRows;
      doc.markModified("supplierCompliance");
      await doc.save();
    }

    const payload = {
      message: "Supplier compliance fetched",
      error: false,
      success: true,
      data: normalizedSupplierRows,
    };
    await CacheService.setCache(cacheKey, payload, CacheService.ttl.compliance);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getProductComplianceHistoryController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const entries = await HistoryService.getEntries({ clientId, type, itemId });
    return res.status(200).json({
      message: "Product compliance history fetched",
      error: false,
      success: true,
      data: entries,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const importProductComplianceHistoryController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.body;
    const incomingEntries = req.body.entries || req.body.history;

    const clientExists = await ClientService.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      return res.status(404).json({
        message: `${type} detail not found`,
        error: true,
        success: false,
      });
    }
    const incoming = Array.isArray(incomingEntries) ? incomingEntries : [];
    const sanitized = incoming
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        table: (e.table || "").toString(),
        row: Number(e.row) || 0,
        field: (e.field || "").toString(),
        prev: (e.prev ?? "").toString(),
        curr: (e.curr ?? "").toString(),
        user: req.userId || null,
        userName: (e.user || e.userName || "").toString(),
        at: e.at ? new Date(e.at) : new Date(),
      }));
    const savedEntries = sanitized.length
      ? await HistoryService.appendEntries({
          clientId,
          type,
          itemId,
          entries: sanitized,
          userId: req.userId,
        })
      : await HistoryService.getEntries({ clientId, type, itemId });
    return res.status(200).json({
      message: "Product compliance history imported",
      error: false,
      success: true,
      data: savedEntries,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveRecycledQuantityUsedController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, rows, rowIndex, row, plantName } = req.body;
      const userId = req.userId;

      const result = await ClientService.saveRecycledQuantityUsed(
        clientId,
        type,
        itemId,
        rows,
        rowIndex,
        row,
        userId,
        plantName,
      );

      await invalidateComplianceSnapshotCache(clientId, type, itemId);

      return res.status(200).json({
        message: "Recycled quantity used saved",
        error: false,
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to save recycled quantity: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const getRecycledQuantityUsedController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeComplianceSnapshotCacheKey(
      "recycled",
      clientId,
      type,
      itemId,
    );
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    const doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    const payload = {
      message: "Recycled quantity used fetched",
      error: false,
      success: true,
      data: doc?.recycledQuantityUsed || [],
    };
    await CacheService.setCache(cacheKey, payload, CacheService.ttl.compliance);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveMonthlyProcurementController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId, rows, rowIndex, row, plantName } = req.body;
      const userId = req.userId;

      const result = await ClientService.saveMonthlyProcurement(
        clientId,
        type,
        itemId,
        rows,
        rowIndex,
        row,
        userId,
        plantName,
      );

      await invalidateComplianceSnapshotCache(clientId, type, itemId);

      return res.status(200).json({
        message: "Monthly procurement saved",
        error: false,
        success: true,
        data: serializeMonthlyProcurementRows(result),
      });
    } catch (error) {
      req.log?.error?.(
        {
          clientId: req.params?.clientId,
          body: req.body,
          error: error?.message,
          stack: error?.stack,
        },
        "Failed to save monthly procurement",
      );
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to save monthly procurement: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const getMonthlyProcurementController = asyncHandler(
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { type, itemId } = req.query;
      const cacheKey = makeComplianceSnapshotCacheKey(
        "monthly-procurement",
        clientId,
        type,
        itemId,
      );
      const cached = await CacheService.getCache(cacheKey);
      if (cached) {
        return res.status(200).json({
          ...cached,
          cached: true,
        });
      }

      const doc = await MonthlyProcurementModel.findOne({
        client: clientId,
        type,
        itemId,
      });
      const payload = {
        message: "Monthly procurement fetched",
        error: false,
        success: true,
        data: serializeMonthlyProcurementRows(doc?.rows || []),
      };
      await CacheService.setCache(
        cacheKey,
        payload,
        CacheService.ttl.compliance,
      );
      return res.status(200).json(payload);
    } catch (error) {
      throw new ApiError(
        500,
        "Failed to fetch monthly procurement: " +
          (error.message || "Unknown error"),
      );
    }
  },
);

export const cleanupProductComplianceFieldsController = asyncHandler(
  async (req, res) => {
    try {
      // Remove deprecated fields from ProductComplianceModel rows
      await ProductComplianceModel.updateMany(
        {},
        {
          $unset: {
            "rows.$[].polymerType": 1,
            "rows.$[].category": 1,
            "rows.$[].layerType": 1,
            "rows.$[].supplierStatus": 1,
            "rows.$[].eprRegNumber": 1,
            "rows.$[].polymerCodeOnProduct": 1,
          },
        },
      );
      // Remove deprecated fields from embedded productComplianceRows in ClientModel (CTE and CTO lists)
      await ClientModel.updateMany(
        {},
        {
          $unset: {
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].polymerType": 1,
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].category": 1,
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].layerType": 1,
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].supplierStatus": 1,
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].eprRegNumber": 1,
            "productionFacility.cteDetailsList.$[].productComplianceRows.$[].polymerCodeOnProduct": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].polymerType": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].category": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].layerType": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].supplierStatus": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].eprRegNumber": 1,
            "productionFacility.ctoDetailsList.$[].productComplianceRows.$[].polymerCodeOnProduct": 1,
          },
        },
      );
      return res.status(200).json({
        message: "Deprecated product compliance fields cleaned up",
        error: false,
        success: true,
      });
    } catch (error) {
      throw new ApiError(
        500,
        "Failed to cleanup fields: " + (error.message || "Unknown error"),
      );
    }
  },
);

export const getClientByIdController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const viewMode = (req.query?.view || "").toString().trim().toLowerCase();

    let client = await ClientModel.findById(clientId)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedManager", "name email")
      .populate("validationDetails.validatedBy", "name email")
      .populate(
        "productionFacility.cteDetailsList.verification.verifiedBy",
        "name email",
      )
      .populate(
        "productionFacility.ctoDetailsList.verification.verifiedBy",
        "name email",
      )
      .lean();

    if (!client) {
      client = await PWPModel.findById(clientId)
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email")
        .populate("assignedManager", "name email")
        .populate("validationDetails.validatedBy", "name email")
        .populate(
          "productionFacility.cteDetailsList.verification.verifiedBy",
          "name email",
        )
        .populate(
          "productionFacility.ctoDetailsList.verification.verifiedBy",
          "name email",
        )
        .lean();
    }

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
        error: true,
        success: false,
      });
    }

    // Check access permission
    const user =
      req.authUser ||
      (await UserModel.findById(req.userId)
        .populate("role")
        .populate("linkedClient", "clientName tradeName companyGroupName"));

    if (!canUserAccessClient(user, client)) {
      return res.status(403).json({
        message: "Access denied. You are not allowed to view this client.",
        error: true,
        success: false,
      });
    }

    const singleInstanceTypes = new Set([
      "PAN",
      "GST",
      "CIN",
      "Factory License",
      "EPR Certificate",
      "IEC Certificate",
      "DIC/DCSSI Certificate",
    ]);

    if (Array.isArray(client.documents)) {
      const docs = [...client.documents];
      docs.sort((a, b) => {
        const at = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bt = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        if (bt !== at) return bt - at;
        const aid = String(a?._id || "");
        const bid = String(b?._id || "");
        return bid.localeCompare(aid);
      });

      const picked = new Set();
      const merged = [];
      for (const d of docs) {
        const t = d?.documentType;
        if (singleInstanceTypes.has(t)) {
          if (picked.has(t)) continue;
          picked.add(t);
        }
        merged.push(d);
      }
      client.documents = merged;
    }

    const safeClient = redactSensitiveClientData(client, user);
    const compactClient =
      viewMode === "audit"
        ? {
            ...safeClient,
            productionFacility: safeClient?.productionFacility
              ? {
                  ...safeClient.productionFacility,
                  cteDetailsList: Array.isArray(
                    safeClient.productionFacility.cteDetailsList,
                  )
                    ? safeClient.productionFacility.cteDetailsList.map(
                        (item) => ({
                          ...item,
                          productComplianceRows: [],
                          productComponentDetails: [],
                          productSupplierCompliance: [],
                          productRecycledQuantity: [],
                        }),
                      )
                    : [],
                  ctoDetailsList: Array.isArray(
                    safeClient.productionFacility.ctoDetailsList,
                  )
                    ? safeClient.productionFacility.ctoDetailsList.map(
                        (item) => ({
                          ...item,
                          productComplianceRows: [],
                          productComponentDetails: [],
                          productSupplierCompliance: [],
                          productRecycledQuantity: [],
                        }),
                      )
                    : [],
                }
              : safeClient.productionFacility,
          }
        : safeClient;
    const workflow = buildClientWorkflowSnapshot(client);

    return res.status(200).json({
      message: "Client details fetched successfully",
      error: false,
      success: true,
      data: {
        ...compactClient,
        workflow,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const updateClientController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const updateData = { ...(req.body || {}) };
    if (
      updateData.financialYear === undefined &&
      updateData.financial_year !== undefined
    ) {
      updateData.financialYear = updateData.financial_year;
      delete updateData.financial_year;
    }
    if (
      updateData.financialYear === undefined &&
      updateData.financialyear !== undefined
    ) {
      updateData.financialYear = updateData.financialyear;
      delete updateData.financialyear;
    }
    if (updateData.financialYear !== undefined) {
      updateData.financialYear = updateData.financialYear
        ? String(updateData.financialYear)
        : "";
    }
    const statusChangeReason = updateData.statusChangeReason || "";
    delete updateData.statusChangeReason;
    delete updateData.statusHistory;
    const businessReadyUpdateData = normalizeClientBusinessFields(updateData);
    const validationErrors =
      getClientBusinessValidationErrors(businessReadyUpdateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors[0],
        error: true,
        success: false,
      });
    }

    // Check permissions first
    const user =
      req.authUser ||
      (await UserModel.findById(req.userId)
        .populate("role")
        .populate("linkedClient", "clientName tradeName companyGroupName"));
    const isUserAdmin = isAdminRole(getRoleName(user));

    let clientToCheck = await ClientModel.findById(clientId);
    let Model = ClientModel;
    if (!clientToCheck) {
      clientToCheck = await PWPModel.findById(clientId);
      Model = PWPModel;
    }

    if (!clientToCheck) {
      return res.status(404).json({
        message: "Client not found",
        error: true,
        success: false,
      });
    }

    if (!isUserAdmin && !canUserAccessClient(user, clientToCheck)) {
      return res.status(403).json({
        message: "Access denied. You are not assigned to this client.",
        error: true,
        success: false,
      });
    }

    const duplicateRecord = await findDuplicateIdentifierRecord({
      pan: businessReadyUpdateData.companyDetails?.pan,
      cin: businessReadyUpdateData.companyDetails?.cin,
      excludeId: clientId,
    });
    if (duplicateRecord) {
      return res.status(409).json({
        message: `${duplicateRecord.field} already exists for '${duplicateRecord.record.clientName}'`,
        error: true,
        success: false,
      });
    }

    const requestedStatus = businessReadyUpdateData.clientStatus;
    delete businessReadyUpdateData.clientStatus;

    // Remove undefined keys to prevent Mongoose from unsetting fields
    Object.keys(businessReadyUpdateData).forEach((key) => {
      if (businessReadyUpdateData[key] === undefined) {
        delete businessReadyUpdateData[key];
      }
    });

    clientToCheck.set(businessReadyUpdateData);

    let statusTransition = null;
    if (requestedStatus !== undefined) {
      try {
        statusTransition = applyClientStatusTransition({
          client: clientToCheck,
          targetStatus: requestedStatus,
          changedBy: req.userId,
          reason: statusChangeReason,
        });
      } catch (error) {
        return res.status(400).json({
          message: error.message,
          error: true,
          success: false,
        });
      }
    }

    const client = await clientToCheck.save();

    await invalidateClientStatsCache();
    if (statusTransition?.changed) {
      await recordClientAuditLog({
        actorId: req.userId,
        clientId,
        module: "client-lifecycle",
        action: "transition",
        message: `Client moved from ${statusTransition.from} to ${statusTransition.to}`,
        metadata: {
          from: statusTransition.from,
          to: statusTransition.to,
          reason: statusChangeReason,
        },
      });
    }

    return res.status(200).json({
      message: "Client updated successfully",
      error: false,
      success: true,
      data: client,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const deleteClientController = async (req, res) => {
  try {
    const { clientId } = req.params;

    let client = await ClientModel.findByIdAndDelete(clientId);
    if (!client) {
      client = await PWPModel.findByIdAndDelete(clientId);
    }

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
        error: true,
        success: false,
      });
    }

    const emitter = req.app.get("realtimeEmitter");
    if (emitter && client?.productionFacility) {
      const { cteDetailsList = [], ctoDetailsList = [] } =
        client.productionFacility || {};
      cteDetailsList.forEach((item) => {
        if (item && item._id) {
          emitter.emit("markingLabellingUpdate", {
            clientId,
            type: "CTE",
            itemId: item._id,
            operation: "delete",
            source: "clientDelete",
          });
        }
      });
      ctoDetailsList.forEach((item) => {
        if (item && item._id) {
          emitter.emit("markingLabellingUpdate", {
            clientId,
            type: "CTO",
            itemId: item._id,
            operation: "delete",
            source: "clientDelete",
          });
        }
      });
    }

    await invalidateClientStatsCache();
    await CacheService.invalidateCache(clientId);

    return res.status(200).json({
      message: "Client deleted successfully",
      error: false,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const assignClientController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { assignedTo, assignedManager, auditStartDate, auditEndDate } =
      req.body;

    let client = await ClientModel.findByIdAndUpdate(
      clientId,
      { assignedTo, assignedManager, auditStartDate, auditEndDate },
      { new: true },
    )
      .populate("assignedTo", "name email")
      .populate("assignedManager", "name email");

    if (!client) {
      client = await PWPModel.findByIdAndUpdate(
        clientId,
        { assignedTo, assignedManager, auditStartDate, auditEndDate },
        { new: true },
      )
        .populate("assignedTo", "name email")
        .populate("assignedManager", "name email");
    }

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
        error: true,
        success: false,
      });
    }

    await invalidateClientStatsCache();

    return res.status(200).json({
      message: "Client assigned successfully",
      error: false,
      success: true,
      data: client,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getClientStatsController = async (req, res) => {
  try {
    const user =
      req.authUser ||
      (await UserModel.findById(req.userId)
        .populate("role")
        .populate("linkedClient", "clientName tradeName companyGroupName"));
    const roleName = getRoleName(user);
    const cacheKey = getClientStatsCacheKey(req.userId, roleName);
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    const isUserAdmin = isAdminRole(roleName);

    let clientBaseQuery = {};
    let pwpBaseQuery = {};

    if (!isUserAdmin) {
      if (isClientRole(roleName)) {
        clientBaseQuery =
          user?.linkedClientModel === "Client"
            ? { _id: user.linkedClient }
            : { _id: null };
        pwpBaseQuery =
          user?.linkedClientModel === "PWP"
            ? { _id: user.linkedClient }
            : { _id: null };
      } else {
        clientBaseQuery = {
          $or: [{ assignedTo: req.userId }, { assignedManager: req.userId }],
        };
        pwpBaseQuery = { ...clientBaseQuery };
      }
    }

    const auditStartedElemMatch = {
      $or: [
        { completedSteps: { $exists: true, $ne: [] } },
        { "verification.status": { $exists: true, $ne: "" } },
        { "verification.verifiedAt": { $exists: true } },
        { "verification.remark": { $exists: true, $ne: "" } },
        { "verification.document": { $exists: true, $ne: "" } },
      ],
    };

    const getStats = async (Model, baseQuery) => {
      const total = await Model.countDocuments(baseQuery);
      const pending = await Model.countDocuments({
        ...baseQuery,
        status: "Pending",
      });
      const auditStarted = await Model.countDocuments({
        ...baseQuery,
        $or: [
          {
            "productionFacility.cteDetailsList": {
              $elemMatch: auditStartedElemMatch,
            },
          },
          {
            "productionFacility.ctoDetailsList": {
              $elemMatch: auditStartedElemMatch,
            },
          },
        ],
      });
      const completed = await Model.countDocuments({
        ...baseQuery,
        status: "Completed",
      });
      const onHold = await Model.countDocuments({
        ...baseQuery,
        status: "On Hold",
      });

      const pipeline = [];
      if (baseQuery && Object.keys(baseQuery).length > 0) {
        pipeline.push({ $match: baseQuery });
      }
      pipeline.push({
        $group: {
          _id: "$entityType",
          count: { $sum: 1 },
        },
      });
      const entityStats = await Model.aggregate(pipeline);
      return { total, pending, auditStarted, completed, onHold, entityStats };
    };

    const stats1 = await getStats(ClientModel, clientBaseQuery);
    const stats2 = await getStats(PWPModel, pwpBaseQuery);

    const entityTypeMap = new Map();
    [...stats1.entityStats, ...stats2.entityStats].forEach((item) => {
      const current = entityTypeMap.get(item._id) || 0;
      entityTypeMap.set(item._id, current + item.count);
    });
    const entityTypeStats = Array.from(entityTypeMap.entries()).map(
      ([k, v]) => ({ _id: k, count: v }),
    );

    const payload = {
      message: "Client statistics fetched successfully",
      error: false,
      success: true,
      data: {
        totalClients: stats1.total + stats2.total,
        statusBreakdown: {
          pending: stats1.pending + stats2.pending,
          inProgress: stats1.auditStarted + stats2.auditStarted,
          completed: stats1.completed + stats2.completed,
          onHold: stats1.onHold + stats2.onHold,
        },
        entityTypeBreakdown: entityTypeStats,
      },
    };
    await CacheService.setCache(cacheKey, payload, CacheService.ttl.dashboard);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const validateClientController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { validationStatus, validationDetails, verifiedItemIds } = req.body;
    const userId = req.userId;

    const client = await ClientService.findClientOrPwp(clientId);

    // Update top-level validation with merge to preserve existing details (e.g., engagementLetterContent)
    client.validationStatus = validationStatus;
    const existingDetails = client.validationDetails || {};
    client.validationDetails = {
      ...existingDetails,
      ...validationDetails,
      validatedBy: userId,
      validatedAt: new Date(),
    };

    // Update item-level verification if IDs provided
    if (verifiedItemIds && Array.isArray(verifiedItemIds)) {
      const updateItem = (item) => {
        if (verifiedItemIds.includes(item._id.toString())) {
          if (!item.verification) item.verification = {};

          // Only update if not already verified or to refresh it
          item.verification.status = "Verified";
          item.verification.verifiedBy = userId;
          item.verification.verifiedAt = new Date();
        }
      };

      if (client.productionFacility?.cteDetailsList) {
        client.productionFacility.cteDetailsList.forEach(updateItem);
      }
      if (client.productionFacility?.ctoDetailsList) {
        client.productionFacility.ctoDetailsList.forEach(updateItem);
      }
    }

    let statusTransition = null;
    if (client.clientStatus === "SUBMITTED") {
      try {
        statusTransition = applyClientStatusTransition({
          client,
          targetStatus: "PRE_VALIDATION",
          changedBy: userId,
          reason: "Validation review started",
        });
      } catch (error) {
        return res.status(400).json({
          message: error.message,
          error: true,
          success: false,
        });
      }
    }

    await client.save();
    await invalidateClientStatsCache();
    await recordClientAuditLog({
      actorId: userId,
      clientId,
      module: "client-validation",
      action: "update",
      message: "Client validation updated",
      metadata: {
        validationStatus,
        verifiedItemCount: Array.isArray(verifiedItemIds)
          ? verifiedItemIds.length
          : 0,
        lifecycleStatus: client.clientStatus,
      },
    });
    if (statusTransition?.changed) {
      await recordClientAuditLog({
        actorId: userId,
        clientId,
        module: "client-lifecycle",
        action: "transition",
        message: `Client moved from ${statusTransition.from} to ${statusTransition.to}`,
        metadata: {
          from: statusTransition.from,
          to: statusTransition.to,
          reason: "Validation review started",
        },
      });
    }

    return res.status(200).json({
      message: "Client validation status updated successfully",
      error: false,
      success: true,
      data: client,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const importProcurementController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded", error: true, success: false });
    }

    const clientExists = await ClientService.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      return res.status(404).json({
        message: `${type} detail not found`,
        error: true,
        success: false,
      });
    }

    const fileBuffer = req.file?.buffer || fs.readFileSync(req.file.path);
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {
        void 0;
      }
    }

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const headerMap = {
      "registration type": "registrationType",
      "entity type": "entityType",
      "supplier code": "supplierCode",
      "sku code": "skuCode",
      "component code": "componentCode",
      "name of entity": "nameOfEntity",
      state: "state",
      address: "address",
      "mobile number": "mobileNumber",
      "plastic material type": "plasticMaterialType",
      "category of plastic": "categoryOfPlastic",
      "financial year": "financialYear",
      "date of invoice": "dateOfInvoice",
      "quantity (tpa)": "quantityTPA",
      "recycled plastic %": "recycledPlasticPercent",
      "gst number": "gstNumber",
      "gst paid": "gstPaid",
      "invoice number": "invoiceNumber",
      "other plastic material type": "otherPlasticMaterialType",
      "cat-1 container capacity": "cat1ContainerCapacity",
      "bank account no": "bankAccountNo",
      "ifsc code": "ifscCode",
    };

    const procurementData = rawData
      .map((row) => {
        const newRow = {
          client: clientId,
          type,
          itemId,
          importedBy: req.userId,
        };
        for (const [k, v] of Object.entries(row || {})) {
          const normalizedKey = (k ?? "").toString().trim().toLowerCase();
          const schemaField = headerMap[normalizedKey];
          if (!schemaField) continue;
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            newRow[schemaField] = String(v).trim();
          }
        }
        return newRow;
      })
      .filter((r) => Object.keys(r).length > 4); // Must have at least one data field besides metadata

    if (procurementData.length > 0) {
      await ProcurementModel.insertMany(procurementData);
    }

    const allData = await ProcurementModel.find({
      client: clientId,
      type,
      itemId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Procurement data imported successfully",
      error: false,
      success: true,
      data: allData,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getProcurementController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const data = await ProcurementModel.find({
      client: clientId,
      type,
      itemId,
    }).sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Procurement data fetched",
      error: false,
      success: true,
      data: data || [],
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const saveSkuComplianceController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const skuData = req.body;

    if (!clientId) {
      return res.status(400).json({
        message: "Client ID is required",
        error: true,
        success: false,
      });
    }

    const result = await SkuComplianceModel.findOneAndUpdate(
      { client: clientId, skuCode: skuData.skuCode },
      {
        ...skuData,
        client: clientId,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      message: "SKU Compliance data saved successfully",
      data: result,
      success: true,
      error: false,
    });
  } catch (error) {
    logger.error({ err: error }, "Save SKU Compliance Error");
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
};

export const getSkuComplianceController = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        message: "Client ID is required",
        error: true,
        success: false,
      });
    }

    const data = await SkuComplianceModel.find({ client: clientId });

    return res.status(200).json({
      message: "SKU Compliance data fetched successfully",
      data: data,
      success: true,
      error: false,
    });
  } catch (error) {
    logger.error({ err: error }, "Get SKU Compliance Error");
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
};

export const uploadSkuComplianceRowController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
        error: true,
        success: false,
      });
    }

    const uploadedUrls = {};

    if (req.files["markingImage"]) {
      const urls = [];
      for (const file of req.files["markingImage"]) {
        const url = await uploadToCloudinary(
          file.path,
          "eprkavach/sku-compliance",
        );
        urls.push(url);
        fs.unlink(file.path, () => {});
      }
      uploadedUrls.markingImage = urls;
    }

    return res.status(200).json({
      message: "Images uploaded successfully",
      data: uploadedUrls,
      success: true,
      error: false,
    });
  } catch (error) {
    logger.error({ err: error }, "Upload SKU Compliance Images Error");
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
};
