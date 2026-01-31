import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Table, Select, Input, Button, Upload, message, ConfigProvider, Modal, Popover } from 'antd';
import { UploadOutlined, DeleteOutlined, PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { 
  FaArrowLeft, FaCheck, FaChevronRight, FaBuilding, FaGavel, FaTrademark, FaLayerGroup, 
  FaCalendarAlt, FaChevronDown, FaIndustry, FaUserShield, FaUser, FaPhone, FaEnvelope, 
  FaUserTie, FaCheckCircle, FaSave, FaEdit, FaUndo, FaTrashAlt, FaSpinner, FaArrowRight,
  FaFileContract, FaMapMarkerAlt, FaPencilAlt, FaFilePdf, FaCheckDouble, FaFolderOpen, FaShieldAlt, FaLock, FaClipboardCheck, FaExclamationCircle, FaHistory, FaChartLine, FaFilter
} from 'react-icons/fa';
import ClientValidation from './ClientValidation';
import ClientDetail from './ClientDetail';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { indianStatesCities } from '../constants/indianStatesCities';
import useAuth from '../hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HoverRow = ({ children, ...props }) => {
    const { record, ...restProps } = props;
    if (!record) return <tr {...restProps}>{children}</tr>;
    
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
                    <span className="font-medium">
                        {Array.isArray(record.polymerUsed) ? record.polymerUsed.join(', ') : (record.polymerUsed || '-')}
                    </span>
                </div>
                 <div>
                    <span className="text-gray-500 block">Thickness:</span>
                    <span className="font-medium">{record.thicknessMentioned || '-'}</span>
                </div>
                <div>
                    <span className="text-gray-500 block">Status:</span>
                    <span className={`font-semibold ${
                        record.complianceStatus === 'Compliant' ? 'text-green-600' : 
                        record.complianceStatus === 'Non-Compliant' ? 'text-red-600' : 
                        record.complianceStatus === 'Partially Compliant' ? 'text-amber-600' : 'text-gray-600'
                    }`}>{record.complianceStatus}</span>
                </div>
                 <div className="col-span-2">
                    <span className="text-gray-500 block">Remarks:</span>
                    {Array.isArray(record.remarks) && record.remarks.length > 0 ? (
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            {record.remarks.slice(0, 3).map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                            {record.remarks.length > 3 && <li>... (+{record.remarks.length - 3} more)</li>}
                        </ul>
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

const AddClient = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const isViewMode = !!location.state?.viewMode;
  const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
  const { type, id } = useParams();
  const [clientId, setClientId] = useState(id || null);
  const [completedStep, setCompletedStep] = useState(id ? 4 : 0);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('Client Data');
  const [loading, setLoading] = useState(false);
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
  const [postValidationGotoPage, setPostValidationGotoPage] = useState('');
  const [postValidationActiveTab, setPostValidationActiveTab] = useState('markingLabelling');
  const [skuComplianceData, setSkuComplianceData] = useState([
    { key: Date.now(), skuCode: '', skuDescription: '', skuUm: '', productImage: null, brandOwner: '', eprCertBrandOwner: '', eprCertProducer: '', thicknessMentioned: '', polymerUsed: [], polymerMentioned: '', recycledPercent: '', complianceStatus: '', markingImage: [], compostableRegNo: '', remarks: [] }
  ]);
  const [skuSearchText, setSkuSearchText] = useState('');
  const [skuStatusFilter, setSkuStatusFilter] = useState('all');
  const [skuPagination, setSkuPagination] = useState({ current: 1, pageSize: 10 });
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
                setActiveTab('Pre - Validation');
                setIsPreValidationUnlocked(true);
                if (client.validationStatus === 'Verified') {
                    setIsPreValidationComplete(true);
                }
                toast.success("Welcome Back! Client submitted. Continuing to Pre- Audit Check.", { theme: "colored", toastId: 'welcome-submitted' });
            } else if (status === 'AUDIT') {
                setActiveTab('Audit');
                setIsPreValidationUnlocked(true);
                setIsPreValidationComplete(true);
                toast.success("Welcome Back! Client in Audit phase.", { theme: "colored", toastId: 'welcome-audit' });
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
              entityType: client.entityType || prev.entityType,
              authorisedPersonName: client.authorisedPerson?.name || '',
              authorisedPersonNumber: client.authorisedPerson?.number || '',
              authorisedPersonEmail: client.authorisedPerson?.email || '',
              coordinatingPersonName: client.coordinatingPerson?.name || '',
              coordinatingPersonNumber: client.coordinatingPerson?.number || '',
              coordinatingPersonEmail: client.coordinatingPerson?.email || '',
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
              plantLocationNumber: client.productionFacility?.plantLocationNumber ? parseInt(client.productionFacility.plantLocationNumber) : (client.productionFacility?.plantCount || 0)
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
                      isEditing: false
                  })));
             }

            if (client.productionFacility) {
                 const plantLocNum = client.productionFacility.plantLocationNumber ? parseInt(client.productionFacility.plantLocationNumber) : (client.productionFacility?.plantCount || 0);

                 if (client.productionFacility.cteDetailsList?.length > 0) {
                     setCteDetailRows(client.productionFacility.cteDetailsList.map(item => ({
                         ...item,
                         issuedDate: item.issuedDate ? item.issuedDate.split('T')[0] : '',
                         validUpto: item.validUpto ? item.validUpto.split('T')[0] : '',
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

                 if (client.productionFacility.ctoDetailsList?.length > 0) {
                     setCtoDetailRows(client.productionFacility.ctoDetailsList.map(item => ({
                         ...item,
                         dateOfIssue: item.dateOfIssue ? item.dateOfIssue.split('T')[0] : '',
                         validUpto: item.validUpto ? item.validUpto.split('T')[0] : '',
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

  // Form State
  const [formData, setFormData] = useState({
    clientName: '',
    tradeName: '',
    companyGroupName: '',
    financialYear: '',
    entityType: type === 'pwp' ? 'PWP' : 'Producer', // Default
    pwpCategory: '',
    registrationStatus: '',
    unitName: '',
    facilityState: '',
    // Authorised Person
    authorisedPersonName: '',
    authorisedPersonNumber: '',
    authorisedPersonEmail: '',
    // Coordinating Person
    coordinatingPersonName: '',
    coordinatingPersonNumber: '',
    coordinatingPersonEmail: '',
    // Addresses
    roAddress1: '', roAddress2: '', roAddress3: '', roState: '', roCity: '', roPincode: '',
    coAddress1: '', coAddress2: '', coAddress3: '', coState: '', coCity: '', coPincode: '',
    coSameAsRegistered: false,
    // Documents
    gstNumber: '', gstDate: '', gstFile: null,
    cinNumber: '', cinDate: '', cinFile: null,
    panNumber: '', panDate: '', panFile: null,
    factoryLicenseNumber: '', factoryLicenseDate: '', factoryLicenseFile: null,
    eprCertificateNumber: '', eprCertificateDate: '', eprCertificateFile: null,
    iecCertificateNumber: '', iecCertificateDate: '', iecCertificateFile: null,
    dicDcssiCertificateNumber: '', dicDcssiCertificateDate: '', dicDcssiCertificateFile: null,
    // Compliance Contact
    compAuthName: '', compAuthNum: '', compAuthEmail: '',
    compCoordName: '', compCoordNum: '', compCoordEmail: '',

    totalCapitalInvestmentLakhs: '',
    groundWaterUsage: '',
    cgwaNocRequirement: '',
    cgwaNocDocument: null,
    plantLocationNumber: 0
  });

  // Dynamic Tables State
  const [msmeRows, setMsmeRows] = useState([]);

  // Determine if client is PWP (either from URL param or loaded data)
  const isPwp = type === 'pwp' || formData.entityType === 'PWP';

    const urepCategories = ['Category I', 'Category II', 'Category III', 'Category IV', 'Not Applicable'];
    const urepYearOptions = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'];
    const [urepSelectedYear, setUrepSelectedYear] = useState(() => formData.financialYear || urepYearOptions[0]);
    const [urepTargets, setUrepTargets] = useState(() => {
        const defaultTargets = {
            '2025-26': { 'Category I': 30, 'Category II': 10, 'Category III': 5 },
            '2026-27': { 'Category I': 40, 'Category II': 10, 'Category III': 5 },
            '2027-28': { 'Category I': 50, 'Category II': 20, 'Category III': 10 },
            '2028-29': { 'Category I': 60, 'Category II': 20, 'Category III': 10 }
        };

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

  const steps = [
    { number: 1, title: 'Client Basic Info', description: 'Legal & Trade Details', icon: 'fas fa-user' },
    { number: 2, title: 'Company Address', description: 'Registered & Communication', icon: 'fas fa-building' },
    { number: 3, title: 'Company Documents', description: 'GST, PAN, CIN, etc.', icon: 'fas fa-file-shield' },
    { number: 4, title: 'CTE & CTO/CCA', description: 'Consent Details', icon: 'fas fa-industry' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
        if (name === 'groundWaterUsage') {
            const next = value;
            if (next === 'Yes') {
                return { ...prev, groundWaterUsage: 'Yes', cgwaNocRequirement: 'Applicable' };
            }
            if (next === 'No') {
                return { ...prev, groundWaterUsage: 'No', cgwaNocRequirement: 'Not Applicable', cgwaNocDocument: null };
            }
            return { ...prev, groundWaterUsage: '', cgwaNocRequirement: '', cgwaNocDocument: null };
        }
        if (name === 'coSameAsRegistered' && checked) {
             return {
                 ...prev,
                 coSameAsRegistered: true,
                 coAddress1: prev.roAddress1,
                 coAddress2: prev.roAddress2,
                 coAddress3: prev.roAddress3,
                 coState: prev.roState,
                 coCity: prev.roCity,
                 coPincode: prev.roPincode
             };
        }
        if (name === 'coSameAsRegistered' && !checked) {
             return { ...prev, coSameAsRegistered: false, coAddress1: '', coAddress2: '', coAddress3: '', coState: '', coCity: '', coPincode: '' };
        }
        if (name === 'plantLocationNumber') {
            const num = parseInt(value || '0');
            handlePlantLocationChange(num);
            return { ...prev, [name]: num };
        }
        if (name === 'roState') {
            return { ...prev, [name]: value, roCity: '' };
        }
        if (name === 'coState') {
            return { ...prev, [name]: value, coCity: '' };
        }
        return { ...prev, [name]: type === 'checkbox' ? checked : value };
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] }));
  };

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
                permittedQuantity: (r?.permittedQuantity || '').toString()
            }))
          : [];
      const airRows = hasAir
          ? (Array.isArray(airRegulationsRows) ? airRegulationsRows : []).map((r) => ({
                parameter: (r?.parameter || '').toString(),
                permittedLimit: (r?.permittedLimit || '').toString()
            }))
          : [];
      const hazardousWasteRows = hasHazardousWaste
          ? (Array.isArray(hazardousWasteRegulationsRows) ? hazardousWasteRegulationsRows : []).map((r) => ({
                nameOfHazardousWaste: (r?.nameOfHazardousWaste || '').toString(),
                facilityModeOfDisposal: (r?.facilityModeOfDisposal || '').toString(),
                quantityMtYr: (r?.quantityMtYr || '').toString()
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
    if (n > 0) {
        const emptyCte = Array.from({ length: n }).map(() => ({
            plantName: '', consentNo: '', category: '', issuedDate: '', validUpto: '',
            plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
            factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
            contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
        }));
        const emptyCto = Array.from({ length: n }).map(() => ({
            ctoCaaType: '', plantName: '', industryType: '', category: '', consentOrderNo: '', dateOfIssue: '', validUpto: '',
            plantLocation: '', plantAddress: '', factoryHeadName: '', factoryHeadDesignation: '',
            factoryHeadMobile: '', factoryHeadEmail: '', contactPersonName: '', contactPersonDesignation: '',
            contactPersonMobile: '', contactPersonEmail: '', documentFile: null, isEditing: true
        }));
        setCteDetailRows(emptyCte);
        setCtoDetailRows(emptyCto);
    } else {
        setCteDetailRows([]);
        setCtoDetailRows([]);
    }
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
            entityType: formData.entityType,
            category: isPwp ? 'PWP' : 'PIBO',
            registrationStatus: isPwp ? formData.registrationStatus : undefined,
            ...(isPwp ? {
                'productionFacility.facilityName': formData.unitName || undefined,
                'productionFacility.state': formData.facilityState || undefined
            } : {}),
            authorisedPerson: {
                name: formData.authorisedPersonName,
                number: formData.authorisedPersonNumber,
                email: formData.authorisedPersonEmail
            },
            coordinatingPerson: {
                name: formData.coordinatingPersonName,
                number: formData.coordinatingPersonNumber,
                email: formData.coordinatingPersonEmail
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
            ];

            // MSME Uploads
            msmeRows.forEach((row, i) => {
                if (row.certificateFile) {
                    const fd = new FormData();
                    fd.append('document', row.certificateFile);
                    fd.append('documentType', 'Other');
                    fd.append('documentName', `MSME_Cert_${row.udyamNumber}`);
                    promises.push(api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } }));
                }
            });

            await Promise.all(promises);

            // Update document metadata when only number/date changed (no new file)
            const singleTypes2 = [
                { type: 'Factory License', numKey: 'factoryLicenseNumber', dateKey: 'factoryLicenseDate', pathKey: 'factoryLicenseFilePath' },
                { type: 'EPR Certificate', numKey: 'eprCertificateNumber', dateKey: 'eprCertificateDate', pathKey: 'eprCertificateFilePath' },
                { type: 'IEC Certificate', numKey: 'iecCertificateNumber', dateKey: 'iecCertificateDate', pathKey: 'iecCertificateFilePath' },
                { type: 'DIC/DCSSI Certificate', numKey: 'dicDcssiCertificateNumber', dateKey: 'dicDcssiCertificateDate', pathKey: 'dicDcssiCertificateFilePath' }
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
            const uploadRowDoc = async (file, type, name) => {
                const fd = new FormData();
                fd.append('document', file);
                fd.append('documentType', type);
                fd.append('documentName', name || (file?.name || `${type}_Document`));
                const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
                return res?.data?.data?.filePath || '';
            };

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
                            permittedQuantity: (r?.permittedQuantity || '').toString()
                        }))
                        : [],
                    airRegulations: normalizedCtoRegs2.includes('Air')
                        ? (Array.isArray(airRegulationsRows) ? airRegulationsRows : []).map(r => ({
                            parameter: (r?.parameter || '').toString(),
                            permittedLimit: (r?.permittedLimit || '').toString()
                        }))
                        : [],
                    hazardousWasteRegulations: normalizedCtoRegs2.includes('Hazardous Waste')
                        ? (Array.isArray(hazardousWasteRegulationsRows) ? hazardousWasteRegulationsRows : []).map(r => ({
                            nameOfHazardousWaste: (r?.nameOfHazardousWaste || '').toString(),
                            facilityModeOfDisposal: (r?.facilityModeOfDisposal || '').toString(),
                            quantityMtYr: (r?.quantityMtYr || '').toString()
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
        
        // Construct nested data structure for backend
        const clientData = {
            clientName: formData.clientName,
            tradeName: formData.tradeName,
            companyGroupName: formData.companyGroupName,
            financialYear: formData.financialYear,
            entityType: formData.entityType,
            category: isPwp ? 'PWP' : 'PIBO',
            registrationStatus: isPwp ? (formData.registrationStatus || 'Registered') : undefined,
            authorisedPerson: {
                name: formData.authorisedPersonName,
                number: formData.authorisedPersonNumber,
                email: formData.authorisedPersonEmail
            },
            coordinatingPerson: {
                name: formData.coordinatingPersonName,
                number: formData.coordinatingPersonNumber,
                email: formData.coordinatingPersonEmail
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
            lastCompletedStep: Math.max(completedStep, 3)
        };

        await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientId), updateData);

        // Upload Files
        const upload = (file, type, num, date) => {
            if (!file) return;
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
        ];

        msmeRows.forEach((row) => {
            if (row.certificateFile) {
                const fd = new FormData();
                fd.append('document', row.certificateFile);
                fd.append('documentType', 'Other');
                fd.append('documentName', `MSME_Cert_${row.udyamNumber}`);
                promises.push(api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(clientId), fd, { headers: { 'Content-Type': undefined } }));
            }
        });

        await Promise.all(promises);

        // Update document metadata if number/date changed without uploading a new file
        const singleTypes = [
            { type: 'Factory License', numKey: 'factoryLicenseNumber', dateKey: 'factoryLicenseDate', pathKey: 'factoryLicenseFilePath' },
            { type: 'EPR Certificate', numKey: 'eprCertificateNumber', dateKey: 'eprCertificateDate', pathKey: 'eprCertificateFilePath' },
            { type: 'IEC Certificate', numKey: 'iecCertificateNumber', dateKey: 'iecCertificateDate', pathKey: 'iecCertificateFilePath' },
            { type: 'DIC/DCSSI Certificate', numKey: 'dicDcssiCertificateNumber', dateKey: 'dicDcssiCertificateDate', pathKey: 'dicDcssiCertificateFilePath' }
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
          const procurementMatch = procurementDetails.find((p) => {
              const pSys = normalizeValue(p.systemCode);
              const pComp = normalizeValue(p.componentCode);
              const pDesc = normalizeValue(p.componentDescription);
              if (sysCodeNorm && pSys === sysCodeNorm) return true;
              if (componentCodeNorm && pComp === componentCodeNorm) return true;
              if (!componentCodeNorm && componentDescNorm && pDesc === componentDescNorm) return true;
              return false;
          });
          const rcPercentMentioned = procurementMatch?.rcPercentMentioned || '';

          const rawSupplierCode = row.supplierCode || compDetail?.supplierCode || '';
          const normalizedSupplierCode = normalizeValue(rawSupplierCode);

           const rowData = {
          key: `${consentType}-${itemId}-${row._id || rowIndex}`,
          consentType,
          itemId,
          rowIndex,
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
                  'eprRegistrationNumber'
              ];
              enrichFields.forEach((field) => {
                  const current = existing[field];
                  const incoming = row[field];
                  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '' || String(v).trim() === 'N/A';
                  if (isEmpty(current) && !isEmpty(incoming)) {
                      merged[field] = incoming;
                  }
              });
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

  useEffect(() => {
      if (postValidationActiveTab === 'sku' && clientId) {
          fetchSkuComplianceData();
      }
  }, [postValidationActiveTab, clientId]);

  const handlePostValidationChange = (key, field, value) => {
      setPostValidationData((prev) =>
          prev.map((row) =>
              row.key === key ? { ...row, [field]: value } : row
          )
      );
  };

  const handleSkuComplianceChange = (key, field, value) => {
      setSkuComplianceData((prev) =>
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
      const value = lines.length ? lines.map((line) => `- ${line}`).join('\n') : '';
      handlePostValidationChange(remarkModal.recordKey, remarkModal.field, value);
      handleRemarkModalCancel();
  };

  const handleSavePostValidation = async (record) => {
      try {
          const payload = {
                    type: record.consentType,
                    itemId: record.itemId,
                    rowIndex: record.rowIndex,
                    row: {
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

  const postValidationColumns = [
      {
          title: '#',
          key: 'index',
          width: 60,
          fixed: 'left',
          render: (_value, _record, index) => {
              const base = (postValidationPagination.current - 1) * postValidationPagination.pageSize;
              const rowNumber = base + index + 1;
              return (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                      {rowNumber}
                  </span>
              );
          }
      },
      {
          title: 'Packaging Type',
          dataIndex: 'packagingType',
          key: 'packagingType',
          width: 160,
          render: (value) => (
              <select
                  value={value || ''}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              >
                  <option value="">{value || 'Select'}</option>
                  <option value="Primary Packaging">Primary Packaging</option>
                  <option value="Secondary Packaging">Secondary Packaging</option>
                  <option value="Tertiary Packaging">Tertiary Packaging</option>
              </select>
          )
      },
      {
          title: 'SKU Code',
          dataIndex: 'skuCode',
          key: 'skuCode',
          width: 150,
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'SKU Description',
          dataIndex: 'skuDescription',
          key: 'skuDescription',
          width: 220,
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'SKU UOM',
          dataIndex: 'skuUom',
          key: 'skuUom',
          width: 120,
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Product Image',
          dataIndex: 'productImage',
          key: 'productImage',
          width: 160,
          render: (value) => {
              const src = value;
              if (!src) return 'N/A';
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
              return (
                  <div className="flex items-center gap-2">
                      <img src={src} alt="Comp" className="h-10 w-10 object-cover rounded border border-gray-200" />
                      <button
                          type="button"
                          onClick={handleView}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                          View
                      </button>
                  </div>
              );
          }
      },
      {
          title: 'Component Image',
          dataIndex: 'componentImage',
          key: 'componentImage',
          width: 160,
          render: (value) => {
              const src = value;
              if (!src) return 'N/A';
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
              return (
                  <div className="flex items-center gap-2">
                      <img src={src} alt="Component" className="h-10 w-10 object-cover rounded border border-gray-200" />
                      <button
                          type="button"
                          onClick={handleView}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                          View
                      </button>
                  </div>
              );
          }
      },
      {
          title: 'Component Code',
          dataIndex: 'componentCode',
          key: 'componentCode',
          width: 150,
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'System Code',
          dataIndex: 'systemCode',
          key: 'systemCode',
          width: 150,
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Component Description',
          dataIndex: 'componentDescription',
          key: 'componentDescription',
          width: 260,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Component Polymer',
          dataIndex: 'componentPolymer',
          key: 'componentPolymer',
          width: 150,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Category',
          dataIndex: 'category',
          key: 'category',
          width: 150,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Container Capacity',
          dataIndex: 'containerCapacity',
          key: 'containerCapacity',
          width: 150,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Monolayer / Multilayer',
          dataIndex: 'layerType',
          key: 'layerType',
          width: 180,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      { 
          title: 'Thickness (Micron)', 
          dataIndex: 'thickness', 
          key: 'thickness', 
          width: 150,
          align: 'center',
          render: (value) => {
              const num = parseFloat(String(value ?? '').replace(/,/g, ''));
              if (!Number.isFinite(num)) {
                  return <span className="text-gray-400">-</span>;
              }
              const isSafe = num >= 50;
              const colorClass = isSafe ? 'text-green-600' : 'text-red-600';
              const bgClass = isSafe ? 'bg-green-50' : 'bg-red-50';
              const borderClass = isSafe ? 'border-green-200' : 'border-red-200';
              return (
                  <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${colorClass} ${bgClass} ${borderClass} border`}
                      title={String(num)}
                  >
                      {num}
                  </span>
              );
          }
      },
      {
          title: 'Supplier Code',
          dataIndex: 'supplierCode',
          key: 'supplierCode',
          width: 160,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'Supplier Name',
          dataIndex: 'supplierName',
          key: 'supplierName',
          width: 200,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      {
          title: 'RC % Mentioned',
          dataIndex: 'rcPercentMentioned',
          key: 'rcPercentMentioned',
          width: 140,
          align: 'center',
          render: (value) => (
              <span
                  className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                  title={value || '-'}
              >
                  {value || '-'}
              </span>
          )
      },
      {
          title: 'EPR Certificate Number',
          dataIndex: 'eprRegistrationNumber',
          key: 'eprRegistrationNumber',
          width: 200,
          align: 'middle',
          render: (text) => (
              <input
                  type="text"
                  readOnly
                  value={text || ''}
                  title={text || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-700"
              />
          )
      },
      { 
          title: 'Auditor Remarks', 
          dataIndex: 'auditorRemarks', 
          key: 'auditorRemarks', 
          width: 220,
          render: (value, record) => {
              const items = parseRemarksToItems(value);
              return (
                  <div className="flex flex-col gap-1">
                      <div className="border border-gray-200 rounded px-2 py-1 bg-gray-50 text-xs max-h-20 overflow-y-auto">
                          {items.length ? (
                              items.map((item, index) => (
                                  <div key={index} className="flex items-start gap-1">
                                      <span className="mt-0.5">•</span>
                                      <span className="flex-1 break-words">{item}</span>
                                  </div>
                              ))
                          ) : (
                              <span className="text-gray-400">No remarks</span>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                          <Button
                              size="small"
                              onClick={() => openRemarkModal(record, 'auditorRemarks')}
                              className="h-6 px-2 text-xs"
                          >
                              + Add Point
                          </Button>
                      </div>
                  </div>
              );
          }
      },
      { 
          title: 'Client Remarks', 
          dataIndex: 'clientRemarks', 
          key: 'clientRemarks', 
          width: 220,
          render: (value, record) => (
              <div className="flex flex-col gap-1">
                  <Input.TextArea
                      value={value}
                      onChange={(e) => handlePostValidationChange(record.key, 'clientRemarks', e.target.value)}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      placeholder="Add points, one per line"
                      className="text-xs"
                  />
                  <div className="flex items-center gap-2">
                      <Button
                          size="small"
                          onClick={() => appendRemarkPoint(record.key, 'clientRemarks')}
                          className="h-6 px-2 text-xs"
                      >
                          + Point
                      </Button>
                  </div>
              </div>
          )
      },
      {
          title: 'Compliance Status', 
          dataIndex: 'complianceStatus', 
          key: 'complianceStatus', 
          width: 200,
          render: (value, record) => {
              let bg = '#ffffff';
              let border = '#d9d9d9';

              if (value === 'Partially Compliant') {
                  bg = '#fcd34d'; // yellow-300
                  border = '#fbbf24'; // yellow-400
              } else if (value === 'Complete Compliant' || value === 'Complete Complians') {
                  bg = '#86efac'; // green-300
                  border = '#4ade80'; // green-400
              } else if (value === 'Non-Compliant') {
                  bg = '#fca5a5'; // red-300
                  border = '#f87171'; // red-400
              }

              return (
                  <ConfigProvider
                      theme={{
                          components: {
                              Select: {
                                  selectorBg: bg,
                                  colorPrimary: border,
                                  colorBorder: border,
                                  optionSelectedBg: bg,
                              }
                          }
                      }}
                  >
                      <Select
                          value={value || undefined}
                          onChange={(val) => handlePostValidationChange(record.key, 'complianceStatus', val)}
                          size="small"
                          placeholder="Select status"
                          className="w-full"
                          options={[
                              { value: 'Partially Compliant', label: 'Partially Compliant' },
                              { value: 'Complete Compliant', label: 'Complete Compliant' },
                              { value: 'Non-Compliant', label: 'Non-Compliant' }
                          ]}
                      />
                  </ConfigProvider>
              );
          }
      },
      {
          title: 'Action',
          key: 'action',
          fixed: 'right',
          width: 150,
          render: (_, record) => (
              <div className="flex items-center gap-2">
                  <button 
                      onClick={() => handleSavePostValidation(record)}
                      className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      title="Save"
                  >
                      <FaSave />
                  </button>
              </div>
          )
      }
  ];

    const handleSaveSkuCompliance = async (record) => {
        try {
            messageApi.loading({ content: 'Saving...', key: 'saveSku' });
            
            let uploadedImages = record.markingImage || [];
            
            const newFiles = uploadedImages.filter(f => f.originFileObj);
            const existingUrls = uploadedImages.filter(f => !f.originFileObj && (typeof f === 'string' || f.url)).map(f => f.url || f);
            
            let finalImageUrls = [...existingUrls];

            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(file => {
                    formData.append('markingImage', file.originFileObj);
                });

                const uploadRes = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE_UPLOAD(clientId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

                if (uploadRes.data?.success && uploadRes.data?.data?.markingImage) {
                    finalImageUrls = [...finalImageUrls, ...uploadRes.data.data.markingImage];
                }
            }

            const payload = {
                ...record,
                markingImage: finalImageUrls,
                recycledPercent: record.recycledPercent || '',
                complianceStatus: record.complianceStatus || ''
            };

            const res = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), payload);

            if (res.data?.success) {
                messageApi.success({ content: 'Saved successfully', key: 'saveSku' });
                setSkuComplianceData(prev => prev.map(row => {
                    if (row.key === record.key) {
                         const updatedImages = finalImageUrls.map((url, idx) => ({
                            uid: `-${idx}`,
                            name: `Image ${idx + 1}`,
                            status: 'done',
                            url: url
                        }));
                        return {
                            ...row,
                            markingImage: updatedImages
                        };
                    }
                    return row;
                }));
            } else {
                messageApi.error({ content: 'Failed to save', key: 'saveSku' });
            }

        } catch (error) {
            console.error(error);
            messageApi.error({ content: 'Error saving data', key: 'saveSku' });
        }
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
            title: 'MARKING IMAGE', 
            dataIndex: 'markingImage', 
            key: 'markingImage', 
            width: 200, 
            render: (_, record) => (
                <Upload
                    multiple
                    fileList={record.markingImage || []}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => handleSkuComplianceChange(record.key, 'markingImage', fileList)}
                >
                    <Button 
                        icon={<UploadOutlined />} 
                        className="rounded-md border-gray-300 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors h-9 w-full flex items-center justify-center"
                    >
                        Upload
                    </Button>
                </Upload>
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
            title: 'REMARKS', 
            dataIndex: 'remarks', 
            key: 'remarks', 
            width: 150, 
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    <Button 
                        size="small" 
                        onClick={() => handleOpenRemarksModal(record)}
                        className={`w-full h-9 rounded-md border shadow-sm transition-all flex items-center justify-center gap-2 ${
                            Array.isArray(text) && text.length > 0 
                                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300' 
                                : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                    >
                        {Array.isArray(text) && text.length > 0 ? (
                            <>
                                <FaEdit className="text-xs" />
                                <span>{text.length} Points</span>
                            </>
                        ) : (
                            <>
                                <PlusOutlined className="text-xs" />
                                <span>Add</span>
                            </>
                        )}
                    </Button>
                </div>
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
                        onClick={() => handleSaveSkuCompliance(record)}
                        className="bg-green-600 hover:bg-green-700 border-green-600 h-8 w-8 flex items-center justify-center rounded-md shadow-sm"
                        title="Save Row"
                    />
                </div>
            )
        }
    ];

    const fetchSkuComplianceData = async () => {
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

    const handleSkuComplianceReport = async () => {
      const rows = Array.isArray(skuComplianceData) ? skuComplianceData : [];
      const usableRows = rows.filter((r) => (r?.skuCode || '').toString().trim().length > 0);
      if (!usableRows.length) {
          toast.warning('No SKU Compliance data to export');
          return;
      }

      setLoading(true);
      try {
          const grouped = {};
          usableRows.forEach((row) => {
              const key = (row.skuCode || 'NO SKU').toString().trim() || 'NO SKU';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(row);
          });

          const doc = new jsPDF('l', 'mm', 'a4');
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          const marginX = 15;
          const marginBottom = 15;

          const skuKeys = Object.keys(grouped);
          let currentSkuIndex = 0;
          const totalSkuCount = skuKeys.length;

          const addSkuComplianceCoverPage = async () => {
              const candidates = [
                  '/sku-compliance-cover.png',
                  '/sku-compliance-cover.jpg',
                  '/sku-compliance-cover.jpeg'
              ];
              for (const candidate of candidates) {
                  try {
                      const url = new URL(candidate, window.location.origin).toString();
                      const imgMeta = await loadImageForPdf(url);
                      if (!imgMeta) continue;

                      doc.setFillColor(255, 255, 255);
                      doc.rect(0, 0, pageWidth, pageHeight, 'F');

                      const padding = 10;
                      const maxW = pageWidth - padding * 2;
                      const maxH = pageHeight - padding * 2;

                      let drawW = maxW;
                      let drawH = maxH;

                      if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                          const ratio = Math.min(maxW / imgMeta.width, maxH / imgMeta.height);
                          drawW = imgMeta.width * ratio;
                          drawH = imgMeta.height * ratio;
                      }

                      const x = (pageWidth - drawW) / 2;
                      const y = (pageHeight - drawH) / 2;

                      let format = 'JPEG';
                      if (candidate.toLowerCase().endsWith('.png')) format = 'PNG';

                      doc.addImage(imgMeta.dataUrl, format, x, y, drawW, drawH);
                      return true;
                  } catch (_) {}
              }
              return false;
          };

          const coverAdded = await addSkuComplianceCoverPage();

          const formatDate = (d) => {
              if (!d || isNaN(d.getTime())) return '';
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
          };

          const drawHeader = () => {
              doc.setFillColor(240, 253, 244);
              doc.rect(0, 0, pageWidth, 28, 'F');

              const clientName = fullClientData?.clientName || '';
              const clientCategory = fullClientData?.category || '';
              const entityType = fullClientData?.entityType || '';
              const fyRaw = fullClientData?.financialYear || '';
              const fy = fyRaw ? `FY-${fyRaw}` : '';
              const assignedName = fullClientData?.assignedTo?.name || '';

              doc.setTextColor(15, 23, 42);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              if (clientName) {
                  doc.text(clientName, marginX, 12);
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              let lineY = 17;
              let categoryLine = '';
              const resolveCategoryMeta = () => {
                  if (clientCategory === 'PWP') {
                      const notes = (fullClientData?.notes || '').toString();
                      const match = notes.match(/PWP Category:\s*([^\|]+)/i);
                      const pwpCat = match?.[1]?.trim();
                      return { label: 'PWP Category', value: pwpCat || 'PWP' };
                  }
                  return { label: 'PIBO Category', value: entityType || 'N/A' };
              };
              const { label: categoryLabel, value: categoryValue } = resolveCategoryMeta();
              if (categoryValue) {
                  categoryLine = `${categoryLabel}: ${categoryValue}`;
              }
              if (fy) {
                  categoryLine = categoryLine ? `${categoryLine}   ${fy}` : fy;
              }
              if (categoryLine) {
                  doc.text(categoryLine, marginX, lineY);
                  lineY += 5;
              }

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.text('SKU Compliance Report', marginX, lineY);

              const rightX = pageWidth - marginX;
              const auditCompanyName = 'Ananttattva Private Limited';
              let auditorName = assignedName || authUser?.name || authUser?.fullName || authUser?.email || '';
              if (auditorName && auditorName.toLowerCase() === 'admin') {
                  auditorName = assignedName || '';
              }
              const startDate = fullClientData?.auditStartDate ? new Date(fullClientData.auditStartDate) : null;
              const endDate = fullClientData?.auditEndDate ? new Date(fullClientData.auditEndDate) : null;
              const startStr = formatDate(startDate);
              const endStr = formatDate(endDate);
              let period = '';
              if (startStr || endStr) {
                  period = `${startStr || 'N/A'} - ${endStr || 'N/A'}`;
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              let rightY = 12;
              doc.text(`Company Name: ${auditCompanyName}`, rightX, rightY, { align: 'right' });
              rightY += 5;
              if (auditorName) {
                  doc.text(`Auditor Name: ${auditorName}`, rightX, rightY, { align: 'right' });
                  rightY += 5;
              }
              if (period) {
                  doc.text(`Audit Period: ${period}`, rightX, rightY, { align: 'right' });
              }

              doc.setDrawColor(209, 213, 219);
              doc.rect(marginX, 32, pageWidth - marginX * 2, 6);
              doc.setFontSize(9);
              doc.setTextColor(75, 85, 99);
              const progressText = totalSkuCount > 0 ? `SKU: ${currentSkuIndex + 1} of ${totalSkuCount}` : '';
              if (progressText) {
                  doc.text(progressText, marginX + 2, 36);
              }
              return 42;
          };

          const normalizeMarkingImageUrl = (img) => {
              if (!img) return '';
              if (typeof img === 'string') return toAbsUrl(img);
              if (typeof img.url === 'string' && img.url) return toAbsUrl(img.url);
              if (img.originFileObj) return URL.createObjectURL(img.originFileObj);
              return '';
          };

          for (let i = 0; i < skuKeys.length; i++) {
              const skuCode = skuKeys[i];
              const skuRows = grouped[skuCode] || [];
              const row = skuRows[0] || {};

              currentSkuIndex = i;
              if (i > 0 || coverAdded) doc.addPage();

              let currentY = drawHeader();

              const detailsBody = [
                  ['SKU Code', skuCode],
                  ['SKU Description', row.skuDescription || ''],
                  ['SKU UOM', row.skuUm || ''],
              ];

              const productImageUrls = [];
              const absProduct = toAbsUrl(row.productImage);
              if (absProduct) productImageUrls.push(absProduct);

              const availableWidth = pageWidth - marginX * 2;
              const leftColumnWidth = productImageUrls.length ? availableWidth * 0.72 : availableWidth;
              const rightColumnWidth = productImageUrls.length ? availableWidth - leftColumnWidth - 4 : 0;

              autoTable(doc, {
                  startY: currentY,
                  head: [['Field', 'Value']],
                  body: detailsBody,
                  theme: 'grid',
                  margin: {
                      left: marginX,
                      right: productImageUrls.length ? marginX + rightColumnWidth + 4 : marginX
                  },
                  styles: {
                      fontSize: 8,
                      cellPadding: 2,
                      textColor: [15, 23, 42],
                      lineColor: [226, 232, 240],
                      lineWidth: 0.1
                  },
                  headStyles: {
                      fillColor: [249, 115, 22],
                      textColor: 255,
                      fontStyle: 'bold',
                      halign: 'left'
                  },
                  columnStyles: {
                      0: { cellWidth: 32, textColor: [100, 116, 139] },
                      1: { cellWidth: 'auto' }
                  },
                  didParseCell: (data) => {
                      if (data.section !== 'body') return;
                      if (data.column.index === 0) {
                          data.cell.styles.fontStyle = 'bold';
                      } else if (data.column.index === 1 && data.row.index === 0) {
                          data.cell.styles.font = 'courier';
                          data.cell.styles.fontStyle = 'bold';
                      }
                  }
              });

              const detailsTableTopY = currentY;
              const detailsTableBottomY = doc.lastAutoTable.finalY;

              if (productImageUrls.length) {
                  const imageWidth = rightColumnWidth || 0;
                  if (imageWidth > 0) {
                      const imageAreaX = pageWidth - marginX - imageWidth;
                      const skuSectionHeight = detailsTableBottomY - detailsTableTopY;
                      const maxImagesHeight = skuSectionHeight;

                      if (maxImagesHeight > 0) {
                          const imageHeight = maxImagesHeight;
                          const url = productImageUrls[0];
                          const imgMeta = await loadImageForPdf(url);
                          if (imgMeta) {
                              const y = detailsTableTopY;
                              doc.setDrawColor(209, 213, 219);
                              doc.rect(imageAreaX, y, imageWidth, imageHeight);

                              let format = 'JPEG';
                              const lower = url.toLowerCase();
                              if (lower.endsWith('.png')) format = 'PNG';

                              const innerPadding = 1;
                              const boxWidth = imageWidth - innerPadding * 2;
                              const boxHeight = imageHeight - innerPadding * 2;
                              let drawW = boxWidth;
                              let drawH = boxHeight;

                              if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                                  const ratio = Math.min(boxWidth / imgMeta.width, boxHeight / imgMeta.height);
                                  drawW = imgMeta.width * ratio;
                                  drawH = imgMeta.height * ratio;
                              }

                              const offsetX = imageAreaX + innerPadding + (boxWidth - drawW) / 2;
                              const offsetY = y + innerPadding + (boxHeight - drawH) / 2;
                              try {
                                  doc.addImage(imgMeta.dataUrl, format, offsetX, offsetY, drawW, drawH);
                              } catch (_) {}
                          }
                      }
                  }
              }

              currentY = detailsTableBottomY + 3;

              const polymerUsedText = Array.isArray(row.polymerUsed)
                  ? row.polymerUsed.filter(Boolean).join(', ')
                  : (row.polymerUsed || '').toString();
              const remarksText = Array.isArray(row.remarks)
                  ? row.remarks.filter(Boolean).join(' | ')
                  : (row.remarks || '').toString();

              const ensurePageSpace = (bottomLimit, needed) => {
                  if (currentY + needed <= bottomLimit) return;
                  doc.addPage();
                  currentY = drawHeader();
              };

              const normalizeText = (val) => (val ?? '').toString().trim();

              const complianceLines = [
                  { label: 'Name of Brand Owner', value: row.brandOwner },
                  { label: 'EPR Certificate Number (Brand Owner)', value: row.eprCertBrandOwner },
                  { label: 'EPR Certificate Number (Producer)/(Importer)', value: row.eprCertProducer },
                  { label: 'Thickness Mentioned', value: row.thicknessMentioned },
                  { label: 'Polymer Used', value: polymerUsedText },
                  { label: 'Polymer Mentioned', value: row.polymerMentioned },
                  { label: 'Recycled % (Disclosed/Not Disclosed)', value: row.recycledPercent },
                  { label: 'Registration No. of Compostable/Biodegradable Plastic Declared Missing', value: row.compostableRegNo },
                  { label: 'Compliance Status', value: row.complianceStatus }
              ];

              const drawComplianceDetailsCard = () => {
                  const bottomLimit = pageHeight - marginBottom - 10;
                  const cardX = marginX;
                  const cardW = pageWidth - marginX * 2;
                  const padding = 8;
                  const titleH = 8;
                  const bulletRadius = 1.1;
                  const lineHeight = 4.2;
                  const bulletGap = 5;
                  const contentX = cardX + padding;
                  const bulletX = contentX + bulletRadius;
                  const textX = contentX + bulletGap;
                  const maxTextW = cardW - padding * 2 - bulletGap - 2;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);

                  const prepared = complianceLines.map((item) => {
                      const label = normalizeText(item.label) || '-';
                      const value = normalizeText(item.value) || '-';
                      const line = `${label}: ${value}`;
                      const lines = doc.splitTextToSize(line, maxTextW);
                      return { lines, height: Math.max(1, lines.length) * lineHeight + 1.2 };
                  });

                  const contentH = prepared.reduce((sum, p) => sum + p.height, 0);
                  const cardH = padding + titleH + 2 + contentH + padding;

                  ensurePageSpace(bottomLimit, cardH + 2);

                  doc.setDrawColor(253, 186, 116);
                  doc.setFillColor(255, 247, 237);
                  doc.roundedRect(cardX, currentY, cardW, cardH, 4, 4, 'FD');

                  const titleY = currentY + padding;
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(10);
                  doc.setTextColor(249, 115, 22);
                  doc.text('!', contentX, titleY);
                  doc.text('SKU Compliance Details', contentX + 5, titleY);

                  let y = titleY + 7;
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  doc.setTextColor(55, 65, 81);

                  prepared.forEach((p) => {
                      doc.setFillColor(249, 115, 22);
                      doc.circle(bulletX, y - 1, bulletRadius, 'F');
                      p.lines.forEach((ln, idx) => {
                          doc.text(ln, textX, y);
                          y += lineHeight;
                      });
                      y += 1.2;
                  });

                  currentY += cardH + 6;
              };

              const drawBulletCard = (title, rawItems) => {
                  const bottomLimit = pageHeight - marginBottom - 10;
                  const cardX = marginX;
                  const cardW = pageWidth - marginX * 2;
                  const padding = 8;
                  const titleH = 8;
                  const bulletRadius = 1.1;
                  const lineHeight = 4.2;
                  const bulletGap = 5;
                  const contentX = cardX + padding;
                  const bulletX = contentX + bulletRadius;
                  const textX = contentX + bulletGap;
                  const maxTextW = cardW - padding * 2 - bulletGap - 2;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  const items = Array.isArray(rawItems) ? rawItems : [];
                  const prepared = items.map((item) => {
                      const text = normalizeText(item) || '-';
                      const lines = doc.splitTextToSize(text, maxTextW);
                      return { lines, height: Math.max(1, lines.length) * lineHeight + 1.2 };
                  });

                  const contentH = prepared.reduce((sum, p) => sum + p.height, 0);
                  const cardH = padding + titleH + 2 + contentH + padding;

                  ensurePageSpace(bottomLimit, cardH + 2);

                  doc.setDrawColor(253, 186, 116);
                  doc.setFillColor(255, 247, 237);
                  doc.roundedRect(cardX, currentY, cardW, cardH, 4, 4, 'FD');

                  const titleY = currentY + padding;
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(10);
                  doc.setTextColor(249, 115, 22);
                  doc.text('!', contentX, titleY);
                  doc.text(title, contentX + 5, titleY);

                  let y = titleY + 7;
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  doc.setTextColor(55, 65, 81);

                  prepared.forEach((p) => {
                      doc.setFillColor(249, 115, 22);
                      doc.circle(bulletX, y - 1, bulletRadius, 'F');
                      p.lines.forEach((ln) => {
                          doc.text(ln, textX, y);
                          y += lineHeight;
                      });
                      y += 1.2;
                  });

                  currentY += cardH + 6;
              };

              drawComplianceDetailsCard();

              if (remarksText.trim().length) {
                  const items = Array.isArray(row.remarks)
                      ? row.remarks.map((x) => (x || '').toString().trim()).filter(Boolean)
                      : remarksText.split('|').map((x) => x.trim()).filter(Boolean);
                  drawBulletCard('Remarks', items);
              }

              const rawImages = Array.isArray(row.markingImage) ? row.markingImage : [];
              const tempObjectUrls = [];
              const imageEntries = rawImages
                  .map((img) => normalizeMarkingImageUrl(img))
                  .filter(Boolean)
                  .map((url) => {
                      if (url.startsWith('blob:')) tempObjectUrls.push(url);
                      return { url };
                  });

              if (!imageEntries.length) continue;

              const cols = 4;
              const gapX = 4;
              const usableWidth = pageWidth - marginX * 2;
              const rowsNeeded = Math.ceil(imageEntries.length / cols) || 1;
              const rawWidth = (usableWidth - gapX * (cols - 1)) / cols;
              const imageWidth = rawWidth;
              const maxPerImageHeight = 200;
              const minPerImageHeight = 80;

              const computeMaxHeightPerRow = (startY) => {
                  const availableHeightLocal = pageHeight - marginBottom - startY;
                  return (availableHeightLocal - (rowsNeeded - 1) * 10) / rowsNeeded;
              };

              let titleY = currentY;
              let maxHeightPerRow = computeMaxHeightPerRow(titleY + 4);
              let imageHeight = Math.min(maxPerImageHeight, maxHeightPerRow);

              if (imageHeight < minPerImageHeight) {
                  doc.addPage();
                  titleY = drawHeader();
                  maxHeightPerRow = computeMaxHeightPerRow(titleY + 4);
                  imageHeight = Math.min(maxPerImageHeight, maxHeightPerRow);
              }

              doc.setFontSize(10);
              doc.setTextColor(55, 65, 81);
              doc.text('Marking Images', marginX, titleY);
              currentY = titleY + 4;

              let colIndex = 0;

              for (let j = 0; j < imageEntries.length; j++) {
                  const entry = imageEntries[j];
                  const imgMeta = await loadImageForPdf(entry.url);
                  if (!imgMeta) continue;

                  const x = marginX + colIndex * (imageWidth + gapX);
                  doc.setDrawColor(209, 213, 219);
                  doc.rect(x, currentY, imageWidth, imageHeight);

                  let format = 'JPEG';
                  const lower = entry.url.toLowerCase();
                  if (lower.endsWith('.png')) format = 'PNG';

                  const innerPadding = 1;
                  const boxWidth = imageWidth - innerPadding * 2;
                  const boxHeight = imageHeight - innerPadding * 2;
                  let drawW = boxWidth;
                  let drawH = boxHeight;

                  if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                      const ratio = Math.min(boxWidth / imgMeta.width, boxHeight / imgMeta.height);
                      drawW = imgMeta.width * ratio;
                      drawH = imgMeta.height * ratio;
                  }

                  const offsetX = x + innerPadding + (boxWidth - drawW) / 2;
                  const offsetY = currentY + innerPadding + (boxHeight - drawH) / 2;

                  try {
                      doc.addImage(imgMeta.dataUrl, format, offsetX, offsetY, drawW, drawH);
                  } catch (_) {}

                  colIndex += 1;
                  if (colIndex >= cols) {
                      colIndex = 0;
                      currentY += imageHeight + 10;
                  }
              }

              tempObjectUrls.forEach((u) => {
                  try { URL.revokeObjectURL(u); } catch (_) {}
              });
          }

          const baseName = fullClientData?.clientName || 'Client';
          doc.save(`${baseName}_SKU_Compliance_Report.pdf`);
          toast.success('SKU Compliance report generated');
      } catch (err) {
          toast.error('Failed to generate SKU Compliance report');
      } finally {
          setLoading(false);
      }
    };

    const handleMarkingLabellingReport = async () => {
      if (!postValidationData.length) {
          toast.warning('No Packaging Assessment & Marking or Labelling data to export');
          return;
      }

      setLoading(true);
      try {
          const grouped = {};
          postValidationData.forEach((row) => {
              const key = (row.skuCode || 'NO SKU').toString().trim() || 'NO SKU';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(row);
          });

          const doc = new jsPDF('l', 'mm', 'a4');
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          const marginX = 15;
          const marginBottom = 15;

          const skuKeys = Object.keys(grouped);
          let currentSkuIndex = 0;
          const totalSkuCount = skuKeys.length;

          const drawHeader = () => {
              doc.setFillColor(240, 253, 244);
              doc.rect(0, 0, pageWidth, 28, 'F');

              const clientName = fullClientData?.clientName || '';
              const clientCategory = fullClientData?.category || '';
              const entityType = fullClientData?.entityType || '';
              const fyRaw = fullClientData?.financialYear || '';
              const fy = fyRaw ? `FY-${fyRaw}` : '';
              const assignedName = fullClientData?.assignedTo?.name || '';

              doc.setTextColor(15, 23, 42);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              if (clientName) {
                  doc.text(clientName, marginX, 12);
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              let lineY = 17;
              let categoryLine = '';
              const resolveCategoryMeta = () => {
                  if (clientCategory === 'PWP') {
                      const notes = (fullClientData?.notes || '').toString();
                      const match = notes.match(/PWP Category:\s*([^\|]+)/i);
                      const pwpCat = match?.[1]?.trim();
                      return { label: 'PWP Category', value: pwpCat || 'PWP' };
                  }
                  return { label: 'PIBO Category', value: entityType || 'N/A' };
              };
              const { label: categoryLabel, value: categoryValue } = resolveCategoryMeta();
              if (categoryValue) {
                  categoryLine = `${categoryLabel}: ${categoryValue}`;
              }
              if (fy) {
                  categoryLine = categoryLine ? `${categoryLine}   ${fy}` : fy;
              }
              if (categoryLine) {
                  doc.text(categoryLine, marginX, lineY);
                  lineY += 5;
              }

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.text('Packaging Assessment & Marking or Labelling Report', marginX, lineY);

              const rightX = pageWidth - marginX;
              const auditCompanyName = 'Ananttattva Private Limited';
              let auditorName = assignedName || authUser?.name || authUser?.fullName || authUser?.email || '';
              if (auditorName && auditorName.toLowerCase() === 'admin') {
                  auditorName = assignedName || '';
              }
              const startDate = fullClientData?.auditStartDate ? new Date(fullClientData.auditStartDate) : null;
              const endDate = fullClientData?.auditEndDate ? new Date(fullClientData.auditEndDate) : null;

              const formatDate = (d) => {
                  if (!d || isNaN(d.getTime())) return '';
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
              };

              const startStr = formatDate(startDate);
              const endStr = formatDate(endDate);
              let period = '';
              if (startStr || endStr) {
                  period = `${startStr || 'N/A'} - ${endStr || 'N/A'}`;
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              let rightY = 12;
              doc.text(`Company Name: ${auditCompanyName}`, rightX, rightY, { align: 'right' });
              rightY += 5;
              if (auditorName) {
                  doc.text(`Auditor Name: ${auditorName}`, rightX, rightY, { align: 'right' });
                  rightY += 5;
              }
              if (period) {
                  doc.text(`Audit Period: ${period}`, rightX, rightY, { align: 'right' });
              }

              doc.setDrawColor(209, 213, 219);
              doc.rect(marginX, 32, pageWidth - marginX * 2, 6);
              doc.setFontSize(9);
              doc.setTextColor(75, 85, 99);
              const progressText = totalSkuCount > 0 ? `SKU: ${currentSkuIndex + 1} of ${totalSkuCount}` : '';
              if (progressText) {
                  doc.text(progressText, marginX + 2, 36);
              }
              return 42;
          };

        for (let i = 0; i < skuKeys.length; i++) {
            const skuCode = skuKeys[i];
            const skuRows = grouped[skuCode];

            currentSkuIndex = i;

            if (i > 0) {
                doc.addPage();
              }

              let currentY = drawHeader();

            const firstRow = skuRows[0] || {};
            const detailsBody = [
                ['SKU Code', skuCode],
                ['SKU Description', firstRow.skuDescription || ''],
                ['SKU UOM', firstRow.skuUom || '']
            ];

            const productImageUrls = [];
            skuRows.forEach((r) => {
                const abs = toAbsUrl(r.productImage);
                if (abs && !productImageUrls.includes(abs)) {
                    productImageUrls.push(abs);
                }
            });

            const availableWidth = pageWidth - marginX * 2;
            const leftColumnWidth = productImageUrls.length ? availableWidth * 0.72 : availableWidth;
            const rightColumnWidth = productImageUrls.length ? availableWidth - leftColumnWidth - 4 : 0;

            autoTable(doc, {
                startY: currentY,
                head: [['Field', 'Value']],
                body: detailsBody,
                theme: 'grid',
                margin: {
                    left: marginX,
                    right: productImageUrls.length ? marginX + rightColumnWidth + 4 : marginX
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    textColor: [15, 23, 42],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [249, 115, 22],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 32, textColor: [100, 116, 139] },
                    1: { cellWidth: 'auto' }
                },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    if (data.column.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.column.index === 1 && data.row.index === 0) {
                        data.cell.styles.font = 'courier';
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            const detailsTableTopY = currentY;
            const detailsTableBottomY = doc.lastAutoTable.finalY;

            if (productImageUrls.length) {
                const imageWidth = rightColumnWidth || 0;
                if (imageWidth > 0) {
                    const imageAreaX = pageWidth - marginX - imageWidth;
                    const skuSectionHeight = detailsTableBottomY - detailsTableTopY;
                    const gapsTotal = (productImageUrls.length - 1) * 4;
                    const maxImagesHeight = skuSectionHeight - gapsTotal;

                    if (maxImagesHeight > 0) {
                        const imageHeight = maxImagesHeight / productImageUrls.length;
                        let imageY = detailsTableTopY;
                        const innerPadding = 1;

                        for (let j = 0; j < productImageUrls.length; j++) {
                            const url = productImageUrls[j];
                            const imgMeta = await loadImageForPdf(url);
                            if (!imgMeta) continue;

                            const y = imageY;
                            doc.setDrawColor(209, 213, 219);
                            doc.rect(imageAreaX, y, imageWidth, imageHeight);

                            let format = 'JPEG';
                            const lower = url.toLowerCase();
                            if (lower.endsWith('.png')) format = 'PNG';

                            const boxWidth = imageWidth - innerPadding * 2;
                            const boxHeight = imageHeight - innerPadding * 2;
                            let drawW = boxWidth;
                            let drawH = boxHeight;

                            if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                                const ratio = Math.min(boxWidth / imgMeta.width, boxHeight / imgMeta.height);
                                drawW = imgMeta.width * ratio;
                                drawH = imgMeta.height * ratio;
                            }

                            const offsetX = imageAreaX + innerPadding + (boxWidth - drawW) / 2;
                            const offsetY = y + innerPadding + (boxHeight - drawH) / 2;

                            try {
                                doc.addImage(imgMeta.dataUrl, format, offsetX, offsetY, drawW, drawH);
                            } catch (e) {
                            }

                            imageY += imageHeight + 4;
                        }
                    }
                }
            }

            currentY = detailsTableBottomY + 8;

            const bulletizeCell = (value) => {
                const toItems = (val) => {
                    if (val === null || val === undefined) return [];
                    if (Array.isArray(val)) {
                        return val.flatMap((v) => toItems(v));
                    }
                    const str = val.toString().trim();
                    if (!str) return [];
                    const lines = str.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    const items = [];
                    lines.forEach((line) => {
                        line
                            .split(/\s*(?:\||,|;|\/)\s*/g)
                            .map((p) => p.trim())
                            .filter(Boolean)
                            .forEach((p) => items.push(p));
                    });
                    return items;
                };

                const items = toItems(value);
                if (!items.length) return '- -';
                return items.map((item) => `- ${item}`).join('\n');
            };

            const componentBody = skuRows.map((r, idx) => [
                String(idx + 1),
                bulletizeCell(r.packagingType),
                bulletizeCell(r.componentCode),
                bulletizeCell(r.componentDescription),
                bulletizeCell(r.componentPolymer),
                bulletizeCell(r.supplierName),
                bulletizeCell(r.category),
                bulletizeCell(r.containerCapacity),
                bulletizeCell(r.layerType),
                bulletizeCell(r.thickness),
                bulletizeCell(r.eprRegistrationNumber),
                bulletizeCell(r.rcPercentMentioned),
                bulletizeCell(r.complianceStatus)
            ]);

            const complianceColIndex = 12;

            autoTable(doc, {
                startY: currentY,
                head: [[
                    '#',
                    'Packaging Type',
                    'Component Code',
                    'Component Description',
                    'Component Polymer',
                    'Supplier Name',
                    'Category',
                    'Container Capacity',
                    'Monolayer / Multilayer',
                    'Thickness (Micron)',
                    'EPR Certificate Number',
                    'RC % Mentioned',
                    'Compliance Status'
                ]],
                body: componentBody,
                theme: 'grid',
                margin: { left: marginX, right: marginX },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
                headStyles: { fillColor: [249, 115, 22], textColor: 255 },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    if (data.column.index !== complianceColIndex) return;
                    const raw = (data.cell.raw || '').toString().toLowerCase();
                    if (!raw) return;
                    if (raw.includes('partial')) {
                        data.cell.styles.textColor = [217, 119, 6];
                    } else if (raw.includes('non')) {
                        data.cell.styles.textColor = [220, 38, 38];
                    } else if (raw.includes('complete')) {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            const auditRemarkEntries = skuRows
                .filter((r) => ((r.auditorRemarks ?? '').toString().trim().length > 0))
                .map((r) => ({
                    code: (r.componentCode || '').toString(),
                    description: (r.componentDescription || '').toString(),
                    text: (r.auditorRemarks || '').toString()
                }));

            if (auditRemarkEntries.length) {
                const bottomLimit = pageHeight - marginBottom - 10;
                const srNoColumnWidth = 10;

                if (currentY > bottomLimit) {
                    doc.addPage();
                    currentY = drawHeader();
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(249, 115, 22);
                doc.text('!', marginX, currentY);
                doc.text('Audit Remarks', marginX + 4, currentY);
                currentY += 5;

                let srNo = 1;
                auditRemarkEntries.forEach((entry) => {
                    const srNoText = `${srNo}.`;
                    const textStartX = marginX + srNoColumnWidth;
                    const headerParts = [];

                    if (entry.code) headerParts.push(entry.code);
                    if (entry.description) headerParts.push(`(${entry.description})`);

                    const headerText = headerParts.join(': ') || '';
                    const maxHeaderWidth = pageWidth - textStartX - marginX;
                    const headerLines = headerText
                        ? doc.splitTextToSize(headerText, maxHeaderWidth)
                        : [];

                    const bulletIndent = 2;
                    const bulletSymbolX = textStartX;
                    const bulletTextX = textStartX + bulletIndent;
                    const maxBulletWidth = pageWidth - bulletTextX - marginX;

                    if (currentY > bottomLimit) {
                        doc.addPage();
                        currentY = drawHeader();
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);

                    if (headerLines.length) {
                        headerLines.forEach((line, index) => {
                            if (currentY > bottomLimit) {
                                doc.addPage();
                                currentY = drawHeader();
                            }
                            if (index === 0) {
                                doc.text(srNoText, marginX, currentY);
                            }
                            doc.text(line, textStartX, currentY);
                            currentY += 4;
                        });
                    } else {
                        doc.text(srNoText, marginX, currentY);
                        currentY += 4;
                    }

                    const rawLines = entry.text.split(/\r?\n/);
                    const remarkItems = [];

                    rawLines.forEach((rawLine) => {
                        const parts = rawLine.split(/\s*-\s+/);
                        parts.forEach((part) => {
                            const trimmed = part.trim();
                            if (trimmed.length) {
                                remarkItems.push(trimmed);
                            }
                        });
                    });

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);

                    remarkItems.forEach((remark) => {
                        const bulletLines = doc.splitTextToSize(remark, maxBulletWidth);
                        bulletLines.forEach((line, index) => {
                            if (currentY > bottomLimit) {
                                doc.addPage();
                                currentY = drawHeader();
                                doc.setFont('helvetica', 'normal');
                                doc.setFontSize(8);
                            }
                            if (index === 0) {
                                doc.setTextColor(249, 115, 22);
                                doc.text('â€¢', bulletSymbolX, currentY);
                                doc.setTextColor(75, 85, 99);
                            }
                            doc.text(line, bulletTextX, currentY);
                            currentY += 4;
                        });
                        currentY += 1;
                    });

                    currentY += 3;
                    srNo += 1;
                });

                currentY += 4;
            }

            const imageEntries = [];
            skuRows.forEach((r) => {
                const src = r.componentImage;
                const abs = toAbsUrl(src);
                const code = r.componentCode || '';
                if (abs && !imageEntries.some((e) => e.url === abs && e.code === code)) {
                    imageEntries.push({ url: abs, code });
                }
            });

            if (!imageEntries.length) {
                doc.setFontSize(9);
                doc.setTextColor(107, 114, 128);
                doc.text('No images available for this SKU in Marking & Labelling.', marginX, currentY);
                continue;
            }

            const cols = 4;
            const gapX = 4;
            const usableWidth = pageWidth - marginX * 2;
            const rowsNeeded = Math.ceil(imageEntries.length / cols) || 1;
            const rawWidth = (usableWidth - gapX * (cols - 1)) / cols;
            const imageWidth = rawWidth;
            const maxPerImageHeight = 200;
            const minPerImageHeight = 80;

            const computeMaxHeightPerRow = (startY) => {
                const availableHeightLocal = pageHeight - marginBottom - startY;
                return (availableHeightLocal - (rowsNeeded - 1) * 10) / rowsNeeded;
            };

            let titleY = currentY;
            let maxHeightPerRow = computeMaxHeightPerRow(titleY + 4);
            let imageHeight = Math.min(maxPerImageHeight, maxHeightPerRow);

            if (imageHeight < minPerImageHeight) {
                doc.addPage();
                titleY = drawHeader();
                maxHeightPerRow = computeMaxHeightPerRow(titleY + 4);
                imageHeight = Math.min(maxPerImageHeight, maxHeightPerRow);
            }

            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);
            doc.text('Component Images', marginX, titleY);
            currentY = titleY + 4;

            let colIndex = 0;

            for (let j = 0; j < imageEntries.length; j++) {
                const entry = imageEntries[j];
                const imgMeta = await loadImageForPdf(entry.url);
                if (!imgMeta) continue;

                const x = marginX + colIndex * (imageWidth + gapX);
                doc.setDrawColor(209, 213, 219);
                doc.rect(x, currentY, imageWidth, imageHeight);

                let format = 'JPEG';
                const lower = entry.url.toLowerCase();
                if (lower.endsWith('.png')) format = 'PNG';

                const innerPadding = 1;
                const boxWidth = imageWidth - innerPadding * 2;
                const boxHeight = imageHeight - innerPadding * 2;
                let drawW = boxWidth;
                let drawH = boxHeight;

                if (imgMeta.width && imgMeta.height && imgMeta.width > 0 && imgMeta.height > 0) {
                    const ratio = Math.min(boxWidth / imgMeta.width, boxHeight / imgMeta.height);
                    drawW = imgMeta.width * ratio;
                    drawH = imgMeta.height * ratio;
                }

                const offsetX = x + innerPadding + (boxWidth - drawW) / 2;
                const offsetY = currentY + innerPadding + (boxHeight - drawH) / 2;

                try {
                    doc.addImage(imgMeta.dataUrl, format, offsetX, offsetY, drawW, drawH);
                } catch (e) {
                }

                doc.setFontSize(8);
                doc.setTextColor(55, 65, 81);
                const labelY = currentY + imageHeight + 4;
                doc.text(entry.code || '-', x + imageWidth / 2, labelY, { align: 'center' });

                colIndex += 1;
                if (colIndex >= cols) {
                    colIndex = 0;
                    currentY += imageHeight + 10;
                }
            }
          }

          const baseName = fullClientData?.clientName || 'Client';
          doc.save(`${baseName}_Marking_Labelling_Report.pdf`);
          toast.success('Marking & Labelling report generated');
      } catch (err) {
          toast.error('Failed to generate Marking & Labelling report');
      } finally {
          setLoading(false);
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
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <button onClick={() => navigate('/dashboard/clients')} className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white">
                    <FaArrowLeft />
                  </button>
                  {clientId && formData.clientName && (
                      <div className="hidden md:block text-left px-1">
                          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
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
                                          <span className="text-xs text-gray-500 font-semibold">
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
                  <div className="hidden md:flex items-center gap-4 bg-white px-5 py-2 rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Auditor</p>
                          <p className="text-sm font-bold text-gray-800 leading-tight">{fullClientData.assignedTo.name}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('Audit')}
                        className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary-500 text-primary-600 hover:bg-primary-50 transition-colors text-sm font-medium"
                      >
                        <FaHistory className="text-sm" />
                        History
                      </button>
                  </div>
              )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex">
            {(authUser?.role?.name === 'MANAGER' 
                ? [
                    { id: 'Pre - Validation', icon: FaShieldAlt, label: 'Pre- Audit Check' },
                    { id: 'Audit', icon: FaClipboardCheck, label: 'Onsite Audit' },
                    { id: 'Post -Audit Check', icon: FaCheckDouble, label: 'Post -Audit Check' }
                  ]
                : [
                    { id: 'Client Data', icon: FaUser, label: 'Client Data' },
                    { id: 'Pre - Validation', icon: FaShieldAlt, label: 'Pre- Audit Check' },
                    { id: 'Audit', icon: FaClipboardCheck, label: 'Onsite Audit' },
                    { id: 'Post -Audit Check', icon: FaCheckDouble, label: 'Post -Audit Check' }
                  ]
            ).map((tab) => {
                let isLocked = false;
                if (tab.id === 'Pre - Validation') isLocked = !isPreValidationUnlocked;
                if (tab.id === 'Audit') isLocked = !isPreValidationComplete;
                if (tab.id === 'Post -Audit Check') isLocked = !isAuditComplete;

                const isActive = activeTab === tab.id;
                
                // If the tab is active, it cannot be locked
                if (isActive) isLocked = false;
                
                let isTabComplete = false;
                if (tab.id === 'Client Data') {
                    isTabComplete = isPreValidationUnlocked;
                } else if (tab.id === 'Pre - Validation') {
                    isTabComplete = isPreValidationComplete;
                } else if (tab.id === 'Audit') {
                    isTabComplete = isAuditComplete;
                }
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => !isLocked && setActiveTab(tab.id)}
                        disabled={isLocked}
                        className={`
                            group relative flex-1 flex items-center justify-between gap-4 px-7 py-5 text-sm md:text-base font-semibold transition-all duration-300 min-w-[200px] min-h-[88px]
                            ${isActive 
                                ? 'bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200'
                                : isTabComplete
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : isLocked
                                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:shadow-sm'
                            }
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <div
                              className={`flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border text-base md:text-lg transition-all duration-300 ${
                                isActive
                                  ? 'border-primary-500 bg-primary-500 text-white'
                                  : isTabComplete
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : isLocked
                                      ? 'border-gray-300 bg-gray-100 text-gray-400'
                                      : 'border-gray-300 bg-white text-gray-500 group-hover:border-primary-400 group-hover:text-primary-500'
                              }`}
                            >
                              <tab.icon className="text-lg md:text-xl" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className={`text-sm md:text-[15px] font-semibold tracking-tight ${
                                isActive || isTabComplete ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {tab.label}
                              </span>
                              <span className="text-[11px] md:text-xs font-normal text-gray-400">
                                {tab.id === 'Client Data' && 'Basic details & documents'}
                                {tab.id === 'Pre - Validation' && 'Pre-audit checks'}
                                {tab.id === 'Audit' && 'Onsite audit workflow'}
                                {tab.id === 'Post -Audit Check' && 'Post-audit actions'}
                              </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isTabComplete && <FaCheckCircle className="text-base text-emerald-600" />}
                          {isLocked && <FaLock className="text-xs text-gray-400" />}
                        </div>
                        <div
                          className={`pointer-events-none absolute inset-x-4 bottom-0 h-1.5 rounded-full transition-all duration-300 ${
                            isActive
                              ? 'bg-primary-500'
                              : isTabComplete
                                ? 'bg-emerald-500'
                                : 'bg-transparent'
                          }`}
                        />
                    </button>
                );
            })}
          </div>
          </div>
        </div>

        <div className="mt-4 space-y-6">

        {activeTab === 'Client Data' ? (
            <>
        {/* Secondary Tabs (Replaces Stepper) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
             <div className="border-b border-gray-200 px-6 py-4 bg-white">
                 <div className="flex w-full space-x-1 bg-gray-100 p-1 rounded-lg">
                    {steps.map((step) => (
                        <button
                            key={step.number}
                            onClick={() => {
                                if (step.number <= completedStep + 1) {
                                    setCurrentStep(step.number);
                                }
                            }}
                            disabled={step.number > completedStep + 1}
                            className={`
                                flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
                                ${currentStep === step.number
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : step.number > completedStep + 1
                                        ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }
                            `}
                        >
                            {step.title}
                            {step.number <= completedStep && (
                                <FaCheckCircle className="inline ml-2 text-green-500" />
                            )}
                        </button>
                    ))}
                 </div>
            </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit}>
                {currentStep === 1 && (
                    <div className="space-y-8 animate-fadeIn">
                        {clientId && isViewMode && (
                            <div className="rounded-xl border border-gray-200 bg-white">
                                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                                    <span className="font-semibold text-gray-700 flex items-center gap-2">
                                        <FaFileContract className="text-primary-600" />
                                        Overview
                                    </span>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                                        <div className="flex">
                                            <span className="w-48 text-gray-600 font-medium">Client Name:</span>
                                            <span className="text-gray-900">{formData.clientName || 'N/A'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-48 text-gray-600 font-medium">Trade Name:</span>
                                            <span className="text-gray-900">{formData.tradeName || 'N/A'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-48 text-gray-600 font-medium">Company Group Name:</span>
                                            <span className="text-gray-900">{formData.companyGroupName || 'N/A'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-48 text-gray-600 font-medium">Entity Type:</span>
                                            <span className="text-gray-900">{formData.entityType || 'N/A'}</span>
                                        </div>
                                        {isPwp && (
                                            <>
                                                <div className="flex">
                                                    <span className="w-48 text-gray-600 font-medium">PWP Category:</span>
                                                    <span className="text-gray-900">{formData.pwpCategory || 'N/A'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span className="w-48 text-gray-600 font-medium">Registration Status:</span>
                                                    <span className="text-gray-900">{formData.registrationStatus || 'N/A'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 text-primary-700">
                                            Authorised Person Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Name:</span>
                                                <span className="text-gray-900">{formData.authorisedPersonName || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                                                <span className="text-gray-900">{formData.authorisedPersonNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Email:</span>
                                                <span className="text-gray-900">{formData.authorisedPersonEmail || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 text-primary-700">
                                            Coordinating Person Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Name:</span>
                                                <span className="text-gray-900">{formData.coordinatingPersonName || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                                                <span className="text-gray-900">{formData.coordinatingPersonNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-48 text-gray-600 font-medium">Email:</span>
                                                <span className="text-gray-900">{formData.coordinatingPersonEmail || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {(!clientId || !isViewMode) && (
                        <>
                        {/* Company Details Section */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaBuilding className="text-primary-600" />
                                Company Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Client Legal Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaGavel className="text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="clientName" 
                                            value={formData.clientName} 
                                            onChange={handleChange} 
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400" 
                                            placeholder="Enter legal name"
                                            required 
                                        />
                                    </div>
                                </div>
                                {isPwp && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Name</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    name="unitName" 
                                                    value={formData.unitName} 
                                                    onChange={handleChange} 
                                                    className="w-full pl-3 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400"
                                                    placeholder="Enter Unit Name"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                                            <div className="relative">
                                                <select
                                                    name="facilityState"
                                                    value={formData.facilityState}
                                                    onChange={handleChange}
                                                    className="w-full pl-3 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400 appearance-none"
                                                >
                                                    <option value="">Select State</option>
                                                    {Object.keys(indianStatesCities).map(st => (
                                                        <option key={st} value={st}>{st}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <FaChevronDown className="text-gray-400 text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Status</label>
                                            <div className="relative">
                                                <select
                                                    name="registrationStatus"
                                                    value={formData.registrationStatus}
                                                    onChange={handleChange}
                                                    className="w-full pl-3 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400 appearance-none"
                                                >
                                                    <option value="">Select Status</option>
                                                    <option value="Registered">Registered</option>
                                                    <option value="Unregistered">Unregistered</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <FaChevronDown className="text-gray-400 text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Trade Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaTrademark className="text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="tradeName" 
                                            value={formData.tradeName} 
                                            onChange={handleChange} 
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400" 
                                            placeholder="Enter trade name"
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company Group Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaLayerGroup className="text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="companyGroupName" 
                                            value={formData.companyGroupName} 
                                            onChange={handleChange} 
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400" 
                                            placeholder="Enter group name"
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Financial Year <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaCalendarAlt className="text-gray-400" />
                                        </div>
                                        <select 
                                            name="financialYear" 
                                            value={formData.financialYear} 
                                            onChange={handleChange} 
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400 appearance-none"
                                            required
                                        >
                                            <option value="">Select Year</option>
                                            <option value="2023-24">2023-24</option>
                                            <option value="2024-25">2024-25</option>
                                            <option value="2025-26">2025-26</option>
                                            <option value="2026-27">2026-27</option>
                                            <option value="2027-28">2027-28</option>
                                            <option value="2028-29">2028-29</option>
                                            <option value="2029-30">2029-30</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <FaChevronDown className="text-gray-400 text-xs" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {isPwp ? 'PWP Category' : 'PIBO Category'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaIndustry className="text-gray-400" />
                                        </div>
                                        {isPwp ? (
                                            <select
                                                name="pwpCategory"
                                                value={formData.pwpCategory}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400 appearance-none"
                                            >
                                                <option value="">Select PWP Category</option>
                                                <option value="PWP Recycler">PWP Recycler</option>
                                                <option value="Industrial Composting">Industrial Composting</option>
                                                <option value="Cement Co processing">Cement Co processing</option>
                                                <option value="Waste to oil">Waste to oil</option>
                                                <option value="Waste to energy">Waste to energy</option>
                                            </select>
                                        ) : (
                                            <select 
                                                name="entityType" 
                                                value={formData.entityType} 
                                                onChange={handleChange} 
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:border-gray-400 appearance-none"
                                            >
                                                <option value="Producer">Producer</option>
                                                <option value="Importer">Importer</option>
                                                <option value="Brand Owner">Brand Owner</option>
                                                <option value="Manufacturer">Manufacturer</option>
                                            </select>
                                        )}
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <FaChevronDown className="text-gray-400 text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Authorised Person Section */}
                            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FaUserShield />
                                    </div>
                                    Authorised Person
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaUser className="text-gray-400" />
                                            </div>
                                            <input type="text" name="authorisedPersonName" value={formData.authorisedPersonName} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Name" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaPhone className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="authorisedPersonNumber"
                                                value={formData.authorisedPersonNumber}
                                                onChange={handleChange}
                                                maxLength={10}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="10-digit mobile number"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaEnvelope className="text-gray-400" />
                                            </div>
                                            <input type="email" name="authorisedPersonEmail" value={formData.authorisedPersonEmail} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="email@company.com" required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coordinating Person Section */}
                            <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <FaUserTie />
                                    </div>
                                    Coordinating Person
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaUser className="text-gray-400" />
                                            </div>
                                            <input type="text" name="coordinatingPersonName" value={formData.coordinatingPersonName} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" placeholder="Name" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaPhone className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="coordinatingPersonNumber"
                                                value={formData.coordinatingPersonNumber}
                                                onChange={handleChange}
                                                maxLength={10}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                placeholder="10-digit mobile number"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FaEnvelope className="text-gray-400" />
                                            </div>
                                            <input type="email" name="coordinatingPersonEmail" value={formData.coordinatingPersonEmail} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" placeholder="email@company.com" required />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}

                {currentStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                         <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Registered Office Address</h3>
                         <div className="grid grid-cols-1 gap-4">
                             <input type="text" name="roAddress1" placeholder="Address Line 1" value={formData.roAddress1} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                             <input type="text" name="roAddress2" placeholder="Address Line 2" value={formData.roAddress2} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                             <input type="text" name="roAddress3" placeholder="Address Line 3" value={formData.roAddress3} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                         </div>
                         <div className="grid grid-cols-3 gap-6">
                             <select name="roState" value={formData.roState} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                 <option value="">Select State</option>
                                 {Object.keys(indianStatesCities).map((state) => (
                                     <option key={state} value={state}>{state}</option>
                                 ))}
                             </select>
                             <select name="roCity" value={formData.roCity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required disabled={!formData.roState}>
                                 <option value="">Select City</option>
                                 {formData.roState && indianStatesCities[formData.roState]?.map((city) => (
                                     <option key={city} value={city}>{city}</option>
                                 ))}
                             </select>
                             <input type="text" name="roPincode" placeholder="Pincode" value={formData.roPincode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                         </div>

                         <div className="flex items-center justify-between border-b pb-2 pt-4">
                             <h3 className="text-xl font-bold text-gray-800">Communication Office Address</h3>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input type="checkbox" name="coSameAsRegistered" checked={formData.coSameAsRegistered} onChange={handleChange} className="rounded text-primary-600 focus:ring-primary-500" />
                                 <span className="text-sm text-gray-700">Same as Registered</span>
                             </label>
                         </div>
                         {!formData.coSameAsRegistered && (
                             <>
                                <div className="grid grid-cols-1 gap-4">
                                    <input type="text" name="coAddress1" placeholder="Address Line 1" value={formData.coAddress1} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                                    <input type="text" name="coAddress2" placeholder="Address Line 2" value={formData.coAddress2} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                    <input type="text" name="coAddress3" placeholder="Address Line 3" value={formData.coAddress3} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <select name="coState" value={formData.coState} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                        <option value="">Select State</option>
                                        {Object.keys(indianStatesCities).map((state) => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                    <select name="coCity" value={formData.coCity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required disabled={!formData.coState}>
                                        <option value="">Select City</option>
                                        {formData.coState && indianStatesCities[formData.coState]?.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                    <input type="text" name="coPincode" placeholder="Pincode" value={formData.coPincode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                                </div>
                             </>
                         )}
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Company Documents</h3>
                        
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
                                    {[
                                        { label: 'GST Certificate', key: 'gst' },
                                        { label: 'CIN Document', key: 'cin' },
                                        { label: 'PAN Card', key: 'pan' },
                                        { label: 'Factory License', key: 'factoryLicense' },
                                        { label: 'EPR Certificate', key: 'eprCertificate' },
                                        { label: 'IEC Certificate', key: 'iecCertificate' },
                                        { label: 'DIC/DCSSI Certificate', key: 'dicDcssiCertificate' }
                                    ].map((doc) => (
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
                                                        <a 
                                                            href={formData[`${doc.key}FilePath`]} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary-600 hover:underline text-xs flex items-center gap-1 mt-1"
                                                        >
                                                            <FaFileContract /> View Existing
                                                        </a>
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
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <FaCheckCircle className="text-xs" />
                                                        <span className="text-xs">{record.certificateFile.name}</span>
                                                    </div>
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
                    </div>
                )}

                {currentStep === 4 && (
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
                        
                        {/* Removed duplicate Compliance Contact Persons section as it is now in the table */}
                    </div>
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
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                 {clientId ? (
                    <ClientValidation 
                        clientId={clientId} 
                        embedded={true} 
                        onComplete={() => {
                            setIsPreValidationComplete(true);
                            setActiveTab('Audit');
                        }}
                    />
                 ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <FaShieldAlt className="text-gray-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Pre- Audit Check Unavailable</h3>
                        <p className="text-gray-500 mt-2">Please submit the client data first to access pre-validation.</p>
                        <button 
                            onClick={() => { setActiveTab('Client Data'); setCurrentStep(1); }}
                            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Go to Client Data
                        </button>
                    </div>
                 )}
             </div>
        ) : activeTab === 'Audit' ? (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                 {clientId ? (
                    <ClientDetail 
                        clientId={clientId} 
                        embedded={true} 
                        initialViewMode="process"
                        onAuditComplete={() => {
                            setIsAuditComplete(true);
                            setActiveTab('Post -Audit Check');
                        }}
                    />
                 ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <FaClipboardCheck className="text-gray-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Onsite Audit Unavailable</h3>
                        <p className="text-gray-500 mt-2">Please save the client data first to access onsite audit.</p>
                    </div>
                 )}
             </div>
        ) : activeTab === 'Post -Audit Check' ? (
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
                            <div className="w-full rounded-2xl border border-gray-200 bg-gray-100 p-1">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-1">
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
                                </div>
                            </div>
                        </div>
                        <div>
                            {postValidationActiveTab === 'markingLabelling' && (
                                <div className="border border-gray-200 rounded-xl bg-white p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-left">
                                            <p className="text-gray-800 font-semibold">Packaging Assessment &amp; Marking or Labelling</p>
                                            <p className="text-gray-500 text-xs">Data is fetched from Product Compliance and Component Details.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleMarkingLabellingReport}
                                                disabled={loading || !postValidationData.length}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                <FaFilePdf /> Download Report
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table
                                            dataSource={paginatedPostValidationData}
                                            columns={postValidationColumns}
                                            rowKey="key"
                                            size="small"
                                            pagination={false}
                                            scroll={{ x: 1200, y: 420 }}
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
                                                let filtered = skuComplianceData || [];
                                                if (skuSearchText) {
                                                    const search = skuSearchText.toLowerCase();
                                                    filtered = filtered.filter(r => 
                                                        (r.skuCode || '').toLowerCase().includes(search) ||
                                                        (r.skuDescription || '').toLowerCase().includes(search)
                                                    );
                                                }
                                                if (skuStatusFilter !== 'all') {
                                                    if (skuStatusFilter === 'notset') {
                                                        filtered = filtered.filter(r => !r.complianceStatus);
                                                    } else {
                                                        filtered = filtered.filter(r => r.complianceStatus === skuStatusFilter);
                                                    }
                                                }
                                                return filtered;
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
                                                    const polymerSummary = buildPolymerProcurementSummary(
                                                        monthlyProcurementRaw,
                                                        monthlyProcurementFilters
                                                    );
                                                    const categorySummary = buildCategoryProcurementSummary(
                                                        monthlyProcurementRaw,
                                                        monthlyProcurementFilters
                                                    );

                                                    if (!polymerSummary.length && !categorySummary.length) {
                                                        return (
                                                            <div className="text-xs text-gray-500">
                                                                No polymer/category-wise procurement data available.
                                                            </div>
                                                        );
                                                    }

                                                    const maxPolymerValue = polymerSummary.reduce((max, item) => {
                                                        const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                        const recycled = Number(item.recycledQty) || 0;
                                                        const total = purchase + recycled;
                                                        return total > max ? total : max;
                                                    }, 0);

                                                    const maxCategoryValue = categorySummary.reduce((max, item) => {
                                                        const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                        const recycled = Number(item.recycledQty) || 0;
                                                        const total = purchase + recycled;
                                                        return total > max ? total : max;
                                                    }, 0);

                                                    return (
                                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                                                    Polymer-wise Procurement (Stacked)
                                                                </p>
                                                                {polymerSummary.length === 0 || !maxPolymerValue ? (
                                                                    <div className="text-xs text-gray-500">
                                                                        Polymer-wise procurement values are zero or unavailable.
                                                                    </div>
                                                                ) : (
                                                                    <div className="overflow-x-auto">
                                                                        <div className="min-w-[320px] max-w-xl mx-auto px-2 pt-4">
                                                                            {(() => {
                                                                                const step = maxPolymerValue / 4;
                                                                                const gridValues = [0, step, step * 2, step * 3, maxPolymerValue];

                                                                                return (
                                                                                    <div className="relative h-96 w-full bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                                                                                        {/* Grid Lines */}
                                                                                        <div className="absolute inset-0 left-10 right-2 top-28 bottom-8 flex flex-col justify-between pointer-events-none">
                                                                                            {[...gridValues].reverse().map((val, i) => (
                                                                                                <div key={i} className="relative w-full h-px bg-gray-100 border-t border-dashed border-gray-200">
                                                                                                    <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] text-gray-400 font-medium">
                                                                                                        {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>

                                                                                        {/* Bars */}
                                                                                        <div className="absolute inset-0 left-10 right-2 top-28 bottom-8 flex items-end justify-around gap-2 px-1">
                                                                                            {polymerSummary.map((item) => {
                                                                                                const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                                                                const recycled = Number(item.recycledQty) || 0;
                                                                                                const total = purchase + recycled;
                                                                                                const totalHeight = total && maxPolymerValue
                                                                                                    ? (total / maxPolymerValue) * 100
                                                                                                    : 0;
                                                                                                const purchaseHeight = total ? (purchase / total) * 100 : 0;
                                                                                                const recycledHeight = total ? (recycled / total) * 100 : 0;

                                                                                                return (
                                                                                                    <div
                                                                                                        key={item.polymer}
                                                                                                        className="group relative flex flex-col justify-end w-full max-w-[40px] h-full"
                                                                                                    >
                                                                                                        {/* Tooltip */}
                                                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 shadow-xl translate-y-2 group-hover:translate-y-0">
                                                                                                            <div className="font-bold text-xs border-b border-gray-700 pb-1 mb-1 text-gray-100">{item.polymer}</div>
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
                                                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                                                        </div>

                                                                                                        {/* Stacked Bar */}
                                                                                                        <div 
                                                                                                            className="w-full rounded-t overflow-hidden transition-all duration-300 hover:brightness-110 shadow-sm relative group-hover:shadow-md cursor-pointer"
                                                                                                            style={{ height: `${totalHeight}%` }}
                                                                                                        >
                                                                                                            <div 
                                                                                                                className="w-full bg-gradient-to-b from-green-400 to-green-500"
                                                                                                                style={{ height: `${recycledHeight}%` }}
                                                                                                            ></div>
                                                                                                            <div 
                                                                                                                className="w-full bg-gradient-to-b from-orange-400 to-orange-500"
                                                                                                                style={{ height: `${purchaseHeight}%` }}
                                                                                                            ></div>
                                                                                                        </div>

                                                                                                        {/* X-Axis Label */}
                                                                                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center group-hover:text-gray-800 transition-colors">
                                                                                                            {item.polymer}
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
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                                                    Category-wise Procurement (Stacked)
                                                                </p>
                                                                {categorySummary.length === 0 || !maxCategoryValue ? (
                                                                    <div className="text-xs text-gray-500">
                                                                        Category-wise procurement values are zero or unavailable.
                                                                    </div>
                                                                ) : (
                                                                    <div className="overflow-x-auto">
                                                                        <div className="min-w-[320px] max-w-xl mx-auto px-2 pt-4">
                                                                            {(() => {
                                                                                const step = maxCategoryValue / 4;
                                                                                const gridValues = [0, step, step * 2, step * 3, maxCategoryValue];

                                                                                return (
                                                                                    <div className="relative h-96 w-full bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                                                                                        {/* Grid Lines */}
                                                                                        <div className="absolute inset-0 left-10 right-2 top-28 bottom-8 flex flex-col justify-between pointer-events-none">
                                                                                            {[...gridValues].reverse().map((val, i) => (
                                                                                                <div key={i} className="relative w-full h-px bg-gray-100 border-t border-dashed border-gray-200">
                                                                                                    <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] text-gray-400 font-medium">
                                                                                                        {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>

                                                                                        {/* Bars */}
                                                                                        <div className="absolute inset-0 left-10 right-2 top-28 bottom-8 flex items-end justify-around gap-2 px-1">
                                                                                            {categorySummary.map((item) => {
                                                                                                const purchase = Number(item.monthlyPurchaseMt) || 0;
                                                                                                const recycled = Number(item.recycledQty) || 0;
                                                                                                const total = purchase + recycled;
                                                                                                const totalHeight = total && maxCategoryValue
                                                                                                    ? (total / maxCategoryValue) * 100
                                                                                                    : 0;
                                                                                                const purchaseHeight = total ? (purchase / total) * 100 : 0;
                                                                                                const recycledHeight = total ? (recycled / total) * 100 : 0;

                                                                                                return (
                                                                                                    <div
                                                                                                        key={item.category}
                                                                                                        className="group relative flex flex-col justify-end w-full max-w-[40px] h-full"
                                                                                                    >
                                                                                                        {/* Tooltip */}
                                                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 shadow-xl translate-y-2 group-hover:translate-y-0">
                                                                                                            <div className="font-bold text-xs border-b border-gray-700 pb-1 mb-1 text-gray-100">{item.category}</div>
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
                                                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                                                        </div>

                                                                                                        {/* Stacked Bar */}
                                                                                                        <div 
                                                                                                            className="w-full rounded-t overflow-hidden transition-all duration-300 hover:brightness-110 shadow-sm relative group-hover:shadow-md cursor-pointer"
                                                                                                            style={{ height: `${totalHeight}%` }}
                                                                                                        >
                                                                                                            <div 
                                                                                                                className="w-full bg-gradient-to-b from-green-400 to-green-500"
                                                                                                                style={{ height: `${recycledHeight}%` }}
                                                                                                            ></div>
                                                                                                            <div 
                                                                                                                className="w-full bg-gradient-to-b from-orange-400 to-orange-500"
                                                                                                                style={{ height: `${purchaseHeight}%` }}
                                                                                                            ></div>
                                                                                                        </div>

                                                                                                        {/* X-Axis Label */}
                                                                                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center group-hover:text-gray-800 transition-colors">
                                                                                                            {item.category}
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
                                                    value={urepSelectedYear}
                                                    disabled
                                                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                                >
                                                    {urepYearOptions.map((year) => (
                                                        <option key={year} value={year}>
                                                            {year}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
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
                                                                            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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
                                                const categorySummary = buildCategoryProcurementSummary(
                                                    monthlyProcurementRaw,
                                                    monthlyProcurementFilters
                                                );
                                                const summaryByCategory = new Map();
                                                categorySummary.forEach((item) => {
                                                    summaryByCategory.set(item.category, item);
                                                });
                                                if (!categorySummary.length) {
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
                                <div className="border border-gray-200 rounded-xl bg-white p-6">
                                    <div className="text-center py-12">
                                        <div className="bg-orange-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                            <FaChartLine className="text-orange-500 text-2xl" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Cost Analysis</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Detailed cost analysis and financial metrics will be displayed here.
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
             </div>
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

export default AddClient;

