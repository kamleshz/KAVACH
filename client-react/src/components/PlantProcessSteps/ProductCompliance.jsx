import React, { useState, useRef } from 'react';
import { Table, Button, Tooltip, Upload, Popconfirm, Select, Input, Card, Tag } from 'antd';
import { FileExcelOutlined, SaveOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import Pagination from '../Pagination';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';

import { 
  PACKAGING_TYPES, 
  POLYMER_TYPES, 
  CATEGORIES, 
  CATEGORY_II_TYPE_OPTIONS, 
  CONTAINER_CAPACITIES, 
  LAYER_TYPES 
} from '../../constants/complianceConstants';

const ProductCompliance = ({
    subSteps,
    completedSubSteps,
    subTab,
    setSubTab,
    isManager,
    fileInputRef,
    handleExcelUpload,
    handleProductTemplateDownload,
    handleProductExport,
    handleProductDeleteAll,
    handleBulkSave,
    isBulkSaving,
    productRows,
    addRow,
    handleRowChange,
    handleGenerateSupplierCodeChange,
    formatProductFieldValue,
    resolveUrl,
    handleFileChange,
    saveRow,
    cancelRow,
    removeRow,
    savingRow,
    rowChanged,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    
    fileInputSupplierRef,
    handleSupplierExcelUpload,
    handleSupplierTemplateDownload,
    handleSupplierExport,
    handleSupplierDeleteAll,
    handleSupplierBulkSave,
    isSupplierBulkSaving,
    supplierRows,
    addSupplierRow,
    systemCodeOptions,
    handleSystemCodeSelect,
    handleSupplierCodeSelect,
    componentOptions,
    handleSupplierChange,
    saveSupplierRow,
    cancelSupplierRow,
    removeSupplierRow,
    savingSupplierRow,
    supplierPage,
    supplierItemsPerPage,
    setSupplierPage,
    setSupplierItemsPerPage,

    fileInputComponentRef,
    handleComponentExcelUpload,
    handleComponentTemplateDownload,
    handleComponentExport,
    handleComponentBulkSave,
    handleComponentDeleteAll,
    isComponentBulkSaving,
    componentRows,
    addComponentRow,
    handleComponentChange,
    saveComponentRow,
    cancelComponentRow,
    removeComponentRow,
    savingComponentRow,
    componentPage,
    componentItemsPerPage,
    setComponentPage,
    setComponentItemsPerPage,

    handleMonthlyExcelUpload,
    handleMonthlyTemplateDownload,
    handleMonthlyExport,
    monthlyRows,
    setMonthlyRows,
    lastSavedMonthlyRows,
    setLastSavedMonthlyRows,
    notify,
    clientId,
    type,
    itemId,
    monthlyPage,
    monthlyItemsPerPage,
    setMonthlyPage,
    setMonthlyItemsPerPage,
    
    indexOfFirstRow,
    currentRows,
    lastSavedRows,
    isProductFieldChanged,
    indexOfFirstSupplierRow,
    currentSupplierRows,
    indexOfFirstComponentRow,
    currentComponentRows,
    indexOfFirstMonthlyRow,
    indexOfLastMonthlyRow,
    changeSummaryData = [],
    handleNext,
    isSaving,
    
    // Recycled Props
    handleRecycledExcelUpload,
    handleRecycledTemplateDownload,
    handleRecycledExport,
    handleRecycledBulkSave,
    handleRecycledDeleteAll,
    addRecycledRow,
    recycledRows = [],
    setRecycledRows,
    recycledPage,
    setRecycledPage,
    recycledItemsPerPage,
    setRecycledItemsPerPage,
    indexOfFirstRecycledRow,
    currentRecycledRows,
    saveRecycledRow,
    cancelRecycledRow,
    removeRecycledRow,
    savingRecycledRow,
    categorySummary = []
}) => {
    
    const [savingMonthlyRow, setSavingMonthlyRow] = useState(null);
    const [isChangeSummaryExpanded, setIsChangeSummaryExpanded] = useState(false);

    return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
                {/* Sub-Navigation Stepper */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-50 rounded-xl border border-gray-200">
                    {subSteps.map((step) => {
                        const isCompleted = completedSubSteps.includes(step.id);
                        const isActive = subTab === step.id;
                        
                        return (
                        <button
                            key={step.id}
                            onClick={() => setSubTab(step.id)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-white text-primary-700 shadow-sm border border-gray-200'
                                    : isCompleted
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'text-gray-500 hover:text-primary-600 hover:bg-white/50'
                            }`}
                        >
                            {isCompleted && <i className="fas fa-check-circle text-green-600"></i>}
                            {step.label}
                        </button>
                    )})}
                </div>

                {subTab === 'product-compliance' && (
                <>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-gray-800">Product Compliance</h2>
                    <div className="flex gap-2">
                        {!isManager && (
                        <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleExcelUpload}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <FileExcelOutlined /> Upload Excel
                        </button>
                        <button 
                            onClick={handleProductTemplateDownload} 
                            className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <FileExcelOutlined /> Template
                        </button>
                        <button 
                            onClick={handleProductExport} 
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <i className="fas fa-file-export"></i> Export Excel
                        </button>
                        <Popconfirm
                            title="Are you sure you want to delete all rows?"
                            onConfirm={handleProductDeleteAll}
                            okText="Yes"
                            cancelText="No"
                        >
                            <button 
                                disabled={isBulkSaving || productRows.length === 0}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DeleteOutlined /> Delete All
                            </button>
                        </Popconfirm>
                        <button 
                            onClick={handleBulkSave} 
                            disabled={isBulkSaving}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBulkSaving ? <i className="fas fa-spinner fa-spin"></i> : <SaveOutlined />} Save All
                        </button>
                        <button onClick={addRow} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs">
                            <i className="fas fa-plus"></i> Add Product
                        </button>
                        </>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                        <thead className={isManager ? "bg-green-50" : "bg-gray-50"}>
                            <tr>
                                {[
                                    { label: '#', width: 'w-12 text-center' },
                                    { label: 'Packaging Type', width: 'min-w-[150px]' },
                                    { label: 'SKU code', width: 'min-w-[120px]' },
                                    { label: 'SKU Description', width: 'min-w-[200px]' },
                                    { label: 'SKU UOM', width: 'min-w-[120px]' },
                                    { label: 'Product Image', width: 'min-w-[100px]' },
                                    { label: 'Generate', width: 'min-w-[100px]' },
                                    { label: 'Component code', width: 'min-w-[120px]' },
                                    { label: 'System Code', width: 'min-w-[120px]' },
                                    { label: 'Component Description', width: 'min-w-[200px]' },
                                    { label: 'Supplier Name', width: 'min-w-[150px]' },
                                    { label: 'Supplier Type', width: 'min-w-[150px]' },
                                    { label: 'Supplier Category', width: 'min-w-[150px]' },
                                    { label: 'Generate Supplier Code', width: 'min-w-[150px]' },
                                    { label: 'Supplier Code', width: 'min-w-[150px]' },
                                    { label: 'Component Image', width: 'min-w-[100px]' },
                                    { label: 'Actions', width: 'min-w-[100px]' }
                                ].filter(h => !isManager || (h.label !== 'Actions' && h.label !== 'System Code')).map((header) => (
                                    <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 z-10 border-b border-gray-200 ${isManager ? "bg-green-50" : "bg-gray-50"} ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200' : ''}`}>
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentRows.map((row, idx) => {
                                const globalIndex = indexOfFirstRow + idx;
                                const prevRow = lastSavedRows[globalIndex] || {};
                                const packagingTypeChanged = isProductFieldChanged(globalIndex, 'packagingType', row.packagingType);
                                const skuCodeChanged = isProductFieldChanged(globalIndex, 'skuCode', row.skuCode);
                                const skuDescriptionChanged = isProductFieldChanged(globalIndex, 'skuDescription', row.skuDescription);
                                const skuUomChanged = isProductFieldChanged(globalIndex, 'skuUom', row.skuUom);
                                const productImageChanged = isProductFieldChanged(globalIndex, 'productImage', row.productImage);
                                const systemCodeChanged = isProductFieldChanged(globalIndex, 'systemCode', row.systemCode);
                                const componentCodeChanged = isProductFieldChanged(globalIndex, 'componentCode', row.componentCode);
                                const componentDescriptionChanged = isProductFieldChanged(globalIndex, 'componentDescription', row.componentDescription);
                                const supplierNameChanged = isProductFieldChanged(globalIndex, 'supplierName', row.supplierName);
                                const supplierTypeChanged = isProductFieldChanged(globalIndex, 'supplierType', row.supplierType);
                                const supplierCategoryChanged = isProductFieldChanged(globalIndex, 'supplierCategory', row.supplierCategory);
                                const generateSupplierCodeChanged = isProductFieldChanged(globalIndex, 'generateSupplierCode', row.generateSupplierCode);
                                const supplierCodeChanged = isProductFieldChanged(globalIndex, 'supplierCode', row.supplierCode);
                                const componentImageChanged = isProductFieldChanged(globalIndex, 'componentImage', row.componentImage);
                                const rowChanged =
                                    packagingTypeChanged ||
                                    skuCodeChanged ||
                                    skuDescriptionChanged ||
                                    skuUomChanged ||
                                    productImageChanged ||
                                    componentCodeChanged ||
                                    componentDescriptionChanged ||
                                    supplierNameChanged ||
                                    supplierTypeChanged ||
                                    supplierCategoryChanged ||
                                    generateSupplierCodeChanged ||
                                    supplierCodeChanged ||
                                    componentImageChanged;
                                return (
                                <tr key={globalIndex} className="hover:bg-gray-50 transition-colors duration-150 group">
                                    <td className="px-2 py-2 text-center text-xs text-black align-middle font-bold">{globalIndex + 1}</td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.packagingType || '-'}</div>
                                            ) : (
                                            <select
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${packagingTypeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                value={row.packagingType}
                                                onChange={(e) => handleRowChange(globalIndex, 'packagingType', e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                {PACKAGING_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                            {packagingTypeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.packagingType, 'packagingType')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.packagingType, 'packagingType')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.skuCode || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400 ${skuCodeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                placeholder="Code" 
                                                value={row.skuCode} 
                                                onChange={(e)=>handleRowChange(globalIndex,'skuCode',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                            {skuCodeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.skuCode, 'skuCode')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.skuCode, 'skuCode')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.skuDescription || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${skuDescriptionChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                placeholder="Description" 
                                                value={row.skuDescription} 
                                                onChange={(e)=>handleRowChange(globalIndex,'skuDescription',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                            {skuDescriptionChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.skuDescription, 'skuDescription')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.skuDescription, 'skuDescription')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.skuUom || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400 ${skuUomChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                placeholder="UOM" 
                                                value={row.skuUom} 
                                                onChange={(e)=>handleRowChange(globalIndex,'skuUom',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                            {skuUomChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.skuUom, 'skuUom')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.skuUom, 'skuUom')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            {!isManager && (
                                            <input 
                                                type="file" 
                                                id={`product-image-${globalIndex}`} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e)=>handleFileChange(globalIndex,'productImage',e.target.files[0])} 
                                            />
                                            )}
                                            {row.productImage ? (
                                                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border shadow-sm hover:border-primary-300 transition-all ${productImageChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                                                    <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                                        {(typeof row.productImage === 'string' || row.productImage instanceof File) && (
                                                            <img 
                                                                src={typeof row.productImage === 'string' ? resolveUrl(row.productImage) : URL.createObjectURL(row.productImage)} 
                                                                alt="Preview" 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {e.target.style.display='none';}}
                                                            />
                                                        )}
                                                        <i className={`fas fa-image text-gray-400 text-xs absolute inset-0 m-auto flex items-center justify-center ${(typeof row.productImage === 'string' || row.productImage instanceof File) ? '-z-10' : ''}`}></i>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <a 
                                                            href={typeof row.productImage === 'string' ? resolveUrl(row.productImage) : (row.productImage instanceof File ? URL.createObjectURL(row.productImage) : '#')} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 leading-none"
                                                            title="View Image"
                                                        >
                                                            View
                                                        </a>
                                                        {!isManager && (
                                                        <label 
                                                            htmlFor={`product-image-${globalIndex}`} 
                                                            className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700 leading-none"
                                                            title="Change Image"
                                                        >
                                                            Change
                                                        </label>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                !isManager ? (
                                                <label 
                                                    htmlFor={`product-image-${globalIndex}`} 
                                                    className={`cursor-pointer flex flex-col items-center justify-center w-20 py-1.5 border border-dashed rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group ${productImageChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                >
                                                    <i className="fas fa-cloud-upload-alt text-gray-400 group-hover:text-primary-500 mb-0.5"></i>
                                                    <span className="text-[9px] font-medium text-gray-500 group-hover:text-primary-600">Upload</span>
                                                </label>
                                                ) : <span className="text-[10px] text-gray-400">-</span>
                                            )}
                                            {productImageChanged && (
                                                <div className="mt-1 text-[9px] leading-tight text-center">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.productImage, 'productImage')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.productImage, 'productImage')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.generate || 'No'}</div>
                                            ) : (
                                            <select
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${isProductFieldChanged(globalIndex, 'generate', row.generate) ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                value={row.generate || 'No'}
                                                onChange={(e) => handleGenerateChange(globalIndex, e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentCode || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400 ${componentCodeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'} ${row.generate === 'No' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                placeholder="Code" 
                                                value={row.componentCode} 
                                                readOnly={isManager || row.generate === 'No'}
                                                onChange={(e)=>handleProductComponentCodeChange(globalIndex,e.target.value)} 
                                            />
                                            )}
                                            {componentCodeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.componentCode, 'componentCode')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.componentCode, 'componentCode')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.systemCode || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center bg-gray-50 cursor-not-allowed ${systemCodeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                                                placeholder="System Code" 
                                                value={row.systemCode || ''} 
                                                readOnly
                                            />
                                            )}
                                            {systemCodeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.systemCode, 'systemCode')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.systemCode, 'systemCode')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentDescription || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${componentDescriptionChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                placeholder="Description" 
                                                value={row.componentDescription} 
                                                onChange={(e)=>handleRowChange(globalIndex,'componentDescription',e.target.value)} 
                                            />
                                            )}
                                            {componentDescriptionChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.componentDescription, 'componentDescription')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.componentDescription, 'componentDescription')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierName || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${supplierNameChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                placeholder="Supplier Name" 
                                                value={row.supplierName} 
                                                onChange={(e)=>handleRowChange(globalIndex,'supplierName',e.target.value)} 
                                            />
                                            )}
                                            {supplierNameChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.supplierName, 'supplierName')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.supplierName, 'supplierName')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierType || '-'}</div>
                                            ) : (
                                            <select
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${supplierTypeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                value={row.supplierType || ''}
                                                onChange={(e) => handleRowChange(globalIndex, 'supplierType', e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                <option value="Contract Manufacture">Contract Manufacture</option>
                                                <option value="Co-Processer">Co-Processer</option>
                                                <option value="Co-Packaging">Co-Packaging</option>
                                            </select>
                                            )}
                                            {supplierTypeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.supplierType, 'supplierType')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.supplierType, 'supplierType')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierCategory || '-'}</div>
                                            ) : (
                                            <select
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${supplierCategoryChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                value={row.supplierCategory || ''}
                                                onChange={(e) => handleRowChange(globalIndex, 'supplierCategory', e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                <option value="Producer">Producer</option>
                                                <option value="Importer">Importer</option>
                                                <option value="Brand Owner">Brand Owner</option>
                                            </select>
                                            )}
                                            {supplierCategoryChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.supplierCategory, 'supplierCategory')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.supplierCategory, 'supplierCategory')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.generateSupplierCode || 'No'}</div>
                                            ) : (
                                            <select
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${generateSupplierCodeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                value={row.generateSupplierCode || 'No'}
                                                onChange={(e) => handleGenerateSupplierCodeChange(globalIndex, e.target.value)}
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                            )}
                                            {generateSupplierCodeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.generateSupplierCode, 'generateSupplierCode')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.generateSupplierCode, 'generateSupplierCode')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierCode || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400 ${supplierCodeChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'} ${row.generateSupplierCode !== 'Yes' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                placeholder="Supplier Code" 
                                                value={row.supplierCode} 
                                                readOnly={row.generateSupplierCode !== 'Yes'}
                                                onChange={(e)=>handleRowChange(globalIndex,'supplierCode',e.target.value)} 
                                            />
                                            )}
                                            {supplierCodeChanged && (
                                                <div className="mt-1 text-[9px] leading-tight">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.supplierCode, 'supplierCode')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.supplierCode, 'supplierCode')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            {!isManager && (
                                            <input 
                                                type="file" 
                                                id={`component-image-${globalIndex}`} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e)=>handleFileChange(globalIndex,'componentImage',e.target.files[0])} 
                                            />
                                            )}
                                            {row.componentImage ? (
                                                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border shadow-sm hover:border-primary-300 transition-all ${componentImageChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                                                    <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                                        {(typeof row.componentImage === 'string' || row.componentImage instanceof File) && (
                                                            <img 
                                                                src={typeof row.componentImage === 'string' ? resolveUrl(row.componentImage) : URL.createObjectURL(row.componentImage)} 
                                                                alt="Preview" 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {e.target.style.display='none';}}
                                                            />
                                                        )}
                                                        <i className={`fas fa-image text-gray-400 text-xs absolute inset-0 m-auto flex items-center justify-center ${(typeof row.componentImage === 'string' || row.componentImage instanceof File) ? '-z-10' : ''}`}></i>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <a 
                                                            href={typeof row.componentImage === 'string' ? resolveUrl(row.componentImage) : (row.componentImage instanceof File ? URL.createObjectURL(row.componentImage) : '#')} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 leading-none"
                                                            title="View Image"
                                                        >
                                                            View
                                                        </a>
                                                        {!isManager && (
                                                        <label 
                                                            htmlFor={`component-image-${globalIndex}`} 
                                                            className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700 leading-none"
                                                            title="Change Image"
                                                        >
                                                            Change
                                                        </label>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                !isManager ? (
                                                <label 
                                                    htmlFor={`component-image-${globalIndex}`} 
                                                    className={`cursor-pointer flex flex-col items-center justify-center w-20 py-1.5 border border-dashed rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group ${componentImageChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`}
                                                >
                                                    <i className="fas fa-cloud-upload-alt text-gray-400 group-hover:text-primary-500 mb-0.5"></i>
                                                    <span className="text-[9px] font-medium text-gray-500 group-hover:text-primary-600">Upload</span>
                                                </label>
                                                ) : <span className="text-[10px] text-gray-400">-</span>
                                            )}
                                            {componentImageChanged && (
                                                <div className="mt-1 text-[9px] leading-tight text-center">
                                                    <div className="text-gray-500">Prev: {formatProductFieldValue(prevRow.componentImage, 'componentImage')}</div>
                                                    <div className="text-primary-700 font-bold">Now: {formatProductFieldValue(row.componentImage, 'componentImage')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {!isManager && (
                                    <td className={`px-2 py-2 whitespace-nowrap align-middle sticky right-0 border-l border-gray-100 group-hover:bg-gray-50 ${row._validationError ? 'bg-red-50' : 'bg-white'}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            {row._validationError && (
                                                <Tooltip title={row._validationError}>
                                                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-[9px] font-bold whitespace-nowrap cursor-help">
                                                        Error
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {rowChanged && !row._validationError && (
                                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold whitespace-nowrap">
                                                    Changed
                                                </span>
                                            )}
                                            <button
                                                onClick={() => saveRow(globalIndex)}
                                                className="p-1.5 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all hover:scale-110"
                                                title="Save Row"
                                            >
                                                {savingRow === globalIndex ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                            </button>
                                            <button
                                                onClick={() => cancelRow(globalIndex)}
                                                className="p-1.5 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
                                                title="Cancel Changes"
                                            >
                                                <i className="fas fa-undo text-xs"></i>
                                            </button>
                                            <button 
                                                onClick={()=>removeRow(globalIndex)} 
                                                className="p-1.5 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all hover:scale-110"
                                                title="Remove Row"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </td>
                                    )}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={productRows.length}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setItemsPerPage}
                />

                <div className="flex justify-end mt-4" />
                </>
                )}
                {subTab === 'supplier-compliance' && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-gray-800">Supplier Compliance</h2>
                        <div className="flex gap-2">
                            {!isManager && (
                            <>
                            <input
                                type="file"
                                ref={fileInputSupplierRef}
                                onChange={handleSupplierExcelUpload}
                                accept=".xlsx, .xls"
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputSupplierRef.current?.click()} 
                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <FileExcelOutlined /> Upload Excel
                            </button>
                            <button
                                onClick={handleSupplierTemplateDownload}
                                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <FileExcelOutlined /> Template
                            </button>
                            <button 
                                onClick={handleSupplierExport} 
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-file-export"></i> Export Excel
                            </button>
                            <Popconfirm
                                title="Are you sure you want to delete all rows?"
                                onConfirm={handleSupplierDeleteAll}
                                okText="Yes"
                                cancelText="No"
                            >
                                <button 
                                    disabled={isSupplierBulkSaving || supplierRows.length === 0}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DeleteOutlined /> Delete All
                                </button>
                            </Popconfirm>
                            <button 
                                onClick={handleSupplierBulkSave} 
                                disabled={isSupplierBulkSaving}
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSupplierBulkSaving ? <i className="fas fa-spinner fa-spin"></i> : <SaveOutlined />} Save All
                            </button>
                            <button onClick={addSupplierRow} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs">
                                <i className="fas fa-plus"></i> Add Supplier
                            </button>
                            </>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                            <thead className={isManager ? "bg-green-50" : "bg-gray-50"}>
                                <tr>
                                    {[
                                        { label: '#', width: 'w-12 text-center' },
                                        { label: 'System Code', width: 'min-w-[250px]' },
                                        { label: 'Component Code', width: 'min-w-[120px]' },
                                        { label: 'Component Description', width: 'min-w-[200px]' },
                                        { label: 'Name of Supplier', width: 'min-w-[150px]' },
                                        { label: 'Supplier Status', width: 'min-w-[120px]' },
                                        { label: 'Food Grade', width: 'min-w-[120px]' },
                                        { label: 'EPR Certificate Number', width: 'min-w-[150px]' },
                                        { label: 'FSSAI Lic No', width: 'min-w-[150px]' },
                                        { label: 'Actions', width: 'min-w-[100px]' }
                                    ].filter(h => !isManager || (h.label !== 'Actions' && h.label !== 'System Code')).map((header) => (
                                        <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 ${isManager ? "bg-green-50" : "bg-gray-50"} ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200 z-20' : 'z-10'}`}>
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentSupplierRows.map((row, index) => {
                                    const idx = indexOfFirstSupplierRow + index;
                                    const isFoodGradeYes = (row.foodGrade || '').trim().toLowerCase() === 'yes';
                                    const disableFssai = !row.componentCode || !isFoodGradeYes;
                                    return (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150 group">
                                        <td className="px-2 py-2 text-center text-xs text-black align-middle font-bold">{idx + 1}</td>
                                        {!isManager && (
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5 font-medium">
                                                    {systemCodeOptions.find(opt => opt.code === row.systemCode)?.label || row.systemCode || '-'}
                                                </div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.systemCode}
                                                onChange={(e) => handleSystemCodeSelect(idx, e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                {systemCodeOptions.map(opt => (
                                                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                                                ))}
                                            </select>
                                            )}
                                        </td>
                                        )}
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentCode || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.componentCode}
                                                onChange={(e) => handleSupplierCodeSelect(idx, e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                {componentOptions.map(opt => (
                                                    <option key={opt.code} value={opt.code}>{opt.code}{opt.description ? ` - ${opt.description}` : ''}</option>
                                                ))}
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentDescription || '-'}</div>
                                            ) : (
                                            <input 
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                placeholder="Description" 
                                                value={row.componentDescription} 
                                                onChange={(e)=>handleSupplierChange(idx,'componentDescription',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierName || '-'}</div>
                                            ) : (
                                            <input 
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                placeholder="Supplier Name" 
                                                value={row.supplierName} 
                                                onChange={(e)=>handleSupplierChange(idx,'supplierName',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>

                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierStatus || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.supplierStatus}
                                                onChange={(e) => handleSupplierChange(idx, 'supplierStatus', e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                <option value="Registered">Registered</option>
                                                <option value="Unregistered">Unregistered</option>
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.foodGrade || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.foodGrade}
                                                onChange={(e) => handleSupplierChange(idx, 'foodGrade', e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.eprCertificateNumber || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full text-xs rounded focus:ring-1 block px-2 py-1.5 transition-all hover:border-primary-400 ${
                                                    row.supplierStatus !== 'Registered'
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white border-gray-300 text-gray-700 focus:ring-primary-500 focus:border-primary-500'
                                                }`}
                                                placeholder="EPR Cert No" 
                                                value={row.eprCertificateNumber} 
                                                onChange={(e)=>handleSupplierChange(idx,'eprCertificateNumber',e.target.value)}
                                                disabled={isManager || row.supplierStatus !== 'Registered'}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.fssaiLicNo || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full text-xs rounded focus:ring-1 block px-2 py-1.5 transition-all hover:border-primary-400 ${
                                                    disableFssai
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white border-gray-300 text-gray-700 focus:ring-primary-500 focus:border-primary-500'
                                                }`}
                                                placeholder="FSSAI Lic No" 
                                                value={row.fssaiLicNo} 
                                                onChange={(e)=>handleSupplierChange(idx,'fssaiLicNo',e.target.value)} 
                                                disabled={isManager || disableFssai}
                                            />
                                            )}
                                        </td>
                                        {!isManager && (
                                        <td className="px-2 py-2 whitespace-nowrap align-middle sticky right-0 bg-white border-l border-gray-100 group-hover:bg-gray-50 min-w-[140px]">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => saveSupplierRow(idx)}
                                                    className="p-1 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all"
                                                    title="Save Row"
                                                >
                                                    {savingSupplierRow === idx ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                                </button>
                                                <button
                                                    onClick={() => cancelSupplierRow(idx)}
                                                    className="p-1 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                                                    title="Cancel Changes"
                                                >
                                                    <i className="fas fa-undo text-xs"></i>
                                                </button>
                                                <button 
                                                    onClick={()=>removeSupplierRow(idx)} 
                                                    className="p-1 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                                    title="Remove Row"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                ); })}
                            </tbody>
                        </table>
                    </div>

                <Pagination
                    currentPage={supplierPage}
                    totalItems={supplierRows.length}
                    pageSize={supplierItemsPerPage}
                    onPageChange={setSupplierPage}
                    onPageSizeChange={setSupplierItemsPerPage}
                />

                <div className="flex justify-end mt-4" />
                </div>
                )}
                {subTab === 'component-details' && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-gray-800">Component Details</h2>
                    <div className="flex gap-2">
                        {!isManager && (
                        <>
                        <input
                            type="file"
                            ref={fileInputComponentRef}
                            onChange={handleComponentExcelUpload}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button 
                            onClick={() => fileInputComponentRef.current?.click()} 
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <FileExcelOutlined /> Upload Excel
                        </button>
                        <button
                            onClick={handleComponentTemplateDownload}
                            className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <FileExcelOutlined /> Template
                        </button>
                        <button 
                            onClick={handleComponentExport} 
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <i className="fas fa-file-export"></i> Export Excel
                        </button>
                        <button 
                            onClick={handleComponentBulkSave}
                            disabled={isComponentBulkSaving || componentRows.length === 0}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isComponentBulkSaving ? <i className="fas fa-spinner fa-spin"></i> : <SaveOutlined />} Save All
                        </button>
                        <Popconfirm
                            title="Are you sure you want to delete all rows?"
                            onConfirm={handleComponentDeleteAll}
                            okText="Yes"
                            cancelText="No"
                        >
                            <button 
                                disabled={isComponentBulkSaving || componentRows.length === 0}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DeleteOutlined /> Delete All
                            </button>
                        </Popconfirm>
                        <button onClick={addComponentRow} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs">
                            <i className="fas fa-plus"></i> Add Component
                        </button>
                        </>
                        )}
                    </div>
                </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                            <thead className={isManager ? "bg-green-50" : "bg-gray-50"}>
                                <tr>
                                    {[
                                        { label: '#', width: 'w-12 text-center' },
                                        { label: 'System Code', width: 'min-w-[250px]' },
                                        { label: 'SKU Code', width: 'min-w-[150px]' },
                                        { label: 'Component code', width: 'min-w-[120px]' },
                                        { label: 'Component Descrecption', width: 'min-w-[200px]' },
                                        { label: 'Supplier Name', width: 'min-w-[200px]' },
                                        { label: 'Polymer Type', width: 'min-w-[130px]' },
                                        { label: 'Component Polymer', width: 'min-w-[130px]' },
                                        { label: 'Polymer Code', width: 'min-w-[100px]' },
                                        { label: 'Category', width: 'min-w-[130px]' },
                                        { label: 'Category II Type', width: 'min-w-[180px]' },
                                        { label: 'Container Capacity', width: 'min-w-[220px]' },
                                        { label: 'Monolayer / Multilayer', width: 'min-w-[150px]' },
                                        { label: 'Thickness (Micron)', width: 'min-w-[130px]' },
                                        { label: 'Actions', width: 'min-w-[140px]' }
                                    ].filter(h => !isManager || (h.label !== 'Actions' && h.label !== 'System Code')).map((header) => (
                                        <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 ${isManager ? "bg-green-50" : "bg-gray-50"} ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200 z-20' : 'z-10'}`}>
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {currentComponentRows.map((row, localIdx) => {
                                const idx = indexOfFirstComponentRow + localIdx;
                                return (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150 group">
                                    <td className="px-2 py-2 text-center text-xs text-black align-middle font-bold">{idx + 1}</td>
                                    {!isManager && (
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <select
                                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400"
                                            value={row.systemCode || ''}
                                            onChange={(e) => handleComponentChange(idx, 'systemCode', e.target.value)}
                                            disabled={isManager}
                                        >
                                            <option value="">Select</option>
                                            {systemCodeOptions.map(opt => (
                                                <option key={opt.code} value={opt.code}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    )}
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        {isManager ? (
                                            <div className="text-center text-xs text-gray-700 py-1.5">{row.skuCode || '-'}</div>
                                        ) : (
                                        <input
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded cursor-not-allowed block px-2 py-1.5 transition-all hover:border-primary-400"
                                            placeholder="SKU Code"
                                            value={row.skuCode || ''}
                                            readOnly
                                        />
                                        )}
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        {isManager ? (
                                            <div className="text-center text-xs text-gray-700 py-1.5">{row.componentCode || '-'}</div>
                                        ) : (
                                        <select
                                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400"
                                            value={row.componentCode}
                                            disabled={isManager}
                                        onChange={(e) => {
                                                const code = e.target.value;
                                                const match = componentOptions.find(opt => opt.code === code);
                                                handleComponentChange(idx,'componentCode',code);
                                                if (match) {
                                                    handleComponentChange(idx,'componentDescription',match.description || '');
                                                }
                                                const candidates = supplierRows.filter(r => (r.componentCode || '').trim() === (code || '').trim());
                                                const registered = candidates.find(r => r.supplierStatus === 'Registered' && (r.supplierName || '').trim());
                                                const supplierName = (registered?.supplierName || candidates[0]?.supplierName || '') || '';
                                                handleComponentChange(idx,'supplierName', supplierName);
                                            }}
                                            >
                                                <option value="">Select</option>
                                                {componentOptions.map(opt => (
                                                    <option key={opt.code} value={opt.code}>
                                                        {opt.code}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentDescription || '-'}</div>
                                            ) : (
                                            <input 
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                placeholder="Description" 
                                                value={row.componentDescription} 
                                                onChange={(e)=>handleComponentChange(idx,'componentDescription',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierName || '-'}</div>
                                            ) : (
                                            <input 
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                placeholder="Supplier Name" 
                                                value={row.supplierName} 
                                                onChange={(e)=>handleComponentChange(idx,'supplierName',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.polymerType || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.polymerType}
                                                onChange={(e) => handleComponentChange(idx, 'polymerType', e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                {POLYMER_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.componentPolymer || '-'}</div>
                                            ) : (
                                            <input 
                                                className={`w-full border ${
                                                    row.polymerType && row.polymerType !== 'Others' && row.componentPolymer && row.polymerType.toLowerCase() !== row.componentPolymer.toLowerCase()
                                                    ? 'bg-red-100 border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500' 
                                                    : 'bg-white border-gray-300 text-gray-700 focus:ring-primary-500 focus:border-primary-500'
                                                } text-xs rounded focus:ring-1 block px-2 py-1.5 transition-all hover:border-primary-400`}
                                                placeholder="Component Polymer" 
                                                value={row.componentPolymer} 
                                                onChange={(e)=>handleComponentChange(idx,'componentPolymer',e.target.value)} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.polymerCode || '-'}</div>
                                            ) : (
                                            <input 
                                                type="number"
                                                min="1"
                                                max="7"
                                                className={`w-full border ${
                                                    row.polymerCode && (row.polymerCode < 1 || row.polymerCode > 7)
                                                    ? 'bg-red-100 border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500' 
                                                    : 'bg-white border-gray-300 text-gray-700 focus:ring-primary-500 focus:border-primary-500'
                                                } text-xs rounded focus:ring-1 block px-2 py-1.5 transition-all hover:border-primary-400`}
                                                placeholder="1-7" 
                                                value={row.polymerCode || ''} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleComponentChange(idx, 'polymerCode', val);
                                                }} 
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.category || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.category}
                                                disabled={isManager}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    handleComponentChange(idx, 'category', value);
                                                    if (value !== 'Category I') {
                                                        handleComponentChange(idx, 'containerCapacity', '');
                                                    }
                                                    if (value !== 'Category II') {
                                                        handleComponentChange(idx, 'categoryIIType', '');
                                                    }
                                                }}
                                            >
                                                <option value="">Select</option>
                                                {CATEGORIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.categoryIIType || '-'}</div>
                                            ) : (
                                            <select
                                                className={`w-full bg-white border text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${
                                                    row.category !== 'Category II'
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700'
                                                }`}
                                                disabled={isManager || row.category !== 'Category II'}
                                                value={row.category === 'Category II' ? (row.categoryIIType || '') : ''}
                                                onChange={(e) => handleComponentChange(idx, 'categoryIIType', e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                {CATEGORY_II_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.containerCapacity || '-'}</div>
                                            ) : (
                                            <select
                                                className={`w-full text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${
                                                    row.category !== 'Category I'
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white border-gray-300 text-gray-700'
                                                }`}
                                                disabled={isManager || row.category !== 'Category I'}
                                                value={row.containerCapacity}
                                                onChange={(e) => handleComponentChange(idx, 'containerCapacity', e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                {CONTAINER_CAPACITIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                        </td>
                                       
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {isManager ? (
                                                <div className="text-center text-xs text-gray-700 py-1.5">{row.layerType || '-'}</div>
                                            ) : (
                                            <select
                                                className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                value={row.layerType}
                                                onChange={(e) => handleComponentChange(idx, 'layerType', e.target.value)}
                                                disabled={isManager}
                                            >
                                                <option value="">Select</option>
                                                {LAYER_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle">
                                            {(() => {
                                                const raw = (row.thickness ?? '').toString();
                                                const t = parseFloat(raw);
                                                let baseClass = 'border-gray-300 text-gray-700 focus:ring-primary-500 focus:border-primary-500';

                                                if (!Number.isNaN(t)) {
                                                    const cat = row.category || '';
                                                    const type = row.categoryIIType || '';
                                                    let min = 50;

                                                    if (cat === 'Category II') {
                                                        if (type === 'Carry Bags') {
                                                            min = 120;
                                                        } else if (type === 'Plastic Sheet or like material') {
                                                            min = 50;
                                                        } else if (type === 'Non-woven Plastic carry bags') {
                                                            min = 60;
                                                        }
                                                    }

                                                    if (t > min) {
                                                        baseClass = 'border-green-500 text-green-600 focus:ring-green-500 focus:border-green-500';
                                                    } else {
                                                        baseClass = 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500';
                                                    }
                                                }

                                                return isManager ? (
                                                    <div className={`text-center text-xs py-1.5 font-bold ${baseClass.includes('border-green') ? 'text-green-600' : baseClass.includes('border-red') ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {row.thickness || '-'}
                                                    </div>
                                                ) : (
                                                    <input 
                                                        type="number"
                                                        className={`w-full bg-white border ${baseClass} text-xs font-bold rounded focus:ring-1 block px-2 py-1.5 transition-all hover:border-primary-400`}
                                                        placeholder="Micron" 
                                                        value={row.thickness} 
                                                        onChange={(e)=>handleComponentChange(idx,'thickness',e.target.value)} 
                                                        readOnly={isManager}
                                                        disabled={isManager}
                                                    />
                                                );
                                            })()}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap align-middle sticky right-0 bg-white border-l border-gray-100 group-hover:bg-gray-50">
                                            {!isManager && (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => saveComponentRow(idx)}
                                                    className="p-1.5 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all hover:scale-110"
                                                    title="Save Row"
                                                >
                                                    {savingComponentRow === idx ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                                </button>
                                                <button
                                                    onClick={() => cancelComponentRow(idx)}
                                                    className="p-1.5 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
                                                    title="Cancel Changes"
                                                >
                                                    <i className="fas fa-undo text-xs"></i>
                                                </button>
                                                <button 
                                                    onClick={()=>removeComponentRow(idx)} 
                                                    className="p-1.5 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all hover:scale-110"
                                                    title="Remove Row"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>
                                            )}
                                        </td>
                                    </tr>
                                ); })}
                            </tbody>
                        </table>
                    </div>

                <Pagination
                    currentPage={componentPage}
                    totalItems={componentRows.length}
                    pageSize={componentItemsPerPage}
                    onPageChange={setComponentPage}
                    onPageSizeChange={setComponentItemsPerPage}
                />
                
                <div className="flex justify-end mt-4" />
                </div>
                )}
                {subTab === 'recycled-quantity' && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2 border-primary-100 flex items-center gap-2">
                                <span className="bg-primary-50 text-primary-700 p-1.5 rounded-md"><i className="fas fa-dolly"></i></span>
                                Monthly Procurement Data
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            {!isManager && (
                            <>
                            <label className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105">
                                <i className="fas fa-file-excel"></i> Upload Excel
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleMonthlyExcelUpload} />
                            </label>
                            <button
                                onClick={handleMonthlyTemplateDownload}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-file-excel"></i> Template
                            </button>
                            <button
                                onClick={handleMonthlyExport}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-download"></i> Export Excel
                            </button>
                            <button
                                onClick={() => {
                                    const payload = {
                                        type,
                                        itemId,
                                        rows: monthlyRows
                                    };
                                    api.post(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), payload)
                                       .then(res => {
                                           notify('success', 'Saved all monthly procurement rows');
                                           const rows = res.data?.data || monthlyRows;
                                           setMonthlyRows(rows);
                                           setLastSavedMonthlyRows(rows);
                                       })
                                       .catch(err => notify('error', err.response?.data?.message || 'Save failed'));
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-save"></i> Save All
                            </button>
                            <Popconfirm
                                title="Are you sure you want to delete all rows?"
                                onConfirm={() => {
            setMonthlyRows([{
                systemCode:'', supplierName:'', componentCode:'', componentDescription:'',
                polymerType:'', componentPolymer:'', category:'', dateOfInvoice:'',
                monthName:'', quarter:'', yearlyQuarter:'', purchaseQty:'', uom:'',
                perPieceWeightKg:'', monthlyPurchaseMt:'', recycledPercent:'', recycledQty:'', recycledRate: '', recycledQrtAmount: '',
                virginQty: '', virginRate: '', virginQtyAmount: '',
                rcPercentMentioned: ''
            }]);
                                    setLastSavedMonthlyRows([]);
                                }}
                                okText="Yes"
                                cancelText="No"
                            >
                                <button
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                                >
                                    <i className="fas fa-trash"></i> Delete All
                                </button>
                            </Popconfirm>
                            <button
                                onClick={() => setMonthlyRows(prev => [...prev, {
                                    systemCode:'', skuCode: '', supplierName:'', componentCode:'', componentDescription:'',
                                    polymerType:'', componentPolymer:'', category:'', dateOfInvoice:'',
                                    monthName:'', quarter:'', yearlyQuarter:'', purchaseQty:'', uom:'',
                                    perPieceWeightKg:'', monthlyPurchaseMt:'', recycledPercent:'', recycledQty:'', recycledRate: '', recycledQrtAmount: '',
                                    virginQty: '', virginRate: '', virginQtyAmount: '',
                                    rcPercentMentioned: ''
                                }])}
                                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs"
                            >
                                <i className="fas fa-plus"></i> Add Row
                            </button>
                            </>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-h-[450px] mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className={isManager ? "bg-green-50 sticky top-0 z-10" : "bg-gray-50 sticky top-0 z-10"}>
                                <tr>
                                    <th className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 w-12 ${isManager ? "bg-green-50" : "bg-gray-50"}`}>#</th>
            {[
            'System Code','SKU Code','Supplier Name','Component code','Component Description','Polymer Type','Component Polymer','Category','Date of invoice','Purchase Qty','UOM','Per Piece Weight','Monthly purchase MT','Recycled %','Recycled QTY','Recycled Rate','Recycled Qrt Amount','Virgin Rate','Virgin Qty','Virgin Qty Amount','RC % Mentioned','Actions'
        ].filter(label => !isManager || (label !== 'Actions' && label !== 'System Code')).map((label) => (
            <th key={label} className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 ${label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200 bg-white' : ''} ${label === 'UOM' ? 'min-w-[100px]' : ''} ${isManager ? "bg-green-50" : "bg-gray-50"}`}>
                {label}
            </th>
        ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {monthlyRows.slice(indexOfFirstMonthlyRow, indexOfLastMonthlyRow).map((row, index) => {
                                    const idx = indexOfFirstMonthlyRow + index;
                                    const computeMonthly = (r) => {
                                        const uom = r.uom || '';
                                        if (uom === 'Not Applicable') return 0;
                                        const qty = Number(r.purchaseQty) || 0;
                                        const wt = Number(r.perPieceWeightKg) || 0;
                                        if (uom === 'Units' || uom === 'Nos' || uom === 'Roll') return (qty * wt) / 1000;
                                        if (uom === 'KG') return qty / 1000;
                                        if (uom === 'MT') return qty;
                                        return Number(r.monthlyPurchaseMt) || 0;
                                    };
                                    const fillFromSystemCode = (curr) => {
                                        const sc = (curr.systemCode || '').trim();
                                        if (!sc) return curr;
                                        const selected = systemCodeOptions.find(opt => opt.code === sc);
                                        if (selected && selected.data) {
                                            curr.skuCode = selected.data.skuCode || '';
                                            curr.supplierName = selected.data.supplierName || '';
                                            curr.componentCode = selected.data.componentCode || '';
                                            curr.componentDescription = selected.data.componentDescription || '';
                                        }
                                        const compMatch = componentRows.find(r => (r.componentCode || '').trim() === (curr.componentCode || '').trim());
                                        if (compMatch) {
                                            curr.polymerType = compMatch.polymerType || '';
                                            curr.componentPolymer = compMatch.componentPolymer || '';
                                            curr.category = compMatch.category || '';
                                        }
                                        return curr;
                                    };
                                    const updateField = (field, value) => {
                                        setMonthlyRows(prev => {
                                            const copy = [...prev];
                                            let curr = { ...copy[idx], [field]: value };
                                            if (field === 'uom' && value === 'Not Applicable') {
                                                curr.purchaseQty = 0;
                                                curr.perPieceWeightKg = 0;
                                                curr.recycledPercent = 0;
                                            }
                                            if (field === 'recycledPercent') {
                                                curr.recycledPercent = value;
                                            }
                                            if (field === 'systemCode') {
                                                curr = fillFromSystemCode(curr);
                                            }
                                            if (field === 'dateOfInvoice') {
                                                const dateVal = value.trim();
                                                let mName = '';
                                                let qName = '';
                                                let yName = '';
                                                if (dateVal === 'Not Applicable') {
                                                    mName = 'Not Applicable';
                                                    qName = 'Not Applicable';
                                                    yName = 'Not Applicable';
                                                } else {
                                                    const parts = dateVal.split('-');
                                                    if (parts.length === 3) {
                                                        const d = parseInt(parts[0], 10);
                                                        const m = parseInt(parts[1], 10);
                                                        const y = parseInt(parts[2], 10);
                                                        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
                                                            const dateObj = new Date(y, m - 1, d);
                                                            mName = dateObj.toLocaleString('default', { month: 'long' });
                                                            if (m >= 4 && m <= 6) qName = 'Q1';
                                                            else if (m >= 7 && m <= 9) qName = 'Q2';
                                                            else if (m >= 10 && m <= 12) qName = 'Q3';
                                                            else qName = 'Q4';
                                                            if (m >= 4 && m <= 9) yName = 'H1';
                                                            else yName = 'H2';
                                                        }
                                                    }
                                                }
                                                curr.monthName = mName;
                                                curr.quarter = qName;
                                                curr.yearlyQuarter = yName;
                                            }
                                            curr.monthlyPurchaseMt = computeMonthly(curr);
                                            const pctRaw = parseFloat(curr.recycledPercent) || 0;
                                            const pctFraction = pctRaw > 1 ? pctRaw / 100 : pctRaw;
                                            curr.recycledQty = curr.monthlyPurchaseMt * pctFraction;
                                            const rRate = parseFloat(curr.recycledRate) || 0;
                                            curr.recycledQrtAmount = ((curr.recycledQty * 1000) * rRate).toFixed(3);
                                            const monthlyMt = parseFloat(curr.monthlyPurchaseMt) || 0;
                                            const recQty = parseFloat(curr.recycledQty) || 0;
                                            curr.virginQty = (monthlyMt - recQty).toFixed(3);
                                            const vQty = parseFloat(curr.virginQty) || 0;
                                            const vRate = parseFloat(curr.virginRate) || 0;
                                            curr.virginQtyAmount = ((vQty * 1000) * vRate).toFixed(3);
                                            copy[idx] = curr;
                                            return copy;
                                        });
                                    };
                                    const handleRecycledPercentBlur = () => {
                                        setMonthlyRows(prev => {
                                            const copy = [...prev];
                                            const row = { ...copy[idx] };
                                            const pctRaw = parseFloat(row.recycledPercent) || 0;
                                            const pctFraction = pctRaw > 1 ? pctRaw / 100 : pctRaw;
                                            row.recycledPercent = pctFraction ? pctFraction.toFixed(3) : '';
                                            const monthlyMt = parseFloat(row.monthlyPurchaseMt) || 0;
                                            row.recycledQty = monthlyMt ? (monthlyMt * pctFraction).toFixed(3) : '';
                                            const rRate = parseFloat(row.recycledRate) || 0;
                                            const rQtyVal = parseFloat(row.recycledQty) || 0;
                                            row.recycledQrtAmount = ((rQtyVal * 1000) * rRate).toFixed(3);
                                            row.virginQty = (monthlyMt - rQtyVal).toFixed(3);
                                            const vQty = parseFloat(row.virginQty) || 0;
                                            const vRate = parseFloat(row.virginRate) || 0;
                                            row.virginQtyAmount = ((vQty * 1000) * vRate).toFixed(3);
                                            copy[idx] = row;
                                            return copy;
                                        });
                                    };
                                    const saveRow = async () => {
                                        setSavingMonthlyRow(idx);
                                        const payload = {
                                            type,
                                            itemId,
                                            rowIndex: idx,
                                            row: monthlyRows[idx]
                                        };
                                        try {
                                            const res = await api.post(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), payload);
                                            const rows = res.data?.data || monthlyRows;
                                            setMonthlyRows(rows);
                                            setLastSavedMonthlyRows(rows);
                                            notify('success', 'Row saved');
                                        } catch (err) {
                                            notify('error', err.response?.data?.message || 'Save failed');
                                        } finally {
                                            setSavingMonthlyRow(null);
                                        }
                                    };
                                    const cancelRow = () => {
                                        const saved = lastSavedMonthlyRows[idx];
                                        if (saved) {
                                            setMonthlyRows(prev => {
                                                const copy = [...prev];
                                                copy[idx] = saved;
                                                return copy;
                                            });
                                        } else {
                                            setMonthlyRows(prev => prev.filter((_, i) => i !== idx));
                                        }
                                    };
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-center font-bold text-black">{idx + 1}</td>
                                            {[
                                                { key:'systemCode', placeholder:'System Code', type:'select-system' },
                                                { key:'skuCode', placeholder:'SKU Code', type:'text', readOnly: true },
                                                { key:'supplierName', placeholder:'Supplier Name', type:'text' },
                                                { key:'componentCode', placeholder:'Component code', type:'text' },
                                                { key:'componentDescription', placeholder:'Component Description', type:'text' },
                                                { key:'polymerType', placeholder:'Polymer Type', type:'text' },
                                                { key:'componentPolymer', placeholder:'Component Polymer', type:'text' },
                                                { key:'category', placeholder:'Category', type:'text' },
                                                { key:'dateOfInvoice', placeholder:'Date of invoice', type:'text' },
                                                { key:'purchaseQty', placeholder:'Purchase Qty', type:'number' },
                                                { key:'uom', type:'select' },
                                                { key:'perPieceWeightKg', placeholder:'Per Piece Weight', type:'number' },
                                            ].filter(col => !isManager || col.key !== 'systemCode').map((col) => (
                                                <td key={col.key} className="px-2 py-2 whitespace-nowrap align-middle">
                                                    {isManager ? (
                                                        <div className="text-center text-xs text-gray-700 py-1.5">
                                                            {col.type === 'select-system' 
                                                                ? (systemCodeOptions.find(opt => opt.code === row[col.key])?.label || row[col.key] || '-')
                                                                : (row[col.key] || '-')
                                                            }
                                                        </div>
                                                    ) : (
                                                    <>
                                                    {col.type === 'select' ? (
                                                        <select
                                                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                            value={row.uom || ''}
                                                            onChange={(e)=>updateField('uom', e.target.value)}
                                                            disabled={isManager}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="MT">MT</option>
                                                            <option value="KG">KG</option>
                                                            <option value="Units">Units</option>
                                                            <option value="Roll">Roll</option>
                                                            <option value="Nos">Nos</option>
                                                            <option value="Not Applicable">Not Applicable</option>
                                                        </select>
                                                    ) : col.type === 'select-system' ? (
                                                        <select
                                                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400"
                                                            value={row.systemCode || ''}
                                                            onChange={(e) => updateField('systemCode', e.target.value)}
                                                            disabled={isManager}
                                                        >
                                                            <option value="">Select</option>
                                                            {systemCodeOptions.map(opt => (
                                                                <option key={opt.code} value={opt.code}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={col.type}
                                                            className={`w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${
                                                                (col.key === 'dateOfInvoice' && row[col.key] === 'Not Applicable') || 
                                                                (row.uom === 'Not Applicable' && ['purchaseQty', 'perPieceWeightKg'].includes(col.key)) 
                                                                ? 'bg-gray-100 cursor-not-allowed' : ''
                                                            }`}
                                                            placeholder={col.placeholder}
                                                            value={row[col.key] ?? ''}
                                                            onChange={(e)=>updateField(col.key, e.target.value)}
                                                            readOnly={isManager || col.readOnly || (col.key === 'dateOfInvoice' && row[col.key] === 'Not Applicable') || (row.uom === 'Not Applicable' && ['purchaseQty', 'perPieceWeightKg'].includes(col.key))}
                                                            disabled={isManager}
                                                        />
                                                    )}
                                                    </>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.monthlyPurchaseMt ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Monthly purchase MT"
                                                    value={row.monthlyPurchaseMt ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.recycledPercent ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="text"
                                                    className={`w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${row.uom === 'Not Applicable' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    placeholder="Recycled %"
                                                    value={row.recycledPercent ?? ''}
                                                    onChange={(e)=>updateField('recycledPercent', e.target.value)}
                                                    onBlur={handleRecycledPercentBlur}
                                                    readOnly={isManager || row.uom === 'Not Applicable'}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.recycledQty ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Recycled QTY"
                                                    value={row.recycledQty ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.recycledRate ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    placeholder="Recycled Rate"
                                                    value={row.recycledRate ?? ''}
                                                    onChange={(e)=>updateField('recycledRate', e.target.value)}
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.recycledQrtAmount ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Recycled Qrt Amount"
                                                    value={row.recycledQrtAmount ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.virginRate ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    placeholder="Virgin Rate"
                                                    value={row.virginRate ?? ''}
                                                    onChange={(e)=>updateField('virginRate', e.target.value)}
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.virginQty ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Virgin Qty"
                                                    value={row.virginQty ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.virginQtyAmount ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Virgin Qty Amount"
                                                    value={row.virginQtyAmount ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.rcPercentMentioned || '-'}</div>
                                                ) : (
                                                <select
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    value={row.rcPercentMentioned || ''}
                                                    onChange={(e)=>updateField('rcPercentMentioned', e.target.value)}
                                                    disabled={isManager}
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap align-middle text-center sticky right-0 bg-white min-w-[140px]">
                                                {!isManager && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={saveRow}
                                                        className="p-1 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all"
                                                        title="Save Row"
                                                    >
                                                        {savingMonthlyRow === idx ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                                    </button>
                                                    <button
                                                        onClick={cancelRow}
                                                        className="p-1 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                                                        title="Cancel Changes"
                                                    >
                                                        <i className="fas fa-undo text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={()=>setMonthlyRows(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-1 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                                        title="Remove Row"
                                                    >
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={monthlyPage}
                        totalItems={monthlyRows.length}
                        pageSize={monthlyItemsPerPage}
                        onPageChange={setMonthlyPage}
                        onPageSizeChange={setMonthlyItemsPerPage}
                    />
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2 border-primary-100 flex items-center gap-2">
                                <span className="bg-primary-50 text-primary-700 p-1.5 rounded-md"><i className="fas fa-recycle"></i></span>
                                Recycled Quantity Used
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            {!isManager && (
                            <>
                            <label className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105">
                                <i className="fas fa-file-excel"></i> Upload Excel
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleRecycledExcelUpload} />
                            </label>
                            <button
                                onClick={handleRecycledTemplateDownload}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-file-excel"></i> Template
                            </button>
                            <button
                                onClick={handleRecycledExport}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-download"></i> Export Excel
                            </button>
                            <button
                                onClick={handleRecycledBulkSave}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <i className="fas fa-save"></i> Save All
                            </button>
                            <Popconfirm
                                title="Are you sure you want to delete all rows?"
                                onConfirm={handleRecycledDeleteAll}
                                okText="Yes"
                                cancelText="No"
                            >
                                <button
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                                >
                                    <i className="fas fa-trash"></i> Delete All
                                </button>
                            </Popconfirm>
                            <button onClick={addRecycledRow} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs">
                                <i className="fas fa-plus"></i> Add Row
                            </button>
                            </>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-h-[500px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className={isManager ? "bg-green-50 sticky top-0 z-10" : "bg-gray-50 sticky top-0 z-10"}>
                                <tr>
                                    <th className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 w-12 ${isManager ? "bg-green-50" : "bg-gray-50"}`}>#</th>
                                    {[
                                        { label: 'System Code', width: 'min-w-[250px]' },
                                        { label: 'Component Code', width: 'min-w-[150px]' },
                                        { label: 'Description', width: 'min-w-[200px]' },
                                        { label: 'Supplier Name', width: 'min-w-[200px]' },
                                        { label: 'Category', width: 'min-w-[150px]' },
                                        { label: 'Annual Consumption', width: 'min-w-[160px]' },
                                        { label: 'UOM', width: 'min-w-[100px]' },
                                        { label: 'Per Piece Weight', width: 'min-w-[140px]' },
                                        { label: 'Annual Consumption in MT', width: 'min-w-[180px]' },
                                        { label: 'Used Recycled %', width: 'min-w-[140px]' },
                                        { label: 'Used Recycled Qty MT', width: 'min-w-[180px]' },
                                        { label: 'Actions', width: 'min-w-[100px]' }
                                    ].filter(h => !isManager || (h.label !== 'Actions' && h.label !== 'System Code')).map((header) => (
                                        <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold ${isManager ? "text-green-800" : "text-gray-700"} uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200 ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200 bg-white' : ''} ${isManager ? "bg-green-50" : "bg-gray-50"}`}>
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentRecycledRows.map((row, index) => {
                                    const idx = indexOfFirstRecycledRow + index;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center font-bold text-black">{idx + 1}</td>
                                    {!isManager && (
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        <select
                                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all text-center hover:border-primary-400"
                                            value={row.systemCode || ''}
                                            onChange={(e) => handleRecycledChange(idx, 'systemCode', e.target.value)}
                                            disabled={isManager}
                                        >
                                            <option value="">Select</option>
                                            {systemCodeOptions.map(opt => (
                                                <option key={opt.code} value={opt.code}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    )}
                                    <td className="px-2 py-2 whitespace-nowrap align-middle">
                                        {isManager ? (
                                            <div className="text-center text-xs text-gray-700 py-1.5">{row.componentCode || '-'}</div>
                                        ) : (
                                        <select
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    value={row.componentCode}
                                                    onChange={(e)=>handleRecycledCodeSelect(idx, e.target.value)}
                                                    disabled={isManager}
                                                >
                                                    <option value="">Select</option>
                                                    {componentOptions.map(opt => (
                                                        <option key={opt.code} value={opt.code}>
                                                            {opt.code}
                                                        </option>
                                                    ))}
                                                </select>
                                        )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.componentDescription || '-'}</div>
                                                ) : (
                                                <input
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    placeholder="Description"
                                                    value={row.componentDescription}
                                                    onChange={(e)=>handleRecycledChange(idx,'componentDescription',e.target.value)}
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.supplierName || '-'}</div>
                                                ) : (
                                                <input
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    placeholder="Supplier Name"
                                                    value={row.supplierName || ''}
                                                    onChange={(e)=>handleRecycledChange(idx,'supplierName',e.target.value)}
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.category || '-'}</div>
                                                ) : (
                                                <input
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    placeholder="Category"
                                                    value={row.category}
                                                    onChange={(e)=>handleRecycledChange(idx,'category',e.target.value)}
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.annualConsumption ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className={`w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${row.uom === 'Not Applicable' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    placeholder="Annual Consumption"
                                                    value={row.annualConsumption ?? ''}
                                                    onChange={(e)=>handleRecycledChange(idx,'annualConsumption',e.target.value)}
                                                    readOnly={isManager || row.uom === 'Not Applicable'}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.uom || '-'}</div>
                                                ) : (
                                                <select
                                                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400"
                                                    value={row.uom}
                                                    onChange={(e)=>handleRecycledChange(idx,'uom',e.target.value)}
                                                    disabled={isManager}
                                                >
                                                    <option value="">Select</option>
                                                    <option value="MT">MT</option>
                                                    <option value="KG">KG</option>
                                                    <option value="Units">Units</option>
                                                    <option value="Roll">Roll</option>
                                                    <option value="Nos">Nos</option>
                                                    <option value="Not Applicable">Not Applicable</option>
                                                </select>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.perPieceWeight ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className={`w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${row.uom === 'Not Applicable' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    placeholder="Per Piece Weight"
                                                    value={row.perPieceWeight ?? ''}
                                                    onChange={(e)=>handleRecycledChange(idx,'perPieceWeight',e.target.value)}
                                                    readOnly={isManager || row.uom === 'Not Applicable'}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.annualConsumptionMt ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Annual Consumption in MT"
                                                    value={row.annualConsumptionMt ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.usedRecycledPercent ?? ''}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className={`w-full bg-white border border-gray-300 text-gray-700 text-xs rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 block px-2 py-1.5 transition-all hover:border-primary-400 ${row.uom === 'Not Applicable' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    placeholder="Used Recycled %"
                                                    value={row.usedRecycledPercent ?? ''}
                                                    onChange={(e)=>handleRecycledChange(idx,'usedRecycledPercent',e.target.value)}
                                                    onBlur={()=>handleRecycledPercentBlur(idx)}
                                                    readOnly={isManager || row.uom === 'Not Applicable'}
                                                    disabled={isManager}
                                                />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                                                {isManager ? (
                                                    <div className="text-center text-xs text-gray-700 py-1.5">{row.usedRecycledQtyMt ?? 0}</div>
                                                ) : (
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded block px-2 py-1.5"
                                                    placeholder="Used Recycled Qty MT"
                                                    value={row.usedRecycledQtyMt ?? 0}
                                                    readOnly
                                                />
                                                )}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap align-middle text-center sticky right-0 bg-white min-w-[140px]">
                                                {!isManager && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => saveRecycledRow(idx)}
                                                        className="p-1 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all"
                                                        title="Save Row"
                                                    >
                                                        {savingRecycledRow === idx ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                                    </button>
                                                    <button
                                                        onClick={() => cancelRecycledRow(idx)}
                                                        className="p-1 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                                                        title="Cancel Changes"
                                                    >
                                                        <i className="fas fa-undo text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={()=>removeRecycledRow(idx)}
                                                        className="p-1 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                                        title="Remove Row"
                                                    >
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={recycledPage}
                        totalItems={recycledRows.length}
                        pageSize={recycledItemsPerPage}
                        onPageChange={setRecycledPage}
                        onPageSizeChange={setRecycledItemsPerPage}
                    />

                <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-gray-800">Summary of Category</h2>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                        <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                            <thead className="bg-gray-50">
                                <tr>
                                    {[
                                        { label: 'Category', width: 'min-w-[160px]' },
                                        { label: 'Total Used Recycled %', width: 'min-w-[180px]' },
                                        { label: 'Total Used Recycled Qty MT', width: 'min-w-[220px]' }
                                    ].map((header) => (
                                        <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap bg-gray-50 sticky top-0 border-b border-gray-200 ${header.width}`}>
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {categorySummary.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-3 py-4 text-center text-gray-400">No data</td>
                                    </tr>
                                ) : (
                                    categorySummary.map((row, index) => {
                                        const percentFraction = Number(row.totalUsedPercent) || 0;
                                        const percent = percentFraction * 100;
                                        const target =
                                            row.category === 'Category II'
                                                ? 10
                                                : row.category === 'Category I'
                                                    ? 30
                                                    : null;
                                        const isCompliant = target === null ? null : percent >= target;
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-center font-bold text-gray-700">{row.category}</td>
                                                <td className={`px-3 py-2 text-center font-bold ${isCompliant === null ? 'text-gray-600' : isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                                                    {percent.toFixed(3)}
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-700">{Number(row.totalUsedQtyMt).toFixed(3)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
                )}

                {changeSummaryData.length > 0 && (
                    <Card 
                        className="mt-6 border-amber-200 shadow-lg"
                        title={
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsChangeSummaryExpanded(!isChangeSummaryExpanded)}>
                                <span className="text-amber-800 flex items-center gap-2">
                                    <i className={`fas fa-chevron-${isChangeSummaryExpanded ? 'down' : 'right'} transition-transform duration-200`}></i>
                                    <i className="fas fa-history"></i> Change Summary
                                </span>
                                <Tag color="orange">{changeSummaryData.length} Changes</Tag>
                            </div>
                        }
                        styles={{ body: { display: isChangeSummaryExpanded ? 'block' : 'none', padding: 0 } }}
                    >
                        <Table
                            dataSource={changeSummaryData}
                            pagination={false}
                            rowKey="id"
                            size="small"
                            scroll={{ x: 'max-content' }}
                            columns={[
                                { title: 'Table', dataIndex: 'table', key: 'table', align: 'center', width: 120 },
                                { title: 'Row #', dataIndex: 'row', key: 'row', align: 'center', width: 80 },
                                { title: 'Field', dataIndex: 'field', key: 'field', align: 'center', width: 150 },
                                { 
                                    title: 'Previous Value', 
                                    dataIndex: 'prev', 
                                    key: 'prev', 
                                    align: 'left',
                                    width: 300,
                                    render: (text) => <div className="max-w-[300px] break-all whitespace-pre-wrap line-through text-gray-500 text-xs">{text}</div>
                                },
                                { 
                                    title: 'New Value', 
                                    dataIndex: 'curr', 
                                    key: 'curr', 
                                    align: 'left',
                                    width: 300,
                                    render: (text) => <div className="max-w-[300px] break-all whitespace-pre-wrap font-bold text-primary-700 text-xs">{text}</div>
                                },
                                { title: 'User', dataIndex: 'user', key: 'user', align: 'center', width: 120 },
                                { 
                                    title: 'Date', 
                                    dataIndex: 'at', 
                                    key: 'at', 
                                    align: 'center',
                                    width: 150,
                                    render: (date) => date ? new Date(date).toLocaleString() : '-'
                                }
                            ]}
                        />
                    </Card>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-500 italic">
                        * Ensure all mandatory fields are filled before saving.
                    </p>
                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait text-xs"
                        >
                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : null}
                            Next Step <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
    );
};

export default ProductCompliance;
