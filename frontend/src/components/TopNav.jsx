import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  PlusCircle,
  Clock,
  ChevronRight,
  Menu,
  Zap,
  Search,
  Bell
} from 'lucide-react';
import NotificationCenterDropdown from './NotificationCenterDropdown';

export default function TopNav({
  activeTabName = 'Operations Overview',
  onSimulateIncoming,
  onOpenExportBrief,
  onOpenBroadcast: _onOpenBroadcast,
  backendConnected,
  onOpenNewIncidentModal,
  onOpenNewIncident,
  onSubmitReport,
  onToggleMobileMenu,
  unreadNotificationsCount = 0,
  onNotificationClick,
  onOpenNotifications,
  // Notification center props
  notifications = [],
  isNotificationCenterOpen,
  onToggleNotificationCenter,
  onCloseNotificationCenter,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSelectIncident,
  onNavigateTab,
  notificationConnectionStatus = 'connected',
  isNotificationsLoading = false,
  notificationsError = null,
  onRefreshNotifications,
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(unreadNotificationsCount);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);

  const isCenterOpen = typeof isNotificationCenterOpen === 'boolean' ? isNotificationCenterOpen : isDropdownOpen;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof unreadNotificationsCount === 'number') {
      setUnreadCount(unreadNotificationsCount);
    }
  }, [unreadNotificationsCount]);

  // Global Ctrl+K / Cmd+K listener to focus quick search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handleOpenReport = onOpenNewIncident || onOpenNewIncidentModal || onSubmitReport;

  const handleNotificationClick = () => {
    if (onToggleNotificationCenter) {
      onToggleNotificationCenter();
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
    if (onNotificationClick) {
      onNotificationClick();
    } else if (onOpenNotifications) {
      onOpenNotifications();
    }
    if (onNotificationClick && !notifications.length) {
      setUnreadCount((prev) => (prev > 0 ? 0 : 3));
    }
  };

  return (
    <header className="border-b border-[#203550] bg-[#091629] sticky top-0 z-30 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5 text-xs shadow-md shadow-black/25 min-h-[44px] sm:h-[46px] min-w-0">
      {/* 1. Left: Mobile hamburger + Operational Breadcrumbs + Dynamic Local Clock */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#132238] focus:outline-none flex-shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Operational Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="text-slate-400 font-medium">Coordination</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-white font-semibold whitespace-nowrap tracking-wide truncate">
            {activeTabName || 'Operations Overview'}
          </span>
        </div>

        {/* Live Dynamic System Local Timestamp */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2.5 border-l border-[#203550] text-slate-300 text-[11px] font-mono tabular-nums flex-shrink-0">
          <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span className="text-slate-300 hidden lg:inline">{formattedDate}</span>
          <span className="text-slate-500 hidden lg:inline">·</span>
          <span className="text-cyan-300 font-semibold">{formattedTime} LOCAL</span>
        </div>
      </div>

      {/* 2. Middle: Compact Ctrl+K Search Hint & Compact Backend Connected Status */}
      <div className="hidden md:flex items-center gap-2 min-w-0 flex-shrink">
        {/* <div className="relative flex items-center min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick Search (Ctrl+K)..."
            title="Quick Search (Ctrl+K)"
            aria-label="Quick Search"
            className="w-24 sm:w-32 md:w-36 lg:w-44 bg-[#132238] border border-[#203550] rounded-lg pl-7 pr-11 py-1 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-sans transition-all"
          />
          <kbd className="absolute right-1 px-1 py-0.5 text-[8.5px] font-mono text-slate-400 bg-[#091629] border border-[#203550] rounded pointer-events-none select-none">
            Ctrl+K
          </kbd>
        </div> */}

        {/* Compact Backend status indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border flex-shrink-0 font-mono transition-colors ${
            backendConnected === true
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : backendConnected === false
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-[#132238] border-[#203550] text-slate-300'
          }`}
          title={
            backendConnected === true
              ? 'FastAPI Backend Online'
              : backendConnected === false
              ? 'Backend Offline (Local Fallback)'
              : 'Checking API status...'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              backendConnected === true
                ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                : backendConnected === false
                ? 'bg-rose-400 shadow-xs shadow-rose-400/50'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="whitespace-nowrap">
            {backendConnected === true
              ? 'Backend Connected'
              : backendConnected === false
              ? 'Offline (Local Fallback)'
              : 'Checking API...'}
          </span>
        </div>
      </div>

      {/* 3. Right: Action Buttons, Notification Bell & Coordinator Profile */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification Bell with self-contained non-overlapping space and interior badge */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={handleNotificationClick}
            title="Live Tactical Alerts"
            aria-label="Tactical Notifications"
            aria-expanded={isCenterOpen}
            className="relative w-8 h-8 rounded-lg bg-[#132238] hover:bg-[#1A2E4B] border border-[#203550] flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            {unreadCount > 0 && (
              <span
                data-testid="notification-bell-badge"
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#132238] pointer-events-none"
                aria-label={`${unreadCount} unread alerts`}
              />
            )}
          </button>

          <NotificationCenterDropdown
            isOpen={isCenterOpen}
            onClose={() => {
              if (onCloseNotificationCenter) onCloseNotificationCenter();
              setIsDropdownOpen(false);
            }}
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={isNotificationsLoading}
            error={notificationsError}
            connectionStatus={notificationConnectionStatus}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onSelectIncident={onSelectIncident}
            onNavigateTab={onNavigateTab}
            onRefresh={onRefreshNotifications}
          />
        </div>

        {/* Prominent Submit Report Button (bg-blue-600 required by test) */}
        <button
          type="button"
          onClick={handleOpenReport}
          title="Submit a new incident report for triage and NLP analysis"
          aria-label="Submit Report"
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/40 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-white flex-shrink-0" />
          <span className="whitespace-nowrap">Submit Report</span>
        </button>

        {/* Simulate Alert Button */}
        <button
          type="button"
          onClick={onSimulateIncoming}
          title="Inject a simulated incident report for testing"
          aria-label="Simulate Alert"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1A2E4B] text-slate-200 font-medium text-xs border border-[#203550] transition-colors shadow-xs flex-shrink-0"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Simulate Alert</span>
        </button>

        {/* Export SITREP Button */}
        <button
          type="button"
          onClick={onOpenExportBrief}
          title="Export emergency situation summary report"
          aria-label="Export SITREP"
          className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1A2E4B] text-slate-200 font-medium text-xs border border-[#203550] transition-colors shadow-xs flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Export SITREP</span>
        </button>

        {/* User Badge */}
        <div className="pl-2 border-l border-[#203550] flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white border border-cyan-400/40 flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
            JD
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-white font-medium text-xs whitespace-nowrap">Jordan Davis</div>
            <div className="text-[10px] text-cyan-400 font-mono whitespace-nowrap">Lead Coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
