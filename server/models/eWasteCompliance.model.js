import mongoose from "mongoose";

const eWasteCategoryRowSchema = new mongoose.Schema({
    categoryCode: { type: String, default: "" },
    productName: { type: String, default: "" },
    productImage: { type: String, default: "" },
    categoryEEE: { type: String, default: "" },
    eeeCode: { type: String, default: "" },
    listEEE: { type: String, default: "" },
    avgLife: { type: String, default: "" },
    salesDate: { type: String, default: "" },
    tentativeEndLife: { type: String, default: "" },
    quantity: { type: String, default: "" }
}, { _id: true }); // Keep _id for React keys

const eWasteROHSRowSchema = new mongoose.Schema({
    eeeCode: { type: String, default: "" },
    productName: { type: String, default: "" },
    listEEE: { type: String, default: "" },
    substance: { type: String, default: "" },
    symbol: { type: String, default: "" },
    maxLimit: { type: String, default: "" },
    actualPercentage: { type: String, default: "" },
    isCompliant: { type: String, default: "" }
}, { _id: true });

const eWasteComplianceSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        unique: true // One compliance document per client
    },
    categoriesCompliance: [eWasteCategoryRowSchema],
    rohsCompliance: [eWasteROHSRowSchema]
}, { timestamps: true });

export const EWasteCompliance = mongoose.model("EWasteCompliance", eWasteComplianceSchema);
