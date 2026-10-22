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
      className={`space-y-5 ${className}`}
    >
      {/* 1. Header with Section Icon Chip (No outer card wrapper) */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1"
      >
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-10 h-10 rounded-full bg-[#8C67E8] shadow-clay-button flex items-center justify-center flex-shrink-0 text-white">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                <span className="sr-only">Equity &amp; Coverage Monitor</span>
                <span aria-hidden="true">
                  <span>Equity &amp; Coverage </span>
                  <span className="text-brand-primary">Monitor</span>
                </span>
              </h2>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/15 text-brand-primary font-bold">
                Fair Prioritization Layer
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed font-medium">
              Protects low-information, sparse-reporting, and unverified incidents from being deprioritized or overlooked.
            </p>
          </div>
        </div>

        {/* Live Active Surveillance Status Pill */}
        <div className="flex items-center text-xs font-mono self-start md:self-auto flex-shrink-0 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-clay-pill bg-surface-card text-xs font-semibold text-text-primary shadow-clay-pill">
            <span className="w-2 h-2 rounded-full bg-severity-success" />
            <span>Active Surveillance</span>
          </span>
        </div>
      </div>

      {/* 2. Four Real-Data Metric Cards (Level 1 Clay Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Equity-Review Flags (Amber) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'equity_flags' ? null : 'equity_flags')}
          className={`rounded-clay-card p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[142px] bg-surface-card shadow-clay-card ${
            selectedEquityFilter === 'equity_flags'
              ? 'ring-2 ring-severity-high shadow-clay-button bg-surface-elevated'
              : 'hover:shadow-clay-button hover:-translate-y-0.5'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-severity-high shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-secondary block truncate leading-tight">
                    Equity-Review Flags
                  </span>
                  <span 
                    data-testid="equity-review-flag-count"
                    className="text-2xl sm:text-3xl font-black font-mono text-text-primary leading-tight block mt-0.5"
                  >
                    {equityFlaggedCount}
                  </span>
                </div>
              </div>

              {/* Amber SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 h-8 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqAmberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5A524" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F5A524" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,30 Q 25,28 45,18 T 75,10 T 100,5"
                  fill="none"
                  stroke="#F5A524"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,30 Q 25,28 45,18 T 75,10 T 100,5 L 100,40 L 0,40 Z"
                  fill="url(#eqAmberGrad)"
                />
              </svg>
            </div>

            <p className="text-xs text-text-secondary mt-2.5 leading-snug line-clamp-1 font-medium">
              Serious emergencies flagged for coordinator review.
            </p>
          </div>

          <div className="mt-2.5 pt-2 flex items-center justify-between text-xs font-bold text-severity-high">
            <span className="text-[11px] text-text-muted">
              {selectedEquityFilter === 'equity_flags' ? 'Filtering Active' : 'Inspect flagged incidents'}
            </span>
            <div className="w-6 h-6 rounded-full bg-surface-elevated shadow-clay-button flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 2: Unresolved Coordinates */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'unresolved_coords' ? null : 'unresolved_coords')}
          className={`rounded-clay-card p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[142px] bg-surface-card shadow-clay-card ${
            selectedEquityFilter === 'unresolved_coords'
              ? 'ring-2 ring-brand-primary shadow-clay-button bg-surface-elevated'
              : 'hover:shadow-clay-button hover:-translate-y-0.5'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-primary shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
                  <MapPinOff className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-secondary block truncate leading-tight">
                    Unresolved Location
                  </span>
                  <span 
                    data-testid="unresolved-location-count"
                    className="text-2xl sm:text-3xl font-black font-mono text-text-primary leading-tight block mt-0.5"
                  >
                    {unresolvedCount}
                  </span>
                </div>
              </div>

              {/* Brand SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 h-8 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqBrandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F6BED" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#4F6BED" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,32 Q 30,30 50,15 T 75,22 T 100,8"
                  fill="none"
                  stroke="#4F6BED"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,32 Q 30,30 50,15 T 75,22 T 100,8 L 100,40 L 0,40 Z"
                  fill="url(#eqBrandGrad)"
                />
              </svg>
            </div>

            <p className="text-xs text-text-secondary mt-2.5 leading-snug line-clamp-1 font-medium">
              Incidents lacking verified coordinates.
            </p>
          </div>

          <div className="mt-2.5 pt-2 flex items-center justify-between text-xs font-bold text-brand-primary">
            <span className="text-[11px] text-text-muted">
              {selectedEquityFilter === 'unresolved_coords' ? 'Filtering Active' : 'View unmapped incidents'}
            </span>
            <div className="w-6 h-6 rounded-full bg-surface-elevated shadow-clay-button flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 3: Serious Incidents Awaiting Verification (Critical Red) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'serious_unverified' ? null : 'serious_unverified')}
          className={`rounded-clay-card p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[142px] bg-surface-card shadow-clay-card ${
            selectedEquityFilter === 'serious_unverified'
              ? 'ring-2 ring-severity-critical shadow-clay-button bg-surface-elevated'
              : 'hover:shadow-clay-button hover:-translate-y-0.5'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-severity-critical shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-secondary block truncate leading-tight">
                    Serious Unverified
                  </span>
                  <span 
                    data-testid="serious-unverified-count"
                    className="text-2xl sm:text-3xl font-black font-mono text-text-primary leading-tight block mt-0.5"
                  >
                    {seriousUnverifiedCount}
                  </span>
                </div>
              </div>

              {/* Red SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 h-8 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E5484D" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E5484D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,32 Q 25,32 45,16 T 70,24 T 100,6"
                  fill="none"
                  stroke="#E5484D"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,32 Q 25,32 45,16 T 70,24 T 100,6 L 100,40 L 0,40 Z"
                  fill="url(#eqRedGrad)"
                />
              </svg>
            </div>

            <p className="text-xs text-text-secondary mt-2.5 leading-snug line-clamp-1 font-medium">
              Critical/High reports awaiting field corroboration.
            </p>
          </div>

          <div className="mt-2.5 pt-2 flex items-center justify-between text-xs font-bold text-severity-critical">
            <span className="text-[11px] text-text-muted">
              {selectedEquityFilter === 'serious_unverified' ? 'Filtering Active' : 'Review ground truth'}
            </span>
            <div className="w-6 h-6 rounded-full bg-surface-elevated shadow-clay-button flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Metric 4: High-Urgency Triage (Purple) */}
        <button
          type="button"
          onClick={() => setSelectedEquityFilter(selectedEquityFilter === 'high_urgency' ? null : 'high_urgency')}
          className={`rounded-clay-card p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[142px] bg-surface-card shadow-clay-card ${
            selectedEquityFilter === 'high_urgency'
              ? 'ring-2 ring-indigo-500 shadow-clay-button bg-surface-elevated'
              : 'hover:shadow-clay-button hover:-translate-y-0.5'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#8C67E8] shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-secondary block truncate leading-tight">
                    High-Urgency Triage
                  </span>
                  <span 
                    data-testid="high-urgency-pending-count"
                    className="text-2xl sm:text-3xl font-black font-mono text-text-primary leading-tight block mt-0.5"
                  >
                    {highUrgencyCount}
                  </span>
                </div>
              </div>

              {/* Violet SVG Sparkline Graphic */}
              <svg viewBox="0 0 100 40" className="w-16 h-8 overflow-visible flex-shrink-0" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqVioletGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,30 Q 30,15 55,25 T 80,10 T 100,16"
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0,30 Q 30,15 55,25 T 80,10 T 100,16 L 100,40 L 0,40 Z"
                  fill="url(#eqVioletGrad)"
                />
              </svg>
            </div>

            <p className="text-xs text-text-secondary mt-2.5 leading-snug line-clamp-1 font-medium">
              Reports with priority &ge; 70 or critical severity.
            </p>
          </div>

          <div className="mt-2.5 pt-2 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span className="text-[11px] text-text-muted">
              {selectedEquityFilter === 'high_urgency' ? 'Filtering Active' : 'Inspect triage items'}
            </span>
            <div className="w-6 h-6 rounded-full bg-surface-elevated shadow-clay-button flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>
      </div>

      {/* 3. Coverage Methodology & Transparency Panel */}
      <div 
        className="rounded-clay-card bg-surface-card shadow-clay-card p-5 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 text-xs text-text-primary relative z-10">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-10 h-10 rounded-full bg-brand-primary shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <strong className="text-text-primary text-xs sm:text-sm font-bold">
                  Coverage Methodology &amp; Transparency:
                </strong>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/15 text-brand-primary font-bold">
                  <span>Fair Prioritization</span> <span>Layer</span>
                </span>
              </div>
              <span className="text-xs text-text-secondary leading-relaxed mt-0.5 block font-medium">
                <strong className="text-brand-primary font-bold">Measured Telemetry:</strong> Zone RF deviations are tracked from real cellular &amp; utility telemetry.{' '}
                <strong className="text-brand-primary font-bold">Reporting Proxy:</strong> Single-source reports are labeled as a proxy where sensor telemetry is unavailable.{' '}
                <span className="text-text-muted">No connectivity or population data is invented.</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onNavigateTab?.('verification')}
              className="text-xs font-bold px-3.5 py-2 rounded-clay-button bg-surface-card hover:bg-surface-elevated text-brand-primary transition-all shadow-clay-button flex items-center space-x-1 cursor-pointer whitespace-nowrap"
            >
              <span>Review Pending Verification &rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('priority')}
              className="text-xs font-bold px-3.5 py-2 rounded-clay-button bg-surface-card hover:bg-surface-elevated text-severity-high transition-all shadow-clay-button flex items-center space-x-1 cursor-pointer whitespace-nowrap"
            >
              <span>Priority Queue &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active Incidents Requiring Equity Review Inner Panel */}
      <div className="rounded-clay-card bg-surface-card shadow-clay-card p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#A3B1C6]/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-severity-critical shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <span>
                {selectedEquityFilter ? 'Filtered Incidents' : 'Active Incidents Requiring Equity Review'}
              </span>
              <span className="px-2.5 py-0.5 rounded-clay-pill bg-severity-critical text-white text-xs font-mono font-bold">
                {displayedIncidents.length}
              </span>
            </h3>
            {selectedEquityFilter && (
              <button
                type="button"
                onClick={() => setSelectedEquityFilter(null)}
                className="text-xs text-brand-primary hover:text-brand-hover hover:underline font-bold cursor-pointer ml-2"
              >
                (Clear filter)
              </button>
            )}
          </div>

          <span className="text-[11px] text-text-muted font-mono flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-severity-success" />
            <span>Human-in-the-Loop Protocol Enforced</span>
          </span>
        </div>

        {/* Incidents List or Honest Empty State */}
        {displayedIncidents.length === 0 ? (
          <div 
            data-testid="equity-empty-state"
            className="p-8 rounded-clay-card bg-surface-inset shadow-clay-inset text-center mt-4"
          >
            <CheckCircle2 className="w-9 h-9 text-severity-success mx-auto mb-2 opacity-90" />
            <h4 className="text-xs font-bold text-text-primary tracking-wide">
              {incidents.length === 0 
                ? 'No Active Incidents Loaded' 
                : 'No Equity Review Flags Active in Current View'}
            </h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto mt-1 leading-relaxed font-medium">
              {incidents.length === 0
                ? 'Application currently has 0 active incident reports. Monitor metrics will update automatically when incident data arrives.'
                : 'All serious active emergencies have verified coordinates, corroborating reports, and confirmed ground-truth status.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 mt-4">
            {displayedIncidents.slice(0, 6).map(inc => {
              const reasons = inc.equity_reasons || inc.equityReasons || [];
              const isUnmapped = !inc.coordinates || inc.coordinates.length < 2 || inc.coordinates[0] == null;
              const hazardMeta = getHazardMeta(inc);
              
              return (
                <div
                  key={inc.id}
                  data-testid={`equity-incident-${inc.id}`}
                  className="p-4 rounded-clay-card bg-surface-card shadow-clay-card hover:shadow-clay-button transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden group"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    {/* Consistent Hazard Category Image Thumbnail with 16px Clay-Inset Framing */}
                    {hazardMeta?.image && (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 p-1 bg-surface-inset rounded-[16px] shadow-clay-inset flex-shrink-0">
                        <img
                          src={hazardMeta.image}
                          alt={hazardMeta.altText || hazardMeta.label || hazardMeta.name || 'Incident category'}
                          onError={handleHazardImageError}
                          className="w-full h-full rounded-[12px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          inc.severity === 'critical' ? 'bg-severity-critical' : inc.severity === 'high' ? 'bg-severity-high' : 'bg-brand-primary'
                        }`} />
                        <span className="font-mono text-xs font-bold text-brand-primary tracking-wider">
                          {inc.id}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-clay-pill font-bold ${
                          inc.severity === 'critical' ? 'bg-severity-critical text-white' :
                          inc.severity === 'high' ? 'bg-severity-high text-text-primary' :
                          'bg-severity-medium text-white'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-clay-pill bg-surface-inset shadow-clay-inset text-text-secondary font-medium">
                          Priority: <strong className="text-text-primary font-bold">{inc.priorityScore}</strong>
                        </span>
                        {isUnmapped && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-clay-pill bg-severity-high/20 text-[#9A3412] font-bold flex items-center space-x-1">
                            <span>⚠️ Missing Coords</span>
                          </span>
                        )}
                        <span className="text-text-muted">·</span>
                        <span className="text-xs text-text-secondary font-medium flex items-center space-x-1 truncate">
                          <MapPin className="w-3 h-3 text-brand-primary flex-shrink-0" />
                          <span className="truncate">{inc.sector || inc.locationName || 'Unknown Sector'}</span>
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-text-primary mt-1 truncate group-hover:text-brand-primary transition-colors">
                        {inc.title}
                      </h4>

                      {/* Explanatory Equity Reasons Tags (flat tinted fills, no shadow) */}
                      {reasons.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {reasons.map((r, idx) => (
                            <span 
                              key={idx}
                              className="text-[11px] px-2.5 py-0.5 rounded-clay-pill bg-severity-high/15 text-[#9A3412] font-semibold font-sans flex items-center space-x-1"
                            >
                              <span>{r}</span>
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
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-clay-button clay-button-primary text-white transition-all flex items-center justify-center space-x-1 shadow-clay-button cursor-pointer"
                      aria-label={`Inspect incident ${inc.id}`}
                    >
                      <span>Inspect Incident</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <MoreVertical className="w-4 h-4 text-text-muted hover:text-text-primary cursor-pointer hidden sm:block" />
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
