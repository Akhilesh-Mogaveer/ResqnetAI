import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Radio, 
  Bell, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  Download, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

export default function TopNav({ 
  activeTabName, 
  onSimulateIncoming, 
  onOpenExportBrief, 
  onOpenBroadcast,
  backendConnected,
  onOpenNewIncidentModal,
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
  }).toUpperCase();

  return (
    <header className="border-b border-[#141d33] bg-[#070b16]/95 backdrop-blur sticky top-0 z-40 px-6 py-2.5 flex items-center justify-between text-xs">
      {/* Left: Breadcrumbs & Clock */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
          <span className="hover:text-slate-200 cursor-pointer">Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-cyan-400 font-medium">{activeTabName}</span>
        </div>

        <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-[#1a253e] text-slate-400 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span>{formattedDate}</span>
          <span className="text-slate-400">·</span>
          <span className="text-white font-semibold">{formattedTime} LOCAL</span>
        </div>
      </div>

      {/* Center: Environment Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] shadow-sm border ${
          backendConnected === true
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            : backendConnected === false
            ? 'bg-red-950/40 border-red-800/50 text-red-300'
            : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            backendConnected === true
              ? 'bg-emerald-400 animate-pulse'
              : backendConnected === false
              ? 'bg-red-500'
              : 'bg-amber-400 animate-ping'
          }`}></span>
          <span>
            {backendConnected === true
              ? 'FastAPI Backend Online'
              : backendConnected === false
              ? 'Backend Offline (Port 8000)'
              : 'Checking API status...'}
          </span>
        </div>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center space-x-2.5">
        {/* New Report / NLP Intake Button */}
        <button
          onClick={onOpenNewIncidentModal}
          title="Submit a new incident report and classify with HumAID DistilBERT"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/60 transition-all font-mono text-[11px] font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ Submit Report</span>
        </button>

        {/* Simulate New Report Button */}
        <button
          onClick={onSimulateIncoming}
          title="Simulate a new incoming distress signal and persist to backend"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e172a] hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-[#1e293b] hover:border-cyan-500/40 transition-all font-mono text-[11px]"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Simulate Alert</span>
        </button>

        {/* Export Brief Button */}
        <button
          onClick={onOpenExportBrief}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] hover:border-slate-600 transition-all font-medium text-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export brief</span>
        </button>

        {/* Start Broadcast Button */}
        <button
          onClick={onOpenBroadcast}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] text-xs"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Start broadcast</span>
        </button>

        {/* User Profile */}
        <div className="pl-2 border-l border-[#1a253e] flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-slate-950 font-bold text-xs ring-1 ring-cyan-300/40">
            JD
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-slate-200 font-medium text-xs">Jordan Davis</div>
            <div className="text-[10px] text-cyan-400/90 font-mono">Lead Coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
