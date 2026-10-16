import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Send,
  Loader2,
  Brain
} from 'lucide-react';
import api from '../services/api';

export default function NewIncidentModal({ isOpen, onClose, onIncidentCreated, onShowToast }) {
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('East Harbor District');
  const [locationName, setLocationName] = useState('');
  const [severity, setSeverity] = useState('high');
  const [priorityScore, setPriorityScore] = useState(75);
  const [peopleAffected, setPeopleAffected] = useState('10 - 25 people');
  const [reportText, setReportText] = useState('');
  
  // NLP State
  const [isClassifying, setIsClassifying] = useState(false);
  const [nlpPrediction, setNlpPrediction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClassify = async () => {
    if (!reportText.trim()) {
      onShowToast?.('Please enter message text before running classification.', 'info');
      return;
    }
    setIsClassifying(true);
    setNlpPrediction(null);
    try {
      const res = await api.classifyText(reportText);
      setNlpPrediction(res);
      onShowToast?.(`Classified as: ${res.predicted_category.replace(/_/g, ' ')} (${(res.confidence * 100).toFixed(1)}%)`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast?.(`Classification error: ${err.message}`, 'alert');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast?.('Incident title is required.', 'alert');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        type: nlpPrediction?.predicted_category ? nlpPrediction.predicted_category.replace(/_/g, ' ') : "Emergency Incident",
        sector,
        locationName: locationName.trim() || `${sector} Zone`,
        coordinates: [37.7800 + (Math.random() - 0.5) * 0.04, -122.4100 + (Math.random() - 0.5) * 0.04],
        severity,
        priorityScore: parseInt(priorityScore, 10),
        peopleAffected,
        report_text: reportText.trim(),
        run_nlp_classification: true,
      };

      const created = await api.createIncident(payload);
      onIncidentCreated(created);
      onShowToast?.(`Incident ${created.id} submitted and persisted to database!`, 'success');
      onClose();
      // Reset form
      setTitle('');
      setLocationName('');
      setReportText('');
      setNlpPrediction(null);
    } catch (err) {
      console.error(err);
      onShowToast?.(`Failed to create incident: ${err.message}`, 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1222] border border-[#1e293b] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span>New Incident Intake & HumAID Triage</span>
        </div>
        <h2 className="text-lg font-bold text-white mb-4">Submit Crisis Distress Report</h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Incident Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash flooding trapped civilian vehicles under arch"
              className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="East Harbor District">East Harbor District</option>
                <option value="Northgate Expressway">Northgate Expressway</option>
                <option value="West Market Square">West Market Square</option>
                <option value="South Ridge Estate">South Ridge Estate</option>
                <option value="Old Rail Corridor">Old Rail Corridor</option>
                <option value="Lower Marina Basin">Lower Marina Basin</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Location Details</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Pier 14 Logistics Complex"
                className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="critical">Critical (Red)</option>
                <option value="high">High (Amber)</option>
                <option value="moderate">Moderate (Cyan)</option>
                <option value="low">Low (Green)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Initial Priority (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(e.target.value)}
                className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">People Affected</label>
              <input
                type="text"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
                placeholder="e.g. 10 - 20 people"
                className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-medium">
                Emergency Message / Caller Transcript *
              </label>
              <button
                type="button"
                onClick={handleClassify}
                disabled={isClassifying || !reportText.trim()}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] disabled:opacity-40 transition-colors"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Analyze with HumAID</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="e.g. Rising floodwater at the expressway underpass, 6 passenger vehicles trapped under bridge, water at window height."
              className="w-full bg-[#080d1a] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              required
            />
          </div>

          {/* NLP Live Prediction Card */}
          {nlpPrediction && (
            <div className="bg-[#080f20] border border-cyan-800/60 rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 mb-1">
                <span className="font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>HumAID Prediction</span>
                </span>
                <span className="text-emerald-400 font-semibold">
                  {(nlpPrediction.confidence * 100).toFixed(1)}% Confidence
                </span>
              </div>
              <div className="text-white font-mono font-bold text-xs uppercase tracking-wide">
                Category: {nlpPrediction.predicted_category.replace(/_/g, ' ')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                * Suggested situational categorization. Coordinator authorization required before dispatching rescue units.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-[#1e293b] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Incident</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
