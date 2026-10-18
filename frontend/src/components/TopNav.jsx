import React, { useState, useEffect } from 'react';
import {
  Radio,
  Download,
  Sparkles,
  Clock,
  ChevronRight,
  Menu,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function TopNav({
  activeTabName = 'Overview',
  onSimulateIncoming,
  onOpenExportBrief,
  onOpenBroadcast,
  backendConnected,
  onOpenNewIncidentModal,
  onToggleMobileMenu
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs shadow-sm">
      {/* Left: Mobile hamburger + Breadcrumbs + Clock */}
      <div className="flex items-center space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-1.5 text-slate-600 text-xs font-medium">
          <span className="hidden sm:inline">Coordination</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="text-slate-900 font-semibold">{activeTabName}</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-slate-200 text-slate-600 text-[11px] font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          <span>{formattedDate}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-900 font-semibold">{formattedTime} LOCAL</span>
        </div>
      </div>

      {/* Center: Backend status indicator pill */}
      <div className="hidden sm:flex items-center space-x-2">
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
          backendConnected === true
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : backendConnected === false
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            backendConnected === true
              ? 'bg-emerald-500'
              : backendConnected === false
              ? 'bg-rose-500'
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
        {/* + Submit Report (Primary Action) */}
        <button
          onClick={onOpenNewIncidentModal}
          title="Submit a new emergency report for NLP classification"
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">+ New Report</span>
        </button>

        {/* Simulate Alert Button */}
        <button
          onClick={onSimulateIncoming}
          title="Inject a simulated incident report for testing"
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span>Simulate Alert</span>
        </button>

        {/* Export Brief Button */}
        <button
          onClick={onOpenExportBrief}
          title="Export emergency situation summary report"
          className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Export SITREP</span>
        </button>

        {/* User Badge */}
        <div className="pl-2 border-l border-slate-200 flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
            JD
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-slate-900 font-medium text-xs">Jordan Davis</div>
            <div className="text-[10px] text-slate-600">Lead Coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
