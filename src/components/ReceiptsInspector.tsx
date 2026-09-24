import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, ExternalLink, Calendar, User, Eye, Code, Smartphone, Monitor } from 'lucide-react';

interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
  orderId: string;
  messageId?: string;
}

export const ReceiptsInspector: React.FC = () => {
  const [emails, setEmails] = useState<SentEmailRecord[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SentEmailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [tabMode, setTabMode] = useState<'preview' | 'html'>('preview');

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/receipts');
      const data = await res.json();
      if (data.success && data.emails) {
        setEmails(data.emails);
        if (!selectedEmail && data.emails.length > 0) {
          setSelectedEmail(data.emails[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sent emails', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>Nodemailer Email Inspector</span>
          </div>
          <h2 className="text-xl font-bold text-white">Dispatched HTML Receipt Emails</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of styled transactional receipts compiled and delivered via Nodemailer.
          </p>
        </div>
        <button
          onClick={fetchEmails}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Inbox
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">No Emails Dispatched Yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Trigger a purchase in the Webhook Simulator to dispatch your first styled receipt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Email List */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {emails.map((item) => {
              const isSelected = selectedEmail?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedEmail(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Delivered
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                    {item.subject}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="truncate max-w-[160px]">To: {item.to}</span>
                    <span className="font-mono">#{item.orderId}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Email Preview Viewport */}
          <div className="lg:col-span-7">
            {selectedEmail ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white truncate">{selectedEmail.subject}</p>
                    <p className="text-[11px] text-slate-400">
                      To: <span className="text-slate-200">{selectedEmail.to}</span> | Ref: {selectedEmail.orderId}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mode toggles */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setTabMode('preview')}
                        className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${
                          tabMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => setTabMode('html')}
                        className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${
                          tabMode === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" /> HTML
                      </button>
                    </div>

                    {tabMode === 'preview' && (
                      <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                        <button
                          onClick={() => setViewMode('desktop')}
                          className={`p-1.5 rounded ${
                            viewMode === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Desktop view"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode('mobile')}
                          className={`p-1.5 rounded ${
                            viewMode === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mobile view"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Viewport Frame */}
                <div className="p-4 bg-slate-950/80 flex justify-center min-h-[520px]">
                  {tabMode === 'preview' ? (
                    <div
                      className={`transition-all bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 ${
                        viewMode === 'mobile' ? 'w-[375px]' : 'w-full'
                      }`}
                    >
                      <iframe
                        srcDoc={selectedEmail.html}
                        title="Rendered Email Receipt"
                        className="w-full h-[580px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[580px] overflow-auto p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-800">
                      <pre className="whitespace-pre-wrap">{selectedEmail.html}</pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                Select an email on the left to inspect its rendered styled receipt.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
