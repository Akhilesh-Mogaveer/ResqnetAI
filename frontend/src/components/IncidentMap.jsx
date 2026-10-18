import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import {
  MapPin,
  Layers,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Flame,
  Radio
} from 'lucide-react';

function MapController({ center, zoom, isFullscreen, onRegisterMap }) {
  const map = useMap();

  useEffect(() => {
    if (onRegisterMap) {
      onRegisterMap(map);
    }
  }, [map, onRegisterMap]);

  useEffect(() => {
    if (center && center.length === 2 && center[0] != null && center[1] != null) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 0.8 });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map, isFullscreen]);

  return null;
}

function getIconSvg(typeStr, titleStr) {
  const text = `${typeStr || ''} ${titleStr || ''}`.toLowerCase();

  if (text.includes('fire') || text.includes('gas') || text.includes('plume')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
  }
  if (text.includes('flood') || text.includes('water') || text.includes('submerged')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`;
  }
  if (text.includes('medical') || text.includes('casualty') || text.includes('trauma') || text.includes('hospital')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`;
  }
  if (text.includes('power') || text.includes('voltage') || text.includes('substation')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
  }
  if (text.includes('structural') || text.includes('collapse') || text.includes('building')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M18 10h4a2 2 0 0 1 2 2v10h-6"/><path d="M6 18H2v-4a2 2 0 0 1 2-2h2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

export default function IncidentMap({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  attentionZones = [],
  className = "h-[540px]"
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnderreported, setShowUnderreported] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

  const mapInstanceRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Default coordinate center (falls back cleanly if no coordinates)
  const defaultCenter = useMemo(() => [37.7749, -122.4194], []);

  const activeCenter = useMemo(() => {
    if (
      selectedIncident &&
      Array.isArray(selectedIncident.coordinates) &&
      selectedIncident.coordinates.length === 2 &&
      selectedIncident.coordinates[0] != null &&
      selectedIncident.coordinates[1] != null
    ) {
      return selectedIncident.coordinates;
    }
    // Find first incident with coordinates
    const firstWithCoords = (incidents || []).find(
      i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate' && Array.isArray(i.coordinates) && i.coordinates.length === 2 && i.coordinates[0] != null && i.coordinates[1] != null
    );
    return firstWithCoords ? firstWithCoords.coordinates : defaultCenter;
  }, [selectedIncident, incidents, defaultCenter]);

  // Filter incidents for map display (ensuring merged duplicates do not render duplicate markers)
  const mapIncidents = useMemo(() => {
    return (incidents || []).filter(inc => {
      // Exclude merged duplicates so they do not produce duplicate markers or double-count
      if (inc.is_duplicate || inc.duplicate_of_id || inc.responseStatus === 'merged_duplicate') {
        return false;
      }
      if (!inc.coordinates || !Array.isArray(inc.coordinates) || inc.coordinates.length !== 2 || inc.coordinates[0] == null || inc.coordinates[1] == null) {
        return false;
      }
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (verificationFilter === 'verified' && inc.verificationStatus !== 'verified') return false;
      if (verificationFilter === 'unverified' && inc.verificationStatus !== 'unverified') return false;
      return true;
    });
  }, [incidents, severityFilter, verificationFilter]);

  // Count unmapped incidents (excluding merged duplicates)
  const unmappedIncidents = useMemo(() => {
    return (incidents || []).filter(
      (i) => (!i.coordinates || !Array.isArray(i.coordinates) || i.coordinates.length !== 2 || i.coordinates[0] == null || i.coordinates[1] == null) &&
            !i.is_duplicate && i.responseStatus !== 'merged_duplicate'
    );
  }, [incidents]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return { bg: '#dc2626', border: '#b91c1c' };
      case 'high': return { bg: '#d97706', border: '#b45309' };
      case 'moderate': return { bg: '#0284c7', border: '#0369a1' };
      default: return { bg: '#16a34a', border: '#15803d' };
    }
  };

  const createCustomMarkerIcon = (incident, isSelected) => {
    const colors = getSeverityColor(incident.severity);
    const iconSvg = getIconSvg(incident.type, incident.title);
    const isCritical = incident.severity === 'critical';
    const isVerified = incident.verificationStatus === 'verified';

    const statusClass = isVerified ? 'is-verified' : 'is-unverified';
    const badgeChar = isVerified ? '✓' : '?';
    const badgeTitle = isVerified ? 'Verified Ground Truth' : 'Unverified Field Report';

    const htmlString = `
      <div class="resqnet-marker-wrapper ${isSelected ? 'is-selected' : ''}" title="${incident.id}: ${incident.title} (${incident.severity.toUpperCase()} · ${incident.verificationStatus})">
        ${(isCritical || isSelected) ? `<div class="resqnet-marker-ping" style="background-color: ${colors.bg}; opacity: 0.25;"></div>` : ''}
        <div class="resqnet-marker-core ${statusClass}" style="background-color: ${colors.bg};">
          ${iconSvg}
        </div>
        <div class="resqnet-marker-badge ${statusClass}" title="${badgeTitle}">${badgeChar}</div>
      </div>
    `;

    return L.divIcon({
      className: 'resqnet-div-icon',
      html: htmlString,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => mapInstanceRef.current?.flyTo(activeCenter, 13, { duration: 0.8 });

  return (
    <div
      ref={mapContainerRef}
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : className
      }`}
    >
      {/* Map Control Bar Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Live Incident Map
          </h3>
          <span className="text-[11px] text-slate-600 font-mono">
            ({mapIncidents.length} on map)
          </span>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-slate-600 text-[11px] hidden sm:inline">Filter:</span>
          {['all', 'critical', 'high', 'moderate'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {sev}
            </button>
          ))}

          {/* Underreported Zones Toggle */}
          <button
            onClick={() => setShowUnderreported(!showUnderreported)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center space-x-1 transition-colors ${
              showUnderreported
                ? 'bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle underreported signal gap zone overlays"
          >
            <Radio className="w-3 h-3 text-amber-600" />
            <span className="hidden md:inline">Signal Gaps</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Unmapped Incidents Callout Bar */}
      {unmappedIncidents.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-[11px] text-amber-800 flex items-center justify-between z-20">
          <div className="flex items-center space-x-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="truncate">
              <strong>{unmappedIncidents.length} incident{unmappedIncidents.length > 1 ? 's' : ''}</strong> with unconfirmed location not pinned to arbitrary coordinates.
            </span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium whitespace-nowrap ml-2">
            No synthetic placement
          </span>
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="flex-1 relative w-full h-full">
        <MapContainer
          center={activeCenter}
          zoom={13}
          zoomControl={false}
          className="w-full h-full"
        >
          <MapController
            center={activeCenter}
            zoom={13}
            isFullscreen={isFullscreen}
            onRegisterMap={(map) => { mapInstanceRef.current = map; }}
          />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {/* Attention-Needed Zones Circles */}
          {showUnderreported && attentionZones.map((zone) => {
            if (!zone.centerCoordinates || zone.centerCoordinates.length !== 2) return null;
            return (
              <Circle
                key={zone.id}
                center={zone.centerCoordinates}
                radius={zone.radiusMeters || 1200}
                pathOptions={{
                  color: '#d97706',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4 4'
                }}
              >
                <Popup>
                  <div className="p-2.5 max-w-xs text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-800 mb-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{zone.name} (Signal Void)</span>
                    </div>
                    <div className="text-slate-600 text-[11px] mb-1">
                      Deviation: <strong>{zone.signalDeviation}</strong> vs normal baseline
                    </div>
                    <div className="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200">
                      Lack of calls does NOT confirm safety. Field recon recommended.
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Incident Markers */}
          {mapIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <Marker
                key={inc.id}
                position={inc.coordinates}
                icon={createCustomMarkerIcon(inc, isSelected)}
                eventHandlers={{
                  click: () => onSelectIncident?.(inc)
                }}
              >
                <Popup>
                  <div className="p-3 text-xs space-y-2 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-mono font-bold text-blue-700">{inc.id}</span>
                      <div className="flex items-center space-x-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {inc.verificationStatus}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {inc.severity}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-900 leading-snug">
                      {inc.title}
                    </h4>
                    <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{inc.sector} · {inc.locationName}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                      Coords: [{inc.coordinates[0].toFixed(4)}, {inc.coordinates[1].toFixed(4)}]
                      {inc.location_resolution_status && (
                        <div className="text-slate-600 text-[9px] mt-0.5 font-sans">
                          Resolution: <strong>{inc.location_resolution_status.replace(/_/g, ' ')}</strong>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Priority Score: <strong className="text-slate-900 font-mono">{inc.priorityScore}/100</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectIncident?.(inc)}
                      className="w-full mt-2 py-1.5 px-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Inspect Incident Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Accessible Map Legend */}
        <div
          className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200 p-2.5 text-[11px] max-w-[210px]"
          aria-label="Map Legend"
        >
          <div className="flex items-center justify-between font-bold text-slate-800 pb-1 mb-1.5 border-b border-slate-100">
            <span className="flex items-center space-x-1 text-[10px] uppercase font-mono tracking-wider">
              <Layers className="w-3 h-3 text-blue-600" />
              <span>Map Legend</span>
            </span>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-slate-400 hover:text-slate-600 p-0.5 text-[10px] underline"
              aria-label={showLegend ? "Collapse map legend" : "Expand map legend"}
            >
              {showLegend ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLegend && (
            <div className="space-y-1.5">
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block font-semibold mb-0.5">Priority / Severity</span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0" />
                    <span className="text-slate-700">Critical</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-slate-700">High</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 flex-shrink-0" />
                    <span className="text-slate-700">Moderate</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 flex-shrink-0" />
                    <span className="text-slate-700">Low</span>
                  </div>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <span className="text-[9px] uppercase font-mono text-slate-400 block font-semibold mb-0.5">Verification</span>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center text-[7px] font-bold text-emerald-700">✓</span>
                    <span className="text-slate-700">Verified (Solid)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-amber-500 bg-white flex items-center justify-center text-[7px] font-bold text-amber-700">?</span>
                    <span className="text-slate-700">Unverified (Dashed)</span>
                  </div>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-100 flex items-center space-x-1.5 text-[10px]">
                <span className="w-3.5 h-3.5 rounded-full border border-dashed border-amber-600 bg-amber-500/10 flex-shrink-0" />
                <span className="text-slate-700">Signal Gap Void</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Zoom & Recenter Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-1.5 bg-white rounded-lg shadow-md border border-slate-200 p-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-1.5 hover:bg-slate-100 rounded text-blue-600 border-t border-slate-100 transition-colors"
            title="Recenter Map"
            aria-label="Recenter Map"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
