import mongoose from 'mongoose';
import { supplierCtoCheckRowSchema } from './productCompliance.model.js';

const supplierCtoCheckSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, enum: ['CTE', 'CTO'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    plantName: { type: String, default: '' },
    rows: { type: [supplierCtoCheckRowSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

supplierCtoCheckSchema.index(
  { client: 1, type: 1, itemId: 1 },
  { unique: true, name: 'uniq_supplier_cto_scope' }
);

const SupplierCtoCheckModel = mongoose.model('SupplierCtoCheck', supplierCtoCheckSchema);

export default SupplierCtoCheckModel;
