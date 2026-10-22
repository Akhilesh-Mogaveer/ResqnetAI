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
    <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 flex flex-col justify-between">
      <div>
        {/* Header matching emergency command center style */}
        <div className="flex items-center justify-between pb-3 mb-3">
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-clay-button bg-severity-high/15 shadow-clay-button flex items-center justify-center flex-shrink-0 mt-0.5">
              <Radio className="w-4 h-4 text-[#B26A00]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-text-primary tracking-wide">Underreported Zones</h2>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-severity-high/15 text-[#B26A00] font-bold shadow-clay-pill">
                  Signal Gaps
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Telemetry anomalies requiring coordinator review & reconnaissance
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text-muted text-xs font-mono font-medium hidden sm:inline">
              {zones.length} sectors
            </span>
            {onSelectZone && (
              <button
                type="button"
                onClick={() => onSelectZone(zones[0])}
                className="text-xs font-semibold text-brand-primary hover:text-brand-hover flex items-center space-x-1 px-3 py-1.5 rounded-clay-button bg-surface-card shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Column Header for structured alignment */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
          <div className="col-span-4">Zone</div>
          <div className="col-span-2 text-center">Signal Gap</div>
          <div className="col-span-2 text-center">Last Signal</div>
          <div className="col-span-2 text-center">Confidence</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Zones List */}
        <div className="space-y-2.5">
          {zones.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-muted">
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
                  className="rounded-clay-card bg-surface-card shadow-clay-button transition-all overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2">
                      {/* Col 1: Zone (Icon + Name + ID) */}
                      <div className="sm:col-span-4 flex items-center space-x-2.5 min-w-0">
                        <div className={`p-2 rounded-clay-button shadow-clay-button flex-shrink-0 ${
                          isNegative
                            ? 'bg-severity-critical/15 text-[#C0292E]'
                            : 'bg-brand-primary/10 text-brand-primary'
                        }`}>
                          <Radio className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-text-primary truncate">
                            {zone.name}
                          </div>
                          <div className="text-[10px] font-mono text-text-muted">
                            {zone.id}
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Signal Gap */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center">
                        <span className="sm:hidden text-[10px] text-text-muted mr-2 font-mono">Signal Gap:</span>
                        <span className={`text-xs font-mono font-bold ${
                          isNegative ? 'text-[#C0292E]' : 'text-brand-primary'
                        }`}>
                          {zone.signalDeviation}
                        </span>
                      </div>

                      {/* Col 3: Last Signal */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center text-[11px] text-text-secondary font-mono">
                        <span className="sm:hidden text-[10px] text-text-muted mr-2 font-mono">Last Signal:</span>
                        <Clock className="w-3 h-3 text-text-muted mr-1 hidden sm:inline" />
                        <span className="truncate">{zone.lastReportTime || 'Recent'}</span>
                      </div>

                      {/* Col 4: Confidence Badge */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill text-center truncate ${
                          isLowConfidence
                            ? 'bg-severity-high/15 text-[#B26A00]'
                            : 'bg-brand-primary/15 text-brand-primary'
                        }`}>
                          {zone.confidence}
                        </span>
                      </div>

                      {/* Col 5: Action Button & Details Toggle */}
                      <div className="sm:col-span-2 flex items-center justify-end space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onDispatchScout && onDispatchScout(zone)}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-clay-button bg-surface-card hover:bg-surface-card/80 text-brand-primary shadow-clay-button active:shadow-clay-inset transition-all flex items-center space-x-1 cursor-pointer truncate"
                          title="Dispatch reconnaissance scout or drone"
                        >
                          <Send className="w-2.5 h-2.5 text-brand-primary" />
                          <span className="truncate">{zone.scoutStatus === 'Unassigned' ? 'Dispatch Recon' : (zone.scoutStatus || 'Dispatch Recon')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(zone.id)}
                          className="text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-inset transition-colors cursor-pointer"
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
                      <div className="mt-3 text-[11px] space-y-2 bg-surface-inset p-3.5 rounded-clay-input shadow-clay-inset">
                        {zone.estimatedBarriers && (
                          <div className="flex items-start space-x-2">
                            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-clay-pill bg-brand-primary/10 text-brand-primary font-bold shadow-clay-pill flex-shrink-0 mt-0.5">
                              Model Estimate
                            </span>
                            <div>
                              <span className="text-text-secondary font-medium">Estimated Barrier:</span>{' '}
                              <span className="text-text-primary">{zone.estimatedBarriers}</span>
                            </div>
                          </div>
                        )}
                        {zone.populationAtRisk && (
                          <div className="flex items-start space-x-2">
                            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-clay-pill bg-brand-primary/10 text-brand-primary font-bold shadow-clay-pill flex-shrink-0 mt-0.5">
                              Model Estimate
                            </span>
                            <div>
                              <span className="text-text-secondary font-medium">Population At Risk:</span>{' '}
                              <span className="text-text-primary">{zone.populationAtRisk}</span>
                            </div>
                          </div>
                        )}
                        {zone.notes && (
                          <div className="text-[10px] text-text-secondary italic pl-2 border-l-2 border-brand-primary/40">
                            "{zone.notes}"
                          </div>
                        )}
                        {isLowConfidence && (
                          <div className="flex items-center space-x-1.5 text-[10px] text-[#B26A00] bg-severity-high/10 p-2.5 rounded-clay-card shadow-clay-card">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#B26A00] flex-shrink-0" />
                            <span>Uncorroborated telemetry — subject to coordinator ground review.</span>
                          </div>
                        )}
                        {zone.coordinates && onSelectZone && (
                          <button
                            type="button"
                            onClick={() => onSelectZone(zone)}
                            className="mt-1 text-[10px] text-brand-primary hover:underline flex items-center space-x-1 cursor-pointer"
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
      <div className="mt-4 p-3 rounded-clay-card bg-severity-high/10 text-text-primary shadow-clay-card flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 text-[#B26A00] flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-text-secondary">
          <strong className="text-[#B26A00] font-semibold">Caution:</strong> Missing telemetry indicates an infrastructure or reporting void, not proof of safety or active disaster. Ground reconnaissance is required before drawing operational conclusions.
        </div>
      </div>
    </div>
  );
}
