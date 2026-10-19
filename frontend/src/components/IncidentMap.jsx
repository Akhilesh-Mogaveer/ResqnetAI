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
  ExternalLink,
  Radio,
  Globe
} from 'lucide-react';

function MapController({ center, zoom, bounds, userSelected, isFullscreen, onRegisterMap }) {
  const map = useMap();

  useEffect(() => {
    if (onRegisterMap) {
      onRegisterMap(map);
    }
  }, [map, onRegisterMap]);

  useEffect(() => {
    // When an incident is explicitly selected by the user, fly directly to it at close range
    if (userSelected && center && center.length === 2 && center[0] != null && center[1] != null) {
      map.flyTo(center, zoom || 13, { duration: 0.8 });
    } else if (bounds && typeof map.fitBounds === 'function') {
      // Fit viewport to envelope all active incident markers with padding
      try {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      } catch (_e) {
        if (center && center.length === 2 && center[0] != null && center[1] != null) {
          map.flyTo(center, zoom || 13, { duration: 0.8 });
        }
      }
    } else if (center && center.length === 2 && center[0] != null && center[1] != null) {
      map.flyTo(center, zoom || 13, { duration: 0.8 });
    }
  }, [center, zoom, bounds, userSelected, map]);

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

const SATELLITE_TILE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_SATELLITE_TILE_URL) ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const STREETS_TILE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_STREETS_TILE_URL) ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const BASEMAP_TILES = {
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery (Satellite)',
    label: 'Satellite',
    url: SATELLITE_TILE_URL,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
    maxZoom: 19,
    description: 'High-resolution global satellite & aerial photography'
  },
  streets: {
    id: 'streets',
    name: 'OpenStreetMap Streets',
    label: 'Streets',
    url: STREETS_TILE_URL,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    description: 'Detailed street and infrastructure cartography'
  },
  // dark: {
  //   id: 'dark',
  //   name: 'CartoDB Dark Matter',
  //   label: 'Dark Map',
  //   url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  //   attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
  //   subdomains: 'abcd',
  //   maxZoom: 19,
  //   description: 'High-contrast dark operations map'
  // },
  terrain: {
    id: 'terrain',
    name: 'Esri World Topo (Terrain)',
    label: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey',
    maxZoom: 19,
    description: 'Topographic contour and physical elevation relief'
  }
};

export function isValidCoordinate(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
  const [lat, lng] = coords;
  if (lat == null || lng == null) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export default function IncidentMap({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  onInspectIncident,
  attentionZones = [],
  defaultShowLegend = true,
  className = "h-[540px]"
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnderreported, setShowUnderreported] = useState(true);
  const [showLegend, setShowLegend] = useState(defaultShowLegend);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [verificationFilter, _setVerificationFilter] = useState('all');
  const [basemapId, setBasemapId] = useState('satellite');
  const [tileError, setTileError] = useState(false);

  const [userSelectedId, setUserSelectedId] = useState(null);
  const prevSelectedIncidentIdRef = useRef(selectedIncident?.id);

  useEffect(() => {
    if (selectedIncident?.id && selectedIncident.id !== prevSelectedIncidentIdRef.current) {
      prevSelectedIncidentIdRef.current = selectedIncident.id;
      setUserSelectedId(selectedIncident.id);
    }
  }, [selectedIncident]);

  const mapInstanceRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Default coordinate center (falls back cleanly if no coordinates)
  const defaultCenter = useMemo(() => [37.7749, -122.4194], []);

  // Compute active center (lands right over incident operational cluster)
  const activeCenter = useMemo(() => {
    if (
      selectedIncident &&
      isValidCoordinate(selectedIncident.coordinates)
    ) {
      return selectedIncident.coordinates;
    }
    const withCoords = (incidents || []).filter(
      i => !i.is_duplicate && i.responseStatus !== 'merged_duplicate' && isValidCoordinate(i.coordinates)
    );
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((acc, c) => acc + c.coordinates[0], 0) / withCoords.length;
      const avgLng = withCoords.reduce((acc, c) => acc + c.coordinates[1], 0) / withCoords.length;
      return [avgLat, avgLng];
    }
    return defaultCenter;
  }, [selectedIncident, incidents, defaultCenter]);

  const activeBasemap = BASEMAP_TILES[basemapId] || BASEMAP_TILES.satellite;

  // Filter incidents for map display (ensuring merged duplicates do not render duplicate markers)
  const mapIncidents = useMemo(() => {
    return (incidents || []).filter(inc => {
      // Exclude merged duplicates so they do not produce duplicate markers or double-count
      if (inc.is_duplicate || inc.duplicate_of_id || inc.responseStatus === 'merged_duplicate') {
        return false;
      }
      if (!isValidCoordinate(inc.coordinates)) {
        return false;
      }
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (verificationFilter === 'verified' && inc.verificationStatus !== 'verified') return false;
      if (verificationFilter === 'unverified' && inc.verificationStatus !== 'unverified') return false;
      return true;
    });
  }, [incidents, severityFilter, verificationFilter]);

  // Compute bounding box across all active mapped incident coordinates
  const mapBounds = useMemo(() => {
    const validCoords = (mapIncidents || [])
      .map(i => i.coordinates)
      .filter(isValidCoordinate);
    if (validCoords.length > 1) {
      return L.latLngBounds(validCoords);
    }
    return null;
  }, [mapIncidents]);

  // Count unmapped incidents (excluding merged duplicates)
  const unmappedIncidents = useMemo(() => {
    return (incidents || []).filter(
      (i) => !isValidCoordinate(i.coordinates) &&
            !i.is_duplicate && i.responseStatus !== 'merged_duplicate'
    );
  }, [incidents]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return { bg: '#FF4566', border: '#FFFFFF', ping: '#FF4566' };
      case 'high': return { bg: '#FFB547', border: '#FFFFFF', ping: '#FFB547' };
      case 'moderate': return { bg: '#21D4FD', border: '#FFFFFF', ping: '#21D4FD' };
      default: return { bg: '#25D6A2', border: '#FFFFFF', ping: '#25D6A2' };
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
        ${(isCritical || isSelected) ? `<div class="resqnet-marker-ping" style="background-color: ${colors.bg}; opacity: 0.35;"></div>` : ''}
        <div class="resqnet-marker-core ${statusClass}" style="background-color: ${colors.bg};">
          ${iconSvg}
        </div>
        <div class="resqnet-marker-badge ${statusClass}" title="${badgeTitle}">${badgeChar}</div>
      </div>
    `;

    return L.divIcon({
      className: 'resqnet-div-icon',
      html: htmlString,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -19]
    });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleFitAll = () => {
    setUserSelectedId(null);
    if (!mapInstanceRef.current) return;
    if (mapBounds && typeof mapInstanceRef.current.fitBounds === 'function') {
      mapInstanceRef.current.fitBounds(mapBounds, { padding: [35, 35], maxZoom: 13 });
    } else if (mapIncidents.length === 1 && isValidCoordinate(mapIncidents[0].coordinates)) {
      mapInstanceRef.current.flyTo(mapIncidents[0].coordinates, 13, { duration: 0.8 });
    } else {
      mapInstanceRef.current.flyTo(defaultCenter, 11, { duration: 0.8 });
    }
  };

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (selectedIncident && isValidCoordinate(selectedIncident.coordinates)) {
      mapInstanceRef.current.flyTo(selectedIncident.coordinates, 13, { duration: 0.8 });
    } else if (mapBounds && typeof mapInstanceRef.current.fitBounds === 'function') {
      mapInstanceRef.current.fitBounds(mapBounds, { padding: [35, 35], maxZoom: 13 });
    } else {
      mapInstanceRef.current.flyTo(defaultCenter, 11, { duration: 0.8 });
    }
  };

  return (
    <div
      ref={mapContainerRef}
      className={`bg-[#0D1B2D] border border-[#203550] rounded-xl overflow-hidden shadow-md flex flex-col relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : className
      }`}
    >
      {/* Map Control Bar Header */}
      <div className="px-4 py-2.5 bg-[#091629] border-b border-[#203550] flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-[#2878FF]" />
          <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
            Live Incident Map
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            ({mapIncidents.length} on map)
          </span>
          {mapBounds && (
            <button
              type="button"
              onClick={handleFitAll}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#132238] hover:bg-[#203550] text-[#21D4FD] border border-[#203550] transition-colors"
              title="Fit map view to all plotted incident markers"
            >
              Fit View
            </button>
          )}
        </div>

        {/* Severity Filters & Basemap Selector */}
        <div className="flex items-center space-x-1.5 text-xs flex-wrap gap-y-1">
          <span className="text-slate-400 text-[11px] hidden sm:inline font-mono">Filter:</span>
          {['all', 'critical', 'high', 'moderate'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                severityFilter === sev
                  ? 'bg-[#2878FF] text-white shadow-xs font-semibold'
                  : 'bg-[#0D1B2D] border border-[#203550] text-slate-300 hover:bg-[#132238] hover:text-white'
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
                ? 'bg-[#132238] text-amber-300 border-amber-800/60'
                : 'bg-[#0D1B2D] text-slate-400 border-[#203550] hover:bg-[#132238]'
            }`}
            title="Toggle underreported signal gap zone overlays"
          >
            <Radio className="w-3 h-3 text-[#FFB547]" />
            <span className="hidden md:inline">Signal Gaps</span>
          </button>

          {/* Basemap Style Switcher */}
          <div className="flex items-center space-x-0.5 bg-[#0D1B2D] border border-[#203550] p-0.5 rounded text-[11px]">
            <span className="px-1 text-slate-400" title="Basemap Layer">
              <Layers className="w-3 h-3 text-[#21D4FD]" />
            </span>
            {[
              { id: 'satellite', label: 'Satellite', icon: Globe },
              { id: 'streets', label: 'Streets' },
              // { id: 'dark', label: 'Dark' },
              { id: 'terrain', label: 'Terrain' }
            ].map(b => {
              const IconComponent = b.icon;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBasemapId(b.id);
                    setTileError(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center space-x-1 ${
                    basemapId === b.id
                      ? 'bg-[#2878FF] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-[#132238]'
                  }`}
                  title={`Switch basemap to ${BASEMAP_TILES[b.id]?.name || b.label}`}
                >
                  {IconComponent && <IconComponent className="w-2.5 h-2.5" />}
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-[#0D1B2D] border border-[#203550] text-slate-300 hover:text-white hover:bg-[#132238] transition-colors ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Unmapped Incidents Callout Bar */}
      {unmappedIncidents.length > 0 && (
        <div className="bg-amber-950/40 border-b border-amber-900/60 px-4 py-1.5 text-[11px] text-amber-200 flex items-center justify-between z-20">
          <div className="flex items-center space-x-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547] flex-shrink-0" />
            <span className="truncate">
              <strong>{unmappedIncidents.length} incident{unmappedIncidents.length > 1 ? 's' : ''}</strong> with unconfirmed location not pinned to arbitrary coordinates.
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-medium whitespace-nowrap ml-2 font-mono">
            No synthetic placement
          </span>
        </div>
      )}

      {/* Main Map Canvas (with subtle map-bg-4.jpg backdrop as visual fallback) */}
      <div 
        className="flex-1 relative w-full h-full min-h-0 bg-[#07111F]"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 17, 31, 0.55), rgba(9, 22, 41, 0.55)), url('/images/map-bg-4.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Layer Tile Error Fallback Banner */}
        {tileError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-rose-950/95 border border-rose-600/80 text-rose-100 px-3.5 py-2 rounded-lg shadow-2xl flex items-center space-x-3 text-xs max-w-lg backdrop-blur-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block text-[11px] text-rose-200">{activeBasemap.name} Unavailable</span>
              <span className="text-[10px] text-rose-300 leading-tight block">Tiles could not be loaded from tile server. Switch to another layer:</span>
            </div>
            <div className="flex items-center space-x-1">
              {['satellite', 'streets', 'terrain']
                .filter(id => id !== basemapId)
                .slice(0, 2)
                .map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTileError(false);
                      setBasemapId(id);
                    }}
                    className="px-2 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[10px] font-medium transition-colors"
                  >
                    {BASEMAP_TILES[id]?.label || id}
                  </button>
                ))
              }
              <button
                type="button"
                onClick={() => setTileError(false)}
                className="px-1.5 py-1 text-rose-300 hover:text-white text-[10px] transition-colors ml-1"
                aria-label="Dismiss tile error banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <MapContainer
          center={activeCenter}
          zoom={13}
          zoomControl={false}
          className="w-full h-full min-h-0"
        >
          <MapController
            center={activeCenter}
            zoom={13}
            bounds={mapBounds}
            userSelected={userSelectedId != null}
            isFullscreen={isFullscreen}
            onRegisterMap={(map) => { mapInstanceRef.current = map; }}
          />

          <TileLayer
            key={basemapId}
            url={activeBasemap.url}
            attribution={activeBasemap.attribution}
            subdomains={activeBasemap.subdomains || 'abcd'}
            maxZoom={activeBasemap.maxZoom || 19}
            eventHandlers={{
              tileerror: () => {
                setTileError(true);
              },
              load: () => {
                setTileError(false);
              }
            }}
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
                    <div className="flex items-center space-x-1.5 font-bold text-amber-400 mb-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{zone.name} (Signal Void)</span>
                    </div>
                    <div className="text-slate-300 text-[11px] mb-1">
                      Deviation: <strong className="text-white">{zone.signalDeviation}</strong> vs normal baseline
                    </div>
                    <div className="text-[10px] text-amber-200 bg-amber-950/50 p-1.5 rounded border border-amber-900/60">
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
                  click: () => {
                    setUserSelectedId(inc.id);
                    onSelectIncident?.(inc);
                  }
                }}
              >
                <Popup>
                  <div className="p-3 text-xs space-y-2 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-[#203550] pb-1.5">
                      <span className="font-mono font-bold text-[#21D4FD]">{inc.id}</span>
                      <div className="flex items-center space-x-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950/60 text-[#FFB547] border border-amber-800/60'
                        }`}>
                          {inc.verificationStatus}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#091629] text-slate-300 border border-[#203550]">
                          {inc.severity}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-white leading-snug">
                      {inc.title}
                    </h4>
                    <div className="text-[11px] text-slate-300 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{inc.sector} · {inc.locationName}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 bg-[#091629] p-1.5 rounded border border-[#203550]">
                      Coords: [{inc.coordinates[0].toFixed(4)}, {inc.coordinates[1].toFixed(4)}]
                      {inc.location_resolution_status && (
                        <div className="text-slate-300 text-[9px] mt-0.5 font-sans">
                          Resolution: <strong>{inc.location_resolution_status.replace(/_/g, ' ')}</strong>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Priority Score: <strong className="text-white font-mono">{inc.priorityScore}/100</strong>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        if (e?.nativeEvent?.stopPropagation) e.nativeEvent.stopPropagation();
                        if (onInspectIncident) {
                          onInspectIncident(inc);
                        } else {
                          onSelectIncident?.(inc);
                        }
                      }}
                      className="w-full mt-2 py-1.5 px-2 rounded bg-[#2878FF] hover:bg-blue-600 text-white font-medium text-[11px] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      aria-label={`Inspect details for incident ${inc.id}`}
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
          className={`absolute bottom-4 left-4 z-20 bg-[#0D1B2D]/95 backdrop-blur-xs rounded-lg shadow-xl border border-[#203550] transition-all ${
            showLegend ? 'p-2.5 max-w-[210px]' : 'p-1.5'
          }`}
          aria-label="Map Legend"
        >
          <div className={`flex items-center justify-between font-bold text-slate-200 ${showLegend ? 'pb-1 mb-1.5 border-b border-[#203550]' : ''}`}>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center space-x-1 text-[10px] uppercase font-mono tracking-wider text-slate-300 hover:text-white transition-colors"
              aria-label={showLegend ? "Collapse map legend" : "Expand map legend"}
            >
              <Layers className="w-3 h-3 text-[#2878FF]" />
              <span>Map Legend</span>
              <span className="text-[10px] text-slate-400 font-sans normal-case ml-0.5">
                {showLegend ? '▾' : '▸'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="text-slate-400 hover:text-slate-200 p-0.5 text-[10px] underline ml-2"
              aria-label={showLegend ? "Hide legend items" : "Show legend items"}
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
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF4566] flex-shrink-0" />
                    <span className="text-slate-300">Critical</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB547] flex-shrink-0" />
                    <span className="text-slate-300">High</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2878FF] flex-shrink-0" />
                    <span className="text-slate-300">Moderate</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#25D6A2] flex-shrink-0" />
                    <span className="text-slate-300">Low</span>
                  </div>
                </div>
              </div>
              <div className="pt-1 border-t border-[#203550]">
                <span className="text-[9px] uppercase font-mono text-slate-400 block font-semibold mb-0.5">Verification</span>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-[#091629] flex items-center justify-center text-[7px] font-bold text-emerald-400">✓</span>
                    <span className="text-slate-300">Verified (Solid)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-amber-500 bg-[#091629] flex items-center justify-center text-[7px] font-bold text-amber-400">?</span>
                    <span className="text-slate-300">Unverified (Dashed)</span>
                  </div>
                </div>
              </div>
              <div className="pt-1 border-t border-[#203550] flex items-center space-x-1.5 text-[10px]">
                <span className="w-3.5 h-3.5 rounded-full border border-dashed border-amber-500 bg-amber-500/10 flex-shrink-0" />
                <span className="text-slate-300">Signal Gap Void</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Zoom & Recenter Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-1.5 bg-[#0D1B2D] rounded-lg shadow-xl border border-[#203550] p-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-[#132238] rounded text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-[#132238] rounded text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          {mapBounds && (
            <button
              onClick={handleFitAll}
              className="p-1.5 hover:bg-[#132238] rounded text-[#21D4FD] border-t border-[#203550] transition-colors"
              title="Fit All Markers to Viewport"
              aria-label="Fit All Markers"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleRecenter}
            className={`p-1.5 hover:bg-[#132238] rounded text-slate-300 hover:text-white transition-colors ${!mapBounds ? 'border-t border-[#203550]' : ''}`}
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
