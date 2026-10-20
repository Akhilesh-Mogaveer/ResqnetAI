import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  ShieldAlert, 
  MapPinOff, 
  MapPin,
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  Shield,
  FileText,
  MoreVertical
} from 'lucide-react';
import { getHazardMeta, handleHazardImageError } from '../utils/hazardMapping';

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
      className={`relative rounded-[22px] bg-[#031329] border-[2px] border-[#00C8FF] p-5 sm:p-6 shadow-[0_0_28px_rgba(0,200,255,0.2),inset_0_0_18px_rgba(0,200,255,0.03)] overflow-hidden space-y-4 sm:space-y-5 ${className}`}
    >
      {/* 1. Header with Wave Grid Background */}
      <div 
        className="rounded-[16px] border border-[#0d3b66]/80 p-4 sm:p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
        style={{
          backgroundImage: "linear-gradient(to right, rgba(3, 19, 41, 0.90) 0%, rgba(3, 25, 54, 0.75) 50%, rgba(3, 19, 41, 0.90) 100%), url('/images/equity-header-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a123f] to-[#0c1635] border border-[#8B5CF6]/60 shadow-[0_0_12px_rgba(139,92,246,0.35)] flex items-center justify-center flex-shrink-0 text-[#A78BFA]">
            <Scale className="w-6 h-6 text-[#A78BFA]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                <span className="sr-only">Equity &amp; Coverage Monitor</span>
                <span aria-hidden="true">
                  <span>Equity &amp; Coverage </span>
                  <span className="text-[#00C8FF] drop-shadow-[0_0_10px_rgba(0,200,255,0.5)]">Monitor</span>
                </span>
              </h2>
              <span className="text-[10px] sm:text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#4c1d95]/40 border border-[#8B5CF6]/50 text-[#C4B5FD] font-semibold shadow-[0_0_8px_rgba(139,92,246,0.25)]">
                Fair Prioritization Layer
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Protects low-information, sparse-reporting, and unverified incidents from being deprioritized or overlooked.
            </p>
          </div>
        </div>

        {/* Live Active Surveillance Status Pill */}
        <div className="flex items-center text-xs font-mono self-start md:self-auto flex-shrink-0 relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#032035]/90 border border-[#00C8FF]/50 text-xs font-medium text-white shadow-[0_0_10px_rgba(0,200,255,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>Active Surveillance</span>
          </span>
        </div>
      </div>

      {/* 2. Four Real-Data Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Equity-Review Flags (Amber) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'equity_flags' ? null : 'equity_flags')}
          className={`rounded-[14px] p-4 sm:p-4.5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[148px] bg-gradient-to-br from-[#07192f] via-[#051426] to-[#040e1b] ${
            selectedEquityFilter === 'equity_flags'
              ? 'border-2 border-[#FFB547] shadow-[0_0_22px_rgba(255,181,71,0.3)] ring-1 ring-[#FFB547]/60'
              : 'border border-[#FFB547]/45 shadow-[0_0_15px_rgba(255,181,71,0.12)] hover:border-[#FFB547] hover:shadow-[0_0_20px_rgba(255,181,71,0.22)]'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#221504] border border-[#FFB547]/50 flex items-center justify-center text-[#FFB547] flex-shrink-0 shadow-xs">
                  <Scale className="w-5 h-5 text-[#FFB547]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#FFB547] block">
                    Equity-Review Flags
                  </span>
                  <span 
                    data-testid="equity-review-flag-count"
                    className="text-2xl sm:text-3xl font-bold font-mono text-white leading-tight block mt-0.5"
                  >
                    {equityFlaggedCount}
                  </span>
                </div>
              </div>

              {/* Amber SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 sm:w-20 h-9 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqAmberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB547" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FFB547" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,30 Q 25,28 45,18 T 75,10 T 100,5"
                  fill="none"
                  stroke="#FFB547"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,30 Q 25,28 45,18 T 75,10 T 100,5 L 100,40 L 0,40 Z"
                  fill="url(#eqAmberGrad)"
                />
              </svg>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 leading-snug">
              Serious emergencies flagged for coordinator review.
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#FFB547]">
            <span className="text-[10px] text-amber-300/80">
              {selectedEquityFilter === 'equity_flags' ? 'Filtering Active' : 'Inspect flagged incidents'}
            </span>
            <div className="w-6 h-6 rounded-full border border-[#FFB547]/60 flex items-center justify-center text-[#FFB547] group-hover:bg-[#FFB547]/20 transition-colors shadow-xs">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 2: Unresolved Coordinates (Cyan) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'unresolved_coords' ? null : 'unresolved_coords')}
          className={`rounded-[14px] p-4 sm:p-4.5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[148px] bg-gradient-to-br from-[#07192f] via-[#051426] to-[#040e1b] ${
            selectedEquityFilter === 'unresolved_coords'
              ? 'border-2 border-[#00C8FF] shadow-[0_0_22px_rgba(0,200,255,0.3)] ring-1 ring-[#00C8FF]/60'
              : 'border border-[#00C8FF]/45 shadow-[0_0_15px_rgba(0,200,255,0.12)] hover:border-[#00C8FF] hover:shadow-[0_0_20px_rgba(0,200,255,0.22)]'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#031d3a] border border-[#00C8FF]/50 flex items-center justify-center text-[#00C8FF] flex-shrink-0 shadow-xs">
                  <MapPinOff className="w-5 h-5 text-[#00C8FF]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#00C8FF] block">
                    Unresolved Location
                  </span>
                  <span 
                    data-testid="unresolved-location-count"
                    className="text-2xl sm:text-3xl font-bold font-mono text-white leading-tight block mt-0.5"
                  >
                    {unresolvedCount}
                  </span>
                </div>
              </div>

              {/* Cyan SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 sm:w-20 h-9 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C8FF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00C8FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,32 Q 30,30 50,15 T 75,22 T 100,8"
                  fill="none"
                  stroke="#00C8FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,32 Q 30,30 50,15 T 75,22 T 100,8 L 100,40 L 0,40 Z"
                  fill="url(#eqCyanGrad)"
                />
              </svg>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 leading-snug">
              Incidents lacking verified coordinates.
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#00C8FF]">
            <span className="text-[10px] text-cyan-300/80">
              {selectedEquityFilter === 'unresolved_coords' ? 'Filtering Active' : 'View unmapped incidents'}
            </span>
            <div className="w-6 h-6 rounded-full border border-[#00C8FF]/60 flex items-center justify-center text-[#00C8FF] group-hover:bg-[#00C8FF]/20 transition-colors shadow-xs">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 3: Serious Incidents Awaiting Verification (Red/Pink) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'serious_unverified' ? null : 'serious_unverified')}
          className={`rounded-[14px] p-4 sm:p-4.5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[148px] bg-gradient-to-br from-[#07192f] via-[#051426] to-[#040e1b] ${
            selectedEquityFilter === 'serious_unverified'
              ? 'border-2 border-[#FF4566] shadow-[0_0_22px_rgba(255,69,102,0.3)] ring-1 ring-[#FF4566]/60'
              : 'border border-[#FF4566]/45 shadow-[0_0_15px_rgba(255,69,102,0.12)] hover:border-[#FF4566] hover:shadow-[0_0_20px_rgba(255,69,102,0.22)]'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#280a12] border border-[#FF4566]/50 flex items-center justify-center text-[#FF4566] flex-shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-[#FF4566]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#FF4566] block">
                    Serious Unverified
                  </span>
                  <span 
                    data-testid="serious-unverified-count"
                    className="text-2xl sm:text-3xl font-bold font-mono text-white leading-tight block mt-0.5"
                  >
                    {seriousUnverifiedCount}
                  </span>
                </div>
              </div>

              {/* Red/Pink SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 sm:w-20 h-9 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4566" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FF4566" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,32 Q 25,32 45,16 T 70,24 T 100,6"
                  fill="none"
                  stroke="#FF4566"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,32 Q 25,32 45,16 T 70,24 T 100,6 L 100,40 L 0,40 Z"
                  fill="url(#eqRedGrad)"
                />
              </svg>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 leading-snug">
              Critical/High reports awaiting field corroboration.
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#FF4566]">
            <span className="text-[10px] text-rose-300/80">
              {selectedEquityFilter === 'serious_unverified' ? 'Filtering Active' : 'Review ground truth'}
            </span>
            <div className="w-6 h-6 rounded-full border border-[#FF4566]/60 flex items-center justify-center text-[#FF4566] group-hover:bg-[#FF4566]/20 transition-colors shadow-xs">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 4: High-Urgency Triage (Violet) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'high_urgency' ? null : 'high_urgency')}
          className={`rounded-[14px] p-4 sm:p-4.5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[148px] bg-gradient-to-br from-[#07192f] via-[#051426] to-[#040e1b] ${
            selectedEquityFilter === 'high_urgency'
              ? 'border-2 border-[#9875FF] shadow-[0_0_22px_rgba(152,117,255,0.3)] ring-1 ring-[#9875FF]/60'
              : 'border border-[#9875FF]/45 shadow-[0_0_15px_rgba(152,117,255,0.12)] hover:border-[#9875FF] hover:shadow-[0_0_20px_rgba(152,117,255,0.22)]'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#1d0a33] border border-[#9875FF]/50 flex items-center justify-center text-[#9875FF] flex-shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 text-[#9875FF]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#9875FF] block">
                    High-Urgency Triage
                  </span>
                  <span 
                    data-testid="high-urgency-pending-count"
                    className="text-2xl sm:text-3xl font-bold font-mono text-white leading-tight block mt-0.5"
                  >
                    {highUrgencyCount}
                  </span>
                </div>
              </div>

              {/* Violet SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 sm:w-20 h-9 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqVioletGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9875FF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#9875FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,30 Q 30,15 55,25 T 80,10 T 100,16"
                  fill="none"
                  stroke="#9875FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,30 Q 30,15 55,25 T 80,10 T 100,16 L 100,40 L 0,40 Z"
                  fill="url(#eqVioletGrad)"
                />
              </svg>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 leading-snug">
              Reports with priority &ge; 70 or critical severity.
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#9875FF]">
            <span className="text-[10px] text-purple-300/80">
              {selectedEquityFilter === 'high_urgency' ? 'Filtering Active' : 'Inspect triage items'}
            </span>
            <div className="w-6 h-6 rounded-full border border-[#9875FF]/60 flex items-center justify-center text-[#9875FF] group-hover:bg-[#9875FF]/20 transition-colors shadow-xs">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>
      </div>

      {/* 3. Coverage Methodology & Transparency Panel */}
      <div 
        className="rounded-[16px] border border-[#00C8FF]/40 bg-[#04162e]/90 p-4 sm:p-5 relative overflow-hidden shadow-[0_0_20px_rgba(0,200,255,0.08)]"
        style={{
          backgroundImage: "linear-gradient(to right, rgba(3, 19, 41, 0.94) 0%, rgba(3, 25, 54, 0.82) 50%, rgba(3, 19, 41, 0.94) 100%), url('/images/equity-panel-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#F1F7FF] relative z-10">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-full bg-[#00C8FF]/15 border border-[#00C8FF]/50 flex items-center justify-center text-[#00C8FF] shadow-[0_0_12px_rgba(0,200,255,0.25)] flex-shrink-0">
              <Info className="w-5 h-5 text-[#00C8FF]" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <strong className="text-white text-sm font-bold">
                  Coverage Methodology & Transparency:
                </strong>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4c1d95]/40 border border-[#8B5CF6]/50 text-[#C4B5FD] font-semibold">
                  <span>Fair Prioritization</span> <span>Layer</span>
                </span>
              </div>
              <span className="text-xs text-slate-300 leading-relaxed mt-1 block">
                <strong className="text-[#00C8FF] font-semibold">Measured Telemetry:</strong> Zone RF deviations are tracked from real cellular & utility telemetry.{' '}
                <strong className="text-[#00C8FF] font-semibold">Reporting Proxy:</strong> Single-source reports are labeled as a proxy where sensor telemetry is unavailable.{' '}
                <span className="text-slate-400">No connectivity or population data is invented.</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 flex-shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onNavigateTab?.('verification')}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#00C8FF]/15 hover:bg-[#00C8FF]/25 border border-[#00C8FF]/50 text-[#00C8FF] hover:text-white transition-all shadow-[0_0_10px_rgba(0,200,255,0.15)] flex items-center space-x-1 cursor-pointer whitespace-nowrap"
            >
              <span>Review Pending Verification &rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('priority')}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-[#FFB547]/50 text-[#FFB547] hover:text-white transition-all shadow-[0_0_10px_rgba(255,181,71,0.15)] flex items-center space-x-1 cursor-pointer whitespace-nowrap"
            >
              <span>Priority Queue &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active Incidents Requiring Equity Review Inner Panel */}
      <div className="rounded-[16px] border border-[#00C8FF]/40 bg-[#031329] p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#163a60]">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-rose-400 drop-shadow-[0_0_6px_rgba(255,69,102,0.5)]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>
                {selectedEquityFilter ? 'Filtered Incidents' : 'Active Incidents Requiring Equity Review'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold shadow-[0_0_8px_rgba(255,69,102,0.3)]">
                {displayedIncidents.length}
              </span>
            </h3>
            {selectedEquityFilter && (
              <button
                type="button"
                onClick={() => setSelectedEquityFilter(null)}
                className="text-[11px] text-[#00C8FF] hover:underline font-medium cursor-pointer ml-2"
              >
                (Clear filter)
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>Human-in-the-Loop Protocol Enforced</span>
          </span>
        </div>

        {/* Incidents List or Honest Empty State */}
        {displayedIncidents.length === 0 ? (
          <div 
            data-testid="equity-empty-state"
            className="p-8 rounded-xl bg-gradient-to-br from-[#091629] to-[#071322] border border-[#203550] text-center mt-3.5"
          >
            <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2 opacity-90 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            <h4 className="text-xs font-bold text-white tracking-wide">
              {incidents.length === 0 
                ? 'No Active Incidents Loaded' 
                : 'No Equity Review Flags Active in Current View'}
            </h4>
            <p className="text-[11px] text-[#91B1D0] max-w-md mx-auto mt-1 leading-relaxed">
              {incidents.length === 0
                ? 'Application currently has 0 active incident reports. Monitor metrics will update automatically when incident data arrives.'
                : 'All serious active emergencies have verified coordinates, corroborating reports, and confirmed ground-truth status.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 mt-3.5">
            {displayedIncidents.slice(0, 6).map(inc => {
              const reasons = inc.equity_reasons || inc.equityReasons || [];
              const isUnmapped = !inc.coordinates || inc.coordinates.length < 2 || inc.coordinates[0] == null;
              const hazardMeta = getHazardMeta(inc);
              
              return (
                <div
                  key={inc.id}
                  data-testid={`equity-incident-${inc.id}`}
                  className={`p-3 sm:p-3.5 rounded-xl bg-[#061933]/70 border border-[#0e3b68]/60 hover:border-[#00C8FF]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden group border-l-[3px] ${
                    inc.severity === 'critical' 
                      ? 'border-l-[#FF4566]' 
                      : inc.severity === 'high' 
                        ? 'border-l-[#FFB547]' 
                        : 'border-l-[#00C8FF]'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    {/* Consistent Hazard Category Image Thumbnail */}
                    {hazardMeta?.image && (
                      <img
                        src={hazardMeta.image}
                        alt={hazardMeta.altText || hazardMeta.label || hazardMeta.name || 'Incident category'}
                        onError={handleHazardImageError}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border border-[#163a60]"
                        loading="lazy"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-bold text-[#00C8FF] tracking-wider">
                          {inc.id}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          inc.severity === 'critical' ? 'bg-rose-950/80 text-rose-300 border-rose-600/50 font-bold' :
                          inc.severity === 'high' ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 font-semibold' :
                          'bg-cyan-950/80 text-cyan-300 border-cyan-600/50 font-semibold'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b2447] border border-[#163a60] text-slate-200">
                          Priority: <strong className="text-white">{inc.priorityScore}</strong>
                        </span>
                        {isUnmapped && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 border border-amber-600/50 text-[#FFBE32] font-semibold flex items-center space-x-1">
                            <span>⚠️ Missing Coords</span>
                          </span>
                        )}
                        <span className="text-slate-500">·</span>
                        <span className="text-xs text-slate-300 font-medium flex items-center space-x-1 truncate">
                          <MapPin className="w-3 h-3 text-[#00C8FF] flex-shrink-0" />
                          <span className="truncate">{inc.sector || inc.locationName || 'Unknown Sector'}</span>
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-white mt-1 truncate group-hover:text-[#00C8FF] transition-colors">
                        {inc.title}
                      </h4>

                      {/* Explanatory Equity Reasons Tags */}
                      {reasons.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {reasons.map((r, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium font-sans flex items-center space-x-1"
                            >
                              <span>⚠️ {r}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center space-x-2 self-start md:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        onSelectIncident?.(inc);
                        onNavigateTab?.('incidents');
                      }}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#00C8FF]/15 hover:bg-[#00C8FF]/25 text-[#00C8FF] hover:text-white border border-[#00C8FF]/40 hover:border-[#00C8FF] transition-all flex items-center justify-center space-x-1 shadow-[0_0_10px_rgba(0,200,255,0.15)] cursor-pointer"
                      aria-label={`Inspect incident ${inc.id}`}
                    >
                      <span>Inspect Incident</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <MoreVertical className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-pointer hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
