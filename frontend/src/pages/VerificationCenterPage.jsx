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
  Info
} from 'lucide-react';

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
      <div className="flex items-center space-x-2 border-b border-[#203550] pb-2">
        <button
          onClick={() => setActiveSubTab('unverified')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'unverified'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#0D1B2D]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Reports Awaiting Verification ({unverifiedList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('duplicates')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'duplicates'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#0D1B2D]'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Duplicate Review & Corroboration</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#0D1B2D]'
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
          <div className="lg:col-span-7 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter unverified reports by ID, title, or sector..."
                className="w-full pl-9 pr-4 py-2 bg-[#091629] border border-[#203550] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="divide-y divide-[#203550]/60 max-h-[580px] overflow-y-auto pr-1">
              {unverifiedList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200">All incoming reports verified!</p>
                  <p className="text-slate-500 mt-1">No unverified incident reports currently awaiting review.</p>
                </div>
              ) : (
                unverifiedList.map(inc => {
                  const isSelected = selectedIncident?.id === inc.id;

                  return (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className={`p-3.5 transition-all cursor-pointer rounded-lg my-1.5 border ${
                        isSelected
                          ? 'bg-[#132238] border-amber-500/70 shadow-sm shadow-amber-950/40 ring-1 ring-amber-500/30'
                          : 'bg-[#091629] border-[#203550] hover:bg-[#0D1B2D] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {inc.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {inc.severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {inc.timeAgo}
                            </span>
                          </div>

                          <h3 className="text-xs font-semibold text-white truncate">
                            {inc.title}
                          </h3>

                          <p className="text-[11px] text-slate-400 font-mono">
                            {inc.sector} · {inc.locationName || 'Unknown Location'} · Reliability: {inc.reportReliability}%
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end flex-shrink-0">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Priority</span>
                          <span className="text-base font-bold font-mono text-white">
                            {inc.priorityScore}
                          </span>
                        </div>
                      </div>

                      {/* Quick Verification Transition Action Bar */}
                      <div className="mt-2.5 pt-2 border-t border-[#203550]/70 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          Provenance: <strong className="text-slate-200">{inc.sourceSummary || 'Civilian Report'}</strong>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'verified');
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                          >
                            ✓ Mark Verified
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'disputed');
                            }}
                            className="px-2.5 py-1 rounded bg-[#132238] hover:bg-rose-950/50 hover:text-rose-300 border border-[#203550] text-slate-300 font-medium text-[11px] transition-colors"
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
              <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#203550]">
                  <span className="text-xs font-bold font-mono uppercase text-slate-400">
                    Active Verification Focus
                  </span>
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {selectedIncident.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 bg-[#091629] p-2.5 rounded-lg border border-[#203550]">
                    {selectedIncident.report_text || selectedIncident.whyPrioritised || "No raw narrative payload provided."}
                  </p>
                </div>

                {/* State selector */}
                <div className="p-3 rounded-lg bg-[#091629] border border-[#203550] space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Update Verification Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'verified', label: 'Verified', cls: 'hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40' },
                      { id: 'under_review', label: 'Reviewing', cls: 'hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/40' },
                      { id: 'disputed', label: 'Disputed', cls: 'hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => onVerifyStatusChange(selectedIncident.id, st.id)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                          selectedIncident.verificationStatus === st.id
                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                            : `bg-[#0D1B2D] text-slate-300 border-[#203550] ${st.cls}`
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
              <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-8 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p>Select any unverified incident from the left to inspect and corroborate</p>
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
