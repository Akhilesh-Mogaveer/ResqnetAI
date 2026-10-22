import React, { useState, useEffect, useCallback } from 'react';
import {
  GitMerge,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Info
} from 'lucide-react';
import api from '../services/api';
import DuplicateReviewModal from './DuplicateReviewModal';

export default function DuplicateSuggestionsCard({
  incident,
  onDuplicateMerged,
  onDuplicateDismissed,
  onShowToast,
  onSelectIncident
}) {
  const [duplicates, setDuplicates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionOutcome, setActionOutcome] = useState(null);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [dismissingCandidate, setDismissingCandidate] = useState(null);
  const [dismissReason, setDismissReason] = useState('Confirmed by coordinator as separate distinct incident.');
  const [dismissOperator, setDismissOperator] = useState('Coordinator Jordan Davis');

  const [isExpanded, setIsExpanded] = useState(true);

  const fetchDuplicates = useCallback(async () => {
    if (!incident?.id) return;
    // Merged duplicates cannot have active duplicate suggestions
    if (incident.is_duplicate || incident.responseStatus === 'merged_duplicate') {
      setDuplicates([]);
      return;
    }

    setIsLoading(true);
    setActionError(null);
    try {
      const data = await api.getIncidentDuplicates(incident.id);
      setDuplicates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not fetch duplicate suggestions:", err.message);
      setActionError(`Could not scan duplicates: ${err.message}`);
      setDuplicates([]);
    } finally {
      setIsLoading(false);
    }
  }, [incident]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  // Open the side-by-side review modal
  const handleOpenReview = (candidate) => {
    setSelectedCandidate(candidate);
    setIsReviewModalOpen(true);
  };

  // Authorize merge through review modal
  const handleConfirmMerge = async ({ primaryIncidentId, duplicateIncidentId, operator, reason, updateCorroboration, suggestionId }) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const mergeResponse = await api.mergeDuplicate(primaryIncidentId, {
        primaryIncidentId,
        duplicateIncidentId,
        operator,
        reason,
        updateCorroboration,
        suggestionId,
      });

      const outcomeMsg = mergeResponse.message || `Merge recorded: Incident ${duplicateIncidentId} merged into primary record ${primaryIncidentId}.`;

      setActionOutcome({
        type: 'merge',
        message: outcomeMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      onShowToast?.(outcomeMsg, 'success');

      // Notify parent app of updated incident state
      onDuplicateMerged?.({
        primaryId: primaryIncidentId,
        duplicateId: duplicateIncidentId,
        updatedPrimary: mergeResponse.primary_incident || mergeResponse,
        updatedDuplicate: mergeResponse.duplicate_incident || mergeResponse.merged_incident,
      });

      // Refetch updated backend suggestions
      await fetchDuplicates();
    } catch (err) {
      console.error("Merge error:", err);
      const errorMsg = `Merge authorization failed: ${err.message}`;
      setActionError(errorMsg);
      onShowToast?.(errorMsg, 'alert');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Open dismissal confirmation
  const handleOpenDismiss = (candidate) => {
    setDismissingCandidate(candidate);
    setDismissReason('Confirmed by coordinator as separate distinct incident.');
  };

  // Authorize dismissal
  const handleExecuteDismiss = async (e) => {
    e.preventDefault();
    if (!dismissingCandidate || !dismissReason.trim()) return;

    const candidateId = dismissingCandidate.candidate_incident_id || dismissingCandidate.candidate_id;
    setActionLoading(true);
    setActionError(null);

    try {
      const dismissResponse = await api.dismissDuplicate(incident.id, {
        duplicateIncidentId: candidateId,
        operator: dismissOperator,
        reason: dismissReason.trim(),
      });

      const outcomeMsg = dismissResponse.message || `Suggestion dismissed: Candidate ${candidateId} confirmed as distinct event.`;

      setActionOutcome({
        type: 'dismiss',
        message: outcomeMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      onShowToast?.(outcomeMsg, 'info');

      // Notify parent app of dismissal
      onDuplicateDismissed?.({
        primaryId: incident.id,
        candidateId,
        updatedPrimary: dismissResponse,
      });

      setDismissingCandidate(null);
      // Refetch updated backend suggestions
      await fetchDuplicates();
    } catch (err) {
      console.error("Dismiss error:", err);
      const errorMsg = `Dismissal failed: ${err.message}`;
      setActionError(errorMsg);
      onShowToast?.(errorMsg, 'alert');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="bg-[#EEF1F6] rounded-clay-card p-4 shadow-clay-inset select-none">
        {/* Card Header */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider font-bold mb-2.5">
          <div className="flex items-center space-x-1.5 text-text-primary">
            <GitMerge className="w-4 h-4 text-severity-high" />
            <span>Duplicate Detection & Signal Corroboration</span>
          </div>

          <div className="flex items-center space-x-2">
            {duplicates.length > 0 && !incident.is_duplicate && (
              <span className="px-2.5 py-0.5 rounded-clay-pill bg-severity-high-soft text-[#B45309] text-[10px] font-bold shadow-clay-pill">
                {duplicates.length} Suggested
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-text-muted hover:text-text-primary p-0.5 rounded-clay-button hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {/* 1. Incident is already a merged duplicate */}
            {incident.is_duplicate ? (
              <div className="p-3.5 rounded-clay-card bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-start space-x-2">
                  <GitMerge className="w-4 h-4 text-severity-high flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950 font-mono uppercase text-[11px]">
                      Merged Duplicate Report
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      This report was corroborated and merged into primary record{' '}
                      <strong className="text-amber-950 font-mono font-bold">{incident.duplicate_of_id}</strong>. Original narrative and provenance remain preserved.
                    </div>
                  </div>
                </div>
                {onSelectIncident && incident.duplicate_of_id && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(incident.duplicate_of_id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-[#B45309] hover:bg-amber-800 text-white font-mono text-[10px] shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
                  >
                    <span>View Primary Incident ({incident.duplicate_of_id})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : null}

            {/* 2. Action Outcome Banner (Merge Recorded or Suggestion Dismissed) */}
            {actionOutcome && (
              <div className="p-3 rounded-clay-card bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start justify-between font-mono animate-fadeIn">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 uppercase">
                      {actionOutcome.type === 'merge' ? 'Merge Recorded:' : 'Suggestion Dismissed:'}
                    </span>{' '}
                    <span>{actionOutcome.message}</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      Logged at {actionOutcome.timestamp} · Audit trail recorded
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionOutcome(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 3. Action Error Banner */}
            {actionError && (
              <div className="p-3 rounded-clay-card bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-start justify-between font-mono">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-700 hover:text-rose-950 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 4. Loading Indicators */}
            {isLoading || actionLoading ? (
              <div className="py-3 flex items-center justify-center space-x-2 text-[11px] text-text-muted font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                <span>{actionLoading ? 'Persisting coordinator action...' : 'Scanning spatial & text signals for redundancies...'}</span>
              </div>
            ) : !incident.is_duplicate && duplicates.length === 0 ? (
              /* 5. Genuinely No Redundant Reports Detected */
              <div className="flex items-center space-x-2 p-3 rounded-clay-card bg-surface-card shadow-clay-card text-[11px] text-text-secondary">
                <CheckCircle className="w-4 h-4 text-severity-success flex-shrink-0" />
                <span>
                  {actionOutcome
                    ? 'All candidate reports for this incident have been reviewed and resolved.'
                    : 'No redundant reports detected. Signal analysis confirms unique incident signature.'}
                </span>
              </div>
            ) : !incident.is_duplicate && (
              /* 6. Active Duplicate Candidates List */
              <div className="space-y-2.5">
                <div className="text-[10px] text-[#B45309] font-mono font-semibold">
                  ⚠️ Potential duplicate reports detected. Review evidence before corroborating:
                </div>

                {duplicates.map((cand) => {
                  const candidateId = cand.candidate_incident_id || cand.candidate_id;
                  const suggestionKey = cand.id || `dup-${incident.id}-${candidateId}`;

                  return (
                    <div
                      key={suggestionKey}
                      className="p-3.5 rounded-clay-card clay-card text-[11px] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2 font-mono text-[10px]">
                            <span className="text-[#B45309] font-bold">{candidateId}</span>
                            <span className="text-text-muted">·</span>
                            <span className="text-text-muted">{cand.candidate_sector}</span>
                            <span className="text-text-muted">·</span>
                            <span className="text-text-muted">{cand.candidate_time_ago}</span>
                          </div>
                          <div className="font-bold text-text-primary text-xs mt-0.5">
                            {cand.candidate_title}
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-clay-pill text-[10px] font-mono font-bold shadow-clay-pill flex-shrink-0 ${
                          cand.overall_score >= 75 ? 'bg-severity-critical-soft text-severity-critical' :
                          cand.overall_score >= 50 ? 'bg-severity-high-soft text-[#B45309]' :
                          'bg-brand-50 text-brand-primary'
                        }`}>
                          {cand.overall_score}% Match ({cand.confidence_level})
                        </span>
                      </div>

                      {/* Explainability bullets */}
                      <div className="text-[10px] text-text-secondary space-y-1 pt-1.5 border-t border-[#A3B1C6]/20">
                        {cand.reasons.slice(0, 3).map((reason, idx) => (
                          <div key={idx} className="flex items-start space-x-1.5 text-text-secondary">
                            <span className="text-brand-primary font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDismiss(cand)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-clay-button clay-button text-text-secondary text-[10px] font-mono disabled:opacity-50 cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReview(cand)}
                          disabled={actionLoading}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-clay-button clay-button-primary text-white font-bold text-[10px] font-mono disabled:opacity-50 cursor-pointer"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Review & Merge</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dismissal Confirmation Dialog */}
      {dismissingCandidate && (
        <div className="fixed inset-0 z-50 bg-[#1F2A3C]/35 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-elevated rounded-clay-modal max-w-lg w-full p-6 shadow-clay-modal relative border-none">
            <button
              type="button"
              onClick={() => setDismissingCandidate(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-card transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-[#B26A00] font-mono text-xs uppercase mb-1 font-bold">
              <AlertTriangle className="w-4 h-4 text-[#B26A00]" />
              <span>Confirm Duplicate Dismissal</span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">
              Dismiss Duplicate Suggestion
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Dismiss suggestion <strong className="text-[#B26A00] font-mono font-bold">{dismissingCandidate.candidate_incident_id || dismissingCandidate.candidate_id}</strong> for incident <strong className="text-brand-primary font-mono font-bold">{incident.id}</strong>. Both incidents will remain separate and active.
            </p>

            <form onSubmit={handleExecuteDismiss} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-text-secondary font-mono text-[11px] mb-1 font-semibold">Coordinator Identity *</label>
                <input
                  type="text"
                  value={dismissOperator}
                  onChange={(e) => setDismissOperator(e.target.value)}
                  required
                  className="w-full bg-surface-inset rounded-clay-input shadow-clay-inset px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 border-none"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono text-[11px] mb-1 font-semibold">Audit Trail Rationale *</label>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="State why these reports represent distinct emergency incidents..."
                  className="w-full bg-surface-inset rounded-clay-input shadow-clay-inset p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 border-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-black/5">
                <span className="text-[10px] font-mono text-text-muted italic">
                  * Writes to immutable audit trail.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDismissingCandidate(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary font-mono text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-clay-button clay-button-warning text-[#9E5700] hover:text-[#7A4300] font-bold font-mono text-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Dismissing...' : 'Confirm Dismissal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Corroborate Modal */}
      {selectedCandidate && (
        <DuplicateReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          primaryIncident={incident}
          candidateSuggestion={selectedCandidate}
          onConfirmMerge={handleConfirmMerge}
        />
      )}
    </>
  );
}
