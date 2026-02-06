import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import UserModel from './models/user.model.js';
import RoleModel from './models/role.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const makeAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'it_admin@ananttattva.com';
        
        const user = await UserModel.findOne({ email }).populate('role');
        
        if (!user) {
            console.log(`User with email ${email} not found. Please register first.`);
            process.exit(1);
        }

        const adminRole = await RoleModel.findOne({ name: 'ADMIN' });
        if (!adminRole) {
             console.log('Admin role not found in database.');
             process.exit(1);
        }

        if (user.role && user.role.name === 'ADMIN') {
            console.log(`${email} is already an Admin`);
            process.exit(0);
        }

        user.role = adminRole._id;
        await user.save();

        console.log(`Successfully updated ${email} to Admin role`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

makeAdmin();
