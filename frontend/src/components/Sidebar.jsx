import React from 'react';
import { 
  LayoutDashboard, 
  AlertCircle, 
  ListOrdered, 
  Radio, 
  History, 
  ShieldAlert, 
  HelpCircle,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unverifiedCount, attentionZonesCount }) {
  const navItems = [
    { id: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incident Management', icon: AlertCircle },
    { id: 'priority_queue', label: 'Priority Queue', icon: ListOrdered },
    { id: 'zones', label: 'Attention Needed Zones', icon: Radio, badge: attentionZonesCount },
    { id: 'audit_log', label: 'Audit Log', icon: History }
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#080d1a] border-r border-[#141d33] flex flex-col justify-between min-h-screen text-slate-300 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#141d33] flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-glow-cyan">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#080d1a] animate-ping" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-white tracking-wider text-base">RESQNET</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Emergency Intelligence</p>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Command Center
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#0f172a]'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Telemetry & Signal Queue */}
        <div className="px-4 pt-6 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Signal Feed (Telemetry Simulation)
          </span>
        </div>
        <div className="px-3 space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-[#0c1424] border border-[#1a253e] flex items-center justify-between" title="Simulated IoT telemetry heartbeat for interface demonstration">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-slate-300 text-[11px]">Simulated Sensor Stream</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              SIMULATED
            </span>
          </div>

          <div 
            onClick={() => setActiveTab('incidents')}
            className="p-2.5 rounded-lg bg-[#0c1424] border border-[#1a253e] flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 text-[11px]">Verification queue</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
              {unverifiedCount}
            </span>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-[#141d33] bg-[#060913]/80 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-slate-300 font-medium text-[11px]">Systems normal</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v0.84</span>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>Mock command env</span>
          <span className="text-cyan-400 font-mono">Live Sync</span>
        </div>
        <div className="pt-1 flex items-center justify-between border-t border-[#141d33] text-slate-400 hover:text-slate-200 cursor-pointer">
          <span className="flex items-center space-x-1">
            <HelpCircle className="w-3 h-3" />
            <span className="text-[10px]">Help & guidance</span>
          </span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </aside>
  );
}
