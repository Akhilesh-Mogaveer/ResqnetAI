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

  // Filter incidents
  const filtered = incidents.filter(inc => {
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Incident Management & Tactical Triage
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {incidents.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming civilian and sensor reports, examine HumAID NLP predictions, and execute operational status transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenNewIncidentModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Report New Incident</span>
          </button>
        </div>
      </div>

      {/* NLP Prediction Integrity Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 px-4 text-xs flex items-start space-x-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Human-in-the-Loop Protocol:</strong> HumAID DistilBERT model classifications provide automated decision-support triage. Machine predictions do <strong className="text-slate-900">not</strong> verify ground-truth incident authenticity. Coordinators must corroborate facts prior to critical squad deployment.
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filterable & Searchable Incident List */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
          {/* Controls: Search, Filters, Sort */}
          <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, sector, or keyword..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="priority">Priority Score</option>
                  <option value="recency">Most Recent</option>
                  <option value="reliability">Reliability</option>
                </select>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterSeverity === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="text-slate-300 mx-1">|</span>

              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                Status:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'unverified', label: 'Unverified' },
                { id: 'verified', label: 'Verified' },
                { id: 'active', label: 'Active' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterStatus === f.id
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Rows */}
          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto pr-1">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No matching incidents found</p>
                <p className="text-slate-400 mt-1">Try resetting search filters or keywords</p>
              </div>
            ) : (
              sorted.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3.5 transition-all cursor-pointer rounded-lg my-1 ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-400 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {inc.id}
                          </span>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                            isCrit 
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isHigh
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {inc.severity}
                          </span>

                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                            inc.verificationStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {inc.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                          </span>

                          {inc.is_duplicate && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Merged Duplicate
                            </span>
                          )}

                          {(!inc.coordinates || inc.coordinates[0] == null) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Coords Unknown
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-semibold text-slate-900 truncate">
                          {inc.title}
                        </h3>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                          <span>{inc.sector}</span>
                          <span>·</span>
                          <span>{inc.locationName || 'Location Not Specified'}</span>
                          <span>·</span>
                          <span>{inc.timeAgo}</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right flex-shrink-0 flex flex-col items-end">
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Priority</span>
                        <span className={`text-base font-bold font-mono ${
                          inc.priorityScore >= 85 ? 'text-red-600' :
                          inc.priorityScore >= 70 ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {inc.priorityScore}
                        </span>
                        <ChevronRight className={`w-4 h-4 mt-1 transition-transform ${
                          isSelected ? 'text-blue-600 translate-x-1' : 'text-slate-300'
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
