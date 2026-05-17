import ClientModel from "../models/client.model.js";
import PWPModel from "../models/pwp.model.js";
import ProductComplianceModel from "../models/productCompliance.model.js";
import SupplierCtoCheckModel from "../models/supplierCtoCheck.model.js";
import UserModel from "../models/user.model.js";
import MonthlyProcurementModel from "../models/monthlyProcurement.model.js";
import NotificationModel from "../models/notification.model.js";
import path from "path";
import fs from "fs";
import ApiError from "../utils/ApiError.js";
import sendEmail from "../config/sendEmail.js";
import UploadService from "./upload.service.js";
import HistoryService from "./history.service.js";
import {
  isAbsoluteUrl,
  isCloudinaryAssetRef,
  isLocalUploadPath,
} from "../utils/fileSecurity.js";
import {
  buildSupplierStatusByName,
  mergeSupplierCtoRows,
  normalizeSupplierCtoRow,
} from "../utils/supplierCto.js";
import logger from "../utils/logger.js";
import AuditLogService from "./auditLog.service.js";
import {
  applyProductMetadataMaps,
  buildComponentKey,
  buildProductMetadataMaps,
  buildProductRowKey,
  buildRowLookupMap,
  buildSkuKey,
  buildSupplierKey,
  canonicalizeProductRows,
  choosePreferredNonEmptyValue,
} from "../utils/complianceData.js";

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeInvoiceDateOrNull = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
    );
  }

  const text = String(value).trim();
  if (!text || text.toLowerCase() === "not applicable") return null;

  const dayFirstMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

const toChangeText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
};

const humanizeField = (field) =>
  field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

const syncComplianceArtifactsFromProductRows = async (
  doc,
  monthlyProcurementDoc = null,
) => {
  const canonicalRows = canonicalizeProductRows(doc.rows || []);
  const metadataMaps = buildProductMetadataMaps(canonicalRows);

  doc.rows = canonicalRows;
  doc.componentDetails = applyProductMetadataMaps(
    doc.componentDetails || [],
    metadataMaps,
  );
  doc.supplierCompliance = applyProductMetadataMaps(
    doc.supplierCompliance || [],
    metadataMaps,
  );
  doc.recycledQuantityUsed = applyProductMetadataMaps(
    doc.recycledQuantityUsed || [],
    metadataMaps,
  );

  if (monthlyProcurementDoc) {
    monthlyProcurementDoc.rows = applyProductMetadataMaps(
      monthlyProcurementDoc.rows || [],
      metadataMaps,
    );
  }

  return { canonicalRows, metadataMaps };
};

const writeAuditLog = async ({
  actorId,
  clientId,
  type,
  itemId,
  module,
  action,
  historyEntries = [],
  metadata = {},
}) =>
  AuditLogService.record({
    actorId,
    module,
    action,
    clientId,
    entityType: "compliance",
    entityId: itemId,
    type,
    itemId,
    message: `${module} ${action}`,
    changeCount: historyEntries.length,
    changes: historyEntries,
    metadata,
  });

const toPlainRows = (rows = []) =>
  Array.isArray(rows)
    ? rows.map((entry) =>
        entry && typeof entry.toObject === "function" ? entry.toObject() : entry || {},
      )
    : [];

const startOfDay = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();

const dedupeEmails = (values = []) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeEmail).filter(Boolean))];

const buildExpiryDateKey = (value) => {
  const date = startOfDay(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

const buildClientDashboardLink = (clientId) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl.replace(/\/$/, "")}/dashboard/client/${clientId}`;
};

const buildSupplierCtoExpiredMailHtml = ({
  clientName = "",
  plantName = "",
  rows = [],
  link = "#",
} = {}) => {
  const htmlRows = (Array.isArray(rows) ? rows : [])
    .map(
      (row) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${row.supplierName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${row.ctoPlantName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${row.ctoPlantNo || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${buildExpiryDateKey(row.ctoValidUpto) || "-"}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin-top:0;color:#b91c1c;">Supplier CTO Expired Alert</h2>
      <p>Supplier CTO validity is already expired for <strong>${clientName || "-"}</strong>.</p>
      <p><strong>Plant:</strong> ${plantName || "-"}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Supplier</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">CTO Plant Name</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">CTO Plant No</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">CTO Valid Upto</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
      <p style="margin:16px 0 0;">
        <a href="${link}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;">
          Open Client Record
        </a>
      </p>
    </div>
  `;
};

const sendImmediateExpiredSupplierCtoMail = async ({
  clientDoc,
  supplierCtoDoc,
  type,
} = {}) => {
  if (!clientDoc || !supplierCtoDoc || type !== "CTO") return;

  const today = startOfDay(new Date());
  if (!today) return;

  const expiredRows = (Array.isArray(supplierCtoDoc.rows) ? supplierCtoDoc.rows : []).filter(
    (row) => {
      const ctoAvailability = (row?.ctoAvailability || "").toString().trim();
      const expiryDate = startOfDay(row?.ctoValidUpto);
      if (!row?.supplierName || ctoAvailability === "Not Available" || !expiryDate) {
        return false;
      }
      if (expiryDate.getTime() >= today.getTime()) return false;
      return buildExpiryDateKey(row?.ctoExpiryAlertSentFor) !== buildExpiryDateKey(expiryDate);
    },
  );

  if (!expiredRows.length) return;

  const linkedClientModel = clientDoc.constructor?.modelName === "PWP" ? "PWP" : "Client";
  const userIds = [clientDoc.createdBy, clientDoc.assignedTo, clientDoc.assignedManager]
    .map((value) => (value ? String(value) : ""))
    .filter(Boolean);

  const [linkedUsers, internalUsers] = await Promise.all([
    UserModel.find({
      linkedClient: clientDoc._id,
      linkedClientModel,
      email: { $exists: true, $ne: "" },
    })
      .select("email")
      .lean(),
    userIds.length
      ? UserModel.find({
          _id: { $in: userIds },
          email: { $exists: true, $ne: "" },
        })
          .select("email")
          .lean()
      : Promise.resolve([]),
  ]);

  const toRecipients = dedupeEmails([
    ...linkedUsers.map((user) => user?.email),
    ...internalUsers.map((user) => user?.email),
    clientDoc.authorisedPerson?.email,
    clientDoc.coordinatingPerson?.email,
  ]);
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || process.env.MAIL_USER);
  const ccRecipients = dedupeEmails([adminEmail]).filter(
    (email) => !toRecipients.includes(email),
  );

  if (!toRecipients.length && !ccRecipients.length) {
    logger.warn(
      { clientId: clientDoc._id, type },
      "Skipping immediate expired supplier CTO mail because no recipients are configured",
    );
    return;
  }

  await sendEmail({
    to: (toRecipients.length ? toRecipients : ccRecipients).join(","),
    cc: toRecipients.length ? ccRecipients.join(",") || undefined : undefined,
    subject: `Supplier CTO expired alert - ${clientDoc.clientName || "Client"}`,
    html: buildSupplierCtoExpiredMailHtml({
      clientName: clientDoc.clientName || "",
      plantName: supplierCtoDoc.plantName || "",
      rows: expiredRows,
      link: buildClientDashboardLink(clientDoc._id),
    }),
  });

  const sentAt = new Date();
  expiredRows.forEach((row) => {
    row.ctoExpiryAlertSentAt = sentAt;
    row.ctoExpiryAlertSentFor = startOfDay(row.ctoValidUpto);
  });
  supplierCtoDoc.markModified("rows");
  await supplierCtoDoc.save();
};

class ClientService {
  /**
   * Upload a document for a client
   * @param {string} clientId
   * @param {object} file - The file object from multer
   * @param {object} metadata - { documentType, documentName, certificateNumber, certificateDate }
   */
  static async uploadDocument(clientId, file, metadata) {
    const { documentType, documentName, certificateNumber, certificateDate } =
      metadata;

    // 1. Verify Client Exists
    let Model = ClientModel;
    let clientExists = await ClientModel.exists({ _id: clientId });
    if (!clientExists) {
      Model = PWPModel;
      clientExists = await PWPModel.exists({ _id: clientId });
    }
    if (!clientExists) {
      throw new ApiError(404, "Client not found");
    }

    // 2. Prepare Upload
    const singleInstanceTypes = [
      "PAN",
      "GST",
      "CIN",
      "Factory License",
      "EPR Certificate",
      "IEC Certificate",
      "DIC/DCSSI Certificate",
      "E-waste Registration",
      "EEE Import Authorization",
      "Signed Document",
    ];

    let fileUrl = "";
    let keepLocalFile = false;
    try {
      const stableId = `doc_${clientId}_${documentType}`.replace(
        /[^\w\-\/]+/g,
        "_",
      );
      const uniqueId = `doc_${clientId}_${documentType}_${Date.now()}`.replace(
        /[^\w\-\/]+/g,
        "_",
      );
      const publicId = singleInstanceTypes.includes(documentType)
        ? stableId
        : uniqueId;

      fileUrl = await UploadService.storeConfidentialAsset(file, {
        folder: "eprkavach/documents",
        filenameOverride: publicId,
        originalFilename: file.originalname,
      });
    } catch (err) {
      logger.error({ err, clientId, documentType }, "Cloudinary upload failed, falling back to local");
      // Fallback to local path
      fileUrl = path.join("uploads", file.filename).replace(/\\/g, "/");
      keepLocalFile = true;
    } finally {
      if (file.path && !keepLocalFile) {
        fs.unlink(file.path, () => {});
      }
    }

    // 3. Prepare Doc Entry
    const newDoc = {
      documentType,
      documentName: documentName || documentType,
      certificateNumber,
      certificateDate: certificateDate || null,
      filePath: fileUrl,
      uploadedAt: new Date(),
    };

    let updatedClient;

    // 4. Update Database
    if (singleInstanceTypes.includes(documentType)) {
      // Try to update existing subdocument
      updatedClient = await Model.findOneAndUpdate(
        { _id: clientId, "documents.documentType": documentType },
        {
          $set: {
            "documents.$.documentName": newDoc.documentName,
            "documents.$.certificateNumber": newDoc.certificateNumber,
            "documents.$.certificateDate": newDoc.certificateDate,
            "documents.$.filePath": newDoc.filePath,
            "documents.$.uploadedAt": newDoc.uploadedAt,
          },
        },
        { new: true },
      );

      if (!updatedClient) {
        // If not found, push new
        updatedClient = await Model.findByIdAndUpdate(
          clientId,
          { $push: { documents: newDoc } },
          { new: true },
        );
      }
    } else {
      // Always push for multiple-instance types
      updatedClient = await Model.findByIdAndUpdate(
        clientId,
        { $push: { documents: newDoc } },
        { new: true },
      );
    }

    return {
      client: updatedClient,
      filePath: fileUrl,
      newDoc,
    };
  }
  /**
   * Find a client or PWP by ID
   * @param {string} clientId
   * @returns {Promise<import('mongoose').Document>}
   * @throws {Error} if not found
   */
  static async findClientOrPwp(clientId) {
    let client = await ClientModel.findById(clientId);
    if (!client) {
      client = await PWPModel.findById(clientId);
    }
    if (!client) {
      throw new ApiError(404, "Client not found");
    }
    return client;
  }

  /**
   * Delete a document for a client
   * @param {string} clientId
   * @param {string} docId
   */
  static async deleteDocument(clientId, docId) {
    // 1. Verify Client Exists
    let Model = ClientModel;
    let clientExists = await ClientModel.exists({ _id: clientId });
    if (!clientExists) {
      Model = PWPModel;
      clientExists = await PWPModel.exists({ _id: clientId });
    }
    if (!clientExists) {
      throw new ApiError(404, "Client not found");
    }

    // 2. Find Document
    const clientWithDoc = await Model.findOne(
      { _id: clientId, "documents._id": docId },
      { "documents.$": 1 },
    );

    if (
      !clientWithDoc ||
      !clientWithDoc.documents ||
      clientWithDoc.documents.length === 0
    ) {
      throw new ApiError(404, "Document not found");
    }

    const target = clientWithDoc.documents[0];
    const filePath = typeof target.filePath === "string" ? target.filePath : "";

    // 3. Remove from Database
    await Model.findByIdAndUpdate(clientId, {
      $pull: { documents: { _id: docId } },
    });

    // 4. Clean up Local File (if applicable)
    const normalized = (filePath || "").replace(/\\/g, "/");
    const rel = normalized.startsWith("/") ? normalized.slice(1) : normalized;

    if (
      !isCloudinaryAssetRef(filePath) &&
      !isAbsoluteUrl(filePath) &&
      isLocalUploadPath(rel)
    ) {
      const abs = path.join(process.cwd(), rel);
      fs.unlink(abs, () => {});
    }

    return {
      deletedDocument: {
        _id: target?._id || null,
        documentType: target?.documentType || "",
        documentName: target?.documentName || "",
        certificateNumber: target?.certificateNumber || "",
        filePath,
      },
    };
  }

  /**
   * Save Product Supplier Compliance
   * @param {string} clientId
   * @param {string} type
   * @param {string} itemId
   * @param {Array|object} rows
   * @param {number} rowIndex
   * @param {object} row
   * @param {string} userId
   * @param {object} emitter
   */
  static async saveSupplierCompliance(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    emitter,
    plantName,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }

    const sanitize = (r, fallbackIndex = null) => {
      const rawFoodGrade = (r.foodGrade ?? r.foodgrade ?? "") || "";
      const foodGradeText = (rawFoodGrade ?? "").toString().trim();
      const foodGradeLower = foodGradeText.toLowerCase();
      let foodGrade = foodGradeText;
      if (foodGradeLower === "yes" || foodGradeLower === "food")
        foodGrade = "Food";
      else if (
        foodGradeLower === "no" ||
        foodGradeLower === "non food" ||
        foodGradeLower === "non-food" ||
        foodGradeLower === "nonfood"
      )
        foodGrade = "Non Food";

      const nextRow = {
        rowKey: r.rowKey || "",
        componentKey: r.componentKey || "",
        supplierKey: r.supplierKey || "",
        systemCode: r.systemCode || "",
        componentCode: r.componentCode || "",
        componentDescription: r.componentDescription || "",
        supplierName: r.supplierName || "",
        supplierState: r.supplierState || "",
        supplierType: r.supplierType || "",
        supplierStatus: r.supplierStatus || "",
        applicationType: r.applicationType || "",
        foodGrade,
        eprCertificateNumber: r.eprCertificateNumber || "",
        fssaiLicNo: r.fssaiLicNo || "",
        fssaiValidUpto: toDateOrNull(r.fssaiValidUpto),
        ctoPlantNo: r.ctoPlantNo || "",
        ctoPlantName: r.ctoPlantName || "",
        ctoStartDate: toDateOrNull(r.ctoStartDate),
        ctoValidUpto: toDateOrNull(r.ctoValidUpto),
        ctoCcaDocument:
          typeof r.ctoCcaDocument === "string" ? r.ctoCcaDocument : "",
      };
      nextRow.rowKey = nextRow.rowKey || buildProductRowKey(nextRow, fallbackIndex);
      nextRow.componentKey = nextRow.componentKey || buildComponentKey(nextRow);
      nextRow.supplierKey = nextRow.supplierKey || buildSupplierKey(nextRow);
      return nextRow;
    };

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
    }
    if (typeof plantName !== "undefined") doc.plantName = plantName || "";
    const historyEntries = [];

    const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: tableName,
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      let single = row;
      if (typeof single === "string") {
        try {
          single = JSON.parse(single);
        } catch (_) {
          single = {};
        }
      }
      single = sanitize(single, rowIndex);
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0) {
        throw new ApiError(400, "Invalid rowIndex");
      }
      const beforeRow = doc.supplierCompliance?.[idx] || {};
      if (idx >= doc.supplierCompliance.length) {
        doc.supplierCompliance.push(single);
      } else {
        doc.supplierCompliance.set(idx, single);
      }
      pushDiffs("Supplier Compliance", idx + 1, beforeRow, single, [
        "systemCode",
        "componentCode",
        "componentDescription",
        "supplierName",
        "supplierState",
        "supplierType",
        "supplierStatus",
        "applicationType",
        "foodGrade",
        "eprCertificateNumber",
        "fssaiLicNo",
        "fssaiValidUpto",
        "ctoPlantNo",
        "ctoPlantName",
        "ctoStartDate",
        "ctoValidUpto",
        "ctoCcaDocument",
      ]);
      doc.markModified("supplierCompliance");
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];
      const beforeRows = Array.isArray(doc.supplierCompliance)
        ? doc.supplierCompliance
        : [];
      const afterRows = parsed.map((entry, index) => sanitize(entry, index));
      const maxLen = Math.max(beforeRows.length, afterRows.length);
      for (let i = 0; i < maxLen; i += 1) {
        pushDiffs(
          "Supplier Compliance",
          i + 1,
          beforeRows[i] || {},
          afterRows[i] || {},
          [
            "systemCode",
            "componentCode",
            "componentDescription",
            "supplierName",
            "supplierState",
            "supplierType",
            "supplierStatus",
            "applicationType",
            "foodGrade",
            "eprCertificateNumber",
            "fssaiLicNo",
            "fssaiValidUpto",
            "ctoPlantNo",
            "ctoPlantName",
            "ctoStartDate",
            "ctoValidUpto",
            "ctoCcaDocument",
          ],
        );
      }
      doc.supplierCompliance = afterRows;
      doc.markModified("supplierCompliance");
    }

    doc.updatedBy = userId;
    await syncComplianceArtifactsFromProductRows(doc);
    await doc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "supplier-compliance",
      action: "save",
      historyEntries,
      metadata: {
        plantName: doc.plantName || "",
        rowCount: doc.supplierCompliance.length,
      },
    });

    if (emitter) {
      emitter.emit("markingLabellingUpdate", {
        clientId,
        type,
        itemId,
        operation: "upsert",
        source: "productSupplierCompliance",
      });
    }

    return doc.supplierCompliance;
  }

  static async getSupplierCtoChecks(clientId, type, itemId) {
    const clientExists = await this.findClientOrPwp(clientId);
    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }

    const doc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    }).lean();
    const supplierCtoDoc = await SupplierCtoCheckModel.findOne({
      client: clientId,
      type,
      itemId,
    }).lean();
    const supplierStatusByName = buildSupplierStatusByName(
      doc?.supplierCompliance || [],
    );

    return mergeSupplierCtoRows({
      supplierNames: Array.from(supplierStatusByName.keys()),
      persistedRows: supplierCtoDoc?.rows || [],
      supplierStatusByName,
      normalizeDateValue: (value) => value || null,
    });
  }

  static async saveSupplierCtoChecks(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    emitter,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);
    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }

    const isRowEmpty = (r) => {
      const rr = r || {};
      const supplierName = (rr.supplierName || "").toString().trim();
      const ctoAvailability = (rr.ctoAvailability || "").toString().trim();
      const ctoPlantNo = (rr.ctoPlantNo || "").toString().trim();
      const ctoPlantName = (rr.ctoPlantName || "").toString().trim();
      const ctoStartDate = toChangeText(rr.ctoStartDate).trim();
      const ctoValidUpto = toChangeText(rr.ctoValidUpto).trim();
      const ctoCcaDocument = (rr.ctoCcaDocument || "").toString().trim();
      return (
        !supplierName &&
        !ctoAvailability &&
        !ctoPlantNo &&
        !ctoPlantName &&
        !ctoStartDate &&
        !ctoValidUpto &&
        !ctoCcaDocument
      );
    };

    const hasRowData = (r) => {
      const rr = r || {};
      const ctoPlantNo = (rr.ctoPlantNo || "").toString().trim();
      const ctoPlantName = (rr.ctoPlantName || "").toString().trim();
      const ctoStartDate = toChangeText(rr.ctoStartDate).trim();
      const ctoValidUpto = toChangeText(rr.ctoValidUpto).trim();
      const ctoCcaDocument = (rr.ctoCcaDocument || "").toString().trim();
      return !!(
        ctoPlantNo ||
        ctoPlantName ||
        ctoStartDate ||
        ctoValidUpto ||
        ctoCcaDocument
      );
    };

    const productComplianceDoc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    if (!productComplianceDoc) {
      throw new ApiError(404, "Product compliance record not found");
    }

    const supplierStatusByName = buildSupplierStatusByName(
      productComplianceDoc?.supplierCompliance || [],
    );

    const sanitize = (r) => {
      const supplierName = (r?.supplierName || "").toString().trim();
      return normalizeSupplierCtoRow(r, {
        supplierStatus: supplierStatusByName.get(supplierName) || "",
        normalizeDateValue: toDateOrNull,
      });
    };

    const historyEntries = [];
    const pushDiffs = (rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: "Supplier CTO Check",
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };

    const fields = [
      "supplierName",
      "registrationStatus",
      "ctoAvailability",
      "ctoPlantNo",
      "ctoPlantName",
      "ctoStartDate",
      "ctoValidUpto",
      "ctoCcaDocument",
    ];
    const supplierCtoDoc =
      (await SupplierCtoCheckModel.findOne({
        client: clientId,
        type,
        itemId,
      })) ||
      new SupplierCtoCheckModel({
        client: clientId,
        type,
        itemId,
        plantName: productComplianceDoc.plantName || "",
        rows: [],
      });

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      let single = row;
      if (typeof single === "string") {
        try {
          single = JSON.parse(single);
        } catch (_) {
          single = {};
        }
      }
      single = sanitize(single);
      if (!single.supplierName) {
        if (hasRowData(single)) {
          throw new ApiError(400, "Supplier Name is required");
        }
        throw new ApiError(400, "Supplier Name is required");
      }
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0)
        throw new ApiError(400, "Invalid rowIndex");

      const beforeRow = supplierCtoDoc.rows?.[idx] || {};
      if (!Array.isArray(supplierCtoDoc.rows)) supplierCtoDoc.rows = [];
      if (idx >= supplierCtoDoc.rows.length) {
        supplierCtoDoc.rows.push(single);
        pushDiffs(idx + 1, {}, single, fields);
      } else {
        supplierCtoDoc.rows.set(idx, single);
        pushDiffs(idx + 1, beforeRow, single, fields);
      }
      supplierCtoDoc.markModified("rows");
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];
      const beforeRows = Array.isArray(supplierCtoDoc.rows)
        ? supplierCtoDoc.rows
        : [];
      const afterRows = parsed
        .map(sanitize)
        .filter((r) => {
          if (isRowEmpty(r)) return false;
          if (!r.supplierName && hasRowData(r))
            throw new ApiError(400, "Supplier Name is required");
          return !!r.supplierName;
        });
      const maxLen = Math.max(beforeRows.length, afterRows.length);
      for (let i = 0; i < maxLen; i += 1) {
        pushDiffs(i + 1, beforeRows[i] || {}, afterRows[i] || {}, fields);
      }
      supplierCtoDoc.rows = afterRows;
      supplierCtoDoc.markModified("rows");
    }

    supplierCtoDoc.updatedBy = userId;
    await supplierCtoDoc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "supplier-cto-checks",
      action: "save",
      historyEntries,
      metadata: {
        plantName: supplierCtoDoc.plantName || productComplianceDoc.plantName || "",
        rowCount: supplierCtoDoc.rows.length,
      },
    });

    if (emitter) {
      emitter.emit("markingLabellingUpdate", {
        clientId,
        type,
        itemId,
        operation: "upsert",
        source: "supplierCtoChecks",
      });
    }

    try {
      await sendImmediateExpiredSupplierCtoMail({
        clientDoc: clientExists,
        supplierCtoDoc,
        type,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          clientId,
          type,
          itemId,
        },
        "Failed to send immediate expired supplier CTO mail after save",
      );
    }

    return mergeSupplierCtoRows({
      supplierNames: Array.from(supplierStatusByName.keys()),
      persistedRows: supplierCtoDoc.rows || [],
      supplierStatusByName,
      normalizeDateValue: (value) => value || null,
    });
  }

  /**
   * Save Product Compliance
   * @param {string} clientId
   * @param {string} type
   * @param {string} itemId
   * @param {Array|object} rows
   * @param {number} rowIndex
   * @param {object} row
   * @param {string} userId
   * @param {object} emitter
   */
  static async saveProductCompliance(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    emitter,
    plantName,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }

    const sanitize = (r, fallbackIndex = null) => {
      const s = {
        rowKey: r.rowKey || "",
        skuKey: r.skuKey || "",
        componentKey: r.componentKey || "",
        supplierKey: r.supplierKey || "",
        generate: r.generate || "No",
        systemCode: r.systemCode || "",
        packagingType: r.packagingType || "",
        clientName: r.clientName || "",
        clientState: r.clientState || "",
        industryCategory: r.industryCategory || "",
        skuCode: r.skuCode || "",
        skuDescription: r.skuDescription || "",
        skuUom: r.skuUom || "",
        productImage: typeof r.productImage === "string" ? r.productImage : "",
        componentCode: r.componentCode || "",
        componentDescription: r.componentDescription || "",
        supplierName: r.supplierName || "",
        supplierState: r.supplierState || "",
        supplierType: r.supplierType || "",
        supplierCategory: r.supplierCategory || "",
        generateSupplierCode: r.generateSupplierCode || "No",
        supplierCode: r.supplierCode || "",
        componentImage:
          typeof r.componentImage === "string" ? r.componentImage : "",
        thickness: r.thickness ? Number(r.thickness) : 0,
        rcPercent: r.rcPercent ? Number(r.rcPercent) : 0,
        auditorRemarks: r.auditorRemarks || "",
        clientRemarks: r.clientRemarks || "",
        componentComplianceStatus:
          r.componentComplianceStatus || r.complianceStatus || "",
        productComplianceStatus: r.productComplianceStatus || "",
        additionalDocument:
          typeof r.additionalDocument === "string" ? r.additionalDocument : "",
        managerRemarks: r.managerRemarks || "",
      };
      s.rowKey = s.rowKey || buildProductRowKey(s, fallbackIndex);
      s.skuKey = s.skuKey || buildSkuKey(s);
      s.componentKey = s.componentKey || buildComponentKey(s);
      s.supplierKey = s.supplierKey || buildSupplierKey(s);
      return s;
    };

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
      });
    }
    if (typeof plantName !== "undefined") doc.plantName = plantName || "";
    const historyEntries = [];

    const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: tableName,
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };

    const normalize = (value) =>
      value === null || value === undefined ? "" : String(value).trim();
    const beforeRows = Array.isArray(doc.rows)
      ? doc.rows.map((entry) =>
          entry && typeof entry.toObject === "function" ? entry.toObject() : entry,
        )
      : [];
    const embeddedRows = Array.isArray(itemFound.productComplianceRows)
      ? itemFound.productComplianceRows.map((entry) =>
          entry && typeof entry.toObject === "function" ? entry.toObject() : entry,
        )
      : [];
    const beforeLookup = buildRowLookupMap(beforeRows);
    const embeddedLookup = buildRowLookupMap(embeddedRows);
    let afterRows = [];
    let changedRemarkRow = null;

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0) {
        throw new ApiError(400, "Invalid rowIndex");
      }

      const incomingSeed = sanitize(row, idx);
      const baseRow =
        beforeLookup.get(incomingSeed.rowKey) ||
        beforeRows[idx] ||
        embeddedLookup.get(incomingSeed.rowKey) ||
        embeddedRows[idx] ||
        {};
      const baseRowObj =
        baseRow && typeof baseRow.toObject === "function"
          ? baseRow.toObject()
          : baseRow;
      const merged = {
        ...baseRowObj,
        ...row,
      };

      const nextRow = sanitize(merged, idx);
      afterRows = beforeRows.length ? [...beforeRows] : [];
      if (idx >= afterRows.length) {
        afterRows.push(nextRow);
      } else {
        afterRows[idx] = nextRow;
      }
      changedRemarkRow = { idx, beforeRow: baseRowObj || {}, tentativeRow: nextRow };
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];

      afterRows = parsed.map((incomingRow, index) => {
        const sanitizedIncoming = sanitize(incomingRow, index);
        const baseRow =
          beforeLookup.get(sanitizedIncoming.rowKey) ||
          embeddedLookup.get(sanitizedIncoming.rowKey) ||
          beforeRows[index] ||
          embeddedRows[index] ||
          {};

        const merged = {};
        const baseObject =
          baseRow && typeof baseRow.toObject === "function"
            ? baseRow.toObject()
            : baseRow;

        const allKeys = new Set([
          ...Object.keys(baseObject || {}),
          ...Object.keys(sanitizedIncoming || {}),
        ]);

        allKeys.forEach((key) => {
          merged[key] = choosePreferredNonEmptyValue(
            sanitizedIncoming[key],
            baseObject?.[key],
          );
        });

        return sanitize(merged, index);
      });
    }

    try {
      afterRows = canonicalizeProductRows(afterRows);
    } catch (error) {
      throw new ApiError(400, error.message);
    }

    const statusBySku = new Map();
    afterRows.forEach((rowEntry) => {
      if (!rowEntry.skuKey || !normalize(rowEntry.productComplianceStatus)) return;
      const currentStatus = statusBySku.get(rowEntry.skuKey);
      const nextStatus = normalize(rowEntry.productComplianceStatus);
      if (currentStatus && currentStatus !== nextStatus) {
        throw new ApiError(
          400,
          `Conflicting product compliance status detected for SKU '${rowEntry.skuCode || "Unknown"}'`,
        );
      }
      statusBySku.set(rowEntry.skuKey, nextStatus);
    });
    afterRows = afterRows.map((rowEntry) => ({
      ...rowEntry,
      productComplianceStatus:
        statusBySku.get(rowEntry.skuKey) || rowEntry.productComplianceStatus || "",
    }));

    const codeMap = new Map();
    for (const rowEntry of afterRows) {
      const componentCode = normalize(rowEntry.componentCode);
      const skuCode = normalize(rowEntry.skuCode);
      const componentDescription = normalize(rowEntry.componentDescription);
      if (!componentCode) continue;

      if (codeMap.has(componentCode)) {
        const existing = codeMap.get(componentCode);
        if (
          existing.skuCode !== skuCode ||
          existing.componentDescription !== componentDescription
        ) {
          throw new ApiError(
            400,
            `Duplicate Component Code '${rowEntry.componentCode}' found with different SKU/Description`,
          );
        }
      } else {
        codeMap.set(componentCode, { skuCode, componentDescription });
      }
    }

    const supplierCodeMap = new Map();
    for (const rowEntry of afterRows) {
      const supplierCode = normalize(rowEntry.supplierCode);
      const supplierName = normalize(rowEntry.supplierName).toLowerCase();
      if (!supplierCode) continue;

      if (
        supplierCodeMap.has(supplierCode) &&
        supplierCodeMap.get(supplierCode) !== supplierName
      ) {
        throw new ApiError(
          400,
          `Supplier Code '${rowEntry.supplierCode}' must be unique or reused only for the same supplier`,
        );
      }

      supplierCodeMap.set(supplierCode, supplierName);
    }

    doc.rows = afterRows;
    await syncComplianceArtifactsFromProductRows(doc);

    const allFields = [
      "generate",
      "systemCode",
      "packagingType",
      "clientName",
      "clientState",
      "industryCategory",
      "skuCode",
      "skuDescription",
      "skuUom",
      "productImage",
      "componentCode",
      "componentDescription",
      "supplierName",
      "supplierState",
      "supplierType",
      "supplierCategory",
      "generateSupplierCode",
      "supplierCode",
      "componentImage",
      "thickness",
      "auditorRemarks",
      "clientRemarks",
      "componentComplianceStatus",
      "productComplianceStatus",
      "managerRemarks",
    ];
    const maxLen = Math.max(beforeRows.length, doc.rows.length);
    for (let i = 0; i < maxLen; i += 1) {
      pushDiffs(
        "Product Compliance",
        i + 1,
        beforeRows[i] || {},
        doc.rows[i] || {},
        allFields,
      );
    }

    if (changedRemarkRow) {
      changedRemarkRow.afterRow = doc.rows?.[changedRemarkRow.idx] || {};
    }

    doc.updatedBy = userId;
    await doc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "product-compliance",
      action: "save",
      historyEntries,
      metadata: {
        plantName: doc.plantName || "",
        rowCount: doc.rows.length,
      },
    });

    if (emitter) {
      emitter.emit("markingLabellingUpdate", {
        clientId,
        type,
        itemId,
        operation: "upsert",
        source: "productCompliance",
      });
    }

    if (changedRemarkRow?.afterRow) {
      const changed = [];
      if (
        normalize(changedRemarkRow.beforeRow?.auditorRemarks) !==
        normalize(changedRemarkRow.afterRow?.auditorRemarks)
      ) {
        changed.push("auditorRemarks");
      }
      if (
        normalize(changedRemarkRow.beforeRow?.clientRemarks) !==
        normalize(changedRemarkRow.afterRow?.clientRemarks)
      ) {
        changed.push("clientRemarks");
      }
      if (
        normalize(changedRemarkRow.beforeRow?.managerRemarks) !==
        normalize(changedRemarkRow.afterRow?.managerRemarks)
      ) {
        changed.push("managerRemarks");
      }

      if (changed.length > 0) {
        const toId = (value) =>
          value && typeof value === "object" && value._id
            ? String(value._id)
            : value
              ? String(value)
              : "";
        const actorId = toId(userId);
        const creatorId = toId(clientExists?.createdBy);
        const managerId =
          toId(clientExists?.assignedManager) || toId(clientExists?.assignedTo);
        const recipientId =
          actorId && creatorId && actorId === creatorId ? managerId : creatorId;

        if (recipientId && actorId && recipientId !== actorId) {
          const clientName = (
            clientExists?.clientName ||
            clientExists?.name ||
            clientExists?.tradeName ||
            ""
          ).toString();
          const sku = (changedRemarkRow.afterRow?.skuCode || "").toString();
          const component = (changedRemarkRow.afterRow?.componentCode || "").toString();
          const parts = changed.map((field) =>
            field === "auditorRemarks"
              ? "Auditor remarks"
              : field === "managerRemarks"
                ? "Manager remarks"
                : "Client remarks",
          );

          await NotificationModel.create({
            recipient: recipientId,
            sender: actorId,
            type: "REMARKS_UPDATED",
            title: `${parts.join(" & ")} updated`,
            message: [clientName, sku || component].filter(Boolean).join(" • "),
            clientId,
            linkPath: `/dashboard/client/${clientId}/edit`,
            meta: {
              clientId,
              type,
              itemId,
              rowIndex: changedRemarkRow.idx,
              skuCode: sku,
              componentCode: component,
              changedFields: changed,
            },
          });
        }
      }
    }

    return doc.rows;
  }

  /**
   * Save Product Component Details
   * @param {string} clientId
   * @param {string} type
   * @param {string} itemId
   * @param {Array|object} rows
   * @param {number} rowIndex
   * @param {object} row
   * @param {string} userId
   * @param {object} emitter
   */
  static async saveProductComponentDetails(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    emitter,
    plantName,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }
    const sanitize = (r, fallbackIndex = null) => {
      const category = r.category || "";
      const polymerType = r.polymerType || "";
      const recycled =
        category === "Category I" ? r.recycledPolymerUsed || "" : "";
      const nextRow = {
        rowKey: r.rowKey || "",
        skuKey: r.skuKey || "",
        componentKey: r.componentKey || "",
        supplierKey: r.supplierKey || "",
        systemCode: r.systemCode || "",
        skuCode: r.skuCode || "",
        componentCode: r.componentCode || "",
        componentDescription: r.componentDescription || "",
        supplierName: r.supplierName || "",
        polymerType,
        recycledPolymerUsed: recycled,
        componentPolymer: r.componentPolymer || "",
        polymerCode: r.polymerCode || null,
        category,
        categoryIIType: r.categoryIIType || "",
        containerCapacity: r.containerCapacity || "",
        foodGrade: r.foodGrade || "",
        layerType: r.layerType || "",
        thickness: r.thickness || "",
        auditorRemarks: r.auditorRemarks || "-",
        managerRemarks: r.managerRemarks || "-",
      };
      nextRow.rowKey = nextRow.rowKey || buildProductRowKey(nextRow, fallbackIndex);
      nextRow.skuKey = nextRow.skuKey || buildSkuKey(nextRow);
      nextRow.componentKey = nextRow.componentKey || buildComponentKey(nextRow);
      nextRow.supplierKey = nextRow.supplierKey || buildSupplierKey(nextRow);
      return nextRow;
    };
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
      });
    }
    if (typeof plantName !== "undefined") doc.plantName = plantName || "";
    const historyEntries = [];
    const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: tableName,
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };
    const metadataMaps = buildProductMetadataMaps(doc.rows || []);
    const beforeRows = toPlainRows(doc.componentDetails);
    const beforeLookup = buildRowLookupMap(beforeRows);
    let afterRows = [];

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      let single = row;
      if (typeof single === "string") {
        try {
          single = JSON.parse(single);
        } catch (_) {
          single = {};
        }
      }
      single = sanitize(single);
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0) {
        throw new ApiError(400, "Invalid rowIndex");
      }
      const incomingSeed = sanitize(single, idx);
      const baseRow = beforeLookup.get(incomingSeed.rowKey) || beforeRows[idx] || {};
      const merged = {
        ...(baseRow && typeof baseRow.toObject === "function"
          ? baseRow.toObject()
          : baseRow),
        ...single,
      };
      single = applyProductMetadataMaps([sanitize(merged, idx)], metadataMaps)[0];
      // Validate rPET usage
      if (
        (single.recycledPolymerUsed || "").toString().trim().toLowerCase() ===
          "rpet" &&
        (single.polymerType || "").toString().trim().toUpperCase() !== "PET"
      ) {
        throw new ApiError(
          400,
          "Recycled Polymer Used 'rPET' requires Polymer Type 'PET'",
        );
      }
      afterRows = beforeRows.length ? [...beforeRows] : [];
      if (idx >= afterRows.length) {
        afterRows.push(single);
      } else {
        afterRows[idx] = single;
      }
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];
      afterRows = parsed.map((incomingRow, index) => {
        const incomingSeed = sanitize(incomingRow, index);
        const baseRow =
          beforeLookup.get(incomingSeed.rowKey) ||
          beforeRows[index] ||
          {};
        const merged = {
          ...(baseRow && typeof baseRow.toObject === "function"
            ? baseRow.toObject()
            : baseRow),
          ...incomingRow,
        };
        return applyProductMetadataMaps(
          [sanitize(merged, index)],
          metadataMaps,
        )[0];
      });
      // Validate all rows
      for (const r of afterRows) {
        if (
          (r.recycledPolymerUsed || "").toString().trim().toLowerCase() ===
            "rpet" &&
          (r.polymerType || "").toString().trim().toUpperCase() !== "PET"
        ) {
          throw new ApiError(
            400,
            "Recycled Polymer Used 'rPET' requires Polymer Type 'PET'",
          );
        }
      }
    }
    doc.componentDetails = afterRows;
    await syncComplianceArtifactsFromProductRows(doc);
    const maxLen = Math.max(beforeRows.length, doc.componentDetails.length);
    for (let i = 0; i < maxLen; i += 1) {
      pushDiffs("Component Details", i + 1, beforeRows[i] || {}, doc.componentDetails[i] || {}, [
        "skuCode",
        "componentCode",
        "componentDescription",
        "supplierName",
        "polymerType",
        "recycledPolymerUsed",
        "componentPolymer",
        "polymerCode",
        "category",
        "categoryIIType",
        "containerCapacity",
        "foodGrade",
        "layerType",
        "thickness",
        "auditorRemarks",
        "managerRemarks",
      ]);
    }

    // --- Notification Logic ---
    try {
      const recentChanges = historyEntries.filter(
        (h) => h.field === "Auditor Remarks" || h.field === "Manager Remarks",
      );

      if (recentChanges.length > 0) {
        const fields = [...new Set(recentChanges.map((c) => c.field))];
        const toId = (v) =>
          v && typeof v === "object" && v._id
            ? String(v._id)
            : v
              ? String(v)
              : "";
        const actorId = toId(userId);
        const assignedToId = toId(clientExists?.assignedTo);
        const assignedManagerId = toId(clientExists?.assignedManager);

        let recipientId = null;
        if (actorId === assignedToId) {
          recipientId = assignedManagerId;
        } else {
          recipientId = assignedToId;
        }

        if (recipientId && recipientId !== actorId) {
          const clientName = (
            clientExists?.clientName ||
            clientExists?.name ||
            clientExists?.tradeName ||
            ""
          ).toString();
          await NotificationModel.create({
            recipient: recipientId,
            sender: actorId,
            type: "REMARKS_UPDATED",
            title: `${fields.join(" & ")} Updated`,
            message: `${clientName} • Component Details`,
            clientId,
            linkPath: `/dashboard/client/${clientId}/edit`,
            meta: {
              clientId,
              type,
              itemId,
              changedFields: fields,
            },
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "Error sending notification");
    }

    doc.updatedBy = userId;
    await doc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "component-details",
      action: "save",
      historyEntries,
      metadata: {
        plantName: doc.plantName || "",
        rowCount: doc.componentDetails.length,
      },
    });

    if (emitter) {
      emitter.emit("markingLabellingUpdate", {
        clientId,
        type,
        itemId,
        operation: "upsert",
        source: "productComponentDetails",
      });
    }

    return doc.componentDetails;
  }

  /**
   * Save Recycled Quantity Used
   * @param {string} clientId
   * @param {string} type
   * @param {string} itemId
   * @param {Array|object} rows
   * @param {number} rowIndex
   * @param {object} row
   * @param {string} userId
   */
  static async saveRecycledQuantityUsed(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    plantName,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }
    const sanitize = (r, fallbackIndex = null) => {
      const nextRow = {
        rowKey: r.rowKey || "",
        skuKey: r.skuKey || "",
        componentKey: r.componentKey || "",
        supplierKey: r.supplierKey || "",
        systemCode: r.systemCode || "",
        componentCode: r.componentCode || "",
        componentDescription: r.componentDescription || "",
        supplierName: r.supplierName || "",
        category: r.category || "",
        annualConsumption: Number(r.annualConsumption) || 0,
        uom: r.uom || "",
        perPieceWeight: Number(r.perPieceWeight) || 0,
        annualConsumptionMt: Number(r.annualConsumptionMt) || 0,
        usedRecycledPercent: Number(r.usedRecycledPercent) || 0,
        usedRecycledQtyMt: Number(r.usedRecycledQtyMt) || 0,
      };
      nextRow.rowKey = nextRow.rowKey || buildProductRowKey(nextRow, fallbackIndex);
      nextRow.skuKey = nextRow.skuKey || buildSkuKey(nextRow);
      nextRow.componentKey = nextRow.componentKey || buildComponentKey(nextRow);
      nextRow.supplierKey = nextRow.supplierKey || buildSupplierKey(nextRow);
      return nextRow;
    };
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
        recycledQuantityUsed: [],
      });
    }
    if (typeof plantName !== "undefined") doc.plantName = plantName || "";
    const historyEntries = [];
    const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: tableName,
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };
    const metadataMaps = buildProductMetadataMaps(doc.rows || []);
    const beforeRows = toPlainRows(doc.recycledQuantityUsed);
    const beforeLookup = buildRowLookupMap(beforeRows);
    let afterRows = [];

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      let single = row;
      if (typeof single === "string") {
        try {
          single = JSON.parse(single);
        } catch (_) {
          single = {};
        }
      }
      single = sanitize(single);
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0) {
        throw new ApiError(400, "Invalid rowIndex");
      }
      const incomingSeed = sanitize(single, idx);
      const baseRow = beforeLookup.get(incomingSeed.rowKey) || beforeRows[idx] || {};
      const merged = {
        ...(baseRow && typeof baseRow.toObject === "function"
          ? baseRow.toObject()
          : baseRow),
        ...single,
      };
      single = applyProductMetadataMaps([sanitize(merged, idx)], metadataMaps)[0];
      afterRows = beforeRows.length ? [...beforeRows] : [];
      if (idx >= afterRows.length) {
        afterRows.push(single);
      } else {
        afterRows[idx] = single;
      }
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];
      afterRows = parsed.map((incomingRow, index) => {
        const incomingSeed = sanitize(incomingRow, index);
        const baseRow =
          beforeLookup.get(incomingSeed.rowKey) ||
          beforeRows[index] ||
          {};
        const merged = {
          ...(baseRow && typeof baseRow.toObject === "function"
            ? baseRow.toObject()
            : baseRow),
          ...incomingRow,
        };
        return applyProductMetadataMaps(
          [sanitize(merged, index)],
          metadataMaps,
        )[0];
      });
    }
    doc.recycledQuantityUsed = afterRows;
    await syncComplianceArtifactsFromProductRows(doc);
    const maxLen = Math.max(beforeRows.length, doc.recycledQuantityUsed.length);
    for (let i = 0; i < maxLen; i += 1) {
      pushDiffs(
        "Recycled Quantity Used",
        i + 1,
        beforeRows[i] || {},
        doc.recycledQuantityUsed[i] || {},
        [
          "systemCode",
          "componentCode",
          "componentDescription",
          "supplierName",
          "category",
          "annualConsumption",
          "uom",
          "perPieceWeight",
          "usedRecycledPercent",
          "usedRecycledQtyMt",
        ],
      );
    }
    doc.updatedBy = userId;
    await doc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "recycled-quantity",
      action: "save",
      historyEntries,
      metadata: {
        plantName: doc.plantName || "",
        rowCount: doc.recycledQuantityUsed.length,
      },
    });

    return doc.recycledQuantityUsed;
  }

  /**
   * Save Monthly Procurement
   * @param {string} clientId
   * @param {string} type
   * @param {string} itemId
   * @param {Array|object} rows
   * @param {number} rowIndex
   * @param {object} row
   * @param {string} userId
   */
  static async saveMonthlyProcurement(
    clientId,
    type,
    itemId,
    rows,
    rowIndex,
    row,
    userId,
    plantName,
  ) {
    const clientExists = await this.findClientOrPwp(clientId);

    const listKey = type === "CTE" ? "cteDetailsList" : "ctoDetailsList";
    const itemFound = clientExists.productionFacility[listKey].id(itemId);
    if (!itemFound) {
      throw new ApiError(404, `${type} detail not found`);
    }

    const sanitize = (r, fallbackIndex = null) => {
      const normalizeMonthlyUom = (value) => {
        const normalized = (value || "").toString().trim();
        switch (normalized.toUpperCase()) {
          case "MT":
            return "MT";
          case "KG":
            return "KG";
          case "UNITS":
            return "Units";
          case "ROLL":
            return "Roll";
          case "NOS":
            return "Nos";
          case "PCS":
            return "Pcs";
          case "NOT APPLICABLE":
            return "Not Applicable";
          default:
            return normalized;
        }
      };
      const normalizePpwUom = (value) => {
        const normalized = (value || "").toString().trim();
        switch (normalized.toUpperCase()) {
          case "GM":
          case "G":
          case "GMS":
          case "GRAM":
          case "GRAMS":
            return "GM";
          case "KG":
          case "KGS":
          case "KILOGRAM":
          case "KILOGRAMS":
          default:
            return "KG";
        }
      };
      const uom = normalizeMonthlyUom(r.uom);
      const purchaseQty = Number(r.purchaseQty) || 0;
      const perPieceWeightKg = Number(r.perPieceWeightKg) || 0;
      const ppwUom = normalizePpwUom(r.ppwUom);
      let monthlyPurchaseMt = Number(r.monthlyPurchaseMt) || 0;
      if (!monthlyPurchaseMt) {
        if (
          uom === "Units" ||
          uom === "Nos" ||
          uom === "Roll" ||
          uom === "Pcs"
        ) {
          monthlyPurchaseMt =
            ppwUom === "GM"
              ? (purchaseQty * perPieceWeightKg) / 1000000
              : (purchaseQty * perPieceWeightKg) / 1000;
        } else if (uom === "KG") {
          monthlyPurchaseMt = purchaseQty / 1000;
        } else if (uom === "MT") {
          monthlyPurchaseMt = purchaseQty;
        }
      }
      const nextRow = {
        rowKey: r.rowKey || "",
        skuKey: r.skuKey || "",
        componentKey: r.componentKey || "",
        supplierKey: r.supplierKey || "",
        systemCode: r.systemCode || "",
        skuCode: r.skuCode || "",
        supplierName: r.supplierName || "",
        supplierCategory: r.supplierCategory || "",
        foodGrade: r.foodGrade || "",
        componentCode: r.componentCode || "",
        componentDescription: r.componentDescription || "",
        polymerType: r.polymerType || "",
        recycledPolymerUsed: r.recycledPolymerUsed || "",
        componentPolymer: r.componentPolymer || "",
        category: r.category || "",
        dateOfInvoice: normalizeInvoiceDateOrNull(r.dateOfInvoice),
        monthName: r.monthName || "",
        quarter: r.quarter || "",
        yearlyQuarter: r.yearlyQuarter || "",
        purchaseQty,
        uom,
        perPieceWeightKg,
        ppwUom,
        monthlyPurchaseMt,
        recycledPercent: Number(r.recycledPercent) || 0,
        recycledQty: Number(r.recycledQty) || 0,
        recycledRate: Number(r.recycledRate) || 0,
        recycledQrtAmount: Number(r.recycledQrtAmount) || 0,
        virginQty: Number(r.virginQty) || 0,
        virginRate: Number(r.virginRate) || 0,
        virginQtyAmount: Number(r.virginQtyAmount) || 0,
        rcPercentMentioned: r.rcPercentMentioned || "",
      };
      nextRow.rowKey = nextRow.rowKey || buildProductRowKey(nextRow, fallbackIndex);
      nextRow.skuKey = nextRow.skuKey || buildSkuKey(nextRow);
      nextRow.componentKey = nextRow.componentKey || buildComponentKey(nextRow);
      nextRow.supplierKey = nextRow.supplierKey || buildSupplierKey(nextRow);
      return nextRow;
    };

    const productComplianceDoc = await ProductComplianceModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    if (!productComplianceDoc) {
      throw new ApiError(404, "Product compliance record not found");
    }
    if (typeof plantName !== "undefined") {
      productComplianceDoc.plantName = plantName || "";
      await productComplianceDoc.save();
    }
    const historyEntries = [];
    const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
      const at = new Date();
      fields.forEach((field) => {
        const prevVal = toChangeText(beforeRow?.[field]);
        const currVal = toChangeText(afterRow?.[field]);
        if (prevVal !== currVal) {
          historyEntries.push({
            table: tableName,
            row: rowNumber,
            field: humanizeField(field),
            prev: prevVal || "-",
            curr: currVal || "-",
            user: userId || null,
            userName: "",
            at,
          });
        }
      });
    };

    const procurementDoc =
      (await MonthlyProcurementModel.findOne({
        client: clientId,
        type,
        itemId,
      })) ||
      new MonthlyProcurementModel({
        client: clientId,
        type,
        itemId,
        plantName: productComplianceDoc.plantName || "",
        rows: [],
      });
    await syncComplianceArtifactsFromProductRows(productComplianceDoc, procurementDoc);
    const metadataMaps = buildProductMetadataMaps(productComplianceDoc.rows || []);
    const beforeRows = toPlainRows(procurementDoc.rows);
    const beforeLookup = buildRowLookupMap(beforeRows);
    let afterRows = [];

    if (typeof rowIndex !== "undefined" && row !== undefined) {
      let single = row;
      if (typeof single === "string") {
        try {
          single = JSON.parse(single);
        } catch (_) {
          single = {};
        }
      }
      single = sanitize(single);
      const idx = parseInt(rowIndex, 10);
      if (Number.isNaN(idx) || idx < 0) {
        throw new ApiError(400, "Invalid rowIndex");
      }
      const incomingSeed = sanitize(single, idx);
      const baseRow = beforeLookup.get(incomingSeed.rowKey) || beforeRows[idx] || {};
      const merged = {
        ...(baseRow && typeof baseRow.toObject === "function"
          ? baseRow.toObject()
          : baseRow),
        ...single,
      };
      single = applyProductMetadataMaps([sanitize(merged, idx)], metadataMaps)[0];
      afterRows = beforeRows.length ? [...beforeRows] : [];
      if (idx >= afterRows.length) {
        afterRows.push(single);
      } else {
        afterRows[idx] = single;
      }
    } else {
      let parsed = rows;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {
          parsed = [];
        }
      }
      if (!Array.isArray(parsed)) parsed = [];
      afterRows = parsed.map((incomingRow, index) => {
        const incomingSeed = sanitize(incomingRow, index);
        const baseRow =
          beforeLookup.get(incomingSeed.rowKey) ||
          beforeRows[index] ||
          {};
        const merged = {
          ...(baseRow && typeof baseRow.toObject === "function"
            ? baseRow.toObject()
            : baseRow),
          ...incomingRow,
        };
        return applyProductMetadataMaps(
          [sanitize(merged, index)],
          metadataMaps,
        )[0];
      });
    }
    procurementDoc.rows = afterRows;
    await syncComplianceArtifactsFromProductRows(productComplianceDoc, procurementDoc);
    const maxLen = Math.max(beforeRows.length, procurementDoc.rows.length);
    for (let i = 0; i < maxLen; i += 1) {
      pushDiffs(
        "Monthly Procurement Data",
        i + 1,
        beforeRows[i] || {},
        procurementDoc.rows[i] || {},
        [
          "systemCode",
          "skuCode",
          "supplierName",
          "supplierCategory",
          "foodGrade",
          "componentCode",
          "componentDescription",
          "polymerType",
          "recycledPolymerUsed",
          "componentPolymer",
          "category",
          "dateOfInvoice",
          "monthName",
          "quarter",
          "yearlyQuarter",
          "purchaseQty",
          "uom",
          "perPieceWeightKg",
          "ppwUom",
          "monthlyPurchaseMt",
          "recycledPercent",
          "recycledQty",
          "recycledRate",
          "recycledQrtAmount",
          "virginQty",
          "virginRate",
          "virginQtyAmount",
          "rcPercentMentioned",
        ],
      );
    }

    procurementDoc.updatedBy = userId;
    if (productComplianceDoc.isModified()) {
      productComplianceDoc.updatedBy = userId;
      await productComplianceDoc.save();
    }
    await procurementDoc.save();
    await HistoryService.appendEntries({
      clientId,
      type,
      itemId,
      entries: historyEntries,
      userId,
    });
    await writeAuditLog({
      actorId: userId,
      clientId,
      type,
      itemId,
      module: "monthly-procurement",
      action: "save",
      historyEntries,
      metadata: {
        plantName: procurementDoc.plantName || "",
        rowCount: procurementDoc.rows.length,
      },
    });
    return procurementDoc.rows;
  }
}
export default ClientService;
