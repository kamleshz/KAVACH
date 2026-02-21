import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Table, message, Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, SaveOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { useClientContext } from '../../context/ClientContext';

const SalesAnalysis = ({ clientId, type, itemId, readOnly = false, entityType, showTargetsOnTop = false }) => {
    const { formData } = useClientContext();
    const currentEntityType = entityType || formData?.entityType;
    const isBrandOwner = (currentEntityType || '').toString() === 'Brand Owner';
    
    // rawRows: keeps the detailed data if needed for backend save
    const [rawRows, setRawRows] = useState([]);
    // summaryData: for the display table
    const [summaryData, setSummaryData] = useState([]);
    // fySummaryData: for the Financial Year display table
    const [fySummaryData, setFySummaryData] = useState([]);
    const [financialYears, setFinancialYears] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [targetTables, setTargetTables] = useState([]);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (clientId && type && itemId) {
            fetchSavedAnalysis();
        }
    }, [clientId, type, itemId]);

    // Calculate Main Summary and FY Summary whenever rawRows changes
    useEffect(() => {
        if (rawRows.length > 0) {
            calculateMainSummary(rawRows);
        } else {
            setSummaryData([]);
            setFySummaryData([]);
            setFinancialYears([]);
            setTargetTables([]);
        }
    }, [rawRows]);

    const calculateMainSummary = (rows) => {
        // 1. Extract Unique Financial Years
        const years = [...new Set(rows.map(r => r.financialYear || 'Unknown'))].sort();
        setFinancialYears(years);

        // 2. Initialize Aggregation Structure
        const categories = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV'];
        const aggregation = {};
        categories.forEach(cat => {
            aggregation[cat] = {
                category: cat,
                key: cat,
                registered: { total: 0 },
                unregistered: { total: 0 }
            };
            years.forEach(yr => {
                aggregation[cat].registered[yr] = 0;
                aggregation[cat].unregistered[yr] = 0;
            });
        });

        // 3. Populate Data
        rows.forEach(row => {
            const cat = (row.plasticCategory || '').toString().toUpperCase(); // Normalize input
            const fy = row.financialYear || 'Unknown';
            const regType = (row.registrationType || '').toLowerCase();
            const qty = parseFloat(row.totalPlasticQty) || 0;

            let matchedCat = null;
            if (cat) {
                 // Priority matching for Roman Numerals (IV > III > II > I)
                 if (cat.includes("IV") || cat.includes("CAT-IV") || cat.includes("CAT IV") || cat.includes("CATEGORY IV")) matchedCat = "Cat-IV";
                 else if (cat.includes("III") || cat.includes("CAT-III") || cat.includes("CAT III") || cat.includes("CATEGORY III")) matchedCat = "Cat-III";
                 else if (cat.includes("II") || cat.includes("CAT-II") || cat.includes("CAT II") || cat.includes("CATEGORY II")) matchedCat = "Cat-II";
                 
                 // Check for Cat I variations, including "Cat I (Containers...)"
                 else if (cat.includes("CAT-I") || cat.includes("CAT I") || cat.includes("CATEGORY I") || (cat.includes("I") && cat.includes("CONTAINER"))) matchedCat = "Cat-I";
                 
                 // Fallback: Check if it just contains "I" but ensure it's not part of II, III, IV
                 else if (/\bI\b/.test(cat) || /CAT.*I/.test(cat)) matchedCat = "Cat-I";
                 
                 // Fallback to direct match if defined in aggregation
                 else if (aggregation[row.plasticCategory]) matchedCat = row.plasticCategory;
            }

            if (matchedCat && aggregation[matchedCat]) {
                if (regType.includes('unregistered')) {
                    aggregation[matchedCat].unregistered[fy] = (aggregation[matchedCat].unregistered[fy] || 0) + qty;
                    aggregation[matchedCat].unregistered.total += qty;
                } else if (regType.includes('registered')) {
                    aggregation[matchedCat].registered[fy] = (aggregation[matchedCat].registered[fy] || 0) + qty;
                    aggregation[matchedCat].registered.total += qty;
                }
            }
        });

        // 4. Flatten to summaryData
        const newSummary = Object.values(aggregation).map(item => {
            const row = {
                key: item.key,
                category: item.category,
                registeredQty: item.registered.total.toFixed(2),
                unregisteredQty: item.unregistered.total.toFixed(2),
            };
            
            years.forEach(yr => {
                row[`reg_${yr}`] = (item.registered[yr] || 0).toFixed(2);
                row[`unreg_${yr}`] = (item.unregistered[yr] || 0).toFixed(2);
            });
            
            return row;
        });

        // 5. Add Total Row
        const totalRow = {
            key: 'Total',
            category: 'Total',
            registeredQty: newSummary.reduce((sum, r) => sum + parseFloat(r.registeredQty || 0), 0).toFixed(2),
            unregisteredQty: newSummary.reduce((sum, r) => sum + parseFloat(r.unregisteredQty || 0), 0).toFixed(2)
        };
        years.forEach(yr => {
            totalRow[`reg_${yr}`] = newSummary.reduce((sum, r) => sum + parseFloat(r[`reg_${yr}`] || 0), 0).toFixed(2);
            totalRow[`unreg_${yr}`] = newSummary.reduce((sum, r) => sum + parseFloat(r[`unreg_${yr}`] || 0), 0).toFixed(2);
        });
        newSummary.push(totalRow);

        setSummaryData(newSummary);
        
        // Also calculate FY Summary table
        calculateFySummary(rows);
        // And Producer EPR Target Calculation based on Sales
        calculateProducerTargetsFromSales(rows, years);
    };

    const calculateFySummary = (rows) => {
        const fyMap = {};

        rows.forEach(row => {
            const fy = row.financialYear || 'Unknown';
            const regType = (row.registrationType || '').toLowerCase();
            const qty = parseFloat(row.totalPlasticQty) || 0;

            if (!fyMap[fy]) {
                fyMap[fy] = {
                    financialYear: fy,
                    registeredQty: 0,
                    unregisteredQty: 0
                };
            }

            if (regType.includes('unregistered')) {
                fyMap[fy].unregisteredQty += qty;
            } else if (regType.includes('registered')) {
                fyMap[fy].registeredQty += qty;
            }
        });

        const fyData = Object.values(fyMap).map(item => ({
            key: item.financialYear,
            financialYear: item.financialYear,
            registeredQty: item.registeredQty.toFixed(2),
            unregisteredQty: item.unregisteredQty.toFixed(2)
        }));

        // Sort by Financial Year if possible (e.g., 2023-24 before 2024-25)
        fyData.sort((a, b) => a.financialYear.localeCompare(b.financialYear));

        setFySummaryData(fyData);
    };

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

    const getNextFinancialYear = (fy) => {
        if (!fy || typeof fy !== 'string' || !fy.includes('-')) return fy;
        const [start, end] = fy.split('-').map(s => parseInt(s, 10));
        const nextStart = start + 1;
        const nextEnd = end + 1;
        return `${nextStart}-${String(nextEnd).padStart(2, '0')}`;
    };

    const calculateProducerTargetsFromSales = (rows, years) => {
        const categories = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV'];
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
        const yearlyAgg = {};
        categories.forEach(cat => { yearlyAgg[cat] = {}; });

        rows.forEach(row => {
            const cat = normalizeSalesCategory(row.plasticCategory);
            const fy = row.financialYear || 'Unknown';
            const qty = parseFloat(row.totalPlasticQty) || 0;
            if (!cat) return;
            const val = qty;
            yearlyAgg[cat][fy] = (yearlyAgg[cat][fy] || 0) + val;
        });

        const sortedYears = [...years].sort();
        const tables = [];
        if (sortedYears.length >= 2) {
            for (let i = 0; i < sortedYears.length - 1; i++) {
                const year1 = sortedYears[i];
                const year2 = sortedYears[i + 1];
                const targetYear = sortedYears[i + 2] || getNextFinancialYear(year2);

                const data = categories.map(cat => {
                    const val1 = parseFloat(yearlyAgg[cat]?.[year1] || 0);
                    const val2 = parseFloat(yearlyAgg[cat]?.[year2] || 0);
                    const avg = (val1 + val2) / 2;

                    // Registered Sales for Year2 (Producer logic)
                    // Using FY summary derived from rows (registered only)
                    const regYear2 = rows
                        .filter(r => {
                            const rCat = normalizeSalesCategory(r.plasticCategory);
                            const rYear = r.financialYear || '';
                            const type = (r.registrationType || '').toLowerCase();
                            const status = (r.uploadStatus || '').toString().trim().toLowerCase();
                            const statusOk = !status || status === 'completed';
                            return rCat === cat && rYear === year2 && type.includes('registered') && !type.includes('unregistered') && statusOk;
                        })
                        .reduce((sum, r) => sum + (parseFloat(r.totalPlasticQty) || 0), 0);

                    // Recycled Plastic % for Year2 (Producer logic)
                    // Taken from Excel column "Recycled Plastic %" for latest year (year2)
                    // Only from REGISTERED entries (same registration filter as Registered Sales)
                    const recycledRows = rows.filter(r => {
                        const rCat = normalizeSalesCategory(r.plasticCategory);
                        const rYear = r.financialYear || '';
                        const type = (r.registrationType || '').toLowerCase();
                        const status = (r.uploadStatus || '').toString().trim().toLowerCase();
                        const statusOk = !status || status === 'completed';
                        const rawPct = r.recycledPlasticPercent;
                        const hasPct = rawPct !== undefined && rawPct !== null && String(rawPct).toString().trim() !== '';
                        const isRegisteredOnly = type.includes('registered') && !type.includes('unregistered');
                        return rCat === cat && rYear === year2 && hasPct && isRegisteredOnly && statusOk;
                    });

                    let recycledPct = 0;
                    if (recycledRows.length > 0) {
                        const sumPct = recycledRows.reduce((sum, r) => {
                            const raw = r.recycledPlasticPercent;
                            const cleaned = typeof raw === 'string' ? raw.replace('%', '') : raw;
                            const num = parseFloat(cleaned) || 0;
                            return sum + num;
                        }, 0);
                        recycledPct = sumPct;
                    }

                    const recycledQty = (avg * recycledPct) / 100;

                    const targetVal = avg - regYear2 - recycledQty;

                    const row = {
                        "Category of Plastic": cat,
                        [year1]: parseFloat(val1.toFixed(4)),
                        [year2]: parseFloat(val2.toFixed(4)),
                        "Avg": parseFloat(avg.toFixed(4)),
                        [`Registered Sales (${year2})`]: parseFloat(regYear2.toFixed(4)),
                        [`Recycled Plastic % (${year2})`]: parseFloat(recycledPct.toFixed(2)),
                        "Recycled Qty": parseFloat(recycledQty.toFixed(4)),
                        [`Target Of Virgin ${targetYear}`]: parseFloat(targetVal.toFixed(4)),
                    };
                    return row;
                });

                const columns = [
                    "Category of Plastic",
                    year1,
                    year2,
                    "Avg",
                    `Registered Sales (${year2})`,
                    `Recycled Plastic % (${year2})`,
                    "Recycled Qty",
                    `Target Of Virgin ${targetYear}`
                ];
                tables.push({ title: `Target Calculation for ${targetYear} (Producer)`, data, columns });
            }
        }

        if (sortedYears.length > 0) {
            const activeYear = sortedYears[sortedYears.length - 1];

            const urepMandateColumnLabel = `Urep Target (FY ${activeYear} as per Mandate)`;
            const urepQtyColumnLabel = `Urep Target`;

            const urepData = categories.map(cat => {
                const catTargets = UREP_TARGET_MATRIX[cat] || {};
                const pct = catTargets[activeYear] !== undefined ? catTargets[activeYear] : 0;
                const baseQty = parseFloat(yearlyAgg[cat]?.[activeYear] || 0);
                const qty = (baseQty * pct) / 100;
                return {
                    "Plastic Category": cat,
                    [urepMandateColumnLabel]: pct,
                    [urepQtyColumnLabel]: parseFloat(qty.toFixed(4)),
                };
            });

            const urepColumns = ["Plastic Category", urepMandateColumnLabel, urepQtyColumnLabel];
            tables.push({
                title: `Urep Target for ${activeYear} (As per Mandate)`,
                data: urepData,
                columns: urepColumns,
            });
        }

        setTargetTables(tables);
    };

    const fetchSavedAnalysis = async () => {
        try {
            const response = await api.get(`${API_ENDPOINTS.ANALYSIS.SALES}/${clientId}`, {
                params: { type, itemId }
            });
            
            if (response.data.success) {
                // Backend returns top-level keys: salesRows, salesSummary, salesTargetTables, lastUpdated
                // or returns data: null if not found
                if (response.data.salesRows || response.data.salesSummary) {
                    setRawRows(response.data.salesRows || []);
                    
                    // Sanitize summary data to ensure no objects are passed as children
                    // Check if salesSummary is an array, otherwise default to empty array
                    const rawSummary = Array.isArray(response.data.salesSummary) ? response.data.salesSummary : [];
                    const sanitizedSummary = rawSummary.map(item => {
                        // Helper to extract primitive value from potential serialized React element object
                        const extractValue = (val) => {
                            if (val && typeof val === 'object') {
                                // Check for common structure of serialized React element or just return string
                                if (val.props && val.props.children) {
                                    return val.props.children;
                                }
                                // If it's the specific Total object we used to save
                                return ''; 
                            }
                            return val;
                        };

                        if (item.key === 'Total') {
                            return {
                                ...item,
                                category: 'Total',
                                registeredQty: extractValue(item.registeredQty),
                                unregisteredQty: extractValue(item.unregisteredQty)
                            };
                        }
                        return item;
                    });

                    setSummaryData(sanitizedSummary);

                    if (Array.isArray(response.data.salesTargetTables) && response.data.salesTargetTables.length > 0) {
                        setTargetTables(response.data.salesTargetTables);
                    }
                    setLastUpdated(response.data.lastUpdated);
                }
            }
        } catch (error) {
            console.error("Failed to fetch saved analysis:", error);
        }
    };

    const handleSave = async () => {
        if (summaryData.length === 0) {
            message.warning("No data to save");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(API_ENDPOINTS.ANALYSIS.SALES, {
                clientId,
                type,
                itemId,
                summary: summaryData,
                rows: rawRows,
                targetTables
            });

            if (response.data.success) {
                message.success("Sales analysis saved successfully");
                setLastUpdated(new Date());
            } else {
                message.error("Failed to save: " + response.data.message);
            }
        } catch (error) {
            console.error("Save error:", error);
            message.error("Error saving data");
        } finally {
            setLoading(false);
        }
    };

    const handleSalesExcelUpload = (e) => {
        if (isBrandOwner) {
            message.info('Your category is Brand Owner. Sales data upload is not applicable.');
            return;
        }
        // Handle both standard input event and Antd Upload info
        const file = e.target ? e.target.files[0] : e.file; 
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 2) {
                    message.error('Excel file is empty or missing headers');
                    return;
                }

                // Normalize headers
                const headers = data[0].map(h => (h || '').toString().trim().toLowerCase());
                const headerMap = {
                    'registration type': 'registrationType',
                    'category of plastic': 'plasticCategory',
                    'total plastic qty (tons)': 'totalPlasticQty',
                    'entity type': 'entityType',
                    'name of the entity': 'entityName',
                    'plastic material type': 'plasticMaterialType',
                    'financial year': 'financialYear',
                    'gst': 'gst',
                    'upload status': 'uploadStatus',
                    'recycled plastic %': 'recycledPlasticPercent'
                };

                const processedRows = [];
                
                // Remove local aggregation, rely on calculateMainSummary

                for (let i = 1; i < data.length; i++) {
                    const rowData = data[i];
                    if (!rowData || rowData.length === 0) continue;

                    const newRow = {};
                    let hasData = false;
                    
                    headers.forEach((h, idx) => {
                        if (headerMap[h]) {
                            newRow[headerMap[h]] = (rowData[idx] || '').toString();
                            hasData = true;
                        }
                    });

                    if (hasData) {
                        processedRows.push({ ...newRow, key: Date.now() + i });
                    }
                }

                setRawRows(processedRows);
                // calculateMainSummary will trigger via useEffect

                message.success(`Uploaded and processed ${processedRows.length} rows`);
            } catch (err) {
                console.error('Excel upload error:', err);
                message.error('Failed to parse Excel file');
            }
        };
        reader.readAsBinaryString(file);
        // If using standard input, reset value
        if (e.target) e.target.value = null; 
    };

    const columns = useMemo(() => {
        const baseCols = [
            {
                title: 'Category of Plastic',
                dataIndex: 'category',
                key: 'category',
                width: 150,
                render: (text, record) => (
                    <span className={`font-medium ${record.key === 'Total' ? 'font-bold' : ''}`}>
                        {text}
                    </span>
                )
            }
        ];

        // Registered Columns
        const regChildren = [];
        if (financialYears.length > 0) {
            financialYears.forEach(fy => {
                regChildren.push({
                    title: fy,
                    dataIndex: `reg_${fy}`,
                    key: `reg_${fy}`,
                    align: 'center',
                    width: 120,
                    render: (text, record) => <span className={record.key === 'Total' ? 'font-bold' : ''}>{text}</span>
                });
            });
        }
        regChildren.push({
            title: 'Total',
            dataIndex: 'registeredQty',
            key: 'registeredQty',
            align: 'center',
            width: 120,
            render: (text, record) => (
                <span className={record.key === 'Total' ? 'font-bold' : ''}>
                    {text}
                </span>
            )
        });

        baseCols.push({
            title: 'Registered',
            children: regChildren
        });

        // Unregistered Columns
        const unregChildren = [];
        if (financialYears.length > 0) {
            financialYears.forEach(fy => {
                unregChildren.push({
                    title: fy,
                    dataIndex: `unreg_${fy}`,
                    key: `unreg_${fy}`,
                    align: 'center',
                    width: 120,
                    render: (text, record) => <span className={record.key === 'Total' ? 'font-bold' : ''}>{text}</span>
                });
            });
        }
        unregChildren.push({
            title: 'Total',
            dataIndex: 'unregisteredQty',
            key: 'unregisteredQty',
            align: 'center',
            width: 120,
            render: (text, record) => (
                <span className={record.key === 'Total' ? 'font-bold' : ''}>
                    {text}
                </span>
            )
        });

        baseCols.push({
            title: 'Unregistered',
            children: unregChildren
        });

        return baseCols;
    }, [financialYears]);

    const expandedRowRender = (record) => {
        if (record.key === 'Total') return null;

        // Filter data for this category
        const categoryData = rawRows.filter(row => {
            const cat = (row.plasticCategory || '').toString().toUpperCase();
            
            let matchedCat = null;
            if (cat) {
                 if (cat.includes("IV") || cat.includes("CAT-IV") || cat.includes("CAT IV") || cat.includes("CATEGORY IV")) matchedCat = "Cat-IV";
                 else if (cat.includes("III") || cat.includes("CAT-III") || cat.includes("CAT III") || cat.includes("CATEGORY III")) matchedCat = "Cat-III";
                 else if (cat.includes("II") || cat.includes("CAT-II") || cat.includes("CAT II") || cat.includes("CATEGORY II")) matchedCat = "Cat-II";
                 else if (cat.includes("CAT-I") || cat.includes("CAT I") || cat.includes("CATEGORY I") || (cat.includes("I") && cat.includes("CONTAINER"))) matchedCat = "Cat-I";
                 else if (/\bI\b/.test(cat) || /CAT.*I/.test(cat)) matchedCat = "Cat-I";
                 else if (row.plasticCategory === record.key) matchedCat = record.key;
            }

            return matchedCat === record.key;
        });

        const registeredData = categoryData.filter(row => (row.registrationType || '').toLowerCase().includes('registered') && !(row.registrationType || '').toLowerCase().includes('unregistered'));
        const unregisteredData = categoryData.filter(row => (row.registrationType || '').toLowerCase().includes('unregistered'));

        const detailColumns = [
            { title: 'Registration Type', dataIndex: 'registrationType', key: 'registrationType' },
            { title: 'Entity Type', dataIndex: 'entityType', key: 'entityType' },
            { title: 'Name of the Entity', dataIndex: 'entityName', key: 'entityName' },
            { title: 'Plastic Material Type', dataIndex: 'plasticMaterialType', key: 'plasticMaterialType' },
            { title: 'Category of Plastic', dataIndex: 'plasticCategory', key: 'plasticCategory' },
            { title: 'Financial Year', dataIndex: 'financialYear', key: 'financialYear' },
            { title: 'Total Plastic Qty (Tons)', dataIndex: 'totalPlasticQty', key: 'totalPlasticQty' },
            { title: 'GST', dataIndex: 'gst', key: 'gst' },
        ];

        return (
            <div className="bg-gray-50 p-4 rounded-md">
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-blue-600 mb-2 border-b border-blue-100 pb-1">Registered Entities Breakdown</h4>
                    {registeredData.length > 0 ? (
                        <Table
                            columns={detailColumns}
                            dataSource={registeredData}
                            pagination={false}
                            size="small"
                            bordered
                            rowKey="key"
                        />
                    ) : (
                        <p className="text-gray-400 italic text-xs">No registered entities found for this category.</p>
                    )}
                </div>
                
                <div>
                    <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b border-orange-100 pb-1">Unregistered Entities Breakdown</h4>
                    {unregisteredData.length > 0 ? (
                        <Table
                            columns={detailColumns}
                            dataSource={unregisteredData}
                            pagination={false}
                            size="small"
                            bordered
                            rowKey="key"
                        />
                    ) : (
                        <p className="text-gray-400 italic text-xs">No unregistered entities found for this category.</p>
                    )}
                </div>
            </div>
        );
    };

    const fyExpandedRowRender = (record) => {
        // Filter data for this Financial Year
        const fyData = rawRows.filter(row => (row.financialYear || 'Unknown') === record.financialYear);

        const registeredData = fyData.filter(row => (row.registrationType || '').toLowerCase().includes('registered') && !(row.registrationType || '').toLowerCase().includes('unregistered'));
        const unregisteredData = fyData.filter(row => (row.registrationType || '').toLowerCase().includes('unregistered'));

        // Columns showing only Entity Name and Qty as requested for "client name also"
        // But let's show Entity Name and Qty mainly, maybe Type too.
        const entityColumns = [
            { title: 'Name of the Entity', dataIndex: 'entityName', key: 'entityName' },
            { title: 'Total Plastic Qty (Tons)', dataIndex: 'totalPlasticQty', key: 'totalPlasticQty' },
            { title: 'Category', dataIndex: 'plasticCategory', key: 'plasticCategory' },
        ];

        return (
            <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold text-blue-600 mb-2 border-b border-blue-100 pb-1">Registered Clients ({registeredData.length})</h4>
                        {registeredData.length > 0 ? (
                            <Table
                                columns={entityColumns}
                                dataSource={registeredData}
                                pagination={false}
                                size="small"
                                bordered
                                rowKey="key"
                                scroll={{ y: 300 }}
                            />
                        ) : (
                            <p className="text-gray-400 italic text-xs">No registered clients found.</p>
                        )}
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-semibold text-orange-600 mb-2 border-b border-orange-100 pb-1">Unregistered Clients ({unregisteredData.length})</h4>
                        {unregisteredData.length > 0 ? (
                            <Table
                                columns={entityColumns}
                                dataSource={unregisteredData}
                                pagination={false}
                                size="small"
                                bordered
                                rowKey="key"
                                scroll={{ y: 300 }}
                            />
                        ) : (
                            <p className="text-gray-400 italic text-xs">No unregistered clients found.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const fyColumns = [
        {
            title: 'Financial Year',
            dataIndex: 'financialYear',
            key: 'financialYear',
            render: (text) => <span className="font-semibold">{text}</span>
        },
        {
            title: 'Registered Qty (Tons)',
            dataIndex: 'registeredQty',
            key: 'registeredQty',
            align: 'center',
            className: 'text-blue-600 font-medium'
        },
        {
            title: 'Unregistered Qty (Tons)',
            dataIndex: 'unregisteredQty',
            key: 'unregisteredQty',
            align: 'center',
            className: 'text-orange-600 font-medium'
        },
        {
            title: 'Total Qty (Tons)',
            key: 'totalQty',
            align: 'center',
            render: (_, record) => (
                <span className="font-bold">
                    {(parseFloat(record.registeredQty) + parseFloat(record.unregisteredQty)).toFixed(2)}
                </span>
            )
        }
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            {/* Header Section */}
            {!readOnly && (
            <div className="mb-6">
                <h3 className="text-blue-600 font-semibold text-lg uppercase mb-4">UPLOAD DATA FILES</h3>
                
                {isBrandOwner ? (
                    <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-4 py-3">
                        Your category is Brand Owner. Sales data upload is not applicable.
                    </div>
                ) : (
                    <div className="mb-2">
                        <p className="text-gray-700 font-medium mb-2">Sales / Base File</p>
                        <div className="flex items-center gap-4">
                            <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer transition-colors">
                                <UploadOutlined className="mr-2 text-gray-500" />
                                Select Sales File
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={handleSalesExcelUpload}
                                />
                            </label>
                            
                            {rawRows.length > 0 && (
                                <>
                                    <Button 
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        loading={loading}
                                        onClick={handleSave}
                                    >
                                        Save Data
                                    </Button>
                                    <Button 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => {
                                            setRawRows([]);
                                            setSummaryData([]);
                                            message.info('Data cleared');
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </>
                            )}
                            {lastUpdated && (
                                <span className="text-xs text-gray-500 ml-2">
                                    Last saved: {new Date(lastUpdated).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* EPR Target Calculation (Top Position) */}
            {showTargetsOnTop && targetTables.length > 0 && (entityType === 'Producer' || !entityType) && (
                <div className="mb-8">
                    <h3 className="text-gray-700 font-semibold text-lg mb-4">EPR Target Calculation</h3>
                    <div className="space-y-6">
                        {targetTables.map((table, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-semibold text-gray-700">
                                    {table.title}
                                </div>
                                <Table
                                    dataSource={table.data}
                                    columns={table.columns.map(col => ({
                                        title: col,
                                        dataIndex: col,
                                        key: col,
                                        align: col === "Category of Plastic" ? "left" : "right"
                                    }))}
                                    pagination={false}
                                    size="small"
                                    bordered
                                    rowKey="Category of Plastic"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table Section */}
            {!isBrandOwner && summaryData.length > 0 && (
                <div className="mt-6 border rounded-md overflow-hidden">
                     <div 
                        className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <h3 className="font-semibold text-blue-700 text-lg m-0">Sales Portal Data</h3>
                        {isExpanded ? <UpOutlined /> : <DownOutlined />}
                    </div>
                    {isExpanded && (
                    <>
                    <Table
                        dataSource={summaryData}
                        columns={columns}
                        pagination={false}
                        size="middle"
                        bordered
                        rowKey="key"
                        rowClassName={(record) => record.key === 'Total' ? 'bg-gray-50' : ''}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: (record) => record.key !== 'Total',
                        }}
                    />
                    {fySummaryData.length > 0 && (
                        <div className="p-4 border-t border-gray-200">
                            <h3 className="text-gray-700 font-semibold text-lg mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full inline-block"></span>
                                Financial Year Analysis
                            </h3>
                            <div className="border rounded-md overflow-hidden">
                                <Table
                                    dataSource={fySummaryData}
                                    columns={fyColumns}
                                    pagination={false}
                                    size="middle"
                                    bordered
                                    rowKey="key"
                                    expandable={{
                                        expandedRowRender: fyExpandedRowRender
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    </>
                    )}
                </div>
            )}
            
            {/* EPR Target Calculation (Bottom Position - Default) */}
            {!showTargetsOnTop && targetTables.length > 0 && (currentEntityType === 'Producer' || !currentEntityType) && (
                <div className="mt-8">
                    <h3 className="text-gray-700 font-semibold text-lg mb-4">EPR Target Calculation</h3>
                    <div className="space-y-6">
                        {targetTables.map((table, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-semibold text-gray-700">
                                    {table.title}
                                </div>
                                <Table
                                    dataSource={table.data}
                                    columns={table.columns.map(col => ({
                                        title: col,
                                        dataIndex: col,
                                        key: col,
                                        align: col === "Category of Plastic" ? "left" : "right"
                                    }))}
                                    pagination={false}
                                    size="small"
                                    bordered
                                    rowKey="Category of Plastic"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Placeholder if no data */}
            {!isBrandOwner && summaryData.length === 0 && (
                 <div className="mt-6 border rounded-md p-8 text-center bg-gray-50 text-gray-400">
                    No data uploaded. Please select a sales Excel file to view analysis.
                 </div>
            )}
        </div>
    );
};

export default SalesAnalysis;
