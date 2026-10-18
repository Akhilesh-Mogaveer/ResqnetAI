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
  }, [incident?.id, incident?.is_duplicate, incident?.responseStatus]);

  useEffect(() => {
    // Reset transient outcome message when selected incident changes
    setActionOutcome(null);
    setActionError(null);
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleOpenReview = (candidate) => {
    setActionError(null);
    setSelectedCandidate(candidate);
    setIsReviewModalOpen(true);
  };

  const handleOpenDismiss = (candidate) => {
    setActionError(null);
    setDismissingCandidate(candidate);
    setDismissReason('Confirmed by coordinator as separate distinct incident.');
  };

  const handleConfirmMerge = async (mergePayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const mergeResponse = await api.mergeDuplicate(mergePayload.primaryIncidentId, mergePayload);
      const outcomeMsg = mergeResponse.message || `Merge recorded: ${mergePayload.duplicateIncidentId} merged into primary record ${mergePayload.primaryIncidentId}.`;
      
      setActionOutcome({
        type: 'merge',
        message: outcomeMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      onShowToast?.(outcomeMsg, 'success');

      // Notify parent app of merge result with both updated records
      onDuplicateMerged?.({
        primaryId: mergePayload.primaryIncidentId,
        duplicateId: mergePayload.duplicateIncidentId,
        updatedPrimary: mergeResponse,
        updatedDuplicate: mergeResponse.merged_incident,
      });

      // Refetch suggestions from backend
      await fetchDuplicates();
    } catch (err) {
      console.error("Merge error:", err);
      const errorMsg = `Merge failed: ${err.message}`;
      setActionError(errorMsg);
      onShowToast?.(errorMsg, 'alert');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

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
      <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-3">
        {/* Card Header */}
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold mb-2">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <GitMerge className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate Detection & Signal Corroboration</span>
          </div>

          <div className="flex items-center space-x-2">
            {duplicates.length > 0 && !incident.is_duplicate && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                {duplicates.length} Suggested
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-2.5">
            {/* 1. Incident is already a merged duplicate */}
            {incident.is_duplicate ? (
              <div className="p-3 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <GitMerge className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300 font-mono uppercase text-[11px]">
                      Merged Duplicate Report
                    </div>
                    <div className="text-[11px] text-amber-200/90 mt-0.5">
                      This report was corroborated and merged into primary record{' '}
                      <strong className="text-white font-mono">{incident.duplicate_of_id}</strong>. Original narrative and provenance remain preserved.
                    </div>
                  </div>
                </div>
                {onSelectIncident && incident.duplicate_of_id && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(incident.duplicate_of_id)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-800/80 hover:bg-amber-700 text-white font-mono text-[10px] transition-colors"
                  >
                    <span>View Primary Incident ({incident.duplicate_of_id})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : null}

            {/* 2. Action Outcome Banner (Merge Recorded or Suggestion Dismissed) */}
            {actionOutcome && (
              <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-600/60 text-[11px] text-emerald-200 flex items-start justify-between font-mono animate-fadeIn">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 uppercase">
                      {actionOutcome.type === 'merge' ? 'Merge Recorded:' : 'Suggestion Dismissed:'}
                    </span>{' '}
                    <span>{actionOutcome.message}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Logged at {actionOutcome.timestamp} · Audit trail recorded
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionOutcome(null)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 3. Action Error Banner */}
            {actionError && (
              <div className="p-2.5 rounded bg-red-950/70 border border-red-700/80 text-[11px] text-red-200 flex items-start justify-between font-mono">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 4. Loading Indicators */}
            {isLoading || actionLoading ? (
              <div className="py-2.5 flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{actionLoading ? 'Persisting coordinator action...' : 'Scanning spatial & text signals for redundancies...'}</span>
              </div>
            ) : !incident.is_duplicate && duplicates.length === 0 ? (
              /* 5. Genuinely No Redundant Reports Detected */
              <div className="flex items-center space-x-2 p-2.5 rounded bg-[#0c1424] border border-[#141e33] text-[11px] text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>
                  {actionOutcome 
                    ? 'All candidate reports for this incident have been reviewed and resolved.'
                    : 'No redundant reports detected. Signal analysis confirms unique incident signature.'}
                </span>
              </div>
            ) : !incident.is_duplicate && (
              /* 6. Active Duplicate Candidates List */
              <div className="space-y-2">
                <div className="text-[10px] text-amber-300/90 font-mono">
                  ⚠️ Potential duplicate reports detected. Review evidence before corroborating:
                </div>

                {duplicates.map((cand) => {
                  const candidateId = cand.candidate_incident_id || cand.candidate_id;
                  const suggestionKey = cand.id || `dup-${incident.id}-${candidateId}`;

                  return (
                    <div
                      key={suggestionKey}
                      className="p-2.5 rounded bg-[#0c1424] border border-[#18233c] hover:border-amber-500/40 transition-colors text-[11px] space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 font-mono text-[10px]">
                            <span className="text-amber-400 font-bold">{candidateId}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-300">{cand.candidate_sector}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-400">{cand.candidate_time_ago}</span>
                          </div>
                          <div className="font-bold text-white text-xs mt-0.5">
                            {cand.candidate_title}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          cand.overall_score >= 75 ? 'bg-red-950/80 text-red-300 border border-red-800/60' :
                          cand.overall_score >= 50 ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' :
                          'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                        }`}>
                          {cand.overall_score}% Match ({cand.confidence_level})
                        </span>
                      </div>

                      {/* Explainability bullets */}
                      <div className="text-[10px] text-slate-300 space-y-0.5 pt-1 border-t border-[#141e33]">
                        {cand.reasons.slice(0, 3).map((reason, idx) => (
                          <div key={idx} className="flex items-start space-x-1 text-slate-400">
                            <span className="text-cyan-400">•</span>
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
                          className="px-2.5 py-1 rounded bg-[#0e172a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReview(cand)}
                          disabled={actionLoading}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] font-mono transition-all shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-[#1e293b] rounded-xl max-w-lg w-full p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setDismissingCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs uppercase mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Duplicate Dismissal</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Dismiss Duplicate Suggestion
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Dismiss suggestion <strong className="text-amber-300 font-mono">{dismissingCandidate.candidate_incident_id || dismissingCandidate.candidate_id}</strong> for incident <strong className="text-cyan-300 font-mono">{incident.id}</strong>. Both incidents will remain separate and active.
            </p>

            <form onSubmit={handleExecuteDismiss} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono text-[11px] mb-1">Coordinator Identity *</label>
                <input
                  type="text"
                  value={dismissOperator}
                  onChange={(e) => setDismissOperator(e.target.value)}
                  required
                  className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[11px] mb-1">Audit Trail Rationale *</label>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="State why these reports represent distinct emergency incidents..."
                  className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg p-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#18233c]">
                <span className="text-[10px] font-mono text-slate-400 italic">
                  * Writes to immutable audit trail.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDismissingCandidate(null)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#0e172a] hover:bg-slate-800 text-slate-300 font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mono text-xs transition-all disabled:opacity-50"
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
