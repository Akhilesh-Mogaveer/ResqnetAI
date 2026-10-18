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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Coordinator Priority & Status Override
              </h3>
              <p className="text-[11px] font-mono text-blue-700">
                Target: {incident.id} · {incident.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Transparency Warning Notice */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Audit Enforcement:</strong> Any manual intervention overrides the algorithmic scoring. An immutable log entry with your operator credentials and justification will be filed immediately in the audit trail.
            </div>
          </div>

          {/* Score Slider */}
          <div>
            <div className="flex items-center justify-between font-mono mb-1">
              <span className="text-slate-700 font-semibold">Priority Score Override</span>
              <span className={`text-base font-bold ${
                newScore >= 85 ? 'text-red-600' :
                newScore >= 70 ? 'text-amber-600' : 'text-blue-600'
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
              className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Low (10)</span>
              <span>Moderate (50)</span>
              <span>High (70)</span>
              <span>Critical (90+)</span>
            </div>
          </div>

          {/* Response Status Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 font-mono">
              Adjust Response Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
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
            <label className="block text-slate-700 font-semibold mb-1 font-mono">
              Coordinator Override Justification <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="State the verifiable ground truth or tactical reason for this override..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
            />
            {error && (
              <p className="text-red-600 text-[11px] font-mono mt-1">{error}</p>
            )}

            {/* Quick Reason Presets */}
            <div className="mt-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Quick Justification Presets:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickReasons.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-left transition-colors"
                  >
                    + {preset.slice(0, 38)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm"
            >
              Commit Authorized Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
