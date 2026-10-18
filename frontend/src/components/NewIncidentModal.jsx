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
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

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
      let userCoords = null;
      if (latitude.trim() && longitude.trim()) {
        const latF = parseFloat(latitude);
        const lngF = parseFloat(longitude);
        if (!isNaN(latF) && !isNaN(lngF)) {
          userCoords = [latF, lngF];
        }
      }

      const payload = {
        title: title.trim(),
        type: nlpPrediction?.predicted_category ? nlpPrediction.predicted_category.replace(/_/g, ' ') : "Emergency Incident",
        sector,
        locationName: locationName.trim() || `${sector} Zone`,
        coordinates: userCoords,
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
      setLatitude('');
      setLongitude('');
      setNlpPrediction(null);
    } catch (err) {
      console.error(err);
      onShowToast?.(`Failed to create incident: ${err.message}`, 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-blue-700 font-mono text-xs uppercase tracking-wider mb-1 font-bold">
          <Brain className="w-4 h-4 text-blue-600" />
          <span>New Incident Intake & HumAID Triage</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Crisis Distress Report</h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Incident Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash flooding trapped civilian vehicles under arch"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="East Harbor District">East Harbor District</option>
                <option value="Northgate Expressway">Northgate Expressway</option>
                <option value="West Market Square">West Market Square</option>
                <option value="South Ridge Estate">South Ridge Estate</option>
                <option value="Old Rail Corridor">Old Rail Corridor</option>
                <option value="Lower Marina Basin">Lower Marina Basin</option>
                <option value="Wayanad Relief Sector">Wayanad Relief Sector (Kerala)</option>
                <option value="Chamoli Disaster Zone">Chamoli Disaster Zone (Uttarakhand)</option>
                <option value="Mumbai Coastal Belt">Mumbai Coastal Belt (Maharashtra)</option>
                <option value="Brahmaputra Valley">Brahmaputra Valley (Assam)</option>
                <option value="Delhi NCR Command">Delhi NCR Command</option>
                <option value="Custom Sector">Other / Custom Sector</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Location Details / Named Landmark</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Wayanad Relief Camp, Pier 14, or Andheri Metro"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Optional User GPS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                Latitude (Optional GPS)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 11.6854"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                Longitude (Optional GPS)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 76.1320"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2 text-[10px] text-slate-500 font-mono">
              ℹ️ Coordinates are optional. If left blank, RESQNET will geocode recognized Indian places (e.g. Wayanad, Joshimath, Mumbai, Delhi) or clearly preserve coordinates as unknown/unmapped.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="critical">Critical (Red)</option>
                <option value="high">High (Amber)</option>
                <option value="moderate">Moderate (Cyan)</option>
                <option value="low">Low (Green)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Initial Priority (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">People Affected</label>
              <input
                type="text"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
                placeholder="e.g. 10 - 20 people"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-medium">
                Emergency Message / Caller Transcript *
              </label>
              <button
                type="button"
                onClick={handleClassify}
                disabled={isClassifying || !reportText.trim()}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-mono text-[11px] disabled:opacity-40 transition-colors"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-blue-600" />
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
              required
            />
          </div>

          {/* NLP Live Prediction Card */}
          {nlpPrediction && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-blue-800 mb-1">
                <span className="font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>HumAID Prediction</span>
                </span>
                <span className="text-emerald-700 font-semibold">
                  {(nlpPrediction.confidence * 100).toFixed(1)}% Confidence
                </span>
              </div>
              <div className="text-slate-900 font-mono font-bold text-xs uppercase tracking-wide">
                Category: {nlpPrediction.predicted_category.replace(/_/g, ' ')}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                * Suggested situational categorization. Coordinator authorization required before dispatching rescue units.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs disabled:opacity-50"
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
