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
    <div className="space-y-5">
      {/* Page Title & Intake Bar */}
      <div 
        className="relative bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.90) 0%, rgba(7, 17, 31, 0.72) 50%, rgba(9, 22, 41, 0.40) 100%), url('/images/header-incidents.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Incident Management & Tactical Triage
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-cyan-300 border border-blue-500/50 shadow-xs">
              {activeCanonicalCount} Active Canonical
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Review incoming civilian and sensor reports, examine HumAID NLP predictions, and execute operational status transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2 relative z-10">
          <button
            onClick={onOpenNewIncidentModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span> Report New Incident</span>
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
        {/* Left Column: Filterable & Searchable Incident List in Luminous Command Box */}
        <div className="lg:col-span-7 command-center-grid-bg rounded-2xl luminous-command-box p-4 sm:p-5 flex flex-col relative overflow-hidden">
          {/* Controls: Search, Filters, Sort */}
          <div className="space-y-3.5 pb-3.5 border-b border-[#203550]/80">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, sector, or keyword..."
                  className="w-full pl-9 pr-8 py-2 bg-[#06182f]/90 border border-[#1b3452] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#00C8FF] focus:shadow-[0_0_12px_rgba(0,200,255,0.25)] transition-all font-sans"
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
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium flex-shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#06182f]/90 border border-[#1b3452] rounded-lg px-2.5 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-[#00C8FF] transition-all cursor-pointer"
                >
                  <option value="priority">Priority Score</option>
                  <option value="recency">Most Recent</option>
                  <option value="reliability">Reliability</option>
                </select>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                SEVERITY:
              </span>
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    filterSeverity === f.id
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-blue-400/50'
                      : 'bg-[#07192f]/80 text-slate-300 border border-[#1a3150] hover:bg-[#0c2647] hover:border-cyan-500/50 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="text-slate-600 mx-1">|</span>

              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                STATUS:
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                    filterStatus === f.id
                      ? 'bg-[#00C8FF] text-slate-950 shadow-[0_0_12px_rgba(0,200,255,0.4)] border border-cyan-300'
                      : 'bg-[#07192f]/80 text-slate-300 border border-[#1a3150] hover:bg-[#0c2647] hover:border-cyan-500/50 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Rows */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1 pt-2">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Filter className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="font-semibold text-slate-300">No matching incidents found</p>
                <p className="text-slate-500 mt-1">Try resetting search filters or keywords</p>
              </div>
            ) : (
              sorted.map((inc, idx) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';

                // Neon severity stripe color
                const leftStripeColor = isCrit 
                  ? 'bg-[#FF4566] shadow-[0_0_8px_rgba(255,69,102,0.8)]' 
                  : isHigh 
                  ? 'bg-[#FFB547] shadow-[0_0_8px_rgba(255,181,71,0.8)]' 
                  : 'bg-[#00C8FF] shadow-[0_0_8px_rgba(0,200,255,0.8)]';

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    style={{
                      animationDelay: `${Math.min(idx * 30, 360)}ms`
                    }}
                    className={`group relative p-3 sm:p-3.5 transition-all duration-200 cursor-pointer rounded-xl border flex items-stretch gap-3 overflow-hidden bg-gradient-to-r from-[#07192f] via-[#051426] to-[#081b33] animate-card-entrance ${
                      isSelected
                        ? 'border-[#00C8FF] shadow-[0_0_20px_rgba(0,200,255,0.32)] ring-1 ring-[#00C8FF]/50 brightness-110'
                        : 'border-[#1b304c] hover:border-[#00C8FF]/70 hover:shadow-[0_0_16px_rgba(0,200,255,0.2)] hover:brightness-110'
                    }`}
                  >
                    {/* Left vertical severity neon accent bar */}
                    <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 relative z-10 ${leftStripeColor}`} />

                    {/* Middle details: ID, Badges, Title, Location details */}
                    <div className="flex-1 min-w-0 space-y-1 py-0.5 relative z-10">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-bold text-cyan-400 tracking-wide drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]">
                          {inc.id}
                        </span>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border leading-none shadow-xs ${
                          isCrit 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                        }`}>
                          {inc.severity}
                        </span>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border leading-none shadow-xs ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        }`}>
                          {inc.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                        </span>

                        {inc.is_duplicate && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs leading-none">
                            Merged Duplicate
                          </span>
                        )}

                        {(!inc.coordinates || inc.coordinates[0] == null) && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs leading-none">
                            Coords Unknown
                          </span>
                        )}

                        {Boolean(inc.equity_review_flag || inc.equityReviewFlag) && (
                          <span 
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-xs leading-none"
                            title={(inc.equity_reasons || inc.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                          >
                            ⚖️ Equity Review
                          </span>
                        )}

                        {((inc.report_source && inc.report_source.toLowerCase().includes('sms_forwarded')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                          <span 
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono shadow-xs leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 FORWARDED SMS
                          </span>
                        ) : ((inc.report_source && inc.report_source.toLowerCase().includes('sms')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('sms'))) ? (
                          <span 
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono shadow-xs leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 SIMULATED SMS
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xs sm:text-[13px] font-bold text-white tracking-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5">
                        {inc.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                        <span>{inc.sector}</span>
                        <span className="text-slate-500">·</span>
                        <span className="truncate">{inc.locationName || 'Location Not Specified'}</span>
                        <span className="text-slate-500">·</span>
                        <span className="flex-shrink-0">{inc.timeAgo}</span>
                      </div>
                    </div>

                    {/* Right side: Priority Score Gauge & Chevron */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0 pl-2 self-center relative z-10">
                      <AnimatedPriorityScore
                        score={inc.priorityScore}
                        severity={inc.severity}
                        size="sm"
                        showDenominator={false}
                        showLabel={true}
                        label="Priority"
                      />
                      <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
                        isSelected 
                          ? 'text-[#00C8FF] translate-x-1.5 drop-shadow-[0_0_6px_rgba(0,200,255,0.6)]' 
                          : 'text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-1.5'
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
