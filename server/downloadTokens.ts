import crypto from 'crypto';

const TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET || 'omnivault_expiring_delivery_secret_key_2026';

export interface TokenPayload {
  orderId: string;
  productId: string;
  assetType: string;
  assetFileName: string;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Creates an expiring HMAC-signed download token
 */
export function generateDownloadToken(payload: TokenPayload): string {
  const data = JSON.stringify(payload);
  const base64Data = Buffer.from(data).toString('base64url');
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(base64Data);
  const signature = hmac.digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verifies the download token and checks expiration
 */
export function verifyDownloadToken(token: string): { valid: boolean; expired?: boolean; payload?: TokenPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [base64Data, signature] = parts;
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
    hmac.update(base64Data);
    const expectedSignature = hmac.digest('base64url');

    // Constant-time signature comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid cryptographic signature' };
    }

    const decodedStr = Buffer.from(base64Data, 'base64url').toString('utf8');
    const payload: TokenPayload = JSON.parse(decodedStr);

    if (Date.now() > payload.expiresAt) {
      return { valid: false, expired: true, payload, error: 'Download link has expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Failed to decode or verify token' };
  }
}
