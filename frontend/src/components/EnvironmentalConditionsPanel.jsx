import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Waves,
  RefreshCw,
  ExternalLink,
  Info,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Filter,
  TrendingUp,
  Activity
} from 'lucide-react';
import api from '../services/api';

// Pre-configured operational reference sectors
const PRESET_LOCATIONS = [
  { name: 'Udupi, Karnataka', lat: 13.3409, lon: 74.7421 },
  { name: 'Wayanad Relief Sector, Kerala', lat: 11.6854, lon: 76.1320 },
  { name: 'Chamoli Disaster Zone, Uttarakhand', lat: 30.4150, lon: 79.3248 },
  { name: 'Mumbai Coastal Belt, Maharashtra', lat: 18.9220, lon: 72.8347 },
  { name: 'Brahmaputra Valley, Assam', lat: 26.1445, lon: 91.7362 },
];

// Render explicit provenance & freshness badges adhering to strict audit standards
const renderProvenanceBadge = (rec) => {
  const isSimulated = rec?.quality_status === 'simulated';
  const isForecast = rec?.classification === 'forecast';
  const isModel = rec?.classification === 'model_estimate';
  const isHistorical = rec?.classification === 'historical' || rec?.freshness_status === 'historical_archive';
  const isFresh = rec?.freshness_status === 'fresh';
  const isStale = rec?.freshness_status === 'stale';

  if (isSimulated) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
        DEMO / SIMULATED
      </span>
    );
  }
  if (isForecast) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
        Numerical Forecast
      </span>
    );
  }
  if (isModel) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
        Model Estimate
      </span>
    );
  }
  if (isFresh) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        Fresh Observation (&lt;6h)
      </span>
    );
  }
  if (isStale) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
        Stale Observation (&gt;6h)
      </span>
    );
  }
  if (isHistorical) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
        Historical Archive
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
      Feed Unavailable
    </span>
  );
};

export default function EnvironmentalConditionsPanel({
  selectedIncident = null,
  onNavigateToMap = null,
  className = ''
}) {
  // Navigation View Tabs
  const [activeTab, setActiveTab] = useState('open_meteo'); // 'open_meteo' | 'india_stations' | 'alerts_audit'

  // Open-Meteo State
  const [selectedLoc, setSelectedLoc] = useState(PRESET_LOCATIONS[0]);
  const [envData, setEnvData] = useState(null);
  const [isLoadingMeteo, setIsLoadingMeteo] = useState(true);
  const [isRefreshingMeteo, setIsRefreshingMeteo] = useState(false);
  const [meteoError, setMeteoError] = useState(null);

  // Official India Stations State
  const [indiaData, setIndiaData] = useState(null);
  const [isLoadingIndia, setIsLoadingIndia] = useState(false);
  const [isRefreshingIndia, setIsRefreshingIndia] = useState(false);
  const [indiaError, setIndiaError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all | water_level | rainfall | river_discharge | temperature
  const [filterState, setFilterState] = useState('');
  const [reviewedAlerts, setReviewedAlerts] = useState({});

  // 1. Fetch Open-Meteo Model Data
  const fetchMeteoConditions = useCallback(async (loc, force = false) => {
    if (force) {
      setIsRefreshingMeteo(true);
    } else {
      setIsLoadingMeteo(true);
    }
    setMeteoError(null);

    try {
      const res = await api.getEnvironmentalData({
        latitude: loc.lat,
        longitude: loc.lon,
        locationName: loc.name,
        forceRefresh: force
      });
      setEnvData(res);
    } catch (err) {
      console.error('Failed to load environmental data:', err);
      setMeteoError(err.message || 'Environmental data service unreachable.');
    } finally {
      setIsLoadingMeteo(false);
      setIsRefreshingMeteo(false);
    }
  }, []);

  // 2. Fetch Official India Stations (IMD & NWDP/CWC)
  const fetchIndiaStations = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshingIndia(true);
    } else {
      setIsLoadingIndia(true);
    }
    setIndiaError(null);

    try {
      const res = await api.getIndiaStationsData({
        measurement_type: filterType,
        state: filterState || undefined,
        limit: 80,
        forceRefresh: force
      });
      setIndiaData(res);
    } catch (err) {
      console.error('Failed to load India station telemetry:', err);
      setIndiaError(err.message || 'Official India telemetry service unreachable.');
    } finally {
      setIsLoadingIndia(false);
      setIsRefreshingIndia(false);
    }
  }, [filterType, filterState]);

  useEffect(() => {
    fetchMeteoConditions(selectedLoc);
  }, [fetchMeteoConditions, selectedLoc]);

  useEffect(() => {
    if (activeTab === 'india_stations' || activeTab === 'alerts_audit') {
      fetchIndiaStations();
    }
  }, [activeTab, fetchIndiaStations]);

  const handleLocationChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && PRESET_LOCATIONS[idx]) {
      setSelectedLoc(PRESET_LOCATIONS[idx]);
    }
  };

  const handleUseIncidentLocation = () => {
    if (selectedIncident && Array.isArray(selectedIncident.coordinates) && selectedIncident.coordinates.length === 2) {
      const [lat, lon] = selectedIncident.coordinates;
      const customLoc = {
        name: `${selectedIncident.title || 'Incident'} (${selectedIncident.id})`,
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      };
      setSelectedLoc(customLoc);
    }
  };

  const handleCorroborateAlert = (alertId) => {
    setReviewedAlerts(prev => ({
      ...prev,
      [alertId]: {
        reviewedAt: new Date().toLocaleTimeString(),
        reviewer: 'Lead Coordinator'
      }
    }));
  };

  const hasIncidentCoords = selectedIncident &&
    Array.isArray(selectedIncident.coordinates) &&
    selectedIncident.coordinates.length === 2 &&
    typeof selectedIncident.coordinates[0] === 'number';

  // Available Indian States for filter
  const availableStates = useMemo(() => {
    if (!indiaData || !Array.isArray(indiaData.records)) return [];
    const states = new Set();
    indiaData.records.forEach(r => {
      if (r.state) states.add(r.state);
    });
    return Array.from(states).sort();
  }, [indiaData]);

  // Group readings by station to calculate trend sparklines for stations with multiple acquisition times
  const stationGroups = useMemo(() => {
    if (!indiaData || !Array.isArray(indiaData.records)) return [];
    const groups = {};
    indiaData.records.forEach(rec => {
      const key = `${rec.source}_${rec.station_name || 'station'}_${rec.measurement_type}`;
      if (!groups[key]) {
        groups[key] = {
          station_name: rec.station_name,
          source: rec.source,
          source_type: rec.source_type,
          agency: rec.agency,
          state: rec.state,
          district: rec.district,
          river: rec.river,
          basin: rec.basin,
          latitude: rec.latitude,
          longitude: rec.longitude,
          measurement_type: rec.measurement_type,
          unit: rec.unit,
          freshness_status: rec.freshness_status,
          quality_status: rec.quality_status,
          classification: rec.classification,
          source_url: rec.source_url,
          notes: rec.notes,
          readings: []
        };
      }
      groups[key].readings.push(rec);
    });

    return Object.values(groups);
  }, [indiaData]);

  const activeAlertsCount = indiaData?.alerts?.length || 0;

  return (
    <div className={`bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-xl p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* 1. Header Hero with disaster-bg-2.jpg backdrop & Layer Tab Switcher */}
      <div 
        className="rounded-xl border border-[#203550] p-4 sm:p-5 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.76) 0%, rgba(7, 17, 31, 0.45) 50%, rgba(13, 27, 45, 0.22) 100%), url('/images/disaster-bg-2.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                <CloudRain className="w-4 h-4 text-[#21D4FD]" />
                <span>Environmental Conditions & Hydrology</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#07111F]/90 text-[#21D4FD] border border-blue-800/60 shadow-xs backdrop-blur-xs">
                Open-Meteo & India CWC
              </span>
            </div>
            <p className="text-[11px] text-slate-100 font-medium mt-1 max-w-xl leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              Official Indian meteorological observations (IMD), river telemetry (NWDP/CWC), and GloFAS numerical models.
            </p>
          </div>

          {/* Layer Mode Switcher Tabs */}
          <div className="flex items-center space-x-1.5 bg-[#07111F]/90 backdrop-blur-md p-1 rounded-lg border border-[#203550] text-xs font-medium self-start md:self-auto shadow-md">
            <button
              type="button"
              onClick={() => setActiveTab('open_meteo')}
              className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center space-x-1.5 ${
                activeTab === 'open_meteo'
                  ? 'bg-[#2878FF] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#132238]'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-[#21D4FD]" />
              <span>Open-Meteo Model</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('india_stations')}
              className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center space-x-1.5 ${
                activeTab === 'india_stations'
                  ? 'bg-[#2878FF] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#132238]'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-[#21D4FD]" />
              <span>Official India Stations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts_audit')}
              className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center space-x-1.5 ${
                activeTab === 'alerts_audit'
                  ? 'bg-[#FFB547] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#132238]'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'alerts_audit' ? 'text-slate-950' : 'text-[#FFB547]'}`} />
              <span>Alerts & Audit</span>
              {activeAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPEN-METEO & GLOFAS NUMERICAL MODEL LAYER (Preserves Existing Flow) */}
      {/* ========================================================================= */}
      {activeTab === 'open_meteo' && (
        <div className="space-y-4">
          {/* Location Controls & Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-2">
              <label htmlFor="openmeteo-sector-select" className="text-xs text-slate-600 font-medium">Monitoring Sector:</label>
              <select
                id="openmeteo-sector-select"
                value={PRESET_LOCATIONS.findIndex(l => l.name === selectedLoc.name)}
                onChange={handleLocationChange}
                aria-label="Select operational monitoring sector"
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
              >
                {PRESET_LOCATIONS.map((loc, idx) => (
                  <option key={loc.name} value={idx}>
                    {loc.name}
                  </option>
                ))}
                {selectedLoc && !PRESET_LOCATIONS.some(l => l.name === selectedLoc.name) && (
                  <option value="-1">{selectedLoc.name}</option>
                )}
              </select>

              {hasIncidentCoords && selectedLoc.name !== `${selectedIncident.title || 'Incident'} (${selectedIncident.id})` && (
                <button
                  type="button"
                  onClick={handleUseIncidentLocation}
                  title="Inspect weather for currently selected incident coordinates"
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center space-x-1"
                >
                  <MapPin className="w-3 h-3 text-red-600" />
                  <span className="hidden md:inline">Use Incident Pin</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-500 font-mono">
                {envData?.location?.latitude?.toFixed(4)}°N, {envData?.location?.longitude?.toFixed(4)}°E
              </span>
              <button
                type="button"
                onClick={() => fetchMeteoConditions(selectedLoc, true)}
                disabled={isRefreshingMeteo || isLoadingMeteo}
                title="Force refresh environmental data from Open-Meteo"
                aria-label="Refresh Environmental Data"
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshingMeteo ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Critical Distinction Banner */}
          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-start space-x-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold">Model-Derived Environmental Context: </span>
              <span>
                These measurements reflect numerical meteorological and hydrological predictions.
                They provide ambient operational context and do <strong>not</strong> create automated incident alerts or alter human-verified triage scores.
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {meteoError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{meteoError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchMeteoConditions(selectedLoc, true)}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingMeteo && !envData && (
            <div className="space-y-3 animate-pulse py-4">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-20 bg-slate-100 rounded-lg" />
                <div className="h-20 bg-slate-100 rounded-lg" />
                <div className="h-20 bg-slate-100 rounded-lg" />
                <div className="h-20 bg-slate-100 rounded-lg" />
              </div>
            </div>
          )}

          {/* Main Weather Indicators Grid */}
          {envData && (
            <>
              {/* Active Coordinates & Model Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800">{envData.location?.name}</span>
                  <span className="text-slate-400">·</span>
                  <span>{envData.location?.latitude?.toFixed(4)}°N, {envData.location?.longitude?.toFixed(4)}°E</span>
                  {envData.location?.elevation_m !== undefined && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span>{envData.location.elevation_m}m elev.</span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Model: {envData.observation_model_timestamp || 'Latest'}</span>
                  <span className="text-slate-300">·</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    envData.is_cached
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {envData.is_cached ? 'Cached (15m TTL)' : 'Live Feed'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Metric 1: Temperature */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Temperature</span>
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-bold text-white font-mono">
                      {envData.current?.temperature_c !== null ? `${envData.current.temperature_c}°C` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Feels like {envData.current?.apparent_temperature_c !== null ? `${envData.current.apparent_temperature_c}°C` : '--'}
                    </div>
                  </div>
                </div>

                {/* Metric 2: Current Rain Rate */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Current Precip</span>
                    <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-bold text-white font-mono">
                      {envData.current?.precipitation_mm !== null ? `${envData.current.precipitation_mm} mm` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Rate in current hour
                    </div>
                  </div>
                </div>

                {/* Metric 3: 24h Projected Rainfall */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>24h Forecast Rain</span>
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-bold text-white font-mono">
                      {envData.precipitation?.next_24h_total_mm !== undefined ? `${envData.precipitation.next_24h_total_mm} mm` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Next 6h: {envData.precipitation?.next_6h_total_mm ?? 0} mm
                    </div>
                  </div>
                </div>

                {/* Metric 4: Relative Humidity */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Humidity</span>
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-bold text-white font-mono">
                      {envData.current?.relative_humidity_pct !== null ? `${envData.current.relative_humidity_pct}%` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Atmospheric moisture
                    </div>
                  </div>
                </div>

                {/* Metric 5: Wind & Gusts */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Wind Speed</span>
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-bold text-white font-mono">
                      {envData.current?.wind_speed_kmh !== null ? `${envData.current.wind_speed_kmh} km/h` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Gusts to {envData.current?.wind_gusts_kmh ?? '--'} km/h
                    </div>
                  </div>
                </div>

                {/* Metric 6: Weather Condition */}
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Condition</span>
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="mt-1">
                    <div className="text-xs font-bold text-white leading-tight">
                      {envData.current?.weather_description || 'Clear'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {envData.current?.surface_pressure_hpa ? `${envData.current.surface_pressure_hpa} hPa` : 'Surface Press.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hydrological River Discharge (GloFAS Integration) */}
              <div className="p-3.5 rounded-xl border border-[#203550] bg-gradient-to-r from-[#091629] via-[#0D1B2D] to-[#091629] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#203550] mb-2.5">
                  <div className="flex items-center space-x-2">
                    <Waves className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-white">
                      GloFAS Hydrological Flow Projection (River Discharge)
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      envData.flood_risk?.available
                        ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {envData.flood_risk?.available ? 'GloFAS v4 Model Active' : 'No GloFAS River Cell'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ECMWF Global Flood Awareness System (~5km grid)
                  </span>
                </div>

                {envData.flood_risk?.available ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px]">Simulated River Flow (Today):</span>
                      <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                        {envData.flood_risk.current_discharge_m3s !== null ? `${envData.flood_risk.current_discharge_m3s} m³/s` : 'Nominal'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Modeled volumetric flow in nearest river reach
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px]">7-Day Peak Forecast Flow:</span>
                      <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                        {envData.flood_risk.forecast_max_discharge_m3s !== null ? `${envData.flood_risk.forecast_max_discharge_m3s} m³/s` : 'Nominal'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Ensemble maximum discharge threshold
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-300 border-l border-[#203550] pl-3">
                      <span className="font-semibold text-slate-200">Model Guidance:</span>
                      <p className="mt-0.5 text-[10px] text-slate-400 italic">
                        {envData.flood_risk.notes || 'GloFAS hydrological flow model for catchment routing.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    {envData.flood_risk?.notes || 'GloFAS river discharge model not available for this coastal/coordination cell.'}
                  </div>
                )}
              </div>

              {/* Hourly Rainfall Forecast Visualizer */}
              {Array.isArray(envData.precipitation?.hourly) && envData.precipitation.hourly.length > 0 && (
                <div className="p-3 rounded-xl bg-[#091629] border border-[#203550] shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-2">
                    <span className="flex items-center space-x-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Next 12-Hour Hourly Rainfall Projections (mm)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Peak: {envData.precipitation.max_hourly_rate_mm} mm/h
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
                    {envData.precipitation.hourly.slice(0, 12).map((item, idx) => {
                      const hourStr = item.time?.split('T')[1]?.slice(0, 5) || `+${idx}h`;
                      const pVal = item.precipitation_mm || 0;
                      const isHigh = pVal >= 5.0;
                      const isMed = pVal >= 1.0;
                      return (
                        <div
                          key={item.time || idx}
                          className={`flex flex-col items-center p-1.5 rounded-lg text-center font-mono ${
                            isHigh
                              ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                              : isMed
                              ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
                              : 'bg-[#0D1B2D] border border-[#203550] text-slate-300'
                          }`}
                        >
                          <span className="text-[9px] text-slate-400">{hourStr}</span>
                          <span className="text-[11px] font-bold mt-0.5">{pVal.toFixed(1)}</span>
                          <span className="text-[8px] text-slate-500">mm</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OFFICIAL INDIA STATIONS (IMD & NWDP/CWC TELEMETRY) */}
      {/* ========================================================================= */}
      {activeTab === 'india_stations' && (
        <div className="space-y-4">
          {/* Station Filters & Refresh Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#091629] border border-[#203550] text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-300 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Filters:</span>
              </span>

              {/* Measurement Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by measurement parameter"
                className="bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="all">All Parameters</option>
                <option value="water_level">River Water Level (CWC)</option>
                <option value="rainfall">Rainfall (CWC / IMD)</option>
                <option value="river_discharge">River Discharge (CWC)</option>
                <option value="temperature">Weather & Temp (IMD)</option>
              </select>

              {/* State Filter */}
              {availableStates.length > 0 && (
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  aria-label="Filter by Indian State"
                  className="bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All States</option>
                  {availableStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {indiaData?.retrieval_timestamp && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  Fetched: {new Date(indiaData.retrieval_timestamp).toLocaleTimeString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchIndiaStations(true)}
                disabled={isRefreshingIndia || isLoadingIndia}
                aria-label="Refresh India Stations"
                className="px-2.5 py-1 rounded-lg bg-[#0D1B2D] hover:bg-[#132238] text-slate-200 border border-[#203550] flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-cyan-400 ${isRefreshingIndia ? 'animate-spin' : ''}`} />
                <span>Refresh Feeds</span>
              </button>
            </div>
          </div>

          {/* Provenance & Freshness Explanation Notice */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Official India Meteorological & Hydrological Network Ground Truth — Regional Telemetry Archives</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              River water levels, discharge, and rainfall are sourced from Central Water Commission (CWC) telemetry via the National Water Data Portal (NWDP CKAN Datastore). Data represents published periodic telemetry archives (spanning through late 2025), not a live continuous sub-minute nationwide sensor grid. Weather observations adhere to India Meteorological Department (IMD) standards; live IMD feeds require registered agency credentials (api.imd.gov.in) and are currently in simulated demonstration mode.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20 text-[10px] font-mono text-amber-300">
              <span className="font-bold">Freshness Boundaries:</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">Fresh: &lt;6h</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40">Stale: 6h–24h</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">Historical Archive: &gt;24h (2025)</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/40">Model/Simulated: Demo only</span>
            </div>
          </div>

          {/* Error Banner */}
          {indiaError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{indiaError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchIndiaStations(true)}
                className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold text-[11px]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingIndia && !indiaData && (
            <div className="space-y-3 animate-pulse py-4">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="h-28 bg-slate-100 rounded-lg" />
                <div className="h-28 bg-slate-100 rounded-lg" />
              </div>
            </div>
          )}

          {/* Stations Grid */}
          {indiaData && stationGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stationGroups.map((group, gIdx) => {
                const latestRec = group.readings[0] || {};
                const hasMultiple = group.readings.length > 1;
                const hasCoords = group.latitude != null && group.longitude != null;

                return (
                  <div
                    key={gIdx}
                    className="p-3.5 rounded-xl border border-[#203550] bg-[#091629] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-xs"
                  >
                    {/* Top Row: Station Name & Source Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                          <span>{group.station_name}</span>
                          {group.agency && (
                            <span className="px-1.5 py-0.2 rounded bg-[#0D1B2D] text-slate-300 border border-[#203550] font-mono text-[9px]">
                              {group.agency}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {group.river ? `River ${group.river}` : ''}
                          {group.basin ? ` · ${group.basin} Basin` : ''}
                          {group.state ? ` (${group.state}${group.district ? `, ${group.district}` : ''})` : ''}
                        </div>
                      </div>

                      {/* Source Pill */}
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          group.source.includes('NWDP')
                            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                            : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {group.source}
                        </span>
                        {group.source.includes('NWDP') && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            Regional Archival Station
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Reading & Measurement Type */}
                    <div className="flex items-baseline justify-between p-2 rounded-lg bg-[#0D1B2D] border border-[#203550]">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                          {group.measurement_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xl font-bold font-mono text-white">
                          {latestRec.value !== null ? `${latestRec.value} ${latestRec.unit}` : '--'}
                        </span>
                      </div>

                      {/* Freshness & Quality Badges */}
                      <div className="flex flex-col items-end space-y-1">
                        {renderProvenanceBadge(latestRec)}
                        <span className="text-[9px] text-slate-400 font-mono">
                          Obs: {latestRec.observation_timestamp || 'No observation timestamp (Unavailable)'}
                        </span>
                      </div>
                    </div>

                    {/* Time-Series Trend Mini Sparkline (when multiple readings available) */}
                    {hasMultiple && (
                      <div className="pt-1.5 border-t border-[#203550]">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 text-cyan-400" />
                            <span>Telemetry Trend ({group.readings.length} records)</span>
                          </span>
                          <span>Range: {group.readings[group.readings.length - 1]?.observation_timestamp?.split(' ')[1] || 'T0'} → {latestRec.observation_timestamp?.split(' ')[1] || 'T1'}</span>
                        </div>

                        {/* Mini Bars */}
                        <div className="flex items-end space-x-1 h-8 pt-1">
                          {group.readings.slice(0, 10).reverse().map((r, rIdx) => {
                            const val = r.value || 0;
                            // Scale height relative to nominal
                            const heightPct = Math.min(100, Math.max(20, (val / (latestRec.value || 1)) * 70));
                            return (
                              <div
                                key={rIdx}
                                title={`${r.observation_timestamp}: ${val} ${r.unit}`}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-400 rounded-xs transition-colors cursor-pointer"
                                style={{ height: `${heightPct}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom Row: Coordinates & Map Focus */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#203550] text-[10px] font-mono text-slate-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {hasCoords ? (
                          <span>[{group.latitude?.toFixed(4)}, {group.longitude?.toFixed(4)}]</span>
                        ) : (
                          <span className="text-amber-400 italic">No Coordinates (Incomplete Metadata)</span>
                        )}
                      </div>

                      {hasCoords && onNavigateToMap && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMap([group.latitude, group.longitude], group.station_name)}
                          className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center space-x-0.5"
                        >
                          <span>Show on Map</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {indiaData && stationGroups.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-50 rounded-lg border border-slate-200">
              No station records match the selected filters.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SITUATIONAL ALERTS & SOURCE AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'alerts_audit' && (
        <div className="space-y-4">
          {/* Section A: Reviewable Environmental Alerts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Reviewable Situational Alerts ({indiaData?.alerts?.length || 0})</span>
              </h4>
              <span className="text-[10px] text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                Coordinator Review Queue
              </span>
            </div>

            {/* Coordinator Safety Notice */}
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs mb-3 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="leading-snug text-[11px]">
                <strong className="block text-amber-300 font-mono">Operational Alert Corroboration Protocol:</strong>
                Environmental threshold exceedances assist situational awareness. Corroborating an alert acknowledges hydrometeorological risk but <strong>does NOT automatically verify civilian incident reports</strong> or alter triage rankings without ground evidence.
              </div>
            </div>

            {/* Alerts List */}
            {indiaData?.alerts && indiaData.alerts.length > 0 ? (
              <div className="space-y-2.5">
                {indiaData.alerts.map((alert) => {
                  const isReviewed = !!reviewedAlerts[alert.id];
                  const isCrit = alert.severity === 'critical';
                  const isHigh = alert.severity === 'high';

                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCrit
                          ? 'bg-rose-950/40 border-rose-500/40'
                          : isHigh
                          ? 'bg-amber-950/40 border-amber-500/40'
                          : 'bg-blue-950/40 border-blue-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-[#203550]">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            isCrit
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="font-bold text-xs text-white">{alert.title}</span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono">
                          Source: {alert.source} · {alert.observation_timestamp || 'Latest'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {alert.description}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-300 bg-[#0D1B2D] p-2 rounded-lg border border-[#203550] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-mono text-[10px]">
                          Trigger: <strong className="text-white">{alert.recorded_value} {alert.unit}</strong> (Threshold: {alert.threshold} {alert.unit})
                        </div>

                        {/* Coordinator Action */}
                        <div className="flex items-center space-x-2">
                          {isReviewed ? (
                            <span className="flex items-center space-x-1 text-emerald-400 font-bold text-[10px] font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Corroborated by {reviewedAlerts[alert.id].reviewer}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCorroborateAlert(alert.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-semibold transition-colors"
                            >
                              Corroborate Situational Context
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs italic bg-[#091629] rounded-xl border border-[#203550]">
                No active threshold exceedances detected across connected river gauges and stations.
              </div>
            )}
          </div>

          {/* Section B: Official Government Data Sources Verification & Audit */}
          <div className="pt-3 border-t border-[#203550]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official Data Source Health & Access Audit</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Source 1: IMD */}
              <div className="p-3 rounded-xl border border-[#203550] bg-[#091629] flex flex-col justify-between space-y-2 text-xs shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">India Meteorological Dept (IMD)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                      Credentials Required
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    API Management Platform: /current_wx and /aws_data.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 space-y-1 font-mono pt-1 border-t border-[#203550]">
                  <div>Auth: x-api-key + Bearer JWT</div>
                  <div>Docs: <a href="https://api.imd.gov.in/public/api_reference.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">api.imd.gov.in</a></div>
                </div>
              </div>

              {/* Source 2: NWDP / CWC */}
              <div className="p-3 rounded-xl border border-[#203550] bg-[#091629] flex flex-col justify-between space-y-2 text-xs shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">National Water Data Portal (CWC)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                      Active CKAN Archive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Central Water Commission hourly river water levels, rainfall, and discharge telemetry.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 space-y-1 font-mono pt-1 border-t border-[#203550]">
                  <div>Access: Public CKAN Datastore API</div>
                  <div>Portal: <a href="https://nwdp.nwic.gov.in/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">nwdp.nwic.gov.in</a></div>
                </div>
              </div>

              {/* Source 3: Open-Meteo & GloFAS */}
              <div className="p-3 rounded-xl border border-[#203550] bg-[#091629] flex flex-col justify-between space-y-2 text-xs shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Open-Meteo & GloFAS</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                      Active Model
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ECMWF / GloFAS numerical weather predictions and continental catchment river discharge.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 space-y-1 font-mono pt-1 border-t border-[#203550]">
                  <div>License: CC-BY 4.0 Open Access</div>
                  <div>Portal: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">open-meteo.com</a></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Legal Attribution & Provider Links */}
      <div className="pt-2 border-t border-[#203550] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 font-sans">
        <div>
          Official data from{' '}
          <a
            href="https://nwdp.nwic.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline font-medium inline-flex items-center space-x-0.5"
          >
            <span>Central Water Commission (NWDP/NWIC)</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>{' '}
          and{' '}
          <a
            href="https://api.imd.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline font-medium inline-flex items-center space-x-0.5"
          >
            <span>India Meteorological Department (IMD)</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>. Weather models by{' '}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline font-medium inline-flex items-center space-x-0.5"
          >
            <span>Open-Meteo</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>{' '}
          (CC-BY 4.0).
        </div>
        <div className="text-slate-500">
          Official Government Hydrometeorology & Models · Triage decisions require human corroboration
        </div>
      </div>
    </div>
  );
}
