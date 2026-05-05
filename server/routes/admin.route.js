import express from 'express';
import UserModel from '../models/user.model.js';
import ClientModel from '../models/client.model.js';
import RoleModel from '../models/role.model.js';
import { auth, admin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();
const makeAdminSchema = z.object({
    email: z.string().email()
});

router.post('/make-admin', auth, admin, validate(makeAdminSchema), async (req, res) => {
    try {
        const { email } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        const role = await RoleModel.findOne({ name: 'ADMIN' });
        if (!role) {
            return res.status(500).json({
                message: "Admin role not found",
                error: true,
                success: false
            });
        }

        user.role = role._id;
        await user.save();

        return res.status(200).json({
            message: `Successfully updated ${email} to ADMIN role`,
            error: false,
            success: true,
            data: {
                email: user.email,
                role: role.name
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
});

router.post('/migrate-clients', auth, admin, async (req, res) => {
    try {
        // Update clients without approval status
        const result1 = await ClientModel.updateMany(
            { approvalStatus: { $exists: false } },
            { 
                $set: { 
                    approvalStatus: 'Pending Approval',
                    approvedBy: null,
                    approvedAt: null,
                    rejectionReason: ''
                } 
            }
        );

        // Update approved clients to have correct workflow status
        const result2 = await ClientModel.updateMany(
            { approvalStatus: 'Approved', status: 'Pending' },
            { 
                $set: { 
                    status: 'In Progress'
                } 
            }
        );

        // Update rejected clients to have correct workflow status
        const result3 = await ClientModel.updateMany(
            { approvalStatus: 'Rejected', status: { $ne: 'On Hold' } },
            { 
                $set: { 
                    status: 'On Hold'
                } 
            }
        );

        return res.status(200).json({
            message: `Successfully updated ${result1.modifiedCount + result2.modifiedCount + result3.modifiedCount} clients`,
            error: false,
            success: true,
            data: {
                newApprovalStatus: result1.modifiedCount,
                approvedToInProgress: result2.modifiedCount,
                rejectedToOnHold: result3.modifiedCount
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
});

export default router;
