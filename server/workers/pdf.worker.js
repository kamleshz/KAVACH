import { Worker } from "bullmq";
import CacheService from "../services/cache.service.js";
import PdfService from "../services/pdf.service.js";
import { pdfQueueName } from "../queues/pdf.queue.js";
import logger from "../utils/logger.js";

const connection = CacheService.getQueueConnection();

if (!connection) {
  logger.warn("[PDF Worker] REDIS_URL not configured. Worker not started.");
  process.exit(0);
}

const worker = new Worker(
  pdfQueueName,
  async (job) => {
    const { reportType, clientId, type, itemId, userId } = job.data;
    const buffer = await PdfService.generateReportBuffer({
      reportType,
      clientId,
      type,
      itemId,
      userId,
    });

    await PdfService.persistCompletedJob({
      jobId: job.id,
      reportType,
      clientId,
      type,
      itemId,
      userId,
      buffer,
    });

    return { jobId: job.id };
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on("failed", async (job, error) => {
  if (job?.id) {
    await PdfService.markJobFailed(job.id, error);
  }
  logger.error(
    { jobId: job?.id, error: error?.message },
    "[PDF Worker] Job failed",
  );
});

worker.on("error", (error) => {
  logger.error({ error: error?.message }, "[PDF Worker] Worker error");
});

logger.info("[PDF Worker] Started");
