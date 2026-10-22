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
      stripe: 'bg-[#E5484D]',
      badge: 'bg-red-100/90 text-[#E5484D] font-bold border-none',
      priorityText: 'text-[#E5484D]',
    };
  }
  if (s === 'high') {
    return {
      stripe: 'bg-[#F5A524]',
      badge: 'bg-amber-100/90 text-[#F5A524] font-bold border-none',
      priorityText: 'text-[#F5A524]',
    };
  }
  if (s === 'low') {
    return {
      stripe: 'bg-[#7B8794]',
      badge: 'bg-slate-100 text-[#7B8794] font-bold border-none',
      priorityText: 'text-[#7B8794]',
    };
  }
  return {
    stripe: 'bg-[#4F6BED]',
    badge: 'bg-blue-100/90 text-[#4F6BED] font-bold border-none',
    priorityText: 'text-[#4F6BED]',
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
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div 
        className="relative bg-surface-card p-6 rounded-clay-card shadow-clay-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden border-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(245, 247, 251, 0.95) 0%, rgba(245, 247, 251, 0.85) 50%, rgba(238, 241, 246, 0.70) 100%), url('/images/header-verification.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Verification Center & Duplicate Resolution
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold shadow-clay-pill">
              Human-in-the-Loop Hub
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Corroborate civilian report authenticity, examine semantic duplicate candidates, and authorize database merges.
          </p>
        </div>

        {/* Verification Summary Counts */}
        <div className="flex items-center space-x-2 text-xs font-mono relative z-10">
          <div className="px-3.5 py-2 rounded-clay-button bg-surface-card shadow-clay-button text-amber-800 font-semibold">
            Awaiting Verification: <strong>{incidents.filter(i => i.verificationStatus === 'unverified').length}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-clay-button bg-surface-card shadow-clay-button text-emerald-800 font-semibold">
            Verified Ground Truth: <strong>{incidents.filter(i => i.verificationStatus === 'verified').length}</strong>
          </div>
        </div>
      </div>

      {/* Human Verification Mandate Banner */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-clay-card p-4 text-xs flex items-start space-x-3 shadow-clay-card text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-950 font-bold">Verification Protocol:</strong> Machine classification suggests category and urgency, but cannot confirm ground truth. Civilian distress reports must be corroborated through field scouts, radio contacts, or cross-referencing multi-source signals.
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-black/5 pb-2">
        <button
          onClick={() => setActiveSubTab('unverified')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-clay-button text-xs font-semibold transition-all active:shadow-clay-inset ${
            activeSubTab === 'unverified'
              ? 'bg-brand-primary text-white shadow-clay-button'
              : 'bg-surface-card text-text-secondary shadow-clay-button hover:bg-white hover:text-text-primary'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Reports Awaiting Verification ({unverifiedList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('duplicates')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-clay-button text-xs font-semibold transition-all active:shadow-clay-inset ${
            activeSubTab === 'duplicates'
              ? 'bg-brand-primary text-white shadow-clay-button'
              : 'bg-surface-card text-text-secondary shadow-clay-button hover:bg-white hover:text-text-primary'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Duplicate Review & Corroboration</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-clay-button text-xs font-semibold transition-all active:shadow-clay-inset ${
            activeSubTab === 'audit'
              ? 'bg-brand-primary text-white shadow-clay-button'
              : 'bg-surface-card text-text-secondary shadow-clay-button hover:bg-white hover:text-text-primary'
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
          <div className="lg:col-span-7 bg-surface-card rounded-clay-card shadow-clay-card p-5 flex flex-col space-y-4">
            {/* Search Container */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter unverified reports by ID, title, or sector..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-inset rounded-clay-input shadow-clay-inset text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all border-none"
              />
            </div>

            {/* Scrollable Incident Cards List */}
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
              {unverifiedList.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-text-primary text-sm">All incoming reports verified!</p>
                  <p className="text-text-muted mt-1">No unverified incident reports currently awaiting review.</p>
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
                      className={`relative rounded-clay-card p-4 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#EEF1F6] shadow-clay-inset'
                          : 'clay-card hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Top & Middle Section with Left Severity Accent Dot */}
                      <div className="flex items-stretch gap-3.5">
                        {/* Left Severity Accent Dot */}
                        <div className="flex flex-col items-center pt-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.stripe}`} />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top Row: ID, Severity Badge, Timestamp, Priority Score */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-mono text-xs font-bold text-brand-primary tracking-wide">
                                {inc.id}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-clay-pill shadow-clay-pill ${config.badge}`}
                              >
                                {inc.severity}
                              </span>
                              <span className="text-xs text-text-muted font-mono">
                                {inc.timeAgo}
                              </span>
                            </div>

                            <div className="text-right flex flex-col items-end flex-shrink-0 -mt-0.5">
                              <span className="text-[10px] font-mono tracking-wider text-text-muted font-semibold uppercase">
                                PRIORITY
                              </span>
                              <span className={`text-2xl font-black font-mono leading-none mt-0.5 ${config.priorityText}`}>
                                {inc.priorityScore}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-bold text-text-primary tracking-tight truncate mt-1.5">
                            {inc.title}
                          </h3>

                          {/* Raw text snippet in clay-inset well if available */}
                          {inc.report_text && (
                            <div className="mt-2 px-3 py-2 rounded-clay-input bg-surface-inset shadow-clay-inset text-[11px] text-text-secondary leading-relaxed line-clamp-2 font-sans">
                              {inc.report_text}
                            </div>
                          )}

                          {/* Location & Confidence Progress Bar */}
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-text-secondary mt-2.5">
                            <div className="flex items-center text-text-secondary truncate max-w-[260px]">
                              <MapPin className="w-3.5 h-3.5 text-brand-primary mr-1 shrink-0" />
                              <span className="truncate">{inc.sector || 'District Sector'}</span>
                              {inc.locationName && (
                                <>
                                  <span className="text-slate-300 mx-1">·</span>
                                  <span className="text-text-muted truncate">
                                    {inc.locationName}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Confidence as Clay Progress Bar */}
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] text-text-muted font-mono font-medium">Confidence:</span>
                              <div className="w-20 h-2 rounded-full bg-[#EEF1F6] shadow-clay-inset overflow-hidden p-0.5">
                                <div
                                  className="h-full rounded-full bg-severity-success"
                                  style={{ width: `${inc.reportReliability || 75}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-text-primary">{inc.reportReliability || 75}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-3 pt-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
                        {/* Provenance */}
                        <div className="flex items-center text-text-muted text-xs min-w-0 pr-2">
                          <FileText className="w-3.5 h-3.5 text-brand-primary mr-1.5 shrink-0" />
                          <span className="truncate">
                            Provenance:{' '}
                            <strong className="text-text-primary font-medium">
                              {inc.sourceSummary || 'Officer/Phone Call - Intake via Emergency Report Form'}
                            </strong>
                          </span>
                        </div>

                        {/* Actions (Corroborate=success, Escalate=high/warning) */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'verified');
                            }}
                            className="clay-button-success font-semibold text-xs px-3.5 py-1.5 rounded-clay-button flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Mark Verified</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyStatusChange(inc.id, 'disputed');
                            }}
                            className="clay-button-warning font-semibold text-xs px-3.5 py-1.5 rounded-clay-button cursor-pointer"
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
              <div className="bg-surface-card rounded-clay-card shadow-clay-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-text-muted">
                    Active Verification Focus
                  </span>
                  <span className="font-mono text-xs font-bold text-brand-primary bg-blue-50 px-2.5 py-0.5 rounded-full shadow-clay-pill">
                    {selectedIncident.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-text-primary text-sm">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-2 bg-surface-inset p-3.5 rounded-clay-card shadow-clay-inset leading-relaxed">
                    {selectedIncident.report_text || selectedIncident.whyPrioritised || "No raw narrative payload provided."}
                  </p>
                </div>

                {/* State selector */}
                <div className="p-4 rounded-clay-card bg-surface-inset shadow-clay-inset space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block font-mono">
                    Update Verification Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'verified', label: 'Verified', activeCls: 'clay-button-success font-bold text-white' },
                      { id: 'under_review', label: 'Reviewing', activeCls: 'clay-button-warning font-bold text-amber-950' },
                      { id: 'disputed', label: 'Disputed', activeCls: 'clay-button font-bold text-text-primary bg-surface-elevated' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => onVerifyStatusChange(selectedIncident.id, st.id)}
                        className={`py-2 px-2.5 rounded-clay-button text-xs font-semibold transition-all cursor-pointer ${
                          selectedIncident.verificationStatus === st.id
                            ? `${st.activeCls} shadow-clay-button`
                            : 'clay-button text-text-secondary hover:text-text-primary'
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
              <div className="bg-surface-card rounded-clay-card shadow-clay-card p-10 text-center text-text-muted text-xs">
                <ShieldCheck className="w-10 h-10 mx-auto text-brand-primary/60 mb-3" />
                <p className="font-semibold text-text-primary text-sm">Select an Unverified Incident</p>
                <p className="text-text-muted mt-1">Choose any report from the left queue to inspect details and corroborate duplicate signals.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DUPLICATE REVIEW & CORROBORATION */}
      {activeSubTab === 'duplicates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
              Select Primary Incident to Scan for Duplicates
            </h3>
            <p className="text-xs text-text-secondary">
              Pick an active incident to examine potential duplicate submissions detected via semantic NLP and spatial proximity.
            </p>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {candidateIncidents.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3.5 transition-all cursor-pointer rounded-clay-card ${
                      isSelected
                        ? 'bg-surface-elevated shadow-clay-card border-l-4 border-l-brand-primary'
                        : 'bg-surface-card shadow-clay-button hover:bg-white hover:shadow-clay-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-brand-primary">{inc.id}</span>
                          <span className="text-[10px] font-semibold text-text-muted">{inc.sector}</span>
                        </div>
                        <p className="text-xs text-text-primary font-medium truncate mt-0.5">{inc.title}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset text-text-secondary shadow-clay-inset flex-shrink-0 font-semibold">
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
              <div className="bg-surface-card rounded-clay-card shadow-clay-card p-12 text-center text-text-muted text-xs">
                <GitMerge className="w-8 h-8 mx-auto text-text-muted mb-2" />
                <p>Select an incident to run duplicate detection</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERIFICATION AUDIT LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="bg-surface-card rounded-clay-card shadow-clay-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Ground Truth & Duplicate Resolution Audit Trail
              </h3>
              <p className="text-xs text-text-secondary">
                Immutable record of coordinator verification actions and merged duplicate reports
              </p>
            </div>
            <span className="text-xs font-mono text-text-muted font-semibold">
              {verificationLogs.length} Logged Events
            </span>
          </div>

          <div className="divide-y divide-black/5">
            {verificationLogs.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-xs">
                No verification actions recorded yet in this session.
              </div>
            ) : (
              verificationLogs.map(log => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-brand-primary">{log.incidentId}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-brand-primary shadow-clay-pill font-semibold">
                        {log.actionType}
                      </span>
                      <span className="text-text-muted text-[11px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-text-secondary mt-1">
                      {log.reason}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 text-text-muted text-[11px] font-mono">
                    <div>By: <strong className="text-text-primary">{log.operator}</strong></div>
                    <div className="text-[10px] text-text-muted">{log.oldValue} → {log.newValue}</div>
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
