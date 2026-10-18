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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#203550] bg-[#091629] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Coordinator Priority & Status Override
              </h3>
              <p className="text-[11px] font-mono text-cyan-400">
                Target: {incident.id} · {incident.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#132238] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Transparency Warning Notice */}
          <div className="p-3 rounded-lg bg-[#132238] border border-amber-500/30 text-slate-300 text-[11px] flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white font-semibold">Audit Enforcement:</strong> Any manual intervention overrides the algorithmic scoring. An immutable log entry with your operator credentials and justification will be filed immediately in the audit trail.
            </div>
          </div>

          {/* Score Slider */}
          <div>
            <div className="flex items-center justify-between font-mono mb-1">
              <span className="text-slate-300 font-semibold">Priority Score Override</span>
              <span className={`text-base font-bold ${
                newScore >= 85 ? 'text-rose-400' :
                newScore >= 70 ? 'text-amber-400' : 'text-cyan-400'
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
              className="w-full accent-cyan-500 bg-[#091629] h-2 rounded-lg cursor-pointer"
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
            <label className="block text-slate-300 font-semibold mb-1 font-mono">
              Adjust Response Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
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
            <label className="block text-slate-300 font-semibold mb-1 font-mono">
              Coordinator Override Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="State the verifiable ground truth or tactical reason for this override..."
              className="w-full bg-[#091629] border border-[#203550] rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            {error && (
              <p className="text-rose-400 text-[11px] font-mono mt-1">{error}</p>
            )}

            {/* Quick Reason Presets */}
            <div className="mt-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Quick Justification Presets:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickReasons.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#132238] hover:bg-[#1a2f4c] text-slate-300 border border-[#203550] text-left transition-colors"
                  >
                    + {preset.slice(0, 38)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#203550] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#091629] hover:bg-[#132238] text-slate-300 border border-[#203550] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-sm"
            >
              Commit Authorized Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
