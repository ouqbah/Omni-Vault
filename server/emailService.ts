import nodemailer from 'nodemailer';
import { PurchaseOrder } from '../src/types';

// In-memory store of recently dispatched emails for live in-app inspection
export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
  orderId: string;
  messageId?: string;
  previewUrl?: string;
}

export const sentEmailsLog: SentEmailRecord[] = [];

// Initialize nodemailer transporter
// Using JSON/Stream or SMTP transport
const transporter = nodemailer.createTransport({
  jsonTransport: true,
});

/**
 * Builds a styled, modern, responsive HTML receipt email
 */
export function buildReceiptHtml(order: PurchaseOrder): string {
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const expiresDate = new Date(order.downloadExpiresAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Digital Product Order #${order.orderId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      padding: 36px 32px;
      text-align: center;
      color: #ffffff;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin-top: 8px;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px;
    }
    .meta-grid {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-label {
      color: #94a3b8;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .meta-value {
      font-weight: 700;
      color: #f8fafc;
    }
    .product-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .product-name {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px 0;
    }
    .product-desc {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 16px 0;
    }
    .cta-button {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: #ffffff !important;
      text-decoration: none;
      text-align: center;
      padding: 16px 24px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
      margin: 20px 0 10px 0;
    }
    .expiry-note {
      text-align: center;
      font-size: 12px;
      color: #f59e0b;
      margin: 8px 0 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .license-box {
      background: #111827;
      border: 1px dashed #475569;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .license-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .license-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      color: #38bdf8;
      font-weight: 600;
      word-break: break-all;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .receipt-table th {
      text-align: left;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      padding-bottom: 10px;
      border-bottom: 1px solid #334155;
    }
    .receipt-table td {
      padding: 12px 0;
      border-bottom: 1px solid #1e293b;
    }
    .receipt-total {
      font-size: 18px;
      font-weight: 800;
      color: #10b981;
    }
    .footer {
      background: #0f172a;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">Payment Confirmed</div>
      <h1 class="title">Your Digital Asset is Ready</h1>
      <div class="subtitle">Thank you for your purchase with OmniVault Delivery Network</div>
    </div>
    
    <div class="content">
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Order Number</div>
          <div class="meta-value">${order.orderId}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${formattedDate}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Billed To</div>
          <div class="meta-value">${order.customerEmail}</div>
        </div>
      </div>

      <div class="product-box">
        <div class="product-name">${order.productTitle}</div>
        <div class="product-desc">Digital format: ${order.assetType.toUpperCase()} | Deliverable: ${order.assetFileName}</div>
        
        <a href="${order.downloadUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
          ⚡ Download Deliverable Now
        </a>
        <div class="expiry-note">
          ⚠️ Security notice: This temporary download link expires at <strong>${expiresDate}</strong> (or after ${order.maxDownloads} downloads).
        </div>
      </div>

      <div class="license-box">
        <div class="license-label">Digital License Entitlement Key</div>
        <div class="license-code">${order.licenseKey || `LIC-${order.orderId.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`}</div>
      </div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color: #ffffff; font-weight: 500;">${order.productTitle}</td>
            <td style="text-align: center; color: #94a3b8;">1</td>
            <td style="text-align: right; color: #ffffff;">$${order.amount.toFixed(2)} ${order.currency}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">Sales Tax (0%)</td>
            <td style="text-align: center; color: #94a3b8;">-</td>
            <td style="text-align: right; color: #94a3b8;">$0.00</td>
          </tr>
          <tr>
            <td style="color: #ffffff; font-weight: 700; padding-top: 14px;">Total Paid</td>
            <td></td>
            <td style="text-align: right; padding-top: 14px;" class="receipt-total">
              $${order.amount.toFixed(2)} ${order.currency}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #93c5fd; margin-top: 12px;">
        💡 <strong>Need a fresh download link later?</strong> Sign in anytime to your buyer dashboard with <strong>${order.customerEmail}</strong> to view your orders, refresh links, and toggle Two-Factor Authentication.
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 8px 0;">OmniVault Digital Delivery Systems &copy; 2026. All rights reserved.</p>
      <p style="margin: 0;">Automated Webhook Fulfillment Engine | Encrypted Signed Entitlements</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends styled HTML receipt email using nodemailer npm package
 */
export async function sendReceiptEmail(order: PurchaseOrder): Promise<{ success: boolean; messageId: string; html: string; previewUrl?: string }> {
  const html = buildReceiptHtml(order);

  try {
    const mailOptions = {
      from: '"OmniVault Deliveries" <delivery@omnivault.internal>',
      to: order.customerEmail,
      subject: `[Receipt & Download] Your digital product ${order.productTitle} (#${order.orderId})`,
      html,
      text: `Thank you for your purchase of ${order.productTitle} ($${order.amount.toFixed(2)}). Download your file here: ${order.downloadUrl}. Note: Link expires soon.`,
    };

    const info = await transporter.sendMail(mailOptions);
    const messageId = info.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: SentEmailRecord = {
      id: messageId,
      to: order.customerEmail,
      subject: mailOptions.subject,
      html,
      sentAt: new Date().toISOString(),
      orderId: order.orderId,
      messageId,
    };

    sentEmailsLog.unshift(record);
    if (sentEmailsLog.length > 50) {
      sentEmailsLog.pop();
    }

    return {
      success: true,
      messageId,
      html,
    };
  } catch (error) {
    console.error('Nodemailer sendReceiptEmail error:', error);
    // Fallback record to ensure receipt is always preserved
    const fallbackId = `err_${Date.now()}`;
    const record: SentEmailRecord = {
      id: fallbackId,
      to: order.customerEmail,
      subject: `[Receipt] ${order.productTitle}`,
      html,
      sentAt: new Date().toISOString(),
      orderId: order.orderId,
    };
    sentEmailsLog.unshift(record);
    return {
      success: false,
      messageId: fallbackId,
      html,
    };
  }
}
