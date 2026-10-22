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
        return 'bg-severity-critical text-white font-bold';
      case 'high':
        return 'bg-severity-high text-text-primary font-bold';
      case 'moderate':
      case 'medium':
        return 'bg-severity-medium text-white font-bold';
      default:
        return 'bg-severity-low text-white font-bold';
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'verified':
        return { text: 'VERIFIED', cls: 'bg-severity-success/20 text-[#166534] font-bold' };
      case 'under_review':
        return { text: 'REVIEWING', cls: 'bg-brand-primary/20 text-brand-primary font-bold' };
      case 'disputed':
        return { text: 'DISPUTED', cls: 'bg-purple-500/20 text-purple-700 font-bold' };
      default:
        return { text: 'UNVERIFIED', cls: 'bg-severity-high/20 text-[#9A3412] font-bold' };
    }
  };

  return (
    <div className="clay-card p-5 flex flex-col h-[520px]">
      {/* Header with Section Icon Chip */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#A3B1C6]/20 mb-3.5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary shadow-clay-button flex items-center justify-center text-white flex-shrink-0">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-text-primary tracking-wide">Priority queue</h2>
              <span className="w-2 h-2 rounded-full bg-severity-success" />
              <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/15 px-2 py-0.5 rounded-clay-pill">
                Scored
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">Ranked using transparent scoring signals · Updated live</p>
          </div>
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-1.5 text-xs text-text-secondary font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-elevated rounded-clay-button px-2.5 py-1 text-text-primary text-xs shadow-clay-pill focus:outline-none focus:ring-1 focus:ring-brand-primary font-sans cursor-pointer"
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
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents by name, sector, or ID (e.g. RQN-0427)..."
            className="w-full pl-9 pr-7 py-2 bg-surface-elevated rounded-clay-input text-xs text-text-primary placeholder:text-text-muted shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
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
              className={`px-3 py-1 rounded-clay-pill transition-all whitespace-nowrap text-xs font-semibold ${
                filterSeverity === pill.id
                  ? 'bg-brand-primary text-white shadow-clay-button'
                  : 'bg-surface-elevated text-text-secondary shadow-clay-pill hover:text-text-primary'
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
          <div className="h-full flex flex-col items-center justify-center text-text-muted text-xs py-8">
            <Filter className="w-8 h-8 text-text-muted mb-2 opacity-60" />
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
                className={`p-3 rounded-clay-button transition-all cursor-pointer relative overflow-hidden group select-none ${
                  isSelected
                    ? 'clay-card border-l-4 border-l-brand-primary shadow-clay-card'
                    : 'bg-surface-elevated shadow-clay-pill hover:shadow-clay-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Rank & Title */}
                  <div className="flex items-center space-x-3 truncate">
                    <span className="font-mono text-xs font-bold text-text-muted group-hover:text-brand-primary transition-colors w-5">
                      {rank}
                    </span>

                    <div className="truncate">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-semibold text-text-primary group-hover:text-brand-primary truncate transition-colors">
                          {incident.title}
                        </span>

                        {/* Severity Tag */}
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-clay-pill ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </span>

                        {/* Verification Tag */}
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-clay-pill ${verif.cls}`}>
                          {verif.text}
                        </span>

                        {/* Merged Duplicate Tag */}
                        {(incident.is_duplicate || incident.responseStatus === 'merged_duplicate') && (
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-clay-pill bg-purple-500/20 text-purple-700 font-bold">
                            MERGED DUPLICATE
                          </span>
                        )}

                        {incident.duplicate_count > 0 && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-clay-pill bg-severity-high/20 text-[#9A3412] font-bold">
                            +{incident.duplicate_count} CORROBORATED
                          </span>
                        )}

                        {(!incident.coordinates || !Array.isArray(incident.coordinates) || incident.coordinates.length !== 2 || incident.coordinates[0] == null) && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-clay-pill bg-severity-high/20 text-[#9A3412] font-bold" title="Coordinates are unknown / unmapped">
                            COORDS UNKNOWN
                          </span>
                        )}

                        {incident.is_synthetic_location && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-clay-pill bg-surface-inset text-text-secondary font-medium" title="Synthetic demo coordinates (SF Bay Simulation)">
                            DEMO COORDS
                          </span>
                        )}

                        {incident.location_source && incident.location_source.startsWith('geocoded') && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-clay-pill bg-severity-success/20 text-[#166534] font-bold" title={incident.location_source}>
                            GEOCODED
                          </span>
                        )}
                      </div>

                      {/* Location & Time */}
                      <div className="text-[11px] text-text-secondary mt-1 flex items-center space-x-1.5 font-mono">
                        <span className="font-semibold text-brand-primary">{incident.id}</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-text-secondary font-sans">{incident.sector}</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-text-muted">{incident.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores */}
                  <div className="flex items-center space-x-3 flex-shrink-0 pl-2">
                    {/* Reliability */}
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-mono text-text-muted uppercase">
                        Reliability
                      </div>
                      <div className="text-xs font-mono font-bold text-text-primary">
                        {incident.reportReliability}%
                      </div>
                    </div>

                    {/* Priority Score with Chevron */}
                    <div className="text-right flex items-center space-x-2 pl-2 border-l border-[#A3B1C6]/20">
                      <div>
                        <div className="text-[9px] font-mono text-text-muted uppercase">
                          Priority
                        </div>
                        <div className={`text-sm font-mono font-black ${
                          incident.priorityScore >= 85 ? 'text-severity-critical' :
                          incident.priorityScore >= 70 ? 'text-severity-high' : 'text-brand-primary'
                        }`}>
                          {incident.priorityScore}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-brand-primary translate-x-0.5' : 'text-text-muted group-hover:text-text-primary'
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
