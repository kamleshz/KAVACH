import React, { useState, useEffect } from 'react';
import { Card, Table, Tabs, Input, Select, Button, Upload, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import { useExcelImport } from '../../../hooks/useExcelImport';
import BulkUploadControl from '../../../components/common/BulkUploadControl';
import { E_WASTE_DATA } from '../constants/EWasteData';
import { STORAGE_AUDIT_TEMPLATE } from '../../../constants/excelTemplates';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const EWasteStorage = ({ clientId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Data States
    const [storageRows, setStorageRows] = useState([]);
    const [auditRows, setAuditRows] = useState([]);
    const [additionalRows, setAdditionalRows] = useState([]);
    
    const { importData, downloadTemplate, isLoading: isImporting } = useExcelImport();

    // Flatten E-Waste Data for Dropdown
    const eeeOptions = Object.values(E_WASTE_DATA).flat().map((item, index) => {
        // Extract product name for display and selection
        let pName = item.description;
        if (pName) {
            if (pName.includes(':')) {
                pName = pName.split(':')[1];
            } else if (pName.includes(' – ')) {
                pName = pName.split(' – ')[1];
            } else if (pName.includes(' - ')) {
                pName = pName.split(' - ')[1];
            }
        }
        const productName = pName ? pName.trim() : '';

        return {
            key: `${item.code}-${index}`,
            code: item.code,
            description: item.description,
            productName: productName,
            dropdownLabel: `${item.code} - ${productName}`,
            selectionLabel: item.code
        };
    });

    useEffect(() => {
        if (clientId) {
            fetchStorageData();
        }
    }, [clientId]);

    const fetchStorageData = async () => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId));
            if (response.data && response.data.success) {
                const data = response.data.data;
                
                // Map rows to include unique keys
                setStorageRows((data.storageRows || []).map((r, i) => ({ ...r, key: r._id || i })));
                setAuditRows((data.storageAuditRows || []).map((r, i) => ({ ...r, key: r._id || i })));
                setAdditionalRows((data.additionalRows || []).map((r, i) => ({ ...r, key: r._id || i })));
                
                // Initialize default storage rows if empty
                if (!data.storageRows || data.storageRows.length === 0) {
                    initializeDefaultStorageRows();
                }
            }
        } catch (error) {
            console.error("Error fetching storage data:", error);
            toast.error("Failed to load storage data");
        } finally {
            setLoading(false);
        }
    };

    const initializeDefaultStorageRows = () => {
        const defaultItems = [
            "Demarcation of Area",
            "Details of stored E-waste",
            "Storage of E-waste for a period not exceeding 180 days"
        ];
        
        const newRows = defaultItems.map((item, index) => ({
            key: `default-${index}`,
            storageDetails: item,
            status: 'No',
            remarks: '',
            uploadPhoto: ''
        }));
        
        setStorageRows(newRows);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(API_ENDPOINTS.CLIENT.E_WASTE_STORAGE_COMPLIANCE(clientId), {
                rows: storageRows,
                auditRows: auditRows,
                additionalRows: additionalRows
            });
            toast.success("Storage compliance saved successfully");
            fetchStorageData(); // Refresh to get IDs
        } catch (error) {
            console.error("Error saving storage data:", error);
            toast.error("Failed to save storage data");
        } finally {
            setSaving(false);
        }
    };

    // --- Storage Checklist Logic ---
    const handleStorageChange = (value, key, field) => {
        const newRows = [...storageRows];
        const index = newRows.findIndex(item => item.key === key);
        if (index > -1) {
            newRows[index][field] = value;
            setStorageRows(newRows);
        }
    };

    const handlePhotoUpload = async (file, key) => {
        const formData = new FormData();
        formData.append('storageImage', file);
        
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_UPLOAD_STORAGE_IMAGE(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                handleStorageChange(response.data.data.imageUrl, key, 'uploadPhoto');
                toast.success("Photo uploaded");
            }
        } catch (error) {
            toast.error("Upload failed");
        }
        return false; // Prevent default upload behavior
    };

    const storageColumns = [
        {
            title: 'Particulars',
            dataIndex: 'storageDetails',
            key: 'storageDetails',
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={e => handleStorageChange(e.target.value, record.key, 'storageDetails')}
                    placeholder="Enter details"
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
                    onChange={val => handleStorageChange(val, record.key, 'status')}
                    className="w-full"
                >
                    <Option value="Yes">Yes</Option>
                    <Option value="No">No</Option>
                </Select>
            )
        },
        {
            title: 'Remarks',
            dataIndex: 'remarks',
            key: 'remarks',
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={e => handleStorageChange(e.target.value, record.key, 'remarks')}
                />
            )
        },
        {
            title: 'Upload Photo',
            dataIndex: 'uploadPhoto',
            key: 'uploadPhoto',
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    <Upload 
                        beforeUpload={file => handlePhotoUpload(file, record.key)} 
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />} size="small">Upload</Button>
                    </Upload>
                    {text && (
                        <a href={text} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                            View
                        </a>
                    )}
                </div>
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
                        setStorageRows(storageRows.filter(r => r.key !== record.key));
                    }}
                />
            )
        }
    ];

    // --- Audit Logic ---
    const handleAuditExcelUpload = (e) => {
        importData(e, (data) => {
            const newRows = data.map((row, index) => {
                const start = row["Date of Storage"] || '';
                const end = row["Date of Audit"] || row["Date of audit"] || row["End Date"] || '';
                let diff = row["Difference"] || '';

                if (!diff && start && end) {
                    const dStart = dayjs(start);
                    const dEnd = dayjs(end);
                    if (dStart.isValid() && dEnd.isValid()) {
                        diff = `${dEnd.diff(dStart, 'days')} Days`;
                    }
                }

                return {
                    key: Date.now() + index,
                    eeeCode: row["EEE Code"] || '',
                    productName: row["Product Name"] || '',
                    listEEE: row["List of EEE"] || '',
                    dateOfStorage: start,
                    dateOfAudit: end,
                    difference: diff,
                    quantity: row["Quantity in (MT)"] || row["Quantity (MT)"] || row["Quantity"] || '',
                    remarks: row["Remarks"] || ''
                };
            });
            setAuditRows(prev => [...prev, ...newRows]);
        });
    };

    const handleAuditChange = (value, key, field) => {
        const newRows = [...auditRows];
        const index = newRows.findIndex(item => item.key === key);
        if (index > -1) {
            newRows[index][field] = value;
            setAuditRows(newRows);
        }
    };

    const handleDateChange = (value, key, field) => {
        const newRows = [...auditRows];
        const index = newRows.findIndex(item => item.key === key);
        if (index > -1) {
            newRows[index][field] = value;
            
            // Calculate Difference if both dates are present
            const start = field === 'dateOfStorage' ? value : newRows[index].dateOfStorage;
            const end = field === 'dateOfAudit' ? value : newRows[index].dateOfAudit;
            
            if (start && end) {
                const diff = dayjs(end).diff(dayjs(start), 'days');
                newRows[index].difference = `${diff} Days`;
            } else {
                newRows[index].difference = '';
            }
            
            setAuditRows(newRows);
        }
    };

    const auditColumns = [
        { 
            title: 'EEE Code', 
            dataIndex: 'eeeCode', 
            key: 'eeeCode', 
            width: 250,
            render: (text, record) => (
                <Select 
                    showSearch
                    value={text} 
                    style={{ width: '100%' }}
                    placeholder="Select Code"
                    optionFilterProp="children"
                    optionLabelProp="label"
                    onChange={(val, option) => {
                        const newRows = [...auditRows];
                        const index = newRows.findIndex(item => item.key === record.key);
                        if (index > -1) {
                            newRows[index].eeeCode = val;
                            newRows[index].listEEE = option.desc;
                            newRows[index].productName = option.pname || '';
                            setAuditRows(newRows);
                        }
                    }}
                >
                    {eeeOptions.map(opt => (
                        <Option 
                            key={opt.key} 
                            value={opt.code} 
                            desc={opt.description} 
                            pname={opt.productName}
                            label={opt.selectionLabel}
                        >
                            {opt.dropdownLabel}
                        </Option>
                    ))}
                </Select>
            )
        },
        { title: 'Product Name', dataIndex: 'productName', key: 'productName', width: 150, render: (t, r) => <Input value={t} onChange={e => handleAuditChange(e.target.value, r.key, 'productName')} /> },
        { title: 'List of EEE', dataIndex: 'listEEE', key: 'listEEE', width: 200, render: (t, r) => <Input value={t} readOnly className="bg-gray-50" /> },
        { title: 'Date of Storage', dataIndex: 'dateOfStorage', key: 'dateOfStorage', width: 150, render: (t, r) => <Input type="date" value={t} onChange={e => handleDateChange(e.target.value, r.key, 'dateOfStorage')} /> },
        { title: 'Date of Audit', dataIndex: 'dateOfAudit', key: 'dateOfAudit', width: 150, render: (t, r) => <Input type="date" value={t} onChange={e => handleDateChange(e.target.value, r.key, 'dateOfAudit')} /> },
        { title: 'Difference', dataIndex: 'difference', key: 'difference', width: 120, render: (t, r) => <Input value={t} readOnly className="bg-gray-50" /> },
        { title: 'Quantity in (MT)', dataIndex: 'quantity', key: 'quantity', width: 120, render: (t, r) => <Input value={t} onChange={e => handleAuditChange(e.target.value, r.key, 'quantity')} /> },
        { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 150, render: (t, r) => <Input value={t} onChange={e => handleAuditChange(e.target.value, r.key, 'remarks')} /> },
        { 
            title: 'Action', 
            key: 'action', 
            width: 80,
            fixed: 'right',
            render: (_, r) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setAuditRows(auditRows.filter(row => row.key !== r.key))} />
            ) 
        }
    ];

    return (
        <Card title="E-Waste Storage Compliance" className="shadow-sm rounded-xl" extra={
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                Save Data
            </Button>
        }>
            <Tabs defaultActiveKey="1">
                <TabPane tab="Storage Area Checklist" key="1">
                    <div className="mb-4 flex justify-end">
                        <Button 
                            icon={<PlusOutlined />} 
                            onClick={() => setStorageRows([...storageRows, { key: Date.now(), storageDetails: '', status: 'No' }])}
                        >
                            Add Row
                        </Button>
                    </div>
                    <Table 
                        columns={storageColumns} 
                        dataSource={storageRows} 
                        pagination={false} 
                        loading={loading}
                        scroll={{ x: true }}
                    />
                </TabPane>
                <TabPane tab="Storage Audit Data" key="2">
                    <div className="mb-4 flex justify-between items-center">
                        <div className="text-gray-500 text-sm">Upload bulk audit data via Excel</div>
                        <div className="flex gap-2">
                            <BulkUploadControl
                                onUpload={handleAuditExcelUpload}
                                onDownloadTemplate={() => downloadTemplate(STORAGE_AUDIT_TEMPLATE)}
                                uploadLabel="Upload Audit Data"
                            />
                            <Button 
                                icon={<PlusOutlined />} 
                                onClick={() => setAuditRows([...auditRows, { key: Date.now() }])}
                            >
                                Add Row
                            </Button>
                        </div>
                    </div>
                    <Table 
                        columns={auditColumns} 
                        dataSource={auditRows} 
                        pagination={{ pageSize: 10 }} 
                        loading={loading}
                        scroll={{ x: true }}
                    />
                </TabPane>
            </Tabs>
        </Card>
    );
};

export default EWasteStorage;
