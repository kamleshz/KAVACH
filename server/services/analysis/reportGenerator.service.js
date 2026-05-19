import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import handlebars from "handlebars";
import { fileURLToPath } from "url";
import PlasticAnalysisModel from "../../models/plasticAnalysis.model.js";
import ProductComplianceModel from "../../models/productCompliance.model.js";
import SupplierCtoCheckModel from "../../models/supplierCtoCheck.model.js";
import MonthlyProcurementModel from "../../models/monthlyProcurement.model.js";
import SkuComplianceModel from "../../models/skuCompliance.model.js";
import ClientModel from "../../models/client.model.js";
import PWPModel from "../../models/pwp.model.js";
import "../../models/user.model.js";
import PlasticAnalysisService from "./plasticAnalysis.service.js";
import {
  buildSupplierMetaByName,
  buildSupplierStatusByName,
  mergeSupplierCtoRows,
  normalizeSupplierCtoDateText,
  normalizeSupplierCtoRegistrationStatus,
} from "../../utils/supplierCto.js";
import logger from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportDebugEnabled = process.env.NODE_ENV !== "production";
const REPORT_SECTION_DEFINITIONS = [
  { id: "companyInfo", anchor: "company-info", title: "Company Information" },
  { id: "summaryData", anchor: "summary-data", title: "Summary Data" },
  {
    id: "industryCategory",
    anchor: "industry-category",
    title: "Industry Category Wise Details",
  },
  {
    id: "markingLabeling",
    anchor: "marking-labeling",
    title: "Marking and Labeling",
  },
  {
    id: "portalSummaryReport",
    anchor: "portal-summary-report",
    title: "Portal Summary Report",
  },
  { id: "skuWiseSummary", anchor: "cost-sku-wise", title: "SKU Wise Summary" },
  {
    id: "polymerWiseSummary",
    anchor: "cost-polymer-wise",
    title: "Polymer Wise Summary",
  },
  {
    id: "categoryWiseSummary",
    anchor: "cost-category-wise",
    title: "Category Wise Summary",
  },
  {
    id: "supplierWiseSummary",
    anchor: "cost-supplier-wise",
    title: "Supplier Wise Summary",
  },
  {
    id: "skuWiseSupplierDetails",
    anchor: "cost-sku-supplier-details",
    title: "SKU Wise Supplier Details",
  },
  {
    id: "polymerWiseSupplierDetails",
    anchor: "cost-polymer-supplier-details",
    title: "Polymer Wise Supplier Details",
  },
  {
    id: "categoryWiseSupplierDetails",
    anchor: "cost-category-supplier-details",
    title: "Category Wise Supplier Details",
  },
];

class ReportGeneratorService {
  static getNextFinancialYear(fy) {
    if (!fy) return "Unknown";
    const parts = fy.split("-");
    if (parts.length === 2) {
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        return `${startYear + 1}-${endYear + 1}`;
      }
    }
    return `${fy} (Next)`;
  }

  static generateAuditorInsights(...args) {
    return PlasticAnalysisService.generateAuditorInsights(...args);
  }

  /**
   * Generate Plastic Compliance Report PDF
   */
  static async generatePlasticComplianceReport(
    clientId,
    type,
    itemId,
    userId,
    options = {},
  ) {
    logger.info(
      { clientId, type, itemId, userId },
      "[Report Generation] Starting",
    );

    // Register Handlebars helpers
    handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });
    handlebars.registerHelper("add", function (a, b) {
      return a + b;
    });
    handlebars.registerHelper("length", function (a) {
      return a ? a.length : 0;
    });
    handlebars.registerHelper("concat", function (a, b) {
      return a + b;
    });
    handlebars.registerHelper("ne", function (a, b) {
      return a !== b;
    });
    handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });
    handlebars.registerHelper("gt", function (a, b) {
      return Number(a || 0) > Number(b || 0);
    });

    // 1. Fetch Client & Audit Details
    // Populate assignedTo (Auditor) and assignedManager
    let clientDoc = await ClientModel.findById(clientId).populate(
      "assignedTo assignedManager",
    );
    if (!clientDoc)
      clientDoc = await PWPModel.findById(clientId).populate("assignedTo");

    if (!clientDoc) {
      logger.error({ clientId, type, itemId }, "[Report Generation] Client not found");
      throw new Error("Client not found");
    }
    logger.info(
      { clientId, clientName: clientDoc.name || clientDoc.clientName },
      "[Report Generation] Client found",
    );

    // Logic to determine Auditor Name (assignedTo is usually the auditor/user working on it)
    const auditorName =
      clientDoc.assignedTo?.name || clientDoc.assignedTo?.username || "N/A";

    // Logic for Audit Date (auditEndDate or last update)
    const auditDateObj = clientDoc.auditEndDate || clientDoc.updatedAt;
    const auditDate = auditDateObj
      ? new Date(auditDateObj).toLocaleDateString()
      : new Date().toLocaleDateString();

    const isProducer =
      (clientDoc.entityType || "").trim().toLowerCase() === "producer";

    // 2. Fetch Analysis Data (Pre/Post & Targets)
    const analysisDoc = await PlasticAnalysisModel.findOne({
      client: clientId,
      type,
      itemId,
    });
    logger.debug(
      { clientId, type, itemId, found: Boolean(analysisDoc) },
      "[Report Generation] Analysis doc lookup",
    );

    // Helper for date formatting
    const formatDate = (date) =>
      date ? new Date(date).toLocaleDateString("en-GB") : "-";
    const formatNumber = (value, decimals = 3) => {
      const n = Number(value);
      if (!Number.isFinite(n))
        return (0).toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      return n.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };
    const formatPercent = (value, decimals = 1) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return (0).toFixed(decimals);
      return n.toFixed(decimals);
    };
    const clampPct = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return 0;
      return Math.min(100, Math.max(0, n));
    };

    const UREP_TARGET_MATRIX = {
      "Cat-I": {
        "2025-26": 30,
        "2026-27": 40,
        "2027-28": 50,
        "2028-29": 60,
      },
      "Cat-II": {
        "2025-26": 10,
        "2026-27": 10,
        "2027-28": 20,
        "2028-29": 20,
      },
      "Cat-III": {
        "2025-26": 5,
        "2026-27": 5,
        "2027-28": 10,
        "2028-29": 10,
      },
      "Cat-IV": {},
      "Cat-V": {},
    };

    const normalizeUrepCategory = (value) => {
      const raw = (value || "").toString().trim().toLowerCase();
      if (!raw) return null;
      if (
        raw.includes("cat-v") ||
        raw.includes("cat v") ||
        raw.includes("category v") ||
        /\bv\b/.test(raw)
      )
        return "Cat-V";
      if (
        raw.includes("cat-iv") ||
        raw.includes("cat iv") ||
        raw.includes("category iv") ||
        raw.includes("iv")
      )
        return "Cat-IV";
      if (
        raw.includes("cat-iii") ||
        raw.includes("cat iii") ||
        raw.includes("category iii") ||
        raw.includes("iii")
      )
        return "Cat-III";
      if (
        raw.includes("cat-ii") ||
        raw.includes("cat ii") ||
        raw.includes("category ii") ||
        raw.includes("ii")
      )
        return "Cat-II";
      if (
        raw.includes("cat-i") ||
        raw.includes("cat i") ||
        raw.includes("category i")
      )
        return "Cat-I";
      if (/\bi\b/.test(raw)) return "Cat-I";
      return null;
    };

    // Prepare Company Profile Data
    const companyProfile = {
      pan: clientDoc.companyDetails?.pan || "-",
      gst: clientDoc.companyDetails?.gst || "-",
      cin: clientDoc.companyDetails?.cin || "-",
      udyam: clientDoc.companyDetails?.udyamRegistration || "-",
      entityType: clientDoc.entityType || "-",
    };

    const formatAddress = (addr) => {
      if (!addr) return "-";
      const parts = [
        addr.addressLine1,
        addr.addressLine2,
        addr.city,
        addr.state,
        addr.pincode,
      ].filter(Boolean);
      return parts.join(", ");
    };

    const addresses = {
      registered: formatAddress(clientDoc.registeredOfficeAddress),
      communication: formatAddress(clientDoc.communicationAddress),
    };

    const documents = (clientDoc.documents || []).map((doc) => ({
      type: doc.documentType,
      number: doc.certificateNumber || "-",
      date: formatDate(doc.certificateDate),
    }));

    const productionFacility = clientDoc.productionFacility || {};
    const consents = {
      cte: (productionFacility.cteDetailsList || []).map((cte) => ({
        consentNo: cte.consentNo || "-",
        issueDate: formatDate(cte.issuedDate),
        validUpto: formatDate(cte.validUpto),
      })),
      cto: (productionFacility.ctoDetailsList || []).map((cto) => ({
        orderNo: cto.consentOrderNo || "-",
        issueDate: formatDate(cto.dateOfIssue),
        validUpto: formatDate(cto.validUpto),
      })),
    };

    // If no analysis exists, we might need to run it or return empty structure
    // ideally runPlasticAnalysis should have been called before.
    const summary = analysisDoc?.summary || {};
    const prePostSummary = summary.portal_summary || [];
    const targetTablesPrePost = summary.target_tables || [];

    // Format Pre/Post Summary for Template
    const formattedPrePost = prePostSummary
      .filter((row) => row["Category of Plastic"] !== "Total")
      .map((row) => ({
        category: row["Category of Plastic"],
        purchase: row["Total Purchase"],
        consumption: row["Total Consumption"],
        difference: row["Difference (%)"],
        export: row["Export"],
        isHighDiff: Math.abs(row["Difference (%)"]) > 10, // Example threshold
      }));

    // 3. Fetch SKU Details (Grouped by Industry Category)
    logger.debug(
      { clientId, type, itemId, isProducer },
      "[Report Generation] Fetching compliance documents",
    );
    const [productComplianceDoc, supplierCtoDoc, monthlyProcurementDoc] =
      await Promise.all([
        ProductComplianceModel.findOne({ client: clientId, type, itemId }),
        SupplierCtoCheckModel.findOne({ client: clientId, type, itemId }),
        MonthlyProcurementModel.findOne({ client: clientId, type, itemId }),
      ]);
    logger.debug(
      {
        clientId,
        type,
        itemId,
        found: Boolean(productComplianceDoc),
        rows: productComplianceDoc?.rows?.length || 0,
      },
      "[Report Generation] Product compliance lookup",
    );

    const allRows = productComplianceDoc?.rows || [];
    const componentDetails = productComplianceDoc?.componentDetails || [];
    const supplierCompliance = productComplianceDoc?.supplierCompliance || [];
    const supplierCtoChecks = supplierCtoDoc?.rows || [];
    const procurementDetails = monthlyProcurementDoc?.rows || [];

    // FIX: Initialize skuComplianceMap before usage
    const skuCompliance = productComplianceDoc?.skuCompliance || [];
    const skuComplianceMap = {};
    skuCompliance.forEach((item) => {
      const key = (item?.skuCode || "").toString().trim();
      if (key) {
        skuComplianceMap[key] = item;
      }
    });

    const skuIndustryMap = {};
    allRows.forEach((row) => {
      const skuCode = (row?.skuCode || "").trim();
      if (!skuCode) return;
      if (!skuIndustryMap[skuCode]) {
        skuIndustryMap[skuCode] = row.industryCategory || "General";
      }
    });

    const industryMap = {};

    // Helper to resolve image path
    const resolveImage = (img) => {
      if (!img) return null;
      if (img.startsWith("http")) return img;
      // Assuming local file, convert to absolute path for Puppeteer
      // If stored as "uploads/file.jpg", resolve relative to root
      const absolutePath = path.resolve(process.cwd(), img);
      // DEBUG: Log image resolution
      if (reportDebugEnabled) {
        logger.debug({ input: img, absolutePath }, "[resolveImage] Resolved image path");
      }
      // Convert to file URI or base64? File URI is safer for local puppeteer
      // But we need to make sure the file exists
      if (fs.existsSync(absolutePath)) {
        // Read file and convert to base64 to avoid permission issues with local file access in some envs
        try {
          const bitmap = fs.readFileSync(absolutePath);
          const base64 = Buffer.from(bitmap).toString("base64");
          const ext = path.extname(absolutePath).substring(1);
          if (reportDebugEnabled) {
            logger.debug(
              { absolutePath, base64Length: base64.length },
              "[resolveImage] Converted image to base64",
            );
          }
          return `data:image/${ext};base64,${base64}`;
        } catch (e) {
          logger.error({ err: e, absolutePath }, "Error reading image file");
          return null;
        }
      }
      if (reportDebugEnabled) {
        logger.debug({ absolutePath }, "[resolveImage] File not found");
      }
      return null;
    };

    const pickText = (...values) => {
      for (const v of values) {
        if (v === undefined || v === null) continue;
        const s = v.toString().trim();
        if (s) return s;
      }
      return "";
    };

    const hasMeaningfulValue = (value) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "number") return true;
      const text = value.toString().trim();
      if (!text) return false;
      return (
        text !== "-" &&
        text.toLowerCase() !== "na" &&
        text.toLowerCase() !== "n/a"
      );
    };

    const supplierMetaByName = buildSupplierMetaByName(supplierCompliance);
    const supplierStatusByName = buildSupplierStatusByName(supplierCompliance);

    const mapSupplierCtoRowForReport = (row, index) => {
      const supplierName = (row?.supplierName || "").toString().trim();
      const supplierMeta = supplierMetaByName.get(supplierName) || {};
      const supplierStatus =
        (supplierMeta?.supplierStatus || "").toString().trim() || "-";
      const ctoPlantNo = (row?.ctoPlantNo || "").toString().trim();
      const ctoPlantName = (row?.ctoPlantName || "").toString().trim();
      const ctoStartDate = normalizeSupplierCtoDateText(row?.ctoStartDate);
      const ctoValidUpto = normalizeSupplierCtoDateText(row?.ctoValidUpto);
      const ctoCcaDocument = (row?.ctoCcaDocument || "").toString().trim();

      return {
        key: `supplier-cto-${index + 1}`,
        supplierName: supplierName || "-",
        supplierStatus,
        registrationStatus:
          normalizeSupplierCtoRegistrationStatus(
            supplierMeta?.supplierStatus || "",
            row?.registrationStatus,
          ) || "Pending",
        eprCertificateNumber:
          (supplierMeta?.eprCertificateNumber || "").toString().trim() || "-",
        ctoAvailability:
          (row?.ctoAvailability || "Available").toString().trim() ===
          "Not Available"
            ? "Not Available"
            : "Available",
        ctoPlantNo: ctoPlantNo || "-",
        ctoPlantName: ctoPlantName || "-",
        ctoStartDate: ctoStartDate || "-",
        ctoValidUpto: ctoValidUpto || "-",
        ctoCcaDocumentStatus: ctoCcaDocument ? "Uploaded" : "No file",
        hasDocument: !!ctoCcaDocument,
      };
    };

    const mergedSupplierCtoRows = mergeSupplierCtoRows({
      supplierNames: Array.from(supplierMetaByName.keys()),
      persistedRows: supplierCtoChecks,
      supplierStatusByName,
      normalizeDateValue: (value) => value || null,
    });

    const supplierCtoTable = mergedSupplierCtoRows.map((row, index) =>
      mapSupplierCtoRowForReport(row, index),
    );

    const supplierCtoSummaryByName = new Map();
    supplierCtoTable.forEach((row, index) => {
      const supplierKey =
        (row?.supplierName || "").toString().trim().toLowerCase() ||
        `supplier-cto-${index + 1}`;
      const existing = supplierCtoSummaryByName.get(supplierKey);
      if (!existing) {
        supplierCtoSummaryByName.set(supplierKey, {
          supplierName: row.supplierName,
          registrationStatus: row.registrationStatus,
          hasAvailable: row.ctoAvailability === "Available",
          hasNotAvailable: row.ctoAvailability === "Not Available",
          hasDocument: row.hasDocument,
        });
        return;
      }

      const registrationPriority = {
        Approved: 3,
        "In Progress": 2,
        Pending: 1,
      };
      if (
        (registrationPriority[row.registrationStatus] || 0) >
        (registrationPriority[existing.registrationStatus] || 0)
      ) {
        existing.registrationStatus = row.registrationStatus;
      }
      existing.hasAvailable =
        existing.hasAvailable || row.ctoAvailability === "Available";
      existing.hasNotAvailable =
        existing.hasNotAvailable || row.ctoAvailability === "Not Available";
      existing.hasDocument = existing.hasDocument || row.hasDocument;
    });

    const supplierCtoSummary = Array.from(
      supplierCtoSummaryByName.values(),
    ).reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.registrationStatus === "Approved") acc.approved += 1;
        else if (row.registrationStatus === "In Progress") acc.inProgress += 1;
        else acc.pending += 1;

        if (row.hasAvailable) acc.available += 1;
        if (!row.hasAvailable && row.hasNotAvailable) acc.notAvailable += 1;
        if (row.hasDocument) acc.documentUploaded += 1;
        return acc;
      },
      {
        total: 0,
        approved: 0,
        inProgress: 0,
        pending: 0,
        available: 0,
        notAvailable: 0,
        documentUploaded: 0,
      },
    );

    allRows.forEach((row) => {
      const cat = row.industryCategory || "General";
      if (!industryMap[cat]) industryMap[cat] = {}; // Changed to Object for SKU grouping

      if (isProducer) {
        const skuCode =
          (row?.skuCode || "").toString().trim() ||
          (row?.systemCode || "").toString().trim() ||
          (row?.componentCode || "").toString().trim() ||
          "Unknown SKU";
        const candidateProductImage = resolveImage(
          row.productImage || row.componentImage,
        );

        if (!industryMap[cat][skuCode]) {
          industryMap[cat][skuCode] = {
            skuCode,
            skuDescription: row.skuDescription || row.componentDescription || "-",
            skuUom: row.skuUom || "-",
            clientName: row.clientName || "-",
            productImage: candidateProductImage,
            status: "Pending",
            components: [],
          };
        } else if (
          !industryMap[cat][skuCode].productImage &&
          candidateProductImage
        ) {
          industryMap[cat][skuCode].productImage = candidateProductImage;
        }

        if (
          (!industryMap[cat][skuCode].clientName ||
            industryMap[cat][skuCode].clientName === "-") &&
          row.clientName
        ) {
          industryMap[cat][skuCode].clientName = row.clientName;
        }

        const compCode = (row.componentCode || "").trim();
        const compDetail =
          componentDetails.find(
            (c) => (c.componentCode || "").trim() === compCode,
          ) || {};
        const suppComp =
          supplierCompliance.find(
            (s) => (s.componentCode || "").trim() === compCode,
          ) || {};

        const procRecords = procurementDetails.filter(
          (p) => (p.componentCode || "").trim() === compCode,
        );
        const totalMonthlyPurchaseMt = procRecords.reduce(
          (sum, p) => sum + (p.monthlyPurchaseMt || 0),
          0,
        );
        const totalRecycledQty = procRecords.reduce(
          (sum, p) => sum + (p.recycledQty || 0),
          0,
        );

        let recycledPolymerUsed = pickText(
          row.recycledPolymerUsed,
          row.recycled_polymer_used,
          row["Recycled Polymer Used"],
          compDetail.recycledPolymerUsed,
          compDetail.recycled_polymer_used,
          compDetail["Recycled Polymer Used"],
        );
        if (!recycledPolymerUsed) {
          for (const p of procRecords) {
            recycledPolymerUsed = pickText(
              p.recycledPolymerUsed,
              p.recycled_polymer_used,
              p["Recycled Polymer Used"],
            );
            if (recycledPolymerUsed) break;
          }
        }
        if (!recycledPolymerUsed) recycledPolymerUsed = "-";

        let polymerType = pickText(
          row.polymerType,
          row["Polymer Type"],
          compDetail.polymerType,
          compDetail["Polymer Type"],
        );
        if (!polymerType) {
          for (const p of procRecords) {
            polymerType = pickText(p.polymerType, p["Polymer Type"]);
            if (polymerType) break;
          }
        }
        if (!polymerType) polymerType = "-";

        let componentPolymer = pickText(
          row.componentPolymer,
          row.component_polymer,
          row["Component Polymer"],
          row.componentPolymerType,
          row["Component Polymer Type"],
          row.polymer,
          row["Polymer"],
          compDetail.componentPolymer,
          compDetail.component_polymer,
          compDetail["Component Polymer"],
          compDetail.componentPolymerType,
          compDetail["Component Polymer Type"],
          compDetail.polymer,
          compDetail["Polymer"],
        );
        if (!componentPolymer) {
          for (const p of procRecords) {
            componentPolymer = pickText(
              p.componentPolymer,
              p.component_polymer,
              p["Component Polymer"],
              p.componentPolymerType,
              p["Component Polymer Type"],
              p.polymer,
              p["Polymer"],
              p.polymerType,
              p["Polymer Type"],
            );
            if (componentPolymer) break;
          }
        }
        if (!componentPolymer) componentPolymer = polymerType || "-";

        const componentStatus =
          row.componentComplianceStatus || row.complianceStatus || "Pending";
        const componentImgSrc = resolveImage(row.componentImage);
        const bucket = industryMap[cat][skuCode];
        const componentKey =
          `${compCode || "-"}::${(row.supplierName || suppComp.supplierName || "-").toString().trim().toLowerCase()}`;

        if (
          !bucket.components.some(
            (component) => component.__componentKey === componentKey,
          )
        ) {
          bucket.components.push({
            __componentKey: componentKey,
            componentCode: compCode || "-",
            componentImage: componentImgSrc,
            componentDescription: row.componentDescription || "-",
            supplierName: row.supplierName || suppComp.supplierName || "-",
            supplierState: row.supplierState || suppComp.supplierState || "-",
            supplierStatus: suppComp.supplierStatus || "-",
            eprCertificateNumber: suppComp.eprCertificateNumber || "-",
            polymerType,
            componentPolymer,
            recycledPolymerUsed,
            category: compDetail.category || row.category || "-",
            categoryIIType: compDetail.categoryIIType || "-",
            containerCapacity: compDetail.containerCapacity || "-",
            layerType: compDetail.layerType || "-",
            thickness: compDetail.thickness || "-",
            monthlyPurchaseMt: totalMonthlyPurchaseMt.toFixed(4),
            recycledQty: totalRecycledQty.toFixed(4),
            status: componentStatus,
            auditorRemarks: row.auditorRemarks || "-",
            managerRemarks: row.managerRemarks || "-",
          });
        }

        const statuses = bucket.components.map((component) => component.status);
        bucket.status = statuses.includes("Non-Compliant")
          ? "Non-Compliant"
          : statuses.includes("Compliant")
            ? "Compliant"
            : "Pending";
      } else {
        // Brand Owner Logic: Group by SKU
        const skuCode = (row?.skuCode || "").toString().trim() || "Unknown SKU";

        // Get Marking & Labeling Data
        const markingData = skuComplianceMap[skuCode] || {};
        const candidateProductImage = resolveImage(
          markingData.productImage || row.productImage,
        );

        if (!industryMap[cat][skuCode]) {
          industryMap[cat][skuCode] = {
            skuCode: skuCode,
            skuDescription: row.skuDescription || "-",
            skuUom: row.skuUom || "-",
            productImage: candidateProductImage,
            // Added Product Compliance Status to the SKU object
            // Prioritize the derived productComplianceStatus from the main table row
            status:
              row.productComplianceStatus ||
              markingData.complianceStatus ||
              "Pending",
            markingDetails: {
              brandOwner: markingData.brandOwner || "-",
              eprCertBrandOwner: markingData.eprCertBrandOwner || "-",
              eprCertProducer: markingData.eprCertProducer || "-",
              thickness: markingData.thicknessMentioned || "-",
              polymers: markingData.polymerUsed?.join(", ") || "-",
              recycledPercent: markingData.recycledPercent || "-",
              compostableRegNo: markingData.compostableRegNo || "-",
              status: markingData.complianceStatus || "Pending",
              images: (markingData.markingImage || [])
                .map((img) => resolveImage(img))
                .filter(Boolean),
            },
            components: [],
          };
        } else if (
          !industryMap[cat][skuCode].productImage &&
          candidateProductImage
        ) {
          industryMap[cat][skuCode].productImage = candidateProductImage;
        }

        // Look up details
        const compCode = (row.componentCode || "").trim();
        const compDetail =
          componentDetails.find(
            (c) => (c.componentCode || "").trim() === compCode,
          ) || {};
        const suppComp =
          supplierCompliance.find(
            (s) => (s.componentCode || "").trim() === compCode,
          ) || {};

        // Aggregate Procurement Data
        const procRecords = procurementDetails.filter(
          (p) => (p.componentCode || "").trim() === compCode,
        );
        const totalMonthlyPurchaseMt = procRecords.reduce(
          (sum, p) => sum + (p.monthlyPurchaseMt || 0),
          0,
        );
        const totalRecycledQty = procRecords.reduce(
          (sum, p) => sum + (p.recycledQty || 0),
          0,
        );
        let recycledPolymerUsed = pickText(
          row.recycledPolymerUsed,
          row.recycled_polymer_used,
          row["Recycled Polymer Used"],
          compDetail.recycledPolymerUsed,
          compDetail.recycled_polymer_used,
          compDetail["Recycled Polymer Used"],
        );
        if (!recycledPolymerUsed) {
          for (const p of procRecords) {
            recycledPolymerUsed = pickText(
              p.recycledPolymerUsed,
              p.recycled_polymer_used,
              p["Recycled Polymer Used"],
            );
            if (recycledPolymerUsed) break;
          }
        }
        if (!recycledPolymerUsed) recycledPolymerUsed = "-";

        let polymerType = pickText(
          row.polymerType,
          row["Polymer Type"],
          compDetail.polymerType,
          compDetail["Polymer Type"],
        );
        if (!polymerType) {
          for (const p of procRecords) {
            polymerType = pickText(p.polymerType, p["Polymer Type"]);
            if (polymerType) break;
          }
        }
        if (!polymerType) polymerType = "-";

        let componentPolymer = pickText(
          row.componentPolymer,
          row.component_polymer,
          row["Component Polymer"],
          row.componentPolymerType,
          row["Component Polymer Type"],
          row.polymer,
          row["Polymer"],
          compDetail.componentPolymer,
          compDetail.component_polymer,
          compDetail["Component Polymer"],
          compDetail.componentPolymerType,
          compDetail["Component Polymer Type"],
          compDetail.polymer,
          compDetail["Polymer"],
        );
        if (!componentPolymer) {
          for (const p of procRecords) {
            componentPolymer = pickText(
              p.componentPolymer,
              p.component_polymer,
              p["Component Polymer"],
              p.componentPolymerType,
              p["Component Polymer Type"],
              p.polymer,
              p["Polymer"],
              p.polymerType,
              p["Polymer Type"],
            );
            if (componentPolymer) break;
          }
        }
        if (!componentPolymer) componentPolymer = polymerType || "-";

        // Resolve Component Image
        const componentImgSrc = resolveImage(row.componentImage);

        industryMap[cat][skuCode].components.push({
          componentCode: compCode || "-",
          componentImage: componentImgSrc,
          componentDescription: row.componentDescription || "-",
          supplierName: row.supplierName || suppComp.supplierName || "-",
          supplierState: row.supplierState || suppComp.supplierState || "-",
          supplierStatus: suppComp.supplierStatus || "-",
          eprCertificateNumber: suppComp.eprCertificateNumber || "-",
          polymerType,
          componentPolymer,
          recycledPolymerUsed,
          category: compDetail.category || row.category || "-",
          categoryIIType: compDetail.categoryIIType || "-",
          containerCapacity: compDetail.containerCapacity || "-",
          layerType: compDetail.layerType || "-",
          thickness: compDetail.thickness || "-",
          monthlyPurchaseMt: totalMonthlyPurchaseMt.toFixed(4),
          recycledQty: totalRecycledQty.toFixed(4),
          status:
            row.componentComplianceStatus || row.complianceStatus || "Pending",
          auditorRemarks: row.auditorRemarks || "-",
          managerRemarks: row.managerRemarks || "-",
        });
      }
    });

    const industryCategories = Object.keys(industryMap).map((cat) => {
      const skus = Object.values(industryMap[cat]);

      let totalSkus,
        totalMonthlyPurchase,
        skuCompliantCount,
        skuNonCompliantCount,
        skuPendingCount;
      let compCompliantCount,
        compNonCompliantCount,
        compPendingCount,
        complianceScore;

      {
        totalSkus = skus.length;
        totalMonthlyPurchase = skus.reduce(
          (sum, sku) =>
            sum +
            sku.components.reduce(
              (cSum, c) => cSum + parseFloat(c.monthlyPurchaseMt || 0),
              0,
            ),
          0,
        );

        // Component Level Analysis
        const allComponents = skus.flatMap((s) => s.components);
        compCompliantCount = allComponents.filter(
          (c) => c.status === "Compliant",
        ).length;
        compNonCompliantCount = allComponents.filter(
          (c) => c.status === "Non-Compliant",
        ).length;
        compPendingCount = allComponents.filter(
          (c) => c.status !== "Compliant" && c.status !== "Non-Compliant",
        ).length;

        // SKU Level Analysis
        skuCompliantCount = skus.filter((s) => s.status === "Compliant").length;
        skuNonCompliantCount = skus.filter(
          (s) => s.status === "Non-Compliant",
        ).length;
        skuPendingCount =
          totalSkus - (skuCompliantCount + skuNonCompliantCount);
        complianceScore =
          allComponents.length > 0
            ? ((compCompliantCount / allComponents.length) * 100).toFixed(1)
            : 0;
      }

      const normalizedSkus = skus.map((sku) => {
        const components = Array.isArray(sku.components) ? sku.components : [];
        const componentsWithImages = components.filter((component) =>
          Boolean(component.componentImage),
        );
        const componentsWithRemarks = components.filter((component) =>
          hasMeaningfulValue(component.auditorRemarks),
        );

        return {
          ...sku,
          hasProductImage: Boolean(sku.productImage),
          hasComponentImages: componentsWithImages.length > 0,
          componentsWithImages,
          componentsWithRemarks,
        };
      });

      return {
        name: cat,
        skus: normalizedSkus,
        summary: {
          totalSkus,
          totalMonthlyPurchase: totalMonthlyPurchase.toFixed(4),
          // Component Stats
          compliantCount: compCompliantCount,
          nonCompliantCount: compNonCompliantCount,
          pendingCount: compPendingCount,
          complianceScore: complianceScore,
          // SKU Stats
          skuCompliantCount,
          skuNonCompliantCount,
          skuPendingCount,
        },
      };
    });

    // 3.1 Prepare Marking & Labeling Report Data (From SkuComplianceModel + fallback to ProductCompliance)
    const skuComplianceDocs = await SkuComplianceModel.find({
      client: clientId,
    });
    logger.debug(
      { clientId, count: skuComplianceDocs.length },
      "[Report Generation] SkuCompliance docs found",
    );

    const normalizeText = (v) =>
      (v === undefined || v === null ? "" : String(v)).trim();
    const eqText = (a, b) =>
      normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
    const skuInfoByCode = new Map();
    (allRows || []).forEach((row) => {
      const code = normalizeText(row?.skuCode);
      if (!code) return;
      const existing = skuInfoByCode.get(code) || {};
      const next = {
        skuDescription:
          normalizeText(row?.skuDescription) || existing.skuDescription || "",
        skuUom: normalizeText(row?.skuUom) || existing.skuUom || "",
        productImage:
          normalizeText(row?.productImage) || existing.productImage || "",
        industryCategory:
          normalizeText(row?.industryCategory) ||
          existing.industryCategory ||
          "",
      };
      skuInfoByCode.set(code, next);
    });

    // Build marking data from SkuCompliance collection
    let markingSource = skuComplianceDocs.map((doc) => {
      const raw = typeof doc?.toObject === "function" ? doc.toObject() : doc;
      const code = normalizeText(raw?.skuCode);
      const skuInfo = skuInfoByCode.get(code);
      if (!skuInfo) return raw;

      const merged = { ...raw };
      if (
        skuInfo.skuDescription &&
        !eqText(merged.skuDescription, skuInfo.skuDescription)
      ) {
        merged.skuDescription = skuInfo.skuDescription;
      }
      if (
        skuInfo.skuUom &&
        !eqText(merged.skuUm || merged.skuUom, skuInfo.skuUom)
      ) {
        merged.skuUm = skuInfo.skuUom;
      }
      if (
        skuInfo.productImage &&
        !eqText(merged.productImage, skuInfo.productImage)
      ) {
        merged.productImage = skuInfo.productImage;
      }
      if (
        skuInfo.industryCategory &&
        !eqText(merged.industryCategory, skuInfo.industryCategory)
      ) {
        merged.industryCategory = skuInfo.industryCategory;
      }
      return merged;
    });

    // If no dedicated SkuCompliance docs, fallback: build from productCompliance rows + skuComplianceMap
    if (markingSource.length === 0 && allRows.length > 0) {
      logger.debug(
        {
          clientId,
          allRows: allRows.length,
          skuComplianceKeys: Object.keys(skuComplianceMap).length,
        },
        "[Report Generation] Falling back to productCompliance rows for marking data",
      );
      const uniqueSkus = new Map();
      allRows.forEach((row) => {
        const code = (row.skuCode || "").trim();
        if (!code || uniqueSkus.has(code)) return;
        const markingInfo = skuComplianceMap[code] || {};
        uniqueSkus.set(code, {
          skuCode: code,
          industryCategory:
            skuIndustryMap[code] || row.industryCategory || "General",
          skuDescription: row.skuDescription || "",
          skuUm: row.skuUom || "",
          productImage: row.productImage || "",
          brandOwner: markingInfo.brandOwner || "",
          eprCertBrandOwner: markingInfo.eprCertBrandOwner || "",
          eprCertProducer: markingInfo.eprCertProducer || "",
          thicknessMentioned: markingInfo.thicknessMentioned || "",
          polymerUsed: markingInfo.polymerUsed || [],
          recycledPercent: markingInfo.recycledPercent || "",
          compostableRegNo: markingInfo.compostableRegNo || "",
          markingImage: markingInfo.markingImage || [],
          remarks: markingInfo.remarks || [],
          complianceRemarks: markingInfo.complianceRemarks || [],
          complianceStatus: markingInfo.complianceStatus || "Pending",
        });
      });
      markingSource = Array.from(uniqueSkus.values());
      logger.debug(
        { clientId, count: markingSource.length },
        "[Report Generation] Fallback marking source built",
      );
    }

    if (reportDebugEnabled) {
      logger.debug(
        { count: markingSource.length },
        "[Report Generation] BEFORE SORT - markingSource size",
      );
      markingSource.forEach((doc, i) => {
        logger.debug(
          {
            index: i,
            skuCode: doc.skuCode,
            skuDescription: doc.skuDescription,
            skuUom: doc.skuUm || doc.skuUom,
          },
          "[Report Generation] Marking source item",
        );
      });
    }

    const markingLabelingData = markingSource
      .sort((a, b) => {
        const aCode = (a.skuCode || "").trim();
        const bCode = (b.skuCode || "").trim();
        return aCode.localeCompare(bCode);
      })
      .map((doc, index) => {
        if (reportDebugEnabled) {
          logger.debug(
            {
              index: index + 1,
              skuCode: doc.skuCode,
              skuDescription: doc.skuDescription,
              skuUom: doc.skuUm || doc.skuUom,
              productImagePreview: doc.productImage?.substring(0, 50) || "none",
            },
            "[Report Generation] Processing SKU",
          );
        }

        const brandOwner = doc.brandOwner || "";
        const eprCertBrandOwner = doc.eprCertBrandOwner || "";
        const eprCertProducer = doc.eprCertProducer || "";
        const thicknessMentioned = doc.thicknessMentioned || "";
        const polymerUsed = Array.isArray(doc.polymerUsed)
          ? doc.polymerUsed.join(", ")
          : doc.polymerUsed || "";
        const recycledPercent = doc.recycledPercent || "";
        const compostableRegNo = doc.compostableRegNo || "";
        const productImage = resolveImage(doc.productImage);
        const markingImages = (doc.markingImage || [])
          .map((img) => resolveImage(img))
          .filter(Boolean);

        if (markingImages.length > 0) {
          if (reportDebugEnabled) {
            logger.debug(
              { skuCode: doc.skuCode, count: markingImages.length },
              "[Report Generation] Marking images found",
            );
            markingImages.forEach((img, idx) =>
              logger.debug(
                {
                  skuCode: doc.skuCode,
                  index: idx + 1,
                  preview: img?.substring(0, 100) || "",
                },
                "[Report Generation] Marking image preview",
              ),
            );
          }
        }
        const auditorRemarks = Array.isArray(doc.remarks)
          ? doc.remarks.join("\n")
          : doc.remarks || "";
        const complianceRemarks = Array.isArray(doc.complianceRemarks)
          ? doc.complianceRemarks.join("\n")
          : doc.complianceRemarks || "";
        const complianceStatus = doc.complianceStatus || "Pending";

        const reasons = [];
        if (!markingImages.length) reasons.push("Marking photos missing");
        if (!hasMeaningfulValue(thicknessMentioned))
          reasons.push("Polymer thickness not provided");
        if (!hasMeaningfulValue(polymerUsed))
          reasons.push("Polymer type not provided");
        if (
          !hasMeaningfulValue(eprCertBrandOwner) &&
          !hasMeaningfulValue(eprCertProducer)
        ) {
          reasons.push("EPR certificate mapping unavailable");
        }

        const hasAnyData =
          [
            doc.skuCode,
            doc.skuDescription,
            brandOwner,
            eprCertBrandOwner,
            eprCertProducer,
            thicknessMentioned,
            polymerUsed,
            recycledPercent,
            compostableRegNo,
            auditorRemarks,
            complianceRemarks,
          ].some(hasMeaningfulValue) ||
          Boolean(productImage) ||
          markingImages.length > 0;

        return {
          index: index + 1,
          skuCode: doc.skuCode || "-",
          industryCategory:
            doc.industryCategory ||
            skuIndustryMap[(doc.skuCode || "").trim()] ||
            "General",
          skuDescription: doc.skuDescription || "-",
          skuUom: doc.skuUm || doc.skuUom || "-",
          productImage,
          hasProductImage: Boolean(productImage),
          brandOwner: hasMeaningfulValue(brandOwner) ? brandOwner : "",
          eprCertBrandOwner: hasMeaningfulValue(eprCertBrandOwner)
            ? eprCertBrandOwner
            : "",
          eprCertProducer: hasMeaningfulValue(eprCertProducer)
            ? eprCertProducer
            : "",
          thicknessMentioned: hasMeaningfulValue(thicknessMentioned)
            ? thicknessMentioned
            : "",
          polymerUsed: hasMeaningfulValue(polymerUsed) ? polymerUsed : "",
          recycledPercent: hasMeaningfulValue(recycledPercent)
            ? recycledPercent
            : "",
          compostableRegNo: hasMeaningfulValue(compostableRegNo)
            ? compostableRegNo
            : "",
          markingImages,
          hasMarkingImages: markingImages.length > 0,
          auditorRemarks: hasMeaningfulValue(auditorRemarks)
            ? auditorRemarks
            : "",
          complianceRemarks: hasMeaningfulValue(complianceRemarks)
            ? complianceRemarks
            : "",
          hasAuditorRemarks: hasMeaningfulValue(auditorRemarks),
          hasComplianceRemarks: hasMeaningfulValue(complianceRemarks),
          complianceStatus,
          complianceReasons: reasons,
          hasAnyData,
        };
      })
      .filter((row) => row.hasAnyData);

    logger.debug(
      { count: markingLabelingData.length },
      "[Report Generation] Final markingLabelingData count",
    );

    const markingLabelingReportByIndustry = Object.values(
      markingLabelingData.reduce((acc, item) => {
        const industryName =
          (item.industryCategory || "General").trim() || "General";
        if (!acc[industryName]) {
          acc[industryName] = {
            name: industryName,
            rows: [],
          };
        }
        acc[industryName].rows.push(item);
        return acc;
      }, {}),
    )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({
        ...group,
        rows: group.rows.sort((a, b) =>
          (a.skuCode || "").localeCompare(b.skuCode || ""),
        ),
      }));

    const industrySkuSummaryReport = industryCategories
      .map((category) => {
        const markingBySku = new Map(
          markingLabelingData.map((item) => [(item.skuCode || "").trim(), item]),
        );

        const rows = (category.skus || []).map((sku) => {
          const skuCode = (sku.skuCode || "").trim();
          const markingRow = markingBySku.get(skuCode) || {};
          const savedMarkingStatus = (markingRow.complianceStatus || "")
            .toString()
            .trim();
          const derivedMarkingStatus = (sku.markingDetails?.status || "")
            .toString()
            .trim();
          const supplierCounts = (sku.components || []).reduce(
            (acc, component, index) => {
              const status = (component?.supplierStatus || "")
                .toString()
                .trim()
                .toLowerCase();
              const componentCode = (component?.componentCode || "")
                .toString()
                .trim();
              const supplierName = (component?.supplierName || "")
                .toString()
                .trim()
                .toLowerCase();
              const supplierKey = `${componentCode}::${supplierName || `supplier-${index}`}`;

              if (status.includes("unregistered")) {
                acc.unregistered.add(supplierKey);
              } else if (status.includes("registered")) {
                acc.registered.add(supplierKey);
              }

              return acc;
            },
            { registered: new Set(), unregistered: new Set() },
          );
          const componentRemarks = (sku.components || [])
            .map((component) => {
              const remark = (component.auditorRemarks || "")
                .toString()
                .trim();
              if (!remark || remark === "-") return "";
              const componentCode = (component.componentCode || "")
                .toString()
                .trim();
              return componentCode ? `${componentCode}: ${remark}` : remark;
            })
            .filter(Boolean);

          const componentSolutions = (sku.components || [])
            .map((component) => {
              const status = (component?.status || "").toString().trim();
              const remark = (component?.managerRemarks || "")
                .toString()
                .trim();
              if (status !== "Non-Compliant" || !remark || remark === "-")
                return "";
              const componentCode = (component?.componentCode || "")
                .toString()
                .trim();
              return componentCode ? `${componentCode}: ${remark}` : remark;
            })
            .filter(Boolean);

          const markingRemarks = [
            (markingRow.auditorRemarks || "").toString().trim(),
            (markingRow.complianceRemarks || "").toString().trim(),
          ].filter((remark) => remark && remark !== "-");

          return {
            skuCode: skuCode || "-",
            skuDescription: sku.skuDescription || "-",
            complianceStatus: sku.status || "Pending",
            markingLabelingStatus:
              savedMarkingStatus || derivedMarkingStatus || "Pending",
            supplierRegisteredCount: supplierCounts.registered.size,
            supplierUnregisteredCount: supplierCounts.unregistered.size,
            remarks:
              [...new Set([...componentRemarks, ...markingRemarks])].join(
                "\n",
              ) || "-",
            solution:
              sku.status === "Non-Compliant"
                ? [...new Set(componentSolutions)].join("\n") || "-"
                : "-",
          };
        });

        return {
          name: category.name,
          rows,
        };
      })
      .filter((category) => category.rows.length > 0);

    const industryCategorySummaryReport = industrySkuSummaryReport.map(
      (category) => {
        const rows = Array.isArray(category.rows) ? category.rows : [];
        return {
          name: category.name,
          totalSku: rows.length,
          complianceCompliant: rows.filter(
            (row) => row.complianceStatus === "Compliant",
          ).length,
          complianceNonCompliant: rows.filter(
            (row) => row.complianceStatus === "Non-Compliant",
          ).length,
          markingCompliant: rows.filter(
            (row) => row.markingLabelingStatus === "Compliant",
          ).length,
          markingNonCompliant: rows.filter(
            (row) => row.markingLabelingStatus === "Non-Compliant",
          ).length,
        };
      },
    );

    const complianceOverview = (() => {
          const totals = industrySkuSummaryReport.reduce(
            (acc, category) => {
              (category.rows || []).forEach((row) => {
                const status = (row?.complianceStatus || "").toString().trim();
                if (status === "Compliant") acc.compliant += 1;
                else if (status === "Non-Compliant") acc.nonCompliant += 1;
                else acc.other += 1;
              });
              return acc;
            },
            { compliant: 0, nonCompliant: 0, other: 0 },
          );

          const totalSku =
            totals.compliant + totals.nonCompliant + totals.other;
          const compliantPctRaw = totalSku
            ? (totals.compliant / totalSku) * 100
            : 0;
          const nonCompliantPctRaw = totalSku
            ? (totals.nonCompliant / totalSku) * 100
            : 0;

          const compliantPct = Number(compliantPctRaw.toFixed(1));
          const nonCompliantPct = Number(nonCompliantPctRaw.toFixed(1));
          const otherPct = Number(
            Math.max(0, 100 - compliantPct - nonCompliantPct).toFixed(1),
          );

          const compliantStop = Number(compliantPctRaw.toFixed(2));
          const nonCompliantStop = Number(
            (compliantPctRaw + nonCompliantPctRaw).toFixed(2),
          );
          const donutGradient = `conic-gradient(#16a34a 0 ${compliantStop}%, #f97316 ${compliantStop}% ${nonCompliantStop}%, #94a3b8 ${nonCompliantStop}% 100%)`;

          return {
            totalSku,
            compliant: totals.compliant,
            nonCompliant: totals.nonCompliant,
            other: totals.other,
            compliantPct,
            nonCompliantPct,
            otherPct,
            donutGradient,
          };
        })();

    const complianceSnapshot = (() => {
          const allSkuRows = industrySkuSummaryReport.flatMap(
            (category) => category.rows || [],
          );
          const totalSkuAnalysed = allSkuRows.length;
          const compliant = allSkuRows.filter(
            (row) => row.complianceStatus === "Compliant",
          ).length;
          const nonCompliant = allSkuRows.filter(
            (row) => row.complianceStatus === "Non-Compliant",
          ).length;
          const markingCompliant = allSkuRows.filter(
            (row) => row.markingLabelingStatus === "Compliant",
          ).length;
          const markingCompliancePct = totalSkuAnalysed
            ? Number(((markingCompliant / totalSkuAnalysed) * 100).toFixed(1))
            : 0;

          const supplierSetRegistered = new Set();
          const supplierSetUnregistered = new Set();
          industryCategories.forEach((category) => {
            (category.skus || []).forEach((sku) => {
              (sku.components || []).forEach((component, index) => {
                const componentCode =
                  (component?.componentCode || "").toString().trim() ||
                  `comp-${index}`;
                const supplierName =
                  (component?.supplierName || "")
                    .toString()
                    .trim()
                    .toLowerCase() || `supplier-${index}`;
                const key = `${componentCode}::${supplierName}`;
                const status = (component?.supplierStatus || "")
                  .toString()
                  .trim()
                  .toLowerCase();
                if (status.includes("unregistered"))
                  supplierSetUnregistered.add(key);
                else if (status.includes("registered"))
                  supplierSetRegistered.add(key);
              });
            });
          });

          const nonCompliantPct = totalSkuAnalysed
            ? (nonCompliant / totalSkuAnalysed) * 100
            : 0;

          let eprReadinessStatus = "Low Risk";
          if (nonCompliantPct >= 50) eprReadinessStatus = "High Risk";
          else if (nonCompliantPct >= 20) eprReadinessStatus = "Medium Risk";

          return {
            totalSkuAnalysed,
            compliant,
            nonCompliant,
            registeredSuppliers: supplierSetRegistered.size,
            unregisteredSuppliers: supplierSetUnregistered.size,
            markingCompliancePct,
            eprReadinessStatus,
          };
        })();

    const sectionStatus = (() => {
      const iconMap = {
        complete: "✅",
        partial: "⚠",
        missing: "❌",
      };

      const buildStatus = (status) => ({
        status,
        icon: iconMap[status] || iconMap.missing,
      });

      const clientDataReady =
        hasMeaningfulValue(clientDoc?.clientName) &&
        hasMeaningfulValue(clientDoc?.entityType);
      const hasCte =
        Array.isArray(productionFacility?.cteDetailsList) &&
        productionFacility.cteDetailsList.length > 0;
      const hasCto =
        Array.isArray(productionFacility?.ctoDetailsList) &&
        productionFacility.ctoDetailsList.length > 0;
      const hasCteProd =
        Array.isArray(productionFacility?.cteProduction) &&
        productionFacility.cteProduction.length > 0;
      const hasCtoProd =
        Array.isArray(productionFacility?.ctoProducts) &&
        productionFacility.ctoProducts.length > 0;
      const plantReady = hasCte || hasCto || hasCteProd || hasCtoProd;
      const targetsReady =
        Array.isArray(targetTablesPrePost) && targetTablesPrePost.length > 0;

      if (isProducer) {
        return {
          clientData: buildStatus(clientDataReady ? "complete" : "missing"),
          plantConsent: buildStatus(plantReady ? "complete" : "missing"),
          skuCompliance: buildStatus(
            industryCategories.length ? "partial" : "missing",
          ),
          markingLabeling: buildStatus(
            markingLabelingData.length ? "complete" : "missing",
          ),
          targetsCalculation: buildStatus(
            targetsReady ? "complete" : "missing",
          ),
        };
      }

      const skuTotal = complianceOverview?.totalSku || 0;
      const skuNonCompliant = complianceOverview?.nonCompliant || 0;
      const skuOther = complianceOverview?.other || 0;
      const skuStatus =
        skuTotal === 0
          ? "missing"
          : skuNonCompliant > 0
            ? "missing"
            : skuOther > 0
              ? "partial"
              : "complete";

      const markingTotal = markingLabelingData.length;
      const markingNonCompliant = markingLabelingData.filter(
        (row) => row.complianceStatus === "Non-Compliant",
      ).length;
      const markingPending = markingLabelingData.filter(
        (row) => !["Compliant", "Non-Compliant"].includes(row.complianceStatus),
      ).length;
      const markingStatus =
        markingTotal === 0
          ? "missing"
          : markingNonCompliant > 0
            ? "missing"
            : markingPending > 0
              ? "partial"
              : "complete";

      return {
        clientData: buildStatus(clientDataReady ? "complete" : "missing"),
        plantConsent: buildStatus(plantReady ? "complete" : "missing"),
        skuCompliance: buildStatus(skuStatus),
        markingLabeling: buildStatus(markingStatus),
        targetsCalculation: buildStatus(targetsReady ? "complete" : "missing"),
      };
    })();

    const industryComplianceBarData = industrySkuSummaryReport.map((category) => {
          const rows = Array.isArray(category.rows) ? category.rows : [];
          const compliant = rows.filter(
            (row) => row.complianceStatus === "Compliant",
          ).length;
          const nonCompliant = rows.filter(
            (row) => row.complianceStatus === "Non-Compliant",
          ).length;
          const other = Math.max(0, rows.length - compliant - nonCompliant);
          const total = rows.length;
          const compliantPctRaw = total ? (compliant / total) * 100 : 0;
          const nonCompliantPctRaw = total ? (nonCompliant / total) * 100 : 0;
          const compliantPct = Number(compliantPctRaw.toFixed(1));
          const nonCompliantPct = Number(nonCompliantPctRaw.toFixed(1));
          const otherPct = Number(
            Math.max(0, 100 - compliantPct - nonCompliantPct).toFixed(1),
          );

          return {
            industry: category.name,
            compliant,
            nonCompliant,
            other,
            total,
            compliantPct,
            nonCompliantPct,
            otherPct,
          };
        });

    const annualTargetSummaryReport = (prePostSummary || []).map(
      (row, index) => {
        const preConsumer = parseFloat(row?.["Pre Consumer"] || 0) || 0;
        const postConsumer = parseFloat(row?.["Post Consumer"] || 0) || 0;

        return {
          key: `${row?.["Category of Plastic"] || "annual-target"}-${index}`,
          category: row?.["Category of Plastic"] || "-",
          procurementTons: row?.["Total Purchase"] ?? 0,
          salesTons: parseFloat((preConsumer + postConsumer).toFixed(4)),
          exportTons: row?.["Export"] ?? 0,
        };
      },
    );

    const skuDescriptionMap = {};
    allRows.forEach((row) => {
      const skuCode = (row?.skuCode || "").toString().trim();
      if (!skuCode || skuDescriptionMap[skuCode]) return;
      skuDescriptionMap[skuCode] = row?.skuDescription || "";
    });

    const costAnalysisByIndustry = {};
    (procurementDetails || []).forEach((row) => {
      const skuCode = (row?.skuCode || "").toString().trim();
      if (!skuCode) return;

      const industryName =
        (skuIndustryMap[skuCode] || "General").toString().trim() || "General";
      const skuDescription =
        (skuDescriptionMap[skuCode] || "").toString().trim() || "-";
      const supplierName = (row?.supplierName || "-").toString().trim() || "-";
      const componentCode =
        (row?.componentCode || "-").toString().trim() || "-";
      const componentDescription =
        (row?.componentDescription || "-").toString().trim() || "-";
      const monthName = (
        row?.monthName ||
        row?.quarter ||
        row?.yearlyQuarter ||
        ""
      )
        .toString()
        .trim();

      const procurementTons = parseFloat(row?.monthlyPurchaseMt || 0) || 0;
      const virginQty = parseFloat(row?.virginQty || 0) || 0;
      const recycledQty = parseFloat(row?.recycledQty || 0) || 0;
      const virginAmount = parseFloat(row?.virginQtyAmount || 0) || 0;
      const recycledAmount = parseFloat(row?.recycledQrtAmount || 0) || 0;

      if (!costAnalysisByIndustry[industryName]) {
        costAnalysisByIndustry[industryName] = { name: industryName, skus: {} };
      }
      const industryBucket = costAnalysisByIndustry[industryName];
      if (!industryBucket.skus[skuCode]) {
        industryBucket.skus[skuCode] = {
          skuCode,
          skuDescription,
          procurementTons: 0,
          virginQty: 0,
          recycledQty: 0,
          virginAmount: 0,
          recycledAmount: 0,
          totalCost: 0,
          suppliers: {},
        };
      }
      const skuBucket = industryBucket.skus[skuCode];

      skuBucket.procurementTons += procurementTons;
      skuBucket.virginQty += virginQty;
      skuBucket.recycledQty += recycledQty;
      skuBucket.virginAmount += virginAmount;
      skuBucket.recycledAmount += recycledAmount;
      skuBucket.totalCost += virginAmount + recycledAmount;

      const supplierKey = `${supplierName.toLowerCase()}::${componentCode.toLowerCase()}`;
      if (!skuBucket.suppliers[supplierKey]) {
        skuBucket.suppliers[supplierKey] = {
          supplierName,
          componentCode,
          componentDescription,
          procurementTons: 0,
          virginQty: 0,
          virginAmount: 0,
          recycledQty: 0,
          recycledAmount: 0,
          periods: new Set(),
        };
      }
      const supplierBucket = skuBucket.suppliers[supplierKey];
      supplierBucket.procurementTons += procurementTons;
      supplierBucket.virginQty += virginQty;
      supplierBucket.virginAmount += virginAmount;
      supplierBucket.recycledQty += recycledQty;
      supplierBucket.recycledAmount += recycledAmount;
      if (monthName) supplierBucket.periods.add(monthName);
    });

    const costAnalysisReport = Object.values(costAnalysisByIndustry)
      .map((industry) => {
        const skus = Object.values(industry.skus)
          .map((sku) => {
            const supplierRows = Object.values(sku.suppliers)
              .map((supplier) => {
                const totalQty =
                  (supplier.virginQty || 0) + (supplier.recycledQty || 0);
                const totalAmount =
                  (supplier.virginAmount || 0) + (supplier.recycledAmount || 0);
                const avgRate = totalQty > 0 ? totalAmount / totalQty : 0;

                const virginRate =
                  supplier.virginQty > 0
                    ? supplier.virginAmount / supplier.virginQty
                    : 0;
                const recycledRate =
                  supplier.recycledQty > 0
                    ? supplier.recycledAmount / supplier.recycledQty
                    : 0;

                return {
                  supplierName: supplier.supplierName,
                  componentCode: supplier.componentCode,
                  componentDescription: supplier.componentDescription,
                  period: [...supplier.periods].join(", ") || "-",
                  procurementTons: supplier.procurementTons.toFixed(4),
                  virginQty: supplier.virginQty.toFixed(4),
                  virginRate:
                    supplier.virginQty > 0 ? virginRate.toFixed(2) : "-",
                  virginAmount: supplier.virginAmount.toFixed(2),
                  recycledQty: supplier.recycledQty.toFixed(4),
                  recycledRate:
                    supplier.recycledQty > 0 ? recycledRate.toFixed(2) : "-",
                  recycledAmount: supplier.recycledAmount.toFixed(2),
                  totalAmount: totalAmount.toFixed(2),
                  avgRate: totalQty > 0 ? avgRate.toFixed(2) : "-",
                };
              })
              .sort((a, b) =>
                (a.supplierName || "").localeCompare(b.supplierName || ""),
              );

            const avgRateSku =
              sku.procurementTons > 0 ? sku.totalCost / sku.procurementTons : 0;

            return {
              skuCode: sku.skuCode,
              skuDescription: sku.skuDescription,
              procurementTons: sku.procurementTons.toFixed(4),
              virginQty: sku.virginQty.toFixed(4),
              recycledQty: sku.recycledQty.toFixed(4),
              virginAmount: sku.virginAmount.toFixed(2),
              recycledAmount: sku.recycledAmount.toFixed(2),
              totalCost: sku.totalCost.toFixed(2),
              avgRate: sku.procurementTons > 0 ? avgRateSku.toFixed(2) : "-",
              suppliers: supplierRows,
            };
          })
          .sort((a, b) => (a.skuCode || "").localeCompare(b.skuCode || ""));

        const industryTotals = skus.reduce(
          (acc, sku) => {
            acc.procurementTons += parseFloat(sku.procurementTons || 0) || 0;
            acc.totalCost += parseFloat(sku.totalCost || 0) || 0;
            return acc;
          },
          { procurementTons: 0, totalCost: 0 },
        );

        return {
          name: industry.name,
          procurementTons: industryTotals.procurementTons.toFixed(4),
          totalCost: industryTotals.totalCost.toFixed(2),
          skus,
        };
      })
      .filter((industry) => industry.skus.length > 0)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const normalizePolymerName = (value) => {
      const v = (value || "").toString().trim();
      if (!v) return "";
      const u = v.toUpperCase();
      if (["PP", "PET", "LLDPE", "LDPE", "HDPE"].includes(u)) return u;
      return v;
    };

    const derivePolymerNameFromRow = (row) => {
      const direct = pickText(
        row?.componentPolymer,
        row?.polymerType,
        row?.["Polymer Type"],
        row?.polymer,
        row?.["Polymer"],
      );
      return normalizePolymerName(direct) || "Unknown";
    };

    const deriveCategoryFromRow = (row) => {
      const direct = pickText(
        row?.category,
        row?.plasticCategory,
        row?.["Category"],
      );
      return direct || "Unknown";
    };

    const buildGroupedCostAnalysis = (groupBy) => {
      const map = {};

      (procurementDetails || []).forEach((row) => {
        const skuCode = (row?.skuCode || "").toString().trim();
        if (!skuCode) return;

        const supplierName =
          (row?.supplierName || "Unknown").toString().trim() || "Unknown";
        const componentName =
          pickText(
            row?.componentName,
            row?.componentDescription,
            row?.componentCode,
          ) || "Unknown";

        const category = deriveCategoryFromRow(row);
        const polymerName = derivePolymerNameFromRow(row);
        const recycledPolymerUsed =
          pickText(
            row?.recycledPolymerUsed,
            row?.recycled_polymer_used,
            row?.["Recycled Polymer Used"],
          ) || "-";

        const virginQty = parseFloat(row?.virginQty || 0) || 0;
        const recycledQty = parseFloat(row?.recycledQty || 0) || 0;
        const virginAmount = parseFloat(row?.virginQtyAmount || 0) || 0;
        const recycledAmount = parseFloat(row?.recycledQrtAmount || 0) || 0;

        let groupName = "Unknown";
        if (groupBy === "category") groupName = category;
        if (groupBy === "polymer") groupName = polymerName;
        if (groupBy === "supplier") groupName = supplierName;
        if (groupBy === "component") groupName = componentName;

        if (!map[groupName]) {
          map[groupName] = {
            name: groupName,
            annualPurchaseMt: 0,
            recycledQty: 0,
            recycledAmount: 0,
            virginQty: 0,
            virginAmount: 0,
            totalSpend: 0,
            details: [],
          };
        }

        const bucket = map[groupName];
        bucket.annualPurchaseMt += parseFloat(row?.monthlyPurchaseMt || 0) || 0;
        bucket.recycledQty += recycledQty;
        bucket.recycledAmount += recycledAmount;
        bucket.virginQty += virginQty;
        bucket.virginAmount += virginAmount;
        bucket.totalSpend += virginAmount + recycledAmount;

        bucket.details.push({
          supplierName,
          skuCode,
          skuDescription:
            (skuDescriptionMap[skuCode] || "").toString().trim() || "-",
          componentName,
          category,
          polymerName,
          recycledPolymerUsed,
          annualPurchaseMt: (parseFloat(row?.monthlyPurchaseMt || 0) || 0).toFixed(4),
          recycledQty: recycledQty.toFixed(4),
          recycledAmount: recycledAmount.toFixed(2),
          virginQty: virginQty.toFixed(4),
          virginAmount: virginAmount.toFixed(2),
          totalSpend: (virginAmount + recycledAmount).toFixed(2),
        });
      });

      return Object.values(map)
        .map((group) => ({
          ...group,
          annualPurchaseMt: group.annualPurchaseMt.toFixed(4),
          recycledQty: group.recycledQty.toFixed(4),
          recycledAmount: group.recycledAmount.toFixed(2),
          virginQty: group.virginQty.toFixed(4),
          virginAmount: group.virginAmount.toFixed(2),
          totalSpend: group.totalSpend.toFixed(2),
          details: group.details.sort((a, b) => {
            const supplierCompare = (a.supplierName || "").localeCompare(
              b.supplierName || "",
            );
            if (supplierCompare !== 0) return supplierCompare;
            const skuCompare = (a.skuCode || "").localeCompare(b.skuCode || "");
            if (skuCompare !== 0) return skuCompare;
            return (a.componentName || "").localeCompare(b.componentName || "");
          }),
        }))
        .filter((g) => g.details.length > 0)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    };

    const groupCostDetailsBySupplier = (details) => {
      const map = new Map();
      (details || []).forEach((row) => {
        const supplierName =
          (row?.supplierName || "Unknown").toString().trim() || "Unknown";
        if (!map.has(supplierName)) map.set(supplierName, []);
        map.get(supplierName).push(row);
      });
      return Array.from(map.entries())
        .map(([supplierName, rows]) => {
          const totals = (rows || []).reduce(
            (acc, row) => {
              acc.annualPurchaseMt += parseFloat(row?.annualPurchaseMt || 0) || 0;
              acc.recycledQty += parseFloat(row?.recycledQty || 0) || 0;
              acc.virginQty += parseFloat(row?.virginQty || 0) || 0;
              acc.recycledAmount += parseFloat(row?.recycledAmount || 0) || 0;
              acc.virginAmount += parseFloat(row?.virginAmount || 0) || 0;
              acc.totalSpend += parseFloat(row?.totalSpend || 0) || 0;
              return acc;
            },
            {
              annualPurchaseMt: 0,
              recycledQty: 0,
              virginQty: 0,
              recycledAmount: 0,
              virginAmount: 0,
              totalSpend: 0,
            },
          );

          return {
            supplierName,
            totals: {
              annualPurchaseMt: totals.annualPurchaseMt.toFixed(4),
              recycledQty: totals.recycledQty.toFixed(4),
              virginQty: totals.virginQty.toFixed(4),
              recycledAmount: totals.recycledAmount.toFixed(2),
              virginAmount: totals.virginAmount.toFixed(2),
              totalSpend: totals.totalSpend.toFixed(2),
            },
            rows: (rows || []).sort((a, b) => {
              const skuCompare = (a.skuCode || "").localeCompare(b.skuCode || "");
              if (skuCompare !== 0) return skuCompare;
              return (a.componentName || "").localeCompare(b.componentName || "");
            }),
          };
        })
        .sort((a, b) =>
          (a.supplierName || "").localeCompare(b.supplierName || ""),
        );
    };

    const withSupplierGroups = (groups) =>
      (groups || []).map((g) => ({
        ...g,
        suppliers: groupCostDetailsBySupplier(g.details || []),
      }));

    const costAnalysisCategoryReport = withSupplierGroups(
      buildGroupedCostAnalysis("category"),
    );
    const costAnalysisPolymerReport = withSupplierGroups(
      buildGroupedCostAnalysis("polymer"),
    );
    const costAnalysisSupplierReport = buildGroupedCostAnalysis("supplier");
    const costAnalysisComponentReport = withSupplierGroups(
      buildGroupedCostAnalysis("component"),
    );

    const costAnalysisSkuDetails = [];
    (costAnalysisReport || []).forEach((industry) => {
      (industry?.skus || []).forEach((sku) => {
        costAnalysisSkuDetails.push({
          industryName: industry?.name || "-",
          ...sku,
          isFirst: false,
        });
      });
    });
    if (costAnalysisSkuDetails.length) costAnalysisSkuDetails[0].isFirst = true;

    const finalizePdfCostRows = (rows) =>
      (rows || [])
        .map((row) => {
          const annualPurchaseMtRaw = Number(row?.annualPurchaseMtRaw || 0) || 0;
          const recycledQtyRaw = Number(row?.recycledQtyRaw || 0) || 0;
          const virginQtyRaw = Number(row?.virginQtyRaw || 0) || 0;
          const recycledAmountRaw = Number(row?.recycledAmountRaw || 0) || 0;
          const virginAmountRaw = Number(row?.virginAmountRaw || 0) || 0;
          const annualSpendRaw = recycledAmountRaw + virginAmountRaw;
          const recycledSharePctRaw =
            annualPurchaseMtRaw > 0
              ? (recycledQtyRaw / annualPurchaseMtRaw) * 100
              : 0;

          return {
            ...row,
            annualPurchaseMt: formatNumber(annualPurchaseMtRaw, 3),
            recycledQty: formatNumber(recycledQtyRaw, 3),
            virginQty: formatNumber(virginQtyRaw, 3),
            recycledAmount: formatNumber(recycledAmountRaw, 2),
            virginAmount: formatNumber(virginAmountRaw, 2),
            totalSpend: formatNumber(annualSpendRaw, 2),
            recycledSharePct: formatPercent(recycledSharePctRaw, 1),
            sortValue: annualPurchaseMtRaw,
          };
        })
        .sort((a, b) => {
          if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
          return (a.name || "").localeCompare(b.name || "");
        });

    const buildPdfCostGroups = (groupBy) => {
      const map = new Map();

      (procurementDetails || []).forEach((row, index) => {
        const skuCode =
          normalizeText(row?.skuCode) ||
          normalizeText(row?.systemCode) ||
          normalizeText(row?.componentCode) ||
          `sku-${index + 1}`;
        const skuDescription =
          (skuDescriptionMap[skuCode] || "").toString().trim() || "-";
        const industryName =
          (skuIndustryMap[skuCode] || row?.industryCategory || "")
            .toString()
            .trim() || "-";
        const supplierName =
          normalizeText(row?.supplierName) || "Unknown Supplier";
        const supplierStatus =
          normalizeText(row?.supplierStatus) ||
          supplierStatusByName.get(supplierName.toLowerCase()) ||
          "-";
        const category = deriveCategoryFromRow(row);
        const polymerName = derivePolymerNameFromRow(row);

        let key = skuCode;
        let name = skuCode;
        let baseFields = {
          skuCode,
          skuDescription,
          industryName,
          supplierStatus,
        };

        if (groupBy === "polymer") {
          key = polymerName.toLowerCase();
          name = polymerName;
          baseFields = {};
        } else if (groupBy === "category") {
          key = category.toLowerCase();
          name = category;
          baseFields = {};
        } else if (groupBy === "supplier") {
          key = supplierName.toLowerCase();
          name = supplierName;
          baseFields = { supplierStatus };
        }

        if (!map.has(key)) {
          map.set(key, {
            key,
            name,
            ...baseFields,
            annualPurchaseMtRaw: 0,
            recycledQtyRaw: 0,
            virginQtyRaw: 0,
            recycledAmountRaw: 0,
            virginAmountRaw: 0,
          });
        }

        const bucket = map.get(key);
        bucket.annualPurchaseMtRaw += Number(row?.monthlyPurchaseMt || 0) || 0;
        bucket.recycledQtyRaw += Number(row?.recycledQty || 0) || 0;
        bucket.virginQtyRaw += Number(row?.virginQty || 0) || 0;
        bucket.recycledAmountRaw += Number(row?.recycledQrtAmount || 0) || 0;
        bucket.virginAmountRaw += Number(row?.virginQtyAmount || 0) || 0;
      });

      return finalizePdfCostRows(Array.from(map.values()));
    };

    const buildPdfCostSection = (rows, countLabel) => {
      const totalsRaw = (rows || []).reduce(
        (acc, row) => {
          acc.annualPurchaseMtRaw += Number(row?.annualPurchaseMtRaw || 0) || 0;
          acc.recycledQtyRaw += Number(row?.recycledQtyRaw || 0) || 0;
          acc.virginQtyRaw += Number(row?.virginQtyRaw || 0) || 0;
          acc.recycledAmountRaw += Number(row?.recycledAmountRaw || 0) || 0;
          acc.virginAmountRaw += Number(row?.virginAmountRaw || 0) || 0;
          return acc;
        },
        {
          annualPurchaseMtRaw: 0,
          recycledQtyRaw: 0,
          virginQtyRaw: 0,
          recycledAmountRaw: 0,
          virginAmountRaw: 0,
        },
      );

      const annualSpendRaw =
        totalsRaw.recycledAmountRaw + totalsRaw.virginAmountRaw;
      const recycledSharePctRaw =
        totalsRaw.annualPurchaseMtRaw > 0
          ? (totalsRaw.recycledQtyRaw / totalsRaw.annualPurchaseMtRaw) * 100
          : 0;

      return {
        countLabel,
        totalGroups: rows.length,
        cards: [
          {
            label: "Annual Purchase MT",
            value: formatNumber(totalsRaw.annualPurchaseMtRaw, 3),
          },
          {
            label: "Recycled Qty",
            value: formatNumber(totalsRaw.recycledQtyRaw, 3),
          },
          {
            label: "Virgin Qty",
            value: formatNumber(totalsRaw.virginQtyRaw, 3),
          },
          {
            label: "Recycled Amount",
            value: formatNumber(totalsRaw.recycledAmountRaw, 2),
          },
          {
            label: "Virgin Amount",
            value: formatNumber(totalsRaw.virginAmountRaw, 2),
          },
        ],
        rows,
        totals: {
          annualPurchaseMt: formatNumber(totalsRaw.annualPurchaseMtRaw, 3),
          recycledQty: formatNumber(totalsRaw.recycledQtyRaw, 3),
          virginQty: formatNumber(totalsRaw.virginQtyRaw, 3),
          recycledAmount: formatNumber(totalsRaw.recycledAmountRaw, 2),
          virginAmount: formatNumber(totalsRaw.virginAmountRaw, 2),
          totalSpend: formatNumber(annualSpendRaw, 2),
          recycledSharePct: formatPercent(recycledSharePctRaw, 1),
        },
      };
    };

    const getMonthMetaFromProcurementRow = (row) => {
      const invoiceDate =
        row?.dateOfInvoice instanceof Date
          ? row.dateOfInvoice
          : row?.dateOfInvoice
            ? new Date(row.dateOfInvoice)
            : null;

      if (invoiceDate && !Number.isNaN(invoiceDate.getTime())) {
        const year = invoiceDate.getFullYear();
        const month = invoiceDate.getMonth();
        return {
          key: `${year}-${String(month + 1).padStart(2, "0")}`,
          sortKey: `${year}-${String(month + 1).padStart(2, "0")}`,
          label: invoiceDate.toLocaleString("en-GB", {
            month: "short",
            year: "numeric",
          }),
        };
      }

      const monthText = normalizeText(row?.monthName);
      if (!monthText) return null;

      const shortMonths = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];
      const monthIndex = shortMonths.findIndex((m) =>
        monthText.toLowerCase().startsWith(m),
      );

      if (monthIndex >= 0) {
        const normalized = String(monthIndex + 1).padStart(2, "0");
        return {
          key: `fallback-${normalized}`,
          sortKey: `9999-${normalized}`,
          label: monthText,
        };
      }

      return {
        key: `fallback-${monthText.toLowerCase()}`,
        sortKey: `9999-${monthText.toLowerCase()}`,
        label: monthText,
      };
    };

    const pdfCostAnalysisSections = {
      skuWise: buildPdfCostSection(buildPdfCostGroups("sku"), "Total SKU"),
      polymerWise: buildPdfCostSection(buildPdfCostGroups("polymer"), "Total Polymers"),
      categoryWise: buildPdfCostSection(buildPdfCostGroups("category"), "Total Categories"),
      supplierWise: buildPdfCostSection(buildPdfCostGroups("supplier"), "Total Suppliers"),
    };

    const buildPdfMonthlyCostGroups = (groupBy) => {
      const map = new Map();

      (procurementDetails || []).forEach((row, index) => {
        const monthMeta = getMonthMetaFromProcurementRow(row);
        if (!monthMeta) return;

        const skuCode =
          normalizeText(row?.skuCode) ||
          normalizeText(row?.systemCode) ||
          normalizeText(row?.componentCode) ||
          `sku-${index + 1}`;
        const skuDescription =
          (skuDescriptionMap[skuCode] || "").toString().trim() || "-";
        const industryName =
          (skuIndustryMap[skuCode] || row?.industryCategory || "")
            .toString()
            .trim() || "-";
        const supplierName =
          normalizeText(row?.supplierName) || "Unknown Supplier";
        const supplierStatus =
          normalizeText(row?.supplierStatus) ||
          supplierStatusByName.get(supplierName.toLowerCase()) ||
          "-";
        const category = deriveCategoryFromRow(row);
        const polymerName = derivePolymerNameFromRow(row);

        let groupKey = skuCode;
        let name = skuCode;
        let baseFields = {
          skuCode,
          skuDescription,
          industryName,
          supplierStatus,
        };

        if (groupBy === "polymer") {
          groupKey = polymerName.toLowerCase();
          name = polymerName;
          baseFields = {};
        } else if (groupBy === "category") {
          groupKey = category.toLowerCase();
          name = category;
          baseFields = {};
        } else if (groupBy === "supplier") {
          groupKey = supplierName.toLowerCase();
          name = supplierName;
          baseFields = { supplierStatus };
        }

        const bucketKey = `${groupKey}::${monthMeta.key}`;
        if (!map.has(bucketKey)) {
          map.set(bucketKey, {
            key: bucketKey,
            name,
            monthKey: monthMeta.key,
            monthSortKey: monthMeta.sortKey,
            monthLabel: monthMeta.label,
            ...baseFields,
            monthlyPurchaseMtRaw: 0,
            recycledQtyRaw: 0,
            virginQtyRaw: 0,
            recycledAmountRaw: 0,
            virginAmountRaw: 0,
          });
        }

        const bucket = map.get(bucketKey);
        bucket.monthlyPurchaseMtRaw += Number(row?.monthlyPurchaseMt || 0) || 0;
        bucket.recycledQtyRaw += Number(row?.recycledQty || 0) || 0;
        bucket.virginQtyRaw += Number(row?.virginQty || 0) || 0;
        bucket.recycledAmountRaw += Number(row?.recycledQrtAmount || 0) || 0;
        bucket.virginAmountRaw += Number(row?.virginQtyAmount || 0) || 0;
      });

      return Array.from(map.values())
        .map((row) => {
          const monthlyPurchaseMtRaw = Number(row?.monthlyPurchaseMtRaw || 0) || 0;
          const recycledQtyRaw = Number(row?.recycledQtyRaw || 0) || 0;
          const virginQtyRaw = Number(row?.virginQtyRaw || 0) || 0;
          const recycledAmountRaw = Number(row?.recycledAmountRaw || 0) || 0;
          const virginAmountRaw = Number(row?.virginAmountRaw || 0) || 0;
          const recycledSharePctRaw =
            monthlyPurchaseMtRaw > 0
              ? (recycledQtyRaw / monthlyPurchaseMtRaw) * 100
              : 0;

          return {
            ...row,
            monthlyPurchaseMtRaw,
            recycledQtyRaw,
            virginQtyRaw,
            recycledAmountRaw,
            virginAmountRaw,
            monthlyPurchaseMt: formatNumber(monthlyPurchaseMtRaw, 3),
            recycledQty: formatNumber(recycledQtyRaw, 3),
            virginQty: formatNumber(virginQtyRaw, 3),
            recycledAmount: formatNumber(recycledAmountRaw, 2),
            virginAmount: formatNumber(virginAmountRaw, 2),
            recycledSharePct: formatPercent(recycledSharePctRaw, 1),
          };
        })
        .sort((a, b) => {
          const monthCompare = (a.monthSortKey || "").localeCompare(
            b.monthSortKey || "",
          );
          if (monthCompare !== 0) return monthCompare;
          const valueCompare =
            (Number(b.monthlyPurchaseMtRaw || 0) || 0) -
            (Number(a.monthlyPurchaseMtRaw || 0) || 0);
          if (valueCompare !== 0) return valueCompare;
          return (a.name || "").localeCompare(b.name || "");
        });
    };

    const buildPdfMonthlySection = (rows, countLabel) => {
      const totalsRaw = (rows || []).reduce(
        (acc, row) => {
          acc.monthlyPurchaseMtRaw += Number(row?.monthlyPurchaseMtRaw || 0) || 0;
          acc.recycledQtyRaw += Number(row?.recycledQtyRaw || 0) || 0;
          acc.virginQtyRaw += Number(row?.virginQtyRaw || 0) || 0;
          acc.recycledAmountRaw += Number(row?.recycledAmountRaw || 0) || 0;
          acc.virginAmountRaw += Number(row?.virginAmountRaw || 0) || 0;
          return acc;
        },
        {
          monthlyPurchaseMtRaw: 0,
          recycledQtyRaw: 0,
          virginQtyRaw: 0,
          recycledAmountRaw: 0,
          virginAmountRaw: 0,
        },
      );

      const monthTotals = new Map();
      (rows || []).forEach((row) => {
        const key = row?.monthKey || "-";
        const existing = monthTotals.get(key) || {
          key,
          label: row?.monthLabel || "-",
          sortKey: row?.monthSortKey || key,
          purchase: 0,
        };
        existing.purchase += Number(row?.monthlyPurchaseMtRaw || 0) || 0;
        monthTotals.set(key, existing);
      });

      const orderedMonths = Array.from(monthTotals.values()).sort((a, b) =>
        (a.sortKey || "").localeCompare(b.sortKey || ""),
      );
      const monthlyMetricsByMonth = new Map();
      (rows || []).forEach((row) => {
        const key = row?.monthKey || "-";
        const existing = monthlyMetricsByMonth.get(key) || {
          key,
          label: row?.monthLabel || "-",
          sortKey: row?.monthSortKey || key,
          monthlyPurchaseMtRaw: 0,
          recycledQtyRaw: 0,
          virginQtyRaw: 0,
        };
        existing.monthlyPurchaseMtRaw += Number(row?.monthlyPurchaseMtRaw || 0) || 0;
        existing.recycledQtyRaw += Number(row?.recycledQtyRaw || 0) || 0;
        existing.virginQtyRaw += Number(row?.virginQtyRaw || 0) || 0;
        monthlyMetricsByMonth.set(key, existing);
      });

      const orderedMetricMonths = Array.from(monthlyMetricsByMonth.values()).sort(
        (a, b) => (a.sortKey || "").localeCompare(b.sortKey || ""),
      );
      const maxMonthlyPurchase = orderedMetricMonths.reduce(
        (max, item) => Math.max(max, Number(item.monthlyPurchaseMtRaw || 0) || 0),
        0,
      );
      const maxRecycledQty = orderedMetricMonths.reduce(
        (max, item) => Math.max(max, Number(item.recycledQtyRaw || 0) || 0),
        0,
      );
      const maxVirginQty = orderedMetricMonths.reduce(
        (max, item) => Math.max(max, Number(item.virginQtyRaw || 0) || 0),
        0,
      );
      const latestMonth = orderedMonths[orderedMonths.length - 1] || null;
      const peakMonth = orderedMonths.reduce(
        (best, month) => (month.purchase > (best?.purchase || 0) ? month : best),
        null,
      );
      const recycledSharePctRaw =
        totalsRaw.monthlyPurchaseMtRaw > 0
          ? (totalsRaw.recycledQtyRaw / totalsRaw.monthlyPurchaseMtRaw) * 100
          : 0;

      return {
        countLabel,
        cards: [
          {
            label: "Months Covered",
            value: String(orderedMonths.length),
          },
          {
            label: "Latest Invoice Month",
            value: latestMonth?.label || "-",
          },
          {
            label: "Peak Purchase Month",
            value: peakMonth?.label || "-",
          },
          {
            label: "Peak Purchase MT",
            value: formatNumber(peakMonth?.purchase || 0, 3),
          },
          {
            label: "Recycled Share",
            value: `${formatPercent(recycledSharePctRaw, 1)}%`,
          },
        ],
        monthlyChart: {
          purchase: orderedMetricMonths.map((item) => ({
            label: item.label,
            value: formatNumber(item.monthlyPurchaseMtRaw, 3),
            pct:
              maxMonthlyPurchase > 0
                ? Math.max(
                    6,
                    Math.round((item.monthlyPurchaseMtRaw / maxMonthlyPurchase) * 100),
                  )
                : 0,
          })),
          recycled: orderedMetricMonths.map((item) => ({
            label: item.label,
            value: formatNumber(item.recycledQtyRaw, 3),
            pct:
              maxRecycledQty > 0
                ? Math.max(
                    6,
                    Math.round((item.recycledQtyRaw / maxRecycledQty) * 100),
                  )
                : 0,
          })),
          virgin: orderedMetricMonths.map((item) => ({
            label: item.label,
            value: formatNumber(item.virginQtyRaw, 3),
            pct:
              maxVirginQty > 0
                ? Math.max(
                    6,
                    Math.round((item.virginQtyRaw / maxVirginQty) * 100),
                  )
                : 0,
          })),
        },
        rows,
        totals: {
          monthlyPurchaseMt: formatNumber(totalsRaw.monthlyPurchaseMtRaw, 3),
          recycledQty: formatNumber(totalsRaw.recycledQtyRaw, 3),
          virginQty: formatNumber(totalsRaw.virginQtyRaw, 3),
          recycledAmount: formatNumber(totalsRaw.recycledAmountRaw, 2),
          virginAmount: formatNumber(totalsRaw.virginAmountRaw, 2),
          recycledSharePct: formatPercent(recycledSharePctRaw, 1),
        },
      };
    };

    pdfCostAnalysisSections.skuWise.monthly = buildPdfMonthlySection(
      buildPdfMonthlyCostGroups("sku"),
      "Total SKU Months",
    );
    pdfCostAnalysisSections.polymerWise.monthly = buildPdfMonthlySection(
      buildPdfMonthlyCostGroups("polymer"),
      "Total Polymer Months",
    );
    pdfCostAnalysisSections.categoryWise.monthly = buildPdfMonthlySection(
      buildPdfMonthlyCostGroups("category"),
      "Total Category Months",
    );
    pdfCostAnalysisSections.supplierWise.monthly = buildPdfMonthlySection(
      buildPdfMonthlyCostGroups("supplier"),
      "Total Supplier Months",
    );

    // 4. Calculate Sales & Purchase Summary (Registered vs Unregistered)
    const normalizeCategory = (val) => {
      if (!val) return null;
      const v = String(val).toUpperCase();

      // Priority matching for Roman Numerals (V > IV > III > II > I) to avoid subset matching
      if (
        v.includes("CAT-V") ||
        v.includes("CAT V") ||
        v.includes("CATEGORY V") ||
        /\bV\b/.test(v)
      )
        return "Cat-V";
      if (
        v.includes("IV") ||
        v.includes("CAT-IV") ||
        v.includes("CAT IV") ||
        v.includes("CATEGORY IV")
      )
        return "Cat-IV";
      if (
        v.includes("III") ||
        v.includes("CAT-III") ||
        v.includes("CAT III") ||
        v.includes("CATEGORY III")
      )
        return "Cat-III";
      if (
        v.includes("II") ||
        v.includes("CAT-II") ||
        v.includes("CAT II") ||
        v.includes("CATEGORY II")
      )
        return "Cat-II";

      // Check for Cat I variations, including "Cat I (Containers...)"
      if (
        v.includes("CAT-I") ||
        v.includes("CAT I") ||
        v.includes("CATEGORY I") ||
        (v.includes("I") && v.includes("CONTAINER"))
      )
        return "Cat-I";

      // Fallback: Check if it just contains "I" but ensure it's not part of II, III, IV (already checked above)
      // This handles cases like "Cat I" where Roman I is distinct
      // Using regex to ensure 'I' is a standalone word or at end of string
      if (/\bI\b/.test(v) || /CAT.*I/.test(v)) return "Cat-I";

      return null;
    };

    // --- Sales Summary Aggregation ---
    const salesDataRaw = analysisDoc?.salesRows || [];
    const salesAgg = {
      "Cat-I": { registered: {}, unregistered: {} },
      "Cat-II": { registered: {}, unregistered: {} },
      "Cat-III": { registered: {}, unregistered: {} },
      "Cat-IV": { registered: {}, unregistered: {} },
      "Cat-V": { registered: {}, unregistered: {} },
    };
    const salesYears = new Set();

    // Ensure we catch years even if they are numbers
    salesDataRaw.forEach((row) => {
      const cat = normalizeCategory(row.plasticCategory);
      if (cat && salesAgg[cat]) {
        // Handle various year formats: "2023-24", "2023", 2023
        let year = row.financialYear || "Unknown";
        if (typeof year === "number") year = String(year);

        if (year !== "Unknown") salesYears.add(year);

        const type = (row.registrationType || "unregistered").toLowerCase();
        const isRegistered =
          type.includes("registered") && !type.includes("unregistered");
        const qty = parseFloat(row.totalPlasticQty || 0);

        const targetObj = isRegistered
          ? salesAgg[cat].registered
          : salesAgg[cat].unregistered;
        targetObj[year] = (targetObj[year] || 0) + qty;
        targetObj.total = (targetObj.total || 0) + qty;
      }
    });

    // Default years if none found (fallback to current FY logic)
    if (salesYears.size === 0) {
      const currentYear = new Date().getFullYear();
      salesYears.add(`${currentYear - 1}-${String(currentYear).slice(2)}`);
      salesYears.add(`${currentYear}-${String(currentYear + 1).slice(2)}`);
    }

    const sortedSalesYears = Array.from(salesYears).sort(); // Sort chronological
    // Show ALL available years instead of slicing last 2
    const displaySalesYears = sortedSalesYears;

    const salesSummaryTable = Object.keys(salesAgg).map((cat) => {
      const reg = salesAgg[cat].registered;
      const unreg = salesAgg[cat].unregistered;

      const row = {
        category: cat,
        regTotal: (reg.total || 0).toFixed(2),
        unregTotal: (unreg.total || 0).toFixed(2),
      };

      // Dynamic Year Columns
      displaySalesYears.forEach((year, idx) => {
        row[`regY${idx + 1}`] = (reg[year] || 0).toFixed(2);
        row[`unregY${idx + 1}`] = (unreg[year] || 0).toFixed(2);
      });

      return row;
    });

    // Add Total Row for Sales
    const salesTotalRow = salesSummaryTable.reduce(
      (acc, row) => {
        displaySalesYears.forEach((_, idx) => {
          acc[`regY${idx + 1}`] = (
            parseFloat(acc[`regY${idx + 1}`] || 0) +
            parseFloat(row[`regY${idx + 1}`] || 0)
          ).toFixed(2);
          acc[`unregY${idx + 1}`] = (
            parseFloat(acc[`unregY${idx + 1}`] || 0) +
            parseFloat(row[`unregY${idx + 1}`] || 0)
          ).toFixed(2);
        });
        acc.regTotal = (
          parseFloat(acc.regTotal) + parseFloat(row.regTotal)
        ).toFixed(2);
        acc.unregTotal = (
          parseFloat(acc.unregTotal) + parseFloat(row.unregTotal)
        ).toFixed(2);
        return acc;
      },
      { category: "Total", regTotal: "0.00", unregTotal: "0.00" },
    );
    salesSummaryTable.push(salesTotalRow);

    // --- Purchase Summary Aggregation ---
    const purchaseDataRaw = analysisDoc?.purchaseRows || [];
    const purchaseAgg = {
      "Cat-I": { registered: {}, unregistered: {} },
      "Cat-II": { registered: {}, unregistered: {} },
      "Cat-III": { registered: {}, unregistered: {} },
      "Cat-IV": { registered: {}, unregistered: {} },
      "Cat-V": { registered: {}, unregistered: {} },
    };
    const purchaseYears = new Set();

    purchaseDataRaw.forEach((row) => {
      // Fix: Check both 'category' and 'plasticCategory' keys
      const rawCat = row.plasticCategory || row.category;
      const cat = normalizeCategory(rawCat);

      if (cat && purchaseAgg[cat]) {
        let year = row.financialYear || "Unknown";
        if (typeof year === "number") year = String(year);

        if (year !== "Unknown") purchaseYears.add(year);

        const type = (row.registrationType || "unregistered").toLowerCase();
        const isRegistered =
          type.includes("registered") && !type.includes("unregistered");
        // Robust check for Total Plastic Qty (Tons) or variants
        let qty = 0;
        if (row["Total Plastic Qty (Tons)"] !== undefined)
          qty = parseFloat(row["Total Plastic Qty (Tons)"]);
        else if (row["Total Plastic Qty"] !== undefined)
          qty = parseFloat(row["Total Plastic Qty"]);
        else if (row["Quantity"] !== undefined)
          qty = parseFloat(row["Quantity"]);
        else if (row["totalPlasticQty"] !== undefined)
          qty = parseFloat(row["totalPlasticQty"]); // Camel case

        qty = qty || 0;

        const targetObj = isRegistered
          ? purchaseAgg[cat].registered
          : purchaseAgg[cat].unregistered;
        targetObj[year] = (targetObj[year] || 0) + qty;
        targetObj.total = (targetObj.total || 0) + qty;
      }
    });

    if (purchaseYears.size === 0) {
      const currentYear = new Date().getFullYear();
      purchaseYears.add(`${currentYear - 1}-${String(currentYear).slice(2)}`);
      purchaseYears.add(`${currentYear}-${String(currentYear + 1).slice(2)}`);
    }

    const sortedPurchaseYears = Array.from(purchaseYears).sort();
    // Show ALL available years
    const displayPurchaseYears = sortedPurchaseYears;

    const purchaseSummaryTable = Object.keys(purchaseAgg).map((cat) => {
      const reg = purchaseAgg[cat].registered;
      const unreg = purchaseAgg[cat].unregistered;

      const row = {
        category: cat,
        regTotal: (reg.total || 0).toFixed(2),
        unregTotal: (unreg.total || 0).toFixed(2),
      };

      displayPurchaseYears.forEach((year, idx) => {
        row[`regY${idx + 1}`] = (reg[year] || 0).toFixed(2);
        row[`unregY${idx + 1}`] = (unreg[year] || 0).toFixed(2);
      });

      return row;
    });

    // Add Total Row for Purchase
    const purchaseTotalRow = purchaseSummaryTable.reduce(
      (acc, row) => {
        displayPurchaseYears.forEach((_, idx) => {
          acc[`regY${idx + 1}`] = (
            parseFloat(acc[`regY${idx + 1}`] || 0) +
            parseFloat(row[`regY${idx + 1}`] || 0)
          ).toFixed(2);
          acc[`unregY${idx + 1}`] = (
            parseFloat(acc[`unregY${idx + 1}`] || 0) +
            parseFloat(row[`unregY${idx + 1}`] || 0)
          ).toFixed(2);
        });
        acc.regTotal = (
          parseFloat(acc.regTotal) + parseFloat(row.regTotal)
        ).toFixed(2);
        acc.unregTotal = (
          parseFloat(acc.unregTotal) + parseFloat(row.unregTotal)
        ).toFixed(2);
        return acc;
      },
      { category: "Total", regTotal: "0.00", unregTotal: "0.00" },
    );
    purchaseSummaryTable.push(purchaseTotalRow);

    // Build EPR Target Tables for Report
    const isProducerEntity =
      (clientDoc.entityType || "").toString().trim().toLowerCase() ===
      "producer";
    let targetTables = targetTablesPrePost;
    if (isProducerEntity) {
      const normalizeSalesCategory = (val) => {
        if (!val) return null;
        const v = String(val).toUpperCase();
        if (
          v.includes("CAT-V") ||
          v.includes("CAT V") ||
          v.includes("CATEGORY V") ||
          /\bV\b/.test(v)
        )
          return "Cat-V";
        if (
          v.includes("IV") ||
          v.includes("CAT-IV") ||
          v.includes("CAT IV") ||
          v.includes("CATEGORY IV")
        )
          return "Cat-IV";
        if (
          v.includes("III") ||
          v.includes("CAT-III") ||
          v.includes("CAT III") ||
          v.includes("CATEGORY III")
        )
          return "Cat-III";
        if (
          v.includes("II") ||
          v.includes("CAT-II") ||
          v.includes("CAT II") ||
          v.includes("CATEGORY II")
        )
          return "Cat-II";
        if (
          v.includes("CAT-I") ||
          v.includes("CAT I") ||
          v.includes("CATEGORY I") ||
          (v.includes("I") && v.includes("CONTAINER"))
        )
          return "Cat-I";
        if (/\bI\b/.test(v) || /CAT.*I/.test(v)) return "Cat-I";
        return null;
      };
      const categories = ["Cat-I", "Cat-II", "Cat-III", "Cat-IV", "Cat-V"];
      const yearlyAgg = {};
      categories.forEach((cat) => {
        yearlyAgg[cat] = {};
      });
      (analysisDoc?.salesRows || []).forEach((r) => {
        const cat = normalizeSalesCategory(r.plasticCategory);
        const fy = r.financialYear || "Unknown";
        const qty = parseFloat(r.totalPlasticQty) || 0;
        if (!cat || fy === "Unknown") return;
        yearlyAgg[cat][fy] = (yearlyAgg[cat][fy] || 0) + qty;
      });
      const sortedYears = [...displaySalesYears];
      const tables = [];
      if (sortedYears.length >= 2) {
        for (let i = 0; i < sortedYears.length - 1; i++) {
          const year1 = sortedYears[i];
          const year2 = sortedYears[i + 1];
          const targetYear =
            sortedYears[i + 2] || this.getNextFinancialYear(year2);
          const data = categories.map((cat) => {
            const val1 = parseFloat(yearlyAgg[cat]?.[year1] || 0);
            const val2 = parseFloat(yearlyAgg[cat]?.[year2] || 0);
            const avg = (val1 + val2) / 2;
            const regYear2 = (analysisDoc?.salesRows || [])
              .filter((rr) => {
                const rCat = normalizeSalesCategory(rr.plasticCategory);
                const rYear = rr.financialYear || "";
                const type = (rr.registrationType || "").toLowerCase();
                const status = (rr.uploadStatus || "")
                  .toString()
                  .trim()
                  .toLowerCase();
                const statusOk = !status || status === "completed";
                return (
                  rCat === cat &&
                  rYear === year2 &&
                  type.includes("registered") &&
                  !type.includes("unregistered") &&
                  statusOk
                );
              })
              .reduce(
                (sum, rr) => sum + (parseFloat(rr.totalPlasticQty) || 0),
                0,
              );
            const targetVal = avg - regYear2;
            const row = {
              "Category of Plastic": cat,
              [year1]: parseFloat(val1.toFixed(4)),
              [year2]: parseFloat(val2.toFixed(4)),
              Avg: parseFloat(avg.toFixed(4)),
              [`Registered Sales (${year2})`]: parseFloat(regYear2.toFixed(4)),
              [`Target ${targetYear}`]: parseFloat(targetVal.toFixed(4)),
            };
            return row;
          });
          const columns = [
            "Category of Plastic",
            year1,
            year2,
            "Avg",
            `Registered Sales (${year2})`,
            `Target ${targetYear}`,
          ];
          tables.push({
            title: `Target Calculation for ${targetYear} (Producer)`,
            data,
            columns,
          });
        }
      }
      targetTables = tables;
    }

    // 5. Generate Auditor Insights
    let auditorInsights = {
      validation: "",
      targets: "",
      sales: "",
      purchase: "",
    };
    try {
      auditorInsights = this.generateAuditorInsights(
        { data: salesSummaryTable, years: displaySalesYears },
        { data: purchaseSummaryTable, years: displayPurchaseYears },
        formattedPrePost,
        targetTables,
      );
    } catch (err) {
      logger.error({ err }, "[Report Generation] Error generating auditor insights");
      // Non-blocking error, continue with empty insights
    }

    // 6. Prepare Template Data
    // --- 1. Engagement Letter ---
    const engagementContent =
      clientDoc.validationDetails?.engagementLetterContent ||
      `AnantTattva Private Limited\nOffice No.12 & 14, Midas Building\nSahar Plaza JB Nagar,\nNext to J B Nagar Metro Chakala,\nAndheri East, Mumbai - 400059\ninfo@ananttattva.com\n\nDate:  ___ / ___ / 20__\n\nENGAGEMENT LETTER\nTo,\n${clientDoc.clientName}\n${clientDoc.companyDetails?.registeredAddress || "[Address]"}\n\nDear Sir / Madam,\nWe are pleased to confirm our engagement to conduct [Internal / Statutory / Compliance / EPR / GST] Audit of ${clientDoc.clientName} for the period [Audit Period].\nThe audit will be carried out on a test-check basis in accordance with applicable professional standards. Management is responsible for providing complete and accurate records and necessary information required for the audit.\nUpon completion, we shall issue an Audit Report containing our observations and recommendations, if any.\nAll information obtained during the audit shall be treated as confidential.\nOur professional fees shall be ₹ [Amount] plus applicable taxes, payable as agreed.\nKindly acknowledge your acceptance of this engagement by signing below.\n\nThanking you,\nYours faithfully,\nFor AnantTattva Private Limited\nAuthorized Signatory\nName: _______________\nDesignation: _________\n\nAccepted & Agreed\nFor ${clientDoc.clientName}\nSignature: _______________\nDate: ___________________`;

    // --- 2. Client Basic Info ---
    const basicInfo = {
      clientName: clientDoc.clientName,
      tradeName: clientDoc.tradeName || "N/A",
      groupName: clientDoc.companyGroupName || "N/A",
      entityType:
        clientDoc.wasteType === "E-Waste" || clientDoc.wasteType === "E_WASTE"
          ? clientDoc.producerType || "N/A"
          : clientDoc.entityType,
      wasteType: clientDoc.wasteType,
      authPerson: {
        name: clientDoc.authorisedPerson?.name || "N/A",
        designation: clientDoc.authorisedPerson?.designation || "",
        number: clientDoc.authorisedPerson?.number || "N/A",
        email: clientDoc.authorisedPerson?.email || "N/A",
      },
      coordPerson: {
        name: clientDoc.coordinatingPerson?.name || "N/A",
        number: clientDoc.coordinatingPerson?.number || "N/A",
        email: clientDoc.coordinatingPerson?.email || "N/A",
      },
    };

    // --- 3. Address Details ---
    const addressDetails = {
      registered: clientDoc.companyDetails?.registeredAddress || "N/A",
      communication: clientDoc.notes || "Same as Registered", // Matching ClientValidation.jsx logic
    };

    // --- 4. Documents & MSME ---
    const isEwaste =
      clientDoc.wasteType === "E-Waste" || clientDoc.wasteType === "E_WASTE";
    const requiredDocs = ["PAN", "GST", "CIN"];
    if (!isEwaste) {
      requiredDocs.push("Factory License", "EPR Certificate");
    } else {
      requiredDocs.push("E-waste Registration");
      if (
        clientDoc.isImportingEEE === "Yes" ||
        clientDoc.isImportingEEE === true
      ) {
        requiredDocs.push("EEE Import Authorization");
      }
    }

    const relevantDocs = (clientDoc.documents || [])
      .filter(
        (d) =>
          d.documentType !== "Engagement Letter" &&
          requiredDocs.includes(d.documentType),
      )
      .map((d) => ({
        type: d.documentType,
        number: d.certificateNumber || "N/A",
        date: formatDate(d.certificateDate),
        status: "Uploaded",
      }));

    const msmeDetails = {
      status: clientDoc.validationDetails?.msmeDetails
        ? "Verified"
        : "Pending/NA",
      number: clientDoc.companyDetails?.msmeNumber || "N/A",
      type: clientDoc.companyDetails?.enterpriseType || "N/A",
      history: (clientDoc.msmeDetails || []).map((m) => ({
        year: m.classificationYear || "-",
        status: m.status || "-",
        activity: m.majorActivity || "-",
        udyam: m.udyamNumber || "-",
        turnover: m.turnover || "-",
      })),
    };

    // --- 5. CTE & CTO/CCA Details ---
    const pf = clientDoc.productionFacility || {};
    const plantGroups = {};
    const normalize = (name) => (name ? name.trim().toLowerCase() : "");

    const processPlantData = (list, keyName) => {
      (list || []).forEach((item) => {
        const pName = item.plantName;
        if (!pName) return;
        const norm = normalize(pName);
        if (!plantGroups[norm]) {
          plantGroups[norm] = {
            displayName: pName,
            cteDetails: [],
            ctoDetails: [],
            cteProduction: [],
            ctoProducts: [],
          };
        }
        plantGroups[norm][keyName].push(item);
      });
    };

    processPlantData(pf.cteDetailsList, "cteDetails");
    processPlantData(pf.ctoDetailsList, "ctoDetails");
    processPlantData(pf.cteProduction, "cteProduction");
    processPlantData(pf.ctoProducts, "ctoProducts");

    const sortedPlants = Object.values(plantGroups).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );

    // Format Plant Data for Template
    const plants = sortedPlants.map((group) => ({
      name: group.displayName,
      cte: group.cteDetails.map((c) => ({
        consentNo: c.consentNo || "-",
        issueDate: formatDate(c.issuedDate),
        validUpto: formatDate(c.validUpto),
        location: c.plantLocation || "-",
        address: c.plantAddress || "-",
        remark: c.verification?.remark || "-",
      })),
      cto: group.ctoDetails.map((c) => ({
        type: c.ctoCaaType || "-",
        industryType: c.industryType || "-",
        category: c.category || "-",
        orderNo: c.consentOrderNo || "-",
        issueDate: formatDate(c.dateOfIssue),
        validUpto: formatDate(c.validUpto),
        location: c.plantLocation || "-",
        address: c.plantAddress || "-",
        remark: c.verification?.remark || "-",
      })),
      cteProduction: group.cteProduction.map((row, index) => ({
        sr: index + 1,
        productName: row.productName || "-",
        maxCapacityPerYear:
          row.maxCapacityPerYear !== undefined &&
          row.maxCapacityPerYear !== null
            ? row.maxCapacityPerYear
            : "-",
        uom: row.uom || "-",
        status: row.verification?.status || "Pending",
        remark: row.verification?.remark || "-",
      })),
      ctoProducts: group.ctoProducts.map((row, index) => ({
        sr: index + 1,
        productName: row.productName || "-",
        quantity:
          row.quantity !== undefined && row.quantity !== null
            ? row.quantity
            : "-",
        uom: row.uom || "-",
        status: row.verification?.status || "Pending",
        remark: row.verification?.remark || "-",
      })),
    }));

    // Additional CTO Details
    const regs = Array.isArray(pf.regulationsCoveredUnderCto)
      ? pf.regulationsCoveredUnderCto
      : [];
    const additionalDetails = {
      investment: pf.totalCapitalInvestmentLakhs ?? "-",
      waterUsage: pf.groundWaterUsage ?? "-",
      cgwaNocReq: pf.cgwaNocRequirement || "-",
      regulations: regs.length ? regs.join(", ") : "None",
      hasWater: regs.includes("Water"),
      hasAir: regs.includes("Air"),
      hasHazardous: regs.some((r) =>
        (r || "").toString().toLowerCase().includes("hazardous"),
      ),
      // Remarks for sections - Currently these are not part of the standard verification object structure in the loop above
      // Based on ClientAudit.jsx, verification is mainly on CTE/CTO items and Products.
      // The additional details verification might not be fully implemented or follows a different path?
      // Checking ClientAudit.jsx, it seems verification is only for CTE, CTO and Products.
      // There is no explicit verification UI for "Additional Details" in the shared code snippet of ClientAudit.jsx.
      // However, sticking to the user's request for "Onsite Audit Verification" data.
      // If the user previously asked for remarks here, maybe they meant product remarks?
      // But the previous code I wrote used `verificationRemarks['cto_additional_details']`.
      // Since ClientAudit.jsx doesn't seem to have verification for these global fields, I will default them to '-'
      // or if there is a place I missed.
      // Re-reading ClientAudit.jsx... it has "Product Compliance Step" but that's a different tab.
      // The "Verification" tab has Plant Info, Contact Details, Consent Verification, Production Capacity & Products.
      // It does NOT have "Additional Details" verification.
      // So I will remove the specific remarks for these sub-sections to avoid confusion or showing undefined,
      // OR I will leave them as '-' if not found.

      additionalRemark: "-",
      regulationsRemark: "-",
      waterRemark: "-",
      airRemark: "-",
      hazardousRemark: "-",

      waterRegs: (pf.waterRegulations || []).map((r, i) => ({
        sr: i + 1,
        desc: r.description || "-",
        qty:
          r.permittedQuantity !== undefined && r.permittedQuantity !== null
            ? r.permittedQuantity
            : "-",
        uom: r.uom || "-",
      })),
      airRegs: (pf.airRegulations || []).map((r, i) => ({
        sr: i + 1,
        param: r.parameter || "-",
        limit:
          r.permittedLimit !== undefined && r.permittedLimit !== null
            ? r.permittedLimit
            : "-",
        uom: r.uom || "-",
      })),
      hazardousRegs: (pf.hazardousWasteRegulations || []).map((r, i) => ({
        sr: i + 1,
        name: r.nameOfHazardousWaste || "-",
        disposal: r.facilityModeOfDisposal || "-",
        qty:
          r.quantityMtYr !== undefined && r.quantityMtYr !== null
            ? r.quantityMtYr
            : "-",
        uom: r.uom || "-",
      })),
    };

    const loadAssetBase64 = (candidates) => {
      for (const assetPath of candidates) {
        if (!fs.existsSync(assetPath)) continue;
        const resolved = resolveImage(assetPath);
        if (resolved) return resolved;
      }
      return "";
    };

    // Left logo is the client/company mark, right logo is the fixed AnantTattva mark.
    let companyLogoBase64 = "";
    let logoBase64 = "";
    try {
      companyLogoBase64 = loadAssetBase64([
        path.join(__dirname, "../../assets/report/Company Logo.png"),
        path.join(__dirname, "../../assets/report/company-left-logo.png"),
      ]);
      const logoCandidates = [
        path.join(__dirname, "../../assets/report/company-logo.png"),
        path.join(__dirname, "../../../logo.png"),
      ];
      logoBase64 = loadAssetBase64(logoCandidates);
    } catch (e) {
      logger.warn({ err: e }, "[Report Generation] Could not load logo");
    }

    const requestedSectionIds = Array.isArray(options.sections)
      ? options.sections
          .map((section) => String(section || "").trim())
          .filter(Boolean)
      : [];
    const selectedSectionIdSet = new Set(
      requestedSectionIds.length
        ? requestedSectionIds
        : REPORT_SECTION_DEFINITIONS.map((section) => section.id),
    );
    const availableSectionIdSet = new Set(
      REPORT_SECTION_DEFINITIONS.filter((section) => {
        if (section.id === "markingLabeling") {
          return Boolean(markingLabelingReportByIndustry.length);
        }
        if (section.id === "industryCategory") {
          return Boolean(industryCategories.length);
        }
        return true;
      }).map((section) => section.id),
    );
    const selectedReportSections = REPORT_SECTION_DEFINITIONS.reduce(
      (accumulator, section) => {
        accumulator[section.id] =
          availableSectionIdSet.has(section.id) &&
          selectedSectionIdSet.has(section.id);
        return accumulator;
      },
      {},
    );
    selectedReportSections.hasAnyCostSections = Boolean(
      selectedReportSections.skuWiseSummary ||
        selectedReportSections.polymerWiseSummary ||
        selectedReportSections.categoryWiseSummary ||
        selectedReportSections.supplierWiseSummary ||
        selectedReportSections.skuWiseSupplierDetails ||
        selectedReportSections.polymerWiseSupplierDetails ||
        selectedReportSections.categoryWiseSupplierDetails,
    );
    selectedReportSections.breakBeforePolymerWiseSummary = Boolean(
      selectedReportSections.skuWiseSummary,
    );
    selectedReportSections.breakBeforeCategoryWiseSummary = Boolean(
      selectedReportSections.skuWiseSummary ||
        selectedReportSections.polymerWiseSummary,
    );
    selectedReportSections.breakBeforeSupplierWiseSummary = Boolean(
      selectedReportSections.skuWiseSummary ||
        selectedReportSections.polymerWiseSummary ||
        selectedReportSections.categoryWiseSummary,
    );
    const reportIndexSections = REPORT_SECTION_DEFINITIONS.filter(
      (section) => selectedReportSections[section.id],
    ).map((section) => ({
      ...section,
    }));

    const templateData = {
      companyLogoBase64,
      logoBase64,
      reportIndexSections,
      selectedReportSections,
      isProducer,
      isBrandOwner: !isProducer,
      entityType: clientDoc.entityType || "Brand Owner",
      generatedDate: new Date().toLocaleString(),
      engagementContent,
      basicInfo,
      addressDetails,
      companyDocuments: relevantDocs,
      msmeDetails,
      plants,
      additionalDetails,
      complianceOverview,
      complianceSnapshot,
      industryComplianceBarData,
      industryCategorySummaryReport,
      industrySkuSummaryReport,
      annualTargetSummaryReport,
      costAnalysisReport,
      costAnalysisCategoryReport,
      costAnalysisComponentReport,
      costAnalysisPolymerReport,
      costAnalysisSupplierReport,
      costAnalysisSkuDetails,
      pdfCostAnalysisSections,
      industryCategories,
      markingLabelingData,
      markingLabelingReportByIndustry,
      // Phase 3: Summary Reports
      portalSummary: (() => {
        const fy = (clientDoc.financialYear || "").toString().trim();
        const urepPctByCat = {
          "Cat-I": UREP_TARGET_MATRIX["Cat-I"]?.[fy] || 0,
          "Cat-II": UREP_TARGET_MATRIX["Cat-II"]?.[fy] || 0,
          "Cat-III": UREP_TARGET_MATRIX["Cat-III"]?.[fy] || 0,
          "Cat-IV": UREP_TARGET_MATRIX["Cat-IV"]?.[fy] || 0,
          "Cat-V": UREP_TARGET_MATRIX["Cat-V"]?.[fy] || 0,
        };
        const totalTargetPct =
          (urepPctByCat["Cat-I"] || 0) +
          (urepPctByCat["Cat-II"] || 0) +
          (urepPctByCat["Cat-III"] || 0) +
          (urepPctByCat["Cat-IV"] || 0) +
          (urepPctByCat["Cat-V"] || 0);

        const procurementRows = Array.isArray(procurementDetails)
          ? procurementDetails
          : [];
        const normalizeKey = (value) => (value || "").toString().trim();
        const resolvePrimaryKey = (row, index = 0) =>
          isProducer
            ? normalizeKey(row?.skuCode) ||
              normalizeKey(row?.systemCode) ||
              normalizeKey(row?.componentCode) ||
              `sku-${index + 1}`
            : normalizeKey(row?.skuCode) ||
              normalizeKey(row?.systemCode) ||
              normalizeKey(row?.componentCode) ||
              `sku-${index + 1}`;

        const componentMetaByCode = new Map();
        (componentDetails || []).forEach((row) => {
          const componentCode = normalizeKey(row?.componentCode);
          if (!componentCode) return;
          componentMetaByCode.set(componentCode, {
            polymerName:
              normalizeKey(row?.componentPolymer) ||
              normalizeKey(row?.polymerType) ||
              normalizeKey(row?.recycledPolymerUsed) ||
              "",
          });
        });

        const procurementMetaByKey = new Map();
        const registerProcurementMeta = (key, meta) => {
          const normalized = normalizeKey(key);
          if (!normalized) return;
          const existing = procurementMetaByKey.get(normalized) || {};
          procurementMetaByKey.set(normalized, {
            primaryKey:
              existing.primaryKey || meta.primaryKey || normalized,
            industryCategory:
              existing.industryCategory ||
              meta.industryCategory ||
              "Uncategorized",
            categoryKey: existing.categoryKey || meta.categoryKey || "OTHER",
            componentCode:
              existing.componentCode || meta.componentCode || "",
            clientName: existing.clientName || meta.clientName || "",
            polymerName: existing.polymerName || meta.polymerName || "",
          });
        };

        const primaryStatusMap = new Map();
        (allRows || []).forEach((row, index) => {
          const primaryKey = resolvePrimaryKey(row, index);
          const status = pickText(
            isProducer
              ? row?.componentComplianceStatus
              : row?.productComplianceStatus,
            row?.complianceStatus,
            row?.status,
          );

          if (isProducer) {
            const existing = primaryStatusMap.get(primaryKey) || {
              hasCompliant: false,
              hasNonCompliant: false,
            };
            if (status === "Non-Compliant") existing.hasNonCompliant = true;
            else if (status === "Compliant") existing.hasCompliant = true;
            primaryStatusMap.set(primaryKey, existing);
          } else if (!primaryStatusMap.has(primaryKey)) {
            primaryStatusMap.set(primaryKey, status);
          }

          const meta = {
            primaryKey,
            industryCategory:
              normalizeKey(row?.industryCategory) || "Uncategorized",
            categoryKey: normalizeUrepCategory(row?.category) || "OTHER",
            componentCode: normalizeKey(row?.componentCode),
            clientName: normalizeKey(row?.clientName) || "",
            polymerName:
              componentMetaByCode.get(normalizeKey(row?.componentCode))
                ?.polymerName || "",
          };
          registerProcurementMeta(row?.skuCode, meta);
          registerProcurementMeta(row?.systemCode, meta);
          registerProcurementMeta(row?.componentCode, meta);
        });

        const totalSku = primaryStatusMap.size;
        const compliantSku = Array.from(primaryStatusMap.values()).filter(
          (status) =>
            isProducer ? status?.hasCompliant && !status?.hasNonCompliant : status === "Compliant",
        ).length;
        const nonCompliantSku = Array.from(primaryStatusMap.values()).filter(
          (status) =>
            isProducer ? status?.hasNonCompliant : status === "Non-Compliant",
        ).length;

        let riskLabel = "Low Risk";
        let riskClass = "risk-low";
        if (nonCompliantSku >= Math.max(1, Math.ceil(totalSku * 0.5))) {
          riskLabel = "High Risk";
          riskClass = "risk-high";
        } else if (nonCompliantSku > 0) {
          riskLabel = "Medium Risk";
          riskClass = "risk-medium";
        }

        const componentStatusMap = {};
        (supplierCompliance || []).forEach((row) => {
          const key = normalizeKey(row?.componentCode);
          if (!key) return;
          componentStatusMap[key] = (row?.supplierStatus || "")
            .toString()
            .trim()
            .toLowerCase();
        });

        const totals = {
          monthlyPurchaseMt: 0,
          recycledQty: 0,
          virginQty: 0,
          recycledAmount: 0,
          virginAmount: 0,
        };

        const categoryAgg = new Map();
        const clientAgg = new Map();
        const industryAgg = new Map();
        const polymerAgg = new Map();
        const stateAgg = new Map();
        const supplierTypeAgg = new Map();
        const supplierAgg = new Map();

        const supplierRegistered = new Set();
        const supplierUnregistered = new Set();
        const supplierTypeOrder = [
          "Manufacture",
          "Importer of raw material",
          "Importer",
          "Producer",
          "Brand Owner",
          "PWP",
          "Seller",
        ];
        const supplierTypeLookup = new Map();

        const registerSupplierType = (row) => {
          const supplierType = normalizeKey(row?.supplierType);
          if (!supplierType) return;
          const supplierName = normalizeKey(row?.supplierName).toLowerCase();
          const componentCode = normalizeKey(row?.componentCode).toLowerCase();
          if (supplierName && componentCode) {
            supplierTypeLookup.set(
              `${supplierName}::${componentCode}`,
              supplierType,
            );
          }
          if (supplierName) {
            supplierTypeLookup.set(supplierName, supplierType);
          }
        };

        (allRows || []).forEach(registerSupplierType);
        procurementRows.forEach(registerSupplierType);
        (supplierCompliance || []).forEach(registerSupplierType);

        const ensureAgg = (map, key, name) => {
          if (!map.has(key)) {
            map.set(key, {
              key,
              name,
              skuSet: new Set(),
              monthlyPurchaseMt: 0,
              recycledQty: 0,
              virginQty: 0,
              recycledAmount: 0,
              virginAmount: 0,
            });
          }
          return map.get(key);
        };

        const ensureStateAgg = (key, name) => {
          if (!stateAgg.has(key)) {
            stateAgg.set(key, {
              key,
              name,
              skuSet: new Set(),
              supplierSet: new Set(),
              registeredSet: new Set(),
              unregisteredSet: new Set(),
              monthlyPurchaseMt: 0,
              recycledQty: 0,
              virginQty: 0,
              recycledAmount: 0,
              virginAmount: 0,
            });
          }
          return stateAgg.get(key);
        };

        const resolveProcurementMeta = (row, index) => {
          const candidates = [
            normalizeKey(row?.skuCode),
            normalizeKey(row?.systemCode),
            normalizeKey(row?.componentCode),
          ].filter(Boolean);
          for (const candidate of candidates) {
            const found = procurementMetaByKey.get(candidate);
            if (found) return found;
          }
          return {
            primaryKey: resolvePrimaryKey(row, index),
            industryCategory:
              normalizeKey(row?.industryCategory) || "Uncategorized",
            categoryKey: normalizeUrepCategory(row?.category) || "OTHER",
            componentCode: normalizeKey(row?.componentCode),
            clientName: normalizeKey(row?.clientName) || "",
            polymerName:
              normalizeKey(row?.componentPolymer) ||
              normalizeKey(row?.polymerType) ||
              normalizeKey(row?.recycledPolymerUsed) ||
              componentMetaByCode.get(normalizeKey(row?.componentCode))
                ?.polymerName ||
              "",
          };
        };

        procurementRows.forEach((row, index) => {
          const meta = resolveProcurementMeta(row, index);
          const primaryKey = meta.primaryKey || resolvePrimaryKey(row, index);
          const supplierName = (row?.supplierName || "Unknown")
            .toString()
            .trim();
          const supplierKey = supplierName.toLowerCase() || "unknown";
          const supplierMeta = supplierMetaByName.get(supplierName) || {};
          const supplierStateName =
            (
              row?.supplierState ||
              supplierMeta?.supplierState ||
              "Unknown State"
            )
              .toString()
              .trim() ||
            "Unknown State";
          const supplierStateKey = supplierStateName.toLowerCase();
          const clientName =
            (
              normalizeKey(row?.clientName) ||
              meta.clientName ||
              "Unassigned Client"
            )
              .toString()
              .trim() || "Unassigned Client";
          const industryName =
            (
              normalizeKey(row?.industryCategory) ||
              meta.industryCategory ||
              "Uncategorized"
            )
              .toString()
              .trim() || "Uncategorized";
          const polymerName =
            (
              normalizeKey(row?.componentPolymer) ||
              normalizeKey(row?.polymerType) ||
              normalizeKey(row?.recycledPolymerUsed) ||
              meta.polymerName ||
              "Unspecified Polymer"
            )
              .toString()
              .trim() || "Unspecified Polymer";

          const monthlyPurchaseMt = Number(row?.monthlyPurchaseMt || 0) || 0;
          const recycledQty = Number(row?.recycledQty || 0) || 0;
          const virginQty = Number(row?.virginQty || 0) || 0;
          const recycledAmount = Number(row?.recycledQrtAmount || 0) || 0;
          const virginAmount = Number(row?.virginQtyAmount || 0) || 0;

          totals.monthlyPurchaseMt += monthlyPurchaseMt;
          totals.recycledQty += recycledQty;
          totals.virginQty += virginQty;
          totals.recycledAmount += recycledAmount;
          totals.virginAmount += virginAmount;

          const catKey =
            normalizeUrepCategory(row?.category) || meta.categoryKey || "OTHER";
          const catName =
            catKey === "Cat-I"
              ? "Category I"
              : catKey === "Cat-II"
                ? "Category II"
                : catKey === "Cat-III"
                  ? "Category III"
                  : catKey === "Cat-IV"
                    ? "Category IV"
                    : catKey === "Cat-V"
                      ? "Category V"
                    : "Not Applicable";

          const catAgg = ensureAgg(categoryAgg, catKey, catName);
          const cliAgg = ensureAgg(
            clientAgg,
            clientName.toLowerCase(),
            clientName,
          );
          const indAgg = ensureAgg(
            industryAgg,
            industryName.toLowerCase(),
            industryName,
          );
          const polAgg = ensureAgg(
            polymerAgg,
            polymerName.toLowerCase(),
            polymerName,
          );
          const stAgg = ensureStateAgg(supplierStateKey, supplierStateName);
          const compCode = normalizeKey(row?.componentCode) || meta.componentCode;
          const supplierTypeName =
            supplierTypeLookup.get(`${supplierKey}::${compCode}`) ||
            supplierTypeLookup.get(supplierKey) ||
            normalizeKey(supplierMeta?.supplierType) ||
            normalizeKey(row?.supplierType);
          const supplierTypeBucket = supplierTypeName
            ? ensureAgg(
                supplierTypeAgg,
                supplierTypeName.toLowerCase(),
                supplierTypeName,
              )
            : null;
          const supAgg = ensureAgg(supplierAgg, supplierKey, supplierName);

          [catAgg, cliAgg, indAgg, polAgg, stAgg, supplierTypeBucket, supAgg]
            .filter(Boolean)
            .forEach((bucket) => {
            if (primaryKey) bucket.skuSet.add(primaryKey);
            bucket.monthlyPurchaseMt += monthlyPurchaseMt;
            bucket.recycledQty += recycledQty;
            bucket.virginQty += virginQty;
            bucket.recycledAmount += recycledAmount;
            bucket.virginAmount += virginAmount;
            });
          stAgg.supplierSet.add(supplierKey);

          const status = (componentStatusMap?.[compCode] || "")
            .toString()
            .trim();
          if (status.includes("unregistered")) {
            supplierUnregistered.add(supplierKey);
            supplierRegistered.delete(supplierKey);
            stAgg.unregisteredSet.add(supplierKey);
            stAgg.registeredSet.delete(supplierKey);
          } else if (status.includes("registered")) {
            if (!supplierUnregistered.has(supplierKey)) {
              supplierRegistered.add(supplierKey);
            }
            if (!stAgg.unregisteredSet.has(supplierKey)) {
              stAgg.registeredSet.add(supplierKey);
            }
          }
        });

        const registeredSuppliers = supplierRegistered.size;
        const unregisteredSuppliers = supplierUnregistered.size;
        const totalSuppliers =
          registeredSuppliers + unregisteredSuppliers;

        const recycledTargetQty =
          totals.monthlyPurchaseMt * (totalTargetPct / 100);
        const virginTargetQty = Math.max(
          totals.monthlyPurchaseMt - recycledTargetQty,
          0,
        );
        const recycledShortfall = totals.recycledQty - recycledTargetQty;
        const virginShortfall = totals.virginQty - virginTargetQty;

        const recycledAchievedPct =
          recycledTargetQty > 0
            ? (totals.recycledQty / recycledTargetQty) * 100
            : 0;
        const virginAchievedPct =
          virginTargetQty > 0
            ? (totals.virginQty / virginTargetQty) * 100
            : 0;

        const shortfallMeta = (value) => {
          const n = Number(value);
          if (!Number.isFinite(n)) {
            return {
              arrow: "↓",
              abs: formatNumber(0, 2),
              color: "color:#dc2626;",
            };
          }
          if (n >= 0) {
            return {
              arrow: "↑",
              abs: formatNumber(Math.abs(n), 2),
              color: "color:#16a34a;",
            };
          }
          return {
            arrow: "↓",
            abs: formatNumber(Math.abs(n), 2),
            color: "color:#dc2626;",
          };
        };

        const categoryOrder = [
          { key: "Cat-I", name: "Category I" },
          { key: "Cat-II", name: "Category II" },
          { key: "Cat-III", name: "Category III" },
          { key: "Cat-IV", name: "Category IV" },
          { key: "Cat-V", name: "Category V" },
          { key: "OTHER", name: "Not Applicable" },
        ];
        const getCategoryBucket = (key, name) => {
          if (categoryAgg.has(key)) return categoryAgg.get(key);
          return {
            key,
            name,
            skuSet: new Set(),
            monthlyPurchaseMt: 0,
            recycledQty: 0,
            virginQty: 0,
            recycledAmount: 0,
            virginAmount: 0,
          };
        };
        const categoryWise = categoryOrder
          .map((c) => getCategoryBucket(c.key, c.name))
          .map((bucket) => {
            const isKnown = ["Cat-I", "Cat-II", "Cat-III", "Cat-IV", "Cat-V"].includes(
              bucket.key,
            );
            const pct = isKnown ? urepPctByCat[bucket.key] || 0 : 0;
            const recycledTarget = bucket.monthlyPurchaseMt * (pct / 100);
            const recycledShare =
              bucket.monthlyPurchaseMt > 0
                ? (bucket.recycledQty / bucket.monthlyPurchaseMt) * 100
                : 0;
            const recycledVsVirgin =
              bucket.monthlyPurchaseMt > 0
                ? (bucket.recycledQty / bucket.monthlyPurchaseMt) * 100
                : 0;
            const virginVsTotal = 100 - recycledVsVirgin;
            const recycledVsVirginLeftPct = clampPct(recycledVsVirgin);
            const recycledVsVirginRightPct = clampPct(virginVsTotal);
            return {
              name: bucket.name,
              monthlyPurchaseMt: formatNumber(bucket.monthlyPurchaseMt, 3),
              recycledSharePct: formatPercent(recycledShare, 1),
              recycledTargetQty: formatNumber(recycledTarget, 3),
              targetPctLabel: pct ? `${pct}%` : "0%",
              recycledQty: formatNumber(bucket.recycledQty, 3),
              virginQty: formatNumber(bucket.virginQty, 3),
              recycledAmount: formatNumber(bucket.recycledAmount, 3),
              virginAmount: formatNumber(bucket.virginAmount, 3),
              recycledVsVirginLeftPct,
              recycledVsVirginRightPct,
              recycledVsVirginLeftPctLabel: formatPercent(
                recycledVsVirginLeftPct,
                2,
              ),
              recycledVsVirginRightPctLabel: formatPercent(
                recycledVsVirginRightPct,
                2,
              ),
            };
          });

        const buildBreakdownCards = (map) =>
          Array.from(map.values())
            .map((bucket) => {
              const recycledShare =
                bucket.monthlyPurchaseMt > 0
                  ? (bucket.recycledQty / bucket.monthlyPurchaseMt) * 100
                  : 0;
              const virginShare = 100 - recycledShare;
              const recycledVsVirginLeftPct = clampPct(recycledShare);
              const recycledVsVirginRightPct = clampPct(virginShare);
              return {
                name: bucket.name,
                totalSku: bucket.skuSet.size,
                monthlyPurchaseMt: formatNumber(bucket.monthlyPurchaseMt, 3),
                recycledSharePct: formatPercent(recycledShare, 1),
                recycledQty: formatNumber(bucket.recycledQty, 3),
                virginQty: formatNumber(bucket.virginQty, 3),
                recycledAmount: formatNumber(bucket.recycledAmount, 3),
                virginAmount: formatNumber(bucket.virginAmount, 3),
                recycledVsVirginLeftPct,
                recycledVsVirginRightPct,
                recycledVsVirginLeftPctLabel: formatPercent(
                  recycledVsVirginLeftPct,
                  2,
                ),
                recycledVsVirginRightPctLabel: formatPercent(
                  recycledVsVirginRightPct,
                  2,
                ),
                sortKey: bucket.monthlyPurchaseMt,
              };
            })
            .sort((a, b) => b.sortKey - a.sortKey);

        const summarizeBreakdownRows = (rows) => {
          const totals = (rows || []).reduce(
            (acc, row) => {
              acc.totalSku += Number(row?.totalSku || 0) || 0;
              acc.monthlyPurchaseMt += Number(row?.monthlyPurchaseMt || 0) || 0;
              acc.recycledQty += Number(row?.recycledQty || 0) || 0;
              acc.virginQty += Number(row?.virginQty || 0) || 0;
              acc.recycledAmount += Number(row?.recycledAmount || 0) || 0;
              acc.virginAmount += Number(row?.virginAmount || 0) || 0;
              return acc;
            },
            {
              totalSku: 0,
              monthlyPurchaseMt: 0,
              recycledQty: 0,
              virginQty: 0,
              recycledAmount: 0,
              virginAmount: 0,
            },
          );

          const recycledSharePct =
            totals.monthlyPurchaseMt > 0
              ? (totals.recycledQty / totals.monthlyPurchaseMt) * 100
              : 0;

          return {
            totalSku: totals.totalSku,
            monthlyPurchaseMt: formatNumber(totals.monthlyPurchaseMt, 3),
            recycledQty: formatNumber(totals.recycledQty, 3),
            virginQty: formatNumber(totals.virginQty, 3),
            recycledSharePct: formatPercent(recycledSharePct, 1),
            recycledAmount: formatNumber(totals.recycledAmount, 3),
            virginAmount: formatNumber(totals.virginAmount, 3),
          };
        };

        const buildGroupRows = (map) => {
          const rows = Array.from(map.values()).map((bucket) => {
            const recTarget = bucket.monthlyPurchaseMt * (totalTargetPct / 100);
            const virTarget = Math.max(bucket.monthlyPurchaseMt - recTarget, 0);
            const recShort = bucket.recycledQty - recTarget;
            const virShort = bucket.virginQty - virTarget;
            const recMeta = shortfallMeta(recShort);
            const virMeta = shortfallMeta(virShort);
            return {
              name: bucket.name,
              totalSku: bucket.skuSet.size,
              monthlyPurchaseMt: formatNumber(bucket.monthlyPurchaseMt, 3),
              recycledTargetQty: formatNumber(recTarget, 3),
              recycledAchievedMt: formatNumber(bucket.recycledQty, 3),
              recycledShortfallArrow: recMeta.arrow,
              recycledShortfallAbs: recMeta.abs,
              recycledShortfallStyle: recMeta.color,
              virginTargetQty: formatNumber(virTarget, 3),
              virginAchievedMt: formatNumber(bucket.virginQty, 3),
              virginShortfallArrow: virMeta.arrow,
              virginShortfallAbs: virMeta.abs,
              virginShortfallStyle: virMeta.color,
              sortKey: bucket.monthlyPurchaseMt,
            };
          });
          return rows.sort((a, b) => b.sortKey - a.sortKey);
        };

        const summarizeTargetRows = (rows) => {
          const totals = (rows || []).reduce(
            (acc, row) => {
              acc.totalSku += Number(row?.totalSku || 0) || 0;
              acc.monthlyPurchaseMt += Number(row?.monthlyPurchaseMt || 0) || 0;
              acc.recycledTargetQty += Number(row?.recycledTargetQty || 0) || 0;
              acc.recycledAchievedMt += Number(row?.recycledAchievedMt || 0) || 0;
              acc.virginTargetQty += Number(row?.virginTargetQty || 0) || 0;
              acc.virginAchievedMt += Number(row?.virginAchievedMt || 0) || 0;
              return acc;
            },
            {
              totalSku: 0,
              monthlyPurchaseMt: 0,
              recycledTargetQty: 0,
              recycledAchievedMt: 0,
              virginTargetQty: 0,
              virginAchievedMt: 0,
            },
          );

          const recycledShortfall =
            totals.recycledAchievedMt - totals.recycledTargetQty;
          const virginShortfall =
            totals.virginAchievedMt - totals.virginTargetQty;
          const recMeta = shortfallMeta(recycledShortfall);
          const virMeta = shortfallMeta(virginShortfall);

          return {
            totalSku: totals.totalSku,
            monthlyPurchaseMt: formatNumber(totals.monthlyPurchaseMt, 3),
            recycledTargetQty: formatNumber(totals.recycledTargetQty, 3),
            recycledAchievedMt: formatNumber(totals.recycledAchievedMt, 3),
            recycledShortfallArrow: recMeta.arrow,
            recycledShortfallAbs: recMeta.abs,
            recycledShortfallStyle: recMeta.color,
            virginTargetQty: formatNumber(totals.virginTargetQty, 3),
            virginAchievedMt: formatNumber(totals.virginAchievedMt, 3),
            virginShortfallArrow: virMeta.arrow,
            virginShortfallAbs: virMeta.abs,
            virginShortfallStyle: virMeta.color,
          };
        };

        const clientWise = buildBreakdownCards(clientAgg);
        const industryWise = buildGroupRows(industryAgg);
        const polymerWise = buildBreakdownCards(polymerAgg);
        const supplierTypeWise = buildGroupRows(supplierTypeAgg)
          .filter(
            (row) =>
              Number(row?.totalSku || 0) > 0 ||
              Number(row?.monthlyPurchaseMt || 0) > 0 ||
              Number(row?.recycledAchievedMt || 0) > 0 ||
              Number(row?.virginAchievedMt || 0) > 0,
          )
          .sort((a, b) => {
            const aIndex = supplierTypeOrder.findIndex((item) => item === a.name);
            const bIndex = supplierTypeOrder.findIndex((item) => item === b.name);
            const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
            const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
            if (safeAIndex !== safeBIndex) return safeAIndex - safeBIndex;
            return (Number(b?.sortKey || 0) || 0) - (Number(a?.sortKey || 0) || 0);
          });
        const supplierWise = buildGroupRows(supplierAgg);
        const stateWiseSupplierSummary = Array.from(stateAgg.values())
          .map((bucket) => ({
            stateName: bucket.name,
            totalSuppliers: bucket.supplierSet.size,
            registeredSuppliers: bucket.registeredSet.size,
            unregisteredSuppliers: bucket.unregisteredSet.size,
            totalSku: bucket.skuSet.size,
            annualPurchaseMt: formatNumber(bucket.monthlyPurchaseMt, 3),
            recycledQty: formatNumber(bucket.recycledQty, 3),
            virginQty: formatNumber(bucket.virginQty, 3),
            recycledAmount: formatNumber(bucket.recycledAmount, 3),
            virginAmount: formatNumber(bucket.virginAmount, 3),
          }))
          .sort(
            (a, b) =>
              (Number(b?.totalSuppliers || 0) || 0) -
              (Number(a?.totalSuppliers || 0) || 0),
          );
        const stateWiseSupplierSummaryTotals = {
          recycledQty: formatNumber(totals.recycledQty, 3),
          virginQty: formatNumber(totals.virginQty, 3),
          recycledAmount: formatNumber(totals.recycledAmount, 3),
          virginAmount: formatNumber(totals.virginAmount, 3),
          annualPurchaseMt: formatNumber(totals.monthlyPurchaseMt, 3),
        };

        const recMetaTotal = shortfallMeta(recycledShortfall);
        const virMetaTotal = shortfallMeta(virginShortfall);

        return {
          financialYear: fy || "-",
          totalTargetPct: formatPercent(totalTargetPct, 1),
          totalSku,
          compliantSku,
          nonCompliantSku,
          totalSuppliers,
          registeredSuppliers,
          unregisteredSuppliers,
          riskLabel,
          riskClass,
          totalMonthlyPurchaseMt: formatNumber(totals.monthlyPurchaseMt, 3),
          recycledTargetQty: formatNumber(recycledTargetQty, 2),
          virginTargetQty: formatNumber(virginTargetQty, 2),
          recycledQtyAmount: formatNumber(totals.recycledAmount, 3),
          virginQtyAmount: formatNumber(totals.virginAmount, 3),
          recycledAchievedMt: formatNumber(totals.recycledQty, 2),
          virginAchievedMt: formatNumber(totals.virginQty, 2),
          recycledShortfallArrow: recMetaTotal.arrow,
          recycledShortfallAbs: recMetaTotal.abs,
          recycledShortfallStyle: recMetaTotal.color,
          virginShortfallArrow: virMetaTotal.arrow,
          virginShortfallAbs: virMetaTotal.abs,
          virginShortfallStyle: virMetaTotal.color,
          recycledAchievedPct: formatPercent(recycledAchievedPct, 1),
          virginAchievedPct: formatPercent(virginAchievedPct, 1),
          recycledAchievedBarPct: clampPct(recycledAchievedPct),
          virginAchievedBarPct: clampPct(virginAchievedPct),
          categoryWise,
          clientWise,
          clientWiseTotals: summarizeBreakdownRows(clientWise),
          industryWise,
          industryWiseTotals: summarizeTargetRows(industryWise),
          polymerWise,
          polymerWiseTotals: summarizeBreakdownRows(polymerWise),
          supplierTypeWise,
          supplierTypeWiseTotals: summarizeTargetRows(supplierTypeWise),
          supplierWise,
          supplierWiseTotals: summarizeTargetRows(supplierWise),
          stateWiseSupplierSummary,
          stateWiseSupplierSummaryTotals,
        };
      })(),
      salesSummary: {
        years: displaySalesYears,
        data: salesSummaryTable,
      },
      purchaseSummary: {
        years: displayPurchaseYears,
        data: purchaseSummaryTable,
      },
      prePostSummary: formattedPrePost,
      targetTables: targetTables,
      supplierCtoSummary,
      supplierCtoTable,
      auditorInsights,
      sectionStatus,
    };

    // 7. Render HTML
    const templateFileName =
      options.templateName || "plasticComplianceReport.hbs";
    const templatePath = path.join(
      __dirname,
      `../../templates/${templateFileName}`,
    );
    logger.debug({ templatePath }, "[Report Generation] Template path");

    if (!fs.existsSync(templatePath)) {
      logger.error({ templatePath }, "[Report Generation] Template file missing");
      throw new Error(`Template file missing at ${templatePath}`);
    }

    const templateHtml = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateHtml);
    const html = template(templateData);

    // 7. Generate PDF
    logger.info("[Report Generation] Launching Puppeteer");
    try {
      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
      logger.debug(
        {
          configuredExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          resolvedExecutablePath: executablePath,
        },
        "[Report Generation] Puppeteer executable paths",
      );

      if (fs.existsSync(executablePath)) {
        logger.debug({ executablePath }, "[Report Generation] Executable found");
      } else {
        logger.warn({ executablePath }, "[Report Generation] Executable not found");
        if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
          if (process.platform === "linux") {
            const standardPath = "/usr/bin/google-chrome-stable";
            if (fs.existsSync(standardPath)) {
              logger.debug({ standardPath }, "[Report Generation] Found Linux browser path");
              process.env.PUPPETEER_EXECUTABLE_PATH = standardPath;
            }
          } else if (process.platform === "win32") {
            const candidates = [
              "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
              "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
              "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
              "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
            ];
            for (const p of candidates) {
              if (fs.existsSync(p)) {
                logger.debug({ executablePath: p }, "[Report Generation] Found Windows browser path");
                process.env.PUPPETEER_EXECUTABLE_PATH = p;
                break;
              }
            }
          } else if (process.platform === "darwin") {
            const candidates = [
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            ];
            for (const p of candidates) {
              if (fs.existsSync(p)) {
                logger.debug({ executablePath: p }, "[Report Generation] Found macOS browser path");
                process.env.PUPPETEER_EXECUTABLE_PATH = p;
                break;
              }
            }
          }
        }
      }

      const browser = await puppeteer.launch({
        headless: true,
        dumpio: true, // Capture stdout/stderr from browser
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-extensions",
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
          '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
        ],
        // Explicitly use the installed chrome if env var is set (from Dockerfile)
        // Otherwise fallback to puppeteer's default (which might be missing if skipped download)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath,
      });
      const page = await browser.newPage();
      logger.debug("[Report Generation] Setting content");
      await page.setContent(html, { waitUntil: "networkidle0" });
      logger.debug("[Report Generation] Printing PDF");
      const footerTemplate = `
        <div style="width: 100%; padding: 0 20px 10px; box-sizing: border-box; font-family: Nunito, Arial, sans-serif; font-size: 8px; color: #0F5D46; background-color: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <div style="width: 100%; background: #EAF5F0; background-color: #EAF5F0; color: #0F5D46; padding: 7px 16px 8px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; border-top: 1px solid #D6EADF; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span>AnantTattva EPR Kavach System</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        </div>`;
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true, // Changed to Landscape to fit wide tables
        displayHeaderFooter: true,
        headerTemplate: `<div></div>`,
        footerTemplate,
        printBackground: true,
        margin: { top: "20px", right: "20px", bottom: "42px", left: "20px" },
      });
      await browser.close();
      logger.info("[Report Generation] PDF generated successfully");

      return pdfBuffer;
    } catch (puppeteerError) {
      logger.error({ err: puppeteerError }, "[Report Generation] Puppeteer error");
      throw new Error(
        `Puppeteer PDF generation failed: ${puppeteerError.message}`,
      );
    }
  }
}

export default ReportGeneratorService;
