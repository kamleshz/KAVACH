import { useEffect, useMemo, useState } from 'react';
import {
  FaBoxOpen,
  FaBoxes,
  FaBuilding,
  FaCheckCircle,
  FaIndustry,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaRecycle,
  FaSearch,
  FaTag,
  FaUser,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import GsapCountUp from '../components/GsapCountUp';
import GsapRevealGroup from '../components/GsapRevealGroup';
import { resolveClientFileUrl } from '../utils/fileAccess';

const ENTITY_VIEWS = {
  brandOwner: {
    key: 'brandOwner',
    label: 'Brand Owner',
    description: 'Shows SKU details for Brand Owner and Producer & Brand Owner clients.',
    softTone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  producer: {
    key: 'producer',
    label: 'Producer',
    description: 'Shows SKU details for Producer and Producer & Brand Owner clients.',
    softTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const safeNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatWithCommas = (value, digits = 0) =>
  safeNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatCurrency = (value, digits = 3) => `₹ ${formatWithCommas(value, digits)}`;

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const resolveSkuKey = (row = {}) =>
  String(
    row?.skuCode ||
      row?.systemCode ||
      row?.componentCode ||
      row?.skuKey ||
      '',
  ).trim();

const resolveSkuDescription = (row = {}) =>
  String(
    row?.skuDescription ||
      row?.description ||
      '',
  ).trim();

const uniqueSorted = (values = []) =>
  [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

const createComponentImageRecord = (row = {}) => ({
  src: String(row?.componentImage || row?.productImage || '').trim(),
  componentCode: String(row?.componentCode || '').trim(),
  componentDescription: String(row?.componentDescription || '').trim(),
  clientId: String(row?.clientId || '').trim(),
});

const addComponentImageRecord = (aggregate, row = {}) => {
  const imageRecord = createComponentImageRecord(row);
  if (!imageRecord.src) return;

  const imageKey = normalizeKey(
    `${imageRecord.componentCode || imageRecord.componentDescription || 'component'}|${imageRecord.src}`,
  );
  const existing = aggregate.componentImageRecords.get(imageKey) || imageRecord;

  existing.componentCode = existing.componentCode || imageRecord.componentCode;
  existing.componentDescription =
    existing.componentDescription || imageRecord.componentDescription;
  existing.src = existing.src || imageRecord.src;
  existing.clientId = existing.clientId || imageRecord.clientId;

  aggregate.componentImageRecords.set(imageKey, existing);
};

const createComponentRecord = (row = {}) => ({
  componentCode: String(row?.componentCode || '').trim(),
  componentDescription: String(row?.componentDescription || '').trim(),
  systemCodes: new Set(),
  supplierNames: new Set(),
  foodGrades: new Set(),
  polymerTypes: new Set(),
  image: String(row?.componentImage || row?.productImage || '').trim(),
  clientId: String(row?.clientId || '').trim(),
});

const addComponentRecord = (aggregate, row = {}) => {
  const componentCode = String(row?.componentCode || '').trim();
  const componentDescription = String(row?.componentDescription || '').trim();
  const componentKey = normalizeKey(componentCode || componentDescription);
  if (!componentKey) return;

  const existing =
    aggregate.componentRecords.get(componentKey) || createComponentRecord(row);

  existing.componentCode = existing.componentCode || componentCode;
  existing.componentDescription =
    existing.componentDescription || componentDescription;
  existing.image =
    existing.image || String(row?.componentImage || row?.productImage || '').trim();
  existing.clientId = existing.clientId || String(row?.clientId || '').trim();

  if (row?.systemCode) existing.systemCodes.add(row.systemCode);
  if (row?.supplierName) existing.supplierNames.add(row.supplierName);
  if (row?.foodGrade) existing.foodGrades.add(row.foodGrade);
  if (row?.polymerType) existing.polymerTypes.add(row.polymerType);
  if (row?.componentPolymer) existing.polymerTypes.add(row.componentPolymer);
  if (row?.recycledPolymerUsed) existing.polymerTypes.add(row.recycledPolymerUsed);

  aggregate.componentRecords.set(componentKey, existing);
};

const createSupplierRecord = (supplierName = '') => ({
  supplierName: supplierName || '-',
  supplierTypes: new Set(),
  supplierStates: new Set(),
  supplierStatuses: new Set(),
  applicationTypes: new Set(),
  componentCodes: new Set(),
  componentDescriptions: new Set(),
  foodGrades: new Set(),
  eprCertificateNumbers: new Set(),
  fssaiLicNos: new Set(),
  ctoPlantNames: new Set(),
  ctoPlantNos: new Set(),
});

const upsertSupplierRecord = (aggregate, row = {}) => {
  const supplierName = String(row?.supplierName || '').trim();
  if (!supplierName) return;

  const supplierRecordKey = normalizeKey(supplierName);
  const existing =
    aggregate.supplierRecords.get(supplierRecordKey) || createSupplierRecord(supplierName);

  existing.supplierName = supplierName || existing.supplierName;
  if (row?.supplierType) existing.supplierTypes.add(row.supplierType);
  if (row?.supplierState) existing.supplierStates.add(row.supplierState);
  if (row?.supplierStatus) existing.supplierStatuses.add(row.supplierStatus);
  if (row?.applicationType) existing.applicationTypes.add(row.applicationType);
  if (row?.componentCode) existing.componentCodes.add(row.componentCode);
  if (row?.componentDescription) existing.componentDescriptions.add(row.componentDescription);
  if (row?.foodGrade) existing.foodGrades.add(row.foodGrade);
  if (row?.eprCertificateNumber) {
    existing.eprCertificateNumbers.add(row.eprCertificateNumber);
  }
  if (row?.fssaiLicNo) existing.fssaiLicNos.add(row.fssaiLicNo);
  if (row?.ctoPlantName) existing.ctoPlantNames.add(row.ctoPlantName);
  if (row?.ctoPlantNo) existing.ctoPlantNos.add(row.ctoPlantNo);

  aggregate.supplierRecords.set(supplierRecordKey, existing);
};

const matchesBrandOwner = (entityType = '') => {
  const normalized = String(entityType || '').toLowerCase();
  return normalized.includes('brand owner');
};

const matchesProducer = (entityType = '') => {
  const normalized = String(entityType || '').toLowerCase();
  return normalized.includes('producer');
};

const createAggregate = (skuKey) => ({
  skuKey,
  skuCode: skuKey,
  skuDescription: '',
  skuUm: '',
  productImage: '',
  brandOwner: '',
  eprCertBrandOwner: '',
  eprCertProducer: '',
  thicknessMentioned: '',
  polymerUsed: new Set(),
  polymerMentioned: '',
  recycledPercent: 0,
  complianceStatus: '',
  remarks: new Set(),
  complianceRemarks: new Set(),
  clientNames: new Set(),
  states: new Set(),
  entityTypes: new Set(),
  wasteTypes: new Set(),
  supplierNames: new Set(),
  supplierTypes: new Set(),
  industries: new Set(),
  foodGrades: new Set(),
  polymerTypes: new Set(),
  systemCodes: new Set(),
  componentCodes: new Set(),
  componentImageRecords: new Map(),
  componentRecords: new Map(),
  searchFragments: new Set(),
  supplierRecords: new Map(),
  annualPurchaseMt: 0,
  fallbackAnnualPurchaseMt: 0,
  recycledQty: 0,
  fallbackRecycledQty: 0,
  virginQty: 0,
  recycledAmount: 0,
  virginAmount: 0,
  fallbackRecycledPercent: 0,
  productRowCount: 0,
});

const finalizeAggregate = (aggregate) => {
  const componentImages = [...aggregate.componentImageRecords.values()].sort((left, right) =>
    `${left.componentCode || ''} ${left.componentDescription || ''}`.localeCompare(
      `${right.componentCode || ''} ${right.componentDescription || ''}`,
    ),
  );

  const componentImageLookup = new Map();
  componentImages.forEach((item) => {
    const codeKey = normalizeKey(item.componentCode);
    const descKey = normalizeKey(item.componentDescription);
    if (codeKey && !componentImageLookup.has(codeKey)) {
      componentImageLookup.set(codeKey, item);
    }
    if (descKey && !componentImageLookup.has(descKey)) {
      componentImageLookup.set(descKey, item);
    }
  });

  const componentDetails = [...aggregate.componentRecords.values()]
    .map((component) => {
      const fallbackImageRecord =
        componentImageLookup.get(normalizeKey(component.componentCode)) ||
        componentImageLookup.get(normalizeKey(component.componentDescription));

      return {
        componentCode: component.componentCode || '',
        componentDescription: component.componentDescription || '',
        systemCodes: uniqueSorted([...component.systemCodes]),
        supplierNames: uniqueSorted([...component.supplierNames]),
        foodGrades: uniqueSorted([...component.foodGrades]),
        polymerTypes: uniqueSorted([...component.polymerTypes]),
        image:
          component.image ||
          fallbackImageRecord?.src ||
          '',
        clientId:
          component.clientId ||
          fallbackImageRecord?.clientId ||
          '',
      };
    })
    .sort((left, right) =>
      `${left.componentCode || ''} ${left.componentDescription || ''}`.localeCompare(
        `${right.componentCode || ''} ${right.componentDescription || ''}`,
      ),
    );

  return {
    ...aggregate,
    polymerUsed: uniqueSorted([...aggregate.polymerUsed]),
    remarks: uniqueSorted([...aggregate.remarks]),
    complianceRemarks: uniqueSorted([...aggregate.complianceRemarks]),
    clientNames: uniqueSorted([...aggregate.clientNames]),
    states: uniqueSorted([...aggregate.states]),
    entityTypes: uniqueSorted([...aggregate.entityTypes]),
    wasteTypes: uniqueSorted([...aggregate.wasteTypes]),
    supplierNames: uniqueSorted([...aggregate.supplierNames]),
    supplierTypes: uniqueSorted([...aggregate.supplierTypes]),
    industries: uniqueSorted([...aggregate.industries]),
    foodGrades: uniqueSorted([...aggregate.foodGrades]),
    polymerTypes: uniqueSorted([...aggregate.polymerTypes]),
    systemCodes: uniqueSorted([...aggregate.systemCodes]),
    componentCodes: uniqueSorted([...aggregate.componentCodes]),
    componentImages,
    componentDetails,
    annualPurchaseMt:
      safeNumber(aggregate.annualPurchaseMt) || safeNumber(aggregate.fallbackAnnualPurchaseMt),
    recycledQty:
      safeNumber(aggregate.recycledQty) || safeNumber(aggregate.fallbackRecycledQty),
    recycledPercent: Math.max(
      safeNumber(aggregate.recycledPercent),
      safeNumber(aggregate.fallbackRecycledPercent),
    ),
    supplierDetails: [...aggregate.supplierRecords.values()]
      .map((supplier) => ({
        supplierName: supplier.supplierName || '-',
        supplierTypes: uniqueSorted([...supplier.supplierTypes]),
        supplierStates: uniqueSorted([...supplier.supplierStates]),
        supplierStatuses: uniqueSorted([...supplier.supplierStatuses]),
        applicationTypes: uniqueSorted([...supplier.applicationTypes]),
        componentCodes: uniqueSorted([...supplier.componentCodes]),
        componentDescriptions: uniqueSorted([...supplier.componentDescriptions]),
        foodGrades: uniqueSorted([...supplier.foodGrades]),
        eprCertificateNumbers: uniqueSorted([...supplier.eprCertificateNumbers]),
        fssaiLicNos: uniqueSorted([...supplier.fssaiLicNos]),
        ctoPlantNames: uniqueSorted([...supplier.ctoPlantNames]),
        ctoPlantNos: uniqueSorted([...supplier.ctoPlantNos]),
      }))
      .sort((left, right) => (left.supplierName || '').localeCompare(right.supplierName || '')),
    searchCorpus: uniqueSorted([...aggregate.searchFragments]).join(' ').toLowerCase(),
  };
};

const AllClients = () => {
  const [activeEntity, setActiveEntity] = useState(ENTITY_VIEWS.brandOwner.key);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [error, setError] = useState('');
  const [skuDataByEntity, setSkuDataByEntity] = useState({
    [ENTITY_VIEWS.brandOwner.key]: null,
    [ENTITY_VIEWS.producer.key]: null,
  });
  const [selectedSkuKey, setSelectedSkuKey] = useState('');
  const [expandedSupplierKeys, setExpandedSupplierKeys] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const resolveImageUrl = (clientId, value) => {
    if (!value) return '';
    return resolveClientFileUrl(clientId, value);
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchClients = async () => {
      setLoadingClients(true);
      setError('');
      try {
        const limit = 100;
        const firstResponse = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
          signal: controller.signal,
          params: { page: 1, limit },
        });

        const firstPageData = firstResponse.data?.data || [];
        const totalPages = safeNumber(firstResponse.data?.totalPages);

        if (totalPages <= 1) {
          setClients(firstPageData);
          return;
        }

        const remainingResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
              signal: controller.signal,
              params: { page: index + 2, limit },
            }),
          ),
        );

        const mergedClients = [
          ...firstPageData,
          ...remainingResponses.flatMap((response) => response.data?.data || []),
        ];

        setClients(mergedClients);
      } catch (fetchError) {
        if (fetchError.code === 'ERR_CANCELED') return;
        setError(fetchError.response?.data?.message || 'Failed to load client list');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (loadingClients) return;
    if (skuDataByEntity[activeEntity]) return;

    const entityClients = (clients || []).filter((client) => {
      const entityType = client?.entityType || '';
      return activeEntity === ENTITY_VIEWS.brandOwner.key
        ? matchesBrandOwner(entityType)
        : matchesProducer(entityType);
    });

    const fetchEntityDataset = async () => {
      setLoadingDataset(true);
      setError('');

      try {
        const datasetResults = await Promise.all(
          entityClients.map(async (client) => {
            const [
              skuComplianceResult,
              productRowsResult,
              procurementResult,
              componentDetailsResult,
              supplierComplianceResult,
              recycledQuantityResult,
            ] =
              await Promise.allSettled([
                api.get(API_ENDPOINTS.CLIENT.GET_SKU_COMPLIANCE(client._id)),
                api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_COMPLIANCE_ROWS(client._id)),
                api.get(API_ENDPOINTS.CLIENT.ALL_MONTHLY_PROCUREMENT(client._id)),
                api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_COMPONENT_DETAILS(client._id)),
                api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_SUPPLIER_COMPLIANCE(client._id)),
                api.get(API_ENDPOINTS.CLIENT.ALL_RECYCLED_QUANTITY_USED(client._id)),
              ]);

            return {
              client,
              skuCompliance:
                skuComplianceResult.status === 'fulfilled'
                  ? skuComplianceResult.value?.data?.data || []
                  : [],
              productRows:
                productRowsResult.status === 'fulfilled'
                  ? productRowsResult.value?.data?.data || []
                  : [],
              procurementRows:
                procurementResult.status === 'fulfilled'
                  ? procurementResult.value?.data?.data || []
                  : [],
              componentDetails:
                componentDetailsResult.status === 'fulfilled'
                  ? componentDetailsResult.value?.data?.data || []
                  : [],
              supplierCompliance:
                supplierComplianceResult.status === 'fulfilled'
                  ? supplierComplianceResult.value?.data?.data || []
                  : [],
              recycledQuantityRows:
                recycledQuantityResult.status === 'fulfilled'
                  ? recycledQuantityResult.value?.data?.data || []
                  : [],
            };
          }),
        );

        const aggregateMap = new Map();

        datasetResults.forEach(({
          client,
          skuCompliance,
          productRows,
          procurementRows,
          componentDetails,
          supplierCompliance,
          recycledQuantityRows,
        }) => {
          const clientName = client?.clientName || '';
          const clientState =
            client?.state ||
            client?.registeredOfficeAddress?.state ||
            client?.communicationAddress?.state ||
            '';
          const entityType = client?.entityType || '';
          const wasteType = client?.wasteType || '';
          const componentToSkuMap = new Map();
          const systemToSkuMap = new Map();

          const registerSkuAliases = (row = {}) => {
            const skuCode = String(row?.skuCode || '').trim();
            if (!skuCode) return;

            const componentCode = String(row?.componentCode || '').trim();
            const systemCode = String(row?.systemCode || '').trim();

            if (componentCode) componentToSkuMap.set(normalizeKey(componentCode), skuCode);
            if (systemCode) systemToSkuMap.set(normalizeKey(systemCode), skuCode);
          };

          [
            ...(Array.isArray(skuCompliance) ? skuCompliance : []),
            ...(Array.isArray(productRows) ? productRows : []),
            ...(Array.isArray(procurementRows) ? procurementRows : []),
            ...(Array.isArray(componentDetails) ? componentDetails : []),
            ...(Array.isArray(supplierCompliance) ? supplierCompliance : []),
            ...(Array.isArray(recycledQuantityRows) ? recycledQuantityRows : []),
          ].forEach(registerSkuAliases);

          const resolveAggregateKey = (row = {}) => {
            const skuCode = String(row?.skuCode || '').trim();
            if (skuCode) return skuCode;

            const componentCode = String(row?.componentCode || '').trim();
            if (componentCode) {
              const mappedSku = componentToSkuMap.get(normalizeKey(componentCode));
              if (mappedSku) return mappedSku;
            }

            const systemCode = String(row?.systemCode || '').trim();
            if (systemCode) {
              const mappedSku = systemToSkuMap.get(normalizeKey(systemCode));
              if (mappedSku) return mappedSku;
            }

            return resolveSkuKey(row);
          };

          const ensureAggregate = (key) => {
            const normalized = normalizeKey(key);
            if (!normalized) return null;
            if (!aggregateMap.has(normalized)) {
              aggregateMap.set(normalized, createAggregate(String(key).trim()));
            }
            return aggregateMap.get(normalized);
          };

          skuCompliance.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.skuUm = aggregate.skuUm || String(row?.skuUm || '').trim();
            aggregate.productImage =
              aggregate.productImage || String(row?.productImage || '').trim();
            aggregate.brandOwner =
              aggregate.brandOwner || String(row?.brandOwner || clientName).trim();
            aggregate.eprCertBrandOwner =
              aggregate.eprCertBrandOwner || String(row?.eprCertBrandOwner || '').trim();
            aggregate.eprCertProducer =
              aggregate.eprCertProducer || String(row?.eprCertProducer || '').trim();
            aggregate.thicknessMentioned =
              aggregate.thicknessMentioned || String(row?.thicknessMentioned || '').trim();
            aggregate.polymerMentioned =
              aggregate.polymerMentioned || String(row?.polymerMentioned || '').trim();
            aggregate.recycledPercent = Math.max(
              aggregate.recycledPercent,
              safeNumber(row?.recycledPercent),
            );
            aggregate.complianceStatus =
              aggregate.complianceStatus || String(row?.complianceStatus || '').trim();

            (Array.isArray(row?.polymerUsed) ? row.polymerUsed : []).forEach((item) =>
              aggregate.polymerUsed.add(item),
            );
            (Array.isArray(row?.remarks) ? row.remarks : []).forEach((item) =>
              aggregate.remarks.add(item),
            );
            (Array.isArray(row?.complianceRemarks) ? row.complianceRemarks : []).forEach((item) =>
              aggregate.complianceRemarks.add(item),
            );

            aggregate.clientNames.add(clientName);
            aggregate.states.add(clientState);
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            [
              row?.skuCode,
              row?.skuDescription,
              row?.brandOwner,
              row?.polymerMentioned,
              row?.complianceStatus,
              ...(Array.isArray(row?.polymerUsed) ? row.polymerUsed : []),
              ...(Array.isArray(row?.remarks) ? row.remarks : []),
              ...(Array.isArray(row?.complianceRemarks) ? row.complianceRemarks : []),
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });

          productRows.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.skuUm =
              String(row?.skuUom || row?.skuUm || '').trim() || aggregate.skuUm;
            aggregate.productImage =
              String(row?.productImage || row?.componentImage || '').trim() ||
              aggregate.productImage;
            aggregate.thicknessMentioned =
              String(row?.thickness || '').trim() || aggregate.thicknessMentioned;

            aggregate.clientNames.add(clientName || row?.clientName || '');
            aggregate.states.add(clientState || row?.clientState || '');
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            aggregate.supplierNames.add(row?.supplierName || '');
            aggregate.supplierTypes.add(row?.supplierType || '');
            aggregate.industries.add(row?.industryCategory || '');
            aggregate.systemCodes.add(row?.systemCode || '');
            aggregate.componentCodes.add(row?.componentCode || '');
            addComponentImageRecord(aggregate, { ...row, clientId: client?._id });
            addComponentRecord(aggregate, { ...row, clientId: client?._id });
            upsertSupplierRecord(aggregate, row);
            aggregate.productRowCount += 1;
            [
              row?.skuCode,
              row?.skuDescription,
              row?.componentDescription,
              row?.clientName,
              row?.clientState,
              row?.supplierName,
              row?.supplierType,
              row?.supplierState,
              row?.industryCategory,
              row?.foodGrade,
              row?.systemCode,
              row?.componentCode,
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });

          procurementRows.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.skuUm = String(row?.uom || '').trim() || aggregate.skuUm;
            aggregate.clientNames.add(clientName);
            aggregate.states.add(clientState);
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            aggregate.supplierNames.add(row?.supplierName || '');
            aggregate.foodGrades.add(row?.foodGrade || '');
            aggregate.polymerTypes.add(row?.polymerType || '');
            aggregate.polymerTypes.add(row?.componentPolymer || '');
            aggregate.polymerTypes.add(row?.recycledPolymerUsed || '');
            aggregate.systemCodes.add(row?.systemCode || '');
            aggregate.componentCodes.add(row?.componentCode || '');
            aggregate.annualPurchaseMt += safeNumber(row?.monthlyPurchaseMt);
            aggregate.recycledQty += safeNumber(row?.recycledQty);
            aggregate.virginQty += safeNumber(row?.virginQty);
            aggregate.recycledAmount += safeNumber(row?.recycledQrtAmount);
            aggregate.virginAmount += safeNumber(row?.virginQtyAmount);
            addComponentRecord(aggregate, { ...row, clientId: client?._id });
            upsertSupplierRecord(aggregate, row);
            [
              row?.skuCode,
              row?.componentDescription,
              row?.supplierName,
              row?.foodGrade,
              row?.polymerType,
              row?.componentPolymer,
              row?.recycledPolymerUsed,
              row?.systemCode,
              row?.componentCode,
              row?.category,
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });

          componentDetails.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.systemCodes.add(row?.systemCode || '');
            aggregate.componentCodes.add(row?.componentCode || '');
            aggregate.foodGrades.add(row?.foodGrade || '');
            aggregate.polymerTypes.add(row?.polymerType || '');
            aggregate.polymerTypes.add(row?.componentPolymer || '');
            aggregate.polymerTypes.add(row?.recycledPolymerUsed || '');
            aggregate.clientNames.add(clientName);
            aggregate.states.add(clientState);
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            addComponentImageRecord(aggregate, { ...row, clientId: client?._id });
            addComponentRecord(aggregate, { ...row, clientId: client?._id });

            [
              row?.skuCode,
              row?.componentCode,
              row?.componentDescription,
              row?.polymerType,
              row?.componentPolymer,
              row?.recycledPolymerUsed,
              row?.foodGrade,
              row?.category,
              row?.categoryIIType,
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });

          supplierCompliance.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.supplierNames.add(row?.supplierName || '');
            aggregate.supplierTypes.add(row?.supplierType || '');
            aggregate.foodGrades.add(row?.foodGrade || '');
            aggregate.systemCodes.add(row?.systemCode || '');
            aggregate.componentCodes.add(row?.componentCode || '');
            aggregate.clientNames.add(clientName);
            aggregate.states.add(clientState || row?.supplierState || '');
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            addComponentRecord(aggregate, { ...row, clientId: client?._id });
            upsertSupplierRecord(aggregate, row);

            [
              row?.skuCode,
              row?.componentCode,
              row?.componentDescription,
              row?.supplierName,
              row?.supplierType,
              row?.supplierState,
              row?.supplierStatus,
              row?.applicationType,
              row?.foodGrade,
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });

          recycledQuantityRows.forEach((row) => {
            const key = resolveAggregateKey(row);
            const aggregate = ensureAggregate(key);
            if (!aggregate) return;

            aggregate.skuCode = String(row?.skuCode || aggregate.skuCode || key).trim();
            aggregate.skuDescription =
              resolveSkuDescription(row) || aggregate.skuDescription;
            aggregate.clientNames.add(clientName);
            aggregate.states.add(clientState);
            aggregate.entityTypes.add(entityType);
            aggregate.wasteTypes.add(wasteType);
            aggregate.supplierNames.add(row?.supplierName || '');
            aggregate.componentCodes.add(row?.componentCode || '');
            aggregate.fallbackAnnualPurchaseMt += safeNumber(row?.annualConsumptionMt);
            aggregate.fallbackRecycledQty += safeNumber(row?.usedRecycledQtyMt);

            const rawPercent = safeNumber(row?.usedRecycledPercent);
            const normalizedPercent = rawPercent > 0 && rawPercent <= 1 ? rawPercent * 100 : rawPercent;
            aggregate.fallbackRecycledPercent = Math.max(
              aggregate.fallbackRecycledPercent,
              normalizedPercent,
            );

            addComponentRecord(aggregate, { ...row, clientId: client?._id });
            upsertSupplierRecord(aggregate, row);

            [
              row?.skuCode,
              row?.componentCode,
              row?.componentDescription,
              row?.supplierName,
              row?.category,
              clientName,
              clientState,
              entityType,
              wasteType,
            ].forEach((item) => aggregate.searchFragments.add(item));
          });
        });

        const finalizedData = [...aggregateMap.values()]
          .map(finalizeAggregate)
          .sort((a, b) => {
            const purchaseDiff = safeNumber(b.annualPurchaseMt) - safeNumber(a.annualPurchaseMt);
            if (purchaseDiff !== 0) return purchaseDiff;
            return b.clientNames.length - a.clientNames.length || a.skuCode.localeCompare(b.skuCode);
          });

        setSkuDataByEntity((prev) => ({
          ...prev,
          [activeEntity]: finalizedData,
        }));
      } catch (datasetError) {
        setError(datasetError.response?.data?.message || 'Failed to load SKU details');
      } finally {
        setLoadingDataset(false);
      }
    };

    fetchEntityDataset();
  }, [activeEntity, clients, loadingClients, skuDataByEntity]);

  const activeConfig = ENTITY_VIEWS[activeEntity];
  const activeSkuData = skuDataByEntity[activeEntity] || [];

  const filteredSkuData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);
    if (!queryTokens.length) return activeSkuData;

    return activeSkuData.filter((item) => {
      const haystack = [
        item.skuCode,
        item.skuDescription,
        item.brandOwner,
        item.complianceStatus,
        item.clientNames.join(' '),
        item.states.join(' '),
        item.systemCodes.join(' '),
        item.componentCodes.join(' '),
        item.supplierNames.join(' '),
        item.supplierTypes.join(' '),
        item.industries.join(' '),
        item.foodGrades.join(' '),
        item.polymerTypes.join(' '),
        item.searchCorpus,
      ]
        .join(' ')
        .toLowerCase();

      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [activeSkuData, searchTerm]);

  useEffect(() => {
    if (!filteredSkuData.length) {
      setSelectedSkuKey('');
      return;
    }

    const existing = filteredSkuData.some((item) => item.skuKey === selectedSkuKey);
    if (!existing) {
      setSelectedSkuKey(filteredSkuData[0].skuKey);
    }
  }, [filteredSkuData, selectedSkuKey]);

  useEffect(() => {
    setExpandedSupplierKeys([]);
  }, [selectedSkuKey]);

  const selectedSku = useMemo(
    () => filteredSkuData.find((item) => item.skuKey === selectedSkuKey) || null,
    [filteredSkuData, selectedSkuKey],
  );
  const selectedEntityTypes = selectedSku?.entityTypes || [];
  const selectedHasBrandOwner = selectedEntityTypes.some((type) =>
    matchesBrandOwner(type),
  );
  const selectedHasProducer = selectedEntityTypes.some((type) =>
    matchesProducer(type),
  );
  const selectedSkuMetrics = useMemo(() => {
    if (!selectedSku) {
      return {
        recycledPercent: 0,
        recycledRate: 0,
        virginRate: 0,
      };
    }

    const recycledPercent =
      selectedSku.annualPurchaseMt > 0
        ? (selectedSku.recycledQty / selectedSku.annualPurchaseMt) * 100
        : selectedSku.recycledPercent;

    return {
      recycledPercent,
      recycledRate:
        selectedSku.recycledQty > 0
          ? selectedSku.recycledAmount / selectedSku.recycledQty
          : 0,
      virginRate:
        selectedSku.virginQty > 0 ? selectedSku.virginAmount / selectedSku.virginQty : 0,
    };
  }, [selectedSku]);
  const toggleSupplierDetails = (supplierKey) => {
    setExpandedSupplierKeys((prev) =>
      prev.includes(supplierKey)
        ? prev.filter((item) => item !== supplierKey)
        : [...prev, supplierKey],
    );
  };

  const relevantClients = useMemo(
    () =>
      (clients || []).filter((client) =>
        activeEntity === ENTITY_VIEWS.brandOwner.key
          ? matchesBrandOwner(client?.entityType)
          : matchesProducer(client?.entityType),
      ),
    [activeEntity, clients],
  );

  const totalMappedClients = relevantClients.length;
  const totalSkus = activeSkuData.length;
  const visibleSkus = filteredSkuData.length;
  const hasSearch = Boolean(searchTerm.trim());
  const glimpseSkuData = useMemo(() => activeSkuData.slice(0, 6), [activeSkuData]);
  const resultList = hasSearch ? filteredSkuData : glimpseSkuData;
  const matchedClientCoverage = useMemo(() => {
    const coverageMap = new Map();

    filteredSkuData.forEach((item) => {
      item.clientNames.forEach((clientName) => {
        const key = normalizeKey(clientName);
        if (!key) return;
        if (!coverageMap.has(key)) {
          coverageMap.set(key, {
            clientName,
            skuCount: 0,
            states: new Set(),
            entityTypes: new Set(),
            wasteTypes: new Set(),
          });
        }

        const current = coverageMap.get(key);
        current.skuCount += 1;
        item.states.forEach((state) => current.states.add(state));
        item.entityTypes.forEach((entityType) => current.entityTypes.add(entityType));
        item.wasteTypes.forEach((wasteType) => current.wasteTypes.add(wasteType));
      });
    });

    return [...coverageMap.values()]
      .map((entry) => ({
        ...entry,
        states: uniqueSorted([...entry.states]),
        entityTypes: uniqueSorted([...entry.entityTypes]),
        wasteTypes: uniqueSorted([...entry.wasteTypes]),
      }))
      .sort((a, b) => b.skuCount - a.skuCount || a.clientName.localeCompare(b.clientName));
  }, [filteredSkuData]);

  const handleExportResults = () => {
    if (!hasSearch || !filteredSkuData.length) return;

    const exportData = filteredSkuData.map((item) => ({
      'SKU Code': item.skuCode || '',
      'SKU Description': item.skuDescription || '',
      'Brand Owner': item.brandOwner || '',
      'Compliance Status': item.complianceStatus || '',
      UOM: item.skuUm || '',
      'RC %': item.recycledPercent || 0,
      'Covered Clients': item.clientNames.join(', '),
      States: item.states.join(', '),
      'Entity Types': item.entityTypes.join(', '),
      'Waste Types': item.wasteTypes.join(', '),
      'Supplier Names': item.supplierNames.join(', '),
      'Supplier Types': item.supplierTypes.join(', '),
      'Food Grades': item.foodGrades.join(', '),
      Polymers: item.polymerTypes.length
        ? item.polymerTypes.join(', ')
        : item.polymerUsed.join(', '),
      Industries: item.industries.join(', '),
      'System Codes': item.systemCodes.join(', '),
      'Component Codes': item.componentCodes.join(', '),
      'Annual Purchase MT': item.annualPurchaseMt,
      'Recycled Qty': item.recycledQty,
      'Virgin Qty': item.virginQty,
      'Recycled Amount': item.recycledAmount,
      'Virgin Amount': item.virginAmount,
      'Brand Owner Cert': item.eprCertBrandOwner || '',
      'Producer Cert': item.eprCertProducer || '',
      Remarks: item.remarks.join(', '),
      'Compliance Remarks': item.complianceRemarks.join(', '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SKU Search Results');
    XLSX.writeFile(
      workbook,
      `All_Client_${activeConfig.label.replace(/\s+/g, '_')}_Search_Results.xlsx`,
    );
  };

  return (
    <div className="theme-page w-full space-y-5 lg:space-y-6">
      {/* Hero Header - Polished gradient with better hierarchy */}
      <GsapRevealGroup className="theme-page-card overflow-hidden rounded-[28px] p-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-6 py-6 md:px-8 md:py-7">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-200/40 to-transparent blur-2xl" />
          <div className="absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-gradient-to-tr from-emerald-200/40 to-transparent blur-2xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700 shadow-sm backdrop-blur-sm">
                <FaBoxes className="text-[11px]" />
                All Client SKU Explorer
              </div>
              <h1 className="theme-page-title mt-3 text-2xl font-extrabold tracking-tight md:text-3xl bg-gradient-to-r from-gray-900 via-indigo-900 to-emerald-800 bg-clip-text text-transparent">
                Search SKU details in a more visual way
              </h1>
              <p className="theme-page-text mt-2 text-sm md:text-base text-gray-600">
                Choose <span className="font-semibold text-indigo-700">Brand Owner</span> or <span className="font-semibold text-emerald-700">Producer</span>, then search any SKU to see complete saved details,
                linked clients, compliance information, and quantity highlights.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 xl:min-w-[420px]">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition hover:shadow-md">
                <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Clients
                    </div>
                    <GsapCountUp
                      value={totalMappedClients}
                      animateKey={`all-clients-count-${activeEntity}`}
                      className="theme-page-title mt-1 text-2xl font-extrabold text-gray-900"
                    />
                  </div>
                  <div className="rounded-lg bg-gray-100 p-1.5 text-gray-500">
                    <FaUser className="text-xs" />
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 shadow-sm transition hover:shadow-md">
                <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                      Total SKU
                    </div>
                    <GsapCountUp
                      value={totalSkus}
                      animateKey={`all-sku-total-${activeEntity}`}
                      className="mt-1 text-2xl font-extrabold text-emerald-700"
                    />
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                    <FaBoxes className="text-xs" />
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white px-4 py-3.5 shadow-sm transition hover:shadow-md">
                <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                      Search Result
                    </div>
                    <GsapCountUp
                      value={visibleSkus}
                      animateKey={`all-sku-visible-${activeEntity}-${searchTerm}`}
                      className="mt-1 text-2xl font-extrabold text-indigo-700"
                    />
                  </div>
                  <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
                    <FaSearch className="text-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GsapRevealGroup>

      {/* Search & Filter Toolbar */}
      <GsapRevealGroup className="theme-page-card rounded-[24px] p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
              {Object.values(ENTITY_VIEWS).map((view) => {
                const isActive = view.key === activeEntity;
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setActiveEntity(view.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <FaLayerGroup className="text-xs" />
                    {view.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleExportResults}
              disabled={!hasSearch || !filteredSkuData.length}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                hasSearch && filteredSkuData.length
                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm hover:shadow-md'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              <FaBoxes className="text-xs" />
              Download Excel
            </button>
          </div>

          <div className="relative w-full xl:max-w-xl">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${activeConfig.label} SKU by code, description, client, state or supplier...`}
              className="h-12 w-full rounded-2xl border-2 border-gray-200 bg-white pl-11 pr-12 text-sm font-medium text-gray-700 outline-none shadow-sm transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                aria-label="Clear search"
              >
                <span className="block h-3 w-3 leading-none text-xs font-bold">×</span>
              </button>
            ) : null}
          </div>
        </div>
        <p className="theme-page-text mt-3 text-xs md:text-sm text-gray-500">
          {hasSearch
            ? <><span className="font-semibold text-gray-700">Tip:</span> Full details are shown only for searched results. Use Download Excel to export.</>
            : <><span className="font-semibold text-gray-700">Tip:</span> {activeConfig.description} Only glimpse cards are shown below until you search.</>}
        </p>
      </GsapRevealGroup>

      {!!searchTerm.trim() && (
        <GsapRevealGroup className="theme-page-card rounded-[24px] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Matching Client Coverage
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Showing whatever matching SKU data is available in the database across multiple clients.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {matchedClientCoverage.length} clients matched
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {matchedClientCoverage.length ? (
              matchedClientCoverage.map((item) => (
                <div
                  key={item.clientName}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {item.clientName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.entityTypes.join(', ') || activeConfig.label}
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                      {item.skuCount} SKU
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.states.map((state) => (
                      <span
                        key={`${item.clientName}-${state}`}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                      >
                        {state}
                      </span>
                    ))}
                    {item.wasteTypes.map((wasteType) => (
                      <span
                        key={`${item.clientName}-${wasteType}`}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                      >
                        {wasteType}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 md:col-span-2 xl:col-span-3">
                No matching client data found for this keyword yet.
              </div>
            )}
          </div>
        </GsapRevealGroup>
      )}

      {error ? (
        <GsapRevealGroup className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </GsapRevealGroup>
      ) : null}

      {loadingClients || loadingDataset ? (
        <GsapRevealGroup className="theme-page-card rounded-[28px] p-6 md:p-8">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            Loading SKU dashboard for {activeConfig.label}...
          </div>
        </GsapRevealGroup>
      ) : (
        <>
          {hasSearch ? (
            selectedSku ? (
            <GsapRevealGroup className="theme-page-card overflow-hidden rounded-[28px] p-5 md:p-6">
              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${activeConfig.softTone}`}>
                    <FaTag className="text-[10px]" />
                    {activeConfig.label} SKU Detail
                  </div>
                  <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <h2 className="theme-page-title text-2xl font-bold tracking-tight">
                        {selectedSku.skuCode || 'Unnamed SKU'}
                      </h2>
                      <p className="theme-page-text mt-2 text-sm md:text-base">
                        {selectedSku.skuDescription || 'Description not available'}
                      </p>
                    </div>

                    {selectedSku.productImage ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            src: selectedSku.productImage,
                            componentCode: selectedSku.skuCode,
                            componentDescription: selectedSku.skuDescription,
                          })
                        }
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                      >
                        <img
                          src={selectedSku.productImage}
                          alt={selectedSku.skuCode}
                          className="h-28 w-28 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-gray-300">
                        <FaBoxOpen className="text-3xl" />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Covered Clients
                      </div>
                      <div className="mt-2 text-2xl font-bold text-gray-900">
                        {selectedSku.clientNames.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
                        Annual Purchase MT
                      </div>
                      <div className="mt-2 text-2xl font-bold text-emerald-700">
                        {formatWithCommas(selectedSku.annualPurchaseMt, 3)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                        Recycled Qty
                      </div>
                      <div className="mt-2 text-2xl font-bold text-green-700">
                        {formatWithCommas(selectedSku.recycledQty, 3)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                        Virgin Qty
                      </div>
                      <div className="mt-2 text-2xl font-bold text-indigo-700">
                        {formatWithCommas(selectedSku.virginQty, 3)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
                        Recycled Amount
                      </div>
                      <div className="mt-2 text-xl font-bold text-emerald-700">
                        {formatCurrency(selectedSku.recycledAmount, 3)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                        Virgin Amount
                      </div>
                      <div className="mt-2 text-xl font-bold text-indigo-700">
                        {formatCurrency(selectedSku.virginAmount, 3)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                        Recycled %
                      </div>
                      <div className="mt-2 text-2xl font-bold text-blue-700">
                        {formatWithCommas(selectedSkuMetrics.recycledPercent, 2)}%
                      </div>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                        Recycled Rate
                      </div>
                      <div className="mt-2 text-xl font-bold text-orange-700">
                        {formatCurrency(selectedSkuMetrics.recycledRate, 2)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                        Virgin Rate
                      </div>
                      <div className="mt-2 text-xl font-bold text-violet-700">
                        {formatCurrency(selectedSkuMetrics.virginRate, 2)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
                        Supplier Count
                      </div>
                      <div className="mt-2 text-2xl font-bold text-amber-700">
                        {selectedSku.supplierDetails.length || selectedSku.supplierNames.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <FaBuilding className="text-gray-400" />
                      Clients & Coverage
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSku.clientNames.length ? (
                        selectedSku.clientNames.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No linked clients</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <FaRecycle className="text-emerald-500" />
                      Material Profile
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold text-gray-800">Brand Owner:</span>{' '}
                        {selectedSku.brandOwner || '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Thickness:</span>{' '}
                        {selectedSku.thicknessMentioned || '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Polymers:</span>{' '}
                        {selectedSku.polymerTypes.length
                          ? selectedSku.polymerTypes.join(', ')
                          : selectedSku.polymerUsed.length
                            ? selectedSku.polymerUsed.join(', ')
                            : selectedSku.polymerMentioned || '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Food Grade:</span>{' '}
                        {selectedSku.foodGrades.length
                          ? selectedSku.foodGrades.join(', ')
                          : '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Supplier Type:</span>{' '}
                        {selectedSku.supplierTypes.length
                          ? selectedSku.supplierTypes.join(', ')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <FaIndustry className="text-indigo-500" />
                    Linked Meta
                  </div>
                  <div className="mt-3 space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        States
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSku.states.map((item) => (
                          <span key={`state-${item}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            <FaMapMarkerAlt className="mr-1 inline text-[10px]" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Supplier Data
                      </div>
                      <div className="grid gap-3">
                        {selectedSku.supplierDetails.length ? (
                          selectedSku.supplierDetails.map((item, index) => (
                            (() => {
                              const supplierKey = `${item.supplierName}-${index}`;
                              const isExpanded = expandedSupplierKeys.includes(supplierKey);
                              return (
                                <div
                                  key={supplierKey}
                                  className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleSupplierDetails(supplierKey)}
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-amber-800">
                                        {item.supplierName || '-'}
                                      </div>
                                      <div className="mt-1 text-xs text-amber-700/80">
                                        {item.componentCodes.length
                                          ? item.componentCodes.join(', ')
                                          : '-'}
                                      </div>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-700">
                                      {isExpanded ? 'Collapse' : 'Open'}
                                    </span>
                                  </button>

                                  {isExpanded ? (
                                    <>
                                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-amber-700">
                                          Type: {item.supplierTypes.length
                                            ? item.supplierTypes.join(', ')
                                            : '-'}
                                        </span>
                                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700">
                                          State: {item.supplierStates.length
                                            ? item.supplierStates.join(', ')
                                            : '-'}
                                        </span>
                                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-emerald-700">
                                          Status: {item.supplierStatuses.length
                                            ? item.supplierStatuses.join(', ')
                                            : '-'}
                                        </span>
                                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-violet-700">
                                          Component: {item.componentCodes.length
                                            ? item.componentCodes.join(', ')
                                            : '-'}
                                        </span>
                                      </div>
                                      <div className="mt-2 grid gap-1 text-xs text-gray-600 md:grid-cols-2">
                                        <div>
                                          Food Grade: {item.foodGrades.length
                                            ? item.foodGrades.join(', ')
                                            : '-'}
                                        </div>
                                        <div>
                                          Application: {item.applicationTypes.length
                                            ? item.applicationTypes.join(', ')
                                            : '-'}
                                        </div>
                                        <div>
                                          EPR Cert: {item.eprCertificateNumbers.length
                                            ? item.eprCertificateNumbers.join(', ')
                                            : '-'}
                                        </div>
                                        <div>
                                          FSSAI: {item.fssaiLicNos.length
                                            ? item.fssaiLicNos.join(', ')
                                            : '-'}
                                        </div>
                                        <div>
                                          CTO Plant: {item.ctoPlantNames.length
                                            ? item.ctoPlantNames.join(', ')
                                            : '-'}
                                        </div>
                                        <div>
                                          CTO Plant No: {item.ctoPlantNos.length
                                            ? item.ctoPlantNos.join(', ')
                                            : '-'}
                                        </div>
                                        <div className="md:col-span-2">
                                          Component Description:{' '}
                                          {item.componentDescriptions.length
                                            ? item.componentDescriptions.join(', ')
                                            : '-'}
                                        </div>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              );
                            })()
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No supplier data</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Industry
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSku.industries.length ? (
                          selectedSku.industries.map((item) => (
                            <span key={`industry-${item}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No industry data</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        All Components
                      </div>
                      {selectedSku.componentDetails.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedSku.componentDetails.map((item) => (
                            <div
                              key={`${item.componentCode}-${item.componentDescription}`}
                              className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3"
                            >
                              <div className="flex items-start gap-3">
                                {item.image ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewImage({
                                        src: resolveImageUrl(item.clientId, item.image),
                                        componentCode: item.componentCode,
                                        componentDescription: item.componentDescription,
                                      })
                                    }
                                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-purple-200 bg-white p-1 shadow-sm"
                                  >
                                    <img
                                      src={resolveImageUrl(item.clientId, item.image)}
                                      alt={item.componentCode || item.componentDescription || 'Component'}
                                      className="h-full w-full rounded-lg object-contain"
                                    />
                                  </button>
                                ) : (
                                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-purple-200 bg-white text-purple-300">
                                    <FaBoxOpen className="text-lg" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-purple-900">
                                    {item.componentCode || 'Component'}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-xs text-purple-700/80">
                                    {item.componentDescription || 'Description not available'}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-1 text-[11px] text-gray-600">
                                <div>
                                  <span className="font-semibold text-gray-800">System:</span>{' '}
                                  {item.systemCodes.length ? item.systemCodes.join(', ') : '-'}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">Supplier:</span>{' '}
                                  {item.supplierNames.length ? item.supplierNames.join(', ') : '-'}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">Food Grade:</span>{' '}
                                  {item.foodGrades.length ? item.foodGrades.join(', ') : '-'}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">Polymer:</span>{' '}
                                  {item.polymerTypes.length ? item.polymerTypes.join(', ') : '-'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No component data</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <FaCheckCircle className="text-emerald-500" />
                    Remarks & Certificates
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    {selectedHasBrandOwner ? (
                      <div>
                        <span className="font-semibold text-gray-800">Brand Owner Cert:</span>{' '}
                        {selectedSku.eprCertBrandOwner || '-'}
                      </div>
                    ) : null}
                    {selectedHasProducer ? (
                      <div>
                        <span className="font-semibold text-gray-800">Producer Cert:</span>{' '}
                        {selectedSku.eprCertProducer || '-'}
                      </div>
                    ) : null}
                    <div>
                      <span className="font-semibold text-gray-800">Remarks:</span>{' '}
                      {selectedSku.remarks.length ? selectedSku.remarks.join(', ') : '-'}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Compliance Remarks:</span>{' '}
                      {selectedSku.complianceRemarks.length
                        ? selectedSku.complianceRemarks.join(', ')
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </GsapRevealGroup>
            ) : (
            <GsapRevealGroup className="theme-page-card rounded-[28px] p-6 md:p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <FaSearch className="text-xl" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No SKU match found
                </h3>
                <p className="mt-1 max-w-xl text-sm text-gray-500">
                  Try another SKU code, description, client name, state, supplier, or switch between
                  `Brand Owner` and `Producer`.
                </p>
              </div>
            </GsapRevealGroup>
            )
          ) : (
            <GsapRevealGroup className="theme-page-card rounded-[28px] p-6 md:p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                  <FaSearch className="text-xl" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Quick glimpse only
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Search by SKU description, supplier type, polymer, food grade, client, or SKU
                  code to open the complete detail view and enable Excel download.
                </p>
              </div>
            </GsapRevealGroup>
          )}

          <GsapRevealGroup className="theme-page-card overflow-hidden rounded-[28px]">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {hasSearch ? 'SKU Result List' : 'SKU Glimpse List'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {hasSearch
                      ? 'Click any SKU card to view full saved details on top.'
                      : 'Showing only a brief glimpse. Search any keyword to unlock the complete details.'}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {hasSearch ? `${visibleSkus} visible` : `${resultList.length} glimpses`}
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
              {resultList.map((item) => {
                const isSelected = item.skuKey === selectedSkuKey;
                return (
                  <button
                    key={item.skuKey}
                    type="button"
                    onClick={() => setSelectedSkuKey(item.skuKey)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      hasSearch && isSelected
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900">
                          {item.skuCode || 'Unnamed SKU'}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {item.skuDescription || 'Description not available'}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${activeConfig.softTone}`}>
                        {item.clientNames.length} clients
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <div className="text-gray-400">Annual Purchase</div>
                        <div className="mt-1 font-semibold text-gray-800">
                          {formatWithCommas(item.annualPurchaseMt, 3)} MT
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <div className="text-gray-400">RC %</div>
                        <div className="mt-1 font-semibold text-gray-800">
                          {formatWithCommas(item.recycledPercent, 2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.states.slice(0, 3).map((state) => (
                        <span key={`${item.skuKey}-${state}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          {state}
                        </span>
                      ))}
                      {item.supplierNames.slice(0, 2).map((supplier) => (
                        <span key={`${item.skuKey}-${supplier}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                          {supplier}
                        </span>
                      ))}
                      {!item.supplierNames.length && item.supplierTypes[0] ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                          {item.supplierTypes[0]}
                        </span>
                      ) : null}
                      {!item.supplierNames.length && !item.supplierTypes.length && item.foodGrades[0] ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          {item.foodGrades[0]}
                        </span>
                      ) : null}
                    </div>

                    {!hasSearch ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-medium text-gray-500">
                        Search to view complete details
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </GsapRevealGroup>
        </>
      )}

      {previewImage ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white"
            >
              Close
            </button>
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex max-h-[90vh] items-center justify-center bg-gray-100 p-4">
                <img
                  src={previewImage.src}
                  alt={previewImage.componentCode || previewImage.componentDescription || 'Component image'}
                  className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain"
                />
              </div>
              <div className="space-y-3 p-5">
                <div className="text-lg font-bold text-gray-900">
                  {previewImage.componentCode || 'Component Image'}
                </div>
                <div className="text-sm text-gray-500">
                  {previewImage.componentDescription || 'No component description available'}
                </div>
                <button
                  type="button"
                  onClick={() => window.open(previewImage.src, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Open In New Tab
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AllClients;
