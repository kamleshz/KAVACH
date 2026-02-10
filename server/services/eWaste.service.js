import { EWasteCompliance } from "../models/eWasteCompliance.model.js";

class EWasteService {
    /**
     * Get E-Waste compliance data for a client
     * @param {string} clientId 
     * @returns {Promise<Object>} Compliance document or null
     */
    async getCompliance(clientId) {
        return await EWasteCompliance.findOne({ clientId });
    }

    /**
     * Save Categories Compliance data
     * @param {string} clientId 
     * @param {Array} rows 
     * @returns {Promise<Object>} Updated compliance document
     */
    async saveCategoriesCompliance(clientId, rows) {
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

        let complianceDoc = await this.getCompliance(clientId);

        if (complianceDoc) {
            complianceDoc.categoriesCompliance = sanitizedRows;
        } else {
            complianceDoc = new EWasteCompliance({
                clientId,
                categoriesCompliance: sanitizedRows
            });
        }

        return await complianceDoc.save();
    }

    /**
     * Save ROHS Compliance data
     * @param {string} clientId 
     * @param {Array} rows 
     * @returns {Promise<Object>} Updated compliance document
     */
    async saveROHSCompliance(clientId, rows) {
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

        let complianceDoc = await this.getCompliance(clientId);

        if (complianceDoc) {
            complianceDoc.rohsCompliance = sanitizedRows;
        } else {
            complianceDoc = new EWasteCompliance({
                clientId,
                rohsCompliance: sanitizedRows
            });
        }

        return await complianceDoc.save();
    }

    /**
     * Save Storage Compliance data
     * @param {string} clientId 
     * @param {Object} data - Contains rows, auditRows, additionalRows
     * @returns {Promise<Object>} Updated compliance document
     */
    async saveStorageCompliance(clientId, { rows, auditRows, additionalRows }) {
        let updateData = {};

        if (rows && Array.isArray(rows)) {
            updateData.storageCompliance = rows.map(row => ({
                storageDetails: row.storageDetails || "",
                status: row.status || "",
                uploadPhoto: row.uploadPhoto || "",
                remarks: row.remarks || ""
            }));
        }

        if (additionalRows && Array.isArray(additionalRows)) {
            updateData.additionalEEECompliance = additionalRows.map(row => ({
                storageDetails: row.storageDetails || "",
                status: row.status || "",
                uploadPhoto: row.uploadPhoto || "",
                remarks: row.remarks || ""
            }));
        }

        if (auditRows && Array.isArray(auditRows)) {
            updateData.storageAudit = auditRows.map(row => ({
                eeeCode: row.eeeCode || "",
                productName: row.productName || "",
                listEEE: row.listEEE || "",
                dateOfStorage: row.dateOfStorage || "",
                endDate: row.endDate || "",
                difference: row.difference || "",
                quantity: row.quantity || "",
                remarks: row.remarks || ""
            }));
        }

        let complianceDoc = await this.getCompliance(clientId);

        if (complianceDoc) {
            if (updateData.storageCompliance) complianceDoc.storageCompliance = updateData.storageCompliance;
            if (updateData.additionalEEECompliance) complianceDoc.additionalEEECompliance = updateData.additionalEEECompliance;
            if (updateData.storageAudit) complianceDoc.storageAudit = updateData.storageAudit;
        } else {
            complianceDoc = new EWasteCompliance({
                clientId,
                ...updateData
            });
        }

        return await complianceDoc.save();
    }

    /**
     * Save Awareness Compliance data
     * @param {string} clientId 
     * @param {Object} data - Contains rows, detailRows
     * @returns {Promise<Object>} Updated compliance document
     */
    async saveAwarenessCompliance(clientId, { rows, detailRows }) {
        const sanitizedRows = rows.map(row => ({
            particulars: row.particulars || "",
            status: row.status || "",
            details: row.details || ""
        }));

        const sanitizedDetailRows = (detailRows || []).map(row => ({
            seminarDetails: row.seminarDetails || "",
            targetAudience: row.targetAudience || "",
            frequency: row.frequency || "",
            awarenessDocuments: row.awarenessDocuments || "",
            documentUpload: row.documentUpload || ""
        }));

        let complianceDoc = await this.getCompliance(clientId);

        if (complianceDoc) {
            complianceDoc.awarenessPrograms = sanitizedRows;
            complianceDoc.awarenessDetails = sanitizedDetailRows;
        } else {
            complianceDoc = new EWasteCompliance({
                clientId,
                awarenessPrograms: sanitizedRows,
                awarenessDetails: sanitizedDetailRows
            });
        }

        return await complianceDoc.save();
    }
}

export const eWasteService = new EWasteService();
