import cron from "node-cron";
import dotenv from "dotenv";
import ClientModel from "../models/client.model.js";
import PWPModel from "../models/pwp.model.js";
import ProductComplianceModel from "../models/productCompliance.model.js";
import UserModel from "../models/user.model.js";
import sendEmail from "../config/sendEmail.js";
import logger from "../utils/logger.js";

dotenv.config();

const EXPIRY_ALERT_WINDOW_DAYS = Number(
  process.env.EXPIRY_ALERT_WINDOW_DAYS || 30,
);
const RECENTLY_EXPIRED_LOOKBACK_DAYS = 7;

const startOfDay = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const daysUntil = (value, now = new Date()) => {
  const target = startOfDay(value);
  const base = startOfDay(now);
  if (!target || !base) return null;
  return Math.round((target.getTime() - base.getTime()) / 86400000);
};

const shouldIncludeWindowAlert = (diffDays) =>
  diffDays !== null &&
  diffDays <= EXPIRY_ALERT_WINDOW_DAYS &&
  diffDays >= -RECENTLY_EXPIRED_LOOKBACK_DAYS;

const toDisplayDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const toSeverityLabel = (diffDays) => {
  if (diffDays === null) return "unknown";
  if (diffDays < 0) return `expired ${Math.abs(diffDays)} day(s) ago`;
  if (diffDays === 0) return "expires today";
  return `expires in ${diffDays} day(s)`;
};

const buildClientLink = (clientId) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl.replace(/\/$/, "")}/dashboard/client/${clientId}`;
};

const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();

const dedupeEmails = (values = []) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeEmail).filter(Boolean))];

const buildAuditAlerts = (records, modelName) =>
  records
    .filter((client) => client.auditEndDate && client.auditExpiryEmailSent !== true)
    .map((client) => ({
      kind: "audit",
      modelName,
      clientId: String(client._id),
      clientName: client.clientName || "",
      companyGroupName: client.companyGroupName || "",
      plantName: "",
      type: "AUDIT",
      label: "Audit Period",
      expiryDate: client.auditEndDate,
      diffDays: daysUntil(client.auditEndDate),
      link: buildClientLink(client._id),
    }))
    .filter((entry) => entry.diffDays !== null && entry.diffDays < 0);

const buildFacilityAlerts = (records, listKey, label) =>
  records.flatMap((client) =>
    (client.productionFacility?.[listKey] || [])
      .filter((item) => item?.validUpto)
      .map((item) => {
        const diffDays = daysUntil(item.validUpto);
        return {
          kind: "facility",
          modelName: client.__modelName || "Client",
          clientId: String(client._id),
          clientName: client.clientName || "",
          companyGroupName: client.companyGroupName || "",
          plantName: item.plantName || "",
          type: label,
          label: `${label} Validity`,
          expiryDate: item.validUpto,
          diffDays,
          link: buildClientLink(client._id),
        };
      })
      .filter((entry) => shouldIncludeWindowAlert(entry.diffDays)),
  );

const buildSupplierAlerts = (docs, field, label) =>
  docs.flatMap((doc) =>
    (doc.supplierCompliance || [])
      .filter((row) => row?.[field])
      .map((row, rowIndex) => {
        const diffDays = daysUntil(row[field]);
        return {
          kind: "supplier",
          modelName: "Compliance",
          docId: String(doc._id),
          clientId: String(doc.client),
          clientName: doc.clientName || "",
          companyGroupName: doc.companyGroupName || "",
          plantName: doc.plantName || "",
          type: doc.type || "",
          label,
          expiryDate: row[field],
          diffDays,
          supplierName: row.supplierName || "",
          componentCode: row.componentCode || "",
          rowKey: row.rowKey || "",
          rowIndex,
          ctoExpiryAlertSentAt: row.ctoExpiryAlertSentAt || null,
          ctoExpiryAlertSentFor: row.ctoExpiryAlertSentFor || null,
          link: buildClientLink(doc.client),
        };
      })
      .filter((entry) => shouldIncludeWindowAlert(entry.diffDays)),
  );

const buildSupplierCtoExpiredHtml = (alerts) => {
  const clientName = alerts[0]?.clientName || "-";
  const rows = alerts
    .map(
      (alert) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.supplierName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.componentCode || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.plantName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${toDisplayDate(alert.expiryDate)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${toSeverityLabel(alert.diffDays)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin-top:0;color:#b91c1c;">Supplier CTO Expired Alert</h2>
      <p>The following supplier CTO record(s) are expired for <strong>${clientName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Supplier</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Component</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Plant</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">CTO Valid Upto</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0;">
        <a href="${alerts[0]?.link || "#"}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;">
          Open Client Record
        </a>
      </p>
    </div>
  `;
};

const buildExpiryDateKey = (value) => {
  const date = startOfDay(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

const hasSupplierCtoExpiryAlertBeenSent = (alert) =>
  buildExpiryDateKey(alert?.ctoExpiryAlertSentFor) === buildExpiryDateKey(alert?.expiryDate);

const buildClientRecipientLookup = async (supplierDocs) => {
  const clientIds = [...new Set((supplierDocs || []).map((doc) => String(doc.client)).filter(Boolean))];
  const recipientsByClientId = new Map();

  const linkedUsers = await UserModel.find({
    linkedClient: { $in: clientIds },
    linkedClientModel: { $in: ["Client", "PWP"] },
    email: { $exists: true, $ne: "" },
  })
    .select("email linkedClient")
    .lean();

  linkedUsers.forEach((user) => {
    const clientId = String(user.linkedClient || "");
    if (!clientId) return;
    if (!recipientsByClientId.has(clientId)) recipientsByClientId.set(clientId, new Set());
    recipientsByClientId.get(clientId).add(normalizeEmail(user.email));
  });

  (supplierDocs || []).forEach((doc) => {
    const clientId = String(doc.client || "");
    if (!clientId) return;
    if (!recipientsByClientId.has(clientId)) recipientsByClientId.set(clientId, new Set());

    const recipients = recipientsByClientId.get(clientId);
    [
      doc.createdBy?.email,
      doc.assignedTo?.email,
      doc.assignedManager?.email,
      doc.authorisedPerson?.email,
      doc.coordinatingPerson?.email,
    ]
      .map(normalizeEmail)
      .filter(Boolean)
      .forEach((email) => recipients.add(email));
  });

  return recipientsByClientId;
};

const notifyExpiredSupplierCtoAlerts = async ({
  supplierDocs = [],
  supplierAlerts = [],
  adminEmail = "",
} = {}) => {
  const expiredSupplierCtoAlerts = supplierAlerts.filter(
    (alert) =>
      alert.label === "Supplier CTO Validity" &&
      alert.diffDays !== null &&
      alert.diffDays < 0 &&
      !hasSupplierCtoExpiryAlertBeenSent(alert),
  );

  if (expiredSupplierCtoAlerts.length === 0) {
    return { sentAlerts: [], recipientGroups: 0 };
  }

  const recipientsByClientId = await buildClientRecipientLookup(supplierDocs);
  const alertsByClientId = expiredSupplierCtoAlerts.reduce((acc, alert) => {
    if (!acc.has(alert.clientId)) acc.set(alert.clientId, []);
    acc.get(alert.clientId).push(alert);
    return acc;
  }, new Map());

  const sentAlerts = [];
  for (const [clientId, clientAlerts] of alertsByClientId.entries()) {
    const toRecipients = dedupeEmails([
      ...(recipientsByClientId.get(clientId) || []),
    ]);
    const ccRecipients = dedupeEmails([adminEmail]).filter(
      (email) => !toRecipients.includes(email),
    );

    try {
      await sendEmail({
        to: (toRecipients.length ? toRecipients : ccRecipients).join(","),
        cc: toRecipients.length ? ccRecipients.join(",") || undefined : undefined,
        subject: `Supplier CTO expired alert - ${clientAlerts[0]?.clientName || "Client"}`,
        html: buildSupplierCtoExpiredHtml(clientAlerts),
      });

      sentAlerts.push(...clientAlerts);
    } catch (error) {
      logger.error(
        {
          err: error,
          clientId,
          recipients: toRecipients,
          ccRecipients,
          supplierAlertCount: clientAlerts.length,
        },
        "Failed to send supplier CTO expired email",
      );
    }
  }

  if (!sentAlerts.length) {
    return { sentAlerts: [], recipientGroups: alertsByClientId.size };
  }

  const now = new Date();
  const updateOperations = [];
  const seenUpdateKeys = new Set();

  sentAlerts.forEach((alert) => {
    const dedupeKey = [
      alert.docId,
      alert.rowKey || "",
      alert.supplierName || "",
      alert.componentCode || "",
      buildExpiryDateKey(alert.expiryDate),
    ].join("::");
    if (seenUpdateKeys.has(dedupeKey)) return;
    seenUpdateKeys.add(dedupeKey);

    const expiryDate = startOfDay(alert.expiryDate);
    if (!expiryDate) return;

    if (alert.rowKey) {
      updateOperations.push({
        updateOne: {
          filter: {
            _id: alert.docId,
            "supplierCompliance.rowKey": alert.rowKey,
          },
          update: {
            $set: {
              "supplierCompliance.$.ctoExpiryAlertSentAt": now,
              "supplierCompliance.$.ctoExpiryAlertSentFor": expiryDate,
            },
          },
        },
      });
      return;
    }

    updateOperations.push({
      updateOne: {
        filter: { _id: alert.docId },
        update: {
          $set: {
            "supplierCompliance.$[row].ctoExpiryAlertSentAt": now,
            "supplierCompliance.$[row].ctoExpiryAlertSentFor": expiryDate,
          },
        },
        arrayFilters: [
          {
            "row.supplierName": alert.supplierName || "",
            "row.componentCode": alert.componentCode || "",
            "row.ctoValidUpto": alert.expiryDate,
          },
        ],
      },
    });
  });

  if (updateOperations.length) {
    await ProductComplianceModel.bulkWrite(updateOperations, { ordered: false });
  }

  return { sentAlerts, recipientGroups: alertsByClientId.size };
};

const buildDigestHtml = (alerts) => {
  const rows = alerts
    .map(
      (alert) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.clientName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.companyGroupName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.plantName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.type || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.supplierName || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${alert.componentCode || "-"}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${toDisplayDate(alert.expiryDate)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${toSeverityLabel(alert.diffDays)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;"><a href="${alert.link}">Open</a></td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin-top:0;color:#b91c1c;">Compliance Expiry Alerts</h2>
      <p>The following audits, facility consents, or supplier compliance items are expired or approaching expiry.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Client</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Group</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Plant</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Type</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Alert</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Supplier</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Component</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Date</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

export const checkAuditExpiry = async () => {
  logger.info("Running compliance expiry check...");
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_USER;
    if (!adminEmail) {
      logger.error("No ADMIN_EMAIL or MAIL_USER configured. Cannot send expiry alerts.");
      return;
    }

    const [clients, pwps, supplierDocs] = await Promise.all([
      ClientModel.find({}),
      PWPModel.find({}),
      ProductComplianceModel.find({})
        .select("client type plantName supplierCompliance")
        .populate({
          path: "client",
          select:
            "clientName companyGroupName authorisedPerson coordinatingPerson createdBy assignedTo assignedManager",
          populate: [
            { path: "createdBy", select: "name email" },
            { path: "assignedTo", select: "name email" },
            { path: "assignedManager", select: "name email" },
          ],
        })
        .lean(),
    ]);

    clients.forEach((client) => {
      client.__modelName = "Client";
    });
    pwps.forEach((client) => {
      client.__modelName = "PWP";
    });

    const auditAlerts = [
      ...buildAuditAlerts(clients, "Client"),
      ...buildAuditAlerts(pwps, "PWP"),
    ];

    const facilityAlerts = [
      ...buildFacilityAlerts(clients, "cteDetailsList", "CTE"),
      ...buildFacilityAlerts(clients, "ctoDetailsList", "CTO"),
      ...buildFacilityAlerts(pwps, "cteDetailsList", "CTE"),
      ...buildFacilityAlerts(pwps, "ctoDetailsList", "CTO"),
    ];

    const supplierAlerts = [
      ...buildSupplierAlerts(
        supplierDocs.map((doc) => ({
          ...doc,
          client: doc.client?._id || doc.client,
          clientName: doc.client?.clientName || "",
          companyGroupName: doc.client?.companyGroupName || "",
          createdBy: doc.client?.createdBy || null,
          assignedTo: doc.client?.assignedTo || null,
          assignedManager: doc.client?.assignedManager || null,
          authorisedPerson: doc.client?.authorisedPerson || {},
          coordinatingPerson: doc.client?.coordinatingPerson || {},
        })),
        "fssaiValidUpto",
        "Supplier FSSAI Validity",
      ),
      ...buildSupplierAlerts(
        supplierDocs.map((doc) => ({
          ...doc,
          client: doc.client?._id || doc.client,
          clientName: doc.client?.clientName || "",
          companyGroupName: doc.client?.companyGroupName || "",
          createdBy: doc.client?.createdBy || null,
          assignedTo: doc.client?.assignedTo || null,
          assignedManager: doc.client?.assignedManager || null,
          authorisedPerson: doc.client?.authorisedPerson || {},
          coordinatingPerson: doc.client?.coordinatingPerson || {},
        })),
        "ctoValidUpto",
        "Supplier CTO Validity",
      ),
    ];

    const allAlerts = [...auditAlerts, ...facilityAlerts, ...supplierAlerts].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

    logger.info(
      {
        auditAlerts: auditAlerts.length,
        facilityAlerts: facilityAlerts.length,
        supplierAlerts: supplierAlerts.length,
      },
      "Compliance expiry check completed",
    );

    if (allAlerts.length === 0) return;

    const supplierDocsForRecipients = supplierDocs.map((doc) => ({
      client: doc.client?._id || doc.client,
      clientName: doc.client?.clientName || "",
      companyGroupName: doc.client?.companyGroupName || "",
      createdBy: doc.client?.createdBy || null,
      assignedTo: doc.client?.assignedTo || null,
      assignedManager: doc.client?.assignedManager || null,
      authorisedPerson: doc.client?.authorisedPerson || {},
      coordinatingPerson: doc.client?.coordinatingPerson || {},
    }));

    const { sentAlerts: sentSupplierCtoAlerts, recipientGroups } =
      await notifyExpiredSupplierCtoAlerts({
        supplierDocs: supplierDocsForRecipients,
        supplierAlerts,
        adminEmail,
      });

    await sendEmail({
      to: adminEmail,
      subject: `Compliance expiry alerts (${allAlerts.length})`,
      html: buildDigestHtml(allAlerts),
    });

    await Promise.all([
      ...clients
        .filter((client) =>
          auditAlerts.some(
            (alert) =>
              alert.kind === "audit" && String(alert.clientId) === String(client._id),
          ),
        )
        .map(async (client) => {
          client.auditExpiryEmailSent = true;
          await client.save();
        }),
      ...pwps
        .filter((client) =>
          auditAlerts.some(
            (alert) =>
              alert.kind === "audit" && String(alert.clientId) === String(client._id),
          ),
        )
        .map(async (client) => {
          client.auditExpiryEmailSent = true;
          await client.save();
        }),
    ]);

    logger.info(
      {
        adminEmail,
        totalAlerts: allAlerts.length,
        supplierCtoExpiredMailsSent: sentSupplierCtoAlerts.length,
        supplierCtoRecipientGroups: recipientGroups,
      },
      "Compliance expiry digest sent",
    );
  } catch (error) {
    logger.error({ err: error }, "Error in compliance expiry cron");
  }
};

export const initAuditCron = () => {
  cron.schedule("0 9 * * *", checkAuditExpiry);
  checkAuditExpiry();
  logger.info("Compliance expiry cron job initialized (Daily at 9:00 AM)");
};
