import React, { useState } from 'react';
import { 
  ListOrdered, 
  Search, 
  Filter, 
  Sliders, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronRight,
  Flame,
  Zap,
  Info
} from 'lucide-react';
import { getHazardMeta, handleHazardImageError } from '../utils/hazardMapping';
import AnimatedPriorityScore from '../components/AnimatedPriorityScore';

export default function PriorityQueuePage({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  onOpenOverrideModal,
  onNavigateTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | urgent | unverified | unresolved | unassigned

  // Filter incidents according to priority criteria: strictly show canonical active incidents
  const filtered = incidents.filter(inc => {
    if (inc.is_duplicate || inc.responseStatus === 'merged_duplicate') return false;

    const matchesSearch = 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.whyPrioritised && inc.whyPrioritised.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'urgent') return inc.priorityScore >= 80 || inc.severity === 'critical';
    if (filterType === 'unverified') return inc.verificationStatus === 'unverified';
    if (filterType === 'equity') return Boolean(inc.equity_review_flag || inc.equityReviewFlag);
    if (filterType === 'unresolved') return inc.responseStatus !== 'resolved';
    if (filterType === 'unassigned') return !inc.assignedTeam || inc.responseStatus === 'unassigned';

    return true;
  });

  // Sort by priorityScore descending (strictly honoring existing backend priority algorithm!)
  const sorted = [...filtered].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Operational Priority Queue & Scoring Breakdown
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-950/60 text-cyan-300 border border-blue-500/40">
              Multi-Signal Triage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic incident ranking combining life safety threats, civilian report reliability, density clustering, and compounding hazards.
          </p>
        </div>

        {selectedIncident && (
          <button
            onClick={onOpenOverrideModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#132238] hover:bg-[#1f3657] text-white border border-[#203550] font-medium text-xs shadow-sm transition-colors self-start sm:self-auto"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Coordinator Manual Override</span>
          </button>
        )}
      </div>

      {/* Algorithmic Transparency Explainer Banner */}
      <div className="bg-[#091629] border border-[#203550] rounded-xl p-4 text-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-300">
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
          <div>
            <strong className="text-white block font-semibold">1. Life Threat Severity</strong>
            <span className="text-[11px] text-slate-400">Hazmat, structural collapses, and rising floods receive baseline threat weighting.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
          <div>
            <strong className="text-white block font-semibold">2. Report Reliability</strong>
            <span className="text-[11px] text-slate-400">Cross-corroborated reports boost confidence; single unconfirmed reports trigger scrutiny.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
          <div>
            <strong className="text-white block font-semibold">3. Vulnerable Populations</strong>
            <span className="text-[11px] text-slate-400">Hospitals, retirement annexes, and high worker density amplify operational priority.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
          <div>
            <strong className="text-white block font-semibold">4. Human Authority</strong>
            <span className="text-[11px] text-slate-400">Lead coordinators retain full authority to override scores with audit trail logging.</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Ranked Queue (Left) + Focused Incident Deep-Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ranked List */}
        <div className="lg:col-span-7 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 flex flex-col">
          {/* Controls: Search and Quick Filters */}
          <div className="space-y-3 pb-3 border-b border-[#203550]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ranked queue by ID, sector, hazard, or reason..."
                className="w-full pl-9 pr-8 py-2 bg-[#091629] border border-[#203550] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-[#0D1B2D]"
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

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: `All Ranked (${incidents.length})` },
                { id: 'urgent', label: `Urgent (${incidents.filter(i => i.priorityScore >= 80 || i.severity === 'critical').length})` },
                { id: 'unverified', label: `Unverified (${incidents.filter(i => i.verificationStatus === 'unverified').length})` },
                { id: 'equity', label: `⚖️ Equity (${incidents.filter(i => i.equity_review_flag || i.equityReviewFlag).length})` },
                { id: 'unresolved', label: `Unresolved (${incidents.filter(i => i.responseStatus !== 'resolved').length})` },
                { id: 'unassigned', label: `Unassigned (${incidents.filter(i => !i.assignedTeam).length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterType === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[#091629] text-slate-400 border border-[#203550] hover:bg-[#132238] hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranked Queue Items */}
          <div className="divide-y divide-[#203550] max-h-[640px] overflow-y-auto pr-1">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Filter className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="font-semibold text-slate-300">No matching incidents in queue</p>
                <p className="text-slate-500 mt-1">Try broadening your search or filter</p>
              </div>
            ) : (
              sorted.map((inc, idx) => {
                const isSelected = selectedIncident?.id === inc.id;
                const rankNumber = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                const isCrit = inc.severity === 'critical';
                const hazardMeta = getHazardMeta(inc);

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3.5 transition-all cursor-pointer rounded-lg my-1 ${
                      isSelected
                        ? 'bg-[#132238] border border-cyan-500/60 shadow-sm'
                        : 'hover:bg-[#091629] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                          isCrit ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' : 'bg-[#091629] text-slate-300 border border-[#203550]'
                        }`}>
                          {rankNumber}
                        </span>

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

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-200">
                              {inc.id}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                              isCrit 
                                ? 'bg-rose-950/60 text-rose-300 border-rose-500/40' 
                                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            }`}>
                              {inc.severity}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              inc.verificationStatus === 'verified'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            }`}>
                              {inc.verificationStatus}
                            </span>
                            {inc.is_duplicate && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40">
                                Merged
                              </span>
                            )}
                            {Boolean(inc.equity_review_flag || inc.equityReviewFlag) && (
                              <span 
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-500/40"
                                title={(inc.equity_reasons || inc.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                              >
                                ⚖️ Equity Review
                              </span>
                            )}
                            {((inc.report_source && inc.report_source.toLowerCase().includes('sms_forwarded')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                              <span 
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-mono"
                                data-testid="sms-source-badge"
                              >
                                📱 FORWARDED SMS
                              </span>
                            ) : ((inc.report_source && inc.report_source.toLowerCase().includes('sms')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('sms'))) ? (
                              <span 
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-950/70 text-sky-300 border border-sky-500/40 font-mono"
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
                            <span>{inc.locationName}</span>
                            <span>·</span>
                            <span>{inc.peopleAffected}</span>
                          </div>

                          {inc.whyPrioritised && (
                            <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                              "{inc.whyPrioritised}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Priority Score Gauge */}
                      <div className="flex items-center space-x-2 flex-shrink-0 pl-2">
                        <AnimatedPriorityScore
                          score={inc.priorityScore}
                          severity={inc.severity}
                          size="sm"
                          showDenominator={false}
                          showLabel={true}
                          label="Score"
                        />
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-500'
                        }`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: In-Depth Prioritization Rationale & Recommended Actions */}
        <div className="lg:col-span-5 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-4">
          {selectedIncident ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#203550]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Incident Triage Analysis
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-sm font-bold text-white">
                      {selectedIncident.id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                      selectedIncident.severity === 'critical'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    }`}>
                      {selectedIncident.severity}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Priority Score</span>
                  <span className="text-2xl font-bold font-mono text-cyan-300">
                    {selectedIncident.priorityScore}<span className="text-xs text-slate-500 font-normal">/100</span>
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-white text-sm">
                {selectedIncident.title}
              </h3>

              {/* Rationale Section */}
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                  Algorithmic Prioritization Rationale
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {selectedIncident.whyPrioritised || "Algorithmic score synthesized from multi-hazard feeds and report urgency."}
                </p>
              </div>

              {/* 5-Factor Scoring Breakdown */}
              {(() => {
                const breakdown = selectedIncident.scoring_breakdown || selectedIncident.scoringBreakdown;
                if (!breakdown) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-[#091629] border border-[#203550] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[10px] uppercase font-bold text-cyan-400">Scoring Engine Sub-Scores</span>
                      <span className="text-[11px] font-bold text-white">{selectedIncident.priorityScore} / 100</span>
                    </div>

                    {breakdown.is_overridden && (
                      <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-sans">
                        ⚠️ <strong>Coordinator Override Active</strong> · Algorithmic base: {breakdown.calculated_score}
                      </div>
                    )}

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Hazard Weight (35%):</span>
                        <span className="font-bold text-white">{breakdown.hazard_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Scale / Casualties (25%):</span>
                        <span className="font-bold text-white">{breakdown.scale_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Verification Status (20%):</span>
                        <span className="font-bold text-white">{breakdown.verification_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Location Accuracy (10%):</span>
                        <span className="font-bold text-white">{breakdown.location_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Time Recency (10%):</span>
                        <span className="font-bold text-white">{breakdown.time_sub} pts</span>
                      </div>
                      {breakdown.corroboration_boost > 0 && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>+ Corroboration Boost:</span>
                          <span className="font-bold">+{breakdown.corroboration_boost} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Compounding Risk Factors */}
              {selectedIncident.riskFactors && selectedIncident.riskFactors.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Compounding Risk Factors
                  </span>
                  <div className="space-y-1.5">
                    {selectedIncident.riskFactors.map((risk, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-[#091629] border border-[#203550] text-xs text-slate-300 flex items-start space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Coordinator Next Steps */}
              <div className="p-3.5 rounded-xl bg-[#091629] border border-[#203550] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Recommended Coordinator Next Steps
                </span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {selectedIncident.verificationStatus === 'unverified' ? (
                    <li className="font-medium text-amber-300">
                      Verify report in Verification Center prior to squad dispatch.
                    </li>
                  ) : (
                    <li className="text-emerald-300">
                      Ground truth verified. Proceed with tactical assignment.
                    </li>
                  )}
                  {!selectedIncident.assignedTeam ? (
                    <li className="text-cyan-300 font-medium">
                      Assign available response squad ({selectedIncident.sector}).
                    </li>
                  ) : (
                    <li>
                      Assigned team <strong className="text-white">{selectedIncident.assignedTeam}</strong> currently active.
                    </li>
                  )}
                  <li>Monitor local sensor telemetry for secondary breaches.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={onOpenOverrideModal}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#132238] hover:bg-[#1f3657] text-white border border-[#203550] font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Manual Override</span>
                </button>

                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>Open Full Record</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              <ListOrdered className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p>Select any incident from the ranked queue to examine its scoring breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
