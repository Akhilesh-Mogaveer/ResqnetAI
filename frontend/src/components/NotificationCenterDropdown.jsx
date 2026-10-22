import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Smartphone,
  Radio,
  Globe,
  PhoneCall,
  AlertTriangle,
  ExternalLink,
  X,
  RefreshCw,
  Clock,
  ShieldAlert,
  Inbox
} from 'lucide-react';

function formatNotificationTime(isoStr) {
  if (!isoStr) return 'Recently';
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

function getSourceBadge(source) {
  const norm = (source || 'website').toLowerCase();

  if (norm.includes('sms_forwarded') || norm.includes('forwarded')) {
    return {
      label: 'FORWARDED SMS',
      icon: Smartphone,
      className: 'bg-severity-success/15 text-[#1C8C5A]'
    };
  }
  if (norm.includes('sms_simulated') || norm.includes('simulated')) {
    return {
      label: 'SIMULATED SMS',
      icon: Smartphone,
      className: 'bg-severity-high/15 text-[#B26A00]'
    };
  }

  if (norm.includes('sms')) {
    return {
      label: 'SMS GATEWAY',
      icon: Smartphone,
      className: 'bg-brand-primary/15 text-brand-primary'
    };
  }
  if (norm.includes('sensor') || norm.includes('scada') || norm.includes('telemetry')) {
    return {
      label: 'SENSOR IOT',
      icon: Radio,
      className: 'bg-purple-500/15 text-purple-700'
    };
  }
  if (norm.includes('officer') || norm.includes('phone')) {
    return {
      label: 'DISPATCH / PHONE',
      icon: PhoneCall,
      className: 'bg-severity-success/15 text-[#1C8C5A]'
    };
  }
  return {
    label: 'CITIZEN WEB',
    icon: Globe,
    className: 'bg-brand-primary/15 text-brand-primary'
  };
}

function getSeverityBadge(severity) {
  const norm = (severity || 'moderate').toLowerCase();
  switch (norm) {
    case 'critical':
      return { label: 'CRITICAL', className: 'bg-severity-critical/15 text-[#C0292E]' };
    case 'high':
      return { label: 'HIGH', className: 'bg-severity-high/15 text-[#B26A00]' };
    case 'low':
      return { label: 'LOW', className: 'bg-severity-low/15 text-[#52606D]' };
    case 'moderate':
    default:
      return { label: 'MODERATE', className: 'bg-brand-primary/15 text-brand-primary' };
  }
}

export default function NotificationCenterDropdown({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  error = null,
  connectionStatus = 'connected', // 'connected' | 'polling' | 'disconnected'
  onMarkRead,
  onMarkAllRead,
  onSelectIncident,
  onNavigateTab,
  onRefresh
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = filterMode === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleNotificationClick = (notif) => {
    // 1. Mark notification as read
    if (!notif.is_read && onMarkRead) {
      onMarkRead(notif.id);
    }

    // 2. Open incident details in Incidents tab
    if (notif.incident_id && onSelectIncident) {
      onSelectIncident(notif.incident_id);
    }
    if (onNavigateTab) {
      onNavigateTab('incidents');
    }

    // 3. Close panel
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      role="region"
      aria-label="Tactical Notification Center"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[420px] max-w-[95vw] bg-surface-elevated rounded-clay-modal shadow-clay-modal z-50 overflow-hidden flex flex-col max-h-[80vh] font-sans animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* 1. Header */}
      <div className="px-5 py-4 bg-surface-elevated flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <h2 className="font-semibold text-text-primary text-xs sm:text-sm tracking-wide truncate">
            Tactical Notification Center
          </h2>
          {unreadCount > 0 && (
            <span
              data-testid="unread-count-pill"
              className="px-2 py-0.5 rounded-clay-pill bg-brand-50 text-brand-primary text-[10px] font-mono font-bold flex-shrink-0 shadow-clay-pill"
            >
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh notifications"
              className="p-1.5 rounded-clay-button text-text-muted hover:text-text-primary clay-button transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification panel"
            className="p-1.5 rounded-clay-button text-text-muted hover:text-text-primary clay-button transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Connection Status & Filter Bar */}
      <div className="px-4 py-2.5 bg-surface-inset flex items-center justify-between text-[11px] gap-2 flex-shrink-0 shadow-clay-inset">
        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-secondary">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-severity-success shadow-clay-pill'
                : connectionStatus === 'polling'
                ? 'bg-brand-primary shadow-clay-pill'
                : 'bg-severity-high shadow-clay-pill'
            }`}
          />
          <span className="truncate">
            {connectionStatus === 'connected'
              ? 'Real-Time Live'
              : connectionStatus === 'polling'
              ? 'Polling Sync (10s)'
              : 'Reconnecting...'}
          </span>
        </div>

        {/* Action: Mark All Read & Filter Tabs */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-brand-primary hover:text-brand-hover font-medium text-[10px] tracking-wide focus:outline-none transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <div className="flex items-center bg-surface-card rounded-clay-pill p-0.5 shadow-clay-pill">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-0.5 rounded-clay-pill text-[10px] font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-brand-primary text-white font-semibold shadow-clay-button'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unread')}
              className={`px-2.5 py-0.5 rounded-clay-pill text-[10px] font-medium transition-colors cursor-pointer ${
                filterMode === 'unread'
                  ? 'bg-brand-primary text-white font-semibold shadow-clay-button'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Notification List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-black/5 min-h-[220px] max-h-[460px] p-2 space-y-2">
        {/* Loading State */}
        {isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-text-muted space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-brand-primary" />
            <p className="text-xs font-mono">Synchronizing persistent notifications...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 m-3 rounded-clay-card bg-severity-critical/10 text-[#C0292E] text-xs flex items-start gap-2.5 shadow-clay-card">
            <AlertTriangle className="w-4 h-4 text-[#C0292E] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#C0292E]">Notification Sync Error</p>
              <p className="text-[11px] text-[#C0292E]/80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredNotifications.length === 0 && (
          <div className="p-10 text-center text-text-muted space-y-2.5">
            <Inbox className="w-8 h-8 mx-auto text-text-muted" />
            <p className="font-medium text-text-secondary text-xs">
              {filterMode === 'unread' ? 'No unread notifications' : 'No notifications in history'}
            </p>
            <p className="text-[11px] text-text-muted max-w-xs mx-auto leading-relaxed">
              All emergency reports and automated sensor feeds have been acknowledged.
            </p>
          </div>
        )}

        {/* Notifications */}
        {filteredNotifications.map((notif) => {
          const srcBadge = getSourceBadge(notif.source);
          const sevBadge = getSeverityBadge(notif.severity);
          const SrcIcon = srcBadge.icon;

          return (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 transition-all cursor-pointer group flex items-start gap-3 relative rounded-clay-card shadow-clay-button ${
                !notif.is_read
                  ? 'bg-surface-card border-l-4 border-brand-primary'
                  : 'bg-surface-card/60 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Left Source Icon Circle */}
              <div
                className={`w-8 h-8 rounded-clay-button flex items-center justify-center flex-shrink-0 shadow-clay-button ${srcBadge.className}`}
                title={`Intake Source: ${srcBadge.label}`}
              >
                <SrcIcon className="w-4 h-4" />
              </div>

              {/* Middle Content */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Header Row: Source Badge + Severity + Time */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold tracking-wider shadow-clay-pill ${srcBadge.className}`}
                    >
                      {srcBadge.label}
                    </span>

                    {notif.severity && (
                      <span
                        className={`px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold tracking-wider shadow-clay-pill ${sevBadge.className}`}
                      >
                        {sevBadge.label}
                      </span>
                    )}

                    {typeof notif.priority_score === 'number' && (
                      <span className="px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold bg-brand-primary/10 text-brand-primary shadow-clay-pill">
                        PRIO {notif.priority_score}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-text-muted whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-muted" />
                    {formatNotificationTime(notif.created_at)}
                  </span>
                </div>

                {/* Notification Title */}
                <h3
                  className={`text-xs font-semibold leading-snug line-clamp-1 group-hover:text-brand-primary transition-colors ${
                    !notif.is_read ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {notif.title}
                </h3>

                {/* Concise Factual Message */}
                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>

                {/* Footer Meta: Incident Link & Status */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    {notif.incident_id && (
                      <span className="font-mono text-brand-primary font-semibold flex items-center gap-0.5 hover:underline">
                        <span>{notif.incident_id}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <span className="text-severity-high font-mono text-[9px] px-2 py-0.5 rounded-clay-pill bg-severity-high-soft shadow-clay-pill font-bold">
                      UNVERIFIED
                    </span>
                  </div>

                  {/* Mark Read Individual Button */}
                  {!notif.is_read && onMarkRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(notif.id);
                      }}
                      title="Mark as read"
                      aria-label="Mark notification as read"
                      className="p-1.5 rounded-clay-button text-text-muted hover:text-brand-primary clay-button transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Footer */}
      <div className="px-5 py-3 border-t border-[#A3B1C6]/20 bg-surface-elevated flex items-center justify-between text-[10px] font-mono text-text-muted flex-shrink-0">
        <span>Survives page refresh & backend restarts</span>
        <button
          type="button"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-semibold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
