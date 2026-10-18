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
  zones = [],
  onSelectZone,
  onDispatchScout
}) {
  return (
    <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl p-4 shadow-md flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#203550] mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">Underreported zones</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold">
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
            const isNegative = zone.signalDeviation && zone.signalDeviation.startsWith('-');
            return (
              <div
                key={zone.id}
                className="p-3 rounded-lg bg-[#091629] hover:bg-[#132238] border border-[#203550] hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-1.5 rounded mt-0.5 ${
                      isNegative ? 'bg-rose-950/60 text-[#FF4566] border border-rose-800/40' : 'bg-blue-950/60 text-[#21D4FD] border border-blue-800/40'
                    }`}>
                      <WifiOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                          {zone.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          {zone.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>{zone.signalCount}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-amber-400 font-mono text-[10px] font-medium">{zone.confidence}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Est. barrier: <span className="text-slate-300">{zone.estimatedBarriers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${
                      isNegative ? 'text-[#FF4566]' : 'text-[#21D4FD]'
                    }`}>
                      {zone.signalDeviation}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-mono">
                      vs. baseline
                    </div>

                    <button
                      onClick={() => onDispatchScout && onDispatchScout(zone)}
                      className="mt-2 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0D1B2D] hover:bg-[#132238] text-[#21D4FD] border border-[#203550] hover:border-[#2878FF]/50 transition-colors flex items-center space-x-1 ml-auto shadow-xs"
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

      {/* Mandatory Safety Alert Callout */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50 text-amber-200 flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 text-[#FFB547] flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-[#FFB547] font-semibold">Caution:</strong> Low signal does not indicate safety. Connectivity loss, power failure, or demographic reporting barriers may mask severe need — not lower need.
        </div>
      </div>
    </div>
  );
}
