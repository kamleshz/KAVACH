import React, { useState, useRef, useEffect } from 'react';
import { Popconfirm, Button } from 'antd';
import { FileExcelOutlined, SaveOutlined, DeleteOutlined, UndoOutlined, LoadingOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import { E_WASTE_DATA } from '../constants/EWasteData';
import { useExcelImport } from '../../../hooks/useExcelImport';
import BulkUploadControl from '../../../components/common/BulkUploadControl';
import { E_WASTE_CATEGORIES_TEMPLATE } from '../../../constants/excelTemplates';
import { createTemplateWithReferenceData } from '../../../utils/excelHelpers';

const EEE_CATEGORIES = [
    "Information Technology and Telecommunication Equipment",
    "Consumer Electrical and Electronics and Photovoltaic Panels",
    "Large and Small Electrical Equipment",
    "Electric and Electronic Tools (Exception of Large Scale Stationary Industrial Tools)",
    "Toys, Leisure and Sports Equipment",
    "Medical Devices",
    "Laboratory Instruments"
];

const EWasteCategoriesCompliance = ({ clientId, clientName, isManager = false }) => {
    const [rows, setRows] = useState([]);
    const [originalRows, setOriginalRows] = useState([]); // Track original state for cancel/changed detection
    const [isSaving, setIsSaving] = useState(false);
    const [savingRow, setSavingRow] = useState(null); // Track which row is being saved
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { importData, isLoading } = useExcelImport();

    const handleTemplateDownload = () => {
        const headers = E_WASTE_CATEGORIES_TEMPLATE.headers || [
            "Category Code",
            "Product Name",
            "Category of EEE",
            "EEE Code",
            "List of EEE",
            "Product Avg Life",
            "Sales / Import Date",
            "Quantity sold/Imported in MT"
        ];

        createTemplateWithReferenceData(
            headers,
            E_WASTE_CATEGORIES_TEMPLATE.fileName || "Categories_Compliance_Template.xlsx",
            EEE_CATEGORIES,
            E_WASTE_DATA
        );
    };

    const handleExcelUpload = (e) => {
        importData(e, (data) => {
            const newRows = data.map((row, index) => {
                const newRow = {
                    id: Date.now() + index,
                    categoryCode: row["Category Code"] || '',
                    productName: row["Product Name"] || '',
                    productImage: null,
                    categoryEEE: row["Category of EEE"] || '',
                    eeeCode: row["EEE Code"] || '',
                    listEEE: row["List of EEE"] || '',
                    avgLife: row["Product Avg Life"] || '',
                    salesDate: row["Sales / Import Date"] || '',
                    tentativeEndLife: '',
                    quantity: row["Quantity sold/Imported in MT"] || ''
                };

                // Calculate tentativeEndLife
                if (newRow.avgLife && newRow.salesDate) {
                    const date = new Date(newRow.salesDate);
                    if (!isNaN(date.getTime())) {
                        const yearsToAdd = Number(newRow.avgLife);
                        if (!isNaN(yearsToAdd)) {
                            date.setFullYear(date.getFullYear() + yearsToAdd);
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const dd = String(date.getDate()).padStart(2, '0');
                            newRow.tentativeEndLife = `${yyyy}-${mm}-${dd}`;
                        }
                    }
                }
                return newRow;
            });
            
            setRows(prev => [...prev, ...newRows]);
        });
    };

    useEffect(() => {
        const fetchComplianceData = async () => {
            try {
                const response = await api.get(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId));
                if (response.data && response.data.success && response.data.data) {
                    const fetchedRows = response.data.data.rows.map(row => ({
                        ...row,
                        id: row._id || Date.now() + Math.random() // Ensure unique ID for React key
                    }));
                    if (fetchedRows.length > 0) {
                        setRows(fetchedRows);
                        setOriginalRows(JSON.parse(JSON.stringify(fetchedRows))); // Deep copy for original state
                    }
                }
            } catch (error) {
                console.error("Error fetching E-Waste compliance:", error);
                toast.error("Failed to load compliance data");
            }
        };

        if (clientId) {
            fetchComplianceData();
        }
    }, [clientId]);

    const getFinancialYear = () => {
        const today = new Date();
        const month = today.getMonth() + 1; // 1-12
        const year = today.getFullYear(); 
        
        let startYear, endYear;
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }
        
        const startYY = startYear.toString().slice(-2);
        const endYY = endYear.toString().slice(-2);
        
        return `${startYY}-${endYY}`;
    };

    const generateEEECode = (currentRows) => {
        if (!clientName) return '';
        const companyPart = clientName.substring(0, 4).toUpperCase();
        const fy = getFinancialYear();
        const prefix = `${companyPart}/EEE/${fy}/`;
        
        let maxNum = 0;
        currentRows.forEach(row => {
            if (row.eeeCode && row.eeeCode.startsWith(prefix)) {
                const parts = row.eeeCode.split('/');
                const numPart = parts[parts.length - 1];
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart, 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        });
        
        const nextNum = (maxNum + 1).toString().padStart(4, '0');
        return `${prefix}${nextNum}`;
    };

    const generateCategoryCode = (categoryEEE, currentRowId) => {
        if (!categoryEEE || !clientName) return '';
        
        const companyPart = clientName.substring(0, 4).toUpperCase(); // 4 Letter of Company
        const catPart = "Cat"; // Cat
        const eeePart = categoryEEE.substring(0, 4).toUpperCase(); // 4 Letter from Category of EEE
        
        const prefix = `${companyPart}/${catPart}/${eeePart}/`;
        
        // Find max number for this prefix
        let maxNum = 0;
        rows.forEach(row => {
            if (row.id !== currentRowId && row.categoryCode && row.categoryCode.startsWith(prefix)) {
                const parts = row.categoryCode.split('/');
                const numPart = parts[parts.length - 1];
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart, 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        });
        
        const nextNum = (maxNum + 1).toString().padStart(4, '0');
        return `${prefix}${nextNum}`;
    };

    const handleAddRow = () => {
        setRows(prev => {
            const newCode = generateEEECode(prev);
            return [
                ...prev,
                {
                    id: Date.now(),
                    categoryCode: '',
                    productName: '',
                    productImage: null,
                    categoryEEE: '',
                    eeeCode: newCode,
                    listEEE: '',
                    avgLife: '',
                    salesDate: '',
                    tentativeEndLife: '',
                    quantity: ''
                }
            ];
        });
    };

    const handleFileChange = async (index, file) => {
        if (!file) return;
        
        const formData = new FormData();
        formData.append('productImage', file);
        formData.append('rowIndex', index);

        const loadingToast = toast.loading("Uploading image...");

        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE_UPLOAD(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.success) {
                const imageUrl = response.data.data.imageUrl;
                
                setRows(prev => {
                    const newRows = [...prev];
                    newRows[index] = { ...newRows[index], productImage: imageUrl };
                    return newRows;
                });
                
                toast.update(loadingToast, { render: "Image uploaded successfully", type: "success", isLoading: false, autoClose: 3000 });
            } else {
                toast.update(loadingToast, { render: response.data.message || "Upload failed", type: "error", isLoading: false, autoClose: 3000 });
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.update(loadingToast, { render: "Failed to upload image", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handleChange = (index, field, value) => {
        setRows(prev => {
            const newRows = [...prev];
            let currentRow = { ...newRows[index], [field]: value };
            
            // Auto-generate Category Code when Category of EEE changes
            if (field === 'categoryEEE') {
                currentRow.categoryCode = generateCategoryCode(value, currentRow.id);
                // Reset listEEE and avgLife when category changes
                currentRow.listEEE = '';
                currentRow.avgLife = '';
                currentRow.tentativeEndLife = '';
            }

            // Auto-fill Product Avg Life when List of EEE changes
            if (field === 'listEEE') {
                const category = currentRow.categoryEEE;
                if (category && E_WASTE_DATA[category]) {
                    const selectedItem = E_WASTE_DATA[category].find(item => {
                        // Check if value matches "Code: Description" format
                        const displayValue = `${item.code}: ${item.description}`;
                        return displayValue === value || item.description === value;
                    });
                    
                    if (selectedItem) {
                        currentRow.avgLife = selectedItem.avgLife;
                    }
                }
            }
            
            // Auto-calculate Tentative End Life when Sales Date or Product Avg Life (via List of EEE) changes
            if (field === 'salesDate' || field === 'listEEE') {
                const avgLife = currentRow.avgLife;
                const salesDate = currentRow.salesDate;

                if (avgLife && salesDate) {
                    const date = new Date(salesDate);
                    // Check if date is valid
                    if (!isNaN(date.getTime())) {
                        const yearsToAdd = Number(avgLife);
                        if (!isNaN(yearsToAdd)) {
                            // Add years to the date
                            date.setFullYear(date.getFullYear() + yearsToAdd);
                            
                            // Format back to YYYY-MM-DD
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const dd = String(date.getDate()).padStart(2, '0');
                            currentRow.tentativeEndLife = `${yyyy}-${mm}-${dd}`;
                        }
                    }
                } else if (!salesDate) {
                    // If sales date is cleared, clear tentative end life
                    currentRow.tentativeEndLife = '';
                }
            }

            newRows[index] = currentRow;
            return newRows;
        });
    };

    const handleDeleteRow = async (index) => {
        // Calculate new rows based on current state
        const rowToDelete = rows[index];
        const newRows = rows.filter((_, i) => i !== index);
        
        // Optimistic update
        setRows(newRows);

        // Trigger save to backend to persist deletion
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId), { rows: newRows });
            if (response.data && response.data.success) {
                toast.success('Row deleted successfully');
                setOriginalRows(JSON.parse(JSON.stringify(newRows)));
            } else {
                // If server returns failure, throw to catch block
                throw new Error(response.data.message || 'Failed to delete row from server');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete row');
            // Revert changes if failed
            setRows(prev => {
                const reverted = [...prev];
                // Insert back at original index
                reverted.splice(index, 0, rowToDelete);
                return reverted;
            });
        }
    };

    const handleSaveRow = async (index) => {
        setSavingRow(index);
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId), { rows });
            if (response.data && response.data.success) {
                toast.success('Row saved successfully');
                // Update original state to reflect saved changes
                setOriginalRows(JSON.parse(JSON.stringify(rows)));
            } else {
                toast.error(response.data.message || 'Failed to save row');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to save row');
        } finally {
            setSavingRow(null);
        }
    };

    const handleCancelRow = (index) => {
        const rowId = rows[index].id;
        const originalRow = originalRows.find(r => r.id === rowId);
        
        if (originalRow) {
            setRows(prev => {
                const newRows = [...prev];
                newRows[index] = { ...originalRow };
                return newRows;
            });
        } else {
            // If no original row (newly added), maybe just clear fields or do nothing?
            // For now, let's just clear the fields or revert to initial state if possible.
            // But usually cancel is for reverting *changes*. If it's a new row, maybe remove it?
            // ProductCompliance removeRow logic is separate.
            // Let's assume we just leave it as is if no original, or maybe reset to empty.
        }
    };

    const isRowChanged = (row) => {
        const original = originalRows.find(r => r.id === row.id);
        if (!original) return true; // New row is considered changed
        
        // Compare fields
        return (
            row.categoryCode !== original.categoryCode ||
            row.productName !== original.productName ||
            row.categoryEEE !== original.categoryEEE ||
            row.eeeCode !== original.eeeCode ||
            row.listEEE !== original.listEEE ||
            row.avgLife !== original.avgLife ||
            row.salesDate !== original.salesDate ||
            row.tentativeEndLife !== original.tentativeEndLife ||
            row.quantity !== original.quantity
        );
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId), { rows });
            if (response.data && response.data.success) {
                toast.success('Categories compliance saved successfully');
                setOriginalRows(JSON.parse(JSON.stringify(rows)));
            } else {
                toast.error(response.data.message || 'Failed to save compliance data');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to save compliance data');
        } finally {
            setIsSaving(false);
        }
    };

    const indexOfLastItem = page * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-800">Categories Wise EEE Compliance</h2>
                <div className="flex gap-2">
                    {!isManager && (
                        <>
                            <BulkUploadControl
                                onUpload={handleExcelUpload}
                                onDownloadTemplate={handleTemplateDownload}
                                uploadLabel="Upload Excel"
                                templateLabel="Template"
                            />
                            <Popconfirm
                                title="Are you sure you want to delete all rows?"
                                onConfirm={() => setRows([])}
                                okText="Yes"
                                cancelText="No"
                            >
                                <button 
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                                    disabled={rows.length === 0}
                                >
                                    <DeleteOutlined /> Delete All
                                </button>
                            </Popconfirm>
                            <button 
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <SaveOutlined />} Save All
                            </button>
                            <button 
                                onClick={handleAddRow} 
                                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs"
                            >
                                <i className="fas fa-plus"></i> Add Category
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                    <thead className="bg-gray-50">
                        <tr>
                            {[
                                { label: 'Sr.no', width: 'w-12 text-center' },
                                { label: 'Category Code', width: 'min-w-[120px]' },
                                { label: 'Product Name', width: 'min-w-[150px]' },
                                { label: 'Product Image', width: 'min-w-[100px]' },
                                { label: 'Category of EEE', width: 'min-w-[150px]' },
                                { label: 'EEE Code', width: 'min-w-[100px]' },
                                { label: 'List of EEE', width: 'min-w-[200px]' },
                                { label: 'Product Avg Life', width: 'min-w-[100px]' },
                                { label: 'Sales / Import Date', width: 'min-w-[120px]' },
                                { label: 'Tentative End Life', width: 'min-w-[120px]' },
                                { label: 'Quantity sold/Imported in MT', width: 'min-w-[150px]' },
                                { label: 'Actions', width: 'w-20 text-center' }
                            ].map((header) => (
                                <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap sticky top-0 z-10 border-b border-gray-200 bg-gray-50 ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200' : ''}`}>
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentRows.length > 0 ? (
                            currentRows.map((row, idx) => {
                                const globalIndex = indexOfFirstItem + idx;
                                return (
                                    <tr key={row.id} className={`hover:bg-gray-50 transition-colors duration-150 ${isRowChanged(row) ? 'bg-orange-50' : ''}`}>
                                        <td className="px-2 py-2 text-center text-xs text-black align-middle font-bold">
                                            {globalIndex + 1}
                                            {isRowChanged(row) && <div className="text-[10px] text-orange-500 font-normal">Unsaved</div>}
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-gray-100 cursor-not-allowed focus:outline-none"
                                                value={row.categoryCode}
                                                readOnly
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                value={row.productName}
                                                onChange={(e) => handleChange(globalIndex, 'productName', e.target.value)}
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2 text-center">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded border border-gray-300 text-xs whitespace-nowrap">
                                                    <i className="fas fa-upload mr-1"></i> Upload
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={(e) => handleFileChange(globalIndex, e.target.files[0])}
                                                        accept="image/*"
                                                    />
                                                </label>
                                                {row.productImage && (
                                                    <a href={row.productImage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 text-[10px] underline">
                                                        View Image
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <select
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                value={row.categoryEEE}
                                                onChange={(e) => handleChange(globalIndex, 'categoryEEE', e.target.value)}
                                            >
                                                <option value="">Select Category</option>
                                                {EEE_CATEGORIES.map((cat, i) => (
                                                    <option key={i} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-gray-100 cursor-not-allowed focus:outline-none"
                                                value={row.eeeCode}
                                                readOnly
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            {E_WASTE_DATA[row.categoryEEE] ? (
                                                <select
                                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                    value={row.listEEE}
                                                    onChange={(e) => handleChange(globalIndex, 'listEEE', e.target.value)}
                                                >
                                                    <option value="">Select Item</option>
                                                    {E_WASTE_DATA[row.categoryEEE].map((item, i) => {
                                                        const displayValue = `${item.code}: ${item.description}`;
                                                        return (
                                                            <option key={i} value={displayValue}>
                                                                {displayValue}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                    value={row.listEEE}
                                                    onChange={(e) => handleChange(globalIndex, 'listEEE', e.target.value)}
                                                />
                                            )}
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-gray-100 cursor-not-allowed focus:outline-none"
                                                value={row.avgLife}
                                                readOnly
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                value={row.salesDate}
                                                onChange={(e) => handleChange(globalIndex, 'salesDate', e.target.value)}
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                value={row.tentativeEndLife}
                                                onChange={(e) => handleChange(globalIndex, 'tentativeEndLife', e.target.value)}
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                value={row.quantity}
                                                onChange={(e) => handleChange(globalIndex, 'quantity', e.target.value)}
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2 whitespace-nowrap align-middle border-l border-gray-100 bg-white group-hover:bg-gray-50 sticky right-0">
                                            <div className="flex items-center justify-center gap-2">
                                                {isRowChanged(row) && (
                                                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold whitespace-nowrap">
                                                        Changed
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleSaveRow(globalIndex)}
                                                    className="px-2.5 py-1.5 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all hover:scale-110 text-xs flex items-center gap-1"
                                                    title="Save Row"
                                                >
                                                    {savingRow === globalIndex ? <LoadingOutlined className="text-xs" /> : <SaveOutlined className="text-xs" />}
                                                    <span>Save</span>
                                                </button>
                                                <button
                                                    onClick={() => handleCancelRow(globalIndex)}
                                                    className="px-2.5 py-1.5 rounded text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110 text-xs flex items-center gap-1"
                                                    title="Cancel Changes"
                                                    disabled={!isRowChanged(row)}
                                                >
                                                    <UndoOutlined className="text-xs" />
                                                    <span>Cancel</span>
                                                </button>
                                                <Popconfirm
                                                    title="Are you sure delete this row?"
                                                    onConfirm={() => handleDeleteRow(globalIndex)}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <button 
                                                        className="px-2.5 py-1.5 rounded text-red-600 bg-red-50 hover:bg-red-100 transition-all hover:scale-110 text-xs flex items-center gap-1"
                                                        title="Remove Row"
                                                    >
                                                        <DeleteOutlined className="text-xs" />
                                                        <span>Delete</span>
                                                    </button>
                                                </Popconfirm>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="12" className="px-6 py-10 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="text-4xl mb-3 text-gray-300">
                                            <i className="fas fa-box-open"></i>
                                        </div>
                                        <p>No categories added yet.</p>
                                        <button 
                                            onClick={handleAddRow}
                                            className="mt-3 text-primary-600 hover:text-primary-700 font-semibold text-sm hover:underline"
                                        >
                                            Add your first category
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Simple Pagination */}
            {rows.length > itemsPerPage && (
                <div className="flex justify-end mt-4 gap-2">
                    <Button 
                        disabled={page === 1} 
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-2">Page {page} of {Math.ceil(rows.length / itemsPerPage)}</span>
                    <Button 
                        disabled={page === Math.ceil(rows.length / itemsPerPage)} 
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};

export default EWasteCategoriesCompliance;
