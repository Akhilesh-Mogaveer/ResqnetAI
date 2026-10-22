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
      <div 
        className="relative bg-surface-card p-6 rounded-clay-card shadow-clay-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden border-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(245, 247, 251, 0.95) 0%, rgba(245, 247, 251, 0.85) 50%, rgba(238, 241, 246, 0.70) 100%), url('/images/header-response.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Emergency Response Fleet & Crisis Communications
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-primary font-semibold shadow-clay-pill">
              Fleet Operations
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Tactical squad dispatch roster, simulated emergency broadcast transmitter, and dynamic community emergency number settings.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={onOpenBroadcast}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-clay-button bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Public Emergency Broadcast</span>
          </button>

          <button
            onClick={onOpenExportBrief}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-clay-button bg-surface-card hover:bg-white text-text-secondary hover:text-text-primary font-semibold text-xs shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-text-muted" />
            <span>Export SITREP Brief</span>
          </button>
        </div>
      </div>

      {/* Dynamic Community Emergency Number & Android SMS Gateway */}
      <CommunityEmergencyNumberCard onShowToast={onShowToast} />

      {/* Honest Prototype & Simulation Disclaimer Banner */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-clay-card p-4 text-xs space-y-1 text-amber-900 shadow-clay-card">
        <div className="flex items-center space-x-2 text-amber-700 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Operational Simulation Notice (Prototype Environment)</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          The response team fleet roster and emergency broadcast transmitter are prototype simulation modules for exercises and training. <strong className="text-amber-950 font-semibold">No real telecommunications carrier packets or municipal 911/112 dispatches are triggered.</strong> All broadcast logs remain local or within the test SQLite audit ledger.
        </p>
      </div>

      {/* Main Grid: Response Team Roster (Left) + Broadcast & Simulation Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Response Squad Fleet Roster */}
        <div className="lg:col-span-7 bg-surface-card rounded-clay-card shadow-clay-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-brand-primary" />
                <h2 className="text-sm font-bold text-text-primary">
                  Assigned Response Team (Demo Fleet Roster)
                </h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Specialized tactical squads available for multi-hazard deployment
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-primary font-bold shadow-clay-pill">
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
                  className="p-4 rounded-clay-card bg-surface-card shadow-clay-button hover:bg-white transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-text-primary text-xs">
                          {team.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-brand-primary font-semibold">
                          {team.type}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isAvailable ? '● Available' : '● Deployed / On Mission'}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          [Simulated]
                        </span>
                      </div>

                      <p className="text-[11px] text-text-secondary">
                        Capabilities: Search & rescue extrication, paramedic triage, hazmat isolation.
                      </p>

                      {assignedIncidents.length > 0 && (
                        <div className="mt-2 text-xs text-text-secondary bg-surface-inset p-3 rounded-clay-card shadow-clay-inset">
                          <span className="font-semibold text-text-primary">Current Mission: </span>
                          {assignedIncidents.map(ai => (
                            <span key={ai.id} className="font-mono text-brand-primary mr-2 font-semibold">
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
                        className="px-3.5 py-1.5 rounded-clay-button bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-clay-primary active:shadow-clay-inset flex-shrink-0 transition-all cursor-pointer"
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
          <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2">
              <Radio className="w-5 h-5 text-severity-critical" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Public Emergency Broadcast Transmitter
                </h3>
                <p className="text-[11px] text-text-muted">
                  Compose simulated EAS and SMS civilian alert advisories
                </p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Disseminate emergency alerts for flash flood evacuation, toxic plume exclusion zones, or infrastructure blackouts across specific geographical sectors.
            </p>

            <button
              onClick={onOpenBroadcast}
              className="w-full py-2.5 rounded-clay-button clay-button-critical text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Broadcast Modal (Simulated)</span>
            </button>
          </div>

          {/* Drill / Simulation Tooling Card */}
          <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2">
              <Zap className="w-4 h-4 text-severity-high" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Emergency Scenario Simulation & Drill Injection
                </h3>
                <p className="text-[11px] text-text-muted">
                  Inject synthetic alerts for triage testing and drill evaluations
                </p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Injects simulated high-severity incidents (e.g. anhydrous ammonia freight leak, power grid failure) directly into the NLP classification pipeline.
            </p>

            <button
              onClick={onSimulateIncoming}
              className="w-full py-2.5 rounded-clay-button clay-button text-text-primary font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-severity-high" />
              <span>Inject Simulated Emergency Alert</span>
            </button>
          </div>

          {/* SITREP Export Card */}
          <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2">
              <Download className="w-4 h-4 text-brand-primary" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Export Operational Briefing (SITREP)
                </h3>
                <p className="text-[11px] text-text-muted">
                  Generate formatted markdown briefing for command briefings
                </p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Compiles total active incidents, life-threat emergencies, unverified queue count, and underreported zone warnings into an exportable SITREP document.
            </p>

            <button
              onClick={onOpenExportBrief}
              className="w-full py-2.5 rounded-clay-button clay-button-primary text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
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
