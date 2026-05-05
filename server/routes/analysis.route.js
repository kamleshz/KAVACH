import express from "express";
import {
  analyzePlasticPrePost,
  getPlasticAnalysisController,
  saveSalesAnalysisController,
  getSalesAnalysisController,
  savePurchaseAnalysisController,
  getPurchaseAnalysisController,
  generatePlasticComplianceReportController,
  generatePlasticSummaryReportController,
  listAnalysisSnapshotsController,
} from "../controllers/analysis.controller.js";
import { upload } from "../middleware/upload.js";
import { auth } from "../middleware/auth.js";
import {
  requireInternalUser,
  restrictClientScope,
} from "../middleware/clientAccess.js";
import { validate } from "../middleware/validate.js";
import {
  clientIdOnlySchema,
  plasticPrePostUploadSchema,
  purchaseAnalysisSchema,
  salesAnalysisSchema,
} from "../validators/analysis.validator.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";

const router = express.Router();

// Route to analyze Plastic Pre/Post Consumer Data
// Uses 'auth' middleware to ensure user is logged in
// Uses 'upload' middleware to handle file uploads
router.post(
  "/plastic-prepost",
  auth,
  requireInternalUser,
  validate(plasticPrePostUploadSchema),
  upload.fields([
    { name: "salesFile", maxCount: 1 },
    { name: "purchaseFile", maxCount: 1 },
  ]),
  analyzePlasticPrePost,
);

// Route to get saved Plastic Pre/Post Analysis Data
router.get(
  "/plastic-prepost/:clientId",
  auth,
  restrictClientScope,
  validate(clientIdOnlySchema),
  getPlasticAnalysisController,
);

// Route to save Sales Analysis Data
router.post(
  "/sales-analysis",
  auth,
  requireInternalUser,
  validate(salesAnalysisSchema),
  saveSalesAnalysisController,
);

// Route to get saved Sales Analysis Data
router.get(
  "/sales-analysis/:clientId",
  auth,
  restrictClientScope,
  validate(clientIdOnlySchema),
  getSalesAnalysisController,
);

// Route to save Purchase Analysis Data
router.post(
  "/purchase-analysis",
  auth,
  requireInternalUser,
  validate(purchaseAnalysisSchema),
  savePurchaseAnalysisController,
);

// Route to get saved Purchase Analysis Data
router.get(
  "/purchase-analysis/:clientId",
  auth,
  restrictClientScope,
  validate(clientIdOnlySchema),
  getPurchaseAnalysisController,
);

router.get(
  "/",
  auth,
  requireInternalUser,
  paginationMiddleware(),
  listAnalysisSnapshotsController,
);

// Route to generate Plastic Compliance Report PDF
router.get(
  "/plastic-compliance-report/:clientId",
  auth,
  restrictClientScope,
  validate(clientIdOnlySchema),
  generatePlasticComplianceReportController,
);
router.get(
  "/plastic-summary-report/:clientId",
  auth,
  restrictClientScope,
  validate(clientIdOnlySchema),
  generatePlasticSummaryReportController,
);

export default router;
