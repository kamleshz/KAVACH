import express from 'express';
import { analyzePlasticPrePost, getPlasticAnalysisController, saveSalesAnalysisController, getSalesAnalysisController, savePurchaseAnalysisController, getPurchaseAnalysisController } from '../controllers/analysis.controller.js';
import { upload } from '../middleware/upload.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Route to analyze Plastic Pre/Post Consumer Data
// Uses 'auth' middleware to ensure user is logged in
// Uses 'upload' middleware to handle file uploads
router.post(
    '/plastic-prepost', 
    auth, 
    upload.fields([
        { name: 'salesFile', maxCount: 1 }, 
        { name: 'purchaseFile', maxCount: 1 }
    ]), 
    analyzePlasticPrePost
);

// Route to get saved Plastic Pre/Post Analysis Data
router.get(
    '/plastic-prepost/:clientId',
    auth,
    getPlasticAnalysisController
);

// Route to save Sales Analysis Data
router.post('/sales-analysis', auth, saveSalesAnalysisController);

// Route to get saved Sales Analysis Data
router.get('/sales-analysis/:clientId', auth, getSalesAnalysisController);

// Route to save Purchase Analysis Data
router.post('/purchase-analysis', auth, savePurchaseAnalysisController);

// Route to get saved Purchase Analysis Data
router.get('/purchase-analysis/:clientId', auth, getPurchaseAnalysisController);

export default router;
