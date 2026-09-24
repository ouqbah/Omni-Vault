import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Shield, ShieldAlert, ShieldCheck, Key, Copy, Check, Lock, RefreshCw, X, AlertCircle } from 'lucide-react';
import { generateBase32Secret, verifyTotpCode, generateBackupCodes } from '../utils/totp';
import { UserSecurityConfig } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
  securityConfig: UserSecurityConfig;
  onUpdateSecurity: (newConfig: UserSecurityConfig) => void;
  // If in challenge mode, requires verification to proceed
  isChallengeMode?: boolean;
  onChallengeSuccess?: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail = 'buyer@example.com',
  securityConfig,
  onUpdateSecurity,
  isChallengeMode = false,
  onChallengeSuccess,
}) => {
  const [step, setStep] = useState<'status' | 'setup' | 'backup' | 'challenge'>(
    isChallengeMode ? 'challenge' : securityConfig.twoFactorEnabled ? 'status' : 'setup'
  );
  const [secretKey, setSecretKey] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isChallengeMode) {
      setStep('challenge');
      setErrorMsg(null);
      setVerificationCode('');
    } else if (securityConfig.twoFactorEnabled) {
      setStep('status');
    }
  }, [isOpen, isChallengeMode, securityConfig.twoFactorEnabled]);

  const startSetup = async () => {
    setErrorMsg(null);
    const newSecret = generateBase32Secret(16);
    setSecretKey(newSecret);

    const otpauthUrl = `otpauth://totp/OmniVault:${encodeURIComponent(userEmail)}?secret=${newSecret}&issuer=OmniVault`;
    try {
      const qrUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrUrl);
      setStep('setup');
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const isValid = await verifyTotpCode(secretKey, verificationCode);
      if (!isValid) {
        setErrorMsg('Invalid code. Please check your authenticator app or enter "123456" for demo mode.');
        setIsSubmitting(false);
        return;
      }

      const generatedCodes = generateBackupCodes(8);
      setBackupCodes(generatedCodes);

      const updatedConfig: UserSecurityConfig = {
        userId: userId || 'local_user',
        twoFactorEnabled: true,
        twoFactorMethod: 'totp_authenticator',
        secretKey,
        backupCodes: generatedCodes,
        updatedAt: new Date().toISOString(),
      };

      // Persist to Firestore if user is authenticated
      if (userId) {
        try {
          await setDoc(doc(db, 'user_security', userId), {
            userId,
            twoFactorEnabled: true,
            twoFactorMethod: 'totp_authenticator',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore user_security write skipped:', fsErr);
        }
      }

      onUpdateSecurity(updatedConfig);
      setStep('backup');
    } catch (err) {
      setErrorMsg('Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallengeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const secretToTest = securityConfig.secretKey || secretKey || 'JBSWY3DPEHPK3PXP';
      const isValid = await verifyTotpCode(secretToTest, verificationCode);

      if (!isValid) {
        setErrorMsg('Invalid 2FA code. Please enter the 6-digit code from your app or "123456".');
        setIsSubmitting(false);
        return;
      }

      if (onChallengeSuccess) {
        onChallengeSuccess();
      }
      onClose();
    } catch (err) {
      setErrorMsg('Challenge verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsSubmitting(true);
    const updatedConfig: UserSecurityConfig = {
      userId: userId || 'local_user',
      twoFactorEnabled: false,
      twoFactorMethod: 'totp_authenticator',
      updatedAt: new Date().toISOString(),
    };

    if (userId) {
      try {
        await setDoc(doc(db, 'user_security', userId), {
          userId,
          twoFactorEnabled: false,
          twoFactorMethod: 'totp_authenticator',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to update 2FA in Firestore', err);
      }
    }

    onUpdateSecurity(updatedConfig);
    setIsSubmitting(false);
    setStep('status');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Two-Factor Authentication</h3>
              <p className="text-xs text-slate-400">Account Security & Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP: Challenge Mode */}
          {step === 'challenge' && (
            <form onSubmit={handleChallengeVerify} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Security Verification</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the 6-digit verification code from your Authenticator app (or demo code <code className="text-cyan-400">123456</code>).
                </p>
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verificationCode.length !== 6 || isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Proceed'}
                </button>
              </div>
            </form>
          )}

          {/* STEP: Status view */}
          {step === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Two-Factor Authentication is Active</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your account is protected using TOTP Authenticator (Google Authenticator / Authy).
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-400 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="text-white font-medium">TOTP (RFC 6238)</span>
                </div>
                <div className="flex justify-between">
                  <span>Protected Actions:</span>
                  <span className="text-white font-medium">Asset Downloads, License Reveal</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-medium">Active & Synchronized</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={startSetup}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconfigure
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium rounded-xl transition-colors"
                >
                  {isSubmitting ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* STEP: Setup view */}
          {step === 'setup' && (
            <form onSubmit={handleVerifySetup} className="space-y-4">
              <div className="text-xs text-slate-400 text-center">
                Scan this QR code with Google Authenticator, 1Password, or Authy:
              </div>

              {qrCodeDataUrl && (
                <div className="flex justify-center p-3 bg-white rounded-xl shadow-inner max-w-[200px] mx-auto">
                  <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-44 h-44" />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Or enter secret key manually:</span>
                <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <code className="text-xs font-mono text-cyan-400 flex-1 truncate">{secretKey}</code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm 6-Digit Code (or test code <span className="text-cyan-400 font-mono">123456</span>):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.3em] font-mono text-xl font-bold bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={verificationCode.length !== 6 || isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? 'Enabling...' : 'Verify & Activate 2FA'}
              </button>
            </form>
          )}

          {/* STEP: Backup Codes */}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Two-Factor Authentication Enabled!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Save these one-time recovery codes in a secure location. If you lose your phone, you can use one of these codes to sign in.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-900/60 rounded text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedBackup ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBackup ? 'Copied Codes' : 'Copy Codes'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  I Have Saved Them
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
