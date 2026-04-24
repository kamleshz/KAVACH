import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import PlasticAnalysisModel from '../../models/plasticAnalysis.model.js';
import ProductComplianceModel from '../../models/productCompliance.model.js';
import SkuComplianceModel from '../../models/skuCompliance.model.js';
import ClientModel from '../../models/client.model.js';
import PWPModel from '../../models/pwp.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class SalesAnalysisService {
    /**
     * Save Sales Analysis Data
     */
    static async saveSalesAnalysis(clientId, type, itemId, data) {
        // Verify Client Exists
        let clientExists = await ClientModel.findById(clientId);
        if (!clientExists) clientExists = await PWPModel.findById(clientId);
        
        if (clientExists) {
            let doc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
            
            if (!doc) {
                doc = new PlasticAnalysisModel({ 
                    client: clientId, 
                    type, 
                    itemId
                });
            }

            doc.salesSummary = data.summary;
            doc.salesRows = data.rows;
            if (data.preConsumerRows) {
                doc.preConsumerRows = data.preConsumerRows;
            }
            if (data.targetTables) {
                doc.salesTargetTables = data.targetTables;
            }
            doc.lastUpdated = new Date();

            await doc.save();
            return doc;
        }
        throw new Error("Client not found");
    }


    /**
     * Get Sales Analysis Data
     */
    static async getSalesAnalysis(clientId, type, itemId) {
        if (!clientId || !type || !itemId) {
            throw new Error("Missing required parameters: clientId, type, itemId");
        }

        const doc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
        
        if (!doc) {
            return null;
        }

        return {
            salesSummary: doc.salesSummary,
            salesRows: doc.salesRows,
            preConsumerRows: doc.preConsumerRows || [],
            salesTargetTables: doc.salesTargetTables || [],
            lastUpdated: doc.lastUpdated
        };
    }

}

export default SalesAnalysisService;
