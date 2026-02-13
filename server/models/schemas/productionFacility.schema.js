import mongoose from "mongoose";

const productionFacilitySchema = new mongoose.Schema({
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
            supplierType: { type: String, default: "" },
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
        }],
        productRecycledQuantity: [{
            systemCode: { type: String, default: "" },
            componentCode: { type: String, default: "" },
            componentDescription: { type: String, default: "" },
            supplierName: { type: String, default: "" },
            category: { type: String, default: "" },
            annualConsumption: { type: Number, default: 0 },
            uom: { type: String, default: "" },
            perPieceWeight: { type: Number, default: 0 },
            annualConsumptionMt: { type: Number, default: 0 },
            usedRecycledPercent: { type: Number, default: 0 },
            usedRecycledQtyMt: { type: Number, default: 0 }
        }]
    }],
    cteProduction: [{
        plantName: { type: String, default: "" },
        productName: { type: String, required: true },
        maxCapacityPerYear: { type: String, required: true },
        uom: { type: String, default: "" },
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
        }
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
        }],
        productRecycledQuantity: [{
            systemCode: { type: String, default: "" },
            componentCode: { type: String, default: "" },
            componentDescription: { type: String, default: "" },
            supplierName: { type: String, default: "" },
            category: { type: String, default: "" },
            annualConsumption: { type: Number, default: 0 },
            uom: { type: String, default: "" },
            perPieceWeight: { type: Number, default: 0 },
            annualConsumptionMt: { type: Number, default: 0 },
            usedRecycledPercent: { type: Number, default: 0 },
            usedRecycledQtyMt: { type: Number, default: 0 }
        }]
    }],
    ctoProducts: [{
        plantName: { type: String, default: "" },
        productName: { type: String, required: true },
        quantity: { type: String, required: true },
        uom: { type: String, default: "" },
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
        }
    }]
});

export default productionFacilitySchema;
