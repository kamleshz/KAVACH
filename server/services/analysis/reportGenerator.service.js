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


class ReportGeneratorService {
    /**
     * Generate Plastic Compliance Report PDF
     */
    static async generatePlasticComplianceReport(clientId, type, itemId, userId, options = {}) {
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
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });
        handlebars.registerHelper('gt', function (a, b) {
            return Number(a || 0) > Number(b || 0);
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

        const isProducer = (clientDoc.entityType || '').trim().toLowerCase() === 'producer';

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
        const targetTablesPrePost = summary.target_tables || [];
        
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
        console.log(`[Report Generation] Fetching Product Compliance for Client: ${clientId}, Type: ${type}, ItemId: ${itemId}, isProducer: ${isProducer}`);
        const productComplianceDoc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        console.log(`[Report Generation] Product Compliance Doc found: ${!!productComplianceDoc}, Rows: ${productComplianceDoc?.rows?.length || 0}`);
        
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

        const skuIndustryMap = {};
        allRows.forEach((row) => {
            const skuCode = (row?.skuCode || '').trim();
            if (!skuCode) return;
            if (!skuIndustryMap[skuCode]) {
                skuIndustryMap[skuCode] = row.industryCategory || 'General';
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

        const pickText = (...values) => {
            for (const v of values) {
                if (v === undefined || v === null) continue;
                const s = v.toString().trim();
                if (s) return s;
            }
            return '';
        };

        const hasMeaningfulValue = (value) => {
            if (value === undefined || value === null) return false;
            if (typeof value === 'number') return true;
            const text = value.toString().trim();
            if (!text) return false;
            return text !== '-' && text.toLowerCase() !== 'na' && text.toLowerCase() !== 'n/a';
        };

        allRows.forEach(row => {
            const cat = row.industryCategory || 'General';
            if (!industryMap[cat]) industryMap[cat] = {}; // Changed to Object for SKU grouping
            
            if (isProducer) {
                // Producer Logic: Group by Component Code
                const compCode = (row.componentCode || '').trim() || 'Unknown Component';
                
                // If not exists, create entry
                if (!industryMap[cat][compCode]) {
                     // Resolve Component Image
                    const componentImgSrc = resolveImage(row.componentImage);
                    
                    // Look up details
                    const compDetail = componentDetails.find(c => (c.componentCode || '').trim() === compCode) || {};
                    const suppComp = supplierCompliance.find(s => (s.componentCode || '').trim() === compCode) || {};
                    
                    // Aggregate Procurement Data (optional, but good to have)
                    const procRecords = procurementDetails.filter(p => (p.componentCode || '').trim() === compCode);
                    const totalMonthlyPurchaseMt = procRecords.reduce((sum, p) => sum + (p.monthlyPurchaseMt || 0), 0);
                    const totalRecycledQty = procRecords.reduce((sum, p) => sum + (p.recycledQty || 0), 0);
                    let recycledPolymerUsed = pickText(
                        row.recycledPolymerUsed,
                        row.recycled_polymer_used,
                        row['Recycled Polymer Used'],
                        compDetail.recycledPolymerUsed,
                        compDetail.recycled_polymer_used,
                        compDetail['Recycled Polymer Used']
                    );
                    if (!recycledPolymerUsed) {
                        for (const p of procRecords) {
                            recycledPolymerUsed = pickText(
                                p.recycledPolymerUsed,
                                p.recycled_polymer_used,
                                p['Recycled Polymer Used']
                            );
                            if (recycledPolymerUsed) break;
                        }
                    }
                    if (!recycledPolymerUsed) recycledPolymerUsed = '-';

                    let polymerType = pickText(
                        row.polymerType,
                        row['Polymer Type'],
                        compDetail.polymerType,
                        compDetail['Polymer Type']
                    );
                    if (!polymerType) {
                        for (const p of procRecords) {
                            polymerType = pickText(p.polymerType, p['Polymer Type']);
                            if (polymerType) break;
                        }
                    }
                    if (!polymerType) polymerType = '-';

                    let componentPolymer = pickText(
                        row.componentPolymer,
                        row.component_polymer,
                        row['Component Polymer'],
                        row.componentPolymerType,
                        row['Component Polymer Type'],
                        row.polymer,
                        row['Polymer'],
                        compDetail.componentPolymer,
                        compDetail.component_polymer,
                        compDetail['Component Polymer'],
                        compDetail.componentPolymerType,
                        compDetail['Component Polymer Type'],
                        compDetail.polymer,
                        compDetail['Polymer']
                    );
                    if (!componentPolymer) {
                        for (const p of procRecords) {
                            componentPolymer = pickText(
                                p.componentPolymer,
                                p.component_polymer,
                                p['Component Polymer'],
                                p.componentPolymerType,
                                p['Component Polymer Type'],
                                p.polymer,
                                p['Polymer'],
                                p.polymerType,
                                p['Polymer Type']
                            );
                            if (componentPolymer) break;
                        }
                    }
                    if (!componentPolymer) componentPolymer = polymerType || '-';

                    industryMap[cat][compCode] = {
                        isComponent: true, // Flag to identify this is a component object, not SKU
                        componentCode: compCode,
                        componentDescription: row.componentDescription || '-',
                        componentImage: componentImgSrc,
                        supplierName: row.supplierName || suppComp.supplierName || '-',
                        supplierStatus: suppComp.supplierStatus || '-',
                        supplierState: row.supplierState || suppComp.supplierState || '-',
                        eprCertificateNumber: suppComp.eprCertificateNumber || '-',
                        polymerType,
                        componentPolymer,
                        recycledPolymerUsed,
                        category: compDetail.category || row.category || '-', 
                        thickness: compDetail.thickness || '-',
                        monthlyPurchaseMt: totalMonthlyPurchaseMt.toFixed(4),
                        recycledQty: totalRecycledQty.toFixed(4),
                        status: row.componentComplianceStatus || row.complianceStatus || 'Pending',
                        auditorRemarks: row.auditorRemarks || '-',
                        // Dummy 'components' array to satisfy summary calculation structure if needed, 
                        // but better to adjust summary calculation.
                        // However, the summary calculation uses `sku.components` to sum up monthlyPurchase.
                        // So I'll put a self-reference or empty array?
                        // Let's adjust summary calculation to handle isProducer.
                        components: [] 
                    };
                }
            } else {
                // Brand Owner Logic: Group by SKU
                const skuCode = row.skuCode || 'Unknown SKU';
                
                // Get Marking & Labeling Data
                const markingData = skuComplianceMap[skuCode] || {};
    
                if (!industryMap[cat][skuCode]) {
                    industryMap[cat][skuCode] = {
                        skuCode: skuCode,
                        skuDescription: row.skuDescription || '-',
                        skuUom: row.skuUom || '-',
                        productImage: resolveImage(row.productImage),
                        // Added Product Compliance Status to the SKU object
                        // Prioritize the derived productComplianceStatus from the main table row
                        status: row.productComplianceStatus || markingData.complianceStatus || 'Pending',
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
                let recycledPolymerUsed = pickText(
                    row.recycledPolymerUsed,
                    row.recycled_polymer_used,
                    row['Recycled Polymer Used'],
                    compDetail.recycledPolymerUsed,
                    compDetail.recycled_polymer_used,
                    compDetail['Recycled Polymer Used']
                );
                if (!recycledPolymerUsed) {
                    for (const p of procRecords) {
                        recycledPolymerUsed = pickText(
                            p.recycledPolymerUsed,
                            p.recycled_polymer_used,
                            p['Recycled Polymer Used']
                        );
                        if (recycledPolymerUsed) break;
                    }
                }
                if (!recycledPolymerUsed) recycledPolymerUsed = '-';

                let polymerType = pickText(
                    row.polymerType,
                    row['Polymer Type'],
                    compDetail.polymerType,
                    compDetail['Polymer Type']
                );
                if (!polymerType) {
                    for (const p of procRecords) {
                        polymerType = pickText(p.polymerType, p['Polymer Type']);
                        if (polymerType) break;
                    }
                }
                if (!polymerType) polymerType = '-';

                let componentPolymer = pickText(
                    row.componentPolymer,
                    row.component_polymer,
                    row['Component Polymer'],
                    row.componentPolymerType,
                    row['Component Polymer Type'],
                    row.polymer,
                    row['Polymer'],
                    compDetail.componentPolymer,
                    compDetail.component_polymer,
                    compDetail['Component Polymer'],
                    compDetail.componentPolymerType,
                    compDetail['Component Polymer Type'],
                    compDetail.polymer,
                    compDetail['Polymer']
                );
                if (!componentPolymer) {
                    for (const p of procRecords) {
                        componentPolymer = pickText(
                            p.componentPolymer,
                            p.component_polymer,
                            p['Component Polymer'],
                            p.componentPolymerType,
                            p['Component Polymer Type'],
                            p.polymer,
                            p['Polymer'],
                            p.polymerType,
                            p['Polymer Type']
                        );
                        if (componentPolymer) break;
                    }
                }
                if (!componentPolymer) componentPolymer = polymerType || '-';
    
                // Resolve Component Image
                const componentImgSrc = resolveImage(row.componentImage);
    
                industryMap[cat][skuCode].components.push({
                    componentCode: compCode || '-',
                    componentImage: componentImgSrc,
                    componentDescription: row.componentDescription || '-',
                    supplierName: row.supplierName || suppComp.supplierName || '-',
                    supplierStatus: suppComp.supplierStatus || '-',
                    eprCertificateNumber: suppComp.eprCertificateNumber || '-',
                    polymerType,
                    componentPolymer,
                    recycledPolymerUsed,
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
            }
        });

        const industryCategories = Object.keys(industryMap).map(cat => {
            const skus = Object.values(industryMap[cat]);
            
            let totalSkus, totalMonthlyPurchase, skuCompliantCount, skuNonCompliantCount, skuPendingCount;
            let compCompliantCount, compNonCompliantCount, compPendingCount, complianceScore;

            if (isProducer) {
                // Producer Summary Logic (skus array actually contains components)
                totalSkus = skus.length; // Actually total components
                
                // Sum monthly purchase from the component objects directly
                totalMonthlyPurchase = skus.reduce((sum, comp) => sum + parseFloat(comp.monthlyPurchaseMt || 0), 0);
                
                // Status counts based on component status
                skuCompliantCount = skus.filter(c => c.status === 'Compliant').length;
                skuNonCompliantCount = skus.filter(c => c.status === 'Non-Compliant').length;
                skuPendingCount = totalSkus - (skuCompliantCount + skuNonCompliantCount);

                // For Producer, Component Stats = SKU Stats (since we mapped components as SKUs)
                compCompliantCount = skuCompliantCount;
                compNonCompliantCount = skuNonCompliantCount;
                compPendingCount = skuPendingCount;
                complianceScore = totalSkus > 0 ? ((skuCompliantCount / totalSkus) * 100).toFixed(1) : 0;

            } else {
                // Brand Owner Summary Logic
                // Category Summary Stats
                totalSkus = skus.length;
                totalMonthlyPurchase = skus.reduce((sum, sku) => 
                    sum + sku.components.reduce((cSum, c) => cSum + parseFloat(c.monthlyPurchaseMt || 0), 0)
                , 0);
                
                // Component Level Analysis
                const allComponents = skus.flatMap(s => s.components);
                compCompliantCount = allComponents.filter(c => c.status === 'Compliant').length;
                compNonCompliantCount = allComponents.filter(c => c.status === 'Non-Compliant').length;
                compPendingCount = allComponents.filter(c => c.status !== 'Compliant' && c.status !== 'Non-Compliant').length;
    
                // SKU Level Analysis
                skuCompliantCount = skus.filter(s => s.status === 'Compliant').length;
                skuNonCompliantCount = skus.filter(s => s.status === 'Non-Compliant').length;
                skuPendingCount = totalSkus - (skuCompliantCount + skuNonCompliantCount);
                complianceScore = allComponents.length > 0 ? ((compCompliantCount / allComponents.length) * 100).toFixed(1) : 0;
            }

            const normalizedSkus = skus.map((sku) => {
                if (isProducer) {
                    return {
                        ...sku,
                        hasComponentImage: Boolean(sku.componentImage),
                        hasAuditorRemarks: hasMeaningfulValue(sku.auditorRemarks)
                    };
                }

                const components = Array.isArray(sku.components) ? sku.components : [];
                const componentsWithImages = components.filter((component) => Boolean(component.componentImage));
                const componentsWithRemarks = components.filter((component) => hasMeaningfulValue(component.auditorRemarks));

                return {
                    ...sku,
                    hasProductImage: Boolean(sku.productImage),
                    hasComponentImages: componentsWithImages.length > 0,
                    componentsWithImages,
                    componentsWithRemarks
                };
            });

            return {
                name: cat,
                skus: normalizedSkus,
                summary: {
                    totalSkus,
                    totalMonthlyPurchase: totalMonthlyPurchase.toFixed(4),
                    // Component Stats
                    compliantCount: compCompliantCount,
                    nonCompliantCount: compNonCompliantCount,
                    pendingCount: compPendingCount,
                    complianceScore: complianceScore,
                    // SKU Stats
                    skuCompliantCount,
                    skuNonCompliantCount,
                    skuPendingCount
                }
            };
        });

        // 3.1 Prepare Marking & Labeling Report Data (From SkuComplianceModel + fallback to ProductCompliance)
        const skuComplianceDocs = await SkuComplianceModel.find({ client: clientId });
        console.log(`[Report Generation] SkuCompliance docs found: ${skuComplianceDocs.length} for clientId: ${clientId}`);

        // Build marking data from SkuCompliance collection
        let markingSource = skuComplianceDocs;

        // If no dedicated SkuCompliance docs, fallback: build from productCompliance rows + skuComplianceMap
        if (markingSource.length === 0 && allRows.length > 0) {
            console.log(`[Report Generation] Falling back to productCompliance rows for marking data. allRows: ${allRows.length}, skuComplianceMap keys: ${Object.keys(skuComplianceMap).length}`);
            const uniqueSkus = new Map();
            allRows.forEach(row => {
                const code = (row.skuCode || '').trim();
                if (!code || uniqueSkus.has(code)) return;
                const markingInfo = skuComplianceMap[code] || {};
                uniqueSkus.set(code, {
                    skuCode: code,
                    industryCategory: skuIndustryMap[code] || row.industryCategory || 'General',
                    skuDescription: row.skuDescription || '',
                    skuUm: row.skuUom || '',
                    productImage: row.productImage || '',
                    brandOwner: markingInfo.brandOwner || '',
                    eprCertBrandOwner: markingInfo.eprCertBrandOwner || '',
                    eprCertProducer: markingInfo.eprCertProducer || '',
                    thicknessMentioned: markingInfo.thicknessMentioned || '',
                    polymerUsed: markingInfo.polymerUsed || [],
                    recycledPercent: markingInfo.recycledPercent || '',
                    compostableRegNo: markingInfo.compostableRegNo || '',
                    markingImage: markingInfo.markingImage || [],
                    remarks: markingInfo.remarks || [],
                    complianceRemarks: markingInfo.complianceRemarks || [],
                    complianceStatus: markingInfo.complianceStatus || 'Pending'
                });
            });
            markingSource = Array.from(uniqueSkus.values());
            console.log(`[Report Generation] Fallback marking source built: ${markingSource.length} unique SKUs`);
        }

        const markingLabelingData = markingSource
            .sort((a, b) => {
                const aCode = (a.skuCode || '').trim();
                const bCode = (b.skuCode || '').trim();
                return aCode.localeCompare(bCode);
            })
            .map((doc, index) => {
                const brandOwner = doc.brandOwner || '';
                const eprCertBrandOwner = doc.eprCertBrandOwner || '';
                const eprCertProducer = doc.eprCertProducer || '';
                const thicknessMentioned = doc.thicknessMentioned || '';
                const polymerUsed = Array.isArray(doc.polymerUsed) ? doc.polymerUsed.join(', ') : (doc.polymerUsed || '');
                const recycledPercent = doc.recycledPercent || '';
                const compostableRegNo = doc.compostableRegNo || '';
                const productImage = resolveImage(doc.productImage);
                const markingImages = (doc.markingImage || []).map((img) => resolveImage(img)).filter(Boolean);
                const auditorRemarks = Array.isArray(doc.remarks) ? doc.remarks.join('\n') : (doc.remarks || '');
                const complianceRemarks = Array.isArray(doc.complianceRemarks) ? doc.complianceRemarks.join('\n') : (doc.complianceRemarks || '');
                const complianceStatus = doc.complianceStatus || 'Pending';

                const reasons = [];
                if (!markingImages.length) reasons.push('Marking photos missing');
                if (!hasMeaningfulValue(thicknessMentioned)) reasons.push('Polymer thickness not provided');
                if (!hasMeaningfulValue(polymerUsed)) reasons.push('Polymer type not provided');
                if (!hasMeaningfulValue(eprCertBrandOwner) && !hasMeaningfulValue(eprCertProducer)) {
                    reasons.push('EPR certificate mapping unavailable');
                }

                const hasAnyData = [
                    doc.skuCode,
                    doc.skuDescription,
                    brandOwner,
                    eprCertBrandOwner,
                    eprCertProducer,
                    thicknessMentioned,
                    polymerUsed,
                    recycledPercent,
                    compostableRegNo,
                    auditorRemarks,
                    complianceRemarks
                ].some(hasMeaningfulValue) || Boolean(productImage) || markingImages.length > 0;

                return {
                    index: index + 1,
                    skuCode: doc.skuCode || '-',
                    industryCategory: doc.industryCategory || skuIndustryMap[(doc.skuCode || '').trim()] || 'General',
                    skuDescription: doc.skuDescription || '-',
                    skuUom: doc.skuUm || doc.skuUom || '-',
                    productImage,
                    hasProductImage: Boolean(productImage),
                    brandOwner: hasMeaningfulValue(brandOwner) ? brandOwner : '',
                    eprCertBrandOwner: hasMeaningfulValue(eprCertBrandOwner) ? eprCertBrandOwner : '',
                    eprCertProducer: hasMeaningfulValue(eprCertProducer) ? eprCertProducer : '',
                    thicknessMentioned: hasMeaningfulValue(thicknessMentioned) ? thicknessMentioned : '',
                    polymerUsed: hasMeaningfulValue(polymerUsed) ? polymerUsed : '',
                    recycledPercent: hasMeaningfulValue(recycledPercent) ? recycledPercent : '',
                    compostableRegNo: hasMeaningfulValue(compostableRegNo) ? compostableRegNo : '',
                    markingImages,
                    hasMarkingImages: markingImages.length > 0,
                    auditorRemarks: hasMeaningfulValue(auditorRemarks) ? auditorRemarks : '',
                    complianceRemarks: hasMeaningfulValue(complianceRemarks) ? complianceRemarks : '',
                    hasAuditorRemarks: hasMeaningfulValue(auditorRemarks),
                    hasComplianceRemarks: hasMeaningfulValue(complianceRemarks),
                    complianceStatus,
                    complianceReasons: reasons,
                    hasAnyData
                };
            })
            .filter((row) => row.hasAnyData);
        
        console.log(`[Report Generation] Final markingLabelingData count: ${markingLabelingData.length}`);

        const markingLabelingReportByIndustry = !isProducer
            ? Object.values(
                markingLabelingData.reduce((acc, item) => {
                    const industryName = (item.industryCategory || 'General').trim() || 'General';
                    if (!acc[industryName]) {
                        acc[industryName] = {
                            name: industryName,
                            rows: []
                        };
                    }
                    acc[industryName].rows.push(item);
                    return acc;
                }, {})
            )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((group) => ({
                    ...group,
                    rows: group.rows.sort((a, b) => (a.skuCode || '').localeCompare(b.skuCode || ''))
                }))
            : [];

        const industrySkuSummaryReport = !isProducer
            ? industryCategories.map((category) => {
                const markingBySku = new Map(
                    markingLabelingData.map((item) => [
                        (item.skuCode || '').trim(),
                        item
                    ])
                );

                const rows = (category.skus || []).map((sku) => {
                    const skuCode = (sku.skuCode || '').trim();
                    const markingRow = markingBySku.get(skuCode) || {};
                    const savedMarkingStatus = (markingRow.complianceStatus || '').toString().trim();
                    const derivedMarkingStatus = (sku.markingDetails?.status || '').toString().trim();
                    const supplierCounts = (sku.components || []).reduce((acc, component, index) => {
                        const status = (component?.supplierStatus || '').toString().trim().toLowerCase();
                        const componentCode = (component?.componentCode || '').toString().trim();
                        const supplierName = (component?.supplierName || '').toString().trim().toLowerCase();
                        const supplierKey = `${componentCode}::${supplierName || `supplier-${index}`}`;

                        if (status.includes('unregistered')) {
                            acc.unregistered.add(supplierKey);
                        } else if (status.includes('registered')) {
                            acc.registered.add(supplierKey);
                        }

                        return acc;
                    }, { registered: new Set(), unregistered: new Set() });
                    const componentRemarks = (sku.components || [])
                        .map((component) => {
                            const remark = (component.auditorRemarks || '').toString().trim();
                            if (!remark || remark === '-') return '';
                            const componentCode = (component.componentCode || '').toString().trim();
                            return componentCode ? `${componentCode}: ${remark}` : remark;
                        })
                        .filter(Boolean);

                    const markingRemarks = [
                        (markingRow.auditorRemarks || '').toString().trim(),
                        (markingRow.complianceRemarks || '').toString().trim()
                    ].filter((remark) => remark && remark !== '-');

                    return {
                        skuCode: skuCode || '-',
                        skuDescription: sku.skuDescription || '-',
                        complianceStatus: sku.status || 'Pending',
                        markingLabelingStatus: savedMarkingStatus || derivedMarkingStatus || 'Pending',
                        supplierRegisteredCount: supplierCounts.registered.size,
                        supplierUnregisteredCount: supplierCounts.unregistered.size,
                        remarks: [...new Set([...componentRemarks, ...markingRemarks])].join('\n') || '-'
                    };
                });

                return {
                    name: category.name,
                    rows
                };
            }).filter((category) => category.rows.length > 0)
            : [];

        const industryCategorySummaryReport = !isProducer
            ? industrySkuSummaryReport.map((category) => {
                const rows = Array.isArray(category.rows) ? category.rows : [];
                return {
                    name: category.name,
                    totalSku: rows.length,
                    complianceCompliant: rows.filter((row) => row.complianceStatus === 'Compliant').length,
                    complianceNonCompliant: rows.filter((row) => row.complianceStatus === 'Non-Compliant').length,
                    markingCompliant: rows.filter((row) => row.markingLabelingStatus === 'Compliant').length,
                    markingNonCompliant: rows.filter((row) => row.markingLabelingStatus === 'Non-Compliant').length
                };
            })
            : [];

        const complianceOverview = !isProducer
            ? (() => {
                const totals = industrySkuSummaryReport.reduce(
                    (acc, category) => {
                        (category.rows || []).forEach((row) => {
                            const status = (row?.complianceStatus || '').toString().trim();
                            if (status === 'Compliant') acc.compliant += 1;
                            else if (status === 'Non-Compliant') acc.nonCompliant += 1;
                            else acc.other += 1;
                        });
                        return acc;
                    },
                    { compliant: 0, nonCompliant: 0, other: 0 }
                );

                const totalSku = totals.compliant + totals.nonCompliant + totals.other;
                const compliantPctRaw = totalSku ? (totals.compliant / totalSku) * 100 : 0;
                const nonCompliantPctRaw = totalSku ? (totals.nonCompliant / totalSku) * 100 : 0;

                const compliantPct = Number(compliantPctRaw.toFixed(1));
                const nonCompliantPct = Number(nonCompliantPctRaw.toFixed(1));
                const otherPct = Number(Math.max(0, 100 - compliantPct - nonCompliantPct).toFixed(1));

                const compliantStop = Number((compliantPctRaw).toFixed(2));
                const nonCompliantStop = Number((compliantPctRaw + nonCompliantPctRaw).toFixed(2));
                const donutGradient = `conic-gradient(#16a34a 0 ${compliantStop}%, #f97316 ${compliantStop}% ${nonCompliantStop}%, #94a3b8 ${nonCompliantStop}% 100%)`;

                return {
                    totalSku,
                    compliant: totals.compliant,
                    nonCompliant: totals.nonCompliant,
                    other: totals.other,
                    compliantPct,
                    nonCompliantPct,
                    otherPct,
                    donutGradient
                };
            })()
            : null;

        const complianceSnapshot = !isProducer
            ? (() => {
                const allSkuRows = industrySkuSummaryReport.flatMap((category) => category.rows || []);
                const totalSkuAnalysed = allSkuRows.length;
                const compliant = allSkuRows.filter((row) => row.complianceStatus === 'Compliant').length;
                const nonCompliant = allSkuRows.filter((row) => row.complianceStatus === 'Non-Compliant').length;
                const markingCompliant = allSkuRows.filter((row) => row.markingLabelingStatus === 'Compliant').length;
                const markingCompliancePct = totalSkuAnalysed
                    ? Number(((markingCompliant / totalSkuAnalysed) * 100).toFixed(1))
                    : 0;

                const supplierSetRegistered = new Set();
                const supplierSetUnregistered = new Set();
                industryCategories.forEach((category) => {
                    (category.skus || []).forEach((sku) => {
                        (sku.components || []).forEach((component, index) => {
                            const componentCode = (component?.componentCode || '').toString().trim() || `comp-${index}`;
                            const supplierName = (component?.supplierName || '').toString().trim().toLowerCase() || `supplier-${index}`;
                            const key = `${componentCode}::${supplierName}`;
                            const status = (component?.supplierStatus || '').toString().trim().toLowerCase();
                            if (status.includes('unregistered')) supplierSetUnregistered.add(key);
                            else if (status.includes('registered')) supplierSetRegistered.add(key);
                        });
                    });
                });

                const nonCompliantPct = totalSkuAnalysed
                    ? (nonCompliant / totalSkuAnalysed) * 100
                    : 0;

                let eprReadinessStatus = 'Low Risk';
                if (nonCompliantPct >= 50) eprReadinessStatus = 'High Risk';
                else if (nonCompliantPct >= 20) eprReadinessStatus = 'Medium Risk';

                return {
                    totalSkuAnalysed,
                    compliant,
                    nonCompliant,
                    registeredSuppliers: supplierSetRegistered.size,
                    unregisteredSuppliers: supplierSetUnregistered.size,
                    markingCompliancePct,
                    eprReadinessStatus
                };
            })()
            : null;

        const sectionStatus = (() => {
            const iconMap = {
                complete: '✅',
                partial: '⚠',
                missing: '❌'
            };

            const buildStatus = (status) => ({
                status,
                icon: iconMap[status] || iconMap.missing
            });

            const clientDataReady = hasMeaningfulValue(clientDoc?.clientName) && hasMeaningfulValue(clientDoc?.entityType);
            const hasCte = Array.isArray(productionFacility?.cteDetailsList) && productionFacility.cteDetailsList.length > 0;
            const hasCto = Array.isArray(productionFacility?.ctoDetailsList) && productionFacility.ctoDetailsList.length > 0;
            const hasCteProd = Array.isArray(productionFacility?.cteProduction) && productionFacility.cteProduction.length > 0;
            const hasCtoProd = Array.isArray(productionFacility?.ctoProducts) && productionFacility.ctoProducts.length > 0;
            const plantReady = hasCte || hasCto || hasCteProd || hasCtoProd;
            const targetsReady = Array.isArray(targetTablesPrePost) && targetTablesPrePost.length > 0;

            if (isProducer) {
                return {
                    clientData: buildStatus(clientDataReady ? 'complete' : 'missing'),
                    plantConsent: buildStatus(plantReady ? 'complete' : 'missing'),
                    skuCompliance: buildStatus(industryCategories.length ? 'partial' : 'missing'),
                    markingLabeling: buildStatus('missing'),
                    targetsCalculation: buildStatus(targetsReady ? 'complete' : 'missing')
                };
            }

            const skuTotal = complianceOverview?.totalSku || 0;
            const skuNonCompliant = complianceOverview?.nonCompliant || 0;
            const skuOther = complianceOverview?.other || 0;
            const skuStatus = skuTotal === 0
                ? 'missing'
                : skuNonCompliant > 0
                    ? 'missing'
                    : skuOther > 0
                        ? 'partial'
                        : 'complete';

            const markingTotal = markingLabelingData.length;
            const markingNonCompliant = markingLabelingData.filter((row) => row.complianceStatus === 'Non-Compliant').length;
            const markingPending = markingLabelingData.filter((row) => !['Compliant', 'Non-Compliant'].includes(row.complianceStatus)).length;
            const markingStatus = markingTotal === 0
                ? 'missing'
                : markingNonCompliant > 0
                    ? 'missing'
                    : markingPending > 0
                        ? 'partial'
                        : 'complete';

            return {
                clientData: buildStatus(clientDataReady ? 'complete' : 'missing'),
                plantConsent: buildStatus(plantReady ? 'complete' : 'missing'),
                skuCompliance: buildStatus(skuStatus),
                markingLabeling: buildStatus(markingStatus),
                targetsCalculation: buildStatus(targetsReady ? 'complete' : 'missing')
            };
        })();

        const industryComplianceBarData = !isProducer
            ? industrySkuSummaryReport.map((category) => {
                const rows = Array.isArray(category.rows) ? category.rows : [];
                const compliant = rows.filter((row) => row.complianceStatus === 'Compliant').length;
                const nonCompliant = rows.filter((row) => row.complianceStatus === 'Non-Compliant').length;
                const other = Math.max(0, rows.length - compliant - nonCompliant);
                const total = rows.length;
                const compliantPctRaw = total ? (compliant / total) * 100 : 0;
                const nonCompliantPctRaw = total ? (nonCompliant / total) * 100 : 0;
                const compliantPct = Number(compliantPctRaw.toFixed(1));
                const nonCompliantPct = Number(nonCompliantPctRaw.toFixed(1));
                const otherPct = Number(Math.max(0, 100 - compliantPct - nonCompliantPct).toFixed(1));

                return {
                    industry: category.name,
                    compliant,
                    nonCompliant,
                    other,
                    total,
                    compliantPct,
                    nonCompliantPct,
                    otherPct
                };
            })
            : [];

        const annualTargetSummaryReport = (prePostSummary || []).map((row, index) => {
            const preConsumer = parseFloat(row?.['Pre Consumer'] || 0) || 0;
            const postConsumer = parseFloat(row?.['Post Consumer'] || 0) || 0;

            return {
                key: `${row?.['Category of Plastic'] || 'annual-target'}-${index}`,
                category: row?.['Category of Plastic'] || '-',
                procurementTons: row?.['Total Purchase'] ?? 0,
                salesTons: parseFloat((preConsumer + postConsumer).toFixed(4)),
                exportTons: row?.['Export'] ?? 0
            };
        });

        const skuDescriptionMap = {};
        allRows.forEach((row) => {
            const skuCode = (row?.skuCode || '').toString().trim();
            if (!skuCode || skuDescriptionMap[skuCode]) return;
            skuDescriptionMap[skuCode] = row?.skuDescription || '';
        });

        const costAnalysisByIndustry = {};
        (procurementDetails || []).forEach((row) => {
            const skuCode = (row?.skuCode || '').toString().trim();
            if (!skuCode) return;

            const industryName = (skuIndustryMap[skuCode] || 'General').toString().trim() || 'General';
            const skuDescription = (skuDescriptionMap[skuCode] || '').toString().trim() || '-';
            const supplierName = (row?.supplierName || '-').toString().trim() || '-';
            const componentCode = (row?.componentCode || '-').toString().trim() || '-';
            const componentDescription = (row?.componentDescription || '-').toString().trim() || '-';
            const monthName = (row?.monthName || row?.quarter || row?.yearlyQuarter || '').toString().trim();

            const procurementTons = parseFloat(row?.monthlyPurchaseMt || 0) || 0;
            const virginQty = parseFloat(row?.virginQty || 0) || 0;
            const recycledQty = parseFloat(row?.recycledQty || 0) || 0;
            const virginAmount = parseFloat(row?.virginQtyAmount || 0) || 0;
            const recycledAmount = parseFloat(row?.recycledQrtAmount || 0) || 0;

            if (!costAnalysisByIndustry[industryName]) {
                costAnalysisByIndustry[industryName] = { name: industryName, skus: {} };
            }
            const industryBucket = costAnalysisByIndustry[industryName];
            if (!industryBucket.skus[skuCode]) {
                industryBucket.skus[skuCode] = {
                    skuCode,
                    skuDescription,
                    procurementTons: 0,
                    totalCost: 0,
                    suppliers: {}
                };
            }
            const skuBucket = industryBucket.skus[skuCode];

            skuBucket.procurementTons += procurementTons;
            skuBucket.totalCost += virginAmount + recycledAmount;

            const supplierKey = `${supplierName.toLowerCase()}::${componentCode.toLowerCase()}`;
            if (!skuBucket.suppliers[supplierKey]) {
                skuBucket.suppliers[supplierKey] = {
                    supplierName,
                    componentCode,
                    componentDescription,
                    procurementTons: 0,
                    virginQty: 0,
                    virginAmount: 0,
                    recycledQty: 0,
                    recycledAmount: 0,
                    periods: new Set()
                };
            }
            const supplierBucket = skuBucket.suppliers[supplierKey];
            supplierBucket.procurementTons += procurementTons;
            supplierBucket.virginQty += virginQty;
            supplierBucket.virginAmount += virginAmount;
            supplierBucket.recycledQty += recycledQty;
            supplierBucket.recycledAmount += recycledAmount;
            if (monthName) supplierBucket.periods.add(monthName);
        });

        const costAnalysisReport = Object.values(costAnalysisByIndustry)
            .map((industry) => {
                const skus = Object.values(industry.skus)
                    .map((sku) => {
                        const supplierRows = Object.values(sku.suppliers).map((supplier) => {
                            const totalQty = (supplier.virginQty || 0) + (supplier.recycledQty || 0);
                            const totalAmount = (supplier.virginAmount || 0) + (supplier.recycledAmount || 0);
                            const avgRate = totalQty > 0 ? totalAmount / totalQty : 0;

                            const virginRate = supplier.virginQty > 0 ? supplier.virginAmount / supplier.virginQty : 0;
                            const recycledRate = supplier.recycledQty > 0 ? supplier.recycledAmount / supplier.recycledQty : 0;

                            return {
                                supplierName: supplier.supplierName,
                                componentCode: supplier.componentCode,
                                componentDescription: supplier.componentDescription,
                                period: [...supplier.periods].join(', ') || '-',
                                procurementTons: supplier.procurementTons.toFixed(4),
                                virginQty: supplier.virginQty.toFixed(4),
                                virginRate: supplier.virginQty > 0 ? virginRate.toFixed(2) : '-',
                                virginAmount: supplier.virginAmount.toFixed(2),
                                recycledQty: supplier.recycledQty.toFixed(4),
                                recycledRate: supplier.recycledQty > 0 ? recycledRate.toFixed(2) : '-',
                                recycledAmount: supplier.recycledAmount.toFixed(2),
                                totalAmount: totalAmount.toFixed(2),
                                avgRate: totalQty > 0 ? avgRate.toFixed(2) : '-'
                            };
                        }).sort((a, b) => (a.supplierName || '').localeCompare(b.supplierName || ''));

                        const avgRateSku = sku.procurementTons > 0 ? sku.totalCost / sku.procurementTons : 0;

                        return {
                            skuCode: sku.skuCode,
                            skuDescription: sku.skuDescription,
                            procurementTons: sku.procurementTons.toFixed(4),
                            totalCost: sku.totalCost.toFixed(2),
                            avgRate: sku.procurementTons > 0 ? avgRateSku.toFixed(2) : '-',
                            suppliers: supplierRows
                        };
                    })
                    .sort((a, b) => (a.skuCode || '').localeCompare(b.skuCode || ''));

                const industryTotals = skus.reduce(
                    (acc, sku) => {
                        acc.procurementTons += parseFloat(sku.procurementTons || 0) || 0;
                        acc.totalCost += parseFloat(sku.totalCost || 0) || 0;
                        return acc;
                    },
                    { procurementTons: 0, totalCost: 0 }
                );

                return {
                    name: industry.name,
                    procurementTons: industryTotals.procurementTons.toFixed(4),
                    totalCost: industryTotals.totalCost.toFixed(2),
                    skus
                };
            })
            .filter((industry) => industry.skus.length > 0)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const normalizePolymerName = (value) => {
            const v = (value || '').toString().trim();
            if (!v) return '';
            const u = v.toUpperCase();
            if (['PP', 'PET', 'LLDPE', 'LDPE', 'HDPE'].includes(u)) return u;
            return v;
        };

        const derivePolymerNameFromRow = (row) => {
            const direct = pickText(
                row?.componentPolymer,
                row?.polymerType,
                row?.['Polymer Type'],
                row?.polymer,
                row?.['Polymer']
            );
            return normalizePolymerName(direct) || 'Unknown';
        };

        const deriveCategoryFromRow = (row) => {
            const direct = pickText(row?.category, row?.plasticCategory, row?.['Category']);
            return direct || 'Unknown';
        };

        const buildGroupedCostAnalysis = (groupBy) => {
            const map = {};

            (procurementDetails || []).forEach((row) => {
                const skuCode = (row?.skuCode || '').toString().trim();
                if (!skuCode) return;

                const supplierName = (row?.supplierName || 'Unknown').toString().trim() || 'Unknown';
                const componentName = pickText(row?.componentName, row?.componentDescription, row?.componentCode) || 'Unknown';

                const category = deriveCategoryFromRow(row);
                const polymerName = derivePolymerNameFromRow(row);
                const recycledPolymerUsed = pickText(row?.recycledPolymerUsed, row?.recycled_polymer_used, row?.['Recycled Polymer Used']) || '-';

                const virginQty = parseFloat(row?.virginQty || 0) || 0;
                const recycledQty = parseFloat(row?.recycledQty || 0) || 0;
                const virginAmount = parseFloat(row?.virginQtyAmount || 0) || 0;
                const recycledAmount = parseFloat(row?.recycledQrtAmount || 0) || 0;

                let groupName = 'Unknown';
                if (groupBy === 'category') groupName = category;
                if (groupBy === 'polymer') groupName = polymerName;
                if (groupBy === 'supplier') groupName = supplierName;

                if (!map[groupName]) {
                    map[groupName] = {
                        name: groupName,
                        recycledQty: 0,
                        recycledAmount: 0,
                        virginQty: 0,
                        virginAmount: 0,
                        totalSpend: 0,
                        details: []
                    };
                }

                const bucket = map[groupName];
                bucket.recycledQty += recycledQty;
                bucket.recycledAmount += recycledAmount;
                bucket.virginQty += virginQty;
                bucket.virginAmount += virginAmount;
                bucket.totalSpend += virginAmount + recycledAmount;

                bucket.details.push({
                    supplierName,
                    skuCode,
                    skuDescription: (skuDescriptionMap[skuCode] || '').toString().trim() || '-',
                    componentName,
                    category,
                    polymerName,
                    recycledPolymerUsed,
                    recycledQty: recycledQty.toFixed(4),
                    recycledAmount: recycledAmount.toFixed(2),
                    virginQty: virginQty.toFixed(4),
                    virginAmount: virginAmount.toFixed(2),
                    totalSpend: (virginAmount + recycledAmount).toFixed(2)
                });
            });

            return Object.values(map)
                .map((group) => ({
                    ...group,
                    recycledQty: group.recycledQty.toFixed(4),
                    recycledAmount: group.recycledAmount.toFixed(2),
                    virginQty: group.virginQty.toFixed(4),
                    virginAmount: group.virginAmount.toFixed(2),
                    totalSpend: group.totalSpend.toFixed(2),
                    details: group.details.sort((a, b) => {
                        const supplierCompare = (a.supplierName || '').localeCompare(b.supplierName || '');
                        if (supplierCompare !== 0) return supplierCompare;
                        const skuCompare = (a.skuCode || '').localeCompare(b.skuCode || '');
                        if (skuCompare !== 0) return skuCompare;
                        return (a.componentName || '').localeCompare(b.componentName || '');
                    })
                }))
                .filter((g) => g.details.length > 0)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        };

        const costAnalysisCategoryReport = buildGroupedCostAnalysis('category');
        const costAnalysisPolymerReport = buildGroupedCostAnalysis('polymer');
        const costAnalysisSupplierReport = buildGroupedCostAnalysis('supplier');

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
                // Robust check for Total Plastic Qty (Tons) or variants
                let qty = 0;
                if (row["Total Plastic Qty (Tons)"] !== undefined) qty = parseFloat(row["Total Plastic Qty (Tons)"]);
                else if (row["Total Plastic Qty"] !== undefined) qty = parseFloat(row["Total Plastic Qty"]);
                else if (row["Quantity"] !== undefined) qty = parseFloat(row["Quantity"]);
                else if (row["totalPlasticQty"] !== undefined) qty = parseFloat(row["totalPlasticQty"]); // Camel case
                
                qty = qty || 0;

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

        // Build EPR Target Tables for Report
        const isProducerEntity = (clientDoc.entityType || '').toString().trim().toLowerCase() === 'producer';
        let targetTables = targetTablesPrePost;
        if (isProducerEntity) {
            const normalizeSalesCategory = (val) => {
                if (!val) return null;
                const v = String(val).toUpperCase();
                if (v.includes("IV") || v.includes("CAT-IV") || v.includes("CAT IV") || v.includes("CATEGORY IV")) return "Cat-IV";
                if (v.includes("III") || v.includes("CAT-III") || v.includes("CAT III") || v.includes("CATEGORY III")) return "Cat-III";
                if (v.includes("II") || v.includes("CAT-II") || v.includes("CAT II") || v.includes("CATEGORY II")) return "Cat-II";
                if (v.includes("CAT-I") || v.includes("CAT I") || v.includes("CATEGORY I") || (v.includes("I") && v.includes("CONTAINER"))) return "Cat-I";
                if (/\bI\b/.test(v) || /CAT.*I/.test(v)) return "Cat-I";
                return null;
            };
            const categories = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV'];
            const yearlyAgg = {};
            categories.forEach(cat => { yearlyAgg[cat] = {}; });
            (analysisDoc?.salesRows || []).forEach(r => {
                const cat = normalizeSalesCategory(r.plasticCategory);
                const fy = r.financialYear || 'Unknown';
                const qty = parseFloat(r.totalPlasticQty) || 0;
                if (!cat || fy === 'Unknown') return;
                yearlyAgg[cat][fy] = (yearlyAgg[cat][fy] || 0) + qty;
            });
            const sortedYears = [...displaySalesYears];
            const tables = [];
            if (sortedYears.length >= 2) {
                for (let i = 0; i < sortedYears.length - 1; i++) {
                    const year1 = sortedYears[i];
                    const year2 = sortedYears[i + 1];
                    const targetYear = sortedYears[i + 2] || this.getNextFinancialYear(year2);
                    const data = categories.map(cat => {
                        const val1 = parseFloat(yearlyAgg[cat]?.[year1] || 0);
                        const val2 = parseFloat(yearlyAgg[cat]?.[year2] || 0);
                        const avg = (val1 + val2) / 2;
                        const regYear2 = (analysisDoc?.salesRows || [])
                            .filter(rr => {
                                const rCat = normalizeSalesCategory(rr.plasticCategory);
                                const rYear = rr.financialYear || '';
                                const type = (rr.registrationType || '').toLowerCase();
                                const status = (rr.uploadStatus || '').toString().trim().toLowerCase();
                                const statusOk = !status || status === 'completed';
                                return rCat === cat && rYear === year2 && type.includes('registered') && !type.includes('unregistered') && statusOk;
                            })
                            .reduce((sum, rr) => sum + (parseFloat(rr.totalPlasticQty) || 0), 0);
                        const targetVal = avg - regYear2;
                        const row = {
                            "Category of Plastic": cat,
                            [year1]: parseFloat(val1.toFixed(4)),
                            [year2]: parseFloat(val2.toFixed(4)),
                            "Avg": parseFloat(avg.toFixed(4)),
                            [`Registered Sales (${year2})`]: parseFloat(regYear2.toFixed(4)),
                            [`Target ${targetYear}`]: parseFloat(targetVal.toFixed(4)),
                        };
                        return row;
                    });
                    const columns = ["Category of Plastic", year1, year2, "Avg", `Registered Sales (${year2})`, `Target ${targetYear}`];
                    tables.push({ title: `Target Calculation for ${targetYear} (Producer)`, data, columns });
                }
            }
            targetTables = tables;
        }

        // 5. Generate Auditor Insights
        let auditorInsights = { validation: "", targets: "", sales: "", purchase: "" };
        try {
            auditorInsights = this.generateAuditorInsights(
                { data: salesSummaryTable, years: displaySalesYears }, 
                { data: purchaseSummaryTable, years: displayPurchaseYears }, 
                formattedPrePost, 
                targetTables
            );
        } catch (err) {
            console.error("[Report Generation] Error generating auditor insights:", err);
            // Non-blocking error, continue with empty insights
        }

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
                        ctoDetails: [],
                        cteProduction: [],
                        ctoProducts: []
                    };
                }
                plantGroups[norm][keyName].push(item);
            });
        };

        processPlantData(pf.cteDetailsList, 'cteDetails');
        processPlantData(pf.ctoDetailsList, 'ctoDetails');
        processPlantData(pf.cteProduction, 'cteProduction');
        processPlantData(pf.ctoProducts, 'ctoProducts');

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
            })),
            cteProduction: group.cteProduction.map((row, index) => ({
                sr: index + 1,
                productName: row.productName || '-',
                maxCapacityPerYear: (row.maxCapacityPerYear !== undefined && row.maxCapacityPerYear !== null) ? row.maxCapacityPerYear : '-',
                uom: row.uom || '-',
                status: row.verification?.status || 'Pending',
                remark: row.verification?.remark || '-'
            })),
            ctoProducts: group.ctoProducts.map((row, index) => ({
                sr: index + 1,
                productName: row.productName || '-',
                quantity: (row.quantity !== undefined && row.quantity !== null) ? row.quantity : '-',
                uom: row.uom || '-',
                status: row.verification?.status || 'Pending',
                remark: row.verification?.remark || '-'
            }))
        }));

        // Additional CTO Details
        const regs = Array.isArray(pf.regulationsCoveredUnderCto) ? pf.regulationsCoveredUnderCto : [];
        const additionalDetails = {
            investment: pf.totalCapitalInvestmentLakhs ?? '-',
            waterUsage: pf.groundWaterUsage ?? '-',
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
                qty: (r.permittedQuantity !== undefined && r.permittedQuantity !== null) ? r.permittedQuantity : '-',
                uom: r.uom || '-'
            })),
            airRegs: (pf.airRegulations || []).map((r, i) => ({
                sr: i + 1,
                param: r.parameter || '-',
                limit: (r.permittedLimit !== undefined && r.permittedLimit !== null) ? r.permittedLimit : '-',
                uom: r.uom || '-'
            })),
            hazardousRegs: (pf.hazardousWasteRegulations || []).map((r, i) => ({
                sr: i + 1,
                name: r.nameOfHazardousWaste || '-',
                disposal: r.facilityModeOfDisposal || '-',
                qty: (r.quantityMtYr !== undefined && r.quantityMtYr !== null) ? r.quantityMtYr : '-',
                uom: r.uom || '-'
            }))
        };

        // Load company logo as base64
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../../../logo.png');
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            }
        } catch (e) {
            console.warn('[Report Generation] Could not load logo:', e.message);
        }

        const templateData = {
            logoBase64,
            isProducer,
            isBrandOwner: !isProducer,
            entityType: clientDoc.entityType || 'Brand Owner',
            generatedDate: new Date().toLocaleString(),
            engagementContent,
            basicInfo,
            addressDetails,
            companyDocuments: relevantDocs,
            msmeDetails,
            plants,
            additionalDetails,
            complianceOverview,
            complianceSnapshot,
            industryComplianceBarData,
            industryCategorySummaryReport,
            industrySkuSummaryReport,
            annualTargetSummaryReport,
            costAnalysisReport,
            costAnalysisCategoryReport,
            costAnalysisPolymerReport,
            costAnalysisSupplierReport,
            industryCategories,
            markingLabelingData,
            markingLabelingReportByIndustry,
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
            auditorInsights,
            sectionStatus
        };

        // 7. Render HTML
        const templateFileName = options.templateName || 'plasticComplianceReport.hbs';
        const templatePath = path.join(__dirname, `../../templates/${templateFileName}`);
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
            // Log env to debug
            const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
            console.log("PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
            console.log("Resolved executablePath:", executablePath);

            // Check if executable exists
            if (fs.existsSync(executablePath)) {
                console.log("Executable found at path:", executablePath);
            } else {
                console.warn("Executable NOT found at path:", executablePath);
                    // Try to find browser in standard paths by platform
                    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
                        if (process.platform === 'linux') {
                            const standardPath = '/usr/bin/google-chrome-stable';
                            if (fs.existsSync(standardPath)) {
                                console.log("Found standard path:", standardPath);
                                process.env.PUPPETEER_EXECUTABLE_PATH = standardPath;
                            }
                        } else if (process.platform === 'win32') {
                            const candidates = [
                                'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
                                'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
                                'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
                                'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
                            ];
                            for (const p of candidates) {
                                if (fs.existsSync(p)) {
                                    console.log("Found Windows browser path:", p);
                                    process.env.PUPPETEER_EXECUTABLE_PATH = p;
                                    break;
                                }
                            }
                        } else if (process.platform === 'darwin') {
                            const candidates = [
                                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                                '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
                            ];
                            for (const p of candidates) {
                                if (fs.existsSync(p)) {
                                    console.log("Found macOS browser path:", p);
                                    process.env.PUPPETEER_EXECUTABLE_PATH = p;
                                    break;
                                }
                            }
                        }
                    }
            }

            const browser = await puppeteer.launch({ 
                headless: true, 
                dumpio: true, // Capture stdout/stderr from browser
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', 
                    '--disable-gpu',
                        '--no-zygote',
                    '--disable-extensions',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
                ],
                // Explicitly use the installed chrome if env var is set (from Dockerfile)
                // Otherwise fallback to puppeteer's default (which might be missing if skipped download)
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath, 
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

export default ReportGeneratorService;
