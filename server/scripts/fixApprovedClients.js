import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ClientModel from '../models/client.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixApprovedClients = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Fix all approved clients to have In Progress status
        const result = await ClientModel.updateMany(
            { approvalStatus: 'Approved' },
            { $set: { status: 'In Progress' } }
        );

        console.log(`Updated ${result.modifiedCount} approved clients to "In Progress" status`);

        // Fix all rejected clients to have On Hold status
        const result2 = await ClientModel.updateMany(
            { approvalStatus: 'Rejected' },
            { $set: { status: 'On Hold' } }
        );

        console.log(`Updated ${result2.modifiedCount} rejected clients to "On Hold" status`);
        
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

fixApprovedClients();
