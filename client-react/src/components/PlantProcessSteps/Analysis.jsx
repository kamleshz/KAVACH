import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';

const Analysis = ({ isStepReadOnly, handleNext, clientId, type, itemId }) => {
    const [salesFile, setSalesFile] = useState(null);
    const [purchaseFile, setPurchaseFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Handle isStepReadOnly whether it's a function or a boolean
    const isReadOnly = typeof isStepReadOnly === 'function' ? isStepReadOnly() : isStepReadOnly;

    useEffect(() => {
        if (clientId && type && itemId) {
            fetchSavedAnalysis();
        }
    }, [clientId, type, itemId]);

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

    const handleUpload = async () => {
        if (!salesFile || !purchaseFile) {
            message.error("Please upload both Sales and Purchase files.");
            return;
        }

        const formData = new FormData();
        formData.append('salesFile', salesFile);
        formData.append('purchaseFile', purchaseFile);
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
                message.success("Analysis complete and saved!");
            } else {
                message.error("Analysis failed: " + response.data.message);
            }
        } catch (error) {
            console.error(error);
            message.error("Error during analysis: " + (error.response?.data?.message || error.message));
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
             <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Plastic Pre/Post Validation Analysis</h2>
                
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
                            disabled={isReadOnly || !salesFile || !purchaseFile}
                        >
                            Run Analysis
                        </Button>
                    </div>
                </div>
            </div>

            {data && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Analysis Results</h3>
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

                    <Table 
                        dataSource={data} 
                        columns={columns} 
                        pagination={false} 
                        rowKey="Category of Plastic"
                        bordered
                        size="middle"
                        className="border border-gray-200 rounded-lg overflow-hidden"
                    />
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
