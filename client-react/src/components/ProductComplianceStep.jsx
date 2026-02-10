import { API_ENDPOINTS } from '../services/apiEndpoints';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Table } from 'antd';
import { FaPlus, FaTrash, FaSave, FaTimes, FaFileExcel, FaDownload, FaUpload, FaSpinner, FaEdit, FaImage, FaExclamationTriangle, FaHistory, FaFilePdf } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import useAuth from '../hooks/useAuth';
import DocumentViewerModal from './DocumentViewerModal';

// Helper Functions
const getCompanyShortName = (name) => {
    if (!name) return 'UNK';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 0) return parts[0].substring(0, 3).toUpperCase();
    return 'UNK';
};

const getPlantCode = (name) => {
    if (!name) return 'PLT';
    return name.substring(0, 4);
};

const getSupplierShortName = (name) => {
    if (!name) return 'UNK';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 0) return parts[0].substring(0, 3).toUpperCase();
    return 'UNK';
};

const getComparableProductValue = (val, field) => {
    if (field === 'productImage' || field === 'componentImage') {
         if (val instanceof File) return `${val.name}-${val.size}-${val.lastModified}`;
         return val || '';
    }
    return val === null || val === undefined ? '' : String(val).trim();
};

const formatProductFieldValue = (val, field) => {
    if (field === 'productImage' || field === 'componentImage') {
        if (val instanceof File) return val.name;
        if (typeof val === 'string' && val.startsWith('http')) return 'Image Link';
        return val || '-';
    }
    return val || '-';
};

const toAbsUrl = (p) => {
    if (!p) return '';
    if (typeof p !== 'string') return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
};

const loadImageAsDataUrl = async (url) => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read image'));
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
};

const ProductComplianceStep = ({ client, refreshData, plantNameFilter }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Coming Soon</h2>
            <p className="text-gray-500">This module is currently under development.</p>
        </div>
    );
};

// Original implementation preserved but renamed
const ProductComplianceStepOriginal = ({ client, refreshData, plantNameFilter }) => {
    const { user } = useAuth();
    const [selectedConsentId, setSelectedConsentId] = useState('');
    const [activeTab, setActiveTab] = useState('productCompliance');
    
    // Helper to normalize strings for comparison
    const normalize = (str) => str ? str.trim().toLowerCase() : '';

    // Derived Consents List for Dropdown
    const consents = useMemo(() => {
        if (!client?.productionFacility) return [];
        const list = [];
        
        /* CTE Excluded as per requirement
        client.productionFacility.cteDetailsList?.forEach((cte, idx) => {
            if (plantNameFilter && normalize(cte.plantName) !== normalize(plantNameFilter)) return;
            
            list.push({
                id: `cte-${idx}`,
                label: `CTE - ${cte.consentNo} (${cte.plantName || 'Plant'})`,
                type: 'CTE',
                index: idx,
                data: cte
            });
        });
        */
        
        client.productionFacility.ctoDetailsList?.forEach((cto, idx) => {
            if (plantNameFilter && normalize(cto.plantName) !== normalize(plantNameFilter)) return;

            list.push({
                id: `cto-${idx}`,
                label: `CTO - ${cto.consentOrderNo} (${cto.plantName || 'Plant'})`,
                type: 'CTO',
                index: idx,
                data: cto
            });
        });
        
        return list;
    }, [client, plantNameFilter]);

    // Select first consent by default if available
    useEffect(() => {
        if (consents.length > 0 && !selectedConsentId) {
            setSelectedConsentId(consents[0].id);
        }
    }, [consents, selectedConsentId]);

    const selectedConsent = useMemo(() => {
        return consents.find(c => c.id === selectedConsentId);
    }, [consents, selectedConsentId]);

    return (
        <div className="space-y-6">
            {/* Consent Selector Removed as per requirement - defaulting to first consent */}
            {/* 
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                <label className="font-bold text-gray-700">Select Consent / Plant:</label>
                <select 
                    value={selectedConsentId} 
                    onChange={(e) => setSelectedConsentId(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                >
                    <option value="">-- Select Consent --</option>
                    {consents.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>
            </div>
            */}

            {selectedConsent ? (
                <div className="space-y-6 animate-fadeIn">
                    
                    <div className="bg-gray-100 p-1.5 rounded-lg mb-6">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'productCompliance', label: 'Product Compliance' },
                                { id: 'supplierCompliance', label: 'Supplier Compliance' },
                                { id: 'componentDetails', label: 'Component Details' },
                                { id: 'recycledQuantity', label: 'Recycled Quantity Used' }
                            ].map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all min-w-[140px]
                                            ${isActive 
                                                ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        <span className={isActive ? "font-bold" : ""}>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 shadow-sm p-6 min-h-[400px]">
                        
                        {activeTab === 'productCompliance' && (
                            <div className="animate-fadeIn">
                                <ProductComplianceTable 
                                    client={client}
                                    type={selectedConsent.type} 
                                    index={selectedConsent.index} 
                                    initialData={selectedConsent.data.productComplianceRows || []}
                                    refreshData={refreshData}
                                    item={selectedConsent.data}
                                />
                            </div>
                        )}

                        {activeTab === 'supplierCompliance' && (
                            <div className="animate-fadeIn">
                                <SupplierComplianceTable
                                    client={client}
                                    type={selectedConsent.type}
                                    index={selectedConsent.index}
                                    initialData={selectedConsent.data.productSupplierCompliance || []}
                                    refreshData={refreshData}
                                />
                            </div>
                        )}

                        {activeTab === 'componentDetails' && (
                            <div className="animate-fadeIn">
                                <ComponentDetailsTable
                                    client={client}
                                    type={selectedConsent.type}
                                    index={selectedConsent.index}
                                    initialData={selectedConsent.data.productComponentDetails || []}
                                    refreshData={refreshData}
                                />
                            </div>
                        )}

                        {activeTab === 'recycledQuantity' && (
                            <div className="animate-fadeIn">
                                <RecycledQuantityTable
                                    client={client}
                                    type={selectedConsent.type}
                                    index={selectedConsent.index}
                                    initialData={selectedConsent.data.productRecycledQuantity || []}
                                    refreshData={refreshData}
                                    productRows={selectedConsent.data.productComplianceRows || []}
                                />
                            </div>
                        )}

                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    No active consents found for this plant.
                </div>
            )}
        </div>
    );
};

// --- Generic Table Helper ---
const GenericTable = ({ 
    title, 
    columns, 
    rows, 
    setRows, 
    onSave, 
    loading, 
    onAddRow, 
    onDeleteRow,
    customButtons
}) => {
    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                {customButtons}
                <button className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    <FaFileExcel /> Upload Excel
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    <FaDownload /> Export Excel
                </button>
                <button 
                    onClick={() => setRows([])}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 border border-red-200"
                >
                    <FaTrash /> Delete All
                </button>
                <button 
                    onClick={onSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save All
                </button>
                <button 
                    onClick={onAddRow}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50"
                >
                    <FaPlus /> Add Row
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 ${col.width || 'min-w-[150px]'}`}>{col.label}</th>
                            ))}
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} className="px-4 py-2">
                                        {col.render ? col.render(row, idx) : (
                                            <input 
                                                type="text" 
                                                value={row[col.field] || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setRows(prev => {
                                                        const copy = [...prev];
                                                        copy[idx] = { ...copy[idx], [col.field]: newVal };
                                                        return copy;
                                                    });
                                                }}
                                                className="w-full p-1 border rounded text-xs"
                                                placeholder={col.placeholder || ''}
                                                readOnly={col.readOnly}
                                            />
                                        )}
                                    </td>
                                ))}
                                <td className="px-4 py-2 text-right">
                                    <button 
                                        onClick={() => onDeleteRow(idx)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 italic">
                                    No data added yet. Click "Add Row" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Sub-component: Product Compliance Table ---
const ProductComplianceTable = ({ client, type, index, initialData, refreshData, item }) => {
    const { user, isManager } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const fileInputRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [lastSavedRows, setLastSavedRows] = useState([]);

    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState('');
    const [viewerName, setViewerName] = useState('');

    const handleViewDocument = (urlOrFile, docType, docName) => {
        let url = '';
        if (typeof urlOrFile === 'string') {
            url = toAbsUrl(urlOrFile);
        } else if (urlOrFile instanceof File) {
            url = URL.createObjectURL(urlOrFile);
        }
        
        if (url) {
            setViewerUrl(url);
            setViewerName(docName || docType);
            setViewerOpen(true);
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => setCurrentPage(page);
    const handlePageSizeChange = (size) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };

    // System Code Backfilling (parity with PlantProcess)
    useEffect(() => {
        if (!client || !rows.length) return;

        const needsUpdate = rows.some(r => !r.systemCode);
        if (!needsUpdate) return;

        const companyShortName = getCompanyShortName(client?.clientName);
        const prefix = `${companyShortName}/Com/`;
        
        let maxNum = 0;
        rows.forEach(r => {
            const code = (r.systemCode || '').trim();
            if (code.startsWith(prefix)) {
                const numPart = code.substring(prefix.length);
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            }
        });

        // Prevent infinite loop by checking if we actually need to change state
        const updatedRows = rows.map(row => {
            if (!row.systemCode) {
                maxNum++;
                return {
                    ...row,
                    systemCode: `${prefix}${maxNum.toString().padStart(3, '0')}`
                };
            }
            return row;
        });

        // Only update if changes were made
        if (JSON.stringify(updatedRows) !== JSON.stringify(rows)) {
             setRows(updatedRows);
        }
    }, [client, rows.length]); // Depend on length to avoid cycle on every render if reference changes

    // Helper to strip completely empty template rows from initial data
    const sanitizeInitialRows = (data) => {
        if (!Array.isArray(data)) return [];
        return data.filter((row) => {
            const fieldsToCheck = [
                'packagingType',
                'skuCode',
                'skuDescription',
                'skuUom',
                'productImage',
                'componentCode',
                'componentDescription',
                'supplierName',
                'supplierCode',
                'componentImage'
            ];
            return fieldsToCheck.some((field) => {
                const val = row[field];
                return val !== undefined && val !== null && String(val).trim() !== '';
            });
        });
    };

    // Update local state when initialData changes (e.g. switching tabs/consents)
    useEffect(() => { 
        const cleaned = sanitizeInitialRows(initialData || []);
        setRows(cleaned);
        setLastSavedRows(cleaned.map(r => ({ ...r })));
    }, [initialData]);

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                toast.error('Excel file is empty');
                return;
            }

            const newRows = [];
            let currentAllRows = [...rows]; 

            const companyShortName = getCompanyShortName(client?.clientName);
            const plantCode = getPlantCode(item?.plantName); // Use item prop for plant name

            data.forEach((row, idx) => {
                // Helper to find value by regex patterns
                const getValue = (patterns) => {
                    const rowKeys = Object.keys(row);
                    for (const pattern of patterns) {
                        const match = rowKeys.find(k => pattern.test(k));
                        if (match && row[match] !== undefined) return String(row[match]).trim();
                    }
                    return '';
                };
                
                let packagingType = getValue([/packaging.*type/i]);
                let skuCode = getValue([/sku.*code/i, /^sku$/i]);
                let skuDescription = getValue([/sku.*desc/i]);
                let skuUom = getValue([/sku.*uom/i, /uom/i]);
                let generate = getValue([/^generate(?!.*supplier)/i, /^generate$/i]) || 'No';
                let componentCode = getValue([/component.*code/i]);
                let componentDescription = getValue([/component.*desc/i]);
                let supplierName = getValue([/supplier.*name/i]);
                let generateSupplierCode = getValue([/generate.*supplier/i]) || 'No';
                let supplierCode = getValue([/supplier.*code/i]);

                if (generate === 'No' && !componentCode) {
                     const match = currentAllRows.find(r => 
                        (r.skuCode || '').trim() === skuCode && 
                        (r.componentDescription || '').trim() === componentDescription
                     );
                     
                     if (match && match.componentCode) {
                         componentCode = match.componentCode;
                     } else {
                         // Generate logic for bulk
                         const prefix = `${companyShortName}/${plantCode}/Com/`;
                         let maxNum = 0;
                         currentAllRows.forEach(r => {
                             const code = (r.componentCode || '').trim();
                             if (code.startsWith(prefix)) {
                                 const numPart = code.substring(prefix.length);
                                 if (/^\d+$/.test(numPart)) {
                                     const num = parseInt(numPart, 10);
                                     if (!isNaN(num) && num > maxNum) maxNum = num;
                                 }
                             }
                         });
                         componentCode = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
                     }
                }
                
                if (generateSupplierCode === 'No' && !supplierCode) {
                     const match = currentAllRows.find(r => 
                        (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                        (r.supplierCode || '').trim()
                     );
                     
                     if (match && match.supplierCode) {
                         supplierCode = match.supplierCode;
                     } else {
                         const supplierShortName = getSupplierShortName(supplierName);
                         const prefix = `${supplierShortName}/${companyShortName}/`;
                         let maxNum = 0;
                         currentAllRows.forEach(r => {
                             const code = (r.supplierCode || '').trim();
                             if (code.startsWith(prefix)) {
                                 const numPart = code.substring(prefix.length);
                                 if (/^\d+$/.test(numPart)) {
                                     const num = parseInt(numPart, 10);
                                     if (!isNaN(num) && num > maxNum) maxNum = num;
                                 }
                             }
                         });
                         supplierCode = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
                     }
                }

                // System Code Generation
                const sysPrefix = `${companyShortName}/Com/`;
                let maxSysNum = 0;
                currentAllRows.forEach(r => {
                    if (r.systemCode && r.systemCode.startsWith(sysPrefix)) {
                        const numPart = r.systemCode.substring(sysPrefix.length);
                        if (/^\d+$/.test(numPart)) {
                            const num = parseInt(numPart, 10);
                            if (!isNaN(num) && num > maxSysNum) maxSysNum = num;
                        }
                    }
                });
                const systemCode = `${sysPrefix}${String(maxSysNum + 1).padStart(3, '0')}`;

                const newRow = {
                    packagingType,
                    skuCode,
                    skuDescription,
                    skuUom,
                    productImage: null,
                    generate,
                    componentCode,
                    systemCode,
                    componentDescription,
                    supplierName,
                    generateSupplierCode,
                    supplierCode,
                    componentImage: null
                };

                newRows.push(newRow);
                currentAllRows.push(newRow);
            });
            
            setRows(prev => [...prev, ...newRows]);
            toast.success(`${newRows.length} rows imported successfully`);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleRowChange = (rowIdx, field, value) => {
        setRows(prev => {
            const copy = [...prev];
            const updatedRow = { ...copy[rowIdx], [field]: value };

            // Logic for Auto-Generation (ported from PlantProcess)
            if (updatedRow.generate === 'No' && (field === 'skuCode' || field === 'componentDescription')) {
                const sku = (updatedRow.skuCode || '').trim();
                const desc = (updatedRow.componentDescription || '').trim();
                
                if (sku && desc) {
                   const existingMatch = copy.find((r, i) => 
                       i !== rowIdx && 
                       (r.skuCode || '').trim() === sku && 
                       (r.componentDescription || '').trim() === desc && 
                       (r.componentCode || '').trim()
                   );
                   
                   if (existingMatch) {
                       updatedRow.componentCode = existingMatch.componentCode;
                   } else {
                       // Generate logic would go here if we want strict uniqueness or new code generation
                       // For now, keeping it simple or manual
                   }
                }
            }

            // Supplier Code Generation Logic
            if (updatedRow.generateSupplierCode === 'No' && field === 'supplierName') {
                const supplierName = (updatedRow.supplierName || '').trim();
                let existingCode = '';
                if (supplierName) {
                    const match = copy.find((r, i) => 
                        i !== rowIdx && 
                        (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                        (r.supplierCode || '').trim()
                    );
                    if (match) existingCode = match.supplierCode;
                }

                if (existingCode) {
                    updatedRow.supplierCode = existingCode;
                } else {
                    const supplierShortName = getSupplierShortName(updatedRow.supplierName);
                    const companyShortName = getCompanyShortName(client?.clientName);
                    const prefix = `${supplierShortName}/${companyShortName}/`;
                    
                    let maxNum = 0;
                    copy.forEach((r) => {
                        const code = (r.supplierCode || '').trim();
                        if (code.startsWith(prefix)) {
                            const numPart = code.substring(prefix.length);
                            if (/^\d+$/.test(numPart)) {
                                const num = parseInt(numPart, 10);
                                if (!isNaN(num) && num > maxNum) maxNum = num;
                            }
                        }
                    });
                    
                    const nextNum = maxNum + 1;
                    updatedRow.supplierCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
                }
            }

            copy[rowIdx] = updatedRow;
            return copy;
        });
    };

    const handleGenerateChange = (rowIdx, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[rowIdx] = { ...copy[rowIdx], generate: value };
            
            if (value === 'Yes') {
                copy[rowIdx].componentCode = '';
            } else if (value === 'No') {
                // Auto-generate code if No
                const companyShortName = getCompanyShortName(client?.clientName);
                const plantCode = getPlantCode(item?.plantName); // Use item prop for plant name
                const prefix = `${companyShortName}/${plantCode}/Com/`;
                
                let maxNum = 0;
                copy.forEach((r, i) => {
                    if (i === rowIdx) return;
                    const code = (r.componentCode || '').trim();
                    if (code.startsWith(prefix)) {
                        const numPart = code.substring(prefix.length);
                        if (/^\d+$/.test(numPart)) {
                            const num = parseInt(numPart, 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    }
                });
                
                const nextNum = maxNum + 1;
                copy[rowIdx].componentCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
            }
            return copy;
        });
    };

    const handleGenerateSupplierCodeChange = (rowIdx, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[rowIdx] = { ...copy[rowIdx], generateSupplierCode: value };
            
            if (value === 'Yes') {
                copy[rowIdx].supplierCode = '';
            } else if (value === 'No') {
                const row = copy[rowIdx];
                const supplierShortName = getSupplierShortName(row.supplierName);
                const companyShortName = getCompanyShortName(client?.clientName);
                const prefix = `${supplierShortName}/${companyShortName}/`;
                
                let maxNum = 0;
                copy.forEach((r, i) => {
                    if (i === rowIdx) return;
                    const code = (r.supplierCode || '').trim();
                    if (code.startsWith(prefix)) {
                        const numPart = code.substring(prefix.length);
                        if (/^\d+$/.test(numPart)) {
                            const num = parseInt(numPart, 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    }
                });
                
                const nextNum = maxNum + 1;
                copy[rowIdx].supplierCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
            }
            return copy;
        });
    };

    const handleFileChange = (rowIdx, field, file) => {
        setRows(prev => {
            const copy = [...prev];
            copy[rowIdx] = { ...copy[rowIdx], [field]: file };
            return copy;
        });
    };

    const saveRow = async (idx) => {
        setSavingRow(idx);
        const row = rows[idx];
        const beforeRow = lastSavedRows[idx] || {};

        // Basic Validation
        if (!row.componentCode || !row.componentCode.trim()) {
            toast.error('Component Code is mandatory');
            setSavingRow(null);
            return;
        }

        try {
            const hasFiles = (row.productImage instanceof File) || (row.componentImage instanceof File);
            let savedRowForHistory = row;

            if (hasFiles) {
                const fd = new FormData();
                fd.append('type', type);
                fd.append('itemId', index); // Use index as itemId
                fd.append('rowIndex', idx);
                
                const rowJson = JSON.stringify({
                    ...row,
                    productImage: typeof row.productImage === 'string' ? row.productImage : '',
                    componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
                });
                fd.append('row', rowJson);
                
                if (row.productImage instanceof File) fd.append('productImage', row.productImage);
                if (row.componentImage instanceof File) fd.append('componentImage', row.componentImage);

                const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_UPLOAD(client._id), fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                const saved = res.data?.data?.row || row;
                savedRowForHistory = saved;
                
                setRows(prev => {
                    const copy = [...prev];
                    copy[idx] = saved;
                    return copy;
                });
            } else {
                const payload = {
                    type,
                    itemId: index,
                    rowIndex: idx,
                    row: {
                        ...row,
                        productImage: typeof row.productImage === 'string' ? row.productImage : '',
                        componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
                    }
                };
                await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(client._id), payload);
            }

            // History is handled by backend
            setLastSavedRows(prev => {
                const copy = [...prev];
                copy[idx] = savedRowForHistory;
                return copy;
            });
            
            toast.success('Row saved successfully');
            refreshData(); // Refresh parent data
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save row');
        } finally {
            setSavingRow(null);
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // Use bulk update endpoint or just loop? 
            // Original code used api.put on the whole array.
            // But if we want to support files, we should probably stick to row-by-row or a bulk endpoint that handles it?
            // For now, let's stick to the simple bulk update for "Save All" if no files are changed, 
            // or just use the PUT method which overwrites everything.
            // BUT, if we have mixed files, PUT might lose file data if not handled carefully.
            // Let's use the existing PUT for bulk save as it is faster, assuming files are already uploaded via row-save.
            
            const updatePath = `productionFacility.${type}.${index}.productComplianceRows`;
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(client._id), { [updatePath]: rows });
            toast.success("All data saved successfully");
            
            setLastSavedRows(rows.map(r => ({ ...r })));
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { 
            label: "PACKAGING TYPE", 
            field: "packagingType",
            width: "min-w-[160px]",
            render: (row, idx) => (
                <select 
                    value={row.packagingType}
                    onChange={(e) => handleRowChange(idx, 'packagingType', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    disabled={isManager}
                >
                    <option value="">Select</option>
                    <option value="Primary Packaging">Primary Packaging</option>
                    <option value="Secondary Packaging">Secondary Packaging</option>
                    <option value="Tertiary Packaging">Tertiary Packaging</option>
                </select>
            )
        },
        { 
            label: "INDUSTRY CATEGORY", 
            field: "industryCategory",
            width: "min-w-[180px]",
            render: (row, idx) => (
                <select 
                    value={row.industryCategory}
                    onChange={(e) => handleRowChange(idx, 'industryCategory', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    disabled={isManager}
                >
                    <option value="">Select</option>
                    <option value="Food & Beverage Packaging">Food & Beverage Packaging</option>
                    <option value="Personal Care & Cosmetics">Personal Care & Cosmetics</option>
                    <option value="Home Care / Household Products">Home Care / Household Products</option>
                    <option value="Pharmaceutical & Healthcare">Pharmaceutical & Healthcare</option>
                    <option value="Agriculture & Allied Products">Agriculture & Allied Products</option>
                    <option value="Electrical & Electronics Packaging">Electrical & Electronics Packaging</option>
                    <option value="Industrial & Institutional Packaging">Industrial & Institutional Packaging</option>
                    <option value="Retail & Carry Bags">Retail & Carry Bags</option>
                    <option value="Transport / Secondary / Tertiary Packaging">Transport / Secondary / Tertiary Packaging</option>
                    <option value="Consumer Durables Packaging">Consumer Durables Packaging</option>
                    <option value="Multi-Layered Plastic (MLP) Packaging">Multi-Layered Plastic (MLP) Packaging</option>
                    <option value="Others / Miscellaneous Plastics">Others / Miscellaneous Plastics</option>
                </select>
            )
        },
        { label: "SKU CODE", field: "skuCode", width: "min-w-[120px]" },
        { label: "SKU DESCRIPTION", field: "skuDescription", width: "min-w-[200px]" },
        { label: "SKU UOM", field: "skuUom", width: "min-w-[100px]" },
        { 
            label: "PRODUCT IMAGE", 
            field: "productImage",
            width: "min-w-[120px]",
            render: (row, idx) => (
                <div className="flex flex-col gap-2 items-center">
                    {row.productImage ? (
                        <div className="flex items-center gap-2">
                             {row.productImage instanceof File ? (
                                <span className="text-xs text-green-600 font-bold">New File</span>
                             ) : (
                                <button onClick={() => handleViewDocument(row.productImage, 'Product Image', 'Product Image')} className="text-xs text-blue-600 underline font-bold">View</button>
                             )}
                             {!isManager && (
                                 <label className="cursor-pointer text-xs text-gray-500 hover:text-orange-500">
                                     Change
                                     <input 
                                         type="file" 
                                         className="hidden" 
                                         onChange={(e) => {
                                             if (e.target.files[0]) handleFileChange(idx, 'productImage', e.target.files[0]);
                                         }}
                                     />
                                 </label>
                             )}
                        </div>
                    ) : (
                        !isManager ? (
                            <label className="cursor-pointer flex items-center gap-1 px-3 py-1 bg-white border border-dashed border-orange-300 rounded text-orange-600 text-xs hover:bg-orange-50">
                                <FaUpload /> Upload
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files[0]) handleFileChange(idx, 'productImage', e.target.files[0]);
                                    }}
                                />
                            </label>
                        ) : <span className="text-xs text-gray-400">-</span>
                    )}
                </div>
            )
        },
        { 
            label: "GENERATE", 
            field: "generate",
            width: "min-w-[100px]",
            render: (row, idx) => (
                <select 
                    value={row.generate}
                    onChange={(e) => handleGenerateChange(idx, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    disabled={isManager}
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            )
        },
        { label: "COMPONENT CODE", field: "componentCode", width: "min-w-[140px]" },
        { label: "SYSTEM CODE", field: "systemCode", width: "min-w-[140px]", readOnly: true },
        { label: "COMPONENT DESCRIPTION", field: "componentDescription", width: "min-w-[200px]" },
        { label: "SUPPLIER NAME", field: "supplierName", width: "min-w-[180px]" },
        {
            label: "SUPPLIER TYPE",
            field: "supplierType",
            width: "min-w-[180px]",
            render: (row, idx) => (
                <select
                    value={row.supplierType || ''}
                    onChange={(e) => handleRowChange(idx, 'supplierType', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    disabled={isManager}
                >
                    <option value="">Select</option>
                    <option value="Contract Manufacture">Contract Manufacture</option>
                    <option value="Co-Processer">Co-Processer</option>
                    <option value="Co-Packaging">Co-Packaging</option>
                </select>
            )
        },
        {
            label: "GENERATE SUPPLIER CODE",
            field: "generateSupplierCode",
            width: "min-w-[180px]",
            render: (row, idx) => (
                 <select 
                    value={row.generateSupplierCode || 'No'}
                    onChange={(e) => handleGenerateSupplierCodeChange(idx, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    disabled={isManager}
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            )
        },
        { label: "SUPPLIER CODE", field: "supplierCode", width: "min-w-[140px]" },
        { 
            label: "COMPONENT IMAGE", 
            field: "componentImage",
            width: "min-w-[120px]",
            render: (row, idx) => (
                <div className="flex flex-col gap-2 items-center">
                    {row.componentImage ? (
                        <div className="flex items-center gap-2">
                             {row.componentImage instanceof File ? (
                                <span className="text-xs text-green-600 font-bold">New File</span>
                             ) : (
                                <button onClick={() => handleViewDocument(row.componentImage, 'Component Image', 'Component Image')} className="text-xs text-blue-600 underline font-bold">View</button>
                             )}
                             {!isManager && (
                                 <label className="cursor-pointer text-xs text-gray-500 hover:text-orange-500">
                                     Change
                                     <input 
                                         type="file" 
                                         className="hidden" 
                                         onChange={(e) => {
                                             if (e.target.files[0]) handleFileChange(idx, 'componentImage', e.target.files[0]);
                                         }}
                                     />
                                 </label>
                             )}
                        </div>
                    ) : (
                        !isManager ? (
                            <label className="cursor-pointer flex items-center gap-1 px-3 py-1 bg-white border border-dashed border-orange-300 rounded text-orange-600 text-xs hover:bg-orange-50">
                                <FaUpload /> Upload
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files[0]) handleFileChange(idx, 'componentImage', e.target.files[0]);
                                    }}
                                />
                            </label>
                        ) : <span className="text-xs text-gray-400">-</span>
                    )}
                </div>
            )
        },
    ].filter(col => !(isManager && col.field === 'systemCode'));

    const handleDeleteRow = (idx) => {
        if (!window.confirm("Are you sure you want to delete this row?")) return;
        setRows(prev => prev.filter((_, i) => i !== idx));
        setLastSavedRows(prev => prev.filter((_, i) => i !== idx));
    };

    const handleProductDeleteAll = async () => {
        if (!window.confirm("Are you sure you want to delete all rows?")) return;
        setLoading(true);
        try {
            const payload = {
                type,
                itemId: index,
                rows: []
            };
            // Use specific endpoint for delete all if available, or just PUT empty array
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(client._id), { [`productionFacility.${type}.${index}.productComplianceRows`]: [] });
            setRows([]);
            setLastSavedRows([]);
            toast.success("All rows deleted");
            refreshData();
        } catch (err) {
            toast.error("Failed to delete rows");
        } finally {
            setLoading(false);
        }
    };

    const handleProductExport = () => {
        if (rows.length === 0) {
            toast.warning('No data to export');
            return;
        }

        const exportData = rows.map((row) => ({
            'Packaging Type': row.packagingType,
            'Industry Category': row.industryCategory,
            'SKU Code': row.skuCode,
            'SKU Description': row.skuDescription,
            'SKU UOM': row.skuUom,
            'Generate': row.generate || 'No',
            'Component Code': row.componentCode,
            'System Code': row.systemCode,
            'Component Description': row.componentDescription,
            'Supplier Name': row.supplierName,
            'Supplier Type': row.supplierType || '',
            'Generate Supplier Code': row.generateSupplierCode || 'No',
            'Supplier Code': row.supplierCode
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Compliance");
        XLSX.writeFile(wb, `Product_Compliance_${client.clientName}.xlsx`);
    };

    const handleSkuPdfReport = async () => {
        if (!rows.length) {
            toast.warning('No data to export');
            return;
        }

        setLoading(true);
        try {
            const grouped = {};
            rows.forEach((row) => {
                const key = (row.skuCode || 'NO SKU').toString().trim() || 'NO SKU';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
            });

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const marginX = 15;
            const marginBottom = 15;

            const drawHeader = (skuCode) => {
                doc.setFillColor(243, 244, 246);
                doc.rect(0, 0, pageWidth, 24, 'F');
                doc.setTextColor(17, 24, 39);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Product Compliance Audit Report', marginX, 12);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const clientName = client?.clientName || '';
                const plantName = item?.plantName || '';
                const typeLabel = type || '';
                const line = [clientName, plantName, typeLabel].filter(Boolean).join(' | ');
                if (line) {
                    doc.text(line, marginX, 18);
                }
                doc.setFont('helvetica', 'bold');
                doc.text(`SKU: ${skuCode}`, pageWidth - marginX, 12, { align: 'right' });
                doc.setDrawColor(209, 213, 219);
                doc.rect(marginX, 28, pageWidth - marginX * 2, 6);
                doc.setFontSize(9);
                doc.setTextColor(75, 85, 99);
                doc.text('Details', marginX + 2, 32);
                return 38;
            };

            const skuKeys = Object.keys(grouped);

            for (let i = 0; i < skuKeys.length; i++) {
                const skuCode = skuKeys[i];
                const skuRows = grouped[skuCode];

                if (i > 0) {
                    doc.addPage();
                }

                let currentY = drawHeader(skuCode);

                const firstRow = skuRows[0] || {};
                const packagingTypes = Array.from(new Set(skuRows.map(r => r.packagingType || '').filter(Boolean))).join(', ');
                const detailsBody = [
                    ['SKU Code', skuCode],
                    ['SKU Description', firstRow.skuDescription || ''],
                    ['SKU UOM', firstRow.skuUom || ''],
                    ['Packaging Type', packagingTypes || '']
                ];

                autoTable(doc, {
                    startY: currentY,
                    head: [['Field', 'Value']],
                    body: detailsBody,
                    theme: 'grid',
                    margin: { left: marginX, right: marginX },
                    styles: { fontSize: 9, cellPadding: 2 },
                    headStyles: { fillColor: [249, 115, 22], textColor: 255, halign: 'left' }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                const componentBody = skuRows.map((r, idx) => [
                    String(idx + 1),
                    r.componentCode || '',
                    r.componentDescription || '',
                    r.supplierName || '',
                    r.supplierCode || ''
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['#', 'Component Code', 'Component Description', 'Supplier Name', 'Supplier Code']],
                    body: componentBody,
                    theme: 'grid',
                    margin: { left: marginX, right: marginX },
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255 }
                });

                currentY = doc.lastAutoTable.finalY + 10;

                const imageUrls = [];
                skuRows.forEach((r) => {
                    const candidates = [r.productImage, r.componentImage];
                    candidates.forEach((c) => {
                        const abs = toAbsUrl(c);
                        if (abs && !imageUrls.includes(abs)) imageUrls.push(abs);
                    });
                });

                if (!imageUrls.length) {
                    if (currentY + 10 > pageHeight - marginBottom) {
                        doc.addPage();
                        currentY = drawHeader(skuCode);
                    }
                    doc.setFontSize(9);
                    doc.setTextColor(107, 114, 128);
                    doc.text('No images available for this SKU.', marginX, currentY);
                    continue;
                }

                const headingHeight = 6;
                if (currentY + headingHeight > pageHeight - marginBottom) {
                    doc.addPage();
                    currentY = drawHeader(skuCode);
                }

                doc.setFontSize(10);
                doc.setTextColor(55, 65, 81);
                doc.text('Images', marginX, currentY);
                currentY += 4;

                const cols = 3;
                const gapX = 4;
                const usableWidth = pageWidth - marginX * 2;
                const imageWidth = (usableWidth - gapX * (cols - 1)) / cols;
                const imageHeight = imageWidth;

                let colIndex = 0;

                for (let j = 0; j < imageUrls.length; j++) {
                    const url = imageUrls[j];
                    const dataUrl = await loadImageAsDataUrl(url);
                    if (!dataUrl) continue;

                    if (currentY + imageHeight > pageHeight - marginBottom) {
                        doc.addPage();
                        currentY = drawHeader(skuCode) + 4;
                        doc.setFontSize(10);
                        doc.setTextColor(55, 65, 81);
                        doc.text('Images', marginX, currentY);
                        currentY += 4;
                        colIndex = 0;
                    }

                    const x = marginX + colIndex * (imageWidth + gapX);
                    doc.setDrawColor(209, 213, 219);
                    doc.rect(x, currentY, imageWidth, imageHeight);

                    let format = 'JPEG';
                    const lower = url.toLowerCase();
                    if (lower.endsWith('.png')) format = 'PNG';

                    try {
                        doc.addImage(dataUrl, format, x + 1, currentY + 1, imageWidth - 2, imageHeight - 2);
                    } catch (e) {
                    }

                    colIndex += 1;
                    if (colIndex >= cols) {
                        colIndex = 0;
                        currentY += imageHeight + 4;
                    }
                }
            }

            const baseName = client?.clientName || 'Client';
            doc.save(`${baseName}_SKU_Audit_Report.pdf`);
            toast.success('SKU-wise audit PDF generated');
        } catch (err) {
            toast.error('Failed to generate SKU-wise PDF');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_HISTORY(client._id), { 
                params: { type, itemId: index } 
            });
            setHistoryData(res.data?.data || []);
            setShowHistory(true);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch history");
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                {!isManager && (
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".xlsx, .xls" 
                        onChange={handleExcelUpload} 
                    />
                )}
                <button 
                    onClick={fetchHistory}
                    disabled={loadingHistory}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 border border-gray-200"
                >
                    {loadingHistory ? <FaSpinner className="animate-spin" /> : <FaHistory />} History
                </button>
                {!isManager && (
                    <>
                        <button 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                            <FaFileExcel /> Upload Excel
                        </button>
                        <button 
                            onClick={handleProductExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        <button 
                            onClick={handleSkuPdfReport}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <FaFilePdf /> SKU Audit PDF
                        </button>
                        <button 
                            onClick={handleProductDeleteAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 border border-red-200"
                        >
                            <FaTrash /> Delete All
                        </button>
                        <button 
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save All
                        </button>
                        <button 
                            onClick={() => setRows(prev => [...prev, { generate: 'No', packagingType: '', skuCode: '', skuDescription: '', skuUom: '', productImage: '', componentCode: '', componentDescription: '', supplierName: '', supplierType: '', systemCode: '', generateSupplierCode: 'No', supplierCode: '', componentImage: '' }])}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50"
                        >
                            <FaPlus /> Add Product
                        </button>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {columns.filter(c => (!isManager || c.field !== 'ACTIONS') && c.field !== 'Actions').map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 ${col.width || 'min-w-[150px]'}`}>{col.label}</th>
                            ))}
                            {!isManager && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((row, idx) => {
                            const globalIdx = indexOfFirstItem + idx;
                            return (
                                <tr key={globalIdx} className="bg-white border-b hover:bg-gray-50">
                                    {columns.filter(c => (!isManager || c.field !== 'ACTIONS') && c.field !== 'Actions').map((col, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2">
                                            {col.render ? col.render(row, globalIdx) : (
                                                <input 
                                                    type="text" 
                                                    value={row[col.field] || ''}
                                                    onChange={(e) => handleRowChange(globalIdx, col.field, e.target.value)}
                                                    className="w-full p-1 border rounded text-xs"
                                                    readOnly={col.readOnly || isManager}
                                                    disabled={col.readOnly || isManager}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {!isManager && (
                                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => saveRow(globalIdx)}
                                                disabled={savingRow === globalIdx}
                                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                                title="Save Row"
                                            >
                                                {savingRow === globalIdx ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRow(globalIdx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Row"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 italic">
                                    No data added yet. {isManager ? '' : 'Click "Add Row" to start.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end">
                <Pagination
                    currentPage={currentPage}
                    totalItems={rows.length}
                    pageSize={itemsPerPage}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>

            {/* History Modal */}
            <Modal
                title="Change History"
                open={showHistory}
                onCancel={() => setShowHistory(false)}
                footer={null}
                width={1000}
                centered
            >
                <Table 
                    dataSource={historyData}
                    columns={[
                        { title: 'Table', dataIndex: 'table', key: 'table', align: 'left', width: 120 },
                        { title: 'Row', dataIndex: 'row', key: 'row', align: 'center', width: 80, render: (text) => `Row ${text}` },
                        { title: 'Date', dataIndex: 'at', render: d => d ? new Date(d).toLocaleString() : '-', width: 180 },
                        { title: 'User', dataIndex: 'user', width: 150 },
                        { title: 'Field', dataIndex: 'field', width: 150 },
                        { title: 'Previous', dataIndex: 'prev', render: t => <span className="line-through text-red-500 break-all">{t}</span> },
                        { title: 'Current', dataIndex: 'curr', render: t => <span className="font-bold text-green-600 break-all">{t}</span> }
                    ]}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey={(r, i) => i}
                    scroll={{ x: 'max-content' }}
                />
            </Modal>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                documentUrl={viewerUrl}
                documentName={viewerName}
            />
        </div>
    );
};

// --- Sub-component: Supplier Compliance Table ---
const SupplierComplianceTable = ({ client, type, index, initialData, refreshData }) => {
    const { user, isManager } = useAuth();
    const [rows, setRows] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [lastSavedRows, setLastSavedRows] = useState(initialData.map(r => ({ ...r })));
    const fileInputRef = useRef(null);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => setCurrentPage(page);
    const handlePageSizeChange = (size) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };

    useEffect(() => { 
        setRows(initialData);
        setLastSavedRows(initialData.map(r => ({ ...r })));
    }, [initialData]);

    const handleRowChange = (idx, field, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const saveRow = async (idx) => {
        setSavingRow(idx);
        const row = rows[idx];
        const beforeRow = lastSavedRows[idx] || {};

        try {
            const payload = {
                type,
                itemId: index,
                rowIndex: idx,
                row
            };
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(client._id), payload);
            const savedRowForHistory = res.data?.data?.row || row;

            // History is handled by backend
            setLastSavedRows(prev => {
                const copy = [...prev];
                copy[idx] = { ...savedRowForHistory };
                return copy;
            });

            toast.success("Row saved successfully");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save row");
        } finally {
            setSavingRow(null);
        }
    };

    const handleDeleteRow = (idx) => {
        if (!window.confirm("Are you sure you want to delete this row?")) return;
        setRows(prev => prev.filter((_, i) => i !== idx));
        setLastSavedRows(prev => prev.filter((_, i) => i !== idx));
        // Note: For full consistency, we might want to trigger a save or delete API here, 
        // but for now we follow the local delete pattern until "Save All" or row-save is triggered if needed.
        // But ProductComplianceTable sends delete request? No, it deletes locally and expects user to save?
        // Wait, ProductComplianceTable handleDeleteRow just removes from state. 
        // BUT handleProductDeleteAll calls API.
        // Actually, if we want row-level persistence, we should probably delete from backend too if it was saved?
        // For now, let's keep it local state delete, but user must click "Save All" or we implement individual delete API.
        // ProductComplianceTable didn't implement individual delete API in the snippet I saw, only handleProductDeleteAll.
        // So I will stick to local delete.
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("Are you sure you want to delete all rows?")) return;
        setLoading(true);
        try {
            const payload = { type, itemId: index, rows: [] };
            await api.post(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(client._id), payload);
            setRows([]);
            setLastSavedRows([]);
            toast.success("All rows deleted");
            refreshData();
        } catch (err) {
            toast.error("Failed to delete rows");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            const updatePath = `productionFacility.${type}.${index}.productSupplierCompliance`;
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(client._id), { [updatePath]: rows });
            toast.success("All data saved successfully");
            setLastSavedRows(rows.map(r => ({ ...r })));
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (rows.length === 0) {
            toast.warning('No data to export');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supplier Compliance");
        XLSX.writeFile(wb, `Supplier_Compliance_${client.clientName}.xlsx`);
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            if (data && data.length > 0) {
                // Basic mapping - assume headers match fields or simple auto-map
                const newRows = data.map(r => ({
                    componentCode: r['Component Code'] || r.componentCode || '',
                    componentDescription: r['Component Desc'] || r.componentDescription || '',
                    supplierName: r['Supplier Name'] || r.supplierName || '',
                    supplierType: r['Supplier Type'] || r.supplierType || '',
                    foodGrade: r['Food Grade'] || r.foodGrade || '',
                    eprCertificateNumber: r['EPR Cert No'] || r.eprCertificateNumber || '',
                    fssaiLicNo: r['FSSAI Lic No'] || r.fssaiLicNo || ''
                }));
                setRows(prev => [...prev, ...newRows]);
                toast.success(`Imported ${newRows.length} rows`);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const columns = [
        { label: "Component Code", field: "componentCode" },
        { label: "Component Desc", field: "componentDescription", width: "min-w-[200px]" },
        { label: "Supplier Name", field: "supplierName" },
        { label: "Supplier Type", field: "supplierType" },
        { label: "Food Grade", field: "foodGrade" },
        { label: "EPR Cert No", field: "eprCertificateNumber" },
        { label: "FSSAI Lic No", field: "fssaiLicNo" }
    ];

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                {!isManager && (
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                )}
                {!isManager && (
                    <>
                        <button 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                            <FaFileExcel /> Upload Excel
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        <button 
                            onClick={handleDeleteAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 border border-red-200"
                        >
                            <FaTrash /> Delete All
                        </button>
                        <button 
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save All
                        </button>
                        <button 
                            onClick={() => setRows(prev => [...prev, { componentCode: '', componentDescription: '', supplierName: '', supplierType: '', foodGrade: '', eprCertificateNumber: '', fssaiLicNo: '' }])}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50"
                        >
                            <FaPlus /> Add Row
                        </button>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 ${col.width || 'min-w-[150px]'}`}>{col.label}</th>
                            ))}
                            {!isManager && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((row, idx) => {
                            const globalIdx = indexOfFirstItem + idx;
                            return (
                                <tr key={globalIdx} className="bg-white border-b hover:bg-gray-50">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2">
                                            <input 
                                                type="text" 
                                                value={row[col.field] || ''}
                                                onChange={(e) => handleRowChange(globalIdx, col.field, e.target.value)}
                                                className="w-full p-1 border rounded text-xs"
                                                readOnly={isManager}
                                                disabled={isManager}
                                            />
                                        </td>
                                    ))}
                                    {!isManager && (
                                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => saveRow(globalIdx)}
                                                disabled={savingRow === globalIdx}
                                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                                title="Save Row"
                                            >
                                                {savingRow === globalIdx ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRow(globalIdx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Row"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 italic">
                                    No data added yet. {isManager ? '' : 'Click "Add Row" to start.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end">
                <Pagination
                    currentPage={currentPage}
                    totalItems={rows.length}
                    pageSize={itemsPerPage}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>
        </div>
    );
};

// --- Sub-component: Component Details Table ---
const ComponentDetailsTable = ({ client, type, index, initialData, refreshData }) => {
    const { user, isManager } = useAuth();
    const [rows, setRows] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [lastSavedRows, setLastSavedRows] = useState(initialData.map(r => ({ ...r })));
    const fileInputRef = useRef(null);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => setCurrentPage(page);
    const handlePageSizeChange = (size) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };

    useEffect(() => { 
        setRows(initialData);
        setLastSavedRows(initialData.map(r => ({ ...r })));
    }, [initialData]);

    const handleRowChange = (idx, field, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const saveRow = async (idx) => {
        setSavingRow(idx);
        const row = rows[idx];
        const beforeRow = lastSavedRows[idx] || {};

        try {
            const payload = {
                type,
                itemId: index,
                rowIndex: idx,
                row
            };
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(client._id), payload);
            const savedRowForHistory = res.data?.data?.row || row;

            // History is handled by backend
            setLastSavedRows(prev => {
                const copy = [...prev];
                copy[idx] = { ...savedRowForHistory };
                return copy;
            });

            toast.success("Row saved successfully");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save row");
        } finally {
            setSavingRow(null);
        }
    };

    const handleDeleteRow = (idx) => {
        if (!window.confirm("Are you sure you want to delete this row?")) return;
        setRows(prev => prev.filter((_, i) => i !== idx));
        setLastSavedRows(prev => prev.filter((_, i) => i !== idx));
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("Are you sure you want to delete all rows?")) return;
        setLoading(true);
        try {
            const payload = { type, itemId: index, rows: [] };
            await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(client._id), payload);
            setRows([]);
            setLastSavedRows([]);
            toast.success("All rows deleted");
            refreshData();
        } catch (err) {
            toast.error("Failed to delete rows");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            const updatePath = `productionFacility.${type}.${index}.productComponentDetails`;
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(client._id), { [updatePath]: rows });
            toast.success("All data saved successfully");
            setLastSavedRows(rows.map(r => ({ ...r })));
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (rows.length === 0) {
            toast.warning('No data to export');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Component Details");
        XLSX.writeFile(wb, `Component_Details_${client.clientName}.xlsx`);
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            if (data && data.length > 0) {
                 const newRows = data.map(r => ({
                    componentCode: r['Component Code'] || r.componentCode || '',
                    componentDescription: r['Component Desc'] || r.componentDescription || '',
                    polymerType: r['Polymer Type'] || r.polymerType || '',
                    componentPolymer: r['Comp Polymer'] || r.componentPolymer || '',
                    category: r['Category'] || r.category || '',
                    categoryIIType: r['Category II Type'] || r.categoryIIType || '',
                    containerCapacity: r['Container Cap'] || r.containerCapacity || '',
                    foodGrade: r['Food Grade'] || r.foodGrade || '',
                    layerType: r['Layer Type'] || r.layerType || '',
                    thickness: r['Thickness'] || r.thickness || '',
                    supplierName: r['Supplier Name'] || r.supplierName || ''
                }));
                setRows(prev => [...prev, ...newRows]);
                toast.success(`Imported ${newRows.length} rows`);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const columns = [
        { label: "Component Code", field: "componentCode" },
        { label: "Component Desc", field: "componentDescription", width: "min-w-[200px]" },
        { label: "Polymer Type", field: "polymerType" },
        { label: "Comp Polymer", field: "componentPolymer" },
        { label: "Category", field: "category" },
        { 
            label: "Category II Type", 
            field: "categoryIIType",
            render: (row, idx) => (
                <select
                    value={row.categoryIIType || ''}
                    onChange={(e) => handleRowChange(idx, 'categoryIIType', e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    disabled={isManager}
                >
                    <option value="">Select</option>
                    <option value="Carry Bags">Carry Bags</option>
                    <option value="Plastic Sheet or like material">Plastic Sheet or like material</option>
                    <option value="Non-woven Plastic carry bags">Non-woven Plastic carry bags</option>
                </select>
            )
        },
        { label: "Container Cap", field: "containerCapacity" },
        { label: "Food Grade", field: "foodGrade" },
        { label: "Layer Type", field: "layerType" },
        { label: "Thickness", field: "thickness" },
        { label: "Supplier Name", field: "supplierName" }
    ];

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                {!isManager && (
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                )}
                {!isManager && (
                    <>
                        <button 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                            <FaFileExcel /> Upload Excel
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        <button 
                            onClick={handleDeleteAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 border border-red-200"
                        >
                            <FaTrash /> Delete All
                        </button>
                        <button 
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save All
                        </button>
                        <button 
                            onClick={() => setRows(prev => [...prev, { componentCode: '', componentDescription: '', polymerType: '', componentPolymer: '', category: '', categoryIIType: '', containerCapacity: '', foodGrade: '', layerType: '', thickness: '', supplierName: '' }])}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50"
                        >
                            <FaPlus /> Add Row
                        </button>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 ${col.width || 'min-w-[150px]'}`}>{col.label}</th>
                            ))}
                            {!isManager && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((row, idx) => {
                            const globalIdx = indexOfFirstItem + idx;
                            return (
                                <tr key={globalIdx} className="bg-white border-b hover:bg-gray-50">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2">
                                            {col.field === 'categoryIIType' ? (
                                                <select
                                                    value={row.categoryIIType || ''}
                                                    onChange={(e) => handleRowChange(globalIdx, 'categoryIIType', e.target.value)}
                                                    className="w-full p-1 border rounded text-xs"
                                                    disabled={isManager}
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Carry Bags">Carry Bags</option>
                                                    <option value="Plastic Sheet or like material">Plastic Sheet or like material</option>
                                                    <option value="Non-woven Plastic carry bags">Non-woven Plastic carry bags</option>
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={row[col.field] || ''}
                                                    onChange={(e) => handleRowChange(globalIdx, col.field, e.target.value)}
                                                    className="w-full p-1 border rounded text-xs"
                                                    readOnly={isManager}
                                                    disabled={isManager}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {!isManager && (
                                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => saveRow(globalIdx)}
                                                disabled={savingRow === globalIdx}
                                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                                title="Save Row"
                                            >
                                                {savingRow === globalIdx ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRow(globalIdx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Row"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 italic">
                                    No data added yet. {isManager ? '' : 'Click "Add Row" to start.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end">
                <Pagination
                    currentPage={currentPage}
                    totalItems={rows.length}
                    pageSize={itemsPerPage}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>
        </div>
    );
};

// --- Sub-component: Recycled Quantity Table ---
const RecycledQuantityTable = ({ client, type, index, initialData, refreshData, productRows = [] }) => {
    const { user, isManager } = useAuth();
    const [rows, setRows] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const fileInputRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [lastSavedRows, setLastSavedRows] = useState([]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => setCurrentPage(page);
    const handlePageSizeChange = (size) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };

    useEffect(() => { 
        setRows(initialData);
        setLastSavedRows(initialData.map(r => ({ ...r })));
    }, [initialData]);

    // System Code Options (Derived from Product Compliance Rows)
    const systemCodeOptions = useMemo(() => {
        const uniqueMap = new Map();
        productRows.forEach(r => {
            const code = (r.systemCode || '').trim();
            if (code && !uniqueMap.has(code)) {
                uniqueMap.set(code, {
                    code,
                    componentCode: r.componentCode || '',
                    componentDescription: r.componentDescription || '',
                    supplierName: r.supplierName || '',
                    category: r.category || '' // Assuming category might exist in product rows or derived
                });
            }
        });
        
        return Array.from(uniqueMap.values()).map(item => ({
            code: item.code,
            label: `${item.code} | ${item.componentCode} | ${item.componentDescription}`,
            data: item
        }));
    }, [productRows]);

    const handleRowChange = (rowIdx, field, value) => {
        setRows(prev => {
            const copy = [...prev];
            const updatedRow = { ...copy[rowIdx], [field]: value };

            if (field === 'systemCode') {
                const selected = systemCodeOptions.find(opt => opt.code === value);
                if (selected && selected.data) {
                    updatedRow.componentCode = selected.data.componentCode;
                    updatedRow.componentDescription = selected.data.componentDescription;
                    updatedRow.supplierName = selected.data.supplierName;
                    if (selected.data.category) updatedRow.category = selected.data.category;
                }
            }

            if (field === 'uom' && value === 'Not Applicable') {
                updatedRow.annualConsumption = 0;
                updatedRow.perPieceWeight = 0;
                updatedRow.usedRecycledPercent = 0;
                updatedRow.annualConsumptionMt = 0;
                updatedRow.usedRecycledQtyMt = 0;
            }

            // Recalculate Annual Consumption MT
            let acMt = parseFloat(updatedRow.annualConsumptionMt) || 0;
            const ac = parseFloat(updatedRow.annualConsumption) || 0;
            const uom = updatedRow.uom;
            
            if (field === 'annualConsumption' || field === 'uom' || field === 'perPieceWeight') {
                if (uom === 'Not Applicable') {
                    acMt = 0;
                } else if (uom === 'KG') acMt = ac / 1000;
                else if (uom === 'MT') acMt = ac;
                else if (uom === 'Units' || uom === 'Roll' || uom === 'Nos') {
                    const ppwKg = parseFloat(updatedRow.perPieceWeight) || 0;
                    acMt = (ac * ppwKg) / 1000;
                }
                updatedRow.annualConsumptionMt = acMt ? acMt.toFixed(3) : (uom === 'Not Applicable' ? '0.000' : '');
            }

            // Recalculate Used Recycled Qty MT
            const pctRaw = parseFloat(updatedRow.usedRecycledPercent) || 0;
            const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
            updatedRow.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);

            copy[rowIdx] = updatedRow;
            return copy;
        });
    };

    const handlePercentBlur = (rowIdx) => {
        setRows(prev => {
            const copy = [...prev];
            const row = { ...copy[rowIdx] };
            let pctRaw = parseFloat(row.usedRecycledPercent);

            if (isNaN(pctRaw)) {
                pctRaw = 0;
            }

            // Allow 0 as a valid value
            const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
            row.usedRecycledPercent = pctFraction.toFixed(3);
            
            const acMt = parseFloat(row.annualConsumptionMt) || 0;
            row.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);
            
            copy[rowIdx] = row;
            return copy;
        });
    };

    const saveRow = async (idx) => {
        setSavingRow(idx);
        const row = rows[idx];
        const beforeRow = lastSavedRows[idx] || {};

        try {
            const payload = {
                type,
                itemId: index,
                rowIndex: idx,
                table: 'Recycled Quantity Used',
                row
            };
            
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_ROW_SAVE(client._id), payload);
            // If backend returns the saved row (e.g. with formatted values), use it. Otherwise use current row.
            const savedRowForHistory = res.data?.data?.row || row;

            // History is handled by backend
            setLastSavedRows(prev => {
                const copy = [...prev];
                copy[idx] = { ...savedRowForHistory };
                return copy;
            });

            toast.success("Row saved successfully");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save row");
        } finally {
            setSavingRow(null);
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            const updatePath = `productionFacility.${type}.${index}.productRecycledQuantity`;
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(client._id), { [updatePath]: rows });
            
            setLastSavedRows([...rows]);
            toast.success("All Recycled Quantity data saved successfully");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRow = (idx) => {
        setRows(prev => prev.filter((_, i) => i !== idx));
        // We don't save automatically on delete to allow "Undo" via refresh, or user must click "Save All".
        // Or if we want parity with PlantProcess which seems to rely on bulk save for deletes?
        // Actually PlantProcess has `removeRecycledRow` which just updates state.
    };

    const handleDeleteAll = () => {
        if (window.confirm('Are you sure you want to delete all rows?')) {
            setRows([]);
        }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws); // default to json

            if (!data || data.length === 0) {
                toast.error('Excel file is empty');
                return;
            }

            // Expected headers map
            const headerMap = {
                  'system code': 'systemCode',
                  'component code': 'componentCode',
                  'component description': 'componentDescription',
                  'supplier name': 'supplierName',
                  'category': 'category',
                  'annual consumption': 'annualConsumption',
                  'uom': 'uom',
                  'per piece weight': 'perPieceWeight',
                  'used recycled %': 'usedRecycledPercent'
            };

            const newRows = [];
            
            data.forEach(rowData => {
                 const newRow = {
                      systemCode: '',
                      componentCode: '',
                      componentDescription: '',
                      supplierName: '',
                      category: '',
                      annualConsumption: '',
                      uom: '',
                      perPieceWeight: '',
                      annualConsumptionMt: '',
                      usedRecycledPercent: '',
                      usedRecycledQtyMt: ''
                 };

                 // Flexible key matching
                 Object.keys(rowData).forEach(key => {
                     const lowerKey = key.trim().toLowerCase();
                     // Check direct map
                     if (headerMap[lowerKey]) {
                         newRow[headerMap[lowerKey]] = String(rowData[key]).trim();
                     } else {
                         // Check partials if needed
                         if (lowerKey.includes('system') && lowerKey.includes('code')) newRow.systemCode = String(rowData[key]).trim();
                         if (lowerKey.includes('component') && lowerKey.includes('code')) newRow.componentCode = String(rowData[key]).trim();
                         if (lowerKey.includes('desc')) newRow.componentDescription = String(rowData[key]).trim();
                         if (lowerKey.includes('supplier')) newRow.supplierName = String(rowData[key]).trim();
                         if (lowerKey.includes('category')) newRow.category = String(rowData[key]).trim();
                         if (lowerKey.includes('consumption') && !lowerKey.includes('mt')) newRow.annualConsumption = String(rowData[key]).trim();
                         if (lowerKey.includes('uom')) newRow.uom = String(rowData[key]).trim();
                         if (lowerKey.includes('weight')) newRow.perPieceWeight = String(rowData[key]).trim();
                         if (lowerKey.includes('recycled') && lowerKey.includes('%')) newRow.usedRecycledPercent = String(rowData[key]).trim();
                     }
                 });

                 // Calculations
                 let acMt = parseFloat(newRow.annualConsumptionMt) || 0;
                 const ac = parseFloat(newRow.annualConsumption) || 0;
                 const uom = newRow.uom;
                 
                 if (!acMt) { 
                      if (uom === 'KG') acMt = ac / 1000;
                      else if (uom === 'MT') acMt = ac;
                      else if (uom === 'Units' || uom === 'Roll' || uom === 'Nos') {
                          const ppwKg = parseFloat(newRow.perPieceWeight) || 0;
                          acMt = (ac * ppwKg) / 1000;
                      }
                      newRow.annualConsumptionMt = acMt ? acMt.toFixed(3) : '';
                 }
                  
                 const pctRaw = parseFloat(newRow.usedRecycledPercent) || 0;
                 const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
                 newRow.usedRecycledPercent = pctFraction.toFixed(3);
                  
                 if (!newRow.usedRecycledQtyMt) {
                      newRow.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);
                 }

                 newRows.push(newRow);
            });

            setRows(prev => [...prev, ...newRows]);
            toast.success(`Imported ${newRows.length} rows`);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleExport = () => {
          const exportData = rows.map(row => ({
              'System Code': row.systemCode || '',
              'Component Code': row.componentCode || '',
              'Component Description': row.componentDescription || '',
              'Supplier Name': row.supplierName || '',
              'Category': row.category || '',
              'Annual Consumption': row.annualConsumption || '',
              'UOM': row.uom || '',
              'Per Piece Weight': row.perPieceWeight || '',
              'Annual Consumption (MT)': row.annualConsumptionMt || '',
              'Used Recycled %': (parseFloat(row.usedRecycledPercent) * 100).toFixed(2) + '%',
              'Used Recycled Qty (MT)': row.usedRecycledQtyMt || ''
          }));
          
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, "Recycled Quantity Used");
          XLSX.writeFile(wb, "recycled_quantity_used.xlsx");
    };

    const columns = [
        { label: "System Code", field: "systemCode", width: "min-w-[120px]", render: (row, idx) => (
             <select 
                 value={row.systemCode || ''} 
                 onChange={(e) => handleRowChange(idx, 'systemCode', e.target.value)}
                 className="w-full p-1 border rounded text-xs"
                 disabled={isManager}
             >
                 <option value="">Select System Code</option>
                 {systemCodeOptions.map(opt => (
                     <option key={opt.code} value={opt.code}>{opt.label}</option>
                 ))}
             </select>
        )},
        { label: "Component Code", field: "componentCode", readOnly: true },
        { label: "Component Desc", field: "componentDescription", width: "min-w-[200px]", readOnly: true },
        { label: "Supplier Name", field: "supplierName", readOnly: true },
        { label: "Category", field: "category" },
        { label: "Annual Cons.", field: "annualConsumption" },
        { label: "UOM", field: "uom", render: (row, idx) => (
            <select 
                value={row.uom || ''} 
                onChange={(e) => handleRowChange(idx, 'uom', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                disabled={isManager}
            >
                <option value="">Select UOM</option>
                <option value="KG">KG</option>
                <option value="MT">MT</option>
                <option value="Units">Units</option>
                <option value="Nos">Nos</option>
                <option value="Roll">Roll</option>
                <option value="Not Applicable">Not Applicable</option>
            </select>
        )},
        { label: "Per Piece Weight", field: "perPieceWeight" },
        { label: "Annual Cons (MT)", field: "annualConsumptionMt", readOnly: true },
        { label: "Used Recycled %", field: "usedRecycledPercent", render: (row, idx) => (
            <input 
                type="number" 
                step="0.01"
                min="0"
                max="100"
                value={row.usedRecycledPercent === 0 ? '0' : (row.usedRecycledPercent || '')}
                onChange={(e) => handleRowChange(idx, 'usedRecycledPercent', e.target.value)}
                onBlur={() => handlePercentBlur(idx)}
                className="w-full p-1 border rounded text-xs"
                readOnly={isManager}
                disabled={isManager}
            />
        )},
        { label: "Used Recycled Qty (MT)", field: "usedRecycledQtyMt", readOnly: true }
    ].filter(col => !(isManager && col.field === 'systemCode'));

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                {!isManager && (
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                )}
                {!isManager && (
                    <>
                        <button 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                            <FaFileExcel /> Upload Excel
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        <button 
                            onClick={handleDeleteAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 border border-red-200"
                        >
                            <FaTrash /> Delete All
                        </button>
                        <button 
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save All
                        </button>
                        <button 
                            onClick={() => setRows(prev => [...prev, { systemCode: '', componentCode: '', componentDescription: '', supplierName: '', category: '', annualConsumption: 0, uom: '', perPieceWeight: 0, annualConsumptionMt: 0, usedRecycledPercent: 0, usedRecycledQtyMt: 0 }])}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50"
                        >
                            <FaPlus /> Add Row
                        </button>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 ${col.width || 'min-w-[100px]'}`}>{col.label}</th>
                            ))}
                            {!isManager && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((row, idx) => {
                            const globalIdx = indexOfFirstItem + idx;
                            return (
                                <tr key={globalIdx} className="bg-white border-b hover:bg-gray-50">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2">
                                            {col.render ? col.render(row, globalIdx) : (
                                                <input 
                                                    type="text" 
                                                    value={row[col.field] || ''}
                                                    onChange={(e) => handleRowChange(globalIdx, col.field, e.target.value)}
                                                    className="w-full p-1 border rounded text-xs"
                                                    readOnly={col.readOnly || isManager}
                                                    disabled={col.readOnly || isManager}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {!isManager && (
                                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => saveRow(globalIdx)}
                                                disabled={savingRow === globalIdx}
                                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                                title="Save Row"
                                            >
                                                {savingRow === globalIdx ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRow(globalIdx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Row"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 italic">
                                    No data added yet. {isManager ? '' : 'Click "Add Row" to start.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end">
                <Pagination
                    currentPage={currentPage}
                    totalItems={rows.length}
                    pageSize={itemsPerPage}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>
        </div>
    );
};

export default ProductComplianceStep;
