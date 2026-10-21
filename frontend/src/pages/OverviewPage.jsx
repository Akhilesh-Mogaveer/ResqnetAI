import React, { useState, useMemo } from 'react';
import SummaryCards from '../components/SummaryCards';
import IncidentMap from '../components/IncidentMap';
import UnderreportedZones from '../components/UnderreportedZones';
import EnvironmentalConditionsPanel from '../components/EnvironmentalConditionsPanel';
import EquityCoverageMonitor from '../components/EquityCoverageMonitor';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Shield,
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  Clock,
  Radio,
  Users,
  Compass,
  ArrowUpRight,
  Flame,
  Car,
  Activity,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { 
  getHazardMeta, 
  getHazardCategory, 
  handleHazardImageError 
} from '../utils/hazardMapping';
import AnimatedPriorityScore from '../components/AnimatedPriorityScore';

export default function OverviewPage({
  incidents = [],
  attentionZones = [],
  selectedIncident,
  onSelectIncident,
  onNavigateTab,
  onDispatchScout,
  onVerifyStatusChange,
  onResponseStatusChange,
  backendConnected
}) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortField, setSortField] = useState('priority'); // 'priority' | 'time' | 'severity'

  // Incident counts for filter pills
  const totalActiveCount = useMemo(() => {
    return incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'resolved' && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const criticalCount = useMemo(() => {
    return incidents.filter(i => i.severity === 'critical' && i.responseStatus !== 'resolved' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const highCount = useMemo(() => {
    return incidents.filter(i => i.severity === 'high' && i.responseStatus !== 'resolved' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const modCount = useMemo(() => {
    return incidents.filter(i => (i.severity === 'moderate' || i.severity === 'medium') && i.responseStatus !== 'resolved' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const lowCount = useMemo(() => {
    return incidents.filter(i => i.severity === 'low' && i.responseStatus !== 'resolved' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const unverifiedCount = useMemo(() => {
    return incidents.filter(i => i.verificationStatus === 'unverified' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const equityCount = useMemo(() => {
    return incidents.filter(i => Boolean(i.equity_review_flag || i.equityReviewFlag) && !i.is_duplicate && i.responseStatus !== 'resolved' && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const unassignedCount = useMemo(() => {
    return incidents.filter(i => (!i.assignedTeam || i.responseStatus === 'unassigned') && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const unmappedCount = useMemo(() => {
    return incidents.filter(
      i => (!i.coordinates || !Array.isArray(i.coordinates) || i.coordinates.length !== 2 || i.coordinates[0] == null || i.coordinates[1] == null || i.is_synthetic_location) &&
           !i.is_duplicate && i.responseStatus !== 'merged_duplicate'
    ).length;
  }, [incidents]);

  const totalIndependentCount = useMemo(() => {
    return incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  }, [incidents]);

  const verifyPercent = totalIndependentCount > 0 ? Math.min(100, Math.round((unverifiedCount / totalIndependentCount) * 100)) : 0;
  const unmappedPercent = totalIndependentCount > 0 ? Math.min(100, Math.round((unmappedCount / totalIndependentCount) * 100)) : 0;
  const unassignedPercent = totalIndependentCount > 0 ? Math.min(100, Math.round((unassignedCount / totalIndependentCount) * 100)) : 0;

  // Filter and sort urgent incidents
  const urgentIncidents = useMemo(() => {
    return [...incidents]
      .filter(i => !i.is_duplicate && i.responseStatus !== 'resolved' && i.responseStatus !== 'merged_duplicate')
      .filter(i => {
        if (filterSeverity === 'all') return true;
        if (filterSeverity === 'unverified') return i.verificationStatus === 'unverified';
        if (filterSeverity === 'equity') return Boolean(i.equity_review_flag || i.equityReviewFlag);
        if (filterSeverity === 'moderate') return i.severity === 'moderate' || i.severity === 'medium';
        return i.severity === filterSeverity;
      })
      .sort((a, b) => {
        if (sortField === 'time') {
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        }
        if (sortField === 'severity') {
          const rank = { critical: 4, high: 3, moderate: 2, medium: 2, low: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        // default priority
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      })
      .slice(0, 4);
  }, [incidents, filterSeverity, sortField]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header Hero Banner with Flood / Disaster Backdrop */}
      <div 
        className="relative rounded-2xl border border-[#203550] hover:border-[#2878FF]/50 transition-colors p-4.5 sm:p-5 shadow-xl overflow-hidden bg-[#0D1B2D]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.94) 0%, rgba(7, 17, 31, 0.78) 50%, rgba(9, 22, 41, 0.45) 100%), url('/images/flood-bg-1.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Emergency Response Operations Overview
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#07111F]/90 text-[#21D4FD] border border-[#2878FF]/50 shadow-md backdrop-blur-xs flex-shrink-0">
              Live SitRep
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-100 font-medium mt-1.5 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            Real-time multi-hazard coordination dashboard. Review urgent incidents, verify incoming civilian reports, and dispatch teams.
          </p>
        </div>
      </div>

      {/* 2. Four Essential Operational Metrics */}
      <SummaryCards
        incidents={incidents}
        attentionZones={attentionZones}
        onFilterClick={(filterType) => {
          if (filterType === 'zones') onNavigateTab('map');
          else if (filterType === 'unverified') onNavigateTab('verification');
          else if (filterType === 'critical') onNavigateTab('priority');
          else onNavigateTab('incidents');
        }}
      />

      {/* 2b. Equity & Coverage Monitor Layer */}
      <EquityCoverageMonitor
        incidents={incidents}
        onNavigateTab={onNavigateTab}
        onSelectIncident={(inc) => {
          onSelectIncident(inc);
          onNavigateTab?.('incidents');
        }}
      />

      {/* 3. Primary Grid: Urgent Incidents Queue (Left) + Interactive Map Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Urgent Incidents */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-4 sm:p-5">
            {/* Header with emergency beacon & queue link */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#203550] mb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-[#FF4566] animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Highest Priority Emergencies
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Algorithmic triage ranking based on life-threat severity and corroboration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('priority')}
                className="text-xs font-semibold text-[#21D4FD] hover:text-white flex items-center space-x-1 transition-colors px-2.5 py-1 rounded bg-[#091629] border border-[#203550] hover:border-[#2878FF]/50"
              >
                <span>Full Priority Queue</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter and Sort Controls Bar matching reference screenshot */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5 pb-2 border-b border-[#203550]/60">
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 text-xs">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    filterSeverity === 'all'
                      ? 'bg-[#2878FF] text-white shadow-sm'
                      : 'bg-[#091629] text-slate-300 hover:text-white border border-[#203550]'
                  }`}
                >
                  <span>All ({totalActiveCount})</span>
                </button>

                {/* Critical */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'critical'
                      ? 'bg-rose-950 text-[#FF4566] border-rose-600'
                      : 'bg-[#091629] text-rose-300/90 border-[#203550] hover:border-rose-900/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF4566] inline-block" />
                  <span>Critical ({criticalCount})</span>
                </button>

                {/* High */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'high'
                      ? 'bg-amber-950 text-[#FFB547] border-amber-600'
                      : 'bg-[#091629] text-amber-300/90 border-[#203550] hover:border-amber-900/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#FFB547] inline-block" />
                  <span>High ({highCount})</span>
                </button>

                {/* Medium / Moderate */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'moderate' ? 'all' : 'moderate')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'moderate'
                      ? 'bg-sky-950 text-[#21D4FD] border-sky-600'
                      : 'bg-[#091629] text-sky-300/90 border-[#203550] hover:border-sky-900/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#21D4FD] inline-block" />
                  <span>Medium ({modCount})</span>
                </button>

                {/* Low */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'low' ? 'all' : 'low')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'low'
                      ? 'bg-emerald-950 text-[#25D6A2] border-emerald-600'
                      : 'bg-[#091629] text-emerald-300/90 border-[#203550] hover:border-emerald-900/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#25D6A2] inline-block" />
                  <span>Low ({lowCount})</span>
                </button>

                {/* Unverified */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'unverified' ? 'all' : 'unverified')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'unverified'
                      ? 'bg-amber-950/80 text-[#FFB547] border-amber-500'
                      : 'bg-[#091629] text-slate-300 border-[#203550] hover:border-[#3A5A80]'
                  }`}
                >
                  <span>Unverified ({unverifiedCount})</span>
                </button>

                {/* Equity Review */}
                <button
                  type="button"
                  onClick={() => setFilterSeverity(filterSeverity === 'equity' ? 'all' : 'equity')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 border ${
                    filterSeverity === 'equity'
                      ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500'
                      : 'bg-[#091629] text-indigo-300/80 border-[#203550] hover:border-indigo-800/60'
                  }`}
                >
                  <span>⚖️ Equity ({equityCount})</span>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
                <span className="text-[11px] text-slate-500 font-sans hidden sm:inline">Sort:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="bg-[#091629] border border-[#203550] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#2878FF] cursor-pointer"
                  aria-label="Sort emergencies"
                >
                  <option value="priority">Priority Score</option>
                  <option value="time">Recency</option>
                  <option value="severity">Severity Rank</option>
                </select>
              </div>
            </div>

            {/* List of top urgent incidents */}
            <div className="space-y-3">
              {urgentIncidents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-medium text-slate-200">No active emergencies match the selected filter</p>
                  <p className="text-slate-500 mt-0.5">All monitored channels operating within nominal safety thresholds.</p>
                </div>
              ) : (
                urgentIncidents.map((incident, idx) => {
                  const isSelected = selectedIncident?.id === incident.id;
                  const isCrit = incident.severity === 'critical';
                  const isHigh = incident.severity === 'high';
                  const isMod = incident.severity === 'moderate' || incident.severity === 'medium';

                  const conciseDescription =
                    incident.report_text ||
                    incident.description ||
                    incident.whyPrioritised ||
                    incident.signalSynthesis ||
                    'No narrative details provided.';

                  // Resolved category metadata & thumbnail
                  const hazardMeta = getHazardMeta(incident);
                  const CategoryIcon = hazardMeta.icon || AlertTriangle;
                  const rankNumber = String(idx + 1).padStart(2, '0');

                  return (
                    <div
                      key={incident.id}
                      onClick={() => onSelectIncident(incident)}
                      className={`rounded-xl border transition-all cursor-pointer p-3 sm:p-3.5 ${
                        isSelected 
                          ? 'bg-[#132238] border-[#2878FF] shadow-lg ring-1 ring-[#2878FF]/60' 
                          : 'bg-[#091629] hover:bg-[#132238]/90 border-[#203550] hover:border-[#3A5A80]'
                      }`}
                    >
                      {/* Compact 3-Column Layout: 1. Severity Rank, 2. Image & Information, 3. Priority Score & Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-3.5">
                        {/* 1. Left Column: Severity Rank Indicator */}
                        <div className={`w-12 sm:w-14 flex flex-col items-center justify-center rounded-lg p-2 text-center flex-shrink-0 self-stretch sm:self-auto ${
                          isCrit
                            ? 'bg-rose-950/40 border border-rose-500/40 text-[#FF4566] shadow-[0_0_8px_rgba(255,69,102,0.15)]'
                            : isHigh
                            ? 'bg-amber-950/40 border border-amber-500/40 text-[#FFB547]'
                            : isMod
                            ? 'bg-sky-950/40 border border-sky-500/40 text-[#21D4FD]'
                            : 'bg-emerald-950/40 border border-emerald-500/40 text-[#25D6A2]'
                        }`}>
                          <span className="text-lg sm:text-xl font-black font-mono leading-none tracking-tight">
                            {rankNumber}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider my-1 leading-none">
                            {incident.severity}
                          </span>
                          <div className="w-4 h-4 flex items-center justify-center">
                            {isCrit ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#FF4566]" />
                            ) : isHigh ? (
                              <Car className="w-3.5 h-3.5 text-[#FFB547]" />
                            ) : (
                              <Activity className="w-3.5 h-3.5 text-[#21D4FD]" />
                            )}
                          </div>
                        </div>

                        {/* 2. Center Column: Incident Image and Information */}
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5">
                          {/* Incident Thumbnail: 110-130px wide with consistent aspect ratio */}
                          <div className="w-full sm:w-[118px] md:w-[124px] h-[80px] sm:h-[84px] md:h-[88px] rounded-lg overflow-hidden flex-shrink-0 relative border border-[#203550] bg-[#07111F] shadow-sm">
                            <img
                              src={hazardMeta.image}
                              alt={hazardMeta.altText}
                              onError={handleHazardImageError}
                              loading="lazy"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>

                          {/* Information Area */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center space-y-1">
                            {/* Title line with hazard category icon */}
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className={`p-1 rounded-md flex-shrink-0 ${hazardMeta.bgBadge} ${hazardMeta.textBadge} border ${hazardMeta.borderBadge}`}>
                                <CategoryIcon className="w-3 h-3" />
                              </div>
                              <h3 className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate leading-snug">
                                {incident.title}
                              </h3>
                            </div>

                            {/* Metadata Subtitle: ID, Sector & Location, Time, Casualties */}
                            <div className="flex items-center space-x-2 text-[11px] text-slate-300 flex-wrap gap-y-0.5 font-mono">
                              <span className="font-bold text-[#21D4FD]">{incident.id}</span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-300 font-medium flex items-center space-x-1 font-sans truncate">
                                <MapPin className="w-3 h-3 text-slate-400 inline flex-shrink-0" />
                                <span className="truncate">{incident.sector}{incident.locationName ? ` · ${incident.locationName}` : ''}</span>
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 text-[10px] flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-500 inline flex-shrink-0" />
                                <span>{incident.timeAgo || 'Recent'}</span>
                              </span>
                              {incident.casualties != null && incident.casualties > 0 && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-rose-400 font-sans text-[10px] font-semibold">
                                    {incident.casualties} casualties
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Concise Description */}
                            <p className="text-xs text-slate-300/90 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                              {conciseDescription}
                            </p>

                            {/* Grouped Badges */}
                            <div className="pt-0.5 flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                incident.verificationStatus === 'verified'
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                  : 'bg-amber-950/60 text-[#FFB547] border-amber-800/60'
                              }`}>
                                {incident.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                              </span>

                              {Boolean(incident.equity_review_flag || incident.equityReviewFlag) && (
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-indigo-950/70 text-indigo-300 border-indigo-700/60"
                                  title={(incident.equity_reasons || incident.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                                >
                                  ⚖️ Equity Review
                                </span>
                              )}

                              {((incident.report_source && incident.report_source.toLowerCase().includes('sms_forwarded')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-950/70 text-emerald-300 border-emerald-700/60 font-mono"
                                  data-testid="sms-source-badge"
                                >
                                  📱 FORWARDED SMS
                                </span>
                              ) : ((incident.report_source && incident.report_source.toLowerCase().includes('sms')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('sms'))) ? (
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-sky-950/70 text-sky-300 border-sky-700/60 font-mono"
                                  data-testid="sms-source-badge"
                                >
                                  📱 SIMULATED SMS
                                </span>
                              ) : null}

                              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                                <Users className="w-3 h-3 text-slate-500 inline flex-shrink-0" />
                                <span>Team: <strong className="text-slate-200">{incident.assignedTeam || 'Unassigned'}</strong></span>
                              </span>

                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${hazardMeta.bgBadge} ${hazardMeta.textBadge} ${hazardMeta.borderBadge} hidden md:inline-block`}>
                                {hazardMeta.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Right Column: Priority Score and Review / Manage Action */}
                        <div className="flex sm:flex-col items-center justify-between sm:justify-center flex-shrink-0 w-full sm:w-28 md:w-32 border-t sm:border-t-0 sm:border-l border-[#203550]/60 pt-2.5 sm:pt-0 sm:pl-3 gap-2">
                          <AnimatedPriorityScore
                            score={incident.priorityScore}
                            severity={incident.severity}
                            size="md"
                            showDenominator={true}
                            showLabel={true}
                            label="Priority"
                          />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectIncident(incident);
                              onNavigateTab('incidents');
                            }}
                            className="text-[11px] font-semibold text-[#21D4FD] hover:text-white flex items-center justify-center space-x-1 transition-colors px-2.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#203550] border border-[#203550] hover:border-[#2878FF]/50 shadow-xs sm:w-full"
                            aria-label={`Review and manage incident ${incident.id}`}
                          >
                            <span>Review / Manage</span>
                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Geographic Map Preview + Underreported Sectors */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map Preview Container */}
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-500/40 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-[#21D4FD]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Geographic Operations Preview
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Interactive spatial distribution of active reported incidents
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-semibold text-[#21D4FD] hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded bg-[#091629] border border-[#203550] hover:border-[#2878FF]/50 transition-colors"
              >
                <span>Open Full Live Map</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-[360px] rounded-lg overflow-hidden border border-[#203550] bg-[#091629]">
              <IncidentMap
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => onSelectIncident(inc)}
                onInspectIncident={(inc) => {
                  onSelectIncident(inc);
                  onNavigateTab?.('incidents');
                }}
                attentionZones={attentionZones}
                defaultShowLegend={false}
                className="w-full h-full"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Pins represent verified & unverified hazard coordinates</span>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-[#21D4FD] hover:underline font-sans"
              >
                View layer controls &rarr;
              </button>
            </div>
          </div>

          {/* Underreported Sectors Summary */}
          <UnderreportedZones
            zones={attentionZones}
            onSelectZone={() => onNavigateTab('map')}
            onDispatchScout={onDispatchScout}
          />
        </div>
      </div>

      {/* 3b. Actions Requiring Coordinator Attention — Full-Width Dashboard Panel */}
      <div className="bg-[#031329] rounded-[20px] border border-[#0d2a4a] p-5 sm:p-6 w-full shadow-lg">
        {/* Header matching reference image */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#031d38] border border-[#00C8FF]/70 shadow-[0_0_18px_rgba(0,200,255,0.4)] flex items-center justify-center flex-shrink-0 text-[#00C8FF]">
            <ShieldAlert className="w-5 h-5 text-[#00C8FF]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Actions Requiring Coordinator <span className="text-[#00C8FF] drop-shadow-[0_0_10px_rgba(0,200,255,0.4)]">Attention</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Validate reports, resolve location gaps, and coordinate response teams
            </p>
          </div>
        </div>

        {/* Responsive 3-Column Grid across full dashboard width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-5">
          {/* Card 1: Ground Truth Verification (Amber) */}
          <div className="rounded-[16px] bg-[#071322] border border-amber-500/40 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-amber-500 hover:shadow-[0_0_24px_rgba(255,181,71,0.2)] group">
            {/* Top Amber Glowing Border Accent */}
            <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent pointer-events-none" />

            <div>
              {/* Top Row: Icon + Title/Badge (Left) & Illustrated Graphic (Right) */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-[#FFB547] flex-shrink-0 shadow-xs">
                    <Shield className="w-5 h-5 text-[#FFB547]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                      Ground Truth Verification
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300">
                      Needs review
                    </span>
                  </div>
                </div>

                {/* Checklist Document + Magnifying Glass SVG Illustration */}
                <svg width="60" height="60" viewBox="0 0 64 64" fill="none" className="flex-shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                  <rect x="8" y="6" width="36" height="46" rx="6" fill="#181309" stroke="#FFB547" strokeWidth="1.5" strokeOpacity="0.45" />
                  <circle cx="16" cy="18" r="2" fill="#FFB547" />
                  <line x1="22" y1="18" x2="36" y2="18" stroke="#FFB547" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
                  <circle cx="16" cy="26" r="2" fill="#FFB547" />
                  <line x1="22" y1="26" x2="36" y2="26" stroke="#FFB547" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
                  <circle cx="16" cy="34" r="2" fill="#FFB547" />
                  <line x1="22" y1="34" x2="30" y2="34" stroke="#FFB547" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
                  <g filter="url(#amberGlow)">
                    <circle cx="40" cy="38" r="9" fill="#181309" stroke="#FFB547" strokeWidth="2.5" />
                    <line x1="47" y1="45" x2="56" y2="54" stroke="#FFB547" strokeWidth="3" strokeLinecap="round" />
                  </g>
                  <defs>
                    <filter id="amberGlow" x="25" y="23" width="38" height="38" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFB547" floodOpacity="0.8" />
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#FFB547] leading-none block">
                  {unverifiedCount}
                </span>
                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  Incoming reports awaiting human verification.
                  <span className="sr-only"> {unverifiedCount} incoming reports awaiting human verification</span>
                </p>
              </div>

              {/* Real-Data Supported Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#FFB547] shadow-[0_0_8px_rgba(255,181,71,0.6)] transition-all duration-500"
                    style={{ width: `${verifyPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-200 flex-shrink-0">
                  {unverifiedCount} <span className="text-slate-500 font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('verification')}
              aria-label="Open verification (Verification Center)"
              className="mt-4 w-full py-2.5 px-4 rounded-xl border border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-[#FFB547] hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>Open verification</span>
              <span className="text-sm leading-none ml-1">&rarr;</span>
            </button>
          </div>

          {/* Card 2: Unmapped Reports (Cyan / Blue) */}
          <div className="rounded-[16px] bg-[#071322] border border-[#00C8FF]/40 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-[#00C8FF] hover:shadow-[0_0_24px_rgba(0,200,255,0.2)] group">
            {/* Top Cyan Glowing Border Accent */}
            <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#00C8FF]/80 to-transparent pointer-events-none" />

            <div>
              {/* Top Row: Icon + Title/Badge (Left) & Illustrated Graphic (Right) */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-[#00C8FF]/50 flex items-center justify-center text-[#00C8FF] flex-shrink-0 shadow-xs">
                    <MapPin className="w-5 h-5 text-[#00C8FF]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                      Unmapped Reports
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-600/50 text-cyan-300">
                      Location gaps
                    </span>
                  </div>
                </div>

                {/* Perspective 3D Map Grid + Radar Pin SVG Illustration */}
                <svg width="64" height="60" viewBox="0 0 68 64" fill="none" className="flex-shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                  <path d="M 6,38 L 48,16 L 64,28 L 22,50 Z" stroke="#00C8FF" strokeWidth="1" strokeOpacity="0.3" fill="#00C8FF" fillOpacity="0.04" />
                  <line x1="20" y1="31" x2="35" y2="42" stroke="#00C8FF" strokeWidth="1" strokeOpacity="0.25" />
                  <line x1="34" y1="24" x2="49" y2="35" stroke="#00C8FF" strokeWidth="1" strokeOpacity="0.25" />
                  <circle cx="28" cy="32" r="2.5" fill="#00C8FF" fillOpacity="0.6" />
                  <circle cx="50" cy="24" r="2" fill="#00C8FF" fillOpacity="0.6" />
                  <ellipse cx="44" cy="42" rx="10" ry="4" stroke="#00C8FF" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
                  <g filter="url(#cyanGlow)">
                    <path d="M 44,20 C 40,20 37,23 37,27 C 37,32 44,40 44,40 C 44,40 51,32 51,27 C 51,23 48,20 44,20 Z" fill="#00C8FF" />
                    <circle cx="44" cy="26" r="2.5" fill="#031329" />
                  </g>
                  <defs>
                    <filter id="cyanGlow" x="27" y="10" width="34" height="40" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00C8FF" floodOpacity="0.9" />
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#00C8FF] leading-none block">
                  {unmappedCount}
                </span>
                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  Incidents without confirmed coordinates.
                  <span className="sr-only"> {unmappedCount} incidents lack confirmed coordinates</span>
                </p>
              </div>

              {/* Real-Data Supported Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#00C8FF] shadow-[0_0_8px_rgba(0,200,255,0.6)] transition-all duration-500"
                    style={{ width: `${unmappedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-200 flex-shrink-0">
                  {unmappedCount} <span className="text-slate-500 font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              aria-label="Resolve locations (Resolve on Map)"
              className="mt-4 w-full py-2.5 px-4 rounded-xl border border-[#00C8FF]/60 bg-[#00C8FF]/10 hover:bg-[#00C8FF]/20 text-[#00C8FF] hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>Resolve locations</span>
              <span className="text-sm leading-none ml-1">&rarr;</span>
            </button>
          </div>

          {/* Card 3: Squad Dispatch (Green / Emerald) */}
          <div className="rounded-[16px] bg-[#071322] border border-emerald-500/40 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-emerald-500 hover:shadow-[0_0_24px_rgba(16,185,129,0.2)] group">
            {/* Top Emerald Glowing Border Accent */}
            <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent pointer-events-none" />

            <div>
              {/* Top Row: Icon + Title/Badge (Left) & Illustrated Graphic (Right) */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-xs">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                      Squad Dispatch
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300">
                      Unassigned
                    </span>
                  </div>
                </div>

                {/* Radar Dispatch Network with Responder Squad SVG Illustration */}
                <svg width="64" height="60" viewBox="0 0 68 64" fill="none" className="flex-shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                  <path d="M 8,36 A 28,28 0 0,1 60,36" stroke="#10B981" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.4" fill="none" />
                  <line x1="34" y1="34" x2="34" y2="16" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
                  <line x1="34" y1="34" x2="16" y2="28" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
                  <line x1="34" y1="34" x2="52" y2="28" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
                  <circle cx="34" cy="16" r="7" fill="#042018" stroke="#10B981" strokeWidth="1.2" />
                  <rect x="30" y="14" width="6" height="4" rx="1" fill="#10B981" />
                  <circle cx="31.5" cy="18.5" r="0.8" fill="#042018" />
                  <circle cx="34.5" cy="18.5" r="0.8" fill="#042018" />
                  <circle cx="16" cy="28" r="5" fill="#042018" stroke="#10B981" strokeWidth="1.2" />
                  <circle cx="16" cy="28" r="2" fill="#10B981" />
                  <circle cx="52" cy="28" r="5" fill="#042018" stroke="#10B981" strokeWidth="1.2" />
                  <line x1="50" y1="28" x2="54" y2="28" stroke="#10B981" strokeWidth="1.2" />
                  <line x1="52" y1="26" x2="52" y2="30" stroke="#10B981" strokeWidth="1.2" />
                  <g filter="url(#emeraldGlow)">
                    <circle cx="34" cy="34" r="5" fill="#10B981" />
                    <path d="M 26,48 C 26,42 30,40 34,40 C 38,40 42,42 42,48 Z" fill="#10B981" />
                    <circle cx="24" cy="38" r="3.5" fill="#10B981" fillOpacity="0.7" />
                    <path d="M 18,48 C 18,44 21,43 24,43 C 25.5,43 27,43.5 28,44.5 Z" fill="#10B981" fillOpacity="0.7" />
                    <circle cx="44" cy="38" r="3.5" fill="#10B981" fillOpacity="0.7" />
                    <path d="M 40,44.5 C 41,43.5 42.5,43 44,43 C 47,43 50,44 50,48 Z" fill="#10B981" fillOpacity="0.7" />
                  </g>
                  <defs>
                    <filter id="emeraldGlow" x="12" y="24" width="44" height="30" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#10B981" floodOpacity="0.8" />
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#10B981] leading-none block">
                  {unassignedCount}
                </span>
                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  Active emergencies without a response team.
                  <span className="sr-only"> {unassignedCount} active emergencies currently have no response team assigned</span>
                </p>
              </div>

              {/* Real-Data Supported Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-500"
                    style={{ width: `${unassignedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-200 flex-shrink-0">
                  {unassignedCount} <span className="text-slate-500 font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('response')}
              aria-label="Manage dispatch (Fleet & Dispatch)"
              className="mt-4 w-full py-2.5 px-4 rounded-xl border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>Manage dispatch</span>
              <span className="text-sm leading-none ml-1">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Public Environmental Conditions & Hydrology (Open-Meteo Integration) */}
      <EnvironmentalConditionsPanel selectedIncident={selectedIncident} />
    </div>
  );
}
