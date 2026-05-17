import { randomUUID } from "crypto";
import CacheService from "./cache.service.js";
import { isPdfQueueEnabled, pdfQueue } from "../queues/pdf.queue.js";
import ReportGeneratorService from "./analysis/reportGenerator.service.js";
import logger from "../utils/logger.js";

const REPORT_META_PREFIX = "report:meta:";
const REPORT_BUFFER_PREFIX = "report:buffer:";
const REPORT_LOOKUP_PREFIX = "report:lookup:";
const REPORT_CACHE_VERSION = "2026-05-15-index-fit-and-no-left-box-v48";

const createReportCacheKey = ({ reportType, clientId, type, itemId, userId }) =>
  `${REPORT_LOOKUP_PREFIX}${REPORT_CACHE_VERSION}:${reportType}:${clientId}:${type}:${itemId}:${userId || "anonymous"}`;

const createMetaKey = (jobId) => `${REPORT_META_PREFIX}${jobId}`;
const createBufferKey = (jobId) => `${REPORT_BUFFER_PREFIX}${jobId}`;
const canAccessReportJob = (meta, userId) => {
  if (!meta) return false;
  if (!userId) return !meta.userId;
  if (!meta.userId) return true;
  return String(meta.userId) === String(userId);
};

class PdfService {
  static async enqueueReport({ reportType, clientId, type, itemId, userId }) {
    const reportCacheKey = createReportCacheKey({
      reportType,
      clientId,
      type,
      itemId,
      userId,
    });
    const cachedMeta = await CacheService.getCache(reportCacheKey);

    if (cachedMeta?.jobId) {
      const cachedStatus = await this.getJobStatus(cachedMeta.jobId, {
        userId,
      });
      if (cachedStatus?.state === "completed") {
        return {
          jobId: cachedMeta.jobId,
          cached: true,
        };
      }
    }

    if (!isPdfQueueEnabled) {
      const buffer = await this.generateReportBuffer({
        reportType,
        clientId,
        type,
        itemId,
        userId,
      });
      const jobId = randomUUID();
      await this.persistCompletedJob({
        jobId,
        reportType,
        clientId,
        type,
        itemId,
        userId,
        buffer,
      });
      return { jobId, cached: true, fallback: true };
    }

    try {
      const job = await pdfQueue.add("generate-report", {
        reportType,
        clientId,
        type,
        itemId,
        userId,
      });

      const meta = {
        jobId: job.id,
        state: "queued",
        reportType,
        clientId,
        type,
        itemId,
        userId,
        createdAt: new Date().toISOString(),
      };

      await CacheService.setCache(
        createMetaKey(job.id),
        meta,
        CacheService.ttl.reports,
      );
      await CacheService.setCache(
        reportCacheKey,
        { jobId: job.id },
        CacheService.ttl.reports,
      );

      return { jobId: job.id, cached: false };
    } catch (error) {
      logger.error(
        {
          error: error?.message,
          reportType,
          clientId,
          type,
          itemId,
          userId,
        },
        "[PDF] Queue enqueue failed, falling back to direct generation",
      );

      const buffer = await this.generateReportBuffer({
        reportType,
        clientId,
        type,
        itemId,
        userId,
      });
      const jobId = randomUUID();
      await this.persistCompletedJob({
        jobId,
        reportType,
        clientId,
        type,
        itemId,
        userId,
        buffer,
      });
      return { jobId, cached: true, fallback: true };
    }
  }

  static async generateReportBuffer({
    reportType,
    clientId,
    type,
    itemId,
    userId,
  }) {
    if (reportType === "summary") {
      return ReportGeneratorService.generatePlasticSummaryReport(
        clientId,
        type,
        itemId,
        userId,
      );
    }

    return ReportGeneratorService.generatePlasticComplianceReport(
      clientId,
      type,
      itemId,
      userId,
    );
  }

  static async persistCompletedJob({
    jobId,
    reportType,
    clientId,
    type,
    itemId,
    userId,
    buffer,
  }) {
    const base64 = Buffer.from(buffer).toString("base64");
    const meta = {
      jobId,
      state: "completed",
      reportType,
      clientId,
      type,
      itemId,
      userId,
      completedAt: new Date().toISOString(),
      downloadUrl: `/api/reports/download/${jobId}`,
    };

    await Promise.all([
      CacheService.setCache(
        createMetaKey(jobId),
        meta,
        CacheService.ttl.reports,
      ),
      CacheService.setCache(
        createBufferKey(jobId),
        base64,
        CacheService.ttl.reports,
      ),
      CacheService.setCache(
        createReportCacheKey({ reportType, clientId, type, itemId, userId }),
        { jobId },
        CacheService.ttl.reports,
      ),
    ]);

    return meta;
  }

  static async markJobFailed(jobId, error) {
    const existing = (await CacheService.getCache(createMetaKey(jobId))) || {};
    const meta = {
      ...existing,
      jobId,
      state: "failed",
      failedAt: new Date().toISOString(),
      error: error?.message || "Report generation failed",
    };
    await CacheService.setCache(
      createMetaKey(jobId),
      meta,
      CacheService.ttl.reports,
    );
    return meta;
  }

  static async getJobStatus(jobId, { userId } = {}) {
    const meta = await CacheService.getCache(createMetaKey(jobId));
    if (meta) {
      return canAccessReportJob(meta, userId) ? meta : null;
    }

    if (!isPdfQueueEnabled || !pdfQueue) return null;

    const job = await pdfQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const status = {
      jobId,
      state,
      progress: job.progress || 0,
      createdAt: job.timestamp
        ? new Date(job.timestamp).toISOString()
        : undefined,
      failedReason: job.failedReason || undefined,
      reportType: job.data?.reportType,
      clientId: job.data?.clientId,
      type: job.data?.type,
      itemId: job.data?.itemId,
      userId: job.data?.userId,
    };

    if (!canAccessReportJob(status, userId)) return null;

    await CacheService.setCache(
      createMetaKey(jobId),
      status,
      CacheService.ttl.reports,
    );
    return status;
  }

  static async getReportBuffer(jobId) {
    const encoded = await CacheService.getCache(createBufferKey(jobId));
    if (!encoded) return null;
    return Buffer.from(encoded, "base64");
  }

  static async listReportJobs({ page, limit, userId }) {
    const keys = await CacheService.listKeys(`${REPORT_META_PREFIX}*`);
    const rawItems = await Promise.all(keys.map((key) => CacheService.getCache(key)));
    const filteredItems = rawItems
      .filter(Boolean)
      .filter((item) => canAccessReportJob(item, userId))
      .sort((a, b) => {
        const aDate =
          a?.completedAt || a?.failedAt || a?.createdAt || "";
        const bDate =
          b?.completedAt || b?.failedAt || b?.createdAt || "";
        return bDate.localeCompare(aDate);
      });
    const total = filteredItems.length;
    const start = (page - 1) * limit;
    const data = filteredItems.slice(start, start + limit);

    return {
      data,
      total,
    };
  }
}

export default PdfService;
