import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Table, Image, Select } from 'antd';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { 
  FaChevronDown,
  FaUser,
  FaMapMarkerAlt,
  FaIdCard,
  FaIndustry,
  FaListAlt,
  FaFileContract,
  FaFile,
  FaEye,
  FaDownload,
  FaFolderOpen,
  FaBuilding,
  FaCheckCircle,
  FaClipboardCheck,
  FaFilePdf,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaUserTie,
  FaRecycle,
  FaBolt,
  FaOilCan,
  FaCarSide,
  FaBatteryFull,
  FaSpinner
} from 'react-icons/fa';
import AuditStepper from '../components/AuditStepper';
import DocumentViewerModal from '../components/DocumentViewerModal';
import { 
  ArrowLeftOutlined, 
  CalendarOutlined, 
  AuditOutlined, 
  EditOutlined 
} from '@ant-design/icons';

import PlantProcess from './PlantProcess';
import EWasteProcess from '../features/ewaste/pages/EWasteProcess';
import MarkingLabeling from '../components/PlantProcessSteps/MarkingLabeling';
import Analysis from '../components/PlantProcessSteps/Analysis';
import SalesAnalysis from '../components/PlantProcessSteps/SalesAnalysis';
import PurchaseAnalysis from '../components/PlantProcessSteps/PurchaseAnalysis';

import { ClientProvider } from '../context/ClientContext';

const WASTE_THEME = {
  'Plastic Waste': { color: '#059669', bg: '#ecfdf5', icon: FaRecycle },
  'E-Waste': { color: '#7c3aed', bg: '#f5f3ff', icon: FaBolt },
  'Battery Waste': { color: '#dc2626', bg: '#fef2f2', icon: FaBatteryFull },
  'ELV': { color: '#0284c7', bg: '#f0f9ff', icon: FaCarSide },
  'Used Oil': { color: '#b45309', bg: '#fffbeb', icon: FaOilCan },
};

const ClientDetail = ({ clientId, embedded = false, initialViewMode, onAuditComplete }) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const derivedId =
    clientId ||
    (initialViewMode === 'client-connect' && location.state?.clientId) ||
    paramId;
  const id = derivedId;
  const isProcessMode = initialViewMode === 'process' || location.state?.viewMode === 'process';
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(isProcessMode ? 4 : 1);
  const [expandedSections, setExpandedSections] = useState(
    initialViewMode === 'client-connect'
      ? {
          'overview-section': true,
          'address-section': true,
          'documents-section': true,
          'cte-cto-section': true,
        }
      : {}
  );
  const [clientDataOpen, setClientDataOpen] = useState(true);
  const [clientConnectTab, setClientConnectTab] = useState('overview');

  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');

  const [embeddedAuditTarget, setEmbeddedAuditTarget] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [summaryProductRows, setSummaryProductRows] = useState([]);
  const [summaryMonthlyRows, setSummaryMonthlyRows] = useState([]);
  const [summarySupplierRows, setSummarySupplierRows] = useState([]);
  const [summaryComponentRows, setSummaryComponentRows] = useState([]);
  const [summaryRecycledRows, setSummaryRecycledRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedIndustryCategory, setSelectedIndustryCategory] = useState('All');
  const [selectedComplianceStatus, setSelectedComplianceStatus] = useState('All');
  const isProducerEntity = (client?.entityType || '').toString().toLowerCase().includes('producer');

  const { type, itemId } = useMemo(() => {
    if (!client) return { type: null, itemId: null };
    const ctoList = client.productionFacility?.ctoDetailsList || [];
    const cteList = client.productionFacility?.cteDetailsList || [];
    const primary = ctoList[0] || cteList[0];
    const computedType = primary ? (primary.type || (ctoList[0] === primary ? 'CTO' : 'CTE')) : null;
    const computedItemId = primary?._id;
    return { type: computedType, itemId: computedItemId };
  }, [client]);

  const toggleSection = (plantKey, section) => {
    const key = `${plantKey}-${section}`;
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePlantCard = (plantKey) => {
    const key = `${plantKey}-plant`;
    setExpandedSections(prev => {
      const current = prev[key];
      const currentValue = typeof current === 'boolean' ? current : true;
      return { ...prev, [key]: !currentValue };
    });
  };

  const skuTableData = useMemo(() => {
    const productRows = summaryProductRows || [];
    const monthlyRows = summaryMonthlyRows || [];
    const supplierRows = summarySupplierRows || [];
    const componentRows = summaryComponentRows || [];
    const recycledRows = summaryRecycledRows || [];

    const groupedBySku = new Map();

    productRows.forEach(product => {
      const skuCode = (product.skuCode || '').trim();
      if (!skuCode) return;

      if (!groupedBySku.has(skuCode)) {
        groupedBySku.set(skuCode, {
          skuCode,
          skuDescription: product.skuDescription || '-',
          industryCategory: product.industryCategory || '-',
          productImage: product.productImage,
          componentCodes: new Set(),
          products: [],
        });
      }

      const group = groupedBySku.get(skuCode);
      group.products.push(product);

      if (product.componentCode) {
        group.componentCodes.add((product.componentCode || '').trim());
      }
    });

    return Array.from(groupedBySku.values()).map((group, index) => {
      const { skuCode, skuDescription, industryCategory, productImage, componentCodes, products } = group;

      let details = [];

      componentCodes.forEach(compCode => {
        const procurementRecords = monthlyRows.filter(m => (m.componentCode || '').trim() === compCode);
        const matchingRecycledRows = recycledRows.filter(r => (r.componentCode || '').trim() === compCode);

        if (procurementRecords.length > 0) {
          const procDetails = procurementRecords.map((procurement, idx) => {
            const componentRow =
              componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
            const supplierRow =
              supplierRows.find(
                s =>
                  (s.componentCode || '').trim() === compCode &&
                  (s.supplierName || '').trim().toLowerCase() ===
                    (procurement.supplierName || '').trim().toLowerCase()
              ) || {};

            const productRow =
              products.find(p => (p.componentCode || '').trim() === compCode) || {};

            const recycledRow =
              matchingRecycledRows.find(
                r =>
                  (r.supplierName || '').trim().toLowerCase() ===
                  (procurement.supplierName || '').trim().toLowerCase()
              ) || matchingRecycledRows[0] || {};

            return {
              key: `${skuCode}-${compCode}-${idx}`,
              skuCode,
              componentCode: compCode,
              componentImage: productRow.componentImage,
              componentDescription:
                componentRow.componentDescription ||
                procurement.componentDescription ||
                productRow.componentDescription ||
                '-',
              supplierName: procurement.supplierName || '-',
              supplierStatus: supplierRow.supplierStatus || '-',
              eprCertificateNumber: supplierRow.eprCertificateNumber || '-',
              polymerType: componentRow.polymerType || procurement.polymerType || '-',
              componentPolymer:
                componentRow.componentPolymer || procurement.componentPolymer || '-',
              category: componentRow.category || procurement.category || '-',
              categoryIIType: componentRow.categoryIIType || '-',
              containerCapacity: componentRow.containerCapacity || '-',
              layerType: componentRow.layerType || '-',
              thickness: componentRow.thickness || '-',
              monthlyPurchaseMt: procurement.monthlyPurchaseMt || '0',
              recycledPercent:
                recycledRow.usedRecycledPercent || procurement.recycledPercent || '0',
              recycledQty: recycledRow.usedRecycledQtyMt || procurement.recycledQty || '0',
              recycledAmount: procurement.recycledQrtAmount || '0',
              virginQty: procurement.virginQty || '0',
              virginAmount: procurement.virginQtyAmount || '0',
              componentComplianceStatus:
                productRow.componentComplianceStatus || productRow.complianceStatus || '',
              auditorRemarks: productRow.auditorRemarks || '',
              additionalDocument: productRow.additionalDocument,
              managerRemarks: productRow.managerRemarks || '',
            };
          });
          details.push(...procDetails);
        } else {
          const componentRow =
            componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
          const productRow =
            products.find(p => (p.componentCode || '').trim() === compCode) || {};

          const totalRecycledQtyForComp = matchingRecycledRows.reduce(
            (sum, r) => sum + (parseFloat(r.usedRecycledQtyMt) || 0),
            0
          );
          const recycledPercentForComp =
            matchingRecycledRows.find(r => parseFloat(r.usedRecycledPercent) > 0)
              ?.usedRecycledPercent || '0';

          details.push({
            key: `${skuCode}-${compCode}-stub`,
            skuCode,
            componentCode: compCode,
            componentImage: productRow.componentImage,
            componentDescription:
              componentRow.componentDescription || productRow.componentDescription || '-',
            supplierName: '-',
            supplierStatus: '-',
            eprCertificateNumber: '-',
            polymerType: componentRow.polymerType || '-',
            componentPolymer: componentRow.componentPolymer || '-',
            category: componentRow.category || '-',
            categoryIIType: componentRow.categoryIIType || '-',
            containerCapacity: componentRow.containerCapacity || '-',
            layerType: componentRow.layerType || '-',
            thickness: componentRow.thickness || '-',
            monthlyPurchaseMt: '0',
            recycledPercent: recycledPercentForComp,
            recycledQty: totalRecycledQtyForComp.toFixed(3),
            recycledAmount: '0',
            virginQty: '0',
            virginAmount: '0',
            componentComplianceStatus:
              productRow.componentComplianceStatus || productRow.complianceStatus || '',
            auditorRemarks: productRow.auditorRemarks || '',
            additionalDocument: productRow.additionalDocument,
            managerRemarks: productRow.managerRemarks || '',
          });
        }
      });

      let totalRecycledQty = 0;
      let totalRecycledAmount = 0;
      let totalVirginQty = 0;
      let totalVirginAmount = 0;
      let recycledPercent = 0;

      details.forEach(d => {
        totalRecycledQty += parseFloat(d.recycledQty) || 0;
        totalRecycledAmount += parseFloat(d.recycledAmount) || 0;
        totalVirginQty += parseFloat(d.virginQty) || 0;
        totalVirginAmount += parseFloat(d.virginAmount) || 0;
      });

      if (totalVirginQty + totalRecycledQty > 0) {
        recycledPercent = (
          (totalRecycledQty / (totalVirginQty + totalRecycledQty)) *
          100
        ).toFixed(2);
      }

      const firstProduct = products[0] || {};

      const isAnyNonCompliant = details.some(
        d => d.componentComplianceStatus === 'Non-Compliant'
      );
      const hasAnyStatus = details.some(
        d => d.componentComplianceStatus && d.componentComplianceStatus !== 'Select'
      );

      const derivedProductStatus = isAnyNonCompliant
        ? 'Non-Compliant'
        : hasAnyStatus
        ? 'Compliant'
        : '';

      return {
        key: index,
        skuCode,
        skuDescription,
        industryCategory,
        productImage,
        recycledQty: totalRecycledQty.toFixed(3),
        recycledAmount: totalRecycledAmount.toFixed(2),
        recycledPercent: `${recycledPercent}%`,
        virginQty: totalVirginQty.toFixed(3),
        virginAmount: totalVirginAmount.toFixed(2),
        details: details,
        productComplianceStatus: derivedProductStatus,
        computedRemarks: details.map(d => d.auditorRemarks).filter(Boolean).join('\n'),
        clientRemarks: firstProduct.clientRemarks || '',
        additionalDocument: firstProduct.additionalDocument,
        managerRemarks: firstProduct.managerRemarks || '',
      };
    });
  }, [summaryProductRows, summaryMonthlyRows, summarySupplierRows, summaryComponentRows, summaryRecycledRows]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchClientDetails(signal);

    return () => {
      controller.abort();
    };
  }, [derivedId, location.key]); // Refetch when location key changes (navigation back)

  useEffect(() => {
    if (!client || initialViewMode !== 'client-connect') return;

    if (!type || !itemId || !id) {
      setSummaryProductRows([]);
      setSummaryMonthlyRows([]);
      setSummarySupplierRows([]);
      setSummaryComponentRows([]);
      setSummaryRecycledRows([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchSummaryData = async () => {
      try {
        setSummaryLoading(true);
        const params = { type, itemId };

        const [prodRes, compRes, suppRes, monthlyRes, recycledRes] = await Promise.all([
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(id), { params, signal }),
        ]);

        setSummaryProductRows(prodRes.data?.data || []);
        setSummaryComponentRows(compRes.data?.data || []);
        setSummarySupplierRows(suppRes.data?.data || []);
        setSummaryMonthlyRows(monthlyRes.data?.data || []);
        setSummaryRecycledRows(recycledRes.data?.data || []);
      } catch (e) {
        setSummaryProductRows([]);
        setSummaryMonthlyRows([]);
        setSummarySupplierRows([]);
        setSummaryComponentRows([]);
        setSummaryRecycledRows([]);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummaryData();

    return () => {
      controller.abort();
    };
  }, [client, initialViewMode, id]);

  const fetchClientDetails = async (signal) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.CLIENT.GET_BY_ID(derivedId)}?_=${Date.now()}`, { signal });
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      setError(err.response?.data?.message || 'Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600" />
          <FaBuilding className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 text-lg" />
        </div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading client details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        {!embedded && (
            <button
            onClick={() => navigate('/dashboard/clients')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
            Back to Clients
            </button>
        )}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Client not found</h2>
          {!embedded && (
              <button
                onClick={() => navigate('/dashboard/clients')}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Back to Clients
              </button>
          )}
        </div>
      </div>
    );
  }

  const allTabs = [
    { number: 1, title: 'Client Basic Info', description: 'Legal & Trade Details', icon: <FaUser /> },
    { number: 2, title: 'Company Address Details', description: 'Registered & Communication', icon: <FaMapMarkerAlt /> },
    { number: 3, title: 'Company Documents', description: 'GST, PAN, CIN, etc.', icon: <FaIdCard /> },
    { number: 4, title: 'CTE & CTO/CCA Details', description: 'Consent Details', icon: <FaIndustry /> }
  ];

  const tabs = isProcessMode ? allTabs.filter(t => t.number === 4) : allTabs;

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

  const renderComingSoon = (title) => (
    <div className="py-16 flex flex-col items-center justify-center text-gray-400">
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      <p className="mt-2 text-xs text-gray-400">Coming Soon</p>
    </div>
  );

  const renderOverviewSection = () => {
    const wasteType = client.wasteType || 'Plastic Waste';
    const theme = WASTE_THEME[wasteType] || WASTE_THEME['Plastic Waste'];
    const WasteIcon = theme.icon;

    const InfoItem = ({ icon: Icon, label, value, iconColor = 'text-gray-400' }) => (
      <div className="flex items-start gap-3 py-2.5">
        <div className="mt-0.5">
          <Icon className={`text-sm ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm text-gray-900 font-medium mt-0.5 truncate">{value || 'N/A'}</p>
        </div>
      </div>
    );

    const PersonCard = ({ title, person, icon: Icon }) => {
      if (!person?.name) return null;
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
            <Icon className="text-primary-600 text-sm" />
            <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {(person.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                {person.designation && (
                  <p className="text-xs text-gray-500">{person.designation}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 ml-[52px]">
              {person.number && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FaPhone className="text-gray-400 text-[10px]" />
                  <span>{person.number}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FaEnvelope className="text-gray-400 text-[10px]" />
                  <span className="truncate">{person.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="w-full mx-auto space-y-5">
        {/* Hero Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: theme.color }} />
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.color}bb)` }}
              >
                {(client.clientName || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{client.clientName}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold w-fit"
                    style={{ color: theme.color, backgroundColor: theme.bg, border: `1px solid ${theme.color}33` }}
                  >
                    <WasteIcon className="text-[10px]" />
                    {wasteType}
                  </span>
                </div>
                {client.tradeName && (
                  <p className="text-sm text-gray-500 mt-1">Trade Name: {client.tradeName}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                  {client.entityType && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaBuilding className="text-gray-400 text-xs" />
                      <span>{client.entityType}</span>
                    </div>
                  )}
                  {client.companyGroupName && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaIndustry className="text-gray-400 text-xs" />
                      <span>{client.companyGroupName}</span>
                    </div>
                  )}
                  {client.financialYear && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaCalendarAlt className="text-gray-400 text-xs" />
                      <span>FY {client.financialYear}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <FaBuilding className="text-primary-600 text-sm" />
              <h4 className="text-sm font-semibold text-gray-700">Company Information</h4>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6">
              <InfoItem icon={FaBuilding} label="Client Name" value={client.clientName} iconColor="text-primary-500" />
              <InfoItem icon={FaIdCard} label="Trade Name" value={client.tradeName} />
              <InfoItem icon={FaIndustry} label="Company Group" value={client.companyGroupName} />
              <InfoItem icon={FaListAlt} label="Company Type" value={client.companyType} />
              <InfoItem icon={FaCalendarAlt} label="Financial Year" value={client.financialYear} />
              <InfoItem icon={FaCheckCircle} label="Entity Type" value={client.entityType} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <FaUserTie className="text-primary-600 text-sm" />
              <h4 className="text-sm font-semibold text-gray-700">Assignment Details</h4>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-6">
                <InfoItem icon={FaUserTie} label="Assigned To" value={client.assignedTo?.name || 'Unassigned'} iconColor="text-blue-500" />
                <InfoItem icon={FaEnvelope} label="Assigned Email" value={client.assignedTo?.email} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Person Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PersonCard
            title="Authorised Person"
            person={client.authorisedPerson}
            icon={FaUser}
          />
          <PersonCard
            title="Coordinating Person"
            person={client.coordinatingPerson}
            icon={FaUserTie}
          />
        </div>
      </div>
    );
  };

  const renderCteCtoSection = () => (
    <div className="w-full mx-auto space-y-8">
      {(() => {
        const plantGroups = {};
        const normalize = (name) => (name ? name.trim().toLowerCase() : '');

        const processData = (list, keyName) => {
          (list || []).forEach(item => {
            const pName = item.plantName;
            if (!pName) return;
            const norm = normalize(pName);
            if (!plantGroups[norm]) {
              plantGroups[norm] = {
                displayName: pName,
                cteDetails: [],
                ctoDetails: [],
                cteProd: [],
                ctoProds: [],
              };
            }
            plantGroups[norm][keyName].push(item);
          });
        };

        processData(client.productionFacility?.cteDetailsList, 'cteDetails');
        processData(client.productionFacility?.ctoDetailsList, 'ctoDetails');
        processData(client.productionFacility?.cteProduction, 'cteProd');
        processData(client.productionFacility?.ctoProducts, 'ctoProds');

        const sortedGroups = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));
        const pf = client.productionFacility || {};
        const regs = Array.isArray(pf.regulationsCoveredUnderCto) ? pf.regulationsCoveredUnderCto : [];
        const hasWater = regs.includes('Water');
        const waterRegs = Array.isArray(pf.waterRegulations) ? pf.waterRegulations : [];
        const hasAir = regs.includes('Air');
        const airRegs = Array.isArray(pf.airRegulations) ? pf.airRegulations : [];
        const hasHazardousWaste = regs.some((r) => {
          const lower = (r || '').toString().trim().toLowerCase();
          return lower === 'hazardous waste' || lower === 'hazardous wate';
        });
        const hazardousRegs = Array.isArray(pf.hazardousWasteRegulations) ? pf.hazardousWasteRegulations : [];
        const hasCto = sortedGroups.some(group => (group.ctoDetails || []).length > 0);

        if (sortedGroups.length === 0) {
          return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                <FaIndustry className="text-3xl text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Plant Details Found</h3>
              <p className="text-gray-500 mt-1">
                There are no CTE or CTO/CCA details available for any plant.
              </p>
            </div>
          );
        }

        const plantCards = sortedGroups.map((group, pIdx) => {
          const { displayName: plantName, cteDetails, ctoDetails, cteProd, ctoProds } = group;
          const plantKey = plantName || `plant-${pIdx}`;
          const plantToggleKey = `${plantKey}-plant`;
          const cteKey = `${plantKey}-cte`;
          const ctoKey = `${plantKey}-cto`;
          const prodKey = `${plantKey}-products`;
          const isPlantExpanded =
            typeof expandedSections[plantToggleKey] === 'boolean' ? expandedSections[plantToggleKey] : true;
          const isCteExpanded = !!expandedSections[cteKey];
          const isCtoExpanded = !!expandedSections[ctoKey];
          const isProdExpanded = !!expandedSections[prodKey];

          let auditTarget = null;
          let auditType = '';

          if (ctoDetails.length > 0) {
            auditTarget = ctoDetails[0];
            auditType = 'CTO';
          } else if (cteDetails.length > 0) {
            auditTarget = cteDetails[0];
            auditType = 'CTE';
          }

          let buttonProgress = 0;
          let buttonIsComplete = false;

          if (auditTarget) {
            const stepsCount = Array.isArray(auditTarget.completedSteps) ? auditTarget.completedSteps.length : 0;
            buttonProgress = Math.min((stepsCount / 4) * 100, 100);
            buttonIsComplete = stepsCount >= 4;
          }

          const buttonContent = buttonIsComplete ? (
            <>
              <FaCheckCircle /> Audit Done
            </>
          ) : (
            <>
              <FaClipboardCheck /> {buttonProgress === 0 ? 'Start Audit' : `Resume (${Math.round(buttonProgress)}%)`}
            </>
          );

          const combinedConsents = [
            ...cteDetails.map(r => ({ ...r, type: 'CTE', _rawType: 'cte' })),
            ...ctoDetails.map(r => ({ ...r, type: 'CTO', _rawType: 'cto' })),
          ];

          const combinedProducts = [
            ...cteProd.map(r => ({
              ...r,
              type: 'CTE',
              _rawType: 'cte',
              capacity: r.maxCapacityPerYear,
              capacityUnit: r.uom || 'MT/Year',
            })),
            ...ctoProds.map(r => ({
              ...r,
              type: 'CTO',
              _rawType: 'cto',
              capacity: r.quantity,
              capacityUnit: r.uom || 'MT',
            })),
          ];

          return (
            <div key={pIdx} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => togglePlantCard(plantKey)}
                  className="flex items-center gap-3 group"
                  aria-expanded={isPlantExpanded}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                    <FaBuilding className="text-xl" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 text-left">{plantName}</h3>
                      <p className="text-xs text-gray-500 text-left">Plant Unit</p>
                    </div>
                    <div
                      className={`text-gray-500 transition-transform duration-300 ${
                        isPlantExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <FaChevronDown className="text-xs" />
                    </div>
                  </div>
                </button>

                {isProcessMode && auditTarget && (
                  <button
                    onClick={() => {
                      if (embedded) {
                        setEmbeddedAuditTarget({ type: auditType, id: auditTarget._id });
                      } else {
                        const isEWaste = client.wasteType === 'E-Waste';
                        const processRoute = isEWaste ? 'process-ewaste' : 'process-plant';
                        navigate(`/dashboard/client/${id}/${processRoute}/${auditType}/${auditTarget._id}`);
                      }
                    }}
                    className="relative overflow-hidden group w-40 h-10 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all border border-blue-500 bg-white"
                  >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-600 z-0">
                      {buttonContent}
                    </div>
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 overflow-hidden transition-all duration-1000 ease-in-out z-10"
                      style={{
                        width: `${buttonIsComplete ? 100 : buttonProgress}%`,
                        opacity: buttonProgress === 0 ? 0 : 1,
                      }}
                    >
                      <div className="w-40 h-full flex items-center justify-center gap-2 text-white whitespace-nowrap">
                        {buttonContent}
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {isPlantExpanded && (
                <div className="p-6 space-y-8">
                  {cteDetails.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isCteExpanded ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, 'cte')}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isCteExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-1 rounded-full ${
                              isCteExpanded ? 'bg-blue-600' : 'bg-blue-500'
                            }`}
                          ></div>
                          <h4 className="text-sm md:text-base font-bold text-gray-800">CTE Details</h4>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isCteExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isCteExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="p-3 font-semibold border-b">Consent No</th>
                                  <th className="p-3 font-semibold border-b">Dates</th>
                                  <th className="p-3 font-semibold border-b">Location & Address</th>
                                  <th className="p-3 font-semibold border-b">Key Personnel</th>
                                  <th className="p-3 font-semibold border-b">Document</th>
                                  <th className="p-3 font-semibold border-b text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100">
                                {cteDetails.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-900">
                                      {r.consentNo}
                                      {r.category && (
                                        <div
                                          className={`mt-1 text-[10px] inline-block px-1.5 py-0.5 rounded ${
                                            r.category === 'Red'
                                              ? 'bg-red-50 text-red-600'
                                              : r.category === 'Orange'
                                              ? 'bg-orange-50 text-orange-600'
                                              : 'bg-green-50 text-green-600'
                                          }`}
                                        >
                                          {r.category}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs">
                                          Issued:{' '}
                                          {r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="text-xs">
                                          Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 max-w-xs">
                                      <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                      <div
                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                        title={r.plantAddress}
                                      >
                                        {r.plantAddress}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col gap-2 text-xs text-gray-600">
                                        <div>
                                          <div className="font-semibold text-gray-800">Factory Head</div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>{r.factoryHeadName || '-'}</span>
                                            {r.factoryHeadDesignation && (
                                              <span>| {r.factoryHeadDesignation}</span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.factoryHeadMobile && <span>Mob: {r.factoryHeadMobile}</span>}
                                            {r.factoryHeadEmail && <span>Email: {r.factoryHeadEmail}</span>}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-800">Contact Person</div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>{r.contactPersonName || '-'}</span>
                                            {r.contactPersonDesignation && (
                                              <span>| {r.contactPersonDesignation}</span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.contactPersonMobile && <span>Mob: {r.contactPersonMobile}</span>}
                                            {r.contactPersonEmail && <span>Email: {r.contactPersonEmail}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {r.documentFile ? (
                                        <button
                                          onClick={() =>
                                            handleViewDocument(
                                              r.documentFile,
                                              'CTE Document',
                                              `CTE_${r.consentNo}`
                                            )
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                          <FaEye className="mr-1" /> View
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">No Doc</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {r.verification?.status === 'Verified' ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                            <FaCheckCircle /> Verified
                                          </span>
                                          {r.verification?.verifiedBy && (
                                            <span className="text-[10px] text-gray-500 mt-0.5">
                                              by {r.verification.verifiedBy.name || 'User'}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 font-medium">Pending</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctoDetails.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isCtoExpanded ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, 'cto')}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isCtoExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-1 rounded-full ${
                              isCtoExpanded ? 'bg-purple-600' : 'bg-purple-500'
                            }`}
                          ></div>
                          <h4 className="text-sm md:text-base font-bold text-gray-800">CTO Details</h4>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isCtoExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isCtoExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="p-3 font-semibold border-b">Consent Order No</th>
                                  <th className="p-3 font-semibold border-b">Type / Industry / Category</th>
                                  <th className="p-3 font-semibold border-b">Dates</th>
                                  <th className="p-3 font-semibold border-b">Location & Address</th>
                                  <th className="p-3 font-semibold border-b">Key Personnel</th>
                                  <th className="p-3 font-semibold border-b">Document</th>
                                  <th className="p-3 font-semibold border-b text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100">
                                {ctoDetails.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-900">{r.consentOrderNo}</td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1 text-xs">
                                        <span>CTO/CCA Type: {r.ctoCaaType || '-'}</span>
                                        <span>Industry: {r.industryType || '-'}</span>
                                        <span>Category: {r.category || '-'}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs">
                                          Issued:{' '}
                                          {r.dateOfIssue ? new Date(r.dateOfIssue).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="text-xs">
                                          Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 max-w-xs">
                                      <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                      <div
                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                        title={r.plantAddress}
                                      >
                                        {r.plantAddress}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col gap-2 text-xs text-gray-600">
                                        <div>
                                          <div className="font-semibold text-gray-800">Factory Head</div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>{r.factoryHeadName || '-'}</span>
                                            {r.factoryHeadDesignation && (
                                              <span>| {r.factoryHeadDesignation}</span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.factoryHeadMobile && <span>Mob: {r.factoryHeadMobile}</span>}
                                            {r.factoryHeadEmail && <span>Email: {r.factoryHeadEmail}</span>}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-800">Contact Person</div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>{r.contactPersonName || '-'}</span>
                                            {r.contactPersonDesignation && (
                                              <span>| {r.contactPersonDesignation}</span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.contactPersonMobile && <span>Mob: {r.contactPersonMobile}</span>}
                                            {r.contactPersonEmail && <span>Email: {r.contactPersonEmail}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {r.documentFile ? (
                                        <button
                                          onClick={() =>
                                            handleViewDocument(
                                              r.documentFile,
                                              'CTO Document',
                                              `CTO_${r.consentOrderNo}`
                                            )
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                          <FaEye className="mr-1" /> View
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">No Doc</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {r.verification?.status === 'Verified' ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                            <FaCheckCircle /> Verified
                                          </span>
                                          {r.verification?.verifiedBy && (
                                            <span className="text-[10px] text-gray-500 mt-0.5">
                                              by {r.verification.verifiedBy.name || 'User'}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 font-medium">Pending</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {combinedProducts.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isProdExpanded ? 'border-blue-200 bg-gray-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, 'products')}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isProdExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1 rounded-full bg-blue-400"></div>
                          <h5 className="text-sm md:text-base font-bold text-gray-800">Plant Products & Capacity</h5>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isProdExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isProdExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {combinedProducts.map((prod, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center relative overflow-hidden"
                                >
                                  <div
                                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                                      prod.type === 'CTE' ? 'bg-blue-400' : 'bg-purple-400'
                                    }`}
                                  ></div>
                                  <div className="pl-2">
                                    <p className="text-sm font-semibold text-gray-800">{prod.productName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span
                                        className={`text-[10px] px-1.5 rounded ${
                                          prod.type === 'CTE'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-purple-50 text-purple-600'
                                        }`}
                                      >
                                        {prod.type}
                                      </span>
                                      <span className="text-xs text-gray-500">Product</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-gray-700">{prod.capacity}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{prod.capacityUnit}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });

        return (
          <>
            {plantCards}

            {hasCto && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                    <h4 className="font-bold text-gray-800 text-sm md:text-base">CTO/CCA Additional Details</h4>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Total Capital Investment (Lakhs)
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {pf.totalCapitalInvestmentLakhs ?? '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Ground/Bore Well Water Usage
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {pf.groundWaterUsage || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        CGWA NOC Requirement
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {pf.cgwaNocRequirement || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        CGWA NOC Document
                      </div>
                      <div className="mt-2">
                        {pf.cgwaNocDocument ? (
                          <button
                            onClick={() =>
                              handleViewDocument(pf.cgwaNocDocument, 'CGWA', 'CGWA NOC')
                            }
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <FaEye className="mr-1" /> View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No Doc</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">
                          Regulations Covered under CTO
                        </h4>
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2">
                      {regs.length ? (
                        regs.map(r => (
                          <span
                            key={r}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">Not selected</span>
                      )}
                    </div>

                    {hasWater && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-gray-700">Water</div>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                <th className="p-3 font-semibold border-b">
                                  Description (water consumption / waste)
                                </th>
                                <th className="p-3 font-semibold border-b w-48">Permitted quantity</th>
                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(waterRegs.length ? waterRegs : [{}]).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                  <td className="p-3 text-gray-700">{row.description || '-'}</td>
                                  <td className="p-3 text-gray-700">{row.permittedQuantity || '-'}</td>
                                  <td className="p-3 text-gray-700">{row.uom || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasAir && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-gray-700">Air</div>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                <th className="p-3 font-semibold border-b">Parameters</th>
                                <th className="p-3 font-semibold border-b w-80">
                                  Permissible annual / daily limit
                                </th>
                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(airRegs.length ? airRegs : [{}]).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                  <td className="p-3 text-gray-700">{row.parameter || '-'}</td>
                                  <td className="p-3 text-gray-700">{row.permittedLimit || '-'}</td>
                                  <td className="p-3 text-gray-700">{row.uom || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasHazardousWaste && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-gray-700">Hazardous Waste</div>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                <th className="p-3 font-semibold border-b">Name of Hazardous Waste</th>
                                <th className="p-3 font-semibold border-b">
                                  Facility &amp; Mode of Disposal
                                </th>
                                <th className="p-3 font-semibold border-b w-40">Quantity MT/YR</th>
                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(hazardousRegs.length ? hazardousRegs : [{}]).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                  <td className="p-3 text-gray-700">
                                    {row.nameOfHazardousWaste || '-'}
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {row.facilityModeOfDisposal || '-'}
                                  </td>
                                  <td className="p-3 text-gray-700">{row.quantityMtYr || '-'}</td>
                                  <td className="p-3 text-gray-700">{row.uom || '-'}</td>
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
          </>
        );
      })()}
    </div>
  );

  const renderAddressSection = () => (
    <div className="w-full mx-auto space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary-600" />
            Company Address Details
          </span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Registered Address</p>
              <p className="text-gray-900">{client.companyDetails?.registeredAddress || 'N/A'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Communication Address</p>
              <p className="text-gray-900">{client.notes || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentsSection = () => (
    <div className="w-full mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            <FaFileContract className="text-primary-600" />
            Company Documents
          </span>
          {(client.wasteType || '').toLowerCase().includes('plastic') && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await api.get(
                    API_ENDPOINTS.ANALYSIS.COMPLIANCE_REPORT(id) + `?type=${type}&itemId=${itemId}`,
                    { responseType: 'blob' }
                  );
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute(
                    'download',
                    `Plastic_Compliance_Report_${client.clientName || id}.pdf`
                  );
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  console.error('Report download failed:', err);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50 transition-colors"
            >
              <FaFilePdf className="text-sm" />
              Download Complete Report
            </button>
          )}
        </div>
        <div className="p-6 space-y-3">
          {(client.documents || [])
            .filter(d => ['PAN', 'GST', 'CIN', 'Factory License', 'EPR Certificate'].includes(d.documentType))
            .map((doc, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <FaFile className="text-primary-600 text-xl" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{doc.documentType}</p>
                    <p className="text-xs text-gray-600">
                      Number: {doc.certificateNumber || 'N/A'} • Date:{' '}
                      {doc.certificateDate ? new Date(doc.certificateDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDocument(doc.filePath, doc.documentType, doc.documentType)}
                    className="px-3 py-1.5 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm flex items-center gap-1"
                  >
                    <FaEye className="text-xs" />
                    View
                  </button>
                  <a
                    href={resolveUrl(doc.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <FaDownload className="text-xs" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          {(client.documents || []).filter(d =>
            ['PAN', 'GST', 'CIN', 'Factory License', 'EPR Certificate', 'IEC Certificate', 'DIC/DCSSI Certificate'].includes(
              d.documentType
            )
          ).length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border">
              <FaFolderOpen className="text-gray-300 text-4xl mb-3 mx-auto" />
              <p className="text-gray-500 text-sm">No certificates uploaded</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 border-t pt-6">
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 text-primary-700">
            MSME Details
          </h4>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-center border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-3 border-b text-sm font-semibold">Year</th>
                  <th className="p-3 border-b text-sm font-semibold">Status</th>
                  <th className="p-3 border-b text-sm font-semibold">Major Activity</th>
                  <th className="p-3 border-b text-sm font-semibold">Udyam Number</th>
                  <th className="p-3 border-b text-sm font-semibold">TurnOver (CR.)</th>
                  <th className="p-3 border-b text-sm font-semibold">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {(client.msmeDetails || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 border-b">
                    <td className="p-3">{row.classificationYear}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">{row.majorActivity}</td>
                    <td className="p-3">{row.udyamNumber}</td>
                    <td className="p-3">{row.turnover}</td>
                    <td className="p-3">
                      {row.certificateFile ? (
                        <button
                          onClick={() =>
                            handleViewDocument(row.certificateFile, 'MSME Certificate', `MSME_${row.udyamNumber}`)
                          }
                          className="text-primary-600 hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(client.msmeDetails || []).length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-gray-400">
                      No MSME details
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );



  const renderSkuSummary = () => {
    const categories = ['All', ...new Set(skuTableData.map(item => item.industryCategory).filter(Boolean))];
    const complianceOptions = ['All', 'Compliant', 'Non-Compliant'];

    const filteredByIndustry = selectedIndustryCategory === 'All' 
      ? skuTableData 
      : skuTableData.filter(item => item.industryCategory === selectedIndustryCategory);

    const filteredData = selectedComplianceStatus === 'All'
      ? filteredByIndustry
      : filteredByIndustry.filter(item => item.productComplianceStatus === selectedComplianceStatus);

    // Calculate status counts based on ALL data (or filtered? usually dashboard cards show summary of current view)
    // Let's use filteredData for dynamic updates as requested by standard patterns
    const compliantCount = filteredData.filter(item => item.productComplianceStatus === 'Compliant').length;
    const nonCompliantCount = filteredData.filter(item => item.productComplianceStatus === 'Non-Compliant').length;
    const totalWithStatus = compliantCount + nonCompliantCount;
    const compliantPct = totalWithStatus ? ((compliantCount / totalWithStatus) * 100).toFixed(1) : '0.0';
    const nonCompliantPct = totalWithStatus ? ((nonCompliantCount / totalWithStatus) * 100).toFixed(1) : '0.0';

    const detailColumns = [
      { title: 'Component Code', dataIndex: 'componentCode', key: 'componentCode', width: 120 },
      {
        title: 'Component Image',
        dataIndex: 'componentImage',
        key: 'componentImage',
        width: 100,
        align: 'center',
        render: (img) => (
          img ? (
            <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
              <Image 
                src={typeof img === 'string' ? resolveUrl(img) : ''} 
                alt="Component" 
                className="w-full h-full object-cover"
                preview={img ? { src: typeof img === 'string' ? resolveUrl(img) : '' } : false}
              />
            </div>
          ) : <span className="text-gray-300">-</span>
        )
      },
      { title: 'Component Description', dataIndex: 'componentDescription', key: 'componentDescription', width: 250 },
      { title: 'Name of Supplier', dataIndex: 'supplierName', key: 'supplierName', width: 250 },
      { title: 'Supplier Status', dataIndex: 'supplierStatus', key: 'supplierStatus', width: 120 },
      { title: 'EPR Cert. No', dataIndex: 'eprCertificateNumber', key: 'eprCertificateNumber', width: 120 },
      { title: 'Polymer Type', dataIndex: 'polymerType', key: 'polymerType', width: 100 },
      { title: 'Component Polymer', dataIndex: 'componentPolymer', key: 'componentPolymer', width: 120 },
      { title: 'Category', dataIndex: 'category', key: 'category', width: 100 },
      { title: 'Category II Type', dataIndex: 'categoryIIType', key: 'categoryIIType', width: 120 },
      { title: 'Container Capacity', dataIndex: 'containerCapacity', key: 'containerCapacity', width: 120 },
      { title: 'Layer Type', dataIndex: 'layerType', key: 'layerType', width: 120 },
      { title: 'Thickness', dataIndex: 'thickness', key: 'thickness', width: 100 },
      { title: 'Monthly purchase MT', dataIndex: 'monthlyPurchaseMt', key: 'monthlyPurchaseMt', width: 150, align: 'right' },
      { title: 'Recycled QTY', dataIndex: 'recycledQty', key: 'recycledQty', width: 120, align: 'right' },
      {
        title: 'Component Compliance Status',
        dataIndex: 'componentComplianceStatus',
        key: 'componentComplianceStatus',
        width: 150,
        render: (val) => (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            val === 'Compliant' ? 'bg-green-100 text-green-700' :
            val === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {val || '-'}
          </span>
        )
      },
      {
        title: 'Auditor Remarks',
        dataIndex: 'auditorRemarks',
        key: 'auditorRemarks',
        width: 300,
        render: (val) => (
          <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
            {val || '-'}
          </div>
        )
      }
    ];

    const expandedRowRender = (record) => {
      return (
        <Table
          columns={detailColumns}
          dataSource={record.details}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          bordered
          className="bg-gray-50"
        />
      );
    };

    const columns = [
      {
        title: 'SKU Code',
        dataIndex: 'skuCode',
        key: 'skuCode',
        width: 120,
        fixed: 'left',
        render: text => <span className="font-semibold text-gray-700">{text}</span>,
      },
      {
        title: 'SKU Description',
        dataIndex: 'skuDescription',
        key: 'skuDescription',
        width: 220,
        render: text => <span className="text-gray-600 text-xs">{text}</span>,
      },
      {
        title: 'Industry Category',
        dataIndex: 'industryCategory',
        key: 'industryCategory',
        width: 180,
        render: text => <span className="text-gray-600 text-xs">{text}</span>,
      },
      {
        title: 'Product Image',
        dataIndex: 'productImage',
        key: 'productImage',
        width: 120,
        align: 'center',
        render: img =>
          img ? (
            <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
              <Image
                src={typeof img === 'string' ? resolveUrl(img) : ''}
                alt="Product"
                className="w-full h-full object-cover"
                preview={img ? { src: typeof img === 'string' ? resolveUrl(img) : '' } : false}
              />
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          ),
      },
      {
        title: 'Recycled Qty',
        dataIndex: 'recycledQty',
        key: 'recycledQty',
        width: 120,
        align: 'right',
        render: val => <span className="font-medium text-green-700">{val}</span>,
      },
      {
        title: 'Product Compliance Status',
        dataIndex: 'productComplianceStatus',
        key: 'productComplianceStatus',
        width: 180,
        render: val => (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              val === 'Compliant'
                ? 'bg-green-100 text-green-700'
                : val === 'Non-Compliant'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {val || '-'}
          </span>
        ),
      },
      {
        title: 'Remarks',
        dataIndex: 'computedRemarks',
        key: 'computedRemarks',
        width: 200,
        render: (val) => (
          <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
            {val || '-'}
          </div>
        )
      },
      {
        title: 'Additional Document',
        dataIndex: 'additionalDocument',
        key: 'additionalDocument',
        width: 120,
        align: 'center',
        render: (doc) => (
          <div className="flex flex-col items-center gap-1">
            {doc ? (
              <button 
                onClick={() => {
                  const url = typeof doc === 'string' ? resolveUrl(doc) : '';
                  if (url) window.open(url, '_blank');
                }}
                className="text-[10px] font-bold text-primary-600 hover:text-primary-800 underline"
              >
                View
              </button>
            ) : <span className="text-gray-300">-</span>}
          </div>
        )
      },
      {
        title: 'Manager Remarks',
        dataIndex: 'managerRemarks',
        key: 'managerRemarks',
        width: 200,
        render: (val) => (
          <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
            {val || '-'}
          </div>
        )
      }
    ];

    if (summaryLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!skuTableData.length) {
      return (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKU data available.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="w-full md:w-64">
              <span className="text-sm font-semibold text-gray-700 block mb-1">Filter by Industry Category:</span>
              <Select
                className="w-full"
                value={selectedIndustryCategory}
                onChange={setSelectedIndustryCategory}
                options={categories.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="w-full md:w-64">
              <span className="text-sm font-semibold text-gray-700 block mb-1">Compliance Status:</span>
              <Select
                className="w-full"
                value={selectedComplianceStatus}
                onChange={setSelectedComplianceStatus}
                options={complianceOptions.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-gradient-to-br from-green-50 to-white px-4 py-3 rounded-xl border border-green-200 flex items-center gap-3 min-w-[180px] shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <FaCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Compliant</p>
                <p className="text-xl font-bold text-green-600">{compliantCount}</p>
                <p className="text-[11px] text-gray-500">{compliantPct}% of SKUs</p>
                <div className="w-full h-1 bg-green-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${compliantPct}%` }}></div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white px-4 py-3 rounded-xl border border-red-200 flex items-center gap-3 min-w-[180px] shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">!</span>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Non-Compliant</p>
                <p className="text-xl font-bold text-red-600">{nonCompliantCount}</p>
                <p className="text-[11px] text-gray-500">{nonCompliantPct}% of SKUs</p>
                <div className="w-full h-1 bg-red-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${nonCompliantPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            rowKey={(row, index) => row.key || row._id || `${row.skuCode || 'sku'}-${index}`}
            scroll={{ x: 1200 }}
            size="middle"
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.details && record.details.length > 0,
            }}
          />
        </div>
      </div>
    );
  };

  if (embeddedAuditTarget) {
    const isEWaste = client?.wasteType === 'E-Waste';
    const ProcessComponent = isEWaste ? EWasteProcess : PlantProcess;
    return (
      <ProcessComponent
        clientId={id}
        type={embeddedAuditTarget.type}
        itemId={embeddedAuditTarget.id}
        onBack={() => {
          setEmbeddedAuditTarget(null);
          fetchClientDetails();
        }}
        onFinish={onAuditComplete}
      />
    );
  }

  return (
    <ClientProvider>
    <div className={embedded ? "" : "p-6"}>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {!embedded && (
            <button
                onClick={() => navigate('/dashboard/clients')}
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white"
                title="Back to Clients"
            >
                <ArrowLeftOutlined className="transition-transform group-hover:-translate-x-1" />
            </button>
          )}
          {initialViewMode !== 'client-connect' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.clientName}</h1>
              <p className="text-sm text-gray-500">Client Details</p>
              {(client.auditStartDate || client.auditEndDate) && (
                <p className="text-sm font-medium text-blue-600 mt-1">
                  <CalendarOutlined className="mr-1" />
                  Audit Period: {client.auditStartDate ? new Date(client.auditStartDate).toLocaleDateString() : 'N/A'} - {client.auditEndDate ? new Date(client.auditEndDate).toLocaleDateString() : 'N/A'}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          {!embedded && (
            <>
              {isProcessMode && (
                <button
                  onClick={() =>
                    navigate(`/dashboard/client/${id}/edit`, {
                      state: { activeTab: 'Pre - Validation', unlockAudit: true },
                    })
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <AuditOutlined />
                  Start Audit
                </button>
              )}
              <button
                onClick={() => navigate(`/dashboard/client/${id}/edit`)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <EditOutlined />
                Edit
              </button>
            </>
          )}
          {(client.wasteType || '').toLowerCase().includes('plastic') && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await api.get(
                    API_ENDPOINTS.ANALYSIS.COMPLIANCE_REPORT(id) + `?type=${type}&itemId=${itemId}`,
                    { responseType: 'blob' }
                  );
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute(
                    'download',
                    `Plastic_Compliance_Report_${client.clientName || id}.pdf`
                  );
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  console.error('Report download failed:', err);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50 transition-colors"
            >
              <FaFilePdf className="text-sm" />
              Download Complete Report
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {initialViewMode !== 'client-connect' && tabs.length > 1 && (
          <div className="p-6 pb-0 mb-6">
            <AuditStepper steps={tabs} currentStep={activeTab} onStepChange={setActiveTab} />
          </div>
        )}

        <div>
          {initialViewMode === 'client-connect' ? (
            <>
              {/* Custom Tab Navigation */}
              <div className="border-b border-gray-200 px-5">
                <nav className="flex gap-1 -mb-px overflow-x-auto" role="tablist">
                  {[
                    { key: 'overview', label: 'Client Overview', icon: FaListAlt },
                    { key: 'industry', label: 'Industry SKU & Component', icon: FaIndustry },
                    { key: 'marking', label: 'Marking & Labelling', icon: FaClipboardCheck },
                    { key: 'portal', label: 'Portal Data & EPR Targets', icon: FaFileContract },
                  ].map(tab => {
                    const isActive = clientConnectTab === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setClientConnectTab(tab.key)}
                        className={`
                          flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap
                          border-b-2 transition-all duration-200
                          ${isActive
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <Icon className="text-xs" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-5 md:p-6">
                {clientConnectTab === 'overview' && (
                  <div className="space-y-5">
                    {renderOverviewSection()}

                    {/* Expandable: Address Details */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setClientDataOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                        aria-expanded={clientDataOpen}
                      >
                        <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                          <FaMapMarkerAlt className="text-primary-600" />
                          Address, Documents & Plant Details
                        </span>
                        <FaChevronDown className={`text-xs text-gray-400 transition-transform duration-300 ${clientDataOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${clientDataOpen ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-5 pb-5 space-y-6 border-t border-gray-100 pt-5">
                          {renderAddressSection()}
                          {renderDocumentsSection()}
                          {renderCteCtoSection()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {clientConnectTab === 'industry' && renderSkuSummary()}
                {clientConnectTab === 'marking' && (
                  <MarkingLabeling clientId={id} API_URL={api.defaults.baseURL} readOnly={true} />
                )}
                {clientConnectTab === 'portal' && (
                  <div className="space-y-8">
                    {isProducerEntity ? (
                      <>
                        <SalesAnalysis
                          clientId={id}
                          type={type}
                          itemId={itemId}
                          readOnly={true}
                          entityType={client.entityType}
                          showTargetsOnTop={true}
                          hideSalesSection={true}
                        />
                        <Analysis
                          clientId={id}
                          type={type}
                          itemId={itemId}
                          isStepReadOnly={true}
                          entityType={client.entityType}
                        />
                      </>
                    ) : (
                      <>
                        <Analysis
                          clientId={id}
                          type={type}
                          itemId={itemId}
                          isStepReadOnly={true}
                          entityType={client.entityType}
                          showTargetsOnly={true}
                        />
                        <Analysis
                          clientId={id}
                          type={type}
                          itemId={itemId}
                          isStepReadOnly={true}
                          entityType={client.entityType}
                          hideTargets={true}
                        />
                      </>
                    )}
                    <SalesAnalysis
                      clientId={id}
                      type={type}
                      itemId={itemId}
                      readOnly={true}
                      entityType={client.entityType}
                      hideTargetSection={true}
                    />
                    <PurchaseAnalysis
                      clientId={id}
                      type={type}
                      itemId={itemId}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6">
              {activeTab === 1 && renderOverviewSection()}
              {activeTab === 2 && renderAddressSection()}
              {activeTab === 3 && renderDocumentsSection()}
              {activeTab === 4 && renderCteCtoSection()}
            </div>
          )}
        </div>
      </div>
      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerName}
      />
    </div>
    </ClientProvider>
  );
};

export default ClientDetail;
