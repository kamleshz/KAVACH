import React, { useState, useEffect } from 'react';
import { Card, Table, Tabs, Input, Select, Button, Upload, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const EWasteAwareness = ({ clientId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Data States
    const [awarenessRows, setAwarenessRows] = useState([]);
    const [detailRows, setDetailRows] = useState([]);

    useEffect(() => {
        if (clientId) {
            fetchAwarenessData();
        }
    }, [clientId]);

    const fetchAwarenessData = async () => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId));
            if (response.data && response.data.success) {
                const data = response.data.data;
                
                // Map rows
                setAwarenessRows((data.awarenessRows || []).map((r, i) => ({ ...r, key: r._id || i })));
                setDetailRows((data.awarenessDetailRows || []).map((r, i) => ({ ...r, key: r._id || i })));
                
                // Initialize default awareness rows if empty
                if (!data.awarenessRows || data.awarenessRows.length === 0) {
                    initializeDefaultAwarenessRows();
                }
            }
        } catch (error) {
            console.error("Error fetching awareness data:", error);
            toast.error("Failed to load awareness data");
        } finally {
            setLoading(false);
        }
    };

    const initializeDefaultAwarenessRows = () => {
        const defaultItems = [
            "Whether conducted any seminars?",
            "Whether any advertisements given?",
            "Whether any training programs conducted?",
            "Whether leaflets/brochures distributed?"
        ];
        
        const newRows = defaultItems.map((item, index) => ({
            key: `default-${index}`,
            particulars: item,
            status: 'No',
            details: ''
        }));
        
        setAwarenessRows(newRows);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(API_ENDPOINTS.CLIENT.E_WASTE_AWARENESS_COMPLIANCE(clientId), {
                rows: awarenessRows,
                detailRows: detailRows
            });
            toast.success("Awareness compliance saved successfully");
            fetchAwarenessData(); // Refresh to get IDs
        } catch (error) {
            console.error("Error saving awareness data:", error);
            toast.error("Failed to save awareness data");
        } finally {
            setSaving(false);
        }
    };

    // --- Checklist Logic ---
    const handleAwarenessChange = (value, key, field) => {
        const newRows = [...awarenessRows];
        const index = newRows.findIndex(item => item.key === key);
        if (index > -1) {
            newRows[index][field] = value;
            setAwarenessRows(newRows);
        }
    };

    const awarenessColumns = [
        {
            title: 'Particulars',
            dataIndex: 'particulars',
            key: 'particulars',
            width: '40%',
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={e => handleAwarenessChange(e.target.value, record.key, 'particulars')}
                />
            )
        },
        {
            title: 'Status (Yes/No)',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (text, record) => (
                <Select 
                    value={text} 
                    onChange={val => handleAwarenessChange(val, record.key, 'status')}
                    className="w-full"
                >
                    <Option value="Yes">Yes</Option>
                    <Option value="No">No</Option>
                </Select>
            )
        },
        {
            title: 'Details',
            dataIndex: 'details',
            key: 'details',
            render: (text, record) => (
                <TextArea 
                    value={text} 
                    onChange={e => handleAwarenessChange(e.target.value, record.key, 'details')}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => {
                        setAwarenessRows(awarenessRows.filter(r => r.key !== record.key));
                    }}
                />
            )
        }
    ];

    // --- Details Logic ---
    const handleDetailChange = (value, key, field) => {
        const newRows = [...detailRows];
        const index = newRows.findIndex(item => item.key === key);
        if (index > -1) {
            newRows[index][field] = value;
            setDetailRows(newRows);
        }
    };

    const handleDocUpload = async (file, key) => {
        // Since we don't have a specific endpoint for awareness docs, reusing storage or general upload
        // Assuming there's a generic upload or we use storage upload endpoint for now
        const formData = new FormData();
        formData.append('storageImage', file); // API expects 'storageImage' key
        
        try {
            // Using storage upload endpoint as a fallback for now, or need to create specific one
            // Ideally should be: API_ENDPOINTS.CLIENT.E_WASTE_UPLOAD_AWARENESS_DOC
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_UPLOAD_STORAGE_IMAGE(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                handleDetailChange(response.data.data.imageUrl, key, 'documentUpload');
                toast.success("Document uploaded");
            }
        } catch (error) {
            console.error("Upload error", error);
            toast.error("Upload failed");
        }
        return false;
    };

    const detailColumns = [
        { title: 'Seminar Details', dataIndex: 'seminarDetails', key: 'seminarDetails', render: (t, r) => <TextArea value={t} onChange={e => handleDetailChange(e.target.value, r.key, 'seminarDetails')} autoSize /> },
        { title: 'Target Audience', dataIndex: 'targetAudience', key: 'targetAudience', render: (t, r) => <Input value={t} onChange={e => handleDetailChange(e.target.value, r.key, 'targetAudience')} /> },
        { title: 'Frequency', dataIndex: 'frequency', key: 'frequency', render: (t, r) => <Input value={t} onChange={e => handleDetailChange(e.target.value, r.key, 'frequency')} /> },
        { 
            title: 'Document', 
            dataIndex: 'documentUpload', 
            key: 'documentUpload',
            render: (text, record) => (
                <div className="flex flex-col gap-1">
                    <Upload beforeUpload={file => handleDocUpload(file, record.key)} showUploadList={false}>
                        <Button icon={<UploadOutlined />} size="small">Upload</Button>
                    </Upload>
                    {text && <a href={text} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate max-w-[100px]">View Doc</a>}
                </div>
            )
        },
        { 
            title: 'Action', 
            key: 'action', 
            render: (_, r) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setDetailRows(detailRows.filter(row => row.key !== r.key))} />
            ) 
        }
    ];

    return (
        <Card title="E-Waste Awareness Programs" className="shadow-sm rounded-xl" extra={
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                Save Data
            </Button>
        }>
            <Tabs defaultActiveKey="1">
                <TabPane tab="Awareness Checklist" key="1">
                    <div className="mb-4 flex justify-end">
                        <Button 
                            icon={<PlusOutlined />} 
                            onClick={() => setAwarenessRows([...awarenessRows, { key: Date.now(), particulars: '', status: 'No' }])}
                        >
                            Add Question
                        </Button>
                    </div>
                    <Table 
                        columns={awarenessColumns} 
                        dataSource={awarenessRows} 
                        pagination={false} 
                        loading={loading}
                        scroll={{ x: true }}
                    />
                </TabPane>
                <TabPane tab="Program Details" key="2">
                    <div className="mb-4 flex justify-end">
                        <Button 
                            icon={<PlusOutlined />} 
                            onClick={() => setDetailRows([...detailRows, { key: Date.now() }])}
                        >
                            Add Program
                        </Button>
                    </div>
                    <Table 
                        columns={detailColumns} 
                        dataSource={detailRows} 
                        pagination={{ pageSize: 5 }} 
                        loading={loading}
                        scroll={{ x: true }}
                    />
                </TabPane>
            </Tabs>
        </Card>
    );
};

export default EWasteAwareness;
