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

const eWasteStorageRowSchema = new mongoose.Schema({
    storageDetails: { type: String, default: "" },
    status: { type: String, default: "" }, // Yes/No
    uploadPhoto: { type: String, default: "" }, // URL
    remarks: { type: String, default: "" }
}, { _id: true });

const eWasteStorageAuditRowSchema = new mongoose.Schema({
    eeeCode: { type: String, default: "" },
    productName: { type: String, default: "" },
    listEEE: { type: String, default: "" },
    dateOfStorage: { type: String, default: "" },
    endDate: { type: String, default: "" },
    difference: { type: String, default: "" },
    quantity: { type: String, default: "" }, // In MT
    remarks: { type: String, default: "" }
}, { _id: true });

const eWasteAwarenessRowSchema = new mongoose.Schema({
    particulars: { type: String, default: "" },
    status: { type: String, default: "" }, // Yes/No
    details: { type: String, default: "" } // Details if Yes
}, { _id: true });

const eWasteAwarenessDetailRowSchema = new mongoose.Schema({
    seminarDetails: { type: String, default: "" }, // max 20000 chars
    targetAudience: { type: String, default: "" },
    frequency: { type: String, default: "" },
    awarenessDocuments: { type: String, default: "" },
    documentUpload: { type: String, default: "" }
}, { _id: true });

const eWasteComplianceSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        unique: true // One compliance document per client
    },
    categoriesCompliance: [eWasteCategoryRowSchema],
    rohsCompliance: [eWasteROHSRowSchema],
    storageCompliance: [eWasteStorageRowSchema],
    additionalEEECompliance: [eWasteStorageRowSchema],
    storageAudit: [eWasteStorageAuditRowSchema],
    awarenessPrograms: [eWasteAwarenessRowSchema],
    awarenessDetails: [eWasteAwarenessDetailRowSchema]
}, { timestamps: true });

export const EWasteCompliance = mongoose.model("EWasteCompliance", eWasteComplianceSchema);
