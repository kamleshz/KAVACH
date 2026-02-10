import mongoose from "mongoose";

const rowSchema = new mongoose.Schema({
  generate: { type: String, default: "No" },
  systemCode: { type: String, default: "" },
  packagingType: { type: String, default: "" },
  industryCategory: { type: String, default: "" },
  skuCode: { type: String, default: "" },
  skuDescription: { type: String, default: "" },
  skuUom: { type: String, default: "" },
  productImage: { type: String, default: "" },
  componentCode: { type: String, default: "" },
  componentDescription: { type: String, default: "" },
    supplierName: { type: String, default: "" },
    supplierType: { type: String, default: "" },
    supplierCategory: { type: String, default: "" },
    generateSupplierCode: { type: String, default: "No" },
    supplierCode: { type: String, default: "" },
  componentImage: { type: String, default: "" },
  rcPercent: { type: String, default: "" },
  auditorRemarks: { type: String, default: "" },
  clientRemarks: { type: String, default: "" },
  additionalDocument: { type: String, default: "" },
  componentComplianceStatus: { type: String, default: "" },
  productComplianceStatus: { type: String, default: "" },
  productAuditorRemarks: { type: String, default: "" },
  managerRemarks: { type: String, default: "" }
}, { _id: false });

const componentRowSchema = new mongoose.Schema({
  systemCode: { type: String, default: "" },
  skuCode: { type: String, default: "" },
  componentCode: { type: String, default: "" },
  componentDescription: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  polymerType: { type: String, default: "" },
  componentPolymer: { type: String, default: "" },
  polymerCode: { type: Number, default: null },
  category: { type: String, default: "" },
  categoryIIType: { type: String, default: "" },
  containerCapacity: { type: String, default: "" },
  foodGrade: { type: String, default: "" },
  layerType: { type: String, default: "" },
  thickness: { type: String, default: "" }
}, { _id: false });

const supplierComplianceRowSchema = new mongoose.Schema({
  systemCode: { type: String, default: "" },
  componentCode: { type: String, default: "" },
  componentDescription: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  supplierStatus: { type: String, default: "" },
  foodGrade: { type: String, default: "" },
  eprCertificateNumber: { type: String, default: "" },
  fssaiLicNo: { type: String, default: "" }
}, { _id: false });

const skuComplianceRowSchema = new mongoose.Schema({
  skuCode: { type: String, default: "" },
  skuDescription: { type: String, default: "" },
  skuUom: { type: String, default: "" },
  productImage: { type: String, default: "" }
}, { _id: false });

const recycledQuantityRowSchema = new mongoose.Schema({
  systemCode: { type: String, default: "" },
  componentCode: { type: String, default: "" },
  componentDescription: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  category: { type: String, default: "" },
  annualConsumption: { type: Number, default: 0 },
  uom: { type: String, default: "" }, // MT, KG, Units, Roll, Nos
  perPieceWeight: { type: Number, default: 0 }, // in KG
  annualConsumptionMt: { type: Number, default: 0 },
  usedRecycledPercent: { type: Number, default: 0 }, // stored as fraction (0-1)
  usedRecycledQtyMt: { type: Number, default: 0 }
}, { _id: false });

const plasticAnalysisSchema = new mongoose.Schema({
  summary: { type: Object, default: {} },
  rows: { type: Array, default: [] },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const procurementSchema = new mongoose.Schema({
  systemCode: { type: String, default: "" },
  skuCode: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  componentCode: { type: String, default: "" },
  componentDescription: { type: String, default: "" },
  polymerType: { type: String, default: "" },
  componentPolymer: { type: String, default: "" },
  category: { type: String, default: "" },
  dateOfInvoice: { type: String, default: "" },
  monthName: { type: String, default: "" },
  quarter: { type: String, default: "" },
  yearlyQuarter: { type: String, default: "" },
  purchaseQty: { type: Number, default: 0 },
  uom: { type: String, default: "" },
  perPieceWeightKg: { type: Number, default: 0 },
  monthlyPurchaseMt: { type: Number, default: 0 },
  recycledPercent: { type: Number, default: 0 },
  recycledQty: { type: Number, default: 0 },
  recycledRate: { type: Number, default: 0 },
  recycledQrtAmount: { type: Number, default: 0 },
  virginQty: { type: Number, default: 0 },
  virginRate: { type: Number, default: 0 },
  virginQtyAmount: { type: Number, default: 0 },
  rcPercentMentioned: { type: String, default: "" }
}, { _id: false });

const changeHistorySchema = new mongoose.Schema({
  table: { type: String, default: "" },
  row: { type: Number, default: 0 },
  field: { type: String, default: "" },
  prev: { type: String, default: "" },
  curr: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  userName: { type: String, default: "" },
  at: { type: Date, default: Date.now }
}, { _id: false });

const productComplianceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  type: { type: String, enum: ['CTE', 'CTO'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rows: { type: [rowSchema], default: [] },
  skuCompliance: { type: [skuComplianceRowSchema], default: [] },
  componentDetails: { type: [componentRowSchema], default: [] },
  supplierCompliance: { type: [supplierComplianceRowSchema], default: [] },
  recycledQuantityUsed: { type: [recycledQuantityRowSchema], default: [] },
  procurementDetails: { type: [procurementSchema], default: [] },
  plasticAnalysis: { type: plasticAnalysisSchema, default: {} },
  changeHistory: { type: [changeHistorySchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

const ProductComplianceModel = mongoose.model("ProductCompliance", productComplianceSchema);

export default ProductComplianceModel;
