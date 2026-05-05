import api from "./api";
import { API_ENDPOINTS } from "./apiEndpoints";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const queueReportAndDownload = async ({
  reportEndpoint,
  clientId,
  type,
  itemId,
  filename,
  pollAttempts = 20,
  pollIntervalMs = 2000,
  onStatus,
}) => {
  const enqueueResponse = await api.get(
    `${reportEndpoint(clientId)}?type=${type}&itemId=${itemId}`,
  );
  const jobId = enqueueResponse.data?.data?.jobId;

  if (!jobId) {
    throw new Error("Report job could not be created");
  }

  onStatus?.({ phase: "queued", jobId });

  let latestStatus = null;
  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const statusResponse = await api.get(API_ENDPOINTS.REPORTS.STATUS(jobId));
    latestStatus = statusResponse.data?.data;

    onStatus?.({
      phase: latestStatus?.state || "queued",
      jobId,
      status: latestStatus,
    });

    if (latestStatus?.state === "completed") {
      const downloadResponse = await api.get(
        API_ENDPOINTS.REPORTS.DOWNLOAD(jobId),
        {
          responseType: "blob",
        },
      );

      downloadBlob(new Blob([downloadResponse.data]), filename);
      return { jobId, status: latestStatus };
    }

    if (latestStatus?.state === "failed") {
      throw new Error(
        latestStatus?.error ||
          latestStatus?.failedReason ||
          "Report generation failed",
      );
    }

    await sleep(pollIntervalMs);
  }

  throw new Error("Report generation timed out");
};
