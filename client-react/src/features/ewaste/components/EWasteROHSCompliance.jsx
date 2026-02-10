import React, { useState, useEffect } from 'react';
import { Popconfirm, Button, Modal, Select } from 'antd';
import { FileExcelOutlined, SaveOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import { useExcelImport } from '../../../hooks/useExcelImport';
import BulkUploadControl from '../../../components/common/BulkUploadControl';
import { ROHS_COMPLIANCE_TEMPLATE } from '../../../constants/excelTemplates';

const PREDEFINED_SUBSTANCES = [
    { substance: 'Lead', symbol: 'Pb', maxLimit: '0.1%' },
    { substance: 'Mercury', symbol: 'Hg', maxLimit: '0.1%' },
    { substance: 'Cadmium', symbol: 'Cd', maxLimit: '0.01%' },
    { substance: 'Hexavalent Chromium', symbol: 'Cr(VI)', maxLimit: '0.1%' },
    { substance: 'Polybrominated Biphenyls', symbol: 'PBB', maxLimit: '0.1%' },
    { substance: 'Polybrominated Diphenyl Ethers', symbol: 'PBDE', maxLimit: '0.01%' }
];

const EWasteROHSCompliance = ({ clientId }) => {
    const [rows, setRows] = useState([]);
    const [originalRows, setOriginalRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [categoriesData, setCategoriesData] = useState([]);
    
    // Add Product Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedEeeCode, setSelectedEeeCode] = useState(null);
    const { importData, downloadTemplate, isLoading } = useExcelImport();

    const handleExcelUpload = (e) => {
        importData(e, (data) => {
            const newRows = data.map((row, index) => {
                const maxLimit = row["Maximum Allowed Limit"] || '';
                const actual = row["Actual percentage"] || '';
                let isCompliant = '';
                
                if (maxLimit && actual) {
                    const max = parseFloat(maxLimit.toString().replace('%', ''));
                    const act = parseFloat(actual.toString().replace('%', ''));
                    if (!isNaN(max) && !isNaN(act)) {
                        isCompliant = act <= max ? 'Yes' : 'No';
                    }
                }

                return {
                    id: Date.now() + index,
                    eeeCode: row["EEE Code"] || '',
                    productName: row["Product Name"] || '',
                    listEEE: row["List of EEE"] || '',
                    substance: row["Substance"] || '',
                    symbol: row["Symbol"] || '',
                    maxLimit: maxLimit,
                    actualPercentage: actual,
                    isCompliant: isCompliant
                };
            });
            
            setRows(prev => [...prev, ...newRows]);
        });
    };

    useEffect(() => {
        fetchComplianceData();
    }, [clientId]);

    const fetchComplianceData = async () => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.E_WASTE_COMPLIANCE(clientId));
            if (response.data && response.data.success) {
                // Store categories data for dropdowns/autofill
                if (response.data.data.rows) {
                    setCategoriesData(response.data.data.rows);
                }
                
                // Set ROHS rows
                if (response.data.data.rohsRows && response.data.data.rohsRows.length > 0) {
                    const fetchedRows = response.data.data.rohsRows.map(row => ({
                        ...row,
                        id: row._id || Date.now() + Math.random() // Ensure unique ID for React key
                    }));
                    setRows(fetchedRows);
                    setOriginalRows(JSON.parse(JSON.stringify(fetchedRows)));
                } else {
                    setRows([]);
                    setOriginalRows([]);
                }
            }
        } catch (error) {
            console.error("Error fetching compliance data:", error);
            toast.error("Failed to fetch compliance data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddProductClick = () => {
        setIsModalVisible(true);
        setSelectedEeeCode(null);
    };

    const handleAddProductConfirm = () => {
        if (!selectedEeeCode) {
            toast.error("Please select a product");
            return;
        }

        const selectedProduct = categoriesData.find(c => c.eeeCode === selectedEeeCode);
        if (!selectedProduct) {
            toast.error("Invalid product selected");
            return;
        }

        // Generate 6 rows for the selected product
        const newRows = PREDEFINED_SUBSTANCES.map(sub => ({
            id: Date.now() + Math.random(),
            eeeCode: selectedProduct.eeeCode,
            productName: selectedProduct.productName,
            listEEE: selectedProduct.listEEE,
            substance: sub.substance,
            symbol: sub.symbol,
            maxLimit: sub.maxLimit,
            actualPercentage: '',
            isCompliant: ''
        }));

        setRows(prev => [...prev, ...newRows]);
        // Don't update originalRows here as these are new unsaved rows
        setIsModalVisible(false);
        setSelectedEeeCode(null);
        toast.success(`Added ROHS compliance rows for ${selectedProduct.productName}`);
    };

    const handleAddRow = () => {
        setRows(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                eeeCode: '',
                productName: '',
                listEEE: '',
                substance: '',
                symbol: '',
                maxLimit: '',
                actualPercentage: '',
                isCompliant: ''
            }
        ]);
    };

    const handleDeleteRow = async (index) => {
        // Calculate new rows based on current state
        const rowToDelete = rows[index];
        const newRows = rows.filter((_, i) => i !== index);
        
        // Optimistic update
        setRows(newRows);

        // Trigger save to backend to persist deletion
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_ROHS_COMPLIANCE(clientId), { rows: newRows });
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
            // If it's a new row (not in originalRows), we might want to remove it 
            // or just clear it. Since "Add Product" adds multiple rows, reverting 
            // a new row is tricky. For now, let's just do nothing if no original 
            // or maybe remove it if the user wants to "cancel" a new row?
            // Matching Categories behavior: if no original row, we do nothing for now 
            // (or maybe remove it if that was the intent). 
            // But since "Delete" is available, "Cancel" usually implies "Revert Changes".
            // If it's a completely new row, "Revert" is effectively "Delete" or "Clear".
            // Let's stick to reverting to original state if exists.
        }
    };

    const isRowChanged = (row) => {
        const original = originalRows.find(r => r.id === row.id);
        if (!original) return true; // New row is considered changed
        
        // Compare fields
        return (
            row.eeeCode !== original.eeeCode ||
            row.productName !== original.productName ||
            row.listEEE !== original.listEEE ||
            row.substance !== original.substance ||
            row.symbol !== original.symbol ||
            row.maxLimit !== original.maxLimit ||
            row.actualPercentage !== original.actualPercentage ||
            row.isCompliant !== original.isCompliant
        );
    };

    const handleChange = (index, field, value) => {
        setRows(prev => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], [field]: value };

            // Auto-fill logic based on EEE Code selection
            if (field === 'eeeCode') {
                const selectedCategoryRow = categoriesData.find(c => c.eeeCode === value);
                if (selectedCategoryRow) {
                    newRows[index].productName = selectedCategoryRow.productName;
                    newRows[index].listEEE = selectedCategoryRow.listEEE;
                } else {
                    newRows[index].productName = '';
                    newRows[index].listEEE = '';
                }
            }

            // Auto-calculate compliance
            if (field === 'maxLimit' || field === 'actualPercentage') {
                const max = parseFloat(newRows[index].maxLimit);
                const actual = parseFloat(newRows[index].actualPercentage);
                
                if (!isNaN(max) && !isNaN(actual)) {
                    newRows[index].isCompliant = actual <= max ? 'Yes' : 'No';
                }
            }

            return newRows;
        });
    };

    const handleBlur = (index, field) => {
        if (field === 'actualPercentage') {
            setRows(prev => {
                const newRows = [...prev];
                const value = newRows[index][field];
                
                // Remove % if present to handle pure numbers
                let numericValue = value ? parseFloat(value.toString().replace('%', '')) : NaN;

                if (!isNaN(numericValue)) {
                    // If the user enters a value > 1 (e.g. 50), assume they mean 0.5 (divide by 100)
                    // The limits are small (0.1, 0.01), so values > 1 are likely unscaled inputs.
                    if (numericValue > 1) {
                        numericValue = numericValue / 100;
                    }
                    newRows[index][field] = numericValue.toString();
                    
                    // Re-run compliance check with new value
                    const max = parseFloat(newRows[index].maxLimit);
                    if (!isNaN(max)) {
                        newRows[index].isCompliant = numericValue <= max ? 'Yes' : 'No';
                    }
                }
                return newRows;
            });
        }
    };

    const handleSaveRow = async (index) => {
        // Validation
        const row = rows[index];
        if (!row.eeeCode) {
            toast.error("EEE Code is required");
            return;
        }

        setSavingRow(index);
        try {
            // Save all rows to keep order and integrity
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_ROHS_COMPLIANCE(clientId), {
                rows: rows
            });

            if (response.data && response.data.success) {
                toast.success("Row saved successfully");
                setOriginalRows(JSON.parse(JSON.stringify(rows)));
            } else {
                toast.error("Failed to save data");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save data");
        } finally {
            setSavingRow(null);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.E_WASTE_ROHS_COMPLIANCE(clientId), {
                rows: rows
            });

            if (response.data && response.data.success) {
                toast.success("All data saved successfully");
                setOriginalRows(JSON.parse(JSON.stringify(rows)));
            } else {
                toast.error("Failed to save data");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save data");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-800">ROHS Compliance</h3>
                <div className="flex gap-2">
                    <BulkUploadControl
                        onUpload={handleExcelUpload}
                        onDownloadTemplate={() => downloadTemplate(ROHS_COMPLIANCE_TEMPLATE)}
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
                        disabled={saving}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <i className="fas fa-spinner fa-spin"></i> : <SaveOutlined />} Save All
                    </button>
                    <button 
                        onClick={handleAddProductClick} 
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold border border-primary-200 hover:bg-primary-100 transition-colors flex items-center gap-2 text-xs"
                    >
                        <PlusOutlined /> Add Product
                    </button>
                    {/* Hidden Manual Add Row for fallback if needed, or remove it. Keeping it just in case */}
                    {/* <button onClick={handleAddRow}>...</button> */}
                </div>
            </div>

            <Modal
                title="Select Product for ROHS Compliance"
                open={isModalVisible}
                onOk={handleAddProductConfirm}
                onCancel={() => setIsModalVisible(false)}
                okText="Add"
                cancelText="Cancel"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-gray-600 text-sm">
                        Select a product from the Categories Wise Compliance list to auto-populate ROHS substance requirements.
                    </p>
                    <Select
                        className="w-full"
                        placeholder="Select Product (EEE Code)"
                        value={selectedEeeCode}
                        onChange={setSelectedEeeCode}
                        showSearch
                        optionFilterProp="children"
                    >
                        {categoriesData.map(cat => (
                            <Select.Option key={cat.eeeCode} value={cat.eeeCode}>
                                {cat.eeeCode} - {cat.productName}
                            </Select.Option>
                        ))}
                    </Select>
                </div>
            </Modal>

            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                <table className="min-w-full text-xs divide-y divide-gray-200 border-separate border-spacing-0">
                    <thead className="bg-gray-50">
                        <tr>
                            {[
                                { label: 'Sr.No', width: 'w-12 text-center' },
                                { label: 'EEE Code', width: 'min-w-[150px]' },
                                { label: 'Product Name', width: 'min-w-[150px]' },
                                { label: 'List of EEE', width: 'min-w-[200px]' },
                                { label: 'Substance', width: 'min-w-[120px]' },
                                { label: 'Symbol', width: 'min-w-[100px]' },
                                { label: 'Maximum Allowed Limit', width: 'min-w-[100px]' },
                                { label: 'Actual percentage', width: 'min-w-[100px]' },
                                { label: 'Is Compliant', width: 'min-w-[100px]' },
                                { label: 'Actions', width: 'w-20 text-center' }
                            ].map((header) => (
                                <th key={header.label} className={`px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap sticky top-0 z-10 border-b border-gray-200 bg-gray-50 ${header.width} ${header.label === 'Actions' ? 'right-0 shadow-sm border-l border-gray-200' : ''}`}>
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.length > 0 ? (
                            rows.map((row, index) => (
                                    <tr key={row.id || index} className={`hover:bg-gray-50 transition-colors duration-150 ${isRowChanged(row) ? 'bg-orange-50' : ''}`}>
                                    <td className="px-2 py-2 text-center text-xs text-black align-middle font-bold">
                                        {index + 1}
                                        {isRowChanged(row) && <div className="text-[10px] text-orange-500 font-normal">Unsaved</div>}
                                    </td>
                                    
                                    <td className="px-2 py-2">
                                        <select
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            value={row.eeeCode}
                                            onChange={(e) => handleChange(index, 'eeeCode', e.target.value)}
                                        >
                                            <option value="">Select Code</option>
                                            {categoriesData.map((cat, idx) => (
                                                <option key={idx} value={cat.eeeCode}>
                                                    {cat.eeeCode}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1.5 text-xs cursor-not-allowed focus:outline-none"
                                            value={row.productName}
                                            readOnly
                                            placeholder="Auto-filled"
                                        />
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1.5 text-xs cursor-not-allowed focus:outline-none"
                                            value={row.listEEE}
                                            readOnly
                                            placeholder="Auto-filled"
                                            title={row.listEEE}
                                        />
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            value={row.substance}
                                            onChange={(e) => handleChange(index, 'substance', e.target.value)}
                                            placeholder="e.g. Lead"
                                        />
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            value={row.symbol}
                                            onChange={(e) => handleChange(index, 'symbol', e.target.value)}
                                            placeholder="e.g. Pb"
                                        />
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            value={row.maxLimit}
                                            onChange={(e) => handleChange(index, 'maxLimit', e.target.value)}
                                            placeholder="%"
                                        />
                                    </td>

                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            value={row.actualPercentage}
                                            onChange={(e) => handleChange(index, 'actualPercentage', e.target.value)}
                                            onBlur={() => handleBlur(index, 'actualPercentage')}
                                            placeholder="%"
                                        />
                                    </td>

                                    <td className="px-2 py-2 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            row.isCompliant === 'Yes' ? 'bg-green-100 text-green-800' : 
                                            row.isCompliant === 'No' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {row.isCompliant || '-'}
                                        </span>
                                    </td>

                                    <td className="px-2 py-2 text-center whitespace-nowrap sticky right-0 bg-white border-l border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-center gap-2">
                                            {isRowChanged(row) && (
                                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold whitespace-nowrap">
                                                    Changed
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleSaveRow(index)}
                                                className="p-1.5 rounded text-white bg-green-500 hover:bg-green-600 shadow-sm transition-all hover:scale-110"
                                                title="Save Row"
                                            >
                                                {savingRow === index ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-save text-xs"></i>}
                                            </button>
                                            <button
                                                onClick={() => handleCancelRow(index)}
                                                className="p-1.5 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
                                                title="Cancel Changes"
                                                disabled={!isRowChanged(row)}
                                            >
                                                <i className="fas fa-undo text-xs"></i>
                                            </button>
                                            <Popconfirm
                                                title="Are you sure delete this row?"
                                                onConfirm={() => handleDeleteRow(index)}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <button 
                                                    className="p-1.5 rounded text-red-500 bg-red-50 hover:bg-red-100 transition-all hover:scale-110"
                                                    title="Remove Row"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </Popconfirm>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" className="px-3 py-8 text-center text-gray-500 text-sm">
                                    No data available. Click "Add Product" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EWasteROHSCompliance;