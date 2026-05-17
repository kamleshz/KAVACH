import { getRoleName } from "./accessControl.js";
import { maskSensitiveValue } from "./complianceData.js";

const HIGHLY_SENSITIVE_DOCUMENT_TYPES = new Set([
  "PAN",
  "GST",
  "CIN",
  "Signed Document",
]);

export const hasSensitiveClientFieldAccess = (user) => {
  const roleName = getRoleName(user);
  return ["SUPER ADMIN", "ADMIN", "MANAGER"].includes(roleName);
};

export const redactSensitiveClientData = (client, user) => {
  if (!client || hasSensitiveClientFieldAccess(user)) {
    return client;
  }

  const nextClient = {
    ...client,
    companyDetails: {
      ...(client.companyDetails || {}),
      pan: maskSensitiveValue(client.companyDetails?.pan),
      gst: maskSensitiveValue(client.companyDetails?.gst),
      cin: maskSensitiveValue(client.companyDetails?.cin),
    },
    authorisedPerson: {
      ...(client.authorisedPerson || {}),
      pan: maskSensitiveValue(client.authorisedPerson?.pan),
      number: maskSensitiveValue(client.authorisedPerson?.number),
    },
    coordinatingPerson: {
      ...(client.coordinatingPerson || {}),
      pan: maskSensitiveValue(client.coordinatingPerson?.pan),
      number: maskSensitiveValue(client.coordinatingPerson?.number),
    },
  };

  if (Array.isArray(client.documents)) {
    nextClient.documents = client.documents.map((doc) => {
      if (!HIGHLY_SENSITIVE_DOCUMENT_TYPES.has(doc?.documentType)) {
        return doc;
      }

      return {
        ...doc,
        certificateNumber: maskSensitiveValue(doc?.certificateNumber),
        filePath: "",
      };
    });
  }

  return nextClient;
};
