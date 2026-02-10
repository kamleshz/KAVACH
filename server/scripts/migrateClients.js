import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ClientModel from '../models/client.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrateClients = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await ClientModel.updateMany(
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

        console.log(`Updated ${result.modifiedCount} clients with approval status`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

migrateClients();
