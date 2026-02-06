import express from 'express';
import { analyzeTableController } from '../controllers/ai.controller.js';
import { auth } from '../middleware/auth.js';

const aiRouter = express.Router();

// Protect with auth middleware if needed, or leave public for dev
aiRouter.post('/analyze-table', auth, analyzeTableController);

export default aiRouter;
