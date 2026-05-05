import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import CteCtoController from '../controllers/ctecto.controller.js';

const router = express.Router();

router.get('/client/:clientId/cte-cto', auth, CteCtoController.getByClient);
router.post('/client/:clientId/cte-cto', auth, CteCtoController.create);
router.put('/cte-cto/:id', auth, CteCtoController.update);
router.delete('/cte-cto/:id', auth, CteCtoController.delete);

export default router;
