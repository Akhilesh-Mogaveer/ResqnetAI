import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  X, 
  ShieldAlert
} from 'lucide-react';

export default function CoordinatorOverrideModal({ 
  isOpen, 
  onClose, 
  incident, 
  onSaveOverride 
}) {
  const [newScore, setNewScore] = useState(incident?.priorityScore ?? 50);
  const [newStatus, setNewStatus] = useState(incident?.responseStatus ?? 'unassigned');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (incident) {
      setNewScore(incident.priorityScore ?? 50);
      setNewStatus(incident.responseStatus ?? 'unassigned');
      setReason('');
      setError('');
    }
  }, [incident, isOpen]);

  const quickReasons = [
    "Direct radio contact with on-scene incident commander",
    "High-resolution drone recon confirmed structural collapse",
    "Verified false alarm by localized seismic/gas telemetry",
    "Vulnerable elderly/infant population identified in basement",
    "Secondary fire breakout adjacent to fuel line"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A transparent coordinator justification reason is mandatory for any override.');
      return;
    }
    setError('');
    onSaveOverride({
      incidentId: incident.id,
      oldScore: incident.priorityScore,
      newScore: Number(newScore),
      oldStatus: incident.responseStatus,
      newStatus,
      reason: reason.trim()
    });
    onClose();
  };

  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2A3C]/35 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-elevated rounded-clay-modal max-w-lg w-full shadow-clay-modal overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-clay-button bg-[#EEF1F6] text-text-secondary shadow-clay-inset">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-tight">
                Coordinator Priority & Status Override
              </h3>
              <p className="text-[11px] font-mono text-brand-primary font-bold">
                Target: {incident.id} · {incident.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-inset transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
          {/* Transparency Warning Notice */}
          <div className="p-3.5 rounded-clay-card bg-severity-high/10 text-text-primary text-[11px] flex items-start space-x-2 shadow-clay-card">
            <ShieldAlert className="w-4 h-4 text-[#B26A00] flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed text-text-secondary">
              <strong className="text-text-primary font-semibold">Audit Enforcement:</strong> Any manual intervention overrides the algorithmic scoring. An immutable log entry with your operator credentials and justification will be filed immediately in the audit trail.
            </div>
          </div>

          {/* Score Slider */}
          <div>
            <div className="flex items-center justify-between font-mono mb-1">
              <span className="text-text-secondary font-semibold">Priority Score Override</span>
              <span className={`text-base font-bold ${
                newScore >= 85 ? 'text-[#C0292E]' :
                newScore >= 70 ? 'text-[#B26A00]' : 'text-brand-primary'
              }`}>
                {newScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="w-full accent-brand-primary bg-surface-inset shadow-clay-inset h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-text-muted font-mono mt-1">
              <span>Low (10)</span>
              <span>Moderate (50)</span>
              <span>High (70)</span>
              <span>Critical (90+)</span>
            </div>
          </div>

          {/* Response Status Selector */}
          <div>
            <label className="block text-text-secondary font-semibold mb-1 font-mono">
              Adjust Response Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3.5 py-2 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              <option value="triage">Triage / Standby</option>
              <option value="dispatched">Dispatched</option>
              <option value="on_scene">On Scene</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Justification Reason Input */}
          <div>
            <label className="block text-text-secondary font-semibold mb-1 font-mono">
              Coordinator Override Justification <span className="text-[#C0292E]">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="State the verifiable ground truth or tactical reason for this override..."
              className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input p-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-sans transition-all"
            />
            {error && (
              <p className="text-[#C0292E] text-[11px] font-mono mt-1">{error}</p>
            )}

            {/* Quick Reason Presets */}
            <div className="mt-2">
              <span className="text-[10px] font-mono uppercase text-text-muted font-bold">Quick Justification Presets:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickReasons.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-clay-pill bg-surface-card hover:bg-surface-card/80 text-text-secondary shadow-clay-button active:shadow-clay-inset text-left transition-all cursor-pointer"
                  >
                    + {preset.slice(0, 38)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-clay-button clay-button-primary text-white font-bold transition-all cursor-pointer"
            >
              Commit Authorized Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
