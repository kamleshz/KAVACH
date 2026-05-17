// server/config/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
dotenv.config();

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_SERVICE = process.env.MAIL_SERVICE;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // explicit "true" string required
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;
const isProduction = process.env.NODE_ENV === "production";
const enableTransportLogging = !isProduction;

// Helper to mask sensitive data in logs
const mask = (str) => (str ? `${str.slice(0, 3)}***` : "undefined");

if (!MAIL_USER || !MAIL_PASS) {
  logger.warn(
    "⚠️ MAIL_USER or MAIL_PASS missing in .env. Email functionality may not work.",
  );
} else {
  logger.info(`Email config loaded for user=${mask(MAIL_USER)}`);
}

let transporter = null;

if (SMTP_HOST) {
  // Use custom SMTP (Brevo, SendGrid, Office365, etc.)
  const port = Number.isFinite(SMTP_PORT) && SMTP_PORT > 0 ? SMTP_PORT : 587;
  // Default secure logic: true for 465, false for others (587, 2525) unless explicitly overridden
  const secure =
    process.env.SMTP_SECURE !== undefined ? SMTP_SECURE : port === 465;

  logger.info(`Using custom SMTP transport ${SMTP_HOST}:${port} (secure=${secure})`);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: port,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
    logger: enableTransportLogging,
    debug: enableTransportLogging,
  });
} else if (MAIL_SERVICE) {
  transporter = nodemailer.createTransport({
    service: MAIL_SERVICE,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: enableTransportLogging,
  });
} else {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: enableTransportLogging,
  });
}

// Verify transporter once at startup (non-blocking)
transporter.verify((err, success) => {
  if (err) {
    logger.error({ err }, "Nodemailer transporter verify failed");
  } else {
    logger.info("Nodemailer transporter is ready");
  }
});

/**
 * sendEmail utility
 * - Accepts { to || sendTo, subject, html, text, cc, bcc }
 * - Returns the nodemailer info object or throws
 */
const sendEmail = async ({ to, sendTo, subject, html, text, cc, bcc }) => {
  try {
    const recipient = (to || sendTo || "").toString().trim();
    if (!recipient) {
      const err = new Error("No recipient provided to sendEmail");
      logger.error({ err }, "sendEmail missing recipient");
      throw err;
    }

    const mailOptions = {
      from: `EPRKavach <${MAIL_FROM}>`,
      to: recipient,
      subject: subject || "(no subject)",
      html: html || undefined,
      text: text || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
    };

    // send email
    const info = await transporter.sendMail(mailOptions);

    logger.info({
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      to: recipient,
      envelope: info?.envelope,
    }, "sendEmail success");

    if (!isProduction) {
      logger.debug({
        messageId: info?.messageId,
        envelope: info?.envelope,
        accepted: info?.accepted,
        rejected: info?.rejected,
      }, "sendEmail debug details");
    }

    return info;
  } catch (err) {
    logger.error({ err }, "sendEmail failed");
    throw err;
  }
};

export default sendEmail;
