import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  PlusCircle,
  Clock,
  ChevronRight,
  Menu,
  Zap,
  Search,
  Bell,
  Radio,
  MoreHorizontal
} from 'lucide-react';
import NotificationCenterDropdown from './NotificationCenterDropdown';

export default function TopNav({
  activeTabName = 'Operations Overview',
  onSimulateIncoming,
  onOpenExportBrief,
  onOpenBroadcast,
  backendConnected,
  backendStatus,
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
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const searchInputRef = useRef(null);
  const overflowMenuRef = useRef(null);

  const isCenterOpen = typeof isNotificationCenterOpen === 'boolean' ? isNotificationCenterOpen : isDropdownOpen;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOverflowOpen]);

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
    <header className="bg-surface-card sticky top-0 z-30 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-clay-card min-h-[50px] sm:h-14 min-w-0">
      {/* 1. Left: Mobile hamburger + Operational Breadcrumbs + Dynamic Local Clock + Backend Status */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-clay-button text-text-secondary hover:text-text-primary clay-button focus:outline-none flex-shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Operational Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs min-w-0 flex-shrink">
          <span className="text-text-muted font-medium hidden sm:inline">Coordination</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 hidden sm:inline" />
          <span className="text-text-primary font-bold whitespace-nowrap tracking-wide truncate">
            {activeTabName || 'Operations Overview'}
          </span>
        </div>

        {/* Live Dynamic System Local Timestamp */}
        <div className="hidden xl:flex items-center gap-1.5 pl-2.5 border-l border-[#A3B1C6]/30 text-text-secondary text-[11px] font-mono tabular-nums flex-shrink-0">
          <Clock className="w-3 h-3 text-brand-primary flex-shrink-0" />
          <span className="text-text-secondary hidden 2xl:inline">{formattedDate}</span>
          <span className="text-text-muted hidden 2xl:inline">·</span>
          <span className="text-brand-primary font-semibold">{formattedTime} LOCAL</span>
        </div>

        
        {/* Backend status indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full text-[11px] font-medium flex-shrink-0
            font-mono h-7 sm:h-8 whitespace-nowrap
            transition-colors ${
              backendStatus === 'connected' || backendConnected === true
                ? 'bg-emerald-500 text-green-950'
                :                 backendStatus === 'waking' || backendStatus === 'unavailable' || backendConnected === false
                ? 'bg-red-100 text-red-950'
                : 'bg-slate-100 text-slate-700'
            }`}
          title={
            backendStatus === 'connected' || backendConnected === true
              ? 'FastAPI Backend Online'
              :               backendStatus === 'waking' || backendStatus === 'unavailable' || backendConnected === false
              ? 'Backend Offline (Local Fallback)'
              : 'Checking API status...'
          }
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              backendStatus === 'connected' || backendConnected === true
                ? 'bg-green-950'
                :                 backendStatus === 'waking' || backendStatus === 'unavailable' || backendConnected === false
                ? 'bg-red-700'
                : 'bg-slate-500 animate-pulse'
            }`}
          />

          <span className="whitespace-nowrap">
            {backendStatus === 'connected' || backendConnected === true
              ? 'Backend Connected'
              : backendStatus === 'waking'
              ? 'Backend Waking...'
              : backendStatus === undefined && backendConnected === false
              ? 'Offline (Local Fallback)'
              : backendStatus === 'unavailable' || backendConnected === false
              ? 'Backend Unavailable'
              : 'Connecting to Backend...'}
          </span>
        </div>
      </div>

      {/* 2. Right: Action Buttons, Notification Bell & Coordinator Profile */}
      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
        {/* Notification Bell with self-contained non-overlapping space and interior badge */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={handleNotificationClick}
            title="Live Tactical Alerts"
            aria-label="Tactical Notifications"
            aria-expanded={isCenterOpen}
            className="clay-button relative w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all flex-shrink-0 focus:outline-none shadow-clay-button"
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            {unreadCount > 0 && (
              <span
                data-testid="notification-bell-badge"
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-severity-critical ring-2 ring-surface-card pointer-events-none shadow-sm"
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
          className="clay-button-primary bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center gap-1.5 px-3 sm:px-3.5 h-8 rounded-clay-button font-semibold text-xs shadow-clay-primary transition-all focus:outline-none flex-shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span className="whitespace-nowrap">Submit Report</span>
        </button>

        {/* Broadcast Alert Button */}
        {onOpenBroadcast && (
          <button
            type="button"
            onClick={onOpenBroadcast}
            title="Broadcast emergency situation alert"
            aria-label="Broadcast Alert"
            className="clay-button hidden md:flex items-center gap-1.5 px-3 h-8 rounded-clay-button text-text-primary font-medium text-xs transition-colors flex-shrink-0 shadow-clay-button"
          >
            <Radio className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
            <span className="whitespace-nowrap">Broadcast Alert</span>
          </button>
        )}

        {/* Simulate Alert Button (preserved for tests) */}
        <button
          type="button"
          onClick={onSimulateIncoming}
          title="Inject a simulated incident report for testing"
          aria-label="Simulate Alert"
          className="clay-button hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-clay-button text-text-primary font-medium text-xs transition-colors flex-shrink-0 shadow-clay-button"
        >
          <Zap className="w-3.5 h-3.5 text-severity-high flex-shrink-0" />
          <span className="whitespace-nowrap">Simulate Alert</span>
        </button>

        {/* Export SITREP Button */}
        <button
          type="button"
          onClick={onOpenExportBrief}
          title="Export emergency situation summary report"
          aria-label="Export SITREP"
          className="clay-button hidden md:flex items-center gap-1.5 px-3 h-8 rounded-clay-button text-text-primary font-medium text-xs transition-colors flex-shrink-0 shadow-clay-button"
        >
          <Download className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
          <span className="whitespace-nowrap">Export SITREP</span>
        </button>

        {/* Mobile Overflow Menu for smaller screens */}
        <div className="relative md:hidden flex-shrink-0" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setIsOverflowOpen((prev) => !prev)}
            title="More actions"
            aria-label="More toolbar options"
            aria-expanded={isOverflowOpen}
            className="clay-button w-8 h-8 rounded-clay-button flex items-center justify-center text-text-secondary hover:text-text-primary transition-all flex-shrink-0 focus:outline-none shadow-clay-button"
          >
            <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
          </button>

          {isOverflowOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface-card rounded-clay-card shadow-clay-modal p-1.5 z-50 flex flex-col gap-1 text-xs border border-white/40">
              {onOpenBroadcast && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    onOpenBroadcast();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-clay-button text-text-primary hover:bg-surface-elevated text-left font-medium transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                  <span>Broadcast Alert</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  onSimulateIncoming?.();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-clay-button text-text-primary hover:bg-surface-elevated text-left font-medium transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-severity-high flex-shrink-0" />
                <span>Simulate Alert</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  onOpenExportBrief?.();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-clay-button text-text-primary hover:bg-surface-elevated text-left font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                <span>Export SITREP</span>
              </button>
            </div>
          )}
        </div>

        {/* User Badge / Coordinator Chip */}
        <div className="clay-pill pl-1.5 pr-2.5 h-8 rounded-clay-pill flex items-center gap-2 flex-shrink-0 bg-surface-card shadow-clay-pill">
          <div className="w-6 h-6 rounded-full bg-brand-primary text-white shadow-clay-button flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            JD
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-text-primary font-semibold text-xs whitespace-nowrap">Jordan Davis</div>
            <div className="text-[10px] text-brand-primary font-mono whitespace-nowrap">Lead Coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
