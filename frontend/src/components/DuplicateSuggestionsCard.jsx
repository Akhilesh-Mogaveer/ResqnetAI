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
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider font-bold mb-2">
          <div className="flex items-center space-x-1.5 text-slate-800">
            <GitMerge className="w-3.5 h-3.5 text-amber-600" />
            <span>Duplicate Detection & Signal Corroboration</span>
          </div>

          <div className="flex items-center space-x-2">
            {duplicates.length > 0 && !incident.is_duplicate && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                {duplicates.length} Suggested
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-2.5">
            {/* 1. Incident is already a merged duplicate */}
            {incident.is_duplicate ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-start space-x-2">
                  <GitMerge className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950 font-mono uppercase text-[11px]">
                      Merged Duplicate Report
                    </div>
                    <div className="text-[11px] text-amber-900 mt-0.5">
                      This report was corroborated and merged into primary record{' '}
                      <strong className="text-slate-900 font-mono font-bold">{incident.duplicate_of_id}</strong>. Original narrative and provenance remain preserved.
                    </div>
                  </div>
                </div>
                {onSelectIncident && incident.duplicate_of_id && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(incident.duplicate_of_id)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-mono text-[10px] transition-colors"
                  >
                    <span>View Primary Incident ({incident.duplicate_of_id})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : null}

            {/* 2. Action Outcome Banner (Merge Recorded or Suggestion Dismissed) */}
            {actionOutcome && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start justify-between font-mono animate-fadeIn">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 uppercase">
                      {actionOutcome.type === 'merge' ? 'Merge Recorded:' : 'Suggestion Dismissed:'}
                    </span>{' '}
                    <span>{actionOutcome.message}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Logged at {actionOutcome.timestamp} · Audit trail recorded
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionOutcome(null)}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 3. Action Error Banner */}
            {actionError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-900 flex items-start justify-between font-mono">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 4. Loading Indicators */}
            {isLoading || actionLoading ? (
              <div className="py-2.5 flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>{actionLoading ? 'Persisting coordinator action...' : 'Scanning spatial & text signals for redundancies...'}</span>
              </div>
            ) : !incident.is_duplicate && duplicates.length === 0 ? (
              /* 5. Genuinely No Redundant Reports Detected */
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  {actionOutcome
                    ? 'All candidate reports for this incident have been reviewed and resolved.'
                    : 'No redundant reports detected. Signal analysis confirms unique incident signature.'}
                </span>
              </div>
            ) : !incident.is_duplicate && (
              /* 6. Active Duplicate Candidates List */
              <div className="space-y-2">
                <div className="text-[10px] text-amber-800 font-mono font-medium">
                  ⚠️ Potential duplicate reports detected. Review evidence before corroborating:
                </div>

                {duplicates.map((cand) => {
                  const candidateId = cand.candidate_incident_id || cand.candidate_id;
                  const suggestionKey = cand.id || `dup-${incident.id}-${candidateId}`;

                  return (
                    <div
                      key={suggestionKey}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors text-[11px] space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 font-mono text-[10px]">
                            <span className="text-amber-800 font-bold">{candidateId}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">{cand.candidate_sector}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{cand.candidate_time_ago}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-xs mt-0.5">
                            {cand.candidate_title}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          cand.overall_score >= 75 ? 'bg-red-50 text-red-700 border border-red-200' :
                          cand.overall_score >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {cand.overall_score}% Match ({cand.confidence_level})
                        </span>
                      </div>

                      {/* Explainability bullets */}
                      <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/80">
                        {cand.reasons.slice(0, 3).map((reason, idx) => (
                          <div key={idx} className="flex items-start space-x-1 text-slate-600">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDismiss(cand)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReview(cand)}
                          disabled={actionLoading}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] font-mono transition-all shadow-xs disabled:opacity-50"
                        >
                          <GitMerge className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setDismissingCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-amber-700 font-mono text-xs uppercase mb-1 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Duplicate Dismissal</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Dismiss Duplicate Suggestion
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Dismiss suggestion <strong className="text-amber-800 font-mono font-bold">{dismissingCandidate.candidate_incident_id || dismissingCandidate.candidate_id}</strong> for incident <strong className="text-blue-700 font-mono font-bold">{incident.id}</strong>. Both incidents will remain separate and active.
            </p>

            <form onSubmit={handleExecuteDismiss} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-mono text-[11px] mb-1 font-semibold">Coordinator Identity *</label>
                <input
                  type="text"
                  value={dismissOperator}
                  onChange={(e) => setDismissOperator(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-mono text-[11px] mb-1 font-semibold">Audit Trail Rationale *</label>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="State why these reports represent distinct emergency incidents..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 italic">
                  * Writes to immutable audit trail.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDismissingCandidate(null)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold font-mono text-xs transition-all disabled:opacity-50"
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
