import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  FileText, 
  User, 
  ArrowRight,
  ExternalLink,
  Download
} from 'lucide-react';

export default function AuditLogView({ 
  auditLog, 
  onSelectIncidentById 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = auditLog.filter(log => {
    const matchesSearch = 
      log.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterAction !== 'all' && log.actionType !== filterAction) return false;

    return true;
  });

  const getActionBadge = (type) => {
    switch (type) {
      case 'PRIORITY_SCORE_OVERRIDE':
      case 'PRIORITY_OVERRIDE':
        return { text: 'PRIORITY OVERRIDE', cls: 'bg-red-950/80 text-red-300 border-red-800/60' };
      case 'VERIFICATION_STATUS_CHANGE':
        return { text: 'VERIFICATION UPDATE', cls: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' };
      case 'RESPONSE_STATUS_CHANGE':
        return { text: 'RESPONSE STATUS', cls: 'bg-amber-950/80 text-amber-300 border-amber-800/60' };
      case 'TEAM_ASSIGNMENT':
        return { text: 'UNIT DISPATCH', cls: 'bg-blue-950/80 text-blue-300 border-blue-800/60' };
      default:
        return { text: 'SYSTEM EVENT', cls: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Incident ID', 'Operator', 'Action Type', 'Old Value', 'New Value', 'Justification Reason'];
    const rows = auditLog.map(l => [
      l.timestamp,
      l.incidentId,
      `"${l.operator}"`,
      l.actionType,
      `"${l.oldValue}"`,
      `"${l.newValue}"`,
      `"${l.reason.replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RESQNET_Audit_Log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0c1322] border border-[#1b263d] rounded-xl p-6 shadow-card-subtle flex flex-col min-h-[600px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#162035] mb-5 gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-800/40 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Coordinator Audit & Accountability Log
              </h2>
              <p className="text-xs text-slate-400">
                Immutable operational ledger recording all priority overrides, verification transitions, and field actions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0e172a] hover:bg-cyan-950/70 text-slate-300 hover:text-cyan-300 border border-[#1e293b] hover:border-cyan-500/40 font-mono text-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export CSV Audit Log</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 text-xs font-mono">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit log by Incident ID, Operator name, or keyword..."
            className="w-full pl-9 pr-4 py-2 bg-[#080d1a] border border-[#1b263d] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[#080d1a] border border-[#1b263d] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Action Types</option>
          <option value="PRIORITY_SCORE_OVERRIDE">Priority Overrides</option>
          <option value="VERIFICATION_STATUS_CHANGE">Verification Changes</option>
          <option value="RESPONSE_STATUS_CHANGE">Response Status</option>
          <option value="TEAM_ASSIGNMENT">Team Assignments</option>
        </select>
      </div>

      {/* Log Entries Timeline */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No audit records match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.actionType);
            const dateStr = new Date(log.timestamp).toLocaleString();

            return (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-[#080d1a] border border-[#162035] hover:border-cyan-500/30 transition-all text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#141d33] mb-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badge.cls}`}>
                      {badge.text}
                    </span>

                    <button
                      onClick={() => onSelectIncidentById && onSelectIncidentById(log.incidentId)}
                      className="font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1"
                    >
                      <span>{log.incidentId}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-500/70" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Operator</span>
                    <span className="text-slate-200 font-medium">{log.operator}</span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">State Transition</span>
                    <div className="flex items-center space-x-2 font-mono text-slate-300">
                      <span className="bg-[#121c32] px-2 py-0.5 rounded text-slate-400">{log.oldValue || 'None'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="bg-cyan-950/70 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded font-bold">
                        {log.newValue}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#121a2d] bg-[#060913]/60 p-2.5 rounded">
                  <span className="text-[10px] font-mono uppercase text-amber-400/90 block mb-0.5 font-semibold">
                    Coordinator Justification Reason:
                  </span>
                  <p className="text-slate-300 italic leading-relaxed">
                    "{log.reason}"
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
