import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Card } from 'antd';
import { UploadOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import { useClientContext } from '../../../context/ClientContext';

const Analysis = ({ isStepReadOnly, handleNext, clientId, type, itemId, entityType, showTargetsOnly = false, hideTargets = false }) => {
    const [salesFile, setSalesFile] = useState(null);
    const [purchaseFile, setPurchaseFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [viewMode, setViewMode] = useState('table');

    const [messageApi, contextHolder] = message.useMessage();
    const { formData } = useClientContext();
    
    // Use prop entityType if available, otherwise fallback to context
    const currentEntityType = entityType || formData?.entityType;
    const isProducer = (currentEntityType || '').toString() === 'Producer';
    const isBrandOwner = (currentEntityType || '').toString() === 'Brand Owner';

    // Handle isStepReadOnly whether it's a function or a boolean
    const isReadOnly = typeof isStepReadOnly === 'function' ? isStepReadOnly() : isStepReadOnly;

    const graphData = React.useMemo(() => {
        if (!data) return [];
        return data.map(item => ({
            ...item,
            "Total Purchase": parseFloat(item["Total Purchase"] || 0),
            "Total Consumption": parseFloat(item["Total Consumption"] || 0)
        }));
    }, [data]);

    useEffect(() => {
        const fetchSavedAnalysis = async () => {
            try {
                const response = await api.get(`${API_ENDPOINTS.ANALYSIS.PLASTIC_PREPOST}/${clientId}`, {
                    params: { type, itemId }
                });
                
                if (response.data.success && response.data.data) {
                    setData(response.data.data);
                    setSummary(response.data.full_summary);
                    setLastUpdated(response.data.lastUpdated);
                }
            } catch (error) {
                console.error("Failed to fetch saved analysis:", error);
                // Don't show error to user, just stay in "empty" state
            }
        };

        if (clientId && type && itemId) {
            fetchSavedAnalysis();
        }
    }, [clientId, type, itemId]);

    const handleUpload = async () => {
        if (!salesFile && !clientId) {
            messageApi.error("Please upload Sales file.");
            return;
        }
        
        // For Producers, Purchase file is optional
        // For others, we might want to warn, but let's make it optional generally to support the request
        if (!salesFile) {
             messageApi.error("Please upload Sales file.");
             return;
        }

        const formData = new FormData();
        formData.append('salesFile', salesFile);
        if (purchaseFile) {
            formData.append('purchaseFile', purchaseFile);
        }
        
        if (clientId) formData.append('clientId', clientId);
        if (type) formData.append('type', type);
        if (itemId) formData.append('itemId', itemId);

        setLoading(true);
        try {
            const response = await api.post(API_ENDPOINTS.ANALYSIS.PLASTIC_PREPOST, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setData(response.data.data);
                setSummary(response.data.full_summary);
                setLastUpdated(new Date());
                messageApi.success("Analysis complete and saved!");
            } else {
                messageApi.error("Analysis failed: " + response.data.message);
            }
        } catch (error) {
            console.error(error);
            messageApi.error("Error during analysis: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Category', dataIndex: 'Category of Plastic', key: 'cat' },
        { title: 'Total Purchase', dataIndex: 'Total Purchase', key: 'purchase' },
        { title: 'Pre Consumer', dataIndex: 'Pre Consumer', key: 'pre' },
        { title: 'Post Consumer', dataIndex: 'Post Consumer', key: 'post' },
        { title: 'Export', dataIndex: 'Export', key: 'exp' },
        { title: 'Total Consumption', dataIndex: 'Total Consumption', key: 'total_cons' },
        { 
            title: 'Difference (%)', 
            dataIndex: 'Difference (%)', 
            key: 'diff',
            render: (text) => {
                const num = parseFloat(text);
                return (
                    <span className={!Number.isNaN(num) && (num > 5 || num < -5) ? "text-red-500 font-bold" : "text-green-600"}>
                        {!Number.isNaN(num) ? `${text}%` : text}
                    </span>
                );
            }
        },
    ];

    const brandOwnerApplicableTargetMatrix = React.useMemo(() => ([
        { financialYear: '2025-26', category: 'Cat-I', applicableTarget: 30 },
        { financialYear: '2025-26', category: 'Cat-II', applicableTarget: 10 },
        { financialYear: '2025-26', category: 'Cat-III', applicableTarget: 5 },
        { financialYear: '2025-26', category: 'Cat-IV', applicableTarget: 0 },
        { financialYear: '2025-26', category: 'Cat-V', applicableTarget: 0 },
        { financialYear: '2026-27', category: 'Cat-I', applicableTarget: 40 },
        { financialYear: '2026-27', category: 'Cat-II', applicableTarget: 10 },
        { financialYear: '2026-27', category: 'Cat-III', applicableTarget: 5 },
        { financialYear: '2026-27', category: 'Cat-IV', applicableTarget: 0 },
        { financialYear: '2026-27', category: 'Cat-V', applicableTarget: 0 },
        { financialYear: '2027-28', category: 'Cat-I', applicableTarget: 50 },
        { financialYear: '2027-28', category: 'Cat-II', applicableTarget: 20 },
        { financialYear: '2027-28', category: 'Cat-III', applicableTarget: 10 },
        { financialYear: '2027-28', category: 'Cat-IV', applicableTarget: 0 },
        { financialYear: '2027-28', category: 'Cat-V', applicableTarget: 0 },
        { financialYear: '2028-29', category: 'Cat-I', applicableTarget: 60 },
        { financialYear: '2028-29', category: 'Cat-II', applicableTarget: 20 },
        { financialYear: '2028-29', category: 'Cat-III', applicableTarget: 10 },
        { financialYear: '2028-29', category: 'Cat-IV', applicableTarget: 0 },
        { financialYear: '2028-29', category: 'Cat-V', applicableTarget: 0 }
    ]), []);

    const purchaseByYearCategory = React.useMemo(() => {
        const source = summary?.purchase_by_year_category;
        if (!source || typeof source !== 'object') return {};
        return source;
    }, [summary]);

    const recycledAchievedByYearCategory = React.useMemo(() => {
        const source = summary?.recycled_achieved_by_year_category;
        if (!source || typeof source !== 'object') return {};
        return source;
    }, [summary]);

    const brandOwnerTargetRows = React.useMemo(() => {
        const savedRows = summary?.brand_owner_recycled_content_table?.rows;
        if (Array.isArray(savedRows) && savedRows.length) {
            const yearsInMatrix = ['2025-26', '2026-27', '2027-28', '2028-29'];
            const categoryOrder = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV', 'Cat-V'];
            const normalized = savedRows
                .map((row, idx) => ({
                    key: row.key || `${row.financialYear}-${row.category}-${idx}`,
                    financialYear: (row.financialYear || '').toString().trim(),
                    category: (row.category || '').toString().trim(),
                    applicableTarget: Number(row.applicableTargetPct || 0),
                    purchaseQty: typeof row.purchaseQty === 'number' ? row.purchaseQty.toFixed(3) : '-',
                    obligationBasedTarget: typeof row.obligationBasedTarget === 'number' ? row.obligationBasedTarget.toFixed(2) : '-',
                    actualAchieved: typeof row.actualAchieved === 'number' ? row.actualAchieved.toFixed(2) : '-',
                    toBeAchieved: typeof row.toBeAchieved === 'number' ? row.toBeAchieved.toFixed(2) : '-',
                    carryForwardBalance: typeof row.carryForwardBalance === 'number' ? row.carryForwardBalance.toFixed(2) : '-',
                    minimumCarryForward: typeof row.minimumCarryForward === 'number' ? row.minimumCarryForward.toFixed(2) : '-',
                    totalRecycledContent: typeof row.totalRecycledContent === 'number' ? row.totalRecycledContent.toFixed(2) : '-'
                }))
                .filter(r => r.financialYear && r.category);

            normalized.sort((a, b) => {
                const yA = yearsInMatrix.indexOf(a.financialYear);
                const yB = yearsInMatrix.indexOf(b.financialYear);
                if (yA !== yB) return yA - yB;
                const cA = categoryOrder.indexOf(a.category);
                const cB = categoryOrder.indexOf(b.category);
                if (cA !== cB) return cA - cB;
                return 0;
            });

            const yearCounts = normalized.reduce((acc, row) => {
                acc[row.financialYear] = (acc[row.financialYear] || 0) + 1;
                return acc;
            }, {});
            const yearSeen = {};
            return normalized.map((row) => {
                const firstOfYear = !yearSeen[row.financialYear];
                yearSeen[row.financialYear] = true;
                return {
                    ...row,
                    yearRowSpan: firstOfYear ? yearCounts[row.financialYear] : 0
                };
            });
        }

        const baseCarryForwardByCategory = brandOwnerApplicableTargetMatrix.reduce((acc, row) => {
            if (row.financialYear !== '2025-26') return acc;
            const categoryKey = (row.category || '').toString().trim();
            const purchaseQty = purchaseByYearCategory?.['2025-26']?.[categoryKey];
            const obligationBasedTarget =
                typeof purchaseQty === 'number'
                    ? (purchaseQty * Number(row.applicableTarget || 0)) / 100
                    : null;
            const actualAchieved =
                typeof recycledAchievedByYearCategory?.['2025-26']?.[categoryKey] === 'number'
                    ? recycledAchievedByYearCategory['2025-26'][categoryKey]
                    : null;
            const carryForwardBase =
                typeof obligationBasedTarget === 'number' && typeof actualAchieved === 'number'
                    ? Math.max(0, obligationBasedTarget - actualAchieved)
                    : null;
            if (typeof carryForwardBase === 'number') acc[categoryKey] = carryForwardBase;
            return acc;
        }, {});

        const yearsInMatrix = ['2025-26', '2026-27', '2027-28', '2028-29'];
        const categoriesInMatrix = Array.from(
            new Set(brandOwnerApplicableTargetMatrix.map((row) => (row.category || '').toString().trim()).filter(Boolean))
        );

        const minimumCarryForwardByCategory = categoriesInMatrix.reduce((acc, category) => {
            const base = baseCarryForwardByCategory[category];
            acc[category] = typeof base === 'number' ? base / 3 : 0;
            return acc;
        }, {});

        const applicableTargetByYearCategory = brandOwnerApplicableTargetMatrix.reduce((acc, row) => {
            const y = (row.financialYear || '').toString().trim();
            const c = (row.category || '').toString().trim();
            if (!y || !c) return acc;
            if (!acc[y]) acc[y] = {};
            acc[y][c] = Number(row.applicableTarget || 0);
            return acc;
        }, {});

        const carryForwardBalanceByYearCategory = {};
        const totalRecycledContentByYearCategory = {};
        categoriesInMatrix.forEach((category) => {
            carryForwardBalanceByYearCategory[category] = {};
            totalRecycledContentByYearCategory[category] = {};

            const baseCarry = typeof baseCarryForwardByCategory[category] === 'number' ? baseCarryForwardByCategory[category] : 0;
            const minCarry = minimumCarryForwardByCategory[category] || 0;

            carryForwardBalanceByYearCategory[category]['2025-26'] = baseCarry;
            totalRecycledContentByYearCategory[category]['2025-26'] = baseCarry;

            let prevTotal = baseCarry;
            yearsInMatrix.slice(1).forEach((year) => {
                const targetPct = applicableTargetByYearCategory?.[year]?.[category] ?? 0;
                const purchaseQty = purchaseByYearCategory?.[year]?.[category];
                const achieved = recycledAchievedByYearCategory?.[year]?.[category];
                const obligation =
                    typeof purchaseQty === 'number'
                        ? (purchaseQty * Number(targetPct || 0)) / 100
                        : null;

                const toBeAbs =
                    typeof obligation === 'number' && typeof achieved === 'number'
                        ? Math.abs(obligation - achieved)
                        : 0;

                const carryForwardBalance = prevTotal;
                carryForwardBalanceByYearCategory[category][year] = carryForwardBalance;

                const total = year === '2026-27' ? (minCarry + toBeAbs) : (carryForwardBalance + minCarry + toBeAbs);
                totalRecycledContentByYearCategory[category][year] = total;
                prevTotal = total;
            });
        });

        const yearCounts = brandOwnerApplicableTargetMatrix.reduce((acc, row) => {
            acc[row.financialYear] = (acc[row.financialYear] || 0) + 1;
            return acc;
        }, {});
        const yearSeen = {};
        return brandOwnerApplicableTargetMatrix.map((row, idx) => {
            const firstOfYear = !yearSeen[row.financialYear];
            yearSeen[row.financialYear] = true;
            const financialYearKey = (row.financialYear || '').toString().trim();
            const categoryKey = (row.category || '').toString().trim();
            const purchaseQty = purchaseByYearCategory?.[financialYearKey]?.[categoryKey];
            const purchaseQtyDisplay = typeof purchaseQty === 'number' ? purchaseQty.toFixed(3) : '-';
            const obligationBasedTarget =
                typeof purchaseQty === 'number'
                    ? (purchaseQty * Number(row.applicableTarget || 0)) / 100
                    : null;
            const obligationBasedTargetDisplay = typeof obligationBasedTarget === 'number' ? obligationBasedTarget.toFixed(2) : '-';

            const actualAchieved =
                typeof recycledAchievedByYearCategory?.[financialYearKey]?.[categoryKey] === 'number'
                    ? recycledAchievedByYearCategory[financialYearKey][categoryKey]
                    : null;
            const actualAchievedDisplay = typeof actualAchieved === 'number' ? actualAchieved.toFixed(2) : '-';

            const toBeAchieved =
                typeof obligationBasedTarget === 'number' && typeof actualAchieved === 'number'
                    ? Math.abs(obligationBasedTarget - actualAchieved)
                    : null;
            const toBeAchievedDisplay = typeof toBeAchieved === 'number' ? toBeAchieved.toFixed(2) : '-';
            const carryForwardBase =
                typeof obligationBasedTarget === 'number' && typeof actualAchieved === 'number'
                    ? Math.max(0, obligationBasedTarget - actualAchieved)
                    : null;
            const yearIndex = yearsInMatrix.indexOf(financialYearKey);
            const carryForwardBalanceNum = (() => {
                if (financialYearKey === '2025-26') {
                    return typeof carryForwardBase === 'number' ? carryForwardBase : null;
                }
                if (yearIndex <= 0) return null;
                const val = carryForwardBalanceByYearCategory?.[categoryKey]?.[financialYearKey];
                return typeof val === 'number' ? val : null;
            })();
            const carryForwardBalanceDisplay = typeof carryForwardBalanceNum === 'number' ? carryForwardBalanceNum.toFixed(2) : '-';

            const minCarryNum = minimumCarryForwardByCategory[categoryKey] || 0;
            const toBeNum = typeof toBeAchieved === 'number' ? toBeAchieved : 0;
            const totalRecycledContentNum =
                financialYearKey === '2025-26'
                    ? (typeof carryForwardBase === 'number' ? carryForwardBase : null)
                    : (typeof totalRecycledContentByYearCategory?.[categoryKey]?.[financialYearKey] === 'number'
                        ? totalRecycledContentByYearCategory[categoryKey][financialYearKey]
                        : (typeof carryForwardBalanceNum === 'number' ? (toBeNum + carryForwardBalanceNum + minCarryNum) : null));
            const totalRecycledContentDisplay = typeof totalRecycledContentNum === 'number' ? totalRecycledContentNum.toFixed(2) : '-';
            const minimumCarryForwardDisplay =
                (financialYearKey === '2026-27' || financialYearKey === '2027-28' || financialYearKey === '2028-29') &&
                typeof baseCarryForwardByCategory[categoryKey] === 'number'
                    ? (baseCarryForwardByCategory[categoryKey] / 3).toFixed(2)
                    : '-';
            return {
                key: `${row.financialYear}-${row.category}-${idx}`,
                ...row,
                yearRowSpan: firstOfYear ? yearCounts[row.financialYear] : 0,
                purchaseQty: purchaseQtyDisplay,
                obligationBasedTarget: obligationBasedTargetDisplay,
                actualAchieved: actualAchievedDisplay,
                toBeAchieved: toBeAchievedDisplay,
                carryForwardBalance: carryForwardBalanceDisplay,
                minimumCarryForward: minimumCarryForwardDisplay,
                totalRecycledContent: totalRecycledContentDisplay
            };
        });
    }, [brandOwnerApplicableTargetMatrix, purchaseByYearCategory, recycledAchievedByYearCategory, summary]);

    const brandOwnerTargetColumns = React.useMemo(() => ([
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Financial Year</span>,
            dataIndex: 'financialYear',
            key: 'financialYear',
            align: 'left',
            render: (value, record) => ({
                children: <span className="font-semibold text-gray-800">{value}</span>,
                props: { rowSpan: record.yearRowSpan }
            })
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Category</span>,
            dataIndex: 'category',
            key: 'category',
            align: 'left',
            render: (value) => <span className="font-medium text-gray-700">{value}</span>
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Applicable Year Content Target (%)</span>,
            dataIndex: 'applicableTarget',
            key: 'applicableTarget',
            align: 'center',
            render: (value) => <span className="font-semibold text-blue-700">{value}</span>
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Purchase Qty (MT)</span>,
            dataIndex: 'purchaseQty',
            key: 'purchaseQty',
            align: 'center',
            render: (value) => <span className="font-semibold text-gray-800">{value}</span>
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Recycled Content Obligation Based Target (MT)</span>,
            dataIndex: 'obligationBasedTarget',
            key: 'obligationBasedTarget',
            align: 'center'
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Actual Recycled Content Achieved (MT)</span>,
            dataIndex: 'actualAchieved',
            key: 'actualAchieved',
            align: 'center'
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Actual Recycled Content To Be Achieved (MT)</span>,
            dataIndex: 'toBeAchieved',
            key: 'toBeAchieved',
            align: 'center'
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Unfilled Target / Carry Forward Balance (MT)</span>,
            dataIndex: 'carryForwardBalance',
            key: 'carryForwardBalance',
            align: 'center'
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Minimum Carry forward During the Year (MT)</span>,
            dataIndex: 'minimumCarryForward',
            key: 'minimumCarryForward',
            align: 'center'
        },
        {
            title: <span className="text-xs font-bold text-gray-600 uppercase">Total Recycled Content</span>,
            dataIndex: 'totalRecycledContent',
            key: 'totalRecycledContent',
            align: 'center'
        }
    ]), []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {contextHolder}
            {!showTargetsOnly && (
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                        Plastic Pre/Post Validation Analysis
                    </h2>
                    
                    {!isReadOnly && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Upload Data Files</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sales / Base File</label>
                                <Upload 
                                    beforeUpload={(file) => { setSalesFile(file); return false; }} 
                                    maxCount={1}
                                    onRemove={() => setSalesFile(null)}
                                    fileList={salesFile ? [salesFile] : []}
                                    disabled={isReadOnly}
                                >
                                    <Button icon={<UploadOutlined />} className="w-full h-10" disabled={isReadOnly}>Select Sales File</Button>
                                </Upload>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase File</label>
                                <Upload 
                                    beforeUpload={(file) => { setPurchaseFile(file); return false; }} 
                                    maxCount={1}
                                    onRemove={() => setPurchaseFile(null)}
                                    fileList={purchaseFile ? [purchaseFile] : []}
                                    disabled={isReadOnly}
                                >
                                    <Button icon={<UploadOutlined />} className="w-full h-10" disabled={isReadOnly}>Select Purchase File</Button>
                                </Upload>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button 
                                type="primary" 
                                onClick={handleUpload} 
                                loading={loading}
                                size="large"
                                className="px-8"
                                disabled={isReadOnly || !salesFile}
                            >
                                Run Analysis
                            </Button>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {summary?.target_tables && summary.target_tables.length > 0 && !isProducer && !hideTargets && (
                <div className="p-5">
                    <div className="space-y-5">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block"></span>
                            EPR Target Calculation
                        </h3>
                        {summary.target_tables.map((table, idx) => (
                            <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-gray-700">
                                <div className="bg-gradient-to-r from-blue-50 to-white px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                                    <div className="w-1.5 h-5 rounded-full bg-blue-500"></div>
                                    <span className="font-semibold text-gray-700 text-sm">{table.title}</span>
                                </div>
                                <Table 
                                    dataSource={table.data} 
                                    columns={table.columns.map((col, colIdx) => {
                                        const title = typeof col === 'object' ? col.title : col;
                                        const key = typeof col === 'object' ? col.key : col;
                                        return { 
                                            title: <span className="text-xs font-bold text-gray-600 uppercase">{title}</span>,
                                            key: key,
                                            align: colIdx === 0 ? "left" : "center",
                                            render: (_, record) => {
                                                // Access value directly from record using key to handle special characters/dots
                                                const val = record[key];
                                                if (colIdx === 0) return <span className="font-medium text-gray-700">{val}</span>;
                                                return <span className="text-gray-600">{val}</span>;
                                            }
                                        };
                                    })} 
                                    pagination={false} 
                                    rowKey="Category of Plastic"
                                    bordered
                                    size="small"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!showTargetsOnly && data && (
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block"></span>
                            Pre/Post Check
                        </h3>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-5 [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-gray-700">
                        <Table 
                            dataSource={data} 
                            columns={columns} 
                            pagination={false} 
                            rowKey="Category of Plastic"
                            bordered
                            size="middle"
                        />
                    </div>
                </div>
            )}
            
            {handleNext && (
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex justify-end">
                 <button
                    onClick={handleNext}
                    className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                >
                    Skip / Next Step
                </button>
            </div>
            )}
        </div>
    );
};

export default Analysis;
