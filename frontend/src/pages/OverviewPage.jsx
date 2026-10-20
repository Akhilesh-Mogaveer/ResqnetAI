import React, { useState, useMemo } from 'react';
import SummaryCards from '../components/SummaryCards';
import IncidentMap from '../components/IncidentMap';
import UnderreportedZones from '../components/UnderreportedZones';
import EnvironmentalConditionsPanel from '../components/EnvironmentalConditionsPanel';
import EquityCoverageMonitor from '../components/EquityCoverageMonitor';
import { 
  AlertTriangle, 
  ShieldAlert, 
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
        className="relative rounded-2xl border border-[#203550] p-6 shadow-xl overflow-hidden bg-[#0D1B2D]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.88) 0%, rgba(7, 17, 31, 0.65) 50%, rgba(9, 22, 41, 0.35) 100%), url('/images/flood-bg-1.png')`,
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
          <p className="text-xs sm:text-sm text-slate-100 font-medium mt-2 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
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
      <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-5 sm:p-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#203550] mb-4 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/40 flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShieldAlert className="w-4.5 h-4.5 text-[#21D4FD]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Actions Requiring Coordinator Attention
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Key actions to validate reports, inspect gaps, and dispatch response teams
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#21D4FD] animate-pulse" />
            <span>Operational Triage Triggers</span>
          </div>
        </div>

        {/* Responsive 3-Column Grid across full dashboard width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Action 1: Ground Truth Verification (Amber) */}
          <div className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-900/50 flex flex-col justify-between h-full hover:border-amber-600/60 transition-all">
            <div>
              <div className="flex items-center space-x-3.5 pb-3 border-b border-amber-900/30">
                <div className="w-11 h-11 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-[#FFB547]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-amber-300 block truncate">
                    Ground Truth Verification
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#FFB547] leading-tight block">
                    {unverifiedCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-200/80 mt-3 leading-relaxed">
                {unverifiedCount} incoming reports awaiting human verification before dispatch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('verification')}
              className="mt-4 w-full h-9 text-xs font-bold px-3 rounded-lg bg-[#FFB547] hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <span>Verification Center</span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>

          {/* Action 2: Unmapped Reports (Cyan / Blue) */}
          <div className="p-4 sm:p-5 rounded-xl bg-sky-950/20 border border-sky-900/50 flex flex-col justify-between h-full hover:border-sky-600/60 transition-all">
            <div>
              <div className="flex items-center space-x-3.5 pb-3 border-b border-sky-900/30">
                <div className="w-11 h-11 rounded-lg bg-blue-500/20 border border-[#2878FF]/50 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Compass className="w-5 h-5 text-[#21D4FD]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-[#21D4FD] block truncate">
                    Unmapped Reports
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#21D4FD] leading-tight block">
                    {unmappedCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-sky-200/80 mt-3 leading-relaxed">
                {unmappedCount} incidents lack confirmed coordinates and require location resolution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="mt-4 w-full h-9 text-xs font-bold px-3 rounded-lg bg-[#2878FF] hover:bg-blue-600 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <span>Resolve on Map</span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>

          {/* Action 3: Squad Dispatch (Green / Emerald) */}
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 flex flex-col justify-between h-full hover:border-emerald-600/60 transition-all sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center space-x-3.5 pb-3 border-b border-emerald-900/30">
                <div className="w-11 h-11 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Users className="w-5 h-5 text-[#25D6A2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-emerald-300 block truncate">
                    Squad Dispatch
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#25D6A2] leading-tight block">
                    {unassignedCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-emerald-200/80 mt-3 leading-relaxed">
                {unassignedCount} active emergencies currently have no response team assigned.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('response')}
              className="mt-4 w-full h-9 text-xs font-bold px-3 rounded-lg bg-[#132238] hover:bg-emerald-950/80 border border-emerald-700/60 hover:border-emerald-500 text-emerald-300 hover:text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <span>Fleet & Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Public Environmental Conditions & Hydrology (Open-Meteo Integration) */}
      <EnvironmentalConditionsPanel selectedIncident={selectedIncident} />
    </div>
  );
}
