import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ClientModel from './models/client.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const res = await ClientModel.updateMany(
      {},
      { $unset: { complianceContact: "", msmeContact: "" } }
    );
    console.log(`Unset contacts on ${res.modifiedCount} client documents`);
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Done.');
    process.exit(0);
  }
}

run();
