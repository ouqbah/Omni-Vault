import React from 'react';
import { X, Printer, ExternalLink, Download, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface ReceiptModalProps {
  order: PurchaseOrder | null;
  onClose: () => void;
  onDownloadAsset: (order: PurchaseOrder) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, onDownloadAsset }) => {
  const [copiedKey, setCopiedKey] = React.useState(false);

  if (!order) return null;

  const copyLicense = () => {
    if (order.licenseKey) {
      navigator.clipboard.writeText(order.licenseKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Purchase Receipt</h3>
              <p className="text-xs text-slate-400">Order ID: {order.orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200 text-sm">
          {/* Status banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 flex items-center justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                Fulfillment Complete
              </span>
              <h4 className="text-lg font-bold text-white">{order.productTitle}</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Billed to: <span className="text-white font-medium">{order.customerEmail}</span>
              </p>
            </div>
            <button
              onClick={() => onDownloadAsset(order)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* License key card */}
          {order.licenseKey && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Digital License Entitlement
                </div>
                <code className="text-sm font-mono text-cyan-400 font-semibold">{order.licenseKey}</code>
              </div>
              <button
                onClick={copyLicense}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
          )}

          {/* Itemized Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <th className="py-3 px-4">Item & Format</th>
                  <th className="py-3 px-4 text-center">Downloads</th>
                  <th className="py-3 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-white">{order.productTitle}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deliverable: {order.assetFileName} ({order.assetType.toUpperCase()})
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-300">
                    {order.downloadCount} / {order.maxDownloads}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-white">
                    ${order.amount.toFixed(2)} {order.currency}
                  </td>
                </tr>
                <tr className="bg-slate-900/40 text-xs text-slate-400">
                  <td colSpan={2} className="py-2 px-4 text-right">Sales Tax</td>
                  <td className="py-2 px-4 text-right">$0.00</td>
                </tr>
                <tr className="bg-slate-800/30 text-white font-bold">
                  <td colSpan={2} className="py-3 px-4 text-right">Total Paid</td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-base">
                    ${order.amount.toFixed(2)} {order.currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block mb-1">Receipt Email</span>
              <span className="text-emerald-400 font-medium">Delivered via Nodemailer</span>
            </div>
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block mb-1">Link Expiry</span>
              <span className="text-amber-400 font-medium">
                {new Date(order.downloadExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-1">Purchase Date</span>
              <span className="text-slate-200 font-medium">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Rendered HTML Receipt Preview toggle */}
          {order.receiptHtml && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Styled Email Template Preview</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sent to {order.customerEmail}
                </span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2">
                <iframe
                  srcDoc={order.receiptHtml}
                  title="Receipt Preview"
                  className="w-full h-72 rounded-lg border-0 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified by OmniVault Cryptographic Gateway
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
