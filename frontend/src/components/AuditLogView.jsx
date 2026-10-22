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
        return { text: 'PRIORITY OVERRIDE', cls: 'bg-severity-critical/15 text-[#C0292E]' };
      case 'VERIFICATION_STATUS_CHANGE':
        return { text: 'VERIFICATION UPDATE', cls: 'bg-brand-primary/15 text-brand-primary' };
      case 'RESPONSE_STATUS_CHANGE':
        return { text: 'RESPONSE STATUS', cls: 'bg-severity-high/15 text-[#B26A00]' };
      case 'TEAM_ASSIGNMENT':
        return { text: 'UNIT DISPATCH', cls: 'bg-purple-500/15 text-purple-700' };
      default:
        return { text: 'SYSTEM EVENT', cls: 'bg-surface-inset text-text-secondary' };
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
    <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 flex flex-col min-h-[600px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-clay-button bg-brand-primary/10 text-brand-primary shadow-clay-button">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">
                Coordinator Audit & Accountability Log
              </h2>
              <p className="text-xs text-text-secondary">
                Immutable operational ledger recording all priority overrides, verification transitions, and field actions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-clay-button clay-button text-text-primary text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-brand-primary" />
          <span>Export CSV Audit Log</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 text-xs font-mono">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit log by Incident ID, Operator name, or keyword..."
            className="w-full pl-9 pr-4 py-2 bg-surface-inset shadow-clay-inset rounded-clay-input text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-sans transition-all"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-sans cursor-pointer transition-all"
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
          <div className="py-12 text-center text-text-muted text-xs">
            No audit records match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.actionType);
            const dateStr = new Date(log.timestamp).toLocaleString();

            return (
              <div
                key={log.id}
                className="p-4 rounded-clay-card shadow-clay-card bg-surface-card transition-all text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill font-bold ${badge.cls}`}>
                      {badge.text}
                    </span>

                    <button
                      onClick={() => onSelectIncidentById && onSelectIncidentById(log.incidentId)}
                      className="font-mono text-brand-primary hover:text-brand-hover font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{log.incidentId}</span>
                      <ExternalLink className="w-3 h-3 text-brand-primary" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-text-muted">
                    <Clock className="w-3 h-3 text-text-muted" />
                    <span className="font-mono">{dateStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block font-semibold">Operator</span>
                    <span className="text-text-primary font-medium">{log.operator}</span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-mono uppercase text-text-muted block font-semibold">State Transition</span>
                    <div className="flex items-center space-x-2 font-mono text-text-secondary">
                      <span className="bg-surface-inset shadow-clay-inset px-2.5 py-0.5 rounded-clay-pill text-text-secondary text-[11px]">{log.oldValue || 'None'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="bg-brand-primary/15 text-brand-primary px-2.5 py-0.5 rounded-clay-pill font-bold text-[11px] shadow-clay-pill">
                        {log.newValue}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 bg-surface-inset p-3 rounded-clay-input shadow-clay-inset">
                  <span className="text-[10px] font-mono uppercase text-text-secondary block mb-0.5 font-bold">
                    Coordinator Justification Reason:
                  </span>
                  <p className="text-text-primary italic leading-relaxed font-sans text-xs">
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
