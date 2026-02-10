import React, { useState } from 'react';
import { Table, Select, Input, Button, Upload, ConfigProvider, Radio } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { FaCheckCircle, FaFileContract, FaSave, FaEdit, FaUndo, FaTrashAlt } from 'react-icons/fa';
import { useClientContext } from '../../context/ClientContext';
import { getWasteTypeConfig } from '../../constants/WasteTypeConfig';
import DocumentViewerModal from '../DocumentViewerModal';

const CompanyDocument = ({
    msmeRows,
    addMsmeRow,
    handleMsmeChange,
    toggleEditMsmeRow,
    resetMsmeRow,
    deleteMsmeRow,
    clientCategory,
    onSave
}) => {
    const { formData, handleChange, handleFileChange } = useClientContext();
    const currentConfig = getWasteTypeConfig(formData.wasteType);
    
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState('');
    const [viewerName, setViewerName] = useState('');

    const handleViewDocument = (url, name) => {
        setViewerUrl(url);
        setViewerName(name);
        setViewerOpen(true);
    };

    // Hardcode logic for debugging/persistence
    const isEwaste = 
        formData.wasteType === 'E-Waste' || 
        formData.wasteType === 'E-WASTE' || 
        currentConfig?.key === 'E_WASTE';

    // console.log("isEwaste:", isEwaste, "formData.wasteType:", formData.wasteType);

    const renderConditionalRow = (
        title, 
        yesNoField, 
        numField, 
        dateField, 
        fileField, 
        pathField, 
        fileLabel, 
        placeholder
    ) => {
        return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <label className="text-sm font-bold text-gray-700 w-full md:w-1/2">{title}</label>
                <div className="flex items-center gap-4">
                    <Radio.Group 
                        name={yesNoField} 
                        onChange={handleChange} 
                        value={formData[yesNoField]}
                        className="flex gap-4"
                    >
                        <Radio value="Yes" className="font-medium">Yes</Radio>
                        <Radio value="No" className="font-medium">No</Radio>
                    </Radio.Group>
                </div>
            </div>

            {formData[yesNoField] === 'Yes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 animate-fadeIn">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Certificate Number</label>
                        <Input
                            name={numField}
                            value={formData[numField]}
                            onChange={handleChange}
                            placeholder={placeholder || "Enter Certificate Number"}
                            className="w-full"
                        />
                    </div>
                    <div>
                         {/* Date field hidden as per user request table not strictly asking for it */}
                    </div> 
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Document Upload</label>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    type="file"
                                    id={`file-${fileField}`}
                                    name={fileField}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor={`file-${fileField}`}
                                    className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors inline-block border border-blue-200"
                                >
                                    <UploadOutlined className="mr-2" /> Upload
                                </label>
                            </div>
                            <div className="flex flex-col">
                                {formData[fileField] && (
                                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                        <FaCheckCircle /> {formData[fileField].name}
                                    </span>
                                )}
                                {formData[pathField] && !formData[fileField] && (
                                    <button 
                                        type="button"
                                        onClick={() => handleViewDocument(formData[pathField], fileLabel)}
                                        className="text-primary-600 hover:underline text-xs flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
                                    >
                                        <FaFileContract /> View Uploaded
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Company Documents</h3>
            
            {/* New Compliance Questions - Explicit Check for E-Waste */}
            {isEwaste && (
                <>
                    {renderConditionalRow(
                        "Is producer registered Under E-waste management rules 2022?",
                        "isEwasteRegistered",
                        "ewasteCertificateNumber",
                        "ewasteCertificateDate",
                        "ewasteFile",
                        "ewasteFilePath",
                        "E-waste Certificate",
                        "Enter Certificate Number"
                    )}

                    {renderConditionalRow(
                        "If the producer is Importing EEE and selling it in domestic market",
                        "isImportingEEE",
                        "eeeCertificateNumber",
                        "eeeCertificateDate",
                        "eeeFile",
                        "eeeFilePath",
                        "Import Authorization",
                        "Enter Certificate Number"
                    )}
                </>
            )}
            
            {/* Company Documents Table Layout */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Document Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Certificate Number</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Upload/View Document</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentConfig.documents.map((doc) => (
                            <tr key={doc.key} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {doc.label}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        name={`${doc.key}Number`}
                                        value={formData[`${doc.key}Number`] || ''}
                                        onChange={handleChange}
                                        placeholder="Enter Number"
                                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="date"
                                        name={`${doc.key}Date`}
                                        value={formData[`${doc.key}Date`] || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-600"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id={`file-${doc.key}`}
                                                    name={`${doc.key}File`}
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor={`file-${doc.key}`}
                                                    className="cursor-pointer px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors inline-block"
                                                >
                                                    Choose file
                                                </label>
                                            </div>
                                            <span className="text-sm text-gray-400 italic truncate max-w-[150px]">
                                                {formData[`${doc.key}File`] ? formData[`${doc.key}File`].name : 'No file chosen'}
                                            </span>
                                        </div>
                                        {formData[`${doc.key}File`] && (
                                            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                                                <FaCheckCircle className="text-xs" /> Selected
                                            </div>
                                        )}
                                        {formData[`${doc.key}FilePath`] && !formData[`${doc.key}File`] && (
                                            <button 
                                                type="button"
                                                onClick={() => handleViewDocument(formData[`${doc.key}FilePath`], doc.label)}
                                                className="text-primary-600 hover:underline text-xs flex items-center gap-1 mt-1 bg-transparent border-0 p-0 cursor-pointer"
                                            >
                                                <FaFileContract /> View Existing
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-10">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">MSME Details</h3>
                    <Button 
                        type="primary" 
                        onClick={addMsmeRow} 
                        icon={<PlusOutlined />}
                        className="bg-primary-600 hover:bg-primary-700 border-primary-600"
                    >
                        Add Row
                    </Button>
                </div>
                
                {/* Refactored MSME Table - Ant Design */}
                <ConfigProvider
                    theme={{
                        token: {
                            colorPrimary: '#ea580c',
                        },
                    }}
                >
                    <Table
                        dataSource={msmeRows}
                        pagination={false}
                        rowKey="key"
                        columns={[
                            {
                                title: 'Year',
                                dataIndex: 'classificationYear',
                                key: 'classificationYear',
                                render: (text, record, index) => record.isEditing ? (
                                    <Select
                                        value={text}
                                        onChange={(value) => handleMsmeChange(index, 'classificationYear', value)}
                                        style={{ width: 120 }}
                                        options={[
                                            { value: '2023-24', label: '2023-24' },
                                            { value: '2024-25', label: '2024-25' },
                                            { value: '2025-26', label: '2025-26' },
                                            { value: '2026-27', label: '2026-27' },
                                            { value: '2027-28', label: '2027-28' },
                                            { value: '2028-29', label: '2028-29' },
                                            { value: '2029-30', label: '2029-30' }
                                        ]}
                                    />
                                ) : (
                                    <span className="text-gray-700">{text}</span>
                                )
                            },
                            {
                                title: 'Status',
                                dataIndex: 'status',
                                key: 'status',
                                render: (text, record, index) => record.isEditing ? (
                                    <Select
                                        value={text}
                                        onChange={(value) => handleMsmeChange(index, 'status', value)}
                                        style={{ width: 120 }}
                                        options={[
                                            { value: 'Small', label: 'Small' },
                                            { value: 'Medium', label: 'Medium' },
                                            { value: 'Large', label: 'Large' }
                                        ]}
                                    />
                                ) : (
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        text === 'Small' ? 'bg-green-100 text-green-700' :
                                        text === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-purple-100 text-purple-700'
                                    }`}>
                                        {text}
                                    </span>
                                )
                            },
                            {
                                title: 'Major Activity',
                                dataIndex: 'majorActivity',
                                key: 'majorActivity',
                                render: (text, record, index) => record.isEditing ? (
                                    <Select
                                        value={text}
                                        onChange={(value) => handleMsmeChange(index, 'majorActivity', value)}
                                        style={{ width: 150 }}
                                        placeholder="Select"
                                        options={[
                                            { value: 'Manufacturing', label: 'Manufacturing' },
                                            { value: 'Trading', label: 'Trading' },
                                            { value: 'Service', label: 'Service' }
                                        ]}
                                    />
                                ) : (
                                    <span className="text-gray-700">{text}</span>
                                )
                            },
                            {
                                title: 'Udyam No',
                                dataIndex: 'udyamNumber',
                                key: 'udyamNumber',
                                render: (text, record, index) => record.isEditing ? (
                                    <Input
                                        value={text}
                                        onChange={(e) => handleMsmeChange(index, 'udyamNumber', e.target.value)}
                                        placeholder={record.status === 'Large' ? 'Not Applicable' : 'Enter Udyam No'}
                                        disabled={record.status === 'Large'}
                                    />
                                ) : (
                                    <span className="text-gray-700 font-mono text-xs">{text || (record.status === 'Large' ? 'N/A' : '-')}</span>
                                )
                            },
                            {
                                title: 'Turnover',
                                dataIndex: 'turnover',
                                key: 'turnover',
                                render: (text, record, index) => record.isEditing ? (
                                    <Input
                                        value={text}
                                        onChange={(e) => handleMsmeChange(index, 'turnover', e.target.value)}
                                        placeholder="Enter Turnover"
                                    />
                                ) : (
                                    <span className="text-gray-700">{text || '-'}</span>
                                )
                            },
                            {
                                title: 'Certificate',
                                dataIndex: 'certificateFile',
                                key: 'certificateFile',
                                render: (text, record, index) => record.isEditing ? (
                                    <Upload
                                        beforeUpload={(file) => {
                                            handleMsmeChange(index, 'certificateFile', file);
                                            return false;
                                        }}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />}>
                                            {record.certificateFile ? record.certificateFile.name : 'Upload'}
                                        </Button>
                                    </Upload>
                                ) : (
                                    record.certificateFile ? (
                                        typeof record.certificateFile === 'string' ? (
                                            <button 
                                                type="button"
                                                onClick={() => handleViewDocument(record.certificateFile, 'MSME Certificate')}
                                                className="flex items-center gap-1 text-primary-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                            >
                                                <FaFileContract className="text-xs" />
                                                <span className="text-xs">View Certificate</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <FaCheckCircle className="text-xs" />
                                                <span className="text-xs">{record.certificateFile.name}</span>
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">No file</span>
                                    )
                                )
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                align: 'center',
                                render: (_, record, index) => (
                                    <div className="flex items-center justify-center space-x-2">
                                        {/* Save/Edit Button */}
                                        <button 
                                            type="button" 
                                            onClick={() => toggleEditMsmeRow(index)}
                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm ${
                                                record.isEditing 
                                                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md' 
                                                    : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                                            }`}
                                            title={record.isEditing ? "Save" : "Edit"}
                                        >
                                            {record.isEditing ? <FaSave /> : <FaEdit />}
                                        </button>

                                        {/* Reset Button */}
                                        <button 
                                            type="button" 
                                            onClick={() => resetMsmeRow(index)}
                                            className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 shadow-sm"
                                            title="Reset"
                                        >
                                            <FaUndo />
                                        </button>

                                        {/* Delete Button */}
                                        <button 
                                            type="button" 
                                            onClick={() => deleteMsmeRow(index)}
                                            className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                            title="Delete"
                                        >
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                )
                            }
                        ]}
                    />
                </ConfigProvider>
            </div>

            {/* Save button logic: Show only if NOT E-Waste (Plastic flow has specific "Save Company Documents" button here) */}
            {/* For E-Waste, the main "Save & Continue" button in AddClient.jsx handles everything, so we hide this redundant one */}
            {onSave && !isEwaste && (
                <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-semibold"
                    >
                        <FaSave /> Save Company Documents
                    </button>
                </div>
            )}

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                documentUrl={viewerUrl}
                documentName={viewerName}
            />
        </div>
    );
};

export default CompanyDocument;
