import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import CostAnalysisController from '../controllers/costAnalysis.controller.js';

const router = express.Router();

router.get('/client/:clientId/cost-analysis', auth, CostAnalysisController.getByClient);
router.post('/client/:clientId/cost-analysis', auth, CostAnalysisController.create);
router.put('/cost-analysis/:id', auth, CostAnalysisController.update);

export default router;
