import test from "node:test";
import assert from "node:assert/strict";

import {
  applyClientStatusTransition,
  buildClientWorkflowSnapshot,
  getClientBusinessValidationErrors,
  normalizeClientBusinessFields,
  normalizeFinancialYear,
} from "../utils/clientBusinessRules.js";

test("normalizeFinancialYear standardizes common formats", () => {
  assert.equal(normalizeFinancialYear("FY2024"), "2024-25");
  assert.equal(normalizeFinancialYear("2024-2025"), "2024-25");
  assert.equal(normalizeFinancialYear("2024"), "2024-25");
  assert.equal(normalizeFinancialYear("2025-26"), "2025-26");
});

test("normalizeClientBusinessFields uppercases identifiers", () => {
  const result = normalizeClientBusinessFields({
    financialYear: "fy2024",
    companyDetails: {
      pan: "abcde1234f",
      cin: "l12345mh2024plc123456",
      gst: "22aaaaa0000a1z5",
    },
  });

  assert.equal(result.financialYear, "2024-25");
  assert.equal(result.companyDetails.pan, "ABCDE1234F");
  assert.equal(result.companyDetails.cin, "L12345MH2024PLC123456");
  assert.equal(result.companyDetails.gst, "22AAAAA0000A1Z5");
});

test("getClientBusinessValidationErrors rejects invalid business identifiers", () => {
  const errors = getClientBusinessValidationErrors({
    financialYear: "2024",
    companyDetails: {
      pan: "INVALID",
      cin: "123",
      gst: "BAD",
    },
  });

  assert.equal(errors.length, 4);
});

test("applyClientStatusTransition enforces sequential lifecycle rules", () => {
  const client = {
    clientStatus: "DRAFT",
    clientName: "ACME",
    tradeName: "ACME",
    companyGroupName: "ACME Group",
    financialYear: "2024-25",
    entityType: "Producer",
    documents: [{ documentType: "PAN" }],
    validationStatus: "Verified",
    validationDetails: {
      validatedBy: "user-1",
      validatedAt: new Date(),
    },
  };

  applyClientStatusTransition({
    client,
    targetStatus: "SUBMITTED",
    changedBy: "user-1",
    reason: "Submitted for review",
  });
  applyClientStatusTransition({
    client,
    targetStatus: "PRE_VALIDATION",
    changedBy: "user-1",
  });
  const result = applyClientStatusTransition({
    client,
    targetStatus: "AUDIT",
    changedBy: "user-1",
  });

  assert.equal(result.changed, true);
  assert.equal(client.clientStatus, "AUDIT");
  assert.equal(client.statusHistory.length, 3);
});

test("buildClientWorkflowSnapshot exposes blockers for the next stage", () => {
  const workflow = buildClientWorkflowSnapshot({
    clientStatus: "SUBMITTED",
    clientName: "ACME",
    tradeName: "ACME",
    companyGroupName: "ACME Group",
    financialYear: "2024-25",
    entityType: "Producer",
    documents: [],
  });

  assert.equal(workflow.currentStatus, "SUBMITTED");
  assert.equal(workflow.nextStatus, "PRE_VALIDATION");
  assert.equal(workflow.canAdvance, false);
  assert.match(workflow.blockers[0], /Upload at least one client document/i);
});
