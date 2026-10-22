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
  defaultBasemap = 'satellite',
  className = "h-[540px]"
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnderreported, setShowUnderreported] = useState(true);
  const [showLegend, setShowLegend] = useState(defaultShowLegend);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [verificationFilter, _setVerificationFilter] = useState('all');
  const [basemapId, setBasemapId] = useState(defaultBasemap);
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
      case 'critical': return { bg: '#E5484D', border: '#FFFFFF', ping: '#E5484D' };
      case 'high': return { bg: '#F5A524', border: '#FFFFFF', ping: '#F5A524' };
      case 'moderate': return { bg: '#4F6BED', border: '#FFFFFF', ping: '#4F6BED' };
      default: return { bg: '#2FB67C', border: '#FFFFFF', ping: '#2FB67C' };
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
      className={`bg-surface-card rounded-[28px] overflow-hidden shadow-clay-card flex flex-col relative transition-all duration-200 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : className
      }`}
    >
      {/* Map Control Bar Header as Floating Clay Panel */}
      <div className="px-4 py-3 bg-surface-card flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase">
            Live Incident Map
          </h3>
          <span className="text-[11px] text-text-muted font-mono font-semibold">
            ({mapIncidents.length} on map)
          </span>
          {mapBounds && (
            <button
              type="button"
              onClick={handleFitAll}
              className="px-2.5 py-1 rounded-clay-button text-[10px] font-semibold bg-surface-card hover:bg-white text-brand-primary shadow-clay-button active:shadow-clay-inset transition-all"
              title="Fit map view to all plotted incident markers"
            >
              Fit View
            </button>
          )}
        </div>

        {/* Severity Filters & Basemap Selector */}
        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
          <span className="text-text-muted text-[11px] hidden sm:inline font-mono">Filter:</span>
          {['all', 'critical', 'high', 'moderate'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-clay-button text-[11px] font-semibold capitalize transition-all active:shadow-clay-inset ${
                severityFilter === sev
                  ? 'bg-brand-primary text-white shadow-clay-button'
                  : 'bg-surface-card text-text-secondary shadow-clay-button hover:bg-white hover:text-text-primary'
              }`}
            >
              {sev}
            </button>
          ))}

          {/* Underreported Zones Toggle */}
          <button
            onClick={() => setShowUnderreported(!showUnderreported)}
            className={`px-2.5 py-1 rounded-clay-button text-[11px] font-semibold flex items-center space-x-1.5 transition-all active:shadow-clay-inset ${
              showUnderreported
                ? 'bg-amber-100/90 text-amber-900 shadow-clay-button'
                : 'bg-surface-card text-text-muted shadow-clay-button hover:text-text-primary hover:bg-white'
            }`}
            title="Toggle underreported signal gap zone overlays"
          >
            <Radio className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Signal Gaps</span>
          </button>

          {/* Basemap Style Switcher */}
          <div className="flex items-center space-x-1 bg-surface-inset p-1 rounded-clay-button shadow-clay-inset text-[11px]">
            <span className="px-1 text-text-muted" title="Basemap Layer">
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
            </span>
            {[
              { id: 'satellite', label: 'Satellite' },
              { id: 'streets', label: 'Streets' },
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
                  className={`px-2 py-0.5 rounded-clay-button text-[10px] font-semibold transition-all flex items-center space-x-1 active:shadow-clay-inset ${
                    basemapId === b.id
                      ? 'bg-brand-primary text-white shadow-clay-button'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/60'
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
            className="p-1.5 rounded-clay-button bg-surface-card shadow-clay-button text-text-secondary hover:text-text-primary hover:bg-white transition-all active:shadow-clay-inset ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Unmapped Incidents Callout Bar */}
      {unmappedIncidents.length > 0 && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-[11px] text-amber-900 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2 truncate">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="truncate">
              <strong className="text-amber-950">{unmappedIncidents.length} incident{unmappedIncidents.length > 1 ? 's' : ''}</strong> with unconfirmed location not pinned to arbitrary coordinates.
            </span>
          </div>
          <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full whitespace-nowrap ml-2 font-mono">
            No synthetic placement
          </span>
        </div>
      )}
      {/* Main Map Canvas (with subtle map-bg-4.jpg backdrop as visual fallback) */}
      <div 
        className="flex-1 relative w-full h-full min-h-0 bg-surface-inset"
        style={{
          backgroundImage: `linear-gradient(rgba(238, 241, 246, 0.75), rgba(245, 247, 251, 0.75)), url('/images/map-bg-4.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Layer Tile Error Fallback Banner */}
        {tileError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-rose-50 border border-rose-200 text-rose-900 px-3.5 py-2 rounded-clay-card shadow-clay-card flex items-center space-x-3 text-xs max-w-lg backdrop-blur-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block text-[11px] text-rose-950">{activeBasemap.name} Unavailable</span>
              <span className="text-[10px] text-rose-800 leading-tight block">Tiles could not be loaded from tile server. Switch to another layer:</span>
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
                    className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-800 shadow-clay-button rounded-clay-button text-[10px] font-medium transition-all"
                  >
                    {BASEMAP_TILES[id]?.label || id}
                  </button>
                ))
              }
              <button
                type="button"
                onClick={() => setTileError(false)}
                className="px-1.5 py-1 text-rose-600 hover:text-rose-950 text-[10px] transition-colors ml-1"
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
                  color: '#F5A524',
                  fillColor: '#F5A524',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4 4'
                }}
              >
                <Popup>
                  <div className="p-3 max-w-xs text-xs space-y-1.5 bg-white rounded-[20px]">
                    <div className="flex items-center space-x-1.5 font-bold text-[#B26A00]">
                      <Radio className="w-3.5 h-3.5 text-severity-high" />
                      <span>{zone.name} (Signal Void)</span>
                    </div>
                    <div className="text-text-secondary text-[11px]">
                      Deviation: <strong className="text-text-primary font-mono">{zone.signalDeviation}</strong> vs normal baseline
                    </div>
                    <div className="text-[10px] text-[#B26A00] bg-severity-high/10 p-2.5 rounded-clay-button shadow-clay-inset">
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
                  <div className="p-3.5 text-xs space-y-2 min-w-[220px] bg-white rounded-[20px]">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="font-mono font-bold text-brand-primary">{inc.id}</span>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-0.5 rounded-clay-pill text-[9px] font-bold uppercase shadow-clay-pill ${
                          inc.verificationStatus === 'verified'
                            ? 'bg-severity-success/15 text-[#1C8C5A]'
                            : 'bg-severity-high/15 text-[#B26A00]'
                        }`}>
                          {inc.verificationStatus}
                        </span>
                        <span className="px-2 py-0.5 rounded-clay-pill text-[10px] font-bold uppercase bg-surface-inset text-text-secondary shadow-clay-inset">
                          {inc.severity}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-text-primary leading-snug">
                      {inc.title}
                    </h4>
                    <div className="text-[11px] text-text-secondary flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="truncate">{inc.sector} · {inc.locationName}</span>
                    </div>
                    <div className="text-[10px] font-mono text-text-muted bg-surface-inset p-2 rounded-xl shadow-clay-inset">
                      Coords: [{inc.coordinates[0].toFixed(4)}, {inc.coordinates[1].toFixed(4)}]
                      {inc.location_resolution_status && (
                        <div className="text-text-secondary text-[9px] mt-0.5 font-sans">
                          Resolution: <strong>{inc.location_resolution_status.replace(/_/g, ' ')}</strong>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Priority Score: <strong className="text-text-primary font-mono">{inc.priorityScore}/100</strong>
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
                      className="w-full mt-2 py-2 px-3 rounded-clay-button bg-brand-primary hover:bg-brand-hover text-white font-medium text-[11px] shadow-clay-primary transition-all active:shadow-clay-inset flex items-center justify-center space-x-1 cursor-pointer"
                      aria-label={`Inspect details for incident ${inc.id}`}
                    >
                      <span>Inspect Incident Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Accessible Map Legend */}
        <div
          className={`absolute bottom-4 left-4 z-20 bg-surface-elevated/95 backdrop-blur-xs rounded-clay-card shadow-clay-card transition-all ${
            showLegend ? 'p-3 max-w-[220px]' : 'p-2'
          }`}
          aria-label="Map Legend"
        >
          <div className={`flex items-center justify-between font-bold text-text-primary ${showLegend ? 'pb-1.5 mb-2 border-b border-black/5' : ''}`}>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center space-x-1.5 text-[10px] uppercase font-mono tracking-wider text-text-secondary hover:text-text-primary transition-colors"
              aria-label={showLegend ? "Collapse map legend" : "Expand map legend"}
            >
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
              <span>Map Legend</span>
              <span className="text-[10px] text-text-muted font-sans normal-case ml-0.5">
                {showLegend ? '▾' : '▸'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="text-text-muted hover:text-text-primary p-0.5 text-[10px] underline ml-2"
              aria-label={showLegend ? "Hide legend items" : "Show legend items"}
            >
              {showLegend ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLegend && (
            <div className="space-y-2">
              <div>
                <span className="text-[9px] uppercase font-mono text-text-muted block font-semibold mb-1">Priority / Severity</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D] flex-shrink-0" />
                    <span className="text-text-secondary">Critical</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5A524] flex-shrink-0" />
                    <span className="text-text-secondary">High</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F6BED] flex-shrink-0" />
                    <span className="text-text-secondary">Moderate</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2FB67C] flex-shrink-0" />
                    <span className="text-text-secondary">Low</span>
                  </div>
                </div>
              </div>
              <div className="pt-1.5 border-t border-black/5">
                <span className="text-[9px] uppercase font-mono text-text-muted block font-semibold mb-1">Verification</span>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-700">✓</span>
                    <span className="text-text-secondary">Verified (Solid)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full border border-dashed border-amber-500 bg-amber-50 flex items-center justify-center text-[8px] font-bold text-amber-700">?</span>
                    <span className="text-text-secondary">Unverified (Dashed)</span>
                  </div>
                </div>
              </div>
              <div className="pt-1.5 border-t border-black/5 flex items-center space-x-1.5 text-[10px]">
                <span className="w-3.5 h-3.5 rounded-full border border-dashed border-amber-500 bg-amber-100 flex-shrink-0" />
                <span className="text-text-secondary">Signal Gap Void</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Zoom & Recenter Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-1.5 bg-surface-card rounded-clay-card shadow-clay-card p-1.5">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-clay-button bg-surface-card hover:bg-white text-text-secondary hover:text-text-primary shadow-clay-button active:shadow-clay-inset transition-all"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-clay-button bg-surface-card hover:bg-white text-text-secondary hover:text-text-primary shadow-clay-button active:shadow-clay-inset transition-all"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          {mapBounds && (
            <button
              onClick={handleFitAll}
              className="p-2 rounded-clay-button bg-surface-card hover:bg-white text-brand-primary shadow-clay-button active:shadow-clay-inset transition-all"
              title="Fit All Markers to Viewport"
              aria-label="Fit All Markers"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleRecenter}
            className="p-2 rounded-clay-button bg-surface-card hover:bg-white text-text-secondary hover:text-text-primary shadow-clay-button active:shadow-clay-inset transition-all"
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
