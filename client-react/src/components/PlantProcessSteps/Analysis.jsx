import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Card } from 'antd';
import { UploadOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { useClientContext } from '../../context/ClientContext';

const Analysis = ({ isStepReadOnly, handleNext, clientId, type, itemId, entityType }) => {
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 min-h-[600px]">
            {contextHolder}
             <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Plastic Pre/Post Validation Analysis</h2>
                
                {!isReadOnly && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Upload Data Files</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sales / Base File</label>
                            <Upload 
                                beforeUpload={(file) => { setSalesFile(file); return false; }} 
                                maxCount={1}
                                onRemove={() => setSalesFile(null)}
                                fileList={salesFile ? [salesFile] : []}
                                disabled={isReadOnly}
                            >
                                <Button icon={<UploadOutlined />} className="w-full h-12" disabled={isReadOnly}>Select Sales File</Button>
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
                                <Button icon={<UploadOutlined />} className="w-full h-12" disabled={isReadOnly}>Select Purchase File</Button>
                            </Upload>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
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

            {data && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Analysis Results</h3>
                        <div className="inline-flex items-center rounded-lg bg-gray-100 p-1">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center ${
                                    viewMode === 'table'
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <TableOutlined className="mr-1" /> Table
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center ${
                                    viewMode === 'graph'
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <BarChartOutlined className="mr-1" /> Graph
                            </button>
                        </div>
                    </div>
                    
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card size="small" className="bg-blue-50 border-blue-100">
                                <div className="text-xs text-blue-600 font-semibold uppercase">Total Purchase</div>
                                <div className="text-2xl font-bold text-gray-800">{summary.total_purchase}</div>
                            </Card>
                            <Card size="small" className="bg-indigo-50 border-indigo-100">
                                <div className="text-xs text-indigo-600 font-semibold uppercase">Total Consumption</div>
                                <div className="text-2xl font-bold text-gray-800">{summary.total_consumption}</div>
                            </Card>
                            <Card size="small" className={`border ${Math.abs(summary.difference_percent) > 5 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                <div className={`text-xs font-semibold uppercase ${Math.abs(summary.difference_percent) > 5 ? 'text-red-600' : 'text-green-600'}`}>Difference</div>
                                <div className={`text-2xl font-bold ${Math.abs(summary.difference_percent) > 5 ? 'text-red-700' : 'text-green-700'}`}>
                                    {summary.difference_percent}%
                                </div>
                            </Card>
                        </div>
                    )}

                    {viewMode === 'table' ? (
                        <>
                            <Table 
                                dataSource={data} 
                                columns={columns} 
                                pagination={false} 
                                rowKey="Category of Plastic"
                                bordered
                                size="middle"
                                className="border border-gray-200 rounded-lg overflow-hidden mb-8"
                            />

                            {summary?.target_tables && summary.target_tables.length > 0 && !isProducer && (
                                <div className="space-y-8 mt-8">
                                    <h3 className="text-lg font-bold text-gray-800">EPR Target Calculation</h3>
                                    {summary.target_tables.map((table, idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                                                rowKey="Category of Plastic"
                                                bordered
                                                size="small"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white p-6 border border-gray-200 rounded-lg h-[500px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={graphData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="Category of Plastic" 
                                        tick={{ fontSize: 12 }} 
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={100}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Bar dataKey="Total Purchase" fill="#4f46e5" name="Total Purchase" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Total Consumption" fill="#10b981" name="Total Consumption" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
            
            {handleNext && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                 <button
                    onClick={handleNext}
                    className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                    Skip / Next Step
                </button>
            </div>
            )}
        </div>
    );
};

export default Analysis;
