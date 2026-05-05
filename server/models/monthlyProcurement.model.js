import mongoose from 'mongoose';
import { procurementSchema } from './productCompliance.model.js';

const monthlyProcurementSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, enum: ['CTE', 'CTO'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    plantName: { type: String, default: '' },
    rows: { type: [procurementSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

monthlyProcurementSchema.index(
  { client: 1, type: 1, itemId: 1 },
  { unique: true, name: 'uniq_monthly_procurement_scope' }
);

monthlyProcurementSchema.index({ client: 1, createdAt: -1 }, { name: 'idx_monthly_procurement_client_created_at' });

const MonthlyProcurementModel = mongoose.model('MonthlyProcurement', monthlyProcurementSchema);

export default MonthlyProcurementModel;
