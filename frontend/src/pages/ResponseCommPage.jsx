import React from 'react';
import { 
  Radio, 
  Users, 
  Send, 
  Download, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  PhoneCall, 
  Activity, 
  Truck, 
  Sparkles,
  Info
} from 'lucide-react';

export default function ResponseCommPage({
  responseTeams = [],
  incidents = [],
  onOpenBroadcast,
  onOpenExportBrief,
  onSimulateIncoming,
  onAssignTeam,
  selectedIncident,
  onShowToast
}) {
  const activeIncidents = incidents.filter(i => i.responseStatus !== 'resolved');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Emergency Response Fleet & Crisis Communications
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Fleet Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tactical squad dispatch roster, simulated emergency broadcast transmitter, and SITREP operational export tools.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBroadcast}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Public Emergency Broadcast</span>
          </button>

          <button
            onClick={onOpenExportBrief}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export SITREP Brief</span>
          </button>
        </div>
      </div>

      {/* Honest Prototype & Simulation Disclaimer Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-1 text-slate-700">
        <div className="flex items-center space-x-2 text-amber-800 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Operational Simulation Notice (Prototype Environment)</span>
        </div>
        <p className="text-[11px] text-amber-900/80 leading-relaxed">
          The response team fleet roster and emergency broadcast transmitter are prototype simulation modules for exercises and training. <strong className="text-amber-950">No real telecommunications carrier packets or municipal 911/112 dispatches are triggered.</strong> All broadcast logs remain local or within the test SQLite audit ledger.
        </p>
      </div>

      {/* Main Grid: Response Team Roster (Left) + Broadcast & Simulation Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Response Squad Fleet Roster */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Assigned Response Team (Demo Fleet Roster)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Specialized tactical squads available for multi-hazard deployment
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
              {responseTeams.length} Squads Active
            </span>
          </div>

          {/* Roster Cards */}
          <div className="space-y-3">
            {responseTeams.map((team) => {
              const assignedIncidents = incidents.filter(i => i.assignedTeam === team.name);
              const isAvailable = team.status === 'available' || assignedIncidents.length === 0;

              return (
                <div
                  key={team.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {team.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          {team.type}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isAvailable ? '● Available' : '● Deployed / On Mission'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          [Simulated]
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Capabilities: Search & rescue extrication, paramedic triage, hazmat isolation.
                      </p>

                      {assignedIncidents.length > 0 && (
                        <div className="mt-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-900">Current Mission: </span>
                          {assignedIncidents.map(ai => (
                            <span key={ai.id} className="font-mono text-blue-700 mr-2">
                              {ai.id} ({ai.title})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedIncident && (
                      <button
                        onClick={() => {
                          onAssignTeam(selectedIncident.id, team.name);
                          onShowToast?.(`Assigned ${team.name} to ${selectedIncident.id}`, 'success');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex-shrink-0 transition-colors"
                      >
                        Assign to {selectedIncident.id}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Broadcast Controls & Alert Injection Simulation */}
        <div className="lg:col-span-5 space-y-5">
          {/* Public Emergency Broadcast Trigger Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <Radio className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Public Emergency Broadcast Transmitter
                </h3>
                <p className="text-[11px] text-slate-500">
                  Compose simulated EAS and SMS civilian alert advisories
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Disseminate emergency alerts for flash flood evacuation, toxic plume exclusion zones, or infrastructure blackouts across specific geographical sectors.
            </p>

            <button
              onClick={onOpenBroadcast}
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Broadcast Modal (Simulated)</span>
            </button>
          </div>

          {/* Drill / Simulation Tooling Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <Zap className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Emergency Scenario Simulation & Drill Injection
                </h3>
                <p className="text-[11px] text-slate-500">
                  Inject synthetic alerts for triage testing and drill evaluations
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Injects simulated high-severity incidents (e.g. anhydrous ammonia freight leak, power grid failure) directly into the NLP classification pipeline.
            </p>

            <button
              onClick={onSimulateIncoming}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Inject Simulated Emergency Alert</span>
            </button>
          </div>

          {/* SITREP Export Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <Download className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Export Operational Briefing (SITREP)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Generate formatted markdown briefing for command briefings
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Compiles total active incidents, life-threat emergencies, unverified queue count, and underreported zone warnings into an exportable SITREP document.
            </p>

            <button
              onClick={onOpenExportBrief}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Open SITREP Export Dialog</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
