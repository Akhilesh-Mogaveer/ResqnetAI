import React from 'react';
import { 
  Radio, 
  AlertTriangle, 
  WifiOff, 
  ChevronRight, 
  Compass, 
  Eye, 
  Send,
  ShieldCheck
} from 'lucide-react';

export default function UnderreportedZones({ 
  zones, 
  onSelectZone, 
  onDispatchScout 
}) {
  return (
    <div className="bg-[#0c1322] border border-[#1b263d] rounded-xl p-4 shadow-card-subtle flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#162035] mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-white tracking-wide">Underreported zones</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Signal Gaps
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Signal gaps needing coordinator attention</p>
          </div>
          <span className="text-slate-400 text-xs font-mono font-medium">
            {zones.length} sectors
          </span>
        </div>

        {/* Zones List */}
        <div className="space-y-2.5">
          {zones.map((zone) => {
            const isNegative = zone.signalDeviation.startsWith('-');
            return (
              <div
                key={zone.id}
                className="p-3 rounded-lg bg-[#080d1a] hover:bg-[#10192e] border border-[#162035] hover:border-cyan-500/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-1.5 rounded mt-0.5 ${
                      isNegative ? 'bg-red-950/60 text-red-400 border border-red-800/40' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40'
                    }`}>
                      <WifiOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {zone.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {zone.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>{zone.signalCount}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-amber-400/90 font-mono text-[10px]">{zone.confidence}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Est. barrier: <span className="text-slate-300">{zone.estimatedBarriers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${
                      isNegative ? 'text-red-400' : 'text-cyan-400'
                    }`}>
                      {zone.signalDeviation}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-mono">
                      vs. baseline
                    </div>
                    
                    <button
                      onClick={() => onDispatchScout && onDispatchScout(zone)}
                      className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#131e36] hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 transition-colors flex items-center space-x-1 ml-auto"
                    >
                      <span>{zone.scoutStatus === 'Unassigned' ? 'Scout' : zone.scoutStatus}</span>
                      <ChevronRight className="w-3 h-3 inline" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Safety Alert Callout (as in reference screenshot) */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/30 text-amber-300/90 flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-amber-300 font-semibold">Caution:</strong> Low signal does not indicate safety. Connectivity loss, power failure, or demographic reporting barriers may mask severe need — not lower need.
        </div>
      </div>
    </div>
  );
}
