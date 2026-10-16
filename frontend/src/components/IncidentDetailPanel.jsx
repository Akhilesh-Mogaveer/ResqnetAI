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
  UserCheck,
  TrendingUp,
  RotateCcw,
  GitMerge
} from 'lucide-react';

export default function IncidentDetailPanel({ 
  incident, 
  onVerifyStatusChange, 
  onResponseStatusChange, 
  onAssignTeam,
  onOpenOverrideModal,
  onAddNote,
  onDuplicateMerged,
  onShowToast,
  responseTeams
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  if (!incident) {
    return (
      <div className="bg-[#0c1322] border border-[#1b263d] rounded-xl p-6 shadow-card-subtle flex flex-col items-center justify-center text-center h-[520px]">
        <Crosshair className="w-12 h-12 text-slate-400 mb-3 animate-spin-slow" />
        <h3 className="text-sm font-semibold text-white mb-1">No Incident Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          Select an incident from the priority queue or click a marker on the operational map to inspect signals and dispatch units.
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
    onAddNote(incident.id, newNoteText);
    setNewNoteText('');
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-950/80 text-red-300 border-red-800/60 font-bold';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60 font-medium';
      case 'moderate':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60 font-medium';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 font-medium';
    }
  };

  return (
    <div className="bg-[#0c1322] border border-[#1b263d] rounded-xl p-4 shadow-card-subtle flex flex-col h-[520px] overflow-hidden">
      {/* Top Header */}
      <div className="pb-3 border-b border-[#162035] flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
              {incident.id}
            </span>
            <button
              onClick={handleCopyId}
              title="Copy Incident ID"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <span className="text-[10px] text-slate-400">·</span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>

          <h3 className="text-sm font-bold text-white tracking-wide mt-1">
            {incident.title}
          </h3>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
            <MapPin className="w-3 h-3 text-cyan-500" />
            <span className="text-slate-300">{incident.sector}</span>
            <span>·</span>
            <span>{incident.locationName}</span>
            <span>·</span>
            <span className="font-mono">{incident.timeAgo}</span>
          </div>
        </div>

        {/* Override Button */}
        <button
          onClick={() => onOpenOverrideModal(incident)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e172a] hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-[#1e293b] hover:border-cyan-500/50 transition-all font-mono text-[11px]"
          title="Record an authorized coordinator override with justification"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Override</span>
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 custom-scrollbar text-xs">
        {/* 4 Metrics Grid (Matching Screenshot) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Priority Score */}
          <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
              Priority Score
            </div>
            <div className={`text-xl font-mono font-extrabold ${
              incident.priorityScore >= 85 ? 'text-red-400' :
              incident.priorityScore >= 70 ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {incident.priorityScore}
            </div>
            <div className="w-full bg-[#162035] h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                style={{ width: `${incident.priorityScore}%` }}
                className={`h-full ${
                  incident.priorityScore >= 85 ? 'bg-red-500' :
                  incident.priorityScore >= 70 ? 'bg-amber-500' : 'bg-cyan-400'
                }`}
              />
            </div>
          </div>

          {/* Report Reliability */}
          <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
              Reliability
            </div>
            <div className="text-xl font-mono font-extrabold text-cyan-300">
              {incident.reportReliability}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Corroborated
            </div>
          </div>

          {/* Location Confidence */}
          <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
              Loc Confidence
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-400">
              {incident.locationConfidence}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              GPS Triangulated
            </div>
          </div>

          {/* People Affected */}
          <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
              People Affected
            </div>
            <div className="text-sm font-mono font-bold text-amber-300 truncate">
              {incident.peopleAffected.split(' ')[0]}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Estimated count
            </div>
          </div>
        </div>

        {/* HumAID NLP Categorization & Original Report Text */}
        {(incident.humaid_category || incident.report_text) && (
          <div className="bg-[#080d1a] border border-cyan-800/40 rounded-lg p-3">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1.5">
              <span className="flex items-center space-x-1.5 text-cyan-400">
                <FileText className="w-3.5 h-3.5" />
                <span>HumAID NLP Categorization</span>
              </span>
              {incident.humaid_confidence !== undefined && incident.humaid_confidence !== null && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-semibold text-[10px]">
                  {(incident.humaid_confidence * 100).toFixed(1)}% Confidence
                </span>
              )}
            </div>

            {incident.humaid_category && (
              <div className="mb-2">
                <span className="text-[10px] text-slate-400 font-mono block mb-0.5">Suggested Humanitarian Category:</span>
                <span className="inline-block px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-200 font-mono text-xs font-semibold uppercase tracking-wide">
                  {incident.humaid_category.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {incident.report_text && (
              <div className="text-[11px] text-slate-300 bg-[#0c1424] p-2 rounded border border-[#18233c] font-mono leading-relaxed">
                <span className="text-[9px] text-slate-400 uppercase block mb-1">Preserved Original Report Text:</span>
                "{incident.report_text}"
              </div>
            )}

            <div className="mt-1.5 text-[9px] font-mono text-slate-400 italic">
              * Triage suggestion only. Verification status and dispatch priority remain independent coordinator decisions.
            </div>
          </div>
        )}

        {/* Explainable Duplicate Suggestions & Corroboration */}
        <DuplicateSuggestionsCard
          incident={incident}
          onDuplicateMerged={onDuplicateMerged}
          onShowToast={onShowToast}
        />

        {/* Signal Synthesis Box */}
        <div className="bg-[#080d1a] border border-cyan-900/40 rounded-lg p-3 relative overflow-hidden">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-[11px] mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Triangulated Signal Synthesis</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mb-1.5">
            Source: {incident.sourceSummary}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {incident.signalSynthesis}
          </p>
          <div className="mt-1.5 text-[9px] font-mono text-cyan-500/80 italic">
            * This is a mock signal summary for interface demonstration.
          </div>
        </div>

        {/* Transparent Priority Explanation */}
        <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center justify-between">
            <span>Why it was prioritised</span>
            <span className="text-cyan-400 text-[9px]">Model Transparency</span>
          </div>
          <p className="text-[11px] text-slate-200 leading-relaxed">
            {incident.whyPrioritised}
          </p>

          {incident.riskFactors && incident.riskFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#141d33]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Compounding Risk Factors:</div>
              <ul className="space-y-1">
                {incident.riskFactors.map((rf, idx) => (
                  <li key={idx} className="text-[11px] text-slate-300 flex items-start space-x-1.5">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Verification Status vs Response Status Controls (Separate controls as required!) */}
        <div className="p-3 bg-[#080d1a] border border-[#1a253e] rounded-lg space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Operational State Management</span>
            <span className="text-amber-400/90 text-[9px]">Verification ≠ Response</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Control 1: Verification Status */}
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">
                1. Report Verification
              </label>
              <select
                value={incident.verificationStatus}
                onChange={(e) => onVerifyStatusChange(incident.id, e.target.value)}
                className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="unverified">⚠️ Unverified (Needs Check)</option>
                <option value="under_review">🔍 Under Review</option>
                <option value="verified">✅ Verified (Ground Truth)</option>
                <option value="disputed">❌ Disputed / False Report</option>
              </select>
            </div>

            {/* Control 2: Response Status */}
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">
                2. Response Lifecycle
              </label>
              <select
                value={incident.responseStatus}
                onChange={(e) => onResponseStatusChange(incident.id, e.target.value)}
                className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="unassigned">⏳ Unassigned</option>
                <option value="triage">📋 Triage / Standby</option>
                <option value="dispatched">🚨 Dispatched</option>
                <option value="on_scene">📍 On Scene</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
            </div>
          </div>

          {/* Control 3: Team Assignment */}
          <div>
            <label className="block text-[11px] text-slate-400 font-mono mb-1">
              Assigned Response Team
            </label>
            <select
              value={incident.assignedTeam || ''}
              onChange={(e) => onAssignTeam(incident.id, e.target.value || null)}
              className="w-full bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="">-- No Team Assigned --</option>
              {responseTeams.map(team => (
                <option key={team.id} value={team.name}>
                  {team.name} ({team.type}) - {team.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Coordinator Notes Log */}
        <div className="bg-[#080d1a] border border-[#162035] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
            Field & Coordinator Notes ({incident.notes?.length || 0})
          </div>

          {incident.notes && incident.notes.length > 0 ? (
            <div className="space-y-2 mb-3">
              {incident.notes.map((n) => (
                <div key={n.id} className="p-2 rounded bg-[#0c1424] border border-[#162035] text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-0.5">
                    <span className="text-cyan-400 font-semibold">{n.author}</span>
                    <span>{n.time}</span>
                  </div>
                  <div className="text-slate-200">{n.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic mb-2">
              No coordinator notes recorded yet.
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleNoteSubmit} className="flex space-x-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add coordinator note / situational update..."
              className="flex-1 bg-[#0c1424] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
            >
              Add Note
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3 border-t border-[#162035] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* Quick toggle verification button */}
          <button
            onClick={() => onVerifyStatusChange(
              incident.id, 
              incident.verificationStatus === 'verified' ? 'unverified' : 'verified'
            )}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              incident.verificationStatus === 'verified'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{incident.verificationStatus === 'verified' ? 'Mark Unverified' : 'Verify Report'}</span>
          </button>
        </div>

        {/* Quick status dispatch / resolve */}
        <button
          onClick={() => onResponseStatusChange(
            incident.id,
            incident.responseStatus === 'resolved' ? 'dispatched' : 'resolved'
          )}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
            incident.responseStatus === 'resolved'
              ? 'bg-[#1e293b] text-slate-300 hover:bg-[#334155]'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{incident.responseStatus === 'resolved' ? 'Reopen Incident' : 'Mark Resolved'}</span>
        </button>
      </div>
    </div>
  );
}
