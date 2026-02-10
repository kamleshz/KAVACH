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
    handleSavePostValidation,
    onViewDocument
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
            render: (value) => (
                <div className="text-xs text-gray-700 text-center">{value || '-'}</div>
            )
        },
        {
            title: 'SKU Code',
            dataIndex: 'skuCode',
            key: 'skuCode',
            width: 150,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'SKU Description',
            dataIndex: 'skuDescription',
            key: 'skuDescription',
            width: 220,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'SKU UOM',
            dataIndex: 'skuUom',
            key: 'skuUom',
            width: 120,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Product Image',
            dataIndex: 'productImage',
            key: 'productImage',
            width: 120,
            render: (value) => {
                const src = value;
                if (!src) return <div className="text-gray-400 text-xs text-center">No Image</div>;
                const handleView = () => {
                    if (onViewDocument) {
                        onViewDocument(src, 'Image', 'Product Image');
                    } else {
                        try {
                            const url = src.startsWith('http') ? src : new URL(src, API_URL).toString();
                            window.open(url, '_blank', 'noopener,noreferrer');
                        } catch {
                            window.open(src, '_blank', 'noopener,noreferrer');
                        }
                    }
                };
                return (
                    <div className="flex items-center justify-center gap-2">
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
                if (!src) return <div className="text-gray-400 text-xs text-center">No Image</div>;
                const handleView = () => {
                    if (onViewDocument) {
                        onViewDocument(src, 'Image', 'Component Image');
                    } else {
                        try {
                            const url = src.startsWith('http') ? src : new URL(src, API_URL).toString();
                            window.open(url, '_blank', 'noopener,noreferrer');
                        } catch {
                            window.open(src, '_blank', 'noopener,noreferrer');
                        }
                    }
                };
                return (
                    <div className="flex items-center justify-center gap-2">
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
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'System Code',
            dataIndex: 'systemCode',
            key: 'systemCode',
            width: 150,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Component Description',
            dataIndex: 'componentDescription',
            key: 'componentDescription',
            width: 200,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Component Polymer',
            dataIndex: 'componentPolymer',
            key: 'componentPolymer',
            width: 150,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Container Capacity',
            dataIndex: 'containerCapacity',
            key: 'containerCapacity',
            width: 140,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 140,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Monolayer / Multilayer',
            dataIndex: 'layerType',
            key: 'layerType',
            width: 160,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Thickness (Micron)',
            dataIndex: 'thickness',
            key: 'thickness',
            width: 120,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Supplier Code',
            dataIndex: 'supplierCode',
            key: 'supplierCode',
            width: 160,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Supplier Name',
            dataIndex: 'supplierName',
            key: 'supplierName',
            width: 180,
            render: (text) => (
                <div className="text-xs text-gray-700 text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Compliance Status',
            dataIndex: 'complianceStatus',
            key: 'complianceStatus',
            width: 160,
            render: (text) => {
                let bg = '#f3f4f6';
                let textCol = '#374151';
                let border = '#d1d5db';

                if (text === 'Partially Compliant') {
                    bg = '#fef3c7'; // amber-100
                    border = '#f59e0b'; // amber-500
                    textCol = '#92400e'; // amber-800
                } else if (text === 'Compliant') {
                    bg = '#dcfce7'; // green-100
                    border = '#22c55e'; // green-500
                    textCol = '#166534'; // green-800
                } else if (text === 'Non-Compliant') {
                    bg = '#fee2e2'; // red-100
                    border = '#ef4444'; // red-500
                    textCol = '#991b1b'; // red-800
                }
            
                return (
                     <div 
                        className="px-3 py-1.5 rounded text-xs font-medium text-center border"
                        style={{ backgroundColor: bg, color: textCol, borderColor: border }}
                     >
                        {text || '-'}
                     </div>
                );
            }
        },
        {
            title: 'Compliance Remarks',
            dataIndex: 'complianceRemarks',
            key: 'complianceRemarks',
            width: 200,
            render: (text, record) => (
                <div className="flex flex-col gap-1">
                    <ul className="list-disc pl-4 m-0 text-xs text-gray-700 mb-1">
                        {(Array.isArray(record.complianceRemarks) ? record.complianceRemarks : []).map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                    <Button 
                        size="small" 
                        type="dashed" 
                        onClick={() => openRemarkModal(record, 'complianceRemarks')}
                        className="text-xs w-full flex items-center justify-center gap-1"
                    >
                        <FaInfoCircle /> {record.complianceRemarks?.length > 0 ? 'Edit Remarks' : 'Add Remarks'}
                    </Button>
                </div>
            )
        },
        {
            title: 'Auditor Remarks',
            dataIndex: 'auditorRemarks',
            key: 'auditorRemarks',
            width: 200,
            render: (text, record) => (
                <Input.TextArea
                    value={text || ''}
                    onChange={(e) => handlePostValidationChange(record.key, 'auditorRemarks', e.target.value)}
                    placeholder="Remarks..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    className={getInputClass(isChanged(record, 'auditorRemarks'))}
                />
            )
        },
        {
            title: 'Client Remarks',
            dataIndex: 'clientRemarks',
            key: 'clientRemarks',
            width: 200,
            render: (text) => (
                <div className="text-xs text-gray-700 whitespace-pre-wrap text-center">{text || '-'}</div>
            )
        },
        {
            title: 'Action',
            key: 'action',
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
