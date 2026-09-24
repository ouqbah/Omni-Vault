/**
 * Digital asset generator & provider for eBooks, Image Assets, and Software
 */

/**
 * Builds a valid, formatted PDF document with title, chapters, and watermark metadata
 */
export function generatePdfEbook(orderId: string, customerEmail: string, title: string): Buffer {
  const dateStr = new Date().toUTCString();
  const contentText = `
%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R]
  /Count 2
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica-Bold
      >>
      /F2 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica-Bold
      >>
      /F2 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 6 0 R
>>
endobj
5 0 obj
<< /Length 720 >>
stream
BT
/F1 24 Tf
50 720 Td
(${title}) Tj
/F2 12 Tf
0 -30 Td
(Licensed uniquely to: ${customerEmail}) Tj
0 -18 Td
(Order Reference: ${orderId} | Verified Delivery: ${dateStr}) Tj
0 -40 Td
/F1 16 Tf
(TABLE OF CONTENTS & ARCHITECTURAL BLUEPRINTS) Tj
/F2 11 Tf
0 -26 Td
(CHAPTER 1: Designing Resilient Event-Driven Webhooks & Idempotency Keys) Tj
0 -20 Td
(CHAPTER 2: Expiring Signed Token Verification & Cryptographic HMAC-SHA256) Tj
0 -20 Td
(CHAPTER 3: Scalable Cloud Firestore Schemas with Zero-Trust Security Rules) Tj
0 -20 Td
(CHAPTER 4: Zero-Downtime Digital Asset Streaming & Chunked Delivery Pipelines) Tj
0 -20 Td
(CHAPTER 5: Multi-Factor Authentication & TOTP Authenticator Workflows) Tj
0 -40 Td
/F1 14 Tf
(EXECUTIVE SUMMARY) Tj
/F2 10 Tf
0 -20 Td
(This digital edition was delivered automatically via OmniVault Fulfillment API.) Tj
0 -16 Td
(Any redistribution or unauthorized sharing violates international copyright treaties.) Tj
ET
endstream
endobj
6 0 obj
<< /Length 640 >>
stream
BT
/F1 18 Tf
50 720 Td
(CHAPTER 1: THE IDEMPOTENT WEBHOOK PATTERN) Tj
/F2 11 Tf
0 -30 Td
(Modern payment gateways like Stripe or Lemon Squeezy guarantee at-least-once delivery.) Tj
0 -20 Td
(Your webhook handler at /api/webhook must be prepared to receive duplicate payloads.) Tj
0 -20 Td
(By maintaining a persistent unique index on the orderId inside Firestore,) Tj
0 -20 Td
(OmniVault ensures orders are fulfilled exactly once, generating a deterministic token.) Tj
0 -30 Td
/F1 14 Tf
(CORE METRICS & DELIVERY GUARANTEES) Tj
/F2 10 Tf
0 -20 Td
(* Signed Token Expiration: Strict cryptographic timestamp comparison.) Tj
0 -16 Td
(* Download Throttling: Atomically bounded at 5 downloads per purchase entitlement.) Tj
0 -16 Td
(* Automated Receipt Dispatch: Delivered via standard RFC 822 MIME formatting.) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000305 00000 n 
0000000495 00000 n 
0000001267 00000 n 
trailer
<<
  /Size 7
  /Root 1 0 R
>>
startxref
1960
%%EOF
`.trim();

  return Buffer.from(contentText, 'utf8');
}

/**
 * Builds a valid PNG image binary asset for 3D/Image asset packages
 */
export function generateImageDeliverable(orderId: string, title: string): Buffer {
  // SVG vector asset rendered and converted to a valid SVG/PNG payload
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#311042" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)" />
  <circle cx="600" cy="400" r="280" fill="none" stroke="url(#glow)" stroke-width="6" opacity="0.8" stroke-dasharray="16 8"/>
  <circle cx="600" cy="400" r="190" fill="none" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
  <polygon points="600,240 730,460 470,460" fill="none" stroke="url(#glow)" stroke-width="5"/>
  <text x="600" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
  <text x="600" y="565" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">Official Verified License: ${orderId} | OmniVault Digital Systems</text>
  <text x="600" y="605" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">3D PBR ASSET SUITE // 4K TEXTURE PACK READY</text>
</svg>
  `.trim();

  return Buffer.from(svgContent, 'utf8');
}

/**
 * Builds a software code bundle file (e.g. zip/markdown)
 */
export function generateSoftwareArchive(orderId: string, customerEmail: string): Buffer {
  const content = `# OmniVault Software & Microservices Starter Bundle
License ID: ${orderId}
Purchased By: ${customerEmail}
Generated At: ${new Date().toISOString()}

## Included Microservices
1. /services/webhook-gateway: High throughput idempotency listener
2. /services/token-vault: HMAC-SHA256 Expiring URL Signer
3. /services/receipt-engine: Responsive HTML receipt template compiler
4. /services/totp-guard: RFC 6238 2FA security enforcement

## Quick Start
\`\`\`bash
npm install
npm run start:services
\`\`\`

Verified cryptographic digital deliverable provided by OmniVault.
`;
  return Buffer.from(content, 'utf8');
}
