import React, { useState } from 'react';
import { Table, Select, Input, Button, Upload, Popover, Popconfirm, message, Modal } from 'antd';
import { 
  FaCheckDouble, FaFilePdf, FaClipboardCheck, FaChartLine, FaFilter, 
  FaExclamationCircle, FaTrashAlt, FaEdit, FaSave, FaUndo, FaCheck, FaCheckCircle,
  FaChevronDown, FaPlus, FaMinus
} from 'react-icons/fa';
import { UploadOutlined, LoadingOutlined, DeleteOutlined, PlusOutlined, TableOutlined, BarChartOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import Analysis from '../PlantProcessSteps/Analysis';
import SalesAnalysis from '../PlantProcessSteps/SalesAnalysis';
import PurchaseAnalysis from '../PlantProcessSteps/PurchaseAnalysis';
import SummaryReport from '../PlantProcessSteps/SummaryReport';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/apiEndpoints';

const HoverRow = ({ children, ...props }) => {
    const { record, ...restProps } = props;
    if (!record) return <tr {...restProps}>{children}</tr>;
    
    // Fallbacks for different data structures
    const polymer = Array.isArray(record.polymerUsed) 
        ? record.polymerUsed.join(', ') 
        : (record.polymerUsed || record.componentPolymer || '-');
        
    const thickness = record.thicknessMentioned || record.thickness || '-';
    
    const remarks = record.remarks || [];
    const hasRemarksArray = Array.isArray(remarks) && remarks.length > 0;
    const clientRemark = record.clientRemarks;
    const auditorRemark = record.auditorRemarks;
    
    const content = (
        <div className="max-w-md p-1">
            <h4 className="font-bold border-b pb-1 mb-2 text-sm">{record.skuCode}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                    <span className="text-gray-500 block">Description:</span>
                    <span className="font-medium">{record.skuDescription || '-'}</span>
                </div>
                <div>
                    <span className="text-gray-500 block">Polymer:</span>
                    <span className="font-medium">{polymer}</span>
                </div>
                 <div>
                    <span className="text-gray-500 block">Thickness:</span>
                    <span className="font-medium">{thickness}</span>
                </div>
                <div>
                    <span className="text-gray-500 block">Status:</span>
                    <span className={`font-semibold ${
                        record.complianceStatus === 'Compliant' ? 'text-green-600' : 
                        record.complianceStatus === 'Non-Compliant' ? 'text-red-600' : 
                        record.complianceStatus === 'Partially Compliant' ? 'text-amber-600' : 'text-gray-600'
                    }`}>{record.complianceStatus || 'Pending'}</span>
                </div>
                 <div className="col-span-2">
                    <span className="text-gray-500 block">Remarks:</span>
                    {hasRemarksArray ? (
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            {remarks.slice(0, 3).map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                            {remarks.length > 3 && <li>... (+{remarks.length - 3} more)</li>}
                        </ul>
                    ) : (clientRemark || auditorRemark) ? (
                         <div className="mt-1 space-y-1">
                            {clientRemark && <div><span className="text-gray-400 text-[10px]">Client:</span> {clientRemark}</div>}
                            {auditorRemark && <div><span className="text-gray-400 text-[10px]">Auditor:</span> {auditorRemark}</div>}
                         </div>
                    ) : (
                        <span className="text-gray-400 italic">No remarks</span>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <Popover content={content} title="Row Details" trigger="hover" placement="topLeft" mouseEnterDelay={0.5}>
            <tr {...restProps} className={`${restProps.className} hover:bg-blue-50 transition-colors duration-200 cursor-pointer`}>
                {children}
            </tr>
        </Popover>
    );
};

const PostAuditCheck = ({
    clientId,
    postValidationActiveTab,
    setPostValidationActiveTab,
    handleMarkingLabellingReport,
    loading,
    postValidationData,
    paginatedPostValidationData,
    postValidationColumns,
    postValidationPagination,
    handlePostValidationPageChange,
    totalPostValidationPages,
    handlePostValidationPageSizeChange,
    postValidationGotoPage,
    setPostValidationGotoPage,
    // For Plastic Specific Analysis
    applicationType, // CTE or CTO
    selectedPlantId, // If applicable, or use clientId/plantId logic
    handlePostValidationGotoSubmit,
    skuSearchText,
    setSkuSearchText,
    skuStatusFilter,
    setSkuStatusFilter,
    handleSkuComplianceReport,
    skuComplianceData,
    setSkuComplianceData,
    handleSkuComplianceChange,
    handleSkuRemark,
    handleSkuStatusChange,
    skuPagination,
    setSkuPagination,
    handleSkuPageChange,
    handleSkuPageSizeChange,
    regulationsCoveredUnderCto,
    waterRegulationsRows,
    airRegulationsRows,
    hazardousWasteRegulationsRows,
    monthlyProcurementSummary,
    monthlyProcurementLoading,
    monthlyProcurementError,
    monthlyProcurementFilters,
    setMonthlyProcurementFilters,
    monthlyProcurementViewMode,
    setMonthlyProcurementViewMode,
    monthlyProcurementFilterOpen,
    setMonthlyProcurementFilterOpen,
    monthlyProcurementDisplayMode,
    setMonthlyProcurementDisplayMode,
    costAnalysisSubTab = 'analysis1',
    setCostAnalysisSubTab = () => {},
    urepSelectedYear = new Date().getFullYear().toString(),
    setUrepSelectedYear = () => {},
    urepTargets = [],
    setUrepTargets = () => {},
    urepYearOptions = [new Date().getFullYear().toString()],
    buildCategoryProcurementSummary,
    buildPolymerProcurementSummary,
    monthlyProcurementRaw,
    urepData,
    skuImageLoading,
    skuComplianceColumns,
    skuTableDataSource, // Added prop
    readOnly = false, // Add readOnly with default value to avoid undefined
    handleBulkSavePostValidation, // Added prop for bulk save
    handleAddPostValidationRow,
    handleDeleteAllPostValidation,
    wasteType
}) => {
    const [plasticAnalysisTab, setPlasticAnalysisTab] = useState('prePostValidation');
    
    // Toggle states for Polymer and Category Procurement
    const [polymerViewMode, setPolymerViewMode] = useState('graph');
    const [categoryViewMode, setCategoryViewMode] = useState('graph');
    
    // Summary Report State
    const [summaryProductRows, setSummaryProductRows] = useState([]);
    const [summaryMonthlyRows, setSummaryMonthlyRows] = useState([]);
    const [summarySupplierRows, setSummarySupplierRows] = useState([]);
    const [summaryComponentRows, setSummaryComponentRows] = useState([]);
    const [summaryRecycledRows, setSummaryRecycledRows] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [savingSummary, setSavingSummary] = useState(false);
    const [savingRowIndex, setSavingRowIndex] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadReport = async () => {
        try {
            setIsDownloading(true);
            if (!applicationType || !selectedPlantId) {
                 message.error("Missing report context (Type/Plant ID)");
                 return;
            }
    
            const response = await api.get(API_ENDPOINTS.ANALYSIS.COMPLIANCE_REPORT(clientId) + `?type=${applicationType}&itemId=${selectedPlantId}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Plastic_Compliance_Report_${clientId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            message.success("Report downloaded successfully");
        } catch (error) {
            console.error("Download failed:", error);
            message.error("Failed to download report");
        } finally {
            setIsDownloading(false);
        }
    };

    // Remark Modal State
    const [remarkModalOpen, setRemarkModalOpen] = useState(false);
    const [currentRemarkRecord, setCurrentRemarkRecord] = useState(null);
    const [currentRemarkField, setCurrentRemarkField] = useState(null);
    const [tempRemarks, setTempRemarks] = useState([]);
    const [newRemark, setNewRemark] = useState('');

    const openRemarkModal = (record, field) => {
        setCurrentRemarkRecord(record);
        setCurrentRemarkField(field);
        setTempRemarks(Array.isArray(record[field]) ? record[field] : (record[field] ? [record[field]] : []));
        setRemarkModalOpen(true);
    };

    const closeRemarkModal = () => {
        setRemarkModalOpen(false);
        setCurrentRemarkRecord(null);
        setCurrentRemarkField(null);
        setTempRemarks([]);
        setNewRemark('');
    };

    const handleSaveRemarksFromModal = () => {
        if (currentRemarkRecord && currentRemarkField) {
            handlePostValidationChange(currentRemarkRecord.key, currentRemarkField, tempRemarks);
        }
        closeRemarkModal();
    };

    const addRemark = () => {
        if (newRemark.trim()) {
            setTempRemarks([...tempRemarks, newRemark.trim()]);
            setNewRemark('');
        }
    };

    const removeRemark = (index) => {
        const newRemarks = [...tempRemarks];
        newRemarks.splice(index, 1);
        setTempRemarks(newRemarks);
    };

    const handleSummaryChange = (skuCode, field, value) => {
        setSummaryProductRows(prev => prev.map(row => {
            if ((row.skuCode || '').trim() === skuCode) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleComponentSummaryChange = (skuCode, componentCode, field, value) => {
        setSummaryProductRows(prev => prev.map(row => {
            if ((row.skuCode || '').trim() === skuCode && (row.componentCode || '').trim() === componentCode) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleSaveProductAssessment = async () => {
        try {
            setSavingSummary(true);
            await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_ROW_SAVE(clientId), {
                type: applicationType,
                itemId: selectedPlantId,
                rows: summaryProductRows
            });
            message.success("Product assessment saved successfully");
        } catch (error) {
            console.error("Error saving product assessment", error);
            message.error("Failed to save product assessment");
        } finally {
            setSavingSummary(false);
        }
    };

    const handleComponentSave = async (skuCode, componentCode) => {
        // Find the row
        const rowIndex = summaryProductRows.findIndex(r => 
            (r.skuCode || '').trim() === skuCode && 
            (r.componentCode || '').trim() === componentCode
        );

        if (rowIndex === -1) {
            message.error("Row not found");
            return;
        }

        const row = summaryProductRows[rowIndex];

        try {
            setSavingRowIndex(rowIndex);
            await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_ROW_SAVE(clientId), {
                type: applicationType,
                itemId: selectedPlantId,
                rowIndex: rowIndex,
                row: row
            });
            message.success("Row saved successfully");
        } catch (error) {
            console.error("Error saving row", error);
            message.error("Failed to save row");
        } finally {
            setSavingRowIndex(null);
        }
    };

    const resolveUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('blob:')) return path;
        return `${import.meta.env.VITE_API_URL}/${path.replace(/^\/+/, '')}`;
    };

    React.useEffect(() => {
        const fetchSummaryData = async () => {
            if (postValidationActiveTab === 'productAssessment' && clientId) {
                try {
                    setSummaryLoading(true);
                    const params = { type: applicationType, itemId: selectedPlantId };
                    
                    const [prodRes, compRes, suppRes, monthlyRes, recycledRes] = await Promise.all([
                         api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), { params }),
                         api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), { params }),
                         api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), { params }),
                         api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), { params }),
                         api.get(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), { params })
                    ]);
            
                    if (prodRes.data?.success) setSummaryProductRows(prodRes.data.data || []);
                    if (compRes.data?.success) setSummaryComponentRows(compRes.data.data || []);
                    if (suppRes.data?.success) setSummarySupplierRows(suppRes.data.data || []);
                    if (monthlyRes.data?.success) setSummaryMonthlyRows(monthlyRes.data.data || []);
                    if (recycledRes.data?.success) setSummaryRecycledRows(recycledRes.data.data || []);
            
                } catch (error) {
                    console.error("Error fetching summary data", error);
                } finally {
                    setSummaryLoading(false);
                }
            }
        };

        fetchSummaryData();
    }, [postValidationActiveTab, clientId, applicationType, selectedPlantId]);

    // Local state for read-only view controls
    const [localUrepSelectedYear, setLocalUrepSelectedYear] = useState(urepSelectedYear);
    const [localCostAnalysisSubTab, setLocalCostAnalysisSubTab] = useState(costAnalysisSubTab);
    
    // Fallback values for optional props
    const finalUrepSelectedYear = urepSelectedYear || localUrepSelectedYear;
    const finalUrepTargets = urepTargets || [];
    const finalUrepYearOptions = urepYearOptions || [new Date().getFullYear().toString()];
    const finalCostAnalysisSubTab = costAnalysisSubTab || localCostAnalysisSubTab;
    
    // Handlers for local state
    const handleLocalUrepYearChange = (year) => {
        setLocalUrepSelectedYear(year);
        if (setUrepSelectedYear) setUrepSelectedYear(year);
    };

    const handleLocalCostAnalysisSubTabChange = (tab) => {
        setLocalCostAnalysisSubTab(tab);
        if (setCostAnalysisSubTab) setCostAnalysisSubTab(tab);
    };
    const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
    const [expandedPolymers, setExpandedPolymers] = useState(new Set());

    const toggleSupplierExpansion = (supplierName) => {
        const newSet = new Set(expandedSuppliers);
        if (newSet.has(supplierName)) {
            newSet.delete(supplierName);
        } else {
            newSet.add(supplierName);
        }
        setExpandedSuppliers(newSet);
    };

    const togglePolymerExpansion = (polymerName) => {
        const newSet = new Set(expandedPolymers);
        if (newSet.has(polymerName)) {
            newSet.delete(polymerName);
        } else {
            newSet.add(polymerName);
        }
        setExpandedPolymers(newSet);
    };

    return (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                 {clientId ? (
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center">
                                <FaCheckDouble className="text-gray-500 text-xl" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Post-Audit Check</h3>
                                <p className="text-gray-500 text-sm">Review post audit observations and close marking and labelling points.</p>
                            </div>
                        </div>
                        <div className="mb-6">
                            {/* Mobile Tab Select */}
                            <div className="md:hidden mb-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Select Section</label>
                                <Select
                                    value={postValidationActiveTab}
                                    onChange={setPostValidationActiveTab}
                                    className="w-full"
                                    size="large"
                                    options={[
                                        { value: 'productAssessment', label: 'Product Assessment' },
                                        { value: 'markingLabelling', label: 'Packaging Assessment & Marking' },
                                        { value: 'sku', label: 'SKU Compliance' },
                                        { value: 'analysis', label: 'Analysis' },
                                        { value: 'analysis2', label: 'Analysis 2' },
                                        { value: 'costAnalysis', label: 'Cost Analysis' },
                                        { value: 'auditReport', label: 'Audit Report' },
                                        ...(wasteType === 'Plastic' || wasteType === 'Plastic Waste' ? [{ value: 'plasticSpecific', label: 'Plastic Specific Analysis' }] : [])
                                    ]}
                                />
                            </div>

                            {/* Desktop Tab Grid */}
                            <div className="hidden md:block w-full rounded-2xl border border-gray-200 bg-gray-100 p-1">
                                <div className={`grid ${wasteType === 'Plastic' ? 'grid-cols-9' : 'grid-cols-8'} gap-1`}>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('productAssessment')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'productAssessment'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Product Assessment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('markingLabelling')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'markingLabelling'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Packaging Assessment &amp; Marking or Labelling
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('sku')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'sku'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        SKU Compliance
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('analysis')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'analysis'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Analysis
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('analysis2')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'analysis2'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Analysis 2
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('costAnalysis')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'costAnalysis'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Cost Analysis
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostValidationActiveTab('auditReport')}
                                        className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                            postValidationActiveTab === 'auditReport'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-white/70'
                                        }`}
                                    >
                                        Audit Report
                                    </button>
                                    {(wasteType === 'Plastic' || wasteType === 'Plastic Waste') && (
                                        <button
                                            type="button"
                                            onClick={() => setPostValidationActiveTab('plasticSpecific')}
                                            className={`w-full rounded-xl px-4 py-2 text-xs font-semibold leading-tight transition-all ${
                                                postValidationActiveTab === 'plasticSpecific'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-700 hover:bg-white/70'
                                            }`}
                                        >
                                            Plastic Specific Analysis
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            {postValidationActiveTab === 'productAssessment' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                        <div className="text-left">
                                            <p className="text-gray-800 font-semibold">Product Assessment</p>
                                            <p className="text-gray-500 text-xs">Review product assessment details.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSaveProductAssessment}
                                                disabled={summaryLoading || savingSummary}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 shadow-sm transition-all"
                                            >
                                                {savingSummary ? <LoadingOutlined spin /> : <FaSave />} Save Changes
                                            </button>
                                        </div>
                                    </div>
                                    {summaryLoading ? (
                                        <div className="flex justify-center p-8"><LoadingOutlined spin className="text-2xl text-primary-500" /></div>
                                    ) : (
                                        <SummaryReport
                                            clientId={clientId}
                                            productRows={summaryProductRows}
                                            monthlyRows={summaryMonthlyRows}
                                            supplierRows={summarySupplierRows}
                                            componentRows={summaryComponentRows}
                                            recycledRows={summaryRecycledRows}
                                            resolveUrl={resolveUrl}
                                            isSaving={savingSummary}
                                            handleSummaryChange={handleSummaryChange}
                                            handleComponentSummaryChange={handleComponentSummaryChange}
                                            handleSummaryFileChange={() => {}}
                                            handleComponentSummaryFileChange={() => {}}
                                            handleComponentSave={handleComponentSave}
                                            savingRow={savingRowIndex}
                                            handleNext={() => {}} 
                                            onlyTable={true}
                                        />
                                    )}
                                </div>
                            )}
                            {postValidationActiveTab === 'markingLabelling' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                        <div className="text-left">
                                            <p className="text-gray-800 font-semibold">Packaging Assessment &amp; Marking or Labelling</p>
                                            <p className="text-gray-500 text-xs">Data is fetched from Product Compliance and Component Details.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                            <button
                                                type="button"
                                                onClick={handleAddPostValidationRow}
                                                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <FaPlus /> Add Row
                                            </button>
                                            <Popconfirm
                                                title="Are you sure you want to delete all rows?"
                                                onConfirm={handleDeleteAllPostValidation}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <button
                                                    type="button"
                                                    disabled={loading || !postValidationData.length}
                                                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <FaTrashAlt /> Delete All
                                                </button>
                                            </Popconfirm>
                                            <button
                                                type="button"
                                                onClick={handleBulkSavePostValidation}
                                                disabled={loading || !postValidationData.length}
                                                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <FaSave /> Save All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleMarkingLabellingReport}
                                                disabled={loading || !postValidationData.length}
                                                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                <FaFilePdf /> Download Report
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table
                                            dataSource={paginatedPostValidationData}
                                            columns={postValidationColumns}
                                            rowKey={(record) => record.key || record._id}
                                            size="small"
                                            pagination={false}
                                            scroll={{ x: 1200, y: 420 }}
                                            components={{
                                                body: {
                                                    row: HoverRow,
                                                },
                                            }}
                                            rowClassName={(_, index) =>
                                                index % 2 === 0
                                                    ? 'bg-white hover:bg-gray-50 transition-colors'
                                                    : 'bg-gray-50 hover:bg-gray-100 transition-colors'
                                            }
                                            className="marking-labelling-table rounded-lg overflow-hidden"
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handlePostValidationPageChange(
                                                        Math.max(1, postValidationPagination.current - 1)
                                                    )
                                                }
                                                disabled={postValidationPagination.current === 1}
                                                className={`h-8 w-8 flex items-center justify-center rounded border text-xs ${
                                                    postValidationPagination.current === 1
                                                        ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-100'
                                                }`}
                                            >
                                                {'<'}
                                            </button>
                                            {[postValidationPagination.current - 1, postValidationPagination.current, postValidationPagination.current + 1]
                                                .filter((p) => p >= 1 && p <= totalPostValidationPages)
                                                .map((page) => (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() => handlePostValidationPageChange(page)}
                                                        className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded text-xs font-semibold border ${
                                                            page === postValidationPagination.current
                                                                ? 'bg-orange-500 border-orange-500 text-white'
                                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handlePostValidationPageChange(
                                                        Math.min(
                                                            totalPostValidationPages,
                                                            postValidationPagination.current + 1
                                                        )
                                                    )
                                                }
                                                disabled={postValidationPagination.current === totalPostValidationPages}
                                                className={`h-8 w-8 flex items-center justify-center rounded border text-xs ${
                                                    postValidationPagination.current === totalPostValidationPages
                                                        ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-100'
                                                }`}
                                            >
                                                {'>'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                                            <Select
                                                size="small"
                                                value={postValidationPagination.pageSize}
                                                onChange={handlePostValidationPageSizeChange}
                                                options={[
                                                    { value: 10, label: '10 / page' },
                                                    { value: 20, label: '20 / page' },
                                                    { value: 50, label: '50 / page' },
                                                ]}
                                                className="w-28"
                                            />
                                            <div className="flex items-center gap-1">
                                                <span>Go to</span>
                                                <Input
                                                    size="small"
                                                    value={postValidationGotoPage}
                                                    onChange={(e) => setPostValidationGotoPage(e.target.value)}
                                                    onPressEnter={handlePostValidationGotoSubmit}
                                                    className="w-16 text-center"
                                                />
                                                <span>Page</span>
                                                <Button
                                                    size="small"
                                                    type="default"
                                                    onClick={handlePostValidationGotoSubmit}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    Go
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {postValidationActiveTab === 'sku' && (
                                <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <FaClipboardCheck className="text-orange-600 text-lg" />
                                                </div>
                                                <div>
                                                    <h3 className="text-gray-800 font-bold text-base">SKU Compliance</h3>
                                                    <p className="text-gray-500 text-xs">Track and manage SKU compliance status</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Input
                                                    placeholder="Search SKU code or description..."
                                                    value={skuSearchText}
                                                    onChange={(e) => {
                                                        setSkuSearchText(e.target.value);
                                                        setSkuPagination(prev => ({ ...prev, current: 1 }));
                                                    }}
                                                    allowClear
                                                    className="w-64 h-9 rounded-lg"
                                                    prefix={<span className="text-gray-400 text-xs">Search</span>}
                                                />
                                                <Select
                                                    value={skuStatusFilter}
                                                    onChange={(val) => {
                                                        setSkuStatusFilter(val);
                                                        setSkuPagination(prev => ({ ...prev, current: 1 }));
                                                    }}
                                                    options={[
                                                        { label: 'All Status', value: 'all' },
                                                        { label: 'Compliant', value: 'Compliant' },
                                                        { label: 'Non-Compliant', value: 'Non-Compliant' },
                                                        { label: 'Partially Compliant', value: 'Partially Compliant' },
                                                        { label: 'Not Set', value: 'notset' }
                                                    ]}
                                                    className="w-40 h-9"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSkuComplianceReport}
                                                    disabled={loading || !skuComplianceData?.length}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 shadow-sm transition-all"
                                                >
                                                    <FaFilePdf /> Download Report
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-medium">Total SKUs</span>
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-600 text-xs font-bold">#</span>
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold text-gray-800 mt-1">{skuComplianceData?.length || 0}</p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-green-200 p-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-medium">Compliant</span>
                                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                                        <FaCheckCircle className="text-green-600 text-xs" />
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold text-green-600 mt-1">
                                                    {skuComplianceData?.filter(r => r.complianceStatus === 'Compliant').length || 0}
                                                </p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-red-200 p-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-medium">Non-Compliant</span>
                                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                                        <FaExclamationCircle className="text-red-600 text-xs" />
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold text-red-600 mt-1">
                                                    {skuComplianceData?.filter(r => r.complianceStatus === 'Non-Compliant').length || 0}
                                                </p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-medium">Partially Compliant</span>
                                                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                                                        <span className="text-amber-600 text-xs font-bold">!</span>
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold text-amber-600 mt-1">
                                                    {skuComplianceData?.filter(r => r.complianceStatus === 'Partially Compliant').length || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        <Table
                                            columns={skuComplianceColumns}
                                            dataSource={(() => {
                                                // Ensure we use the latest prop if available, or fallback to internal state
                                                let dataToFilter = skuTableDataSource && skuTableDataSource.length > 0 
                                                    ? skuTableDataSource 
                                                    : (skuComplianceData || []);
                                                
                                                if (skuSearchText) {
                                                    const search = skuSearchText.toLowerCase();
                                                    dataToFilter = dataToFilter.filter(r => 
                                                        (r.skuCode || '').toLowerCase().includes(search) ||
                                                        (r.skuDescription || '').toLowerCase().includes(search)
                                                    );
                                                }
                                                if (skuStatusFilter !== 'all') {
                                                    if (skuStatusFilter === 'notset') {
                                                        dataToFilter = dataToFilter.filter(r => !r.complianceStatus);
                                                    } else {
                                                        dataToFilter = dataToFilter.filter(r => r.complianceStatus === skuStatusFilter);
                                                    }
                                                }
                                                return dataToFilter;
                                            })()}
                                            pagination={{
                                                current: skuPagination.current,
                                                pageSize: skuPagination.pageSize,
                                                showSizeChanger: true,
                                                pageSizeOptions: ['5', '10', '20', '50'],
                                                showTotal: (total, range) => (
                                                    <span className="text-xs text-gray-500">
                                                        Showing {range[0]}-{range[1]} of {total} SKUs
                                                    </span>
                                                ),
                                                onChange: (page, pageSize) => setSkuPagination({ current: page, pageSize }),
                                                className: 'mt-4'
                                            }}
                                            scroll={{ x: 2900 }}
                                            size="small"
                                            bordered
                                            rowClassName={(_, index) =>
                                                index % 2 === 0
                                                    ? 'bg-white hover:bg-blue-50 transition-colors'
                                                    : 'bg-gray-50/50 hover:bg-blue-50 transition-colors'
                                            }
                                            components={{
                                                body: {
                                                    row: HoverRow,
                                                },
                                            }}
                                            onRow={(record) => ({
                                                record,
                                            })}
                                            className="sku-compliance-table"
                                            rowKey={(record) => record.key || record._id || Math.random()}
                                            locale={{
                                                emptyText: (
                                                    <div className="py-12 text-center">
                                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                                            <FaClipboardCheck className="text-gray-400 text-2xl" />
                                                        </div>
                                                        <p className="text-gray-500 font-medium">No SKU Compliance Data</p>
                                                        <p className="text-gray-400 text-sm mt-1">
                                                            {skuSearchText || skuStatusFilter !== 'all' 
                                                                ? 'Try adjusting your search or filter criteria'
                                                                : 'Add product compliance data to see SKU compliance here'}
                                                        </p>
                                                    </div>
                                                )
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {postValidationActiveTab === 'analysis' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-6">
                                    <div className="mb-4">
                                        <p className="text-gray-800 font-semibold">Post-Audit Analysis</p>
                                    </div>
                                    <div className="mb-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">Monthly Procurement Data</p>
                                                <p className="text-xs text-gray-500">Month-wise purchase (MT) and recycled quantity.</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded bg-orange-500"></span>
                                                    <span>Monthly purchase (MT)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded bg-green-500"></span>
                                                    <span>Recycled quantity (MT)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700">View By:</span>
                                                <div className="flex bg-gray-100 rounded-lg p-1">
                                                    {['Month', 'Quarter', 'Half-Year'].map((mode) => (
                                                        <button
                                                            key={mode}
                                                            onClick={() => setMonthlyProcurementViewMode(mode)}
                                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                                                monthlyProcurementViewMode === mode
                                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                                    : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                        >
                                                            {mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700">Display:</span>
                                                <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMonthlyProcurementDisplayMode('graph')}
                                                        className={`
                                                            inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all
                                                            ${
                                                                monthlyProcurementDisplayMode === 'graph'
                                                                    ? 'bg-orange-600 text-white shadow-sm'
                                                                    : 'text-gray-600 hover:text-gray-800'
                                                            }
                                                        `}
                                                    >
                                                        Graph
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMonthlyProcurementDisplayMode('table')}
                                                        className={`
                                                            inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all
                                                            ${
                                                                monthlyProcurementDisplayMode === 'table'
                                                                    ? 'bg-orange-600 text-white shadow-sm'
                                                                    : 'text-gray-600 hover:text-gray-800'
                                                            }
                                                        `}
                                                    >
                                                        Table
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMonthlyProcurementFilterOpen((prev) => ({ ...prev, category: !prev.category }))}
                                                            className="w-full inline-flex items-center justify-between rounded-md border border-orange-200 bg-white text-orange-800 text-xs font-semibold px-3 py-2 shadow-sm hover:bg-orange-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FaFilter className="text-orange-500" />
                                                                <span>Filter by category</span>
                                                            </div>
                                                            <FaChevronDown className={`text-orange-400 transition-transform duration-200 ${monthlyProcurementFilterOpen.category ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {monthlyProcurementFilterOpen.category && (
                                                            <div className="absolute z-20 mt-2 w-56 rounded-md border border-orange-200 bg-white shadow-lg p-2">
                                                                <div className="text-[11px] font-semibold text-orange-700 mb-1">Category</div>
                                                                <label className="flex items-center gap-2 py-1 text-xs">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(monthlyProcurementFilters.category || []).length === 0}
                                                                        onChange={() =>
                                                                            setMonthlyProcurementFilters((prev) => ({ ...prev, category: [] }))
                                                                        }
                                                                    />
                                                                    <span>All</span>
                                                                </label>
                                                                {Array.from(new Set(monthlyProcurementRaw.map((r) => r.category).filter(Boolean))).map((cat) => {
                                                                    const checked = (monthlyProcurementFilters.category || []).includes(cat);
                                                                    return (
                                                                        <label key={cat} className="flex items-center gap-2 py-1 text-xs">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                    setMonthlyProcurementFilters((prev) => {
                                                                                        const arr = prev.category || [];
                                                                                        const next = checked ? arr.filter((v) => v !== cat) : [...arr, cat];
                                                                                        return { ...prev, category: next };
                                                                                    })
                                                                                }
                                                                            />
                                                                            <span className="text-gray-800">{cat}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMonthlyProcurementFilterOpen((prev) => ({ ...prev, polymer: !prev.polymer }))}
                                                            className="w-full inline-flex items-center justify-between rounded-md border border-orange-200 bg-white text-orange-800 text-xs font-semibold px-3 py-2 shadow-sm hover:bg-orange-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FaFilter className="text-orange-500" />
                                                                <span>Filter by polymer</span>
                                                            </div>
                                                            <FaChevronDown className={`text-orange-400 transition-transform duration-200 ${monthlyProcurementFilterOpen.polymer ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {monthlyProcurementFilterOpen.polymer && (
                                                            <div className="absolute z-20 mt-2 w-56 rounded-md border border-orange-200 bg-white shadow-lg p-2">
                                                                <div className="text-[11px] font-semibold text-orange-700 mb-1">Polymer</div>
                                                                <label className="flex items-center gap-2 py-1 text-xs">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(monthlyProcurementFilters.polymer || []).length === 0}
                                                                        onChange={() =>
                                                                            setMonthlyProcurementFilters((prev) => ({ ...prev, polymer: [] }))
                                                                        }
                                                                    />
                                                                    <span>All</span>
                                                                </label>
                                                                {Array.from(new Set(monthlyProcurementRaw.map((r) => r.polymer).filter(Boolean))).map((poly) => {
                                                                    const checked = (monthlyProcurementFilters.polymer || []).includes(poly);
                                                                    return (
                                                                        <label key={poly} className="flex items-center gap-2 py-1 text-xs">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                    setMonthlyProcurementFilters((prev) => {
                                                                                        const arr = prev.polymer || [];
                                                                                        const next = checked ? arr.filter((v) => v !== poly) : [...arr, poly];
                                                                                        return { ...prev, polymer: next };
                                                                                    })
                                                                                }
                                                                            />
                                                                            <span className="text-gray-800">{poly}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMonthlyProcurementFilterOpen((prev) => ({ ...prev, quarter: !prev.quarter }))}
                                                            className="w-full inline-flex items-center justify-between rounded-md border border-orange-200 bg-white text-orange-800 text-xs font-semibold px-3 py-2 shadow-sm hover:bg-orange-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FaFilter className="text-orange-500" />
                                                                <span>Filter by quarter</span>
                                                            </div>
                                                            <FaChevronDown className={`text-orange-400 transition-transform duration-200 ${monthlyProcurementFilterOpen.quarter ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {monthlyProcurementFilterOpen.quarter && (
                                                            <div className="absolute z-20 mt-2 w-56 rounded-md border border-orange-200 bg-white shadow-lg p-2">
                                                                <div className="text-[11px] font-semibold text-orange-700 mb-1">Quarter</div>
                                                                <label className="flex items-center gap-2 py-1 text-xs">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(monthlyProcurementFilters.quarter || []).length === 0}
                                                                        onChange={() =>
                                                                            setMonthlyProcurementFilters((prev) => ({ ...prev, quarter: [] }))
                                                                        }
                                                                    />
                                                                    <span>All</span>
                                                                </label>
                                                                {Array.from(new Set(monthlyProcurementRaw.map((r) => r.quarter).filter((v) => v && v !== 'Unknown'))).map((q) => {
                                                                    const checked = (monthlyProcurementFilters.quarter || []).includes(q);
                                                                    return (
                                                                        <label key={q} className="flex items-center gap-2 py-1 text-xs">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                    setMonthlyProcurementFilters((prev) => {
                                                                                        const arr = prev.quarter || [];
                                                                                        const next = checked ? arr.filter((v) => v !== q) : [...arr, q];
                                                                                        return { ...prev, quarter: next };
                                                                                    })
                                                                                }
                                                                            />
                                                                            <span className="text-gray-800">{q}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMonthlyProcurementFilterOpen((prev) => ({ ...prev, half: !prev.half }))}
                                                            className="w-full inline-flex items-center justify-between rounded-md border border-orange-200 bg-white text-orange-800 text-xs font-semibold px-3 py-2 shadow-sm hover:bg-orange-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FaFilter className="text-orange-500" />
                                                                <span>Filter by half</span>
                                                            </div>
                                                            <FaChevronDown className={`text-orange-400 transition-transform duration-200 ${monthlyProcurementFilterOpen.half ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {monthlyProcurementFilterOpen.half && (
                                                            <div className="absolute z-20 mt-2 w-56 rounded-md border border-orange-200 bg-white shadow-lg p-2">
                                                                <div className="text-[11px] font-semibold text-orange-700 mb-1">Half-Quarter</div>
                                                                <label className="flex items-center gap-2 py-1 text-xs">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(monthlyProcurementFilters.half || []).length === 0}
                                                                        onChange={() =>
                                                                            setMonthlyProcurementFilters((prev) => ({ ...prev, half: [] }))
                                                                        }
                                                                    />
                                                                    <span>All</span>
                                                                </label>
                                                                {Array.from(new Set(monthlyProcurementRaw.map((r) => r.half).filter((v) => v && v !== 'Unknown'))).map((h) => {
                                                                    const checked = (monthlyProcurementFilters.half || []).includes(h);
                                                                    return (
                                                                        <label key={h} className="flex items-center gap-2 py-1 text-xs">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                    setMonthlyProcurementFilters((prev) => {
                                                                                        const arr = prev.half || [];
                                                                                        const next = checked ? arr.filter((v) => v !== h) : [...arr, h];
                                                                                        return { ...prev, half: next };
                                                                                    })
                                                                                }
                                                                            />
                                                                            <span className="text-gray-800">{h}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(monthlyProcurementFilters.category || []).length > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] text-orange-700">
                                                                Category: {(monthlyProcurementFilters.category || []).join(', ')}
                                                            </span>
                                                        )}
                                                        {(monthlyProcurementFilters.polymer || []).length > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] text-orange-700">
                                                                Polymer: {(monthlyProcurementFilters.polymer || []).join(', ')}
                                                            </span>
                                                        )}
                                                        {(monthlyProcurementFilters.quarter || []).length > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] text-orange-700">
                                                                Quarter: {(monthlyProcurementFilters.quarter || []).join(', ')}
                                                            </span>
                                                        )}
                                                        {(monthlyProcurementFilters.half || []).length > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] text-orange-700">
                                                                Half: {(monthlyProcurementFilters.half || []).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setMonthlyProcurementFilters({
                                                                category: [],
                                                                polymer: [],
                                                                quarter: [],
                                                                half: [],
                                                            })
                                                        }
                                                        className="px-3 py-1.5 rounded-md border border-orange-300 text-[11px] font-medium text-orange-800 hover:bg-orange-100 bg-white"
                                                    >
                                                        Clear filters
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {monthlyProcurementLoading && (
                                            <div className="text-xs text-gray-500">Loading monthly procurement data...</div>
                                        )}
                                        {!monthlyProcurementLoading && monthlyProcurementError && (
                                            <div className="text-xs text-red-500">{monthlyProcurementError}</div>
                                        )}
                                        {!monthlyProcurementLoading && !monthlyProcurementError && (
                                            <>
                                                {monthlyProcurementSummary.length === 0 ? (
                                                    <div className="text-xs text-gray-500">No monthly procurement data available.</div>
                                                ) : (
                                                    <div className="overflow-x-auto mb-8">
                                                        <div className="min-w-[480px] max-w-4xl mx-auto px-4 pt-6">
                                                            {(() => {
                                                                const periodLabel =
                                                                    monthlyProcurementViewMode === 'Month'
                                                                        ? 'Monthly'
                                                                        : monthlyProcurementViewMode === 'Quarter'
                                                                            ? 'Quarterly'
                                                                            : 'Half-Yearly';

                                                                if (monthlyProcurementDisplayMode === 'table') {
                                                                    return (
                                                                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                                            <thead className="bg-gray-50">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                                                                        {monthlyProcurementViewMode === 'Month'
                                                                                            ? 'Month'
                                                                                            : monthlyProcurementViewMode === 'Quarter'
                                                                                                ? 'Quarter'
                                                                                                : 'Half'}
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                                        Purchase (MT)
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                                        Recycled (MT)
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                                {monthlyProcurementSummary.map((item) => {
                                                                                    const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                                                    const recycled = Number(item.recycledQty) || 0;
                                                                                    return (
                                                                                        <tr key={item.month}>
                                                                                            <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                                                                                                {item.month}
                                                                                            </td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-800">
                                                                                                {purchase.toFixed(2)}
                                                                                            </td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-800">
                                                                                                {recycled.toFixed(2)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    );
                                                                }

                                                                const maxValue = monthlyProcurementSummary.reduce((max, item) => {
                                                                    const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                                    const recycled = Number(item.recycledQty) || 0;
                                                                    const total = purchase + recycled;
                                                                    return total > max ? total : max;
                                                                }, 0);

                                                                if (!maxValue) {
                                                                    return (
                                                                        <div className="text-xs text-gray-500">
                                                                            {periodLabel} procurement values are zero.
                                                                        </div>
                                                                    );
                                                                }

                                                                const step = maxValue / 4;
                                                                const gridValues = [0, step, step * 2, step * 3, maxValue];

                                                                return (
                                                                    <div className="relative h-96 w-full bg-white rounded-lg p-4 border border-gray-100 shadow-sm mt-2">
                                                                        {/* Grid Lines & Y-Axis Labels */}
                                                                        <div className="absolute inset-0 left-12 right-4 top-28 bottom-8 flex flex-col justify-between pointer-events-none">
                                                                            {[...gridValues].reverse().map((val, i) => (
                                                                                <div key={i} className="relative w-full h-px bg-gray-100 border-t border-dashed border-gray-200">
                                                                                    <span className="absolute -left-12 -top-2 w-10 text-right text-[10px] text-gray-400 font-medium">
                                                                                        {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Bars Container */}
                                                                        <div className="absolute inset-0 left-12 right-4 top-28 bottom-8 flex items-end justify-around gap-2 px-2">
                                                                            {monthlyProcurementSummary.map((item) => {
                                                                                const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                                                const recycled = Number(item.recycledQty) || 0;
                                                                                const total = purchase + recycled;
                                                                                const totalHeight = total && maxValue ? (total / maxValue) * 100 : 0;
                                                                                const purchaseHeight = total ? (purchase / total) * 100 : 0;
                                                                                const recycledHeight = total ? (recycled / total) * 100 : 0;
                                                                                
                                                                                return (
                                                                                    <div
                                                                                        key={item.month}
                                                                                        className="group relative flex flex-col justify-end w-full max-w-[48px] h-full"
                                                                                    >
                                                                                        {/* Tooltip */}
                                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 shadow-xl translate-y-2 group-hover:translate-y-0">
                                                                                            <div className="font-bold text-xs border-b border-gray-700 pb-1 mb-1 text-gray-100">{item.month}</div>
                                                                                            <div className="space-y-1">
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <span className="text-gray-400">Total:</span>
                                                                                                    <span className="font-mono font-bold text-white">{total.toFixed(2)}</span>
                                                                                                </div>
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                                                                                        <span className="text-gray-300">Purchase:</span>
                                                                                                    </div>
                                                                                                    <span className="font-mono text-orange-200">{purchase.toFixed(2)}</span>
                                                                                                </div>
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                                                                                        <span className="text-gray-300">Recycled:</span>
                                                                                                    </div>
                                                                                                    <span className="font-mono text-green-200">{recycled.toFixed(2)}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* Arrow */}
                                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                                        </div>

                                                                                        {/* Stacked Bar */}
                                                                                        <div 
                                                                                            className="w-full rounded-t overflow-hidden transition-all duration-500 ease-out hover:brightness-110 shadow-sm relative group-hover:shadow-md cursor-pointer"
                                                                                            style={{ height: `${totalHeight}%` }}
                                                                                        >
                                                                                            {/* Recycled Part (Top) */}
                                                                                            <div 
                                                                                                className="w-full bg-gradient-to-b from-green-400 to-green-500"
                                                                                                style={{ height: `${recycledHeight}%` }}
                                                                                            ></div>
                                                                                            {/* Purchase Part (Bottom) */}
                                                                                            <div 
                                                                                                className="w-full bg-gradient-to-b from-orange-400 to-orange-500"
                                                                                                style={{ height: `${purchaseHeight}%` }}
                                                                                            ></div>
                                                                                        </div>

                                                                                        {/* X-Axis Label */}
                                                                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 whitespace-nowrap rotate-0 group-hover:text-gray-800 transition-colors">
                                                                                            {item.month.substring(0, 3)}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {(() => {
                                                    const polymerSummaryResult = buildPolymerProcurementSummary(
                                                        monthlyProcurementRaw,
                                                        monthlyProcurementFilters,
                                                        monthlyProcurementViewMode
                                                    );
                                                    const categorySummaryResult = buildCategoryProcurementSummary(
                                                        monthlyProcurementRaw,
                                                        monthlyProcurementFilters,
                                                        monthlyProcurementViewMode
                                                    );

                                                    // Sanitize data to handle "-" values
                                                    const polymerData = (polymerSummaryResult.data || []).map(row => ({
                                                        ...row,
                                                        monthlyPurchaseMt: row.monthlyPurchaseMt === '-' ? 0 : (Number(row.monthlyPurchaseMt) || 0),
                                                        recycledQty: row.recycledQty === '-' ? 0 : (Number(row.recycledQty) || 0)
                                                    }));
                                                    const polymerKeys = polymerSummaryResult.keys || [];
                                                    
                                                    const categoryData = (categorySummaryResult.data || []).map(row => ({
                                                        ...row,
                                                        monthlyPurchaseMt: row.monthlyPurchaseMt === '-' ? 0 : (Number(row.monthlyPurchaseMt) || 0),
                                                        recycledQty: row.recycledQty === '-' ? 0 : (Number(row.recycledQty) || 0)
                                                    }));
                                                    const categoryKeys = categorySummaryResult.keys || [];

                                                    const STACK_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];

                                                    if (!polymerData.length && !categoryData.length) {
                                                        return (
                                                            <div className="text-xs text-gray-500">
                                                                No polymer/category-wise procurement data available.
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {/* Polymer Section */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-xs font-semibold text-gray-700">
                                                                        Polymer-wise Procurement (Stacked)
                                                                    </p>
                                                                    <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5">
                                                                        <button
                                                                            onClick={() => setPolymerViewMode('table')}
                                                                            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center ${
                                                                                polymerViewMode === 'table'
                                                                                    ? 'bg-white text-gray-800 shadow-sm'
                                                                                    : 'text-gray-500 hover:text-gray-700'
                                                                            }`}
                                                                        >
                                                                            <TableOutlined className="mr-1" /> Table
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setPolymerViewMode('graph')}
                                                                            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center ${
                                                                                polymerViewMode === 'graph'
                                                                                    ? 'bg-white text-gray-800 shadow-sm'
                                                                                    : 'text-gray-500 hover:text-gray-700'
                                                                            }`}
                                                                        >
                                                                            <BarChartOutlined className="mr-1" /> Graph
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                
                                                                {polymerViewMode === 'table' ? (
                                                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                                                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                                            <thead className="bg-gray-50">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Polymer</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Purchase (MT)</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Recycled (MT)</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                                {polymerData.length > 0 ? polymerData.map((row, i) => {
                                                                                    const total = (row.monthlyPurchaseMt || 0) + (row.recycledQty || 0);
                                                                                    return (
                                                                                        <tr key={i}>
                                                                                            <td className="px-3 py-1.5 text-gray-800 font-medium sticky left-0 bg-white z-10 shadow-sm">{row.label}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-600">{(row.monthlyPurchaseMt || 0).toFixed(2)}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-600">{(row.recycledQty || 0).toFixed(2)}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-800 font-semibold">{total.toFixed(2)}</td>
                                                                                        </tr>
                                                                                    );
                                                                                }) : (
                                                                                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No polymers found</td></tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-white border border-gray-100 rounded-lg p-2 h-80 shadow-sm">
                                                                        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                                                            <BarChart data={polymerData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                                                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                                                <RechartsTooltip 
                                                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                                                                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}
                                                                                    cursor={{ fill: '#f9fafb' }}
                                                                                />
                                                                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconSize={8} />
                                                                                <Bar 
                                                                                    dataKey="monthlyPurchaseMt" 
                                                                                    name="Purchase (MT)" 
                                                                                    stackId="a" 
                                                                                    fill="#8884d8" 
                                                                                    barSize={32}
                                                                                />
                                                                                <Bar 
                                                                                    dataKey="recycledQty" 
                                                                                    name="Recycled (MT)" 
                                                                                    stackId="a" 
                                                                                    fill="#82ca9d" 
                                                                                    barSize={32}
                                                                                    radius={[4, 4, 0, 0]}
                                                                                />
                                                                            </BarChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Category Section */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-xs font-semibold text-gray-700">
                                                                        Category-wise Procurement (Stacked)
                                                                    </p>
                                                                    <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5">
                                                                        <button
                                                                            onClick={() => setCategoryViewMode('table')}
                                                                            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center ${
                                                                                categoryViewMode === 'table'
                                                                                    ? 'bg-white text-gray-800 shadow-sm'
                                                                                    : 'text-gray-500 hover:text-gray-700'
                                                                            }`}
                                                                        >
                                                                            <TableOutlined className="mr-1" /> Table
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setCategoryViewMode('graph')}
                                                                            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center ${
                                                                                categoryViewMode === 'graph'
                                                                                    ? 'bg-white text-gray-800 shadow-sm'
                                                                                    : 'text-gray-500 hover:text-gray-700'
                                                                            }`}
                                                                        >
                                                                            <BarChartOutlined className="mr-1" /> Graph
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {categoryViewMode === 'table' ? (
                                                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                                                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                                            <thead className="bg-gray-50">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Category</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Purchase (MT)</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Recycled (MT)</th>
                                                                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                                {categoryData.length > 0 ? categoryData.map((row, i) => {
                                                                                    const total = (row.monthlyPurchaseMt || 0) + (row.recycledQty || 0);
                                                                                    return (
                                                                                        <tr key={i}>
                                                                                            <td className="px-3 py-1.5 text-gray-800 font-medium sticky left-0 bg-white z-10 shadow-sm">{row.label}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-600">{(row.monthlyPurchaseMt || 0).toFixed(2)}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-600">{(row.recycledQty || 0).toFixed(2)}</td>
                                                                                            <td className="px-3 py-1.5 text-right text-gray-800 font-semibold">{total.toFixed(2)}</td>
                                                                                        </tr>
                                                                                    );
                                                                                }) : (
                                                                                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No categories found</td></tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-white border border-gray-100 rounded-lg p-2 h-80 shadow-sm">
                                                                        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                                                            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                                                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                                                <RechartsTooltip 
                                                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                                                                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}
                                                                                    cursor={{ fill: '#f9fafb' }}
                                                                                />
                                                                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconSize={8} />
                                                                                <Bar 
                                                                                    dataKey="monthlyPurchaseMt" 
                                                                                    name="Purchase (MT)" 
                                                                                    stackId="a" 
                                                                                    fill="#ffc658" 
                                                                                    barSize={32}
                                                                                />
                                                                                <Bar 
                                                                                    dataKey="recycledQty" 
                                                                                    name="Recycled (MT)" 
                                                                                    stackId="a" 
                                                                                    fill="#ff7300" 
                                                                                    barSize={32}
                                                                                    radius={[4, 4, 0, 0]}
                                                                                />
                                                                            </BarChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </div>

                                </div>
                            )}
                            {postValidationActiveTab === 'analysis2' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-6">
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                                            <div>
                                                <p className="text-gray-800 font-semibold">UREP Target (Normalized)</p>
                                                <p className="text-xs text-gray-500">
                                                    Category-wise UREP targets stored as Category + Year + Target Value.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700">Financial Year:</span>
                                                <select
                                                    value={finalUrepSelectedYear}
                                                    onChange={(e) => handleLocalUrepYearChange(e.target.value)}
                                                    disabled={readOnly}
                                                    className={`text-xs px-3 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-700 ${readOnly ? 'cursor-not-allowed' : ''}`}
                                                >
                                                    {finalUrepYearOptions.map((year) => (
                                                        <option key={year} value={year}>
                                                            {year}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            {(() => {
                                                const rowsForYear = finalUrepTargets.filter((row) => row.year === finalUrepSelectedYear);
                                                if (!rowsForYear.length) {
                                                    return (
                                                        <div className="text-xs text-gray-500">
                                                            No UREP targets configured for {finalUrepSelectedYear}.
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                                                    Category
                                                                </th>
                                                                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                                                    Year
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Target Value
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {rowsForYear.map((row) => (
                                                                <tr key={`${row.category}-${row.year}`}>
                                                                    <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                                                                        {row.category}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                                                                        {row.year}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right">
                                                                        <input
                                                                            type="number"
                                                                            value={row.targetValue}
                                                                            readOnly={readOnly}
                                                                            disabled={readOnly}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setUrepTargets((prev) =>
                                                                                    prev.map((r) =>
                                                                                        r.category === row.category && r.year === row.year
                                                                                            ? { ...r, targetValue: value }
                                                                                            : r
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className={`w-24 px-2 py-1 border border-gray-300 rounded-md text-right text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-800 font-semibold mb-2">UREP Performance Summary</p>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Comparison of UREP target percentage with actual recycled performance by category.
                                        </p>
                                        <div className="overflow-x-auto">
                                            {(() => {
                                                const rowsForYear = urepTargets.filter((row) => row.year === urepSelectedYear);
                                                if (!rowsForYear.length) {
                                                    return (
                                                        <div className="text-xs text-gray-500">
                                                            No UREP targets configured for {urepSelectedYear}.
                                                        </div>
                                                    );
                                                }
                                                const categorySummaryResult = buildCategoryProcurementSummary(
                                                    monthlyProcurementRaw,
                                                    monthlyProcurementFilters
                                                );
                                                const categorySummaryData = categorySummaryResult.data || [];
                                                
                                                const summaryByCategory = new Map();
                                                categorySummaryData.forEach((item) => {
                                                    summaryByCategory.set(item.label, item);
                                                });
                                                if (!categorySummaryData.length) {
                                                    return (
                                                        <div className="text-xs text-gray-500">
                                                            No monthly procurement data available for category-wise summary.
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                                                    Category
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Target %
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Monthly Purchase (MT)
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Recycled %
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Recycled Qty (MT)
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                                                    Deviation
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {rowsForYear.map((row) => {
                                                                const targetPercent = parseFloat(row.targetValue) || 0;
                                                                const summary = summaryByCategory.get(row.category) || {};
                                                                const purchase = Number(summary.monthlyPurchaseMt) || 0;
                                                                const recycledQty = Number(summary.recycledQty) || 0;
                                                                const recycledPercent =
                                                                    purchase > 0 ? (recycledQty / purchase) * 100 : 0;
                                                                const deviation = targetPercent - recycledPercent;
                                                                return (
                                                                    <tr key={`summary-${row.category}-${row.year}`} className="transition-colors hover:bg-orange-50">
                                                                        <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                                                                            {row.category}
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-right text-gray-800">
                                                                            {targetPercent.toFixed(2)}
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-right text-gray-800">
                                                                            {purchase.toFixed(2)}
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-right text-gray-800">
                                                                            {recycledPercent.toFixed(2)}
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-right text-gray-800">
                                                                            {recycledQty.toFixed(2)}
                                                                        </td>
                                                                        <td className={`px-3 py-1.5 text-right font-semibold ${deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                {deviation > 0 ? <FaExclamationCircle /> : <FaCheckCircle />}
                                                                                <span>{deviation.toFixed(2)}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {postValidationActiveTab === 'costAnalysis' && (
                                <div className="border border-gray-200 rounded-xl bg-white flex overflow-hidden min-h-[500px]">
                                    {/* Vertical Tabs Sidebar */}
                                    <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col">
                                        {[
                                            { id: 'Product', label: 'Product' },
                                            { id: 'Component', label: 'Component' },
                                            { id: 'Polymer', label: 'Polymer' },
                                            { id: 'Category', label: 'Category' },
                                            { id: 'Supplier', label: 'Supplier' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setCostAnalysisSubTab(tab.id)}
                                                className={`px-4 py-3 text-left text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                                                    costAnalysisSubTab === tab.id
                                                        ? 'bg-white text-primary-600 border-l-4 border-primary-600 shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-100 border-l-4 border-transparent'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {costAnalysisSubTab === tab.id && <i className="fas fa-chevron-right text-xs"></i>}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content Area */}
                                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                <span className="bg-primary-50 text-primary-600 p-2 rounded-lg">
                                                    <FaChartLine />
                                                </span>
                                                {costAnalysisSubTab} Analysis
                                            </h3>
                                            <p className="text-gray-500 text-sm mt-1 ml-11">
                                                Breakdown of procurement costs and rates by {costAnalysisSubTab.toLowerCase()}.
                                            </p>
                                        </div>

                                        {/* Dynamic Content Table */}
                                        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {costAnalysisSubTab === 'Component' && (
                                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Product Name
                                                            </th>
                                                        )}
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            {costAnalysisSubTab} Name
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            Recycled Qty
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            Recycled Amount (₹)
                                                        </th>
                                                        {costAnalysisSubTab === 'Product' && (
                                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Recycled %
                                                            </th>
                                                        )}
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            Virgin Qty
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            Virgin Amount (₹)
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            Total Spend (₹)
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {(() => {
                                                        // Group data based on the selected sub-tab
                                                        const groupedData = postValidationData.reduce((acc, row) => {
                                                            let key = 'Unknown';
                                                            let displayName = 'Unknown';
                                                            let productName = 'Unknown';

                                                            if (costAnalysisSubTab === 'Product') {
                                                                const pName = row.productName || 'Unknown';
                                                                const pDesc = row.skuDescription || '';
                                                                key = `${pName}::${pDesc}`;
                                                                displayName = pName;
                                                            }
                                                            else if (costAnalysisSubTab === 'Component') {
                                                                const pName = row.productName || 'Unknown';
                                                                const cName = row.componentName || 'Unknown';
                                                                const pDesc = row.skuDescription || '';
                                                                key = `${pName}::${pDesc}::${cName}`;
                                                                displayName = cName;
                                                                productName = pName;
                                                            }
                                                            else if (costAnalysisSubTab === 'Polymer') {
                                                                key = row.componentPolymer || row.polymer || 'Unknown';
                                                                displayName = key;
                                                            }
                                                            else if (costAnalysisSubTab === 'Category') {
                                                                key = row.category || 'Unknown';
                                                                displayName = key;
                                                            }
                                                            else if (costAnalysisSubTab === 'Supplier') {
                                                                key = row.supplierName || 'Unknown';
                                                                displayName = key;
                                                            }

                                                            if (!acc[key]) acc[key] = { 
                                                                displayName,
                                                                productName,
                                                                vRates: [], 
                                                                rRates: [], 
                                                                totalSpend: 0,
                                                                recycledQty: 0,
                                                                recycledAmount: 0,
                                                                recycledPercents: [],
                                                                virginQty: 0,
                                                                virginAmount: 0,
                                                                description: row.skuDescription || '',
                                                                items: []
                                                            };
                                                            
                                                            acc[key].items.push(row);

                                                            if (parseFloat(row.virginRate)) acc[key].vRates.push(parseFloat(row.virginRate));
                                                            if (parseFloat(row.recycledRate)) acc[key].rRates.push(parseFloat(row.recycledRate));
                                                            if (row.recycledPercent) acc[key].recycledPercents.push(parseFloat(row.recycledPercent));
                                                            
                                                            const vCost = parseFloat(row.virginQtyAmount) || 0;
                                                            const rCost = parseFloat(row.recycledQrtAmount) || 0;
                                                            const rQty = parseFloat(row.recycledQty) || 0;
                                                            const vQty = parseFloat(row.virginQty) || 0;

                                                            acc[key].totalSpend += (vCost + rCost);
                                                            acc[key].recycledQty += rQty;
                                                            acc[key].recycledAmount += rCost;
                                                            acc[key].virginQty += vQty;
                                                            acc[key].virginAmount += vCost;
                                                            
                                                            return acc;
                                                        }, {});

                                                        const rows = Object.entries(groupedData);
                                                        
                                                        if (rows.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">
                                                                        No data available for this category.
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return rows.map(([key, stats]) => {
                                                            const isSupplierTab = costAnalysisSubTab === 'Supplier';
                                                            const isPolymerTab = costAnalysisSubTab === 'Polymer';
                                                            const isExpandable = isSupplierTab || isPolymerTab;
                                                            
                                                            const isExpanded = isSupplierTab 
                                                                ? expandedSuppliers.has(key) 
                                                                : (isPolymerTab ? expandedPolymers.has(key) : false);

                                                            const toggleExpansion = () => {
                                                                if (isSupplierTab) toggleSupplierExpansion(key);
                                                                if (isPolymerTab) togglePolymerExpansion(key);
                                                            };

                                                            return (
                                                                <React.Fragment key={key}>
                                                                    <tr 
                                                                        className={`hover:bg-gray-50 transition-colors ${isExpandable ? 'cursor-pointer' : ''}`}
                                                                        onClick={isExpandable ? toggleExpansion : undefined}
                                                                    >
                                                                        {costAnalysisSubTab === 'Component' && (
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                <div>{stats.productName}</div>
                                                                                {stats.description && (
                                                                                    <div className="text-xs text-gray-500 mt-0.5">{stats.description}</div>
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                            <div className="flex items-center gap-2">
                                                                                {isExpandable && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleExpansion();
                                                                                        }}
                                                                                        className="text-gray-500 hover:text-primary-600 focus:outline-none"
                                                                                    >
                                                                                        {isExpanded ? <FaMinus size={10} /> : <FaPlus size={10} />}
                                                                                    </button>
                                                                                )}
                                                                                <div>{stats.displayName}</div>
                                                                            </div>
                                                                            {costAnalysisSubTab === 'Product' && stats.description && (
                                                                                <div className="text-xs text-gray-500 mt-0.5 ml-6">{stats.description}</div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                                            {stats.recycledQty?.toFixed(2) || '0.00'}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                                            {stats.recycledAmount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0.00'}
                                                                        </td>
                                                                        {costAnalysisSubTab === 'Product' && (
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                                                {stats.recycledPercents.length 
                                                                                    ? (stats.recycledPercents.reduce((a, b) => a + b, 0)).toFixed(2) + '%'
                                                                                    : '-'}
                                                                            </td>
                                                                        )}
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                                            {stats.virginQty?.toFixed(2) || '0.00'}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                                            {stats.virginAmount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0.00'}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                                                            {stats.totalSpend.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                                        </td>
                                                                    </tr>
                                                                    {isExpandable && isExpanded && (
                                                                        <tr className="bg-gray-50">
                                                                            <td colSpan={6} className="px-6 py-4">
                                                                                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                                        <thead className="bg-gray-50">
                                                                                            <tr>
                                                                                                {isPolymerTab && (
                                                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
                                                                                                )}
                                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component Name</th>
                                                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Recycled Qty</th>
                                                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Recycled Amt (₹)</th>
                                                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Virgin Qty</th>
                                                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Virgin Amt (₹)</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-gray-200">
                                                                                            {stats.items.map((item, idx) => (
                                                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                                                    {isPolymerTab && (
                                                                                                        <td className="px-4 py-2 text-xs text-gray-900">{item.supplierName || '-'}</td>
                                                                                                    )}
                                                                                                    <td className="px-4 py-2 text-xs text-gray-900">{item.productName || item.skuCode || '-'}</td>
                                                                                                    <td className="px-4 py-2 text-xs text-gray-500">{item.componentName || item.componentDescription || '-'}</td>
                                                                                                    <td className="px-4 py-2 text-xs text-right text-gray-600">{Number(item.recycledQty || 0).toFixed(2)}</td>
                                                                                                    <td className="px-4 py-2 text-xs text-right text-gray-600">{Number(item.recycledQrtAmount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                                                                                    <td className="px-4 py-2 text-xs text-right text-gray-600">{Number(item.virginQty || 0).toFixed(2)}</td>
                                                                                                    <td className="px-4 py-2 text-xs text-right text-gray-600">{Number(item.virginQtyAmount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {postValidationActiveTab === 'plasticSpecific' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                         <div className="text-left">
                                            <p className="text-gray-800 font-semibold">Plastic Specific Analysis</p>
                                            <p className="text-gray-500 text-xs">Plastic specific analysis details.</p>
                                        </div>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                    plasticAnalysisTab === 'prePostValidation'
                                                        ? 'bg-white text-primary-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                                onClick={() => setPlasticAnalysisTab('prePostValidation')}
                                            >
                                                Pre/Post Validation
                                            </button>
                                            <button
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                    plasticAnalysisTab === 'sales'
                                                        ? 'bg-white text-primary-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                                onClick={() => setPlasticAnalysisTab('sales')}
                                            >
                                                Sales
                                            </button>
                                            <button
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                    plasticAnalysisTab === 'purchase'
                                                        ? 'bg-white text-primary-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                                onClick={() => setPlasticAnalysisTab('purchase')}
                                            >
                                                Purchase
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {plasticAnalysisTab === 'prePostValidation' && (
                                        <Analysis 
                                            isStepReadOnly={readOnly} 
                                            clientId={clientId}
                                            type={applicationType}
                                            itemId={selectedPlantId}
                                        />
                                    )}

                                    {plasticAnalysisTab === 'sales' && (
                                        <SalesAnalysis 
                                            clientId={clientId}
                                            type={applicationType}
                                            itemId={selectedPlantId}
                                        />
                                    )}

                                    {plasticAnalysisTab === 'purchase' && (
                                        <PurchaseAnalysis 
                                            clientId={clientId}
                                            type={applicationType}
                                            itemId={selectedPlantId}
                                        />
                                    )}
                                </div>
                            )}

                            {postValidationActiveTab === 'auditReport' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-8">
                                    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                                        <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                            <FaFilePdf className="text-blue-600 text-4xl" />
                                        </div>
                                        
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plastic Compliance Audit Report</h2>
                                        <p className="text-gray-500 mb-8">
                                            Generate and download the comprehensive audit report including company details, 
                                            pre/post validation summary, EPR targets, and detailed compliance analysis.
                                        </p>

                                        <div className="bg-gray-50 rounded-xl p-6 w-full border border-gray-100 mb-8">
                                            <h4 className="font-semibold text-gray-700 mb-4 text-left">Report Contents:</h4>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaCheckCircle className="text-green-500" /> Company & Audit Details
                                                </li>
                                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaCheckCircle className="text-green-500" /> Pre/Post Validation Summary
                                                </li>
                                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaCheckCircle className="text-green-500" /> EPR Target Calculation
                                                </li>
                                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaCheckCircle className="text-green-500" /> Industry Category Wise Details
                                                </li>
                                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaCheckCircle className="text-green-500" /> Sales & Purchase Data Overview
                                                </li>
                                            </ul>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleDownloadReport}
                                            disabled={summaryLoading || isDownloading}
                                            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all w-full md:w-auto min-w-[200px]"
                                        >
                                            {isDownloading ? <LoadingOutlined spin className="text-xl" /> : <FaFilePdf className="text-xl" />} 
                                            {isDownloading ? 'Generating Report...' : 'Download Audit Report'}
                                        </button>
                                        
                                        <p className="text-xs text-gray-400 mt-4">
                                            This report is strictly confidential and generated based on the current audit data.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                 ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <FaCheckDouble className="text-gray-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Post-validation Check Unavailable</h3>
                        <p className="text-gray-500 mt-2">Please save the client data and complete audit to access post-validation check.</p>
                    </div>
                 )}
                 {/* Remark Modal */}
            <Modal
                title={currentRemarkField === 'complianceRemarks' ? "Compliance Remarks" : "Auditor Remarks"}
                open={remarkModalOpen}
                onOk={handleSaveRemarksFromModal}
                onCancel={closeRemarkModal}
                width={500}
                okText="Save"
                cancelText="Cancel"
            >
                <div className="flex flex-col gap-3">
                    <p className="text-gray-500 text-xs">Enter one remark per line.</p>
                    
                    <div className="flex gap-2">
                        <Input 
                            value={newRemark}
                            onChange={(e) => setNewRemark(e.target.value)}
                            placeholder="Type a remark..."
                            onPressEnter={addRemark}
                            className="flex-1"
                        />
                        <Button type="primary" onClick={addRemark} icon={<PlusOutlined />}>Add</Button>
                    </div>

                    <div className="border rounded-md max-h-60 overflow-y-auto p-2 bg-gray-50">
                        {tempRemarks.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs py-4">No remarks added yet.</div>
                        ) : (
                            <ul className="list-disc pl-4 m-0">
                                {tempRemarks.map((remark, index) => (
                                    <li key={index} className="text-sm text-gray-700 mb-1 flex justify-between items-start group">
                                        <span>{remark}</span>
                                        <Button 
                                            type="text" 
                                            size="small" 
                                            danger 
                                            icon={<DeleteOutlined />} 
                                            className="opacity-0 group-hover:opacity-100"
                                            onClick={() => removeRemark(index)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PostAuditCheck;
