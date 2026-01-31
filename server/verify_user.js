import mongoose from 'mongoose';
import UserModel from './models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.replace('localhost', '127.0.0.1') : "";

const verifyUser = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(uri, {
             family: 4
        });
        console.log("Connected.");
        const user = await UserModel.findOne({ email: 'testnew3@example.com' });
        if (user) {
            user.verify_email = true;
            await user.save();
            console.log('User verified');
        } else {
            console.log('User not found');
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

verifyUser();