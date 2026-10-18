import React from 'react';
import SummaryCards from '../components/SummaryCards';
import IncidentMap from '../components/IncidentMap';
import UnderreportedZones from '../components/UnderreportedZones';
import EnvironmentalConditionsPanel from '../components/EnvironmentalConditionsPanel';
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

  const unverifiedCount = incidents.filter(i => i.verificationStatus === 'unverified' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.responseStatus !== 'resolved' && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;
  const unassignedCount = incidents.filter(i => (!i.assignedTeam || i.responseStatus === 'unassigned') && !i.is_duplicate && i.responseStatus !== 'merged_duplicate').length;

  return (
    <div className="space-y-6">
      {/* 1. Page Header Hero Banner with Flood / Disaster Backdrop */}
      <div 
        className="relative rounded-2xl border border-[#203550] p-6 shadow-xl overflow-hidden bg-[#0D1B2D]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.72) 0%, rgba(7, 17, 31, 0.40) 50%, rgba(9, 22, 41, 0.18) 100%), url('/images/flood-bg-1.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                Emergency Response Operations Overview
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#07111F]/90 text-[#21D4FD] border border-[#2878FF]/50 shadow-md backdrop-blur-xs">
                Live SitRep
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-100 font-medium mt-1.5 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] max-w-xl">
              Real-time multi-hazard coordination dashboard. Review urgent incidents, verify incoming civilian reports, and dispatch teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-[#07111F]/90 backdrop-blur-md border border-[#203550] text-slate-200 flex items-center space-x-2 shadow-md">
              <Clock className="w-3.5 h-3.5 text-[#21D4FD]" />
              <span>Median Triage: <strong className="text-white font-bold">11m</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#07111F]/90 backdrop-blur-md border border-[#203550] text-slate-200 flex items-center space-x-2 shadow-md">
              <Users className="w-3.5 h-3.5 text-[#FFB547]" />
              <span>Est. Affected: <strong className="text-white font-bold">1,284</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#07111F]/90 backdrop-blur-md border border-[#203550] text-slate-200 flex items-center space-x-2 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Fleet: <strong className="text-white font-bold">8 Squads</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Essential Operational Metrics */}
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

      {/* 3. Primary Grid: Urgent Incidents Queue (Left) + Interactive Map Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Urgent Incidents */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Highest Priority Emergencies
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/60 text-[#FF4566] border border-rose-800/40">
                    Immediate Action
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic triage ranking based on life-threat severity and corroboration
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('priority')}
                className="text-xs font-semibold text-[#21D4FD] hover:text-white flex items-center space-x-1 transition-colors"
              >
                <span>Full Priority Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of top urgent incidents */}
            <div className="space-y-3">
              {urgentIncidents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-medium text-slate-200">No active urgent emergencies reported</p>
                  <p className="text-slate-500 mt-0.5">All monitored channels operating within nominal safety thresholds.</p>
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
                          ? 'bg-[#132238] border-[#2878FF] shadow-md ring-1 ring-[#2878FF]/50' 
                          : 'bg-[#091629] hover:bg-[#132238]/80 border-[#203550] hover:border-[#3A5A80]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 truncate">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                            isCrit ? 'bg-rose-950/80 text-[#FF4566] border border-rose-800/60' : 'bg-amber-950/80 text-[#FFB547] border border-amber-800/60'
                          }`}>
                            0{idx + 1}
                          </span>

                          <div className="truncate">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-semibold text-white text-xs truncate">
                                {incident.title}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                isCrit 
                                  ? 'bg-rose-950/60 text-[#FF4566] border-rose-800/50' 
                                  : 'bg-amber-950/60 text-[#FFB547] border-amber-800/50'
                              }`}>
                                {incident.severity}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 text-[11px] text-slate-300 mt-1 font-mono">
                              <span className="font-semibold text-[#21D4FD]">{incident.id}</span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-200 font-medium">{incident.sector}</span>
                              <span className="text-slate-500">·</span>
                              <span className="truncate text-slate-300">{incident.locationName}</span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400">{incident.timeAgo}</span>
                            </div>

                            {incident.whyPrioritised && (
                              <p className="text-[11px] text-slate-200 mt-1.5 line-clamp-1 italic">
                                "{incident.whyPrioritised}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Priority Score badge */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Priority</span>
                          <span className={`text-base font-bold font-mono ${
                            incident.priorityScore >= 85 ? 'text-[#FF4566]' : 'text-[#FFB547]'
                          }`}>
                            {incident.priorityScore}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Footer */}
                      <div className="mt-3 pt-2.5 border-t border-[#203550] flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            incident.verificationStatus === 'verified'
                              ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                              : 'bg-amber-950/50 text-[#FFB547] border-amber-800/50'
                          }`}>
                            {incident.verificationStatus === 'verified' ? '✓ Verified' : '⚠ Unverified Report'}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            Team: <strong className="text-slate-200">{incident.assignedTeam || 'Unassigned'}</strong>
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(incident);
                            onNavigateTab('incidents');
                          }}
                          className="text-[11px] font-medium text-[#21D4FD] hover:text-white flex items-center space-x-1 transition-colors"
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
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#203550] mb-3">
              <ShieldAlert className="w-4 h-4 text-[#FFB547]" />
              <h2 className="text-sm font-bold text-white">
                Actions Requiring Coordinator Attention
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Action 1: Unverified */}
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-300 text-xs font-bold">
                    <span>Ground Truth Verification</span>
                    <span className="font-mono text-sm">{unverifiedCount}</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 mt-1">
                    {unverifiedCount} reports awaiting human verification before dispatch.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('verification')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-[#FFB547] hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Verification Center</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action 2: Attention Zones */}
              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[#21D4FD] text-xs font-bold">
                    <span>Underreported Voids</span>
                    <span className="font-mono text-sm">{attentionZones.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Signal drops indicate potential infrastructure failure, not safety.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('map')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-[#2878FF] hover:bg-blue-600 text-white transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Inspect Map Sectors</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action 3: Team Deployments */}
              <div className="p-3 rounded-lg bg-[#091629] border border-[#203550] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-200 text-xs font-bold">
                    <span>Squad Dispatch</span>
                    <span className="font-mono text-sm">{unassignedCount}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {unassignedCount} incident records currently have no assigned response team.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('response')}
                  className="mt-3 text-xs font-semibold px-2.5 py-1.5 rounded bg-[#132238] hover:bg-[#203550] border border-[#203550] text-slate-200 hover:text-white transition-colors flex items-center justify-center space-x-1"
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
          <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-md p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Geographic Operations Preview
                </h3>
                <p className="text-[11px] text-slate-400">
                  Interactive spatial distribution of active reported incidents
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-semibold text-[#21D4FD] hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded bg-[#091629] border border-[#203550] hover:border-[#2878FF]/50 transition-colors"
              >
                <span>Open Full Live Map</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-[320px] rounded-lg overflow-hidden border border-[#203550] bg-[#091629]">
              <IncidentMap
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => onSelectIncident(inc)}
                attentionZones={attentionZones}
                className="w-full h-full"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Pins represent verified & unverified hazard coordinates</span>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-[#21D4FD] hover:underline font-sans"
              >
                View layer controls &rarr;
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

      {/* 4. Public Environmental Conditions & Hydrology (Open-Meteo Integration) */}
      <EnvironmentalConditionsPanel selectedIncident={selectedIncident} />
    </div>
  );
}
