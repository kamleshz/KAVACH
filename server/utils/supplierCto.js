const VALID_SUPPLIER_CTO_REGISTRATION_STATUSES = [
  "Approved",
  "In Progress",
  "Pending",
];

const normalizeText = (value) => (value || "").toString().trim();

export const normalizeSupplierCtoAvailability = (value) =>
  normalizeText(value) === "Not Available" ? "Not Available" : "Available";

export const normalizeSupplierCtoRegistrationStatus = (
  supplierStatus,
  registrationStatus,
) => {
  const normalizedSupplierStatus = normalizeText(supplierStatus).toLowerCase();
  const rawValue = normalizeText(registrationStatus).toLowerCase();
  const matchedValue = VALID_SUPPLIER_CTO_REGISTRATION_STATUSES.find(
    (status) => status.toLowerCase() === rawValue,
  );

  if (normalizedSupplierStatus === "registered") return "Approved";
  if (normalizedSupplierStatus === "unregistered")
    return matchedValue || "Pending";
  return matchedValue || "";
};

export const normalizeSupplierCtoDateText = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = normalizeText(value);
  if (!raw) return "";

  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
};

export const buildSupplierStatusByName = (supplierComplianceRows = []) =>
  new Map(
    (Array.isArray(supplierComplianceRows) ? supplierComplianceRows : [])
      .map((row) => [
        normalizeText(row?.supplierName),
        normalizeText(row?.supplierStatus),
      ])
      .filter(([supplierName]) => !!supplierName),
  );

export const buildSupplierMetaByName = (supplierComplianceRows = []) => {
  const supplierMetaByName = new Map();

  (Array.isArray(supplierComplianceRows) ? supplierComplianceRows : []).forEach(
    (row) => {
      const supplierName = normalizeText(row?.supplierName);
      if (!supplierName || supplierMetaByName.has(supplierName)) return;

      supplierMetaByName.set(supplierName, {
        supplierStatus: normalizeText(row?.supplierStatus),
        eprCertificateNumber: normalizeText(row?.eprCertificateNumber),
      });
    },
  );

  return supplierMetaByName;
};

export const normalizeSupplierCtoRow = (
  row = {},
  {
    supplierStatus = "",
    normalizeDateValue = (value) => value || null,
  } = {},
) => {
  const baseRow = row?.toObject ? row.toObject() : row;
  const supplierName = normalizeText(baseRow?.supplierName);
  const ctoAvailability = normalizeSupplierCtoAvailability(
    baseRow?.ctoAvailability,
  );

  return {
    ...baseRow,
    supplierName,
    registrationStatus: normalizeSupplierCtoRegistrationStatus(
      supplierStatus,
      baseRow?.registrationStatus,
    ),
    ctoAvailability,
    ctoPlantNo:
      ctoAvailability === "Not Available"
        ? ""
        : normalizeText(baseRow?.ctoPlantNo),
    ctoPlantName:
      ctoAvailability === "Not Available"
        ? ""
        : normalizeText(baseRow?.ctoPlantName),
    ctoStartDate:
      ctoAvailability === "Not Available"
        ? null
        : normalizeDateValue(baseRow?.ctoStartDate),
    ctoValidUpto:
      ctoAvailability === "Not Available"
        ? null
        : normalizeDateValue(baseRow?.ctoValidUpto),
    ctoCcaDocument:
      ctoAvailability === "Not Available"
        ? ""
        : normalizeText(baseRow?.ctoCcaDocument),
  };
};

export const createBlankSupplierCtoRow = (
  supplierName = "",
  supplierStatus = "",
) => ({
  supplierName: normalizeText(supplierName),
  registrationStatus: normalizeSupplierCtoRegistrationStatus(
    supplierStatus,
    "",
  ),
  ctoAvailability: "Available",
  ctoPlantNo: "",
  ctoPlantName: "",
  ctoStartDate: null,
  ctoValidUpto: null,
  ctoCcaDocument: "",
});

export const hasVisibleSupplierCtoRowData = (row = {}) => {
  const supplierName = normalizeText(row?.supplierName);
  const ctoPlantNo = normalizeText(row?.ctoPlantNo);
  const ctoPlantName = normalizeText(row?.ctoPlantName);
  const ctoStartDate = normalizeText(row?.ctoStartDate);
  const ctoValidUpto = normalizeText(row?.ctoValidUpto);
  const ctoCcaDocument = normalizeText(row?.ctoCcaDocument);

  return !!(
    supplierName ||
    ctoPlantNo ||
    ctoPlantName ||
    ctoStartDate ||
    ctoValidUpto ||
    ctoCcaDocument
  );
};

export const mergeSupplierCtoRows = ({
  supplierNames = [],
  persistedRows = [],
  supplierStatusByName = new Map(),
  normalizeDateValue = (value) => value || null,
} = {}) => {
  const normalizedSupplierNames = Array.isArray(supplierNames)
    ? supplierNames.map(normalizeText).filter(Boolean)
    : [];

  const normalizedRows = (Array.isArray(persistedRows) ? persistedRows : [])
    .map((row) =>
      normalizeSupplierCtoRow(row, {
        supplierStatus:
          supplierStatusByName.get(normalizeText(row?.supplierName)) || "",
        normalizeDateValue,
      }),
    )
    .filter(hasVisibleSupplierCtoRowData);

  if (normalizedSupplierNames.length === 0) {
    return normalizedRows;
  }

  const rowsBySupplier = new Map();
  const unnamedRows = [];

  normalizedRows.forEach((row) => {
    const supplierName = normalizeText(row?.supplierName);
    if (!supplierName) {
      unnamedRows.push(row);
      return;
    }

    if (!rowsBySupplier.has(supplierName)) rowsBySupplier.set(supplierName, []);
    rowsBySupplier.get(supplierName).push(row);
  });

  const mergedRows = [];
  normalizedSupplierNames.forEach((supplierName) => {
    const existingRows = rowsBySupplier.get(supplierName);
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      mergedRows.push(...existingRows);
      rowsBySupplier.delete(supplierName);
      return;
    }

    mergedRows.push(
      createBlankSupplierCtoRow(
        supplierName,
        supplierStatusByName.get(supplierName) || "",
      ),
    );
  });

  rowsBySupplier.forEach((extraRows) => {
    mergedRows.push(...extraRows);
  });
  mergedRows.push(...unnamedRows);

  return mergedRows;
};
