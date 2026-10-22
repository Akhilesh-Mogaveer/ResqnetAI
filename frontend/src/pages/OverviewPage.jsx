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
      {/* 1. Page Header Hero Banner */}
      <div className="clay-card p-5 sm:p-6 overflow-hidden relative select-none">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Emergency Response Operations Overview
            </h1>
            <span className="text-[11px] font-bold px-3 py-1 rounded-clay-pill bg-brand-50 text-brand-600 shadow-clay-pill flex-shrink-0">
              Live SitRep
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary font-medium mt-1.5 leading-relaxed">
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
        <div className="lg:col-span-7 space-y-5">
          {/* Header with emergency beacon & queue link (Unnested section header) */}
          <div className="flex items-center justify-between pb-1 px-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-severity-critical text-white flex items-center justify-center flex-shrink-0 shadow-clay-button">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary tracking-tight">
                  Highest Priority Emergencies
                </h2>
                <p className="text-xs text-text-muted mt-0.5 font-medium">
                  Algorithmic triage ranking based on life-threat severity and corroboration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('priority')}
              className="clay-button text-xs font-bold text-brand-primary bg-surface-card hover:bg-surface-elevated flex items-center space-x-1 transition-colors px-3.5 py-2 rounded-clay-button shadow-clay-button"
            >
              <span>Full Priority Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter and Sort Controls Bar: Clay-inset segmented track with raised clay thumb */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 px-1">
            <div className="p-1 rounded-clay-pill bg-surface-inset shadow-clay-inset flex items-center space-x-1 flex-wrap gap-y-1 text-xs">
              {/* All */}
              <button
                type="button"
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1 rounded-clay-pill text-xs transition-all flex items-center space-x-1 cursor-pointer ${
                  filterSeverity === 'all'
                    ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary font-semibold'
                }`}
              >
                <span>All ({totalActiveCount})</span>
              </button>

              {/* Medium / Moderate */}
              <button
                type="button"
                onClick={() => setFilterSeverity(filterSeverity === 'moderate' ? 'all' : 'moderate')}
                className={`px-3 py-1 rounded-clay-pill text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  filterSeverity === 'moderate'
                    ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary font-semibold'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-brand-primary inline-block" />
                <span>Medium ({modCount})</span>
              </button>

              {/* Low */}
              <button
                type="button"
                onClick={() => setFilterSeverity(filterSeverity === 'low' ? 'all' : 'low')}
                className={`px-3 py-1 rounded-clay-pill text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  filterSeverity === 'low'
                    ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary font-semibold'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#7B8794] inline-block" />
                <span>Low ({lowCount})</span>
              </button>

              {/* Unverified */}
              <button
                type="button"
                onClick={() => setFilterSeverity(filterSeverity === 'unverified' ? 'all' : 'unverified')}
                className={`px-3 py-1 rounded-clay-pill text-xs transition-all flex items-center space-x-1 cursor-pointer ${
                  filterSeverity === 'unverified'
                    ? 'bg-surface-elevated text-severity-high font-bold shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary font-semibold'
                }`}
              >
                <span>Unverified ({unverifiedCount})</span>
              </button>

              {/* Equity Review */}
              <button
                type="button"
                onClick={() => setFilterSeverity(filterSeverity === 'equity' ? 'all' : 'equity')}
                className={`px-3 py-1 rounded-clay-pill text-xs transition-all flex items-center space-x-1 cursor-pointer ${
                  filterSeverity === 'equity'
                    ? 'bg-surface-elevated text-purple-700 font-bold shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary font-semibold'
                }`}
              >
                <span>⚖️ Equity ({equityCount})</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs font-mono text-text-muted">
              <span className="text-[11px] text-text-muted font-sans hidden sm:inline">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-1 text-text-primary text-xs focus:outline-none cursor-pointer font-sans"
                aria-label="Sort emergencies"
              >
                <option value="priority">Priority Score</option>
                <option value="time">Recency</option>
                <option value="severity">Severity Rank</option>
              </select>
            </div>
          </div>

          {/* List of top urgent incidents (Level 1 Clay Cards) */}
          <div className="space-y-4">
              {urgentIncidents.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-xs">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-semibold text-text-primary">No active emergencies match the selected filter</p>
                  <p className="text-text-muted mt-0.5">All monitored channels operating within nominal safety thresholds.</p>
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
                      className={`rounded-clay-card transition-all cursor-pointer p-4 sm:p-5 select-none ${
                        isSelected 
                          ? 'clay-inset bg-surface-inset shadow-clay-inset' 
                          : 'clay-card clay-card-interactive shadow-clay-card'
                      }`}
                    >
                      {/* Compact 3-Column Layout: 1. Severity Rank, 2. Image & Information, 3. Priority Score & Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        {/* 1. Left Column: Severity Rank Indicator + Left Accent Dot */}
                        <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-shrink-0">
                          {/* Left Accent Dot (Pulse on Tier 1 critical only) */}
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isCrit ? 'bg-severity-critical' : isHigh ? 'bg-severity-high' : isMod ? 'bg-brand-primary' : 'bg-severity-success'
                          } ${idx === 0 && isCrit ? 'animate-pulse' : ''}`} />

                          <div className={`w-12 sm:w-14 flex flex-col items-center justify-center rounded-clay-button p-2 text-center flex-shrink-0 ${
                            isCrit
                              ? 'bg-severity-critical text-white font-bold'
                              : isHigh
                              ? 'bg-severity-high text-text-primary font-bold'
                              : isMod
                              ? 'bg-brand-primary text-white font-bold'
                              : 'bg-severity-low text-white font-bold'
                          }`}>
                            <span className="text-lg sm:text-xl font-black font-mono leading-none tracking-tight">
                              {rankNumber}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider my-1 leading-none">
                              {incident.severity}
                            </span>
                            <div className="w-4 h-4 flex items-center justify-center">
                              {isCrit ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                              ) : isHigh ? (
                                <Car className="w-3.5 h-3.5 text-text-primary" />
                              ) : (
                                <Activity className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Center Column: Incident Image and Information */}
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          {/* Incident Thumbnail: 110-130px wide with 16px clay-inset framing */}
                          <div className="w-full sm:w-[118px] md:w-[124px] h-[80px] sm:h-[84px] md:h-[88px] p-1 bg-surface-inset rounded-[16px] shadow-clay-inset flex-shrink-0 relative">
                            <img
                              src={hazardMeta.image}
                              alt={hazardMeta.altText}
                              onError={handleHazardImageError}
                              loading="lazy"
                              className="w-full h-full object-cover rounded-[12px]"
                            />
                          </div>

                          {/* Information Area */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center space-y-1">
                            {/* Title line with hazard category icon */}
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="p-1 rounded-clay-pill flex-shrink-0 bg-brand-primary/15 text-brand-primary">
                                <CategoryIcon className="w-3 h-3" />
                              </div>
                              <h3 className="font-bold text-text-primary text-xs sm:text-sm tracking-tight truncate leading-snug">
                                {incident.title}
                              </h3>
                            </div>

                            {/* Metadata Subtitle: ID, Sector & Location, Time, Casualties */}
                            <div className="flex items-center space-x-2 text-[11px] text-text-secondary flex-wrap gap-y-0.5 font-mono">
                              <span className="font-bold text-brand-primary">{incident.id}</span>
                              <span className="text-text-muted">·</span>
                              <span className="text-text-secondary font-medium flex items-center space-x-1 font-sans truncate">
                                <MapPin className="w-3 h-3 text-brand-primary inline flex-shrink-0" />
                                <span className="truncate">{incident.sector}{incident.locationName ? ` · ${incident.locationName}` : ''}</span>
                              </span>
                              <span className="text-text-muted">·</span>
                              <span className="text-text-muted text-[10px] flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-text-muted inline flex-shrink-0" />
                                <span>{incident.timeAgo || 'Recent'}</span>
                              </span>
                              {incident.casualties != null && incident.casualties > 0 && (
                                <>
                                  <span className="text-text-muted">·</span>
                                  <span className="text-severity-critical font-sans text-[10px] font-bold">
                                    {incident.casualties} casualties
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Concise Description */}
                            <p className="text-xs text-text-secondary line-clamp-1 sm:line-clamp-2 leading-relaxed font-medium">
                              {conciseDescription}
                            </p>

                            {/* Grouped Badges (flat tinted fills, no shadow) */}
                            <div className="pt-0.5 flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-clay-pill ${
                                incident.verificationStatus === 'verified'
                                  ? 'bg-severity-success/20 text-[#166534]'
                                  : 'bg-severity-high/20 text-[#9A3412]'
                              }`}>
                                {incident.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                              </span>

                              {Boolean(incident.equity_review_flag || incident.equityReviewFlag) && (
                                <span 
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-clay-pill bg-purple-500/20 text-purple-700"
                                  title={(incident.equity_reasons || incident.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                                >
                                  ⚖️ Equity Review
                                </span>
                              )}

                              {((incident.report_source && incident.report_source.toLowerCase().includes('sms_forwarded')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                                <span 
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-clay-pill bg-severity-success/20 text-[#166534] font-mono"
                                  data-testid="sms-source-badge"
                                >
                                  📱 FORWARDED SMS
                                </span>
                              ) : ((incident.report_source && incident.report_source.toLowerCase().includes('sms')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('sms'))) ? (
                                <span 
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/20 text-brand-primary font-mono"
                                  data-testid="sms-source-badge"
                                >
                                  📱 SIMULATED SMS
                                </span>
                              ) : null}

                              <span className="text-[11px] text-text-secondary flex items-center space-x-1 font-medium">
                                <Users className="w-3 h-3 text-text-muted inline flex-shrink-0" />
                                <span>Team: <strong className="text-text-primary font-bold">{incident.assignedTeam || 'Unassigned'}</strong></span>
                              </span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-surface-card text-text-secondary hidden md:inline-block">
                                {hazardMeta.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Right Column: Priority Score and Review / Manage Action */}
                        <div className="flex sm:flex-col items-center justify-between sm:justify-center flex-shrink-0 w-full sm:w-28 md:w-32 border-t sm:border-t-0 sm:border-l border-[#A3B1C6]/20 pt-2.5 sm:pt-0 sm:pl-3 gap-2">
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
                            className="clay-button text-[11px] font-bold text-brand-primary hover:text-brand-hover flex items-center justify-center space-x-1 transition-colors px-3 py-1.5 rounded-clay-button sm:w-full shadow-clay-button"
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

        {/* Right Column: Geographic Map Preview + Underreported Sectors */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map Preview Container */}
          <div className="clay-card p-5 flex flex-col shadow-clay-card">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#A3B1C6]/20 mb-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center flex-shrink-0 shadow-clay-button">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Geographic Operations Preview
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Interactive spatial distribution of active reported incidents
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('map')}
                className="clay-button text-xs font-bold text-brand-primary hover:text-brand-hover flex items-center space-x-1 px-3 py-1.5 rounded-clay-button transition-colors shadow-clay-button"
              >
                <span>Open Full Live Map</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-[360px] rounded-clay-card overflow-hidden shadow-clay-inset bg-surface-inset">
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
                defaultBasemap="satellite"
                className="w-full h-full"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted font-mono">
              <span>Pins represent verified &amp; unverified hazard coordinates</span>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-brand-primary hover:underline font-sans font-bold cursor-pointer"
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

      {/* 3b. Actions Requiring Coordinator Attention — Unnested Section */}
      <div className="w-full space-y-5 select-none">
        {/* Header with Section Icon Chip */}
        <div className="flex items-center space-x-3.5 px-1">
          <div className="w-10 h-10 rounded-full bg-brand-primary text-white shadow-clay-button flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-text-primary tracking-tight">
              Actions Requiring Coordinator <span className="text-brand-primary">Attention</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5 font-medium">
              Validate reports, resolve location gaps, and coordinate response teams
            </p>
          </div>
        </div>

        {/* Responsive 3-Column Grid across full dashboard width (Level 1 Clay Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Ground Truth Verification (Amber) */}
          <div className="clay-card p-5 flex flex-col justify-between group shadow-clay-card">
            <div>
              {/* Top Row: Icon + Title/Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-severity-high text-white shadow-clay-button flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-wide truncate">
                      Ground Truth Verification
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-bold px-3 py-0.5 rounded-clay-pill bg-severity-high/20 text-[#9A3412]">
                      Needs review
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-black font-mono text-severity-high leading-none block">
                  {unverifiedCount}
                </span>
                <p className="text-xs text-text-secondary mt-1.5 leading-snug font-medium">
                  Incoming reports awaiting human verification.
                  <span className="sr-only"> {unverifiedCount} incoming reports awaiting human verification</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-surface-inset shadow-clay-inset overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-severity-high transition-all duration-500"
                    style={{ width: `${verifyPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-text-primary flex-shrink-0">
                  {unverifiedCount} <span className="text-text-muted font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('verification')}
              aria-label="Open verification (Verification Center)"
              className="clay-button mt-4 w-full py-2.5 px-4 rounded-clay-button text-severity-high font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-clay-button"
            >
              <span>Open verification</span>
              <span className="text-sm leading-none ml-1">&rarr;</span>
            </button>
          </div>

          {/* Card 2: Unmapped Reports */}
          <div className="clay-card p-5 flex flex-col justify-between group shadow-clay-card">
            <div>
              {/* Top Row: Icon + Title/Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-primary text-white shadow-clay-button flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-wide truncate">
                      Unmapped Reports
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-bold px-3 py-0.5 rounded-clay-pill bg-brand-primary/20 text-brand-primary">
                      Location gaps
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-black font-mono text-brand-primary leading-none block">
                  {unmappedCount}
                </span>
                <p className="text-xs text-text-secondary mt-1.5 leading-snug font-medium">
                  Incidents without confirmed coordinates.
                  <span className="sr-only"> {unmappedCount} incidents lack confirmed coordinates</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-surface-inset shadow-clay-inset overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-brand-primary transition-all duration-500"
                    style={{ width: `${unmappedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-text-primary flex-shrink-0">
                  {unmappedCount} <span className="text-text-muted font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              aria-label="Resolve locations (Resolve on Map)"
              className="clay-button mt-4 w-full py-2.5 px-4 rounded-clay-button text-brand-primary font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-clay-button"
            >
              <span>Resolve locations</span>
              <span className="text-sm leading-none ml-1">&rarr;</span>
            </button>
          </div>

          {/* Card 3: Squad Dispatch */}
          <div className="clay-card p-5 flex flex-col justify-between group shadow-clay-card">
            <div>
              {/* Top Row: Icon + Title/Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#8C67E8] text-white shadow-clay-button flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-wide truncate">
                      Squad Dispatch
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-bold px-3 py-0.5 rounded-clay-pill bg-purple-500/20 text-purple-700">
                      Unassigned
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Count & Description */}
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-black font-mono text-purple-700 leading-none block">
                  {unassignedCount}
                </span>
                <p className="text-xs text-text-secondary mt-1.5 leading-snug font-medium">
                  Active emergencies without a response team.
                  <span className="sr-only"> {unassignedCount} active emergencies currently have no response team assigned</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-surface-inset shadow-clay-inset overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#8C67E8] transition-all duration-500"
                    style={{ width: `${unassignedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-text-primary flex-shrink-0">
                  {unassignedCount} <span className="text-text-muted font-normal">/ {totalIndependentCount}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onNavigateTab('response')}
              aria-label="Manage dispatch (Fleet & Dispatch)"
              className="clay-button mt-4 w-full py-2.5 px-4 rounded-clay-button text-purple-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-clay-button"
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
