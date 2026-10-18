import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Radio, 
  Flame, 
  Users, 
  Clock, 
  TrendingUp, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function SummaryCards({ 
  incidents, 
  attentionZones, 
  onFilterClick 
}) {
  // Prevent duplicate counting without deleting source reports
  const independentIncidents = incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate');
  const activeCount = independentIncidents.filter(i => i.responseStatus !== 'resolved').length;
  const criticalCount = independentIncidents.filter(i => i.severity === 'critical' && i.responseStatus !== 'resolved').length;
  const unverifiedCount = independentIncidents.filter(i => i.verificationStatus === 'unverified').length;
  const underReviewCount = independentIncidents.filter(i => i.verificationStatus === 'under_review').length;
  const attentionZonesCount = attentionZones.length;

  // Total affected estimate (excluding duplicates to prevent double counting)
  const totalAffected = independentIncidents.reduce((acc, curr) => acc + (curr.affectedCountNumeric || 15), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Active Incidents Card */}
      <div 
        onClick={() => onFilterClick && onFilterClick('active')}
        className="bg-[#0c1322] border border-[#1b263d] hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 shadow-card-subtle relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
        
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400">
            Active Incidents
          </span>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:shadow-glow-cyan transition-shadow">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
            {activeCount < 10 ? `0${activeCount}` : activeCount}
          </span>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-0.5">
            <TrendingUp className="w-3 h-3 inline" />
            <span>+6 since 04:00</span>
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#162035] flex items-center justify-between text-[11px] text-slate-400">
          <span>Total tracked: <strong className="text-slate-200 font-mono">{incidents.length}</strong></span>
          <span className="text-cyan-400/90 font-mono">Live Sync</span>
        </div>
      </div>

      {/* 2. Critical Incidents Card */}
      <div 
        onClick={() => onFilterClick && onFilterClick('critical')}
        className="bg-[#0c1322] border border-[#1b263d] hover:border-red-500/50 rounded-xl p-4 transition-all duration-200 shadow-card-subtle relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/15 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-red-400">
            Critical Incidents
          </span>
          <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 group-hover:shadow-glow-red transition-shadow">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-red-400 tracking-tight font-mono">
            {criticalCount < 10 ? `0${criticalCount}` : criticalCount}
          </span>
          <span className="text-[11px] font-mono text-red-300/80 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800/40">
            Immediate Action
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#162035] flex items-center justify-between text-[11px] text-slate-400">
          <span>Priority score &gt; 85</span>
          <span className="text-red-400 font-mono">{incidents.filter(i => i.priorityScore >= 85).length} High threat</span>
        </div>
      </div>

      {/* 3. Unverified Reports Card */}
      <div 
        onClick={() => onFilterClick && onFilterClick('unverified')}
        className="bg-[#0c1322] border border-[#1b263d] hover:border-amber-500/50 rounded-xl p-4 transition-all duration-200 shadow-card-subtle relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-400">
            Unverified Reports
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 group-hover:shadow-glow-amber transition-shadow">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono">
            {unverifiedCount < 10 ? `0${unverifiedCount}` : unverifiedCount}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            +{underReviewCount} under review
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#162035] flex items-center justify-between text-[11px] text-slate-400">
          <span>Ground truth required</span>
          <span className="text-amber-400/90 font-mono">Pending Field Check</span>
        </div>
      </div>

      {/* 4. Attention-Needed Zones Card */}
      <div 
        onClick={() => onFilterClick && onFilterClick('zones')}
        className="bg-[#0c1322] border border-[#1b263d] hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 shadow-card-subtle relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-cyan-400">
            Attention-Needed Zones
          </span>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:shadow-glow-cyan transition-shadow">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-cyan-400 tracking-tight font-mono">
            {attentionZonesCount < 10 ? `0${attentionZonesCount}` : attentionZonesCount}
          </span>
          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
            Signal Gaps
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#162035] flex items-center justify-between text-[11px] text-slate-400">
          <span>Severe reporting dropoff</span>
          <span className="text-cyan-400 font-mono">Potential Masked Need</span>
        </div>
      </div>
    </div>
  );
}
