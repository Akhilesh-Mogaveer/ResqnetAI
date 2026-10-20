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
    <div className="space-y-5">
      {/* Page Title & Intake Bar */}
      <div className="bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Incident Management & Tactical Triage
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-950/60 text-cyan-300 border border-blue-500/40">
              {activeCanonicalCount} Active Canonical
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review incoming civilian and sensor reports, examine HumAID NLP predictions, and execute operational status transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenNewIncidentModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Report New Incident</span>
          </button>
        </div>
      </div>

      {/* NLP Prediction Integrity Banner */}
      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 px-4 text-xs flex items-start space-x-2.5">
        <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <strong className="text-white font-semibold">Human-in-the-Loop Protocol:</strong> HumAID DistilBERT model classifications provide automated decision-support triage. Machine predictions do <strong className="text-white">not</strong> verify ground-truth incident authenticity. Coordinators must corroborate facts prior to critical squad deployment.
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filterable & Searchable Incident List */}
        <div className="lg:col-span-7 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 flex flex-col">
          {/* Controls: Search, Filters, Sort */}
          <div className="space-y-3 pb-3 border-b border-[#203550]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, sector, or keyword..."
                  className="w-full pl-9 pr-8 py-2 bg-[#091629] border border-[#203550] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-[#0D1B2D] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#091629] border border-[#203550] rounded-lg px-2.5 py-2 text-xs text-slate-300 font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="priority">Priority Score</option>
                  <option value="recency">Most Recent</option>
                  <option value="reliability">Reliability</option>
                </select>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Severity:
              </span>
              {[
                { id: 'all', label: `All (${incidents.length})` },
                { id: 'critical', label: 'Critical' },
                { id: 'high', label: 'High' },
                { id: 'moderate', label: 'Moderate' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterSeverity(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterSeverity === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[#091629] text-slate-400 border border-[#203550] hover:bg-[#132238] hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="text-slate-600 mx-1">|</span>

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Status:
              </span>
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === f.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-[#091629] text-slate-400 border border-[#203550] hover:bg-[#132238] hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Rows */}
          <div className="divide-y divide-[#203550]/60 max-h-[680px] overflow-y-auto pr-1">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Filter className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="font-semibold text-slate-300">No matching incidents found</p>
                <p className="text-slate-500 mt-1">Try resetting search filters or keywords</p>
              </div>
            ) : (
              sorted.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';
                const hazardMeta = getHazardMeta(inc);

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3.5 transition-all cursor-pointer rounded-lg my-1.5 border ${
                      isSelected
                        ? 'bg-[#132238] border-cyan-500/70 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                        : 'bg-[#091629] border-[#203550] hover:bg-[#0D1B2D] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Resolved Hazard Thumbnail */}
                        <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-lg overflow-hidden border border-[#203550] bg-[#07111F] flex-shrink-0 shadow-sm hidden xs:block">
                          <img
                            src={hazardMeta.image}
                            alt={hazardMeta.altText}
                            onError={handleHazardImageError}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              {inc.id}
                            </span>

                            <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                              isCrit 
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : isHigh
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {inc.severity}
                            </span>

                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                              inc.verificationStatus === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}>
                              {inc.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                            </span>

                            {inc.is_duplicate && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                Merged Duplicate
                              </span>
                            )}

                            {(!inc.coordinates || inc.coordinates[0] == null) && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Coords Unknown
                              </span>
                            )}

                            {Boolean(inc.equity_review_flag || inc.equityReviewFlag) && (
                              <span 
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                title={(inc.equity_reasons || inc.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                              >
                                ⚖️ Equity Review
                              </span>
                            )}

                            {((inc.report_source && inc.report_source.toLowerCase().includes('sms_forwarded')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                              <span 
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono"
                                data-testid="sms-source-badge"
                              >
                                📱 FORWARDED SMS
                              </span>
                            ) : ((inc.report_source && inc.report_source.toLowerCase().includes('sms')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('sms'))) ? (
                              <span 
                                className="text-[10px] font-semibold px-2 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono"
                                data-testid="sms-source-badge"
                              >
                                📱 SIMULATED SMS
                              </span>
                            ) : null}

                          </div>

                          <h3 className="text-xs font-semibold text-white truncate">
                            {inc.title}
                          </h3>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                            <span>{inc.sector}</span>
                            <span>·</span>
                            <span>{inc.locationName || 'Location Not Specified'}</span>
                            <span>·</span>
                            <span>{inc.timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center space-x-2 flex-shrink-0 pl-2">
                        <AnimatedPriorityScore
                          score={inc.priorityScore}
                          severity={inc.severity}
                          size="sm"
                          showDenominator={false}
                          showLabel={true}
                          label="Priority"
                        />
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-600'
                        }`} />
                      </div>
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
