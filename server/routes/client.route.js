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
    uploadSkuComplianceRowController
} from '../controllers/client.controller.js';
import { auth, admin } from '../middleware/auth.js';
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

const router = express.Router();

router.post('/:clientId/e-waste-compliance/upload-image', auth, upload.single('productImage'), uploadEWasteProductImageController);
router.post('/:clientId/e-waste-compliance', auth, saveEWasteComplianceController);
router.post('/:clientId/e-waste-compliance/rohs', auth, saveEWasteROHSComplianceController);
router.post('/:clientId/e-waste-compliance/storage', auth, saveEWasteStorageComplianceController);
router.post('/:clientId/e-waste-compliance/awareness', auth, saveEWasteAwarenessController);
router.post('/:clientId/e-waste-compliance/storage/upload-image', auth, upload.single('storageImage'), uploadEWasteStorageImageController);
router.get('/:clientId/e-waste-compliance', auth, getEWasteComplianceController);

router.get('/:clientId/marking-labelling/events', auth, (req, res) => {
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

router.post('/create', auth, createClientController);
router.post('/:clientId/plant-process-progress', auth, updatePlantProcessProgressController);
router.post('/:clientId/verify-facility', auth, upload.single('document'), verifyFacilityController);
router.post('/:clientId/product-compliance', auth, saveProductComplianceController);
router.put('/:clientId/product-compliance', auth, saveProductComplianceController);
router.post('/:clientId/product-compliance-row-save', auth, saveProductComplianceController);
router.get('/:clientId/product-compliance', auth, getProductComplianceController);
router.get('/:clientId/all-product-compliance-rows', auth, getAllProductComplianceRowsController);
router.post('/:clientId/product-compliance/upload-row', auth, (req, res, next) => {
    upload.fields([
        { name: 'productImage', maxCount: 1 },
        { name: 'componentImage', maxCount: 1 },
        { name: 'additionalDocument', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error("[Multer Upload Error]", err);
            return res.status(500).json({ 
                message: "File upload failed: " + (err.message || "Unknown error"), 
                error: true, 
                success: false 
            });
        }
        next();
    });
}, uploadProductComplianceRowController);

router.post('/:clientId/sku-compliance', auth, saveSkuComplianceController);
router.get('/:clientId/sku-compliance', auth, getSkuComplianceController);
router.post('/:clientId/sku-compliance/upload-row', auth, upload.fields([
    { name: 'markingImage', maxCount: 10 }
]), uploadSkuComplianceRowController);

router.post('/:clientId/product-component-details', auth, saveProductComponentDetailsController);
router.get('/:clientId/product-component-details', auth, getProductComponentDetailsController);
router.post('/:clientId/product-supplier-compliance', auth, saveProductSupplierComplianceController);
router.get('/:clientId/product-supplier-compliance', auth, getProductSupplierComplianceController);
router.get('/:clientId/product-compliance-history', auth, getProductComplianceHistoryController);
router.post('/:clientId/product-compliance-history/import', auth, importProductComplianceHistoryController);
router.post('/:clientId/recycled-quantity-used', auth, saveRecycledQuantityUsedController);
router.get('/:clientId/recycled-quantity-used', auth, getRecycledQuantityUsedController);
router.post('/:clientId/monthly-procurement', auth, saveMonthlyProcurementController);
router.get('/:clientId/monthly-procurement', auth, getMonthlyProcurementController);
router.post('/:clientId/procurement', auth, upload.single('file'), importProcurementController);
router.get('/:clientId/procurement', auth, getProcurementController);
router.post('/:clientId/sup-checklist', auth, saveSingleUsePlasticChecklistController);
router.get('/:clientId/sup-checklist', auth, getSingleUsePlasticChecklistController);
router.post('/product-compliance/cleanup', auth, admin, cleanupProductComplianceFieldsController);
router.post('/:clientId/upload-document', auth, upload.single('document'), uploadClientDocumentController);
router.delete('/:clientId/document/:docId', auth, deleteClientDocumentController);
router.get('/all', auth, getAllClientsController);
router.get('/stats', auth, getClientStatsController);
router.get('/:clientId', auth, getClientByIdController);
router.put('/:clientId', auth, updateClientController);
router.delete('/:clientId', auth, admin, deleteClientController);
router.patch('/:clientId/assign', auth, admin, assignClientController);
router.put('/:clientId/validate', auth, validateClientController);

router.post('/:clientId/e-waste-compliance', auth, saveEWasteComplianceController);
router.get('/:clientId/e-waste-compliance', auth, getEWasteComplianceController);

export default router;
