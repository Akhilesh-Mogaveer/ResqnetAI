import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
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
        return 'bg-rose-950/60 text-rose-300 border-rose-500/40 font-bold';
      case 'high':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40 font-medium';
      case 'moderate':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 font-medium';
      default:
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-medium';
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'verified':
        return { text: 'VERIFIED', cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' };
      case 'under_review':
        return { text: 'REVIEWING', cls: 'bg-blue-950/60 text-blue-300 border-blue-500/40' };
      case 'disputed':
        return { text: 'DISPUTED', cls: 'bg-purple-950/60 text-purple-300 border-purple-500/40' };
      default:
        return { text: 'UNVERIFIED', cls: 'bg-amber-950/60 text-amber-300 border-amber-500/40' };
    }
  };

  return (
    <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl p-4 shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white tracking-wide">Priority queue</h2>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-500/40">
              Scored
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Ranked using transparent scoring signals · Updated just now</p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#091629] border border-[#203550] rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 font-sans"
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
            className="w-full pl-9 pr-7 py-2 bg-[#091629] border border-[#203550] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-[#0D1B2D] transition-colors"
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
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterSeverity === pill.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-[#091629] text-slate-400 border border-[#203550] hover:bg-[#132238] hover:text-slate-200'
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
            <Filter className="w-8 h-8 text-slate-500 mb-2" />
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
                    ? 'bg-[#132238] border-cyan-500/60 shadow-sm'
                    : 'bg-[#091629] border-[#203550] hover:bg-[#0D1B2D] hover:border-slate-600'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
                )}

                <div className="flex items-center justify-between">
                  {/* Left: Rank & Title */}
                  <div className="flex items-center space-x-3 truncate">
                    <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-cyan-400 transition-colors w-5">
                      {rank}
                    </span>

                    <div className="truncate">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
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
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border bg-purple-950/60 text-purple-300 border-purple-500/40 font-semibold">
                            MERGED DUPLICATE
                          </span>
                        )}

                        {incident.duplicate_count > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-amber-950/60 text-amber-300 border-amber-500/40">
                            +{incident.duplicate_count} CORROBORATED
                          </span>
                        )}

                        {(!incident.coordinates || !Array.isArray(incident.coordinates) || incident.coordinates.length !== 2 || incident.coordinates[0] == null) && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-amber-950/60 text-amber-300 border-amber-500/40 font-semibold" title="Coordinates are unknown / unmapped">
                            COORDS UNKNOWN
                          </span>
                        )}

                        {incident.is_synthetic_location && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-slate-800 text-slate-300 border-slate-700" title="Synthetic demo coordinates (SF Bay Simulation)">
                            DEMO COORDS
                          </span>
                        )}

                        {incident.location_source && incident.location_source.startsWith('geocoded') && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-emerald-950/60 text-emerald-300 border-emerald-500/40" title={incident.location_source}>
                            GEOCODED
                          </span>
                        )}
                      </div>

                      {/* Location & Time */}
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5 font-mono">
                        <span className="font-semibold text-slate-300">{incident.id}</span>
                        <span>·</span>
                        <span className="text-slate-400">{incident.sector}</span>
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
                      <div className="text-xs font-mono font-semibold text-slate-300">
                        {incident.reportReliability}%
                      </div>
                    </div>

                    {/* Priority Score with Chevron */}
                    <div className="text-right flex items-center space-x-1.5 pl-2 border-l border-[#203550]">
                      <div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase">
                          Priority
                        </div>
                        <div className={`text-sm font-mono font-bold ${
                          incident.priorityScore >= 85 ? 'text-rose-400' :
                          incident.priorityScore >= 70 ? 'text-amber-400' : 'text-cyan-400'
                        }`}>
                          {incident.priorityScore}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-500 group-hover:text-slate-300'
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
