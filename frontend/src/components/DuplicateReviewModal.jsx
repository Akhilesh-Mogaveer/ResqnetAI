import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  X,
  AlertTriangle,
  MapPin,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function DuplicateReviewModal({
  isOpen,
  onClose,
  primaryIncident,
  candidateSuggestion,
  onConfirmMerge
}) {
  const [operator, setOperator] = useState('Coordinator Jordan Davis');
  const [reason, setReason] = useState('Corroborated distress report merged into primary incident after human review.');
  const [updateCorroboration, setUpdateCorroboration] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState(primaryIncident?.id);

  useEffect(() => {
    if (primaryIncident?.id) {
      setSelectedPrimaryId(primaryIncident.id);
    }
  }, [primaryIncident?.id, candidateSuggestion?.id]);

  if (!isOpen || !primaryIncident || !candidateSuggestion) return null;

  const cand = candidateSuggestion;
  const candInc = cand.candidate_incident || {};
  const candidateId = cand.candidate_incident_id || cand.candidate_id;

  // Coordinator chooses which incident is the surviving primary record
  const isCandidatePrimary = selectedPrimaryId === candidateId;
  const activePrimaryId = isCandidatePrimary ? candidateId : primaryIncident.id;
  const activeDuplicateId = isCandidatePrimary ? primaryIncident.id : candidateId;

  const handleMerge = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirmMerge({
        primaryIncidentId: activePrimaryId,
        duplicateIncidentId: activeDuplicateId,
        operator,
        reason: reason.trim(),
        updateCorroboration,
        suggestionId: cand.id,
      });
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to authorize merge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2A3C]/35 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-elevated rounded-clay-modal max-w-3xl w-full p-6 shadow-clay-modal relative max-h-[90vh] overflow-y-auto border-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-card transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2 text-severity-high font-mono text-xs uppercase tracking-wider mb-1 font-bold">
          <GitMerge className="w-4 h-4 text-severity-high" />
          <span>Human-in-the-Loop Duplicate Review</span>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-1">
          Review & Corroborate Candidate Report
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Compare reports side-by-side, confirm the primary incident, and authorize merge. Merging links duplicate records, retains original report narrative provenance in SQLite, and writes coordinator authorization to the audit trail.
        </p>

        {/* Explainability Signal Strip */}
        <div className="bg-surface-card rounded-clay-card shadow-clay-card p-4 mb-4 border-none">
          <div className="flex items-center justify-between text-xs font-mono mb-2.5">
            <span className="text-text-primary font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>Multi-Signal Similarity Score:</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-clay-pill font-bold text-xs shadow-clay-pill ${
              cand.overall_score >= 75 ? 'bg-severity-critical-soft text-severity-critical' :
              cand.overall_score >= 50 ? 'bg-severity-high-soft text-severity-high' :
              'bg-brand-primary/10 text-brand-primary'
            }`}>
              {cand.overall_score}% Match ({cand.confidence_level} Confidence)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="bg-surface-card p-2.5 rounded-clay-card shadow-clay-button border-none">
              <span className="text-text-muted block text-[9px] uppercase font-semibold">Distance</span>
              <span className="text-text-primary font-bold">{cand.distance_km} km</span>
            </div>
            <div className="bg-surface-card p-2.5 rounded-clay-card shadow-clay-button border-none">
              <span className="text-text-muted block text-[9px] uppercase font-semibold">Time Delta</span>
              <span className="text-text-primary font-bold">{Math.round(cand.time_diff_minutes)} mins</span>
            </div>
            <div className="bg-surface-card p-2.5 rounded-clay-card shadow-clay-button border-none">
              <span className="text-text-muted block text-[9px] uppercase font-semibold">Text Overlap</span>
              <span className="text-text-primary font-bold">{Math.round(cand.text_similarity * 100)}%</span>
            </div>
            <div className="bg-surface-card p-2.5 rounded-clay-card shadow-clay-button border-none">
              <span className="text-text-muted block text-[9px] uppercase font-semibold">Category</span>
              <span className={cand.category_match ? 'text-emerald-700 font-bold' : 'text-text-muted'}>
                {cand.category_match ? 'Matched' : 'Different'}
              </span>
            </div>
          </div>

          {cand.reasons && cand.reasons.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-black/5">
              <span className="text-[10px] font-mono text-text-muted uppercase block mb-1 font-bold">Explainability Reasons:</span>
              <ul className="space-y-1">
                {cand.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex items-start space-x-1.5">
                    <span className="text-brand-primary mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Primary Record Selection Step */}
        <div className="bg-surface-inset rounded-clay-card shadow-clay-inset p-4 mb-4 border-none">
          <div className="text-xs font-mono text-text-primary font-semibold mb-2.5 flex items-center justify-between">
            <span>Select Primary Record (Remains Active & Retains Corroboration):</span>
            <span className="text-[10px] text-brand-primary font-mono font-bold">Coordinator Decision Step</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPrimaryId(primaryIncident.id)}
              className={`p-3.5 rounded-clay-card text-left transition-all relative cursor-pointer active:shadow-clay-inset ${
                selectedPrimaryId === primaryIncident.id
                  ? 'bg-surface-elevated shadow-clay-card border-l-4 border-l-brand-primary'
                  : 'bg-surface-card shadow-clay-button text-text-secondary hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                <span className="font-bold text-brand-primary">{primaryIncident.id}</span>
                {selectedPrimaryId === primaryIncident.id ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white font-bold shadow-clay-pill">
                    PRIMARY RECORD
                  </span>
                ) : (
                  <span className="text-text-muted text-[9px]">Click to set Primary</span>
                )}
              </div>
              <div className="font-bold text-text-primary text-xs truncate">{primaryIncident.title}</div>
              <div className="text-[10px] text-text-muted font-mono mt-1">
                Sector: {primaryIncident.sector} · Priority: {primaryIncident.priorityScore}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPrimaryId(candidateId)}
              className={`p-3.5 rounded-clay-card text-left transition-all relative cursor-pointer active:shadow-clay-inset ${
                selectedPrimaryId === candidateId
                  ? 'bg-surface-elevated shadow-clay-card border-l-4 border-l-brand-primary'
                  : 'bg-surface-card shadow-clay-button text-text-secondary hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                <span className="font-bold text-amber-700">{candidateId}</span>
                {selectedPrimaryId === candidateId ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white font-bold shadow-clay-pill">
                    PRIMARY RECORD
                  </span>
                ) : (
                  <span className="text-text-muted text-[9px]">Click to set Primary</span>
                )}
              </div>
              <div className="font-bold text-text-primary text-xs truncate">{cand.candidate_title}</div>
              <div className="text-[10px] text-text-muted font-mono mt-1">
                Sector: {cand.candidate_sector} · Priority: {candInc.priorityScore || 'N/A'}
              </div>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
          {/* Left Panel: PrimaryIncident */}
          <div className={`rounded-clay-card p-4 transition-all ${
            isCandidatePrimary
              ? 'bg-surface-card shadow-clay-button border-l-4 border-l-amber-500'
              : 'bg-surface-elevated shadow-clay-card border-l-4 border-l-brand-primary'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-mono text-[10px] font-bold ${
                isCandidatePrimary ? 'text-amber-700' : 'text-brand-primary'
              }`}>
                {isCandidatePrimary ? `[MERGED CANDIDATE] ${primaryIncident.id}` : `[CONFIRMED PRIMARY] ${primaryIncident.id}`}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-surface-inset text-text-secondary font-semibold">
                Score: {primaryIncident.priorityScore}
              </span>
            </div>
            <h4 className="font-bold text-text-primary text-sm mb-1">{primaryIncident.title}</h4>
            <div className="text-[11px] text-text-secondary mb-2 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-text-muted mr-1" />
              <span>{primaryIncident.sector} · {primaryIncident.locationName}</span>
            </div>

            <div className="bg-surface-inset p-3 rounded-clay-card shadow-clay-inset text-[11px] text-text-secondary font-mono mb-2">
              <span className="text-[9px] text-text-muted block mb-0.5 uppercase font-semibold">Report Narrative:</span>
              "{primaryIncident.report_text || primaryIncident.original_report_text || primaryIncident.signalSynthesis}"
            </div>

            {primaryIncident.humaid_category && (
              <div className="text-[10px] font-mono text-brand-primary font-semibold">
                HumAID: {primaryIncident.humaid_category.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          {/* Right Panel: CandidateIncident */}
          <div className={`rounded-clay-card p-4 transition-all ${
            isCandidatePrimary
              ? 'bg-surface-elevated shadow-clay-card border-l-4 border-l-brand-primary'
              : 'bg-surface-card shadow-clay-button border-l-4 border-l-amber-500'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-mono text-[10px] font-bold ${
                isCandidatePrimary ? 'text-brand-primary' : 'text-amber-700'
              }`}>
                {isCandidatePrimary ? `[CONFIRMED PRIMARY] ${candidateId}` : `[MERGED CANDIDATE] ${candidateId}`}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-surface-inset text-text-secondary font-semibold">
                {cand.candidate_severity}
              </span>
            </div>
            <h4 className="font-bold text-text-primary text-sm mb-1">{cand.candidate_title}</h4>
            <div className="text-[11px] text-text-secondary mb-2 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-text-muted mr-1" />
              <span>{cand.candidate_sector} · {candInc.locationName || 'Same Sector'}</span>
            </div>

            <div className="bg-surface-inset p-3 rounded-clay-card shadow-clay-inset text-[11px] text-text-secondary font-mono mb-2">
              <span className="text-[9px] text-text-muted block mb-0.5 uppercase font-semibold">Report Narrative:</span>
              "{candInc.report_text || candInc.original_report_text || candInc.signalSynthesis || 'Citizen distress dispatch'}"
            </div>

            {cand.candidate_category && (
              <div className="text-[10px] font-mono text-amber-700 font-semibold">
                HumAID: {cand.candidate_category.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {/* Explicit Confirmation Step Banner */}
        <div className="p-3.5 rounded-clay-card bg-brand-primary/10 shadow-clay-pill text-xs font-mono text-text-secondary mb-4 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <div>
            <span className="text-brand-primary font-bold uppercase">Merge Confirmation:</span> Report{' '}
            <strong className="text-severity-high">{activeDuplicateId}</strong> will be merged into primary record{' '}
            <strong className="text-brand-primary">{activePrimaryId}</strong>. Original report narrative and provenance will remain preserved in SQLite.
          </div>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="p-3 rounded-clay-card bg-severity-critical-soft text-severity-critical text-xs font-mono mb-4 flex items-center space-x-2 shadow-clay-pill">
            <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0" />
            <span>Error: {submitError}</span>
          </div>
        )}

        {/* Merge Authorization Form */}
        <form onSubmit={handleMerge} className="space-y-3.5 text-xs bg-surface-card rounded-clay-card shadow-clay-card p-4 border-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-text-secondary font-mono text-[11px] mb-1 font-semibold">Authorizing Coordinator *</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                required
                className="w-full bg-surface-inset rounded-clay-input shadow-clay-inset px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-mono border-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="corroborateCheck"
                checked={updateCorroboration}
                onChange={(e) => setUpdateCorroboration(e.target.checked)}
                className="rounded-md border-black/10 bg-surface-card text-brand-primary focus:ring-brand-primary/20 w-4 h-4"
              />
              <label htmlFor="corroborateCheck" className="text-text-secondary text-xs select-none font-medium">
                Boost Primary Reliability (+5% multi-source corroboration)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-mono text-[11px] mb-1 font-semibold">Audit Trail Merge Justification *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="State the operational justification for merging this duplicate report..."
              className="w-full bg-surface-inset rounded-clay-input shadow-clay-inset p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-sans border-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-[10px] font-mono text-text-muted italic">
              * Writes to immutable audit trail and marks {activeDuplicateId} as merged under {activePrimaryId}.
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary font-mono text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-clay-button clay-button-primary text-white font-bold font-mono text-xs transition-all disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Authorizing Merge...' : 'Authorize Merge'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
