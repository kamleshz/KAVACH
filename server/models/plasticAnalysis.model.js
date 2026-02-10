import mongoose from "mongoose";

const plasticAnalysisSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, required: true }, // e.g., 'CTO' or 'CTE'
  itemId: { type: String, required: true }, // e.g., Plant ID
  summary: { type: Object, default: {} },
  rows: { type: Array, default: [] },
  salesSummary: { type: Array, default: [] },
  salesRows: { type: Array, default: [] },
  purchaseSummary: { type: Array, default: [] },
  purchaseRows: { type: Array, default: [] },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Create compound index for fast lookups
plasticAnalysisSchema.index({ client: 1, type: 1, itemId: 1 }, { unique: true });

const PlasticAnalysisModel = mongoose.model("PlasticAnalysis", plasticAnalysisSchema);

export default PlasticAnalysisModel;
