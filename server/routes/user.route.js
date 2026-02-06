import express from 'express';
import { getAllUsersController, createUserController, unlockUserController, getLoginActivityController, updateUserRoleController, getAllRolesController, updateUserStatusController } from '../controllers/user.controller.js';
import { auth, admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', auth, admin, createUserController);
router.get('/all', auth, admin, getAllUsersController);
router.get('/roles', auth, admin, getAllRolesController);
router.get('/login-activity', auth, admin, getLoginActivityController);
router.patch('/:userId/unlock', auth, admin, unlockUserController);
router.patch('/:userId/role', auth, admin, updateUserRoleController);
router.patch('/:userId/status', auth, admin, updateUserStatusController);

export default router;
