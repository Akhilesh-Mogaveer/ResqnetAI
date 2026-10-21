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
      <div 
        className="relative bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.90) 0%, rgba(7, 17, 31, 0.72) 50%, rgba(9, 22, 41, 0.40) 100%), url('/images/header-priority.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Operational Priority Queue & Scoring Breakdown
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-cyan-300 border border-blue-500/50 shadow-xs">
              Multi-Signal Triage
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Deterministic incident ranking combining life safety threats, civilian report reliability, density clustering, and compounding hazards.
          </p>
        </div>

        {selectedIncident && (
          <button
            onClick={onOpenOverrideModal}
            className="relative z-10 flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#132238]/90 hover:bg-[#1f3657] text-white border border-[#203550] hover:border-cyan-500/50 font-medium text-xs shadow-md transition-colors self-start sm:self-auto cursor-pointer"
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
        {/* Left Column: Ranked List in Luminous Command Box */}
        <div className="lg:col-span-7 command-center-grid-bg rounded-2xl luminous-command-box p-4 sm:p-5 flex flex-col relative overflow-hidden">
          {/* Controls: Search and Quick Filters */}
          <div className="space-y-3.5 pb-3.5 border-b border-[#203550]/80">
            <div className="relative">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ranked queue by ID, sector, hazard, or reason..."
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    filterType === f.id
                      ? 'bg-[#00C8FF] text-slate-950 font-bold shadow-[0_0_12px_rgba(0,200,255,0.4)] border border-cyan-300'
                      : 'bg-[#07192f]/80 text-slate-300 border border-[#1a3150] hover:bg-[#0c2647] hover:border-cyan-500/50 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranked Queue Items */}
          <div className="space-y-2 max-h-[660px] overflow-y-auto pr-1 pt-2">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Filter className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="font-semibold text-slate-300">No matching incidents in queue</p>
                <p className="text-slate-500 mt-1">Try broadening your search or filter</p>
              </div>
            ) : (
              sorted.map((inc, idx) => {
                const isSelected = selectedIncident?.id === inc.id;
                // Preserve sequential queue numbering (01, 02, 03...)
                const rankNumber = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';

                // Top ranking styling: restrained red accent for #1 or critical top ranks; refined cyan for others
                const isTopRank = idx === 0 || (idx < 3 && isCrit);
                const rankBadgeStyle = isTopRank
                  ? 'bg-gradient-to-br from-[#38111e] to-[#1c080f] text-[#FF4566] border border-[#FF4566]/70 shadow-[0_0_12px_rgba(255,69,102,0.4)]'
                  : 'bg-gradient-to-br from-[#061e38] to-[#041224] text-[#00C8FF] border border-[#00C8FF]/50 shadow-[0_0_10px_rgba(0,200,255,0.22)]';

                // Neon severity vertical accent stripe
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
                    {/* 1. CRITICAL REQUIREMENT: Preserved Numbered Rank Badge on Left (01, 02, ...) */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0 self-center relative z-10">
                      <span 
                        aria-label={`Rank ${rankNumber}`}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs flex-shrink-0 select-none tracking-tight ${rankBadgeStyle}`}
                      >
                        {rankNumber}
                      </span>
                    </div>

                    {/* Accessible category image metadata (visually hidden, zero background photos) */}
                    <img
                      src={getHazardMeta(inc).image}
                      alt={getHazardMeta(inc).altText}
                      onError={handleHazardImageError}
                      loading="lazy"
                      className="sr-only"
                    />

                    {/* Left vertical severity neon accent bar */}
                    <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 relative z-10 ${leftStripeColor}`} />

                    {/* Middle details: ID, Badges, Title, Sector, Why Prioritized */}
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
                          {inc.verificationStatus}
                        </span>

                        {inc.is_duplicate && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs leading-none">
                            Merged
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
                        <span className="truncate">{inc.locationName}</span>
                        <span className="text-slate-500">·</span>
                        <span className="flex-shrink-0">{inc.peopleAffected}</span>
                      </div>

                      {inc.whyPrioritised && (
                        <p className="text-[11px] text-cyan-200/85 italic line-clamp-1 mt-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] font-sans">
                          "{inc.whyPrioritised}"
                        </p>
                      )}
                    </div>

                    {/* Right side: Priority Score Gauge & Chevron */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0 pl-2 self-center relative z-10">
                      <AnimatedPriorityScore
                        score={inc.priorityScore}
                        severity={inc.severity}
                        size="sm"
                        showDenominator={false}
                        showLabel={true}
                        label="Score"
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

        {/* Right Column: In-Depth Prioritization Rationale & Recommended Actions */}
        <div className="lg:col-span-5 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-4">
          {selectedIncident ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#203550]">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#203550] bg-[#07111F] flex-shrink-0 shadow-md">
                    <img
                      src={getHazardMeta(selectedIncident).image}
                      alt={getHazardMeta(selectedIncident).altText}
                      onError={handleHazardImageError}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="min-w-0">
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
