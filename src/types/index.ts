export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  category: 'ebook' | 'asset_pack' | 'software' | 'audio' | 'template';
  price: number;
  assetType: 'pdf' | 'image' | 'zip' | 'markdown';
  assetFileName: string;
  fileSizeBytes: number;
  badge?: string;
  coverGradient: string;
  iconName: string;
}

export interface PurchaseOrder {
  orderId: string;
  customerEmail: string;
  customerName: string;
  userId?: string;
  productId: string;
  productTitle: string;
  productCategory: 'ebook' | 'asset_pack' | 'software' | 'audio' | 'template';
  amount: number;
  currency: string;
  status: 'completed' | 'delivered' | 'refunded';
  downloadToken: string;
  downloadExpiresAt: string; // ISO string
  downloadUrl: string;
  downloadCount: number;
  maxDownloads: number;
  assetType: 'pdf' | 'image' | 'zip' | 'markdown';
  assetFileName: string;
  receiptEmailSent: boolean;
  receiptSentAt: string;
  receiptHtml?: string;
  licenseKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSecurityConfig {
  userId: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp_authenticator' | 'email_code';
  secretKey?: string;
  backupCodes?: string[];
  updatedAt: string;
}

export interface WebhookPayload {
  event: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  userId?: string;
  productId: string;
  productTitle: string;
  productCategory: 'ebook' | 'asset_pack' | 'software' | 'audio' | 'template';
  amount: number;
  currency: string;
  assetType: 'pdf' | 'image' | 'zip' | 'markdown';
  assetFileName: string;
  expiresInMinutes?: number;
  maxDownloads?: number;
}
