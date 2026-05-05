import { Queue, QueueEvents } from "bullmq";
import CacheService from "../services/cache.service.js";

const connection = CacheService.getQueueConnection();

export const pdfQueueName = "pdf-report-generation";

export const pdfQueue = connection
  ? new Queue(pdfQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 200,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  : null;

export const pdfQueueEvents = connection
  ? new QueueEvents(pdfQueueName, { connection })
  : null;

export const isPdfQueueEnabled = Boolean(connection && pdfQueue);
