import React, { useState } from 'react';
import { 
  GitMerge, 
  X, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
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

  if (!isOpen || !primaryIncident || !candidateSuggestion) return null;

  const cand = candidateSuggestion;
  const candInc = cand.candidate_incident || {};

  const handleMerge = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirmMerge({
        duplicateIncidentId: cand.candidate_id,
        operator,
        reason: reason.trim(),
        updateCorroboration,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1222] border border-[#1e293b] rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs uppercase tracking-wider mb-1">
          <GitMerge className="w-4 h-4 text-amber-400" />
          <span>Human-in-the-Loop Duplicate Review</span>
        </div>
        <h2 className="text-lg font-bold text-white mb-1">
          Review & Corroborate Candidate Report
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Compare the primary incident with the candidate report. Merging updates the operational record, retains original message provenance, and documents coordinator authorization in the audit trail.
        </p>

        {/* Explainability Signal Strip */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Signal Similarity Score:</span>
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${
              cand.overall_score >= 75 ? 'bg-red-950/80 text-red-300 border border-red-800/60' :
              cand.overall_score >= 50 ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' :
              'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
            }`}>
              {cand.overall_score}% Match ({cand.confidence_level} Confidence)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="bg-[#070d19] p-2 rounded border border-[#18233c]">
              <span className="text-slate-400 block text-[9px] uppercase">Distance</span>
              <span className="text-white font-bold">{cand.distance_km} km</span>
            </div>
            <div className="bg-[#070d19] p-2 rounded border border-[#18233c]">
              <span className="text-slate-400 block text-[9px] uppercase">Time Delta</span>
              <span className="text-white font-bold">{Math.round(cand.time_diff_minutes)} mins</span>
            </div>
            <div className="bg-[#070d19] p-2 rounded border border-[#18233c]">
              <span className="text-slate-400 block text-[9px] uppercase">Text Overlap</span>
              <span className="text-white font-bold">{Math.round(cand.text_similarity * 100)}%</span>
            </div>
            <div className="bg-[#070d19] p-2 rounded border border-[#18233c]">
              <span className="text-slate-400 block text-[9px] uppercase">Category</span>
              <span className={cand.category_match ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {cand.category_match ? 'Matched' : 'Different'}
              </span>
            </div>
          </div>

          {cand.reasons && cand.reasons.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[#18233c]">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Explainability Reasons:</span>
              <ul className="space-y-1">
                {cand.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-slate-300 flex items-start space-x-1.5">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
          {/* Primary Incident */}
          <div className="bg-[#080d1a] border border-cyan-900/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-cyan-400">
                [PRIMARY] {primaryIncident.id}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                Score: {primaryIncident.priorityScore}
              </span>
            </div>
            <h4 className="font-bold text-white text-sm mb-1">{primaryIncident.title}</h4>
            <div className="text-[11px] text-slate-400 mb-2">
              <MapPin className="w-3 h-3 inline text-cyan-400 mr-1" />
              {primaryIncident.sector} · {primaryIncident.locationName}
            </div>

            <div className="bg-[#0c1424] p-2 rounded border border-[#18233c] text-[11px] text-slate-300 font-mono mb-2">
              <span className="text-[9px] text-slate-400 block mb-0.5 uppercase">Primary Report Narrative:</span>
              "{primaryIncident.report_text || primaryIncident.original_report_text || primaryIncident.signalSynthesis}"
            </div>

            {primaryIncident.humaid_category && (
              <div className="text-[10px] font-mono text-cyan-300">
                HumAID: {primaryIncident.humaid_category.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          {/* Candidate Duplicate */}
          <div className="bg-[#080d1a] border border-amber-900/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-amber-400">
                [CANDIDATE DUPLICATE] {cand.candidate_id}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                {cand.candidate_severity}
              </span>
            </div>
            <h4 className="font-bold text-white text-sm mb-1">{cand.candidate_title}</h4>
            <div className="text-[11px] text-slate-400 mb-2">
              <MapPin className="w-3 h-3 inline text-amber-400 mr-1" />
              {cand.candidate_sector} · {candInc.locationName || 'Same Sector'}
            </div>

            <div className="bg-[#0c1424] p-2 rounded border border-[#18233c] text-[11px] text-slate-300 font-mono mb-2">
              <span className="text-[9px] text-slate-400 block mb-0.5 uppercase">Candidate Report Narrative:</span>
              "{candInc.report_text || candInc.original_report_text || candInc.signalSynthesis || 'Citizen distress dispatch'}"
            </div>

            {cand.candidate_category && (
              <div className="text-[10px] font-mono text-amber-300">
                HumAID: {cand.candidate_category.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {/* Merge Authorization Form */}
        <form onSubmit={handleMerge} className="space-y-3 text-xs bg-[#080d1a] border border-[#18233c] rounded-lg p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-mono text-[11px] mb-1">Authorizing Coordinator *</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                required
                className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="corroborateCheck"
                checked={updateCorroboration}
                onChange={(e) => setUpdateCorroboration(e.target.checked)}
                className="rounded border-[#1e293b] text-cyan-500 focus:ring-0 bg-[#0c1424] w-4 h-4"
              />
              <label htmlFor="corroborateCheck" className="text-slate-300 text-xs select-none">
                Boost Report Reliability (+5% multi-source corroboration)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-mono text-[11px] mb-1">Audit Trail Merge Justification *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="State the operational justification for merging this duplicate report..."
              className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg p-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#18233c]">
            <span className="text-[10px] font-mono text-slate-400 italic">
              * Action writes to immutable audit log and marks {cand.candidate_id} as merged.
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-[#0e172a] hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-md"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Merging...' : 'Authorize Merge'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
