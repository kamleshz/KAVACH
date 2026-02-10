import ClientModel from '../models/client.model.js';
import PWPModel from '../models/pwp.model.js';
import ProductComplianceModel from '../models/productCompliance.model.js';
import path from 'path';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';
import ApiError from '../utils/ApiError.js';

class ClientService {

    /**
     * Upload a document for a client
     * @param {string} clientId 
     * @param {object} file - The file object from multer
     * @param {object} metadata - { documentType, documentName, certificateNumber, certificateDate }
     */
    static async uploadDocument(clientId, file, metadata) {
        const { documentType, documentName, certificateNumber, certificateDate } = metadata;

        // 1. Verify Client Exists
        let Model = ClientModel;
        let clientExists = await ClientModel.exists({ _id: clientId });
        if (!clientExists) {
            Model = PWPModel;
            clientExists = await PWPModel.exists({ _id: clientId });
        }
        if (!clientExists) {
            throw new ApiError(404, "Client not found");
        }

        // 2. Prepare Upload
        const singleInstanceTypes = [
            'PAN', 'GST', 'CIN', 'Factory License', 'EPR Certificate',
            'IEC Certificate', 'DIC/DCSSI Certificate', 'E-waste Registration',
            'EEE Import Authorization', 'Signed Document'
        ];

        let fileUrl = '';
        let keepLocalFile = false;
        try {
            const ext = path.extname(file.originalname).toLowerCase();
            const isDoc = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext);
            const stableId = `doc_${clientId}_${documentType}`.replace(/[^\w\-\/]+/g, '_');
            const uniqueId = `doc_${clientId}_${documentType}_${Date.now()}`.replace(/[^\w\-\/]+/g, '_');
            const publicId = singleInstanceTypes.includes(documentType) ? stableId : uniqueId;
            
            // Use shared utility
            fileUrl = await uploadToCloudinary(file.path, 'eprkavach/documents', publicId, isDoc);
        } catch (err) {
            console.error("Cloudinary upload failed, falling back to local:", err);
            // Fallback to local path
            fileUrl = path.join('uploads', file.filename).replace(/\\/g, '/');
            keepLocalFile = true;
        } finally {
            if (file.path && !keepLocalFile) {
                fs.unlink(file.path, () => {});
            }
        }

        // 3. Prepare Doc Entry
        const newDoc = {
            documentType,
            documentName: documentName || documentType,
            certificateNumber,
            certificateDate: certificateDate || null,
            filePath: fileUrl,
            uploadedAt: new Date()
        };

        let updatedClient;

        // 4. Update Database
        if (singleInstanceTypes.includes(documentType)) {
            // Try to update existing subdocument
            updatedClient = await Model.findOneAndUpdate(
                { _id: clientId, "documents.documentType": documentType },
                { 
                    $set: { 
                        "documents.$.documentName": newDoc.documentName,
                        "documents.$.certificateNumber": newDoc.certificateNumber,
                        "documents.$.certificateDate": newDoc.certificateDate,
                        "documents.$.filePath": newDoc.filePath,
                        "documents.$.uploadedAt": newDoc.uploadedAt
                    }
                },
                { new: true }
            );

            if (!updatedClient) {
                // If not found, push new
                 updatedClient = await Model.findByIdAndUpdate(
                    clientId,
                    { $push: { documents: newDoc } },
                    { new: true }
                );
            }
        } else {
            // Always push for multiple-instance types
            updatedClient = await Model.findByIdAndUpdate(
                clientId,
                { $push: { documents: newDoc } },
                { new: true }
            );
        }

        return {
            client: updatedClient,
            filePath: fileUrl,
            newDoc
        };
    }
    /**
     * Find a client or PWP by ID
     * @param {string} clientId 
     * @returns {Promise<import('mongoose').Document>}
     * @throws {Error} if not found
     */
    static async findClientOrPwp(clientId) {
        let client = await ClientModel.findById(clientId);
        if (!client) {
            client = await PWPModel.findById(clientId);
        }
        if (!client) {
            throw new ApiError(404, "Client not found");
        }
        return client;
    }

    /**
     * Delete a document for a client
     * @param {string} clientId 
     * @param {string} docId 
     */
    static async deleteDocument(clientId, docId) {
        // 1. Verify Client Exists
        let Model = ClientModel;
        let clientExists = await ClientModel.exists({ _id: clientId });
        if (!clientExists) {
            Model = PWPModel;
            clientExists = await PWPModel.exists({ _id: clientId });
        }
        if (!clientExists) {
            throw new ApiError(404, "Client not found");
        }

        // 2. Find Document
        const clientWithDoc = await Model.findOne({ _id: clientId, "documents._id": docId }, { "documents.$": 1 });
        
        if (!clientWithDoc || !clientWithDoc.documents || clientWithDoc.documents.length === 0) {
            throw new ApiError(404, "Document not found");
        }

        const target = clientWithDoc.documents[0];
        const filePath = typeof target.filePath === 'string' ? target.filePath : '';

        // 3. Remove from Database
        await Model.findByIdAndUpdate(clientId, { $pull: { documents: { _id: docId } } });

        // 4. Clean up Local File (if applicable)
        const normalized = (filePath || '').replace(/\\/g, '/');
        const isUrl = normalized.startsWith('http://') || normalized.startsWith('https://');
        const rel = normalized.startsWith('/') ? normalized.slice(1) : normalized;
        
        if (!isUrl && rel.startsWith('uploads/')) {
            const abs = path.join(process.cwd(), rel);
            fs.unlink(abs, () => {});
        }

        return true;
    }

    /**
     * Save Product Supplier Compliance
     * @param {string} clientId
     * @param {string} type
     * @param {string} itemId
     * @param {Array|object} rows
     * @param {number} rowIndex
     * @param {object} row
     * @param {string} userId
     * @param {object} emitter
     */
    static async saveSupplierCompliance(clientId, type, itemId, rows, rowIndex, row, userId, emitter) {
        const clientExists = await this.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            throw new ApiError(404, `${type} detail not found`);
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
                        user: userId || null,
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
                throw new ApiError(400, "Invalid rowIndex");
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
        doc.updatedBy = userId;
        await doc.save();

        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productSupplierCompliance'
            });
        }

        return doc.supplierCompliance;
    }

    /**
     * Save Product Compliance
     * @param {string} clientId
     * @param {string} type
     * @param {string} itemId
     * @param {Array|object} rows
     * @param {number} rowIndex
     * @param {object} row
     * @param {string} userId
     * @param {object} emitter
     */
    static async saveProductCompliance(clientId, type, itemId, rows, rowIndex, row, userId, emitter) {
        const clientExists = await this.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            throw new ApiError(404, `${type} detail not found`);
        }
        
        const sanitize = (r) => {
            const s = {
                generate: r.generate || 'No',
                systemCode: r.systemCode || '',
                packagingType: r.packagingType || '',
                industryCategory: r.industryCategory || '',
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
                componentComplianceStatus: r.componentComplianceStatus || r.complianceStatus || '',
                additionalDocument: typeof r.additionalDocument === 'string' ? r.additionalDocument : '',
                managerRemarks: r.managerRemarks || ''
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
                        user: userId || null,
                        userName: '',
                        at
                    });
                }
            });
        };

        if (typeof rowIndex !== 'undefined' && row !== undefined) {
            const idx = parseInt(rowIndex, 10);
            if (Number.isNaN(idx) || idx < 0) {
                throw new ApiError(400, "Invalid rowIndex");
            }
            const rawRow = doc.rows?.[idx] || {};
            const hasNonEmpty = (r) => {
                if (!r || typeof r !== 'object') return false;
                const keysToCheck = [
                    'systemCode','packagingType','industryCategory','skuCode','skuDescription','skuUom',
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
                throw new ApiError(400, "No valid fields to update");
            }

            await ProductComplianceModel.updateOne(
                { client: clientId, type, itemId },
                { $set: setUpdate },
                { upsert: false }
            );

            const refreshedDoc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
            const afterRow = refreshedDoc?.rows?.[idx] || {};
            const allFields = ['generate', 'systemCode', 'packagingType', 'industryCategory', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierCategory', 'generateSupplierCode', 'supplierCode', 'componentImage', 'thickness', 'auditorRemarks', 'clientRemarks', 'componentComplianceStatus', 'managerRemarks'];
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
                    industryCategory: mergeField(incomingRow.industryCategory, baseRow.industryCategory),
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
                    componentComplianceStatus: mergeField(incomingRow.componentComplianceStatus, baseRow.componentComplianceStatus),
                    managerRemarks: mergeField(incomingRow.managerRemarks, baseRow.managerRemarks)
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
                             throw new ApiError(400, `Duplicate Component Code '${c}' found with different SKU/Description`);
                        }
                    } else {
                        codeMap.set(c, { sku, desc });
                    }
                }
            }

            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Product Compliance', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['generate', 'systemCode', 'packagingType', 'industryCategory', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierCategory', 'componentImage']);
            }
            doc.rows = afterRows;
        }
        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = userId;
        await doc.save();

        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productCompliance'
            });
        }

        return doc.rows;
    }

    /**
     * Save Product Component Details
     * @param {string} clientId
     * @param {string} type
     * @param {string} itemId
     * @param {Array|object} rows
     * @param {number} rowIndex
     * @param {object} row
     * @param {string} userId
     * @param {object} emitter
     */
    static async saveProductComponentDetails(clientId, type, itemId, rows, rowIndex, row, userId, emitter) {
        const clientExists = await this.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            throw new ApiError(404, `${type} detail not found`);
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
                        user: userId || null,
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
                throw new ApiError(400, "Invalid rowIndex");
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
        doc.updatedBy = userId;
        await doc.save();

        if (emitter) {
            emitter.emit('markingLabellingUpdate', {
                clientId,
                type,
                itemId,
                operation: 'upsert',
                source: 'productComponentDetails'
            });
        }

        return doc.componentDetails;
    }

    /**
     * Save Recycled Quantity Used
     * @param {string} clientId
     * @param {string} type
     * @param {string} itemId
     * @param {Array|object} rows
     * @param {number} rowIndex
     * @param {object} row
     * @param {string} userId
     */
    static async saveRecycledQuantityUsed(clientId, type, itemId, rows, rowIndex, row, userId) {
        const clientExists = await this.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            throw new ApiError(404, `${type} detail not found`);
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
                        user: userId || null,
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
                throw new ApiError(400, "Invalid rowIndex");
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
        doc.updatedBy = userId;
        await doc.save();
        
        return doc.recycledQuantityUsed;
    }

    /**
     * Save Monthly Procurement
     * @param {string} clientId
     * @param {string} type
     * @param {string} itemId
     * @param {Array|object} rows
     * @param {number} rowIndex
     * @param {object} row
     * @param {string} userId
     */
    static async saveMonthlyProcurement(clientId, type, itemId, rows, rowIndex, row, userId) {
        const clientExists = await this.findClientOrPwp(clientId);
        
        const listKey = type === 'CTE' ? 'cteDetailsList' : 'ctoDetailsList';
        const itemFound = clientExists.productionFacility[listKey].id(itemId);
        if (!itemFound) {
            throw new ApiError(404, `${type} detail not found`);
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
                        user: userId || null,
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
                throw new ApiError(400, "Invalid rowIndex");
            }
            const beforeRow = doc.procurementDetails?.[idx] || {};
            if (idx >= doc.procurementDetails.length) {
                doc.procurementDetails.push(single);
            } else {
                doc.procurementDetails.set(idx, single);
            }
            pushDiffs('Monthly Procurement Data', idx + 1, beforeRow, single, ['systemCode', 'skuCode', 'supplierName', 'componentCode', 'componentDescription', 'polymerType', 'componentPolymer', 'category', 'dateOfInvoice', 'monthName', 'quarter', 'yearlyQuarter', 'purchaseQty', 'uom', 'perPieceWeightKg', 'monthlyPurchaseMt', 'recycledPercent', 'recycledQty', 'recycledRate', 'recycledQrtAmount', 'virginQty', 'virginRate', 'virginQtyAmount', 'rcPercentMentioned']);
        } else {
            let parsed = rows;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; }
            }
            if (!Array.isArray(parsed)) parsed = [];
            const beforeRows = Array.isArray(doc.procurementDetails) ? doc.procurementDetails : [];
            const afterRows = parsed.map(sanitize);
            const maxLen = Math.max(beforeRows.length, afterRows.length);
            for (let i = 0; i < maxLen; i += 1) {
                pushDiffs('Monthly Procurement Data', i + 1, beforeRows[i] || {}, afterRows[i] || {}, ['systemCode', 'skuCode', 'supplierName', 'componentCode', 'componentDescription', 'polymerType', 'componentPolymer', 'category', 'dateOfInvoice', 'monthName', 'quarter', 'yearlyQuarter', 'purchaseQty', 'uom', 'perPieceWeightKg', 'monthlyPurchaseMt', 'recycledPercent', 'recycledQty', 'recycledRate', 'recycledQrtAmount', 'virginQty', 'virginRate', 'virginQtyAmount', 'rcPercentMentioned']);
            }
            doc.procurementDetails = afterRows;
        }

        if (doc.changeHistory.length > 5000) doc.changeHistory = doc.changeHistory.slice(-5000);
        doc.updatedBy = userId;
        await doc.save();
        return doc.procurementDetails;
    }

}
export default ClientService;
