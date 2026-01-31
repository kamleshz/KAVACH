
import mongoose from 'mongoose';
import ClientModel from './models/client.model.js';
import dotenv from 'dotenv';

dotenv.config();

const testSave = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI.replace('localhost', '127.0.0.1'));
        console.log('Connected to DB');

        const dummyClient = {
            clientName: "Test Client " + Date.now(),
            entityType: "Producer",
            createdBy: new mongoose.Types.ObjectId(), // Fake ID
            productionFacility: {
                cteProduction: [
                    { plantName: "Plant A", productName: "Prod A", maxCapacityPerYear: "100" }
                ],
                ctoProducts: [
                    { plantName: "Plant B", productName: "Prod B", quantity: "200" }
                ]
            }
        };

        const client = new ClientModel(dummyClient);
        const saved = await client.save();
        
        console.log('Saved Client:', JSON.stringify(saved, null, 2));
        
        if (saved.productionFacility.cteProduction.length > 0 && saved.productionFacility.ctoProducts.length > 0) {
            console.log('SUCCESS: Arrays saved.');
        } else {
            console.log('FAILURE: Arrays missing.');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

testSave();
