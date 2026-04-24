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
  FaChartLine,
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
import MarkingLabeling from '../features/plantProcess/components/MarkingLabeling';
import Analysis from '../features/plantProcess/components/Analysis';
import SalesAnalysis from '../features/plantProcess/components/SalesAnalysis';
import PurchaseAnalysis from '../features/plantProcess/components/PurchaseAnalysis';
import useSkuCompliance from '../hooks/useSkuCompliance';

import { ClientProvider } from '../context/ClientContext';

const WASTE_THEME = {
  'Plastic Waste': { color: '#059669', bg: '#ecfdf5', icon: FaRecycle },
  'E-Waste': { color: '#7c3aed', bg: '#f5f3ff', icon: FaBolt },
  'Battery Waste': { color: '#dc2626', bg: '#fef2f2', icon: FaBatteryFull },
  'ELV': { color: '#0284c7', bg: '#f0f9ff', icon: FaCarSide },
  'Used Oil': { color: '#b45309', bg: '#fffbeb', icon: FaOilCan },
};

const ClientDetail = ({ clientId, embedded = false, initialViewMode, onAuditComplete, onContextReady }) => {
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
  const [summaryTargetTables, setSummaryTargetTables] = useState([]);
  const [summaryAnnualTargetRows, setSummaryAnnualTargetRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedIndustryCategory, setSelectedIndustryCategory] = useState('All');
  const [selectedComplianceStatus, setSelectedComplianceStatus] = useState('All');
  const [selectedFoodGrade, setSelectedFoodGrade] = useState('All');
  const [producerViewMode, setProducerViewMode] = useState('cards');
  const [producerCardOpen, setProducerCardOpen] = useState(new Set());
  const [brandOwnerViewMode, setBrandOwnerViewMode] = useState('accordion');
  const [expandedBrandOwnerSku, setExpandedBrandOwnerSku] = useState(null);
  const [closingBrandOwnerSku, setClosingBrandOwnerSku] = useState(null);
  const [brandOwnerComponentStatusFilter, setBrandOwnerComponentStatusFilter] = useState(null);
  const isProducerEntity = (client?.entityType || '').toString().toLowerCase().includes('producer');
  const {
    skuComplianceData,
    fetchSkuComplianceData
  } = useSkuCompliance(
    initialViewMode === 'client-connect' ? id : null,
    isProducerEntity,
    summaryProductRows,
    summaryComponentRows
  );

  const { type, itemId } = useMemo(() => {
    if (!client) return { type: null, itemId: null };
    const ctoList = client.productionFacility?.ctoDetailsList || [];
    const cteList = client.productionFacility?.cteDetailsList || [];
    const primary = ctoList[0] || cteList[0];
    const computedType = primary ? (primary.type || (ctoList[0] === primary ? 'CTO' : 'CTE')) : null;
    const computedItemId = primary?._id;
    return { type: computedType, itemId: computedItemId };
  }, [client]);

  useEffect(() => {
    if (client && onContextReady) {
      onContextReady({ id, client, type, itemId });
    }
  }, [client, type, itemId, id, onContextReady]);

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
      const componentCode = (product.componentCode || '').trim();
      
      // For Producer, if skuCode is missing, use componentCode as skuCode
      const effectiveSkuCode = isProducerEntity && !skuCode ? componentCode : skuCode;

      if (!effectiveSkuCode) return;

      if (!groupedBySku.has(effectiveSkuCode)) {
        groupedBySku.set(effectiveSkuCode, {
          skuCode: effectiveSkuCode,
          skuDescription: product.skuDescription || '-',
          industryCategory: product.industryCategory || '-',
          productImage: product.productImage,
          componentCodes: new Set(),
          products: [],
        });
      }

      const group = groupedBySku.get(effectiveSkuCode);
      group.products.push(product);

      if (product.componentCode) {
        group.componentCodes.add((product.componentCode || '').trim());
      }
    });

    if (isProducerEntity) {
      // For Producer, return flat list of all component details
      const allDetails = [];
      groupedBySku.forEach(group => {
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
                  industryCategory,
                  productComplianceStatus: productRow.componentComplianceStatus || productRow.complianceStatus || '',
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
                  foodGrade: supplierRow.foodGrade || componentRow.foodGrade || '-',
                  recycledPolymerUsed:
                    procurement.recycledPolymerUsed ||
                    procurement.recycled_polymer_used ||
                    procurement['Recycled Polymer Used'] ||
                    componentRow.recycledPolymerUsed ||
                    componentRow.recycled_polymer_used ||
                    componentRow['Recycled Polymer Used'] ||
                    '-',
                  componentPolymer:
                    componentRow.componentPolymer || procurement.componentPolymer || '-',
                  category: componentRow.category || procurement.category || '-',
                  categoryIIType: componentRow.categoryIIType || '-',
                  containerCapacity: componentRow.containerCapacity !== undefined && componentRow.containerCapacity !== null ? componentRow.containerCapacity : '-',
                  layerType: componentRow.layerType || '-',
                  thickness: componentRow.thickness !== undefined && componentRow.thickness !== null ? componentRow.thickness : '-',
                  monthlyPurchaseMt: procurement.monthlyPurchaseMt || '0',
                  recycledPercent:
                    recycledRow.usedRecycledPercent || procurement.recycledPercent || '0',
                  recycledQty: (Number(recycledRow.usedRecycledQtyMt || procurement.recycledQty) || 0).toFixed(3),
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
    
              // Try to find supplier info from product row or supplier row if no procurement
              // Often for Producers, supplier might be in supplierRows even if not in procurement
              const supplierRow = supplierRows.find(s => (s.componentCode || '').trim() === compCode) || {};

              details.push({
                key: `${skuCode}-${compCode}-stub`,
                skuCode,
                industryCategory,
                productComplianceStatus: productRow.componentComplianceStatus || productRow.complianceStatus || '',
                componentCode: compCode,
                componentImage: productRow.componentImage,
                componentDescription:
                  componentRow.componentDescription || productRow.componentDescription || '-',
                supplierName: supplierRow.supplierName || '-',
                supplierStatus: supplierRow.supplierStatus || '-',
                eprCertificateNumber: supplierRow.eprCertificateNumber || '-',
                polymerType: componentRow.polymerType || '-',
                foodGrade: supplierRow.foodGrade || componentRow.foodGrade || '-',
                recycledPolymerUsed:
                  componentRow.recycledPolymerUsed ||
                  componentRow.recycled_polymer_used ||
                  componentRow['Recycled Polymer Used'] ||
                  '-',
                componentPolymer: componentRow.componentPolymer || '-',
                category: componentRow.category || '-',
                categoryIIType: componentRow.categoryIIType || '-',
                containerCapacity: componentRow.containerCapacity !== undefined && componentRow.containerCapacity !== null ? componentRow.containerCapacity : '-',
                layerType: componentRow.layerType || '-',
                thickness: componentRow.thickness !== undefined && componentRow.thickness !== null ? componentRow.thickness : '-',
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
        allDetails.push(...details);
      });
      return allDetails;
    }

    return Array.from(groupedBySku.values()).map((group, index) => {
      const { skuCode, skuDescription, industryCategory, productImage, componentCodes, products } = group;

      let details = [];
      let totalRecycledQty = 0;
      let hasNonCompliant = false;
      let allCompliant = true;
      let remarksList = [];

      componentCodes.forEach(compCode => {
        const procurementRecords = monthlyRows.filter(m => (m.componentCode || '').trim() === compCode);
        const matchingRecycledRows = recycledRows.filter(r => (r.componentCode || '').trim() === compCode);

        // Calculate metrics for this component across all procurements
        let compRecycledQty = 0;
        
        if (procurementRecords.length > 0) {
             procurementRecords.forEach((procurement, idx) => {
                const componentRow = componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
                const supplierRow = supplierRows.find(s => 
                    (s.componentCode || '').trim() === compCode && 
                    (s.supplierName || '').trim().toLowerCase() === (procurement.supplierName || '').trim().toLowerCase()
                ) || {};
                const productRow = products.find(p => (p.componentCode || '').trim() === compCode) || {};
                const recycledRow = matchingRecycledRows.find(r => 
                    (r.supplierName || '').trim().toLowerCase() === (procurement.supplierName || '').trim().toLowerCase()
                ) || matchingRecycledRows[0] || {};

                const recQty = parseFloat(recycledRow.usedRecycledQtyMt || procurement.recycledQty || 0);
                compRecycledQty += recQty;

                // Compliance Status Logic
                const status = productRow.componentComplianceStatus || productRow.complianceStatus || '';
                if (status === 'Non-Compliant') {
                    hasNonCompliant = true;
                    allCompliant = false;
                } else if (status !== 'Compliant') {
                    allCompliant = false;
                }

                // Remarks
                if (productRow.auditorRemarks) {
                    remarksList.push(`${compCode}: ${productRow.auditorRemarks}`);
                }

                details.push({
                    key: `${skuCode}-${compCode}-${idx}`,
                    componentCode: compCode,
                    componentImage: productRow.componentImage,
                    componentDescription: componentRow.componentDescription || procurement.componentDescription || productRow.componentDescription || '-',
                    supplierName: procurement.supplierName || '-',
                    supplierStatus: supplierRow.supplierStatus || '-',
                    eprCertificateNumber: supplierRow.eprCertificateNumber || '-',
                    polymerType: componentRow.polymerType || procurement.polymerType || '-',
                    componentPolymer: componentRow.componentPolymer || procurement.componentPolymer || '-',
                    recycledPolymerUsed:
                      procurement.recycledPolymerUsed ||
                      procurement.recycled_polymer_used ||
                      procurement['Recycled Polymer Used'] ||
                      componentRow.recycledPolymerUsed ||
                      componentRow.recycled_polymer_used ||
                      componentRow['Recycled Polymer Used'] ||
                      '-',
                    category: componentRow.category || procurement.category || '-',
                categoryIIType: componentRow.categoryIIType || '-',
                containerCapacity: componentRow.containerCapacity !== undefined && componentRow.containerCapacity !== null ? componentRow.containerCapacity : '-',
                layerType: componentRow.layerType || '-',
                thickness: componentRow.thickness !== undefined && componentRow.thickness !== null ? componentRow.thickness : '-',
                monthlyPurchaseMt: procurement.monthlyPurchaseMt || '0',
                    recycledQty: (Number(recycledRow.usedRecycledQtyMt || procurement.recycledQty) || 0).toFixed(3),
                    componentComplianceStatus: status,
                    auditorRemarks: productRow.auditorRemarks || '',
                    additionalDocument: productRow.additionalDocument,
                    managerRemarks: productRow.managerRemarks || ''
                });
             });
        } else {
             // No procurement records, but component exists in product definition
             const componentRow = componentRows.find(c => (c.componentCode || '').trim() === compCode) || {};
             const productRow = products.find(p => (p.componentCode || '').trim() === compCode) || {};
             const supplierRow = supplierRows.find(s => (s.componentCode || '').trim() === compCode) || {};
             
             // Sum recycled qty for component (if any recycled rows exist without procurement link)
             const recQty = matchingRecycledRows.reduce((sum, r) => sum + (parseFloat(r.usedRecycledQtyMt) || 0), 0);
             compRecycledQty += recQty;

             const status = productRow.componentComplianceStatus || productRow.complianceStatus || '';
             if (status === 'Non-Compliant') {
                hasNonCompliant = true;
                allCompliant = false;
             } else if (status !== 'Compliant') {
                allCompliant = false;
             }

             if (productRow.auditorRemarks) {
                remarksList.push(`${compCode}: ${productRow.auditorRemarks}`);
             }

             details.push({
                key: `${skuCode}-${compCode}-stub`,
                componentCode: compCode,
                componentImage: productRow.componentImage,
                componentDescription: componentRow.componentDescription || productRow.componentDescription || '-',
                supplierName: supplierRow.supplierName || '-',
                supplierStatus: supplierRow.supplierStatus || '-',
                eprCertificateNumber: supplierRow.eprCertificateNumber || '-',
                polymerType: componentRow.polymerType || '-',
                componentPolymer: componentRow.componentPolymer || '-',
                recycledPolymerUsed:
                  componentRow.recycledPolymerUsed ||
                  componentRow.recycled_polymer_used ||
                  componentRow['Recycled Polymer Used'] ||
                  '-',
                category: componentRow.category || '-',
                categoryIIType: componentRow.categoryIIType || '-',
                containerCapacity: componentRow.containerCapacity !== undefined && componentRow.containerCapacity !== null ? componentRow.containerCapacity : '-',
                layerType: componentRow.layerType || '-',
                thickness: componentRow.thickness !== undefined && componentRow.thickness !== null ? componentRow.thickness : '-',
                monthlyPurchaseMt: '0',
                recycledQty: recQty.toFixed(3),
                componentComplianceStatus: status,
                auditorRemarks: productRow.auditorRemarks || '',
                additionalDocument: productRow.additionalDocument,
                managerRemarks: productRow.managerRemarks || ''
             });
        }
        
        totalRecycledQty += compRecycledQty;
      });

      let productComplianceStatus = '';
      if (hasNonCompliant) productComplianceStatus = 'Non-Compliant';
      else if (allCompliant && componentCodes.size > 0) productComplianceStatus = 'Compliant';

      const uniqueRemarks = [...new Set(remarksList)].join('\n');

      return {
        key: skuCode,
        skuCode,
        skuDescription,
        industryCategory,
        productImage,
        recycledQty: totalRecycledQty.toFixed(3),
        productComplianceStatus,
        computedRemarks: uniqueRemarks,
        details: details
      };
    });
  }, [summaryProductRows, summaryMonthlyRows, summarySupplierRows, summaryComponentRows, summaryRecycledRows, isProducerEntity]);

  const industrySkuSummaryData = useMemo(() => {
    const asList = (value) => {
      if (Array.isArray(value)) return value.map((item) => (item ?? '').toString().trim()).filter(Boolean);
      const text = (value ?? '').toString().trim();
      return text ? [text] : [];
    };

    const normalizeStatus = (status, fallback = 'Pending') => {
      const value = (status ?? '').toString().trim();
      return value || fallback;
    };

    const deriveComplianceStatus = (item) => {
      const explicitStatus = (item?.productComplianceStatus || '').toString().trim();
      if (explicitStatus) return explicitStatus;

      const detailStatuses = Array.isArray(item?.details)
        ? item.details
            .map((detail) => (detail?.componentComplianceStatus || detail?.complianceStatus || '').toString().trim())
            .filter(Boolean)
        : [];

      if (detailStatuses.includes('Non-Compliant')) return 'Non-Compliant';
      if (detailStatuses.length > 0 && detailStatuses.every((status) => status === 'Compliant')) return 'Compliant';
      if (detailStatuses.length > 0) return 'Partially Compliant';
      return 'Pending';
    };

    const deriveSupplierStatusCounts = (item) => {
      const componentCodes = new Set(
        (Array.isArray(item?.details) ? item.details : [])
          .map((detail) => (detail?.componentCode || '').toString().trim())
          .filter(Boolean)
      );

      if (componentCodes.size === 0) {
        return {
          supplierRegisteredCount: 0,
          supplierUnregisteredCount: 0,
        };
      }

      const uniqueSupplierRows = new Map();
      (summarySupplierRows || []).forEach((supplierRow, index) => {
        const componentCode = (supplierRow?.componentCode || '').toString().trim();
        if (!componentCodes.has(componentCode)) return;

        const supplierName = (supplierRow?.supplierName || '').toString().trim().toLowerCase();
        const supplierKey = `${componentCode}::${supplierName || `supplier-${index}`}`;

        if (!uniqueSupplierRows.has(supplierKey)) {
          uniqueSupplierRows.set(supplierKey, supplierRow);
        }
      });

      const registeredSuppliers = new Set();
      const unregisteredSuppliers = new Set();

      uniqueSupplierRows.forEach((supplierRow, supplierKey) => {
        const status = (supplierRow?.supplierStatus || '').toString().trim().toLowerCase();

        if (status.includes('unregistered')) {
          unregisteredSuppliers.add(supplierKey);
          return;
        }

        if (status.includes('registered')) {
          registeredSuppliers.add(supplierKey);
        }
      });

      return {
        supplierRegisteredCount: registeredSuppliers.size,
        supplierUnregisteredCount: unregisteredSuppliers.size,
      };
    };

    const savedMarkingBySku = new Map();
    (skuComplianceData || []).forEach((row) => {
      const code = (row?.skuCode || '').toString().trim();
      if (!code) return;
      savedMarkingBySku.set(code, row);
    });

    return [...(skuTableData || [])]
      .map((item, index) => {
        const skuCode = (item?.skuCode || '').toString().trim();
        if (!skuCode) return null;

        const savedMarking = savedMarkingBySku.get(skuCode) || {};
        const remarks = [
          ...asList(item?.computedRemarks),
          ...asList(savedMarking?.remarks),
          ...asList(savedMarking?.complianceRemarks),
        ];
        const supplierCounts = deriveSupplierStatusCounts(item);

        return {
          key: `${item?.industryCategory || 'industry'}-${skuCode}-${index}`,
          industryCategory: item?.industryCategory || 'Uncategorized',
          skuCode,
          skuDescription: item?.skuDescription || (isProducerEntity ? 'Component summary' : '-'),
          complianceStatus: deriveComplianceStatus(item),
          markingLabelingStatus: normalizeStatus(savedMarking?.complianceStatus),
          supplierRegisteredCount: supplierCounts.supplierRegisteredCount,
          supplierUnregisteredCount: supplierCounts.supplierUnregisteredCount,
          remarks: [...new Set(remarks)].join('\n'),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const industryCompare = (left.industryCategory || '').localeCompare(right.industryCategory || '');
        if (industryCompare !== 0) return industryCompare;
        return (left.skuCode || '').localeCompare(right.skuCode || '');
      });
  }, [skuTableData, skuComplianceData, isProducerEntity, summarySupplierRows]);

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
      setSummaryTargetTables([]);
      setSummaryAnnualTargetRows([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchSummaryData = async () => {
      try {
        setSummaryLoading(true);
        const params = { type, itemId };

        const [prodRes, compRes, suppRes, monthlyRes, recycledRes, analysisRes] = await Promise.all([
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(id), { params, signal }),
          api.get(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(id), { params, signal }),
          api.get(`${API_ENDPOINTS.ANALYSIS.PLASTIC_PREPOST}/${id}`, { params, signal }),
        ]);

        setSummaryProductRows(prodRes.data?.data || []);
        setSummaryComponentRows(compRes.data?.data || []);
        setSummarySupplierRows(suppRes.data?.data || []);
        setSummaryMonthlyRows(monthlyRes.data?.data || []);
        setSummaryRecycledRows(recycledRes.data?.data || []);
        setSummaryTargetTables(analysisRes.data?.full_summary?.target_tables || []);
        setSummaryAnnualTargetRows(analysisRes.data?.data || []);
      } catch (e) {
        setSummaryProductRows([]);
        setSummaryMonthlyRows([]);
        setSummarySupplierRows([]);
        setSummaryComponentRows([]);
        setSummaryRecycledRows([]);
        setSummaryTargetTables([]);
        setSummaryAnnualTargetRows([]);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummaryData();

    return () => {
      controller.abort();
    };
  }, [client, initialViewMode, id]);

  useEffect(() => {
    if (initialViewMode !== 'client-connect' || !id) return;
    fetchSkuComplianceData();
  }, [initialViewMode, id, fetchSkuComplianceData]);

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
    const pf = client.productionFacility || {};
    const regs = Array.isArray(pf.regulationsCoveredUnderCto) ? pf.regulationsCoveredUnderCto : [];
    const capacityRows = Array.isArray(pf.ctoProductionCapacityValidation) ? pf.ctoProductionCapacityValidation : [];
    const hasWater = regs.includes('Water');
    const waterRegs = Array.isArray(pf.waterRegulations) ? pf.waterRegulations : [];
    const hasAir = regs.includes('Air');
    const airRegs = Array.isArray(pf.airRegulations) ? pf.airRegulations : [];
    const hasHazardousWaste = regs.some((r) => {
      const lower = (r || '').toString().trim().toLowerCase();
      return lower === 'hazardous waste' || lower === 'hazardous wate';
    });
    const hazardousRegs = Array.isArray(pf.hazardousWasteRegulations) ? pf.hazardousWasteRegulations : [];

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

        {initialViewMode !== 'client-connect' && (regs.length > 0 || capacityRows.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <FaIndustry className="text-primary-600 text-sm" />
              <h4 className="text-sm font-semibold text-gray-700">CTO Regulations & Capacity</h4>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Regulations Covered under CTO</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {regs.length ? regs.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      {r}
                    </span>
                  )) : (
                    <span className="text-gray-400 text-sm italic">Not selected</span>
                  )}
                </div>
              </div>

              {(hasWater || hasAir || hasHazardousWaste) && (
                <div className="space-y-4">
                  {hasWater && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">Water</div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="p-3 font-semibold border-b w-20">SR No</th>
                              <th className="p-3 font-semibold border-b">Description (water consumption / waste)</th>
                              <th className="p-3 font-semibold border-b w-48">Permitted quantity</th>
                              <th className="p-3 font-semibold border-b w-24">UOM</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-gray-100">
                            {(waterRegs.length ? waterRegs : [{}]).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                <td className="p-3 text-gray-700">{row?.description || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.permittedQuantity || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {hasAir && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">Air</div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="p-3 font-semibold border-b w-20">SR No</th>
                              <th className="p-3 font-semibold border-b">Parameters</th>
                              <th className="p-3 font-semibold border-b w-80">Permissible annual / daily limit</th>
                              <th className="p-3 font-semibold border-b w-24">UOM</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-gray-100">
                            {(airRegs.length ? airRegs : [{}]).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                <td className="p-3 text-gray-700">{row?.parameter || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.permittedLimit || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {hasHazardousWaste && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">Hazardous Waste</div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="p-3 font-semibold border-b w-20">SR No</th>
                              <th className="p-3 font-semibold border-b">Name of Hazardous Waste</th>
                              <th className="p-3 font-semibold border-b">Facility &amp; Mode of Disposal</th>
                              <th className="p-3 font-semibold border-b w-40">Quantity MT/YR</th>
                              <th className="p-3 font-semibold border-b w-24">UOM</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-gray-100">
                            {(hazardousRegs.length ? hazardousRegs : [{}]).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                <td className="p-3 text-gray-700">{row?.nameOfHazardousWaste || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.facilityModeOfDisposal || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.quantityMtYr || '-'}</td>
                                <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {capacityRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3 font-semibold border-b">Product Name</th>
                        <th className="p-3 font-semibold border-b">Machine name</th>
                        <th className="p-3 font-semibold border-b">Production output in one HR</th>
                        <th className="p-3 font-semibold border-b">UOM</th>
                        <th className="p-3 font-semibold border-b">Power per hr KWH</th>
                        <th className="p-3 font-semibold border-b">Machine working days</th>
                        <th className="p-3 font-semibold border-b">Machine Total working hours per day</th>
                        <th className="p-3 font-semibold border-b">Total monthly capacity (KG)</th>
                        <th className="p-3 font-semibold border-b">Total monthly capacity (MT)</th>
                        <th className="p-3 font-semibold border-b">Total electricity per month KWH</th>
                        <th className="p-3 font-semibold border-b">Consent capacity</th>
                        <th className="p-3 font-semibold border-b">UOM</th>
                        <th className="p-3 font-semibold border-b">Utilization %</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {capacityRows.map((r, idx) => {
                        const fmt = (v) => {
                          if (v === null || v === undefined) return '';
                          const n = Number(v);
                          if (!Number.isFinite(n)) return '';
                          return (Math.round(n * 100) / 100).toString();
                        };
                        const uom = (r.uom || '').toString().trim().toUpperCase();
                        const consentUom = (r.consentUom || uom || '').toString().trim().toUpperCase();
                        const totalMonthlyCapacity = Number(r.totalMonthlyCapacity) || 0;
                        const totalMonthlyCapacityMt = Number(r.totalMonthlyCapacityMt) || (uom === 'KG' ? totalMonthlyCapacity / 1000 : 0);
                        const consentCapacity = Number(r.consentCapacity) || 0;
                        const util = Number.isFinite(Number(r.utilizationPercent))
                          ? Number(r.utilizationPercent)
                          : (consentCapacity > 0
                            ? (((uom === 'KG' && consentUom === 'MT') ? (totalMonthlyCapacity / 1000) : totalMonthlyCapacity) / consentCapacity) * 100
                            : 0);
                        const isHigh = util >= 100;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-700">{r.productName || '-'}</td>
                            <td className="p-3 text-gray-700">{r.machineName || '-'}</td>
                            <td className="p-3 text-gray-700">{fmt(r.productionOutputPerHr)}</td>
                            <td className="p-3 text-gray-700">{uom || '-'}</td>
                            <td className="p-3 text-gray-700">{fmt(r.powerPerHrKwh)}</td>
                            <td className="p-3 text-gray-700">{fmt(r.workingDays)}</td>
                            <td className="p-3 text-gray-700">{fmt(r.workingHoursPerDay)}</td>
                            <td className="p-3 text-gray-700">{fmt(totalMonthlyCapacity)}</td>
                            <td className="p-3 text-gray-700">{uom === 'KG' ? fmt(totalMonthlyCapacityMt) : 'NA'}</td>
                            <td className="p-3 text-gray-700">{fmt(r.totalElectricityConsumptionPerMonthKwh)}</td>
                            <td className="p-3 text-gray-700">{fmt(consentCapacity)}</td>
                            <td className="p-3 text-gray-700">{uom === 'KG' ? 'MT' : (consentUom || '-')}</td>
                            <td className={`p-3 ${isHigh ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{fmt(util)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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

                  {hasCto && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                          <h4 className="font-bold text-gray-800 text-sm md:text-base">CTO/CCA Additional Details</h4>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {(() => {
                          const rows = Array.isArray(pf.ctoAdditionalDetails) && pf.ctoAdditionalDetails.length
                            ? pf.ctoAdditionalDetails
                            : ((pf.totalCapitalInvestmentLakhs !== undefined || pf.groundWaterUsage || pf.cgwaNocRequirement || pf.cgwaNocDocument)
                              ? [{
                                  plantName: pf.ctoDetailsList?.[0]?.plantName || '',
                                  totalCapitalInvestmentLakhs: pf.totalCapitalInvestmentLakhs,
                                  groundWaterUsage: pf.groundWaterUsage,
                                  cgwaNocRequirement: pf.cgwaNocRequirement,
                                  cgwaNocDocument: pf.cgwaNocDocument
                                }]
                              : []);
                          return rows.length ? rows.map((row, idx) => (
                            <div key={row._id || row.plantName || idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Plant Name</div>
                                  <div className="mt-2 text-sm font-semibold text-gray-900">{row.plantName || '-'}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Capital Investment (Lakhs)</div>
                                  <div className="mt-2 text-sm font-semibold text-gray-900">{row.totalCapitalInvestmentLakhs ?? '-'}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ground/Bore Well Water Usage</div>
                                  <div className="mt-2 text-sm font-semibold text-gray-900">{row.groundWaterUsage || '-'}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Requirement</div>
                                  <div className="mt-2 text-sm font-semibold text-gray-900">{row.cgwaNocRequirement || '-'}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Document</div>
                                  <div className="mt-2">
                                    {row.cgwaNocDocument ? (
                                      <button
                                        onClick={() =>
                                          handleViewDocument(row.cgwaNocDocument, 'CGWA', `CGWA NOC_${row.plantName || idx + 1}`)
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
                            </div>
                          )) : (
                            <div className="text-sm text-gray-400 italic">No additional details added.</div>
                          );
                        })()}

                        {initialViewMode === 'client-connect' && (
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
                                        <th className="p-3 font-semibold border-b w-48">Plant Name</th>
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
                                          <td className="p-3 text-gray-700">{row.plantName || '-'}</td>
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
                                        <th className="p-3 font-semibold border-b w-48">Plant Name</th>
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
                                          <td className="p-3 text-gray-700">{row.plantName || '-'}</td>
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
                                        <th className="p-3 font-semibold border-b w-48">Plant Name</th>
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
                                          <td className="p-3 text-gray-700">{row.plantName || '-'}</td>
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
                        )}
                        {initialViewMode === 'client-connect' && Array.isArray(pf.ctoProductionCapacityValidation) && pf.ctoProductionCapacityValidation.length > 0 && (
                          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="p-3 font-semibold border-b">Product Name</th>
                                  <th className="p-3 font-semibold border-b">Machine name</th>
                                  <th className="p-3 font-semibold border-b">Production output in one HR</th>
                                  <th className="p-3 font-semibold border-b">UOM</th>
                                  <th className="p-3 font-semibold border-b">Power per hr KWH</th>
                                  <th className="p-3 font-semibold border-b">Machine working days</th>
                                  <th className="p-3 font-semibold border-b">Machine Total working hours per day</th>
                                  <th className="p-3 font-semibold border-b">Total monthly capacity (KG)</th>
                                  <th className="p-3 font-semibold border-b">Total monthly capacity (MT)</th>
                                  <th className="p-3 font-semibold border-b">Total electricity per month KWH</th>
                                  <th className="p-3 font-semibold border-b">Consent capacity</th>
                                  <th className="p-3 font-semibold border-b">UOM</th>
                                  <th className="p-3 font-semibold border-b">Utilization %</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100">
                                {pf.ctoProductionCapacityValidation.map((r, idx) => {
                                  const fmt = (v) => {
                                    if (v === null || v === undefined) return '';
                                    const n = Number(v);
                                    if (!Number.isFinite(n)) return '';
                                    return (Math.round(n * 100) / 100).toString();
                                  };
                                  const uom = (r.uom || '').toString().trim().toUpperCase();
                                  const consentUom = (r.consentUom || uom || '').toString().trim().toUpperCase();
                                  const totalMonthlyCapacity = Number(r.totalMonthlyCapacity) || 0;
                                  const totalMonthlyCapacityMt = Number(r.totalMonthlyCapacityMt) || (uom === 'KG' ? totalMonthlyCapacity / 1000 : 0);
                                  const consentCapacity = Number(r.consentCapacity) || 0;
                                  const util = Number.isFinite(Number(r.utilizationPercent))
                                    ? Number(r.utilizationPercent)
                                    : (consentCapacity > 0
                                      ? (((uom === 'KG' && consentUom === 'MT') ? (totalMonthlyCapacity / 1000) : totalMonthlyCapacity) / consentCapacity) * 100
                                      : 0);
                                  const isHigh = util >= 100;
                                  return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="p-3 text-gray-700">{r.productName || '-'}</td>
                                      <td className="p-3 text-gray-700">{r.machineName || '-'}</td>
                                      <td className="p-3 text-gray-700">{fmt(r.productionOutputPerHr)}</td>
                                      <td className="p-3 text-gray-700">{uom || '-'}</td>
                                      <td className="p-3 text-gray-700">{fmt(r.powerPerHrKwh)}</td>
                                      <td className="p-3 text-gray-700">{fmt(r.workingDays)}</td>
                                      <td className="p-3 text-gray-700">{fmt(r.workingHoursPerDay)}</td>
                                      <td className="p-3 text-gray-700">{fmt(totalMonthlyCapacity)}</td>
                                      <td className="p-3 text-gray-700">{uom === 'KG' ? fmt(totalMonthlyCapacityMt) : 'NA'}</td>
                                      <td className="p-3 text-gray-700">{fmt(r.totalElectricityConsumptionPerMonthKwh)}</td>
                                      <td className="p-3 text-gray-700">{fmt(consentCapacity)}</td>
                                      <td className="p-3 text-gray-700">{uom === 'KG' ? 'MT' : (consentUom || '-')}</td>
                                      <td className={`p-3 ${isHigh ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{fmt(util)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
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
    const normalizeLayerType = (value) => {
      const raw = (value ?? '').toString().trim();
      if (!raw) return '—';
      const s = raw.toLowerCase();
      if (s.includes('multi')) return 'Multilayer';
      if (s.includes('mono') || s.includes('single')) return 'Monolayer';
      return raw;
    };

    const toggleBrandOwnerSku = (skuKey) => {
      const currentExpanded = expandedBrandOwnerSku;

      if (currentExpanded && currentExpanded !== skuKey) {
        const toClose = currentExpanded;
        setClosingBrandOwnerSku(toClose);
        window.setTimeout(() => {
          setClosingBrandOwnerSku((prev) => (prev === toClose ? null : prev));
        }, 260);
      }

      if (currentExpanded === skuKey) {
        setClosingBrandOwnerSku(skuKey);
        window.setTimeout(() => {
          setExpandedBrandOwnerSku((prev) => (prev === skuKey ? null : prev));
          setClosingBrandOwnerSku((prev) => (prev === skuKey ? null : prev));
        }, 260);
        return;
      }

      setExpandedBrandOwnerSku(skuKey);
      setClosingBrandOwnerSku(null);
    };

    const categories = ['All', ...new Set(skuTableData.map(item => item.industryCategory).filter(Boolean))];
    const foodGrades = ['All', ...new Set(skuTableData.map(item => item.foodGrade).filter(Boolean))];
    const complianceOptions = ['All', 'Compliant', 'Non-Compliant'];

    const filteredByIndustry = selectedIndustryCategory === 'All' 
      ? skuTableData 
      : skuTableData.filter(item => item.industryCategory === selectedIndustryCategory);

    const filteredByFood = selectedFoodGrade === 'All'
      ? filteredByIndustry
      : filteredByIndustry.filter(item => (item.foodGrade || '-') === selectedFoodGrade);

    const filteredData = selectedComplianceStatus === 'All'
      ? filteredByFood
      : filteredByFood.filter(item => item.productComplianceStatus === selectedComplianceStatus);

    // Calculate status counts based on ALL data (or filtered? usually dashboard cards show summary of current view)
    // Let's use filteredData for dynamic updates as requested by standard patterns
    const compliantCount = filteredData.filter(item => item.productComplianceStatus === 'Compliant').length;
    const nonCompliantCount = filteredData.filter(item => item.productComplianceStatus === 'Non-Compliant').length;
    const totalWithStatus = compliantCount + nonCompliantCount;
    const compliantPct = totalWithStatus ? ((compliantCount / totalWithStatus) * 100).toFixed(1) : '0.0';
    const nonCompliantPct = totalWithStatus ? ((nonCompliantCount / totalWithStatus) * 100).toFixed(1) : '0.0';

    let detailColumns = [
      { title: 'Component Code', dataIndex: 'componentCode', key: 'componentCode', width: 120, fixed: 'left', render: text => <span className="font-semibold text-gray-700">{text}</span> },
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
      { title: 'Recycled Polymer Used', dataIndex: 'recycledPolymerUsed', key: 'recycledPolymerUsed', width: 160 },
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

    const producerDetailColumns = detailColumns
      .filter((col) => col.key !== 'componentPolymer')
      .map((col) => {
        if (col.key !== 'layerType') return col;
        return {
          ...col,
          title: 'Multilayer/Monolayer',
          render: (val) => <span className="text-gray-800">{normalizeLayerType(val)}</span>
        };
      });

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

    let columns = [];

    if (isProducerEntity) {
        // Use standard component table columns for Producer (flat view)
        columns = producerDetailColumns;
    } else {
        // Standard SKU -> Component Table for Brand Owners
        columns = [
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
    }

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
            {isProducerEntity && (
              <div className="w-full md:w-64">
                <span className="text-sm font-semibold text-gray-700 block mb-1">Filter by Food Grade:</span>
                <Select
                  className="w-full"
                  value={selectedFoodGrade}
                  onChange={setSelectedFoodGrade}
                  options={foodGrades.map(f => ({ value: f, label: f }))}
                />
              </div>
            )}
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
          <div className="flex items-center gap-3">
            {isProducerEntity && (
              <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 mr-2">
                <button
                  onClick={() => setProducerViewMode('cards')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    producerViewMode === 'cards' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setProducerViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    producerViewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Table
                </button>
              </div>
            )}
            {!isProducerEntity && (
              <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 mr-2">
                <button
                  onClick={() => setBrandOwnerViewMode('accordion')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    brandOwnerViewMode === 'accordion' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setBrandOwnerViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    brandOwnerViewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Table
                </button>
              </div>
            )}
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

        {isProducerEntity && producerViewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredData.map((item, idx) => {
              const cardKey = item.key || `${item.componentCode}-${idx}`;
              const status = item.componentComplianceStatus || item.productComplianceStatus || 'Pending';
              const isOpen = producerCardOpen.has(cardKey);
              const toggleOpen = () => {
                setProducerCardOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(cardKey)) next.delete(cardKey);
                  else next.add(cardKey);
                  return next;
                });
              };

              return (
                <div key={cardKey} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-purple-500" />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                        {item.componentCode || '-'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                        status === 'Compliant'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : status === 'Non-Compliant'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-yellow-50 text-amber-700 border-yellow-200'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.componentImage ? (
                          <Image
                            src={typeof item.componentImage === 'string' ? resolveUrl(item.componentImage) : ''}
                            alt="Component"
                            className="w-full h-full object-cover"
                            preview={item.componentImage ? { src: typeof item.componentImage === 'string' ? resolveUrl(item.componentImage) : '' } : false}
                          />
                        ) : (
                          <div className="text-[10px] text-gray-400 text-center leading-tight px-2">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 leading-snug">
                          {item.componentDescription || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-4 space-y-4">
                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md">
                        <FaUser className="text-[11px] text-blue-700" />
                        <span>SUPPLIER</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="col-span-2">
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">SUPPLIER NAME</div>
                          <div className="mt-0.5 text-gray-900 font-semibold">{item.supplierName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">SUPPLIER STATUS</div>
                          <div className="mt-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              (item.supplierStatus || '').toLowerCase().includes('reg')
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : (item.supplierStatus || '').toLowerCase().includes('unreg')
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {item.supplierStatus || '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">EPR CERT. NO</div>
                          <div className="mt-0.5 text-gray-900 font-semibold">{item.eprCertificateNumber || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md">
                        <FaRecycle className="text-[11px] text-emerald-700" />
                        <span>POLYMER DETAILS</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">POLYMER TYPE</div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                              {item.polymerType || '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">RECYCLED POLYMER</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.recycledPolymerUsed || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md">
                        <FaIdCard className="text-[11px] text-purple-700" />
                        <span>CLASSIFICATION</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">CATEGORY</div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                              {item.category || '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">CATEGORY II TYPE</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.categoryIIType || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">MULTILAYER/MONOLAYER</div>
                          <div className="mt-1 text-gray-900 font-semibold">{normalizeLayerType(item.layerType)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">CONTAINER CAPACITY</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.containerCapacity || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">THICKNESS (M)</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.thickness || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-md">
                        <FaChartLine className="text-[11px] text-orange-700" />
                        <span>MEASUREMENTS</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">MONTHLY (MT)</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.monthlyPurchaseMt || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">RECYCLED QTY</div>
                          <div className="mt-1 text-gray-900 font-semibold">{item.recycledQty || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-gray-50 text-gray-700 px-2.5 py-1.5 rounded-md">
                        <FaFile className="text-[11px] text-gray-500" />
                        <span>REMARKS & DOCUMENTS</span>
                      </div>
                      <div className="mt-2 space-y-2 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">AUDITOR REMARKS</div>
                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">{item.auditorRemarks || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">ADDITIONAL DOCUMENT</div>
                          <div className="mt-0.5">
                            {item.additionalDocument ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = typeof item.additionalDocument === 'string' ? resolveUrl(item.additionalDocument) : '';
                                  if (url) window.open(url, '_blank');
                                }}
                                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-900 font-semibold">—</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">MANAGER REMARKS</div>
                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">{item.managerRemarks || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (!isProducerEntity && initialViewMode === 'client-connect' && brandOwnerViewMode === 'accordion') ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredData.map((sku, idx) => {
              const skuKey = sku.key || sku._id || sku.skuCode || `sku-${idx}`;
              const isExpanded = expandedBrandOwnerSku === skuKey && closingBrandOwnerSku !== skuKey;
              const isClosing = closingBrandOwnerSku === skuKey;
              const status = sku.productComplianceStatus || 'Pending';
              const borderClass =
                status === 'Compliant'
                  ? 'border-l-green-500'
                  : status === 'Non-Compliant'
                  ? 'border-l-red-500'
                  : 'border-l-gray-300';

              const componentCount = new Set((sku.details || []).map((d) => (d.componentCode || '').trim()).filter(Boolean)).size;
              const compliantCount = (sku.details || []).filter((d) => {
                const st = (d.componentComplianceStatus || d.complianceStatus || 'Pending').toString();
                return st === 'Compliant';
              }).length;
              const nonCompliantCount = (sku.details || []).filter((d) => {
                const st = (d.componentComplianceStatus || d.complianceStatus || 'Pending').toString();
                return st === 'Non-Compliant';
              }).length;

              return (
                <div key={skuKey} className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm border-l-4 ${borderClass} ${isExpanded ? 'lg:col-span-2' : ''}`}>
                  <div className={`px-4 py-4 ${status === 'Compliant' ? 'bg-green-50/30' : status === 'Non-Compliant' ? 'bg-red-50/30' : 'bg-gray-50/30'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {sku.productImage ? (
                            <Image
                              src={typeof sku.productImage === 'string' ? resolveUrl(sku.productImage) : ''}
                              alt="Product"
                              className="w-full h-full object-cover"
                              preview={sku.productImage ? { src: typeof sku.productImage === 'string' ? resolveUrl(sku.productImage) : '' } : false}
                            />
                          ) : (
                            <div className="text-[10px] text-gray-400 text-center leading-tight px-2">No Image</div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
                              {sku.skuCode || '—'}
                            </span>
                            {sku.industryCategory ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                                {sku.industryCategory}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-900 truncate">{sku.skuDescription || '—'}</div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                          status === 'Compliant'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : status === 'Non-Compliant'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {status}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          <FaRecycle className="text-green-600" />
                          <span className="text-gray-500">Recycled Qty:</span>
                          <span className="text-gray-900">{sku.recycledQty || '0.000'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold tracking-wider text-gray-600">{componentCount} COMPONENTS</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isExpanded) toggleBrandOwnerSku(skuKey);
                          setBrandOwnerComponentStatusFilter('Compliant');
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200"
                      >
                        Compliant: {compliantCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isExpanded) toggleBrandOwnerSku(skuKey);
                          setBrandOwnerComponentStatusFilter('Non-Compliant');
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200"
                      >
                        Non‑Compliant: {nonCompliantCount}
                      </button>
                      {isExpanded && brandOwnerComponentStatusFilter && (
                        <button
                          type="button"
                          onClick={() => setBrandOwnerComponentStatusFilter(null)}
                          className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-gray-600 hover:text-gray-800"
                          title="Show all components"
                        >
                          Show All
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBrandOwnerSku(skuKey)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
                    >
                      <span>{isExpanded ? 'Collapse' : 'View Components'}</span>
                      <FaChevronDown className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <div
                    className={`border-t border-gray-100 bg-white overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-[6000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {(isExpanded || isClosing) && (
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {((sku.details || []).filter((comp) => {
                            if (!brandOwnerComponentStatusFilter) return true;
                            const st = (comp.componentComplianceStatus || comp.complianceStatus || 'Pending').toString();
                            return st === brandOwnerComponentStatusFilter;
                          })).map((comp, cidx) => {
                            const compKey = comp.key || comp._id || `${comp.componentCode || 'comp'}-${comp.supplierName || 'supp'}-${cidx}`;
                            const compStatus = comp.componentComplianceStatus || comp.complianceStatus || 'Pending';
                            const supplierStatus = (comp.supplierStatus || '').toString();
                            const isRegistered = supplierStatus.toLowerCase().includes('reg');
                            const isUnregistered = supplierStatus.toLowerCase().includes('unreg');

                            return (
                              <div key={compKey} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="h-1 bg-gray-200" />
                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                                      {comp.componentCode || '—'}
                                    </span>
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                      compStatus === 'Compliant'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : compStatus === 'Non-Compliant'
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}>
                                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                      {compStatus}
                                    </span>
                                  </div>

                                  <div className="mt-3 flex items-start gap-3">
                                    <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {comp.componentImage ? (
                                        <Image
                                          src={typeof comp.componentImage === 'string' ? resolveUrl(comp.componentImage) : ''}
                                          alt="Component"
                                          className="w-full h-full object-cover"
                                          preview={comp.componentImage ? { src: typeof comp.componentImage === 'string' ? resolveUrl(comp.componentImage) : '' } : false}
                                        />
                                      ) : (
                                        <div className="text-[10px] text-gray-400 text-center leading-tight px-2">No Image</div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 leading-snug">
                                        {comp.componentDescription || '—'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    <div>
                                      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                        <FaUser className="text-[11px]" />
                                        SUPPLIER
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                        <div className="text-gray-500 font-bold">Supplier Name</div>
                                        <div className="text-gray-900 font-semibold truncate">{comp.supplierName || '—'}</div>
                                        <div className="text-gray-500 font-bold">Supplier Status</div>
                                        <div>
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                            isRegistered
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : isUnregistered
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-gray-50 text-gray-700 border-gray-200'
                                          }`}>
                                            {supplierStatus || '—'}
                                          </span>
                                        </div>
                                        <div className="text-gray-500 font-bold">EPR Cert. No</div>
                                        <div className="text-gray-900 font-semibold">{comp.eprCertificateNumber || '—'}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                        <FaRecycle className="text-[11px]" />
                                        POLYMER DETAILS
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <div className="text-gray-500 font-bold">Polymer Type</div>
                                          <div className="mt-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                              {comp.polymerType || '—'}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Comp. Polymer</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.componentPolymer || '—'}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                        <FaIdCard className="text-[11px]" />
                                        CLASSIFICATION
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <div className="text-gray-500 font-bold">Category</div>
                                          <div className="mt-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                                              {comp.category || '—'}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Category II Type</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.categoryIIType || '—'}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Multilayer/Monolayer</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{normalizeLayerType(comp.layerType)}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Container Capacity</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.containerCapacity || '—'}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Thickness (M)</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.thickness || '—'}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                        <FaChartLine className="text-[11px]" />
                                        MEASUREMENTS
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <div className="text-gray-500 font-bold">Monthly Purchase (MT)</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.monthlyPurchaseMt || '—'}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Recycled Qty</div>
                                          <div className="mt-1 text-gray-900 font-semibold">{comp.recycledQty || '—'}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-gray-600">
                                        <FaFile className="text-[11px] text-gray-400" />
                                        REMARKS & DOCUMENTS
                                      </div>
                                      <div className="mt-2 space-y-2 text-xs">
                                        <div>
                                          <div className="text-gray-500 font-bold">Auditor Remarks</div>
                                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">{comp.auditorRemarks || '—'}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Additional Document</div>
                                          <div className="mt-0.5">
                                            {comp.additionalDocument ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const url = typeof comp.additionalDocument === 'string' ? resolveUrl(comp.additionalDocument) : '';
                                                  if (url) window.open(url, '_blank');
                                                }}
                                                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                                              >
                                                View
                                              </button>
                                            ) : (
                                              <span className="text-gray-900 font-semibold">—</span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 font-bold">Manager Remarks</div>
                                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">{comp.managerRemarks || '—'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <Table
              columns={columns}
              dataSource={filteredData}
              pagination={false}
              rowKey={(row, index) => row.key || row._id || `${row.skuCode || 'sku'}-${index}`}
              scroll={{ x: 1200 }}
              size="middle"
              expandable={isProducerEntity ? undefined : {
                expandedRowRender,
                rowExpandable: (record) => record.details && record.details.length > 0,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderIndustrySkuWiseSummary = () => {
    const statusBadgeClass = (status) => {
      if (status === 'Compliant') return 'bg-green-100 text-green-700';
      if (status === 'Non-Compliant') return 'bg-red-100 text-red-700';
      if (status === 'Partially Compliant') return 'bg-amber-100 text-amber-700';
      if (status === 'Under Review') return 'bg-blue-100 text-blue-700';
      return 'bg-gray-100 text-gray-700';
    };

    const reportRows = [];

    industrySkuSummaryData.forEach((item, index) => {
      const industryKey = (item.industryCategory || 'Uncategorized').trim();
      const previousIndustry = index > 0 ? (industrySkuSummaryData[index - 1]?.industryCategory || 'Uncategorized').trim() : null;

      if (industryKey !== previousIndustry) {
        reportRows.push({
          key: `industry-header-${industryKey}-${index}`,
          rowType: 'industry-header',
          industryCategory: industryKey
        });
      }

      reportRows.push({
        ...item,
        rowType: 'sku-row'
      });
    });

    const industryCategorySummaryRows = Object.values(
      industrySkuSummaryData.reduce((acc, item) => {
        const industryKey = (item.industryCategory || 'Uncategorized').trim() || 'Uncategorized';
        if (!acc[industryKey]) {
          acc[industryKey] = {
            key: `industry-summary-${industryKey}`,
            industryCategory: industryKey,
            totalSku: 0,
            complianceCompliant: 0,
            complianceNonCompliant: 0,
            markingCompliant: 0,
            markingNonCompliant: 0,
          };
        }

        acc[industryKey].totalSku += 1;
        if (item.complianceStatus === 'Compliant') acc[industryKey].complianceCompliant += 1;
        if (item.complianceStatus === 'Non-Compliant') acc[industryKey].complianceNonCompliant += 1;
        if (item.markingLabelingStatus === 'Compliant') acc[industryKey].markingCompliant += 1;
        if (item.markingLabelingStatus === 'Non-Compliant') acc[industryKey].markingNonCompliant += 1;

        return acc;
      }, {})
    ).sort((left, right) => left.industryCategory.localeCompare(right.industryCategory));

    const reportColumns = [
      {
        title: <div className="text-center">Industry Wise SKU</div>,
        dataIndex: 'industryCategory',
        key: 'industryWiseSku',
        width: 320,
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
        render: (_, record) => {
          if (record.rowType === 'industry-header') {
            return {
              children: (
                <div className="w-full text-center text-[14px] leading-5 font-bold text-orange-600 py-0">
                  {record.industryCategory || 'Uncategorized'}
                </div>
              ),
              props: {
                colSpan: 6,
                className: 'bg-orange-50 !py-1'
              }
            };
          }

          return {
            children: (
              <div className="min-w-[240px] text-center">
                <div className="text-sm font-semibold text-gray-900 underline underline-offset-2">
                  {record.skuCode || '-'}
                </div>
                <div className="text-sm font-semibold text-gray-900 whitespace-pre-wrap">
                  {record.skuDescription || '-'}
                </div>
              </div>
            ),
            props: {
              className: 'align-top'
            }
          };
        }
      },
      {
        title: <div className="text-center">Compliance Status</div>,
        dataIndex: 'complianceStatus',
        key: 'complianceStatus',
        width: 180,
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
        render: (value, record) => {
          if (record.rowType === 'industry-header') {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(value)}`}>
              {value || 'Pending'}
            </span>
          );
        }
      },
      {
        title: <div className="text-center">Marking and Labeling Status</div>,
        dataIndex: 'markingLabelingStatus',
        key: 'markingLabelingStatus',
        width: 220,
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
        render: (value, record) => {
          if (record.rowType === 'industry-header') {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(value)}`}>
              {value || 'Pending'}
            </span>
          );
        }
      },
      {
        title: <div className="text-center">Supplier Status</div>,
        key: 'supplierStatusGroup',
        align: 'center',
        children: [
          {
            title: <div className="text-center">Registered</div>,
            dataIndex: 'supplierRegisteredCount',
            key: 'supplierRegisteredCount',
            width: 130,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
            render: (value, record) => {
              if (record.rowType === 'industry-header') {
                return { children: null, props: { colSpan: 0 } };
              }

              return <span className="text-sm font-medium text-gray-700">{value ?? 0}</span>;
            }
          },
          {
            title: <div className="text-center">Unregistered</div>,
            dataIndex: 'supplierUnregisteredCount',
            key: 'supplierUnregisteredCount',
            width: 150,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
            render: (value, record) => {
              if (record.rowType === 'industry-header') {
                return { children: null, props: { colSpan: 0 } };
              }

              return <span className="text-sm font-medium text-gray-700">{value ?? 0}</span>;
            }
          }
        ]
      },
      {
        title: <div className="text-center">Remarks</div>,
        dataIndex: 'remarks',
        key: 'remarks',
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
        render: (value, record) => {
          if (record.rowType === 'industry-header') {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <div className="text-xs text-gray-600 whitespace-pre-wrap leading-5 min-h-[20px] text-center">
              {value || '-'}
            </div>
          );
        }
      }
    ];

    const industryCategorySummaryColumns = [
      {
        title: <div className="text-center">Industry Category</div>,
        dataIndex: 'industryCategory',
        key: 'industryCategory',
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
        render: (value) => <div className="text-sm font-semibold text-gray-800 text-center">{value || '-'}</div>
      },
      {
        title: <div className="text-center">Total SKU</div>,
        dataIndex: 'totalSku',
        key: 'totalSku',
        width: 120,
        align: 'center',
        onHeaderCell: () => ({ className: '!text-center' }),
      },
      {
        title: <div className="text-center">Compliance Status</div>,
        key: 'complianceStatusGroup',
        align: 'center',
        children: [
          {
            title: <div className="text-center">Compliant</div>,
            dataIndex: 'complianceCompliant',
            key: 'complianceCompliant',
            width: 140,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
          },
          {
            title: <div className="text-center">Non Compliant</div>,
            dataIndex: 'complianceNonCompliant',
            key: 'complianceNonCompliant',
            width: 160,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
          }
        ]
      },
      {
        title: <div className="text-center">Marking and Labeling</div>,
        key: 'markingLabelingGroup',
        align: 'center',
        children: [
          {
            title: <div className="text-center">Compliant</div>,
            dataIndex: 'markingCompliant',
            key: 'markingCompliant',
            width: 140,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
          },
          {
            title: <div className="text-center">Non Compliant</div>,
            dataIndex: 'markingNonCompliant',
            key: 'markingNonCompliant',
            width: 160,
            align: 'center',
            onHeaderCell: () => ({ className: '!text-center' }),
          }
        ]
      }
    ];

    const renderTargetTableColumns = (columns = []) =>
      columns.map((col, colIdx) => {
        const title = typeof col === 'object' ? col.title : col;
        const key = typeof col === 'object' ? col.key : col;

        return {
          title: <div className="text-center text-xs font-bold uppercase text-gray-700">{title}</div>,
          key,
          align: colIdx === 0 ? 'left' : 'center',
          render: (_, record) => {
            const value = record?.[key];
            if (colIdx === 0) {
              return <span className="font-medium text-gray-700">{value}</span>;
            }
            return <span className="text-gray-600">{value}</span>;
          }
        };
      });

    const annualTargetTableData = (summaryAnnualTargetRows || []).map((row, index) => {
      const preConsumer = parseFloat(row?.['Pre Consumer'] || 0) || 0;
      const postConsumer = parseFloat(row?.['Post Consumer'] || 0) || 0;

      return {
        key: `${row?.['Category of Plastic'] || 'annual-target'}-${index}`,
        category: row?.['Category of Plastic'] || '-',
        procurementTons: row?.['Total Purchase'] ?? 0,
        salesTons: (preConsumer + postConsumer).toFixed(4),
        exportTons: row?.['Export'] ?? 0,
      };
    });

    const annualTargetColumns = [
      {
        title: <div className="text-center text-xs font-bold uppercase text-gray-700">Category</div>,
        dataIndex: 'category',
        key: 'category',
        align: 'left',
        render: (value) => <span className="font-medium text-gray-700">{value}</span>
      },
      {
        title: <div className="text-center text-xs font-bold uppercase text-gray-700">Procurement (Tons)</div>,
        dataIndex: 'procurementTons',
        key: 'procurementTons',
        align: 'center',
        render: (value) => <span className="text-gray-600">{value}</span>
      },
      {
        title: <div className="text-center text-xs font-bold uppercase text-gray-700">Sales (Tons)</div>,
        dataIndex: 'salesTons',
        key: 'salesTons',
        align: 'center',
        render: (value) => <span className="text-gray-600">{value}</span>
      },
      {
        title: <div className="text-center text-xs font-bold uppercase text-gray-700">Export (Tons)</div>,
        dataIndex: 'exportTons',
        key: 'exportTons',
        align: 'center',
        render: (value) => <span className="text-gray-600">{value}</span>
      }
    ];

    return (
      <div className="space-y-5">
        {!isProducerEntity && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Summary is shown SKU-wise for the client entity type: <span className="font-semibold">{client?.entityType || 'N/A'}</span>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Industry Category Summary</h3>
          </div>

          <Table
            columns={industryCategorySummaryColumns}
            dataSource={industryCategorySummaryRows}
            rowKey="key"
            pagination={false}
            className="[&_.ant-table-thead_th]:!py-2 [&_.ant-table-thead_th]:!px-3 [&_.ant-table-thead_th]:!leading-4 [&_.ant-table-thead_th]:align-middle"
            locale={{
              emptyText: summaryLoading
                ? 'Loading industry category summary...'
                : 'No industry summary data available.'
            }}
            scroll={{ x: 900 }}
            bordered
          />
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Summary Report of Industry, SKU Wise</h3>
              <p className="text-xs text-gray-500 mt-1">
                Combined view of overall compliance and marking/labeling status for each saved SKU.
              </p>
            </div>
          </div>

          <Table
            columns={reportColumns}
            dataSource={reportRows}
            rowKey="key"
            loading={summaryLoading}
            pagination={false}
            locale={{
              emptyText: summaryLoading
                ? 'Loading summary report...'
                : 'No industry or SKU compliance data available.'
            }}
            scroll={{ x: 1000 }}
            bordered
          />
        </div>

        {annualTargetTableData.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Annual Summary</h3>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-gray-700">
                <Table
                  dataSource={annualTargetTableData}
                  columns={annualTargetColumns}
                  pagination={false}
                  rowKey="key"
                  bordered
                  size="middle"
                  scroll={{ x: 700 }}
                />
              </div>
            </div>
          </div>
        )}

        {summaryTargetTables.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">EPR Target Calculation</h3>
            </div>

            <div className="p-5 space-y-5">
              {summaryTargetTables.map((table, index) => (
                <div
                  key={`${table.title || 'target-table'}-${index}`}
                  className="rounded-xl border border-gray-200 overflow-hidden shadow-sm [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-gray-700"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-white px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-blue-500"></div>
                    <span className="font-semibold text-gray-700 text-sm">{table.title}</span>
                  </div>

                  <Table
                    dataSource={table.data || []}
                    columns={renderTargetTableColumns(table.columns || [])}
                    pagination={false}
                    rowKey={(row, rowIndex) => `${row['Category of Plastic'] || row.category || 'target'}-${rowIndex}`}
                    bordered
                    size="small"
                    scroll={{ x: 900 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
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
          {/* {(client.wasteType || '').toLowerCase().includes('plastic') && initialViewMode !== 'client-connect' && (
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
          )} */}
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
                    { key: 'industry-summary', label: 'Summary Report of Industry, SKU Wise', icon: FaChartLine },
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
                {clientConnectTab === 'industry-summary' && renderIndustrySkuWiseSummary()}
                {clientConnectTab === 'industry' && renderSkuSummary()}
                {clientConnectTab === 'marking' && (
                  <MarkingLabeling 
                    clientId={id} 
                    API_URL={api.defaults.baseURL} 
                    readOnly={true} 
                    isProducer={isProducerEntity}
                    productRows={summaryProductRows}
                  />
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
