const CATEGORY_TARGET_PCT_BY_YEAR = {
  "2025-26": { "category i": 30, "category ii": 10, "category iii": 5 },
  "2026-27": { "category i": 40, "category ii": 10, "category iii": 5 },
  "2027-28": {
    "category i": 50,
    "category ii": 20,
    "category iii": 10,
  },
  "2028-29": {
    "category i": 60,
    "category ii": 20,
    "category iii": 10,
  },
};

const toText = (value) => (value || "").toString().trim();

export const formatCategoryShare = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) return "0.0";
  if (numericValue >= 100) return "100.0";
  if (numericValue < 0.1) return numericValue.toFixed(2);
  if (numericValue > 99.9 && numericValue < 100) return numericValue.toFixed(2);
  return numericValue.toFixed(1);
};

export const normalizeCategoryBucket = (value) => {
  const normalized = toText(value).toLowerCase();
  if (!normalized) return "";

  if (
    /(^|\s)category\s*iii\b/.test(normalized) ||
    normalized === "cat iii" ||
    normalized === "cat-iii"
  ) {
    return "category iii";
  }

  if (
    /(^|\s)category\s*ii\b/.test(normalized) ||
    normalized === "cat ii" ||
    normalized === "cat-ii"
  ) {
    return "category ii";
  }

  if (
    /(^|\s)category\s*i\b/.test(normalized) ||
    normalized === "cat i" ||
    normalized === "cat-i"
  ) {
    return "category i";
  }

  return "";
};

export const buildCategoryWiseProcurement = ({
  rows = [],
  componentCategoryMap = new Map(),
  financialYear = "",
  safeNumber = (value) => Number(value) || 0,
} = {}) => {
  return Object.values(
    (Array.isArray(rows) ? rows : []).reduce((acc, row, index) => {
      const componentCode = toText(row?.componentCode);
      const categoryName =
        toText(row?.category) ||
        componentCategoryMap.get(componentCode) ||
        "Uncategorized";

      if (!acc[categoryName]) {
        acc[categoryName] = {
          key: `${categoryName}-${index}`,
          category: categoryName,
          monthlyPurchaseMt: 0,
          recycledQty: 0,
          virginQty: 0,
          recycledAmount: 0,
          virginAmount: 0,
        };
      }

      acc[categoryName].monthlyPurchaseMt += safeNumber(row?.monthlyPurchaseMt);
      acc[categoryName].recycledQty += safeNumber(row?.recycledQty);
      acc[categoryName].virginQty += safeNumber(row?.virginQty);
      acc[categoryName].recycledAmount += safeNumber(row?.recycledQrtAmount);
      acc[categoryName].virginAmount += safeNumber(row?.virginQtyAmount);
      return acc;
    }, {}),
  )
    .map((item) => {
      const recycledShare = item.monthlyPurchaseMt
        ? (item.recycledQty / item.monthlyPurchaseMt) * 100
        : 0;
      const virginShare = Math.max(0, 100 - recycledShare);
      const categoryBucket = normalizeCategoryBucket(item.category);
      const recycledTargetPct =
        safeNumber(item?.recycledTargetPct) ||
        CATEGORY_TARGET_PCT_BY_YEAR[toText(financialYear)]?.[categoryBucket] ||
        0;
      const recycledTargetQtyMt =
        safeNumber(item?.recycledTargetQtyMt) ||
        item.monthlyPurchaseMt * (recycledTargetPct / 100);

      return {
        ...item,
        recycledShare: formatCategoryShare(recycledShare),
        virginShare: formatCategoryShare(virginShare),
        recycledShareRaw: recycledShare,
        recycledTargetPct,
        recycledTargetQtyMt,
      };
    })
    .sort((a, b) => {
      const trailingOrder = {
        "category i": 1,
        "category ii": 2,
        "category iii": 3,
        "category iv": 4,
        "not applicable": 5,
      };

      const aKey = toText(a.category).toLowerCase();
      const bKey = toText(b.category).toLowerCase();
      const aTrailing = trailingOrder[aKey];
      const bTrailing = trailingOrder[bKey];

      if (aTrailing && bTrailing) return aTrailing - bTrailing;
      if (aTrailing) return 1;
      if (bTrailing) return -1;

      const purchaseDiff = b.monthlyPurchaseMt - a.monthlyPurchaseMt;
      if (purchaseDiff !== 0) return purchaseDiff;
      return toText(a.category).localeCompare(toText(b.category));
    });
};

export const buildGroupedProcurementCards = ({
  rows = [],
  getBucketKey = () => "",
  getBucketLabel = () => "",
  getPrimaryKey = () => "",
  safeNumber = (value) => Number(value) || 0,
} = {}) => {
  return Object.values(
    (Array.isArray(rows) ? rows : []).reduce((acc, row, index) => {
      const bucketKey = toText(getBucketKey(row, index));
      const bucketLabel = toText(getBucketLabel(row, index)) || bucketKey;

      if (!bucketKey || !bucketLabel) return acc;

      if (!acc[bucketKey]) {
        acc[bucketKey] = {
          key: `${bucketKey}-${index}`,
          name: bucketLabel,
          primaryKeys: new Set(),
          monthlyPurchaseMt: 0,
          recycledQty: 0,
          virginQty: 0,
          recycledAmount: 0,
          virginAmount: 0,
        };
      }

      const primaryKey = toText(getPrimaryKey(row, index));
      if (primaryKey) {
        acc[bucketKey].primaryKeys.add(primaryKey);
      }

      acc[bucketKey].monthlyPurchaseMt += safeNumber(row?.monthlyPurchaseMt);
      acc[bucketKey].recycledQty += safeNumber(row?.recycledQty);
      acc[bucketKey].virginQty += safeNumber(row?.virginQty);
      acc[bucketKey].recycledAmount += safeNumber(row?.recycledQrtAmount);
      acc[bucketKey].virginAmount += safeNumber(row?.virginQtyAmount);
      return acc;
    }, {}),
  )
    .map((item) => {
      const recycledShare = item.monthlyPurchaseMt
        ? (item.recycledQty / item.monthlyPurchaseMt) * 100
        : 0;
      const virginShare = Math.max(0, 100 - recycledShare);

      return {
        ...item,
        totalSku: item.primaryKeys.size,
        recycledShare: formatCategoryShare(recycledShare),
        virginShare: formatCategoryShare(virginShare),
        recycledShareRaw: recycledShare,
        recycledVsVirginLeftPct: Math.min(100, Math.max(0, recycledShare)),
        recycledVsVirginRightPct: Math.min(100, Math.max(0, virginShare)),
      };
    })
    .sort((a, b) => {
      const purchaseDiff = b.monthlyPurchaseMt - a.monthlyPurchaseMt;
      if (purchaseDiff !== 0) return purchaseDiff;
      return toText(a.name).localeCompare(toText(b.name));
    });
};
