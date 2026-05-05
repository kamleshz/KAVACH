import mongoose from 'mongoose';

const costAnalysisSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  year: { type: String, required: true },
  categoryCosts: [{
    category: { type: String },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }
  }],
  polymerCosts: [{
    polymer: { type: String },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    type: { type: String, enum: ['Virgin', 'Recycled'] }
  }],
  supplierCosts: [{
    supplier: { type: String },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }
  }],
  virginVsRecycled: {
    virginCost: { type: Number, default: 0 },
    recycledCost: { type: Number, default: 0 },
    virginQty: { type: Number, default: 0 },
    recycledQty: { type: Number, default: 0 }
  },
  recommendations: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CostAnalysisModel = mongoose.model('CostAnalysis', costAnalysisSchema);
export default CostAnalysisModel;
