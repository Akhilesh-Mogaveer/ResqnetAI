import React, { useState, useEffect } from 'react';
import {
  Download,
  PlusCircle,
  Clock,
  ChevronRight,
  Menu,
  Zap,
  Search,
  Bell,
  Activity
} from 'lucide-react';

export default function TopNav({
  activeTabName = 'Operations Overview',
  onSimulateIncoming,
  onOpenExportBrief,
  onOpenBroadcast: _onOpenBroadcast,
  backendConnected,
  onOpenNewIncidentModal,
  onOpenNewIncident,
  onSubmitReport,
  onToggleMobileMenu
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  return (
    <header className="border-b border-[#203550] bg-[#091629] sticky top-0 z-30 px-3.5 sm:px-5 py-2 flex items-center justify-between text-xs shadow-md shadow-black/20 min-h-[50px]">
      {/* Left: Mobile hamburger + Operational Breadcrumbs + Dynamic Local Clock */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#132238] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Operational Breadcrumb */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-slate-400 font-medium">Coordination</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-white font-semibold whitespace-nowrap tracking-wide">
            {activeTabName || 'Operations Overview'}
          </span>
        </div>

        {/* Live Dynamic System Local Timestamp */}
        <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-[#203550] text-slate-300 text-[11px] font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-slate-300">{formattedDate}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-300 font-semibold">{formattedTime} LOCAL</span>
        </div>
      </div>

      {/* Center: Command Center Search & Status */}
      <div className="hidden md:flex items-center space-x-3 flex-1 max-w-md mx-4">
        {/* Quick Search */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, sectors, coordinates..."
            className="w-full bg-[#132238] border border-[#203550] rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-sans transition-all"
          />
          <kbd className="hidden lg:inline absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.2 text-[9px] font-mono bg-[#091629] text-slate-400 border border-[#203550] rounded">
            Ctrl+K
          </kbd>
        </div>

        {/* Backend status indicator pill */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border flex-shrink-0 font-mono ${
          backendConnected === true
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : backendConnected === false
            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            : 'bg-[#132238] border-[#203550] text-slate-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            backendConnected === true
              ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
              : backendConnected === false
              ? 'bg-rose-400 shadow-xs shadow-rose-400/50'
              : 'bg-amber-400 animate-pulse'
          }`} />
          <span>
            {backendConnected === true
              ? 'Backend Connected'
              : backendConnected === false
              ? 'Offline (Local Fallback)'
              : 'Checking API...'}
          </span>
        </div>
      </div>

      {/* Right: Quick Actions & Coordinator Profile */}
      <div className="flex items-center space-x-2">
        {/* Notification Bell */}
        <div className="relative hidden xl:flex items-center justify-center p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#132238] transition-colors cursor-pointer" title="Live Tactical Alerts">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#091629]" />
        </div>

        {/* Prominent Submit Report Button (bg-blue-600 required by test) */}
        <button
          type="button"
          onClick={handleOpenReport}
          title="Submit a new incident report for triage and NLP analysis"
          aria-label="Submit Report"
          className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/40 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-white flex-shrink-0" />
          <span>Submit Report</span>
        </button>

        {/* Simulate Alert Button */}
        <button
          type="button"
          onClick={onSimulateIncoming}
          title="Inject a simulated incident report for testing"
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1A2E4B] text-slate-200 font-medium text-xs border border-[#203550] transition-colors shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulate Alert</span>
        </button>

        {/* Export SITREP Button */}
        <button
          type="button"
          onClick={onOpenExportBrief}
          title="Export emergency situation summary report"
          className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1A2E4B] text-slate-200 font-medium text-xs border border-[#203550] transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export SITREP</span>
        </button>

        {/* User Badge */}
        <div className="pl-2 border-l border-[#203550] flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white border border-cyan-400/40 flex items-center justify-center font-bold text-xs shadow-xs">
            JD
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-white font-medium text-xs">Jordan Davis</div>
            <div className="text-[10px] text-cyan-400 font-mono">Lead Coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
