import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Lock,
  Key,
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  QrCode,
  Send,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserSecurityConfig } from '../types';
import { sendPushNotification } from '../utils/notifications';

interface SecurityPanelProps {
  user: User | null;
  securityConfig: UserSecurityConfig;
  onOpenTwoFactorModal: (challengeMode?: boolean) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  user,
  securityConfig,
  onOpenTwoFactorModal,
  notificationsEnabled,
  onToggleNotifications,
}) => {
  const [testPushSent, setTestPushSent] = useState(false);

  const handleTestPush = () => {
    const success = sendPushNotification('OmniVault Order Ready! 🚀', {
      body: 'Your digital download link for "Mastering Cloud Architecture PDF eBook" has been generated.',
    });
    if (success) {
      setTestPushSent(true);
      setTimeout(() => setTestPushSent(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">
          <Shield className="w-4 h-4" />
          <span>Security & Authentication Governance</span>
        </div>
        <h2 className="text-xl font-bold text-white">Account Protection & Access Controls</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure two-factor authentication (2FA), review cryptographic delivery parameters, and manage device notifications.
        </p>
      </div>

      {/* Grid: 2FA & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2FA Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  securityConfig.twoFactorEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {securityConfig.twoFactorEnabled ? '2FA Active' : '2FA Recommended'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Two-Factor Authentication (TOTP)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Add an extra layer of defense using standard authenticator apps (Google Authenticator, Authy, or 1Password) before downloading high-value assets.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Protocol:</span>
                <span className="text-white font-mono">RFC 6238 TOTP (30s window)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Backup Codes:</span>
                <span className="text-white">8 One-Time Keys</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Protected Actions:</span>
                <span className="text-white">Downloads & License Reveal</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-2">
            <button
              onClick={() => onOpenTwoFactorModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              {securityConfig.twoFactorEnabled ? 'Manage 2FA Settings' : 'Configure 2FA Authenticator'}
            </button>

            {securityConfig.twoFactorEnabled && (
              <button
                onClick={() => onOpenTwoFactorModal(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Test 2FA Security Challenge Prompt
              </button>
            )}
          </div>
        </div>

        {/* Push Notification Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  notificationsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {notificationsEnabled ? 'Permission Granted' : 'Disabled'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Order Readiness Push Alerts</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Receive immediate desktop and mobile push notifications whenever a webhook completes digital fulfillment and asset download links are signed.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Notification Engine:</span>
                <span className="text-white">Web Notifications API</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Auditory Feedback:</span>
                <span className="text-emerald-400 font-medium">Synthesized Web Audio Chime</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Triggers:</span>
                <span className="text-white">Webhook Order Completed</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-2">
            <button
              onClick={onToggleNotifications}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                notificationsEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              <Bell className="w-4 h-4" />
              {notificationsEnabled ? 'Update Notification Permission' : 'Enable Push Notifications'}
            </button>

            {notificationsEnabled && (
              <button
                onClick={handleTestPush}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {testPushSent ? 'Push Notification Dispatched!' : 'Send Test Push Alert'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cryptographic Architecture Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          Fulfillment Security Architecture
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-white mb-1">HMAC-SHA256 Expiring Tokens</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Download URLs carry base64url timestamps verified in constant time. Expired tokens are rejected with HTTP 410.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-white mb-1">Zero-Trust Firestore Rules</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Purchases are bounded to authenticated buyer UIDs and verified email credentials with strict schema enforcement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-white mb-1">Nodemailer Transactional Mails</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Styled HTML receipts are compiled server-side and sent directly upon purchase verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
