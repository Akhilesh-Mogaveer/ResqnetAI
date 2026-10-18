import React from 'react';
import SummaryCards from '../components/SummaryCards';
import IncidentMap from '../components/IncidentMap';
import UnderreportedZones from '../components/UnderreportedZones';
import { 
  AlertTriangle, 
  ShieldAlert, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Users, 
  Radio, 
  Activity,
  Compass,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function OverviewPage({
  incidents = [],
  attentionZones = [],
  selectedIncident,
  onSelectIncident,
  onNavigateTab,
  onDispatchScout,
  onVerifyStatusChange,
  onResponseStatusChange,
  backendConnected
}) {
  // Most urgent incidents (sorted by priority score descending)
  const urgentIncidents = [...incidents]
    .filter(i => !i.is_duplicate && i.responseStatus !== 'resolved' && i.responseStatus !== 'merged_duplicate')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 4);

  const unverifiedCount = incidents.filter(i => i.verificationStatus === 'unverified' && !i.is_duplicate).length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.responseStatus !== 'resolved').length;
  const unassignedCount = incidents.filter(i => (!i.assignedTeam || i.responseStatus === 'unassigned') && !i.is_duplicate).length;

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Operational Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Emergency Response Operations Overview
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live SitRep
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-hazard coordination dashboard. Review urgent incidents, verify incoming civilian reports, and dispatch teams.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Median Triage: <strong>11m</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center space-x-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Est. Affected: <strong>1,284</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Four Essential Metrics */}
      <SummaryCards
        incidents={incidents}
        attentionZones={attentionZones}
        onFilterClick={(filterType) => {
          if (filterType === 'zones') onNavigateTab('map');
          else if (filterType === 'unverified') onNavigateTab('verification');
          else if (filterType === 'critical') onNavigateTab('priority');
          else onNavigateTab('incidents');
        }}
      />

      {/* 3. Primary Grid: Urgent Incidents (Left) + Map Preview & Action Prompts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Urgent Incidents */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Highest Priority Emergencies
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    Immediate Action
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Algorithmic triage ranking based on life-threat severity and corroboration
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('priority')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>Full Priority Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of top urgent incidents */}
            <div className="space-y-3">
              {urgentIncidents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No active urgent emergencies reported</p>
                  <p className="text-slate-400 mt-0.5">All monitored channels operating within nominal safety thresholds.</p>
                </div>
              ) : (
                urgentIncidents.map((incident, idx) => {
                  const isSelected = selectedIncident?.id === incident.id;
                  const isCrit = incident.severity === 'critical';

                  return (
                    <div
                      key={incident.id}
                      onClick={() => onSelectIncident(incident)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-300' 
                          : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 truncate">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                            isCrit ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            0{idx + 1}
                          </span>

                          <div className="truncate">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-semibold text-slate-900 text-xs truncate">
                                {incident.title}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                isCrit 
                                  ? 'bg-red-50 text-red-700 border-red-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {incident.severity}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1 font-mono">
                              <span className="font-semibold text-slate-700">{incident.id}</span>
                              <span>·</span>
                              <span>{incident.sector}</span>
                              <span>·</span>
                              <span>{incident.locationName}</span>
                              <span>·</span>
                              <span className="text-slate-400">{incident.timeAgo}</span>
                            </div>

                            {incident.whyPrioritised && (
                              <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-1 italic">
                                "{incident.whyPrioritised}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Priority Score badge */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Priority</span>
                          <span className={`text-base font-bold font-mono ${
                            incident.priorityScore >= 85 ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {incident.priorityScore}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            incident.verificationStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {incident.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified Report'}
                          </span>

                          <span className="text-[11px] text-slate-500">
                            Team: <strong className="text-slate-700">{incident.assignedTeam || 'Unassigned'}</strong>
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(incident);
                            onNavigateTab('incidents');
                          }}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <span>Manage Incident</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coordinator Action Center */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-3">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Actions Requiring Coordinator Attention
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Action 1: Unverified */}
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                    <span>Ground Truth Verification</span>
                    <span className="font-mono text-sm">{unverifiedCount}</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-1">
                    {unverifiedCount} reports awaiting human verification before dispatch.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('verification')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Verification Center</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action 2: Attention Zones */}
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-blue-800 text-xs font-bold">
                    <span>Underreported Voids</span>
                    <span className="font-mono text-sm">{attentionZones.length}</span>
                  </div>
                  <p className="text-[11px] text-blue-900/80 mt-1">
                    Signal drops indicate potential infrastructure failure, not safety.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('map')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Inspect Map Sectors</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action 3: Team Deployments */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-800 text-xs font-bold">
                    <span>Squad Dispatch</span>
                    <span className="font-mono text-sm">{unassignedCount}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {unassignedCount} incident records currently have no assigned response team.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('response')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-slate-700 hover:bg-slate-800 text-white transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Fleet Roster & Broadcast</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Geographic Map Preview + Underreported Sectors */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map Preview Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Geographic Operations Preview
                </h3>
                <p className="text-[11px] text-slate-500">
                  Interactive spatial distribution of active reported incidents
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 border border-blue-200"
              >
                <span>Open Full Live Map</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-[280px] rounded-lg overflow-hidden border border-slate-200">
              <IncidentMap
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => onSelectIncident(inc)}
                attentionZones={attentionZones}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Pins represent verified & unverified hazard coordinates</span>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-blue-600 hover:underline font-sans"
              >
                View layer controls →
              </button>
            </div>
          </div>

          {/* Underreported Sectors Summary */}
          <UnderreportedZones
            zones={attentionZones}
            onSelectZone={() => onNavigateTab('map')}
            onDispatchScout={onDispatchScout}
          />
        </div>
      </div>
    </div>
  );
}
