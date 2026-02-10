import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, message, Spin, Button } from 'antd';
import { FaShieldAlt, FaClipboardCheck, FaCheckDouble, FaArrowLeft } from 'react-icons/fa';
import ClientValidation from './ClientValidation';
import ClientDetail from './ClientDetail';
import PostAuditCheck from '../components/AddClientSteps/PostAuditCheck';
import api from '../services/api';
import API_ENDPOINTS from '../services/apiEndpoints';
import useSkuCompliance from '../hooks/useSkuCompliance';
import { getPostValidationColumns } from '../components/AddClientSteps/utils/postAuditColumns';
import { generateMarkingLabellingReport, generateSkuComplianceReport, buildCategoryProcurementSummary, buildPolymerProcurementSummary } from '../components/AddClientSteps/utils/reportUtils';
import { parseRemarksToItems } from '../utils/pdfHelpers';
import DocumentViewerModal from '../components/DocumentViewerModal';

const ViewClient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [activeTab, setActiveTab] = useState('onsite-audit');
  
  // Unlock State for Post-Audit
  const [isPostAuditUnlocked, setIsPostAuditUnlocked] = useState(false);

  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');

  const resolveUrl = (p) => {
    if (!p) return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

  const handleViewDocument = (filePath, docType, docName) => {
    setViewerUrl(resolveUrl(filePath));
    setViewerName(docName || docType);
    setViewerOpen(true);
  };

  useEffect(() => {
    const unlocked = localStorage.getItem(`postAuditUnlocked_${id}`) === 'true';
    if (unlocked) {
      setIsPostAuditUnlocked(true);
    }
  }, [id]);

  const handleAuditComplete = () => {
    setIsPostAuditUnlocked(true);
    localStorage.setItem(`postAuditUnlocked_${id}`, 'true');
    setActiveTab('post-validation');
    message.success('Audit completed. Post-Validation unlocked.');
  };
  
  // Post-Audit State (reusing logic from AddClient)
  const [postValidationActiveTab, setPostValidationActiveTab] = useState('productAssessment');
  const [postValidationData, setPostValidationData] = useState([]);
  const [postValidationSearch, setPostValidationSearch] = useState('');
  const [postValidationPagination, setPostValidationPagination] = useState({ current: 1, pageSize: 10 });
  const [postValidationGotoPage, setPostValidationGotoPage] = useState('');
  const [fullClientData, setFullClientData] = useState(null);
  const [monthlyProcurementSummary, setMonthlyProcurementSummary] = useState([]);

  // SKU Compliance Hook
  const {
      skuComplianceData,
      setSkuComplianceData,
      fetchSkuComplianceData, // Added: destructured from hook
      skuSearchText,
      setSkuSearchText,
      skuStatusFilter,
      setSkuStatusFilter,
      skuPagination,
      setSkuPagination,
  } = useSkuCompliance(id);

  useEffect(() => {
    fetchClientData();
    fetchPostValidationData(); // Added: fetch post validation data
    fetchSkuComplianceData(); // Added: fetch SKU data
  }, [id]);

  const fetchPostValidationData = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_COMPLIANCE_ROWS(id));
      if (response.data.success) {
         setPostValidationData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch post validation data:', error);
    }
  };

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(id));
      if (response.data.success) {
        setClientData(response.data.data);
        setFullClientData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
      message.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  // Mock handlers for read-only view
  const noOp = () => {};

  // Columns for Post Audit
  const postValidationColumns = getPostValidationColumns({
      postValidationPagination: postValidationPagination || { current: 1, pageSize: 10 },
      postValidationData,
      setPostValidationData,
      handleSaveRow: noOp, // Read-only
      handleDeleteRow: noOp, // Read-only
      handleRemark: noOp, // Read-only
      handleStatusChange: noOp, // Read-only
      handleImageUpload: noOp, // Read-only
      handleImageRemove: noOp, // Read-only
      loading: false,
      readOnly: !isPostAuditUnlocked, // Ensure columns respect read-only if supported, otherwise actions are disabled via noOp
      parseRemarksToItems, // Passed utility function
      onViewDocument: handleViewDocument
  });

  // Filter logic for Post Audit
  const filteredPostValidationData = postValidationData.filter(item => 
      item.skuCode?.toLowerCase().includes(postValidationSearch.toLowerCase()) ||
      item.skuDescription?.toLowerCase().includes(postValidationSearch.toLowerCase())
  );

  const paginatedPostValidationData = filteredPostValidationData.slice(
      (postValidationPagination.current - 1) * postValidationPagination.pageSize,
      postValidationPagination.current * postValidationPagination.pageSize
  );

  const totalPostValidationPages = Math.ceil(filteredPostValidationData.length / postValidationPagination.pageSize);

  const items = [
    {
      key: 'onsite-audit',
      label: (
        <span className="flex items-center gap-2">
          <FaClipboardCheck /> Onsite Audit
        </span>
      ),
      children: (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <ClientDetail 
            clientId={id} 
            embedded={true} 
            initialViewMode="process"
            readOnly={true}
            onAuditComplete={handleAuditComplete}
          />
        </div>
      )
    },
    {
      key: 'post-validation',
      label: (
        <span className="flex items-center gap-2">
          <FaCheckDouble /> Post-Validation
        </span>
      ),
      children: (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PostAuditCheck 
            clientId={id}
            postValidationActiveTab={postValidationActiveTab}
            setPostValidationActiveTab={setPostValidationActiveTab}
            handleMarkingLabellingReport={() => generateMarkingLabellingReport(fullClientData, postValidationData)}
            loading={false}
            postValidationData={postValidationData}
            paginatedPostValidationData={paginatedPostValidationData}
            postValidationColumns={postValidationColumns}
            postValidationPagination={postValidationPagination}
            handlePostValidationPageChange={(page, pageSize) => setPostValidationPagination({ ...postValidationPagination, current: page, pageSize })}
            totalPostValidationPages={totalPostValidationPages}
            handlePostValidationPageSizeChange={(current, size) => setPostValidationPagination({ ...postValidationPagination, current: 1, pageSize: size })}
            postValidationGotoPage={postValidationGotoPage}
            setPostValidationGotoPage={setPostValidationGotoPage}
            handlePostValidationGotoSubmit={() => {}}
            skuSearchText={skuSearchText}
            setSkuSearchText={setSkuSearchText}
            skuStatusFilter={skuStatusFilter}
            setSkuStatusFilter={setSkuStatusFilter}
            handleSkuComplianceReport={() => generateSkuComplianceReport(fullClientData, skuComplianceData)}
            skuComplianceData={skuComplianceData}
            setSkuComplianceData={setSkuComplianceData}
            handleSkuComplianceChange={noOp}
            handleSkuRemark={noOp}
            handleSkuStatusChange={noOp}
            skuPagination={skuPagination}
            setSkuPagination={setSkuPagination}
            handleSkuPageChange={(page, pageSize) => setSkuPagination({ ...skuPagination, current: page, pageSize })}
            handleSkuPageSizeChange={(current, size) => setSkuPagination({ ...skuPagination, current: 1, pageSize: size })}
            readOnly={!isPostAuditUnlocked}
            applicationType="CTO"
            selectedPlantId={fullClientData?.productionFacility?.ctoDetailsList?.[0]?._id}
            // Add other required props with empty/default values
            regulationsCoveredUnderCto={[]}
            waterRegulationsRows={[]}
            airRegulationsRows={[]}
            hazardousWasteRegulationsRows={[]}
            handleRegulationChange={noOp}
            handleRegulationStatusChange={noOp}
            handleRegulationRemark={noOp}
            handleAddRegulationRow={noOp}
            handleDeleteRegulationRow={noOp}
            remarkModal={{ visible: false }}
            setRemarkModal={noOp}
            monthlyProcurementSummary={monthlyProcurementSummary}
            monthlyProcurementLoading={false}
            monthlyProcurementError={''}
            monthlyProcurementRaw={[]}
            monthlyProcurementFilters={{}}
            setMonthlyProcurementFilters={noOp}
            monthlyProcurementViewMode={'Month'}
            setMonthlyProcurementViewMode={noOp}
            monthlyProcurementFilterOpen={{}}
            setMonthlyProcurementFilterOpen={noOp}
            monthlyProcurementDisplayMode={'graph'}
            setMonthlyProcurementDisplayMode={noOp}
            parseRemarksToItems={parseRemarksToItems}
            buildCategoryProcurementSummary={buildCategoryProcurementSummary}
            buildPolymerProcurementSummary={buildPolymerProcurementSummary}
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button 
            icon={<FaArrowLeft />} 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center"
        />
        <div>
            <h1 className="text-2xl font-bold text-gray-900">
                {clientData?.clientName || 'Client View'}
                <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Read Only
                </span>
            </h1>
            <p className="text-gray-500 mt-1">View client compliance and audit status</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={items} 
            type="card"
            className="custom-tabs"
        />
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

export default ViewClient;
