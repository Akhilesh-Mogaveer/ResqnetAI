import React, { useState } from 'react';
import IncidentMap from '../components/IncidentMap';
import { 
  MapPin, 
  Layers, 
  Filter, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Info, 
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  Compass
} from 'lucide-react';

export default function LiveMapPage({
  incidents = [],
  attentionZones = [],
  selectedIncident,
  onSelectIncident,
  onNavigateTab
}) {
  const [filterSeverity, setFilterSeverity] = useState('all'); // all | critical | high | moderate
  const [filterVerification, setFilterVerification] = useState('all'); // all | verified | unverified
  const [showZonesLayer, setShowZonesLayer] = useState(true);

  // Filter incidents for display on the map
  const filteredIncidents = incidents.filter(inc => {
    if (filterSeverity === 'critical' && inc.severity !== 'critical') return false;
    if (filterSeverity === 'high' && inc.severity !== 'high') return false;
    if (filterSeverity === 'moderate' && inc.severity !== 'moderate') return false;

    if (filterVerification === 'verified' && inc.verificationStatus !== 'verified') return false;
    if (filterVerification === 'unverified' && inc.verificationStatus !== 'unverified') return false;

    return true;
  });

  // Calculate coordinates statistics
  const mappedCount = incidents.filter(i => i.coordinates && Array.isArray(i.coordinates) && i.coordinates[0] != null).length;
  const unmappedIncidents = incidents.filter(i => !i.coordinates || !Array.isArray(i.coordinates) || i.coordinates[0] == null);
  const syntheticCount = incidents.filter(i => i.is_synthetic_location).length;
  const geocodedCount = incidents.filter(i => i.location_source && i.location_source.startsWith('geocoded')).length;

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)] min-h-[650px]">
      {/* Top Header & Map Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Live Geospatial Operations Map
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              OpenStreetMap · Leaflet
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time geospatial distribution of active incident clusters and reporting void perimeters.
          </p>
        </div>

        {/* Filters and Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Severity filter */}
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            <span className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Severity:
            </span>
            {['all', 'critical', 'high'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  filterSeverity === s
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Verification filter */}
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            <span className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Verification:
            </span>
            {['all', 'verified', 'unverified'].map(v => (
              <button
                key={v}
                onClick={() => setFilterVerification(v)}
                className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  filterVerification === v
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Zone toggle */}
          <button
            onClick={() => setShowZonesLayer(!showZonesLayer)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              showZonesLayer
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Underreported Zones Layer ({attentionZones.length})</span>
          </button>
        </div>
      </div>

      {/* Main Map Workspace (Map on Left + Selected Incident Sidebar on Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Large Leaflet Map Container */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-col h-full min-h-[450px]">
          <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 relative">
            <IncidentMap
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => onSelectIncident(inc)}
              attentionZones={showZonesLayer ? attentionZones : []}
            />
          </div>

          {/* Location Provenance Banner */}
          <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 gap-2">
            <div className="flex items-center space-x-3 font-mono">
              <span>Mapped: <strong className="text-slate-900">{mappedCount}</strong></span>
              <span>·</span>
              <span>Geocoded: <strong className="text-slate-900">{geocodedCount}</strong></span>
              <span>·</span>
              <span>Synthetic/Demo: <strong className="text-slate-900">{syntheticCount}</strong></span>
              <span>·</span>
              <span className="text-amber-700">Unmapped / Unknown: <strong>{unmappedIncidents.length}</strong></span>
            </div>

            <div className="text-slate-500 italic text-[10px]">
              Unknown coordinates are not arbitrarily plotted. Locations remain unmapped until confirmed.
            </div>
          </div>
        </div>

        {/* Right Drawer: Selected Incident Context & Unmapped Reports Notice */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Selected Incident Drawer Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Selected Incident Focus
              </span>
              {selectedIncident && (
                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <span>Full Management View</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedIncident ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {selectedIncident.id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                      selectedIncident.severity === 'critical'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {selectedIncident.severity}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200">
                      Score: {selectedIncident.priorityScore}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mt-1">
                    {selectedIncident.title}
                  </h3>
                </div>

                {/* Location Provenance */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>{selectedIncident.locationName || 'Unspecified Location'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Sector: <strong className="text-slate-800">{selectedIncident.sector}</strong>
                  </div>
                  {selectedIncident.coordinates ? (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Coordinates: [{selectedIncident.coordinates[0].toFixed(4)}, {selectedIncident.coordinates[1].toFixed(4)}]
                      {selectedIncident.is_synthetic_location && (
                        <span className="ml-1 text-slate-400 italic">(Simulated Demo)</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-700 font-semibold font-mono">
                      ⚠️ Coordinates Unknown — Location Unmatched in Gazetteer
                    </div>
                  )}
                </div>

                {/* Details snippet */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Coordinator Rationale
                  </span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    {selectedIncident.whyPrioritised || selectedIncident.signalSynthesis || "No automated rationale logged."}
                  </p>
                </div>

                {/* Assignment & Verification status */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Verification</span>
                    <strong className="text-slate-800 capitalize">{selectedIncident.verificationStatus}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Response Squad</span>
                    <strong className="text-slate-800">{selectedIncident.assignedTeam || 'Unassigned'}</strong>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Open in Incident Management</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>Click any map marker or incident to view details</p>
              </div>
            )}
          </div>

          {/* Unmapped Incidents Callout Panel */}
          {unmappedIncidents.length > 0 && (
            <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <h4 className="font-bold text-xs">
                  {unmappedIncidents.length} Incidents with Unknown Coordinates
                </h4>
              </div>
              <p className="text-[11px] text-amber-900/80 mb-3">
                These emergencies cannot be plotted on the map because coordinates could not be safely resolved. They remain tracked in the priority queue.
              </p>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {unmappedIncidents.map(inc => (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className="p-2 rounded bg-white border border-amber-200 text-xs flex items-center justify-between cursor-pointer hover:border-amber-400"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono font-bold text-slate-800">{inc.id}</span>
                      <span className="text-slate-600 ml-1.5 truncate">{inc.title}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold flex-shrink-0">
                      Score {inc.priorityScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
