import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        required: true,
        enum: [
            'PAN',
            'GST',
            'CIN',
            'Udyam',
            'CTO',
            'CTE',
            'CGWA',
            'Registration Certificate',
            'Factory License',
            'EPR Certificate',
            'IEC Certificate',
            'DIC/DCSSI Certificate',
            'Engagement Letter',
            'Signed Document',
            'Other'
        ]
    },
    documentName: {
        type: String,
        required: true
    },
    certificateNumber: {
        type: String,
        default: ""
    },
    certificateDate: {
        type: Date,
        default: null
    },
    filePath: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const pwpSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, "Client name is required"]
    },
    tradeName: {
        type: String,
        default: ""
    },
    companyGroupName: {
        type: String,
        default: ""
    },
    financialYear: {
        type: String,
        default: ""
    },
    entityType: {
        type: String,
        required: [true, "Entity type is required"],
        enum: ['Producer', 'Brand Owner', 'Importer', 'PWP', 'Producer & Brand Owner']
    },
    category: {
        type: String,
        enum: ['PIBO', 'PWP'],
        default: 'PWP'
    },
    registrationStatus: {
        type: String,
        enum: ['Registered', 'Unregistered'],
        default: 'Registered'
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
        email: { type: String, default: "" }
    },
    coordinatingPerson: {
        name: { type: String, default: "" },
        number: { type: String, default: "" },
        email: { type: String, default: "" }
    },
    msmeDetails: [{
        classificationYear: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Small', 'Medium', 'Large'],
            required: true
        },
        majorActivity: {
            type: String,
            enum: ['Manufacturing', 'Trading', 'Service'],
            required: true
        },
        udyamNumber: {
            type: String,
            required: true
        },
        turnover: {
            type: String,
            required: true
        },
        certificateFile: {
            type: String,
            default: ""
        }
    }],
    productionFacility: {
        facilityName: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        },
        address: {
            type: String,
            default: ""
        },
        plantLocationNumber: {
            type: String,
            default: ""
        },
        totalCapitalInvestmentLakhs: {
            type: Number,
            default: 0
        },
        groundWaterUsage: {
            type: String,
            enum: ['', 'Yes', 'No'],
            default: ""
        },
        cgwaNocRequirement: {
            type: String,
            enum: ['', 'Applicable', 'Not Applicable'],
            default: ""
        },
        cgwaNocDocument: {
            type: String,
            default: ""
        },
        regulationsCoveredUnderCto: {
            type: [String],
            default: []
        },
        waterRegulations: [{
            description: { type: String, default: "" },
            permittedQuantity: { type: String, default: "" },
            uom: { type: String, default: "" }
        }],
        airRegulations: [{
            parameter: { type: String, default: "" },
            permittedLimit: { type: String, default: "" },
            uom: { type: String, default: "" }
        }],
        hazardousWasteRegulations: [{
            nameOfHazardousWaste: { type: String, default: "" },
            facilityModeOfDisposal: { type: String, default: "" },
            quantityMtYr: { type: String, default: "" },
            uom: { type: String, default: "" }
        }],
        cteDetailsList: [{
            plantName: { type: String, default: "" },
            consentNo: { type: String, default: "" },
            category: { type: String, default: "" },
            issuedDate: { type: Date, default: null },
            validUpto: { type: Date, default: null },
            plantLocation: { type: String, default: "" },
            plantAddress: { type: String, default: "" },
            factoryHeadName: { type: String, default: "" },
            factoryHeadDesignation: { type: String, default: "" },
            factoryHeadMobile: { type: String, default: "" },
            factoryHeadEmail: { type: String, default: "" },
            contactPersonName: { type: String, default: "" },
            contactPersonDesignation: { type: String, default: "" },
            contactPersonMobile: { type: String, default: "" },
            contactPersonEmail: { type: String, default: "" },
            documentFile: { type: String, default: "" },
            verification: {
                status: {
                    type: String,
                    enum: ['Pending', 'Verified', 'Rejected'],
                    default: 'Pending'
                },
                verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                verifiedAt: { type: Date, default: null },
                document: { type: String, default: "" },
                remark: { type: String, default: "" }
            },
            completedSteps: { type: [String], default: [] },
            productComplianceRows: [{
                generate: { type: String, default: "No" },
                systemCode: { type: String, default: "" },
                packagingType: { type: String, default: "" },
                skuCode: { type: String, default: "" },
                skuDescription: { type: String, default: "" },
                skuUom: { type: String, default: "" },
                productImage: { type: String, default: "" },
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                supplierName: { type: String, default: "" },
                generateSupplierCode: { type: String, default: "No" },
                supplierCode: { type: String, default: "" },
                componentImage: { type: String, default: "" }
            }],
            productComponentDetails: [{
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                polymerType: { type: String, default: "" },
                componentPolymer: { type: String, default: "" },
                category: { type: String, default: "" },
                containerCapacity: { type: String, default: "" },
                foodGrade: { type: String, default: "" },
                layerType: { type: String, default: "" },
                thickness: { type: String, default: "" },
                supplierName: { type: String, default: "" }
            }],
            productSupplierCompliance: [{
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                supplierName: { type: String, default: "" },
                supplierStatus: { type: String, default: "" },
                foodGrade: { type: String, default: "" },
                eprCertificateNumber: { type: String, default: "" },
                fssaiLicNo: { type: String, default: "" }
            }]
        }],
        cteProduction: [{
            plantName: { type: String, default: "" },
            productName: { type: String, required: true },
            maxCapacityPerYear: { type: String, required: true },
            uom: { type: String, default: "" }
        }],
        ctoDetailsList: [{
            ctoCaaType: { type: String, enum: ['', 'Fresh', 'Renew', 'Amended'], default: "" },
            plantName: { type: String, default: "" },
            industryType: { type: String, enum: ['', 'Small', 'Micro', 'Medium', 'Large', 'Not Mentiond'], default: "" },
            category: { type: String, default: "" },
            consentOrderNo: { type: String, default: "" },
            dateOfIssue: { type: Date, default: null },
            validUpto: { type: Date, default: null },
            plantLocation: { type: String, default: "" },
            plantAddress: { type: String, default: "" },
            factoryHeadName: { type: String, default: "" },
            factoryHeadDesignation: { type: String, default: "" },
            factoryHeadMobile: { type: String, default: "" },
            factoryHeadEmail: { type: String, default: "" },
            contactPersonName: { type: String, default: "" },
            contactPersonDesignation: { type: String, default: "" },
            contactPersonMobile: { type: String, default: "" },
            contactPersonEmail: { type: String, default: "" },
            documentFile: { type: String, default: "" },
            verification: {
                status: {
                    type: String,
                    enum: ['Pending', 'Verified', 'Rejected'],
                    default: 'Pending'
                },
                verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                verifiedAt: { type: Date, default: null },
                document: { type: String, default: "" },
                remark: { type: String, default: "" }
            },
            completedSteps: { type: [String], default: [] },
            productComplianceRows: [{
                packagingType: { type: String, default: "" },
                skuCode: { type: String, default: "" },
                skuDescription: { type: String, default: "" },
                skuUom: { type: String, default: "" },
                productImage: { type: String, default: "" },
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                componentImage: { type: String, default: "" }
            }],
            productComponentDetails: [{
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                polymerType: { type: String, default: "" },
                componentPolymer: { type: String, default: "" },
                category: { type: String, default: "" },
                containerCapacity: { type: String, default: "" },
                foodGrade: { type: String, default: "" },
                layerType: { type: String, default: "" },
                thickness: { type: String, default: "" },
                supplierName: { type: String, default: "" }
            }],
            productSupplierCompliance: [{
                componentCode: { type: String, default: "" },
                componentDescription: { type: String, default: "" },
                supplierName: { type: String, default: "" },
                supplierStatus: { type: String, default: "" },
                foodGrade: { type: String, default: "" },
                eprCertificateNumber: { type: String, default: "" },
                fssaiLicNo: { type: String, default: "" }
            }]
        }],
        ctoProducts: [{
            plantName: { type: String, default: "" },
            productName: { type: String, required: true },
            quantity: { type: String, required: true },
            uom: { type: String, default: "" }
        }]
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
        verificationProgress: { type: Map, of: Boolean, default: {} }
    }
}, {
    timestamps: true
});

const PWPModel = mongoose.model("PWP", pwpSchema);

export default PWPModel;
