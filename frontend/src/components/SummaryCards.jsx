import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Radio,
  Flame,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function SummaryCards({
  incidents = [],
  attentionZones = [],
  onFilterClick
}) {
  const independentIncidents = incidents.filter(i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate');
  const activeCount = independentIncidents.filter(i => i.responseStatus !== 'resolved').length;
  const criticalCount = independentIncidents.filter(i => i.severity === 'critical' && i.responseStatus !== 'resolved').length;
  const unverifiedCount = independentIncidents.filter(i => i.verificationStatus === 'unverified').length;
  const attentionZonesCount = attentionZones.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Incidents Card */}
      <div
        onClick={() => onFilterClick?.('active')}
        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Active Incidents
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeCount < 10 ? `0${activeCount}` : activeCount}
          </span>
          <span className="text-xs text-slate-600">
            open reports
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Total registered: <strong className="text-slate-800">{incidents.length}</strong></span>
          <span className="text-blue-700 font-medium group-hover:underline">View Incidents &rarr;</span>
        </div>
      </div>

      {/* 2. Urgent / Critical Incidents Card (Red reserved for genuine emergency) */}
      <div
        onClick={() => onFilterClick?.('critical')}
        className="bg-white border border-rose-200 hover:border-rose-300 rounded-xl p-4 shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
            Urgent Incidents
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-rose-700 tracking-tight">
            {criticalCount < 10 ? `0${criticalCount}` : criticalCount}
          </span>
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            Highest Priority
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs text-slate-600">
          <span>Priority score &gt; 85</span>
          <span className="text-rose-700 font-medium group-hover:underline">Review Priority &rarr;</span>
        </div>
      </div>

      {/* 3. Awaiting Verification Card (Amber for review items) */}
      <div
        onClick={() => onFilterClick?.('unverified')}
        className="bg-white border border-amber-200 hover:border-amber-300 rounded-xl p-4 shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Awaiting Verification
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-amber-700 tracking-tight">
            {unverifiedCount < 10 ? `0${unverifiedCount}` : unverifiedCount}
          </span>
          <span className="text-xs text-amber-800 font-medium">
            needs field check
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-xs text-slate-600">
          <span>Ground truth pending</span>
          <span className="text-amber-700 font-medium group-hover:underline">Verify &rarr;</span>
        </div>
      </div>

      {/* 4. Attention-Needed Zones Card */}
      <div
        onClick={() => onFilterClick?.('zones')}
        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Attention-Needed Zones
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {attentionZonesCount < 10 ? `0${attentionZonesCount}` : attentionZonesCount}
          </span>
          <span className="text-xs text-slate-600">
            signal gaps
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Reporting dropoff detected</span>
          <span className="text-blue-700 font-medium group-hover:underline">Inspect Map &rarr;</span>
        </div>
      </div>
    </div>
  );
}
