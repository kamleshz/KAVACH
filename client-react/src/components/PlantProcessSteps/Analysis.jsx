import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Card } from 'antd';
import { UploadOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { useClientContext } from '../../context/ClientContext';

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
            render: (text) => (
                <span className={parseFloat(text) > 5 || parseFloat(text) < -5 ? "text-red-500 font-bold" : "text-green-600"}>
                    {text}%
                </span>
            )
        },
    ];

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
                                    columns={table.columns.map((col, colIdx) => ({ 
                                        title: <span className="text-xs font-bold text-gray-600 uppercase">{col}</span>,
                                        dataIndex: col, 
                                        key: col,
                                        align: colIdx === 0 ? "left" : "right",
                                        render: (val) => {
                                            if (colIdx === 0) return <span className="font-medium text-gray-700">{val}</span>;
                                            return <span className="text-gray-600">{val}</span>;
                                        }
                                    }))} 
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
                            Analysis Results
                        </h3>
                    </div>
                    
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4">
                                <div className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Total Purchase</div>
                                <div className="text-2xl font-bold text-gray-800 mt-1">{summary.total_purchase}</div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4">
                                <div className="text-[11px] text-indigo-600 font-semibold uppercase tracking-wide">Total Consumption</div>
                                <div className="text-2xl font-bold text-gray-800 mt-1">{summary.total_consumption}</div>
                            </div>
                            <div className={`rounded-xl border p-4 ${Math.abs(summary.difference_percent) > 5 ? 'bg-gradient-to-br from-red-50 to-white border-red-100' : 'bg-gradient-to-br from-green-50 to-white border-green-100'}`}>
                                <div className={`text-[11px] font-semibold uppercase tracking-wide ${Math.abs(summary.difference_percent) > 5 ? 'text-red-600' : 'text-green-600'}`}>Difference</div>
                                <div className={`text-2xl font-bold mt-1 ${Math.abs(summary.difference_percent) > 5 ? 'text-red-700' : 'text-green-700'}`}>
                                    {summary.difference_percent}%
                                </div>
                            </div>
                        </div>
                    )}

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
