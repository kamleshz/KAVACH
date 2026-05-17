const normalizeKeyPart = (value) =>
  (value ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  return String(value).trim() !== "";
};

const chooseCanonicalValue = (currentValue, nextValue) =>
  isMeaningfulValue(nextValue) ? nextValue : currentValue;

export const choosePreferredNonEmptyValue = (incomingValue, baseValue) =>
  chooseCanonicalValue(baseValue, incomingValue);

export const buildSkuKey = (row = {}) => normalizeKeyPart(row.skuCode || "");

export const buildComponentKey = (row = {}) => {
  const systemCode = normalizeKeyPart(row.systemCode || "");
  const componentCode = normalizeKeyPart(row.componentCode || "");
  if (systemCode && componentCode) return `${systemCode}::${componentCode}`;
  return componentCode || systemCode;
};

export const buildSupplierKey = (row = {}) => {
  const supplierCode = normalizeKeyPart(row.supplierCode || "");
  const supplierName = normalizeKeyPart(row.supplierName || "");
  return supplierCode || supplierName;
};

export const buildProductRowKey = (row = {}, fallbackIndex = null) => {
  const systemCode = normalizeKeyPart(row.systemCode || "");
  const skuKey = buildSkuKey(row);
  const componentKey = buildComponentKey(row);
  const supplierKey = buildSupplierKey(row);

  if (systemCode && componentKey) return `sys:${systemCode}|cmp:${componentKey}`;
  if (systemCode && skuKey) return `sys:${systemCode}|sku:${skuKey}`;
  if (skuKey && componentKey && supplierKey) {
    return `sku:${skuKey}|cmp:${componentKey}|sup:${supplierKey}`;
  }
  if (skuKey && componentKey) return `sku:${skuKey}|cmp:${componentKey}`;
  if (skuKey && supplierKey) return `sku:${skuKey}|sup:${supplierKey}`;
  if (skuKey) return `sku:${skuKey}|idx:${fallbackIndex ?? "x"}`;
  if (componentKey) return `cmp:${componentKey}|idx:${fallbackIndex ?? "x"}`;
  return `idx:${fallbackIndex ?? "x"}`;
};

const registerGroupValue = (
  registry,
  groupKey,
  field,
  nextValue,
  buildConflictMessage,
) => {
  if (!groupKey || !isMeaningfulValue(nextValue)) return;

  const group = registry.get(groupKey) || {};
  const existingValue = group[field];

  if (
    isMeaningfulValue(existingValue) &&
    String(existingValue).trim() !== String(nextValue).trim()
  ) {
    throw new Error(buildConflictMessage(groupKey, field, existingValue, nextValue));
  }

  group[field] = chooseCanonicalValue(existingValue, nextValue);
  registry.set(groupKey, group);
};

export const canonicalizeProductRows = (rows = []) => {
  const normalizedRows = rows.map((row, index) => {
    const currentRow = row && typeof row.toObject === "function" ? row.toObject() : row || {};
    return {
      ...currentRow,
      rowKey: currentRow.rowKey || buildProductRowKey(currentRow, index),
      skuKey: currentRow.skuKey || buildSkuKey(currentRow),
      componentKey: currentRow.componentKey || buildComponentKey(currentRow),
      supplierKey: currentRow.supplierKey || buildSupplierKey(currentRow),
    };
  });

  const skuMasterMap = new Map();
  const componentMasterMap = new Map();

  normalizedRows.forEach((row) => {
    registerGroupValue(
      skuMasterMap,
      row.skuKey,
      "skuDescription",
      row.skuDescription,
      (_groupKey, field) =>
        `Conflicting ${field} values detected for SKU '${row.skuCode || "Unknown"}'`,
    );
    registerGroupValue(
      skuMasterMap,
      row.skuKey,
      "skuUom",
      row.skuUom,
      (_groupKey, field) =>
        `Conflicting ${field} values detected for SKU '${row.skuCode || "Unknown"}'`,
    );
    if (row.skuKey) {
      const skuMaster = skuMasterMap.get(row.skuKey) || {};
      if (!isMeaningfulValue(skuMaster.productImage) && isMeaningfulValue(row.productImage)) {
        skuMaster.productImage = row.productImage;
        skuMasterMap.set(row.skuKey, skuMaster);
      }
    }
    registerGroupValue(
      componentMasterMap,
      row.componentKey,
      "componentDescription",
      row.componentDescription,
      (_groupKey, field) =>
        `Conflicting ${field} values detected for component '${row.componentCode || "Unknown"}'`,
    );
  });

  return normalizedRows.map((row) => {
    const skuMaster = skuMasterMap.get(row.skuKey) || {};
    const componentMaster = componentMasterMap.get(row.componentKey) || {};

    return {
      ...row,
      skuDescription: chooseCanonicalValue(row.skuDescription, skuMaster.skuDescription),
      skuUom: chooseCanonicalValue(row.skuUom, skuMaster.skuUom),
      productImage: chooseCanonicalValue(row.productImage, skuMaster.productImage),
      componentDescription: chooseCanonicalValue(
        row.componentDescription,
        componentMaster.componentDescription,
      ),
    };
  });
};

export const buildProductMetadataMaps = (rows = []) => {
  const skuMap = new Map();
  const componentMap = new Map();

  canonicalizeProductRows(rows).forEach((row) => {
    if (row.skuKey) {
      skuMap.set(row.skuKey, {
        skuCode: row.skuCode || "",
        skuDescription: row.skuDescription || "",
        skuUom: row.skuUom || "",
        productImage: row.productImage || "",
      });
    }

    if (row.componentKey) {
      componentMap.set(row.componentKey, {
        systemCode: row.systemCode || "",
        skuCode: row.skuCode || "",
        componentCode: row.componentCode || "",
        componentDescription: row.componentDescription || "",
        supplierName: row.supplierName || "",
        supplierState: row.supplierState || "",
        supplierType: row.supplierType || "",
      });
    }
  });

  return { skuMap, componentMap };
};

export const applyProductMetadataMaps = (
  rows = [],
  { skuMap = new Map(), componentMap = new Map() } = {},
) =>
  rows.map((row, index) => {
    const currentRow = row && typeof row.toObject === "function" ? row.toObject() : row || {};
    const skuMaster = skuMap.get(buildSkuKey(currentRow)) || {};
    const componentMaster = componentMap.get(buildComponentKey(currentRow)) || {};

    return {
      ...currentRow,
      rowKey: currentRow.rowKey || buildProductRowKey(currentRow, index),
      skuKey: currentRow.skuKey || buildSkuKey(currentRow),
      componentKey: currentRow.componentKey || buildComponentKey(currentRow),
      supplierKey: currentRow.supplierKey || buildSupplierKey(currentRow),
      skuDescription: chooseCanonicalValue(currentRow.skuDescription, skuMaster.skuDescription),
      skuUom: chooseCanonicalValue(currentRow.skuUom, skuMaster.skuUom),
      productImage: chooseCanonicalValue(currentRow.productImage, skuMaster.productImage),
      skuCode: chooseCanonicalValue(currentRow.skuCode, skuMaster.skuCode),
      componentCode: chooseCanonicalValue(currentRow.componentCode, componentMaster.componentCode),
      componentDescription: chooseCanonicalValue(
        currentRow.componentDescription,
        componentMaster.componentDescription,
      ),
      supplierName: chooseCanonicalValue(currentRow.supplierName, componentMaster.supplierName),
      supplierState: chooseCanonicalValue(currentRow.supplierState, componentMaster.supplierState),
      supplierType: chooseCanonicalValue(currentRow.supplierType, componentMaster.supplierType),
      systemCode: chooseCanonicalValue(currentRow.systemCode, componentMaster.systemCode),
    };
  });

export const buildRowLookupMap = (rows = []) => {
  const map = new Map();
  rows.forEach((row, index) => {
    const currentRow = row && typeof row.toObject === "function" ? row.toObject() : row || {};
    const key = currentRow.rowKey || buildProductRowKey(currentRow, index);
    if (!map.has(key)) {
      map.set(key, currentRow);
    }
  });
  return map;
};

export const maskSensitiveValue = (value = "", visibleSuffix = 4) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length <= visibleSuffix) return "*".repeat(raw.length);
  return `${"*".repeat(Math.max(raw.length - visibleSuffix, 4))}${raw.slice(-visibleSuffix)}`;
};
