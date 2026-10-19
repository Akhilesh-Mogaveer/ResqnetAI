import React, { useState } from 'react';
import {
  AlertTriangle,
  Radio,
  WifiOff,
  ChevronRight,
  ChevronDown,
  Clock,
  ShieldAlert,
  Send,
  MapPin,
  ExternalLink,
  MoreVertical
} from 'lucide-react';

export default function UnderreportedZones({
  zones = [],
  onSelectZone,
  onDispatchScout
}) {
  const [expandedZoneId, setExpandedZoneId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedZoneId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl p-4 shadow-md flex flex-col justify-between">
      <div>
        {/* Header matching emergency command center style */}
        <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-3">
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Radio className="w-4 h-4 text-[#FFB547]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-wide">Underreported Zones</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/60 font-semibold">
                  Signal Gaps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Telemetry anomalies requiring coordinator review & reconnaissance
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-xs font-mono font-medium hidden sm:inline">
              {zones.length} sectors
            </span>
            {onSelectZone && (
              <button
                type="button"
                onClick={() => onSelectZone(zones[0])}
                className="text-xs font-semibold text-[#21D4FD] hover:text-white flex items-center space-x-1 px-2 py-1 rounded bg-[#091629] border border-[#203550] hover:border-[#2878FF]/50 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Column Header for structured alignment */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-[#203550]/60 mb-2">
          <div className="col-span-4">Zone</div>
          <div className="col-span-2 text-center">Signal Gap</div>
          <div className="col-span-2 text-center">Last Signal</div>
          <div className="col-span-2 text-center">Confidence</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Zones List */}
        <div className="space-y-2.5">
          {zones.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No signal gap anomalies detected across active sectors.
            </div>
          ) : (
            zones.map((zone) => {
              const isNegative = zone.signalDeviation && zone.signalDeviation.startsWith('-');
              const isExpanded = expandedZoneId === zone.id;
              const isLowConfidence = zone.confidence?.toLowerCase().includes('low');

              return (
                <div
                  key={zone.id}
                  className="rounded-lg bg-[#091629] border border-[#203550] hover:border-[#3A5A80] transition-all overflow-hidden"
                >
                  <div className="p-2.5 sm:p-3">
                    <div className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2">
                      {/* Col 1: Zone (Icon + Name + ID) */}
                      <div className="sm:col-span-4 flex items-center space-x-2.5 min-w-0">
                        <div className={`p-1.5 rounded-md flex-shrink-0 ${
                          isNegative
                            ? 'bg-rose-950/60 text-[#FF4566] border border-rose-800/50'
                            : 'bg-sky-950/60 text-[#21D4FD] border border-sky-800/50'
                        }`}>
                          <Radio className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {zone.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {zone.id}
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Signal Gap */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center">
                        <span className="sm:hidden text-[10px] text-slate-400 mr-2 font-mono">Signal Gap:</span>
                        <span className={`text-xs font-mono font-bold ${
                          isNegative ? 'text-[#FF4566]' : 'text-[#21D4FD]'
                        }`}>
                          {zone.signalDeviation}
                        </span>
                      </div>

                      {/* Col 3: Last Signal */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center text-[11px] text-slate-300 font-mono">
                        <span className="sm:hidden text-[10px] text-slate-400 mr-2 font-mono">Last Signal:</span>
                        <Clock className="w-3 h-3 text-slate-500 mr-1 hidden sm:inline" />
                        <span className="truncate">{zone.lastReportTime || 'Recent'}</span>
                      </div>

                      {/* Col 4: Confidence Badge */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border text-center truncate ${
                          isLowConfidence
                            ? 'bg-amber-950/50 text-[#FFB547] border-amber-800/50'
                            : 'bg-sky-950/50 text-[#21D4FD] border-sky-800/50'
                        }`}>
                          {zone.confidence}
                        </span>
                      </div>

                      {/* Col 5: Action Button & Details Toggle */}
                      <div className="sm:col-span-2 flex items-center justify-end space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onDispatchScout && onDispatchScout(zone)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#132238] hover:bg-[#203550] text-[#21D4FD] hover:text-white border border-[#203550] hover:border-[#2878FF]/50 transition-colors flex items-center space-x-1 shadow-xs truncate"
                          title="Dispatch reconnaissance scout or drone"
                        >
                          <Send className="w-2.5 h-2.5 text-cyan-400" />
                          <span className="truncate">{zone.scoutStatus === 'Unassigned' ? 'Dispatch Recon' : (zone.scoutStatus || 'Dispatch Recon')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(zone.id)}
                          className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-[#132238] transition-colors"
                          title={isExpanded ? 'Less' : 'Details'}
                          aria-label={isExpanded ? 'Less details' : 'Show details'}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Panel */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#203550] text-[11px] space-y-2 bg-[#07111F]/70 p-3 rounded-lg">
                        {zone.estimatedBarriers && (
                          <div className="flex items-start space-x-2">
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50 font-semibold flex-shrink-0 mt-0.5">
                              Model Estimate
                            </span>
                            <div>
                              <span className="text-slate-400 font-medium">Estimated Barrier:</span>{' '}
                              <span className="text-slate-200">{zone.estimatedBarriers}</span>
                            </div>
                          </div>
                        )}
                        {zone.populationAtRisk && (
                          <div className="flex items-start space-x-2">
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50 font-semibold flex-shrink-0 mt-0.5">
                              Model Estimate
                            </span>
                            <div>
                              <span className="text-slate-400 font-medium">Population At Risk:</span>{' '}
                              <span className="text-slate-200">{zone.populationAtRisk}</span>
                            </div>
                          </div>
                        )}
                        {zone.notes && (
                          <div className="text-[10px] text-slate-300 italic pl-1 border-l-2 border-[#203550]">
                            "{zone.notes}"
                          </div>
                        )}
                        {isLowConfidence && (
                          <div className="flex items-center space-x-1.5 text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900/40">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span>Uncorroborated telemetry — subject to coordinator ground review.</span>
                          </div>
                        )}
                        {zone.coordinates && onSelectZone && (
                          <button
                            type="button"
                            onClick={() => onSelectZone(zone)}
                            className="mt-1 text-[10px] text-[#21D4FD] hover:underline flex items-center space-x-1"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>View sector on map</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mandatory Safety Alert Callout */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50 text-amber-200 flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 text-[#FFB547] flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-[#FFB547] font-semibold">Caution:</strong> Missing telemetry indicates an infrastructure or reporting void, not proof of safety or active disaster. Ground reconnaissance is required before drawing operational conclusions.
        </div>
      </div>
    </div>
  );
}
