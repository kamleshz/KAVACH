import express from "express";
import { auth } from "../middleware/auth.js";
import {
  downloadReportByJobIdController,
  getReportJobStatusController,
  listReportsController,
} from "../controllers/analysis.controller.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";

const router = express.Router();

router.get("/", auth, paginationMiddleware(), listReportsController);
router.get("/status/:jobId", auth, getReportJobStatusController);
router.get("/download/:jobId", auth, downloadReportByJobIdController);

export default router;
