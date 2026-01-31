import ClientModel from '../models/client.model.js';
import PWPModel from '../models/pwp.model.js';
import ProductComplianceModel from '../models/productCompliance.model.js';
import ProcurementModel from '../models/procurement.model.js';
import SkuComplianceModel from '../models/skuCompliance.model.js';
import UserModel from '../models/user.model.js';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import * as XLSX from 'xlsx';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const uploadToCloudinary = async (filePath, folder, filenameOverride, isDoc = false) => {
    try {
        const ext = path.extname(filePath || '').toLowerCase();
        const isPdf = ext === '.pdf';
        const resourceType = isPdf ? 'image' : (isDoc ? 'raw' : 'image');
        
        const options = {
            resource_type: resourceType,
            folder: folder,
            type: 'upload',
            access_mode: 'public',
        };

        if (filenameOverride) {
            options.public_id = filenameOverride;
            options.overwrite = true;
        }
        if (isPdf) {
            options.format = 'pdf';
        }

        const uploadResult = await cloudinary.uploader.upload(filePath, options);
        return uploadResult.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw error;
    }
};

export const uploadClientDocumentController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { documentType, documentName, certificateNumber, certificateDate } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: "No document file uploaded",
                error: true,
                success: false
            });
        }

        let client = await ClientModel.findById(clientId);
        if (!client) {
            client = await PWPModel.findById(clientId);
        }
        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        const singleInstanceTypes = [
            'PAN',
            'GST',
            'CIN',
            'Factory License',
            'EPR Certificate',
            'IEC Certificate',
            'DIC/DCSSI Certificate',
            'Signed Document'
        ];

        let fileUrl = '';
        let keepLocalFile = false;
        try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const stableId = `doc_${clientId}_${documentType}`.replace(/[^\w\-\/]+/g, '_');
            const uniqueId = `doc_${clientId}_${documentType}_${Date.now()}`.replace(/[^\w\-\/]+/g, '_');
            const publicId = singleInstanceTypes.includes(documentType) ? stableId : uniqueId;
            fileUrl = await uploadToCloudinary(req.file.path, 'eprkavach/documents', publicId, isDoc);
        } catch (err) {
            const localRel = path.join('uploads', req.file.filename).replace(/\\/g, '/');
            fileUrl = localRel;
            keepLocalFile = true;
            console.error("Cloud upload failed, falling back to local file:", err?.message || err);
        } finally {
            if (req.file?.path && !keepLocalFile) {
                fs.unlink(req.file.path, () => {});
            }
        }

        const newDoc = {
            documentType,
            documentName: documentName || documentType,
            certificateNumber,
            certificateDate: certificateDate || null,
            filePath: fileUrl,
            uploadedAt: new Date()
        };

        if (singleInstanceTypes.includes(documentType)) {
            const idx = (client.documents || []).findIndex((d) => d?.documentType === documentType);
            if (idx >= 0) {
                Object.assign(client.documents[idx], newDoc);
            } else {
                client.documents.push(newDoc);
            }
        } else {
            client.documents.push(newDoc);
        }
        await client.save();

        return res.status(200).json({
            message: "Document uploaded successfully",
            error: false,
            success: true,
            data: {
                client,
                filePath: fileUrl,
                newDoc
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

export const deleteClientDocumentController = async (req, res) => {
    try {
        const { clientId, docId } = req.params;

        let client = await ClientModel.findById(clientId);
        if (!client) {
            client = await PWPModel.findById(clientId);
        }
        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        const docs = Array.isArray(client.documents) ? client.documents : [];
        const target = docs.find((d) => String(d?._id || '') === String(docId));
        if (!target) {
            return res.status(404).json({
                message: "Document not found",
                error: true,
                success: false
            });
        }

        const filePath = typeof target.filePath === 'string' ? target.filePath : '';

        client.documents = docs.filter((d) => String(d?._id || '') !== String(docId));
        await client.save();

        const normalized = (filePath || '').replace(/\\/g, '/');
        const isUrl = normalized.startsWith('http://') || normalized.startsWith('https://');
        const rel = normalized.startsWith('/') ? normalized.slice(1) : normalized;
        if (!isUrl && rel.startsWith('uploads/')) {
            const abs = path.join(process.cwd(), rel);
            fs.unlink(abs, () => {});
        }

        return res.status(200).json({
            message: "Document deleted successfully",
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

export const getAllClientsController = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).populate('role');
        const isUserAdmin = user?.role?.name === 'ADMIN';
        let query = isUserAdmin ? {} : { assignedTo: req.userId };

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
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        const pwps = await PWPModel.find(query)
            .populate('assignedTo', 'name email')
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
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const createClientController = async (req, res) => {
    try {
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

        await newClient.save();

        return res.status(201).json({
            message: "Client created successfully",
            error: false,
            success: true,
            data: newClient
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const verifyFacilityController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, verificationStatus, verificationRemark, completedSteps } = req.body; // type: 'CTE' or 'CTO'

        // If we are just saving steps, we don't strictly need a file or status.
        // If completedSteps is provided, we skip the strict file check for verificationStatus
        if (!completedSteps && !req.file && verificationStatus !== 'Rejected') {
            return res.status(400).json({
                message: "No verification document uploaded",
                error: true,
                success: false
            });
        }

        let client = await ClientModel.findById(clientId);
        if (!client) {
            client = await PWPModel.findById(clientId);
        }
        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

        let fileUrl = '';
        if (req.file) {
            fileUrl = req.file.path;
            try {
                const ext = path.extname(req.file.originalname).toLowerCase();
                const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
                const filenameOverride = `verify_${type}_${itemId}_${Date.now()}`;
                
                fileUrl = await uploadToCloudinary(req.file.path, 'eprkavach/verification', filenameOverride, isDoc);
            } catch (err) {
                return res.status(500).json({
                    message: "Cloud upload failed: " + (err.message || 'Unknown error'),
                    error: true,
                    success: false
                });
            }
        }

        // Determine target array and find item
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const item = client.productionFacility[listKey].id(itemId);

        if (!item) {
            return res.status(404).json({
                message: `${type} detail not found`,
                error: true,
                success: false
            });
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
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const saveProductComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        const sanitize = (r) => {
            const s = {
                generate: r.generate || 'No',
                systemCode: r.systemCode || '',
                packagingType: r.packagingType || '',
                skuCode: r.skuCode || '',
                skuDescription: r.skuDescription || '',
                skuUom: r.skuUom || '',
                productImage: typeof r.productImage === 'string' ? r.productImage : '',
                componentCode: r.componentCode || '',
                componentDescription: r.componentDescription || '',
                supplierName: r.supplierName || '',
                supplierType: r.supplierType || '',
                supplierCategory: r.supplierCategory || '',
                generateSupplierCode: r.generateSupplierCode || 'No',
                supplierCode: r.supplierCode || '',
                componentImage: typeof r.componentImage === 'string' ? r.componentImage : '',
                thickness: r.thickness || '',
                auditorRemarks: r.auditorRemarks || '',
                clientRemarks: r.clientRemarks || '',
                complianceStatus: r.complianceStatus || ''
            };
            return s;
        };
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];
        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };
        const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
            const at = new Date();
            fields.forEach((field) => {
                const prevVal = toText(beforeRow?.[field]);
                const currVal = toText(afterRow?.[field]);
                if (prevVal !== currVal) {
                    doc.changeHistory.push({
                        table: tableName,
                        row: rowNumber,
                        field: humanize(field),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: req.userId || null,
                        userName: '',
                        at
                    });
                }
            });
        };
        if (typeof rowIndex !== 'undefined' && row !== undefined) {
            const idx = parseInt(rowIndex, 10);
            if (Number.isNaN(idx) || idx < 0) {
                return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
            }
            const rawRow = doc.rows?.[idx] || {};
            const hasNonEmpty = (r) => {
                if (!r || typeof r !== 'object') return false;
                const keysToCheck = [
                    'systemCode','packagingType','skuCode','skuDescription','skuUom',
                    'productImage','componentCode','componentDescription',
                    'supplierName','supplierType','supplierCategory','generateSupplierCode','supplierCode',
                    'componentImage','thickness'
                ];
                return keysToCheck.some(k => {
                    const v = r[k];
                    return v !== undefined && v !== null && String(v).trim() !== '';
                });
            };
            let baseRow = hasNonEmpty(rawRow) ? rawRow : {};
            if (!hasNonEmpty(baseRow)) {
                const embeddedRows = Array.isArray(itemFound.productComplianceRows) ? itemFound.productComplianceRows : [];
                const embedded = embeddedRows[idx] || {};
                const embeddedObj = embedded && typeof embedded.toObject === 'function' ? embedded.toObject() : embedded;
                if (hasNonEmpty(embeddedObj)) baseRow = embeddedObj;
            }
            const beforeRow = baseRow || {};
            const baseRowObj = (baseRow && typeof baseRow.toObject === 'function') ? baseRow.toObject() : baseRow;
            const sanitized = sanitize({ ...baseRowObj, ...row });
            const setUpdate = {};
            Object.keys(sanitized).forEach(key => {
                setUpdate[`rows.${idx}.${key}`] = sanitized[key];
            });

            if (Object.keys(setUpdate).length === 0) {
                return res.status(400).json({ message: "No valid fields to update", error: true, success: false });
            }

            await ProductComplianceModel.updateOne(
                { client: clientId, type, itemId },
                { $set: setUpdate },
                { upsert: false }
            );

            const refreshedDoc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
            const afterRow = refreshedDoc?.rows?.[idx] || {};
            const allFields = ['generate', 'systemCode', 'packagingType', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierCategory', 'generateSupplierCode', 'supplierCode', 'componentImage', 'thickness', 'auditorRemarks', 'clientRemarks', 'complianceStatus'];
            pushDiffs('Product Compliance', idx + 1, beforeRow, afterRow, allFields);
            doc = refreshedDoc || doc;
        } else {
            let parsed = rows;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; }
            }
            if (!Array.isArray(parsed)) parsed = [];
            const beforeRows = Array.isArray(doc.rows) ? doc.rows : [];
            const embeddedRows = Array.isArray(itemFound.productComplianceRows) ? itemFound.productComplianceRows : [];
            const sanitizedIncoming = parsed.map(sanitize);

            // Prefer existing non-empty values; only replace with incoming when not empty
            const mergeField = (incoming, base) => {
                const toStr = (v) => (v === null || v === undefined) ? '' : String(v);
                const inc = toStr(incoming).trim();
                const bas = toStr(base).trim();
                return inc !== '' ? inc : bas;
            };

            const afterRows = sanitizedIncoming.map((incomingRow, i) => {
                const baseRow = beforeRows[i] || (embeddedRows[i]?.toObject ? embeddedRows[i].toObject() : embeddedRows[i]) || {};
                return {
                    generate: mergeField(incomingRow.generate, baseRow.generate),
                    systemCode: mergeField(incomingRow.systemCode, baseRow.systemCode),
                    packagingType: mergeField(incomingRow.packagingType, baseRow.packagingType),
                    skuCode: mergeField(incomingRow.skuCode, baseRow.skuCode),
                    skuDescription: mergeField(incomingRow.skuDescription, baseRow.skuDescription),
                    skuUom: mergeField(incomingRow.skuUom, baseRow.skuUom),
                    productImage: mergeField(incomingRow.productImage, baseRow.productImage),
                    componentCode: mergeField(incomingRow.componentCode, baseRow.componentCode),
                    componentDescription: mergeField(incomingRow.componentDescription, baseRow.componentDescription),
            supplierName: mergeField(incomingRow.supplierName, baseRow.supplierName),
            supplierType: mergeField(incomingRow.supplierType, baseRow.supplierType),
            supplierCategory: mergeField(incomingRow.supplierCategory, baseRow.supplierCategory),
            generateSupplierCode: mergeField(incomingRow.generateSupplierCode, baseRow.generateSupplierCode),
            supplierCode: mergeField(incomingRow.supplierCode, baseRow.supplierCode),
                    componentImage: mergeField(incomingRow.componentImage, baseRow.componentImage),
                    thickness: mergeField(incomingRow.thickness, baseRow.thickness),
                    auditorRemarks: mergeField(incomingRow.auditorRemarks, baseRow.auditorRemarks),
                    clientRemarks: mergeField(incomingRow.clientRemarks, baseRow.clientRemarks),
                    complianceStatus: mergeField(incomingRow.complianceStatus, baseRow.complianceStatus)
                };
            });

            // Check uniqueness within the new list
            const codeMap = new Map(); // code -> {sku, desc}
            for (const r of afterRows) {
                const c = (r.componentCode || '').trim();
                const sku = (r.skuCode || '').trim();
                const desc = (r.componentDescription || '').trim();
                if (c) {
                    if (codeMap.has(c)) {
                        const existing = codeMap.get(c);
                        if (existing.sku !== sku || existing.desc !== desc) {
                             return res.status(400).json({ message: `Duplicate Component Code '${c}' found with different SKU/Description`, error: true, success: false });
                        }
                    } else {
                        codeMap.set(c, { sku, desc });
                    }
                }
            }

            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Product Compliance', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['generate', 'systemCode', 'packagingType', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierCategory', 'componentImage']);
            }
            doc.rows = afterRows;
        }
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = req.userId;
        await doc.save();

        const emitter = req.app.get('realtimeEmitter');
        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productCompliance'
            });
        }

        return res.status(200).json({
            message: "Product compliance saved",
            error: false,
            success: true,
            data: doc.rows
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

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

export const uploadProductComplianceRowController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];

        let single = row;
        if (typeof single === 'string') {
            try { single = JSON.parse(single); } catch (_) { single = {}; }
        }
        const idx = parseInt(rowIndex, 10);
        if (Number.isNaN(idx) || idx < 0) {
            return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
        }
        
        let productImageUrl = single.productImage || '';
        let componentImageUrl = single.componentImage || '';
        const productFile = req.files?.productImage?.[0] || null;
        const componentFile = req.files?.componentImage?.[0] || null;

        if (productFile) {
            const ext = path.extname(productFile.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const filenameOverride = `pc_product_${type}_${itemId}_${Date.now()}`;
            productImageUrl = await uploadToCloudinary(productFile.path, 'eprkavach/product_compliance', filenameOverride, isDoc);
        }
        if (componentFile) {
            const ext = path.extname(componentFile.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const filenameOverride = `pc_component_${type}_${itemId}_${Date.now()}`;
            componentImageUrl = await uploadToCloudinary(componentFile.path, 'eprkavach/product_compliance', filenameOverride, isDoc);
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
            thickness: single.thickness || ''
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

export const saveProductComponentDetailsController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        const sanitize = (r) => ({
            systemCode: r.systemCode || '',
            skuCode: r.skuCode || '',
            componentCode: r.componentCode || '',
            componentDescription: r.componentDescription || '',
            supplierName: r.supplierName || '',
            polymerType: r.polymerType || '',
            componentPolymer: r.componentPolymer || '',
            polymerCode: r.polymerCode || null,
            category: r.category || '',
            categoryIIType: r.categoryIIType || '',
            containerCapacity: r.containerCapacity || '',
            foodGrade: r.foodGrade || '',
            layerType: r.layerType || '',
            thickness: r.thickness || ''
        });
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [], componentDetails: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];
        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };
        const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
            const at = new Date();
            fields.forEach((field) => {
                const prevVal = toText(beforeRow?.[field]);
                const currVal = toText(afterRow?.[field]);
                if (prevVal !== currVal) {
                    doc.changeHistory.push({
                        table: tableName,
                        row: rowNumber,
                        field: humanize(field),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: req.userId || null,
                        userName: '',
                        at
                    });
                }
            });
        };
        if (typeof rowIndex !== 'undefined' && row !== undefined) {
            let single = row;
            if (typeof single === 'string') {
                try { single = JSON.parse(single); } catch (_) { single = {}; }
            }
            single = sanitize(single);
            const idx = parseInt(rowIndex, 10);
            if (Number.isNaN(idx) || idx < 0) {
                return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
            }
            const beforeRow = doc.componentDetails?.[idx] || {};
            if (idx >= doc.componentDetails.length) {
                doc.componentDetails.push(single);
            } else {
                doc.componentDetails.set(idx, single);
            }
            pushDiffs('Component Details', idx + 1, beforeRow, single, ['skuCode', 'componentCode', 'componentDescription', 'supplierName', 'polymerType', 'componentPolymer', 'polymerCode', 'category', 'containerCapacity', 'foodGrade', 'layerType', 'thickness']);
        } else {
            let parsed = rows;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; }
            }
            if (!Array.isArray(parsed)) parsed = [];
            const beforeRows = Array.isArray(doc.componentDetails) ? doc.componentDetails : [];
            const afterRows = parsed.map(sanitize);
            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Component Details', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['skuCode', 'componentCode', 'componentDescription', 'supplierName', 'polymerType', 'componentPolymer', 'polymerCode', 'category', 'categoryIIType', 'containerCapacity', 'foodGrade', 'layerType', 'thickness']);
            }
            doc.componentDetails = afterRows;
        }
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = req.userId;
        await doc.save();

        const emitter = req.app.get('realtimeEmitter');
        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productComponentDetails'
            });
        }

        return res.status(200).json({
            message: "Component details saved",
            error: false,
            success: true,
            data: doc.componentDetails
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

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

export const saveProductSupplierComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        const sanitize = (r) => ({
            systemCode: r.systemCode || '',
            componentCode: r.componentCode || '',
            componentDescription: r.componentDescription || '',
            supplierName: r.supplierName || '',
            supplierStatus: r.supplierStatus || '',
            foodGrade: (r.foodGrade ?? r.foodgrade ?? '') || '',
            eprCertificateNumber: r.eprCertificateNumber || '',
            fssaiLicNo: r.fssaiLicNo || ''
        });
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [], componentDetails: [], supplierCompliance: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];
        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };
        const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
            const at = new Date();
            fields.forEach((field) => {
                const prevVal = toText(beforeRow?.[field]);
                const currVal = toText(afterRow?.[field]);
                if (prevVal !== currVal) {
                    doc.changeHistory.push({
                        table: tableName,
                        row: rowNumber,
                        field: humanize(field),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: req.userId || null,
                        userName: '',
                        at
                    });
                }
            });
        };
        if (typeof rowIndex !== 'undefined' && row !== undefined) {
            let single = row;
            if (typeof single === 'string') {
                try { single = JSON.parse(single); } catch (_) { single = {}; }
            }
            single = sanitize(single);
            const idx = parseInt(rowIndex, 10);
            if (Number.isNaN(idx) || idx < 0) {
                return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
            }
            const beforeRow = doc.supplierCompliance?.[idx] || {};
            if (idx >= doc.supplierCompliance.length) {
                doc.supplierCompliance.push(single);
            } else {
                doc.supplierCompliance.set(idx, single);
            }
            pushDiffs('Supplier Compliance', idx + 1, beforeRow, single, ['systemCode', 'componentCode', 'componentDescription', 'supplierName', 'supplierStatus', 'foodGrade', 'eprCertificateNumber', 'fssaiLicNo']);
            doc.markModified('supplierCompliance');
        } else {
            let parsed = rows;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; }
            }
            if (!Array.isArray(parsed)) parsed = [];
            const beforeRows = Array.isArray(doc.supplierCompliance) ? doc.supplierCompliance : [];
            const afterRows = parsed.map(sanitize);
            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Supplier Compliance', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['systemCode', 'componentCode', 'componentDescription', 'supplierName', 'supplierStatus', 'foodGrade', 'eprCertificateNumber', 'fssaiLicNo']);
            }
            doc.supplierCompliance = afterRows;
            doc.markModified('supplierCompliance');
        }
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = req.userId;
        await doc.save();

        const emitter = req.app.get('realtimeEmitter');
        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productSupplierCompliance'
            });
        }

        return res.status(200).json({
            message: "Supplier compliance saved",
            error: false,
            success: true,
            data: doc.supplierCompliance
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

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
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
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

export const saveRecycledQuantityUsedController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }
        const sanitize = (r) => ({
            systemCode: r.systemCode || '',
            componentCode: r.componentCode || '',
            componentDescription: r.componentDescription || '',
            supplierName: r.supplierName || '',
            category: r.category || '',
            annualConsumption: Number(r.annualConsumption) || 0,
            uom: r.uom || '',
            perPieceWeight: Number(r.perPieceWeight) || 0,
            annualConsumptionMt: Number(r.annualConsumptionMt) || 0,
            usedRecycledPercent: Number(r.usedRecycledPercent) || 0,
            usedRecycledQtyMt: Number(r.usedRecycledQtyMt) || 0
        });
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [], componentDetails: [], supplierCompliance: [], recycledQuantityUsed: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];
        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };
        const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const pushDiffs = (tableName, rowNumber, beforeRow, afterRow, fields) => {
            const at = new Date();
            fields.forEach((field) => {
                const prevVal = toText(beforeRow?.[field]);
                const currVal = toText(afterRow?.[field]);
                if (prevVal !== currVal) {
                    doc.changeHistory.push({
                        table: tableName,
                        row: rowNumber,
                        field: humanize(field),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: req.userId || null,
                        userName: '',
                        at
                    });
                }
            });
        };
        if (typeof rowIndex !== 'undefined' && row !== undefined) {
            let single = row;
            if (typeof single === 'string') {
                try { single = JSON.parse(single); } catch (_) { single = {}; }
            }
            single = sanitize(single);
            const idx = parseInt(rowIndex, 10);
            if (Number.isNaN(idx) || idx < 0) {
                return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
            }
            const beforeRow = doc.recycledQuantityUsed?.[idx] || {};
            if (idx >= doc.recycledQuantityUsed.length) {
                doc.recycledQuantityUsed.push(single);
            } else {
                doc.recycledQuantityUsed.set(idx, single);
            }
            pushDiffs('Recycled Quantity Used', idx + 1, beforeRow, single, ['systemCode', 'componentCode', 'componentDescription', 'supplierName', 'category', 'annualConsumption', 'uom', 'perPieceWeight', 'usedRecycledPercent', 'usedRecycledQtyMt']);
        } else {
            let parsed = rows;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; }
            }
            if (!Array.isArray(parsed)) parsed = [];
            const beforeRows = Array.isArray(doc.recycledQuantityUsed) ? doc.recycledQuantityUsed : [];
            const afterRows = parsed.map(sanitize);
            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Recycled Quantity Used', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['componentCode', 'componentDescription', 'supplierName', 'category', 'annualConsumption', 'uom', 'perPieceWeight', 'usedRecycledPercent', 'usedRecycledQtyMt']);
            }
            doc.recycledQuantityUsed = afterRows;
        }
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = req.userId;
        await doc.save();
        return res.status(200).json({
            message: "Recycled quantity used saved",
            error: false,
            success: true,
            data: doc.recycledQuantityUsed
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

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

export const saveMonthlyProcurementController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows, rowIndex, row } = req.body;
        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            return res.status(404).json({ message: `${type} detail not found`, error: true, success: false });
        }

        const sanitize = (r) => {
            const uom = (r.uom || '').toString();
            const purchaseQty = Number(r.purchaseQty) || 0;
            const perPieceWeightKg = Number(r.perPieceWeightKg) || 0;
            let monthlyPurchaseMt = Number(r.monthlyPurchaseMt) || 0;
            if (!monthlyPurchaseMt) {
                if (uom === 'Units' || uom === 'Nos') {
                    monthlyPurchaseMt = purchaseQty * perPieceWeightKg;
                } else if (uom === 'KG') {
                    monthlyPurchaseMt = purchaseQty / 1000;
                } else if (uom === 'MT') {
                    monthlyPurchaseMt = purchaseQty;
                }
            }
            return {
                systemCode: r.systemCode || '',
                skuCode: r.skuCode || '',
                supplierName: r.supplierName || '',
                componentCode: r.componentCode || '',
                componentDescription: r.componentDescription || '',
                polymerType: r.polymerType || '',
                componentPolymer: r.componentPolymer || '',
                category: r.category || '',
                dateOfInvoice: r.dateOfInvoice || '',
                monthName: r.monthName || '',
                quarter: r.quarter || '',
                yearlyQuarter: r.yearlyQuarter || '',
                purchaseQty,
                uom,
                perPieceWeightKg,
                monthlyPurchaseMt,
                recycledPercent: Number(r.recycledPercent) || 0,
                recycledQty: Number(r.recycledQty) || 0,
                recycledRate: Number(r.recycledRate) || 0,
                recycledQrtAmount: Number(r.recycledQrtAmount) || 0,
                virginQty: Number(r.virginQty) || 0,
                virginRate: Number(r.virginRate) || 0,
                virginQtyAmount: Number(r.virginQtyAmount) || 0,
                rcPercentMentioned: (r.rcPercentMentioned || '').toString()
            };
        };

        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [], componentDetails: [], supplierCompliance: [], recycledQuantityUsed: [], procurementDetails: [] });
        }
        if (!Array.isArray(doc.changeHistory)) doc.changeHistory = [];

        const toText = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            return String(v);
        };

        if (Array.isArray(rows)) {
            const sanitized = rows.map(sanitize);
            doc.procurementDetails = sanitized;
            doc.updatedBy = req.userId || null;
            const now = new Date();
            (sanitized || []).forEach((r, idx) => {
                const fields = Object.keys(r);
                fields.forEach(field => {
                    const prevVal = '';
                    const currVal = toText(r[field]);
                    if (prevVal !== currVal) {
                        doc.changeHistory.push({
                            table: 'Monthly Procurement Data',
                            row: idx + 1,
                            field,
                            prev: prevVal,
                            curr: currVal,
                            user: req.userId || null,
                            userName: '',
                            at: now
                        });
                    }
                });
            });
            await doc.save();
            return res.status(200).json({ message: "Monthly procurement saved", error: false, success: true, data: doc.procurementDetails });
        }

        let single = row;
        if (typeof single === 'string') {
            try { single = JSON.parse(single); } catch (_) { single = {}; }
        }
        const idx = parseInt(rowIndex, 10);
        if (Number.isNaN(idx) || idx < 0) {
            return res.status(400).json({ message: "Invalid rowIndex", error: true, success: false });
        }
        const sanitized = sanitize(single);
        const existing = doc.procurementDetails[idx] || {};
        doc.procurementDetails[idx] = sanitized;
        doc.updatedBy = req.userId || null;
        const now = new Date();
        Object.keys(sanitized).forEach(field => {
            const prevVal = toText(existing[field]);
            const currVal = toText(sanitized[field]);
            if (prevVal !== currVal) {
                doc.changeHistory.push({
                    table: 'Monthly Procurement Data',
                    row: idx + 1,
                    field,
                    prev: prevVal,
                    curr: currVal,
                    user: req.userId || null,
                    userName: '',
                    at: now
                });
            }
        });
        await doc.save();
        return res.status(200).json({ message: "Monthly procurement row saved", error: false, success: true, data: doc.procurementDetails });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getMonthlyProcurementController = async (req, res) => {
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
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};
export const cleanupProductComplianceFieldsController = async (req, res) => {
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
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
};

export const getClientByIdController = async (req, res) => {
    try {
        const { clientId } = req.params;

        let client = await ClientModel.findById(clientId)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('validationDetails.validatedBy', 'name email')
            .populate('productionFacility.cteDetailsList.verification.verifiedBy', 'name email')
            .populate('productionFacility.ctoDetailsList.verification.verifiedBy', 'name email')
            .lean();

        if (!client) {
            client = await PWPModel.findById(clientId)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name email')
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

        if (!isUserAdmin && client.assignedTo?._id?.toString() !== req.userId) {
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

        if (!isUserAdmin && clientToCheck.assignedTo?.toString() !== req.userId) {
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
        const { assignedTo, auditStartDate, auditEndDate } = req.body;

        let client = await ClientModel.findByIdAndUpdate(
            clientId,
            { assignedTo, auditStartDate, auditEndDate },
            { new: true }
        ).populate('assignedTo', 'name email');

        if (!client) {
            client = await PWPModel.findByIdAndUpdate(
                clientId,
                { assignedTo, auditStartDate, auditEndDate },
                { new: true }
            ).populate('assignedTo', 'name email');
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
        const baseQuery = isUserAdmin ? {} : { assignedTo: req.userId };

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

        let client = await ClientModel.findById(clientId);
        if (!client) {
            client = await PWPModel.findById(clientId);
        }

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
                error: true,
                success: false
            });
        }

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

        let clientExists = await ClientModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) clientExists = await PWPModel.findById(clientId).select('_id productionFacility');
        if (!clientExists) {
            return res.status(404).json({ message: "Client not found", error: true, success: false });
        }

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
