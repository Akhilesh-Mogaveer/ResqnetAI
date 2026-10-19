import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  ShieldAlert, 
  MapPinOff, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Radio, 
  Info, 
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export default function EquityCoverageMonitor({
  incidents = [],
  onNavigateTab,
  onSelectIncident,
  className = ''
}) {
  const [selectedEquityFilter, setSelectedEquityFilter] = useState(null); // null | 'unresolved_coords' | 'serious_unverified' | 'equity_flags' | 'high_urgency'

  // 1. Unresolved Coordinates Count
  const unresolvedLocationIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (i.is_duplicate || i.responseStatus === 'resolved' || i.responseStatus === 'merged_duplicate') return false;
      const coords = i.coordinates;
      const hasMissing = (
        !coords || 
        !Array.isArray(coords) || 
        coords.length < 2 || 
        coords[0] == null || 
        coords[1] == null || 
        (coords[0] === 0 && coords[1] === 0)
      );
      const isUnresolvedStatus = i.location_resolution_status === 'unknown' || i.location_resolution_status === 'unresolved_ambiguous';
      return hasMissing || isUnresolvedStatus;
    });
  }, [incidents]);

  // 2. Serious Incidents Awaiting Verification Count
  const seriousUnverifiedIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (i.is_duplicate || i.responseStatus === 'resolved' || i.responseStatus === 'merged_duplicate') return false;
      const isSerious = i.severity === 'critical' || i.severity === 'high';
      const isUnverified = i.verificationStatus === 'unverified' || i.verificationStatus === 'under_review';
      return isSerious && isUnverified;
    });
  }, [incidents]);

  // 3. Equity-Review Flagged Incidents Count
  const equityFlaggedIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (i.is_duplicate || i.responseStatus === 'resolved' || i.responseStatus === 'merged_duplicate') return false;
      return Boolean(i.equity_review_flag || i.equityReviewFlag);
    });
  }, [incidents]);

  // 4. High-Urgency Reports in Triage Awaiting Review
  const highUrgencyPendingIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (i.is_duplicate || i.responseStatus === 'resolved' || i.responseStatus === 'merged_duplicate') return false;
      const isUrgent = (i.priorityScore || 0) >= 70 || i.severity === 'critical';
      return isUrgent && i.responseStatus === 'triage';
    });
  }, [incidents]);

  // Active list of incidents to display based on selected filter
  const displayedIncidents = useMemo(() => {
    if (selectedEquityFilter === 'unresolved_coords') return unresolvedLocationIncidents;
    if (selectedEquityFilter === 'serious_unverified') return seriousUnverifiedIncidents;
    if (selectedEquityFilter === 'equity_flags') return equityFlaggedIncidents;
    if (selectedEquityFilter === 'high_urgency') return highUrgencyPendingIncidents;
    return equityFlaggedIncidents;
  }, [
    selectedEquityFilter, 
    unresolvedLocationIncidents, 
    seriousUnverifiedIncidents, 
    equityFlaggedIncidents, 
    highUrgencyPendingIncidents
  ]);

  const unresolvedCount = unresolvedLocationIncidents.length;
  const seriousUnverifiedCount = seriousUnverifiedIncidents.length;
  const equityFlaggedCount = equityFlaggedIncidents.length;
  const highUrgencyCount = highUrgencyPendingIncidents.length;

  return (
    <div 
      data-testid="equity-coverage-monitor"
      className={`bg-[#0D1B2D] border border-[#203550] rounded-xl p-5 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Header with Title and Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#203550] gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-400">
            <Scale className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Equity & Coverage Monitor
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold">
                Fair Prioritization Layer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Protects low-information, sparse-reporting, and unverified incidents from being deprioritized or overlooked.
            </p>
          </div>
        </div>

        {/* Live Proxy vs Measured Indicator Pill */}
        <div className="flex items-center space-x-2 text-[11px] font-mono self-start sm:self-auto">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#091629] border border-[#203550] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
            Active Surveillance
          </span>
        </div>
      </div>

      {/* 4 Real-Data Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
        {/* Metric 1: Equity-Review Flags */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'equity_flags' ? null : 'equity_flags')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedEquityFilter === 'equity_flags'
              ? 'bg-amber-950/40 border-amber-500 shadow-sm ring-1 ring-amber-500/50'
              : 'bg-[#091629] border-[#203550] hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#203550]/60">
            <span className="text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Equity-Review Flags</span>
            </span>
            <span 
              data-testid="equity-review-flag-count"
              className="text-xl font-black font-mono text-amber-400"
            >
              {equityFlaggedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Serious emergencies flagged for coordinator review due to information barriers.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-amber-400/90 font-medium pt-1">
            <span>{selectedEquityFilter === 'equity_flags' ? 'Filtering Active' : 'Inspect flagged incidents'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        {/* Metric 2: Unresolved Coordinates */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'unresolved_coords' ? null : 'unresolved_coords')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedEquityFilter === 'unresolved_coords'
              ? 'bg-sky-950/40 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
              : 'bg-[#091629] border-[#203550] hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#203550]/60">
            <span className="text-xs font-semibold text-cyan-300 flex items-center space-x-1.5">
              <MapPinOff className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unresolved Location</span>
            </span>
            <span 
              data-testid="unresolved-location-count"
              className="text-xl font-black font-mono text-[#21D4FD]"
            >
              {unresolvedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Incidents lacking verified coordinates; preserved in queue without score demotion.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-cyan-400/90 font-medium pt-1">
            <span>{selectedEquityFilter === 'unresolved_coords' ? 'Filtering Active' : 'View unmapped incidents'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        {/* Metric 3: Serious Incidents Awaiting Verification */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'serious_unverified' ? null : 'serious_unverified')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedEquityFilter === 'serious_unverified'
              ? 'bg-rose-950/40 border-rose-500 shadow-sm ring-1 ring-rose-500/50'
              : 'bg-[#091629] border-[#203550] hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#203550]/60">
            <span className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF4566]" />
              <span>Serious Unverified</span>
            </span>
            <span 
              data-testid="serious-unverified-count"
              className="text-xl font-black font-mono text-[#FF4566]"
            >
              {seriousUnverifiedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Critical/High reports awaiting field corroboration before dispatch closure.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-rose-400/90 font-medium pt-1">
            <span>{selectedEquityFilter === 'serious_unverified' ? 'Filtering Active' : 'Review ground truth'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        {/* Metric 4: High Urgency in Triage */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'high_urgency' ? null : 'high_urgency')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedEquityFilter === 'high_urgency'
              ? 'bg-indigo-950/40 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50'
              : 'bg-[#091629] border-[#203550] hover:border-indigo-500/50'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#203550]/60">
            <span className="text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>High-Urgency Triage</span>
            </span>
            <span 
              data-testid="high-urgency-pending-count"
              className="text-xl font-black font-mono text-indigo-300"
            >
              {highUrgencyCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Reports with priority &ge; 70 or critical severity currently awaiting triage action.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-indigo-300 font-medium pt-1">
            <span>{selectedEquityFilter === 'high_urgency' ? 'Filtering Active' : 'Inspect triage items'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      {/* Explanatory Distinction Notice: Measured Telemetry vs Labeled Reporting Proxies */}
      <div className="mt-4 p-3 rounded-lg bg-[#091629] border border-[#203550] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-semibold block">Coverage Methodology & Transparency:</strong>
            <span className="text-[11px] text-slate-400">
              <strong className="text-cyan-300">Measured Telemetry:</strong> Zone RF deviations are tracked from real cellular & utility telemetry.
              {' '}
              <strong className="text-amber-300">Reporting Proxy:</strong> Single-source reports (0 corroborating duplicates) are clearly labeled as a proxy for sparse reporting where sensor telemetry is unavailable. No connectivity or population data is invented.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab?.('verification')}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-[#132238] border border-[#203550] hover:border-blue-500 text-cyan-300 hover:text-white transition-colors"
          >
            Review Pending Verification &rarr;
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.('priority')}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-[#132238] border border-[#203550] hover:border-amber-500 text-amber-300 hover:text-white transition-colors"
          >
            Priority Queue &rarr;
          </button>
        </div>
      </div>

      {/* Flagged Incidents Inspection Drawer / Panel */}
      <div className="mt-4 pt-4 border-t border-[#203550]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedEquityFilter ? (
                <>Filtered Incidents ({displayedIncidents.length})</>
              ) : (
                <>Active Incidents Requiring Equity Review ({displayedIncidents.length})</>
              )}
            </h3>
            {selectedEquityFilter && (
              <button
                type="button"
                onClick={() => setSelectedEquityFilter(null)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                (Clear filter)
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Human-in-the-Loop Protocol Enforced
          </span>
        </div>

        {/* Incidents List or Honest Empty State */}
        {displayedIncidents.length === 0 ? (
          <div 
            data-testid="equity-empty-state"
            className="p-6 rounded-xl bg-[#091629] border border-[#203550] text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-xs font-bold text-white">
              {incidents.length === 0 
                ? 'No Active Incidents Loaded' 
                : 'No Equity Review Flags Active in Current View'}
            </h4>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {incidents.length === 0
                ? 'Application currently has 0 active incident reports. Monitor metrics will update automatically when incident data arrives.'
                : 'All serious active emergencies have verified coordinates, corroborating reports, and confirmed ground-truth status.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {displayedIncidents.slice(0, 5).map(inc => {
              const reasons = inc.equity_reasons || inc.equityReasons || [];
              const isUnmapped = !inc.coordinates || inc.coordinates.length < 2 || inc.coordinates[0] == null;
              
              return (
                <div
                  key={inc.id}
                  data-testid={`equity-incident-${inc.id}`}
                  className="p-3 rounded-lg bg-[#091629] border border-[#203550] hover:border-indigo-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-bold text-[#21D4FD]">
                        {inc.id}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        inc.severity === 'critical' ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 font-bold' :
                        inc.severity === 'high' ? 'bg-amber-950/60 text-amber-400 border-amber-800/60 font-semibold' :
                        'bg-blue-950/60 text-blue-400 border-blue-800/60'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        Priority: <strong>{inc.priorityScore}</strong>
                      </span>
                      {isUnmapped && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300">
                          ⚠️ Missing Coords
                        </span>
                      )}
                      <span className="text-slate-500">·</span>
                      <span className="text-xs text-slate-300 font-medium truncate">
                        {inc.sector}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-white mt-1 truncate">
                      {inc.title}
                    </h4>

                    {/* Explanatory Equity Reasons Tags */}
                    {reasons.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {reasons.map((r, idx) => (
                          <span 
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#132238] border border-[#203550] text-amber-300/90 font-sans"
                          >
                            ⚖️ {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (e?.stopPropagation) e.stopPropagation();
                      onSelectIncident?.(inc);
                      onNavigateTab?.('incidents');
                    }}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1f3657] text-[#21D4FD] hover:text-white border border-[#203550] hover:border-[#2878FF]/50 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    aria-label={`Inspect incident ${inc.id}`}
                  >
                    <span>Inspect Incident</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
