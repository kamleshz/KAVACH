import { eWasteService } from "../services/eWaste.service.js";
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

    const complianceDoc = await eWasteService.saveCategoriesCompliance(clientId, rows);

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

    const complianceDoc = await eWasteService.saveROHSCompliance(clientId, rows);

    return res.status(200).json({
        success: true,
        message: "ROHS compliance data saved successfully",
        data: complianceDoc
    });
});

export const saveEWasteStorageComplianceController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { rows, auditRows, additionalRows } = req.body;

    if (!rows && !auditRows && !additionalRows) {
        return res.status(400).json({
            success: false,
            message: "No data provided to save."
        });
    }

    const complianceDoc = await eWasteService.saveStorageCompliance(clientId, { rows, auditRows, additionalRows });

    return res.status(200).json({
        success: true,
        message: "Storage compliance data saved successfully",
        data: complianceDoc
    });
});

export const saveEWasteAwarenessController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { rows, detailRows } = req.body;

    if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({
            success: false,
            message: "Invalid data format. 'rows' must be an array."
        });
    }

    const complianceDoc = await eWasteService.saveAwarenessCompliance(clientId, { rows, detailRows });

    return res.status(200).json({
        success: true,
        message: "Awareness programs data saved successfully",
        data: complianceDoc
    });
});

export const uploadEWasteStorageImageController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No image file uploaded"
        });
    }

    try {
        const filenameOverride = `ewaste_storage_${clientId}_${Date.now()}`;
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

export const getEWasteComplianceController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const complianceDoc = await eWasteService.getCompliance(clientId);

    if (!complianceDoc) {
        return res.status(200).json({
            success: true,
            data: { 
                rows: [],
                rohsRows: [],
                storageRows: [],
                additionalRows: [],
                storageAuditRows: [],
                awarenessRows: [],
                awarenessDetailRows: []
            }
        });
    }

    return res.status(200).json({
        success: true,
        data: { 
            rows: complianceDoc.categoriesCompliance || [],
            rohsRows: complianceDoc.rohsCompliance || [],
            storageRows: complianceDoc.storageCompliance || [],
            additionalRows: complianceDoc.additionalEEECompliance || [],
            storageAuditRows: complianceDoc.storageAudit || [],
            awarenessRows: complianceDoc.awarenessPrograms || [],
            awarenessDetailRows: complianceDoc.awarenessDetails || []
        }
    });
});
