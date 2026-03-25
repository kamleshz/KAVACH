import React, { useMemo, useState, useEffect } from 'react';
import { Table, Modal, Upload } from 'antd';
import { FaSave } from 'react-icons/fa';
import { PlusOutlined } from '@ant-design/icons';
import useSkuCompliance from '../../hooks/useSkuCompliance';
import { POLYMER_TYPES } from '../../constants/complianceConstants';

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const MarkingLabeling = ({ clientId, API_URL, readOnly = false, isProducer = false, productRows = [], componentRows = [], isManagerRemarksReadOnly = false }) => {
    // Preview state for file uploads
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [openCards, setOpenCards] = useState(new Set());

    const {
        skuComplianceData,
        setSkuComplianceData,
        skuSearchText,
        setSkuSearchText,
        skuStatusFilter,
        setSkuStatusFilter,
        skuPagination,
        setSkuPagination,
        handleSkuComplianceChange,
        handleSkuStatusChange,
        handleSkuPageChange,
        handleSkuPageSizeChange,
        handleSaveSkuCompliance: saveSkuRow,
        fetchSkuComplianceData
    } = useSkuCompliance(clientId, isProducer, productRows, componentRows);

    useEffect(() => {
        if (clientId) {
            fetchSkuComplianceData();
        }
    }, [clientId, fetchSkuComplianceData]);



    const handleCancelPreview = () => setPreviewOpen(false);

    const resolveUrl = (src) => {
        if (!src) return '';
        if (src.startsWith('http://') || src.startsWith('https://')) return src;
        try {
            return API_URL ? new URL(src, API_URL).toString() : src;
        } catch {
            return src;
        }
    };

    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
        setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
    };

    const skuComplianceColumns = [
        {
            title: 'S.No.',
            key: 'sno',
            width: 60,
            fixed: 'left',
            className: 'bg-gray-50',
            render: (_, __, index) => (
                <div className="text-center font-semibold text-gray-600 text-xs">
                    {(skuPagination.current - 1) * skuPagination.pageSize + index + 1}
                </div>
            )
        },
        { 
            title: isProducer ? 'COMPONENT CODE' : 'SKU CODE', 
            dataIndex: 'skuCode', 
            key: 'skuCode', 
            width: 130,
            fixed: 'left',
            className: 'bg-white',
            render: (text) => (
                readOnly ? (
                    <span className="text-xs text-gray-700 font-medium">{text}</span>
                ) : (
                    <input 
                        type="text"
                        value={text} 
                        readOnly
                        className="w-full border border-gray-200 rounded text-xs p-1 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                    />
                )
            ) 
        },
        { 
            title: isProducer ? 'COMPONENT DESCRIPTION' : 'SKU DESCRIPTION', 
            dataIndex: 'skuDescription', 
            key: 'skuDescription', 
            width: 220, 
            render: (text) => (
                readOnly ? (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">{text}</div>
                ) : (
                    <textarea 
                        value={text} 
                        readOnly
                        className="w-full border border-gray-200 rounded text-xs p-1 bg-gray-100 text-gray-600 focus:outline-none min-h-[32px] cursor-not-allowed"
                    />
                )
            ) 
        },
        !isProducer && { 
            title: 'SKU UOM', 
            dataIndex: 'skuUm', 
            key: 'skuUm', 
            width: 100, 
            render: (text) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text}</span>
                ) : (
                    <input 
                        type="text"
                        value={text} 
                        readOnly
                        className="w-full border border-gray-200 rounded text-xs p-1 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                    />
                )
            ) 
        },
        { 
            title: isProducer ? 'COMPONENT IMAGE' : 'PRODUCT IMAGE', 
            dataIndex: 'productImage', 
            key: 'productImage', 
            width: 150, 
            render: (value) => {
                 const src = value;
                 if (!src) return <span className="text-gray-400 text-xs italic">No Image</span>;
                 
                 const handleView = () => {
                     const url = src.startsWith('http') ? src : (API_URL ? new URL(src, API_URL).toString() : src);
                     window.open(url, '_blank');
                 };
    
                 let imageUrl = src;
                 try {
                    imageUrl = (src.startsWith('http://') || src.startsWith('https://'))
                             ? src
                             : (API_URL ? new URL(src, API_URL).toString() : src);
                 } catch {
                    imageUrl = src;
                 }
    
                 return (
                     <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm flex items-center justify-center relative group">
                           <img 
                               src={imageUrl} 
                               alt="Product" 
                               className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                               onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=Err'; }}
                           />
                         </div>
                         <button
                             type="button"
                             onClick={handleView}
                             className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                         >
                             View
                         </button>
                     </div>
                 );
            }
        },
        { 
            title: 'NAME OF BRAND OWNER', 
            dataIndex: 'brandOwner', 
            key: 'brandOwner', 
            width: 150, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'brandOwner', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        { 
            title: 'EPR CERTIFICATE NUMBER (BRAND OWNER)', 
            dataIndex: 'eprCertBrandOwner', 
            key: 'eprCertBrandOwner', 
            width: 200, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'eprCertBrandOwner', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        { 
            title: 'EPR CERTIFICATE NUMBER (PRODUCER)/(IMPORTER)', 
            dataIndex: 'eprCertProducer', 
            key: 'eprCertProducer', 
            width: 220, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'eprCertProducer', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        { 
            title: 'THICKNESS MENTIONED', 
            dataIndex: 'thicknessMentioned', 
            key: 'thicknessMentioned', 
            width: 180, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'thicknessMentioned', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        { 
            title: 'POLYMER USED', 
            dataIndex: 'polymerUsed', 
            key: 'polymerUsed', 
            width: 150, 
            render: (value) => {
                const rawPolymers = (Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []))
                    .flatMap((item) =>
                        (item ?? '')
                            .toString()
                            .split(',')
                            .map((part) => part.trim())
                            .filter(Boolean)
                    );

                const polymers = rawPolymers.reduce((acc, curr) => {
                    const prev = acc[acc.length - 1];
                    if (
                        prev &&
                        !/\(\d+\)/.test(prev) &&
                        /^paper$/i.test(prev.trim()) &&
                        /^plastic\b/i.test(curr.trim()) &&
                        /\(\d+\)/.test(curr)
                    ) {
                        acc[acc.length - 1] = `${prev.trim()}, ${curr.trim()}`;
                        return acc;
                    }
                    acc.push(curr);
                    return acc;
                }, []);

                if (polymers.length === 0) return <span className="text-gray-400 text-sm">—</span>;

                return (
                    <div className="flex flex-col gap-0.5 items-start">
                        {polymers.map((poly, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {poly}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        { 
            title: 'RECYCLED CONTENT (%)', 
            dataIndex: 'recycledPercent', 
            key: 'recycledPercent', 
            width: 220, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'recycledPercent', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        { 
            title: 'REGISTRATION NO. OF COMPOSTABLE/BIODEGRADABLE PLASTIC DECLARED MISSING', 
            dataIndex: 'compostableRegNo', 
            key: 'compostableRegNo', 
            width: 250, 
            render: (text, record) => (
                readOnly ? (
                    <span className="text-xs text-gray-700">{text || '-'}</span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'compostableRegNo', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                    </select>
                )
            ) 
        },
        {
            title: 'UPLOAD PHOTOS',
            dataIndex: 'markingImage',
            key: 'markingImage',
            width: 140,
            render: (fileList, record) => (
                <div style={{ width: '120px', margin: '0 auto' }}>
                    <Upload
                        listType="picture-card"
                        fileList={fileList || []}
                        onPreview={handlePreview}
                        onChange={({ fileList: newFileList }) => {
                            if (readOnly) return;
                            const processedList = newFileList.map(f => {
                                 if (f.response && f.response.url) return { ...f, url: f.response.url };
                                 return f;
                            });
                             handleSkuComplianceChange(record.key, 'markingImage', processedList);
                        }}
                        showUploadList={{ showRemoveIcon: !readOnly }}
                        beforeUpload={() => false}
                        disabled={readOnly}
                        className="custom-upload-grid"
                    >
                         {fileList?.length >= 5 || readOnly ? null : (
                            <div className="flex flex-col items-center justify-center">
                                <PlusOutlined className="text-gray-400 text-sm" />
                                <div className="text-[10px] text-gray-500 mt-0.5">Upload</div>
                            </div>
                         )}
                    </Upload>
                    <style>{`
                        .custom-upload-grid .ant-upload-list-picture-card-container,
                        .custom-upload-grid .ant-upload-select-picture-card {
                            width: 48px !important;
                            height: 48px !important;
                            margin: 4px !important;
                            float: left !important;
                        }
                        
                        /* Ensure the container clears floats to maintain height */
                        .custom-upload-grid::after {
                            content: "";
                            display: table;
                            clear: both;
                        }

                        /* Specific fix for the item itself */
                        .custom-upload-grid .ant-upload-list-item {
                            padding: 2px !important;
                            width: 100% !important;
                            height: 100% !important;
                        }

                        .custom-upload-grid .ant-upload-list-item-thumbnail img {
                            object-fit: cover !important;
                        }
                    `}</style>
                </div>
            )
        },
        { 
            title: 'Auditor Remarks for Marking and Labeling', 
            dataIndex: 'remarks', 
            key: 'remarks', 
            width: 250, 
            render: (_, record) => {
                const remarks = Array.isArray(record.remarks) ? record.remarks : (record.remarks ? [record.remarks] : []);
                const val = remarks.join('\n');
                return (
                    (readOnly || isManagerRemarksReadOnly) ? (
                        <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">{val || '-'}</div>
                    ) : (
                        <textarea
                            className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 min-h-[50px]"
                            value={val}
                            onChange={(e) => handleSkuComplianceChange(record.key, 'remarks', e.target.value.split('\n'))}
                            placeholder="Auditor remarks..."
                            onClick={(e) => e.stopPropagation()}
                        />
                    )
                );
            }
        },
        { 
            title: 'Compliance Remarks', 
            dataIndex: 'complianceRemarks', 
            key: 'complianceRemarks', 
            width: 250, 
            render: (text) => {
                 const remarks = Array.isArray(text) ? text : (text ? [text] : []);
                 if (remarks.length === 0) return <span className="text-gray-400 text-xs">-</span>;
                 return (
                     <ul className="list-disc pl-4 m-0 text-xs text-gray-700">
                         {remarks.map((r, i) => (
                             <li key={i}>{r}</li>
                         ))}
                     </ul>
                 );
            }
        },
        { 
            title: 'Marking and Labeling Compliance Status', 
            dataIndex: 'complianceStatus', 
            key: 'complianceStatus', 
            width: 200, 
            render: (text, record) => (
                readOnly ? (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        text === 'Compliant' ? 'bg-green-100 text-green-700' :
                        text === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {text || '-'}
                    </span>
                ) : (
                    <select
                        value={text}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'complianceStatus', e.target.value)}
                        className="w-full border border-gray-300 rounded text-xs p-1 focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                        <option value="">Select</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                )
            ) 
        },
        {
            title: 'ACTION',
            key: 'action',
            fixed: 'right',
            width: 80,
            className: 'bg-gray-50',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button 
                        type="primary"
                        icon={<FaSave />} 
                        onClick={() => saveSkuRow(record)}
                        className="bg-green-600 hover:bg-green-700 border-green-600 h-8 w-8 flex items-center justify-center rounded-md shadow-sm"
                        title="Save Row"
                    />
                </div>
            )
        }
    ].filter(Boolean);

    const skuTableDataSource = useMemo(() => {
        let data = skuComplianceData || [];

        // For Brand Owner (isProducer=false), ensure unique SKUs
        if (!isProducer) {
            const uniqueSkus = new Map();
            data.forEach(item => {
                if (item.skuCode && !uniqueSkus.has(item.skuCode)) {
                    uniqueSkus.set(item.skuCode, item);
                }
            });
            data = Array.from(uniqueSkus.values());
        }

        if (skuSearchText) {
            const lower = skuSearchText.toLowerCase();
            data = data.filter(item => 
                (item.skuCode && item.skuCode.toLowerCase().includes(lower)) ||
                (item.skuDescription && item.skuDescription.toLowerCase().includes(lower))
            );
        }
        if (skuStatusFilter && skuStatusFilter !== 'all') {
            data = data.filter(item => item.complianceStatus === skuStatusFilter);
        }
        return data;
    }, [skuComplianceData, skuSearchText, skuStatusFilter, isProducer]);

    // Filter out columns if readOnly
    const visibleColumns = useMemo(() => {
        if (!readOnly) return skuComplianceColumns;
        return skuComplianceColumns.filter(col => col.key !== 'action');
    }, [readOnly, skuComplianceColumns]);

    const pagedSkuCards = useMemo(() => {
        const start = (skuPagination.current - 1) * skuPagination.pageSize;
        const end = start + skuPagination.pageSize;
        return skuTableDataSource.slice(start, end);
    }, [skuTableDataSource, skuPagination.current, skuPagination.pageSize]);

    return (
        <div className="p-4 bg-white rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                     <input 
                        type="text"
                        placeholder="Search SKU..." 
                        value={skuSearchText} 
                        onChange={e => setSkuSearchText(e.target.value)}
                        className="w-64 border border-gray-300 rounded text-sm p-2 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                    <select
                        value={skuStatusFilter}
                        onChange={(e) => setSkuStatusFilter(e.target.value)}
                        className="w-40 border border-gray-300 rounded text-sm p-2 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                </div>
            </div>

            {readOnly ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {pagedSkuCards.map((record, idx) => {
                        const key = record.key || record._id || record.skuCode || `sku-${idx}`;
                        const isOpen = openCards.has(key);
                        const status = record.complianceStatus || 'Pending';
                        const statusClass =
                            status === 'Compliant'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : status === 'Non-Compliant'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200';

                        const toggle = () => {
                            setOpenCards((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                            });
                        };

                        const productImageUrl = resolveUrl(record.productImage || '');
                        const markingImages = Array.isArray(record.markingImage) ? record.markingImage : [];
                        const auditorRemarks = Array.isArray(record.remarks) ? record.remarks : (record.remarks ? [record.remarks] : []);
                        const complianceRemarks = Array.isArray(record.complianceRemarks)
                            ? record.complianceRemarks
                            : (record.complianceRemarks ? [record.complianceRemarks] : []);

                        return (
                            <div key={key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="h-1 bg-blue-500" />
                                <div className="flex items-start justify-between p-4 bg-gray-50/50 border-b border-gray-100 gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {productImageUrl ? (
                                                <img
                                                    src={productImageUrl}
                                                    alt="Product"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/48?text=No+Img'; }}
                                                />
                                            ) : (
                                                <div className="text-[10px] text-gray-400 text-center leading-tight px-2">No Image</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
                                                    {record.skuCode || '—'}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusClass}`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
                                                {record.skuDescription || '—'}
                                            </div>
                                            {status === 'Non-Compliant' && (
                                                <div className="mt-1 text-[11px] text-gray-500">
                                                    Marking and labeling is not correct
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={toggle}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-900 flex-shrink-0"
                                    >
                                        {isOpen ? 'Collapse' : 'View Details'}
                                    </button>
                                </div>

                                <div className="p-4 space-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                            <span>👤</span>
                                            BRAND & EPR DETAILS
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                            {!isProducer && (
                                                <>
                                                    <div className="text-gray-500 font-bold">SKU UOM</div>
                                                    <div className="text-gray-900 font-semibold">{record.skuUm || '—'}</div>
                                                </>
                                            )}
                                            <div className="text-gray-500 font-bold">Brand Owner</div>
                                            <div className="text-gray-900 font-semibold">{record.brandOwner || '—'}</div>
                                            <div className="text-gray-500 font-bold">EPR Cert (Brand Owner)</div>
                                            <div className="text-gray-900 font-semibold">{record.eprCertBrandOwner || '—'}</div>
                                            <div className="text-gray-500 font-bold">EPR Cert (Producer)</div>
                                            <div className="text-gray-900 font-semibold">{record.eprCertProducer || '—'}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                            <span>♻️</span>
                                            POLYMER DETAILS
                                        </div>
                                        <div className="mt-2 text-xs">
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
                                                <div className="text-gray-500 font-bold">Thickness Mentioned</div>
                                                <div className="text-gray-900 font-semibold">{record.thicknessMentioned || '—'}</div>
                                                <div className="text-gray-500 font-bold">Recycled Content (%)</div>
                                                <div className="text-gray-900 font-semibold">{record.recycledPercent || '—'}</div>
                                                <div className="text-gray-500 font-bold">Compostable Reg. No</div>
                                                <div className="text-gray-900 font-semibold">{record.compostableRegNo || '—'}</div>
                                            </div>
                                            <div className="text-gray-500 font-bold mb-1">Polymer Used</div>
                                            <div>
                                                {(() => {
                                                    const value = record.polymerUsed;
                                                    const rawPolymers = (Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []))
                                                        .flatMap((item) =>
                                                            (item ?? '')
                                                                .toString()
                                                                .split(',')
                                                                .map((part) => part.trim())
                                                                .filter(Boolean)
                                                        );
                                                    const polymers = rawPolymers.reduce((acc, curr) => {
                                                        const prev = acc[acc.length - 1];
                                                        if (
                                                            prev &&
                                                            !/\(\d+\)/.test(prev) &&
                                                            /^paper$/i.test(prev.trim()) &&
                                                            /^plastic\b/i.test(curr.trim()) &&
                                                            /\(\d+\)/.test(curr)
                                                        ) {
                                                            acc[acc.length - 1] = `${prev.trim()}, ${curr.trim()}`;
                                                            return acc;
                                                        }
                                                        acc.push(curr);
                                                        return acc;
                                                    }, []);
                                                    if (polymers.length === 0) {
                                                        return <span className="text-gray-400 text-xs">—</span>;
                                                    }
                                                    return (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {polymers.map((poly, pidx) => (
                                                                <span key={pidx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    {poly}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                            <span>📷</span>
                                            EVIDENCE / IMAGES
                                        </div>
                                        {markingImages.length ? (
                                            <div className="mt-2 grid grid-cols-6 gap-2">
                                                {markingImages.slice(0, 12).map((file, fidx) => {
                                                    const url = resolveUrl(file.url || file.thumbUrl || file.preview || '');
                                                    if (!url) return null;
                                                    return (
                                                        <button
                                                            key={fidx}
                                                            type="button"
                                                            onClick={() => {
                                                                setPreviewImage(url);
                                                                setPreviewTitle(file.name || `Image ${fidx + 1}`);
                                                                setPreviewOpen(true);
                                                            }}
                                                            className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden bg-white"
                                                        >
                                                            <img src={url} alt="Marking" className="h-full w-full object-cover" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="mt-1 text-xs text-gray-400">—</div>
                                        )}
                                    </div>
                                </div>

                                <div className={`border-t border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <div className="text-gray-500 font-bold text-xs">Auditor Remarks</div>
                                            <div className="mt-1 text-xs text-gray-900 font-semibold whitespace-pre-wrap">{auditorRemarks.join('\n') || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 font-bold text-xs">Compliance Remarks</div>
                                            {complianceRemarks.length ? (
                                                <ul className="mt-1 list-disc pl-4 text-xs text-gray-900 font-semibold">
                                                    {complianceRemarks.map((r, ridx) => (
                                                        <li key={ridx}>{r}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="mt-1 text-xs text-gray-400">—</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Table 
                    columns={visibleColumns}
                    dataSource={skuTableDataSource}
                    pagination={{
                        current: skuPagination.current,
                        pageSize: skuPagination.pageSize,
                        total: skuTableDataSource.length,
                        onChange: (page, pageSize) => handleSkuPageChange(page),
                        showSizeChanger: true,
                        onShowSizeChange: (current, size) => handleSkuPageSizeChange(size)
                    }}
                    scroll={{ x: 2000 }}
                    rowKey="key"
                    bordered
                    size="small"
                />
            )}

            {readOnly ? (
                <div className="flex items-center justify-between pt-4">
                    <div className="text-xs text-gray-500">
                        Showing {(skuPagination.current - 1) * skuPagination.pageSize + 1}-{Math.min(skuPagination.current * skuPagination.pageSize, skuTableDataSource.length)} of {skuTableDataSource.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSkuPageChange(Math.max(1, skuPagination.current - 1))}
                            disabled={skuPagination.current <= 1}
                            className="px-3 py-1.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSkuPageChange(Math.min(Math.ceil(skuTableDataSource.length / skuPagination.pageSize) || 1, skuPagination.current + 1))}
                            disabled={skuPagination.current >= (Math.ceil(skuTableDataSource.length / skuPagination.pageSize) || 1)}
                            className="px-3 py-1.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50"
                        >
                            Next
                        </button>
                        <select
                            value={skuPagination.pageSize}
                            onChange={(e) => handleSkuPageSizeChange(Number(e.target.value))}
                            className="px-2 py-1.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 bg-white"
                        >
                            {[5, 10, 20, 50].map((s) => (
                                <option key={s} value={s}>{s}/page</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : null}

            <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancelPreview}>
                <img alt="example" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </div>
    );
};

export default MarkingLabeling;
