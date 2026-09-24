import express, { Request, Response } from 'express';
import { generateDownloadToken, verifyDownloadToken } from './downloadTokens';
import { generatePdfEbook, generateImageDeliverable, generateSoftwareArchive } from './digitalAssets';
import { sendReceiptEmail, sentEmailsLog } from './emailService';
import { logOrderToFirestore, getOrderFromFirestore, incrementDownloadCount, listOrdersFromFirestore } from './firestoreBackend';
import { PurchaseOrder, WebhookPayload } from '../src/types';

export function createApiRouter() {
  const router = express.Router();

  // In-memory log of webhook dispatches
  const webhookActivityLog: Array<{
    id: string;
    timestamp: string;
    event: string;
    orderId: string;
    customerEmail: string;
    productTitle: string;
    amount: number;
    downloadUrl: string;
    status: string;
  }> = [];

  // Seed default sample order for instant out-of-the-box demonstration
  const seedOrderId = 'ord_demo_982143';
  const seedExpiryMs = Date.now() + 60 * 60 * 1000;
  const seedToken = generateDownloadToken({
    orderId: seedOrderId,
    productId: 'prod_cloud_arch_pdf',
    assetType: 'pdf',
    assetFileName: 'mastering-cloud-architecture-v2.pdf',
    expiresAt: seedExpiryMs,
  });

  const seedOrder: PurchaseOrder = {
    orderId: seedOrderId,
    customerEmail: 'ouqbah@gmail.com',
    customerName: 'Ouqbah Al-Khatib',
    userId: '',
    productId: 'prod_cloud_arch_pdf',
    productTitle: 'Mastering Cloud Architecture & Event Streams',
    productCategory: 'ebook',
    amount: 49.00,
    currency: 'USD',
    status: 'completed',
    downloadToken: seedToken,
    downloadExpiresAt: new Date(seedExpiryMs).toISOString(),
    downloadUrl: `/api/download/${seedToken}`,
    downloadCount: 1,
    maxDownloads: 5,
    assetType: 'pdf',
    assetFileName: 'mastering-cloud-architecture-v2.pdf',
    receiptEmailSent: true,
    receiptSentAt: new Date().toISOString(),
    licenseKey: 'LIC-CLOUDARCH-8892-PRO',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  logOrderToFirestore(seedOrder).catch((e) => console.warn('Seed order log:', e));
  sendReceiptEmail(seedOrder).catch((e) => console.warn('Seed receipt:', e));

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'OmniVault Digital Delivery Engine',
      timestamp: new Date().toISOString(),
      ordersCount: webhookActivityLog.length + 1,
    });
  });

  /**
   * WEBHOOK ENDPOINT: /api/webhook
   * Accepts purchase payloads from Stripe, Lemon Squeezy, Shopify, or Storefronts
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const payload = req.body as WebhookPayload;

      // Extract and sanitize purchase data
      const orderId = payload.orderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const customerEmail = payload.customerEmail || 'buyer@example.com';
      const customerName = payload.customerName || 'Valued Customer';
      const productId = payload.productId || 'prod_cloud_arch_pdf';
      const productTitle = payload.productTitle || 'Mastering Cloud Architecture PDF eBook';
      const productCategory = payload.productCategory || 'ebook';
      const amount = typeof payload.amount === 'number' ? payload.amount : 49.00;
      const currency = payload.currency || 'USD';
      const assetType = payload.assetType || (productId.includes('3d') ? 'image' : 'pdf');
      const assetFileName = payload.assetFileName || (assetType === 'pdf' ? 'mastering-cloud-architecture-v2.pdf' : 'cyberpunk-neo-asset-pack-hd.png');
      const expiresInMinutes = payload.expiresInMinutes || 60; // 1 hour expiration by default
      const maxDownloads = payload.maxDownloads || 5;

      // Expiration timestamp
      const expiresAtMs = Date.now() + expiresInMinutes * 60 * 1000;
      const downloadExpiresAt = new Date(expiresAtMs).toISOString();

      // Cryptographic temporary expiring download token
      const downloadToken = generateDownloadToken({
        orderId,
        productId,
        assetType,
        assetFileName,
        expiresAt: expiresAtMs,
      });

      const downloadUrl = `/api/download/${downloadToken}`;
      const licenseKey = `LIC-${orderId.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Assemble full order entity
      const newOrder: PurchaseOrder = {
        orderId,
        customerEmail,
        customerName,
        userId: payload.userId || '',
        productId,
        productTitle,
        productCategory,
        amount,
        currency,
        status: 'completed',
        downloadToken,
        downloadExpiresAt,
        downloadUrl,
        downloadCount: 0,
        maxDownloads,
        assetType,
        assetFileName,
        receiptEmailSent: false,
        receiptSentAt: new Date().toISOString(),
        licenseKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Log order to Firestore
      await logOrderToFirestore(newOrder);

      // 2. Dispatch styled HTML receipt email using nodemailer npm package
      const emailResult = await sendReceiptEmail(newOrder);
      newOrder.receiptEmailSent = emailResult.success;
      newOrder.receiptHtml = emailResult.html;

      // Update order record with receipt status
      await logOrderToFirestore(newOrder);

      // Log webhook activity
      webhookActivityLog.unshift({
        id: `wh_${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: payload.event || 'order.completed',
        orderId,
        customerEmail,
        productTitle,
        amount,
        downloadUrl,
        status: 'fulfilled',
      });

      if (webhookActivityLog.length > 30) {
        webhookActivityLog.pop();
      }

      console.log(`[Webhook] Processed order ${orderId} for ${customerEmail}. Download link: ${downloadUrl}`);

      return res.status(200).json({
        success: true,
        message: 'Order processed, logged to Firestore, expiring download link generated, and receipt dispatched.',
        order: newOrder,
        downloadUrl,
        expiresAt: downloadExpiresAt,
        receiptSent: emailResult.success,
        messageId: emailResult.messageId,
      });
    } catch (error) {
      console.error('[Webhook Error]:', error);
      return res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to process webhook payload',
      });
    }
  });

  /**
   * EXPIRING DOWNLOAD ENDPOINT: /api/download/:token
   */
  router.get('/download/:token', async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('Missing download token.');
    }

    const verification = verifyDownloadToken(token);

    if (!verification.valid) {
      if (verification.expired) {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Download Link Expired - OmniVault</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 480px; text-align: center; }
              h1 { color: #f43f5e; margin-bottom: 12px; }
              p { color: #94a3b8; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⚠️ Download Link Expired</h1>
              <p>For security, digital delivery download links are temporary and automatically expire.</p>
              <p>Please log in to your <strong>OmniVault Buyer Dashboard</strong> to generate a refreshed download link instantly.</p>
              <a href="/">Go to Dashboard</a>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 50px; text-align: center;">
          <h2 style="color: #ef4444;">403 Forbidden</h2>
          <p>${verification.error || 'Invalid or tampered download token.'}</p>
          <a href="/" style="color: #38bdf8;">Return to Dashboard</a>
        </body>
        </html>
      `);
    }

    const payload = verification.payload!;

    // Check order status & download quota in Firestore
    const order = await getOrderFromFirestore(payload.orderId);
    if (order && order.downloadCount >= order.maxDownloads) {
      return res.status(429).send(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 50px; text-align: center;">
          <h2 style="color: #f59e0b;">Download Limit Exceeded</h2>
          <p>This purchase has reached its limit of ${order.maxDownloads} downloads.</p>
          <p>Please visit your buyer dashboard to request a download reset.</p>
          <a href="/" style="color: #38bdf8;">Return to Dashboard</a>
        </body>
        </html>
      `);
    }

    // Increment download count
    await incrementDownloadCount(payload.orderId);

    // Stream the asset deliverable
    if (payload.assetType === 'pdf') {
      const pdfBuffer = generatePdfEbook(
        payload.orderId,
        order?.customerEmail || 'buyer@example.com',
        order?.productTitle || 'Mastering Cloud Architecture PDF eBook'
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.assetFileName || 'digital-ebook.pdf'}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } else if (payload.assetType === 'image') {
      const imgBuffer = generateImageDeliverable(
        payload.orderId,
        order?.productTitle || 'Cyberpunk 3D Asset Pack'
      );
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.assetFileName || 'cyberpunk-assets-hd.svg'}"`);
      res.setHeader('Content-Length', imgBuffer.length);
      return res.send(imgBuffer);
    } else {
      const archiveBuffer = generateSoftwareArchive(
        payload.orderId,
        order?.customerEmail || 'buyer@example.com'
      );
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.assetFileName || 'software-bundle.md'}"`);
      res.setHeader('Content-Length', archiveBuffer.length);
      return res.send(archiveBuffer);
    }
  });

  /**
   * REFRESH DOWNLOAD LINK ENDPOINT: /api/refresh-download
   */
  router.post('/refresh-download', async (req: Request, res: Response) => {
    try {
      const { orderId, customerEmail } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
      }

      const order = await getOrderFromFirestore(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check email matching if provided
      if (customerEmail && order.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized to refresh link for this order' });
      }

      // Generate refreshed token valid for 60 minutes
      const newExpiryMs = Date.now() + 60 * 60 * 1000;
      const newToken = generateDownloadToken({
        orderId: order.orderId,
        productId: order.productId,
        assetType: order.assetType,
        assetFileName: order.assetFileName,
        expiresAt: newExpiryMs,
      });

      order.downloadToken = newToken;
      order.downloadExpiresAt = new Date(newExpiryMs).toISOString();
      order.downloadUrl = `/api/download/${newToken}`;
      order.updatedAt = new Date().toISOString();

      await logOrderToFirestore(order);

      return res.json({
        success: true,
        orderId: order.orderId,
        downloadToken: newToken,
        downloadUrl: order.downloadUrl,
        downloadExpiresAt: order.downloadExpiresAt,
      });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * ORDERS API: /api/orders
   */
  router.get('/orders', async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string | undefined;
      const orders = await listOrdersFromFirestore(email);
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * RECEIPTS & WEBHOOK LOGS: /api/receipts & /api/webhook-logs
   */
  router.get('/receipts', (_req: Request, res: Response) => {
    res.json({ success: true, emails: sentEmailsLog });
  });

  router.get('/webhook-logs', (_req: Request, res: Response) => {
    res.json({ success: true, logs: webhookActivityLog });
  });

  return router;
}
