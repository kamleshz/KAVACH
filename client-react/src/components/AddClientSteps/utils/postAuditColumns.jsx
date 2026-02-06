import React from 'react';
import { Select, Input, Button, Tooltip, Popover } from 'antd';
import { FaInfoCircle } from 'react-icons/fa';

export const getPostValidationColumns = ({
    postValidationPagination,
    API_URL,
    parseRemarksToItems,
    openRemarkModal,
    handlePostValidationChange,
    appendRemarkPoint,
    handleSavePostValidation
}) => {
    // Helper to check if field is changed
    const isChanged = (record, field) => {
        if (!record._original) return false;
        const originalVal = record._original[field];
        const currentVal = record[field];
        // Handle loose equality for numbers/strings mismatch if needed, but strict is safer for now
        // Treat null/undefined/empty string as equivalent
        const norm = (v) => (v === null || v === undefined) ? '' : String(v);
        return norm(originalVal) !== norm(currentVal);
    };

    // Common input class generator
    const getInputClass = (changed) => 
        `w-full text-xs rounded transition-all focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
            changed ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
        }`;

    return [
        {
            title: '#',
            key: 'index',
            width: 60,
            fixed: 'left',
            render: (_value, _record, index) => {
                const base = (postValidationPagination.current - 1) * postValidationPagination.pageSize;
                const rowNumber = base + index + 1;
                return (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                        {rowNumber}
                    </span>
                );
            }
        },
        {
            title: 'Packaging Type',
            dataIndex: 'packagingType',
            key: 'packagingType',
            width: 160,
            render: (value, record) => (
                <Select
                    value={value || undefined}
                    onChange={(val) => handlePostValidationChange(record.key, 'packagingType', val)}
                    className={`w-full text-xs ${isChanged(record, 'packagingType') ? 'border-amber-400 bg-amber-50 rounded' : ''}`}
                    placeholder="Select"
                    size="small"
                    style={isChanged(record, 'packagingType') ? { border: '1px solid #fbbf24', background: '#fffbeb' } : {}}
                >
                    <Select.Option value="Primary Packaging">Primary Packaging</Select.Option>
                    <Select.Option value="Secondary Packaging">Secondary Packaging</Select.Option>
                    <Select.Option value="Tertiary Packaging">Tertiary Packaging</Select.Option>
                </Select>
            )
        },
        {
            title: 'SKU Code',
            dataIndex: 'skuCode',
            key: 'skuCode',
            width: 150,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'skuCode', e.target.value)}
                    className={getInputClass(isChanged(record, 'skuCode'))}
                    size="small"
                />
            )
        },
        {
            title: 'SKU Description',
            dataIndex: 'skuDescription',
            key: 'skuDescription',
            width: 220,
            render: (text, record) => (
                <Input.TextArea
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'skuDescription', e.target.value)}
                    className={getInputClass(isChanged(record, 'skuDescription'))}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    size="small"
                />
            )
        },
        {
            title: 'SKU UOM',
            dataIndex: 'skuUom',
            key: 'skuUom',
            width: 120,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'skuUom', e.target.value)}
                    className={getInputClass(isChanged(record, 'skuUom'))}
                    size="small"
                />
            )
        },
        {
            title: 'Product Image',
            dataIndex: 'productImage',
            key: 'productImage',
            width: 120,
            render: (value) => {
                const src = value;
                if (!src) return <span className="text-gray-400 text-xs">No Image</span>;
                const handleView = () => {
                    try {
                        const url = src.startsWith('http') ? src : new URL(src, API_URL).toString();
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } catch {
                        window.open(src, '_blank', 'noopener,noreferrer');
                    }
                };
                return (
                    <div className="flex items-center gap-2">
                        <img 
                            src={src} 
                            alt="Prod" 
                            className="h-8 w-8 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={handleView}
                        />
                    </div>
                );
            }
        },
        {
            title: 'Component Image',
            dataIndex: 'componentImage',
            key: 'componentImage',
            width: 120,
            render: (value) => {
                const src = value;
                if (!src) return <span className="text-gray-400 text-xs">No Image</span>;
                const handleView = () => {
                    try {
                        const url = src.startsWith('http') ? src : new URL(src, API_URL).toString();
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } catch {
                        window.open(src, '_blank', 'noopener,noreferrer');
                    }
                };
                return (
                    <div className="flex items-center gap-2">
                        <img 
                            src={src} 
                            alt="Comp" 
                            className="h-8 w-8 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={handleView}
                        />
                    </div>
                );
            }
        },
        {
            title: 'Component Code',
            dataIndex: 'componentCode',
            key: 'componentCode',
            width: 150,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'componentCode', e.target.value)}
                    className={getInputClass(isChanged(record, 'componentCode'))}
                    size="small"
                />
            )
        },
        {
            title: 'System Code',
            dataIndex: 'systemCode',
            key: 'systemCode',
            width: 150,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'systemCode', e.target.value)}
                    className={getInputClass(isChanged(record, 'systemCode'))}
                    size="small"
                />
            )
        },
        {
            title: 'Component Description',
            dataIndex: 'componentDescription',
            key: 'componentDescription',
            width: 200,
            render: (text, record) => (
                <Input.TextArea
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'componentDescription', e.target.value)}
                    className={getInputClass(isChanged(record, 'componentDescription'))}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    size="small"
                />
            )
        },
        {
            title: 'Component Polymer',
            dataIndex: 'componentPolymer',
            key: 'componentPolymer',
            width: 150,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'componentPolymer', e.target.value)}
                    className={getInputClass(isChanged(record, 'componentPolymer'))}
                    size="small"
                />
            )
        },
        {
            title: 'Container Capacity',
            dataIndex: 'containerCapacity',
            key: 'containerCapacity',
            width: 140,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'containerCapacity', e.target.value)}
                    className={getInputClass(isChanged(record, 'containerCapacity'))}
                    size="small"
                />
            )
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 140,
            render: (text, record) => (
                <Select
                    value={text || undefined}
                    onChange={(val) => handlePostValidationChange(record.key, 'category', val)}
                    className={`w-full text-xs ${isChanged(record, 'category') ? 'border-amber-400 bg-amber-50 rounded' : ''}`}
                    size="small"
                    placeholder="Select"
                    style={isChanged(record, 'category') ? { border: '1px solid #fbbf24', background: '#fffbeb' } : {}}
                >
                    <Select.Option value="Category I">Category I</Select.Option>
                    <Select.Option value="Category II">Category II</Select.Option>
                    <Select.Option value="Category III">Category III</Select.Option>
                </Select>
            )
        },
        {
            title: 'Monolayer / Multilayer',
            dataIndex: 'layerType',
            key: 'layerType',
            width: 160,
            render: (text, record) => (
                <Select
                    value={text || undefined}
                    onChange={(val) => handlePostValidationChange(record.key, 'layerType', val)}
                    className={`w-full text-xs ${isChanged(record, 'layerType') ? 'border-amber-400 bg-amber-50 rounded' : ''}`}
                    size="small"
                    placeholder="Select"
                    style={isChanged(record, 'layerType') ? { border: '1px solid #fbbf24', background: '#fffbeb' } : {}}
                >
                    <Select.Option value="Monolayer">Monolayer</Select.Option>
                    <Select.Option value="Multilayer">Multilayer</Select.Option>
                </Select>
            )
        },
        {
            title: 'Thickness (Micron)',
            dataIndex: 'thickness',
            key: 'thickness',
            width: 120,
            render: (text, record) => (
                <Input
                    type="number"
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'thickness', e.target.value)}
                    className={getInputClass(isChanged(record, 'thickness'))}
                    size="small"
                />
            )
        },
        {
            title: 'Supplier Code',
            dataIndex: 'supplierCode',
            key: 'supplierCode',
            width: 160,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'supplierCode', e.target.value)}
                    className={getInputClass(isChanged(record, 'supplierCode'))}
                    size="small"
                />
            )
        },
        {
            title: 'Supplier Name',
            dataIndex: 'supplierName',
            key: 'supplierName',
            width: 180,
            render: (text, record) => (
                <Input
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'supplierName', e.target.value)}
                    className={getInputClass(isChanged(record, 'supplierName'))}
                    size="small"
                />
            )
        },
        {
            title: 'Compliance Status',
            dataIndex: 'complianceStatus',
            key: 'complianceStatus',
            width: 160,
            fixed: 'right',
            render: (value, record) => (
                <Select
                    value={value || 'Pending'}
                    onChange={(val) => handlePostValidationChange(record.key, 'complianceStatus', val)}
                    className={`w-full text-xs ${
                        value === 'Compliant' ? 'text-green-600' :
                        value === 'Non-Compliant' ? 'text-red-600' :
                        value === 'Partially Compliant' ? 'text-amber-600' : 'text-gray-500'
                    } ${isChanged(record, 'complianceStatus') ? 'border-amber-400 bg-amber-50 rounded' : ''}`}
                    size="small"
                    style={isChanged(record, 'complianceStatus') ? { border: '1px solid #fbbf24', background: '#fffbeb' } : {}}
                >
                    <Select.Option value="Pending">Pending</Select.Option>
                    <Select.Option value="Compliant" className="text-green-600">Compliant</Select.Option>
                    <Select.Option value="Non-Compliant" className="text-red-600">Non-Compliant</Select.Option>
                    <Select.Option value="Partially Compliant" className="text-amber-600">Partially Compliant</Select.Option>
                </Select>
            )
        },
        {
            title: 'Auditor Remarks',
            dataIndex: 'auditorRemarks',
            key: 'auditorRemarks',
            width: 200,
            fixed: 'right',
            render: (text, record) => (
                <div className="flex flex-col gap-1">
                    <Input.TextArea
                        value={text || ''}
                        onChange={(e) => handlePostValidationChange(record.key, 'auditorRemarks', e.target.value)}
                        placeholder="Remarks..."
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        className={getInputClass(isChanged(record, 'auditorRemarks'))}
                    />
                    <div className="flex gap-1 justify-end">
                         <Tooltip title="View/Edit Points">
                             <Button 
                                type="text" 
                                size="small" 
                                icon={<FaInfoCircle className="text-blue-500" />}
                                onClick={() => openRemarkModal(record, 'auditorRemarks')}
                             />
                         </Tooltip>
                    </div>
                </div>
            )
        },
        {
            title: 'Client Remarks',
            dataIndex: 'clientRemarks',
            key: 'clientRemarks',
            width: 200,
            fixed: 'right',
            render: (text, record) => (
                <div className="flex flex-col gap-1">
                    <Input.TextArea
                        value={text || ''}
                        onChange={(e) => handlePostValidationChange(record.key, 'clientRemarks', e.target.value)}
                        placeholder="Remarks..."
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        className={getInputClass(isChanged(record, 'clientRemarks'))}
                    />
                    <div className="flex gap-1 justify-end">
                        <Tooltip title="View/Edit Points">
                             <Button 
                                type="text" 
                                size="small" 
                                icon={<FaInfoCircle className="text-blue-500" />}
                                onClick={() => openRemarkModal(record, 'clientRemarks')}
                             />
                         </Tooltip>
                    </div>
                </div>
            )
        },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            width: 80,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<div className="flex items-center gap-1"><span className="text-xs">Save</span></div>}
                    onClick={() => handleSavePostValidation(record)}
                    className="bg-blue-600 hover:bg-blue-700 text-xs flex items-center justify-center px-2 py-1 h-7"
                >
                </Button>
            )
        }
    ];
};
