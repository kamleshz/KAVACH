import test from "node:test";
import assert from "node:assert/strict";

import {
  applyProductMetadataMaps,
  buildProductMetadataMaps,
  canonicalizeProductRows,
} from "../utils/complianceData.js";

test("canonicalizeProductRows reuses canonical SKU and component metadata", () => {
  const rows = canonicalizeProductRows([
    {
      skuCode: "SKU-1",
      skuDescription: "Bottle",
      skuUom: "Nos",
      componentCode: "CMP-1",
      componentDescription: "Cap",
      supplierName: "Supplier A",
    },
    {
      skuCode: "SKU-1",
      componentCode: "CMP-1",
      supplierName: "Supplier A",
    },
  ]);

  assert.equal(rows[1].skuDescription, "Bottle");
  assert.equal(rows[1].skuUom, "Nos");
  assert.equal(rows[1].componentDescription, "Cap");
  assert.ok(rows[0].rowKey);
  assert.ok(rows[1].rowKey);
});

test("canonicalizeProductRows rejects conflicting canonical SKU metadata", () => {
  assert.throws(
    () =>
      canonicalizeProductRows([
        {
          skuCode: "SKU-1",
          skuDescription: "Bottle",
          componentCode: "CMP-1",
        },
        {
          skuCode: "SKU-1",
          skuDescription: "Jar",
          componentCode: "CMP-2",
        },
      ]),
    /Conflicting skuDescription values detected/i,
  );
});

test("canonicalizeProductRows tolerates conflicting product images for the same SKU", () => {
  const rows = canonicalizeProductRows([
    {
      skuCode: "FG002586",
      skuDescription: "Bottle",
      skuUom: "Nos",
      productImage: "/uploads/products/fg002586-a.png",
      componentCode: "CMP-1",
      componentDescription: "Cap",
    },
    {
      skuCode: "FG002586",
      skuDescription: "Bottle",
      skuUom: "Nos",
      productImage: "/uploads/products/fg002586-b.png",
      componentCode: "CMP-2",
      componentDescription: "Label",
    },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].productImage, "/uploads/products/fg002586-a.png");
  assert.equal(rows[1].productImage, "/uploads/products/fg002586-a.png");
});

test("applyProductMetadataMaps propagates source-of-truth product metadata", () => {
  const metadataMaps = buildProductMetadataMaps([
    {
      systemCode: "SYS-1",
      skuCode: "SKU-1",
      skuDescription: "Bottle",
      skuUom: "Nos",
      componentCode: "CMP-1",
      componentDescription: "Cap",
      supplierName: "Supplier A",
      supplierState: "Gujarat",
      supplierType: "Manufacturer",
    },
  ]);

  const [mapped] = applyProductMetadataMaps(
    [
      {
        systemCode: "SYS-1",
        skuCode: "SKU-1",
        componentCode: "CMP-1",
      },
    ],
    metadataMaps,
  );

  assert.equal(mapped.skuCode, "SKU-1");
  assert.equal(mapped.skuDescription, "Bottle");
  assert.equal(mapped.componentDescription, "Cap");
  assert.equal(mapped.supplierName, "Supplier A");
  assert.equal(mapped.supplierState, "Gujarat");
  assert.equal(mapped.supplierType, "Manufacturer");
});
