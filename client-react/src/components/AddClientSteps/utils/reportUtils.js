import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toAbsUrl, loadImageForPdf } from '../../../utils/pdfHelpers';

export const buildPolymerProcurementSummary = (rows, filters, viewMode = 'Month') => {
    const summaryMap = new Map();

    rows.forEach((row) => {
        // Apply Filters
        const rowYear = row.financialYear || '';
        if (filters.year && rowYear !== filters.year) return;

        const rowMonth = row.month || '';
        if (filters.month && rowMonth !== filters.month) return;

        // Additional array-based filters (if coming from new filter UI)
        if (Array.isArray(filters.quarter) && filters.quarter.length > 0 && !filters.quarter.includes(row.quarter)) return;
        if (Array.isArray(filters.half) && filters.half.length > 0 && !filters.half.includes(row.half)) return;
        // Check if category filter is applied (even for polymer summary, we might filter by category)
        if (Array.isArray(filters.category) && filters.category.length > 0 && !filters.category.includes(row.category)) return;
        // Polymer filter
        if (Array.isArray(filters.polymer) && filters.polymer.length > 0 && !filters.polymer.includes(row.polymer)) return;

        // Group by Polymer
        const key = row.polymer || 'Unknown';
        const label = key;

        const current = summaryMap.get(key) || {
            label: label,
            monthlyPurchaseMt: 0,
            recycledQty: 0
        };
        
        current.monthlyPurchaseMt += (Number(row.monthlyPurchaseMt) || 0);
        current.recycledQty += (Number(row.recycledQty) || 0);
        
        summaryMap.set(key, current);
    });

    const summaryArray = Array.from(summaryMap.values());
    // Sort alphabetically by polymer name
    summaryArray.sort((a, b) => a.label.localeCompare(b.label));
    
    return { data: summaryArray, keys: ['monthlyPurchaseMt', 'recycledQty'] };
};

export const buildCategoryProcurementSummary = (rows, filters, viewMode = 'Month') => {
    const summaryMap = new Map();

    rows.forEach((row) => {
        // Apply Filters
        const rowYear = row.financialYear || '';
        if (filters.year && rowYear !== filters.year) return;

        const rowMonth = row.month || '';
        if (filters.month && rowMonth !== filters.month) return;

        // Additional array-based filters
        if (Array.isArray(filters.quarter) && filters.quarter.length > 0 && !filters.quarter.includes(row.quarter)) return;
        if (Array.isArray(filters.half) && filters.half.length > 0 && !filters.half.includes(row.half)) return;
        // Category filter
        if (Array.isArray(filters.category) && filters.category.length > 0 && !filters.category.includes(row.category)) return;
        // Check if polymer filter is applied
        if (Array.isArray(filters.polymer) && filters.polymer.length > 0 && !filters.polymer.includes(row.polymer)) return;

        // Group by Category
        const key = row.category || 'Unknown';
        const label = key;

        const current = summaryMap.get(key) || {
            label: label,
            monthlyPurchaseMt: 0,
            recycledQty: 0
        };
        
        current.monthlyPurchaseMt += (Number(row.monthlyPurchaseMt) || 0);
        current.recycledQty += (Number(row.recycledQty) || 0);
        
        summaryMap.set(key, current);
    });

    const summaryArray = Array.from(summaryMap.values());
    // Sort alphabetically by category name
    summaryArray.sort((a, b) => a.label.localeCompare(b.label));
    
    return { data: summaryArray, keys: ['monthlyPurchaseMt', 'recycledQty'] };
};

export const generateMarkingLabellingReport = async ({
    postValidationData,
    fullClientData,
    authUser,
    API_URL,
    toast,
    setLoading
}) => {
    if (!postValidationData.length) {
        toast.warning('No Packaging Assessment & Marking or Labelling data to export');
        return;
    }

    setLoading(true);
    try {
        const grouped = {};
        postValidationData.forEach((row) => {
            const key = (row.skuCode || 'NO SKU').toString().trim() || 'NO SKU';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        });

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const marginX = 15;
        const marginBottom = 15;

        const skuKeys = Object.keys(grouped);
        let currentSkuIndex = 0;
        const totalSkuCount = skuKeys.length;

        const drawHeader = () => {
            doc.setFillColor(240, 253, 244);
            doc.rect(0, 0, pageWidth, 28, 'F');

            const clientName = fullClientData?.clientName || '';
            const clientCategory = fullClientData?.category || '';
            const entityType = fullClientData?.entityType || '';
            const fyRaw = fullClientData?.financialYear || '';
            const fy = fyRaw ? `FY-${fyRaw}` : '';
            const assignedName = fullClientData?.assignedTo?.name || '';

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            if (clientName) {
                doc.text(clientName, marginX, 12);
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            let lineY = 17;
            let categoryLine = '';
            const resolveCategoryMeta = () => {
                if (clientCategory === 'PWP') {
                    const notes = (fullClientData?.notes || '').toString();
                    const match = notes.match(/PWP Category:\s*([^\|]+)/i);
                    const pwpCat = match?.[1]?.trim();
                    return { label: 'PWP Category', value: pwpCat || 'PWP' };
                }
                return { label: 'PIBO Category', value: entityType || 'N/A' };
            };
            const { label: categoryLabel, value: categoryValue } = resolveCategoryMeta();
            if (categoryValue) {
                categoryLine = `${categoryLabel}: ${categoryValue}`;
            }
            if (fy) {
                categoryLine = categoryLine ? `${categoryLine}   ${fy}` : fy;
            }
            if (categoryLine) {
                doc.text(categoryLine, marginX, lineY);
                lineY += 5;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Packaging Assessment & Marking or Labelling Report', marginX, lineY);

            const rightX = pageWidth - marginX;
            const auditCompanyName = 'Ananttattva Private Limited';
            let auditorName = assignedName || authUser?.name || authUser?.fullName || authUser?.email || '';
            if (auditorName && auditorName.toLowerCase() === 'admin') {
                auditorName = assignedName || '';
            }
            const startDate = fullClientData?.auditStartDate ? new Date(fullClientData.auditStartDate) : null;
            const endDate = fullClientData?.auditEndDate ? new Date(fullClientData.auditEndDate) : null;

            const formatDate = (d) => {
                if (!d || isNaN(d.getTime())) return '';
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);
            let period = '';
            if (startStr || endStr) {
                period = `${startStr || 'N/A'} - ${endStr || 'N/A'}`;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            let rightY = 12;
            doc.text(`Company Name: ${auditCompanyName}`, rightX, rightY, { align: 'right' });
            rightY += 5;
            if (auditorName) {
                doc.text(`Auditor Name: ${auditorName}`, rightX, rightY, { align: 'right' });
                rightY += 5;
            }
            if (period) {
                doc.text(`Audit Period: ${period}`, rightX, rightY, { align: 'right' });
            }

            doc.setDrawColor(209, 213, 219);
            doc.rect(marginX, 32, pageWidth - marginX * 2, 6);
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            const progressText = totalSkuCount > 0 ? `SKU: ${currentSkuIndex + 1} of ${totalSkuCount}` : '';
            if (progressText) {
                doc.text(progressText, marginX + 2, 36);
            }
            return 42;
        };

        for (let i = 0; i < skuKeys.length; i++) {
            const skuCode = skuKeys[i];
            const skuRows = grouped[skuCode];

            currentSkuIndex = i;

            if (i > 0) {
                doc.addPage();
            }

            let currentY = drawHeader();

            const firstRow = skuRows[0] || {};
            const detailsBody = [
                ['SKU Code', skuCode],
                ['SKU Description', firstRow.skuDescription || ''],
                ['SKU UOM', firstRow.skuUom || '']
            ];

            const productImageUrls = [];
            skuRows.forEach((r) => {
                const abs = toAbsUrl(r.productImage, API_URL);
                if (abs && !productImageUrls.includes(abs)) {
                    productImageUrls.push(abs);
                }
            });

            const availableWidth = pageWidth - marginX * 2;
            const leftColumnWidth = productImageUrls.length ? availableWidth * 0.72 : availableWidth;
            const rightColumnWidth = productImageUrls.length ? availableWidth - leftColumnWidth - 4 : 0;

            autoTable(doc, {
                startY: currentY,
                head: [['Field', 'Value']],
                body: detailsBody,
                theme: 'grid',
                margin: {
                    left: marginX,
                    right: productImageUrls.length ? marginX + rightColumnWidth + 4 : marginX
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    textColor: [15, 23, 42],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [249, 115, 22],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 32, textColor: [100, 116, 139] },
                    1: { cellWidth: 'auto' }
                },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    if (data.column.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.column.index === 1 && data.row.index === 0) {
                        data.cell.styles.font = 'courier';
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            const detailsTableTopY = currentY;
            const detailsTableBottomY = doc.lastAutoTable.finalY;

            if (productImageUrls.length) {
                const imageWidth = rightColumnWidth || 0;
                if (imageWidth > 0) {
                    const imageAreaX = pageWidth - marginX - imageWidth;
                    const skuSectionHeight = detailsTableBottomY - detailsTableTopY;
                    const gapsTotal = (productImageUrls.length - 1) * 4;
                    const maxImagesHeight = skuSectionHeight - gapsTotal;

                    if (maxImagesHeight > 0) {
                        const imageHeight = maxImagesHeight / productImageUrls.length;
                        let imageY = detailsTableTopY;
                        const innerPadding = 1;

                        for (let j = 0; j < productImageUrls.length; j++) {
                            const url = productImageUrls[j];
                            const imgMeta = await loadImageForPdf(url);
                            if (!imgMeta) continue;

                            const y = imageY;
                            doc.setDrawColor(209, 213, 219);
                            doc.rect(imageAreaX, y, imageWidth, imageHeight);

                            let format = 'JPEG';
                            const lower = url.toLowerCase();
                            if (lower.endsWith('.png')) format = 'PNG';

                            const boxWidth = imageWidth - innerPadding * 2;
                            const boxHeight = imageHeight - innerPadding * 2;
                            let drawW = boxWidth;
                            let drawH = boxHeight;

                            if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                                const ratio = Math.min(boxWidth / imgMeta.width, boxHeight / imgMeta.height);
                                drawW = imgMeta.width * ratio;
                                drawH = imgMeta.height * ratio;
                            }

                            const offsetX = imageAreaX + innerPadding + (boxWidth - drawW) / 2;
                            const offsetY = y + innerPadding + (boxHeight - drawH) / 2;

                            try {
                                doc.addImage(imgMeta.dataUrl, format, offsetX, offsetY, drawW, drawH);
                            } catch (e) {
                            }

                            imageY += imageHeight + 4;
                        }
                    }
                }
            }

            currentY = detailsTableBottomY + 8;

            const bulletizeCell = (value) => {
                const toItems = (val) => {
                    if (val === null || val === undefined) return [];
                    if (Array.isArray(val)) {
                        return val.flatMap((v) => toItems(v));
                    }
                    const str = val.toString().trim();
                    if (!str) return [];
                    const lines = str.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    const items = [];
                    lines.forEach((line) => {
                        line
                            .split(/\s*(?:\||,|;|\/)\s*/g)
                            .map((p) => p.trim())
                            .filter(Boolean)
                            .forEach((p) => items.push(p));
                    });
                    return items;
                };

                const items = toItems(value);
                if (!items.length) return '- -';
                return items.map((item) => `- ${item}`).join('\n');
            };

            const componentBody = skuRows.map((r, idx) => [
                String(idx + 1),
                bulletizeCell(r.packagingType),
                bulletizeCell(r.componentCode),
                bulletizeCell(r.componentDescription),
                bulletizeCell(r.componentPolymer),
                bulletizeCell(r.supplierName),
                bulletizeCell(r.category),
                bulletizeCell(r.containerCapacity),
                bulletizeCell(r.layerType),
                bulletizeCell(r.thickness),
                bulletizeCell(r.eprRegistrationNumber),
                bulletizeCell(r.rcPercentMentioned),
                bulletizeCell(r.complianceStatus)
            ]);

            const complianceColIndex = 12;

            autoTable(doc, {
                startY: currentY,
                head: [[
                    '#',
                    'Packaging Type',
                    'Component Code',
                    'Component Description',
                    'Component Polymer',
                    'Supplier Name',
                    'Category',
                    'Container Capacity',
                    'Monolayer / Multilayer',
                    'Thickness (Micron)',
                    'EPR Certificate Number',
                    'RC % Mentioned',
                    'Compliance Status'
                ]],
                body: componentBody,
                theme: 'grid',
                margin: { left: marginX, right: marginX },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
                headStyles: { fillColor: [249, 115, 22], textColor: 255 },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    if (data.column.index !== complianceColIndex) return;
                    const raw = (data.cell.raw || '').toString().toLowerCase();
                    if (!raw) return;
                    if (raw.includes('partial')) {
                        data.cell.styles.textColor = [217, 119, 6];
                    } else if (raw.includes('non')) {
                        data.cell.styles.textColor = [220, 38, 38];
                    } else if (raw.includes('complete')) {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            const auditRemarkEntries = skuRows
                .filter((r) => ((r.auditorRemarks ?? '').toString().trim().length > 0))
                .map((r) => ({
                    code: (r.componentCode || '').toString(),
                    description: (r.componentDescription || '').toString(),
                    text: (r.auditorRemarks || '').toString()
                }));

            if (auditRemarkEntries.length) {
                const bottomLimit = pageHeight - marginBottom - 10;
                const srNoColumnWidth = 10;

                if (currentY > bottomLimit) {
                    doc.addPage();
                    currentY = drawHeader();
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(249, 115, 22);
                doc.text('!', marginX, currentY);
                doc.text('Audit Remarks', marginX + 4, currentY);
                currentY += 5;

                let srNo = 1;
                auditRemarkEntries.forEach((entry) => {
                    const srNoText = `${srNo}.`;
                    const textStartX = marginX + srNoColumnWidth;
                    const headerParts = [];

                    if (entry.code) headerParts.push(entry.code);
                    if (entry.description) headerParts.push(`(${entry.description})`);

                    const headerText = headerParts.join(': ') || '';
                    const maxHeaderWidth = pageWidth - textStartX - marginX;
                    const headerLines = headerText
                        ? doc.splitTextToSize(headerText, maxHeaderWidth)
                        : [];

                    const bulletIndent = 2;
                    const bulletSymbolX = textStartX;
                    const bulletTextX = textStartX + bulletIndent;
                    const maxBulletWidth = pageWidth - bulletTextX - marginX;

                    if (currentY > bottomLimit) {
                        doc.addPage();
                        currentY = drawHeader();
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);

                    if (headerLines.length) {
                        headerLines.forEach((line, index) => {
                            if (currentY > bottomLimit) {
                                doc.addPage();
                                currentY = drawHeader();
                            }
                            if (index === 0) {
                                doc.text(srNoText, marginX, currentY);
                            }
                            doc.text(line, textStartX, currentY);
                            currentY += 4;
                        });
                    } else {
                        doc.text(srNoText, marginX, currentY);
                    }

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(55, 65, 81);

                    const items = parseRemarksToItems(entry.text);
                    if (items.length) {
                        items.forEach((item) => {
                            const bulletLines = doc.splitTextToSize(item, maxBulletWidth);
                            bulletLines.forEach((line) => {
                                if (currentY > bottomLimit) {
                                    doc.addPage();
                                    currentY = drawHeader();
                                }
                                doc.text('•', bulletSymbolX, currentY);
                                doc.text(line, bulletTextX, currentY);
                                currentY += 4;
                            });
                        });
                    } else {
                        if (currentY > bottomLimit) {
                            doc.addPage();
                            currentY = drawHeader();
                        }
                        doc.text(entry.text, textStartX, currentY);
                        currentY += 4;
                    }

                    currentY += 2;
                    srNo++;
                });
            }
        }

        doc.save(`Marking_Labelling_Report_${fullClientData?.clientName || 'Client'}.pdf`);
        toast.success('Packaging Assessment & Marking or Labelling Report generated successfully');
    } catch (err) {
        console.error('Report Error:', err);
        toast.error('Failed to generate report');
    } finally {
        setLoading(false);
    }
};

export const generateSkuComplianceReport = async ({
    skuComplianceData,
    fullClientData,
    authUser,
    API_URL,
    toast,
    setLoading
}) => {
    const rows = Array.isArray(skuComplianceData) ? skuComplianceData : [];
    const usableRows = rows.filter((r) => (r?.skuCode || '').toString().trim().length > 0);
    if (!usableRows.length) {
        toast.warning('No SKU Compliance data to export');
        return;
    }

    setLoading(true);
    try {
        const grouped = {};
        usableRows.forEach((row) => {
            const key = (row.skuCode || 'NO SKU').toString().trim() || 'NO SKU';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        });

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const marginX = 15;
        const marginY = 15;

        // --- Executive Summary ---
        const totalSKUs = Object.keys(grouped).length;
        let compliantCount = 0;
        let partiallyCount = 0;
        let nonCompliantCount = 0;

        Object.values(grouped).forEach(skuRows => {
            const status = (skuRows[0]?.complianceStatus || '').toLowerCase();
            if (status === 'compliant') compliantCount++;
            else if (status === 'partially compliant') partiallyCount++;
            else if (status === 'non-compliant') nonCompliantCount++;
            else nonCompliantCount++; // Treat empty/unknown as non-compliant or count separately? Assuming non-compliant for safety
        });

        // Add Header Function
        const drawHeader = (title = 'SKU Compliance Report') => {
            // Light Green Background for Header
            doc.setFillColor(240, 253, 244); 
            doc.rect(0, 0, pageWidth, 25, 'F');

            // Client Info (Top Left)
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const clientName = fullClientData?.clientName || 'Client Name';
            doc.text(clientName, marginX, 10);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const clientCategory = fullClientData?.category === 'PWP' 
                ? (fullClientData?.notes?.match(/PWP Category:\s*([^\|]+)/i)?.[1]?.trim() || 'PWP')
                : (fullClientData?.entityType || 'N/A');
            
            doc.text(`PIBO Category: ${clientCategory}   FY-${fullClientData?.financialYear || ''}`, marginX, 16);
            
            doc.setFont('helvetica', 'bold');
            doc.text(title, marginX, 22);

            // Audit Info (Top Right)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const rightX = pageWidth - marginX;
            doc.text(`Company Name: Ananttattva Private Limited`, rightX, 10, { align: 'right' });
            
            const auditorName = (fullClientData?.assignedTo?.name || authUser?.name || '').toLowerCase() === 'admin' 
                ? (fullClientData?.assignedTo?.name || '') 
                : (authUser?.name || '');
            
            if (auditorName) {
                doc.text(`Auditor Name: ${auditorName}`, rightX, 16, { align: 'right' });
            }
        };

        drawHeader('Executive Summary');

        // Draw Summary Cards
        const cardWidth = (pageWidth - (marginX * 2) - 30) / 4; // 4 cards with gaps
        const cardHeight = 35;
        const cardY = 40;

        const drawCard = (x, label, count, colorHex, borderHex) => {
            doc.setDrawColor(borderHex);
            doc.setFillColor(255, 255, 255);
            // Slight background tint if needed, but screenshot shows white with colored border/text? 
            // Actually screenshot shows light bg. Let's stick to white with colored text for simplicity or match exact if needed.
            // Screenshot: "Total SKUs" (Blue border/bg?), "Fully Compliant" (Green), "Partially" (Orange), "Non" (Red)
            
            // Let's use light fills based on status
            if (label.includes('Fully')) doc.setFillColor(240, 253, 244); // green-50
            else if (label.includes('Partially')) doc.setFillColor(255, 251, 235); // amber-50
            else if (label.includes('Non')) doc.setFillColor(254, 242, 242); // red-50
            else doc.setFillColor(248, 250, 252); // slate-50

            doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(label, x + cardWidth/2, cardY + 10, { align: 'center' });
            
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            if (label.includes('Fully')) doc.setTextColor(22, 163, 74);
            else if (label.includes('Partially')) doc.setTextColor(217, 119, 6);
            else if (label.includes('Non')) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(15, 23, 42);
            
            doc.text(String(count), x + cardWidth/2, cardY + 25, { align: 'center' });
        };

        let currentX = marginX;
        drawCard(currentX, 'Total SKUs', totalSKUs, '#e2e8f0', '#cbd5e1');
        currentX += cardWidth + 10;
        drawCard(currentX, 'Fully Compliant', compliantCount, '#dcfce7', '#86efac');
        currentX += cardWidth + 10;
        drawCard(currentX, 'Partially Compliant', partiallyCount, '#fef3c7', '#fcd34d');
        currentX += cardWidth + 10;
        drawCard(currentX, 'Non-Compliant', nonCompliantCount, '#fee2e2', '#fca5a5');

        // --- Individual SKU Pages ---
        const skuKeys = Object.keys(grouped);
        
        for (let i = 0; i < skuKeys.length; i++) {
            const skuCode = skuKeys[i];
            const row = grouped[skuCode][0]; // Assuming 1 row per SKU mainly
            
            doc.addPage();
            drawHeader('SKU Compliance Report');

            // SKU Progress Bar
            doc.setDrawColor(209, 213, 219);
            doc.rect(marginX, 30, pageWidth - (marginX * 2), 8);
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            doc.text(`SKU: ${i + 1} of ${totalSKUs}`, marginX + 3, 35.5);

            // Basic Info Table & Image
            const basicInfoY = 45;
            
            // Product Image Handling
            let imgData = null;
            let imgDims = null;
            if (row.productImage) {
                const absUrl = toAbsUrl(row.productImage, API_URL);
                const meta = await loadImageForPdf(absUrl);
                if (meta) {
                    imgData = meta.dataUrl;
                    imgDims = meta;
                }
            }

            const imageAreaWidth = 60;
            const imageAreaHeight = 40;
            const tableWidth = pageWidth - (marginX * 2) - imageAreaWidth - 5;

            // Basic Info Table
            autoTable(doc, {
                startY: basicInfoY,
                head: [['Field', 'Value']],
                body: [
                    ['SKU Code', row.skuCode],
                    ['SKU Description', row.skuDescription || '-'],
                    ['SKU UOM', row.skuUm || '-']
                ],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [229, 231, 235] },
                headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', textColor: [249, 115, 22] } }, // Orange text for keys? No, screenshot has orange header, normal keys.
                // Wait, screenshot basic table has Orange Header "Field | Value". 
                // Rows: SKU Code | FG00...
                margin: { left: marginX },
                tableWidth: tableWidth
            });

            // Draw Image Box on Right
            doc.setDrawColor(229, 231, 235);
            doc.rect(pageWidth - marginX - imageAreaWidth, basicInfoY, imageAreaWidth, imageAreaHeight);
            
            if (imgData && imgDims) {
                const pad = 2;
                const boxW = imageAreaWidth - (pad*2);
                const boxH = imageAreaHeight - (pad*2);
                const ratio = Math.min(boxW / imgDims.width, boxH / imgDims.height);
                const drawW = imgDims.width * ratio;
                const drawH = imgDims.height * ratio;
                const ix = (pageWidth - marginX - imageAreaWidth) + pad + (boxW - drawW)/2;
                const iy = basicInfoY + pad + (boxH - drawH)/2;
                doc.addImage(imgData, 'JPEG', ix, iy, drawW, drawH);
            }

            // Section Title: ! SKU Compliance Details
            let currentY = Math.max(doc.lastAutoTable.finalY, basicInfoY + imageAreaHeight) + 10;
            
            doc.setFontSize(11);
            doc.setTextColor(249, 115, 22); // Orange
            doc.setFont('helvetica', 'bold');
            doc.text('!', marginX, currentY);
            doc.text('SKU Compliance Details', marginX + 4, currentY);
            currentY += 4;

            // Detailed Table
            const detailsBody = [
                ['Name of Brand Owner', row.brandOwner],
                ['EPR Certificate Number (Brand Owner)', row.eprCertBrandOwner],
                ['EPR Certificate Number (Producer)/(Importer)', row.eprCertProducer],
                ['Thickness Mentioned', row.thicknessMentioned],
                ['Polymer Used', Array.isArray(row.polymerUsed) ? row.polymerUsed.join(', ') : row.polymerUsed],
                ['Polymer Mentioned', row.polymerMentioned],
                ['Recycled % (Disclosed/Not Disclosed)', row.recycledPercent],
                ['Registration No. of Compostable/Biodegradable Plastic Declared Missing', row.compostableRegNo],
                ['Compliance Status', row.complianceStatus]
            ];

            autoTable(doc, {
                startY: currentY,
                head: [['Field', 'Value']],
                body: detailsBody,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [229, 231, 235], textColor: [55, 65, 81] },
                headStyles: { fillColor: [249, 115, 22], textColor: 255 },
                columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold', textColor: [100, 116, 139] } },
                margin: { left: marginX, right: marginX },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.row.index === detailsBody.length - 1) {
                        // Compliance Status Row Styling
                        data.cell.styles.fillColor = [255, 237, 213]; // Light Orange bg
                        if (data.column.index === 1) {
                             const val = (data.cell.raw || '').toString().toLowerCase();
                             if (val.includes('partially')) {
                                 // Add orange dot? 
                                 // Simple text color for now
                                 data.cell.styles.textColor = [217, 119, 6]; 
                             } else if (val.includes('non')) {
                                 data.cell.styles.textColor = [220, 38, 38];
                             } else if (val.includes('compliant')) {
                                 data.cell.styles.textColor = [22, 163, 74];
                             }
                        }
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            // Remarks Section
            if (row.remarks && (Array.isArray(row.remarks) ? row.remarks.length > 0 : row.remarks)) {
                doc.setFontSize(11);
                doc.setTextColor(249, 115, 22);
                doc.text('!', marginX, currentY);
                doc.text('Remarks', marginX + 4, currentY);
                currentY += 6;

                doc.setFontSize(9);
                doc.setTextColor(55, 65, 81);
                doc.setFont('helvetica', 'normal');
                
                const rems = Array.isArray(row.remarks) ? row.remarks : [row.remarks];
                rems.forEach(r => {
                    doc.text(`• ${r}`, marginX + 4, currentY);
                    currentY += 5;
                });
                currentY += 5;
            }

            // Marking Images
            if (row.markingImage && row.markingImage.length > 0) {
                // Check if space exists, else new page
                if (currentY + 60 > pageHeight) {
                    doc.addPage();
                    drawHeader('SKU Compliance Report');
                    currentY = 40;
                }

                doc.setFontSize(11);
                doc.setTextColor(15, 23, 42); // Dark
                doc.setFont('helvetica', 'normal');
                doc.text('Marking Images', marginX, currentY);
                currentY += 8;

                const imgW = 40;
                const imgH = 50;
                const gap = 5;
                let imgX = marginX;

                for (const imgObj of row.markingImage) {
                    const url = imgObj.url || imgObj; // Handle object or string
                    const absUrl = toAbsUrl(url, API_URL);
                    const meta = await loadImageForPdf(absUrl);
                    
                    if (meta) {
                        // Draw Border Box
                        doc.setDrawColor(229, 231, 235);
                        doc.rect(imgX, currentY, imgW, imgH);

                        // Draw Image Centered
                        const pad = 2;
                        const boxW = imgW - (pad*2);
                        const boxH = imgH - (pad*2);
                        const ratio = Math.min(boxW / meta.width, boxH / meta.height);
                        const drawW = meta.width * ratio;
                        const drawH = meta.height * ratio;
                        const ix = imgX + pad + (boxW - drawW)/2;
                        const iy = currentY + pad + (boxH - drawH)/2;
                        
                        doc.addImage(meta.dataUrl, 'JPEG', ix, iy, drawW, drawH);

                        imgX += imgW + gap;
                        
                        // Wrap if too many images (simple check)
                        if (imgX + imgW > pageWidth - marginX) {
                            imgX = marginX;
                            currentY += imgH + gap;
                        }
                    }
                }
            }
        }

        doc.save(`SKU_Compliance_Report_${fullClientData?.clientName || 'Client'}.pdf`);
        toast.success('SKU Compliance Report generated successfully');
    } catch (err) {
        console.error('SKU Report Error:', err);
        toast.error('Failed to generate SKU report');
    } finally {
        setLoading(false);
    }
};

const parseRemarksToItems = (value) => {
    if (!value) return [];
    if (typeof value !== 'string') return [];
    const lines = value.split(/\r?\n/);
    const items = [];
    lines.forEach((line) => {
        const parts = line.split(/(?:\||,|;|\/)/);
        parts.forEach((p) => {
            const t = p.trim();
            if (t) items.push(t);
        });
    });
    return items;
};
