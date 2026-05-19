import fs from "fs";
import path from "path";
import AnalysisService from "../services/analysis.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import PdfService from "../services/pdf.service.js";
import CacheService from "../services/cache.service.js";
import PlasticAnalysisModel from "../models/plasticAnalysis.model.js";
import logger from "../utils/logger.js";

const ANALYSIS_CACHE_PREFIX = "analysis:";
const makeAnalysisCacheKey = (scope, clientId, type, itemId) =>
  `${ANALYSIS_CACHE_PREFIX}${scope}:${clientId}:${type}:${itemId}`;
const parseReportSections = (rawSections) => {
  if (!rawSections) return undefined;
  return String(rawSections)
    .split(",")
    .map((section) => section.trim())
    .filter(Boolean);
};

export const analyzePlasticPrePost = async (req, res) => {
  try {
    if (!req.files || !req.files.salesFile) {
      return res
        .status(400)
        .json({ message: "At least 'salesFile' is required." });
    }

    const { clientId, type, itemId } = req.body;

    const salesFile = req.files.salesFile[0];
    const purchaseFile = req.files.purchaseFile
      ? req.files.purchaseFile[0]
      : null;
    const outputDir = path.join(process.cwd(), "temp_analysis_output");

    // Use Service Layer
    const result = await AnalysisService.runPlasticAnalysis(
      salesFile.path,
      purchaseFile ? purchaseFile.path : null,
      outputDir,
      { clientId, type, itemId },
    );

    // Cleanup input files
    try {
      fs.unlinkSync(salesFile.path);
      if (purchaseFile) fs.unlinkSync(purchaseFile.path);
    } catch (cleanupErr) {
      logger.error({ err: cleanupErr }, "Error cleaning up input files");
    }

    // Return the result
    res.status(200).json({
      success: true,
      data: result.summary.portal_summary,
      full_summary: result.summary,
      output_file: result.output_file,
    });

    await CacheService.invalidateCache(
      `${ANALYSIS_CACHE_PREFIX}plastic-prepost:${clientId}:${type}:${itemId}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Analysis Error");
    res
      .status(500)
      .json({ message: error.message || "Error processing analysis files" });
  }
};

export const getPlasticAnalysisController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeAnalysisCacheKey(
      "plastic-prepost",
      clientId,
      type,
      itemId,
    );
    const cached = await CacheService.getCache(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    const analysisData = await AnalysisService.getPlasticAnalysis(
      clientId,
      type,
      itemId,
    );

    if (!analysisData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No analysis data found",
      });
    }

    const payload = {
      success: true,
      ...analysisData,
    };

    await CacheService.setCache(cacheKey, payload, CacheService.ttl.analytics);
    res.status(200).json(payload);
  } catch (error) {
    logger.error({ err: error }, "Get Analysis Error");
    res
      .status(500)
      .json({ message: error.message || "Error fetching analysis data" });
  }
};

export const saveSalesAnalysisController = async (req, res) => {
  try {
    const {
      clientId,
      type,
      itemId,
      summary,
      rows,
      targetTables,
      preConsumerRows,
    } = req.body;

    if (!clientId || !type || !itemId || !summary || !rows) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await AnalysisService.saveSalesAnalysis(
      clientId,
      type,
      itemId,
      { summary, rows, targetTables, preConsumerRows },
    );
    await CacheService.invalidateCache(
      `${ANALYSIS_CACHE_PREFIX}sales:${clientId}:${type}:${itemId}`,
    );

    res.status(200).json({
      success: true,
      message: "Sales analysis saved successfully",
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, "Save Sales Analysis Error");
    res
      .status(500)
      .json({ message: error.message || "Error saving sales analysis" });
  }
};

export const getSalesAnalysisController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeAnalysisCacheKey("sales", clientId, type, itemId);
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    const analysisData = await AnalysisService.getSalesAnalysis(
      clientId,
      type,
      itemId,
    );

    if (!analysisData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No sales analysis data found",
      });
    }

    const payload = {
      success: true,
      ...analysisData,
    };

    await CacheService.setCache(cacheKey, payload, CacheService.ttl.analytics);
    res.status(200).json(payload);
  } catch (error) {
    logger.error({ err: error }, "Get Sales Analysis Error");
    res
      .status(500)
      .json({ message: error.message || "Error fetching sales analysis data" });
  }
};

export const savePurchaseAnalysisController = async (req, res) => {
  try {
    const { clientId, type, itemId, summary, rows } = req.body;

    if (!clientId || !type || !itemId || !summary || !rows) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await AnalysisService.savePurchaseAnalysis(
      clientId,
      type,
      itemId,
      { summary, rows },
    );
    await CacheService.invalidateCache(
      `${ANALYSIS_CACHE_PREFIX}purchase:${clientId}:${type}:${itemId}`,
    );

    res.status(200).json({
      success: true,
      message: "Purchase analysis saved successfully",
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, "Save Purchase Analysis Error");
    res
      .status(500)
      .json({ message: error.message || "Error saving purchase analysis" });
  }
};

export const getPurchaseAnalysisController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, itemId } = req.query;
    const cacheKey = makeAnalysisCacheKey("purchase", clientId, type, itemId);
    const cached = await CacheService.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    const analysisData = await AnalysisService.getPurchaseAnalysis(
      clientId,
      type,
      itemId,
    );

    if (!analysisData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No purchase analysis data found",
      });
    }

    const payload = {
      success: true,
      ...analysisData,
    };

    await CacheService.setCache(cacheKey, payload, CacheService.ttl.analytics);
    res.status(200).json(payload);
  } catch (error) {
    logger.error({ err: error }, "Get Purchase Analysis Error");
    res.status(500).json({
      message: error.message || "Error fetching purchase analysis data",
    });
  }
};

const queueReport = (reportType) =>
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { type, itemId, sections: rawSections } = req.query;
    const sections = parseReportSections(rawSections);

    const result = await PdfService.enqueueReport({
      reportType,
      clientId,
      type,
      itemId,
      sections,
      userId: req.userId,
    });

    return res.status(202).json({
      success: true,
      message: "Report generation queued",
      data: {
        jobId: result.jobId,
        statusUrl: `/api/reports/status/${result.jobId}`,
        downloadUrl: `/api/reports/download/${result.jobId}`,
        cached: Boolean(result.cached),
      },
    });
  });

export const generatePlasticComplianceReportController =
  queueReport("compliance");
export const generatePlasticSummaryReportController = queueReport("summary");

export const getReportJobStatusController = asyncHandler(async (req, res) => {
  const status = await PdfService.getJobStatus(req.params.jobId, {
    userId: req.userId,
  });
  if (!status) {
    return res
      .status(404)
      .json({ success: false, message: "Report job not found" });
  }

  return res.status(200).json({
    success: true,
    data: status,
  });
});

export const downloadReportByJobIdController = asyncHandler(
  async (req, res) => {
    const status = await PdfService.getJobStatus(req.params.jobId, {
      userId: req.userId,
    });
    if (!status) {
      return res
        .status(404)
        .json({ success: false, message: "Report job not found" });
    }

    if (status.state !== "completed") {
      return res
        .status(409)
        .json({ success: false, message: "Report is not ready yet" });
    }

    const buffer = await PdfService.getReportBuffer(req.params.jobId);
    if (!buffer) {
      return res
        .status(404)
        .json({ success: false, message: "Report file not found" });
    }

    const fileName = `${status.reportType === "summary" ? "Plastic_Summary" : "Plastic_Compliance"}_Report_${status.clientId}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    return res.send(buffer);
  },
);

export const listAnalysisSnapshotsController = asyncHandler(
  async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const [data, total] = await Promise.all([
      PlasticAnalysisModel.find({})
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("client type itemId updatedAt createdAt")
        .lean(),
      PlasticAnalysisModel.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      ...res.paginate({ data, total }),
    });
  },
);

export const listReportsController = asyncHandler(async (req, res) => {
  const { page, limit } = req.pagination;
  const { data, total } = await PdfService.listReportJobs({
    page,
    limit,
    userId: req.userId,
  });
  return res.status(200).json({
    success: true,
    ...res.paginate({ data, total }),
  });
});
