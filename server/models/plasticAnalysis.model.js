import mongoose from "mongoose";

const salesRowSchema = new mongoose.Schema({
  dateOfInvoice: { type: String, default: "" },
  invoiceNumber: { type: String, default: "" },
  nameOfEntity: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  state: { type: String, default: "" },
  plasticMaterialType: { type: String, default: "" },
  category: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  skuCode: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  registrationType: { type: String, default: "" },
  plasticCategory: { type: String, default: "" },
  financialYear: { type: String, default: "" },
  totalPlasticQty: { type: mongoose.Schema.Types.Mixed, default: 0 },
  registeredQty: { type: mongoose.Schema.Types.Mixed, default: "" },
  unregisteredQty: { type: mongoose.Schema.Types.Mixed, default: "" },
  entityType: { type: String, default: "" },
  entityName: { type: String, default: "" },
  gst: { type: String, default: "" },
  recycledPlasticPercent: { type: mongoose.Schema.Types.Mixed, default: "" },
  recycledPlasticQty: { type: mongoose.Schema.Types.Mixed, default: "" },
  preConsumerQty: { type: mongoose.Schema.Types.Mixed, default: "" }
}, { _id: false, strict: false });

const purchaseRowSchema = new mongoose.Schema({
  dateOfInvoice: { type: String, default: "" },
  invoiceNumber: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  state: { type: String, default: "" },
  plasticMaterialType: { type: String, default: "" },
  category: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  skuCode: { type: String, default: "" },
  registrationType: { type: String, default: "" },
  plasticCategory: { type: String, default: "" },
  financialYear: { type: String, default: "" },
  totalPlasticQty: { type: mongoose.Schema.Types.Mixed, default: 0 },
  registeredQty: { type: mongoose.Schema.Types.Mixed, default: "" },
  unregisteredQty: { type: mongoose.Schema.Types.Mixed, default: "" },
  entityType: { type: String, default: "" },
  entityName: { type: String, default: "" },
  gst: { type: String, default: "" }
}, { _id: false, strict: false });

const plasticAnalysisSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, required: true }, // e.g., 'CTO' or 'CTE'
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, // e.g., Plant ID
  summary: { type: Object, default: {} },
  rows: { type: Array, default: [] },
  salesSummary: { type: Array, default: [] },
  salesRows: { type: [salesRowSchema], default: [] },
  preConsumerRows: { type: [salesRowSchema], default: [] },
  salesTargetTables: { type: Array, default: [] },
  purchaseSummary: { type: Array, default: [] },
  purchaseRows: { type: [purchaseRowSchema], default: [] },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Create compound index for fast lookups
plasticAnalysisSchema.index({ client: 1, type: 1, itemId: 1 }, { unique: true });

const PlasticAnalysisModel = mongoose.model("PlasticAnalysis", plasticAnalysisSchema);

export default PlasticAnalysisModel;
