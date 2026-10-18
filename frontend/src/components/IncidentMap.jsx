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
  Crosshair, 
  Plus, 
  Minus, 
  Maximize2, 
  Minimize2, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Flame,
  Waves,
  HeartPulse,
  Zap,
  Building2,
  Droplets,
  Radio
} from 'lucide-react';

// Custom Map Controller to handle map interactions, resizing, and programmatic navigation
function MapController({ 
  center, 
  zoom, 
  isFullscreen, 
  onRegisterMap 
}) {
  const map = useMap();

  useEffect(() => {
    if (onRegisterMap) {
      onRegisterMap(map);
    }
  }, [map, onRegisterMap]);

  // Recenter / fly to selected incident or metro center
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 0.8 });
    }
  }, [center, zoom, map]);

  // Invalidate size whenever container or fullscreen toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map, isFullscreen]);

  return null;
}

// Inline SVG Icon generators for Leaflet divIcons
function getIconSvg(typeStr, titleStr) {
  const text = `${typeStr || ''} ${titleStr || ''}`.toLowerCase();

  // Fire / Gas / Combustion
  if (text.includes('fire') || text.includes('gas') || text.includes('plume') || text.includes('combustion')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
  }
  // Flooding / Water Rescue
  if (text.includes('flood') || text.includes('water rescue') || text.includes('submerged') || text.includes('underpass')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`;
  }
  // Medical / Trauma / Casualties
  if (text.includes('medical') || text.includes('casualty') || text.includes('trauma') || text.includes('injured') || text.includes('clinic')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`;
  }
  // Power / Electrical / Substation / High Voltage
  if (text.includes('power') || text.includes('voltage') || text.includes('substation') || text.includes('generator') || text.includes('downed')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
  }
  // Structural Collapse / Building damage
  if (text.includes('structural') || text.includes('collapse') || text.includes('building') || text.includes('infrastructure')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M18 10h4a2 2 0 0 1 2 2v10h-6"/><path d="M6 18H2v-4a2 2 0 0 1 2-2h2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }
  // Water Utilities / Booster pump
  if (text.includes('water pump') || text.includes('potable') || text.includes('pipe')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`;
  }
  // Generic Emergency
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

export default function IncidentMap({ 
  incidents, 
  selectedIncident, 
  onSelectIncident,
  attentionZones = []
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnderreported, setShowUnderreported] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);

  const mapInstanceRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Metro area cluster center (San Francisco / Coastal Bay simulated cluster)
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
    return defaultCenter;
  }, [selectedIncident, defaultCenter]);

  // Count unmapped incidents
  const unmappedCount = useMemo(() => {
    return (incidents || []).filter(
      (i) => !i.coordinates || !Array.isArray(i.coordinates) || i.coordinates.length !== 2 || i.coordinates[0] == null || i.coordinates[1] == null
    ).length;
  }, [incidents]);

  // Severity styles mapping
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: '#ef4444',
          border: '#f87171',
          glow: 'rgba(239, 68, 68, 0.5)',
          badgeCls: 'bg-red-950/90 text-red-300 border-red-800/60',
          textCls: 'text-red-400'
        };
      case 'high':
        return {
          bg: '#f59e0b',
          border: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.5)',
          badgeCls: 'bg-amber-950/90 text-amber-300 border-amber-800/60',
          textCls: 'text-amber-400'
        };
      case 'moderate':
      case 'medium':
        return {
          bg: '#3b82f6',
          border: '#60a5fa',
          glow: 'rgba(59, 130, 246, 0.5)',
          badgeCls: 'bg-blue-950/90 text-blue-300 border-blue-800/60',
          textCls: 'text-blue-400'
        };
      default: // low
        return {
          bg: '#10b981',
          border: '#34d399',
          glow: 'rgba(16, 185, 129, 0.5)',
          badgeCls: 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60',
          textCls: 'text-emerald-400'
        };
    }
  };

  // Create Leaflet DivIcon for custom circular glowing marker
  const createCustomMarkerIcon = (incident, isSelected) => {
    const style = getSeverityStyle(incident.severity);
    const iconSvg = getIconSvg(incident.type, incident.title);
    const isCritical = incident.severity === 'critical';

    const htmlString = `
      <div class="resqnet-marker-wrapper ${isSelected ? 'is-selected' : ''}">
        ${(isCritical || isSelected) ? `<div class="resqnet-marker-ping" style="background-color: ${style.glow}; border: 1px dashed ${style.border};"></div>` : ''}
        <div class="resqnet-marker-halo" style="border-color: ${style.border};"></div>
        <div class="resqnet-marker-core" style="background-color: ${style.bg}; box-shadow: 0 0 16px ${style.glow};">
          ${iconSvg}
        </div>
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

  // Map controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(defaultCenter, 13, { duration: 0.8 });
    }
  };

  // Handle ResizeObserver to keep Leaflet fitting container smoothly
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={mapContainerRef}
      className={`bg-[#0a0f1d] border border-[#1b263d] rounded-xl overflow-hidden shadow-card-subtle flex flex-col relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'h-[520px]'
      }`}
    >
      {/* 1. MAP HEADER (Preserved styling from Design 1) */}
      <div className="px-4 py-3 bg-[#080d19]/95 border-b border-[#162035] flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Live incident map</h2>
            <span className="text-xs text-slate-400 font-mono">Metro Bay Sector (Simulated)</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#101a2e] border border-[#1c2b48] text-[11px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>All districts</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300 font-semibold">
              {incidents.filter(i => i.responseStatus !== 'resolved').length} active incidents
            </span>
          </div>

          {unmappedCount > 0 && (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-300 text-[11px] font-mono" title={`${unmappedCount} incidents have unmapped/unknown coordinates and are not plotted on the map`}>
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{unmappedCount} unmapped</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Simulation Label */}
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Simulation</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-[#141e34] text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tile Network Error Notice (If external tile server fails) */}
      {tileError && (
        <div className="bg-amber-950/90 border-b border-amber-600/50 px-4 py-2 z-30 text-amber-200 text-xs flex items-center justify-between font-sans backdrop-blur">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Tile network error. Geographic coordinates, incident markers, and underreported zones remain active.</span>
          </div>
          <button
            onClick={() => setTileError(false)}
            className="px-2 py-0.5 bg-amber-800/60 hover:bg-amber-700 text-white rounded text-[11px] font-mono"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. REAL GEOGRAPHIC MAP CONTAINER */}
      <div className="flex-1 relative bg-[#070a13] overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          {/* Controller for synchronization, resize events, and flyTo */}
          <MapController
            center={activeCenter}
            zoom={selectedIncident ? 14 : 13}
            isFullscreen={isFullscreen}
            onRegisterMap={(map) => { mapInstanceRef.current = map; }}
          />

          {/* REAL GEOGRAPHIC OPENSTREETMAP TILE LAYER */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            className="osm-inverted-tiles"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            eventHandlers={{
              tileerror: () => {
                setTileError(true);
              }
            }}
          />

          {/* REAL GEOGRAPHIC UNDERREPORTED ZONES (Translucent circles with dashed amber borders) */}
          {showUnderreported && attentionZones.map((zone) => {
            if (!zone.coordinates || zone.coordinates.length !== 2) return null;
            return (
              <Circle
                key={zone.id}
                center={zone.coordinates}
                radius={1300} // ~1.3km neighbourhood radius
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.08,
                  dashArray: '6, 8',
                  weight: 1.8
                }}
              >
                <Popup className="resqnet-popup" autoPan={false}>
                  <div className="p-3 text-slate-100 font-sans text-xs min-w-[210px]">
                    <div className="flex items-center space-x-1.5 font-mono text-[10px] text-amber-400 font-bold mb-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>UNDERREPORTED SECTOR</span>
                    </div>
                    <div className="font-bold text-white text-xs">{zone.name}</div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      Signal deviation: <strong className="text-amber-400 font-mono">{zone.signalDeviation}</strong> vs baseline
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {zone.signalCount} · {zone.confidence}
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-[#1e293b] text-[10px] text-amber-300/80 italic">
                      ⚠️ Low signal does not indicate safety.
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* REAL GEOGRAPHIC INCIDENT MARKERS (Custom Glowing Icons at Lat/Lng Coordinates) */}
          {showMarkers && incidents.map((incident) => {
            if (!incident.coordinates || incident.coordinates.length !== 2) return null;

            const isSelected = selectedIncident?.id === incident.id;
            const style = getSeverityStyle(incident.severity);

            return (
              <Marker
                key={incident.id}
                position={incident.coordinates}
                icon={createCustomMarkerIcon(incident, isSelected)}
                eventHandlers={{
                  click: () => onSelectIncident(incident)
                }}
              >
                <Popup className="resqnet-popup" autoPan={false}>
                  <div className="p-3 text-slate-100 font-sans text-xs min-w-[220px]">
                    <div className="flex items-center justify-between font-mono text-[10px] pb-1 border-b border-[#162035] mb-2">
                      <span className="font-bold text-white tracking-wider">{incident.id}</span>
                      <span className={`uppercase px-1.5 py-0.2 rounded font-semibold border ${style.badgeCls}`}>
                        {incident.severity}
                      </span>
                    </div>

                    <div className="font-bold text-white text-xs leading-snug mb-1">
                      {incident.title}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{incident.sector} · {incident.locationName}</span>
                    </div>

                    {/* Location Provenance / Synthetic Label */}
                    {incident.is_synthetic_location ? (
                      <div className="mt-1.5 text-[9px] font-mono text-amber-400 bg-amber-950/70 border border-amber-800/60 rounded px-1.5 py-0.5">
                        ⚡ Synthetic Demo Coordinates (SF Bay Simulation)
                      </div>
                    ) : incident.location_source && incident.location_source.startsWith('geocoded') ? (
                      <div className="mt-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded px-1.5 py-0.5">
                        📍 Geocoded Indian Location
                      </div>
                    ) : incident.coordinates ? (
                      <div className="mt-1.5 text-[9px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 rounded px-1.5 py-0.5">
                        🛰️ User GPS Coordinates
                      </div>
                    ) : null}

                    <div className="mt-2.5 pt-2 border-t border-[#162035] grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block">P-SCORE:</span>
                        <strong className={`text-xs ${style.textCls}`}>{incident.priorityScore}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">RELIABILITY:</span>
                        <strong className="text-slate-200 text-xs">{incident.reportReliability}%</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectIncident(incident)}
                      className="w-full mt-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[11px] transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Focus in Incident Panel</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* 3. MAP CONTROLS STACK (Top Right) */}
        <div className="absolute top-4 right-4 flex flex-col space-y-1.5 z-30">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-[#090e1b]/95 hover:bg-[#141e34] border border-[#1e293b] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-[#090e1b]/95 hover:bg-[#141e34] border border-[#1e293b] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="w-8 h-8 rounded-lg bg-[#090e1b]/95 hover:bg-[#141e34] border border-[#1e293b] text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="Recenter Metro Cluster"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Layers Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowLayersDropdown(!showLayersDropdown)}
              className="w-8 h-8 rounded-lg bg-[#090e1b]/95 hover:bg-[#141e34] border border-[#1e293b] text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-colors shadow-lg"
              title="Toggle Map Layers"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showLayersDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-[#090e1b] border border-[#1e293b] rounded-lg shadow-2xl p-2.5 z-50 text-xs text-slate-300 font-sans backdrop-blur">
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 border-b border-[#162035] mb-1.5 font-semibold">
                  Map Layers & Overlays
                </div>
                <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-[#121c32] rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnderreported}
                    onChange={(e) => setShowUnderreported(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Underreported Zones</span>
                </label>
                <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-[#121c32] rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Incident Markers</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 4. MAP LEGEND (Bottom Left Pill Container) */}
        <div className="absolute bottom-3 left-3 bg-[#080d19]/90 backdrop-blur border border-[#1b263d] rounded-lg px-3 py-1.5 z-30 shadow-xl flex items-center space-x-3.5 text-[11px] font-mono pointer-events-auto">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]"></span>
            <span className="text-slate-200">Critical</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]"></span>
            <span className="text-slate-300">High</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f6]"></span>
            <span className="text-slate-300">Medium</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
            <span className="text-slate-300">Low</span>
          </div>
          <div className="flex items-center space-x-1.5 pl-1 border-l border-[#1a253e]">
            <span className="w-2.5 h-2.5 border border-dashed border-[#f59e0b] rounded-sm"></span>
            <span className="text-amber-300/90">Underreported</span>
          </div>
        </div>

        {/* Coordinates indicator on bottom right */}
        <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-mono bg-[#080d19]/80 backdrop-blur px-2 py-0.5 rounded border border-[#1b263d] z-30 pointer-events-none select-none">
          {activeCenter[0].toFixed(4)}°N, {Math.abs(activeCenter[1]).toFixed(4)}°W
        </div>
      </div>

      {/* 5. MAP FOOTER (Attribution and simulated status) */}
      <div className="px-4 py-2 bg-[#080d19] border-t border-[#162035] flex items-center justify-between text-[11px] font-mono z-20">
        <div className="flex items-center space-x-2 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Incident locations are simulated</span>
        </div>

        <div className="text-slate-400 flex items-center space-x-2">
          <span>Map tiles &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">OpenStreetMap</a> contributors</span>
          <span className="text-slate-600">·</span>
          <span>Updated <strong className="text-slate-200">just now</strong></span>
        </div>
      </div>
    </div>
  );
}
