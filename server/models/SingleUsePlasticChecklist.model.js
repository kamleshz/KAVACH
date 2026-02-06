import mongoose from "mongoose";

const RowSchema = new mongoose.Schema({
    id: { type: Number },
    areaName: { type: String, default: "" },
    bannedItem: { type: String, default: "" },
    found: { type: String, enum: ['Yes', 'No', ''], default: "" },
    qty: { type: String, default: "" },
    remarks: { type: String, default: "" },
    photoRef: { type: String, default: "" },
    checkedBy: { type: String, default: "" },
    date: { type: String, default: null },
    isCustomItem: { type: Boolean, default: false },
    // New fields for Compostable details
    materialType: { type: String, default: "" },
    cpcbCertAvailable: { type: String, default: "" },
    companyName: { type: String, default: "" },
    eprRegNum: { type: String, default: "" },
    certNum: { type: String, default: "" },
    certScopeMatch: { type: String, default: "" },
    properMarking: { type: String, default: "" },
    // New fields for Misrepresentation details
    misrepresentationDetails: { type: String, default: "" } // Yes/No for Details column
});

const SingleUsePlasticChecklistSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    type: {
        type: String,
        enum: ['CTE', 'CTO'],
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    rows: [RowSchema], // Deprecated but kept for compatibility
    // New separate arrays for better organization
    supItems: [RowSchema], // Will store Tab 1 items
    compostableItems: [RowSchema], // Will store Tab 2 items
    misrepresentationItems: [RowSchema], // Will store Tab 3 items
    awarenessItems: [RowSchema] // Will store Tab 4 items
}, {
    timestamps: true
});

const SingleUsePlasticChecklistModel = mongoose.model("SingleUsePlasticChecklist", SingleUsePlasticChecklistSchema);

export default SingleUsePlasticChecklistModel;
