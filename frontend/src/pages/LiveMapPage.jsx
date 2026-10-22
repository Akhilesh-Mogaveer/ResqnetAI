import React, { useState } from 'react';
import IncidentMap from '../components/IncidentMap';
import { 
  MapPin, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
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
    <div className="space-y-4 flex flex-col h-[calc(100dvh-140px)] min-h-[650px]">
      {/* Top Header & Map Controls */}
      <div 
        className="clay-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0 select-none relative"
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Live Geospatial Operations Map
            </h1>
            <span className="text-[11px] font-mono px-3 py-1 rounded-clay-pill bg-brand-primary/15 text-brand-primary shadow-clay-pill font-bold">
              Tactical Geospatial · Leaflet
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 font-medium leading-relaxed">
            Real-time geospatial distribution of active incident clusters and reporting void perimeters.
          </p>
        </div>

        {/* Filters and Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs relative z-10">
          {/* Severity filter */}
          <div className="flex items-center bg-surface-inset rounded-clay-pill shadow-clay-inset p-1">
            <span className="px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Severity:
            </span>
            {['all', 'critical', 'high'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-2.5 py-1 rounded-clay-pill text-xs font-bold capitalize transition-all ${
                  filterSeverity === s
                    ? 'bg-brand-primary text-white shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Verification filter */}
          <div className="flex items-center bg-surface-inset rounded-clay-pill shadow-clay-inset p-1">
            <span className="px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Verification:
            </span>
            {['all', 'verified', 'unverified'].map(v => (
              <button
                key={v}
                onClick={() => setFilterVerification(v)}
                className={`px-2.5 py-1 rounded-clay-pill text-xs font-bold capitalize transition-all ${
                  filterVerification === v
                    ? 'bg-brand-primary text-white shadow-clay-button'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Zone toggle */}
          <button
            onClick={() => setShowZonesLayer(!showZonesLayer)}
            className={`px-3.5 py-1.5 rounded-clay-button text-xs font-bold flex items-center space-x-1.5 transition-all shadow-clay-button hover:translate-y-[-1px] ${
              showZonesLayer
                ? 'bg-severity-high/15 text-[#B45309]'
                : 'bg-surface-elevated text-text-secondary'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-severity-high" />
            <span>Underreported Zones Layer ({attentionZones.length})</span>
          </button>
        </div>
      </div>

      {/* Main Map Workspace (Map on Left + Selected Incident Sidebar on Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Large Leaflet Map Container */}
        <div className="lg:col-span-8 clay-card p-3 flex flex-col h-full min-h-[450px] rounded-[28px]">
          <div className="flex-1 rounded-[24px] overflow-hidden relative shadow-clay-inset bg-[#EEF1F6]">
            <IncidentMap
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => onSelectIncident(inc)}
              onInspectIncident={(inc) => {
                onSelectIncident(inc);
                onNavigateTab?.('incidents');
              }}
              attentionZones={showZonesLayer ? attentionZones : []}
              defaultBasemap="satellite"
              className="w-full h-full min-h-[460px]"
            />
          </div>

          {/* Location Provenance Banner */}
          <div className="mt-2.5 px-3.5 py-2.5 clay-inset rounded-clay-button flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-text-secondary gap-2">
            <div className="flex items-center space-x-3 font-mono">
              <span>Mapped: <strong className="text-text-primary">{mappedCount}</strong></span>
              <span>·</span>
              <span>Geocoded: <strong className="text-brand-primary">{geocodedCount}</strong></span>
              <span>·</span>
              <span>Synthetic/Demo: <strong className="text-text-secondary">{syntheticCount}</strong></span>
              <span>·</span>
              <span className="text-[#B45309] font-semibold">Unmapped / Unknown: <strong>{unmappedIncidents.length}</strong></span>
            </div>

            <div className="text-text-muted italic text-[10px]">
              Unknown coordinates are not arbitrarily plotted. Locations remain unmapped until confirmed.
            </div>
          </div>
        </div>

        {/* Right Drawer: Selected Incident Context & Unmapped Reports Notice */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Selected Incident Drawer Card */}
          <div className="clay-card p-5 flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#A3B1C6]/20 mb-3">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Selected Incident Focus
              </span>
              {selectedIncident && (
                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="text-xs font-bold text-brand-primary hover:text-brand-hover flex items-center space-x-1"
                >
                  <span>Full Management View</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedIncident ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-text-primary text-sm">
                      {selectedIncident.id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-clay-pill shadow-clay-pill ${
                      selectedIncident.severity === 'critical'
                        ? 'bg-severity-critical/15 text-severity-critical'
                        : 'bg-severity-high/15 text-[#B45309]'
                    }`}>
                      {selectedIncident.severity}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-clay-pill bg-brand-primary/15 text-brand-primary shadow-clay-pill">
                      Score: {selectedIncident.priorityScore}
                    </span>
                  </div>
                  <h3 className="font-bold text-text-primary text-sm mt-1">
                    {selectedIncident.title}
                  </h3>
                </div>

                {/* Location Provenance */}
                <div className="p-3 rounded-clay-button clay-inset space-y-1">
                  <div className="flex items-center space-x-1.5 text-text-primary font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                    <span>{selectedIncident.locationName || 'Unspecified Location'}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    Sector: <strong className="text-text-primary">{selectedIncident.sector}</strong>
                  </div>
                  {selectedIncident.coordinates ? (
                    <div className="text-[10px] text-text-secondary font-mono">
                      Coordinates: [{selectedIncident.coordinates[0].toFixed(4)}, {selectedIncident.coordinates[1].toFixed(4)}]
                      {selectedIncident.is_synthetic_location && (
                        <span className="ml-1 text-text-muted italic">(Simulated Demo)</span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] text-[#B45309] font-bold font-mono">
                        ⚠️ Coordinates Unknown — Location Unmatched
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenResolver(selectedIncident)}
                        className="w-full py-2 px-3 rounded-clay-button bg-severity-high text-white font-bold text-xs shadow-clay-button hover:translate-y-[-1px] transition-all flex items-center justify-center space-x-1.5"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Resolve & Plot Coordinates</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Details snippet */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Coordinator Rationale
                  </span>
                  <p className="text-text-secondary mt-1 leading-relaxed clay-inset p-3 rounded-clay-button text-[11px] font-medium">
                    {selectedIncident.whyPrioritised || selectedIncident.signalSynthesis || "No automated rationale logged."}
                  </p>
                </div>

                {/* Assignment & Verification status */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-clay-button bg-surface-elevated shadow-clay-pill">
                    <span className="text-text-muted block text-[9px] uppercase font-mono font-bold">Verification</span>
                    <strong className="text-text-primary capitalize font-bold">{selectedIncident.verificationStatus}</strong>
                  </div>
                  <div className="p-2.5 rounded-clay-button bg-surface-elevated shadow-clay-pill">
                    <span className="text-text-muted block text-[9px] uppercase font-mono font-bold">Response Squad</span>
                    <strong className="text-text-primary font-bold">{selectedIncident.assignedTeam || 'Unassigned'}</strong>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="w-full py-2.5 rounded-clay-button clay-button-primary text-white font-bold text-xs transition-all shadow-clay-button hover:translate-y-[-1px] flex items-center justify-center space-x-1.5"
                >
                  <span>Open in Incident Management</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-text-muted text-xs">
                <MapPin className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-60" />
                <p>Click any map marker or incident to view details</p>
              </div>
            )}
          </div>

          {/* Unmapped Incidents Callout Panel */}
          {unmappedIncidents.length > 0 && (
            <div className="clay-card bg-amber-500/10 p-4 shadow-clay-card text-text-primary">
              <div className="flex items-center space-x-2 text-[#B45309] mb-2">
                <AlertTriangle className="w-4 h-4 text-severity-high flex-shrink-0" />
                <h4 className="font-bold text-xs">
                  {unmappedIncidents.length} Incidents with Unknown Coordinates
                </h4>
              </div>
              <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
                These emergencies cannot be plotted on the map because coordinates could not be safely resolved. They remain tracked in the priority queue.
              </p>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {unmappedIncidents.map(inc => (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-clay-button bg-surface-elevated shadow-clay-pill text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div
                      onClick={() => onSelectIncident(inc)}
                      className="truncate cursor-pointer flex-1"
                    >
                      <span className="font-mono font-bold text-brand-primary">{inc.id}</span>
                      <span className="text-text-primary ml-1.5 truncate font-medium">{inc.title}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-clay-pill bg-severity-high/15 text-[#B45309] shadow-clay-pill font-bold">
                        Score {inc.priorityScore}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenResolver(inc);
                        }}
                        className="px-2.5 py-1 rounded-clay-button bg-surface-card text-brand-primary shadow-clay-button hover:translate-y-[-1px] font-bold text-[10px] transition-all"
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
        <div className="fixed inset-0 z-50 bg-[#1F2A3C]/35 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clay-modal bg-surface-elevated max-w-lg w-full p-6 shadow-clay-modal relative text-text-primary">
            <button
              type="button"
              onClick={() => setResolvingIncident(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-clay-pill"
              aria-label="Close resolver modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-brand-primary font-mono text-xs uppercase tracking-wider mb-1 font-bold">
              <Compass className="w-4 h-4 text-brand-primary" />
              <span>Geospatial Location Resolver</span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">
              Resolve Coordinates for {resolvingIncident.id}
            </h3>
            <p className="text-xs text-text-secondary mb-3 truncate font-medium">
              {resolvingIncident.title}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-text-primary font-semibold mb-1">
                  Search Landmark / City / Facility
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Wayanad Relief Camp or Andheri West"
                    className="flex-1 bg-surface-card rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-brand-primary font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCandidates}
                    disabled={isSearching}
                    className="px-3.5 py-2 rounded-clay-button clay-button-primary text-white font-bold flex items-center space-x-1.5 disabled:opacity-50 transition-all shadow-clay-button"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Candidates selection */}
              {candidates.length > 0 && (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto p-1.5 clay-inset rounded-clay-button">
                  <div className="text-[10px] font-mono text-text-muted px-1 font-bold uppercase">
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
                        className={`p-2.5 rounded-clay-button cursor-pointer text-[11px] transition-all select-none ${
                          isChosen
                            ? 'bg-surface-elevated text-brand-primary font-bold shadow-clay-card'
                            : 'bg-surface-card text-text-secondary hover:text-text-primary shadow-clay-pill'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">{cand.display_name}</span>
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-clay-pill bg-surface-elevated text-text-muted shadow-clay-pill">
                            {cand.provider}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-text-muted mt-0.5">
                          [{cand.latitude.toFixed(4)}, {cand.longitude.toFixed(4)}] · Conf: {(cand.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manual Lat/Lng inputs */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-clay-button clay-inset">
                <div>
                  <label className="block text-text-primary font-semibold mb-1 text-[11px]">
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
                    className="w-full bg-surface-elevated rounded-clay-input px-3 py-1.5 text-text-primary font-mono text-xs shadow-clay-pill focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-primary font-semibold mb-1 text-[11px]">
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
                    className="w-full bg-surface-elevated rounded-clay-input px-3 py-1.5 text-text-primary font-mono text-xs shadow-clay-pill focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {resolveError && (
                <div className="p-2.5 rounded-clay-button bg-severity-critical/15 text-severity-critical shadow-clay-pill text-[11px] flex items-center space-x-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-severity-critical flex-shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#A3B1C6]/20 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  disabled={isSubmittingLocation}
                  className="px-3.5 py-2 rounded-clay-button bg-surface-elevated text-text-secondary font-bold text-xs transition-all shadow-clay-button hover:translate-y-[-1px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  disabled={isSubmittingLocation || (!selectedCandidate && (!customLat || !customLng))}
                  className="px-4 py-2 rounded-clay-button clay-button-primary bg-severity-success text-white font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50 transition-all shadow-clay-button hover:translate-y-[-1px]"
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
