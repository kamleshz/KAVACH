import { EWasteCompliance } from "../models/eWasteCompliance.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import fs from 'fs';

export const uploadEWasteProductImageController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No image file uploaded"
        });
    }

    try {
        const filenameOverride = `ewaste_product_${clientId}_${Date.now()}`;
        const imageUrl = await uploadToCloudinary(req.file.path, 'eprkavach/ewaste_compliance', filenameOverride);
        
        // Cleanup local file
        fs.unlink(req.file.path, () => {});

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: { imageUrl }
        });
    } catch (error) {
        // Cleanup local file if it exists
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        throw error;
    }
});

export const saveEWasteComplianceController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({
            success: false,
            message: "Invalid data format. 'rows' must be an array."
        });
    }

    // Sanitize rows (ensure no unexpected fields, though Mongoose strict mode handles this too)
    // Also strip out File objects if they exist in frontend state, as they can't be saved directly
    const sanitizedRows = rows.map(row => ({
        categoryCode: row.categoryCode || "",
        productName: row.productName || "",
        productImage: row.productImage || "",
        categoryEEE: row.categoryEEE || "",
        eeeCode: row.eeeCode || "",
        listEEE: row.listEEE || "",
        avgLife: row.avgLife || "",
        salesDate: row.salesDate || "",
        tentativeEndLife: row.tentativeEndLife || "",
        quantity: row.quantity || ""
    }));

    let complianceDoc = await EWasteCompliance.findOne({ clientId });

    if (complianceDoc) {
        complianceDoc.categoriesCompliance = sanitizedRows;
    } else {
        complianceDoc = new EWasteCompliance({
            clientId,
            categoriesCompliance: sanitizedRows
        });
    }

    await complianceDoc.save();

    return res.status(200).json({
        success: true,
        message: "E-Waste compliance data saved successfully",
        data: complianceDoc
    });
});

export const saveEWasteROHSComplianceController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({
            success: false,
            message: "Invalid data format. 'rows' must be an array."
        });
    }

    const sanitizedRows = rows.map(row => ({
        eeeCode: row.eeeCode || "",
        productName: row.productName || "",
        listEEE: row.listEEE || "",
        substance: row.substance || "",
        symbol: row.symbol || "",
        maxLimit: row.maxLimit || "",
        actualPercentage: row.actualPercentage || "",
        isCompliant: row.isCompliant || ""
    }));

    let complianceDoc = await EWasteCompliance.findOne({ clientId });

    if (complianceDoc) {
        complianceDoc.rohsCompliance = sanitizedRows;
    } else {
        complianceDoc = new EWasteCompliance({
            clientId,
            rohsCompliance: sanitizedRows
        });
    }

    await complianceDoc.save();

    return res.status(200).json({
        success: true,
        message: "ROHS compliance data saved successfully",
        data: complianceDoc
    });
});

export const getEWasteComplianceController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const complianceDoc = await EWasteCompliance.findOne({ clientId });

    if (!complianceDoc) {
        return res.status(200).json({
            success: true,
            data: { 
                rows: [],
                rohsRows: []
            }
        });
    }

    return res.status(200).json({
        success: true,
        data: { 
            rows: complianceDoc.categoriesCompliance || [],
            rohsRows: complianceDoc.rohsCompliance || []
        }
    });
});
