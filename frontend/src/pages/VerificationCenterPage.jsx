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

  // Unverified reports
  const unverifiedList = incidents.filter(i => 
    i.verificationStatus === 'unverified' && 
    !i.is_duplicate &&
    (i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.sector.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Incidents that have duplicate candidates or are merged
  const candidateIncidents = incidents.filter(i => !i.is_duplicate);

  // Verification audit entries
  const verificationLogs = auditLog.filter(log => 
    log.actionType === 'VERIFICATION_STATUS_CHANGE' || 
    log.actionType === 'DUPLICATE_MERGED' ||
    log.actionType === 'DUPLICATE_DISMISSED'
  );

  return (
    <div className="space-y-5">
      {/* Page Title & Stats */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Verification Center & Duplicate Resolution
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Human-in-the-Loop Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Corroborate civilian report authenticity, examine semantic duplicate candidates, and authorize database merges.
          </p>
        </div>

        {/* Verification Summary Counts */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            Awaiting Verification: <strong>{incidents.filter(i => i.verificationStatus === 'unverified').length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            Verified Ground Truth: <strong>{incidents.filter(i => i.verificationStatus === 'verified').length}</strong>
          </div>
        </div>
      </div>

      {/* Human Verification Mandate Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 px-4 text-xs flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Verification Protocol:</strong> Machine classification suggests category and urgency, but cannot confirm ground truth. Civilian distress reports must be corroborated through field scouts, radio contacts, or cross-referencing multi-source signals.
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('unverified')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'unverified'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter unverified reports by ID, title, or sector..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto pr-1">
              {unverifiedList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">All incoming reports verified!</p>
                  <p className="text-slate-400 mt-1">No unverified incident reports currently awaiting review.</p>
                </div>
              ) : (
                unverifiedList.map(inc => {
                  const isSelected = selectedIncident?.id === inc.id;

                  return (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className={`p-3.5 transition-all cursor-pointer rounded-lg my-1 ${
                        isSelected
                          ? 'bg-amber-50/80 border border-amber-400 shadow-sm'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {inc.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {inc.severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {inc.timeAgo}
                            </span>
                          </div>

                          <h3 className="text-xs font-semibold text-slate-900 truncate">
                            {inc.title}
                          </h3>

                          <p className="text-[11px] text-slate-500 font-mono">
                            {inc.sector} · {inc.locationName || 'Unknown Location'} · Reliability: {inc.reportReliability}%
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end flex-shrink-0">
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Priority</span>
                          <span className="text-base font-bold font-mono text-slate-800">
                            {inc.priorityScore}
                          </span>
                        </div>
                      </div>

                      {/* Quick Verification Transition Action Bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          Provenance: <strong className="text-slate-700">{inc.sourceSummary || 'Civilian Report'}</strong>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'verified');
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors"
                          >
                            ✓ Mark Verified
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'disputed');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-[11px] transition-colors"
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold font-mono uppercase text-slate-400">
                    Active Verification Focus
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {selectedIncident.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedIncident.report_text || selectedIncident.whyPrioritised || "No raw narrative payload provided."}
                  </p>
                </div>

                {/* State selector */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Update Verification Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'verified', label: 'Verified', cls: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' },
                      { id: 'under_review', label: 'Reviewing', cls: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300' },
                      { id: 'disputed', label: 'Disputed', cls: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => onVerifyStatusChange(selectedIncident.id, st.id)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                          selectedIncident.verificationStatus === st.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : `bg-white text-slate-700 border-slate-200 ${st.cls}`
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>Select any unverified incident from the left to inspect and corroborate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DUPLICATE REVIEW & CORROBORATION */}
      {activeSubTab === 'duplicates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Select Primary Incident to Scan for Duplicates
            </h3>
            <p className="text-xs text-slate-500">
              Pick an active incident to examine potential duplicate submissions detected via semantic NLP and spatial proximity.
            </p>

            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto pr-1">
              {candidateIncidents.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3 transition-all cursor-pointer rounded-lg my-1 ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-400 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-800">{inc.id}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{inc.sector}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium truncate mt-0.5">{inc.title}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-xs">
                <GitMerge className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>Select an incident to run duplicate detection</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERIFICATION AUDIT LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ground Truth & Duplicate Resolution Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Immutable record of coordinator verification actions and merged duplicate reports
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {verificationLogs.length} Logged Events
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {verificationLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No verification actions recorded yet in this session.
              </div>
            ) : (
              verificationLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-800">{log.incidentId}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {log.actionType}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1">
                      {log.reason}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 text-slate-500 text-[11px] font-mono">
                    <div>By: <strong className="text-slate-700">{log.operator}</strong></div>
                    <div className="text-[10px] text-slate-400">{log.oldValue} → {log.newValue}</div>
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
