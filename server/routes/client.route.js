import express from 'express';
import {
    createClientController,
    uploadClientDocumentController,
    deleteClientDocumentController,
    verifyFacilityController,
    saveProductComplianceController,
    getProductComplianceController,
    getAllProductComplianceRowsController,
    uploadProductComplianceRowController,
    saveProductComponentDetailsController,
    getProductComponentDetailsController,
    saveProductSupplierComplianceController,
    getProductSupplierComplianceController,
    uploadProductSupplierCtoDocumentController,
    getSupplierCtoChecksController,
    saveSupplierCtoChecksController,
    uploadSupplierCtoCcaDocumentController,
    getProductComplianceHistoryController,
    importProductComplianceHistoryController,
    saveRecycledQuantityUsedController,
    getRecycledQuantityUsedController,
    saveMonthlyProcurementController,
    getMonthlyProcurementController,
    getAllClientsController,
    getClientByIdController,
    updateClientController,
    deleteClientController,
    assignClientController,
    updatePlantProcessProgressController,
    getClientStatsController,
    validateClientController,
    cleanupProductComplianceFieldsController,
    importProcurementController,
    getProcurementController,
    saveSkuComplianceController,
    getSkuComplianceController,
    uploadSkuComplianceRowController,
    accessProtectedFileController
} from '../controllers/client.controller.js';
import { auth, admin } from '../middleware/auth.js';
import { requireInternalUser, restrictClientScope } from '../middleware/clientAccess.js';
import { upload } from '../middleware/upload.js';
import {
    getSingleUsePlasticChecklistController,
    saveSingleUsePlasticChecklistController
} from '../controllers/supChecklist.controller.js';
import {
    saveEWasteComplianceController,
    getEWasteComplianceController,
    uploadEWasteProductImageController,
    saveEWasteROHSComplianceController,
    saveEWasteStorageComplianceController,
    uploadEWasteStorageImageController,
    saveEWasteAwarenessController
} from '../controllers/eWasteCompliance.controller.js';
import { validate } from '../middleware/validate.js';
import { paginationMiddleware } from '../middleware/pagination.middleware.js';
import logger from '../utils/logger.js';
import {
    assignClientSchema,
    clientIdParamsSchema,
    createClientSchema,
    historyImportSchema,
    paginationQuerySchema,
    plantProcessProgressSchema,
    productComplianceSaveSchema,
    supplierCtoChecksSchema,
    validateClientStatusSchema
} from '../validators/client.validator.js';

const router = express.Router();

router.post('/:clientId/e-waste-compliance/upload-image', auth, restrictClientScope, requireInternalUser, upload.single('productImage'), uploadEWasteProductImageController);
router.post('/:clientId/e-waste-compliance', auth, restrictClientScope, requireInternalUser, saveEWasteComplianceController);
router.post('/:clientId/e-waste-compliance/rohs', auth, restrictClientScope, requireInternalUser, saveEWasteROHSComplianceController);
router.post('/:clientId/e-waste-compliance/storage', auth, restrictClientScope, requireInternalUser, saveEWasteStorageComplianceController);
router.post('/:clientId/e-waste-compliance/awareness', auth, restrictClientScope, requireInternalUser, saveEWasteAwarenessController);
router.post('/:clientId/e-waste-compliance/storage/upload-image', auth, restrictClientScope, requireInternalUser, upload.single('storageImage'), uploadEWasteStorageImageController);
router.get('/:clientId/e-waste-compliance', auth, restrictClientScope, getEWasteComplianceController);

router.get('/:clientId/marking-labelling/events', auth, restrictClientScope, (req, res) => {
    const emitter = req.app.get('realtimeEmitter');
    if (!emitter) {
        res.status(503).end();
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders && res.flushHeaders();

    const { clientId } = req.params;

    const sendEvent = (payload) => {
        if (!payload || (payload.clientId && String(payload.clientId) !== String(clientId))) return;
        const data = JSON.stringify(payload);
        res.write(`event: markingLabellingUpdate\n`);
        res.write(`data: ${data}\n\n`);
    };

    const heartbeat = () => {
        res.write(`event: ping\n`);
        res.write(`data: keep-alive\n\n`);
    };

    const handler = (payload) => {
        sendEvent(payload);
    };

    emitter.on('markingLabellingUpdate', handler);

    const heartbeatId = setInterval(heartbeat, 25000);
    heartbeat();

    req.on('close', () => {
        clearInterval(heartbeatId);
        emitter.off('markingLabellingUpdate', handler);
        res.end();
    });
});

router.post('/create', auth, requireInternalUser, validate(createClientSchema), createClientController);
router.get('/:clientId/file-access', auth, restrictClientScope, validate(clientIdParamsSchema), accessProtectedFileController);
router.post('/:clientId/plant-process-progress', auth, restrictClientScope, requireInternalUser, validate(plantProcessProgressSchema), updatePlantProcessProgressController);
router.post('/:clientId/verify-facility', auth, restrictClientScope, requireInternalUser, validate(clientIdParamsSchema), upload.single('document'), verifyFacilityController);
router.post('/:clientId/product-compliance', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveProductComplianceController);
router.put('/:clientId/product-compliance', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveProductComplianceController);
router.post('/:clientId/product-compliance-row-save', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveProductComplianceController);
router.get('/:clientId/product-compliance', auth, restrictClientScope, getProductComplianceController);
router.get('/:clientId/all-product-compliance-rows', auth, restrictClientScope, getAllProductComplianceRowsController);
router.post('/:clientId/product-compliance/upload-row', auth, restrictClientScope, requireInternalUser, (req, res, next) => {
    upload.fields([
        { name: 'productImage', maxCount: 1 },
        { name: 'componentImage', maxCount: 1 },
        { name: 'additionalDocument', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            logger.error({ err }, "[Multer Upload Error]");
            return res.status(500).json({ 
                message: "File upload failed: " + (err.message || "Unknown error"), 
                error: true, 
                success: false 
            });
        }
        next();
    });
}, uploadProductComplianceRowController);

router.post('/:clientId/sku-compliance', auth, restrictClientScope, requireInternalUser, saveSkuComplianceController);
router.get('/:clientId/sku-compliance', auth, restrictClientScope, getSkuComplianceController);
router.post('/:clientId/sku-compliance/upload-row', auth, restrictClientScope, requireInternalUser, upload.fields([
    { name: 'markingImage', maxCount: 10 }
]), uploadSkuComplianceRowController);

router.post('/:clientId/product-component-details', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveProductComponentDetailsController);
router.get('/:clientId/product-component-details', auth, restrictClientScope, getProductComponentDetailsController);
router.post('/:clientId/product-supplier-compliance', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveProductSupplierComplianceController);
router.get('/:clientId/product-supplier-compliance', auth, restrictClientScope, getProductSupplierComplianceController);
router.post('/:clientId/product-supplier-compliance/upload-cto', auth, restrictClientScope, requireInternalUser, validate(clientIdParamsSchema), upload.single('document'), uploadProductSupplierCtoDocumentController);
router.get('/:clientId/supplier-cto-check', auth, restrictClientScope, getSupplierCtoChecksController);
router.post('/:clientId/supplier-cto-check', auth, restrictClientScope, requireInternalUser, validate(supplierCtoChecksSchema), saveSupplierCtoChecksController);
router.post('/:clientId/supplier-cto-check/upload', auth, restrictClientScope, requireInternalUser, validate(clientIdParamsSchema), upload.single('document'), uploadSupplierCtoCcaDocumentController);
router.get('/:clientId/product-compliance-history', auth, restrictClientScope, getProductComplianceHistoryController);
router.post('/:clientId/product-compliance-history/import', auth, restrictClientScope, requireInternalUser, validate(historyImportSchema), importProductComplianceHistoryController);
router.post('/:clientId/recycled-quantity-used', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveRecycledQuantityUsedController);
router.get('/:clientId/recycled-quantity-used', auth, restrictClientScope, getRecycledQuantityUsedController);
router.post('/:clientId/monthly-procurement', auth, restrictClientScope, requireInternalUser, validate(productComplianceSaveSchema), saveMonthlyProcurementController);
router.get('/:clientId/monthly-procurement', auth, restrictClientScope, getMonthlyProcurementController);
router.post('/:clientId/procurement', auth, restrictClientScope, requireInternalUser, validate(clientIdParamsSchema), upload.single('file'), importProcurementController);
router.get('/:clientId/procurement', auth, restrictClientScope, getProcurementController);
router.post('/:clientId/sup-checklist', auth, restrictClientScope, requireInternalUser, saveSingleUsePlasticChecklistController);
router.get('/:clientId/sup-checklist', auth, restrictClientScope, getSingleUsePlasticChecklistController);
router.post('/product-compliance/cleanup', auth, admin, cleanupProductComplianceFieldsController);
router.post('/:clientId/upload-document', auth, restrictClientScope, requireInternalUser, validate(clientIdParamsSchema), upload.single('document'), uploadClientDocumentController);
router.delete('/:clientId/document/:docId', auth, restrictClientScope, requireInternalUser, deleteClientDocumentController);
router.get('/all', auth, validate(paginationQuerySchema), paginationMiddleware(), getAllClientsController);
router.get('/stats', auth, getClientStatsController);
router.get('/:clientId', auth, restrictClientScope, getClientByIdController);
router.put('/:clientId', auth, restrictClientScope, requireInternalUser, updateClientController);
router.delete('/:clientId', auth, restrictClientScope, admin, deleteClientController);
router.patch('/:clientId/assign', auth, restrictClientScope, admin, validate(assignClientSchema), assignClientController);
router.put('/:clientId/validate', auth, restrictClientScope, requireInternalUser, validate(validateClientStatusSchema), validateClientController);

export default router;
