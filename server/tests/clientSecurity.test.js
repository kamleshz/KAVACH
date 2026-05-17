import test from "node:test";
import assert from "node:assert/strict";

import {
  hasSensitiveClientFieldAccess,
  redactSensitiveClientData,
} from "../utils/clientSecurity.js";

test("hasSensitiveClientFieldAccess allows manager and above", () => {
  assert.equal(hasSensitiveClientFieldAccess({ role: { name: "MANAGER" } }), true);
  assert.equal(hasSensitiveClientFieldAccess({ role: { name: "USER" } }), false);
});

test("redactSensitiveClientData masks fields for non-privileged users", () => {
  const client = {
    companyDetails: {
      pan: "ABCDE1234F",
      gst: "22AAAAA0000A1Z5",
      cin: "L12345MH2024PLC123456",
    },
    authorisedPerson: {
      pan: "PQRSX4321K",
      number: "9876543210",
    },
    coordinatingPerson: {
      pan: "LMNOP6789Q",
      number: "9988776655",
    },
    documents: [
      {
        documentType: "PAN",
        certificateNumber: "CERT-001",
        filePath: "/secure/file.pdf",
      },
      {
        documentType: "Other",
        certificateNumber: "GEN-001",
        filePath: "/public/file.pdf",
      },
    ],
  };

  const result = redactSensitiveClientData(client, {
    role: { name: "USER" },
  });

  assert.notEqual(result.companyDetails.pan, client.companyDetails.pan);
  assert.notEqual(result.companyDetails.gst, client.companyDetails.gst);
  assert.notEqual(result.authorisedPerson.number, client.authorisedPerson.number);
  assert.equal(result.documents[0].filePath, "");
  assert.equal(result.documents[1].filePath, "/public/file.pdf");
});

test("redactSensitiveClientData leaves privileged users untouched", () => {
  const client = {
    companyDetails: { pan: "ABCDE1234F" },
  };

  const result = redactSensitiveClientData(client, {
    role: { name: "ADMIN" },
  });

  assert.equal(result.companyDetails.pan, "ABCDE1234F");
});
