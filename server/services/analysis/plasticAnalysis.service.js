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


class PlasticAnalysisService {

    
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
        const recycledPctAgg = {};
        
        salesData.forEach(row => {
            const catRaw = row["Category of Plastic"];
            const cat = normalizeSalesCategory(catRaw);
            
            if (cat) {
                const pre = parseFloat(row["Pre Consumer Waste Plastic Quantity (TPA)"]) || 0;
                const post = parseFloat(row["Post Consumer Waste Plastic Quantity (TPA)"]) || 0;
                const exp = parseFloat(row["Export Quantity Plastic Quantity (TPA)"]) || 0;
                const totalForTarget = pre + post;

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
                    yearlyAgg[cat][year] = (yearlyAgg[cat][year] || 0) + totalForTarget;

                    // Recycled Plastic % aggregation for Brand Owner targets
                    const preRec = parseFloat(row["Pre Consumer Waste Recycled Plastic %"]) || 0;
                    const postRec = parseFloat(row["Post Consumer Waste Recycled Plastic %"]) || 0;
                    const recycledSum = preRec + postRec;

                    if (!recycledPctAgg[cat]) recycledPctAgg[cat] = {};
                    recycledPctAgg[cat][year] = (recycledPctAgg[cat][year] || 0) + recycledSum;
                }
            }
        });

        // Calculate Target Tables
        const years = Array.from(new Set(salesData.map(r => r["Year"]).filter(y => y))).sort();
        const targetTables = [];
        const UREP_TARGET_MATRIX = {
            'Cat-I': {
                '2025-26': 30,
                '2026-27': 40,
                '2027-28': 50,
                '2028-29': 60,
            },
            'Cat-II': {
                '2025-26': 10,
                '2026-27': 10,
                '2027-28': 20,
                '2028-29': 20,
            },
            'Cat-III': {
                '2025-26': 5,
                '2026-27': 5,
                '2027-28': 10,
                '2028-29': 10,
            },
            'Cat-IV': {},
        };

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

        const getRegisteredSales = (cat, year) => {
            if (!salesAnalysisDoc || !salesAnalysisDoc.salesRows) return 0;
            
            const targetCat = normalizeSalesCategory(cat);
            if (!targetCat) return 0;

            const rows = salesAnalysisDoc.salesRows.filter(r => {
                const rCat = normalizeSalesCategory(r.plasticCategory);
                const rYear = r.financialYear;
                const rType = (r.registrationType || '').toLowerCase();
                const status = (r.uploadStatus || '').toString().trim().toLowerCase();
                const statusOk = !status || status === 'completed';
                return rCat === targetCat && rYear === year && rType.includes('registered') && !rType.includes('unregistered') && statusOk;
            });

            return rows.reduce((sum, r) => sum + (parseFloat(r.totalPlasticQty) || 0), 0);
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
                    let recycledPctYear2 = 0;
                    let recycledQtyYear2 = 0;

                    // Producer Logic
                    if (isProducer) {
                        // For Producer: Target = Avg - Registered Sales (Year 2)
                        // Registered Sales data fetched from Sales Analysis DB
                        registeredSales = getRegisteredSales(cat, year2);
                        targetVal = avg - registeredSales;
                    } else {
                        // Brand Owner: compute Recycled Plastic % from Pre/Post recycled columns
                        const sumPct = recycledPctAgg[cat]?.[year2] || 0;
                        recycledPctYear2 = sumPct;
                        recycledQtyYear2 = (avg * recycledPctYear2) / 100;
                    }

                    const row = {
                        "Category of Plastic": cat,
                        [year1]: parseFloat(val1.toFixed(4)),
                        [year2]: parseFloat(val2.toFixed(4)),
                        "Avg": parseFloat(avg.toFixed(4)),
                    };

                    if (isProducer) {
                        row[`Registered Sales (${year2})`] = parseFloat(registeredSales.toFixed(4));
                        row[`Target Of Virgin ${targetYear}`] = parseFloat(targetVal.toFixed(4));
                    } else {
                        row["Recycled Plastic %"] = parseFloat(recycledPctYear2.toFixed(2));
                        row["Recycled Qty"] = parseFloat(recycledQtyYear2.toFixed(4));
                        const targetForVirgin = avg - recycledQtyYear2;
                        row[`Target ${targetYear}`] = parseFloat(targetVal.toFixed(4));
                        row[`Target For Virgin (${targetYear})`] = parseFloat(targetForVirgin.toFixed(4));
                    }
                    return row;
                });
                
                const columns = ["Category of Plastic", year1, year2, "Avg"];
                if (isProducer) {
                    columns.push(`Registered Sales (${year2})`);
                    columns.push(`Target Of Virgin ${targetYear}`);
                } else {
                    columns.push("Recycled Plastic %");
                    columns.push("Recycled Qty");
                    columns.push(`Target ${targetYear}`);
                    columns.push(`Target For Virgin (${targetYear})`);
                }

                targetTables.push({
                    title: `Target Calculation for ${targetYear} (${isProducer ? 'Producer' : 'Brand Owner'})`,
                    columns: columns,
                    data: tableData
                });
            }
        }

        if (!isProducer && years.length > 0) {
            const activeYear = years[years.length - 1];
            const urepMandateColumnLabel = `Urep Target (FY ${activeYear} as per Mandate)`;
            const urepQtyColumnLabel = `Urep Target`;

            const categories = Object.keys(salesAgg);
            const urepData = categories.map(cat => {
                const catTargets = UREP_TARGET_MATRIX[cat] || {};
                const pct = catTargets[activeYear] !== undefined ? catTargets[activeYear] : 0;
                const baseQty = parseFloat((yearlyAgg[cat] && yearlyAgg[cat][activeYear]) || 0);
                const qty = (baseQty * pct) / 100;
                return {
                    "Category of Plastic": cat,
                    [urepMandateColumnLabel]: pct,
                    [urepQtyColumnLabel]: parseFloat(qty.toFixed(4)),
                };
            });

            const urepColumns = ["Category of Plastic", urepMandateColumnLabel, urepQtyColumnLabel];
            targetTables.push({
                title: `Urep Target for ${activeYear} (Brand Owner)`,
                columns: urepColumns,
                data: urepData,
            });
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

        const purchaseAgg = {};
        
        const normalizePurchaseCategory = normalizeSalesCategory;

        const getPurchaseCategory = (row) => {
            if (!row) return null;
            const keys = Object.keys(row);
            if (keys.length === 0) return null;

            const keyMap = {};
            keys.forEach(k => {
                if (!k) return;
                keyMap[k.trim().toLowerCase()] = k;
            });

            const candidateKeys = [
                'category of plastic',
                'plastic category',
                'category',
                'cat'
            ];

            let sourceKey = null;
            for (const norm of candidateKeys) {
                if (keyMap[norm]) {
                    sourceKey = keyMap[norm];
                    break;
                }
            }

            if (!sourceKey) {
                sourceKey =
                    keys.find(k => {
                        const lk = k.toLowerCase();
                        return lk.includes('category') && lk.includes('plastic');
                    }) ||
                    keys.find(k => k.toLowerCase().includes('category'));
            }

            return sourceKey ? row[sourceKey] : null;
        };

        const getPurchaseQty = (row) => {
            if (!row) return 0;

            const candidates = [
                'Total Plastic Qty (Tons)',
                'Total Plastic Qty',
                'Total Qty (Tons)',
                'totalPlasticQty',
                'totalQty',
                'Registered Qty (Tons)',
                'registeredQty',
                'Unregistered Qty (Tons)',
                'unregisteredQty',
                'Quantity',
                'total plastic qty (tons)',
                'total plastic qty',
                'quantity'
            ];

            for (const key of candidates) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    const val = parseFloat(row[key]);
                    if (!Number.isNaN(val)) return val;
                }
            }

            let sum = 0;
            Object.keys(row).forEach(k => {
                const value = row[k];
                if (typeof value === 'number' && k.toLowerCase().includes('qty')) {
                    sum += value;
                }
            });

            return sum;
        };

        if (hasPurchaseFile) {
            const purchaseWb = XLSX.readFile(purchaseFilePath);
            const purchaseSheet = purchaseWb.Sheets[purchaseWb.SheetNames[0]];
            const purchaseDataRaw = XLSX.utils.sheet_to_json(purchaseSheet, { defval: 0, raw: false });

            const purchaseData = purchaseDataRaw.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    if (!key) return;
                    const trimmed = key.trim();
                    newRow[trimmed] = row[key];
                    newRow[trimmed.toLowerCase()] = row[key];
                });
                return newRow;
            });

            purchaseData.forEach(row => {
                const catRaw = getPurchaseCategory(row);
                const cat = normalizePurchaseCategory(catRaw);
                if (!cat) return;

                const qty = getPurchaseQty(row);
                purchaseAgg[cat] = (purchaseAgg[cat] || 0) + (qty || 0);
            });
        } else if (clientId && type && itemId) {
            try {
                let analysisDoc = salesAnalysisDoc; 
                if (!analysisDoc) {
                    analysisDoc = await PlasticAnalysisModel.findOne({ client: clientId, type, itemId });
                }

                if (analysisDoc && analysisDoc.purchaseRows && analysisDoc.purchaseRows.length > 0) {
                    analysisDoc.purchaseRows.forEach(row => {
                        const catRaw = row.plasticCategory || row.category || row['Category of Plastic'];
                        const cat = normalizePurchaseCategory(catRaw);
                        if (!cat) return;

                        const qty = getPurchaseQty(row);
                        purchaseAgg[cat] = (purchaseAgg[cat] || 0) + (qty || 0);
                    });
                }
            } catch (err) {
                console.error("Error fetching saved Purchase Analysis for fallback:", err);
            }
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
            // Safe access to title and match
            const title = latestTable.title || "";
            const match = title.match(/Target Calculation for (\d{4}-\d{2}|\d{4})/);
            const targetYear = match ? match[1] : "Next Year";
            
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

}

export default PlasticAnalysisService;
