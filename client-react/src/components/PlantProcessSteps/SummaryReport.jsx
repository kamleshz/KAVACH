import React, { useMemo, useState } from 'react';
import { Table, Image, Tabs } from 'antd';
import { UploadOutlined, CheckOutlined, LoadingOutlined, SaveOutlined } from '@ant-design/icons';
import MarkingLabeling from './MarkingLabeling';

const SummaryReport = ({
    clientId,
    handleNext,
    isSaving,
    productRows = [],
    monthlyRows = [],
    resolveUrl,
    supplierRows = [],
    componentRows = [],
    handleSummaryChange,
    handleComponentSummaryChange,
    handleSummaryFileChange,
    handleComponentSummaryFileChange,
    handleComponentSave,
    savingRow,
    onlyTable = false
}) => {
    
    // Process and aggregate data
    const tableData = useMemo(() => {
        // 1. Group productRows by SKU Code
        const groupedBySku = new Map();

        productRows.forEach(product => {
            const skuCode = (product.skuCode || '').trim();
            if (!skuCode) return; // Skip invalid rows

            if (!groupedBySku.has(skuCode)) {
                groupedBySku.set(skuCode, {
                    skuCode,
                    skuDescription: product.skuDescription || '-',
                    industryCategory: product.industryCategory || '-',
                    productImage: product.productImage,
                    componentCodes: new Set(),
                    products: [] // Store original product rows for this SKU
                });
            }

            const group = groupedBySku.get(skuCode);
            group.products.push(product);
            
            // Add component code to the set for this SKU
            if (product.componentCode) {
                group.componentCodes.add((product.componentCode || '').trim());
            }
        });

        // 2. Aggregate monthly data for each SKU group
        return Array.from(groupedBySku.values()).map((group, index) => {
            const { skuCode, skuDescription, industryCategory, productImage, componentCodes, products } = group;

            // Collect all related procurement records for this SKU to calculate totals
            const relatedProcurement = monthlyRows.filter(m => 
                componentCodes.has((m.componentCode || '').trim())
            );

            let details = [];
            
            // Iterate over each component in this SKU
            componentCodes.forEach(compCode => {
                // Find all matching monthly procurement records for this component
                const procurementRecords = monthlyRows.filter(m => 
                    (m.componentCode || '').trim() === compCode
                );

                if (procurementRecords.length > 0) {
                    // If procurement data exists, create a row for each record (e.g. per supplier)
                    const procDetails = procurementRecords.map((procurement, idx) => {
                        // Find matching static data
                        const componentRow = componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
                        const supplierRow = supplierRows.find(s => 
                            (s.componentCode || '').trim() === compCode && 
                            (s.supplierName || '').trim().toLowerCase() === (procurement.supplierName || '').trim().toLowerCase()
                        ) || {};
                        
                        const productRow = products.find(p => (p.componentCode || '').trim() === compCode) || {};

                        return {
                            key: `${skuCode}-${compCode}-${idx}`,
                            skuCode: skuCode,
                            componentCode: compCode,
                            componentImage: productRow.componentImage,
                            componentDescription: procurement.componentDescription || componentRow.componentDescription || productRow.componentDescription || '-',
                            supplierName: procurement.supplierName || '-',
                            supplierStatus: supplierRow.supplierStatus || '-',
                            eprCertificateNumber: supplierRow.eprCertificateNumber || '-',
                            polymerType: procurement.polymerType || componentRow.polymerType || '-',
                            componentPolymer: procurement.componentPolymer || componentRow.componentPolymer || '-',
                            category: procurement.category || componentRow.category || '-',
                            categoryIIType: componentRow.categoryIIType || '-',
                            containerCapacity: componentRow.containerCapacity || '-',
                            layerType: componentRow.layerType || '-',
                            thickness: componentRow.thickness || '-',
                            monthlyPurchaseMt: procurement.monthlyPurchaseMt || '0',
                            recycledPercent: procurement.recycledPercent || '0',
                            recycledQty: procurement.recycledQty || '0',
                            recycledAmount: procurement.recycledQrtAmount || '0',
                            virginQty: procurement.virginQty || '0',
                            virginAmount: procurement.virginQtyAmount || '0',
                            componentComplianceStatus: productRow.componentComplianceStatus || productRow.complianceStatus || '',
                            auditorRemarks: productRow.auditorRemarks || '',
                            additionalDocument: productRow.additionalDocument,
                            managerRemarks: productRow.managerRemarks || ''
                        };
                    });
                    details.push(...procDetails);
                } else {
                    // If NO procurement data, create a stub row for the component
                    const componentRow = componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
                    const productRow = products.find(p => (p.componentCode || '').trim() === compCode) || {};
                    // Try to find any supplier info if available in supplierRows (even if no monthly data)
                    // Or just list it without supplier
                    
                    details.push({
                        key: `${skuCode}-${compCode}-stub`,
                        skuCode: skuCode,
                        componentCode: compCode,
                        componentImage: productRow.componentImage,
                        componentDescription: componentRow.componentDescription || productRow.componentDescription || '-',
                        supplierName: '-',
                        supplierStatus: '-',
                        eprCertificateNumber: '-',
                        polymerType: componentRow.polymerType || '-',
                        componentPolymer: componentRow.componentPolymer || '-',
                        category: componentRow.category || '-',
                        categoryIIType: componentRow.categoryIIType || '-',
                        containerCapacity: componentRow.containerCapacity || '-',
                        layerType: componentRow.layerType || '-',
                        thickness: componentRow.thickness || '-',
                        monthlyPurchaseMt: '0',
                        recycledPercent: '0',
                        recycledQty: '0',
                        recycledAmount: '0',
                        virginQty: '0',
                        virginAmount: '0',
                        componentComplianceStatus: productRow.componentComplianceStatus || productRow.complianceStatus || '',
                        auditorRemarks: productRow.auditorRemarks || '',
                        additionalDocument: productRow.additionalDocument,
                        managerRemarks: productRow.managerRemarks || ''
                    });
                }
            });

            // Aggregate values
            const totalRecycledQty = relatedProcurement.reduce((sum, item) => sum + (parseFloat(item.recycledQty) || 0), 0);
            const totalRecycledAmount = relatedProcurement.reduce((sum, item) => sum + (parseFloat(item.recycledQrtAmount) || 0), 0);
            const totalVirginQty = relatedProcurement.reduce((sum, item) => sum + (parseFloat(item.virginQty) || 0), 0);
            const totalVirginAmount = relatedProcurement.reduce((sum, item) => sum + (parseFloat(item.virginQtyAmount) || 0), 0);
            const totalPurchaseMt = relatedProcurement.reduce((sum, item) => sum + (parseFloat(item.monthlyPurchaseMt) || 0), 0);

            // Calculate weighted average Recycled % or derived %
            const recycledPercent = totalPurchaseMt > 0 
                ? ((totalRecycledQty / totalPurchaseMt) * 100).toFixed(2) 
                : '0.00';

            const firstProduct = products[0] || {};

            return {
                key: index,
                skuCode,
                skuDescription,
                industryCategory,
                productImage,
                recycledQty: totalRecycledQty.toFixed(3),
                recycledAmount: totalRecycledAmount.toFixed(2),
                recycledPercent: `${recycledPercent}%`,
                virginQty: totalVirginQty.toFixed(3),
                virginAmount: totalVirginAmount.toFixed(2),
                details: details, // Pass details for nested table
                productComplianceStatus: firstProduct.productComplianceStatus || '',
                // productAuditorRemarks removed as per request, using computedRemarks instead
                computedRemarks: details.map(d => d.auditorRemarks).filter(Boolean).join('\n'), 
                clientRemarks: firstProduct.clientRemarks || '',
                additionalDocument: firstProduct.additionalDocument,
                managerRemarks: firstProduct.managerRemarks || ''
            };
        });
    }, [productRows, monthlyRows, supplierRows, componentRows]);

    const columns = [
        {
            title: 'SKU Code',
            dataIndex: 'skuCode',
            key: 'skuCode',
            width: 120,
            fixed: 'left',
            render: (text) => <span className="font-semibold text-gray-700">{text}</span>
        },
        {
            title: 'SKU Description',
            dataIndex: 'skuDescription',
            key: 'skuDescription',
            width: 200,
            render: (text) => <span className="text-gray-600 text-xs">{text}</span>
        },
        {
            title: 'Industry Category',
            dataIndex: 'industryCategory',
            key: 'industryCategory',
            width: 180,
            render: (text) => <span className="text-gray-600 text-xs">{text}</span>
        },
        {
            title: 'Product Image',
            dataIndex: 'productImage',
            key: 'productImage',
            width: 100,
            align: 'center',
            render: (img) => (
                img ? (
                    <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                        <Image 
                            src={typeof img === 'string' ? resolveUrl(img) : URL.createObjectURL(img)} 
                            alt="Product" 
                            className="w-full h-full object-cover"
                            onError={(e) => {e.target.style.display='none'}}
                            preview={{
                                src: typeof img === 'string' ? resolveUrl(img) : URL.createObjectURL(img)
                            }}
                        />
                    </div>
                ) : <span className="text-gray-300">-</span>
            )
        },
        {
            title: 'Recycled Qty',
            dataIndex: 'recycledQty',
            key: 'recycledQty',
            width: 120,
            align: 'right',
            render: (val) => <span className="font-medium text-green-700">{val}</span>
        },

        {
            title: 'Product Compliance Status',
            dataIndex: 'productComplianceStatus',
            key: 'productComplianceStatus',
            width: 150,
            render: (val, record) => (
                onlyTable ? (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        val === 'Compliant' ? 'bg-green-100 text-green-700' :
                        val === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {val || '-'}
                    </span>
                ) : (
                    <select
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                        value={val}
                        onChange={(e) => handleSummaryChange && handleSummaryChange(record.skuCode, 'productComplianceStatus', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Select</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                )
            )
        },
        {
            title: 'Remarks',
            dataIndex: 'computedRemarks',
            key: 'computedRemarks',
            width: 200,
            render: (val, record) => (
                onlyTable ? (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
                        {val || '-'}
                    </div>
                ) : (
                    <textarea
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 min-h-[40px] bg-gray-50"
                        value={val}
                        readOnly
                        placeholder="Component remarks will appear here..."
                        onClick={(e) => e.stopPropagation()}
                    />
                )
            )
        },
        {
            title: 'Additional Document',
            dataIndex: 'additionalDocument',
            key: 'additionalDocument',
            width: 120,
            align: 'center',
            render: (doc, record) => (
                <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
                    {doc ? (
                        <div className="flex flex-col items-center gap-1">
                            <button 
                                onClick={() => {
                                    const url = typeof doc === 'string' ? resolveUrl(doc) : URL.createObjectURL(doc);
                                    window.open(url, '_blank');
                                }}
                                className="text-[10px] font-bold text-primary-600 hover:text-primary-800 underline"
                            >
                                View
                            </button>
                            <label className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700">
                                Change
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        if (e.target.files[0] && handleSummaryFileChange) {
                                            handleSummaryFileChange(record.skuCode, e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-20 py-1 border border-dashed border-gray-300 rounded hover:bg-gray-50 transition-all bg-white">
                            <UploadOutlined className="text-gray-400 mb-0.5" />
                            <span className="text-[9px] text-gray-500">Upload</span>
                            <input  
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                    if (e.target.files[0] && handleSummaryFileChange) {
                                        handleSummaryFileChange(record.skuCode, e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    )}
                </div>
            )
        },
        {
            title: 'Manager Remarks',
            dataIndex: 'managerRemarks',
            key: 'managerRemarks',
            width: 200,
            render: (val, record) => (
                onlyTable ? (
                    <textarea
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 min-h-[40px] bg-white"
                        value={val}
                        onChange={(e) => handleSummaryChange && handleSummaryChange(record.skuCode, 'managerRemarks', e.target.value)}
                        placeholder="Manager remarks..."
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
                        {val || '-'}
                    </div>
                )
            )
        }
    ];

    // Columns for the nested detailed table
    const detailColumns = [
        { title: 'Component Code', dataIndex: 'componentCode', key: 'componentCode', width: 120 },
        {
            title: 'Component Image',
            dataIndex: 'componentImage',
            key: 'componentImage',
            width: 100,
            align: 'center',
            render: (img) => (
                img ? (
                    <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                        <Image 
                            src={typeof img === 'string' ? resolveUrl(img) : URL.createObjectURL(img)} 
                            alt="Component" 
                            className="w-full h-full object-cover"
                            onError={(e) => {e.target.style.display='none'}}
                            preview={{
                                src: typeof img === 'string' ? resolveUrl(img) : URL.createObjectURL(img)
                            }}
                        />
                    </div>
                ) : <span className="text-gray-300">-</span>
            )
        },
        { title: 'Component Description', dataIndex: 'componentDescription', key: 'componentDescription', width: 150 },
        { title: 'Name of Supplier', dataIndex: 'supplierName', key: 'supplierName', width: 150 },
        { title: 'Supplier Status', dataIndex: 'supplierStatus', key: 'supplierStatus', width: 120 },
        { title: 'EPR Cert. No', dataIndex: 'eprCertificateNumber', key: 'eprCertificateNumber', width: 120 },
        { title: 'Polymer Type', dataIndex: 'polymerType', key: 'polymerType', width: 100 },
        { title: 'Component Polymer', dataIndex: 'componentPolymer', key: 'componentPolymer', width: 120 },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 100 },
        { title: 'Category II Type', dataIndex: 'categoryIIType', key: 'categoryIIType', width: 120 },
        { title: 'Container Capacity', dataIndex: 'containerCapacity', key: 'containerCapacity', width: 120 },
        { title: 'Layer Type', dataIndex: 'layerType', key: 'layerType', width: 120 }, // Monolayer/Multilayer
        { title: 'Thickness', dataIndex: 'thickness', key: 'thickness', width: 100 },
        { title: 'Monthly purchase MT', dataIndex: 'monthlyPurchaseMt', key: 'monthlyPurchaseMt', width: 150, align: 'right' },

        { title: 'Recycled QTY', dataIndex: 'recycledQty', key: 'recycledQty', width: 120, align: 'right' },
        {
            title: 'Component Compliance Status',
            dataIndex: 'componentComplianceStatus',
            key: 'componentComplianceStatus',
            width: 150,
            render: (val, record) => (
                onlyTable ? (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        val === 'Compliant' ? 'bg-green-100 text-green-700' :
                        val === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
                        val === 'Partial Compliant' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {val || '-'}
                    </span>
                ) : (
                    <select
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                        value={val}
                        onChange={(e) => handleComponentSummaryChange && handleComponentSummaryChange(record.skuCode, record.componentCode, 'componentComplianceStatus', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Select</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Partial Compliant">Partial Compliant</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                )
            )
        },
        {
            title: 'Auditor Remarks',
            dataIndex: 'auditorRemarks',
            key: 'auditorRemarks',
            width: 200,
            render: (val, record) => (
                onlyTable ? (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
                        {val || '-'}
                    </div>
                ) : (
                    <textarea
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 min-h-[40px]"
                        value={val}
                        onChange={(e) => handleComponentSummaryChange && handleComponentSummaryChange(record.skuCode, record.componentCode, 'auditorRemarks', e.target.value)}
                        placeholder="Auditor remarks..."
                        onClick={(e) => e.stopPropagation()}
                    />
                )
            )
        },
        {
            title: 'Additional Document',
            dataIndex: 'additionalDocument',
            key: 'additionalDocument',
            width: 120,
            align: 'center',
            render: (doc, record) => (
                <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
                    {doc ? (
                        <div className="flex flex-col items-center gap-1">
                            <button 
                                onClick={() => {
                                    const url = typeof doc === 'string' ? resolveUrl(doc) : URL.createObjectURL(doc);
                                    window.open(url, '_blank');
                                }}
                                className="text-[10px] font-bold text-primary-600 hover:text-primary-800 underline"
                            >
                                View
                            </button>
                            <label className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700">
                                Change
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        if (e.target.files[0] && handleComponentSummaryFileChange) {
                                            handleComponentSummaryFileChange(record.skuCode, record.componentCode, e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-20 py-1 border border-dashed border-gray-300 rounded hover:bg-gray-50 transition-all bg-white">
                            <UploadOutlined className="text-gray-400 mb-0.5" />
                            <span className="text-[9px] text-gray-500">Upload</span>
                            <input  
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                    if (e.target.files[0] && handleComponentSummaryFileChange) {
                                        handleComponentSummaryFileChange(record.skuCode, record.componentCode, e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    )}
                </div>
            )
        },
        {
            title: 'Manager Remarks',
            dataIndex: 'managerRemarks',
            key: 'managerRemarks',
            width: 200,
            render: (val, record) => (
                onlyTable ? (
                    <textarea
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 min-h-[40px] bg-white"
                        value={val}
                        onChange={(e) => handleComponentSummaryChange && handleComponentSummaryChange(record.skuCode, record.componentCode, 'managerRemarks', e.target.value)}
                        placeholder="Manager remarks..."
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
                        {val || '-'}
                    </div>
                )
            )
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            align: 'center',
            fixed: 'right',
            render: (_, record) => {
                const isThisRowSaving = savingRow !== null && 
                    productRows[savingRow] &&
                    (productRows[savingRow].skuCode || '').trim() === record.skuCode &&
                    (productRows[savingRow].componentCode || '').trim() === record.componentCode;

                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (handleComponentSave && !isThisRowSaving) {
                                handleComponentSave(record.skuCode, record.componentCode);
                            }
                        }}
                        disabled={isThisRowSaving}
                        className={`p-1.5 rounded-full transition-colors ${
                            isThisRowSaving 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                        title="Save Changes"
                    >
                        {isThisRowSaving ? <LoadingOutlined spin /> : <SaveOutlined />}
                    </button>
                );
            }
        }
    ];

    const expandedRowRender = (record) => {
        return (
            <Table
                columns={detailColumns}
                dataSource={record.details}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                bordered
                className="bg-gray-50"
            />
        );
    };

    const summaryTableContent = (
        <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table 
                    columns={columns} 
                    dataSource={tableData} 
                    pagination={false}
                    size="middle"
                    scroll={{ x: 1200 }}
                    rowClassName="hover:bg-gray-50"
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.details && record.details.length > 0,
                    }}
                />
            </div>
            
            {tableData.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No product compliance data available.
                </div>
            )}
        </>
    );

    const tabItems = [
        {
            key: 'summary',
            label: 'Summary Report',
            children: summaryTableContent
        },
        {
            key: 'marking',
            label: 'Marking and Labeling',
            children: (
                <MarkingLabeling clientId={clientId} API_URL={import.meta.env.VITE_API_URL} />
            )
        }
    ];

    if (onlyTable) {
        return (
            <>
                <style>{`
                    .summary-report-container {
                        font-family: 'Nunito', sans-serif !important;
                    }
                    .summary-report-container * {
                        font-family: 'Nunito', sans-serif !important;
                    }
                `}</style>
                <div className="summary-report-container">
                    {summaryTableContent}
                </div>
            </>
        );
    }

    return (
        <>
            <style>{`
                .summary-report-container {
                    font-family: 'Nunito', sans-serif !important;
                }
                .summary-report-container * {
                    font-family: 'Nunito', sans-serif !important;
                }
            `}</style>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 summary-report-container">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Summary Report</h2>
                        <p className="text-gray-500 text-sm mt-1">Review overall compliance and procurement summary</p>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isSaving ? <LoadingOutlined spin /> : null}
                        Finish <CheckOutlined />
                    </button>
                </div>

                <Tabs defaultActiveKey="summary" items={tabItems} />
            </div>
        </>
    );
};

export default SummaryReport;
