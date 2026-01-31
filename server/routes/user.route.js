import express from 'express';
import { getAllUsersController, unlockUserController, getLoginActivityController, updateUserRoleController, getAllRolesController } from '../controllers/user.controller.js';
import { auth, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/all', auth, admin, getAllUsersController);
router.get('/roles', auth, admin, getAllRolesController);
router.get('/login-activity', auth, admin, getLoginActivityController);
router.patch('/:userId/unlock', auth, admin, unlockUserController);
router.patch('/:userId/role', auth, admin, updateUserRoleController);

export default router;
