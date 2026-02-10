import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import PlasticAnalysisModel from '../models/plasticAnalysis.model.js';
import ClientModel from '../models/client.model.js';
import PWPModel from '../models/pwp.model.js';

class AnalysisService {
    
    /**
     * Run Pre/Post Validation Analysis and save results
     */
    static async runPlasticAnalysis(salesFilePath, purchaseFilePath, outputDir, context = {}) {
        const { clientId, type, itemId } = context;

        // 1. Run the Calculation Logic (formerly runPrePostValidation)
        const result = this.calculatePrePost(salesFilePath, purchaseFilePath, outputDir);

        // 2. Save to Database if context is provided
        if (clientId && type && itemId) {
            await this.saveAnalysisResult(clientId, type, itemId, result);
        }

        return result;
    }

    /**
     * Fetch saved analysis from DB
     */
    static async getPlasticAnalysis(clientId, type, itemId) {
        if (!clientId || !type || !itemId) {
            throw new Error("Missing required parameters: clientId, type, itemId");
        }

        const doc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
        
        if (!doc || !doc.summary) {
            return null;
        }

        return {
            data: doc.rows,
            full_summary: doc.summary,
            lastUpdated: doc.lastUpdated
        };
    }

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
            lastUpdated: doc.lastUpdated
        };
    }

    /**
     * Save Purchase Analysis Data
     */
    static async savePurchaseAnalysis(clientId, type, itemId, data) {
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

            doc.purchaseSummary = data.summary;
            doc.purchaseRows = data.rows;
            doc.lastUpdated = new Date();

            await doc.save();
            return doc;
        }
        throw new Error("Client not found");
    }

    /**
     * Get Purchase Analysis Data
     */
    static async getPurchaseAnalysis(clientId, type, itemId) {
        if (!clientId || !type || !itemId) {
            throw new Error("Missing required parameters: clientId, type, itemId");
        }

        const doc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
        
        if (!doc) {
            return null;
        }

        return {
            purchaseSummary: doc.purchaseSummary,
            purchaseRows: doc.purchaseRows,
            lastUpdated: doc.lastUpdated
        };
    }

    /**
     * Save analysis result to DB
     */
    static async saveAnalysisResult(clientId, type, itemId, result) {
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

            doc.summary = result.summary;
            doc.rows = result.summary.portal_summary;
            doc.lastUpdated = new Date();

            await doc.save();
        }
    }

    /**
     * Core Calculation Logic (Migrated from prepostValidator.js)
     */
    static calculatePrePost(salesFilePath, purchaseFilePath, outputDir) {
        // Safety checks
        if (!fs.existsSync(salesFilePath)) throw new Error("Sales/Base file not found");
        if (!fs.existsSync(purchaseFilePath)) throw new Error("Purchase file not found");

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // READ SALES FILE
        const salesWb = XLSX.readFile(salesFilePath);
        const salesSheet = salesWb.Sheets[salesWb.SheetNames[0]];
        const salesData = XLSX.utils.sheet_to_json(salesSheet, { range: 2, defval: 0 });

        const renameMap = {
            "Rigid Plastic \n(Cat I)": "Post Cat I",
            "Flexible Plastic \n(Cat II)": "Post Cat II",
            "Multilayered Plastic \n(Cat III)": "Post Cat III",
            "Compostable Plastic\n(Cat IV)": "Post Cat IV",
            "Rigid Plastic \n(Cat I).1": "Pre Cat I",
            "Flexible Plastic \n(Cat II).1": "Pre Cat II",
            "Multilayered Plastic \n(Cat III).1": "Pre Cat III",
            "Compostable Plastic\n(Cat IV).1": "Pre Cat IV",
            "Rigid Plastic \n(Cat I).2": "Exp Cat I",
            "Flexible Plastic \n(Cat II).2": "Exp Cat II",
            "Multilayered Plastic \n(Cat III).2": "Exp Cat III",
            "Compostable Plastic\n(Cat IV).2": "Exp Cat IV",
        };

        const salesProcessed = salesData.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.trim();
                const mappedKey = renameMap[cleanKey] || cleanKey;
                newRow[mappedKey] = row[key];
            });
            return newRow;
        }).slice(1);

        const sumCol = (data, colName) => data.reduce((sum, row) => sum + (parseFloat(row[colName]) || 0), 0);

        const categories = {
            "Cat-I":  ["Pre Cat I",  "Post Cat I",  "Exp Cat I"],
            "Cat-II": ["Pre Cat II", "Post Cat II", "Exp Cat II"],
            "Cat-III":["Pre Cat III","Post Cat III","Exp Cat III"],
            "Cat-IV": ["Pre Cat IV", "Post Cat IV", "Exp Cat IV"],
        };

        const salesRows = [];
        Object.keys(categories).forEach(cat => {
            const [preCol, postCol, expCol] = categories[cat];
            const pre = sumCol(salesProcessed, preCol);
            const post = sumCol(salesProcessed, postCol);
            const exp = sumCol(salesProcessed, expCol);

            salesRows.push({
                "Category of Plastic": cat,
                "Pre Consumer": parseFloat(pre.toFixed(4)),
                "Post Consumer": parseFloat(post.toFixed(4)),
                "Export": parseFloat(exp.toFixed(4)),
                "Total Consumption": parseFloat((pre + post + exp).toFixed(4))
            });
        });

        // READ & CLEAN PURCHASE FILE
        const purchaseWb = XLSX.readFile(purchaseFilePath);
        const purchaseData = XLSX.utils.sheet_to_json(purchaseWb.Sheets[purchaseWb.SheetNames[0]]);

        const normalizeCategory = (val) => {
            if (!val) return null;
            const v = String(val).toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
            const map = { "CATI": "Cat-I", "CATII": "Cat-II", "CATIII": "Cat-III", "CATIV": "Cat-IV" };
            return map[v] || null;
        };
        
        const extractCategory = (val) => {
            if (!val) return null;
            const match = String(val).match(/(Cat\s*[IVX]+)/i);
            return match ? normalizeCategory(match[0]) : null;
        };

        const purchaseAgg = {};
        purchaseData.forEach(row => {
            const cat = extractCategory(row["Category of Plastic"]);
            if (cat) {
                const qty = parseFloat(row["Total Plastic Qty (Tons)"]) || 0;
                purchaseAgg[cat] = (purchaseAgg[cat] || 0) + qty;
            }
        });

        // Merge Sales + Purchase
        const finalData = salesRows.map(row => {
            const cat = row["Category of Plastic"];
            const totalPurchase = purchaseAgg[cat] || 0;
            const totalConsumption = row["Total Consumption"];
            
            let diffPct = 0;
            if (totalPurchase > 0) {
                diffPct = ((totalConsumption / totalPurchase) - 1) * 100;
            }

            return {
                "Category of Plastic": cat,
                "Total Purchase": parseFloat(totalPurchase.toFixed(4)),
                "Pre Consumer": row["Pre Consumer"],
                "Post Consumer": row["Post Consumer"],
                "Export": row["Export"],
                "Total Consumption": totalConsumption,
                "Difference (%)": parseFloat(diffPct.toFixed(2))
            };
        });

        // Total Row
        const totalRow = {
            "Category of Plastic": "Total",
            "Total Purchase": 0, "Pre Consumer": 0, "Post Consumer": 0, "Export": 0, "Total Consumption": 0, "Difference (%)": 0
        };

        finalData.forEach(row => {
            totalRow["Total Purchase"] += row["Total Purchase"];
            totalRow["Pre Consumer"] += row["Pre Consumer"];
            totalRow["Post Consumer"] += row["Post Consumer"];
            totalRow["Export"] += row["Export"];
            totalRow["Total Consumption"] += row["Total Consumption"];
        });

        if (totalRow["Total Purchase"] > 0) {
            totalRow["Difference (%)"] = ((totalRow["Total Consumption"] / totalRow["Total Purchase"]) - 1) * 100;
        }

        // Rounding
        ["Total Purchase", "Pre Consumer", "Post Consumer", "Export", "Total Consumption"].forEach(k => {
            totalRow[k] = parseFloat(totalRow[k].toFixed(4));
        });
        totalRow["Difference (%)"] = parseFloat(totalRow["Difference (%)"].toFixed(2));

        finalData.push(totalRow);

        // Export Output File
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
        const outputFileName = `Pre_Post_Check_${timestamp}.xlsx`;
        const outputFile = path.join(outputDir, outputFileName);

        const newWb = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(finalData);
        XLSX.utils.book_append_sheet(newWb, sheet, "Sheet1");
        XLSX.writeFile(newWb, outputFile);

        return {
            output_file: outputFile,
            total_rows: finalData.length,
            summary: {
                difference_percent: totalRow["Difference (%)"],
                total_purchase: totalRow["Total Purchase"],
                total_consumption: totalRow["Total Consumption"],
                portal_summary: finalData
            }
        };
    }
}

export default AnalysisService;
