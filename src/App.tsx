import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase/config';
import { PurchaseOrder, UserSecurityConfig } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WebhookTester } from './components/WebhookTester';
import { ReceiptsInspector } from './components/ReceiptsInspector';
import { SecurityPanel } from './components/SecurityPanel';
import { ReceiptModal } from './components/ReceiptModal';
import { TwoFactorModal } from './components/TwoFactorModal';
import { VoiceChatModal } from './components/VoiceChatModal';
import {
  requestNotificationPermission,
  sendPushNotification,
  playChimeSound,
  isNotificationSupported,
} from './utils/notifications';
import { CheckCircle, AlertCircle, Info, X, Radio } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'webhook' | 'receipts' | 'security'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<PurchaseOrder | null>(null);
  const [is2faModalOpen, setIs2faModalOpen] = useState<boolean>(false);
  const [is2faChallengeMode, setIs2faChallengeMode] = useState<boolean>(false);
  const [pendingDownloadOrder, setPendingDownloadOrder] = useState<PurchaseOrder | null>(null);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 2FA Security Configuration
  const [securityConfig, setSecurityConfig] = useState<UserSecurityConfig>({
    userId: 'default_buyer',
    twoFactorEnabled: false,
    twoFactorMethod: 'totp_authenticator',
    updatedAt: new Date().toISOString(),
  });

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user security preferences from Firestore
        try {
          const secDocRef = doc(db, 'user_security', currentUser.uid);
          const snap = await getDoc(secDocRef);
          if (snap.exists()) {
            setSecurityConfig(snap.data() as UserSecurityConfig);
          }
        } catch (err) {
          console.warn('Could not read user_security from Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if (isNotificationSupported() && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Fetch or listen to orders in Firestore & backend API
  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      // First try backend API which syncs with Firestore
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('API /api/orders fetch fallback:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // If user is authenticated, attach Firestore real-time listener
    if (user) {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('customerEmail', '==', user.email));
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            const liveOrders: PurchaseOrder[] = [];
            snapshot.forEach((d) => liveOrders.push(d.data() as PurchaseOrder));
            if (liveOrders.length > 0) {
              setOrders((prev) => {
                const combined = [...liveOrders];
                prev.forEach((p) => {
                  if (!combined.some((c) => c.orderId === p.orderId)) {
                    combined.push(p);
                  }
                });
                return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              });
            }
          },
          (error) => {
            // Log Firestore error per skill requirements
            console.warn('Firestore snapshot error:', error);
          }
        );
        return () => unsub();
      } catch (e) {
        // Non-fatal
      }
    }
  }, [user, fetchOrders]);

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('success', 'Authentication Successful', 'Signed in with your Google account.');
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      showToast('error', 'Sign In Failed', (error as Error).message);
    }
  };

  // Demo buyer login
  const handleDemoSignIn = (email: string) => {
    showToast('info', 'Demo Buyer Active', `Simulating authenticated session for ${email}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('info', 'Signed Out', 'You have been signed out.');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Notification Toggle
  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) {
      showToast('error', 'Unsupported', 'Your browser does not support web push notifications.');
      return;
    }

    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      showToast('success', 'Push Alerts Enabled', 'You will be notified when your orders are ready for download!');
      sendPushNotification('OmniVault Push Notifications Active! 🔔', {
        body: 'You will receive immediate alerts whenever a purchase completes fulfillment.',
      });
    } else {
      setNotificationsEnabled(false);
      showToast('error', 'Permission Denied', 'Browser push notifications were blocked in your browser settings.');
    }
  };

  // Refresh Expired Download Token
  const handleRefreshDownloadLink = async (orderId: string) => {
    try {
      const res = await fetch('/api/refresh-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to refresh token');
      }

      // Update state
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                downloadToken: data.downloadToken,
                downloadUrl: data.downloadUrl,
                downloadExpiresAt: data.downloadExpiresAt,
              }
            : o
        )
      );

      showToast('success', 'Download Link Refreshed', 'A fresh temporary expiring link has been generated (60m validity).');
    } catch (err) {
      showToast('error', 'Refresh Failed', (err as Error).message);
    }
  };

  // Initiate Download with optional 2FA verification guard
  const handleDownloadAsset = (order: PurchaseOrder) => {
    if (securityConfig.twoFactorEnabled) {
      setPendingDownloadOrder(order);
      setIs2faChallengeMode(true);
      setIs2faModalOpen(true);
    } else {
      executeDirectDownload(order);
    }
  };

  const executeDirectDownload = (order: PurchaseOrder) => {
    showToast('info', 'Download Initiated', `Streaming deliverable ${order.assetFileName}...`);

    // Increment local counter immediately
    setOrders((prev) =>
      prev.map((o) => (o.orderId === order.orderId ? { ...o, downloadCount: (o.downloadCount || 0) + 1 } : o))
    );

    // Trigger download
    const link = document.createElement('a');
    link.href = order.downloadUrl;
    link.setAttribute('download', order.assetFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Webhook order callback
  const handleOrderProcessed = (newOrder: PurchaseOrder) => {
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.orderId !== newOrder.orderId)]);

    // Trigger push notification & chime
    playChimeSound();
    if (notificationsEnabled) {
      sendPushNotification(`Order Ready: ${newOrder.productTitle} 📦`, {
        body: `Your temporary download link has been generated. Click to access.`,
      });
    }

    showToast('success', 'Fulfillment Completed', `Order #${newOrder.orderId} logged in Firestore. Receipt sent.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 text-xs transition-all animate-in slide-in-from-right duration-200 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-red-500/30 text-red-300'
                : 'bg-slate-900/95 border-blue-500/30 text-blue-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold text-white">{toast.title}</p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onDemoSignIn={handleDemoSignIn}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        twoFactorActive={securityConfig.twoFactorEnabled}
        ordersCount={orders.length}
        onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
      />

      {/* Main Application Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            onDownloadAsset={handleDownloadAsset}
            onRefreshDownloadLink={handleRefreshDownloadLink}
            onViewReceipt={(ord) => setActiveReceiptOrder(ord)}
            onNavigateToWebhookTester={() => setActiveTab('webhook')}
            isLoading={isLoadingOrders}
            currentUserEmail={user?.email || 'ouqbah@gmail.com'}
            twoFactorEnabled={securityConfig.twoFactorEnabled}
            onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
          />
        )}

        {activeTab === 'webhook' && (
          <WebhookTester
            onOrderProcessed={handleOrderProcessed}
            currentUserEmail={user?.email || 'ouqbah@gmail.com'}
            onViewReceipt={(ord) => setActiveReceiptOrder(ord)}
          />
        )}

        {activeTab === 'receipts' && <ReceiptsInspector />}

        {activeTab === 'security' && (
          <SecurityPanel
            user={user}
            securityConfig={securityConfig}
            onOpenTwoFactorModal={(challengeMode) => {
              setIs2faChallengeMode(Boolean(challengeMode));
              setIs2faModalOpen(true);
            }}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
          />
        )}
      </main>

      {/* Receipt Modal */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        onDownloadAsset={handleDownloadAsset}
      />

      {/* 2FA Setup & Challenge Modal */}
      <TwoFactorModal
        isOpen={is2faModalOpen}
        onClose={() => {
          setIs2faModalOpen(false);
          setIs2faChallengeMode(false);
          setPendingDownloadOrder(null);
        }}
        userId={user?.uid}
        userEmail={user?.email || 'buyer@example.com'}
        securityConfig={securityConfig}
        onUpdateSecurity={(newConfig) => {
          setSecurityConfig(newConfig);
          showToast(
            'success',
            newConfig.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled',
            newConfig.twoFactorEnabled
              ? 'Your account is now protected with TOTP Two-Factor Authentication.'
              : 'Two-factor authentication has been disabled.'
          );
        }}
        isChallengeMode={is2faChallengeMode}
        onChallengeSuccess={() => {
          if (pendingDownloadOrder) {
            executeDirectDownload(pendingDownloadOrder);
            setPendingDownloadOrder(null);
          }
          showToast('success', 'Security Verified', 'Identity confirmed via Two-Factor Authentication.');
        }}
      />

      {/* Gemini 3.8 Live Voice Chat Modal */}
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={() => setIsVoiceChatOpen(false)}
        orders={orders}
        userEmail={user?.email || undefined}
      />

      {/* Floating Real-time Voice AI Launcher */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsVoiceChatOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all border border-cyan-400/40"
          title="Open Gemini 3.8 Live Voice Concierge"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <Radio className="w-4 h-4 text-cyan-200 group-hover:animate-pulse" />
          <span className="text-xs font-bold tracking-tight">Talk to Concierge</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/20 text-white border border-white/30">
            gemini-3.8-live
          </span>
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniVault &copy; 2026. Digital Fulfillment & Webhook Delivery Engine.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Node.js Express Full-Stack</span>
            <span>&bull;</span>
            <span>Cloud Firestore & Auth</span>
            <span>&bull;</span>
            <span>HMAC Expiring Links</span>
            <span>&bull;</span>
            <span>Nodemailer Receipts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
