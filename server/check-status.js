
import mongoose from 'mongoose';
import ClientModel from './models/client.model.js';
import dotenv from 'dotenv';

dotenv.config();

const checkClients = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI.replace('localhost', '127.0.0.1'));
        console.log('Connected to DB');

        const clients = await ClientModel.find({}, 'clientName validationStatus');
        console.log('Clients and their statuses:');
        clients.forEach(c => {
            console.log(`${c.clientName}: ${c.validationStatus}`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

checkClients();
