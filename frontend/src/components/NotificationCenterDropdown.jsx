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
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    };
  }
  if (norm.includes('sms_simulated') || norm.includes('simulated')) {
    return {
      label: 'SIMULATED SMS',
      icon: Smartphone,
      className: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    };
  }

  if (norm.includes('sms')) {
    return {
      label: 'SMS GATEWAY',
      icon: Smartphone,
      className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
    };
  }
  if (norm.includes('sensor') || norm.includes('scada') || norm.includes('telemetry')) {
    return {
      label: 'SENSOR IOT',
      icon: Radio,
      className: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    };
  }
  if (norm.includes('officer') || norm.includes('phone')) {
    return {
      label: 'DISPATCH / PHONE',
      icon: PhoneCall,
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    };
  }
  return {
    label: 'CITIZEN WEB',
    icon: Globe,
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  };
}

function getSeverityBadge(severity) {
  const norm = (severity || 'moderate').toLowerCase();
  switch (norm) {
    case 'critical':
      return { label: 'CRITICAL', className: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    case 'high':
      return { label: 'HIGH', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    case 'low':
      return { label: 'LOW', className: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
    case 'moderate':
    default:
      return { label: 'MODERATE', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
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
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[420px] max-w-[95vw] bg-[#0A1628] border border-[#203550] rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden flex flex-col max-h-[80vh] font-sans animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* 1. Header */}
      <div className="px-4 py-3 border-b border-[#203550] bg-[#0E1E34] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <h2 className="font-semibold text-white text-xs sm:text-sm tracking-wide truncate">
            Tactical Notification Center
          </h2>
          {unreadCount > 0 && (
            <span
              data-testid="unread-count-pill"
              className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold flex-shrink-0"
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
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A2E4B] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification panel"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A2E4B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Connection Status & Filter Bar */}
      <div className="px-3.5 py-2 bg-[#091424] border-b border-[#203550]/70 flex items-center justify-between text-[11px] gap-2 flex-shrink-0">
        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-xs shadow-emerald-400/80 animate-pulse'
                : connectionStatus === 'polling'
                ? 'bg-cyan-400'
                : 'bg-amber-400'
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
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium text-[10px] tracking-wide focus:outline-none transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <div className="flex items-center bg-[#132238] rounded-md p-0.5 border border-[#203550]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unread')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterMode === 'unread'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Notification List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#182B44] min-h-[220px] max-h-[460px]">
        {/* Loading State */}
        {isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Synchronizing persistent notifications...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 m-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">Notification Sync Error</p>
              <p className="text-[11px] text-rose-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredNotifications.length === 0 && (
          <div className="p-10 text-center text-slate-400 space-y-2.5">
            <Inbox className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-medium text-slate-300 text-xs">
              {filterMode === 'unread' ? 'No unread notifications' : 'No notifications in history'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
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
              className={`p-3.5 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                !notif.is_read
                  ? 'bg-[#0E2038] hover:bg-[#132A4B] border-l-3 border-cyan-400'
                  : 'bg-[#0A1628] hover:bg-[#0F1D33] opacity-80 hover:opacity-100'
              }`}
            >
              {/* Left Source Icon Circle */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${srcBadge.className}`}
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
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border ${srcBadge.className}`}
                    >
                      {srcBadge.label}
                    </span>

                    {notif.severity && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border ${sevBadge.className}`}
                      >
                        {sevBadge.label}
                      </span>
                    )}

                    {typeof notif.priority_score === 'number' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#132238] border border-[#203550] text-cyan-300">
                        PRIO {notif.priority_score}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {formatNotificationTime(notif.created_at)}
                  </span>
                </div>

                {/* Notification Title */}
                <h3
                  className={`text-xs font-semibold leading-snug line-clamp-1 group-hover:text-cyan-300 transition-colors ${
                    !notif.is_read ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {notif.title}
                </h3>

                {/* Concise Factual Message */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>

                {/* Footer Meta: Incident Link & Status */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    {notif.incident_id && (
                      <span className="font-mono text-cyan-400 font-semibold flex items-center gap-0.5 hover:underline">
                        <span>{notif.incident_id}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <span className="text-amber-400/90 font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
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
                      className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-[#1A2E4B] transition-colors"
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
      <div className="px-4 py-2 border-t border-[#203550] bg-[#091424] flex items-center justify-between text-[10px] font-mono text-slate-400 flex-shrink-0">
        <span>Survives page refresh & backend restarts</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-300 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
