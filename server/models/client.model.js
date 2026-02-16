import mongoose from "mongoose";
import { WASTE_TYPES, ENTITY_TYPES, CLIENT_STATUS, VALIDATION_STATUS } from "../constants.js";
import documentSchema from "./schemas/document.schema.js";
import msmeDetailsSchema from "./schemas/msme.schema.js";
import productionFacilitySchema from "./schemas/productionFacility.schema.js";

const clientSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, "Client name is required"],
        index: true
    },
    tradeName: {
        type: String,
        default: "",
        index: true
    },
    companyGroupName: {
        type: String,
        default: ""
    },
    companyType: {
        type: String,
        default: ""
    },
    financialYear: {
        type: String,
        default: ""
    },
    wasteType: {
        type: String,
        enum: Object.values(WASTE_TYPES),
        default: ""
    },
    entityType: {
        type: String,
        required: [true, "Entity type is required"],
        enum: Object.values(ENTITY_TYPES),
        index: true
    },
    category: {
        type: String,
        enum: ['PIBO', 'PWP'],
        default: 'PIBO',
        index: true
    },
    producerType: {
        type: String,
        default: ""
    },
    subCategoryProducer: {
        type: String,
        default: ""
    },
    isEwasteRegistered: {
        type: String,
        enum: ['Yes', 'No', ''],
        default: ""
    },
    isImportingEEE: {
        type: String,
        enum: ['Yes', 'No', ''],
        default: ""
    },
    companyDetails: {
        pan: {
            type: String,
            default: ""
        },
        cin: {
            type: String,
            default: ""
        },
        gst: {
            type: String,
            default: ""
        },
        udyamRegistration: {
            type: String,
            default: ""
        },
        registeredAddress: {
            type: String,
            default: ""
        }
    },
    registeredOfficeAddress: {
        addressLine1: { type: String, default: "" },
        addressLine2: { type: String, default: "" },
        addressLine3: { type: String, default: "" },
        state: { type: String, default: "" },
        city: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    communicationAddress: {
        addressLine1: { type: String, default: "" },
        addressLine2: { type: String, default: "" },
        addressLine3: { type: String, default: "" },
        state: { type: String, default: "" },
        city: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    authorisedPerson: {
        name: { type: String, default: "" },
        number: { type: String, default: "" },
        email: { type: String, default: "" },
        pan: { type: String, default: "" },
        addressLine1: { type: String, default: "" },
        addressLine2: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        district: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    coordinatingPerson: {
        name: { type: String, default: "" },
        number: { type: String, default: "" },
        email: { type: String, default: "" },
        pan: { type: String, default: "" },
        addressLine1: { type: String, default: "" },
        addressLine2: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        district: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    msmeDetails: [msmeDetailsSchema],
    productionFacility: {
        type: productionFacilitySchema,
        default: () => ({})
    },
    documents: [documentSchema],
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'On Hold'],
        default: 'Pending'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    assignedManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    auditStartDate: {
        type: Date,
        default: null
    },
    auditEndDate: {
        type: Date,
        default: null
    },
    auditExpiryEmailSent: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String,
        default: ""
    },
    validationStatus: {
        type: String,
        enum: ['Pending', 'In Progress', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    validationDetails: {
        engagementLetter: { type: Boolean, default: false },
        engagementLetterContent: { type: String, default: "" },
        basicInfo: { type: Boolean, default: false },
        addressDetails: { type: Boolean, default: false },
        companyDocuments: { type: Boolean, default: false },
        msmeDetails: { type: Boolean, default: false },
        cteDetails: { type: Boolean, default: false },
        ctoDetails: { type: Boolean, default: false },
        remarks: { type: String, default: "" },
        validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        validatedAt: { type: Date, default: null },
        verificationProgress: { type: Map, of: Boolean, default: {} },
        verificationRemarks: { type: Map, of: String, default: {} }
    },
    clientStatus: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'PRE_VALIDATION', 'AUDIT'],
        default: 'DRAFT'
    },
    lastCompletedStep: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const ClientModel = mongoose.model("Client", clientSchema);

export default ClientModel;
