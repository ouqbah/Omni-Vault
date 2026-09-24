import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Key,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Image as ImageIcon,
  Code,
  Music,
  Layout,
  Receipt,
  Sparkles,
  ArrowUpDown,
  Lock,
  Calendar,
  Check,
  Copy,
  Radio,
} from 'lucide-react';
import { PurchaseOrder } from '../types';

interface DashboardProps {
  orders: PurchaseOrder[];
  onDownloadAsset: (order: PurchaseOrder) => void;
  onRefreshDownloadLink: (orderId: string) => Promise<void>;
  onViewReceipt: (order: PurchaseOrder) => void;
  onNavigateToWebhookTester: () => void;
  isLoading: boolean;
  currentUserEmail?: string;
  twoFactorEnabled: boolean;
  onOpenVoiceChat?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  onDownloadAsset,
  onRefreshDownloadLink,
  onViewReceipt,
  onNavigateToWebhookTester,
  isLoading,
  currentUserEmail,
  twoFactorEnabled,
  onOpenVoiceChat,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'title'>('newest');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Clock ticker for real-time expiring link countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    { id: 'all', label: 'All Deliverables', icon: Sparkles },
    { id: 'ebook', label: 'PDF eBooks', icon: BookOpen },
    { id: 'asset_pack', label: '3D & Assets', icon: ImageIcon },
    { id: 'software', label: 'Software Kits', icon: Code },
    { id: 'audio', label: 'Audio Stems', icon: Music },
    { id: 'template', label: 'UI Templates', icon: Layout },
  ];

  // Filter and sort logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Category filter
        if (selectedCategory !== 'all' && order.productCategory !== selectedCategory) {
          return false;
        }

        // Status filter
        const isExpired = new Date(order.downloadExpiresAt).getTime() < now;
        if (statusFilter === 'active' && isExpired) return false;
        if (statusFilter === 'expired' && !isExpired) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = order.productTitle.toLowerCase().includes(q);
          const matchOrder = order.orderId.toLowerCase().includes(q);
          const matchFile = order.assetFileName.toLowerCase().includes(q);
          const matchEmail = order.customerEmail.toLowerCase().includes(q);
          if (!matchTitle && !matchOrder && !matchFile && !matchEmail) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'price_desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'price_asc') {
          return a.amount - b.amount;
        }
        if (sortBy === 'title') {
          return a.productTitle.localeCompare(b.productTitle);
        }
        return 0;
      });
  }, [orders, selectedCategory, statusFilter, searchQuery, sortBy, now]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.productCategory] = (counts[o.productCategory] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);
    const activeDownloads = orders.filter((o) => new Date(o.downloadExpiresAt).getTime() > now).length;
    const totalDownloadsUsed = orders.reduce((sum, o) => sum + (o.downloadCount || 0), 0);
    return {
      totalPurchases: orders.length,
      totalSpent,
      activeDownloads,
      totalDownloadsUsed,
    };
  }, [orders, now]);

  const handleCopyKey = (key: string, orderId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(orderId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRefresh = async (orderId: string) => {
    setRefreshingOrderId(orderId);
    try {
      await onRefreshDownloadLink(orderId);
    } finally {
      setRefreshingOrderId(null);
    }
  };

  const formatCountdown = (expiresAtIso: string) => {
    const diff = new Date(expiresAtIso).getTime() - now;
    if (diff <= 0) {
      return { text: 'Link Expired', expired: true };
    }
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return {
      text: `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`,
      expired: false,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Purchased Assets</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalPurchases}</div>
          <div className="text-[11px] text-slate-400 mt-1">Available in your secure vault</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Download Links</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats.activeDownloads}</div>
          <div className="text-[11px] text-slate-400 mt-1">Valid temporary tokens</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Lifetime Investment</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">${stats.totalSpent.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Itemized receipts logged</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Account Security</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
            {twoFactorEnabled ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> 2FA Guard Active
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> 2FA Recommended
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Protects asset downloads</div>
        </div>
      </div>

      {/* Voice Assistant Callout Banner */}
      {onOpenVoiceChat && (
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">Real-Time Voice Concierge</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Have questions about your expiring links, license keys, or downloads? Speak in real-time with bidirectional audio.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenVoiceChat}
            className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Start Voice Conversation</span>
          </button>
        </div>
      )}

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, order #, deliverable filename..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'expired' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expired
          </button>
        </div>

        {/* Sort selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pr-8 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your purchase vault from Firestore...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Matching Digital Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Try resetting your search or category filters.'
              : 'You have no historical orders logged under this account yet.'}
          </p>
          <button
            onClick={onNavigateToWebhookTester}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Simulate Webhook Purchase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const countdown = formatCountdown(order.downloadExpiresAt);
            const isExpired = countdown.expired;
            const isRefreshing = refreshingOrderId === order.orderId;

            return (
              <div
                key={order.orderId}
                className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl hover:shadow-2xl flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Category & Order Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {order.productCategory.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300">
                        {order.assetType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Title & Price */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {order.productTitle}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Order #{order.orderId}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-white">
                        ${order.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase">
                        {order.currency}
                      </span>
                    </div>
                  </div>

                  {/* Deliverable File Info */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 my-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-300 font-medium truncate font-mono text-[11px]">
                        {order.assetFileName}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                      {order.downloadCount} / {order.maxDownloads} downloads
                    </span>
                  </div>

                  {/* Expiration Timer Status */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Temporary Link Status
                      </span>
                      <span className={`font-semibold ${isExpired ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {countdown.text}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          isExpired ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                        }`}
                        style={{
                          width: isExpired ? '100%' : '65%',
                        }}
                      />
                    </div>
                  </div>

                  {/* License Key box */}
                  {order.licenseKey && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 mb-4 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-400">License:</span>
                        <code className="text-cyan-300 font-mono font-medium truncate">{order.licenseKey}</code>
                      </div>
                      <button
                        onClick={() => handleCopyKey(order.licenseKey!, order.orderId)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors shrink-0"
                        title="Copy license key"
                      >
                        {copiedKeyId === order.orderId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  {isExpired ? (
                    <button
                      onClick={() => handleRefresh(order.orderId)}
                      disabled={isRefreshing}
                      className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Regenerating...' : 'Refresh Expired Link'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onDownloadAsset(order)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download {order.assetType.toUpperCase()}
                    </button>
                  )}

                  <button
                    onClick={() => onViewReceipt(order)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                    title="View itemized receipt & email"
                  >
                    <Receipt className="w-4 h-4" />
                    <span className="hidden sm:inline">Receipt</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
