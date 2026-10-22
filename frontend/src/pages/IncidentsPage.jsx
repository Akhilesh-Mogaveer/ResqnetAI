import React, { useState } from 'react';
import IncidentDetailPanel from '../components/IncidentDetailPanel';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  MapPin, 
  ChevronRight, 
  Layers, 
  Sparkles, 
  Info 
} from 'lucide-react';
import { getHazardMeta, handleHazardImageError } from '../utils/hazardMapping';
import AnimatedPriorityScore from '../components/AnimatedPriorityScore';

export default function IncidentsPage({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  onVerifyStatusChange,
  onResponseStatusChange,
  onAssignTeam,
  onOpenOverrideModal,
  onAddNote,
  onDuplicateMerged,
  onDuplicateDismissed,
  onShowToast,
  responseTeams = [],
  onOpenNewIncidentModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all'); // all | critical | high | moderate
  const [filterStatus, setFilterStatus] = useState('all'); // all | unverified | verified | active | resolved
  const [sortBy, setSortBy] = useState('priority'); // priority | recency | reliability

  // Count active canonical vs merged
  const activeCanonicalCount = incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  const mergedCount = incidents.filter(i => i.is_duplicate || i.responseStatus === 'merged_duplicate').length;

  // Filter incidents: by default, show only active canonical incidents unless 'merged' filter selected
  const filtered = incidents.filter(inc => {
    const isMerged = inc.is_duplicate || inc.responseStatus === 'merged_duplicate';
    if (filterStatus === 'merged') {
      if (!isMerged) return false;
    } else {
      if (isMerged) return false;
    }

    const matchesSearch = 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.locationName && inc.locationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.type && inc.type.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterSeverity === 'critical') return inc.severity === 'critical';
    if (filterSeverity === 'high') return inc.severity === 'high';
    if (filterSeverity === 'moderate') return inc.severity === 'moderate';
    if (filterSeverity === 'low') return inc.severity === 'low';

    if (filterStatus === 'unverified') return inc.verificationStatus === 'unverified';
    if (filterStatus === 'verified') return inc.verificationStatus === 'verified';
    if (filterStatus === 'equity') return Boolean(inc.equity_review_flag || inc.equityReviewFlag);
    if (filterStatus === 'active') return inc.responseStatus !== 'resolved';
    if (filterStatus === 'resolved') return inc.responseStatus === 'resolved';

    return true;
  });

  // Sort incidents
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
    if (sortBy === 'recency') return new Date(b.timestamp) - new Date(a.timestamp);
    if (sortBy === 'reliability') return (b.reportReliability || 0) - (a.reportReliability || 0);
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Intake Bar */}
      <div className="clay-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Incident Management & Tactical Triage
            </h1>
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-clay-pill bg-brand-50 text-brand-600 shadow-clay-pill">
              {activeCanonicalCount} Active Canonical
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Review incoming civilian and sensor reports, examine HumAID NLP predictions, and execute operational status transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenNewIncidentModal}
            className="clay-button-primary flex items-center space-x-1.5 px-4 py-2.5 rounded-clay-button text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span> Report New Incident</span>
          </button>
        </div>
      </div>

      {/* NLP Prediction Integrity Banner */}
      <div className="clay-card p-4 px-5 text-xs flex items-start space-x-3 bg-brand-50/50">
        <Sparkles className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <div className="text-text-secondary leading-relaxed">
          <strong className="text-text-primary font-semibold">Human-in-the-Loop Protocol:</strong> HumAID DistilBERT model classifications provide automated decision-support triage. Machine predictions do <strong className="text-text-primary">not</strong> verify ground-truth incident authenticity. Coordinators must corroborate facts prior to critical squad deployment.
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filterable & Searchable Incident List */}
        <div className="lg:col-span-7 flex flex-col relative select-none space-y-4">
          {/* Controls: Search, Filters, Sort in a Clay Card */}
          <div className="clay-card p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, sector, or keyword..."
                  className="w-full pl-9 pr-8 py-2 bg-[#EEF1F6] shadow-clay-inset rounded-clay-input text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-sans transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium flex-shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-brand-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#EEF1F6] shadow-clay-inset rounded-clay-input px-3 py-2 text-xs text-text-primary font-medium focus:outline-none cursor-pointer"
                >
                  <option value="priority">Priority Score</option>
                  <option value="recency">Most Recent</option>
                  <option value="reliability">Reliability</option>
                </select>
              </div>
            </div>

            {/* Quick Filters: Segmented controls styled as clay-inset track with raised clay thumb */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-0.5">
                  SEVERITY:
                </span>
                <div className="p-1 rounded-clay-card bg-[#EEF1F6] shadow-clay-inset flex flex-wrap items-center gap-1">
                  {[
                    { id: 'all', label: `All (${incidents.length})` },
                    { id: 'critical', label: 'Critical' },
                    { id: 'high', label: 'High' },
                    { id: 'moderate', label: 'Moderate' },
                    { id: 'low', label: 'Low' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterSeverity(f.id)}
                      className={`px-2.5 py-0.5 rounded-clay-pill text-xs transition-all duration-150 cursor-pointer ${
                        filterSeverity === f.id
                          ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                          : 'text-text-secondary hover:text-text-primary font-medium'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-0.5">
                  STATUS:
                </span>
                <div className="p-1 rounded-clay-card bg-[#EEF1F6] shadow-clay-inset flex flex-wrap items-center gap-1">
                  {[
                    { id: 'all', label: `Active (${activeCanonicalCount})` },
                    { id: 'unverified', label: 'Unverified' },
                    { id: 'verified', label: 'Verified' },
                    { id: 'equity', label: `⚖️ Equity (${incidents.filter(i => i.equity_review_flag || i.equityReviewFlag).length})` },
                    { id: 'merged', label: `Merged (${mergedCount})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterStatus(f.id)}
                      className={`px-2.5 py-0.5 rounded-clay-pill text-xs transition-all duration-150 cursor-pointer ${
                        filterStatus === f.id
                          ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                          : 'text-text-secondary hover:text-text-primary font-medium'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Incident List Header */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold shadow-clay-button">
                {sorted.length}
              </span>
              <h2 className="text-sm font-bold text-text-primary">
                Triage Incident Feed
              </h2>
            </div>
            <span className="text-xs text-text-muted font-medium">
              Click to inspect details
            </span>
          </div>

          {/* Incident Rows */}
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1 pt-1">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs clay-card p-6">
                <Filter className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-50" />
                <p className="font-semibold text-text-primary">No matching incidents found</p>
                <p className="text-text-muted mt-1">Try resetting search filters or keywords</p>
              </div>
            ) : (
              sorted.map((inc, idx) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`group relative p-3.5 transition-all duration-150 cursor-pointer rounded-clay-card flex items-stretch gap-3 select-none ${
                      isSelected
                        ? 'clay-inset bg-surface-inset shadow-clay-inset'
                        : 'clay-card clay-card-interactive'
                    }`}
                  >
                    {/* Left Accent Dot (Pulse on Tier 1 critical only) */}
                    <div className="flex items-center justify-center flex-shrink-0 self-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isCrit ? 'bg-severity-critical' : isHigh ? 'bg-severity-high' : 'bg-severity-medium'
                      } ${idx === 0 && isCrit ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* Middle details: ID, Badges, Title, Location details */}
                    <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-bold text-brand-primary tracking-wide">
                          {inc.id}
                        </span>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-clay-pill leading-none ${
                          isCrit 
                            ? 'bg-severity-critical text-white'
                            : isHigh
                            ? 'bg-severity-high text-text-primary'
                            : 'bg-severity-medium text-white'
                        }`}>
                          {inc.severity}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-clay-pill leading-none ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {inc.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                        </span>

                        {inc.is_duplicate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-purple-100 text-purple-800 leading-none">
                            Merged Duplicate
                          </span>
                        )}

                        {(!inc.coordinates || inc.coordinates[0] == null) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-amber-100 text-amber-900 leading-none">
                            Coords Unknown
                          </span>
                        )}

                        {Boolean(inc.equity_review_flag || inc.equityReviewFlag) && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-purple-100 text-purple-800 leading-none"
                            title={(inc.equity_reasons || inc.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                          >
                            ⚖️ Equity Review
                          </span>
                        )}

                        {((inc.report_source && inc.report_source.toLowerCase().includes('sms_forwarded')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-emerald-100 text-emerald-800 font-mono leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 FORWARDED SMS
                          </span>
                        ) : ((inc.report_source && inc.report_source.toLowerCase().includes('sms')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('sms'))) ? (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-amber-100 text-amber-900 font-mono leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 SIMULATED SMS
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xs sm:text-[13px] font-bold text-text-primary tracking-tight truncate mt-0.5">
                        {inc.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-[11px] text-text-secondary font-mono">
                        <span>{inc.sector}</span>
                        <span className="text-text-muted">·</span>
                        <span className="truncate">{inc.locationName || 'Location Not Specified'}</span>
                        <span className="text-text-muted">·</span>
                        <span className="flex-shrink-0">{inc.timeAgo}</span>
                      </div>
                    </div>

                    {/* Right side: Priority Score Gauge & Chevron */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0 pl-2 self-center">
                      <AnimatedPriorityScore
                        score={inc.priorityScore}
                        severity={inc.severity}
                        size="sm"
                        showDenominator={false}
                        showLabel={true}
                        label="Priority"
                      />
                      <ChevronRight className={`w-4 h-4 transition-all duration-150 ${
                        isSelected 
                          ? 'text-brand-600 translate-x-1' 
                          : 'text-text-muted group-hover:text-brand-600 group-hover:translate-x-1'
                      }`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Complete Incident Detail Panel */}
        <div className="lg:col-span-5">
          <IncidentDetailPanel
            incident={selectedIncident}
            onVerifyStatusChange={onVerifyStatusChange}
            onResponseStatusChange={onResponseStatusChange}
            onAssignTeam={onAssignTeam}
            onOpenOverrideModal={onOpenOverrideModal}
            onAddNote={onAddNote}
            onDuplicateMerged={onDuplicateMerged}
            onDuplicateDismissed={onDuplicateDismissed}
            onSelectIncident={onSelectIncident}
            onShowToast={onShowToast}
            responseTeams={responseTeams}
          />
        </div>
      </div>
    </div>
  );
}
