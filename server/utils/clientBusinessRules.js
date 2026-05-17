export const CLIENT_LIFECYCLE_ORDER = [
  "DRAFT",
  "SUBMITTED",
  "PRE_VALIDATION",
  "AUDIT",
];

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const CIN_REGEX =
  /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const FINANCIAL_YEAR_REGEX = /^\d{4}-\d{2}$/;

const toText = (value) => (value ?? "").toString().trim();

export const normalizeBusinessIdentifier = (value) =>
  toText(value).replace(/\s+/g, "").toUpperCase();

export const normalizeFinancialYear = (value) => {
  const raw = toText(value).toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";

  let match = raw.match(/^(\d{4})[-/](\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  match = raw.match(/^(\d{4})[-/](\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2].slice(-2)}`;
  }

  match = raw.match(/^FY(\d{4})$/);
  if (match) {
    const startYear = Number(match[1]);
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  }

  match = raw.match(/^(\d{4})$/);
  if (match) {
    const startYear = Number(match[1]);
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  }

  return raw;
};

export const normalizeClientBusinessFields = (payload = {}) => {
  const nextPayload = {
    ...payload,
    ...(payload.financialYear !== undefined
      ? { financialYear: normalizeFinancialYear(payload.financialYear) }
      : {}),
    companyDetails: {
      ...(payload.companyDetails || {}),
      pan: normalizeBusinessIdentifier(payload.companyDetails?.pan),
      cin: normalizeBusinessIdentifier(payload.companyDetails?.cin),
      gst: normalizeBusinessIdentifier(payload.companyDetails?.gst),
      udyamRegistration: normalizeBusinessIdentifier(
        payload.companyDetails?.udyamRegistration,
      ),
    },
  };

  if (payload.authorisedPerson) {
    nextPayload.authorisedPerson = {
      ...payload.authorisedPerson,
      pan: normalizeBusinessIdentifier(payload.authorisedPerson?.pan),
    };
  }

  if (payload.coordinatingPerson) {
    nextPayload.coordinatingPerson = {
      ...payload.coordinatingPerson,
      pan: normalizeBusinessIdentifier(payload.coordinatingPerson?.pan),
    };
  }

  return nextPayload;
};

export const getClientBusinessValidationErrors = (payload = {}) => {
  const errors = [];
  const financialYear = toText(payload.financialYear);
  const pan = toText(payload.companyDetails?.pan);
  const cin = toText(payload.companyDetails?.cin);
  const gst = toText(payload.companyDetails?.gst);

  if (financialYear && !FINANCIAL_YEAR_REGEX.test(financialYear)) {
    errors.push("Financial Year must be in 'YYYY-YY' format, e.g. 2024-25");
  }
  if (pan && !PAN_REGEX.test(pan)) {
    errors.push("PAN must be 5 letters, 4 digits, and 1 letter");
  }
  if (cin && !CIN_REGEX.test(cin)) {
    errors.push("CIN must be a valid 21-character company identifier");
  }
  if (gst && !GST_REGEX.test(gst)) {
    errors.push("GST must be a valid 15-character GSTIN");
  }

  return errors;
};

export const getClientLifecycleChecks = (client = {}) => {
  const basicInfoComplete = [
    client.clientName,
    client.tradeName,
    client.companyGroupName,
    client.financialYear,
    client.entityType,
  ].every((value) => toText(value));

  const hasUploadedDocuments =
    Array.isArray(client.documents) && client.documents.length > 0;

  const validationSignedOff =
    toText(client.validationStatus) === "Verified" &&
    !!client.validationDetails?.validatedBy &&
    !!client.validationDetails?.validatedAt;

  return {
    basicInfoComplete,
    hasUploadedDocuments,
    validationSignedOff,
  };
};

export const getClientLifecycleBlockers = (client = {}, targetStatus = "") => {
  const checks = getClientLifecycleChecks(client);
  const blockers = [];

  if (targetStatus === "SUBMITTED" && !checks.basicInfoComplete) {
    blockers.push("Complete basic client info before submitting");
  }
  if (targetStatus === "PRE_VALIDATION" && !checks.hasUploadedDocuments) {
    blockers.push("Upload at least one client document before pre-validation");
  }
  if (targetStatus === "AUDIT" && !checks.validationSignedOff) {
    blockers.push("Validation sign-off is required before moving to audit");
  }

  return blockers;
};

export const buildClientWorkflowSnapshot = (client = {}) => {
  const currentStatus = CLIENT_LIFECYCLE_ORDER.includes(client.clientStatus)
    ? client.clientStatus
    : "DRAFT";
  const currentIndex = CLIENT_LIFECYCLE_ORDER.indexOf(currentStatus);
  const nextStatus = CLIENT_LIFECYCLE_ORDER[currentIndex + 1] || null;
  const blockers = nextStatus
    ? getClientLifecycleBlockers(client, nextStatus)
    : [];

  return {
    currentStatus,
    nextStatus,
    canAdvance: !nextStatus || blockers.length === 0,
    blockers,
    checks: getClientLifecycleChecks(client),
    stages: CLIENT_LIFECYCLE_ORDER.map((status, index) => ({
      status,
      state:
        index < currentIndex
          ? "completed"
          : index === currentIndex
            ? "current"
            : "upcoming",
      blockers:
        index === currentIndex + 1
          ? getClientLifecycleBlockers(client, status)
          : [],
    })),
  };
};

export const applyClientStatusTransition = ({
  client,
  targetStatus,
  changedBy = null,
  reason = "",
}) => {
  const currentStatus = CLIENT_LIFECYCLE_ORDER.includes(client?.clientStatus)
    ? client.clientStatus
    : "DRAFT";
  const normalizedTarget = toText(targetStatus).toUpperCase();

  if (!normalizedTarget || normalizedTarget === currentStatus) {
    return {
      changed: false,
      from: currentStatus,
      to: currentStatus,
      blockers: [],
    };
  }

  if (!CLIENT_LIFECYCLE_ORDER.includes(normalizedTarget)) {
    throw new Error(`Invalid client status '${targetStatus}'`);
  }

  const currentIndex = CLIENT_LIFECYCLE_ORDER.indexOf(currentStatus);
  const targetIndex = CLIENT_LIFECYCLE_ORDER.indexOf(normalizedTarget);

  if (targetIndex !== currentIndex + 1) {
    throw new Error(
      `Invalid client status transition from '${currentStatus}' to '${normalizedTarget}'`,
    );
  }

  const blockers = getClientLifecycleBlockers(client, normalizedTarget);
  if (blockers.length > 0) {
    throw new Error(blockers[0]);
  }

  client.clientStatus = normalizedTarget;
  if (!Array.isArray(client.statusHistory)) {
    client.statusHistory = [];
  }
  client.statusHistory.push({
    from: currentStatus,
    to: normalizedTarget,
    changedBy,
    changedAt: new Date(),
    reason: toText(reason),
  });

  return {
    changed: true,
    from: currentStatus,
    to: normalizedTarget,
    blockers: [],
  };
};
