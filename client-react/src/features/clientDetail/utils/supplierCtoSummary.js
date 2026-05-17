export const buildSupplierCtoSummary = ({
  summarySupplierRows = [],
  summarySupplierCtoRows = [],
  isPastDate,
}) => {
  const supplierStatusByName = new Map();
  (summarySupplierRows || []).forEach((row) => {
    const supplierName = (row?.supplierName || "").toString().trim();
    if (!supplierName || supplierStatusByName.has(supplierName)) return;
    supplierStatusByName.set(
      supplierName,
      (row?.supplierStatus || "").toString().trim(),
    );
  });

  const supplierCtoSummaryByName = new Map();
  (summarySupplierCtoRows || []).forEach((row, index) => {
    const supplierName = (row?.supplierName || "").toString().trim();
    const supplierKey = supplierName || `supplier-cto-${index}`;
    const supplierStatus = (supplierStatusByName.get(supplierName) || "")
      .toString()
      .trim()
      .toLowerCase();
    const registrationStatusRaw = (row?.registrationStatus || "")
      .toString()
      .trim();
    const registrationStatus =
      supplierStatus === "registered"
        ? "Approved"
        : ["Approved", "In Progress", "Pending"].includes(
              registrationStatusRaw,
            )
          ? registrationStatusRaw
          : "Pending";
    const ctoAvailability =
      (row?.ctoAvailability || "Available").toString().trim() ===
      "Not Available"
        ? "Not Available"
        : "Available";
    const hasDocument = !!(row?.ctoCcaDocument || "").toString().trim();

    const existing = supplierCtoSummaryByName.get(supplierKey);
    if (!existing) {
      supplierCtoSummaryByName.set(supplierKey, {
        supplierName,
        registrationStatus,
        hasAvailable: ctoAvailability === "Available",
        hasNotAvailable: ctoAvailability === "Not Available",
        hasDocument,
      });
      return;
    }

    const registrationPriority = {
      Approved: 3,
      "In Progress": 2,
      Pending: 1,
    };
    if (
      (registrationPriority[registrationStatus] || 0) >
      (registrationPriority[existing.registrationStatus] || 0)
    ) {
      existing.registrationStatus = registrationStatus;
    }
    existing.hasAvailable =
      existing.hasAvailable || ctoAvailability === "Available";
    existing.hasNotAvailable =
      existing.hasNotAvailable || ctoAvailability === "Not Available";
    existing.hasDocument = existing.hasDocument || hasDocument;
  });

  const supplierCtoSummary = Array.from(
    supplierCtoSummaryByName.values(),
  ).reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.registrationStatus === "Approved") acc.approved += 1;
      else if (item.registrationStatus === "In Progress") acc.inProgress += 1;
      else acc.pending += 1;

      if (item.hasAvailable) acc.available += 1;
      if (!item.hasAvailable && item.hasNotAvailable) acc.notAvailable += 1;
      if (item.hasDocument) acc.documentUploaded += 1;
      return acc;
    },
    {
      total: 0,
      approved: 0,
      inProgress: 0,
      pending: 0,
      available: 0,
      notAvailable: 0,
      documentUploaded: 0,
    },
  );

  const supplierCtoTableRows = (summarySupplierCtoRows || []).map((row, index) => {
    const supplierName = (row?.supplierName || "").toString().trim() || "-";
    const supplierStatus =
      (
        supplierStatusByName.get(
          (row?.supplierName || "").toString().trim(),
        ) || ""
      )
        .toString()
        .trim() || "-";
    const eprCertificateNumber = (() => {
      const supplierMatch = (summarySupplierRows || []).find(
        (item) =>
          (item?.supplierName || "").toString().trim().toLowerCase() ===
          supplierName.toLowerCase(),
      );
      return (
        (supplierMatch?.eprCertificateNumber || "").toString().trim() || "-"
      );
    })();
    const registrationStatusRaw = (row?.registrationStatus || "")
      .toString()
      .trim();
    const registrationStatus =
      supplierStatus.toLowerCase() === "registered"
        ? "Approved"
        : ["Approved", "In Progress", "Pending"].includes(registrationStatusRaw)
          ? registrationStatusRaw
          : "Pending";

    return {
      key: `supplier-cto-row-${index}`,
      supplierName,
      supplierStatus,
      registrationStatus,
      eprCertificateNumber,
      ctoAvailability:
        (row?.ctoAvailability || "Available").toString().trim() || "Available",
      ctoPlantNo: (row?.ctoPlantNo || "").toString().trim() || "-",
      ctoPlantName: (row?.ctoPlantName || "").toString().trim() || "-",
      ctoStartDate: (row?.ctoStartDate || "").toString().trim() || "-",
      ctoValidUpto: (row?.ctoValidUpto || "").toString().trim() || "-",
      isCtoExpired:
        (row?.ctoAvailability || "Available").toString().trim() ===
          "Available" && isPastDate(row?.ctoValidUpto),
      ctoCcaDocument: (row?.ctoCcaDocument || "").toString().trim(),
    };
  });

  return {
    supplierCtoSummary,
    supplierCtoSummaryCards: [
      {
        label: "Total Supplier CTO",
        value: supplierCtoSummary.total,
      },
      {
        label: "Approved",
        value: supplierCtoSummary.approved,
      },
      {
        label: "In Progress",
        value: supplierCtoSummary.inProgress,
      },
      {
        label: "Pending",
        value: supplierCtoSummary.pending,
      },
      {
        label: "CTO Available",
        value: supplierCtoSummary.available,
      },
      {
        label: "CTO Uploaded",
        value: supplierCtoSummary.documentUploaded,
      },
    ],
    supplierCtoTableRows,
  };
};
