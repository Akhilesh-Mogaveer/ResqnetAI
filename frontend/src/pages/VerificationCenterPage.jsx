import React, { useState } from 'react';
import DuplicateSuggestionsCard from '../components/DuplicateSuggestionsCard';
import { 
  ShieldAlert, 
  ShieldCheck, 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight,
  ExternalLink,
  History,
  Info,
  MapPin,
  FileText,
  Check
} from 'lucide-react';

const getSeverityConfig = (sev = '') => {
  const s = sev?.toLowerCase() || '';
  if (s === 'critical') {
    return {
      stripe: 'bg-[#FF4566] shadow-[0_0_10px_rgba(255,69,102,0.8)]',
      badge: 'border-red-500/60 bg-red-950/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
      priorityText: 'text-[#FF4566] drop-shadow-[0_0_8px_rgba(255,69,102,0.5)]',
    };
  }
  if (s === 'high') {
    return {
      stripe: 'bg-[#FFB547] shadow-[0_0_10px_rgba(255,181,71,0.8)]',
      badge: 'border-amber-500/60 bg-amber-950/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      priorityText: 'text-[#FFB547] drop-shadow-[0_0_8px_rgba(255,181,71,0.5)]',
    };
  }
  if (s === 'low') {
    return {
      stripe: 'bg-[#25D6A2] shadow-[0_0_10px_rgba(37,214,162,0.8)]',
      badge: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      priorityText: 'text-[#25D6A2] drop-shadow-[0_0_8px_rgba(37,214,162,0.5)]',
    };
  }
  return {
    stripe: 'bg-[#00C8FF] shadow-[0_0_10px_rgba(0,200,255,0.8)]',
    badge: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-400 shadow-[0_0_10px_rgba(0,200,255,0.2)]',
    priorityText: 'text-[#00C8FF] drop-shadow-[0_0_8px_rgba(0,200,255,0.5)]',
  };
};

export default function VerificationCenterPage({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  onVerifyStatusChange,
  onDuplicateMerged,
  onDuplicateDismissed,
  onShowToast,
  auditLog = [],
  onNavigateTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('unverified'); // unverified | duplicates | audit
  const [searchQuery, setSearchQuery] = useState('');

  // Unverified reports: active canonical reports only
  const unverifiedList = incidents.filter(i => 
    i.verificationStatus === 'unverified' && 
    !i.is_duplicate &&
    i.responseStatus !== 'merged_duplicate' &&
    (i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.sector.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Incidents that have duplicate candidates: active canonical incidents only
  const candidateIncidents = incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate');

  // Verification audit entries
  const verificationLogs = auditLog.filter(log => 
    log.actionType === 'VERIFICATION_STATUS_CHANGE' || 
    log.actionType === 'DUPLICATE_MERGED' ||
    log.actionType === 'DUPLICATE_REPORT_MERGED' ||
    log.actionType === 'DUPLICATE_DISMISSED'
  );

  return (
    <div className="space-y-5">
      {/* Page Title & Stats */}
      <div 
        className="relative bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.90) 0%, rgba(7, 17, 31, 0.72) 50%, rgba(9, 22, 41, 0.40) 100%), url('/images/header-verification.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Verification Center & Duplicate Resolution
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Human-in-the-Loop Hub
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Corroborate civilian report authenticity, examine semantic duplicate candidates, and authorize database merges.
          </p>
        </div>

        {/* Verification Summary Counts */}
        <div className="flex items-center space-x-2 text-xs font-mono relative z-10">
          <div className="px-3 py-1.5 rounded-lg bg-[#07111F]/80 border border-amber-500/40 text-amber-300 backdrop-blur-xs">
            Awaiting Verification: <strong>{incidents.filter(i => i.verificationStatus === 'unverified').length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#07111F]/80 border border-emerald-500/40 text-emerald-300 backdrop-blur-xs">
            Verified Ground Truth: <strong>{incidents.filter(i => i.verificationStatus === 'verified').length}</strong>
          </div>
        </div>
      </div>

      {/* Human Verification Mandate Banner */}
      <div className="bg-[#132238] border border-amber-500/30 rounded-xl p-3.5 px-4 text-xs flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <strong className="text-white font-semibold">Verification Protocol:</strong> Machine classification suggests category and urgency, but cannot confirm ground truth. Civilian distress reports must be corroborated through field scouts, radio contacts, or cross-referencing multi-source signals.
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#1b3452] pb-2">
        <button
          onClick={() => setActiveSubTab('unverified')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'unverified'
              ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/40 shadow-[0_0_12px_rgba(0,200,255,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-[#07192f] border border-transparent'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Reports Awaiting Verification ({unverifiedList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('duplicates')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'duplicates'
              ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/40 shadow-[0_0_12px_rgba(0,200,255,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-[#07192f] border border-transparent'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Duplicate Review & Corroboration</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'audit'
              ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/40 shadow-[0_0_12px_rgba(0,200,255,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-[#07192f] border border-transparent'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Verification Audit Ledger ({verificationLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: UNVERIFIED REPORTS QUEUE */}
      {activeSubTab === 'unverified' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List of Unverified Reports */}
          <div className="lg:col-span-7 command-center-grid-bg rounded-2xl luminous-command-box p-4 sm:p-5 flex flex-col space-y-4">
            {/* Search Container */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter unverified reports by ID, title, or sector..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#06182f]/90 border border-[#1b3452] focus:border-[#00C8FF] focus:ring-1 focus:ring-[#00C8FF]/50 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Scrollable Incident Cards List */}
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
              {unverifiedList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200 text-sm">All incoming reports verified!</p>
                  <p className="text-slate-400 mt-1">No unverified incident reports currently awaiting review.</p>
                </div>
              ) : (
                unverifiedList.map((inc, index) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  const config = getSeverityConfig(inc.severity);

                  return (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
                      className={`animate-card-entrance relative rounded-xl border p-4 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0d2746] via-[#091f38] to-[#0c2440] border-[#00C8FF] shadow-[0_0_20px_rgba(0,200,255,0.25)] ring-1 ring-[#00C8FF]/40 -translate-y-0.5'
                          : 'bg-gradient-to-r from-[#07192f] via-[#051426] to-[#081b33] border-[#1b3452] hover:border-[#00C8FF]/70 hover:shadow-[0_0_18px_rgba(0,200,255,0.2)] hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Top & Middle Section with Left Severity Stripe */}
                      <div className="flex items-stretch gap-3.5">
                        {/* Left Severity Indicator Stripe */}
                        <div
                          className={`w-1.5 rounded-full flex-shrink-0 my-0.5 ${config.stripe}`}
                          aria-hidden="true"
                        />

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top Row: ID, Severity Badge, Timestamp, Priority Score */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-mono text-xs font-bold text-amber-400 tracking-wide">
                                {inc.id}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border tracking-wider ${config.badge}`}
                              >
                                {inc.severity}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {inc.timeAgo}
                              </span>
                            </div>

                            <div className="text-right flex flex-col items-end flex-shrink-0 -mt-0.5">
                              <span className="text-[10px] font-mono tracking-wider text-slate-400 font-semibold uppercase">
                                PRIORITY
                              </span>
                              <span className={`text-2xl font-black font-mono leading-none mt-0.5 ${config.priorityText}`}>
                                {inc.priorityScore}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-bold text-white tracking-tight truncate mt-1.5">
                            {inc.title}
                          </h3>

                          {/* Location & Reliability Secondary Row */}
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400 mt-1.5">
                            <div className="flex items-center text-slate-300 truncate max-w-full">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400 mr-1 shrink-0" />
                              <span className="truncate">{inc.sector || 'District Sector'}</span>
                            </div>
                            {inc.locationName && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-400 truncate max-w-[260px] sm:max-w-[340px]">
                                  {inc.locationName}
                                </span>
                              </>
                            )}
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300 shrink-0">
                              Reliability: {inc.reportReliability}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-[#1b3452]/70 mt-3 pt-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
                        {/* Provenance */}
                        <div className="flex items-center text-slate-400 text-xs min-w-0 pr-2">
                          <FileText className="w-3.5 h-3.5 text-cyan-400 mr-1.5 shrink-0" />
                          <span className="truncate">
                            Provenance:{' '}
                            <strong className="text-slate-200 font-medium">
                              {inc.sourceSummary || 'Officer/Phone Call - Intake via Emergency Report Form'}
                            </strong>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'verified');
                            }}
                            className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all active:scale-95 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Mark Verified</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'disputed');
                            }}
                            className="bg-transparent hover:bg-rose-950/30 text-slate-300 hover:text-rose-200 border border-[#2b4461] hover:border-rose-500/50 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Dispute
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Focused Verification Detail & Duplicate Scanner */}
          <div className="lg:col-span-5 space-y-4">
            {selectedIncident ? (
              <div className="bg-[#07192f] rounded-2xl border border-[#1b3452] shadow-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1b3452]">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Active Verification Focus
                  </span>
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                    {selectedIncident.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 bg-[#051426] p-3 rounded-xl border border-[#1b3452] leading-relaxed">
                    {selectedIncident.report_text || selectedIncident.whyPrioritised || "No raw narrative payload provided."}
                  </p>
                </div>

                {/* State selector */}
                <div className="p-3.5 rounded-xl bg-[#051426] border border-[#1b3452] space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Update Verification Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'verified', label: 'Verified', cls: 'hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40' },
                      { id: 'under_review', label: 'Reviewing', cls: 'hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40' },
                      { id: 'disputed', label: 'Disputed', cls: 'hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => onVerifyStatusChange(selectedIncident.id, st.id)}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          selectedIncident.verificationStatus === st.id
                            ? 'bg-[#00C8FF]/20 text-[#00C8FF] border-[#00C8FF] shadow-[0_0_12px_rgba(0,200,255,0.25)]'
                            : `bg-[#07192f] text-slate-300 border-[#1b3452] ${st.cls}`
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duplicate Suggestions embedded for this incident */}
                <DuplicateSuggestionsCard
                  incident={selectedIncident}
                  onDuplicateMerged={onDuplicateMerged}
                  onDuplicateDismissed={onDuplicateDismissed}
                  onShowToast={onShowToast}
                  onSelectIncident={onSelectIncident}
                />
              </div>
            ) : (
              <div className="bg-[#07192f] rounded-2xl border border-[#1b3452] shadow-xl p-10 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-10 h-10 mx-auto text-cyan-500/60 mb-3" />
                <p className="font-semibold text-slate-200 text-sm">Select an Unverified Incident</p>
                <p className="text-slate-400 mt-1">Choose any report from the left queue to inspect details and corroborate duplicate signals.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DUPLICATE REVIEW & CORROBORATION */}
      {activeSubTab === 'duplicates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Select Primary Incident to Scan for Duplicates
            </h3>
            <p className="text-xs text-slate-400">
              Pick an active incident to examine potential duplicate submissions detected via semantic NLP and spatial proximity.
            </p>

            <div className="divide-y divide-[#203550]/60 max-h-[550px] overflow-y-auto pr-1">
              {candidateIncidents.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3 transition-all cursor-pointer rounded-lg my-1.5 border ${
                      isSelected
                        ? 'bg-[#132238] border-cyan-500/70 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                        : 'bg-[#091629] border-[#203550] hover:bg-[#0D1B2D] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{inc.id}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{inc.sector}</span>
                        </div>
                        <p className="text-xs text-white font-medium truncate mt-0.5">{inc.title}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#132238] text-slate-300 border border-[#203550] flex-shrink-0">
                        Score {inc.priorityScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {selectedIncident ? (
              <DuplicateSuggestionsCard
                incident={selectedIncident}
                onDuplicateMerged={onDuplicateMerged}
                onDuplicateDismissed={onDuplicateDismissed}
                onShowToast={onShowToast}
                onSelectIncident={onSelectIncident}
              />
            ) : (
              <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-12 text-center text-slate-400 text-xs">
                <GitMerge className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p>Select an incident to run duplicate detection</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERIFICATION AUDIT LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203550]">
            <div>
              <h3 className="text-sm font-bold text-white">
                Ground Truth & Duplicate Resolution Audit Trail
              </h3>
              <p className="text-xs text-slate-400">
                Immutable record of coordinator verification actions and merged duplicate reports
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {verificationLogs.length} Logged Events
            </span>
          </div>

          <div className="divide-y divide-[#203550]/60">
            {verificationLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No verification actions recorded yet in this session.
              </div>
            ) : (
              verificationLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-cyan-400">{log.incidentId}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {log.actionType}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      {log.reason}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 text-slate-400 text-[11px] font-mono">
                    <div>By: <strong className="text-white">{log.operator}</strong></div>
                    <div className="text-[10px] text-slate-500">{log.oldValue} → {log.newValue}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
