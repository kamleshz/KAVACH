import mongoose from "mongoose";

const skuComplianceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  skuCode: { type: String, required: true },
  skuDescription: { type: String, default: "" },
  skuUm: { type: String, default: "" },
  productImage: { type: String, default: "" },
  brandOwner: { type: String, default: "" },
  eprCertBrandOwner: { type: String, default: "" },
  eprCertProducer: { type: String, default: "" },
  thicknessMentioned: { type: String, default: "" },
  polymerUsed: [{ type: String }],
  polymerMentioned: { type: String, default: "" },
  recycledPercent: { type: String, default: "" },
  complianceStatus: { type: String, default: "" },
  markingImage: [{ type: String }], 
  compostableRegNo: { type: String, default: "" },
  remarks: [{ type: String }],
  complianceRemarks: [{ type: String }],
}, { timestamps: true });

skuComplianceSchema.index({ client: 1, skuCode: 1 });

const SkuCompliance = mongoose.model("SkuCompliance", skuComplianceSchema);

export default SkuCompliance;
