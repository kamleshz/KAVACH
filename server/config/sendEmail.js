// server/config/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_SERVICE = process.env.MAIL_SERVICE;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "", 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;

if (!MAIL_USER || !MAIL_PASS) {
  console.error("❌ MAIL_USER or MAIL_PASS missing in .env");
}

let transporter = null;
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.isFinite(SMTP_PORT) && SMTP_PORT > 0 ? SMTP_PORT : 587,
    secure: SMTP_SECURE,
    auth: MAIL_USER && MAIL_PASS ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
    logger: true
  });
} else if (MAIL_SERVICE) {
  transporter = nodemailer.createTransport({
    service: MAIL_SERVICE,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: true
  });
} else {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: true
  });
}

// Verify transporter once at startup (non-blocking)
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Nodemailer transporter verify failed:", err);
  } else {
    console.log("✅ Nodemailer transporter is ready");
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
      console.error("❌ sendEmail error:", err.message);
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

    // full info is helpful when debugging
    console.log("📧 sendEmail success:", {
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      envelope: info?.envelope,
    });

    return info;
  } catch (err) {
    // log stack for debugging
    console.error("❌ sendEmail failed:", err && (err.stack || err));
    // rethrow so calling code can catch and log too (controller wraps anyway)
    throw err;
  }
};

export default sendEmail;
