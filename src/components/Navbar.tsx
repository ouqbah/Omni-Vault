import React, { useState } from 'react';
import { Shield, Bell, BellOff, LogIn, LogOut, Box, Terminal, Mail, Menu, X, UserCheck, Sparkles, Radio } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'dashboard' | 'webhook' | 'receipts' | 'security';
  setActiveTab: (tab: 'dashboard' | 'webhook' | 'receipts' | 'security') => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onDemoSignIn: (email: string) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  twoFactorActive: boolean;
  ordersCount: number;
  onOpenVoiceChat: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onGoogleSignIn,
  onSignOut,
  onDemoSignIn,
  notificationsEnabled,
  onToggleNotifications,
  twoFactorActive,
  ordersCount,
  onOpenVoiceChat,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as const, label: 'Purchased Assets', icon: Box, count: ordersCount },
    { id: 'webhook' as const, label: 'Webhook Engine', icon: Terminal },
    { id: 'receipts' as const, label: 'Receipt Inbox', icon: Mail },
    { id: 'security' as const, label: 'Security & 2FA', icon: Shield, badge: twoFactorActive ? '2FA ON' : undefined },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">OmniVault</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Fulfillment v2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Digital Deliveries & Webhook Pipeline</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right actions: Voice AI, Push Notification & Auth */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Live Voice AI Concierge Button */}
            <button
              onClick={onOpenVoiceChat}
              className="relative px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/35 text-cyan-300 hover:text-white hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 transition-all group"
              title="Real-time Voice Conversation with Gemini 3.8 Live"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
              <span>Voice AI</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
            </button>

            {/* Push notification toggle */}
            <button
              onClick={onToggleNotifications}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                notificationsEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={notificationsEnabled ? 'Push notifications active' : 'Enable browser push notifications for new orders'}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span className="hidden lg:inline">{notificationsEnabled ? 'Push Active' : 'Enable Push'}</span>
            </button>

            {/* Auth section */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-200"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      {(user.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate font-medium">{user.email}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs text-slate-300">
                    <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                      <p className="font-semibold text-white truncate">{user.displayName || 'Buyer Account'}</p>
                      <p className="text-slate-400 truncate text-[11px]">{user.email}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                        <UserCheck className="w-3 h-3" /> Firebase Authenticated
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('security');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      Two-Factor Security
                    </button>

                    <button
                      onClick={() => {
                        onSignOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onGoogleSignIn}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In with Google
                </button>
                <button
                  onClick={() => onDemoSignIn('ouqbah@gmail.com')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 border border-slate-700"
                  title="Sign in with buyer email ouqbah@gmail.com"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Demo Buyer
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onToggleNotifications}
              className={`p-2 rounded-lg border ${
                notificationsEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Voice Concierge Button Mobile */}
          <button
            onClick={() => {
              onOpenVoiceChat();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Voice AI Concierge (Gemini 3.8 Live)</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>

          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-300 truncate">{user.email}</span>
                <button
                  onClick={onSignOut}
                  className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onGoogleSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" /> Google Sign-In
                </button>
                <button
                  onClick={() => {
                    onDemoSignIn('ouqbah@gmail.com');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700"
                >
                  Demo User
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
