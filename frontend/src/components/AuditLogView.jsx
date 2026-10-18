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
  auditLog = [],
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
        return { text: 'PRIORITY OVERRIDE', cls: 'bg-red-50 text-red-700 border-red-200' };
      case 'VERIFICATION_STATUS_CHANGE':
        return { text: 'VERIFICATION UPDATE', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'RESPONSE_STATUS_CHANGE':
        return { text: 'RESPONSE STATUS', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'TEAM_ASSIGNMENT':
        return { text: 'UNIT DISPATCH', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { text: 'SYSTEM EVENT', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col min-h-[600px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Coordinator Audit & Accountability Log
              </h2>
              <p className="text-xs text-slate-500">
                Immutable operational ledger recording all priority overrides, verification transitions, and field actions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-blue-500 font-sans"
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
                className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-all text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/80 mb-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${badge.cls}`}>
                      {badge.text}
                    </span>

                    <button
                      onClick={() => onSelectIncidentById && onSelectIncidentById(log.incidentId)}
                      className="font-mono text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                    >
                      <span>{log.incidentId}</span>
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Operator</span>
                    <span className="text-slate-800 font-medium">{log.operator}</span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">State Transition</span>
                    <div className="flex items-center space-x-2 font-mono text-slate-700">
                      <span className="bg-slate-200/70 px-2 py-0.5 rounded text-slate-600 text-[11px]">{log.oldValue || 'None'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold text-[11px]">
                        {log.newValue}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 bg-white p-2.5 rounded border border-slate-200/80">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5 font-bold">
                    Coordinator Justification Reason:
                  </span>
                  <p className="text-slate-800 italic leading-relaxed font-sans text-xs">
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
