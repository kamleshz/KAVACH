import mongoose from 'mongoose';
import { changeHistorySchema } from './productCompliance.model.js';

const productComplianceHistorySchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, enum: ['CTE', 'CTO'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entries: { type: [changeHistorySchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

productComplianceHistorySchema.index(
  { client: 1, type: 1, itemId: 1 },
  { unique: true, name: 'uniq_product_compliance_history_scope' }
);

const ProductComplianceHistoryModel = mongoose.model('ProductComplianceHistory', productComplianceHistorySchema);

export default ProductComplianceHistoryModel;
