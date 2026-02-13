import ClientModel from '../models/client.model.js';
import PWPModel from '../models/pwp.model.js';
import ProductComplianceModel from '../models/productCompliance.model.js';
import ProcurementModel from '../models/procurement.model.js';
import SkuComplianceModel from '../models/skuCompliance.model.js';
import UserModel from '../models/user.model.js';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import ClientService from '../services/client.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const uploadClientDocumentController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { documentType, documentName, certificateNumber, certificateDate } = req.body;

        if (!req.file) {
            throw new ApiError(400, "No document file uploaded");
        }

        const result = await ClientService.uploadDocument(clientId, req.file, {
            documentType,
            documentName,
            certificateNumber,
            certificateDate
        });

        return res.status(200).json({
            message: "Document uploaded successfully",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to upload document: " + (error.message || "Unknown error"));
    }
});

export const deleteClientDocumentController = asyncHandler(async (req, res) => {
    try {
        const { clientId, docId } = req.params;

        await ClientService.deleteDocument(clientId, docId);

        return res.status(200).json({
            message: "Document deleted successfully",
            error: false,
            success: true
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to delete document: " + (error.message || "Unknown error"));
    }
});

export const getAllClientsController = asyncHandler(async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).populate('role');
        const isUserAdmin = user?.role?.name === 'ADMIN';
        let query = isUserAdmin ? {} : {
            $or: [
                { assignedTo: req.userId },
                { assignedManager: req.userId }
            ]
        };

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query = {
                ...query,
                $or: [
                    { clientName: searchRegex },
                    { companyGroupName: searchRegex },
                    { entityType: searchRegex }
                ]
            };
        }

        if (req.query.validationStatus) {
            query.validationStatus = req.query.validationStatus;
        }

        const clients = await ClientModel.find(query)
            .populate('assignedTo', 'name email')
            .populate('assignedManager', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        const pwps = await PWPModel.find(query)
            .populate('assignedTo', 'name email')
            .populate('assignedManager', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        const allClients = [...clients, ...pwps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
            message: "Clients fetched successfully",
            error: false,
            success: true,
            data: allClients
        });
    } catch (error) {
        throw new ApiError(500, "Failed to fetch clients: " + (error.message || "Unknown error"));
    }
});

export const createClientController = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const clientData = req.body || {};
    const financialYearRaw = clientData.financialYear ?? clientData.financial_year ?? clientData.financialyear ?? "";
    const normalizedClientData = { ...clientData, financialYear: financialYearRaw ? String(financialYearRaw) : "" };

    const isPWP = normalizedClientData.category === 'PWP' || normalizedClientData.entityType === 'PWP';
    const Model = isPWP ? PWPModel : ClientModel;

    const newClient = new Model({
        ...normalizedClientData,
        createdBy: userId
    });

    try {
        await newClient.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(409, "Client/PWP with this name already exists");
        }
        if (error.name === 'ValidationError') {
            throw new ApiError(400, "Validation Error: " + error.message);
        }
        throw new ApiError(500, "Failed to create client: " + error.message);
    }

    return res.status(201).json({
        message: "Client created successfully",
        error: false,
        success: true,
        data: newClient
    });
});

export const updatePlantProcessProgressController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, completedSteps } = req.body;

        if (!type || !itemId || !completedSteps) {
            throw new ApiError(400, "Missing required fields: type, itemId, completedSteps");
        }

        const client = await ClientService.findClientOrPwp(clientId);

        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const item = client.productionFacility[listKey].id(itemId);

        if (!item) {
            throw new ApiError(404, `${type} detail not found`);
        }

        // Parse steps if string
        let steps = completedSteps;
        if (typeof steps === 'string') {
            try {
                steps = JSON.parse(steps);
            } catch (e) {
                steps = [];
            }
        }
        if (!Array.isArray(steps)) {
            steps = [];
        }

        // Update completed steps
        item.completedSteps = steps;

        await client.save();

        return res.status(200).json({
            message: "Progress updated successfully",
            error: false,
            success: true,
            data: { completedSteps: item.completedSteps }
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to update progress: " + (error.message || "Unknown error"));
    }
});

export const verifyFacilityController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, verificationStatus, verificationRemark, completedSteps } = req.body; // type: 'CTE' or 'CTO'

        // If we are just saving steps, we don't strictly need a file or status.
        // If completedSteps is provided, we skip the strict file check for verificationStatus
        if (!completedSteps && !req.file && verificationStatus !== 'Rejected') {
            throw new ApiError(400, "No verification document uploaded");
        }

        const client = await ClientService.findClientOrPwp(clientId);

        let fileUrl = '';
        if (req.file) {
            try {
                const ext = path.extname(req.file.originalname).toLowerCase();
                const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
                const filenameOverride = `verify_${type}_${itemId}_${Date.now()}`;
                
                fileUrl = await uploadToCloudinary(req.file.path, 'eprkavach/verification', filenameOverride, isDoc);
            } catch (err) {
                throw new ApiError(500, "Cloud upload failed: " + (err.message || 'Unknown error'));
            }
        }

        // Determine target array and find item
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const item = client.productionFacility[listKey].id(itemId);

        if (!item) {
            throw new ApiError(404, `${type} detail not found`);
        }

        // --- HISTORY TRACKING PREPARE ---
        let historyDoc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!historyDoc) {
            historyDoc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [] });
        }
        if (!Array.isArray(historyDoc.changeHistory)) historyDoc.changeHistory = [];

        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };

        const beforeStatus = toText(item.verification?.status);
        const beforeRemark = toText(item.verification?.remark);
        const beforeDoc = toText(item.verification?.document);
        const beforeSteps = Array.isArray(item.completedSteps) ? item.completedSteps.join(', ') : '';
        // --------------------------------

        // Update fields
        if (verificationStatus) {
            item.verification.status = verificationStatus;
            item.verification.verifiedBy = req.userId;
            item.verification.verifiedAt = new Date();
        }
        if (verificationRemark) item.verification.remark = verificationRemark;
        if (fileUrl) item.verification.document = fileUrl;
        
        // Update completedSteps if provided
        if (completedSteps) {
            let steps = completedSteps;
            if (typeof steps === 'string') {
                try {
                    steps = JSON.parse(steps);
                } catch (e) {
                    steps = [];
                }
            }
            if (!Array.isArray(steps)) {
                steps = [];
            }
            item.completedSteps = steps;
        }

        // --- HISTORY TRACKING SAVE ---
        const afterStatus = toText(item.verification?.status);
        const afterRemark = toText(item.verification?.remark);
        const afterDoc = toText(item.verification?.document);
        const afterSteps = Array.isArray(item.completedSteps) ? item.completedSteps.join(', ') : '';

        const changes = [];
        if (beforeStatus !== afterStatus) changes.push({ field: 'Verification Status', prev: beforeStatus, curr: afterStatus });
        if (beforeRemark !== afterRemark) changes.push({ field: 'Verification Remark', prev: beforeRemark, curr: afterRemark });
        if (beforeDoc !== afterDoc) changes.push({ field: 'Verification Document', prev: beforeDoc, curr: afterDoc });
        if (beforeSteps !== afterSteps) changes.push({ field: 'Completed Steps', prev: beforeSteps, curr: afterSteps });

        if (changes.length > 0) {
            const at = new Date();
            changes.forEach(c => {
                historyDoc.changeHistory.push({
                    table: 'Verification',
                    row: 0,
                    field: c.field,
                    prev: c.prev || '-',
                    curr: c.curr || '-',
                    user: req.userId || null,
                    userName: '',
                    at
                });
            });
            if (historyDoc.changeHistory.length > 5000) historyDoc.changeHistory = historyDoc.changeHistory.slice(-5000);
            historyDoc.updatedBy = req.userId;
            await historyDoc.save();
        }
        // -----------------------------

        await client.save();

        return res.status(200).json({
            message: "Verification updated successfully",
            error: false,
            success: true,
            data: client
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to verify facility: " + (error.message || "Unknown error"));
    }
});

export const saveProductComplianceController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        const userId = req.userId;
        const emitter = req.app.get('realtimeEmitter');
        
        const result = await ClientService.saveProductCompliance(
            clientId, 
            type, 
            itemId, 
            rows, 
            rowIndex, 
            row, 
            userId, 
            emitter
        );

        return res.status(200).json({
            message: "Product compliance saved",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to save product compliance: " + (error.message || "Unknown error"));
    }
});

export const getProductComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Product compliance fetched",
            error: false,
            success: true,
            data: doc?.rows || [],
            hasDoc: !!doc
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getAllProductComplianceRowsController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const docs = await ProductComplianceModel.find({ client: clientId });
        
        let allRows = [];
        docs.forEach(doc => {
            if (Array.isArray(doc.rows)) {
                allRows = allRows.concat(doc.rows);
            }
        });

        // Deduplicate by skuCode
        const uniqueRows = [];
        const seenSkus = new Set();
        
        allRows.forEach(row => {
            // Normalize skuCode for comparison (trim)
            const skuCode = (row.skuCode || '').trim();
            if (skuCode && !seenSkus.has(skuCode)) {
                seenSkus.add(skuCode);
                uniqueRows.push(row);
            }
        });

        return res.status(200).json({
            message: "All product compliance rows fetched",
            error: false,
            success: true,
            data: uniqueRows
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const uploadProductComplianceRowController = async (req, res) => {
    try {
        console.log(`[Product Compliance Upload] Request received. ClientID: ${req.params.clientId}, Type: ${req.body.type}, ItemID: ${req.body.itemId}, RowIndex: ${req.body.rowIndex}`);
        
        const { clientId } = req.params;
        const { type, itemId, rowIndex, row } = req.body;
        
        if (!clientId || !type || !itemId || rowIndex === undefined) {
             console.error(`[Product Compliance Upload] Missing required fields: clientId=${clientId}, type=${type}, itemId=${itemId}, rowIndex=${rowIndex}`);
             return res.status(400).json({ message: "Missing required fields", error: true, success: false });
        }

        const clientExists = await ClientService.findClientOrPwp(clientId);
        if (!clientExists) {
             console.error(`[Product Compliance Upload] Client not found: ${clientId}`);
             return res.status(404).json({ message: "Client not found", error: true, success: false });
        }

        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility?.[listKey]?.id(itemId);
        
        // Only check for itemFound if productionFacility exists and listKey is valid
        // Some clients might not have productionFacility structured this way if they are PWP
        // But the original code assumed this structure, so we'll keep it but add safety checks
        if (clientExists.productionFacility && clientExists.productionFacility[listKey] && !itemFound) {
             console.error(`[Product Compliance Upload] Facility Item not found: ${itemId} in ${listKey}`);
             return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }

        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            console.log(`[Product Compliance Upload] Document not found, creating new one for Client: ${clientId}`);
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];

        let single = row;
        if (typeof single === 'string') {
            try { single = JSON.parse(single); } catch (e) { 
                console.error(`[Product Compliance Upload] JSON Parse Error for row:`, e);
                single = {}; 
            }
        }
        const idx = parseInt(rowIndex, 10);
        if (Number.isNaN(idx) || idx < 0) {
             console.error(`[Product Compliance Upload] Invalid Row Index: ${rowIndex}`);
            return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
        }
        
        let productImageUrl = single.productImage || '';
        let componentImageUrl = single.componentImage || '';
        let additionalDocumentUrl = single.additionalDocument || '';
        const productFile = req.files?.productImage?.[0] || null;
        const componentFile = req.files?.componentImage?.[0] || null;
        const additionalDocFile = req.files?.additionalDocument?.[0] || null;

        if (productFile) {
            console.log(`[Product Compliance Upload] Uploading Product Image: ${productFile.originalname}`);
            const ext = path.extname(productFile.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const filenameOverride = `pc_product_${type}_${itemId}_${Date.now()}`;
            productImageUrl = await uploadToCloudinary(productFile.path, 'eprkavach/product_compliance', filenameOverride, isDoc);
        }
        if (componentFile) {
            console.log(`[Product Compliance Upload] Uploading Component Image: ${componentFile.originalname}`);
            const ext = path.extname(componentFile.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const filenameOverride = `pc_component_${type}_${itemId}_${Date.now()}`;
            componentImageUrl = await uploadToCloudinary(componentFile.path, 'eprkavach/product_compliance', filenameOverride, isDoc);
        }
        if (additionalDocFile) {
            console.log(`[Product Compliance Upload] Uploading Additional Doc: ${additionalDocFile.originalname}`);
            const ext = path.extname(additionalDocFile.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'].includes(ext);
            const filenameOverride = `pc_doc_${type}_${itemId}_${Date.now()}`;
            additionalDocumentUrl = await uploadToCloudinary(additionalDocFile.path, 'eprkavach/product_compliance', filenameOverride, isDoc);
        }

        const rowData = {
            generate: single.generate || 'No',
            systemCode: single.systemCode || '',
            packagingType: single.packagingType || '',
            skuCode: single.skuCode || '',
            skuDescription: single.skuDescription || '',
            skuUom: single.skuUom || '',
            productImage: productImageUrl || '',
            componentCode: single.componentCode || '',
            componentDescription: single.componentDescription || '',
            supplierName: single.supplierName || '',
            supplierType: single.supplierType || '',
            supplierCategory: single.supplierCategory || '',
            generateSupplierCode: single.generateSupplierCode || 'No',
            supplierCode: single.supplierCode || '',
            componentImage: componentImageUrl || '',
            thickness: single.thickness || '',
            componentComplianceStatus: single.componentComplianceStatus || single.complianceStatus || '',
            clientRemarks: single.clientRemarks || '',
            additionalDocument: additionalDocumentUrl || ''
        };

        // Check uniqueness of componentCode
        const newCode = (rowData.componentCode || '').trim();
        if (newCode) {
            const isDuplicate = doc.rows.some((r, i) => {
                if (i === idx) return false;
                const otherCode = (r.componentCode || '').trim();
                if (otherCode !== newCode) return false;

                const sameSku = (r.skuCode || '').trim() === (rowData.skuCode || '').trim();
                const sameDesc = (r.componentDescription || '').trim() === (rowData.componentDescription || '').trim();
                return !(sameSku && sameDesc);
            });

            if (isDuplicate) {
                 console.warn(`[Product Compliance Upload] Duplicate Component Code detected: ${newCode}`);
                return res.status(400).json({ message: `Component Code '${newCode}' must be unique (or match existing SKU/Description)`, error: true, success: false });
            }
        }

        // Check uniqueness of supplierCode
        const newSupplierCode = (rowData.supplierCode || '').trim();
        const newSupplierName = (rowData.supplierName || '').trim().toLowerCase();

        if (newSupplierCode) {
            const isSupplierDuplicate = doc.rows.some((r, i) => {
                if (i === idx) return false;
                const otherCode = (r.supplierCode || '').trim();
                if (otherCode !== newSupplierCode) return false;

                // If Code is same, Supplier Name MUST be same
                const otherName = (r.supplierName || '').trim().toLowerCase();
                return otherName !== newSupplierName;
            });

            if (isSupplierDuplicate) {
                return res.status(400).json({ message: `Supplier Code '${newSupplierCode}' must be unique (or reused for the same Supplier)`, error: true, success: false });
            }
        }

        const beforeRow = doc.rows[idx] || {};
        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };
        const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const at = new Date();
        const fields = ['generate', 'systemCode', 'packagingType', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierCategory', 'generateSupplierCode', 'supplierCode', 'componentImage'];

        fields.forEach((field) => {
            const prevVal = toText(beforeRow?.[field]);
            const currVal = toText(rowData[field]);
            if (prevVal !== currVal) {
                doc.changeHistory.push({
                    table: 'Product Compliance',
                    row: idx + 1,
                    field: humanize(field),
                    prev: prevVal || '-',
                    curr: currVal || '-',
                    user: req.userId || null,
                    userName: '',
                    at
                });
            }
        });
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);

        if (idx >= doc.rows.length) {
            doc.rows.push(rowData);
        } else {
            doc.rows[idx] = rowData;
        }
        doc.updatedBy = req.userId;
        await doc.save();

        const emitter = req.app.get('realtimeEmitter');
        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productComplianceUpload'
            });
        }

        return res.status(200).json({
            message: "Row saved",
            error: false,
            success: true,
            data: { index: idx, row: doc.rows[idx] }
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const saveProductComponentDetailsController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        const userId = req.userId;
        const emitter = req.app.get('realtimeEmitter');
        
        const result = await ClientService.saveProductComponentDetails(
            clientId, 
            type, 
            itemId, 
            rows, 
            rowIndex, 
            row, 
            userId, 
            emitter
        );

        return res.status(200).json({
            message: "Component details saved",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to save component details: " + (error.message || "Unknown error"));
    }
});

export const getProductComponentDetailsController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Component details fetched",
            error: false,
            success: true,
            data: doc?.componentDetails || []
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const saveProductSupplierComplianceController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        const userId = req.userId;
        const emitter = req.app.get('realtimeEmitter');

        const result = await ClientService.saveSupplierCompliance(
            clientId, 
            type, 
            itemId, 
            rows, 
            rowIndex, 
            row, 
            userId, 
            emitter
        );

        return res.status(200).json({
            message: "Supplier compliance saved",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to save supplier compliance: " + (error.message || "Unknown error"));
    }
});

export const getProductSupplierComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Supplier compliance fetched",
            error: false,
            success: true,
            data: doc?.supplierCompliance || []
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getProductComplianceHistoryController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId })
            .populate({ path: 'changeHistory.user', select: 'name email' });
        return res.status(200).json({
            message: "Product compliance history fetched",
            error: false,
            success: true,
            data: doc?.changeHistory || []
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const importProductComplianceHistoryController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, entries } = req.body;
        
        const clientExists = await ClientService.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [], componentDetails: [], supplierCompliance: [], recycledQuantityUsed: [], changeHistory: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];
        const incoming = Array.isArray(entries) ? entries : [];
        const sanitized = incoming
            .filter(e => e && typeof e === 'object')
            .map(e => ({
                table: (e.table || '').toString(),
                row: Number(e.row) || 0,
                field: (e.field || '').toString(),
                prev: (e.prev ?? '').toString(),
                curr: (e.curr ?? '').toString(),
                user: req.userId || null,
                userName: (e.user || e.userName || '').toString(),
                at: e.at ? new Date(e.at) : new Date()
            }));
        if (sanitized.length) {
            doc.changeHistory.push(...sanitized);
            if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
            doc.updatedBy = req.userId;
            await doc.save();
        }
        return res.status(200).json({
            message: "Product compliance history imported",
            error: false,
            success: true,
            data: doc.changeHistory
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const saveRecycledQuantityUsedController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        const userId = req.userId;

        const result = await ClientService.saveRecycledQuantityUsed(
            clientId, 
            type, 
            itemId, 
            rows, 
            rowIndex, 
            row, 
            userId
        );

        return res.status(200).json({
            message: "Recycled quantity used saved",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to save recycled quantity: " + (error.message || "Unknown error"));
    }
});

export const getRecycledQuantityUsedController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Recycled quantity used fetched",
            error: false,
            success: true,
            data: doc?.recycledQuantityUsed || []
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const saveMonthlyProcurementController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        const userId = req.userId;

        const result = await ClientService.saveMonthlyProcurement(
            clientId, 
            type, 
            itemId, 
            rows, 
            rowIndex, 
            row, 
            userId
        );

        return res.status(200).json({
            message: "Monthly procurement saved",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to save monthly procurement: " + (error.message || "Unknown error"));
    }
});

export const getMonthlyProcurementController = asyncHandler(async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Monthly procurement fetched",
            error: false,
            success: true,
            data: doc?.procurementDetails || []
        });
    } catch (error) {
        throw new ApiError(500, "Failed to fetch monthly procurement: " + (error.message || "Unknown error"));
    }
});

export const cleanupProductComplianceFieldsController = asyncHandler(async (req, res) => {
    try {
        // Remove deprecated fields from ProductComplianceModel rows
        await ProductComplianceModel.updateMany({}, {
            $unset: {
                'rows.$[].polymerType': 1,
                'rows.$[].category': 1,
                'rows.$[].layerType': 1,
                'rows.$[].supplierStatus': 1,
                'rows.$[].eprRegNumber': 1,
                'rows.$[].polymerCodeOnProduct': 1
            }
        });
        // Remove deprecated fields from embedded productComplianceRows in ClientModel (CTE and CTO lists)
        await ClientModel.updateMany({}, {
            $unset: {
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].polymerType': 1,
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].category': 1,
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].layerType': 1,
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].supplierStatus': 1,
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].eprRegNumber': 1,
                'productionFacility.cteDetailsList.$[].productComplianceRows.$[].polymerCodeOnProduct': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].polymerType': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].category': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].layerType': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].supplierStatus': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].eprRegNumber': 1,
                'productionFacility.ctoDetailsList.$[].productComplianceRows.$[].polymerCodeOnProduct': 1
            }
        });
        return res.status(200).json({
            message: "Deprecated product compliance fields cleaned up",
            error: false,
            success: true
        });
    } catch (error) {
        throw new ApiError(500, "Failed to cleanup fields: " + (error.message || "Unknown error"));
    }
});

export const getClientByIdController = async (req, res) => {
    try {
        const { clientId } = req.params;

        let client = await ClientModel.findById(clientId)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('assignedManager', 'name email')
            .populate('validationDetails.validatedBy', 'name email')
            .populate('productionFacility.cteDetailsList.verification.verifiedBy', 'name email')
            .populate('productionFacility.ctoDetailsList.verification.verifiedBy', 'name email')
            .lean();

        if (!client) {
            client = await PWPModel.findById(clientId)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name email')
                .populate('assignedManager', 'name email')
                .populate('validationDetails.validatedBy', 'name email')
                .populate('productionFacility.cteDetailsList.verification.verifiedBy', 'name email')
                .populate('productionFacility.ctoDetailsList.verification.verifiedBy', 'name email')
                .lean();
        }

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        // Check access permission
        const user = await UserModel.findById(req.userId).populate('role');
        const isUserAdmin = user?.role?.name === 'ADMIN';

        const isAssignedUser = client.assignedTo?._id?.toString() === req.userId;
        const isAssignedManager = client.assignedManager?._id?.toString() === req.userId;
        const isCreator = client.createdBy?._id?.toString() === req.userId;

        if (!isUserAdmin && !isAssignedUser && !isAssignedManager && !isCreator) {
            return res.status(403).json({
                message: "Access denied. You are not assigned to this client.",
                error: true,
                success: false
            });
        }

        const singleInstanceTypes = new Set([
            'PAN',
            'GST',
            'CIN',
            'Factory License',
            'EPR Certificate',
            'IEC Certificate',
            'DIC/DCSSI Certificate'
        ]);

        if (Array.isArray(client.documents)) {
            const docs = [...client.documents];
            docs.sort((a, b) => {
                const at = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                const bt = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                if (bt !== at) return bt - at;
                const aid = String(a?._id || '');
                const bid = String(b?._id || '');
                return bid.localeCompare(aid);
            });

            const picked = new Set();
            const merged = [];
            for (const d of docs) {
                const t = d?.documentType;
                if (singleInstanceTypes.has(t)) {
                    if (picked.has(t)) continue;
                    picked.add(t);
                }
                merged.push(d);
            }
            client.documents = merged;
        }

        return res.status(200).json({
            message: "Client details fetched successfully",
            error: false,
            success: true,
            data: client
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const updateClientController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const updateData = req.body || {};
        if (updateData.financialYear === undefined && updateData.financial_year !== undefined) {
            updateData.financialYear = updateData.financial_year;
            delete updateData.financial_year;
        }
        if (updateData.financialYear === undefined && updateData.financialyear !== undefined) {
            updateData.financialYear = updateData.financialyear;
            delete updateData.financialyear;
        }
        if (updateData.financialYear !== undefined) {
            updateData.financialYear = updateData.financialYear ? String(updateData.financialYear) : "";
        }

        // Check permissions first
        const user = await UserModel.findById(req.userId).populate('role');
        const isUserAdmin = user?.role?.name === 'ADMIN';

        let clientToCheck = await ClientModel.findById(clientId);
        let Model = ClientModel;
        if (!clientToCheck) {
            clientToCheck = await PWPModel.findById(clientId);
            Model = PWPModel;
        }

        if (!clientToCheck) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        const isAssignedUser = clientToCheck.assignedTo?.toString() === req.userId;
        const isAssignedManager = clientToCheck.assignedManager?.toString() === req.userId;
        const isCreator = clientToCheck.createdBy?.toString() === req.userId;

        if (!isUserAdmin && !isAssignedUser && !isAssignedManager && !isCreator) {
            return res.status(403).json({
                message: "Access denied. You are not assigned to this client.",
                error: true,
                success: false
            });
        }

        const client = await Model.findByIdAndUpdate(
            clientId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Client updated successfully",
            error: false,
            success: true,
            data: client
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const deleteClientController = async (req, res) => {
    try {
        const { clientId } = req.params;

        let client = await ClientModel.findByIdAndDelete(clientId);
        if (!client) {
            client = await PWPModel.findByIdAndDelete(clientId);
        }
        
        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        const emitter = req.app.get('realtimeEmitter');
        if (emitter && client?.productionFacility) {
            const { cteDetailsList = [], ctoDetailsList = [] } = client.productionFacility || {};
            cteDetailsList.forEach((item) => {
                if (item && item._id) {
                    emitter.emit('markingLabellingUpdate', {
                        clientId,
                        type: 'CTE',
                        itemId: item._id,
                        operation: 'delete',
                        source: 'clientDelete'
                    });
                }
            });
            ctoDetailsList.forEach((item) => {
                if (item && item._id) {
                    emitter.emit('markingLabellingUpdate', {
                        clientId,
                        type: 'CTO',
                        itemId: item._id,
                        operation: 'delete',
                        source: 'clientDelete'
                    });
                }
            });
        }

        return res.status(200).json({
            message: "Client deleted successfully",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const assignClientController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { assignedTo, assignedManager, auditStartDate, auditEndDate } = req.body;

        let client = await ClientModel.findByIdAndUpdate(
            clientId,
            { assignedTo, assignedManager, auditStartDate, auditEndDate },
            { new: true }
        ).populate('assignedTo', 'name email').populate('assignedManager', 'name email');

        if (!client) {
            client = await PWPModel.findByIdAndUpdate(
                clientId,
                { assignedTo, assignedManager, auditStartDate, auditEndDate },
                { new: true }
            ).populate('assignedTo', 'name email').populate('assignedManager', 'name email');
        }

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "Client assigned successfully",
            error: false,
            success: true,
            data: client
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getClientStatsController = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).populate('role');
        const isUserAdmin = user?.role?.name === 'ADMIN';
        const baseQuery = isUserAdmin ? {} : {
            $or: [
                { assignedTo: req.userId },
                { assignedManager: req.userId }
            ]
        };

        const auditStartedElemMatch = {
            $or: [
                { completedSteps: { $exists: true, $ne: [] } },
                { 'verification.status': { $exists: true, $ne: '' } },
                { 'verification.verifiedAt': { $exists: true } },
                { 'verification.remark': { $exists: true, $ne: '' } },
                { 'verification.document': { $exists: true, $ne: '' } }
            ]
        };

        const getStats = async (Model) => {
            const total = await Model.countDocuments(baseQuery);
            const pending = await Model.countDocuments({ ...baseQuery, status: 'Pending' });
            const auditStarted = await Model.countDocuments({
                ...baseQuery,
                $or: [
                    { 'productionFacility.cteDetailsList': { $elemMatch: auditStartedElemMatch } },
                    { 'productionFacility.ctoDetailsList': { $elemMatch: auditStartedElemMatch } }
                ]
            });
            const completed = await Model.countDocuments({ ...baseQuery, status: 'Completed' });
            const onHold = await Model.countDocuments({ ...baseQuery, status: 'On Hold' });

            const pipeline = [];
            if (!isUserAdmin) {
                pipeline.push({ $match: baseQuery });
            }
            pipeline.push({
                $group: {
                    _id: '$entityType',
                    count: { $sum: 1 }
                }
            });
            const entityStats = await Model.aggregate(pipeline);
            return { total, pending, auditStarted, completed, onHold, entityStats };
        };

        const stats1 = await getStats(ClientModel);
        const stats2 = await getStats(PWPModel);

        const entityTypeMap = new Map();
        [...stats1.entityStats, ...stats2.entityStats].forEach(item => {
            const current = entityTypeMap.get(item._id) || 0;
            entityTypeMap.set(item._id, current + item.count);
        });
        const entityTypeStats = Array.from(entityTypeMap.entries()).map(([k, v]) => ({ _id: k, count: v }));

        return res.status(200).json({
            message: "Client statistics fetched successfully",
            error: false,
            success: true,
            data: {
                totalClients: stats1.total + stats2.total,
                statusBreakdown: {
                    pending: stats1.pending + stats2.pending,
                    inProgress: stats1.auditStarted + stats2.auditStarted,
                    completed: stats1.completed + stats2.completed,
                    onHold: stats1.onHold + stats2.onHold
                },
                entityTypeBreakdown: entityTypeStats
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const validateClientController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { validationStatus, validationDetails, verifiedItemIds } = req.body;
        const userId = req.userId;

        const client = await ClientService.findClientOrPwp(clientId);

        // Update top-level validation with merge to preserve existing details (e.g., engagementLetterContent)
        client.validationStatus = validationStatus;
        const existingDetails = client.validationDetails || {};
        client.validationDetails = {
            ...existingDetails,
            ...validationDetails,
            validatedBy: userId,
            validatedAt: new Date()
        };

        // Update item-level verification if IDs provided
        if (verifiedItemIds && Array.isArray(verifiedItemIds)) {
            const updateItem = (item) => {
                if (verifiedItemIds.includes(item._id.toString())) {
                    if (!item.verification) item.verification = {};
                    
                    // Only update if not already verified or to refresh it
                    item.verification.status = 'Verified';
                    item.verification.verifiedBy = userId;
                    item.verification.verifiedAt = new Date();
                }
            };

            if (client.productionFacility?.cteDetailsList) {
                client.productionFacility.cteDetailsList.forEach(updateItem);
            }
            if (client.productionFacility?.ctoDetailsList) {
                client.productionFacility.ctoDetailsList.forEach(updateItem);
            }
        }

        await client.save();

        return res.status(200).json({
            message: "Client validation status updated successfully",
            error: false,
            success: true,
            data: client
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const importProcurementController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.body;

        if (!req.file) {
             return res.status(400).json({ message: "No file uploaded", error: true, success: false });
        }

        const clientExists = await ClientService.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
             return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }

        const fileBuffer = req.file?.buffer || fs.readFileSync(req.file.path);
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (_) { void 0; }
        }

        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const headerMap = {
            'registration type': 'registrationType',
            'entity type': 'entityType',
            'supplier code': 'supplierCode',
            'sku code': 'skuCode',
            'component code': 'componentCode',
            'name of entity': 'nameOfEntity',
            'state': 'state',
            'address': 'address',
            'mobile number': 'mobileNumber',
            'plastic material type': 'plasticMaterialType',
            'category of plastic': 'categoryOfPlastic',
            'financial year': 'financialYear',
            'date of invoice': 'dateOfInvoice',
            'quantity (tpa)': 'quantityTPA',
            'recycled plastic %': 'recycledPlasticPercent',
            'gst number': 'gstNumber',
            'gst paid': 'gstPaid',
            'invoice number': 'invoiceNumber',
            'other plastic material type': 'otherPlasticMaterialType',
            'cat-1 container capacity': 'cat1ContainerCapacity',
            'bank account no': 'bankAccountNo',
            'ifsc code': 'ifscCode'
        };

        const procurementData = rawData.map((row) => {
            const newRow = {
                client: clientId,
                type,
                itemId,
                importedBy: req.userId
            };
            for (const [k, v] of Object.entries(row || {})) {
                const normalizedKey = (k ?? '').toString().trim().toLowerCase();
                const schemaField = headerMap[normalizedKey];
                if (!schemaField) continue;
                if (v !== undefined && v !== null && String(v).trim() !== '') {
                    newRow[schemaField] = String(v).trim();
                }
            }
            return newRow;
        }).filter(r => Object.keys(r).length > 4); // Must have at least one data field besides metadata

        if (procurementData.length > 0) {
            await ProcurementModel.insertMany(procurementData);
        }

        const allData = await ProcurementModel.find({ client: clientId, type, itemId }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Procurement data imported successfully",
            error: false,
            success: true,
            data: allData
        });

    } catch (error) {
         return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getProcurementController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const data = await ProcurementModel.find({ client: clientId, type, itemId }).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Procurement data fetched",
            error: false,
            success: true,
            data: data || []
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};



export const saveSkuComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const skuData = req.body; 

        if (!clientId) {
            return res.status(400).json({
                message: "Client ID is required",
                error: true,
                success: false
            });
        }
        
        const result = await SkuComplianceModel.findOneAndUpdate(
            { client: clientId, skuCode: skuData.skuCode },
            { 
                ...skuData,
                client: clientId 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            message: "SKU Compliance data saved successfully",
            data: result,
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Save SKU Compliance Error:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};

export const getSkuComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;

        if (!clientId) {
             return res.status(400).json({
                message: "Client ID is required",
                error: true,
                success: false
            });
        }

        const data = await SkuComplianceModel.find({ client: clientId });

        return res.status(200).json({
            message: "SKU Compliance data fetched successfully",
            data: data,
            success: true,
            error: false
        });

    } catch (error) {
         console.error("Get SKU Compliance Error:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};

export const uploadSkuComplianceRowController = async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
             return res.status(400).json({
                message: "No files uploaded",
                error: true,
                success: false
            });
        }

        const uploadedUrls = {};

        if (req.files['markingImage']) {
             const urls = [];
             for (const file of req.files['markingImage']) {
                 const url = await uploadToCloudinary(file.path, 'eprkavach/sku-compliance');
                 urls.push(url);
                 fs.unlink(file.path, () => {});
             }
             uploadedUrls.markingImage = urls;
        }

        return res.status(200).json({
            message: "Images uploaded successfully",
            data: uploadedUrls,
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Upload SKU Compliance Images Error:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};
