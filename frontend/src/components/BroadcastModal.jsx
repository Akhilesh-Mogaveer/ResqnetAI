import React, { useState, useEffect } from 'react';
import { Radio, X, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

export default function BroadcastModal({ isOpen, onClose, selectedIncident, onSendBroadcast }) {
  const [alertType, setAlertType] = useState('EVACUATION');
  const [targetZone, setTargetZone] = useState('All Sectors');
  const [headline, setHeadline] = useState('EMERGENCY ALERT: Severe conditions reported across metro sectors.');
  const [instructions, setInstructions] = useState('Stay indoors, shelter in place, and keep emergency channels open.');
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (selectedIncident) {
      setTargetZone(selectedIncident.sector || 'All Sectors');
      setHeadline(`EMERGENCY ALERT: ${(selectedIncident.title || 'CRITICAL INCIDENT').toUpperCase()} in ${selectedIncident.sector || 'Area'}`);
      setInstructions(`Avoid ${selectedIncident.locationName || 'the impacted area'}. Follow marked evacuation routes. Keep radio tuned to 98.5 FM.`);
    } else {
      setTargetZone('All Sectors');
      setHeadline('EMERGENCY ALERT: Severe conditions reported across metro sectors.');
      setInstructions('Stay indoors, shelter in place, and keep emergency channels open.');
    }
  }, [selectedIncident, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    setSentSuccess(true);
    setTimeout(() => {
      if (typeof onSendBroadcast === 'function') {
        onSendBroadcast({ alertType, targetZone, headline, instructions });
      }
      setSentSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#203550] bg-[#091629] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Public Emergency Broadcast (Simulated Prototype)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#132238] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#132238] border-b border-amber-500/30 px-5 py-2.5 text-[11px] text-amber-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Simulation Mode: No actual carrier, SMS, or EAS broadcast packets are transmitted. Emergency drill demonstration only.</span>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Simulated Broadcast Logged</h4>
            <p className="text-xs text-slate-300 font-mono">
              Simulated EAS emergency drill message logged for {targetZone}. No actual telecommunications carrier transmission occurred.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-3.5 text-xs font-sans">
            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Alert Protocol Level
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="EVACUATION">LEVEL 1 - IMMEDIATE EVACUATION</option>
                <option value="SHELTER">LEVEL 2 - SHELTER IN PLACE</option>
                <option value="HAZMAT">LEVEL 3 - HAZMAT EXCLUSION PERIMETER</option>
                <option value="ADVISORY">LEVEL 4 - TRAFFIC / INFRASTRUCTURE ADVISORY</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Target Geographic Sector
              </label>
              <input
                type="text"
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Broadcast Headline (CAP Format)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Actionable Civilian Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#203550]">
              <span className="text-[10px] text-slate-400 font-mono">CAP v1.2 Payload Format</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-[#091629] hover:bg-[#132238] text-slate-300 border border-[#203550] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Simulated Broadcast</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
