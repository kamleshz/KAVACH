import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Table, Select, Input, Button, Upload, message, ConfigProvider, Modal, Popover, Tabs } from 'antd';
import { UploadOutlined, DeleteOutlined, PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { 
  FaArrowLeft, FaCheck, FaChevronRight, FaBuilding, FaGavel, FaTrademark, FaLayerGroup, 
  FaCalendarAlt, FaChevronDown, FaIndustry, FaUserShield, FaUser, FaPhone, FaEnvelope, 
  FaUserTie, FaCheckCircle, FaSave, FaEdit, FaUndo, FaTrashAlt, FaSpinner, FaArrowRight,
  FaFileContract, FaMapMarkerAlt, FaPencilAlt, FaFilePdf, FaCheckDouble, FaFolderOpen, FaShieldAlt, FaLock, FaClipboardCheck, FaExclamationCircle, FaChartLine, FaFilter, FaSearch
} from 'react-icons/fa';
import ClientValidation from './ClientValidation';
import ClientDetail from './ClientDetail';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { indianStatesCities } from '../constants/indianStatesCities';
import useAuth from '../hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ClientBasicInfo from '../components/AddClientSteps/ClientBasicInfo';
import CompanyAddress from '../components/AddClientSteps/CompanyAddress';
import CompanyDocument from '../components/AddClientSteps/CompanyDocument';
import CteCtoCca from '../components/AddClientSteps/CteCtoCca';
import PreValidation from '../components/AddClientSteps/PreValidation';
import Audit from '../components/AddClientSteps/Audit';
import PostAuditCheck from '../components/AddClientSteps/PostAuditCheck';
import { getPostValidationColumns } from '../components/AddClientSteps/utils/postAuditColumns';
import { generateMarkingLabellingReport, generateSkuComplianceReport } from '../components/AddClientSteps/utils/reportUtils';
import { parseRemarksToItems } from '../utils/pdfHelpers';

import { 
  UREP_YEAR_OPTIONS, 
  UREP_DEFAULT_TARGETS, 
  CATEGORIES 
} from '../constants/complianceConstants';

import useSkuCompliance from '../hooks/useSkuCompliance';
import { ClientProvider, useClientContext } from '../context/ClientContext';

const SubmitConfirmationModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FaCheckCircle className="text-blue-600 text-lg" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Submit Client for Pre- Audit Check
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        Do you Want to Submit client and Process for Pre- Audit Check?
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                            onClick={() => onConfirm(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                'Yes'
                            )}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddClientContent = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const isViewMode = !!location.state?.viewMode;
  const isAuditMode = location.pathname.includes('/audit');
  const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
  const { type, id } = useParams();
  
  
  const [clientId, setClientId] = useState(id || null);
  const [completedStep, setCompletedStep] = useState(id ? 4 : 0);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState(isAuditMode ? 'Pre - Validation' : 'Client Data');
  const [ewasteSubTab, setEwasteSubTab] = useState('1');
  
  const { 
      formData, 
      setFormData, 
      handleChange, 
      handleFileChange,
      loading, 
      setLoading 
  } = useClientContext();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientDocuments, setClientDocuments] = useState([]);
  const [fullClientData, setFullClientData] = useState(null);
  const [postValidationData, setPostValidationData] = useState([]);
  const [postValidationSearch, setPostValidationSearch] = useState('');
  const [postValidationPagination, setPostValidationPagination] = useState({
      current: 1,
      pageSize: 10,
  });
  const [costAnalysisSubTab, setCostAnalysisSubTab] = useState('Product');
  const [postValidationGotoPage, setPostValidationGotoPage] = useState('');
  const [postValidationActiveTab, setPostValidationActiveTab] = useState('markingLabelling');

  const {
      // skuComplianceData, // Removed to avoid redeclaration
      // setSkuComplianceData, // Removed to avoid redeclaration
      skuSearchText,
      setSkuSearchText,
      skuStatusFilter,
      setSkuStatusFilter,
      // Removed duplicate declarations that are now handled by the hook destructuring later in the component
      // or were causing redeclaration errors
      setSkuImageLoading,
      setEditingSkuKey,
      handleSaveSkuCompliance
  } = useSkuCompliance(clientId);
  
  // Alias for prop consistency
  // const saveSkuRow = handleSaveSkuCompliance;
  
  const [regulationsCoveredUnderCto, setRegulationsCoveredUnderCto] = useState([]);
  const [waterRegulationsRows, setWaterRegulationsRows] = useState([]);
  const [airRegulationsRows, setAirRegulationsRows] = useState([]);
  const [hazardousWasteRegulationsRows, setHazardousWasteRegulationsRows] = useState([]);
  const [remarkModal, setRemarkModal] = useState({
      visible: false,
      recordKey: null,
      field: '',
      text: '',
  });
  const [monthlyProcurementSummary, setMonthlyProcurementSummary] = useState([]);
  const [monthlyProcurementLoading, setMonthlyProcurementLoading] = useState(false);
  const [monthlyProcurementError, setMonthlyProcurementError] = useState('');
 const [monthlyProcurementRaw, setMonthlyProcurementRaw] = useState([]);
 const [monthlyProcurementFilters, setMonthlyProcurementFilters] = useState({
        category: [],
        polymer: [],
        quarter: [],
        half: [],
    });
    const [monthlyProcurementViewMode, setMonthlyProcurementViewMode] = useState('Month');
    const [monthlyProcurementFilterOpen, setMonthlyProcurementFilterOpen] = useState({
        category: false,
        polymer: false,
        quarter: false,
        half: false,
    });
    const [monthlyProcurementDisplayMode, setMonthlyProcurementDisplayMode] = useState('graph');

  const isValidMobile = (value) => {
      const digits = (value || '').toString().replace(/\D/g, '');
      return digits.length === 10;
  };

  const { user: authUser } = useAuth();

  useEffect(() => {
      if (isAuditMode) {
          if (activeTab === 'Client Data') setActiveTab('Pre - Validation');
      } else {
          if (activeTab !== 'Client Data') setActiveTab('Client Data');
      }
  }, [isAuditMode, authUser]);

  const toAbsUrl = (p) => {
      if (!p) return '';
      if (typeof p !== 'string') return '';
      const isAbs = p.startsWith('http://') || p.startsWith('https://');
      return isAbs ? p : `${API_URL}/${p}`;
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

  const loadImageForPdf = async (url) => {
      const dataUrl = await loadImageAsDataUrl(url);
      if (!dataUrl) return null;
      try {
          const img = await new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error('Failed to get dimensions'));
              image.src = dataUrl;
          });
          return {
              dataUrl,
              width: img.width || null,
              height: img.height || null
          };
      } catch {
          return {
              dataUrl,
              width: null,
              height: null
          };
      }
  };

  const [isPreValidationUnlocked, setIsPreValidationUnlocked] = useState(!!id);
  const [isPreValidationComplete, setIsPreValidationComplete] = useState(false);
  const [isAuditComplete, setIsAuditComplete] = useState(false);

  useEffect(() => {
    if (activeTab === 'Post -Audit Check') {
        setIsAuditComplete(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (location.state?.activeTab) {
        setActiveTab(location.state.activeTab);
    }
    // If id is present (Edit mode), Pre-Validation is unlocked
    if (id) {
        setIsPreValidationUnlocked(true);
    }
  }, [location.state, id]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(id))
        .then(response => {
          if (response.data.success) {
            const client = response.data.data;
            setFullClientData(client);
            setClientDocuments(Array.isArray(client.documents) ? client.documents : []);
            // Pre-fill PWP Category from notes if available
            if (client.category === 'PWP' && typeof client.notes === 'string') {
                const match = client.notes.match(/PWP Category:\s*([^\|]+)/i);
                if (match && match[1]) {
                    setFormData(prev => ({ ...prev, pwpCategory: match[1].trim() }));
                }
            }
            setFormData(prev => ({
                ...prev,
                unitName: client.productionFacility?.facilityName || '',
                facilityState: client.productionFacility?.state || ''
            }));
            
            // --- RESUME & PROGRESS LOGIC ---
            const status = client.clientStatus || 'DRAFT';
            const lastStep = (client.lastCompletedStep !== undefined && client.lastCompletedStep !== null) 
                ? client.lastCompletedStep 
                : (id ? 4 : 0);
            
            // Sync local state with backend
            setCompletedStep(lastStep);
            
            // Determine Navigation & Notification
            if (status === 'DRAFT') {
                setActiveTab('Client Data');
                const nextStep = Math.min(lastStep + 1, 4);
                setCurrentStep(nextStep);
                
                // Show notification if returning user has progress
                if (lastStep > 0 && lastStep < 4) {
                     const stepNames = ['', 'Client Basic Info', 'Company Address', 'Company Documents', 'CTE & CTO/CCA'];
                     const completedName = stepNames[lastStep];
                     const nextName = stepNames[nextStep];
                     
                     toast.info(
                         <div>
                             <strong>Welcome Back!</strong><br/>
                             You last completed: {completedName}.<br/>
                             Please complete: {nextName}.
                         </div>,
                         { autoClose: 5000, theme: "colored", icon: <FaUndo />, toastId: 'welcome-draft' }
                     );
                }
            } else if (status === 'SUBMITTED' || status === 'PRE_VALIDATION') {
                if (isAuditMode) setActiveTab('Pre - Validation');
                setIsPreValidationUnlocked(true);
                if (client.validationStatus === 'Verified') {
                    setIsPreValidationComplete(true);
                }
                if (isAuditMode) toast.success("Welcome Back! Client submitted. Continuing to Pre- Audit Check.", { theme: "colored", toastId: 'welcome-submitted' });
            } else if (status === 'AUDIT') {
                if (isAuditMode) setActiveTab('Audit');
                setIsPreValidationUnlocked(true);
                setIsPreValidationComplete(true);
                
                if (isAuditMode) toast.success("Welcome Back! Client in Audit phase.", { theme: "colored", toastId: 'welcome-audit' });
            }

            // Check for Audit Completion regardless of status (persists green tick and unlock)
            const hasCompletedAudit = (
                (client.productionFacility?.cteDetailsList || []).some(item => 
                    (item.completedSteps || []).length >= 4 || (item.completedSteps || []).includes('tab5')
                ) || 
                (client.productionFacility?.ctoDetailsList || []).some(item => 
                    (item.completedSteps || []).length >= 4 || (item.completedSteps || []).includes('tab5')
                )
            );

            if (hasCompletedAudit) {
                 setIsAuditComplete(true);
                 setIsPreValidationUnlocked(true);
                 setIsPreValidationComplete(true);
            }

            if (authUser?.role?.name === 'MANAGER') {
                setIsPreValidationUnlocked(true);
                setIsPreValidationComplete(true);
                setIsAuditComplete(true);
            }
            // -------------------------------

            setFormData(prev => ({
              ...prev,
              clientName: client.clientName || '',
              tradeName: client.tradeName || '',
              companyGroupName: client.companyGroupName || '',
              financialYear: client.financialYear || '',
              wasteType: client.wasteType || '', // Ensure wasteType is loaded
              entityType: client.entityType || prev.entityType,
              producerType: client.producerType || '',
              subCategoryProducer: client.subCategoryProducer || '',
              authorisedPersonName: client.authorisedPerson?.name || '',
              authorisedPersonNumber: client.authorisedPerson?.number || '',
              authorisedPersonEmail: client.authorisedPerson?.email || '',
              authorisedPersonPan: client.authorisedPerson?.pan || '',
              authorisedPersonAadhaar: client.authorisedPerson?.aadhaar || '', // Map Authorised Person Aadhaar
              authorisedPersonAddress: client.authorisedPerson?.address || '', 
              coordinatingPersonName: client.coordinatingPerson?.name || '',
              coordinatingPersonNumber: client.coordinatingPerson?.number || '',
              coordinatingPersonEmail: client.coordinatingPerson?.email || '',
              coordinatingPersonPan: client.coordinatingPerson?.pan || '',
              coordinatingPersonAadhaar: client.coordinatingPerson?.aadhaar || '', // Map Coordinating Person Aadhaar
              coordinatingPersonAddress: client.coordinatingPerson?.address || '',
              roAddress1: client.registeredOfficeAddress?.addressLine1 || '',
              roAddress2: client.registeredOfficeAddress?.addressLine2 || '',
              roAddress3: client.registeredOfficeAddress?.addressLine3 || '',
              roState: client.registeredOfficeAddress?.state || '',
              roCity: client.registeredOfficeAddress?.city || '',
              roPincode: client.registeredOfficeAddress?.pincode || '',
              coAddress1: client.communicationAddress?.addressLine1 || '',
              coAddress2: client.communicationAddress?.addressLine2 || '',
              coAddress3: client.communicationAddress?.addressLine3 || '',
              coState: client.communicationAddress?.state || '',
              coCity: client.communicationAddress?.city || '',
              coPincode: client.communicationAddress?.pincode || '',
              coSameAsRegistered: (
                  client.registeredOfficeAddress?.addressLine1 === client.communicationAddress?.addressLine1 &&
                  client.registeredOfficeAddress?.addressLine2 === client.communicationAddress?.addressLine2 &&
                  client.registeredOfficeAddress?.addressLine3 === client.communicationAddress?.addressLine3 &&
                  client.registeredOfficeAddress?.state === client.communicationAddress?.state &&
                  client.registeredOfficeAddress?.city === client.communicationAddress?.city &&
                  client.registeredOfficeAddress?.pincode === client.communicationAddress?.pincode
              ),
              gstNumber: client.documents?.find(d => d.documentType === 'GST')?.certificateNumber || '',
              gstDate: client.documents?.find(d => d.documentType === 'GST')?.certificateDate ? client.documents.find(d => d.documentType === 'GST').certificateDate.split('T')[0] : '',
              gstFilePath: client.documents?.find(d => d.documentType === 'GST')?.filePath || '',
              cinNumber: client.documents?.find(d => d.documentType === 'CIN')?.certificateNumber || '',
              cinDate: client.documents?.find(d => d.documentType === 'CIN')?.certificateDate ? client.documents.find(d => d.documentType === 'CIN').certificateDate.split('T')[0] : '',
              cinFilePath: client.documents?.find(d => d.documentType === 'CIN')?.filePath || '',
              panNumber: client.documents?.find(d => d.documentType === 'PAN')?.certificateNumber || '',
              panDate: client.documents?.find(d => d.documentType === 'PAN')?.certificateDate ? client.documents.find(d => d.documentType === 'PAN').certificateDate.split('T')[0] : '',
              panFilePath: client.documents?.find(d => d.documentType === 'PAN')?.filePath || '',
              factoryLicenseNumber: client.documents?.find(d => d.documentType === 'Factory License')?.certificateNumber || '',
              factoryLicenseDate: client.documents?.find(d => d.documentType === 'Factory License')?.certificateDate ? client.documents.find(d => d.documentType === 'Factory License').certificateDate.split('T')[0] : '',
              factoryLicenseFilePath: client.documents?.find(d => d.documentType === 'Factory License')?.filePath || '',
              eprCertificateNumber: client.documents?.find(d => d.documentType === 'EPR Certificate')?.certificateNumber || '',
              eprCertificateDate: client.documents?.find(d => d.documentType === 'EPR Certificate')?.certificateDate ? client.documents.find(d => d.documentType === 'EPR Certificate').certificateDate.split('T')[0] : '',
              eprCertificateFilePath: client.documents?.find(d => d.documentType === 'EPR Certificate')?.filePath || '',
              iecCertificateNumber: client.documents?.find(d => d.documentType === 'IEC Certificate')?.certificateNumber || '',
              iecCertificateDate: client.documents?.find(d => d.documentType === 'IEC Certificate')?.certificateDate ? client.documents.find(d => d.documentType === 'IEC Certificate').certificateDate.split('T')[0] : '',
              iecCertificateFilePath: client.documents?.find(d => d.documentType === 'IEC Certificate')?.filePath || '',
              dicDcssiCertificateNumber: client.documents?.find(d => d.documentType === 'DIC/DCSSI Certificate')?.certificateNumber || '',
              dicDcssiCertificateDate: client.documents?.find(d => d.documentType === 'DIC/DCSSI Certificate')?.certificateDate ? client.documents.find(d => d.documentType === 'DIC/DCSSI Certificate').certificateDate.split('T')[0] : '',
              dicDcssiCertificateFilePath: client.documents?.find(d => d.documentType === 'DIC/DCSSI Certificate')?.filePath || '',
              totalCapitalInvestmentLakhs: (client.productionFacility?.totalCapitalInvestmentLakhs ?? '') !== null && (client.productionFacility?.totalCapitalInvestmentLakhs ?? '') !== undefined
                ? String(client.productionFacility?.totalCapitalInvestmentLakhs ?? '')
                : '',
              groundWaterUsage: client.productionFacility?.groundWaterUsage || '',
              cgwaNocRequirement: client.productionFacility?.cgwaNocRequirement || '',
              cgwaNocDocument: client.productionFacility?.cgwaNocDocument || null,
              plantLocationNumber: client.productionFacility?.plantLocationNumber ? parseInt(client.productionFacility.plantLocationNumber) : (client.productionFacility?.plantCount || 0),
              isEwasteRegistered: client.isEwasteRegistered,
              isImportingEEE: client.isImportingEEE,
              ewasteCertificateNumber: client.documents?.find(d => d.documentType === 'E-waste Registration')?.certificateNumber || '',
              ewasteCertificateDate: client.documents?.find(d => d.documentType === 'E-waste Registration')?.certificateDate ? client.documents.find(d => d.documentType === 'E-waste Registration').certificateDate.split('T')[0] : '',
              ewasteFilePath: client.documents?.find(d => d.documentType === 'E-waste Registration')?.filePath || '',
              eeeCertificateNumber: client.documents?.find(d => d.documentType === 'EEE Import Authorization')?.certificateNumber || '',
              eeeCertificateDate: client.documents?.find(d => d.documentType === 'EEE Import Authorization')?.certificateDate ? client.documents.find(d => d.documentType === 'EEE Import Authorization').certificateDate.split('T')[0] : '',
              eeeFilePath: client.documents?.find(d => d.documentType === 'EEE Import Authorization')?.filePath || ''
            }));
            setRegulationsCoveredUnderCto(Array.isArray(client.productionFacility?.regulationsCoveredUnderCto) ? client.productionFacility.regulationsCoveredUnderCto.map(normalizeCtoRegulationValue).filter(Boolean) : []);
            setWaterRegulationsRows(Array.isArray(client.productionFacility?.waterRegulations) ? client.productionFacility.waterRegulations.map((r, i) => ({ key: r._id || i, description: r.description || '', permittedQuantity: r.permittedQuantity || '' })) : []);
            setAirRegulationsRows(Array.isArray(client.productionFacility?.airRegulations) ? client.productionFacility.airRegulations.map((r, i) => ({ key: r._id || i, parameter: r.parameter || '', permittedLimit: r.permittedLimit || '' })) : []);
            setHazardousWasteRegulationsRows(Array.isArray(client.productionFacility?.hazardousWasteRegulations) ? client.productionFacility.hazardousWasteRegulations.map((r, i) => ({ key: r._id || i, nameOfHazardousWaste: r.nameOfHazardousWaste || '', facilityModeOfDisposal: r.facilityModeOfDisposal || '', quantityMtYr: r.quantityMtYr || '' })) : []);

            if (client.msmeDetails && client.msmeDetails.length > 0) {
                  setMsmeRows(client.msmeDetails.map((m, i) => ({
                      key: m._id || i,
                      classificationYear: m.classificationYear,
                      status: m.status,
                      majorActivity: m.majorActivity,
                      udyamNumber: m.udyamNumber,
                      turnover: m.turnover,
                      certificateFile: m.certificateFile || null, // Ensure file path is loaded
                      isEditing: false
                  })));
             }

            if (client.productionFacility) {
                 const plantLocNum = client.productionFacility.plantLocationNumber ? parseInt(client.productionFacility.plantLocationNumber) : (client.productionFacility?.plantCount || 0);

                 // Populate CTE Details - Check both cteDetailsList and legacy locations
                 const cteList = client.productionFacility.cteDetailsList || [];
                 if (cteList.length > 0) {
                     setCteDetailRows(cteList.map((item, index) => ({
                         ...item,
                         key: item._id || index,
                         plantName: item.plantName || '',
                         consentNo: item.consentNo || '',
                         category: item.category || '',
                         issuedDate: item.issuedDate ? item.issuedDate.split('T')[0] : '',
                         validUpto: item.validUpto ? item.validUpto.split('T')[0] : '',
                         plantLocation: item.plantLocation || '',
                         plantAddress: item.plantAddress || '',
                         factoryHeadName: item.factoryHeadName || '',
                         factoryHeadDesignation: item.factoryHeadDesignation || '',
                         factoryHeadMobile: item.factoryHeadMobile || '',
                         factoryHeadEmail: item.factoryHeadEmail || '',
                         contactPersonName: item.contactPersonName || '',
                         contactPersonDesignation: item.contactPersonDesignation || '',
                         contactPersonMobile: item.contactPersonMobile || '',
                         contactPersonEmail: item.contactPersonEmail || '',
                         documentFile: item.documentFile,
                         isEditing: false
                     })));
                 } else if (plantLocNum > 0) {
                    const emptyCte = Array.from({ length: plantLocNum }).map(() => ({
                        plantName: '', consentNo: '', category: '', issuedDate: '', validUpto: '',
                        plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
                        factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
                        contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
                    }));
                    setCteDetailRows(emptyCte);
                 }

                 // Populate CTO Details - Check both ctoDetailsList and legacy locations
                 const ctoList = client.productionFacility.ctoDetailsList || [];
                 if (ctoList.length > 0) {
                     setCtoDetailRows(ctoList.map((item, index) => ({
                         ...item,
                         key: item._id || index,
                         ctoCaaType: item.ctoCaaType || '',
                         plantName: item.plantName || '',
                         industryType: item.industryType || '',
                         category: item.category || '',
                         consentOrderNo: item.consentOrderNo || '',
                         dateOfIssue: item.dateOfIssue ? item.dateOfIssue.split('T')[0] : '',
                         validUpto: item.validUpto ? item.validUpto.split('T')[0] : '',
                         plantLocation: item.plantLocation || '',
                         plantAddress: item.plantAddress || '',
                         factoryHeadName: item.factoryHeadName || '',
                         factoryHeadDesignation: item.factoryHeadDesignation || '',
                         factoryHeadMobile: item.factoryHeadMobile || '',
                         factoryHeadEmail: item.factoryHeadEmail || '',
                         contactPersonName: item.contactPersonName || '',
                         contactPersonDesignation: item.contactPersonDesignation || '',
                         contactPersonMobile: item.contactPersonMobile || '',
                         contactPersonEmail: item.contactPersonEmail || '',
                         documentFile: item.documentFile,
                         isEditing: false
                     })));
                 } else if (plantLocNum > 0) {
                    const emptyCto = Array.from({ length: plantLocNum }).map(() => ({
                        ctoCaaType: '', plantName: '', industryType: '', category: '', consentOrderNo: '', dateOfIssue: '', validUpto: '',
                        plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
                        factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
                        contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
                    }));
                    setCtoDetailRows(emptyCto);
                 }


                 if (client.productionFacility.cteProduction?.length > 0) {
                     setCteProductionRows(client.productionFacility.cteProduction.map((item, i) => ({
                         key: item._id || i,
                         ...item,
                         isEditing: false
                     })));
                 }

                 if (client.productionFacility.ctoProducts?.length > 0) {
                     setCtoProductRows(client.productionFacility.ctoProducts.map((item, i) => ({
                         key: item._id || i,
                         ...item,
                         isEditing: false
                     })));
                 }
            }
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load client data");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Form State is now managed by ClientContext

  // URL Type to Waste Type Mapping
  const getWasteTypeFromUrl = useCallback((urlType) => {
      switch(urlType) {
          case 'ewaste-producer':
          case 'ewaste-recycler':
          case 'ewaste-manufacturer':
          case 'ewaste-refurbisher':
              return 'E-Waste';
          case 'plastic':
          case 'plastic-pibo':
          case 'plastic-pwp':
              return 'Plastic Waste';
          case 'battery':
              return 'Battery Waste';
          case 'used-oil':
              return 'Used Oil';
          case 'elv':
              return 'ELV';
          default:
              return null;
      }
  }, []);

  // Initialize Entity Type based on URL param if new client
  useEffect(() => {
    if ((type === 'pwp' || type === 'plastic-pwp') && !id) {
        setFormData(prev => ({ ...prev, entityType: 'PWP' }));
    }

    if (!id) {
        const wasteTypeFromUrl = getWasteTypeFromUrl(type);
        
        if (wasteTypeFromUrl) {
            setFormData(prev => ({ 
                ...prev, 
                wasteType: wasteTypeFromUrl,
                // Set defaults based on waste type if needed
                entityType: type === 'ewaste-producer' ? 'Producer of fresh EEE' : (prev.entityType || 'Producer')
            }));
        } else if (type === 'pwp') {
             // PWP case is handled above
        } else {
            // Invalid URL type and not editing -> Redirect to selection
            // Ensure we don't redirect if we are just loading or if type is undefined initially
            if (type && !wasteTypeFromUrl) {
                 navigate('/dashboard/add-client');
            } else if (!type) {
                 navigate('/dashboard/add-client');
            }
        }
    }
  }, [type, id, setFormData, navigate, getWasteTypeFromUrl]);

  // Dynamic Tables State
  const [msmeRows, setMsmeRows] = useState([]);

  // Determine if client is PWP (either from URL param or loaded data)
  const isPwp = type === 'pwp' || type === 'plastic-pwp' || formData.entityType === 'PWP';
  // Check if it's E-Waste based on URL OR loaded data
  const isEwasteProducer = type === 'ewaste-producer' || formData.wasteType === 'E-Waste' || formData.wasteType === 'E_WASTE';
  
  // Determine the primary category for logic switching
  const clientCategory = useMemo(() => {
    if (isPwp) return 'PWP';
    if (isEwasteProducer) return 'EWaste-Producer';
    return 'PIBO'; // Default to PIBO for plastic or other types
  }, [isPwp, isEwasteProducer]);
    
    // Using constants
    const urepCategories = CATEGORIES;
    const urepYearOptions = UREP_YEAR_OPTIONS;
    
    const [urepSelectedYear, setUrepSelectedYear] = useState(() => formData.financialYear || urepYearOptions[0]);
    const [urepTargets, setUrepTargets] = useState(() => {
        const defaultTargets = UREP_DEFAULT_TARGETS;

        const rows = [];
        urepYearOptions.forEach((year) => {
            urepCategories.forEach((category) => {
                const value = defaultTargets[year]?.[category];
                rows.push({
                    category,
                    year,
                    targetValue: value !== undefined ? String(value) : '0'
                });
            });
        });
        return rows;
    });
    const [urepData, setUrepData] = useState([]);

    useEffect(() => {
        if (formData.financialYear) {
            setUrepSelectedYear(formData.financialYear);
        }
    }, [formData.financialYear]);
  
    // Helper to add a new empty MSME row
  const addMsmeRow = () => {
      setMsmeRows([...msmeRows, { 
          key: Date.now(),
          classificationYear: '2023-24', 
          status: 'Small',
          majorActivity: 'Manufacturing',
          udyamNumber: '', 
          turnover: '', 
          certificateFile: null,
          isEditing: true // Default to edit mode for new rows
      }]);
    };

    // Helper to update MSME row
    const handleMsmeChange = (index, field, value) => {
        const newRows = [...msmeRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setMsmeRows(newRows);
    };

    // Helper to toggle edit mode for MSME row
    const toggleEditMsmeRow = (index) => {
        const newRows = [...msmeRows];
        newRows[index] = { ...newRows[index], isEditing: !newRows[index].isEditing };
        setMsmeRows(newRows);
    };

    // Helper to reset MSME row
    const resetMsmeRow = (index) => {
        const newRows = [...msmeRows];
        // Reset to default values or clear fields
      newRows[index] = { 
          ...newRows[index], 
          classificationYear: '2023-24', 
          status: 'Small',
          majorActivity: 'Manufacturing',
          udyamNumber: '', 
          turnover: '', 
          certificateFile: null,
          isEditing: true
      };
        setMsmeRows(newRows);
    };

    // Helper to delete MSME row
    const deleteMsmeRow = (index) => {
        const newRows = msmeRows.filter((_, i) => i !== index);
        setMsmeRows(newRows);
    };

  const [cteDetailRows, setCteDetailRows] = useState([]);
  const [ctoDetailRows, setCtoDetailRows] = useState([]);
  
  const [cteProductionRows, setCteProductionRows] = useState([]);
  const [ctoProductRows, setCtoProductRows] = useState([]);

  // steps definition moved to before return statement to fix hoisting issue

  // Effect to handle plant location number changes from context
  useEffect(() => {
      const num = parseInt(formData.plantLocationNumber || '0');
      handlePlantLocationChange(num);
  }, [formData.plantLocationNumber]);

  const handleSaveCgwaDetails = async () => {
      const effectiveId = clientId || id;
      if (!effectiveId) {
          messageApi.error('Please save the client first.');
          return;
      }

      const normalizedGroundWaterUsage =
          formData.groundWaterUsage === 'Yes' ? 'Yes' : formData.groundWaterUsage === 'No' ? 'No' : '';
      const normalizedCgwaNocRequirement =
          normalizedGroundWaterUsage === 'Yes' ? 'Applicable' : normalizedGroundWaterUsage === 'No' ? 'Not Applicable' : '';

      const capitalLakhsParsed = parseFloat(String(formData.totalCapitalInvestmentLakhs ?? '').trim());
      const totalCapitalInvestmentLakhs = Number.isFinite(capitalLakhsParsed) ? capitalLakhsParsed : 0;

      try {
          setLoading(true);

          let cgwaNocDocumentPath = '';
          if (normalizedGroundWaterUsage === 'Yes') {
              if (formData.cgwaNocDocument && formData.cgwaNocDocument instanceof File) {
                  const fd = new FormData();
                  fd.append('document', formData.cgwaNocDocument);
                  fd.append('documentType', 'CGWA');
                  fd.append('documentName', formData.cgwaNocDocument.name);
                  const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(effectiveId), fd, { headers: { 'Content-Type': undefined } });
                  cgwaNocDocumentPath = res?.data?.data?.filePath || '';
              } else if (typeof formData.cgwaNocDocument === 'string') {
                  cgwaNocDocumentPath = formData.cgwaNocDocument;
              }
          }

          await api.put(API_ENDPOINTS.CLIENT.UPDATE(effectiveId), {
              'productionFacility.totalCapitalInvestmentLakhs': totalCapitalInvestmentLakhs,
              'productionFacility.groundWaterUsage': normalizedGroundWaterUsage,
              'productionFacility.cgwaNocRequirement': normalizedCgwaNocRequirement,
              'productionFacility.cgwaNocDocument': cgwaNocDocumentPath,
          });

          setFormData((prev) => ({
              ...prev,
              totalCapitalInvestmentLakhs: String(totalCapitalInvestmentLakhs || ''),
              groundWaterUsage: normalizedGroundWaterUsage,
              cgwaNocRequirement: normalizedCgwaNocRequirement,
              cgwaNocDocument: cgwaNocDocumentPath || null,
          }));

          messageApi.success('Saved successfully!');
      } catch (err) {
          messageApi.error(err.response?.data?.message || 'Save failed');
      } finally {
          setLoading(false);
      }
  };

  const normalizeCtoRegulationValue = (v) => {
      const t = (v || '').toString().trim();
      if (!t) return '';
      const lower = t.toLowerCase();
      if (lower === 'hazardous wate' || lower === 'hazardous waste') return 'Hazardous Waste';
      if (lower === 'water') return 'Water';
      if (lower === 'air') return 'Air';
      return t;
  };

  const addWaterRegulationRow = () => {
      setWaterRegulationsRows((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          { key: Date.now() + Math.random(), description: '', permittedQuantity: '' }
      ]);
  };

  const updateWaterRegulationRow = (rowIndex, field, value) => {
      setWaterRegulationsRows((prev) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const curr = { ...(copy[rowIndex] || {}) };
          curr[field] = value;
          if (!curr.key) curr.key = Date.now() + Math.random();
          copy[rowIndex] = curr;
          return copy;
      });
  };

  const deleteWaterRegulationRow = (rowIndex) => {
      setWaterRegulationsRows((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== rowIndex) : []));
  };

  const addAirRegulationRow = () => {
      setAirRegulationsRows((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          { key: Date.now() + Math.random(), parameter: '', permittedLimit: '' }
      ]);
  };

  const updateAirRegulationRow = (rowIndex, field, value) => {
      setAirRegulationsRows((prev) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const curr = { ...(copy[rowIndex] || {}) };
          curr[field] = value;
          if (!curr.key) curr.key = Date.now() + Math.random();
          copy[rowIndex] = curr;
          return copy;
      });
  };

  const deleteAirRegulationRow = (rowIndex) => {
      setAirRegulationsRows((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== rowIndex) : []));
  };

  const addHazardousWasteRegulationRow = () => {
      setHazardousWasteRegulationsRows((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          { key: Date.now() + Math.random(), nameOfHazardousWaste: '', facilityModeOfDisposal: '', quantityMtYr: '' }
      ]);
  };

  const updateHazardousWasteRegulationRow = (rowIndex, field, value) => {
      setHazardousWasteRegulationsRows((prev) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const curr = { ...(copy[rowIndex] || {}) };
          curr[field] = value;
          if (!curr.key) curr.key = Date.now() + Math.random();
          copy[rowIndex] = curr;
          return copy;
      });
  };

  const deleteHazardousWasteRegulationRow = (rowIndex) => {
      setHazardousWasteRegulationsRows((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== rowIndex) : []));
  };

  const handleSaveCtoRegulations = async () => {
      const effectiveId = clientId || id;
      if (!effectiveId) {
          messageApi.error('Please save the client first.');
          return;
      }

      const cleanedRegs = (Array.isArray(regulationsCoveredUnderCto) ? regulationsCoveredUnderCto : [])
          .map(normalizeCtoRegulationValue)
          .filter(Boolean);
      const hasWater = cleanedRegs.includes('Water');
      const hasAir = cleanedRegs.includes('Air');
      const hasHazardousWaste = cleanedRegs.includes('Hazardous Waste');
      const waterRows = hasWater
          ? (Array.isArray(waterRegulationsRows) ? waterRegulationsRows : []).map((r) => ({
                description: (r?.description || '').toString(),
                permittedQuantity: (r?.permittedQuantity || '').toString(),
                uom: (r?.uom || '').toString()
            }))
          : [];
      const airRows = hasAir
          ? (Array.isArray(airRegulationsRows) ? airRegulationsRows : []).map((r) => ({
                parameter: (r?.parameter || '').toString(),
                permittedLimit: (r?.permittedLimit || '').toString(),
                uom: (r?.uom || '').toString()
            }))
          : [];
      const hazardousWasteRows = hasHazardousWaste
          ? (Array.isArray(hazardousWasteRegulationsRows) ? hazardousWasteRegulationsRows : []).map((r) => ({
                nameOfHazardousWaste: (r?.nameOfHazardousWaste || '').toString(),
                facilityModeOfDisposal: (r?.facilityModeOfDisposal || '').toString(),
                quantityMtYr: (r?.quantityMtYr || '').toString(),
                uom: (r?.uom || '').toString()
            }))
          : [];

      try {
          setLoading(true);
          await api.put(API_ENDPOINTS.CLIENT.UPDATE(effectiveId), {
              'productionFacility.regulationsCoveredUnderCto': cleanedRegs,
              'productionFacility.waterRegulations': waterRows,
              'productionFacility.airRegulations': airRows,
              'productionFacility.hazardousWasteRegulations': hazardousWasteRows,
          });
          messageApi.success('Saved successfully!');
      } catch (err) {
          messageApi.error(err.response?.data?.message || 'Save failed');
      } finally {
          setLoading(false);
      }
  };

  const handlePlantLocationChange = (n) => {
    const targetCount = n > 0 ? n : 0;

    setCteDetailRows(prev => {
        if (prev.length === targetCount) return prev;
        
        if (prev.length < targetCount) {
            const addedCount = targetCount - prev.length;
            const newRows = Array.from({ length: addedCount }).map(() => ({
                plantName: '', consentNo: '', category: '', issuedDate: '', validUpto: '',
                plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
                factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
                contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
            }));
            return [...prev, ...newRows];
        } else {
            return prev.slice(0, targetCount);
        }
    });

    setCtoDetailRows(prev => {
        if (prev.length === targetCount) return prev;
        
        if (prev.length < targetCount) {
            const addedCount = targetCount - prev.length;
            const newRows = Array.from({ length: addedCount }).map(() => ({
                ctoCaaType: '', plantName: '', industryType: '', category: '', consentOrderNo: '', dateOfIssue: '', validUpto: '',
                plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
                factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
                contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
            }));
            return [...prev, ...newRows];
        } else {
            return prev.slice(0, targetCount);
        }
    });
  };

  const handleCteDetailChange = (index, field, value) => {
    const newRows = [...cteDetailRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setCteDetailRows(newRows);
  };

  const toggleEditCteDetailRow = (index) => {
    const newRows = [...cteDetailRows];
    newRows[index] = { ...newRows[index], isEditing: !newRows[index].isEditing };
    setCteDetailRows(newRows);
  };

  const handleCtoDetailChange = (index, field, value) => {
    const newRows = [...ctoDetailRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setCtoDetailRows(newRows);
  };

  const toggleEditCtoDetailRow = (index) => {
    const newRows = [...ctoDetailRows];
    newRows[index] = { ...newRows[index], isEditing: !newRows[index].isEditing };
    setCtoDetailRows(newRows);
  };

  const deleteLocationRow = (index) => {
    if (window.confirm('Are you sure you want to delete this location? It will be removed from both CTE and CTO/CCA details.')) {
        const newCte = cteDetailRows.filter((_, i) => i !== index);
        const newCto = ctoDetailRows.filter((_, i) => i !== index);
        setCteDetailRows(newCte);
        setCtoDetailRows(newCto);
        setFormData(prev => ({ ...prev, plantLocationNumber: prev.plantLocationNumber - 1 }));
    }
  };

  // CTE Production Handlers
  const addCteProductionRow = () => {
      setCteProductionRows([...cteProductionRows, { key: Date.now(), plantName: '', productName: '', maxCapacityPerYear: '', isEditing: true }]);
  };

  const handleCteProductionChange = (index, field, value) => {
      const newRows = [...cteProductionRows];
      newRows[index] = { ...newRows[index], [field]: value };
      setCteProductionRows(newRows);
  };

  const toggleEditCteProductionRow = (index) => {
      const newRows = [...cteProductionRows];
      newRows[index] = { ...newRows[index], isEditing: !newRows[index].isEditing };
      setCteProductionRows(newRows);
  };

  const deleteCteProductionRow = (index) => {
      const newRows = cteProductionRows.filter((_, i) => i !== index);
      setCteProductionRows(newRows);
  };

  // CTO Product Handlers
  const addCtoProductRow = () => {
      setCtoProductRows([...ctoProductRows, { key: Date.now(), plantName: '', productName: '', quantity: '', isEditing: true }]);
  };

  const handleCtoProductChange = (index, field, value) => {
      const newRows = [...ctoProductRows];
      newRows[index] = { ...newRows[index], [field]: value };
      setCtoProductRows(newRows);
  };

  const toggleEditCtoProductRow = (index) => {
      const newRows = [...ctoProductRows];
      newRows[index] = { ...newRows[index], isEditing: !newRows[index].isEditing };
      setCtoProductRows(newRows);
  };

  const deleteCtoProductRow = (index) => {
      const newRows = ctoProductRows.filter((_, i) => i !== index);
      setCtoProductRows(newRows);
  };

  // Reset Handlers
  const resetCteDetailRow = (index) => {
      const newRows = [...cteDetailRows];
      newRows[index] = {
          ...newRows[index],
          plantName: '', consentNo: '', category: '', issuedDate: '', validUpto: '',
          plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
          factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
          contactPersonMobile: '', contactPersonEmail: '', documentFile: null
      };
      setCteDetailRows(newRows);
  };

  const resetCtoDetailRow = (index) => {
      const newRows = [...ctoDetailRows];
      newRows[index] = {
          ...newRows[index],
          ctoCaaType: '', plantName: '', industryType: '', category: '', consentOrderNo: '', dateOfIssue: '', validUpto: '',
          plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
          factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
          contactPersonMobile: '', contactPersonEmail: '', documentFile: null
      };
      setCtoDetailRows(newRows);
  };

  const resetCteProductionRow = (index) => {
      const newRows = [...cteProductionRows];
      newRows[index] = { ...newRows[index], plantName: '', productName: '', maxCapacityPerYear: '' };
      setCteProductionRows(newRows);
  };

  const resetCtoProductRow = (index) => {
      const newRows = [...ctoProductRows];
      newRows[index] = { ...newRows[index], plantName: '', productName: '', quantity: '' };
      setCtoProductRows(newRows);
  };

  const handleSubmit = async (e, processPreValidation = false) => {
    if (e) e.preventDefault();
    if (!formData.clientName || !formData.tradeName || !formData.companyGroupName || !formData.financialYear || !formData.entityType) {
        messageApi.error('Please fill Client Name, Trade Name, Group Name, Financial Year, and Entity Type.');
        return;
    }
    // Confirmation is handled by the modal
    setLoading(true);

    try {
        const normalizedGroundWaterUsage =
            formData.groundWaterUsage === 'Yes' ? 'Yes' : formData.groundWaterUsage === 'No' ? 'No' : '';
        const normalizedCgwaNocRequirement =
            normalizedGroundWaterUsage === 'Yes' ? 'Applicable' : normalizedGroundWaterUsage === 'No' ? 'Not Applicable' : '';
        const capitalLakhsParsed = parseFloat(String(formData.totalCapitalInvestmentLakhs ?? '').trim());
        const totalCapitalInvestmentLakhs = Number.isFinite(capitalLakhsParsed) ? capitalLakhsParsed : 0;

        const registeredAddressString = [
            formData.roAddress1, formData.roAddress2, formData.roAddress3,
            formData.roCity, formData.roState, formData.roPincode
        ].filter(Boolean).join(', ');

        const communicationAddressString = formData.coSameAsRegistered
            ? registeredAddressString
            : [
                formData.coAddress1, formData.coAddress2, formData.coAddress3,
                formData.coCity, formData.coState, formData.coPincode
            ].filter(Boolean).join(', ');

        const normalizedCtoRegs = (Array.isArray(regulationsCoveredUnderCto) ? regulationsCoveredUnderCto : [])
            .map(normalizeCtoRegulationValue)
            .filter(Boolean);

        const clientData = {
            clientName: formData.clientName,
            tradeName: formData.tradeName,
            companyGroupName: formData.companyGroupName,
            financialYear: formData.financialYear,
            wasteType: formData.wasteType || undefined,
            entityType: formData.entityType,
            producerType: formData.producerType,
            subCategoryProducer: formData.subCategoryProducer,
            isEwasteRegistered: formData.isEwasteRegistered,
            isImportingEEE: formData.isImportingEEE,
            category: isPwp ? 'PWP' : 'PIBO',
            registrationStatus: isPwp ? formData.registrationStatus : undefined,
            ...(isPwp ? {
                'productionFacility.facilityName': formData.unitName || undefined,
                'productionFacility.state': formData.facilityState || undefined
            } : {}),
            authorisedPerson: {
                name: formData.authorisedPersonName,
                number: formData.authorisedPersonNumber,
                email: formData.authorisedPersonEmail,
                pan: formData.authorisedPersonPan,
                addressLine1: formData.authorisedPersonAddress1,
                addressLine2: formData.authorisedPersonAddress2,
                city: formData.authorisedPersonCity,
                state: formData.authorisedPersonState,
                district: formData.authorisedPersonDistrict,
                pincode: formData.authorisedPersonPincode
            },
            coordinatingPerson: {
                name: formData.coordinatingPersonName,
                number: formData.coordinatingPersonNumber,
                email: formData.coordinatingPersonEmail,
                pan: formData.coordinatingPersonPan,
                addressLine1: formData.coordinatingPersonAddress1,
                addressLine2: formData.coordinatingPersonAddress2,
                city: formData.coordinatingPersonCity,
                state: formData.coordinatingPersonState,
                district: formData.coordinatingPersonDistrict,
                pincode: formData.coordinatingPersonPincode
            },
            complianceContact: {
                authorisedPerson: {
                    name: formData.compAuthName,
                    number: formData.compAuthNum,
                    email: formData.compAuthEmail
                },
                coordinatingPerson: {
                    name: formData.compCoordName,
                    number: formData.compCoordNum,
                    email: formData.compCoordEmail
                }
            },
            // MSME Contact removed
            companyDetails: {
                registeredAddress: registeredAddressString,
                pan: formData.panNumber,
                cin: formData.cinNumber,
                gst: formData.gstNumber,
                udyamRegistration: (msmeRows[0]?.udyamNumber) || ''
            },
            registeredOfficeAddress: {
                addressLine1: formData.roAddress1,
                addressLine2: formData.roAddress2,
                addressLine3: formData.roAddress3,
                state: formData.roState,
                city: formData.roCity,
                pincode: formData.roPincode
            },
            communicationAddress: {
                addressLine1: formData.coAddress1,
                addressLine2: formData.coAddress2,
                addressLine3: formData.coAddress3,
                state: formData.coState,
                city: formData.coCity,
                pincode: formData.coPincode
            },
            notes: [
                communicationAddressString ? `Communication Address: ${communicationAddressString}` : '',
                (isPwp && formData.pwpCategory) ? `PWP Category: ${formData.pwpCategory}` : ''
            ].filter(Boolean).join(' | '),
            msmeDetails: msmeRows.map(r => ({
                classificationYear: r.classificationYear || '',
                status: r.status || '',
                majorActivity: r.majorActivity || '',
                udyamNumber: (r.udyamNumber || '').trim(),
                turnover: String(r.turnover ?? '').trim(),
                certificateFile: typeof r.certificateFile === 'string' ? r.certificateFile : ''
            })), // Note: File handling uses separate upload
            productionFacility: {
                facilityName: isPwp ? (formData.unitName || '') : '',
                state: isPwp ? (formData.facilityState || '') : '',
                address: cteDetailRows[0]?.plantAddress || '',
                plantLocationNumber: formData.plantLocationNumber,
                totalCapitalInvestmentLakhs,
                groundWaterUsage: normalizedGroundWaterUsage,
                cgwaNocRequirement: normalizedCgwaNocRequirement,
                cgwaNocDocument: typeof formData.cgwaNocDocument === 'string' ? formData.cgwaNocDocument : '',
                regulationsCoveredUnderCto: normalizedCtoRegs,
                waterRegulations: normalizedCtoRegs.includes('Water')
                    ? (Array.isArray(waterRegulationsRows) ? waterRegulationsRows : []).map(r => ({
                        description: (r?.description || '').toString(),
                        permittedQuantity: (r?.permittedQuantity || '').toString()
                    }))
                    : [],
                airRegulations: normalizedCtoRegs.includes('Air')
                    ? (Array.isArray(airRegulationsRows) ? airRegulationsRows : []).map(r => ({
                        parameter: (r?.parameter || '').toString(),
                        permittedLimit: (r?.permittedLimit || '').toString()
                    }))
                    : [],
                hazardousWasteRegulations: normalizedCtoRegs.includes('Hazardous Waste')
                    ? (Array.isArray(hazardousWasteRegulationsRows) ? hazardousWasteRegulationsRows : []).map(r => ({
                        nameOfHazardousWaste: (r?.nameOfHazardousWaste || '').toString(),
                        facilityModeOfDisposal: (r?.facilityModeOfDisposal || '').toString(),
                        quantityMtYr: (r?.quantityMtYr || '').toString()
                    }))
                    : [],
                cteDetailsList: cteDetailRows.map(r => ({
                    ...r,
                    issuedDate: r.issuedDate ? r.issuedDate : null,
                    validUpto: r.validUpto ? r.validUpto : null,
                    documentFile: typeof r.documentFile === 'string' ? r.documentFile : ''
                })),
                cteProduction: cteProductionRows,
                ctoDetailsList: ctoDetailRows.map(r => ({
                    ...r,
                    dateOfIssue: r.dateOfIssue ? r.dateOfIssue : null,
                    validUpto: r.validUpto ? r.validUpto : null,
                    documentFile: typeof r.documentFile === 'string' ? r.documentFile : ''
                })),
                ctoProducts: ctoProductRows
            },
            lastCompletedStep: 4,
            ...(processPreValidation ? { clientStatus: 'SUBMITTED' } : (!clientId ? { clientStatus: 'DRAFT' } : {}))
        };

        let response;
        if (clientId) {
             response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), clientData);
        } else {
             response = await api.post(API_ENDPOINTS.CLIENT.CREATE, clientData);
        }

        if (response.data.success) {
            setIsSubmitModalOpen(false);
            const id = clientId || response.data.data._id;
            // Handle File Uploads
            const upload = (file, type, num, date) => {
                if (!file) return;
                const fd = new FormData();
                fd.append('document', file);
                fd.append('documentType', type);
                fd.append('documentName', file.name);
                if (num) fd.append('certificateNumber', num);
                if (date) fd.append('certificateDate', date);
                return api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
            };

            const promises = [
                upload(formData.gstFile, 'GST', formData.gstNumber, formData.gstDate),
                upload(formData.cinFile, 'CIN', formData.cinNumber, formData.cinDate),
                upload(formData.panFile, 'PAN', formData.panNumber, formData.panDate),
                upload(formData.factoryLicenseFile, 'Factory License', formData.factoryLicenseNumber, formData.factoryLicenseDate),
                upload(formData.eprCertificateFile, 'EPR Certificate', formData.eprCertificateNumber, formData.eprCertificateDate),
                upload(formData.iecCertificateFile, 'IEC Certificate', formData.iecCertificateNumber, formData.iecCertificateDate),
                upload(formData.dicDcssiCertificateFile, 'DIC/DCSSI Certificate', formData.dicDcssiCertificateNumber, formData.dicDcssiCertificateDate),
                upload(formData.ewasteFile, 'E-waste Registration', formData.ewasteCertificateNumber, formData.ewasteCertificateDate),
                upload(formData.eeeFile, 'EEE Import Authorization', formData.eeeCertificateNumber, formData.eeeCertificateDate),
            ];

            await Promise.all(promises);

            // Helper for row document uploads
            const uploadRowDoc = async (file, type, name) => {
                const fd = new FormData();
                fd.append('document', file);
                fd.append('documentType', type);
                fd.append('documentName', name || (file?.name || `${type}_Document`));
                const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
                return res?.data?.data?.filePath || '';
            };

            // MSME Uploads and Update
            const updatedMsmeRows = await Promise.all(msmeRows.map(async (row) => {
                if (row.certificateFile && row.certificateFile instanceof File) {
                    try {
                        const path = await uploadRowDoc(row.certificateFile, 'Other', `MSME_Cert_${row.udyamNumber}`);
                        return { 
                            ...row,
                            classificationYear: row.classificationYear || '',
                            status: row.status || '',
                            majorActivity: row.majorActivity || '',
                            udyamNumber: (row.udyamNumber || '').trim(),
                            turnover: String(row.turnover ?? '').trim(),
                            certificateFile: path 
                        };
                    } catch (e) {
                        console.error("MSME Upload Failed", e);
                        return {
                            ...row,
                            classificationYear: row.classificationYear || '',
                            status: row.status || '',
                            majorActivity: row.majorActivity || '',
                            udyamNumber: (row.udyamNumber || '').trim(),
                            turnover: String(row.turnover ?? '').trim(),
                            certificateFile: '' // Fallback
                        };
                    }
                }
                return {
                    ...row,
                    classificationYear: row.classificationYear || '',
                    status: row.status || '',
                    majorActivity: row.majorActivity || '',
                    udyamNumber: (row.udyamNumber || '').trim(),
                    turnover: String(row.turnover ?? '').trim(),
                    certificateFile: typeof row.certificateFile === 'string' ? row.certificateFile : ''
                };
            }));

            // Update document metadata when only number/date changed (no new file)
            const singleTypes2 = [
                { type: 'Factory License', numKey: 'factoryLicenseNumber', dateKey: 'factoryLicenseDate', pathKey: 'factoryLicenseFilePath' },
                { type: 'EPR Certificate', numKey: 'eprCertificateNumber', dateKey: 'eprCertificateDate', pathKey: 'eprCertificateFilePath' },
                { type: 'IEC Certificate', numKey: 'iecCertificateNumber', dateKey: 'iecCertificateDate', pathKey: 'iecCertificateFilePath' },
                { type: 'DIC/DCSSI Certificate', numKey: 'dicDcssiCertificateNumber', dateKey: 'dicDcssiCertificateDate', pathKey: 'dicDcssiCertificateFilePath' },
                { type: 'GST', numKey: 'gstNumber', dateKey: 'gstDate', pathKey: 'gstFilePath' },
                { type: 'CIN', numKey: 'cinNumber', dateKey: 'cinDate', pathKey: 'cinFilePath' },
                { type: 'PAN', numKey: 'panNumber', dateKey: 'panDate', pathKey: 'panFilePath' },
                { type: 'E-waste Registration', numKey: 'ewasteCertificateNumber', dateKey: 'ewasteCertificateDate', pathKey: 'ewasteFilePath' },
                { type: 'EEE Import Authorization', numKey: 'eeeCertificateNumber', dateKey: 'eeeCertificateDate', pathKey: 'eeeFilePath' }
            ];
            let docsUpdated2 = false;
            const updatedDocs2 = (clientDocuments || []).map((d) => {
                const t = singleTypes2.find(st => st.type === d.documentType);
                if (!t) return d;
                const newNumber = formData[t.numKey] || '';
                const newDateStr = formData[t.dateKey] || '';
                const currentNumber = d.certificateNumber || '';
                const currentDateStr = d.certificateDate ? String(d.certificateDate).split('T')[0] : '';
                const fileSelected = !!formData[`${t.pathKey.replace('FilePath','File')}`];
                if (!fileSelected && (newNumber !== currentNumber || newDateStr !== currentDateStr)) {
                    docsUpdated2 = true;
                    return {
                        ...d,
                        certificateNumber: newNumber,
                        certificateDate: newDateStr ? new Date(newDateStr) : null
                    };
                }
                return d;
            });
            if (docsUpdated2) {
                await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), { documents: updatedDocs2 });
                setClientDocuments(updatedDocs2);
            }

            // Upload CTE/CTO row documents and update lists with file paths
            // uploadRowDoc is already defined above

            const updatedCteRows = await Promise.all(cteDetailRows.map(async (row) => {
                if (row?.documentFile && row.documentFile instanceof File) {
                    const path = await uploadRowDoc(row.documentFile, 'CTE', row.consentNo || row.plantName);
                    return { 
                        ...row, 
                        issuedDate: row.issuedDate ? row.issuedDate : null,
                        validUpto: row.validUpto ? row.validUpto : null,
                        documentFile: path 
                    };
                }
                return { 
                    ...row, 
                    issuedDate: row.issuedDate ? row.issuedDate : null,
                    validUpto: row.validUpto ? row.validUpto : null,
                    documentFile: typeof row.documentFile === 'string' ? row.documentFile : '' 
                };
            }));

            const updatedCtoRows = await Promise.all(ctoDetailRows.map(async (row) => {
                if (row?.documentFile && row.documentFile instanceof File) {
                    const path = await uploadRowDoc(row.documentFile, 'CTO', row.consentOrderNo || row.plantName);
                    return { 
                        ...row, 
                        dateOfIssue: row.dateOfIssue ? row.dateOfIssue : null,
                        validUpto: row.validUpto ? row.validUpto : null,
                        documentFile: path 
                    };
                }
                return { 
                    ...row, 
                    dateOfIssue: row.dateOfIssue ? row.dateOfIssue : null,
                    validUpto: row.validUpto ? row.validUpto : null,
                    documentFile: typeof row.documentFile === 'string' ? row.documentFile : '' 
                };
            }));

            let cgwaNocDocumentPath = '';
            if (normalizedGroundWaterUsage === 'Yes') {
                if (formData.cgwaNocDocument && formData.cgwaNocDocument instanceof File) {
                    cgwaNocDocumentPath = await uploadRowDoc(
                        formData.cgwaNocDocument,
                        'CGWA',
                        `CGWA_NOC_${formData.clientName || id}`
                    );
                } else if (typeof formData.cgwaNocDocument === 'string') {
                    cgwaNocDocumentPath = formData.cgwaNocDocument;
                }
            }

            // Persist updated lists with document file paths
            const normalizedCtoRegs2 = (Array.isArray(regulationsCoveredUnderCto) ? regulationsCoveredUnderCto : [])
                .map(normalizeCtoRegulationValue)
                .filter(Boolean);

            await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), {
                msmeDetails: updatedMsmeRows.map(r => ({
                    classificationYear: r.classificationYear,
                    status: r.status,
                    majorActivity: r.majorActivity,
                    udyamNumber: r.udyamNumber,
                    turnover: r.turnover,
                    certificateFile: r.certificateFile
                })),
                productionFacility: {
                    address: cteDetailRows[0]?.plantAddress || '',
                    plantLocationNumber: formData.plantLocationNumber,
                    totalCapitalInvestmentLakhs,
                    groundWaterUsage: normalizedGroundWaterUsage,
                    cgwaNocRequirement: normalizedCgwaNocRequirement,
                    cgwaNocDocument: cgwaNocDocumentPath,
                    regulationsCoveredUnderCto: normalizedCtoRegs2,
                    waterRegulations: normalizedCtoRegs2.includes('Water')
                        ? (Array.isArray(waterRegulationsRows) ? waterRegulationsRows : []).map(r => ({
                            description: (r?.description || '').toString(),
                            permittedQuantity: (r?.permittedQuantity || '').toString(),
                            uom: (r?.uom || '').toString()
                        }))
                        : [],
                    airRegulations: normalizedCtoRegs2.includes('Air')
                        ? (Array.isArray(airRegulationsRows) ? airRegulationsRows : []).map(r => ({
                            parameter: (r?.parameter || '').toString(),
                            permittedLimit: (r?.permittedLimit || '').toString(),
                            uom: (r?.uom || '').toString()
                        }))
                        : [],
                    hazardousWasteRegulations: normalizedCtoRegs2.includes('Hazardous Waste')
                        ? (Array.isArray(hazardousWasteRegulationsRows) ? hazardousWasteRegulationsRows : []).map(r => ({
                            nameOfHazardousWaste: (r?.nameOfHazardousWaste || '').toString(),
                            facilityModeOfDisposal: (r?.facilityModeOfDisposal || '').toString(),
                            quantityMtYr: (r?.quantityMtYr || '').toString(),
                            uom: (r?.uom || '').toString()
                        }))
                        : [],
                    cteDetailsList: updatedCteRows,
                    cteProduction: cteProductionRows,
                    ctoDetailsList: updatedCtoRows,
                    ctoProducts: ctoProductRows
                }
            });
            messageApi.success('Client saved successfully!');
            
            if (processPreValidation) {
                const newId = clientId || response.data.data._id;
                setClientId(newId);
                setIsPreValidationUnlocked(true); // Unlock Pre-Validation tab only
                if (!clientId) {
                     // If it was a new client, navigate to edit page to persist state
                     navigate(`/dashboard/client/${newId}/edit`, { state: { activeTab: 'Pre - Validation' } });
                } else {
                     setActiveTab('Pre - Validation');
                }
            } else {
                setTimeout(() => navigate('/dashboard/clients'), 1500);
            }
        }
    } catch (err) {
        console.error(err);
        messageApi.error(err.response?.data?.message || 'Error adding client');
    } finally {
        setLoading(false);
    }
  };

  const handleSaveStep1 = async () => {
    // Validation
    const requiredFields = [
        'clientName', 'tradeName', 'companyGroupName', 'financialYear', 'entityType',
        'authorisedPersonName', 'authorisedPersonNumber', 'authorisedPersonEmail',
        'coordinatingPersonName', 'coordinatingPersonNumber', 'coordinatingPersonEmail'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
        toast.error('Please fill all mandatory fields in Company Info', {
            theme: "colored"
        });
        return;
    }

    if (!isValidMobile(formData.authorisedPersonNumber) || !isValidMobile(formData.coordinatingPersonNumber)) {
        toast.error('Mobile numbers must be 10 digits', {
            theme: "colored"
        });
        return;
    }

    try {
        setLoading(true);
        
        // 1. Force derivation of correct wasteType from URL if current state is missing or invalid
        let finalWasteType = formData.wasteType;
        if (!finalWasteType || finalWasteType === 'Plastic Waste') { 
            const urlWasteType = getWasteTypeFromUrl(type);
            if (urlWasteType) {
                finalWasteType = urlWasteType;
            }
        }
        
        // Update local state to match what we are saving
        if (finalWasteType !== formData.wasteType) {
            setFormData(prev => ({ ...prev, wasteType: finalWasteType }));
        }

        // Construct nested data structure for backend
        const clientData = {
            clientName: formData.clientName,
            tradeName: formData.tradeName,
            companyGroupName: formData.companyGroupName,
            financialYear: formData.financialYear,
            wasteType: finalWasteType,
            entityType: formData.entityType,
            producerType: formData.producerType, // Add producerType
            subCategoryProducer: formData.subCategoryProducer, // Add subCategoryProducer
            category: isPwp ? 'PWP' : 'PIBO',
            registrationStatus: isPwp ? (formData.registrationStatus || 'Registered') : undefined,
            authorisedPerson: {
                name: formData.authorisedPersonName,
                number: formData.authorisedPersonNumber,
                email: formData.authorisedPersonEmail,
                pan: formData.authorisedPersonPan,
                aadhaar: formData.authorisedPersonAadhaar, // Add Aadhaar
                address: formData.authorisedPersonAddress
            },
            coordinatingPerson: {
                name: formData.coordinatingPersonName,
                number: formData.coordinatingPersonNumber,
                email: formData.coordinatingPersonEmail,
                pan: formData.coordinatingPersonPan,
                aadhaar: formData.coordinatingPersonAadhaar, // Add Aadhaar
                address: formData.coordinatingPersonAddress
            },
            lastCompletedStep: Math.max(completedStep, 1)
        };

        let response;
        if (clientId) {
            response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), clientData);
        } else {
            response = await api.post(API_ENDPOINTS.CLIENT.CREATE, clientData);
        }

        if (response.data.success) {
            if (!clientId && response.data.data?._id) {
                setClientId(response.data.data._id);
            }
            if (completedStep < 1) setCompletedStep(1);
            toast.success(clientId ? 'Company details updated successfully!' : 'Company details saved successfully!', {
                theme: "colored",
                icon: <FaCheckCircle className="text-white" />
            });
            // Auto advance to next step on successful save
            if (currentStep === 1) setCurrentStep(2);
        }
    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Error saving client details', {
            theme: "colored"
        });
    } finally {
        setLoading(false);
    }
  };

  const handleSaveStep2 = async () => {
    if (!clientId) {
        toast.error('Please save Basic Info first', { theme: "colored" });
        return;
    }
    // Validation
    if (!formData.roAddress1 || !formData.roState || !formData.roCity || !formData.roPincode) {
        toast.error('Please fill all mandatory fields in Registered Office Address', { theme: "colored" });
        return;
    }

    try {
        setLoading(true);
        const registeredAddressString = [
            formData.roAddress1, formData.roAddress2, formData.roAddress3,
            formData.roCity, formData.roState, formData.roPincode
        ].filter(Boolean).join(', ');

        const communicationAddressString = formData.coSameAsRegistered
            ? registeredAddressString
            : [
                formData.coAddress1, formData.coAddress2, formData.coAddress3,
                formData.coCity, formData.coState, formData.coPincode
            ].filter(Boolean).join(', ');

        const updateData = {
            companyDetails: {
                registeredAddress: registeredAddressString,
                pan: formData.panNumber,
                cin: formData.cinNumber,
                gst: formData.gstNumber,
                udyamRegistration: (msmeRows[0]?.udyamNumber) || ''
            },
            // Also explicitly save PAN/CIN/GST to top-level if needed, or rely on documents.
            // But 'companyDetails' structure suggests it's stored nested.
            // Let's check the backend model or just ensure these values are passed.
            // Actually, handleSaveStep3 saves them as documents.
            // Here we might be saving them to legacy fields if they exist.
            
            registeredOfficeAddress: {
                addressLine1: formData.roAddress1,
                addressLine2: formData.roAddress2,
                addressLine3: formData.roAddress3,
                state: formData.roState,
                city: formData.roCity,
                pincode: formData.roPincode
            },
            communicationAddress: {
                addressLine1: formData.coAddress1,
                addressLine2: formData.coAddress2,
                addressLine3: formData.coAddress3,
                state: formData.coState,
                city: formData.coCity,
                pincode: formData.coPincode
            },
            notes: communicationAddressString ? `Communication Address: ${communicationAddressString}` : ''
        };
        
        // Ensure PAN is also saved in Step 2 if it was entered in Step 1 or 2
        // Since PAN is often part of Company Details
        if (formData.panNumber) {
             // If there's a specific field for PAN in the root client object, add it here
             // But usually it's in documents.
             // If 'companyDetails' is a virtual or specific object, we keep it there.
        }

        const response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), updateData);

        if (response.data.success) {
            if (completedStep < 2) setCompletedStep(2);
            toast.success('Address details saved successfully!', {
                theme: "colored",
                icon: <FaCheckCircle className="text-white" />
            });
            if (currentStep === 2) setCurrentStep(3);
        }
    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Error saving address details', { theme: "colored" });
    } finally {
        setLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    if (!clientId) {
        toast.error('Please save previous steps first', { theme: "colored" });
        return;
    }

    try {
        setLoading(true);
        // Save Metadata first
        const updateData = {
            companyDetails: {
                // Need to re-construct address string to avoid wiping it out if we overwrite the whole object
                // Or we can rely on the fact that we have the address data in formData
                registeredAddress: [
                    formData.roAddress1, formData.roAddress2, formData.roAddress3,
                    formData.roCity, formData.roState, formData.roPincode
                ].filter(Boolean).join(', '),
                pan: formData.panNumber,
                cin: formData.cinNumber,
                gst: formData.gstNumber,
                udyamRegistration: (msmeRows[0]?.udyamNumber) || ''
            },
            msmeDetails: msmeRows.map(r => ({
                classificationYear: r.classificationYear || '',
                status: r.status || '',
                majorActivity: r.majorActivity || '',
                udyamNumber: (r.udyamNumber || '').trim(),
                turnover: String(r.turnover ?? '').trim(),
                certificateFile: typeof r.certificateFile === 'string' ? r.certificateFile : ''
            })),
            isEwasteRegistered: formData.isEwasteRegistered || '',
            isImportingEEE: formData.isImportingEEE || '',
            lastCompletedStep: Math.max(completedStep, 3)
        };

        await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), updateData);

        // Upload Files
        const upload = (file, type, num, date) => {
            if (!file || !(file instanceof File)) return; // Ensure it's a valid File object
            const fd = new FormData();
            fd.append('document', file);
            fd.append('documentType', type);
            fd.append('documentName', file.name);
            if (num) fd.append('certificateNumber', num);
            if (date) fd.append('certificateDate', date);
            return api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(clientId), fd, { headers: { 'Content-Type': undefined } });
        };

        const promises = [
            upload(formData.gstFile, 'GST', formData.gstNumber, formData.gstDate),
            upload(formData.cinFile, 'CIN', formData.cinNumber, formData.cinDate),
            upload(formData.panFile, 'PAN', formData.panNumber, formData.panDate),
            upload(formData.factoryLicenseFile, 'Factory License', formData.factoryLicenseNumber, formData.factoryLicenseDate),
            upload(formData.eprCertificateFile, 'EPR Certificate', formData.eprCertificateNumber, formData.eprCertificateDate),
            upload(formData.iecCertificateFile, 'IEC Certificate', formData.iecCertificateNumber, formData.iecCertificateDate),
            upload(formData.dicDcssiCertificateFile, 'DIC/DCSSI Certificate', formData.dicDcssiCertificateNumber, formData.dicDcssiCertificateDate),
            upload(formData.ewasteFile, 'E-waste Registration', formData.ewasteCertificateNumber, formData.ewasteCertificateDate),
            upload(formData.eeeFile, 'EEE Import Authorization', formData.eeeCertificateNumber, formData.eeeCertificateDate),
        ];

        msmeRows.forEach((row) => {
            if (row.certificateFile && (row.certificateFile instanceof File)) {
                const fd = new FormData();
                fd.append('document', row.certificateFile);
                fd.append('documentType', 'MSME Certificate'); // Correct type for controller logic
                fd.append('documentName', `MSME Certificate - ${row.udyamNumber || 'Unknown'}`);
                promises.push(api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(clientId), fd, { headers: { 'Content-Type': undefined } }));
            }
        });

        // Persist MSME Rows to Client Model (msmeDetails)
        // We do this to save non-file fields (Udyam Number, Turnover, etc.)
        const msmePayload = msmeRows.map(row => ({
             classificationYear: row.classificationYear,
             status: row.status,
             majorActivity: row.majorActivity,
             udyamNumber: row.udyamNumber,
             turnover: row.turnover,
             // If it's a file object, we can't save it to Mongo directly here. 
             // The upload loop above handles the file storage.
             // We ideally want the URL here, but that requires waiting for upload.
             // For now, we keep the existing URL if it's a string, or null if it's a new file (it will show in Documents tab).
             certificateFile: (typeof row.certificateFile === 'string') ? row.certificateFile : null
        }));
        
        // Add MSME details update to promises
        promises.push(api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), { msmeDetails: msmePayload }));

        await Promise.all(promises);

        // Update document metadata if number/date changed without uploading a new file
        const singleTypes = [
            { type: 'Factory License', numKey: 'factoryLicenseNumber', dateKey: 'factoryLicenseDate', pathKey: 'factoryLicenseFilePath' },
            { type: 'EPR Certificate', numKey: 'eprCertificateNumber', dateKey: 'eprCertificateDate', pathKey: 'eprCertificateFilePath' },
            { type: 'IEC Certificate', numKey: 'iecCertificateNumber', dateKey: 'iecCertificateDate', pathKey: 'iecCertificateFilePath' },
            { type: 'DIC/DCSSI Certificate', numKey: 'dicDcssiCertificateNumber', dateKey: 'dicDcssiCertificateDate', pathKey: 'dicDcssiCertificateFilePath' },
            { type: 'E-waste Registration', numKey: 'ewasteCertificateNumber', dateKey: 'ewasteCertificateDate', pathKey: 'ewasteFilePath' },
            { type: 'EEE Import Authorization', numKey: 'eeeCertificateNumber', dateKey: 'eeeCertificateDate', pathKey: 'eeeFilePath' },
            { type: 'CIN', numKey: 'cinNumber', dateKey: 'cinDate', pathKey: 'cinFilePath' },
            { type: 'PAN', numKey: 'panNumber', dateKey: 'panDate', pathKey: 'panFilePath' },
            { type: 'GST', numKey: 'gstNumber', dateKey: 'gstDate', pathKey: 'gstFilePath' }
        ];
        let docsUpdated = false;
        const updatedDocs = (clientDocuments || []).map((d) => {
            const t = singleTypes.find(st => st.type === d.documentType);
            if (!t) return d;
            const newNumber = formData[t.numKey] || '';
            const newDateStr = formData[t.dateKey] || '';
            const currentNumber = d.certificateNumber || '';
            const currentDateStr = d.certificateDate ? String(d.certificateDate).split('T')[0] : '';
            const fileSelected = !!formData[`${t.pathKey.replace('FilePath','File')}`];
            if (!fileSelected && (newNumber !== currentNumber || newDateStr !== currentDateStr)) {
                docsUpdated = true;
                return {
                    ...d,
                    certificateNumber: newNumber,
                    certificateDate: newDateStr ? new Date(newDateStr) : null
                };
            }
            return d;
        });
        if (docsUpdated) {
            await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), { documents: updatedDocs });
            setClientDocuments(updatedDocs);
        }

        if (completedStep < 3) setCompletedStep(3);
        toast.success('Documents saved successfully!', {
            theme: "colored",
            icon: <FaCheckCircle className="text-white" />
        });
        if (currentStep === 3) setCurrentStep(4);

    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Error saving documents', { theme: "colored" });
    } finally {
        setLoading(false);
    }
  };

  const normalizeValue = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim().toLowerCase();
  };

  const buildPostValidationRowsForFacility = async (consentType, facility) => {
      const itemId = facility._id;
      if (!itemId || !clientId) return [];

      let productRows = [];
      let componentDetails = [];
      let supplierCompliance = [];
      let procurementDetails = [];

      try {
          const [prodRes, compRes, suppRes, procRes] = await Promise.all([
              api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), {
                  params: { type: consentType, itemId }
              }),
              api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), {
                  params: { type: consentType, itemId }
              }),
              api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), {
                  params: { type: consentType, itemId }
              }),
              api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), {
                  params: { type: consentType, itemId }
              })
          ]);

          const savedRows = Array.isArray(prodRes.data?.data) ? prodRes.data.data : [];
          const hasSavedDoc = !!prodRes.data?.hasDoc;
          const originalRows = facility.productComplianceRows || [];
          procurementDetails = Array.isArray(procRes.data?.data) ? procRes.data.data : [];

          if (hasSavedDoc && savedRows.length === 0) {
              productRows = [];
          } else if (savedRows.length > 0) {
              productRows = savedRows.map((saved, idx) => {
                  const orig = originalRows[idx] || {};
                  return {
                      ...orig,
                      ...saved,
                      componentCode: saved.componentCode || orig.componentCode,
                      componentDescription: saved.componentDescription || orig.componentDescription,
                      packagingType: saved.packagingType || orig.packagingType,
                      supplierName: saved.supplierName || orig.supplierName,
                      supplierCode: saved.supplierCode || orig.supplierCode,
                      skuDescription: saved.skuDescription || orig.skuDescription,
                      auditorRemarks: Object.prototype.hasOwnProperty.call(saved, 'auditorRemarks') ? saved.auditorRemarks : (orig.auditorRemarks || ''),
                      clientRemarks: Object.prototype.hasOwnProperty.call(saved, 'clientRemarks') ? saved.clientRemarks : (orig.clientRemarks || ''),
                      complianceStatus: Object.prototype.hasOwnProperty.call(saved, 'complianceStatus') ? saved.complianceStatus : (orig.complianceStatus || '')
                  };
              });
          } else {
              productRows = originalRows.map((orig) => ({
                  ...orig,
                  auditorRemarks: orig.auditorRemarks || '',
                  clientRemarks: orig.clientRemarks || '',
                  complianceStatus: orig.complianceStatus || ''
              }));
          }

          const apiCompDetails = Array.isArray(compRes.data?.data) ? compRes.data.data : [];
          const facCompDetails = facility.productComponentDetails || [];

          if (apiCompDetails.length > 0) {
              componentDetails = facCompDetails.map(facItem => {
                  const facCode = normalizeValue(facItem.componentCode);
                  const facDesc = normalizeValue(facItem.componentDescription);

                  const apiItem = apiCompDetails.find(ai => {
                      const aiCode = normalizeValue(ai.componentCode);
                      const aiDesc = normalizeValue(ai.componentDescription);



                      return (facCode && aiCode === facCode) || (!facCode && facDesc && aiDesc === facDesc);
                  });

                  if (apiItem) {
                      return {
                          ...facItem,
                          ...apiItem,
                          componentImage: apiItem.componentImage || facItem.componentImage,
                          componentPolymer: apiItem.componentPolymer || facItem.componentPolymer,
                          category: apiItem.category || facItem.category,
                          containerCapacity: apiItem.containerCapacity || facItem.containerCapacity,
                          layerType: apiItem.layerType || facItem.layerType,
                          thickness: apiItem.thickness || facItem.thickness,
                          supplierCode: apiItem.supplierCode || facItem.supplierCode,
                          supplierName: apiItem.supplierName || facItem.supplierName
                      };
                  }
                  return facItem;
              });

              apiCompDetails.forEach(ai => {
                  const aiCode = normalizeValue(ai.componentCode);
                  const aiDesc = normalizeValue(ai.componentDescription);
                  const exists = componentDetails.some(ci => {
                      const ciCode = normalizeValue(ci.componentCode);
                      const ciDesc = normalizeValue(ci.componentDescription);
                      return (ciCode && aiCode === ciCode) || (!ciCode && ciDesc && aiDesc === ciDesc);
                  });
                  if (!exists) componentDetails.push(ai);
              });
          } else {
              componentDetails = facCompDetails;
          }

          const apiSuppCompliance = Array.isArray(suppRes.data?.data) ? suppRes.data.data : [];
          supplierCompliance = apiSuppCompliance.length > 0 ? apiSuppCompliance : (facility.productSupplierCompliance || []);
      } catch (err) {
          productRows = facility.productComplianceRows || [];
          componentDetails = facility.productComponentDetails || [];
          supplierCompliance = facility.productSupplierCompliance || [];
          procurementDetails = [];
      }

      const rows = [];

      productRows.forEach((row, rowIndex) => {
          const componentCodeNorm = normalizeValue(row.componentCode);
          const componentDescNorm = normalizeValue(row.componentDescription);
          const supplierNameNorm = normalizeValue(row.supplierName);

          const compDetail = componentDetails.find((c) => {
              const codeMatch =
                  componentCodeNorm &&
                  normalizeValue(c.componentCode) === componentCodeNorm;
              const descMatch =
                  !componentCodeNorm &&
                  componentDescNorm &&
                  normalizeValue(c.componentDescription) === componentDescNorm;
              return codeMatch || descMatch;
          });

          const suppDetail = supplierCompliance.find((s) => {
              const codeMatch =
                  componentCodeNorm &&
                  normalizeValue(s.componentCode) === componentCodeNorm;
              const descAndSupplierMatch =
                  componentDescNorm &&
                  normalizeValue(s.componentDescription) === componentDescNorm &&
                  supplierNameNorm &&
                  normalizeValue(s.supplierName) === supplierNameNorm;
              return codeMatch || descAndSupplierMatch;
          });

          const sysCodeNorm = normalizeValue(row.systemCode);
          const procurementMatches = procurementDetails.filter((p) => {
              const pSys = normalizeValue(p.systemCode);
              const pComp = normalizeValue(p.componentCode);
              const pDesc = normalizeValue(p.componentDescription);
              
              // 1. System Code Match (High confidence)
              if (sysCodeNorm && pSys === sysCodeNorm) return true;
              
              // 2. Component Code Match
              if (componentCodeNorm && pComp === componentCodeNorm) return true;
              
              // 3. Component Description Match (Fallback / Loose matching)
              // Allow description match even if component code didn't match (e.g. procurement has missing/wrong code)
              if (componentDescNorm && pDesc === componentDescNorm) return true;
              
              return false;
          });

          const recycledQty = procurementMatches.reduce((sum, p) => sum + (parseFloat(p.recycledQty) || 0), 0);
          const recycledQrtAmount = procurementMatches.reduce((sum, p) => sum + (parseFloat(p.recycledQrtAmount) || 0), 0);
          const rcPercentMentioned = procurementMatches.find(p => p.rcPercentMentioned)?.rcPercentMentioned || '';

          // Calculate sum recycled percent from procurement matches
          const recycledPercent = procurementMatches.reduce((sum, p) => sum + (parseFloat(p.recycledPercent) || 0), 0);
          
          const virginQty = procurementMatches.reduce((sum, p) => sum + (parseFloat(p.virginQty) || 0), 0);
          const virginQtyAmount = procurementMatches.reduce((sum, p) => sum + (parseFloat(p.virginQtyAmount) || 0), 0);

          const rawSupplierCode = row.supplierCode || compDetail?.supplierCode || '';
          const normalizedSupplierCode = normalizeValue(rawSupplierCode);

          const rowData = {
          key: `${consentType}-${itemId}-${row._id || rowIndex}`,
          consentType,
          itemId,
          rowIndex,
          productName: row.productName || row.skuCode || '',
          componentName: row.componentName || row.componentDescription || row.componentCode || '',
          systemCode: row.systemCode || '',
          packagingType: row.packagingType,
          skuCode: row.skuCode,
          skuDescription: row.skuDescription,
          skuUom: row.skuUom || '',
          componentCode: row.componentCode,
          componentDescription: row.componentDescription,
          productImage: row.productImage || '',
          componentImage: compDetail?.componentImage || row.componentImage || row.productImage,
          componentPolymer: compDetail?.componentPolymer || 'N/A',
          category: compDetail?.category || 'N/A',
          containerCapacity: compDetail?.containerCapacity || 'N/A',
          layerType: compDetail?.layerType || 'N/A',
          thickness: compDetail?.thickness || row.thickness || 'N/A',
          supplierCode: normalizedSupplierCode === 'no' ? '' : rawSupplierCode,
          supplierName:
              row.supplierName ||
              compDetail?.supplierName ||
              suppDetail?.supplierName ||
              '',
          eprRegistrationNumber: suppDetail?.eprCertificateNumber || 'N/A',
          rcPercentMentioned,
          recycledQty,
          recycledQrtAmount,
          recycledPercent,
          virginQty,
          virginQtyAmount,
          rcPercent: row.rcPercent || '',
          auditorRemarks: row.auditorRemarks || '',
          clientRemarks: row.clientRemarks || '',
          complianceStatus: row.complianceStatus || ''
          };
          rowData._original = { ...rowData };
          rows.push(rowData);
      });

      return rows;
  };

  const dedupePostValidationRows = (rows) => {
      const uniqueMap = new Map();
      rows.forEach((row, idx) => {
          const sysKey = normalizeValue(row.systemCode);
          const key = sysKey ? `sys:${sysKey}` : `row:${idx}`;
          if (!uniqueMap.has(key)) {
              uniqueMap.set(key, row);
          } else {
              const existing = uniqueMap.get(key);
              const merged = { ...existing };
              const enrichFields = [
                  'packagingType',
                  'skuCode',
                  'skuUom',
                  'skuDescription',
                  'componentCode',
                  'componentDescription',
                  'componentImage',
                  'componentPolymer',
                  'category',
                  'containerCapacity',
                  'layerType',
                  'thickness',
                  'supplierCode',
                  'supplierName',
                  'eprRegistrationNumber',
                  'productName',
                  'componentName'
              ];
              enrichFields.forEach((field) => {
                  const current = existing[field];
                  const incoming = row[field];
                  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '' || String(v).trim() === 'N/A';
                  if (isEmpty(current) && !isEmpty(incoming)) {
                      merged[field] = incoming;
                  }
              });

              // Sum numeric fields for deduplicated rows
              merged.recycledQty = (parseFloat(existing.recycledQty) || 0) + (parseFloat(row.recycledQty) || 0);
              merged.recycledQrtAmount = (parseFloat(existing.recycledQrtAmount) || 0) + (parseFloat(row.recycledQrtAmount) || 0);
              merged.virginQty = (parseFloat(existing.virginQty) || 0) + (parseFloat(row.virginQty) || 0);
              merged.virginQtyAmount = (parseFloat(existing.virginQtyAmount) || 0) + (parseFloat(row.virginQtyAmount) || 0);
              
              uniqueMap.set(key, merged);
          }
      });
      return Array.from(uniqueMap.values());
  };

  const fetchPostValidationData = async () => {
      if (!clientId || !fullClientData?.productionFacility) {
          setPostValidationData([]);
          return;
      }

      try {
          const results = [];
          const consentConfigs = [
              // { type: 'CTE', list: fullClientData.productionFacility.cteDetailsList || [] }, // CTE excluded as per requirement
              { type: 'CTO', list: fullClientData.productionFacility.ctoDetailsList || [] }
          ];

          for (const config of consentConfigs) {
              const consentType = config.type;
              const consents = config.list;

              for (const facility of consents) {
                  const facilityRows = await buildPostValidationRowsForFacility(consentType, facility);
                  facilityRows.forEach((rowData) => {
                      results.push(rowData);
                  });
              }
          }

          const deduped = dedupePostValidationRows(results);
          setPostValidationData(deduped);
          setPostValidationPagination((prev) => ({
              ...prev,
              current: 1,
          }));
      } catch (err) {
          console.error(err);
          setPostValidationData([]);
      }
  };

  const getMonthIndexForLabel = (label) => {
      const monthOrder = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const text = (label || '').toString().trim().toLowerCase();
      if (!text) return 99;
      const short = text.slice(0, 3);
      const idx = monthOrder.indexOf(short);
      return idx === -1 ? 99 : idx;
  };

  const buildMonthlyProcurementSummary = (rows, filters, viewMode = 'Month') => {
      const summaryMap = new Map();

      rows.forEach((row) => {
          if (Array.isArray(filters.category) && filters.category.length > 0 && !filters.category.includes(row.category)) return;
          if (Array.isArray(filters.polymer) && filters.polymer.length > 0 && !filters.polymer.includes(row.polymer)) return;
          if (Array.isArray(filters.quarter) && filters.quarter.length > 0 && !filters.quarter.includes(row.quarter)) return;
          if (Array.isArray(filters.half) && filters.half.length > 0 && !filters.half.includes(row.half)) return;

          let key;
          let label;
          let sortIndex;

          if (viewMode === 'Quarter') {
              key = row.quarter;
              label = row.quarter;
              // Q1, Q2, Q3, Q4. 'Unknown' -> 99
              const qMatch = (key || '').match(/\d+/);
              sortIndex = qMatch ? parseInt(qMatch[0]) : 99;
          } else if (viewMode === 'Half-Year') {
              key = row.half;
              label = row.half;
              // H1, H2. 'Unknown' -> 99
              sortIndex = key === 'H1' ? 1 : (key === 'H2' ? 2 : 99);
          } else {
              // Month
              key = row.monthLabel;
              label = row.monthLabel;
              sortIndex = row.monthIndex;
          }

          const current = summaryMap.get(key) || {
              month: label,
              monthIndex: sortIndex,
              monthlyPurchaseMt: 0,
              recycledQty: 0,
          };
          current.monthlyPurchaseMt += row.monthlyPurchaseMt || 0;
          current.recycledQty += row.recycledQty || 0;
          summaryMap.set(key, current);
      });

      const summaryArray = Array.from(summaryMap.values());
      summaryArray.sort((a, b) => {
          if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
          return a.month.localeCompare(b.month);
      });

      return summaryArray;
  };

  const buildPolymerProcurementSummary = (rows, filters) => {
      const summaryMap = new Map();

      rows.forEach((row) => {
          if (Array.isArray(filters.category) && filters.category.length > 0 && !filters.category.includes(row.category)) return;
          if (Array.isArray(filters.quarter) && filters.quarter.length > 0 && !filters.quarter.includes(row.quarter)) return;
          if (Array.isArray(filters.half) && filters.half.length > 0 && !filters.half.includes(row.half)) return;
          if (Array.isArray(filters.polymer) && filters.polymer.length > 0 && !filters.polymer.includes(row.polymer)) return;

          const key = row.polymer || 'Unknown';
          const current = summaryMap.get(key) || {
              polymer: key,
              monthlyPurchaseMt: 0,
              recycledQty: 0,
          };
          current.monthlyPurchaseMt += row.monthlyPurchaseMt || 0;
          current.recycledQty += row.recycledQty || 0;
          summaryMap.set(key, current);
      });

      const summaryArray = Array.from(summaryMap.values());
      summaryArray.sort((a, b) => a.polymer.localeCompare(b.polymer));
      return summaryArray;
  };

  const buildCategoryProcurementSummary = (rows, filters) => {
      const summaryMap = new Map();

      rows.forEach((row) => {
          if (Array.isArray(filters.polymer) && filters.polymer.length > 0 && !filters.polymer.includes(row.polymer)) return;
          if (Array.isArray(filters.quarter) && filters.quarter.length > 0 && !filters.quarter.includes(row.quarter)) return;
          if (Array.isArray(filters.half) && filters.half.length > 0 && !filters.half.includes(row.half)) return;
          if (Array.isArray(filters.category) && filters.category.length > 0 && !filters.category.includes(row.category)) return;

          const key = row.category || 'Unknown';
          const current = summaryMap.get(key) || {
              category: key,
              monthlyPurchaseMt: 0,
              recycledQty: 0,
          };
          current.monthlyPurchaseMt += row.monthlyPurchaseMt || 0;
          current.recycledQty += row.recycledQty || 0;
          summaryMap.set(key, current);
      });

      const summaryArray = Array.from(summaryMap.values());
      summaryArray.sort((a, b) => a.category.localeCompare(b.category));
      return summaryArray;
  };

  const fetchMonthlyProcurementSummary = async () => {
      if (!clientId || !fullClientData?.productionFacility) {
          setMonthlyProcurementSummary([]);
          setMonthlyProcurementRaw([]);
          return;
      }

      try {
          setMonthlyProcurementLoading(true);
          setMonthlyProcurementError('');

          const consentConfigs = [
              { type: 'CTO', list: fullClientData.productionFacility.ctoDetailsList || [] }
          ];

          const allRows = [];

          for (const config of consentConfigs) {
              const consentType = config.type;
              const consents = config.list || [];

              for (const facility of consents) {
                  if (!facility || !facility._id) continue;
                  const itemId = facility._id;
                  const res = await api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), {
                      params: { type: consentType, itemId }
                  });
                  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

                  rows.forEach((row) => {
                      const rawMonth = (row.monthName || '').toString().trim();
                      const monthLabel = rawMonth || 'Unknown';
                      const monthIndex = getMonthIndexForLabel(monthLabel);
                      const purchase = Number(row.monthlyPurchaseMt) || 0;
                      const recycled = Number(row.recycledQty) || 0;
                      const category = (row.category || '').toString().trim() || 'Unknown';
                      const polymer = (row.componentPolymer || row.polymerType || '').toString().trim() || 'Unknown';
                      const quarter = (row.quarter || '').toString().trim() || 'Unknown';
                      const yearlyQuarter = (row.yearlyQuarter || '').toString().trim() || 'Unknown';
                      let half = 'Unknown';
                      if (monthIndex !== 99) {
                          half = monthIndex <= 5 ? 'H1' : 'H2';
                      }

                      allRows.push({
                          monthLabel,
                          monthIndex,
                          monthlyPurchaseMt: purchase,
                          recycledQty: recycled,
                          category,
                          polymer,
                          quarter,
                          yearlyQuarter,
                          half,
                      });
                  });
              }
          }

          setMonthlyProcurementRaw(allRows);
        const summaryArray = buildMonthlyProcurementSummary(allRows, monthlyProcurementFilters, monthlyProcurementViewMode);
        setMonthlyProcurementSummary(summaryArray);
    } catch (err) {
          console.error(err);
          setMonthlyProcurementSummary([]);
          setMonthlyProcurementRaw([]);
          setMonthlyProcurementError('Unable to load monthly procurement data');
      } finally {
          setMonthlyProcurementLoading(false);
      }
  };

  useEffect(() => {
        if (!monthlyProcurementRaw.length) {
            setMonthlyProcurementSummary([]);
            return;
        }
        const summaryArray = buildMonthlyProcurementSummary(monthlyProcurementRaw, monthlyProcurementFilters, monthlyProcurementViewMode);
        setMonthlyProcurementSummary(summaryArray);
    }, [monthlyProcurementRaw, monthlyProcurementFilters, monthlyProcurementViewMode]);

  const refreshPostValidationForConsent = async (consentType, itemId) => {
      if (!clientId || !fullClientData?.productionFacility) return;
      if (consentType === 'CTE') return; // CTE excluded as per requirement

      const allFacilities = [
          ...(fullClientData.productionFacility.cteDetailsList || []),
          ...(fullClientData.productionFacility.ctoDetailsList || [])
      ];

      const facility = allFacilities.find((f) => String(f._id) === String(itemId));

      if (!facility) {
          setPostValidationData((prev) =>
              prev.filter(
                  (row) =>
                      !(row.consentType === consentType && String(row.itemId) === String(itemId))
              )
          );
          return;
      }

      const rows = await buildPostValidationRowsForFacility(consentType, facility);

      setPostValidationData((prev) => {
          const filtered = prev.filter(
              (row) =>
                  !(row.consentType === consentType && String(row.itemId) === String(itemId))
          );
          const merged = [...filtered, ...rows];
          return dedupePostValidationRows(merged);
      });
  };

  useEffect(() => {
      fetchPostValidationData();
      fetchMonthlyProcurementSummary();
  }, [clientId, fullClientData]);

  useEffect(() => {
      if (!clientId) return;

      const baseUrl = API_URL || window.location.origin;
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${normalizedBase}${API_ENDPOINTS.CLIENT.MARKING_LABELLING_EVENTS(clientId)}`;

      let eventSource;

      try {
          eventSource = new EventSource(url, { withCredentials: true });
      } catch (err) {
          console.error('Failed to connect to Marking & Labelling events:', err);
          return;
      }

      const handleUpdate = async (event) => {
          try {
              const payload = JSON.parse(event.data || '{}');
              if (!payload) return;
              if (payload.clientId && String(payload.clientId) !== String(clientId)) return;

              const { type, itemId, operation } = payload;
              if (!type || !itemId) return;

              if (operation === 'delete') {
                  setPostValidationData((prev) =>
                      prev.filter(
                          (row) =>
                              !(
                                  row.consentType === type &&
                                  String(row.itemId) === String(itemId)
                              )
                      )
                  );
                  return;
              }

              await refreshPostValidationForConsent(type, itemId);
          } catch (err) {
              console.error('Failed to handle Marking & Labelling event:', err);
          }
      };

      eventSource.addEventListener('markingLabellingUpdate', handleUpdate);

      eventSource.onerror = () => {
          eventSource.close();
      };

      return () => {
          if (eventSource) {
              eventSource.removeEventListener('markingLabellingUpdate', handleUpdate);
              eventSource.close();
          }
      };
  }, [clientId, fullClientData]);



  const handlePostValidationChange = (key, field, value) => {
      setPostValidationData((prev) =>
          prev.map((row) =>
              row.key === key ? { ...row, [field]: value } : row
          )
      );
  };

  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [currentRemarkRecordKey, setCurrentRemarkRecordKey] = useState(null);
  const [tempRemarks, setTempRemarks] = useState([]);
  const [newRemarkInput, setNewRemarkInput] = useState('');
  
  // Edit remark state
  const [editingRemarkIndex, setEditingRemarkIndex] = useState(null);
  const [editingRemarkValue, setEditingRemarkValue] = useState('');

  const [polymerModalOpen, setPolymerModalOpen] = useState(false);
  const [currentPolymerRecordKey, setCurrentPolymerRecordKey] = useState(null);
  const [tempPolymers, setTempPolymers] = useState([]);
  const [newPolymerInput, setNewPolymerInput] = useState('');

  const handleOpenRemarksModal = (record) => {
      setTempRemarks(Array.isArray(record.remarks) ? record.remarks : (record.remarks ? [record.remarks] : []));
      setCurrentRemarkRecordKey(record.key);
      setNewRemarkInput('');
      setEditingRemarkIndex(null);
      setEditingRemarkValue('');
      setRemarksModalOpen(true);
  };

  const handleOpenPolymerModal = (record) => {
      setTempPolymers(Array.isArray(record.polymerUsed) ? record.polymerUsed : (record.polymerUsed ? record.polymerUsed.split(',').map(s=>s.trim()) : []));
      setCurrentPolymerRecordKey(record.key);
      setNewPolymerInput('');
      setPolymerModalOpen(true);
  };

  const handleAddRemarkPoint = () => {
      if (!newRemarkInput.trim()) return;
      setTempRemarks([...tempRemarks, newRemarkInput.trim()]);
      setNewRemarkInput('');
  };

  const handleAddPolymerPoint = () => {
      if (!newPolymerInput.trim()) return;
      setTempPolymers([...tempPolymers, newPolymerInput.trim()]);
      setNewPolymerInput('');
  };

  const handleRemoveRemarkPoint = (index) => {
      const newRemarks = [...tempRemarks];
      newRemarks.splice(index, 1);
      setTempRemarks(newRemarks);
  };

  const handleStartEditRemark = (index, value) => {
      setEditingRemarkIndex(index);
      setEditingRemarkValue(value);
  };

  const handleSaveEditedRemark = () => {
      if (editingRemarkIndex !== null && editingRemarkValue.trim()) {
          const newRemarks = [...tempRemarks];
          newRemarks[editingRemarkIndex] = editingRemarkValue.trim();
          setTempRemarks(newRemarks);
          setEditingRemarkIndex(null);
          setEditingRemarkValue('');
      }
  };

  const handleCancelEditRemark = () => {
      setEditingRemarkIndex(null);
      setEditingRemarkValue('');
  };

  const handleRemovePolymerPoint = (index) => {
      const newPolymers = [...tempPolymers];
      newPolymers.splice(index, 1);
      setTempPolymers(newPolymers);
  };

  const handleSaveRemarksFromModal = () => {
      if (currentRemarkRecordKey) {
          handleSkuComplianceChange(currentRemarkRecordKey, 'remarks', tempRemarks);
      }
      setRemarksModalOpen(false);
  };

  const handleSavePolymersFromModal = () => {
      if (currentPolymerRecordKey) {
          handleSkuComplianceChange(currentPolymerRecordKey, 'polymerUsed', tempPolymers);
      }
      setPolymerModalOpen(false);
  };



  const appendRemarkPoint = (key, field) => {
      setPostValidationData((prev) =>
          prev.map((row) => {
              if (row.key !== key) return row;
              const curr = (row[field] || '').toString();
              const trimmed = curr.replace(/\s*$/, '');
              const next = trimmed ? `${trimmed}\n- ` : '- ';
              return { ...row, [field]: next };
          })
      );
  };

  const parseRemarksToItems = (value) => {
      if (!value) return [];
      const raw = value.toString();
      const lines = raw.split(/\r?\n/);
      const items = [];
      lines.forEach((line) => {
          const parts = line.split(/\s*-\s+/);
          parts.forEach((part) => {
              const trimmed = part.trim();
              if (trimmed.length) {
                  items.push(trimmed);
              }
          });
      });
      return items;
  };

  const openRemarkModal = (record, field) => {
      const currentValue = (record[field] || '').toString();
      const items = parseRemarksToItems(currentValue);
      const text = items.join('\n');
      setRemarkModal({
          visible: true,
          recordKey: record.key,
          field,
          text,
      });
  };

  const handleRemarkModalChange = (e) => {
      const { value } = e.target;
      setRemarkModal((prev) => ({
          ...prev,
          text: value,
      }));
  };

  const handleRemarkModalCancel = () => {
      setRemarkModal({
          visible: false,
          recordKey: null,
          field: '',
          text: '',
      });
  };

  const handleRemarkModalSave = () => {
      if (!remarkModal.recordKey || !remarkModal.field) {
          handleRemarkModalCancel();
          return;
      }
      const lines = remarkModal.text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length);
      
      if (remarkModal.isSku) {
          handleSkuComplianceChange(remarkModal.recordKey, remarkModal.field, lines);
      } else {
          const value = lines.length ? lines.map((line) => line.startsWith('-') ? line : `- ${line}`).join('\n') : '';
          handlePostValidationChange(remarkModal.recordKey, remarkModal.field, value);
      }
      handleRemarkModalCancel();
  };

  const handleSavePostValidation = async (record) => {
      try {
          const payload = {
                    type: record.consentType,
                    itemId: record.itemId,
                    rowIndex: record.rowIndex,
                    row: {
                        ...record, // Send all fields since we made them editable
                        auditorRemarks: record.auditorRemarks,
                        clientRemarks: record.clientRemarks,
                        complianceStatus: record.complianceStatus
                    }
                };
          await api.put(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), payload);
          messageApi.success('Data saved successfully');
          setPostValidationData(prev => prev.map(item => 
              item.key === record.key ? { ...item, _original: { ...item } } : item
          ));
      } catch (err) {
          console.error(err);
          messageApi.error('Failed to save data');
      }
  };

  const handleAddPostValidationRow = () => {
      setPostValidationData(prev => {
          const newRow = {
              key: `new-${Date.now()}`,
              packagingType: '',
              skuCode: '',
              skuDescription: '',
              skuUom: '',
              productImage: '',
              componentImage: '',
              componentCode: '',
              systemCode: '',
              componentDescription: '',
              supplierName: '',
              supplierType: '',
              supplierCategory: '',
              generateSupplierCode: 'No',
              supplierCode: '',
              complianceStatus: 'Pending',
              consentType: '',
              itemId: '',
              _original: {} 
          };

          // Inherit facility info from the last row if available to ensure it saves correctly
          if (prev.length > 0) {
              const last = prev[prev.length - 1];
              newRow.consentType = last.consentType;
              newRow.itemId = last.itemId;
          }
          
          newRow._original = { ...newRow };
          const newRows = [...prev, newRow];
          
          // Auto-navigate to last page
          const newTotalPages = Math.ceil(newRows.length / postValidationPagination.pageSize);
          if (newTotalPages > postValidationPagination.current) {
               setPostValidationPagination(p => ({ ...p, current: newTotalPages }));
          }
          
          return newRows;
      });
  };

  const handleDeleteAllPostValidation = () => {
      setPostValidationData([]);
      setPostValidationPagination(prev => ({ ...prev, current: 1 }));
      messageApi.success('All rows cleared locally. Click "Save All" to persist changes.');
  };

  const handleBulkSavePostValidation = async () => {
      try {
          // Group by type and itemId
          const groups = {};
          postValidationData.forEach(row => {
              const key = `${row.consentType}|${row.itemId}`;
              if (!groups[key]) {
                  groups[key] = {
                      type: row.consentType,
                      itemId: row.itemId,
                      rows: []
                  };
              }
              groups[key].rows.push(row);
          });

          const promises = Object.values(groups).map(group => {
              const payload = {
                  type: group.type,
                  itemId: group.itemId,
                  rows: group.rows // Send all rows for this facility
              };
              return api.put(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), payload);
          });

          await Promise.all(promises);
          messageApi.success('All data saved successfully');
          
          // Update _original for all rows to reset dirty state if we track it
          setPostValidationData(prev => prev.map(item => ({ ...item, _original: { ...item } })));
          
      } catch (err) {
          console.error(err);
          messageApi.error('Failed to save all data');
      }
  };

  const totalPostValidationPages = Math.max(
      1,
      Math.ceil((postValidationData.length || 0) / postValidationPagination.pageSize) || 1
  );

  const paginatedPostValidationData = useMemo(() => {
      const { current, pageSize } = postValidationPagination;
      const start = (current - 1) * pageSize;
      return postValidationData.slice(start, start + pageSize);
  }, [postValidationData, postValidationPagination]);

  const handlePostValidationPageChange = (page) => {
      setPostValidationPagination((prev) => ({
          ...prev,
          current: page,
      }));
  };

  const handlePostValidationPageSizeChange = (size) => {
      setPostValidationPagination({
          current: 1,
          pageSize: size,
      });
  };

  const handlePostValidationGotoSubmit = () => {
      const pageNum = parseInt(postValidationGotoPage, 10);
      if (!pageNum || pageNum < 1 || pageNum > totalPostValidationPages) return;
      setPostValidationPagination((prev) => ({
          ...prev,
          current: pageNum,
      }));
  };


  const postValidationColumns = useMemo(() => getPostValidationColumns({
      postValidationPagination,
      API_URL,
      parseRemarksToItems,
      openRemarkModal,
      handlePostValidationChange,
      appendRemarkPoint,
      handleSavePostValidation
  }), [postValidationPagination, API_URL, openRemarkModal, handlePostValidationChange, appendRemarkPoint, handleSavePostValidation]);



  const {
      handleSkuImageUpload,
      handleSkuImageDelete,
      skuImageLoading,
      saveSkuRow,
      cancelSkuRow,
      removeSkuRow,
      addSkuRow,
      editingSkuKey,
      handleSkuComplianceChange,
      handleSkuStatusChange,
      skuPagination,
      setSkuPagination,
      handleSkuPageChange,
      handleSkuPageSizeChange,
      fetchSkuComplianceData,
      skuComplianceData,
      setSkuComplianceData
  } = useSkuCompliance(clientId, postValidationActiveTab, activeTab);

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

  const handleSkuRemark = (key, field) => {
       const record = skuComplianceData.find(item => item.key === key);
       let text = '';
       if (Array.isArray(record?.remarks)) {
           text = record.remarks.join('\n');
       } else {
           text = record?.remarks || '';
       }
       
       setRemarkModal({
          visible: true,
          recordKey: key,
          field: field,
          text: text,
          isSku: true
      });
  };

  const handleMarkingLabellingReport = () => generateMarkingLabellingReport({
      postValidationData,
      fullClientData,
      authUser,
      API_URL,
      toast,
      setLoading
  });

  const handleSkuComplianceReport = () => generateSkuComplianceReport({
      skuComplianceData,
      fullClientData,
      authUser,
      API_URL,
      toast,
      setLoading
  });

  useEffect(() => {
      if (postValidationActiveTab === 'sku' && clientId && fetchSkuComplianceData) {
          fetchSkuComplianceData();
      }
  }, [postValidationActiveTab, clientId, fetchSkuComplianceData]);

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
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-blue-400 transition-colors h-9"
                placeholder="SKU Code"
            />
        ) 
    },
        { 
            title: 'SKU DESCRIPTION', 
            dataIndex: 'skuDescription', 
            key: 'skuDescription', 
            width: 220, 
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={(e) => handleSkuComplianceChange(record.key, 'skuDescription', e.target.value)} 
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-blue-400 transition-colors h-9"
                    placeholder="Description"
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
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-blue-400 transition-colors h-9"
                    placeholder="UOM"
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
                      try {
                          const url = src.startsWith('http://') || src.startsWith('https://')
                              ? src
                              : new URL(src, API_URL).toString();
                          window.open(url, '_blank', 'noopener,noreferrer');
                      } catch {
                          window.open(src, '_blank', 'noopener,noreferrer');
                      }
                  };
     
                  let imageUrl;
                  try {
                     imageUrl = src.startsWith('http://') || src.startsWith('https://')
                              ? src
                              : new URL(src, API_URL).toString();
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
                    options={[{label: 'Select', value: ''}, {label: 'Yes', value: 'Yes'}, {label: 'No', value: 'No'}]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
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
                    options={[{label: 'Select', value: ''}, {label: 'Yes', value: 'Yes'}, {label: 'No', value: 'No'}]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
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
                    options={[{label: 'Select', value: ''}, {label: 'Yes', value: 'Yes'}, {label: 'No', value: 'No'}]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
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
                    options={[{label: 'Select', value: ''}, {label: 'Yes', value: 'Yes'}, {label: 'No', value: 'No'}]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
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

                if (polymers.length === 0) return <span className="text-gray-400 text-sm">â€”</span>;

                // Standard Polymer Codes Mapping
                const polymerCodes = {
                    'PET': '1', 'PETE': '1', 'Polyethylene Terephthalate': '1',
                    'HDPE': '2', 'High Density Polyethylene': '2',
                    'PVC': '3', 'V': '3', 'Polyvinyl Chloride': '3',
                    'LDPE': '4', 'Low Density Polyethylene': '4',
                    'LLDPE': '4',
                    'PP': '5', 'Polypropylene': '5',
                    'BOPP': '5',
                    'PS': '6', 'Polystyrene': '6',
                    'Other': '7', 'Others': '7', 'Plastic': '7'
                };
                
                return (
                    <div className="flex flex-col gap-0.5 items-start">
                        {polymers.map((poly, idx) => {
                            // Extract just the polymer name part for matching
                            const polyName = poly.replace(/\s*\(\d+\)$/, '').trim();
                            const hasCode = /\(\d+\)$/.test(poly);
                            
                            // Try to find a code if one isn't present
                            let displayPoly = poly;
                            if (!hasCode) {
                                // Try exact match
                                let code = polymerCodes[polyName];
                                
                                // Try case-insensitive match
                                if (!code) {
                                    const lowerPoly = polyName.toLowerCase();
                                    const match = Object.keys(polymerCodes).find(k => k.toLowerCase() === lowerPoly);
                                    if (match) code = polymerCodes[match];
                                }
                                
                                if (code) displayPoly = `${polyName} (${code})`;
                            }
                            
                            return (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    {displayPoly}
                                </span>
                            );
                        })}
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
                    options={[
                        {label: 'Select', value: ''},
                        {label: 'Disclosed', value: 'Disclosed'}, 
                        {label: 'Not Disclosed', value: 'Not Disclosed'}
                    ]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
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
                    options={[{label: 'Select', value: ''}, {label: 'Yes', value: 'Yes'}, {label: 'No', value: 'No'}]} 
                    className="w-full h-9"
                    variant="borderless"
                    style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', height: '36px', display: 'flex', alignItems: 'center' }}
                    styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
                />
            ) 
        },
        { 
            title: 'AUDITOR REMARKS', 
            dataIndex: 'remarks', 
            key: 'remarks', 
            width: 250, 
            render: (_, record) => {
                const remarks = Array.isArray(record.remarks) ? record.remarks : (record.remarks ? [record.remarks] : []);
                return (
                    <div className="flex flex-col gap-2">
                        {remarks.length > 0 && (
                            <div className="flex flex-col gap-1 mb-1">
                                {remarks.map((r, i) => (
                                    <div key={i} className="flex items-start gap-1.5 bg-gray-50 p-1.5 rounded border border-gray-100">
                                        <span className="text-[10px] text-gray-400 mt-0.5">•</span>
                                        <span className="text-xs text-gray-700 leading-snug break-words">{r}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button 
                            size="small" 
                            type="dashed" 
                            onClick={() => handleSkuRemark(record.key, 'remarks')}
                            className="w-full flex items-center justify-center gap-1 text-xs text-gray-600 border-gray-300 hover:text-primary-600 hover:border-primary-400 h-7"
                        >
                            <FaPencilAlt className="text-[10px]" />
                            {remarks.length > 0 ? 'Edit Remarks' : 'Add Remarks'}
                        </Button>
                    </div>
                );
            }
        },
        { 
            title: 'COMPLIANCE STATUS', 
            dataIndex: 'complianceStatus', 
            key: 'complianceStatus', 
            width: 200, 
            render: (text, record) => {
                let bg = '#ffffff';
                let border = '#d1d5db';
                let textCol = '#374151';

                if (text === 'Partially Compliant') {
                    bg = '#fef3c7'; // amber-100
                    border = '#f59e0b'; // amber-500
                    textCol = '#92400e'; // amber-800
                } else if (text === 'Compliant') {
                    bg = '#dcfce7'; // green-100
                    border = '#22c55e'; // green-500
                    textCol = '#166534'; // green-800
                } else if (text === 'Non-Compliant') {
                    bg = '#fee2e2'; // red-100
                    border = '#ef4444'; // red-500
                    textCol = '#991b1b'; // red-800
                }
            
                return (
                    <ConfigProvider
                        theme={{
                            components: {
                                Select: {
                                    selectorBg: bg,
                                    colorBorder: border,
                                    colorPrimary: border,
                                    optionSelectedBg: '#f3f4f6',
                                }
                            }
                        }}
                    >
                        <Select 
                            value={text} 
                            onChange={(val) => handleSkuComplianceChange(record.key, 'complianceStatus', val)} 
                            options={[
                                {label: 'Select', value: ''},
                                {label: 'Compliant', value: 'Compliant'}, 
                                {label: 'Non-Compliant', value: 'Non-Compliant'}, 
                                {label: 'Partially Compliant', value: 'Partially Compliant'}
                            ]} 
                            className="w-full h-9 font-medium"
                            variant="borderless"
                            style={{ 
                                border: `1px solid ${border}`, 
                                borderRadius: '0.375rem', 
                                height: '36px', 
                                backgroundColor: bg, 
                                color: textCol,
                                display: 'flex', 
                                alignItems: 'center' 
                            }}
                            styles={{ popup: { root: { borderRadius: '0.5rem', padding: '4px' } } }}
                        />
                    </ConfigProvider>
                );
            } 
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

    const loadSkuComplianceData = async () => {
        if (!clientId || !fullClientData?.productionFacility) {
            return;
        }

        try {
            let savedDataMap = new Map();
            try {
                const savedRes = await api.get(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId));
                if (savedRes.data?.success && Array.isArray(savedRes.data.data)) {
                    savedRes.data.data.forEach(item => {
                        savedDataMap.set(item.skuCode, item);
                    });
                }
            } catch (e) {
                console.log("No saved SKU data found or error fetching it", e);
            }

            const skuMap = new Map();
            const consentConfigs = [
                { type: 'CTO', list: fullClientData.productionFacility.ctoDetailsList || [] }
            ];

            for (const config of consentConfigs) {
                const consentType = config.type;
                const consents = config.list;

                for (const facility of consents) {
                    const itemId = facility._id;
                    if (!itemId) continue;

                    const [prodRes, compRes] = await Promise.all([
                        api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), { params: { type: consentType, itemId } }),
                        api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), { params: { type: consentType, itemId } })
                    ]);

                    const productRows = Array.isArray(prodRes.data?.data) ? prodRes.data.data : (facility.productComplianceRows || []);
                    const componentDetails = Array.isArray(compRes.data?.data) ? compRes.data.data : (facility.productComponentDetails || []);

                    productRows.forEach(row => {
                        const skuCode = row.skuCode;
                        if (!skuCode) return;

                        if (!skuMap.has(skuCode)) {
                             const saved = savedDataMap.get(skuCode);
                             const savedImages = saved?.markingImage ? saved.markingImage.map((url, idx) => ({
                                 uid: `-${idx}`,
                                 name: `Image ${idx + 1}`,
                                 status: 'done',
                                 url: url
                             })) : [];

                            skuMap.set(skuCode, {
                                key: saved ? saved._id : (Date.now() + Math.random()),
                                skuCode: skuCode,
                                skuDescription: saved?.skuDescription || row.skuDescription || '',
                                skuUm: saved?.skuUm || row.skuUom || '',
                                productImage: row.productImage || null,
                                brandOwner: saved?.brandOwner || '',
                                eprCertBrandOwner: saved?.eprCertBrandOwner || '',
                                eprCertProducer: saved?.eprCertProducer || '',
                                thicknessMentioned: saved?.thicknessMentioned || '',
                                polymerUsed: Array.isArray(saved?.polymerUsed) ? saved.polymerUsed : (saved?.polymerUsed ? saved.polymerUsed.split(',').map(s=>s.trim()) : []),
                                polymerMentioned: saved?.polymerMentioned || '',
                                recycledPercent: saved?.recycledPercent || '',
                                complianceStatus: saved?.complianceStatus || '',
                                markingImage: savedImages,
                                compostableRegNo: saved?.compostableRegNo || '',
                                remarks: Array.isArray(saved?.remarks) ? saved.remarks : (saved?.remarks ? [saved.remarks] : []),
                                components: []
                            });
                        }

                        const skuEntry = skuMap.get(skuCode);
                        const compCode = row.componentCode;
                        const comp = componentDetails.find(c => c.componentCode === compCode);

                        if (comp) {
                            skuEntry.components.push({
                                polymer: comp.componentPolymer,
                                code: comp.polymerCode || comp.materialCode || ''
                            });
                        }
                    });
                }
            }

            const newSkuData = Array.from(skuMap.values()).map(item => {
                const uniquePolymers = [...new Set(item.components.map(c => {
                    const parts = [];
                    if (c.polymer) parts.push(c.polymer);
                    if (c.code) parts.push(`(${c.code})`);
                    return parts.join(' ');
                }))].filter(Boolean);

                const saved = savedDataMap.get(item.skuCode);

                return {
                    ...item,
                    polymerUsed: Array.isArray(saved?.polymerUsed) ? saved.polymerUsed : (saved?.polymerUsed ? saved.polymerUsed.split(',').map(s=>s.trim()) : uniquePolymers),
                    components: undefined
                };
            });

            if (newSkuData.length > 0) {
                setSkuComplianceData(newSkuData);
            }
        } catch (err) {
            console.error("Error fetching SKU data:", err);
            messageApi.error("Failed to fetch SKU compliance data");
        }
    };



  const markingColumns = [
      { title: 'System Code', dataIndex: 'systemCode', key: 'systemCode', width: 140 },
      { title: 'SKU Code', dataIndex: 'skuCode', key: 'skuCode', width: 140 },
      { title: 'SKU Description', dataIndex: 'skuDescription', key: 'skuDescription', width: 200 },
      { title: 'Component Code', dataIndex: 'componentCode', key: 'componentCode', width: 150 },
      { title: 'Component Description', dataIndex: 'componentDescription', key: 'componentDescription', width: 220 },
      { title: 'Supplier Name', dataIndex: 'supplierName', key: 'supplierName', width: 200 },
      { title: 'Compliance Status', dataIndex: 'complianceStatus', key: 'complianceStatus', width: 180 }
  ];

  const clientSteps = useMemo(() => ([
      { id: 'Client Basic Info', label: 'Client Basic Info' },
      { id: 'Company Address', label: 'Company Address' },
      { id: 'Company Documents', label: 'Company Documents' },
      { id: 'CTE & CTO/CCA', label: 'CTE & CTO/CCA' }
  ]), []);

  return (
    <div className="-mt-2 md:-mt-4 px-2 md:px-4 pb-2 md:pb-4 bg-gray-50 min-h-screen">
      {contextHolder}
      <Modal
          title="SKU Compliance Remarks"
          open={remarksModalOpen}
          onCancel={() => setRemarksModalOpen(false)}
          onOk={handleSaveRemarksFromModal}
          width={600}
      >
          <div className="space-y-4">
              <div className="flex gap-2">
                  <Input 
                      placeholder="Enter a new remark point..." 
                      value={newRemarkInput} 
                      onChange={(e) => setNewRemarkInput(e.target.value)}
                      onPressEnter={handleAddRemarkPoint}
                  />
                  <Button type="primary" onClick={handleAddRemarkPoint} icon={<PlusOutlined />}>Add</Button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
                  {tempRemarks.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No remarks added yet.</p>
                  ) : (
                      <ul className="space-y-2">
                          {tempRemarks.map((remark, idx) => (
                              <li key={idx} className="flex justify-between items-start gap-2 bg-white p-2 rounded shadow-sm border">
                                  {editingRemarkIndex === idx ? (
                                      <div className="flex-1 flex gap-2 items-center">
                                          <Input 
                                              value={editingRemarkValue}
                                              onChange={(e) => setEditingRemarkValue(e.target.value)}
                                              onPressEnter={handleSaveEditedRemark}
                                              autoFocus
                                              size="small"
                                          />
                                          <Button 
                                              type="text" 
                                              size="small" 
                                              className="text-green-600 hover:text-green-700 flex items-center justify-center"
                                              icon={<CheckOutlined />} 
                                              onClick={handleSaveEditedRemark} 
                                          />
                                          <Button 
                                              type="text" 
                                              danger
                                              size="small" 
                                              className="flex items-center justify-center"
                                              icon={<CloseOutlined />} 
                                              onClick={handleCancelEditRemark} 
                                          />
                                      </div>
                                  ) : (
                                      <>
                                          <span className="text-sm flex-1 break-words">â€¢ {remark}</span>
                                          <div className="flex gap-1">
                                              <Button 
                                                  type="text" 
                                                  size="small" 
                                                  className="text-blue-600 hover:text-blue-700 flex items-center justify-center"
                                                  icon={<EditOutlined />} 
                                                  onClick={() => handleStartEditRemark(idx, remark)} 
                                              />
                                              <Button 
                                                  type="text" 
                                                  danger 
                                                  size="small" 
                                                  className="flex items-center justify-center"
                                                  icon={<DeleteOutlined />} 
                                                  onClick={() => handleRemoveRemarkPoint(idx)} 
                                              />
                                          </div>
                                      </>
                                  )}
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>
      </Modal>
      <div className="w-full mx-auto">
        <div className="sticky top-0 z-30 bg-white pt-0 pb-3 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <button onClick={() => navigate('/dashboard/clients')} className="group flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-primary-600 hover:text-white">
                    <FaArrowLeft />
                  </button>
                  {clientId && formData.clientName && (
                      <div className="hidden md:block text-left px-1 border-l border-gray-200 pl-4 ml-2">
                          <div>
                              <h2 className="text-xl font-bold text-gray-800 tracking-tight">{formData.unitName || formData.clientName}</h2>
                              <div className="flex items-center justify-start gap-3 mt-1">
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                                          {isPwp ? 'PWP Category' : 'PIBO CATEGORY'}
                                      </span>
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                          {isPwp ? (formData.pwpCategory || 'Not selected') : formData.entityType}
                                      </span>
                                      {formData.financialYear && (
                                          <span className="text-xs text-gray-500 font-semibold border-l border-gray-200 pl-2">
                                              FY {formData.financialYear}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {fullClientData?.assignedTo?.name && (
                  <div className="hidden md:flex items-center gap-4 border-l border-gray-200 pl-6">
                      <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Auditor</p>
                          <p className="text-sm font-bold text-gray-800 leading-tight">{fullClientData.assignedTo.name}</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                          <FaUserTie />
                      </div>
                  </div>
              )}
          </div>

          <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex divide-x divide-gray-200 overflow-x-auto">
                {(() => {
                    if (isAuditMode) {
                         return [
                            { id: 'Pre - Validation', label: 'Pre-Audit Check' },
                            { id: 'Audit', label: 'Onsite Audit' },
                            { id: 'Post -Audit Check', label: 'Post Audit Check' }
                          ];
                    }
    
                    // Default / Edit Mode
                    return [
                        { id: 'Client Data', label: 'Client Data' },
                    ];
                })().map((tab) => {
                    let isLocked = false;
                    if (tab.id === 'Pre - Validation') isLocked = !isPreValidationUnlocked;
                    if (tab.id === 'Audit') isLocked = !isPreValidationComplete;
                    if (tab.id === 'Post -Audit Check') isLocked = !isAuditComplete;
                    
                    let isTabComplete = false;
                    if (tab.id === 'Client Data') {
                        isTabComplete = isPreValidationUnlocked;
                    } else if (tab.id === 'Pre - Validation') {
                        isTabComplete = isPreValidationComplete;
                    } else if (tab.id === 'Audit') {
                        isTabComplete = isAuditComplete;
                    }

                    const isActive = activeTab === tab.id;
                    if (isActive) isLocked = false;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !isLocked && setActiveTab(tab.id)}
                            disabled={isLocked}
                            className={`
                                flex-1 py-4 text-sm font-medium transition-colors relative flex items-center justify-center gap-2
                                ${isActive 
                                    ? 'text-primary-600 bg-primary-50 font-semibold' 
                                    : isTabComplete
                                        ? 'text-emerald-600 bg-emerald-50'
                                        : isLocked 
                                            ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }
                            `}
                        >
                            {isTabComplete && <FaCheckCircle className="text-emerald-500" />}
                            {tab.label}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600" />
                            )}
                        </button>
                    );
                })}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-6">

        {activeTab === 'Client Data' ? (
            <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="border-b border-gray-200 px-6 py-4 bg-white">
                    <div className="flex w-full space-x-1 bg-gray-100 p-1 rounded-lg">
                        {clientSteps.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    const stepIndex = clientSteps.findIndex(s => s.id === step.id) + 1;
                                    if (stepIndex <= completedStep + 1) {
                                        setCurrentStep(stepIndex);
                                    }
                                }}
                                disabled={clientSteps.findIndex(s => s.id === step.id) + 1 > completedStep + 1}
                                className={`
                                    flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                                    ${currentStep === (clientSteps.findIndex(s => s.id === step.id) + 1)
                                        ? 'bg-white text-orange-600 shadow-sm'
                                        : (clientSteps.findIndex(s => s.id === step.id) + 1) > completedStep + 1
                                            ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }
                                `}
                            >
                                {step.label}
                                {(clientSteps.findIndex(s => s.id === step.id) + 1) <= completedStep && (
                                    <FaCheckCircle className="inline ml-2 text-green-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <form onSubmit={handleSubmit}>
                    {currentStep === 1 && (
                        <ClientBasicInfo
                            clientId={clientId}
                            isViewMode={isViewMode}
                            isPwp={isPwp}
                            isEwasteProducer={clientCategory === 'EWaste-Producer'}
                            clientCategory={clientCategory}
                            onSave={handleSaveStep1}
                        />
                    )}

                    {currentStep === 2 && (
                        <CompanyAddress 
                            clientCategory={clientCategory}
                            onSave={handleSaveStep2}
                        />
                    )}

                    {currentStep === 3 && (
                        <CompanyDocument
                            msmeRows={msmeRows}
                            addMsmeRow={addMsmeRow}
                            handleMsmeChange={handleMsmeChange}
                            toggleEditMsmeRow={toggleEditMsmeRow}
                            resetMsmeRow={resetMsmeRow}
                            deleteMsmeRow={deleteMsmeRow}
                            clientCategory={clientCategory}
                            onSave={handleSaveStep3}
                        />
                    )}

                    {currentStep === 4 && (
                        <CteCtoCca
                            cteDetailRows={cteDetailRows}
                            handleCteDetailChange={handleCteDetailChange}
                            toggleEditCteDetailRow={toggleEditCteDetailRow}
                            resetCteDetailRow={resetCteDetailRow}
                            deleteLocationRow={deleteLocationRow}
                            cteProductionRows={cteProductionRows}
                            handleCteProductionChange={handleCteProductionChange}
                            toggleEditCteProductionRow={toggleEditCteProductionRow}
                            addCteProductionRow={addCteProductionRow}
                            resetCteProductionRow={resetCteProductionRow}
                            deleteCteProductionRow={deleteCteProductionRow}
                            ctoDetailRows={ctoDetailRows}
                            handleCtoDetailChange={handleCtoDetailChange}
                            toggleEditCtoDetailRow={toggleEditCtoDetailRow}
                            resetCtoDetailRow={resetCtoDetailRow}
                            ctoProductRows={ctoProductRows}
                            addCtoProductRow={addCtoProductRow}
                            handleCtoProductChange={handleCtoProductChange}
                            toggleEditCtoProductRow={toggleEditCtoProductRow}
                            resetCtoProductRow={resetCtoProductRow}
                            deleteCtoProductRow={deleteCtoProductRow}
                            API_URL={API_URL}
                            isViewMode={isViewMode}
                            loading={loading}
                            handleSaveCgwaDetails={handleSaveCgwaDetails}
                            regulationsCoveredUnderCto={regulationsCoveredUnderCto}
                            setRegulationsCoveredUnderCto={setRegulationsCoveredUnderCto}
                            normalizeCtoRegulationValue={normalizeCtoRegulationValue}
                            handleSaveCtoRegulations={handleSaveCtoRegulations}
                            waterRegulationsRows={waterRegulationsRows}
                            addWaterRegulationRow={addWaterRegulationRow}
                            updateWaterRegulationRow={updateWaterRegulationRow}
                            deleteWaterRegulationRow={deleteWaterRegulationRow}
                            airRegulationsRows={airRegulationsRows}
                            addAirRegulationRow={addAirRegulationRow}
                            updateAirRegulationRow={updateAirRegulationRow}
                            deleteAirRegulationRow={deleteAirRegulationRow}
                            hazardousWasteRegulationsRows={hazardousWasteRegulationsRows}
                            addHazardousWasteRegulationRow={addHazardousWasteRegulationRow}
                            updateHazardousWasteRegulationRow={updateHazardousWasteRegulationRow}
                            deleteHazardousWasteRegulationRow={deleteHazardousWasteRegulationRow}
                            setWaterRegulationsRows={setWaterRegulationsRows}
                            setAirRegulationsRows={setAirRegulationsRows}
                            setHazardousWasteRegulationsRows={setHazardousWasteRegulationsRows}
                            clientCategory={clientCategory}
                        />
                    )}

                    {!isViewMode && (
                        <div className="flex justify-between mt-8 pt-4 border-t">
                            <button
                                type="button"
                                onClick={currentStep === 1 ? () => navigate('/dashboard/clients') : () => setCurrentStep(prev => prev - 1)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                {currentStep === 1 ? 'Cancel' : 'Previous'}
                            </button>
                            
                            {currentStep === 1 && (
                                <button
                                    type="button"
                                    onClick={handleSaveStep1}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md flex items-center"
                                >
                                    <FaSave className="mr-2" /> Save
                                </button>
                            )}
                            {currentStep === 2 && (
                                <button
                                    type="button"
                                    onClick={handleSaveStep2}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md flex items-center"
                                >
                                    <FaSave className="mr-2" /> Save & Next <FaArrowRight className="ml-2" />
                                </button>
                            )}
                            {currentStep === 3 && (
                                <button
                                    type="button"
                                    onClick={handleSaveStep3}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md flex items-center"
                                >
                                    <FaSave className="mr-2" /> Save & Next <FaArrowRight className="ml-2" />
                                </button>
                            )}
                            {currentStep === 4 && (
                                <button
                                    type="button"
                                    onClick={() => setIsSubmitModalOpen(true)}
                                    disabled={loading}
                                    className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md disabled:opacity-50 flex items-center"
                                >
                                    {loading ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
                                    Submit Client
                                </button>
                            )}
                        </div>
                    )}
                </form>
            </div>
            </>
        ) : activeTab === 'Pre - Validation' ? (
            <PreValidation 
                clientId={clientId}
                setIsPreValidationComplete={setIsPreValidationComplete}
                setActiveTab={setActiveTab}
                setCurrentStep={setCurrentStep}
            />
        ) : activeTab === 'Audit' ? (
            <Audit 
                clientId={clientId}
                setIsAuditComplete={setIsAuditComplete}
                setActiveTab={setActiveTab}
                wasteType={formData.wasteType}
            />
        ) : activeTab === 'Post -Audit Check' ? (
            <PostAuditCheck 
                clientId={clientId}
                postValidationActiveTab={postValidationActiveTab}
                setPostValidationActiveTab={setPostValidationActiveTab}
                handleMarkingLabellingReport={handleMarkingLabellingReport}
                loading={loading}
                postValidationData={postValidationData}
                paginatedPostValidationData={paginatedPostValidationData}
                postValidationColumns={postValidationColumns}
                postValidationPagination={postValidationPagination}
                handlePostValidationPageChange={handlePostValidationPageChange}
                totalPostValidationPages={totalPostValidationPages}
                handlePostValidationPageSizeChange={handlePostValidationPageSizeChange}
                postValidationGotoPage={postValidationGotoPage}
                setPostValidationGotoPage={setPostValidationGotoPage}
                handlePostValidationGotoSubmit={handlePostValidationGotoSubmit}
                skuSearchText={skuSearchText}
                setSkuSearchText={setSkuSearchText}
                skuStatusFilter={skuStatusFilter}
                setSkuStatusFilter={setSkuStatusFilter}
                handleSkuComplianceReport={handleSkuComplianceReport}
                skuComplianceColumns={skuComplianceColumns}
                skuTableDataSource={skuTableDataSource}
                skuPagination={skuPagination}
                handleSkuPageChange={handleSkuPageChange}
                skuComplianceData={skuComplianceData}
                setSkuComplianceData={setSkuComplianceData}
                handleSkuComplianceChange={handleSkuComplianceChange}
                handleSkuRemark={handleSkuRemark}
                handleSkuStatusChange={handleSkuStatusChange}
                handleSkuPageSizeChange={handleSkuPageSizeChange}
                regulationsCoveredUnderCto={regulationsCoveredUnderCto}
                waterRegulationsRows={waterRegulationsRows}
                airRegulationsRows={airRegulationsRows}
                hazardousWasteRegulationsRows={hazardousWasteRegulationsRows}
                monthlyProcurementSummary={monthlyProcurementSummary}
                monthlyProcurementLoading={monthlyProcurementLoading}
                monthlyProcurementError={monthlyProcurementError}
                monthlyProcurementFilters={monthlyProcurementFilters}
                setMonthlyProcurementFilters={setMonthlyProcurementFilters}
                monthlyProcurementViewMode={monthlyProcurementViewMode}
                setMonthlyProcurementViewMode={setMonthlyProcurementViewMode}
                monthlyProcurementFilterOpen={monthlyProcurementFilterOpen}
                setMonthlyProcurementFilterOpen={setMonthlyProcurementFilterOpen}
                monthlyProcurementDisplayMode={monthlyProcurementDisplayMode}
                setMonthlyProcurementDisplayMode={setMonthlyProcurementDisplayMode}
                costAnalysisSubTab={costAnalysisSubTab}
                setCostAnalysisSubTab={setCostAnalysisSubTab}
                urepSelectedYear={urepSelectedYear}
                setUrepSelectedYear={setUrepSelectedYear}
                urepTargets={urepTargets}
                setUrepTargets={setUrepTargets}
                urepYearOptions={urepYearOptions}
                buildCategoryProcurementSummary={buildCategoryProcurementSummary}
                buildPolymerProcurementSummary={buildPolymerProcurementSummary}
                monthlyProcurementRaw={monthlyProcurementRaw}
                urepData={urepData}
                handleSkuImageUpload={handleSkuImageUpload}
                handleSkuImageDelete={handleSkuImageDelete}
                skuImageLoading={skuImageLoading}
                saveSkuRow={saveSkuRow}
                cancelSkuRow={cancelSkuRow}
                removeSkuRow={removeSkuRow}
                addSkuRow={addSkuRow}
                editingSkuKey={editingSkuKey}
                handleBulkSavePostValidation={handleBulkSavePostValidation}
                handleAddPostValidationRow={handleAddPostValidationRow}
                handleDeleteAllPostValidation={handleDeleteAllPostValidation}
            />
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500 min-h-[400px] flex items-center justify-center">
                <div className="text-xl">Content for {activeTab} is coming soon.</div>
            </div>
        )}
      </div>

      <Modal
        open={remarkModal.visible}
        title="Auditor Remarks"
        onOk={handleRemarkModalSave}
        onCancel={handleRemarkModalCancel}
        okText="Save"
        cancelText="Cancel"
      >
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Enter one remark per line.</p>
          <Input.TextArea
            value={remarkModal.text}
            onChange={handleRemarkModalChange}
            autoSize={{ minRows: 5, maxRows: 10 }}
            className="text-sm"
            placeholder="Type remarks here, one per line"
          />
        </div>
      </Modal>

      <Modal
        open={polymerModalOpen}
        title="Polymer Used"
        onOk={handleSavePolymersFromModal}
        onCancel={() => setPolymerModalOpen(false)}
        width={500}
      >
        <div className="mb-4">
            <Input
                value={newPolymerInput}
                onChange={(e) => setNewPolymerInput(e.target.value)}
                placeholder="Add a polymer point"
                className="mb-2"
                onPressEnter={handleAddPolymerPoint}
            />
            <Button
                type="primary"
                onClick={handleAddPolymerPoint}
                className="w-full"
            >
                Add Point
            </Button>
        </div>
        <div className="mt-4 max-h-60 overflow-y-auto">
            <h5 className="font-semibold mb-2">Polymer Points</h5>
            {tempPolymers.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No points added yet.</div>
            ) : (
                tempPolymers.map((polymer, index) => (
                    <div key={index} className="flex items-center justify-between mb-2 p-2 bg-gray-50 rounded border border-gray-100">
                        <span>- {polymer}</span>
                        <Button
                            danger
                            size="small"
                            onClick={() => handleRemovePolymerPoint(index)}
                        >
                            Remove
                        </Button>
                    </div>
                ))
            )}
        </div>
      </Modal>

      <SubmitConfirmationModal 
        isOpen={isSubmitModalOpen} 
        onClose={() => setIsSubmitModalOpen(false)} 
        onConfirm={(processPreValidation) => handleSubmit(null, processPreValidation)}
        isSubmitting={loading}
      />
    </div>
    </div>
  );
};

const AddClient = () => (
    <ClientProvider>
        <AddClientContent />
    </ClientProvider>
);

export default AddClient;

