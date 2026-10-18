import React, { useState } from 'react';
import { Radio, X, AlertTriangle, Send, CheckCircle2, Volume2 } from 'lucide-react';

export default function BroadcastModal({ isOpen, onClose, selectedIncident, onSendBroadcast }) {
  if (!isOpen) return null;

  const [alertType, setAlertType] = useState('EVACUATION');
  const [targetZone, setTargetZone] = useState(selectedIncident ? selectedIncident.sector : 'All Sectors');
  const [headline, setHeadline] = useState(
    selectedIncident 
      ? `EMERGENCY ALERT: ${selectedIncident.title.toUpperCase()} in ${selectedIncident.sector}`
      : 'EMERGENCY ALERT: Severe conditions reported across metro sectors.'
  );
  const [instructions, setInstructions] = useState(
    selectedIncident
      ? `Avoid ${selectedIncident.locationName}. Follow marked evacuation routes. Keep radio tuned to 98.5 FM.`
      : 'Stay indoors, shelter in place, and keep emergency channels open.'
  );
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    setSentSuccess(true);
    setTimeout(() => {
      onSendBroadcast && onSendBroadcast({ alertType, targetZone, headline, instructions });
      setSentSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b1220] border border-cyan-500/40 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#162035] bg-[#080d1a] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Public Emergency Broadcast (Simulated Prototype)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-950/40 border-b border-amber-800/40 px-5 py-2 text-[11px] text-amber-300/90 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Simulation Mode: No actual carrier, SMS, or EAS broadcast packets are transmitted. Emergency drill demonstration only.</span>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Simulated Broadcast Logged</h4>
            <p className="text-xs text-slate-400 font-mono">
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
                className="w-full bg-[#080d1a] border border-[#1b263d] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="EVACUATION">🚨 IMMEDIATE EVACUATION ORDER</option>
                <option value="SHELTER">🛡️ SHELTER IN PLACE</option>
                <option value="FLASH_FLOOD">🌊 FLASH FLOOD WARNING</option>
                <option value="HAZARD">⚠️ HAZARDOUS CONDITION ADVISORY</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Target Geo-Sector
              </label>
              <input
                type="text"
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1b263d] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Broadcast Headline (SMS & Wireless Alerts)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1b263d] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-mono font-semibold mb-1">
                Civilian Action Instructions
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1b263d] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#0e172a] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-glow-cyan"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Log Simulated Broadcast</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
