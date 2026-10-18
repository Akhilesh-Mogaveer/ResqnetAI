import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Flame,
  ArrowUpDown
} from 'lucide-react';

export default function PriorityQueue({
  incidents = [],
  selectedIncident,
  onSelectIncident
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all'); // all | critical | high | moderate | active
  const [sortBy, setSortBy] = useState('priority'); // priority | reliability | recency

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (incident.type && incident.type.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterSeverity === 'critical') return incident.severity === 'critical';
    if (filterSeverity === 'high') return incident.severity === 'high';
    if (filterSeverity === 'moderate') return incident.severity === 'moderate';
    if (filterSeverity === 'active') return incident.responseStatus !== 'resolved' && !incident.is_duplicate && incident.responseStatus !== 'merged_duplicate';

    return true;
  });

  // Sort incidents
  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
    if (sortBy === 'reliability') return (b.reportReliability || 0) - (a.reportReliability || 0);
    if (sortBy === 'recency') return new Date(b.timestamp) - new Date(a.timestamp);
    return 0;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 font-bold';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      case 'moderate':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'verified':
        return { text: 'VERIFIED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'under_review':
        return { text: 'REVIEWING', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'disputed':
        return { text: 'DISPUTED', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { text: 'UNVERIFIED', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">Priority queue</h2>
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
              Scored
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Ranked using transparent scoring signals · Updated just now</p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none focus:border-blue-500 font-sans"
          >
            <option value="priority">Priority Score</option>
            <option value="reliability">Reliability</option>
            <option value="recency">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents by name, sector, or ID (e.g. RQN-0427)..."
            className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
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

        {/* Filter Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
          {[
            { id: 'all', label: `All (${incidents.length})` },
            { id: 'critical', label: `Critical (${incidents.filter(i => i.severity === 'critical').length})` },
            { id: 'high', label: `High (${incidents.filter(i => i.severity === 'high').length})` },
            { id: 'unverified', label: `Unverified (${incidents.filter(i => i.verificationStatus === 'unverified').length})` },
            { id: 'active', label: `Active (${incidents.filter(i => i.responseStatus !== 'resolved').length})` }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterSeverity(pill.id)}
              className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                filterSeverity === pill.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {sortedIncidents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
            <Filter className="w-8 h-8 text-slate-300 mb-2" />
            <p>No incidents match the active search or filters.</p>
          </div>
        ) : (
          sortedIncidents.map((incident, idx) => {
            const isSelected = selectedIncident?.id === incident.id;
            const rank = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
            const verif = getVerificationBadge(incident.verificationStatus);

            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                )}

                <div className="flex items-center justify-between">
                  {/* Left: Rank & Title */}
                  <div className="flex items-center space-x-3 truncate">
                    <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors w-5">
                      {rank}
                    </span>

                    <div className="truncate">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 truncate">
                          {incident.title}
                        </span>

                        {/* Severity Tag */}
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </span>

                        {/* Verification Tag */}
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${verif.cls}`}>
                          {verif.text}
                        </span>

                        {/* Merged Duplicate Tag */}
                        {(incident.is_duplicate || incident.responseStatus === 'merged_duplicate') && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                            MERGED DUPLICATE
                          </span>
                        )}

                        {incident.duplicate_count > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200">
                            +{incident.duplicate_count} CORROBORATED
                          </span>
                        )}

                        {(!incident.coordinates || !Array.isArray(incident.coordinates) || incident.coordinates.length !== 2 || incident.coordinates[0] == null) && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 font-semibold" title="Coordinates are unknown / unmapped">
                            COORDS UNKNOWN
                          </span>
                        )}

                        {incident.is_synthetic_location && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200" title="Synthetic demo coordinates (SF Bay Simulation)">
                            DEMO COORDS
                          </span>
                        )}

                        {incident.location_source && incident.location_source.startsWith('geocoded') && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200" title={incident.location_source}>
                            GEOCODED
                          </span>
                        )}
                      </div>

                      {/* Location & Time */}
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5 font-mono">
                        <span className="font-semibold text-slate-700">{incident.id}</span>
                        <span>·</span>
                        <span className="text-slate-600">{incident.sector}</span>
                        <span>·</span>
                        <span>{incident.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores */}
                  <div className="flex items-center space-x-3 flex-shrink-0 pl-2">
                    {/* Reliability */}
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-mono text-slate-400 uppercase">
                        Reliability
                      </div>
                      <div className="text-xs font-mono font-semibold text-slate-700">
                        {incident.reportReliability}%
                      </div>
                    </div>

                    {/* Priority Score with Chevron */}
                    <div className="text-right flex items-center space-x-1.5 pl-2 border-l border-slate-200">
                      <div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase">
                          Priority
                        </div>
                        <div className={`text-sm font-mono font-bold ${
                          incident.priorityScore >= 85 ? 'text-red-600' :
                          incident.priorityScore >= 70 ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {incident.priorityScore}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
