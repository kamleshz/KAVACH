import React, { useState } from 'react';
import { Upload, Table, Tabs, Button, Input, Select, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, CloseOutlined, UploadOutlined, SaveOutlined, CloudUploadOutlined, UndoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DocumentViewerModal from '../DocumentViewerModal';

const AREA_NAME_OPTIONS = [
    { value: 'Raw Material Storage Area', label: 'Raw Material Storage Area' },
    { value: 'Packaging Material Storage Area', label: 'Packaging Material Storage Area' },
    { value: 'Finished Goods Storage & Dispatch', label: 'Finished Goods Storage & Dispatch' },
    { value: 'Production Area', label: 'Production Area' },
    { value: 'Material Handling', label: 'Material Handling' },
    { value: 'Medical Room', label: 'Medical Room' },
    { value: 'Kitchen / Pantry / Lunch Room', label: 'Kitchen / Pantry / Lunch Room' },
    { value: 'Tool Store Room', label: 'Tool Store Room' },
    { value: 'Quality Check Area', label: 'Quality Check Area' },
    { value: 'Final Product Packaging Area', label: 'Final Product Packaging Area' },
    { value: 'Scrap Yard', label: 'Scrap Yard' }
];

const BANNED_ITEMS_OPTIONS = {
    'Raw Material Storage Area': [
        { value: 'Carry bags', label: 'Carry bags' },
        { value: 'plastic sheets', label: 'plastic sheets' },
        { value: 'disposable covers', label: 'disposable covers' },
        { value: 'bubble wrap waste', label: 'bubble wrap waste' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Packaging Material Storage Area': [
        { value: 'Plastic tape waste', label: 'Plastic tape waste' },
        { value: 'shrink film scrap', label: 'shrink film scrap' },
        { value: 'disposable wraps', label: 'disposable wraps' },
        { value: 'single-use liners', label: 'single-use liners' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Finished Goods Storage & Dispatch': [
        { value: 'Stretch film waste', label: 'Stretch film waste' },
        { value: 'disposable covers', label: 'disposable covers' },
        { value: 'plastic straps', label: 'plastic straps' },
        { value: 'one-time pallets wrap', label: 'one-time pallets wrap' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Production Area': [
        { value: 'Disposable gloves', label: 'Disposable gloves' },
        { value: 'cups', label: 'cups' },
        { value: 'plates', label: 'plates' },
        { value: 'spoons', label: 'spoons' },
        { value: 'sachets', label: 'sachets' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Material Handling': [
        { value: 'Plastic carry bags', label: 'Plastic carry bags' },
        { value: 'one-time packaging films', label: 'one-time packaging films' },
        { value: 'disposable containers', label: 'disposable containers' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Medical Room': [
        { value: 'Disposable plastic bottles', label: 'Disposable plastic bottles' },
        { value: 'cups', label: 'cups' },
        { value: 'covers', label: 'covers' },
        { value: 'biomedical plastic waste', label: 'biomedical plastic waste' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Kitchen / Pantry / Lunch Room': [
        { value: 'Plastic cups', label: 'Plastic cups' },
        { value: 'plates', label: 'plates' },
        { value: 'straws', label: 'straws' },
        { value: 'cutlery', label: 'cutlery' },
        { value: 'PET bottles', label: 'PET bottles' },
        { value: 'thermocol plates', label: 'thermocol plates' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Tool Store Room': [
        { value: 'Plastic pouches', label: 'Plastic pouches' },
        { value: 'single-use packaging', label: 'single-use packaging' },
        { value: 'covers', label: 'covers' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Quality Check Area': [
        { value: 'Sample sachets', label: 'Sample sachets' },
        { value: 'disposable containers', label: 'disposable containers' },
        { value: 'plastic films', label: 'plastic films' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Final Product Packaging Area': [
        { value: 'Shrink wrap waste', label: 'Shrink wrap waste' },
        { value: 'plastic liners', label: 'plastic liners' },
        { value: 'tape', label: 'tape' },
        { value: 'disposable wraps', label: 'disposable wraps' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ],
    'Scrap Yard': [
        { value: 'SUP scrap', label: 'SUP scrap' },
        { value: 'carry bags', label: 'carry bags' },
        { value: 'films', label: 'films' },
        { value: 'rejected packaging plastic', label: 'rejected packaging plastic' },
        { value: 'Not Mentioned', label: 'Not Mentioned' }
    ]
};

const SingleUsePlastic = ({
    isStepReadOnly,
    handleNext,
    isSaving,
    supChecklistData,
    onSaveSupChecklist
}) => {
    const [activeTab, setActiveTab] = useState('1');
    const [checklistRows, setChecklistRows] = useState([]);
    const isRemoteUpdate = React.useRef(false);

    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState('');
    const [viewerName, setViewerName] = useState('');

    const handleViewDocument = (url, name) => {
        setViewerUrl(url);
        setViewerName(name);
        setViewerOpen(true);
    };

    // Load initial data and initialize Tab 2, 3, 4 items if missing
    React.useEffect(() => {
        if (supChecklistData && supChecklistData.length > 0) {
            isRemoteUpdate.current = true;
            
            let updatedRows = [...supChecklistData];
            let hasChanges = false;

            // Check if Compostable question exists
            if (!updatedRows.find(row => row.areaName === 'CompostableQuestion')) {
                updatedRows.push({
                    id: Date.now(),
                    areaName: 'CompostableQuestion',
                    bannedItem: 'Is any Compostable / Biodegradable used in factory premises?',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false
                });
                hasChanges = true;
            }

            // Check if Misrepresentation items exist
            if (!updatedRows.find(row => row.areaName === 'MisrepresentationDetail')) {
                updatedRows.push({
                    id: Date.now() + 1,
                    areaName: 'MisrepresentationDetail',
                    bannedItem: '',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false,
                    misrepresentationDetails: ''
                });
                hasChanges = true;
            }

            // Check if Awareness items exist
            if (!updatedRows.find(row => row.areaName === 'AwarenessDetail')) {
                updatedRows.push({
                    id: Date.now() + 2,
                    areaName: 'AwarenessDetail',
                    bannedItem: '',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false
                });
                hasChanges = true;
            }
            
            setChecklistRows(updatedRows);
        } else {
            // Initialize empty state with all questions
            setChecklistRows([
                {
                    id: Date.now(),
                    areaName: 'CompostableQuestion',
                    bannedItem: 'Is any Compostable / Biodegradable used in factory premises?',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false
                },
                {
                    id: Date.now() + 1,
                    areaName: 'MisrepresentationDetail',
                    bannedItem: '',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false,
                    misrepresentationDetails: ''
                },
                {
                    id: Date.now() + 2,
                    areaName: 'AwarenessDetail',
                    bannedItem: '',
                    found: '',
                    qty: '',
                    remarks: '',
                    photoRef: '',
                    checkedBy: '',
                    date: null,
                    isCustomItem: false
                }
            ]);
        }
    }, [supChecklistData]);

    // Save data whenever rows change
    React.useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        const timer = setTimeout(() => {
            if (onSaveSupChecklist) {
                onSaveSupChecklist(checklistRows, false);
            }
        }, 1000); // Debounce save
        return () => clearTimeout(timer);
    }, [checklistRows, onSaveSupChecklist]);

    const handleAddChecklistRow = () => {
        setChecklistRows([...checklistRows, {
            id: Date.now(),
            areaName: '',
            bannedItem: '',
            found: 'No',
            qty: '',
            remarks: '',
            photoRef: '',
            checkedBy: '',
            date: null,
            isCustomItem: false
        }]);
    };

    const handleDeleteChecklistRow = (id) => {
        setChecklistRows(checklistRows.filter(row => row.id !== id));
    };

    const handleChecklistChange = (id, field, value) => {
        setChecklistRows(checklistRows.map(row => 
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const checklistColumns = [
        {
            title: '#',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_, __, index) => <span className="font-bold text-gray-600">{index + 1}</span>
        },
        {
            title: 'AREA NAME',
            dataIndex: 'areaName',
            key: 'areaName',
            width: 250,
            render: (text, record) => (
                <Select
                    value={text} 
                    onChange={(value) => handleChecklistChange(record.id, 'areaName', value)}
                    disabled={isStepReadOnly()}
                    options={AREA_NAME_OPTIONS}
                    style={{ width: '100%' }}
                    placeholder="Select Area"
                    className="w-full"
                />
            )
        },
        {
            title: 'BANNED ITEM',
            dataIndex: 'bannedItem',
            key: 'bannedItem',
            width: 250,
            render: (text, record) => {
                if (record.isCustomItem) {
                    return (
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <Input
                                value={text}
                                onChange={(e) => handleChecklistChange(record.id, 'bannedItem', e.target.value)}
                                placeholder="Enter Item Name"
                                disabled={isStepReadOnly()}
                            />
                            <Button
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setChecklistRows(rows => rows.map(r => r.id === record.id ? { ...r, isCustomItem: false, bannedItem: '' } : r));
                                }}
                                disabled={isStepReadOnly()}
                            />
                        </div>
                    );
                }

                const options = BANNED_ITEMS_OPTIONS[record.areaName] || [];
                return (
                    <Select
                        value={text} 
                        onChange={(value) => {
                            if (value === 'Not Mentioned') {
                                setChecklistRows(rows => rows.map(r => r.id === record.id ? { ...r, isCustomItem: true, bannedItem: '' } : r));
                            } else {
                                handleChecklistChange(record.id, 'bannedItem', value);
                            }
                        }}
                        disabled={isStepReadOnly()}
                        options={options}
                        style={{ width: '100%' }}
                        placeholder={options.length > 0 ? "Select Item" : "Select Area First"}
                    />
                );
            }
        },
        {
            title: 'FOUND',
            dataIndex: 'found',
            key: 'found',
            width: 100,
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => handleChecklistChange(record.id, 'found', value)}
                    disabled={isStepReadOnly()}
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' }
                    ]}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'QUANTITY',
            dataIndex: 'qty',
            key: 'qty',
            width: 120,
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={(e) => handleChecklistChange(record.id, 'qty', e.target.value)}
                    disabled={isStepReadOnly()}
                />
            )
        },
        {
            title: 'UPLOAD PHOTO',
            dataIndex: 'photoRef',
            key: 'photoRef',
            width: 150,
            align: 'center',
            render: (text, record) => (
                <div className="flex flex-col items-center justify-center">
                    {text ? (
                        <div className="flex flex-col items-center">
                            <div 
                                className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden mb-1 cursor-pointer bg-gray-50 flex items-center justify-center"
                            >
                                {/* Check if it looks like an image source we can render */}
                                {(text.startsWith('data:image') || text.startsWith('http') || text.startsWith('blob:')) ? (
                                    <img 
                                        src={text} 
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                
                                {/* Fallback Icon (hidden if image loads) */}
                                <div className="hidden w-full h-full items-center justify-center bg-gray-50" style={{ display: (text.startsWith('data:image') || text.startsWith('http')) ? 'none' : 'flex' }}>
                                    <CloudUploadOutlined className="text-2xl text-gray-400" />
                                </div>
                            </div>
                            
                            <div className="flex gap-2 text-xs">
                                {/* Only show View if it's likely viewable */}
                                {(text.startsWith('data:image') || text.startsWith('http')) && (
                                    <span 
                                        className="text-orange-500 cursor-pointer hover:underline"
                                        onClick={() => handleViewDocument(text, 'Photo')}
                                    >
                                        View
                                    </span>
                                )}
                                
                                <Upload
                                    beforeUpload={(file) => {
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                            handleChecklistChange(record.id, 'photoRef', e.target.result);
                                        };
                                        reader.readAsDataURL(file);
                                        return false; 
                                    }}
                                    showUploadList={false}
                                    disabled={isStepReadOnly()}
                                >
                                    <span className="text-blue-500 cursor-pointer hover:underline">Change</span>
                                </Upload>
                            </div>
                        </div>
                    ) : (
                        <Upload
                            beforeUpload={(file) => {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    handleChecklistChange(record.id, 'photoRef', e.target.result);
                                };
                                reader.readAsDataURL(file);
                                return false; 
                            }}
                            showUploadList={false}
                            disabled={isStepReadOnly()}
                        >
                            <div className="border border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center bg-white" style={{ width: '100px', height: '60px' }}>
                                <CloudUploadOutlined className="text-xl text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                            </div>
                        </Upload>
                    )}
                </div>
            )
        },
        {
            title: 'REMARKS',
            dataIndex: 'remarks',
            key: 'remarks',
            width: 250,
            render: (text, record) => (
                <div className="flex flex-col gap-1">
                    <Input.TextArea 
                        value={text} 
                        onChange={(e) => handleChecklistChange(record.id, 'remarks', e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        disabled={isStepReadOnly()}
                        placeholder="• Point 1..."
                        className="text-sm"
                    />
                    {!isStepReadOnly() && (
                        <Button 
                            type="dashed" 
                            size="small" 
                            icon={<PlusOutlined />} 
                            className="text-xs w-full text-gray-500 flex items-center justify-center gap-1"
                            onClick={() => {
                                const currentText = text || '';
                                // Add a new line with bullet if text exists, otherwise start with bullet
                                const newText = currentText 
                                    ? (currentText.endsWith('\n') ? `${currentText}• ` : `${currentText}\n• `)
                                    : '• ';
                                handleChecklistChange(record.id, 'remarks', newText);
                            }}
                        >
                            Add Point
                        </Button>
                    )}
                </div>
            )
        },
        {
            title: 'ACTIONS',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <Button
                        type="default"
                        className="bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 text-white flex items-center justify-center p-0"
                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                        icon={<SaveOutlined style={{ color: 'white' }} />}
                        onClick={() => {
                            if (onSaveSupChecklist) {
                                onSaveSupChecklist(checklistRows, true);
                            }
                        }}
                        disabled={isStepReadOnly() || isSaving}
                    />
                    <Button 
                        type="default" 
                        className="bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600 flex items-center justify-center p-0"
                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                        icon={<UndoOutlined />}
                        disabled={isStepReadOnly()}
                        title="Reset"
                    />
                    <Button 
                        type="default" 
                        className="bg-red-50 border-red-200 hover:bg-red-100 text-red-500 flex items-center justify-center p-0"
                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDeleteChecklistRow(record.id)}
                        disabled={isStepReadOnly()}
                    />
                </div>
            )
        }
    ];

    const renderTab1 = () => (
        <>
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-bold text-gray-700">Single Use Plastic Checklist</h3>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddChecklistRow}
                        disabled={isStepReadOnly()}
                    >
                        Add Row
                    </Button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white p-2">
                    <Table
                        dataSource={checklistRows.filter(row => !['CompostableQuestion', 'CompostableDetail', 'MisrepresentationDetail', 'AwarenessDetail'].includes(row.areaName))}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        size="small"
                        bordered
                        columns={checklistColumns}
                    />
                </div>
            </div>
        </>
    );

    const handleAddCompostableRow = () => {
        setChecklistRows([...checklistRows, {
            id: Date.now(),
            areaName: 'CompostableDetail',
            bannedItem: '',
            found: '',
            qty: '',
            remarks: '',
            photoRef: '',
            checkedBy: '',
            date: null,
            isCustomItem: false,
            materialType: '',
            cpcbCertAvailable: '',
            companyName: '',
            eprRegNum: '',
            certNum: '',
            certScopeMatch: '',
            properMarking: ''
        }]);
    };

    const renderTab2 = () => {
        const questionRow = checklistRows.find(row => row.areaName === 'CompostableQuestion');
        const showDetailsTable = questionRow && questionRow.found === 'Yes';

        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-md font-bold text-gray-700 mb-4">Compostable / Biodegradable Checklist</h3>
                <Table
                    dataSource={checklistRows.filter(row => row.areaName === 'CompostableQuestion')}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    bordered
                    columns={[
                        {
                            title: '#',
                            key: 'index',
                            width: 50,
                            align: 'center',
                            render: (_, __, index) => <span className="font-bold text-gray-600">{index + 1}</span>
                        },
                        {
                            title: 'QUESTION',
                            dataIndex: 'bannedItem',
                            key: 'bannedItem',
                            width: 500,
                            render: (text) => <span className="font-medium text-gray-700">{text}</span>
                        },
                        {
                            title: 'RESPONSE (YES/NO)',
                            dataIndex: 'found',
                            key: 'found',
                            width: 200,
                            render: (text, record) => (
                                <Select
                                    value={text || undefined}
                                    onChange={(value) => handleChecklistChange(record.id, 'found', value)}
                                    disabled={isStepReadOnly()}
                                    options={[
                                        { value: 'Yes', label: 'Yes' },
                                        { value: 'No', label: 'No' }
                                    ]}
                                    style={{ width: '100%' }}
                                    placeholder="Select Response"
                                />
                            )
                        }
                    ]}
                />

                {showDetailsTable && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-md font-bold text-gray-700">Compostable / Biodegradable Details</h3>
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />} 
                                onClick={handleAddCompostableRow}
                                disabled={isStepReadOnly()}
                            >
                                Add Row
                            </Button>
                        </div>
                        <Table
                            dataSource={checklistRows.filter(row => row.areaName === 'CompostableDetail')}
                            rowKey="id"
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            size="small"
                            bordered
                            columns={[
                                {
                                    title: 'Sr. No.',
                                    key: 'index',
                                    width: 60,
                                    align: 'center',
                                    render: (_, __, index) => <span className="font-bold text-gray-600">{index + 1}</span>
                                },
                                {
                                    title: 'Material Type (Compostable/Biodegradable)',
                                    dataIndex: 'materialType',
                                    key: 'materialType',
                                    width: 200,
                                    render: (text, record) => (
                                        <Select
                                            value={text || undefined}
                                            onChange={(value) => handleChecklistChange(record.id, 'materialType', value)}
                                            disabled={isStepReadOnly()}
                                            options={[
                                                { value: 'Compostable', label: 'Compostable' },
                                                { value: 'Biodegradable', label: 'Biodegradable' }
                                            ]}
                                            style={{ width: '100%' }}
                                            placeholder="Select Type"
                                        />
                                    )
                                },
                                {
                                    title: 'Valid CPCB Certificate Available?',
                                    dataIndex: 'cpcbCertAvailable',
                                    key: 'cpcbCertAvailable',
                                    width: 150,
                                    render: (text, record) => (
                                        <Select
                                            value={text || undefined}
                                            onChange={(value) => handleChecklistChange(record.id, 'cpcbCertAvailable', value)}
                                            disabled={isStepReadOnly()}
                                            options={[
                                                { value: 'Yes', label: 'Yes' },
                                                { value: 'No', label: 'No' }
                                            ]}
                                            style={{ width: '100%' }}
                                        />
                                    )
                                },
                                {
                                    title: 'Name of the Company',
                                    dataIndex: 'companyName',
                                    key: 'companyName',
                                    width: 200,
                                    render: (text, record) => (
                                        <Input
                                            value={text}
                                            onChange={(e) => handleChecklistChange(record.id, 'companyName', e.target.value)}
                                            disabled={isStepReadOnly()}
                                        />
                                    )
                                },
                                {
                                    title: 'EPR Registration Certificate Number (PWM EPR )',
                                    dataIndex: 'eprRegNum',
                                    key: 'eprRegNum',
                                    width: 250,
                                    render: (text, record) => (
                                        <Input
                                            value={text}
                                            onChange={(e) => handleChecklistChange(record.id, 'eprRegNum', e.target.value)}
                                            disabled={isStepReadOnly()}
                                        />
                                    )
                                },
                                {
                                    title: 'Certificate Number',
                                    dataIndex: 'certNum',
                                    key: 'certNum',
                                    width: 200,
                                    render: (text, record) => (
                                        <Input
                                            value={text}
                                            onChange={(e) => handleChecklistChange(record.id, 'certNum', e.target.value)}
                                            disabled={isStepReadOnly()}
                                        />
                                    )
                                },
                                {
                                    title: 'Certificate Scope Match? (Product & Unit)',
                                    dataIndex: 'certScopeMatch',
                                    key: 'certScopeMatch',
                                    width: 150,
                                    render: (text, record) => (
                                        <Select
                                            value={text || undefined}
                                            onChange={(value) => handleChecklistChange(record.id, 'certScopeMatch', value)}
                                            disabled={isStepReadOnly()}
                                            options={[
                                                { value: 'Yes', label: 'Yes' },
                                                { value: 'No', label: 'No' }
                                            ]}
                                            style={{ width: '100%' }}
                                        />
                                    )
                                },
                                {
                                    title: 'Proper Product Marking/Labeling?',
                                    dataIndex: 'properMarking',
                                    key: 'properMarking',
                                    width: 150,
                                    render: (text, record) => (
                                        <Select
                                            value={text || undefined}
                                            onChange={(value) => handleChecklistChange(record.id, 'properMarking', value)}
                                            disabled={isStepReadOnly()}
                                            options={[
                                                { value: 'Yes', label: 'Yes' },
                                                { value: 'No', label: 'No' }
                                            ]}
                                            style={{ width: '100%' }}
                                        />
                                    )
                                },
                                {
                                    title: 'Upload Photo',
                                    dataIndex: 'photoRef',
                                    key: 'photoRef',
                                    width: 150,
                                    align: 'center',
                                    render: (text, record) => (
                                        <div className="flex flex-col items-center justify-center">
                                            {text ? (
                                                <div className="flex flex-col items-center">
                                                    <div 
                                                        className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden mb-1 cursor-pointer bg-gray-50 flex items-center justify-center"
                                                    >
                                                        {(text.startsWith('data:image') || text.startsWith('http') || text.startsWith('blob:')) ? (
                                                            <img 
                                                                src={text} 
                                                                alt="" 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className="hidden w-full h-full items-center justify-center bg-gray-50" style={{ display: (text.startsWith('data:image') || text.startsWith('http')) ? 'none' : 'flex' }}>
                                                            <CloudUploadOutlined className="text-2xl text-gray-400" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 text-xs">
                                                        {(text.startsWith('data:image') || text.startsWith('http')) && (
                                                            <span 
                                                                className="text-orange-500 cursor-pointer hover:underline"
                                                                onClick={() => handleViewDocument(text, 'Photo')}
                                                            >
                                                                View
                                                            </span>
                                                        )}
                                                        <Upload
                                                            beforeUpload={(file) => {
                                                                const reader = new FileReader();
                                                                reader.onload = (e) => {
                                                                    handleChecklistChange(record.id, 'photoRef', e.target.result);
                                                                };
                                                                reader.readAsDataURL(file);
                                                                return false; 
                                                            }}
                                                            showUploadList={false}
                                                            disabled={isStepReadOnly()}
                                                        >
                                                            <span className="text-blue-500 cursor-pointer hover:underline">Change</span>
                                                        </Upload>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Upload
                                                    beforeUpload={(file) => {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            handleChecklistChange(record.id, 'photoRef', e.target.result);
                                                        };
                                                        reader.readAsDataURL(file);
                                                        return false; 
                                                    }}
                                                    showUploadList={false}
                                                    disabled={isStepReadOnly()}
                                                >
                                                    <div className="border border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center bg-white" style={{ width: '100px', height: '60px' }}>
                                                        <CloudUploadOutlined className="text-xl text-gray-400 mb-1" />
                                                        <span className="text-xs text-gray-500">Upload</span>
                                                    </div>
                                                </Upload>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    title: 'Remarks',
                                    dataIndex: 'remarks',
                                    key: 'remarks',
                                    width: 250,
                                    render: (text, record) => (
                                        <div className="flex flex-col gap-1">
                                            <Input.TextArea 
                                                value={text} 
                                                onChange={(e) => handleChecklistChange(record.id, 'remarks', e.target.value)}
                                                autoSize={{ minRows: 2, maxRows: 6 }}
                                                disabled={isStepReadOnly()}
                                                placeholder="• Point 1..."
                                                className="text-sm"
                                            />
                                            {!isStepReadOnly() && (
                                                <Button 
                                                    type="dashed" 
                                                    size="small" 
                                                    icon={<PlusOutlined />} 
                                                    className="text-xs w-full text-gray-500 flex items-center justify-center gap-1"
                                                    onClick={() => {
                                                        const currentText = text || '';
                                                        // Add a new line with bullet if text exists, otherwise start with bullet
                                                        const newText = currentText 
                                                            ? (currentText.endsWith('\n') ? `${currentText}• ` : `${currentText}\n• `)
                                                            : '• ';
                                                        handleChecklistChange(record.id, 'remarks', newText);
                                                    }}
                                                >
                                                    Add Point
                                                </Button>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    title: 'Actions',
                                    key: 'action',
                                    width: 120,
                                    align: 'center',
                                    render: (_, record) => (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <Button
                                                type="default"
                                                className="bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 text-white flex items-center justify-center p-0"
                                                style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                                icon={<SaveOutlined style={{ color: 'white' }} />}
                                                onClick={() => {
                                                    if (onSaveSupChecklist) {
                                                        onSaveSupChecklist(checklistRows, true);
                                                    }
                                                }}
                                                disabled={isStepReadOnly() || isSaving}
                                            />
                                            <Button 
                                                type="default" 
                                                className="bg-red-50 border-red-200 hover:bg-red-100 text-red-500 flex items-center justify-center p-0"
                                                style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                                icon={<DeleteOutlined />} 
                                                onClick={() => handleDeleteChecklistRow(record.id)}
                                                disabled={isStepReadOnly()}
                                            />
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </div>
                )}
            </div>
        );
    };

    const handleAddMisrepresentationRow = () => {
        setChecklistRows([...checklistRows, {
            id: Date.now(),
            areaName: 'MisrepresentationDetail',
            bannedItem: '',
            found: '',
            qty: '',
            remarks: '',
            photoRef: '',
            checkedBy: '',
            date: null,
            isCustomItem: false,
            misrepresentationDetails: ''
        }]);
    };

    const renderTab3 = () => {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-bold text-gray-700">Misrepresentation Checklist</h3>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddMisrepresentationRow}
                        disabled={isStepReadOnly()}
                    >
                        Add Row
                    </Button>
                </div>
                <Table
                    dataSource={checklistRows.filter(row => row.areaName === 'MisrepresentationDetail')}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 'max-content' }}
                    columns={[
                        {
                            title: '#',
                            key: 'index',
                            width: 50,
                            align: 'center',
                            render: (_, __, index) => <span className="font-bold text-gray-600">{index + 1}</span>
                        },
                        {
                            title: 'Misrepresentation Found? (Yes/No)',
                            dataIndex: 'found',
                            key: 'found',
                            width: 150,
                            render: (text, record) => (
                                <Select
                                    value={text || undefined}
                                    onChange={(value) => handleChecklistChange(record.id, 'found', value)}
                                    disabled={isStepReadOnly()}
                                    options={[
                                        { value: 'Yes', label: 'Yes' },
                                        { value: 'No', label: 'No' }
                                    ]}
                                    style={{ width: '100%' }}
                                    placeholder="Select"
                                />
                            )
                        },
                        {
                            title: 'Details of Misrepresentation (False compostable/biodegradable claim etc.)',
                            dataIndex: 'misrepresentationDetails',
                            key: 'misrepresentationDetails',
                            width: 300,
                            render: (text, record) => (
                                <Select
                                    value={text || undefined}
                                    onChange={(value) => handleChecklistChange(record.id, 'misrepresentationDetails', value)}
                                    disabled={isStepReadOnly()}
                                    options={[
                                        { value: 'Yes', label: 'Yes' },
                                        { value: 'No', label: 'No' }
                                    ]}
                                    style={{ width: '100%' }}
                                    placeholder="Select"
                                />
                            )
                        },
                        {
                            title: 'Upload Photo',
                            dataIndex: 'photoRef',
                            key: 'photoRef',
                            width: 150,
                            align: 'center',
                            render: (text, record) => (
                                <div className="flex flex-col items-center justify-center">
                                    {text ? (
                                        <div className="flex flex-col items-center">
                                            <div 
                                                className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden mb-1 cursor-pointer bg-gray-50 flex items-center justify-center"
                                            >
                                                {(text.startsWith('data:image') || text.startsWith('http') || text.startsWith('blob:')) ? (
                                                    <img 
                                                        src={text} 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className="hidden w-full h-full items-center justify-center bg-gray-50" style={{ display: (text.startsWith('data:image') || text.startsWith('http')) ? 'none' : 'flex' }}>
                                                    <CloudUploadOutlined className="text-2xl text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                {(text.startsWith('data:image') || text.startsWith('http')) && (
                                                    <span 
                                                        className="text-orange-500 cursor-pointer hover:underline"
                                                        onClick={() => handleViewDocument(text, 'Photo')}
                                                    >
                                                        View
                                                    </span>
                                                )}
                                                <Upload
                                                    beforeUpload={(file) => {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            handleChecklistChange(record.id, 'photoRef', e.target.result);
                                                        };
                                                        reader.readAsDataURL(file);
                                                        return false; 
                                                    }}
                                                    showUploadList={false}
                                                    disabled={isStepReadOnly()}
                                                >
                                                    <span className="text-blue-500 cursor-pointer hover:underline">Change</span>
                                                </Upload>
                                            </div>
                                        </div>
                                    ) : (
                                        <Upload
                                            beforeUpload={(file) => {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    handleChecklistChange(record.id, 'photoRef', e.target.result);
                                                };
                                                reader.readAsDataURL(file);
                                                return false; 
                                            }}
                                            showUploadList={false}
                                            disabled={isStepReadOnly()}
                                        >
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center bg-white" style={{ width: '100px', height: '60px' }}>
                                                <CloudUploadOutlined className="text-xl text-gray-400 mb-1" />
                                                <span className="text-xs text-gray-500">Upload</span>
                                            </div>
                                        </Upload>
                                    )}
                                </div>
                            )
                        },
                        {
                            title: 'Remarks',
                            dataIndex: 'remarks',
                            key: 'remarks',
                            width: 250,
                            render: (text, record) => (
                                <div className="flex flex-col gap-1">
                                    <Input.TextArea 
                                        value={text} 
                                        onChange={(e) => handleChecklistChange(record.id, 'remarks', e.target.value)}
                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                        disabled={isStepReadOnly()}
                                        placeholder="• Point 1..."
                                        className="text-sm"
                                    />
                                    {!isStepReadOnly() && (
                                        <Button 
                                            type="dashed" 
                                            size="small" 
                                            icon={<PlusOutlined />} 
                                            className="text-xs w-full text-gray-500 flex items-center justify-center gap-1"
                                            onClick={() => {
                                                const currentText = text || '';
                                                const newText = currentText 
                                                    ? (currentText.endsWith('\n') ? `${currentText}• ` : `${currentText}\n• `)
                                                    : '• ';
                                                handleChecklistChange(record.id, 'remarks', newText);
                                            }}
                                        >
                                            Add Point
                                        </Button>
                                    )}
                                </div>
                            )
                        },
                        {
                            title: 'Actions',
                            key: 'action',
                            width: 120,
                            align: 'center',
                            render: (_, record) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <Button
                                        type="default"
                                        className="bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 text-white flex items-center justify-center p-0"
                                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                        icon={<SaveOutlined style={{ color: 'white' }} />}
                                        onClick={() => {
                                            if (onSaveSupChecklist) {
                                                onSaveSupChecklist(checklistRows, true);
                                            }
                                        }}
                                        disabled={isStepReadOnly() || isSaving}
                                    />
                                    <Button 
                                        type="default" 
                                        className="bg-red-50 border-red-200 hover:bg-red-100 text-red-500 flex items-center justify-center p-0"
                                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                        icon={<DeleteOutlined />} 
                                        onClick={() => handleDeleteChecklistRow(record.id)}
                                        disabled={isStepReadOnly()}
                                    />
                                </div>
                            )
                        }
                    ]}
                />
            </div>
        );
    };

    const handleAddAwarenessRow = () => {
        setChecklistRows([...checklistRows, {
            id: Date.now(),
            areaName: 'AwarenessDetail',
            bannedItem: '',
            found: '',
            qty: '',
            remarks: '',
            photoRef: '',
            checkedBy: '',
            date: null,
            isCustomItem: false
        }]);
    };

    const renderTab4 = () => {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-bold text-gray-700">Awareness Checklist</h3>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddAwarenessRow}
                        disabled={isStepReadOnly()}
                    >
                        Add Row
                    </Button>
                </div>
                <Table
                    dataSource={checklistRows.filter(row => row.areaName === 'AwarenessDetail')}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 'max-content' }}
                    columns={[
                        {
                            title: '#',
                            key: 'index',
                            width: 50,
                            align: 'center',
                            render: (_, __, index) => <span className="font-bold text-gray-600">{index + 1}</span>
                        },
                        {
                            title: 'Type of Awareness',
                            dataIndex: 'bannedItem',
                            key: 'bannedItem',
                            width: 250,
                            render: (text, record) => (
                                <Input
                                    value={text}
                                    onChange={(e) => handleChecklistChange(record.id, 'bannedItem', e.target.value)}
                                    placeholder="Enter Awareness Type"
                                    disabled={isStepReadOnly()}
                                />
                            )
                        },
                        {
                            title: 'Date',
                            dataIndex: 'date',
                            key: 'date',
                            width: 150,
                            render: (text, record) => (
                                <DatePicker
                                    value={text ? dayjs(text) : null}
                                    onChange={(date, dateString) => handleChecklistChange(record.id, 'date', dateString)}
                                    disabled={isStepReadOnly()}
                                    style={{ width: '100%' }}
                                />
                            )
                        },
                        {
                            title: 'Responsible Person',
                            dataIndex: 'checkedBy',
                            key: 'checkedBy',
                            width: 200,
                            render: (text, record) => (
                                <Input
                                    value={text}
                                    onChange={(e) => handleChecklistChange(record.id, 'checkedBy', e.target.value)}
                                    placeholder="Enter Name"
                                    disabled={isStepReadOnly()}
                                />
                            )
                        },
                        {
                            title: 'Remarks / Corrective Action',
                            dataIndex: 'remarks',
                            key: 'remarks',
                            width: 300,
                            render: (text, record) => (
                                <div className="flex flex-col gap-1">
                                    <Input.TextArea 
                                        value={text} 
                                        onChange={(e) => handleChecklistChange(record.id, 'remarks', e.target.value)}
                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                        disabled={isStepReadOnly()}
                                        placeholder="• Point 1..."
                                        className="text-sm"
                                    />
                                    {!isStepReadOnly() && (
                                        <Button 
                                            type="dashed" 
                                            size="small" 
                                            icon={<PlusOutlined />} 
                                            className="text-xs w-full text-gray-500 flex items-center justify-center gap-1"
                                            onClick={() => {
                                                const currentText = text || '';
                                                const newText = currentText 
                                                    ? (currentText.endsWith('\n') ? `${currentText}• ` : `${currentText}\n• `)
                                                    : '• ';
                                                handleChecklistChange(record.id, 'remarks', newText);
                                            }}
                                        >
                                            Add Point
                                        </Button>
                                    )}
                                </div>
                            )
                        },
                        {
                            title: 'Actions',
                            key: 'action',
                            width: 120,
                            align: 'center',
                            render: (_, record) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <Button
                                        type="default"
                                        className="bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 text-white flex items-center justify-center p-0"
                                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                        icon={<SaveOutlined style={{ color: 'white' }} />}
                                        onClick={() => {
                                            if (onSaveSupChecklist) {
                                                onSaveSupChecklist(checklistRows, true);
                                            }
                                        }}
                                        disabled={isStepReadOnly() || isSaving}
                                    />
                                    <Button 
                                        type="default" 
                                        className="bg-red-50 border-red-200 hover:bg-red-100 text-red-500 flex items-center justify-center p-0"
                                        style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                                        icon={<DeleteOutlined />} 
                                        onClick={() => handleDeleteChecklistRow(record.id)}
                                        disabled={isStepReadOnly()}
                                    />
                                </div>
                            )
                        }
                    ]}
                />
            </div>
        );
    };

    const items = [
        {
            key: '1',
            label: (
                <span className={`px-4 py-1 font-medium ${activeTab === '1' ? 'text-orange-600' : 'text-gray-600'}`}>
                    Single Use Plastic
                </span>
            ),
            children: renderTab1(),
        },
        {
            key: '2',
            label: (
                <span className={`px-4 py-1 font-medium ${activeTab === '2' ? 'text-orange-600' : 'text-gray-600'}`}>
                    Disposable
                </span>
            ),
            children: renderTab2(),
        },
        {
            key: '3',
            label: (
                <span className={`px-4 py-1 font-medium ${activeTab === '3' ? 'text-orange-600' : 'text-gray-600'}`}>
                    Misrepresentation
                </span>
            ),
            children: renderTab3(),
        },
        {
            key: '4',
            label: (
                <span className={`px-4 py-1 font-medium ${activeTab === '4' ? 'text-orange-600' : 'text-gray-600'}`}>
                    Awareness
                </span>
            ),
            children: renderTab4(),
        },
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <Tabs 
                defaultActiveKey="1" 
                activeKey={activeTab} 
                onChange={setActiveTab} 
                items={items}
                type="card"
                className="custom-tabs"
                tabBarStyle={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0' }}
            />

            <div className="flex justify-end pt-6 border-t border-gray-200 mt-4">
                <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : null}
                    Next Step <i className="fas fa-arrow-right"></i>
                </button>
            </div>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                documentUrl={viewerUrl}
                documentName={viewerName}
            />
        </div>
    );
};

export default SingleUsePlastic;
