/**
 * EMAIL MARKETING MODULE INTEGRATION GUIDE
 * For AdminPanel.tsx - Add email campaign management UI
 */

import { emailService } from "../services/emailService";

// Example: Add this section to AdminPanel.tsx in the admin section

export async function handleCreateCampaign(
  firebaseId: string,
  cafeId: string,
  subject: string,
  htmlContent: string,
  textContent: string
) {
  try {
    const campaign = await emailService.createCampaign(firebaseId, cafeId, {
      subject,
      htmlContent,
      textContent,
    });
    console.log("Campaign created:", campaign.id);
    return campaign;
  } catch (error) {
    console.error("Failed to create campaign:", error);
    throw error;
  }
}

export async function handleSendCampaign(
  firebaseId: string,
  campaignId: string
) {
  try {
    const result = await emailService.sendCampaign(firebaseId, campaignId);

    if (!result.success) {
      throw new Error(result.message || "Campaign send failed");
    }

    console.log(
      `Campaign queued: ${result.recipientCount} recipients`,
      result
    );
    return result;
  } catch (error) {
    console.error("Failed to send campaign:", error);
    throw error;
  }
}

export async function handleLoadCampaigns(
  firebaseId: string,
  cafeId: string
) {
  try {
    const { campaigns, total } = await emailService.listCampaigns(
      firebaseId,
      cafeId
    );
    return { campaigns, total };
  } catch (error) {
    console.error("Failed to load campaigns:", error);
    throw error;
  }
}

export async function handleLoadCafeEmails(
  firebaseId: string,
  cafeId: string
) {
  try {
    const { customers, total } = await emailService.listCustomers(
      firebaseId,
      cafeId
    );
    return { customers, total };
  } catch (error) {
    console.error("Failed to load customers:", error);
    throw error;
  }
}

export async function handleGetDashboard(firebaseId: string, cafeId: string) {
  try {
    const dashboard = await emailService.getCafeDashboard(firebaseId, cafeId);
    return dashboard;
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    throw error;
  }
}

/**
 * SUGGESTED UI STRUCTURE
 *
 * Admin Panel Email Section:
 * ├─ Dashboard
 * │  ├─ Today's Sent: X/50
 * │  ├─ Total Customers: X
 * │  ├─ Total Campaigns: X
 * │  └─ Recent Campaigns (list)
 * ├─ Campaigns
 * │  ├─ Create New Campaign
 * │  │  ├─ Subject field
 * │  │  ├─ Rich HTML editor
 * │  │  ├─ Preview
 * │  │  └─ Send button
 * │  └─ Campaign History
 * │     ├─ Subject
 * │     ├─ Status (Draft/Sending/Completed)
 * │     ├─ Sent Count / Total
 * │     ├─ View Analytics
 * │     └─ Delete (draft only)
 * └─ Customers
 *    ├─ Customer List
 * │  ├─ Email
 * │  ├─ Name
 * │  ├─ Campaigns Received
 * │  └─ Actions (Delete)
 *    └─ Import Customers
 *       └─ CSV or manual entry
 *
 */

/**
 * SAMPLE JSX COMPONENT
 */

export function EmailCampaignPanel() {
  // Implement your component here using:
  // - emailService methods (from src/services/api/emailService.ts)
  // - Handler functions above
  // - Your existing styling (src/styles/index.css, Tailwind, Motion)

  return (
    <div className="email-marketing-panel">
      {/* Your email marketing UI */}
    </div>
  );
}

/**
 * AUTHENTICATION HEADERS
 * The emailService automatically sends:
 * - X-Firebase-Id: user.uid from Firebase Auth
 * - X-User-Role: 'cafe_admin' (scoped to own cafe)
 *
 * Make sure to pass firebaseId and cafeId from your existing auth context
 */

/**
 * ERROR HANDLING
 *
 * Expected error responses:
 * - 400: Bad request (missing fields, limit exceeded)
 * - 403: Access denied (not cafe owner/admin)
 * - 404: Resource not found
 * - 500: Server error
 *
 * Each response includes { error: string } or { success, message, ... }
 */

/**
 * DAILY LIMITS DISPLAY
 * From getCafeDashboard():
 * {
 *   stats: {
 *     sentToday: 15,
 *     dailyLimitRemaining: 35,  // 50 - 15
 *   }
 * }
 *
 * Show progress bar: 15/50 emails sent today
 */
