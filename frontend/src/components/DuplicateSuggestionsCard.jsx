import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitMerge, 
  Sparkles, 
  CheckCircle, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import DuplicateReviewModal from './DuplicateReviewModal';

export default function DuplicateSuggestionsCard({ 
  incident, 
  onDuplicateMerged, 
  onShowToast 
}) {
  const [duplicates, setDuplicates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchDuplicates = useCallback(async () => {
    if (!incident?.id) return;
    setIsLoading(true);
    try {
      const data = await api.getIncidentDuplicates(incident.id);
      setDuplicates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not fetch duplicate suggestions:", err.message);
      setDuplicates([]);
    } finally {
      setIsLoading(false);
    }
  }, [incident?.id]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleOpenReview = (candidate) => {
    setSelectedCandidate(candidate);
    setIsReviewModalOpen(true);
  };

  const handleConfirmMerge = async (mergePayload) => {
    try {
      const updatedPrimary = await api.mergeDuplicate(incident.id, mergePayload);
      onShowToast?.(`Merged ${mergePayload.duplicateIncidentId} into ${incident.id}!`, 'success');
      onDuplicateMerged?.(updatedPrimary);
      fetchDuplicates();
    } catch (err) {
      console.error(err);
      onShowToast?.(`Merge failed: ${err.message}`, 'alert');
    }
  };

  const handleDismiss = async (candidateId) => {
    try {
      const updatedPrimary = await api.dismissDuplicate(incident.id, {
        duplicateIncidentId: candidateId,
        operator: 'Coordinator Jordan Davis',
        reason: 'Confirmed as distinct event at same general location.',
      });
      onShowToast?.(`Dismissed duplicate suggestion for ${candidateId}.`, 'info');
      onDuplicateMerged?.(updatedPrimary);
      setDuplicates(prev => prev.filter(d => d.candidate_id !== candidateId));
    } catch (err) {
      console.error(err);
      onShowToast?.(`Dismiss failed: ${err.message}`, 'alert');
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
            {duplicates.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                {duplicates.length} Suggested
              </span>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-2.5">
            {isLoading ? (
              <div className="py-2 flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Scanning spatial & text signals for redundancies...</span>
              </div>
            ) : duplicates.length === 0 ? (
              <div className="flex items-center space-x-2 p-2 rounded bg-[#0c1424] border border-[#141e33] text-[11px] text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>
                  No redundant reports detected. Signal analysis confirms unique incident signature.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] text-amber-300/90 font-mono">
                  ⚠️ Potential duplicate reports detected. Review evidence before corroborating:
                </div>

                {duplicates.map((cand) => (
                  <div
                    key={cand.candidate_id}
                    className="p-2.5 rounded bg-[#0c1424] border border-[#18233c] hover:border-amber-500/40 transition-colors text-[11px] space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 font-mono text-[10px]">
                          <span className="text-amber-400 font-bold">{cand.candidate_id}</span>
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
                        onClick={() => handleDismiss(cand.candidate_id)}
                        className="px-2 py-1 rounded bg-[#0e172a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleOpenReview(cand)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-slate-950 font-bold text-[10px] font-mono transition-all"
                      >
                        <GitMerge className="w-3 h-3" />
                        <span>Review & Merge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
