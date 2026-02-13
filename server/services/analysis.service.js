import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import PlasticAnalysisModel from '../models/plasticAnalysis.model.js';
import ProductComplianceModel from '../models/productCompliance.model.js';
import SkuComplianceModel from '../models/skuCompliance.model.js';
import ClientModel from '../models/client.model.js';
import PWPModel from '../models/pwp.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalysisService {
    
    /**
     * Run Pre/Post Validation Analysis and save results
     */
    static async runPlasticAnalysis(salesFilePath, purchaseFilePath, outputDir, context = {}) {
        const { clientId, type, itemId } = context;

        // 1. Run the Calculation Logic (formerly runPrePostValidation)
        const result = await this.calculatePrePost(salesFilePath, purchaseFilePath, outputDir, { clientId, type, itemId });

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
    static async calculatePrePost(salesFilePath, purchaseFilePath, outputDir, context = {}) {
        const { clientId, type, itemId } = context;
        // Safety checks
        if (!fs.existsSync(salesFilePath)) throw new Error("Sales/Base file not found");
        
        // Purchase file is now optional (especially for Producers)
        const hasPurchaseFile = purchaseFilePath && fs.existsSync(purchaseFilePath);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // READ SALES FILE
        const salesWb = XLSX.readFile(salesFilePath);
        const salesSheet = salesWb.Sheets[salesWb.SheetNames[0]];
        // Use raw: false to ensure we get strings for things like years if they are formatted as such
        const salesDataRaw = XLSX.utils.sheet_to_json(salesSheet, { defval: 0, raw: false });

        // Normalize keys (trim whitespace)
        const salesData = salesDataRaw.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                newRow[key.trim()] = row[key];
            });
            return newRow;
        });

        const salesAgg = {
            "Cat-I": { pre: 0, post: 0, exp: 0 },
            "Cat-II": { pre: 0, post: 0, exp: 0 },
            "Cat-III": { pre: 0, post: 0, exp: 0 },
            "Cat-IV": { pre: 0, post: 0, exp: 0 }
        };

        const normalizeSalesCategory = (val) => {
            if (!val) return null;
            const v = String(val).toUpperCase();
            
            // Priority matching for Roman Numerals (IV > III > II > I)
            if (v.includes("IV") || v.includes("CAT-IV") || v.includes("CAT IV") || v.includes("CATEGORY IV")) return "Cat-IV";
            if (v.includes("III") || v.includes("CAT-III") || v.includes("CAT III") || v.includes("CATEGORY III")) return "Cat-III";
            if (v.includes("II") || v.includes("CAT-II") || v.includes("CAT II") || v.includes("CATEGORY II")) return "Cat-II";
            
            // Cat I variations
            if (v.includes("CAT-I") || v.includes("CAT I") || v.includes("CATEGORY I") || (v.includes("I") && v.includes("CONTAINER"))) return "Cat-I";

            // Specific Keywords
            if (v.includes("RIGID")) return "Cat-I";
            if (v.includes("FLEXIBLE")) return "Cat-II";
            if (v.includes("MULTI")) return "Cat-III";
            if (v.includes("COMPOSTABLE")) return "Cat-IV";
            
            // Fallback for standalone I
            if (/\bI\b/.test(v) || /CAT.*I/.test(v)) return "Cat-I";

            return null;
        };

        // For Year-wise Target Calculation
        const yearlyAgg = {};
        
        salesData.forEach(row => {
            const catRaw = row["Category of Plastic"];
            const cat = normalizeSalesCategory(catRaw);
            
            if (cat) {
                const pre = parseFloat(row["Pre Consumer Waste Plastic Quantity (TPA)"]) || 0;
                const post = parseFloat(row["Post Consumer Waste Plastic Quantity (TPA)"]) || 0;
                const exp = parseFloat(row["Export Quantity Plastic Quantity (TPA)"]) || 0;
                const total = pre + post + exp;

                // Overall aggregation
                if (salesAgg[cat]) {
                    salesAgg[cat].pre += pre;
                    salesAgg[cat].post += post;
                    salesAgg[cat].exp += exp;
                }

                // Yearly aggregation
                const year = row["Year"];
                if (year) {
                    if (!yearlyAgg[cat]) yearlyAgg[cat] = {};
                    yearlyAgg[cat][year] = (yearlyAgg[cat][year] || 0) + total;
                }
            }
        });

        // Calculate Target Tables
        const years = Array.from(new Set(salesData.map(r => r["Year"]).filter(y => y))).sort();
        const targetTables = [];

        // We need at least 3 years to generate 2 target tables as requested
        // Or if we have years: Y1, Y2, Y3
        // Table 1: Y1, Y2, Avg(Y1,Y2) -> Target Y3
        // Table 2: Y2, Y3, Avg(Y2,Y3) -> Target Y4 (projected)
        
        // Fetch Client Data to check if Producer
        let clientDoc = null;
        if (clientId) {
            clientDoc = await ClientModel.findById(clientId);
            if (!clientDoc) clientDoc = await PWPModel.findById(clientId);
        }
        const isProducer = clientDoc?.entityType === "Producer";

        // Fetch Sales Analysis Data for Registered Sales (if needed)
        let salesAnalysisDoc = null;
        if (clientId && type && itemId) {
            salesAnalysisDoc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
        }

        // Helper to get registered sales from DB for a specific year & category
        const getRegisteredSales = (cat, year) => {
            if (!salesAnalysisDoc || !salesAnalysisDoc.salesRows) return 0;
            
            // Normalize Category for matching
            const targetCat = normalizeSalesCategory(cat);
            if (!targetCat) return 0;

            const row = salesAnalysisDoc.salesRows.find(r => {
                const rCat = normalizeSalesCategory(r.plasticCategory);
                const rYear = r.financialYear;
                const rType = (r.registrationType || '').toLowerCase();
                return rCat === targetCat && rYear === year && rType.includes('registered') && !rType.includes('unregistered');
            });

            return row ? parseFloat(row.totalPlasticQty) || 0 : 0;
        };

        if (years.length >= 2) {
            for (let i = 0; i < years.length - 1; i++) {
                const year1 = years[i];
                const year2 = years[i+1];
                const targetYear = years[i+2] || this.getNextFinancialYear(year2);

                const tableData = Object.keys(salesAgg).map(cat => {
                    const val1 = yearlyAgg[cat]?.[year1] || 0;
                    const val2 = yearlyAgg[cat]?.[year2] || 0;
                    const avg = (val1 + val2) / 2;
                    
                    let targetVal = avg;
                    let registeredSales = 0;

                    // Producer Logic
                    if (isProducer) {
                        // For Producer: Target = Avg - Registered Sales (Year 2)
                        // Registered Sales data fetched from Sales Analysis DB
                        registeredSales = getRegisteredSales(cat, year2);
                        targetVal = avg - registeredSales;
                    }

                    const row = {
                        "Category of Plastic": cat,
                        [year1]: parseFloat(val1.toFixed(4)),
                        [year2]: parseFloat(val2.toFixed(4)),
                        "Avg": parseFloat(avg.toFixed(4)),
                    };

                    if (isProducer) {
                        row[`Registered Sales (${year2})`] = parseFloat(registeredSales.toFixed(4));
                    }

                    row[`Target ${targetYear}`] = parseFloat(targetVal.toFixed(4));
                    return row;
                });
                
                const columns = ["Category of Plastic", year1, year2, "Avg"];
                if (isProducer) columns.push(`Registered Sales (${year2})`);
                columns.push(`Target ${targetYear}`);

                targetTables.push({
                    title: `Target Calculation for ${targetYear} (${isProducer ? 'Producer' : 'Brand Owner/Importer'})`,
                    columns: columns,
                    data: tableData
                });
            }
        }

        const salesRows = Object.keys(salesAgg).map(cat => {
            const { pre, post, exp } = salesAgg[cat];
            return {
                "Category of Plastic": cat,
                "Pre Consumer": parseFloat(pre.toFixed(4)),
                "Post Consumer": parseFloat(post.toFixed(4)),
                "Export": parseFloat(exp.toFixed(4)),
                "Total Consumption": parseFloat((pre + post + exp).toFixed(4))
            };
        });

        // READ & CLEAN PURCHASE FILE (Optional)
        const purchaseAgg = {};
        
        if (hasPurchaseFile) {
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

            purchaseData.forEach(row => {
                const cat = extractCategory(row["Category of Plastic"]);
                if (cat) {
                    const qty = parseFloat(row["Total Plastic Qty (Tons)"]) || 0;
                    purchaseAgg[cat] = (purchaseAgg[cat] || 0) + qty;
                }
            });
        }

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
        
        // Append Target Tables to Excel
        targetTables.forEach((tbl, idx) => {
            const ws = XLSX.utils.json_to_sheet(tbl.data);
            XLSX.utils.book_append_sheet(newWb, ws, `Target_${idx+1}`);
        });

        XLSX.writeFile(newWb, outputFile);

        return {
            output_file: outputFile,
            total_rows: finalData.length,
            summary: {
                difference_percent: totalRow["Difference (%)"],
                total_purchase: totalRow["Total Purchase"],
                total_consumption: totalRow["Total Consumption"],
                portal_summary: finalData,
                target_tables: targetTables
            }
        };
    }

    static getNextFinancialYear(fy) {
        if (!fy) return "Unknown";
        // Assuming format "YYYY-YY" e.g., "2024-25"
        const parts = fy.split('-');
        if (parts.length === 2) {
            const startYear = parseInt(parts[0]);
            const endYear = parseInt(parts[1]);
            if (!isNaN(startYear) && !isNaN(endYear)) {
                // Handle 2 digit end year logic if needed, but simple increment works for "2024" -> "2025"
                const nextStart = startYear + 1;
                const nextEnd = endYear + 1;
                return `${nextStart}-${nextEnd}`;
            }
        }
        return `${fy} (Next)`;
    }

    /**
     * Generate Auditor Insights based on aggregated data
     */
    static generateAuditorInsights(salesSummary, purchaseSummary, prePostSummary, targetTables) {
        const insights = {
            validation: [],
            targets: [],
            sales: [],
            purchase: []
        };

        // 1. Validation Insights
        const highDiffCats = prePostSummary.filter(row => Math.abs(row.difference) > 10);
        if (highDiffCats.length > 0) {
            const cats = highDiffCats.map(c => c.category).join(', ');
            insights.validation.push(`Critical discrepancies (>10%) detected in: ${cats}. Immediate reconciliation of inventory logs and process loss data is recommended.`);
        } else {
            insights.validation.push("All categories are within the acceptable 10% variance threshold. Consumption data aligns well with procurement records.");
        }
        
        const totalPurchase = prePostSummary.reduce((sum, r) => sum + (parseFloat(r.purchase) || 0), 0);
        const totalConsumption = prePostSummary.reduce((sum, r) => sum + (parseFloat(r.consumption) || 0), 0);
        if (totalPurchase > 0) {
            const diff = ((totalConsumption - totalPurchase) / totalPurchase) * 100;
            insights.validation.push(`Overall mass balance shows a ${Math.abs(diff).toFixed(2)}% ${diff > 0 ? 'surplus' : 'deficit'} (Purchase: ${totalPurchase.toFixed(2)} MT vs Consumption: ${totalConsumption.toFixed(2)} MT).`);
        }

        // 2. Target Insights
        if (targetTables.length > 0) {
            const latestTable = targetTables[targetTables.length - 1];
            const targetYear = latestTable.title.match(/Target Calculation for (\d{4}-\d{2}|\d{4})/)?.[1] || "Next Year";
            
            // Calculate total target for that year
            let totalTarget = 0;
            latestTable.data.forEach(row => {
                 // The last column is the target
                 const keys = Object.keys(row);
                 const targetKey = keys.find(k => k.includes("Target"));
                 if (targetKey) totalTarget += (parseFloat(row[targetKey]) || 0);
            });
            
            insights.targets.push(`Projected EPR obligation for ${targetYear} is approximately ${totalTarget.toFixed(2)} MT based on current averages.`);
            insights.targets.push("Targets are calculated using the average of the last two financial years, adjusted for registered sales (if applicable for Producers).");
        }

        // 3. Sales Insights
        const salesTotalRow = salesSummary.data.find(r => r.category === 'Total');
        if (salesTotalRow) {
            const reg = parseFloat(salesTotalRow.regTotal) || 0;
            const unreg = parseFloat(salesTotalRow.unregTotal) || 0;
            const total = reg + unreg;
            
            if (total > 0) {
                const regPct = ((reg / total) * 100).toFixed(1);
                insights.sales.push(`Total Sales Volume: ${total.toFixed(2)} MT. Registered Sales account for ${regPct}% of total volume.`);
                if (parseFloat(regPct) < 50) {
                    insights.sales.push("High volume of unregistered sales detected. Recommendation: Verify invoicing protocols for unregistered buyers.");
                }
            }
        }

        // 4. Purchase Insights
        const purchaseTotalRow = purchaseSummary.data.find(r => r.category === 'Total');
        if (purchaseTotalRow) {
            const reg = parseFloat(purchaseTotalRow.regTotal) || 0;
            const unreg = parseFloat(purchaseTotalRow.unregTotal) || 0;
            const total = reg + unreg;
            
            if (total > 0) {
                const unregPct = ((unreg / total) * 100).toFixed(1);
                insights.purchase.push(`Total Procurement: ${total.toFixed(2)} MT. Unregistered procurement stands at ${unregPct}%.`);
                if (parseFloat(unregPct) > 20) {
                    insights.purchase.push("Significant reliance on unregistered suppliers. Risk of non-compliance with sourcing norms.");
                }
            }
        }

        return {
            validation: insights.validation.join(' '),
            targets: insights.targets.join(' '),
            sales: insights.sales.join(' '),
            purchase: insights.purchase.join(' ')
        };
    }

    /**
     * Generate Plastic Compliance Report PDF
     */
    static async generatePlasticComplianceReport(clientId, type, itemId, userId) {
        console.log(`[Report Generation] Starting for Client: ${clientId}, Type: ${type}, ItemId: ${itemId}`);

        // Register Handlebars helpers
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });
        handlebars.registerHelper('add', function (a, b) {
            return a + b;
        });
        handlebars.registerHelper('length', function (a) {
            return a ? a.length : 0;
        });
        handlebars.registerHelper('concat', function (a, b) {
            return a + b;
        });
        handlebars.registerHelper('ne', function (a, b) {
            return a !== b;
        });

        // 1. Fetch Client & Audit Details
        // Populate assignedTo (Auditor) and assignedManager
        let clientDoc = await ClientModel.findById(clientId).populate('assignedTo assignedManager');
        if (!clientDoc) clientDoc = await PWPModel.findById(clientId).populate('assignedTo');
        
        if (!clientDoc) {
            console.error("[Report Generation] Client not found");
            throw new Error("Client not found");
        }
        console.log(`[Report Generation] Client found: ${clientDoc.name || clientDoc.clientName}`);

        // Logic to determine Auditor Name (assignedTo is usually the auditor/user working on it)
        const auditorName = clientDoc.assignedTo?.name || clientDoc.assignedTo?.username || "N/A";
        
        // Logic for Audit Date (auditEndDate or last update)
        const auditDateObj = clientDoc.auditEndDate || clientDoc.updatedAt;
        const auditDate = auditDateObj ? new Date(auditDateObj).toLocaleDateString() : new Date().toLocaleDateString();

        // 2. Fetch Analysis Data (Pre/Post & Targets)
        const analysisDoc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
        console.log(`[Report Generation] Analysis Doc found: ${!!analysisDoc}`);
        
        // Helper for date formatting
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';

        // Prepare Company Profile Data
        const companyProfile = {
            pan: clientDoc.companyDetails?.pan || '-',
            gst: clientDoc.companyDetails?.gst || '-',
            cin: clientDoc.companyDetails?.cin || '-',
            udyam: clientDoc.companyDetails?.udyamRegistration || '-',
            entityType: clientDoc.entityType || '-'
        };

        const formatAddress = (addr) => {
            if (!addr) return '-';
            const parts = [
                addr.addressLine1,
                addr.addressLine2,
                addr.city,
                addr.state,
                addr.pincode
            ].filter(Boolean);
            return parts.join(', ');
        };

        const addresses = {
            registered: formatAddress(clientDoc.registeredOfficeAddress),
            communication: formatAddress(clientDoc.communicationAddress)
        };

        const documents = (clientDoc.documents || []).map(doc => ({
            type: doc.documentType,
            number: doc.certificateNumber || '-',
            date: formatDate(doc.certificateDate)
        }));

        const productionFacility = clientDoc.productionFacility || {};
        const consents = {
            cte: (productionFacility.cteDetailsList || []).map(cte => ({
                consentNo: cte.consentNo || '-',
                issueDate: formatDate(cte.issuedDate),
                validUpto: formatDate(cte.validUpto)
            })),
            cto: (productionFacility.ctoDetailsList || []).map(cto => ({
                orderNo: cto.consentOrderNo || '-',
                issueDate: formatDate(cto.dateOfIssue),
                validUpto: formatDate(cto.validUpto)
            }))
        };
        
        // If no analysis exists, we might need to run it or return empty structure
        // ideally runPlasticAnalysis should have been called before.
        const summary = analysisDoc?.summary || {};
        const prePostSummary = summary.portal_summary || [];
        const targetTables = summary.target_tables || [];
        
        // Format Pre/Post Summary for Template
        const formattedPrePost = prePostSummary
            .filter(row => row["Category of Plastic"] !== "Total")
            .map(row => ({
                category: row["Category of Plastic"],
                purchase: row["Total Purchase"],
                consumption: row["Total Consumption"],
                difference: row["Difference (%)"],
                export: row["Export"],
                isHighDiff: Math.abs(row["Difference (%)"]) > 10 // Example threshold
            }));

        // 3. Fetch SKU Details (Grouped by Industry Category)
        const productComplianceDoc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        console.log(`[Report Generation] Product Compliance Doc found: ${!!productComplianceDoc}`);
        
        const allRows = productComplianceDoc?.rows || [];
        const componentDetails = productComplianceDoc?.componentDetails || [];
        const supplierCompliance = productComplianceDoc?.supplierCompliance || [];
        const procurementDetails = productComplianceDoc?.procurementDetails || [];
        
        // FIX: Initialize skuComplianceMap before usage
        const skuCompliance = productComplianceDoc?.skuCompliance || [];
        const skuComplianceMap = {};
        skuCompliance.forEach(item => {
            if (item.skuCode) {
                skuComplianceMap[item.skuCode] = item;
            }
        });

        const industryMap = {};

        // Helper to resolve image path
        const resolveImage = (img) => {
            if (!img) return null;
            if (img.startsWith('http')) return img;
            // Assuming local file, convert to absolute path for Puppeteer
            // If stored as "uploads/file.jpg", resolve relative to root
            const absolutePath = path.resolve(process.cwd(), img);
            // Convert to file URI or base64? File URI is safer for local puppeteer
            // But we need to make sure the file exists
            if (fs.existsSync(absolutePath)) {
                // Read file and convert to base64 to avoid permission issues with local file access in some envs
                try {
                    const bitmap = fs.readFileSync(absolutePath);
                    const base64 = Buffer.from(bitmap).toString('base64');
                    const ext = path.extname(absolutePath).substring(1);
                    return `data:image/${ext};base64,${base64}`;
                } catch (e) {
                    console.error("Error reading image file:", e);
                    return null;
                }
            }
            return null;
        };

        allRows.forEach(row => {
            const cat = row.industryCategory || 'General';
            if (!industryMap[cat]) industryMap[cat] = {}; // Changed to Object for SKU grouping
            
            const skuCode = row.skuCode || 'Unknown SKU';
            
            // Get Marking & Labeling Data
            const markingData = skuComplianceMap[skuCode] || {};

            if (!industryMap[cat][skuCode]) {
                industryMap[cat][skuCode] = {
                    skuCode: skuCode,
                    skuDescription: row.skuDescription || '-',
                    skuUom: row.skuUom || '-',
                    productImage: resolveImage(row.productImage),
                    markingDetails: {
                        brandOwner: markingData.brandOwner || '-',
                        eprCertBrandOwner: markingData.eprCertBrandOwner || '-',
                        eprCertProducer: markingData.eprCertProducer || '-',
                        thickness: markingData.thicknessMentioned || '-',
                        polymers: markingData.polymerUsed?.join(', ') || '-',
                        recycledPercent: markingData.recycledPercent || '-',
                        compostableRegNo: markingData.compostableRegNo || '-',
                        status: markingData.complianceStatus || 'Pending',
                        images: (markingData.markingImage || []).map(img => resolveImage(img)).filter(Boolean)
                    },
                    components: []
                };
            }

            // Look up details
            const compCode = (row.componentCode || '').trim();
            const compDetail = componentDetails.find(c => (c.componentCode || '').trim() === compCode) || {};
            const suppComp = supplierCompliance.find(s => (s.componentCode || '').trim() === compCode) || {};
            
            // Aggregate Procurement Data
            const procRecords = procurementDetails.filter(p => (p.componentCode || '').trim() === compCode);
            const totalMonthlyPurchaseMt = procRecords.reduce((sum, p) => sum + (p.monthlyPurchaseMt || 0), 0);
            const totalRecycledQty = procRecords.reduce((sum, p) => sum + (p.recycledQty || 0), 0);

            // Resolve Component Image
            const componentImgSrc = resolveImage(row.componentImage);

            industryMap[cat][skuCode].components.push({
                componentCode: compCode || '-',
                componentImage: componentImgSrc,
                componentDescription: row.componentDescription || '-',
                supplierName: row.supplierName || suppComp.supplierName || '-',
                supplierStatus: suppComp.supplierStatus || '-',
                eprCertificateNumber: suppComp.eprCertificateNumber || '-',
                polymerType: row.polymerType || compDetail.polymerType || '-',
                componentPolymer: row.componentPolymer || compDetail.componentPolymer || '-',
                // The user specifically wants "Category I", "Category II", etc.
                // This data is usually in 'industryCategory' (but that was the grouping key "Food & Beverage")
                // OR 'category' (which might be "Cat-I", "Cat I", "Category I").
                // OR 'packagingType' might contain it?
                // Looking at the schema:
                // row.industryCategory -> "Food & Beverage"
                // row.category -> likely "Cat-I" or "Category I" if present in compDetail.
                // compDetail.category -> "Cat-I"
                // Let's check where "Category I/II/III" is stored.
                // In productCompliance.model.js, componentRowSchema has 'category'.
                // The previous fix used `row.packagingType || row.category || compDetail.category`.
                // If the user says it is showing "Wrong", it means it's showing "Food & Beverage" (industryCategory) or something else.
                // I will prioritize compDetail.category which usually holds the Roman Numeral category.
                category: compDetail.category || row.category || '-', 
                categoryIIType: compDetail.categoryIIType || '-',
                containerCapacity: compDetail.containerCapacity || '-',
                layerType: compDetail.layerType || '-',
                thickness: compDetail.thickness || '-',
                monthlyPurchaseMt: totalMonthlyPurchaseMt.toFixed(4),
                recycledQty: totalRecycledQty.toFixed(4),
                status: row.componentComplianceStatus || row.complianceStatus || 'Pending',
                auditorRemarks: row.auditorRemarks || '-'
            });
        });

        const industryCategories = Object.keys(industryMap).map(cat => {
            const skus = Object.values(industryMap[cat]);
            
            // Category Summary Stats
            const totalSkus = skus.length;
            const totalMonthlyPurchase = skus.reduce((sum, sku) => 
                sum + sku.components.reduce((cSum, c) => cSum + parseFloat(c.monthlyPurchaseMt || 0), 0)
            , 0);
            
            const allComponents = skus.flatMap(s => s.components);
            const compliantCount = allComponents.filter(c => c.status === 'Compliant').length;
            const nonCompliantCount = allComponents.filter(c => c.status === 'Non-Compliant').length;
            const pendingCount = allComponents.filter(c => c.status !== 'Compliant' && c.status !== 'Non-Compliant').length;

            return {
                name: cat,
                skus: skus,
                summary: {
                    totalSkus,
                    totalMonthlyPurchase: totalMonthlyPurchase.toFixed(4),
                    compliantCount,
                    nonCompliantCount,
                    pendingCount,
                    complianceScore: allComponents.length > 0 ? ((compliantCount / allComponents.length) * 100).toFixed(1) : 0
                }
            };
        });

        // 3.1 Prepare Marking & Labeling Report Data (From SkuComplianceModel)
        const skuComplianceDocs = await SkuComplianceModel.find({ client: clientId });
        
        // Filter out SKUs that are not present in Product Compliance Rows and maintain their order
        const validSkuCodes = [...new Set(allRows.map(r => (r.skuCode || '').trim()).filter(Boolean))];
        
        const markingLabelingData = skuComplianceDocs
            .filter(doc => validSkuCodes.includes((doc.skuCode || '').trim())) // Filter logic
            .sort((a, b) => {
                const skuA = (a.skuCode || '').trim();
                const skuB = (b.skuCode || '').trim();
                return validSkuCodes.indexOf(skuA) - validSkuCodes.indexOf(skuB);
            })
            .map((doc, index) => {
                 return {
                     index: index + 1,
                     skuCode: doc.skuCode || '-',
                     skuDescription: doc.skuDescription || '-',
                     skuUom: doc.skuUm || '-',
                     productImage: resolveImage(doc.productImage),
                     brandOwner: doc.brandOwner || '-',
                     eprCertBrandOwner: doc.eprCertBrandOwner || '-',
                     eprCertProducer: doc.eprCertProducer || '-',
                     thicknessMentioned: doc.thicknessMentioned || '-',
                     polymerUsed: Array.isArray(doc.polymerUsed) ? doc.polymerUsed.join(', ') : (doc.polymerUsed || '-'),
                     recycledPercent: doc.recycledPercent || '-',
                     compostableRegNo: doc.compostableRegNo || '-',
                     markingImages: (doc.markingImage || []).map(img => resolveImage(img)).filter(Boolean),
                     auditorRemarks: Array.isArray(doc.remarks) ? doc.remarks.join('\n') : (doc.remarks || '-'),
                     complianceRemarks: Array.isArray(doc.complianceRemarks) ? doc.complianceRemarks.join('\n') : (doc.complianceRemarks || '-'),
                     complianceStatus: doc.complianceStatus || 'Pending'
                 };
        });

        // 4. Calculate Sales & Purchase Summary (Registered vs Unregistered)
        const normalizeCategory = (val) => {
            if (!val) return null;
            const v = String(val).toUpperCase();
            
            // Priority matching for Roman Numerals (IV > III > II > I) to avoid subset matching
            if (v.includes("IV") || v.includes("CAT-IV") || v.includes("CAT IV") || v.includes("CATEGORY IV")) return "Cat-IV";
            if (v.includes("III") || v.includes("CAT-III") || v.includes("CAT III") || v.includes("CATEGORY III")) return "Cat-III";
            if (v.includes("II") || v.includes("CAT-II") || v.includes("CAT II") || v.includes("CATEGORY II")) return "Cat-II";
            
            // Check for Cat I variations, including "Cat I (Containers...)"
            if (v.includes("CAT-I") || v.includes("CAT I") || v.includes("CATEGORY I") || (v.includes("I") && v.includes("CONTAINER"))) return "Cat-I";
            
            // Fallback: Check if it just contains "I" but ensure it's not part of II, III, IV (already checked above)
            // This handles cases like "Cat I" where Roman I is distinct
            // Using regex to ensure 'I' is a standalone word or at end of string
            if (/\bI\b/.test(v) || /CAT.*I/.test(v)) return "Cat-I";

            return null;
        };

        // --- Sales Summary Aggregation ---
        const salesDataRaw = analysisDoc?.salesRows || [];
        const salesAgg = {
            "Cat-I": { registered: {}, unregistered: {} },
            "Cat-II": { registered: {}, unregistered: {} },
            "Cat-III": { registered: {}, unregistered: {} },
            "Cat-IV": { registered: {}, unregistered: {} }
        };
        const salesYears = new Set();

        // Ensure we catch years even if they are numbers
        salesDataRaw.forEach(row => {
            const cat = normalizeCategory(row.plasticCategory);
            if (cat && salesAgg[cat]) {
                // Handle various year formats: "2023-24", "2023", 2023
                let year = row.financialYear || 'Unknown';
                if (typeof year === 'number') year = String(year);
                
                if (year !== 'Unknown') salesYears.add(year);
                
                const type = (row.registrationType || 'unregistered').toLowerCase();
                const isRegistered = type.includes('registered') && !type.includes('unregistered');
                const qty = parseFloat(row.totalPlasticQty || 0);

                const targetObj = isRegistered ? salesAgg[cat].registered : salesAgg[cat].unregistered;
                targetObj[year] = (targetObj[year] || 0) + qty;
                targetObj.total = (targetObj.total || 0) + qty;
            }
        });

        // Default years if none found (fallback to current FY logic)
        if (salesYears.size === 0) {
            const currentYear = new Date().getFullYear();
            salesYears.add(`${currentYear-1}-${String(currentYear).slice(2)}`);
            salesYears.add(`${currentYear}-${String(currentYear+1).slice(2)}`);
        }

        const sortedSalesYears = Array.from(salesYears).sort(); // Sort chronological
        // Show ALL available years instead of slicing last 2
        const displaySalesYears = sortedSalesYears; 

        const salesSummaryTable = Object.keys(salesAgg).map(cat => {
            const reg = salesAgg[cat].registered;
            const unreg = salesAgg[cat].unregistered;
            
            const row = {
                category: cat,
                regTotal: (reg.total || 0).toFixed(2),
                unregTotal: (unreg.total || 0).toFixed(2)
            };

            // Dynamic Year Columns
            displaySalesYears.forEach((year, idx) => {
                row[`regY${idx+1}`] = (reg[year] || 0).toFixed(2);
                row[`unregY${idx+1}`] = (unreg[year] || 0).toFixed(2);
            });
            
            return row;
        });

        // Add Total Row for Sales
        const salesTotalRow = salesSummaryTable.reduce((acc, row) => {
            displaySalesYears.forEach((_, idx) => {
                acc[`regY${idx+1}`] = (parseFloat(acc[`regY${idx+1}`] || 0) + parseFloat(row[`regY${idx+1}`] || 0)).toFixed(2);
                acc[`unregY${idx+1}`] = (parseFloat(acc[`unregY${idx+1}`] || 0) + parseFloat(row[`unregY${idx+1}`] || 0)).toFixed(2);
            });
            acc.regTotal = (parseFloat(acc.regTotal) + parseFloat(row.regTotal)).toFixed(2);
            acc.unregTotal = (parseFloat(acc.unregTotal) + parseFloat(row.unregTotal)).toFixed(2);
            return acc;
        }, { category: 'Total', regTotal: '0.00', unregTotal: '0.00' });
        salesSummaryTable.push(salesTotalRow);


        // --- Purchase Summary Aggregation ---
        const purchaseDataRaw = analysisDoc?.purchaseRows || [];
        const purchaseAgg = {
            "Cat-I": { registered: {}, unregistered: {} },
            "Cat-II": { registered: {}, unregistered: {} },
            "Cat-III": { registered: {}, unregistered: {} },
            "Cat-IV": { registered: {}, unregistered: {} }
        };
        const purchaseYears = new Set();

        purchaseDataRaw.forEach(row => {
            // Fix: Check both 'category' and 'plasticCategory' keys
            const rawCat = row.plasticCategory || row.category;
            const cat = normalizeCategory(rawCat); 
            
            if (cat && purchaseAgg[cat]) {
                let year = row.financialYear || 'Unknown';
                if (typeof year === 'number') year = String(year);

                if (year !== 'Unknown') purchaseYears.add(year);
                
                const type = (row.registrationType || 'unregistered').toLowerCase();
                const isRegistered = type.includes('registered') && !type.includes('unregistered');
                // Fix: Check both 'purchaseQty' and 'totalPlasticQty' keys
                const qty = parseFloat(row.totalPlasticQty || row.purchaseQty || 0); 

                const targetObj = isRegistered ? purchaseAgg[cat].registered : purchaseAgg[cat].unregistered;
                targetObj[year] = (targetObj[year] || 0) + qty;
                targetObj.total = (targetObj.total || 0) + qty;
            }
        });

        if (purchaseYears.size === 0) {
            const currentYear = new Date().getFullYear();
            purchaseYears.add(`${currentYear-1}-${String(currentYear).slice(2)}`);
            purchaseYears.add(`${currentYear}-${String(currentYear+1).slice(2)}`);
        }

        const sortedPurchaseYears = Array.from(purchaseYears).sort();
        // Show ALL available years
        const displayPurchaseYears = sortedPurchaseYears;

        const purchaseSummaryTable = Object.keys(purchaseAgg).map(cat => {
            const reg = purchaseAgg[cat].registered;
            const unreg = purchaseAgg[cat].unregistered;
            
            const row = {
                category: cat,
                regTotal: (reg.total || 0).toFixed(2),
                unregTotal: (unreg.total || 0).toFixed(2)
            };

            displayPurchaseYears.forEach((year, idx) => {
                row[`regY${idx+1}`] = (reg[year] || 0).toFixed(2);
                row[`unregY${idx+1}`] = (unreg[year] || 0).toFixed(2);
            });
            
            return row;
        });

        // Add Total Row for Purchase
        const purchaseTotalRow = purchaseSummaryTable.reduce((acc, row) => {
            displayPurchaseYears.forEach((_, idx) => {
                acc[`regY${idx+1}`] = (parseFloat(acc[`regY${idx+1}`] || 0) + parseFloat(row[`regY${idx+1}`] || 0)).toFixed(2);
                acc[`unregY${idx+1}`] = (parseFloat(acc[`unregY${idx+1}`] || 0) + parseFloat(row[`unregY${idx+1}`] || 0)).toFixed(2);
            });
            acc.regTotal = (parseFloat(acc.regTotal) + parseFloat(row.regTotal)).toFixed(2);
            acc.unregTotal = (parseFloat(acc.unregTotal) + parseFloat(row.unregTotal)).toFixed(2);
            return acc;
        }, { category: 'Total', regTotal: '0.00', unregTotal: '0.00' });
        purchaseSummaryTable.push(purchaseTotalRow);

        // 5. Generate Auditor Insights
        const auditorInsights = this.generateAuditorInsights(
            { data: salesSummaryTable, years: displaySalesYears }, 
            { data: purchaseSummaryTable, years: displayPurchaseYears }, 
            formattedPrePost, 
            targetTables
        );

        // 6. Prepare Template Data
        // --- 1. Engagement Letter ---
        const engagementContent = clientDoc.validationDetails?.engagementLetterContent || 
            `AnantTattva Private Limited\nOffice No.12 & 14, Midas Building\nSahar Plaza JB Nagar,\nNext to J B Nagar Metro Chakala,\nAndheri East, Mumbai - 400059\ninfo@ananttattva.com\n\nDate:  ___ / ___ / 20__\n\nENGAGEMENT LETTER\nTo,\n${clientDoc.clientName}\n${clientDoc.companyDetails?.registeredAddress || '[Address]'}\n\nDear Sir / Madam,\nWe are pleased to confirm our engagement to conduct [Internal / Statutory / Compliance / EPR / GST] Audit of ${clientDoc.clientName} for the period [Audit Period].\nThe audit will be carried out on a test-check basis in accordance with applicable professional standards. Management is responsible for providing complete and accurate records and necessary information required for the audit.\nUpon completion, we shall issue an Audit Report containing our observations and recommendations, if any.\nAll information obtained during the audit shall be treated as confidential.\nOur professional fees shall be ₹ [Amount] plus applicable taxes, payable as agreed.\nKindly acknowledge your acceptance of this engagement by signing below.\n\nThanking you,\nYours faithfully,\nFor AnantTattva Private Limited\nAuthorized Signatory\nName: _______________\nDesignation: _________\n\nAccepted & Agreed\nFor ${clientDoc.clientName}\nSignature: _______________\nDate: ___________________`;

        // --- 2. Client Basic Info ---
        const basicInfo = {
            clientName: clientDoc.clientName,
            tradeName: clientDoc.tradeName || 'N/A',
            groupName: clientDoc.companyGroupName || 'N/A',
            entityType: (clientDoc.wasteType === 'E-Waste' || clientDoc.wasteType === 'E_WASTE') ? 
                (clientDoc.producerType || 'N/A') : clientDoc.entityType,
            wasteType: clientDoc.wasteType,
            authPerson: {
                name: clientDoc.authorisedPerson?.name || 'N/A',
                designation: clientDoc.authorisedPerson?.designation || '',
                number: clientDoc.authorisedPerson?.number || 'N/A',
                email: clientDoc.authorisedPerson?.email || 'N/A'
            },
            coordPerson: {
                name: clientDoc.coordinatingPerson?.name || 'N/A',
                number: clientDoc.coordinatingPerson?.number || 'N/A',
                email: clientDoc.coordinatingPerson?.email || 'N/A'
            }
        };

        // --- 3. Address Details ---
        const addressDetails = {
            registered: clientDoc.companyDetails?.registeredAddress || 'N/A',
            communication: clientDoc.notes || 'Same as Registered' // Matching ClientValidation.jsx logic
        };

        // --- 4. Documents & MSME ---
        const isEwaste = clientDoc.wasteType === 'E-Waste' || clientDoc.wasteType === 'E_WASTE';
        const requiredDocs = ['PAN', 'GST', 'CIN'];
        if (!isEwaste) {
            requiredDocs.push('Factory License', 'EPR Certificate');
        } else {
            requiredDocs.push('E-waste Registration');
            if (clientDoc.isImportingEEE === 'Yes' || clientDoc.isImportingEEE === true) {
                requiredDocs.push('EEE Import Authorization');
            }
        }
        
        const relevantDocs = (clientDoc.documents || [])
            .filter(d => d.documentType !== 'Engagement Letter' && requiredDocs.includes(d.documentType))
            .map(d => ({
                type: d.documentType,
                number: d.certificateNumber || 'N/A',
                date: formatDate(d.certificateDate),
                status: 'Uploaded'
            }));
            
        const msmeDetails = {
            status: clientDoc.validationDetails?.msmeDetails ? 'Verified' : 'Pending/NA',
            number: clientDoc.companyDetails?.msmeNumber || 'N/A',
            type: clientDoc.companyDetails?.enterpriseType || 'N/A',
            history: (clientDoc.msmeDetails || []).map(m => ({
                year: m.classificationYear || '-',
                status: m.status || '-',
                activity: m.majorActivity || '-',
                udyam: m.udyamNumber || '-',
                turnover: m.turnover || '-'
            }))
        };

        // --- 5. CTE & CTO/CCA Details ---
        const pf = clientDoc.productionFacility || {};
        const plantGroups = {};
        const normalize = (name) => name ? name.trim().toLowerCase() : '';

        const processPlantData = (list, keyName) => {
            (list || []).forEach(item => {
                const pName = item.plantName;
                if (!pName) return;
                const norm = normalize(pName);
                if (!plantGroups[norm]) {
                    plantGroups[norm] = { 
                        displayName: pName,
                        cteDetails: [], 
                        ctoDetails: []
                    };
                }
                plantGroups[norm][keyName].push(item);
            });
        };

        processPlantData(pf.cteDetailsList, 'cteDetails');
        processPlantData(pf.ctoDetailsList, 'ctoDetails');

        const sortedPlants = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        // Format Plant Data for Template
        const plants = sortedPlants.map((group) => ({
            name: group.displayName,
            cte: group.cteDetails.map(c => ({
                consentNo: c.consentNo || '-',
                issueDate: formatDate(c.issuedDate),
                validUpto: formatDate(c.validUpto),
                location: c.plantLocation || '-',
                address: c.plantAddress || '-',
                remark: c.verification?.remark || '-'
            })),
            cto: group.ctoDetails.map(c => ({
                type: c.ctoCaaType || '-',
                industryType: c.industryType || '-',
                category: c.category || '-',
                orderNo: c.consentOrderNo || '-',
                issueDate: formatDate(c.dateOfIssue),
                validUpto: formatDate(c.validUpto),
                location: c.plantLocation || '-',
                address: c.plantAddress || '-',
                remark: c.verification?.remark || '-'
            }))
        }));

        // Additional CTO Details
        const regs = Array.isArray(pf.regulationsCoveredUnderCto) ? pf.regulationsCoveredUnderCto : [];
        const additionalDetails = {
            investment: pf.totalCapitalInvestmentLakhs ?? '-',
            waterUsage: pf.groundWaterUsage || '-',
            cgwaNocReq: pf.cgwaNocRequirement || '-',
            regulations: regs.length ? regs.join(', ') : 'None',
            hasWater: regs.includes('Water'),
            hasAir: regs.includes('Air'),
            hasHazardous: regs.some(r => (r || '').toString().toLowerCase().includes('hazardous')),
            // Remarks for sections - Currently these are not part of the standard verification object structure in the loop above
            // Based on ClientAudit.jsx, verification is mainly on CTE/CTO items and Products. 
            // The additional details verification might not be fully implemented or follows a different path?
            // Checking ClientAudit.jsx, it seems verification is only for CTE, CTO and Products.
            // There is no explicit verification UI for "Additional Details" in the shared code snippet of ClientAudit.jsx.
            // However, sticking to the user's request for "Onsite Audit Verification" data.
            // If the user previously asked for remarks here, maybe they meant product remarks? 
            // But the previous code I wrote used `verificationRemarks['cto_additional_details']`.
            // Since ClientAudit.jsx doesn't seem to have verification for these global fields, I will default them to '-' 
            // or if there is a place I missed.
            // Re-reading ClientAudit.jsx... it has "Product Compliance Step" but that's a different tab.
            // The "Verification" tab has Plant Info, Contact Details, Consent Verification, Production Capacity & Products.
            // It does NOT have "Additional Details" verification.
            // So I will remove the specific remarks for these sub-sections to avoid confusion or showing undefined, 
            // OR I will leave them as '-' if not found.
            
            additionalRemark: '-',
            regulationsRemark: '-',
            waterRemark: '-',
            airRemark: '-',
            hazardousRemark: '-',
            
            waterRegs: (pf.waterRegulations || []).map((r, i) => ({
                sr: i + 1,
                desc: r.description || '-',
                qty: r.permittedQuantity || '-',
                uom: r.uom || '-'
            })),
            airRegs: (pf.airRegulations || []).map((r, i) => ({
                sr: i + 1,
                param: r.parameter || '-',
                limit: r.permittedLimit || '-',
                uom: r.uom || '-'
            })),
            hazardousRegs: (pf.hazardousWasteRegulations || []).map((r, i) => ({
                sr: i + 1,
                name: r.nameOfHazardousWaste || '-',
                disposal: r.facilityModeOfDisposal || '-',
                qty: r.quantityMtYr || '-',
                uom: r.uom || '-'
            }))
        };

        const templateData = {
            generatedDate: new Date().toLocaleString(),
            engagementContent,
            basicInfo,
            addressDetails,
            companyDocuments: relevantDocs,
            msmeDetails,
            plants,
            additionalDetails,
            industryCategories,
            markingLabelingData,
            // Phase 3: Summary Reports
            salesSummary: {
                years: displaySalesYears,
                data: salesSummaryTable
            },
            purchaseSummary: {
                years: displayPurchaseYears,
                data: purchaseSummaryTable
            },
            prePostSummary: formattedPrePost,
            targetTables: targetTables,
            auditorInsights
        };

        // 7. Render HTML
        const templatePath = path.join(__dirname, '../templates/plasticComplianceReport.hbs');
        console.log(`[Report Generation] Template Path: ${templatePath}`);
        
        if (!fs.existsSync(templatePath)) {
            console.error(`[Report Generation] Template file missing at ${templatePath}`);
            throw new Error(`Template file missing at ${templatePath}`);
        }

        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateHtml);
        const html = template(templateData);

        // 7. Generate PDF
        console.log("[Report Generation] Launching Puppeteer...");
        try {
            const browser = await puppeteer.launch({ 
                headless: true, // Updated for newer Puppeteer versions
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            const page = await browser.newPage();
            console.log("[Report Generation] Setting Content...");
            await page.setContent(html, { waitUntil: 'networkidle0' });
            console.log("[Report Generation] Printing PDF...");
            const pdfBuffer = await page.pdf({ 
                format: 'A4',
                landscape: true, // Changed to Landscape to fit wide tables
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });
            await browser.close();
            console.log("[Report Generation] PDF Generated Successfully");

            return pdfBuffer;
        } catch (puppeteerError) {
            console.error("[Report Generation] Puppeteer Error:", puppeteerError);
            throw new Error(`Puppeteer PDF generation failed: ${puppeteerError.message}`);
        }
    }
}

export default AnalysisService;
