import React, { useMemo, useState, useEffect } from 'react';
import { Table, Input, Select, Button, ConfigProvider, Modal, Upload } from 'antd';
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

const MarkingLabeling = ({ clientId, API_URL }) => {
    // Preview state for file uploads
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

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
    } = useSkuCompliance(clientId);

    useEffect(() => {
        if (clientId) {
            fetchSkuComplianceData();
        }
    }, [clientId, fetchSkuComplianceData]);



    const handleCancelPreview = () => setPreviewOpen(false);

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
            title: 'SKU CODE', 
            dataIndex: 'skuCode', 
            key: 'skuCode', 
            width: 130,
            fixed: 'left',
            className: 'bg-white',
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={(e) => handleSkuComplianceChange(record.key, 'skuCode', e.target.value)}
                    className="text-xs" 
                />
            ) 
        },
        { 
            title: 'SKU DESCRIPTION', 
            dataIndex: 'skuDescription', 
            key: 'skuDescription', 
            width: 220, 
            render: (text, record) => (
                <Input.TextArea 
                    value={text} 
                    onChange={(e) => handleSkuComplianceChange(record.key, 'skuDescription', e.target.value)}
                    className="text-xs" 
                    autoSize={{ minRows: 1, maxRows: 3 }}
                />
            ) 
        },
        { 
            title: 'SKU UOM', 
            dataIndex: 'skuUm', 
            key: 'skuUm', 
            width: 100, 
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={(e) => handleSkuComplianceChange(record.key, 'skuUm', e.target.value)}
                    className="text-xs" 
                />
            ) 
        },
        { 
            title: 'PRODUCT IMAGE', 
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
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'brandOwner', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
            ) 
        },
        { 
            title: 'EPR CERTIFICATE NUMBER (BRAND OWNER)', 
            dataIndex: 'eprCertBrandOwner', 
            key: 'eprCertBrandOwner', 
            width: 200, 
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'eprCertBrandOwner', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
            ) 
        },
        { 
            title: 'EPR CERTIFICATE NUMBER (PRODUCER)/(IMPORTER)', 
            dataIndex: 'eprCertProducer', 
            key: 'eprCertProducer', 
            width: 220, 
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'eprCertProducer', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
            ) 
        },
        { 
            title: 'THICKNESS MENTIONED', 
            dataIndex: 'thicknessMentioned', 
            key: 'thicknessMentioned', 
            width: 180, 
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'thicknessMentioned', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
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
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'recycledPercent', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
            ) 
        },
        { 
            title: 'REGISTRATION NO. OF COMPOSTABLE/BIODEGRADABLE PLASTIC DECLARED MISSING', 
            dataIndex: 'compostableRegNo', 
            key: 'compostableRegNo', 
            width: 250, 
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'compostableRegNo', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Applicable', label: 'Not Applicable' }
                    ]}
                />
            ) 
        },
        {
            title: 'UPLOAD PHOTOS',
            dataIndex: 'markingImage',
            key: 'markingImage',
            width: 200,
            render: (fileList, record) => (
                <Upload
                    listType="picture-card"
                    fileList={fileList || []}
                    onPreview={handlePreview}
                    onChange={({ fileList: newFileList }) => {
                        // Map back to URLs or keep file objects for now. 
                        // useSkuCompliance likely handles the structure.
                        // We just pass the newFileList.
                        const processedList = newFileList.map(f => {
                             if (f.response && f.response.url) return { ...f, url: f.response.url };
                             return f;
                        });
                         handleSkuComplianceChange(record.key, 'markingImage', processedList);
                    }}
                    showUploadList={{ showRemoveIcon: true }}
                    disabled={false}
                    beforeUpload={() => false} // Manual upload management or let Upload middleware handle it? 
                    // Usually we need to handle upload logic. 
                    // But here I just enable it.
                >
                     {fileList?.length >= 5 ? null : (
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                        </div>
                     )}
                </Upload>
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
                    <Input.TextArea
                        className="text-xs"
                        value={val}
                        onChange={(e) => handleSkuComplianceChange(record.key, 'remarks', e.target.value.split('\n'))}
                        placeholder="Auditor remarks..."
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        onClick={(e) => e.stopPropagation()}
                    />
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
                <Select
                    value={text}
                    onChange={(val) => handleSkuComplianceChange(record.key, 'complianceStatus', val)}
                    className="w-full text-xs"
                    options={[
                        { value: 'Compliant', label: 'Compliant' },
                        { value: 'Partially Compliant', label: 'Partially Compliant' },
                        { value: 'Non-Compliant', label: 'Non-Compliant' },
                        { value: 'Pending', label: 'Pending' }
                    ]}
                />
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
    ];

    const skuTableDataSource = useMemo(() => {
        let data = skuComplianceData || [];
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
    }, [skuComplianceData, skuSearchText, skuStatusFilter]);

    return (
        <div className="p-4 bg-white rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                     <Input 
                        placeholder="Search SKU..." 
                        value={skuSearchText} 
                        onChange={e => setSkuSearchText(e.target.value)}
                        className="w-64"
                    />
                    <Select
                        value={skuStatusFilter}
                        onChange={setSkuStatusFilter}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'Compliant', label: 'Compliant' },
                            { value: 'Partially Compliant', label: 'Partially Compliant' },
                            { value: 'Non-Compliant', label: 'Non-Compliant' }
                        ]}
                        className="w-40"
                    />
                </div>
            </div>

            <Table 
                columns={skuComplianceColumns}
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

            <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancelPreview}>
                <img alt="example" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </div>
    );
};

export default MarkingLabeling;
