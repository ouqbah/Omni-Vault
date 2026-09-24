import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Copy,
  Check,
  AlertCircle,
  Code2,
  Download,
  BookOpen,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import { WebhookPayload, PurchaseOrder } from '../types';
import { CATALOG_PRODUCTS } from '../data/products';

interface WebhookTesterProps {
  onOrderProcessed: (order: PurchaseOrder) => void;
  currentUserEmail?: string;
  onViewReceipt: (order: PurchaseOrder) => void;
}

export const WebhookTester: React.FC<WebhookTesterProps> = ({
  onOrderProcessed,
  currentUserEmail = 'ouqbah@gmail.com',
  onViewReceipt,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(CATALOG_PRODUCTS[0].id);
  const [customerEmail, setCustomerEmail] = useState<string>(currentUserEmail);
  const [customerName, setCustomerName] = useState<string>('Ouqbah Al-Khatib');
  const [expiresInMinutes, setExpiresInMinutes] = useState<number>(60);
  const [isDispatching, setIsDispatching] = useState(false);
  const [responseResult, setResponseResult] = useState<{
    success: boolean;
    order?: PurchaseOrder;
    downloadUrl?: string;
    expiresAt?: string;
    receiptSent?: boolean;
    error?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedProduct = CATALOG_PRODUCTS.find((p) => p.id === selectedPresetId) || CATALOG_PRODUCTS[0];

  const handleSelectProduct = (prodId: string) => {
    setSelectedPresetId(prodId);
  };

  const handleDispatchWebhook = async () => {
    setIsDispatching(true);
    setResponseResult(null);

    const generatedOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const payload: WebhookPayload = {
      event: 'order.completed',
      orderId: generatedOrderId,
      customerEmail,
      customerName,
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      productCategory: selectedProduct.category,
      amount: selectedProduct.price,
      currency: 'USD',
      assetType: selectedProduct.assetType,
      assetFileName: selectedProduct.assetFileName,
      expiresInMinutes,
      maxDownloads: 5,
    };

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Webhook dispatch failed');
      }

      setResponseResult(data);
      if (data.order) {
        onOrderProcessed(data.order);
      }
    } catch (err) {
      setResponseResult({
        success: false,
        error: (err as Error).message,
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const copyDownloadUrl = () => {
    if (responseResult?.downloadUrl) {
      const fullUrl = `${window.location.origin}${responseResult.downloadUrl}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1.5">
          <Terminal className="w-4 h-4" />
          <span>Webhook Pipeline Simulator</span>
        </div>
        <h2 className="text-xl font-bold text-white">Trigger Purchase & Digital Asset Delivery</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Simulate an incoming webhook from Stripe, Lemon Squeezy, or Shopify to <code className="text-blue-300 font-mono">POST /api/webhook</code>.
          The backend engine writes the order to <strong>Firestore</strong>, computes an <strong>HMAC-signed expiring download link</strong>, and dispatches a <strong>styled HTML receipt via Nodemailer</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Selector & Configuration */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Select Digital Product Preset
            </h3>

            {/* Product Preset Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATALOG_PRODUCTS.map((prod) => {
                const isSelected = selectedPresetId === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.id)}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                          {prod.assetType}
                        </span>
                        <span className="text-xs font-extrabold text-white">${prod.price.toFixed(2)}</span>
                      </div>
                      <h4 className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                        {prod.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{prod.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Buyer Parameters */}
            <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Recipient Buyer Email:</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    placeholder="buyer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Buyer Full Name:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Customer Name"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Link Expiration Window:</label>
                  <span className="text-amber-400 font-semibold">{expiresInMinutes} Minutes</span>
                </div>
                <div className="flex gap-2">
                  {[2, 15, 60, 1440].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setExpiresInMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        expiresInMinutes === mins
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mins === 2 ? '2m (Fast Test)' : mins === 15 ? '15m' : mins === 60 ? '1 Hour' : '24 Hours'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleDispatchWebhook}
              disabled={isDispatching}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isDispatching ? 'Executing Webhook Pipeline...' : 'Dispatch Purchase Webhook to /api/webhook'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Webhook Console & Results */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Webhook Execution Result
              </h3>
              {responseResult?.success && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HTTP 200 OK
                </span>
              )}
            </div>

            {responseResult ? (
              responseResult.success && responseResult.order ? (
                <div className="space-y-3 text-xs animate-in fade-in duration-200">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Order Successfully Fulfilled</p>
                      <p className="text-[11px] text-emerald-400/80 mt-0.5">
                        Logged in Firestore & receipts dispatched via Nodemailer.
                      </p>
                    </div>
                  </div>

                  {/* Generated Download Link Box */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold uppercase tracking-wider">Temporary Signed Link:</span>
                      <span className="text-amber-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" /> Valid for {expiresInMinutes}m
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-slate-900 rounded-lg font-mono text-[11px] text-blue-400 truncate">
                        {responseResult.downloadUrl}
                      </code>
                      <button
                        onClick={copyDownloadUrl}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shrink-0"
                        title="Copy full download link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <a
                        href={responseResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Test Download
                      </a>
                      <button
                        onClick={() => responseResult.order && onViewReceipt(responseResult.order)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Inspect Receipt
                      </button>
                    </div>
                  </div>

                  {/* Order summary table */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Order ID:</span>
                      <span className="text-slate-200">{responseResult.order.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="text-slate-200">{responseResult.order.customerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="text-emerald-400 font-bold">${responseResult.order.amount.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>License Key:</span>
                      <span className="text-cyan-400">{responseResult.order.licenseKey}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{responseResult.error || 'Failed to execute webhook.'}</span>
                </div>
              )
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No webhook dispatched yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click the button on the left to simulate a real payment event.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
