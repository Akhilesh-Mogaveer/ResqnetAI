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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2A3C]/35 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-elevated rounded-clay-modal max-w-lg w-full shadow-clay-modal overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-severity-critical" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              Public Emergency Broadcast (Simulated Prototype)
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-inset transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-severity-high/10 shadow-clay-pill mx-6 px-4 py-2.5 rounded-clay-card text-[11px] text-[#B26A00] flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-[#B26A00] shrink-0" />
          <span>Simulation Mode: No actual carrier, SMS, or EAS broadcast packets are transmitted. Emergency drill demonstration only.</span>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-severity-success/15 text-[#1C8C5A] shadow-clay-button mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">Simulated Broadcast Logged</h4>
            <p className="text-xs text-text-secondary font-mono">
              Simulated EAS emergency drill message logged for {targetZone}. No actual telecommunications carrier transmission occurred.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4 text-xs font-sans">
            <div>
              <label className="block text-text-secondary font-mono font-semibold mb-1">
                Alert Protocol Level
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3.5 py-2 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all cursor-pointer"
              >
                <option value="EVACUATION">LEVEL 1 - IMMEDIATE EVACUATION</option>
                <option value="SHELTER">LEVEL 2 - SHELTER IN PLACE</option>
                <option value="HAZMAT">LEVEL 3 - HAZMAT EXCLUSION PERIMETER</option>
                <option value="ADVISORY">LEVEL 4 - TRAFFIC / INFRASTRUCTURE ADVISORY</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary font-mono font-semibold mb-1">
                Target Geographic Sector
              </label>
              <input
                type="text"
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3.5 py-2 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-mono font-semibold mb-1">
                Broadcast Headline (CAP Format)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3.5 py-2 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-mono font-semibold mb-1">
                Actionable Civilian Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input p-3 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-mono">CAP v1.2 Payload Format</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-clay-button clay-button-critical text-white font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
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
