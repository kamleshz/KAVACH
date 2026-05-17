import express from 'express';
import { getAllUsersController, createUserController, unlockUserController, getLoginActivityController, updateUserRoleController, getAllRolesController, updateUserStatusController } from '../controllers/user.controller.js';
import { auth, admin, superAdmin } from '../middleware/auth.js';
import { paginationMiddleware } from '../middleware/pagination.middleware.js';

const router = express.Router();

router.post('/create', auth, superAdmin, createUserController);
router.get('/all', auth, admin, paginationMiddleware(), getAllUsersController);
router.get('/roles', auth, admin, getAllRolesController);
router.get('/login-activity', auth, admin, getLoginActivityController);
router.patch('/:userId/unlock', auth, superAdmin, unlockUserController);
router.patch('/:userId/role', auth, superAdmin, updateUserRoleController);
router.patch('/:userId/status', auth, superAdmin, updateUserStatusController);

export default router;
