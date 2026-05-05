import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import MsmeController from '../controllers/msme.controller.js';

const router = express.Router();

router.get('/client/:clientId/msme', auth, MsmeController.getByClient);
router.post('/client/:clientId/msme', auth, MsmeController.create);
router.put('/msme/:id', auth, MsmeController.update);

export default router;
