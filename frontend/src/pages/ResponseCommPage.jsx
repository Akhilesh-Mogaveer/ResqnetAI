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

import CommunityEmergencyNumberCard from '../components/CommunityEmergencyNumberCard';

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
      <div className="bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Emergency Response Fleet & Crisis Communications
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Fleet Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tactical squad dispatch roster, simulated emergency broadcast transmitter, and dynamic community emergency number settings.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBroadcast}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Public Emergency Broadcast</span>
          </button>

          <button
            onClick={onOpenExportBrief}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#091629] hover:bg-[#132238] text-slate-200 font-semibold text-xs border border-[#203550] transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export SITREP Brief</span>
          </button>
        </div>
      </div>

      {/* Dynamic Community Emergency Number & Android SMS Gateway */}
      <CommunityEmergencyNumberCard onShowToast={onShowToast} />

      {/* Honest Prototype & Simulation Disclaimer Banner */}
      <div className="bg-[#132238] border border-amber-500/30 rounded-xl p-4 text-xs space-y-1 text-slate-300">
        <div className="flex items-center space-x-2 text-amber-400 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Operational Simulation Notice (Prototype Environment)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          The response team fleet roster and emergency broadcast transmitter are prototype simulation modules for exercises and training. <strong className="text-white font-semibold">No real telecommunications carrier packets or municipal 911/112 dispatches are triggered.</strong> All broadcast logs remain local or within the test SQLite audit ledger.
        </p>
      </div>

      {/* Main Grid: Response Team Roster (Left) + Broadcast & Simulation Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Response Squad Fleet Roster */}
        <div className="lg:col-span-7 bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203550]">
            <div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">
                  Assigned Response Team (Demo Fleet Roster)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Specialized tactical squads available for multi-hazard deployment
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#132238] text-slate-300 font-bold border border-[#203550]">
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
                  className="p-4 rounded-xl border border-[#203550] bg-[#091629] hover:bg-[#132238] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs">
                          {team.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                          {team.type}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                          isAvailable
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {isAvailable ? '● Available' : '● Deployed / On Mission'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          [Simulated]
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Capabilities: Search & rescue extrication, paramedic triage, hazmat isolation.
                      </p>

                      {assignedIncidents.length > 0 && (
                        <div className="mt-2 text-xs text-slate-300 bg-[#0D1B2D] p-2.5 rounded-lg border border-[#203550]">
                          <span className="font-semibold text-white">Current Mission: </span>
                          {assignedIncidents.map(ai => (
                            <span key={ai.id} className="font-mono text-cyan-400 mr-2">
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
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex-shrink-0 transition-colors"
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
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#203550]">
              <Radio className="w-5 h-5 text-rose-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Public Emergency Broadcast Transmitter
                </h3>
                <p className="text-[11px] text-slate-400">
                  Compose simulated EAS and SMS civilian alert advisories
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Disseminate emergency alerts for flash flood evacuation, toxic plume exclusion zones, or infrastructure blackouts across specific geographical sectors.
            </p>

            <button
              onClick={onOpenBroadcast}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Broadcast Modal (Simulated)</span>
            </button>
          </div>

          {/* Drill / Simulation Tooling Card */}
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#203550]">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Emergency Scenario Simulation & Drill Injection
                </h3>
                <p className="text-[11px] text-slate-400">
                  Inject synthetic alerts for triage testing and drill evaluations
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Injects simulated high-severity incidents (e.g. anhydrous ammonia freight leak, power grid failure) directly into the NLP classification pipeline.
            </p>

            <button
              onClick={onSimulateIncoming}
              className="w-full py-2.5 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-semibold text-xs border border-[#203550] shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Inject Simulated Emergency Alert</span>
            </button>
          </div>

          {/* SITREP Export Card */}
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#203550]">
              <Download className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Export Operational Briefing (SITREP)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Generate formatted markdown briefing for command briefings
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Compiles total active incidents, life-threat emergencies, unverified queue count, and underreported zone warnings into an exportable SITREP document.
            </p>

            <button
              onClick={onOpenExportBrief}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
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
