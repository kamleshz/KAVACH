import mongoose from 'mongoose';

const cteCtoSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, enum: ['CTE', 'CTO'], required: true },
  consentNumber: { type: String, required: true },
  issueDate: { type: Date, required: true },
  validityDate: { type: Date, required: true },
  location: { type: String },
  capacity: { type: String },
  industryCategory: { type: String },
  waterUsage: { type: String },
  groundwaterPermission: { type: String },
  capitalInvestment: { type: Number },
  documents: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CteCtoModel = mongoose.model('CteCto', cteCtoSchema);
export default CteCtoModel;
