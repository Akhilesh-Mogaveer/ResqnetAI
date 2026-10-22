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
        className="clay-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative select-none"
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Operational Priority Queue & Scoring Breakdown
            </h1>
            <span className="text-[11px] font-bold px-3 py-1 rounded-clay-pill bg-brand-primary/15 text-brand-primary shadow-clay-pill flex-shrink-0">
              Multi-Signal Triage
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary font-medium mt-1 leading-relaxed">
            Deterministic incident ranking combining life safety threats, civilian report reliability, density clustering, and compounding hazards.
          </p>
        </div>

        {selectedIncident && (
          <button
            onClick={onOpenOverrideModal}
            className="relative z-10 flex items-center space-x-2 px-4 py-2.5 rounded-clay-button bg-surface-elevated text-text-primary font-bold text-xs shadow-clay-button hover:translate-y-[-1px] transition-all self-start sm:self-auto cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-brand-primary" />
            <span>Coordinator Manual Override</span>
          </button>
        )}
      </div>

      {/* Algorithmic Transparency Explainer Banner */}
      <div className="clay-card p-4 sm:p-5 text-xs grid grid-cols-1 md:grid-cols-4 gap-4 text-text-secondary">
        <div className="flex items-start space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-clay-pill bg-severity-critical mt-1 flex-shrink-0 shadow-clay-pill" />
          <div>
            <strong className="text-text-primary block font-bold">1. Life Threat Severity</strong>
            <span className="text-[11px] text-text-secondary leading-relaxed">Hazmat, structural collapses, and rising floods receive baseline threat weighting.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-clay-pill bg-severity-high mt-1 flex-shrink-0 shadow-clay-pill" />
          <div>
            <strong className="text-text-primary block font-bold">2. Report Reliability</strong>
            <span className="text-[11px] text-text-secondary leading-relaxed">Cross-corroborated reports boost confidence; single unconfirmed reports trigger scrutiny.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-clay-pill bg-brand-primary mt-1 flex-shrink-0 shadow-clay-pill" />
          <div>
            <strong className="text-text-primary block font-bold">3. Vulnerable Populations</strong>
            <span className="text-[11px] text-text-secondary leading-relaxed">Hospitals, retirement annexes, and high worker density amplify operational priority.</span>
          </div>
        </div>
        <div className="flex items-start space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-clay-pill bg-purple-500 mt-1 flex-shrink-0 shadow-clay-pill" />
          <div>
            <strong className="text-text-primary block font-bold">4. Human Authority</strong>
            <span className="text-[11px] text-text-secondary leading-relaxed">Lead coordinators retain full authority to override scores with audit trail logging.</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Ranked Queue (Left) + Focused Incident Deep-Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ranked List */}
        <div className="lg:col-span-7 flex flex-col relative space-y-4">
          {/* Controls: Search and Quick Filters in Clay Card */}
          <div className="clay-card p-4 sm:p-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ranked queue by ID, sector, hazard, or reason..."
                className="w-full pl-9 pr-8 py-2 bg-surface-elevated rounded-clay-input text-xs text-text-primary placeholder:text-text-muted shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all font-sans"
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

            {/* Filter segmented track with raised clay thumb */}
            <div className="p-1 rounded-clay-card bg-[#EEF1F6] shadow-clay-inset flex flex-wrap items-center gap-1 text-xs">
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
                  className={`px-3 py-1 rounded-clay-pill text-xs transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-surface-elevated text-text-primary font-bold shadow-clay-button'
                      : 'text-text-secondary hover:text-text-primary font-medium'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranked Queue Header */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-severity-critical text-white flex items-center justify-center text-[10px] font-bold shadow-clay-button">
                !
              </span>
              <h2 className="text-sm font-bold text-text-primary">
                Ranked Emergency Queue ({sorted.length})
              </h2>
            </div>
            <span className="text-xs text-text-muted font-medium">
              Multi-criteria priority ranking
            </span>
          </div>

          {/* Ranked Queue Items */}
          <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1 pt-1">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs clay-card p-6">
                <Filter className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-60" />
                <p className="font-semibold text-text-primary">No matching incidents in queue</p>
                <p className="text-text-muted mt-1">Try broadening your search or filter</p>
              </div>
            ) : (
              sorted.map((inc, idx) => {
                const isSelected = selectedIncident?.id === inc.id;
                // Preserve sequential queue numbering (01, 02, 03...)
                const rankNumber = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                const isCrit = inc.severity === 'critical';
                const isHigh = inc.severity === 'high';

                // Top ranking styling
                const isTopRank = idx === 0 || (idx < 3 && isCrit);
                const rankBadgeStyle = isTopRank
                  ? 'bg-severity-critical text-white shadow-clay-button'
                  : 'bg-brand-primary text-white shadow-clay-button';

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`group relative p-3.5 transition-all cursor-pointer rounded-clay-card flex items-stretch gap-3 select-none ${
                      isSelected
                        ? 'clay-inset bg-surface-inset shadow-clay-inset'
                        : 'clay-card clay-card-interactive'
                    }`}
                  >
                    {/* Left Accent Dot (Pulse on Tier 1 critical only) */}
                    <div className="flex items-center justify-center flex-shrink-0 self-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isCrit ? 'bg-severity-critical' : isHigh ? 'bg-severity-high' : 'bg-severity-medium'
                      } ${idx === 0 && isCrit ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* Preserved Numbered Rank Badge on Left (01, 02, ...) */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0 self-center relative z-10">
                      <span 
                        aria-label={`Rank ${rankNumber}`}
                        className={`w-8 h-8 rounded-clay-button flex items-center justify-center font-mono font-black text-xs flex-shrink-0 select-none tracking-tight ${rankBadgeStyle}`}
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

                    {/* Middle details: ID, Badges, Title, Sector, Why Prioritized */}
                    <div className="flex-1 min-w-0 space-y-1.5 py-0.5 relative z-10">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-bold text-brand-primary tracking-wide">
                          {inc.id}
                        </span>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-clay-pill leading-none ${
                          isCrit 
                            ? 'bg-severity-critical text-white'
                            : isHigh
                            ? 'bg-severity-high text-text-primary'
                            : 'bg-severity-medium text-white'
                        }`}>
                          {inc.severity}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-clay-pill leading-none ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {inc.verificationStatus}
                        </span>

                        {inc.is_duplicate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-purple-100 text-purple-800 leading-none">
                            Merged
                          </span>
                        )}

                        {Boolean(inc.equity_review_flag || inc.equityReviewFlag) && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-purple-100 text-purple-800 leading-none"
                            title={(inc.equity_reasons || inc.equityReasons || []).join('; ') || 'Flagged for coordinator review'}
                          >
                            ⚖️ Equity Review
                          </span>
                        )}

                        {((inc.report_source && inc.report_source.toLowerCase().includes('sms_forwarded')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-emerald-100 text-emerald-800 font-mono leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 FORWARDED SMS
                          </span>
                        ) : ((inc.report_source && inc.report_source.toLowerCase().includes('sms')) || (inc.sourceSummary && inc.sourceSummary.toLowerCase().includes('sms'))) ? (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-clay-pill bg-amber-100 text-amber-900 font-mono leading-none"
                            data-testid="sms-source-badge"
                          >
                            📱 SIMULATED SMS
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xs sm:text-[13px] font-bold text-text-primary tracking-tight truncate mt-0.5">
                        {inc.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-[11px] text-text-secondary font-mono">
                        <span className="font-sans font-medium">{inc.sector}</span>
                        <span className="text-text-muted">·</span>
                        <span className="truncate">{inc.locationName}</span>
                        <span className="text-text-muted">·</span>
                        <span className="flex-shrink-0">{inc.peopleAffected}</span>
                      </div>

                      {inc.whyPrioritised && (
                        <p className="text-[11px] text-text-secondary italic line-clamp-1 mt-0.5 font-sans">
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
                          ? 'text-brand-primary translate-x-1' 
                          : 'text-text-muted group-hover:text-text-primary group-hover:translate-x-1'
                      }`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: In-Depth Prioritization Rationale & Recommended Actions */}
        <div className="lg:col-span-5 clay-card p-5 space-y-4">
          {selectedIncident ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#A3B1C6]/20">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-clay-button overflow-hidden bg-surface-elevated flex-shrink-0 shadow-clay-card">
                    <img
                      src={getHazardMeta(selectedIncident).image}
                      alt={getHazardMeta(selectedIncident).altText}
                      onError={handleHazardImageError}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-clay-button"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                      Incident Triage Analysis
                    </span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {selectedIncident.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-clay-pill shadow-clay-pill ${
                        selectedIncident.severity === 'critical'
                          ? 'bg-severity-critical/15 text-severity-critical'
                          : 'bg-severity-high/15 text-[#B45309]'
                      }`}>
                        {selectedIncident.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-text-muted font-bold block">Priority Score</span>
                  <span className="text-2xl font-black font-mono text-brand-primary">
                    {selectedIncident.priorityScore}<span className="text-xs text-text-muted font-normal">/100</span>
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-text-primary text-sm">
                {selectedIncident.title}
              </h3>

              {/* Rationale Section */}
              <div className="p-3.5 rounded-clay-button clay-inset space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary block">
                  Algorithmic Prioritization Rationale
                </span>
                <p className="text-xs text-text-secondary leading-relaxed font-sans font-medium">
                  {selectedIncident.whyPrioritised || "Algorithmic score synthesized from multi-hazard feeds and report urgency."}
                </p>
              </div>

              {/* 5-Factor Scoring Breakdown */}
              {(() => {
                const breakdown = selectedIncident.scoring_breakdown || selectedIncident.scoringBreakdown;
                if (!breakdown) return null;
                return (
                  <div className="p-3.5 rounded-clay-button clay-inset space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span className="text-[10px] uppercase font-bold text-brand-primary">Scoring Engine Sub-Scores</span>
                      <span className="text-[11px] font-bold text-text-primary">{selectedIncident.priorityScore} / 100</span>
                    </div>

                    {breakdown.is_overridden && (
                      <div className="p-2 rounded-clay-button bg-severity-high/15 text-[#B45309] shadow-clay-pill text-[10px] font-sans font-medium">
                        ⚠️ <strong>Coordinator Override Active</strong> · Algorithmic base: {breakdown.calculated_score}
                      </div>
                    )}

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="text-text-muted font-sans font-medium">Hazard Weight (35%):</span>
                        <span className="font-bold text-text-primary">{breakdown.hazard_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="text-text-muted font-sans font-medium">Scale / Casualties (25%):</span>
                        <span className="font-bold text-text-primary">{breakdown.scale_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="text-text-muted font-sans font-medium">Verification Status (20%):</span>
                        <span className="font-bold text-text-primary">{breakdown.verification_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="text-text-muted font-sans font-medium">Location Accuracy (10%):</span>
                        <span className="font-bold text-text-primary">{breakdown.location_sub} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="text-text-muted font-sans font-medium">Time Recency (10%):</span>
                        <span className="font-bold text-text-primary">{breakdown.time_sub} pts</span>
                      </div>
                      {breakdown.corroboration_boost > 0 && (
                        <div className="flex justify-between items-center text-severity-success font-bold">
                          <span>+ Corroboration Boost:</span>
                          <span>+{breakdown.corroboration_boost} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Compounding Risk Factors */}
              {selectedIncident.riskFactors && selectedIncident.riskFactors.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                    Compounding Risk Factors
                  </span>
                  <div className="space-y-1.5">
                    {selectedIncident.riskFactors.map((risk, idx) => (
                      <div key={idx} className="p-2.5 rounded-clay-button bg-surface-elevated shadow-clay-pill text-xs text-text-primary flex items-start space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-severity-high flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Coordinator Next Steps */}
              <div className="p-3.5 rounded-clay-button clay-inset space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Recommended Coordinator Next Steps
                </span>
                <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside font-medium">
                  {selectedIncident.verificationStatus === 'unverified' ? (
                    <li className="font-semibold text-[#B45309]">
                      Verify report in Verification Center prior to squad dispatch.
                    </li>
                  ) : (
                    <li className="text-severity-success font-semibold">
                      Ground truth verified. Proceed with tactical assignment.
                    </li>
                  )}
                  {!selectedIncident.assignedTeam ? (
                    <li className="text-brand-primary font-semibold">
                      Assign available response squad ({selectedIncident.sector}).
                    </li>
                  ) : (
                    <li>
                      Assigned team <strong className="text-text-primary">{selectedIncident.assignedTeam}</strong> currently active.
                    </li>
                  )}
                  <li>Monitor local sensor telemetry for secondary breaches.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={onOpenOverrideModal}
                  className="flex-1 py-2.5 px-3 rounded-clay-button bg-surface-elevated text-text-primary font-bold text-xs flex items-center justify-center space-x-1.5 shadow-clay-button hover:translate-y-[-1px] transition-all"
                >
                  <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Manual Override</span>
                </button>

                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="flex-1 py-2.5 px-3 rounded-clay-button clay-button-primary text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-clay-button hover:translate-y-[-1px] transition-all"
                >
                  <span>Open Full Record</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-text-muted text-xs">
              <ListOrdered className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-60" />
              <p>Select any incident from the ranked queue to examine its scoring breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
