import React, { useState } from 'react';
import DuplicateSuggestionsCard from './DuplicateSuggestionsCard';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Radio,
  AlertTriangle,
  Send,
  Sliders,
  FileText,
  Copy,
  Check,
  Crosshair,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { getHazardMeta, handleHazardImageError } from '../utils/hazardMapping';
import AnimatedPriorityScore from './AnimatedPriorityScore';

export default function IncidentDetailPanel({
  incident,
  onVerifyStatusChange,
  onResponseStatusChange,
  onAssignTeam,
  onOpenOverrideModal,
  onAddNote,
  onDuplicateMerged,
  onDuplicateDismissed,
  onShowToast,
  onSelectIncident,
  responseTeams = []
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  if (!incident) {
    return (
      <div className="clay-card p-8 flex flex-col items-center justify-center text-center h-[540px]">
        <div className="w-12 h-12 rounded-clay-button bg-[#EEF1F6] shadow-clay-pill flex items-center justify-center text-brand-primary mb-3">
          <Crosshair className="w-6 h-6 text-brand-primary" />
        </div>
        <h3 className="text-sm font-bold text-text-primary mb-1">No Incident Selected</h3>
        <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
          Select an incident from the list or live map to inspect report details, NLP classification, and verification actions.
        </p>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(incident.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote?.(incident.id, newNoteText);
    setNewNoteText('');
  };

  const getSeverityBadgeClass = (severity) => {
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

  const hazardMeta = getHazardMeta(incident);

  return (
    <div className="clay-card p-5 flex flex-col h-[600px] overflow-hidden">
      {/* Panel Header with resolved hazard category backdrop */}
      <div 
        className="pb-3 border-b border-[#A3B1C6]/20 -mx-5 -mt-5 p-5 mb-1 rounded-t-clay-card relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(245, 247, 251, 0.96) 0%, rgba(245, 247, 251, 0.88) 55%, rgba(245, 247, 251, 0.6) 100%), url('${hazardMeta.image}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            {/* Category Thumbnail Image with 16px Clay-Inset Framing */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 p-1 bg-surface-inset rounded-[16px] shadow-clay-inset flex-shrink-0">
              <img 
                src={hazardMeta.image} 
                alt={hazardMeta.altText} 
                onError={handleHazardImageError}
                loading="lazy"
                className="w-full h-full object-cover rounded-[12px]"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-brand-primary">
                  {incident.id}
                </span>
                <button
                  onClick={handleCopyId}
                  title="Copy Incident ID"
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-severity-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-text-muted">·</span>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-clay-pill ${getSeverityBadgeClass(incident.severity)}`}>
                  {incident.severity}
                </span>
              </div>

              <h3 className="text-sm font-bold text-text-primary tracking-tight mt-1 truncate">
                {incident.title}
              </h3>

            <div className="flex items-center space-x-2 text-[11px] text-text-secondary mt-1">
              <MapPin className="w-3 h-3 text-brand-primary flex-shrink-0" />
              <span className="font-semibold text-text-primary">{incident.sector}</span>
              <span className="text-text-muted">·</span>
              <span className="truncate">{incident.locationName}</span>
              <span className="text-text-muted">·</span>
              <span className="font-mono text-text-secondary">{incident.timeAgo}</span>
            </div>

            {/* Location Provenance Badges in clay-inset well (Exact text asserted in PriorityAudits.test.jsx) */}
            <div className="clay-inset p-2 rounded-clay-button flex items-center space-x-2 text-[10px] font-mono mt-2 flex-wrap gap-y-1 shadow-clay-inset">
              {!incident.coordinates || incident.coordinates.length < 2 ? (
                <span className="px-2.5 py-0.5 rounded-clay-pill bg-severity-high/20 text-[#9A3412] font-bold">
                  ⚠️ Coordinates Unknown (Unmatched Location)
                </span>
              ) : incident.is_synthetic_location ? (
                <span className="px-2.5 py-0.5 rounded-clay-pill bg-purple-500/20 text-purple-700 font-bold" title="Synthetic demo coordinates generated for simulation">
                  🧪 Demo / Synthetic Coords ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              ) : incident.location_source === 'user_input' ? (
                <span className="px-2.5 py-0.5 rounded-clay-pill bg-severity-success/20 text-[#166534] font-bold">
                  📍 User GPS ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/20 text-brand-primary font-bold">
                  🗺️ Geocoded ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              )}

              {((incident.report_source && incident.report_source.toLowerCase().includes('sms_forwarded')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('forwarded'))) ? (
                <span 
                  className="px-2.5 py-0.5 rounded-clay-pill bg-severity-success/20 text-[#166534] font-bold"
                  data-testid="sms-source-badge"
                >
                  📱 FORWARDED SMS
                </span>
              ) : ((incident.report_source && incident.report_source.toLowerCase().includes('sms')) || (incident.sourceSummary && incident.sourceSummary.toLowerCase().includes('sms'))) ? (
                <span 
                  className="px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/20 text-brand-primary font-bold"
                  data-testid="sms-source-badge"
                >
                  📱 SIMULATED SMS
                </span>
              ) : null}
            </div>
          </div>
        </div>

          {/* Priority Override Button */}
          <button
            onClick={() => onOpenOverrideModal?.(incident)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-surface-elevated text-text-primary shadow-clay-button hover:translate-y-[-1px] text-xs font-semibold transition-all flex-shrink-0"
            title="Record an authorized coordinator priority override"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-primary" />
            <span>Override</span>
          </button>
        </div>
      </div>

      {/* Scrollable Detail Body */}
      <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
        {/* Equity Review Alert Banner */}
        {Boolean(incident.equity_review_flag || incident.equityReviewFlag) && (
          <div 
            data-testid="equity-review-banner"
            className="p-3.5 rounded-clay-button bg-brand-primary/10 border border-brand-primary/20 text-xs text-text-primary space-y-1.5 shadow-clay-card"
          >
            <div className="flex items-center space-x-2 text-brand-primary font-bold">
              <span className="px-2 py-0.5 rounded-clay-pill bg-brand-primary/20 text-[10px] font-mono shadow-clay-pill">
                ⚖️ EQUITY REVIEW REQUIRED
              </span>
              <span className="text-[11px] font-semibold text-text-secondary">
                Low-Information Emergency Safeguard
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              This incident exhibits high potential need but suffers from information barriers. Coordinators are prompted to review ground truth before deprioritizing.
            </p>
            {(incident.equity_reasons || incident.equityReasons || []).length > 0 && (
              <div className="space-y-1 pt-1 border-t border-brand-primary/15 mt-1">
                {(incident.equity_reasons || incident.equityReasons || []).map((reason, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-[11px] text-[#B45309] font-mono">
                    <span className="text-severity-high flex-shrink-0">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4 Metric Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Priority Score */}
          <div className="clay-inset p-3 rounded-clay-button flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase text-text-muted mb-0.5">
              Priority Score
            </div>
            <div className={`text-xl font-mono font-extrabold ${
              incident.priorityScore >= 85 ? 'text-severity-critical' :
              incident.priorityScore >= 70 ? 'text-severity-high' : 'text-brand-primary'
            }`}>
              {incident.priorityScore}
            </div>
            <div className="w-full bg-[#DDE3EC] h-1.5 rounded-clay-pill mt-1.5 overflow-hidden shadow-inner">
              <div
                style={{ width: `${Math.min(100, Math.max(0, incident.priorityScore))}%` }}
                className={`h-full transition-all ${
                  incident.priorityScore >= 85 ? 'bg-severity-critical' :
                  incident.priorityScore >= 70 ? 'bg-severity-high' : 'bg-brand-primary'
                }`}
              />
            </div>
          </div>

          {/* Report Reliability */}
          <div className="clay-inset p-3 rounded-clay-button flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase text-text-muted mb-0.5">
              Reliability
            </div>
            <div className="text-xl font-mono font-extrabold text-text-primary">
              {incident.reportReliability}%
            </div>
            <div className="text-[10px] text-text-secondary mt-1 truncate">
              Corroborated
            </div>
          </div>

          {/* Location Confidence (Asserted strings preserved) */}
          <div className="clay-inset p-3 rounded-clay-button flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase text-text-muted mb-0.5">
              Loc Confidence
            </div>
            <div className={`text-xl font-mono font-extrabold ${
              !incident.coordinates || incident.coordinates.length < 2
                ? 'text-text-muted'
                : 'text-text-primary'
            }`}>
              {!incident.coordinates || incident.coordinates.length < 2 ? 'N/A' : `${incident.locationConfidence}%`}
            </div>
            <div className="text-[10px] text-text-secondary mt-1 truncate">
              {!incident.coordinates || incident.coordinates.length < 2
                ? 'Unmapped / Unknown'
                : incident.is_synthetic_location
                ? 'Simulated Demo'
                : incident.location_source === 'user_input'
                ? 'User GPS Input'
                : 'Registry Geocoded'}
            </div>
          </div>

          {/* People Affected */}
          <div className="clay-inset p-3 rounded-clay-button flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase text-text-muted mb-0.5">
              People Affected
            </div>
            <div className="text-sm font-mono font-bold text-text-primary truncate mt-1">
              {incident.peopleAffected ? incident.peopleAffected.split(' ')[0] : 'Unknown'}
            </div>
            <div className="text-[10px] text-text-secondary mt-1 truncate">
              Estimated count
            </div>
          </div>
        </div>

        {/* HumAID NLP Categorization & Original Report Narrative (Section as clay-card) */}
        {(incident.humaid_category || incident.report_text) && (
          <div className="clay-card p-3.5 space-y-2.5 select-none">
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary mb-1">
              <span className="flex items-center space-x-1.5 text-brand-primary font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>HumAID NLP Categorization (Situational Need)</span>
              </span>
              {incident.nlp_status !== 'MODEL_UNAVAILABLE' &&
                incident.nlp_status !== 'INFERENCE_ERROR' &&
                incident.humaid_confidence !== undefined &&
                incident.humaid_confidence !== null ? (
                <span className="px-2.5 py-0.5 rounded-clay-pill bg-brand-50 text-brand-primary font-bold text-[10px] shadow-clay-pill font-mono">
                  {(incident.humaid_confidence * 100).toFixed(1)}% Model Confidence
                </span>
              ) : (
                <span className="text-[10px] text-text-muted font-mono">Confidence Unknown</span>
              )}
            </div>

            {incident.nlp_status === 'MODEL_UNAVAILABLE' || incident.nlp_status === 'INFERENCE_ERROR' ? (
              <div className="mb-2 text-[10px] text-severity-high italic">
                HumAID classification unavailable: {incident.nlp_status === 'INFERENCE_ERROR' ? 'inference failed' : 'model unavailable'}
              </div>
            ) : incident.humaid_category ? (
              <div className="mb-2">
                <span className="text-[10px] text-text-secondary block mb-0.5 font-medium">Predicted Humanitarian Category:</span>
                <span className="inline-block px-3 py-1 rounded-clay-pill bg-surface-elevated text-brand-primary font-bold text-xs shadow-clay-pill tracking-wide">
                  {incident.humaid_category.replace(/_/g, ' ')}
                </span>
              </div>
            ) : (
              <div className="mb-2 text-[10px] text-text-muted italic">
                HumAID classification: Unclassified / General Emergency
              </div>
            )}

            {/* Clay-inset well for raw report text */}
            {incident.report_text && (
              <div className="text-[11px] text-text-primary clay-inset p-3 rounded-clay-button shadow-clay-inset leading-relaxed font-sans">
                <span className="text-[10px] text-text-muted uppercase block mb-1 font-bold">Report Narrative:</span>
                "{incident.report_text}"
              </div>
            )}

            <div className="mt-2 text-[10px] text-text-secondary bg-[#EEF1F6] p-2.5 rounded-clay-button shadow-clay-inset">
              * Automated triage suggestion only. Model classification confidence reflects text pattern likelihood and does NOT prove that a report is factually true or verified. Verification and dispatch decisions remain strictly human-in-the-loop.
            </div>
          </div>
        )}

        {/* Explainable Duplicate Suggestions & Corroboration */}
        <DuplicateSuggestionsCard
          incident={incident}
          onDuplicateMerged={onDuplicateMerged}
          onDuplicateDismissed={onDuplicateDismissed}
          onShowToast={onShowToast}
          onSelectIncident={onSelectIncident}
        />

        {/* Operational State Management Controls (Section as clay-card) */}
        <div className="clay-card p-3.5 space-y-3 select-none">
          <div className="text-xs font-bold text-text-primary flex items-center justify-between">
            <span>Operational State Management</span>
            <span className="text-[#B45309] text-[10px] font-semibold bg-severity-high-soft px-2 py-0.5 rounded-clay-pill shadow-clay-pill">
              Verification ≠ Response
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Control 1: Verification Status */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Report Verification
              </label>
              <select
                value={incident.verificationStatus}
                onChange={(e) => onVerifyStatusChange?.(incident.id, e.target.value)}
                className="w-full bg-[#EEF1F6] shadow-clay-inset rounded-clay-input px-3 py-2 text-xs text-text-primary font-medium focus:outline-none cursor-pointer"
              >
                <option value="unverified">⚠️ Unverified (Needs Check)</option>
                <option value="under_review">🔍 Under Review</option>
                <option value="verified">✅ Verified (Ground Truth)</option>
                <option value="disputed">❌ Disputed / False Report</option>
              </select>
            </div>

            {/* Control 2: Response Status */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Response Lifecycle
              </label>
              <select
                value={incident.responseStatus}
                onChange={(e) => onResponseStatusChange?.(incident.id, e.target.value)}
                className="w-full bg-[#EEF1F6] shadow-clay-inset rounded-clay-input px-3 py-2 text-xs text-text-primary font-medium focus:outline-none cursor-pointer"
              >
                <option value="unassigned">⏳ Unassigned</option>
                <option value="triage">📋 Triage / Standby</option>
                <option value="dispatched">🚨 Dispatched</option>
                <option value="on_scene">📍 On Scene</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
            </div>
          </div>

          {/* Control 3: Team Assignment (Exact label asserted in PriorityAudits.test.jsx) */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Assigned Response Team (Demo Fleet Roster)
            </label>
            <select
              value={incident.assignedTeam || ''}
              onChange={(e) => onAssignTeam?.(incident.id, e.target.value || null)}
              className="w-full bg-[#EEF1F6] shadow-clay-inset rounded-clay-input px-3 py-2 text-xs text-text-primary font-medium focus:outline-none cursor-pointer"
            >
              <option value="">-- No Team Assigned --</option>
              {responseTeams.map(team => (
                <option key={team.id} value={team.name}>
                  {team.name} ({team.type}) - {team.status} [Simulated]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority Score Breakdown (5-Factor Engine, Section as clay-card) */}
        <div className="clay-card p-3.5 space-y-2.5 select-none">
          <div className="flex items-center justify-between text-xs font-bold text-text-primary">
            <span className="flex items-center space-x-1.5 text-brand-primary font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Priority Score Breakdown (5-Factor Engine)</span>
            </span>
            <span className="font-mono text-xs font-black text-brand-primary">
              {incident.priorityScore} / 100
            </span>
          </div>

          {(() => {
            const breakdown = incident.scoring_breakdown || incident.scoringBreakdown;
            if (breakdown) {
              return (
                <div className="space-y-2 pt-1 text-[11px]">
                  {breakdown.is_overridden && (
                    <div className="p-2.5 rounded-clay-button bg-severity-high-soft text-[#B45309] shadow-clay-pill text-[11px] flex items-center justify-between font-medium">
                      <span className="font-bold">⚠️ Manual Coordinator Override Active</span>
                      <span className="font-mono font-bold">Effective: {incident.priorityScore} (Algorithmic: {breakdown.calculated_score})</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    <div className="p-2 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between">
                      <span className="text-text-secondary font-sans font-medium">1. Hazard Impact ({((breakdown.weights?.hazard ?? 0.35) * 100).toFixed(0)}%):</span>
                      <span className="text-text-primary font-bold">{breakdown.hazard_sub} pts <span className="text-[10px] text-text-muted font-normal">({breakdown.hazard_raw})</span></span>
                    </div>
                    <div className="p-2 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between">
                      <span className="text-text-secondary font-sans font-medium">2. Scale / Casualties ({((breakdown.weights?.scale ?? 0.25) * 100).toFixed(0)}%):</span>
                      <span className="text-text-primary font-bold">{breakdown.scale_sub} pts <span className="text-[10px] text-text-muted font-normal">({breakdown.scale_raw})</span></span>
                    </div>
                    <div className="p-2 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between">
                      <span className="text-text-secondary font-sans font-medium">3. Verification ({((breakdown.weights?.verification ?? 0.20) * 100).toFixed(0)}%):</span>
                      <span className="text-text-primary font-bold">{breakdown.verification_sub} pts <span className="text-[10px] text-text-muted font-normal">({breakdown.verification_raw})</span></span>
                    </div>
                    <div className="p-2 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between">
                      <span className="text-text-secondary font-sans font-medium">4. Location Precision ({((breakdown.weights?.location ?? 0.10) * 100).toFixed(0)}%):</span>
                      <span className="text-text-primary font-bold">{breakdown.location_sub} pts <span className="text-[10px] text-text-muted font-normal">({breakdown.location_raw})</span></span>
                    </div>
                    <div className="p-2 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between">
                      <span className="text-text-secondary font-sans font-medium">5. Time Recency ({((breakdown.weights?.time ?? 0.10) * 100).toFixed(0)}%):</span>
                      <span className="text-text-primary font-bold">{breakdown.time_sub} pts <span className="text-[10px] text-text-muted font-normal">({breakdown.time_raw})</span></span>
                    </div>
                    {breakdown.corroboration_boost > 0 && (
                      <div className="p-2 rounded-clay-button bg-severity-success-soft shadow-clay-pill flex items-center justify-between text-severity-success font-bold">
                        <span>+ Corroboration Boost:</span>
                        <span>+{breakdown.corroboration_boost} pts</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono pt-1.5 border-t border-[#A3B1C6]/20 flex items-center justify-between">
                    <span>Algorithmic Base: <strong className="text-brand-primary">{breakdown.calculated_score}</strong> / 100</span>
                    <span>Status: <strong className="text-text-primary">{incident.verificationStatus?.toUpperCase() || 'UNVERIFIED'}</strong></span>
                  </div>
                </div>
              );
            }
            return (
              <div className="text-[11px] text-text-secondary font-mono">
                Computed dynamically by the backend 5-factor scoring engine (Hazard 35%, Scale 25%, Verification 20%, Location 10%, Time 10%).
              </div>
            );
          })()}
        </div>

        {/* Priority Explanation (Section as clay-card) */}
        <div className="clay-card p-3.5 space-y-2 select-none">
          <div className="text-xs font-bold text-text-primary mb-1 flex items-center justify-between">
            <span>Why it was prioritised</span>
            <span className="text-brand-primary text-[10px] font-mono font-bold">Triage Factors</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            {incident.whyPrioritised}
          </p>

          {incident.riskFactors && incident.riskFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#A3B1C6]/20">
              <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Compounding Risk Factors:</div>
              <ul className="space-y-1">
                {incident.riskFactors.map((rf, idx) => (
                  <li key={idx} className="text-[11px] text-text-primary flex items-start space-x-1.5 font-medium">
                    <span className="text-severity-critical font-bold mt-0.5">•</span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Coordinator Field Notes (Section as clay-card) */}
        <div className="clay-card p-3.5 space-y-2.5 select-none">
          <div className="text-xs font-bold text-text-primary mb-2">
            Field & Coordinator Notes ({incident.notes?.length || 0})
          </div>

          {incident.notes && incident.notes.length > 0 ? (
            <div className="space-y-2 mb-3">
              {incident.notes.map((n) => (
                <div key={n.id} className="p-2.5 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset text-xs">
                  <div className="flex items-center justify-between text-text-secondary text-[10px] mb-0.5">
                    <span className="text-brand-primary font-bold">{n.author}</span>
                    <span className="font-mono text-text-muted">{n.time}</span>
                  </div>
                  <div className="text-text-primary font-medium">{n.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted italic mb-2">
              No coordinator notes recorded yet.
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleNoteSubmit} className="flex space-x-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add situational update or ground note..."
              className="flex-1 bg-[#EEF1F6] shadow-clay-inset rounded-clay-input px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 clay-button-primary text-white font-semibold rounded-clay-button text-xs transition-all shadow-clay-button cursor-pointer"
            >
              Add Note
            </button>
          </form>
        </div>
      </div>

      {/* Action Footer: Semantic Tinted Clay Buttons */}
      <div className="pt-3 border-t border-[#A3B1C6]/20 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center space-x-2">
          {/* Verify button: semantic success tint */}
          <button
            type="button"
            onClick={() => onVerifyStatusChange?.(
              incident.id,
              incident.verificationStatus === 'verified' ? 'unverified' : 'verified'
            )}
            className={`px-3.5 py-2 rounded-clay-button font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              incident.verificationStatus === 'verified'
                ? 'clay-button-warning'
                : 'clay-button-success'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{incident.verificationStatus === 'verified' ? 'Mark Unverified' : 'Verify Report'}</span>
          </button>

          {/* Dispute button: semantic high/warning tint */}
          <button
            type="button"
            onClick={() => onVerifyStatusChange?.(incident.id, 'disputed')}
            className="px-3.5 py-2 rounded-clay-button font-bold transition-all flex items-center space-x-1.5 cursor-pointer clay-button-warning"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dispute</span>
          </button>
        </div>

        {/* Dispatch/Resolve button: semantic tints (resolve = primary, reopen = critical) */}
        <button
          type="button"
          onClick={() => onResponseStatusChange?.(
            incident.id,
            incident.responseStatus === 'resolved' ? 'dispatched' : 'resolved'
          )}
          className={`px-3.5 py-2 rounded-clay-button font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            incident.responseStatus === 'resolved'
              ? 'clay-button-critical'
              : 'clay-button-primary'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{incident.responseStatus === 'resolved' ? 'Reopen Incident' : 'Mark Resolved'}</span>
        </button>
      </div>
    </div>
  );
}
