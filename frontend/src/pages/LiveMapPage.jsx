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
  Compass,
  Search,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import api from '../services/api';

export default function LiveMapPage({
  incidents = [],
  attentionZones = [],
  selectedIncident,
  onSelectIncident,
  onNavigateTab,
  onLocationUpdated,
  onShowToast
}) {
  const [filterSeverity, setFilterSeverity] = useState('all'); // all | critical | high | moderate
  const [filterVerification, setFilterVerification] = useState('all'); // all | verified | unverified
  const [showZonesLayer, setShowZonesLayer] = useState(true);

  // Quick Resolve Location Modal state
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  // Filter active incidents excluding merged duplicates
  const activeIncidents = incidents.filter(inc => !inc.is_duplicate && inc.responseStatus !== 'merged_duplicate');

  // Filter incidents for display on the map
  const filteredIncidents = activeIncidents.filter(inc => {
    if (filterSeverity === 'critical' && inc.severity !== 'critical') return false;
    if (filterSeverity === 'high' && inc.severity !== 'high') return false;
    if (filterSeverity === 'moderate' && inc.severity !== 'moderate') return false;

    if (filterVerification === 'verified' && inc.verificationStatus !== 'verified') return false;
    if (filterVerification === 'unverified' && inc.verificationStatus !== 'unverified') return false;

    return true;
  });

  // Calculate coordinates statistics
  const mappedCount = activeIncidents.filter(i => i.coordinates && Array.isArray(i.coordinates) && i.coordinates[0] != null).length;
  const unmappedIncidents = activeIncidents.filter(i => !i.coordinates || !Array.isArray(i.coordinates) || i.coordinates[0] == null);
  const syntheticCount = activeIncidents.filter(i => i.is_synthetic_location).length;
  const geocodedCount = activeIncidents.filter(i => i.location_source && i.location_source.startsWith('geocoded')).length;

  const handleOpenResolver = (inc) => {
    setResolvingIncident(inc);
    setSearchQuery(inc.locationName || inc.title || '');
    setCandidates([]);
    setSelectedCandidate(null);
    setCustomLat('');
    setCustomLng('');
    setResolveError(null);
  };

  const handleSearchCandidates = async () => {
    if (!searchQuery.trim()) {
      setResolveError('Please enter a location query to search.');
      return;
    }
    setIsSearching(true);
    setResolveError(null);
    setCandidates([]);
    setSelectedCandidate(null);

    try {
      const res = await api.searchLocationCandidates(searchQuery.trim());
      if (res && res.candidates && res.candidates.length > 0) {
        setCandidates(res.candidates);
        if (res.candidates.length === 1) {
          setSelectedCandidate(res.candidates[0]);
          setCustomLat(res.candidates[0].latitude.toString());
          setCustomLng(res.candidates[0].longitude.toString());
        }
      } else {
        setResolveError('No matching locations found in gazetteer or geocoder.');
      }
    } catch (err) {
      console.error(err);
      setResolveError(err.message || 'Geocoding candidate lookup failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (!resolvingIncident) return;

    let coords = null;
    let chosenName = searchQuery;

    if (selectedCandidate) {
      coords = [selectedCandidate.latitude, selectedCandidate.longitude];
      chosenName = selectedCandidate.display_name || chosenName;
    } else if (customLat && customLng) {
      const latF = parseFloat(customLat);
      const lngF = parseFloat(customLng);
      if (isNaN(latF) || latF < -90 || latF > 90 || isNaN(lngF) || lngF < -180 || lngF > 180) {
        setResolveError('Coordinates must be valid numbers (Lat: -90 to 90, Lng: -180 to 180).');
        return;
      }
      coords = [latF, lngF];
    } else {
      setResolveError('Please select a candidate or enter valid latitude/longitude.');
      return;
    }

    setIsSubmittingLocation(true);
    setResolveError(null);

    try {
      const updated = await api.confirmLocation(resolvingIncident.id, {
        coordinates: coords,
        locationName: chosenName,
        sector: resolvingIncident.sector,
        confirmationStatus: 'officer_confirmed',
        operator: 'Coordinator Jordan Davis',
        reason: `Officer confirmed coordinates for ${resolvingIncident.id} via geospatial resolver.`
      });

      onLocationUpdated?.(updated);
      onShowToast?.(`Coordinates for ${resolvingIncident.id} confirmed and plotted on map!`, 'success');
      setResolvingIncident(null);
    } catch (err) {
      console.error(err);
      setResolveError(err.message || 'Failed to update incident coordinates.');
      onShowToast?.(`Location update failed: ${err.message}`, 'alert');
    } finally {
      setIsSubmittingLocation(false);
    }
  };

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
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] text-amber-700 font-semibold font-mono">
                        ⚠️ Coordinates Unknown — Location Unmatched
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenResolver(selectedIncident)}
                        className="w-full py-1.5 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition-colors flex items-center justify-center space-x-1"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Resolve & Plot Coordinates</span>
                      </button>
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

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {unmappedIncidents.map(inc => (
                  <div
                    key={inc.id}
                    className="p-2 rounded bg-white border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:border-amber-400 transition-colors"
                  >
                    <div
                      onClick={() => onSelectIncident(inc)}
                      className="truncate cursor-pointer flex-1"
                    >
                      <span className="font-mono font-bold text-slate-800">{inc.id}</span>
                      <span className="text-slate-600 ml-1.5 truncate">{inc.title}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        Score {inc.priorityScore}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenResolver(inc);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium text-[10px] transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Location Resolution Modal for Unmapped Incidents */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setResolvingIncident(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              aria-label="Close resolver modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-blue-700 font-mono text-xs uppercase tracking-wider mb-1 font-bold">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Geospatial Location Resolver</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Resolve Coordinates for {resolvingIncident.id}
            </h3>
            <p className="text-xs text-slate-500 mb-3 truncate">
              {resolvingIncident.title}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Search Landmark / City / Facility
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Wayanad Relief Camp or Andheri West"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCandidates}
                    disabled={isSearching}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1 disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Candidates selection */}
              {candidates.length > 0 && (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500 px-1 font-semibold uppercase">
                    Select a Confirmed Candidate ({candidates.length} found):
                  </div>
                  {candidates.map((cand, idx) => {
                    const isChosen = selectedCandidate && selectedCandidate.latitude === cand.latitude && selectedCandidate.longitude === cand.longitude;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setCustomLat(cand.latitude.toString());
                          setCustomLng(cand.longitude.toString());
                        }}
                        className={`p-2 rounded cursor-pointer border text-[11px] transition-colors ${
                          isChosen
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{cand.display_name}</span>
                          <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                            {cand.provider}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          [{cand.latitude.toFixed(4)}, {cand.longitude.toFixed(4)}] · Conf: {(cand.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manual Lat/Lng inputs */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                    Latitude (-90 to 90)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => {
                      setCustomLat(e.target.value);
                      setSelectedCandidate(null);
                    }}
                    placeholder="e.g. 11.6854"
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                    Longitude (-180 to 180)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLng}
                    onChange={(e) => {
                      setCustomLng(e.target.value);
                      setSelectedCandidate(null);
                    }}
                    placeholder="e.g. 76.1320"
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {resolveError && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  disabled={isSubmittingLocation}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  disabled={isSubmittingLocation || (!selectedCandidate && (!customLat || !customLng))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingLocation ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Plotting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm & Plot on Map</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
