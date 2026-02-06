import React from 'react';
import { Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { FaCheckCircle, FaSave, FaEdit, FaUndo, FaTrashAlt } from 'react-icons/fa';
import { useClientContext } from '../../context/ClientContext';

const CteCtoCca = ({
    cteDetailRows,
    handleCteDetailChange,
    toggleEditCteDetailRow,
    resetCteDetailRow,
    deleteLocationRow,
    cteProductionRows,
    handleCteProductionChange,
    toggleEditCteProductionRow,
    addCteProductionRow,
    resetCteProductionRow,
    deleteCteProductionRow,
    ctoDetailRows,
    handleCtoDetailChange,
    toggleEditCtoDetailRow,
    resetCtoDetailRow,
    ctoProductRows,
    addCtoProductRow,
    handleCtoProductChange,
    toggleEditCtoProductRow,
    resetCtoProductRow,
    deleteCtoProductRow,
    API_URL,
    isViewMode,
    loading,
    handleSaveCgwaDetails,
    regulationsCoveredUnderCto,
    setRegulationsCoveredUnderCto,
    normalizeCtoRegulationValue,
    handleSaveCtoRegulations,
    waterRegulationsRows,
    addWaterRegulationRow,
    updateWaterRegulationRow,
    deleteWaterRegulationRow,
    airRegulationsRows,
    addAirRegulationRow,
    updateAirRegulationRow,
    deleteAirRegulationRow,
    hazardousWasteRegulationsRows,
    addHazardousWasteRegulationRow,
    updateHazardousWasteRegulationRow,
    deleteHazardousWasteRegulationRow,
    setWaterRegulationsRows,
    setAirRegulationsRows,
    setHazardousWasteRegulationsRows
}) => {
    const { formData, handleChange, handleFileChange } = useClientContext();

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">CTE & CTO/CCA Details</h3>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Plant Locations</label>
                <Input 
                    type="number" 
                    min="0" 
                    name="plantLocationNumber" 
                    value={formData.plantLocationNumber} 
                    onChange={handleChange} 
                    className="w-32" 
                />
            </div>

            {formData.plantLocationNumber > 0 && (
                <div className="space-y-8">
                    {/* CTE Details Table */}
                    <div>
                        <h4 className="font-bold text-lg text-gray-700 mb-4 border-b pb-1">CTE Details</h4>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                            <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            { label: 'Plant Name', width: 'min-w-[150px]' },
                                            { label: 'Consent No', width: 'min-w-[120px]' },
                                            { label: 'Category', width: 'min-w-[100px]' },
                                            { label: 'Issued Date', width: 'min-w-[130px]' },
                                            { label: 'Valid Upto', width: 'min-w-[130px]' },
                                            { label: 'Plant Location', width: 'min-w-[150px]' },
                                            { label: 'Plant Address', width: 'min-w-[200px]' },
                                            { label: 'Factory Head', width: 'min-w-[300px]' },
                                            { label: 'Contact Person', width: 'min-w-[300px]' },
                                            { label: 'Document', width: 'min-w-[200px]' },
                                            { label: 'Actions', width: 'min-w-[100px] text-center' }
                                        ].map((header) => (
                                            <th key={header.label} className={`px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap bg-gray-50 sticky top-0 z-10 border-b border-gray-200 ${header.width}`}>
                                                {header.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {cteDetailRows.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantName} onChange={(e) => handleCteDetailChange(index, 'plantName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.plantName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.consentNo} onChange={(e) => handleCteDetailChange(index, 'consentNo', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.consentNo}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.category} onChange={(e) => handleCteDetailChange(index, 'category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.category}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="date" value={row.issuedDate} onChange={(e) => handleCteDetailChange(index, 'issuedDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.issuedDate}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="date" value={row.validUpto} onChange={(e) => handleCteDetailChange(index, 'validUpto', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.validUpto}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantLocation} onChange={(e) => handleCteDetailChange(index, 'plantLocation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.plantLocation}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantAddress} onChange={(e) => handleCteDetailChange(index, 'plantAddress', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.plantAddress}</span>
                                                )}
                                            </td>
                                            
                                            {/* Factory Head Group */}
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" placeholder="Name" value={row.factoryHeadName} onChange={(e) => handleCteDetailChange(index, 'factoryHeadName', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="text" placeholder="Designation" value={row.factoryHeadDesignation} onChange={(e) => handleCteDetailChange(index, 'factoryHeadDesignation', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="text" placeholder="Mobile" value={row.factoryHeadMobile} onChange={(e) => handleCteDetailChange(index, 'factoryHeadMobile', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="email" placeholder="Email" value={row.factoryHeadEmail} onChange={(e) => handleCteDetailChange(index, 'factoryHeadEmail', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                                        <span className="col-span-2 font-medium text-gray-800">{row.factoryHeadName || '-'}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.factoryHeadDesignation}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.factoryHeadMobile}</span>
                                                        <span className="col-span-2 text-xs text-gray-500 truncate" title={row.factoryHeadEmail}>{row.factoryHeadEmail}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Contact Person Group */}
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" placeholder="Name" value={row.contactPersonName} onChange={(e) => handleCteDetailChange(index, 'contactPersonName', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="text" placeholder="Designation" value={row.contactPersonDesignation} onChange={(e) => handleCteDetailChange(index, 'contactPersonDesignation', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="text" placeholder="Mobile" value={row.contactPersonMobile} onChange={(e) => handleCteDetailChange(index, 'contactPersonMobile', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                        <input type="email" placeholder="Email" value={row.contactPersonEmail} onChange={(e) => handleCteDetailChange(index, 'contactPersonEmail', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                                        <span className="col-span-2 font-medium text-gray-800">{row.contactPersonName || '-'}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.contactPersonDesignation}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.contactPersonMobile}</span>
                                                        <span className="col-span-2 text-xs text-gray-500 truncate" title={row.contactPersonEmail}>{row.contactPersonEmail}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Document Upload */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    {row.isEditing && (
                                                        <input 
                                                            type="file" 
                                                            onChange={(e) => handleCteDetailChange(index, 'documentFile', e.target.files[0])} 
                                                            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
                                                        />
                                                    )}
                                                    {row.documentFile && (
                                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                                            <FaCheckCircle className="text-xs" />
                                                            <span className="text-xs font-medium truncate max-w-[150px]">
                                                                {typeof row.documentFile === 'string' 
                                                                    ? (row.documentFile.split('/').pop() || 'Uploaded')
                                                                    : (row.documentFile?.name || 'Uploaded')}
                                                            </span>
                                                            {typeof row.documentFile === 'string' ? (
                                                                <a
                                                                    href={(row.documentFile.startsWith('http://') || row.documentFile.startsWith('https://'))
                                                                        ? row.documentFile
                                                                        : new URL(row.documentFile, API_URL).toString()}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-primary-700 underline ml-2"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const url = URL.createObjectURL(row.documentFile);
                                                                        window.open(url, '_blank');
                                                                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                                                                    }}
                                                                    className="text-xs text-primary-700 underline ml-2"
                                                                >
                                                                    View
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {/* Save/Edit Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => toggleEditCteDetailRow(index)}
                                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm ${
                                                                row.isEditing 
                                                                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md' 
                                                                    : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                                                            }`}
                                                            title={row.isEditing ? "Save" : "Edit"}
                                                        >
                                                            {row.isEditing ? <FaSave /> : <FaEdit />}
                                                        </button>

                                                        {/* Reload/Reset Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => resetCteDetailRow(index)}
                                                            className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 shadow-sm"
                                                            title="Reset"
                                                        >
                                                            <FaUndo />
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => deleteLocationRow(index)}
                                                            className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                            title="Delete Location"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CTE Production Capacity Table */}
                    <div>
                        <div className="flex items-center justify-between border-b pb-1 mb-4">
                            <h4 className="font-bold text-lg text-gray-700">CTE Production Capacity</h4>
                            <button 
                                type="button" 
                                onClick={addCteProductionRow} 
                                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <PlusOutlined className="mr-1.5" />
                                Add Row
                            </button>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                            <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/3">Plant Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/3">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/4">Quantity</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-28">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {cteProductionRows.map((row, index) => (
                                        <tr key={row.key || index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <select
                                                        value={row.plantName}
                                                        onChange={(e) => handleCteProductionChange(index, 'plantName', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    >
                                                        <option value="">Select Plant</option>
                                                        {cteDetailRows.map((cteRow, i) => (
                                                            <option key={i} value={cteRow.plantName || `Plant ${i + 1}`}>
                                                                {cteRow.plantName || `Plant ${i + 1}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.plantName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input
                                                        type="text"
                                                        placeholder="Product Name"
                                                        value={row.productName}
                                                        onChange={(e) => handleCteProductionChange(index, 'productName', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.productName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input
                                                        type="text"
                                                        placeholder="Quantity"
                                                        value={row.maxCapacityPerYear}
                                                        onChange={(e) => handleCteProductionChange(index, 'maxCapacityPerYear', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.maxCapacityPerYear}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    {/* Save/Edit Button */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleEditCteProductionRow(index)}
                                                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm ${
                                                            row.isEditing 
                                                                ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md' 
                                                                : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                                                        }`}
                                                        title={row.isEditing ? "Save" : "Edit"}
                                                    >
                                                        {row.isEditing ? <FaSave /> : <FaEdit />}
                                                    </button>

                                                    {/* Reload/Reset Button */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => resetCteProductionRow(index)}
                                                        className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 shadow-sm"
                                                        title="Reset"
                                                    >
                                                        <FaUndo />
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => deleteCteProductionRow(index)}
                                                        className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {cteProductionRows.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-3 py-4 text-center text-gray-400 italic">
                                                No production details added
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CTO/CCA Details Table */}
                    <div>
                        <h4 className="font-bold text-lg text-gray-700 mb-4 border-b pb-1">CTO/CCA Details</h4>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                            <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            { label: 'CTO/CCA Type', width: 'min-w-[150px]' },
                                            { label: 'Plant Name', width: 'min-w-[150px]' },
                                            { label: 'Industry Type', width: 'min-w-[160px]' },
                                            { label: 'Category', width: 'min-w-[160px]' },
                                            { label: 'Consent Order No', width: 'min-w-[150px]' },
                                            { label: 'Date of Issue', width: 'min-w-[130px]' },
                                            { label: 'Valid Upto', width: 'min-w-[130px]' },
                                            { label: 'Plant Location', width: 'min-w-[150px]' },
                                            { label: 'Plant Address', width: 'min-w-[200px]' },
                                            { label: 'Factory Head', width: 'min-w-[300px]' },
                                            { label: 'Contact Person', width: 'min-w-[300px]' },
                                            { label: 'Document', width: 'min-w-[200px]' },
                                            { label: 'Actions', width: 'min-w-[140px] text-center' }
                                        ].map((header) => (
                                            <th key={header.label} className={`px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap bg-gray-50 sticky top-0 z-10 border-b border-gray-200 ${header.width}`}>
                                                {header.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ctoDetailRows.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <select
                                                        value={row.ctoCaaType || ''}
                                                        onChange={(e) => handleCtoDetailChange(index, 'ctoCaaType', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="Fresh">Fresh</option>
                                                        <option value="Renew">Renew</option>
                                                        <option value="Amended">Amended</option>
                                                    </select>
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.ctoCaaType || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantName} onChange={(e) => handleCtoDetailChange(index, 'plantName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Plant Name" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700 font-medium">{row.plantName || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <select
                                                        value={row.industryType || ''}
                                                        onChange={(e) => handleCtoDetailChange(index, 'industryType', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="Small">Small</option>
                                                        <option value="Micro">Micro</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="Large">Large</option>
                                                        <option value="Not Mentiond">Not Mentiond</option>
                                                    </select>
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.industryType || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={row.category || ''}
                                                        onChange={(e) => handleCtoDetailChange(index, 'category', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                        placeholder="Category"
                                                    />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.category || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.consentOrderNo} onChange={(e) => handleCtoDetailChange(index, 'consentOrderNo', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Consent No" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.consentOrderNo || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="date" value={row.dateOfIssue} onChange={(e) => handleCtoDetailChange(index, 'dateOfIssue', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.dateOfIssue || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="date" value={row.validUpto} onChange={(e) => handleCtoDetailChange(index, 'validUpto', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.validUpto || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantLocation} onChange={(e) => handleCtoDetailChange(index, 'plantLocation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Location" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600">{row.plantLocation || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input type="text" value={row.plantAddress} onChange={(e) => handleCtoDetailChange(index, 'plantAddress', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Address" />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-600 truncate max-w-[200px]" title={row.plantAddress}>{row.plantAddress || '-'}</span>
                                                )}
                                            </td>
                                            
                                            {/* Factory Head Group */}
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" placeholder="Name" value={row.factoryHeadName} onChange={(e) => handleCtoDetailChange(index, 'factoryHeadName', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="text" placeholder="Designation" value={row.factoryHeadDesignation} onChange={(e) => handleCtoDetailChange(index, 'factoryHeadDesignation', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="text" placeholder="Mobile" value={row.factoryHeadMobile} onChange={(e) => handleCtoDetailChange(index, 'factoryHeadMobile', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="email" placeholder="Email" value={row.factoryHeadEmail} onChange={(e) => handleCtoDetailChange(index, 'factoryHeadEmail', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                                        <span className="col-span-2 font-medium text-gray-800">{row.factoryHeadName || '-'}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.factoryHeadDesignation}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.factoryHeadMobile}</span>
                                                        <span className="col-span-2 text-xs text-gray-500 truncate" title={row.factoryHeadEmail}>{row.factoryHeadEmail}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Contact Person Group */}
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" placeholder="Name" value={row.contactPersonName} onChange={(e) => handleCtoDetailChange(index, 'contactPersonName', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="text" placeholder="Designation" value={row.contactPersonDesignation} onChange={(e) => handleCtoDetailChange(index, 'contactPersonDesignation', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="text" placeholder="Mobile" value={row.contactPersonMobile} onChange={(e) => handleCtoDetailChange(index, 'contactPersonMobile', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                        <input type="email" placeholder="Email" value={row.contactPersonEmail} onChange={(e) => handleCtoDetailChange(index, 'contactPersonEmail', e.target.value)} className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                                        <span className="col-span-2 font-medium text-gray-800">{row.contactPersonName || '-'}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.contactPersonDesignation}</span>
                                                        <span className="col-span-2 text-xs text-gray-500">{row.contactPersonMobile}</span>
                                                        <span className="col-span-2 text-xs text-gray-500 truncate" title={row.contactPersonEmail}>{row.contactPersonEmail}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Document Upload */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    {row.isEditing && (
                                                        <div className="relative">
                                                            <input 
                                                                type="file" 
                                                                onChange={(e) => handleCtoDetailChange(index, 'documentFile', e.target.files[0])} 
                                                                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
                                                            />
                                                        </div>
                                                    )}
                                                    {row.documentFile && (
                                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                                            <FaCheckCircle className="text-xs" />
                                                            <span className="text-xs font-medium truncate max-w-[150px]">
                                                                {typeof row.documentFile === 'string' 
                                                                    ? (row.documentFile.split('/').pop() || 'Uploaded')
                                                                    : (row.documentFile?.name || 'Uploaded')}
                                                            </span>
                                                            {typeof row.documentFile === 'string' ? (
                                                                <a
                                                                    href={(row.documentFile.startsWith('http://') || row.documentFile.startsWith('https://'))
                                                                        ? row.documentFile
                                                                        : new URL(row.documentFile, API_URL).toString()}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-primary-700 underline ml-2"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const url = URL.createObjectURL(row.documentFile);
                                                                        window.open(url, '_blank');
                                                                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                                                                    }}
                                                                    className="text-xs text-primary-700 underline ml-2"
                                                                >
                                                                    View
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {/* Save/Edit Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => toggleEditCtoDetailRow(index)}
                                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm ${
                                                                row.isEditing 
                                                                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md' 
                                                                    : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                                                            }`}
                                                            title={row.isEditing ? "Save" : "Edit"}
                                                        >
                                                            {row.isEditing ? <FaSave /> : <FaEdit />}
                                                        </button>

                                                        {/* Reload/Reset Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => resetCtoDetailRow(index)}
                                                            className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 shadow-sm"
                                                            title="Reset"
                                                        >
                                                            <FaUndo />
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => deleteLocationRow(index)}
                                                            className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                            title="Delete Location"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>



                    {/* CTO/CCA Products Table */}
                    <div>
                        <div className="flex items-center justify-between border-b pb-1 mb-4">
                            <h4 className="font-bold text-lg text-gray-700">CTO/CCA Products</h4>
                            <button 
                                type="button" 
                                onClick={addCtoProductRow} 
                                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <PlusOutlined className="mr-1.5" />
                                Add Row
                            </button>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                            <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/3">Plant Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/3">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-1/4">Quantity</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200 w-28">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ctoProductRows.map((row, index) => (
                                        <tr key={row.key || index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <select
                                                        value={row.plantName}
                                                        onChange={(e) => handleCtoProductChange(index, 'plantName', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    >
                                                        <option value="">Select Plant</option>
                                                        {ctoDetailRows.map((ctoRow, i) => (
                                                            <option key={i} value={ctoRow.plantName || `Plant ${i + 1}`}>
                                                                {ctoRow.plantName || `Plant ${i + 1}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.plantName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input
                                                        type="text"
                                                        placeholder="Product Name"
                                                        value={row.productName}
                                                        onChange={(e) => handleCtoProductChange(index, 'productName', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.productName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.isEditing ? (
                                                    <input
                                                        type="text"
                                                        placeholder="Quantity"
                                                        value={row.quantity}
                                                        onChange={(e) => handleCtoProductChange(index, 'quantity', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <span className="block px-2 py-1 text-sm text-gray-700">{row.quantity}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    {/* Save/Edit Button */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleEditCtoProductRow(index)}
                                                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm ${
                                                            row.isEditing 
                                                                ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md' 
                                                                : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                                                        }`}
                                                        title={row.isEditing ? "Save" : "Edit"}
                                                    >
                                                        {row.isEditing ? <FaSave /> : <FaEdit />}
                                                    </button>

                                                    {/* Reload/Reset Button */}
                                                    <button 
                                                            type="button" 
                                                            onClick={() => resetCtoProductRow(index)}
                                                            className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 shadow-sm"
                                                            title="Reset"
                                                        >
                                                            <FaUndo />
                                                        </button>

                                                    {/* Delete Button */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => deleteCtoProductRow(index)}
                                                        className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ctoProductRows.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-3 py-4 text-center text-gray-400 italic">
                                                No product details added
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between border-b pb-1 mb-4">
                            <h4 className="font-bold text-lg text-gray-700">CTO/CCA Additional Details</h4>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Total Capital Investment in Laks
                                    </label>
                                    <input
                                        type="number"
                                        name="totalCapitalInvestmentLakhs"
                                        value={formData.totalCapitalInvestmentLakhs}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                        placeholder="Enter amount"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Usage of Ground / Bore Well Water
                                    </label>
                                    <select
                                        name="groundWaterUsage"
                                        value={formData.groundWaterUsage}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white"
                                    >
                                        <option value="">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        CGWA NOC Requirement
                                    </label>
                                    <select
                                        value={formData.cgwaNocRequirement}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
                                    >
                                        <option value="">Select</option>
                                        <option value="Applicable">Applicable</option>
                                        <option value="Not Applicable">Not Applicable</option>
                                    </select>
                                </div>
                            </div>

                            {formData.groundWaterUsage === 'Yes' && (
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        CGWA NOC Document
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            name="cgwaNocDocument"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
                                        />

                                        {formData.cgwaNocDocument && (
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                                <FaCheckCircle className="text-xs" />
                                                <span className="text-xs font-medium truncate max-w-[220px]">
                                                    {typeof formData.cgwaNocDocument === 'string'
                                                        ? (formData.cgwaNocDocument.split('/').pop() || 'Uploaded')
                                                        : (formData.cgwaNocDocument?.name || 'Uploaded')}
                                                </span>
                                                {typeof formData.cgwaNocDocument === 'string' ? (
                                                    <a
                                                        href={(formData.cgwaNocDocument.startsWith('http://') || formData.cgwaNocDocument.startsWith('https://'))
                                                            ? formData.cgwaNocDocument
                                                            : new URL(formData.cgwaNocDocument, API_URL).toString()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-primary-700 underline ml-2"
                                                    >
                                                        View
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = URL.createObjectURL(formData.cgwaNocDocument);
                                                            window.open(url, '_blank');
                                                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                                                        }}
                                                        className="text-xs text-primary-700 underline ml-2"
                                                    >
                                                        View
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isViewMode && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveCgwaDetails}
                                        disabled={loading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between border-b pb-1 mb-4">
                            <h4 className="font-bold text-lg text-gray-700">Regulations Covered under CTO</h4>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Regulations Covered under CTO
                                    </label>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        disabled={isViewMode}
                                        placeholder="Select"
                                        value={regulationsCoveredUnderCto}
                                        onChange={(vals) => {
                                            const next = (Array.isArray(vals) ? vals : []).map(normalizeCtoRegulationValue).filter(Boolean);
                                            setRegulationsCoveredUnderCto(next);
                                            if (!next.includes('Water')) {
                                                setWaterRegulationsRows([]);
                                            }
                                            if (!next.includes('Air')) {
                                                setAirRegulationsRows([]);
                                            }
                                            if (!next.includes('Hazardous Waste')) {
                                                setHazardousWasteRegulationsRows([]);
                                            }
                                        }}
                                        options={[
                                            { value: 'Water', label: 'Water' },
                                            { value: 'Air', label: 'Air' },
                                            { value: 'Hazardous Waste', label: 'Hazardous Waste' },
                                        ]}
                                        className="w-full"
                                    />
                                </div>

                                {!isViewMode && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveCtoRegulations}
                                            disabled={loading}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                    </div>
                                )}
                            </div>

                            {Array.isArray(regulationsCoveredUnderCto) && regulationsCoveredUnderCto.includes('Water') && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-sm text-gray-700">Water</h5>
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={addWaterRegulationRow}
                                                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors shadow-sm"
                                            >
                                                <PlusOutlined className="mr-1.5" />
                                                Add Row
                                            </button>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-24">SR NO</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[320px]">
                                                        Description (water consumption / waste)
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[200px]">
                                                        Permitted quantity
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[100px]">
                                                        UOM
                                                    </th>
                                                    {!isViewMode && (
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-28">
                                                            Action
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {(waterRegulationsRows.length ? waterRegulationsRows : [{ key: 'empty', description: '', permittedQuantity: '' }]).map((row, idx) => (
                                                    <tr key={row.key || idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-3 font-bold text-gray-800">{idx + 1}</td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.description || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.description || ''}
                                                                    onChange={(e) => updateWaterRegulationRow(idx, 'description', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Description"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.permittedQuantity || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.permittedQuantity || ''}
                                                                    onChange={(e) => updateWaterRegulationRow(idx, 'permittedQuantity', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Permitted quantity"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.uom || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.uom || ''}
                                                                    onChange={(e) => updateWaterRegulationRow(idx, 'uom', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="UOM"
                                                                />
                                                            )}
                                                        </td>
                                                        {!isViewMode && (
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteWaterRegulationRow(idx)}
                                                                    className="h-8 w-8 rounded-lg bg-red-50 text-red-500 inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                                    title="Delete Row"
                                                                >
                                                                    <FaTrashAlt />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {Array.isArray(regulationsCoveredUnderCto) && regulationsCoveredUnderCto.includes('Air') && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-sm text-gray-700">Air</h5>
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={addAirRegulationRow}
                                                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors shadow-sm"
                                            >
                                                <PlusOutlined className="mr-1.5" />
                                                Add Row
                                            </button>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-24">SR NO</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[320px]">
                                                        Parameters
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[240px]">
                                                        Permissible annual / daily limit
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[100px]">
                                                        UOM
                                                    </th>
                                                    {!isViewMode && (
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-28">
                                                            Action
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {(airRegulationsRows.length ? airRegulationsRows : [{ key: 'empty', parameter: '', permittedLimit: '' }]).map((row, idx) => (
                                                    <tr key={row.key || idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-3 font-bold text-gray-800">{idx + 1}</td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.parameter || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.parameter || ''}
                                                                    onChange={(e) => updateAirRegulationRow(idx, 'parameter', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Parameter"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.permittedLimit || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.permittedLimit || ''}
                                                                    onChange={(e) => updateAirRegulationRow(idx, 'permittedLimit', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Permissible annual / daily limit"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.uom || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.uom || ''}
                                                                    onChange={(e) => updateAirRegulationRow(idx, 'uom', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="UOM"
                                                                />
                                                            )}
                                                        </td>
                                                        {!isViewMode && (
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteAirRegulationRow(idx)}
                                                                    className="h-8 w-8 rounded-lg bg-red-50 text-red-500 inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                                    title="Delete Row"
                                                                >
                                                                    <FaTrashAlt />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {Array.isArray(regulationsCoveredUnderCto) && regulationsCoveredUnderCto.includes('Hazardous Waste') && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-sm text-gray-700">Hazardous Waste</h5>
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={addHazardousWasteRegulationRow}
                                                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors shadow-sm"
                                            >
                                                <PlusOutlined className="mr-1.5" />
                                                Add Row
                                            </button>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-24">SR NO</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[260px]">
                                                        Name of Hazardous Waste
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[320px]">
                                                        Facility &amp; Mode of Disposal
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[160px]">
                                                        Quantity MT/YR
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 min-w-[100px]">
                                                        UOM
                                                    </th>
                                                    {!isViewMode && (
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 w-28">
                                                            Action
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {(hazardousWasteRegulationsRows.length ? hazardousWasteRegulationsRows : [{ key: 'empty', nameOfHazardousWaste: '', facilityModeOfDisposal: '', quantityMtYr: '' }]).map((row, idx) => (
                                                    <tr key={row.key || idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-3 font-bold text-gray-800">{idx + 1}</td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.nameOfHazardousWaste || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.nameOfHazardousWaste || ''}
                                                                    onChange={(e) => updateHazardousWasteRegulationRow(idx, 'nameOfHazardousWaste', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Name of Hazardous Waste"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.facilityModeOfDisposal || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.facilityModeOfDisposal || ''}
                                                                    onChange={(e) => updateHazardousWasteRegulationRow(idx, 'facilityModeOfDisposal', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Facility & Mode of Disposal"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.quantityMtYr || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.quantityMtYr || ''}
                                                                    onChange={(e) => updateHazardousWasteRegulationRow(idx, 'quantityMtYr', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="Quantity MT/YR"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isViewMode ? (
                                                                <span className="block px-2 py-1 text-sm text-gray-600">{row.uom || '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.uom || ''}
                                                                    onChange={(e) => updateHazardousWasteRegulationRow(idx, 'uom', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                                                    placeholder="UOM"
                                                                />
                                                            )}
                                                        </td>
                                                        {!isViewMode && (
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteHazardousWasteRegulationRow(idx)}
                                                                    className="h-8 w-8 rounded-lg bg-red-50 text-red-500 inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-200 shadow-sm"
                                                                    title="Delete Row"
                                                                >
                                                                    <FaTrashAlt />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CteCtoCca;
