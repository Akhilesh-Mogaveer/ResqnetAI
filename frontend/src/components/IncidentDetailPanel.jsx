import React, { useState } from 'react';
import DuplicateSuggestionsCard from './DuplicateSuggestionsCard';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Radio,
  AlertTriangle,
  Send,
  Sliders,
  FileText,
  Copy,
  Check,
  Crosshair,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

export default function IncidentDetailPanel({
  incident,
  onVerifyStatusChange,
  onResponseStatusChange,
  onAssignTeam,
  onOpenOverrideModal,
  onAddNote,
  onDuplicateMerged,
  onDuplicateDismissed,
  onShowToast,
  onSelectIncident,
  responseTeams = []
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  if (!incident) {
    return (
      <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl p-8 shadow-md flex flex-col items-center justify-center text-center h-[540px]">
        <div className="w-12 h-12 rounded-full bg-[#091629] border border-[#203550] flex items-center justify-center text-slate-400 mb-3">
          <Crosshair className="w-6 h-6 text-[#21D4FD]" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No Incident Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Select an incident from the list or live map to inspect report details, NLP classification, and verification actions.
        </p>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(incident.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote?.(incident.id, newNoteText);
    setNewNoteText('');
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-950/60 text-[#FF4566] border-rose-800/60 font-bold';
      case 'high':
        return 'bg-amber-950/60 text-[#FFB547] border-amber-800/60 font-semibold';
      case 'moderate':
        return 'bg-blue-950/60 text-[#21D4FD] border-blue-800/60 font-medium';
      default:
        return 'bg-emerald-950/60 text-[#25D6A2] border-emerald-800/60 font-medium';
    }
  };

  return (
    <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl p-5 shadow-xl flex flex-col h-[600px] overflow-hidden">
      {/* Panel Header with subtle rescue-bg-3.jpg backdrop */}
      <div 
        className="pb-3 border-b border-[#203550] -mx-5 -mt-5 p-5 mb-1 rounded-t-xl relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.78) 0%, rgba(9, 22, 41, 0.48) 50%, rgba(13, 27, 45, 0.22) 100%), url('/images/rescue-bg-3.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#21D4FD] drop-shadow-xs">
                {incident.id}
              </span>
              <button
                onClick={handleCopyId}
                title="Copy Incident ID"
                className="text-slate-300 hover:text-white transition-colors"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-slate-500">·</span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadgeClass(incident.severity)}`}>
                {incident.severity}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white tracking-tight mt-1 truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              {incident.title}
            </h3>

            <div className="flex items-center space-x-2 text-[11px] text-slate-100 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="font-semibold text-slate-100">{incident.sector}</span>
              <span className="text-slate-400">·</span>
              <span className="truncate">{incident.locationName}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-200">{incident.timeAgo}</span>
            </div>

            {/* Location Provenance Badges (Exact text asserted in PriorityAudits.test.jsx) */}
            <div className="flex items-center space-x-2 text-[10px] font-mono mt-1.5 flex-wrap gap-y-1">
              {!incident.coordinates || incident.coordinates.length < 2 ? (
                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-[#FFB547] font-medium">
                  ⚠️ Coordinates Unknown (Unmatched Location)
                </span>
              ) : incident.is_synthetic_location ? (
                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium" title="Synthetic demo coordinates generated for simulation">
                  🧪 Demo / Synthetic Coords ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              ) : incident.location_source === 'user_input' ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-medium">
                  📍 User GPS ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-[#21D4FD] font-medium">
                  🗺️ Geocoded ({incident.coordinates[0].toFixed(3)}, {incident.coordinates[1].toFixed(3)})
                </span>
              )}
            </div>
          </div>

          {/* Priority Override Button */}
          <button
            onClick={() => onOpenOverrideModal?.(incident)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#091629]/90 hover:bg-[#132238] text-slate-200 border border-[#203550] text-xs font-medium transition-colors flex-shrink-0 shadow-xs"
            title="Record an authorized coordinator priority override"
          >
            <Sliders className="w-3.5 h-3.5 text-[#21D4FD]" />
            <span>Override</span>
          </button>
        </div>
      </div>

      {/* Scrollable Detail Body */}
      <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
        {/* 4 Metric Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Priority Score */}
          <div className="bg-[#091629] border border-[#203550] rounded-lg p-2.5">
            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">
              Priority Score
            </div>
            <div className={`text-xl font-mono font-extrabold ${
              incident.priorityScore >= 85 ? 'text-[#FF4566]' :
              incident.priorityScore >= 70 ? 'text-[#FFB547]' : 'text-[#21D4FD]'
            }`}>
              {incident.priorityScore}
            </div>
            <div className="w-full bg-[#132238] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                style={{ width: `${incident.priorityScore}%` }}
                className={`h-full ${
                  incident.priorityScore >= 85 ? 'bg-[#FF4566]' :
                  incident.priorityScore >= 70 ? 'bg-[#FFB547]' : 'bg-[#2878FF]'
                }`}
              />
            </div>
          </div>

          {/* Report Reliability */}
          <div className="bg-[#091629] border border-[#203550] rounded-lg p-2.5">
            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">
              Reliability
            </div>
            <div className="text-xl font-mono font-extrabold text-white">
              {incident.reportReliability}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Corroborated
            </div>
          </div>

          {/* Location Confidence (Asserted strings preserved) */}
          <div className="bg-[#091629] border border-[#203550] rounded-lg p-2.5">
            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">
              Loc Confidence
            </div>
            <div className={`text-xl font-mono font-extrabold ${
              !incident.coordinates || incident.coordinates.length < 2
                ? 'text-slate-500'
                : 'text-white'
            }`}>
              {!incident.coordinates || incident.coordinates.length < 2 ? 'N/A' : `${incident.locationConfidence}%`}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              {!incident.coordinates || incident.coordinates.length < 2
                ? 'Unmapped / Unknown'
                : incident.is_synthetic_location
                ? 'Simulated Demo'
                : incident.location_source === 'user_input'
                ? 'User GPS Input'
                : 'Registry Geocoded'}
            </div>
          </div>

          {/* People Affected */}
          <div className="bg-[#091629] border border-[#203550] rounded-lg p-2.5">
            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">
              People Affected
            </div>
            <div className="text-sm font-mono font-bold text-white truncate mt-1">
              {incident.peopleAffected ? incident.peopleAffected.split(' ')[0] : 'Unknown'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Estimated count
            </div>
          </div>
        </div>

        {/* HumAID NLP Categorization & Original Report Narrative */}
        {(incident.humaid_category || incident.report_text) && (
          <div className="bg-[#091629] border border-[#203550] rounded-lg p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
              <span className="flex items-center space-x-1.5 text-[#21D4FD]">
                <FileText className="w-3.5 h-3.5" />
                <span>HumAID NLP Categorization</span>
              </span>
              {incident.humaid_confidence !== undefined && incident.humaid_confidence !== null && (
                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-[#21D4FD] font-semibold text-[10px] border border-blue-800/60 font-mono">
                  {(incident.humaid_confidence * 100).toFixed(1)}% Confidence
                </span>
              )}
            </div>

            {incident.humaid_category && (
              <div className="mb-2">
                <span className="text-[10px] text-slate-400 block mb-0.5">Predicted Humanitarian Category:</span>
                <span className="inline-block px-2.5 py-0.5 rounded bg-[#0D1B2D] border border-[#203550] text-[#21D4FD] font-medium text-xs uppercase tracking-wide">
                  {incident.humaid_category.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {incident.report_text && (
              <div className="text-[11px] text-slate-200 bg-[#07111F] p-2.5 rounded border border-[#203550] leading-relaxed font-sans">
                <span className="text-[10px] text-slate-400 uppercase block mb-1 font-semibold">Report Narrative:</span>
                "{incident.report_text}"
              </div>
            )}

            <div className="mt-2 text-[10px] text-amber-200/80 bg-amber-950/30 p-2 rounded border border-amber-900/50">
              * Automated triage suggestion only. Model predictions do not confirm report authenticity. Verification and dispatch decisions remain strictly human-in-the-loop.
            </div>
          </div>
        )}

        {/* Explainable Duplicate Suggestions & Corroboration */}
        <DuplicateSuggestionsCard
          incident={incident}
          onDuplicateMerged={onDuplicateMerged}
          onDuplicateDismissed={onDuplicateDismissed}
          onShowToast={onShowToast}
          onSelectIncident={onSelectIncident}
        />

        {/* Operational State Management Controls */}
        <div className="p-3 bg-[#091629] border border-[#203550] rounded-lg space-y-3">
          <div className="text-xs font-semibold text-white flex items-center justify-between">
            <span>Operational State Management</span>
            <span className="text-[#FFB547] text-[10px] font-medium bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/50">
              Verification ≠ Response
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Control 1: Verification Status */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Report Verification
              </label>
              <select
                value={incident.verificationStatus}
                onChange={(e) => onVerifyStatusChange?.(incident.id, e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2878FF]"
              >
                <option value="unverified">⚠️ Unverified (Needs Check)</option>
                <option value="under_review">🔍 Under Review</option>
                <option value="verified">✅ Verified (Ground Truth)</option>
                <option value="disputed">❌ Disputed / False Report</option>
              </select>
            </div>

            {/* Control 2: Response Status */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Response Lifecycle
              </label>
              <select
                value={incident.responseStatus}
                onChange={(e) => onResponseStatusChange?.(incident.id, e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2878FF]"
              >
                <option value="unassigned">⏳ Unassigned</option>
                <option value="triage">📋 Triage / Standby</option>
                <option value="dispatched">🚨 Dispatched</option>
                <option value="on_scene">📍 On Scene</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
            </div>
          </div>

          {/* Control 3: Team Assignment (Exact label asserted in PriorityAudits.test.jsx) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Assigned Response Team (Demo Fleet Roster)
            </label>
            <select
              value={incident.assignedTeam || ''}
              onChange={(e) => onAssignTeam?.(incident.id, e.target.value || null)}
              className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2878FF]"
            >
              <option value="">-- No Team Assigned --</option>
              {responseTeams.map(team => (
                <option key={team.id} value={team.name}>
                  {team.name} ({team.type}) - {team.status} [Simulated]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority Explanation */}
        <div className="bg-[#091629] border border-[#203550] rounded-lg p-3">
          <div className="text-xs font-semibold text-white mb-1 flex items-center justify-between">
            <span>Why it was prioritised</span>
            <span className="text-[#21D4FD] text-[10px] font-mono">Triage Factors</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {incident.whyPrioritised}
          </p>

          {incident.riskFactors && incident.riskFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#203550]">
              <div className="text-[10px] font-medium text-slate-400 uppercase mb-1">Compounding Risk Factors:</div>
              <ul className="space-y-1">
                {incident.riskFactors.map((rf, idx) => (
                  <li key={idx} className="text-[11px] text-slate-300 flex items-start space-x-1.5">
                    <span className="text-[#FF4566] font-bold mt-0.5">•</span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Coordinator Field Notes */}
        <div className="bg-[#091629] border border-[#203550] rounded-lg p-3">
          <div className="text-xs font-semibold text-white mb-2">
            Field & Coordinator Notes ({incident.notes?.length || 0})
          </div>

          {incident.notes && incident.notes.length > 0 ? (
            <div className="space-y-2 mb-3">
              {incident.notes.map((n) => (
                <div key={n.id} className="p-2 rounded bg-[#0D1B2D] border border-[#203550] text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                    <span className="text-[#21D4FD] font-semibold">{n.author}</span>
                    <span className="font-mono">{n.time}</span>
                  </div>
                  <div className="text-slate-200">{n.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic mb-2">
              No coordinator notes recorded yet.
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleNoteSubmit} className="flex space-x-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add situational update or ground note..."
              className="flex-1 bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#2878FF]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#2878FF] hover:bg-blue-600 text-white font-medium rounded-lg text-xs transition-colors shadow-xs"
            >
              Add Note
            </button>
          </form>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#203550] flex items-center justify-between text-xs">
        <button
          onClick={() => onVerifyStatusChange?.(
            incident.id,
            incident.verificationStatus === 'verified' ? 'unverified' : 'verified'
          )}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
            incident.verificationStatus === 'verified'
              ? 'bg-amber-950/60 text-[#FFB547] border border-amber-800/60 hover:bg-amber-900/60'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{incident.verificationStatus === 'verified' ? 'Mark Unverified' : 'Verify Report'}</span>
        </button>

        <button
          onClick={() => onResponseStatusChange?.(
            incident.id,
            incident.responseStatus === 'resolved' ? 'dispatched' : 'resolved'
          )}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
            incident.responseStatus === 'resolved'
              ? 'bg-[#132238] text-slate-300 hover:bg-[#203550] border border-[#203550]'
              : 'bg-[#2878FF] hover:bg-blue-600 text-white shadow-xs'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{incident.responseStatus === 'resolved' ? 'Reopen Incident' : 'Mark Resolved'}</span>
        </button>
      </div>
    </div>
  );
}
