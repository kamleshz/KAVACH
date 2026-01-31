import cron from 'node-cron';
import ClientModel from '../models/client.model.js';
import sendEmail from '../config/sendEmail.js';
import dotenv from 'dotenv';
dotenv.config();

const checkAuditExpiry = async () => {
    console.log('Running Audit Expiry Check...');
    try {
        const now = new Date();
        // Find clients where auditEndDate is in the past AND email not sent
        const expiredClients = await ClientModel.find({
            auditEndDate: { $lt: now, $ne: null },
            auditExpiryEmailSent: { $ne: true }
        });

        console.log(`Found ${expiredClients.length} expired audits.`);

        for (const client of expiredClients) {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_USER;
            
            if (!adminEmail) {
                console.error("No ADMIN_EMAIL or MAIL_USER configured. Cannot send audit expiry email.");
                continue;
            }

            const subject = `⚠️ Audit Period Expired: ${client.clientName}`;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8284';
            const clientLink = `${frontendUrl}/dashboard/client/${client._id}`;

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #d9534f;">Audit Period Expired</h2>
                    <p>Hello Admin,</p>
                    <p>The audit period for the following client has expired:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Client Name:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${client.clientName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Group Name:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${client.companyGroupName || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Audit End Date:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #d9534f;">${new Date(client.auditEndDate).toLocaleDateString()}</td>
                        </tr>
                    </table>
                    
                    <p>Please verify and take necessary action:</p>
                    <ul>
                        <li>Extend the audit period if more time is needed.</li>
                        <li>Mark the audit as complete if finished.</li>
                    </ul>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${clientLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Client Details</a>
                    </div>
                </div>
            `;

            await sendEmail({
                to: adminEmail,
                subject,
                html
            });

            // Mark as sent so we don't send again
            client.auditExpiryEmailSent = true;
            await client.save();
            console.log(`✅ Audit expiry email sent for ${client.clientName} to ${adminEmail}`);
        }
    } catch (error) {
        console.error("❌ Error in checkAuditExpiry cron:", error);
    }
};

export const initAuditCron = () => {
    // Run every day at 9:00 AM
    // Cron syntax: minute hour day-of-month month day-of-week
    cron.schedule('0 9 * * *', checkAuditExpiry);
    
    // Also run immediately on server start to catch up
    checkAuditExpiry();
    
    console.log("🕒 Audit expiry cron job initialized (Daily at 9:00 AM)");
};
