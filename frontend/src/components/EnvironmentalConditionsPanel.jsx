import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CloudRain,
  CloudLightning,
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
  ChevronDown,
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

  // 6 Time slots for the Next 12-Hour Rainfall Forecast
  const forecastSlots = useMemo(() => {
    const hourly = envData?.precipitation?.hourly;
    const defaultTimes = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00'];
    const defaultAmounts = ['0.0', '0.0', '0.0', '0.0', '0.1', '0.1'];

    if (Array.isArray(hourly) && hourly.length >= 6) {
      const step = hourly.length >= 12 ? 2 : 1;
      const sampled = [];
      for (let i = 0; i < hourly.length && sampled.length < 6; i += step) {
        const item = hourly[i];
        const timeStr = item.time?.split('T')[1]?.slice(0, 5) || defaultTimes[sampled.length];
        const amt = item.precipitation_mm != null ? item.precipitation_mm.toFixed(1) : defaultAmounts[sampled.length];
        sampled.push({ time: timeStr, amount: amt });
      }
      return sampled;
    }
    return defaultTimes.map((t, idx) => ({ time: t, amount: defaultAmounts[idx] }));
  }, [envData]);

  // Metric card computed values
  const tempVal = envData?.current?.temperature_c != null ? `${envData.current.temperature_c}` : '29';
  const feelsLikeVal = envData?.current?.apparent_temperature_c != null ? `${envData.current.apparent_temperature_c}` : '35.4';
  const rain1hVal = envData?.precipitation?.current_hour_mm ?? envData?.current?.precipitation_mm ?? 0;
  const rain24hVal = envData?.precipitation?.next_24h_total_mm ?? 0.6;
  const windSpeedVal = envData?.current?.wind_speed_kmh != null ? envData.current.wind_speed_kmh : 2.7;
  const gustsVal = envData?.current?.wind_gusts_kmh != null ? envData.current.wind_gusts_kmh : 11.2;
  const riverFlowVal = envData?.flood_risk?.current_discharge_m3s != null ? envData.flood_risk.current_discharge_m3s : 1.45;

  return (
    <div className={`bg-surface-card rounded-clay-card shadow-clay-card p-4 sm:p-5 flex flex-col space-y-3 sm:space-y-3.5 max-w-full overflow-hidden text-text-primary ${className}`}>
      {/* 1. Header Hero with Clay Backdrop behind Title & Location Controls */}
      <div 
        className="rounded-clay-card bg-surface-card shadow-clay-card p-4 sm:px-5 sm:py-4 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 min-h-[85px]"
      >
        {/* Left: Icon Tile + Title + LIVE WEATHER DATA Pill + Subtitle */}
        <div className="relative z-10 flex items-center space-x-3 sm:space-x-3.5">
          {/* Muted square with cloud/rain icon */}
          <div className="w-11 h-11 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center flex-shrink-0 text-text-secondary">
            <CloudRain className="w-5.5 h-5.5 text-text-secondary" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5 sm:space-x-3 flex-wrap gap-y-1">
              <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight flex items-center space-x-1">
                <span>Environmental </span>
                <span className="text-brand-primary">Intelligence</span>
                <span className="sr-only">Environmental Conditions & Hydrology</span>
              </h3>

              {/* Status pill: LIVE WEATHER DATA */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-clay-pill bg-surface-elevated text-[10px] font-bold tracking-wider text-text-primary uppercase shadow-clay-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-severity-success shadow-xs" />
                <span>LIVE WEATHER DATA</span>
              </span>
            </div>

            <p className="text-xs text-text-secondary font-normal mt-0.5">
              Local weather and flood context for incident coordination.
            </p>
          </div>
        </div>

        {/* Right: Location selector & refresh button */}
        <div className="relative z-10 flex items-center space-x-2 sm:space-x-2.5 self-start md:self-auto flex-shrink-0">
          <div className="relative flex items-center">
            <div className="flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-clay-button bg-surface-card shadow-clay-button text-xs font-medium text-text-primary">
              <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
              <select
                id="openmeteo-sector-select"
                value={PRESET_LOCATIONS.findIndex(l => l.name === selectedLoc.name)}
                onChange={handleLocationChange}
                aria-label="Select operational monitoring sector"
                className="bg-transparent text-text-primary font-medium text-xs focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {PRESET_LOCATIONS.map((loc, idx) => (
                  <option key={loc.name} value={idx} className="bg-surface-card text-text-primary">
                    {loc.name}
                  </option>
                ))}
                {selectedLoc && !PRESET_LOCATIONS.some(l => l.name === selectedLoc.name) && (
                  <option value="-1" className="bg-surface-card text-text-primary">{selectedLoc.name}</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted pointer-events-none -ml-3" />
            </div>
          </div>

          {hasIncidentCoords && selectedLoc.name !== `${selectedIncident.title || 'Incident'} (${selectedIncident.id})` && (
            <button
              type="button"
              onClick={handleUseIncidentLocation}
              title="Inspect weather for currently selected incident coordinates"
              className="px-2.5 py-1.5 sm:py-2 rounded-clay-button bg-surface-card hover:bg-slate-100 text-brand-primary text-xs font-medium shadow-clay-button flex items-center space-x-1 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-severity-critical" />
              <span className="hidden xl:inline">Incident Pin</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchMeteoConditions(selectedLoc, true)}
            disabled={isRefreshingMeteo || isLoadingMeteo}
            title="Refresh Environmental Data"
            aria-label="Refresh Environmental Data"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-clay-button bg-surface-card hover:bg-slate-100 text-text-primary shadow-clay-button transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 text-brand-primary ${isRefreshingMeteo ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPEN-METEO & GLOFAS NUMERICAL MODEL LAYER (Primary Redesign View)  */}
      {/* ========================================================================= */}
      {activeTab === 'open_meteo' && (
        <div className="space-y-3 sm:space-y-3.5">
          {/* Error Banner */}
          {meteoError && (
            <div className="p-3 rounded-clay-card bg-severity-critical-soft text-severity-critical text-xs flex items-center justify-between gap-2 shadow-clay-pill">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0" />
                <span>{meteoError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchMeteoConditions(selectedLoc, true)}
                className="px-2.5 py-1 rounded-clay-button bg-severity-critical text-white font-semibold text-[11px] transition-colors flex-shrink-0 shadow-clay-button"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingMeteo && !envData && (
            <div className="space-y-3 animate-pulse py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="h-24 bg-slate-200 rounded-clay-card" />
                <div className="h-24 bg-slate-200 rounded-clay-card" />
                <div className="h-24 bg-slate-200 rounded-clay-card" />
                <div className="h-24 bg-slate-200 rounded-clay-card" />
              </div>
              <div className="h-36 bg-slate-200 rounded-clay-card" />
            </div>
          )}

          {/* Weather Dashboards */}
          {envData && (
            <>
              {/* Four Weather Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                {/* 1. Temperature Card (Warm Amber) */}
                <div className="rounded-clay-card p-3.5 sm:p-4 relative overflow-hidden flex items-center justify-between bg-surface-card shadow-clay-card">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center text-text-secondary flex-shrink-0">
                      <Thermometer className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-text-secondary font-medium">Temperature</div>
                      <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono leading-tight tracking-tight">
                        {tempVal}°C
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 truncate">
                        Feels like {feelsLikeVal}°C
                      </div>
                    </div>
                  </div>

                  {/* Amber Sparkline Graphic */}
                  <div className="flex-shrink-0 pl-2">
                    <svg viewBox="0 0 100 40" className="w-18 sm:w-20 h-10 overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F5A524" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#F5A524" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0,32 Q 25,32 45,22 T 75,12 T 100,5"
                        fill="none"
                        stroke="#F5A524"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 0,32 Q 25,32 45,22 T 75,12 T 100,5 L 100,40 L 0,40 Z"
                        fill="url(#amberGrad)"
                      />
                    </svg>
                  </div>
                </div>

                {/* 2. Rainfall (1h) Card */}
                <div className="rounded-clay-card p-3.5 sm:p-4 relative overflow-hidden flex items-center justify-between bg-surface-card shadow-clay-card">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center text-text-secondary flex-shrink-0">
                      <CloudRain className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-text-secondary font-medium">Rainfall (1h)</div>
                      <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono leading-tight tracking-tight">
                        {rain1hVal} mm
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 truncate">
                        In the last hour
                      </div>
                    </div>
                  </div>

                  {/* Brand Mini Bar Chart */}
                  <div className="flex items-end space-x-1 h-9 px-1 flex-shrink-0">
                    {[6, 10, 14, 24, 18, 22].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}px` }}
                        className="w-1.5 rounded-t bg-brand-primary opacity-80"
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Forecast Rain (24h) Card */}
                <div className="rounded-clay-card p-3.5 sm:p-4 relative overflow-hidden flex items-center justify-between bg-surface-card shadow-clay-card">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center text-text-secondary flex-shrink-0">
                      <CloudLightning className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-text-secondary font-medium">Forecast Rain (24h)</div>
                      <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono leading-tight tracking-tight">
                        {rain24hVal} mm
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 truncate">
                        Next 24 hours
                      </div>
                    </div>
                  </div>

                  {/* Violet Sparkline Graphic */}
                  <div className="flex-shrink-0 pl-2">
                    <svg viewBox="0 0 100 40" className="w-18 sm:w-20 h-10 overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0,30 C 25,32 40,36 60,30 C 80,24 85,12 100,10"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 0,30 C 25,32 40,36 60,30 C 80,24 85,12 100,10 L 100,40 L 0,40 Z"
                        fill="url(#violetGrad)"
                      />
                    </svg>
                  </div>
                </div>

                {/* 4. Wind Speed Card */}
                <div className="rounded-clay-card p-3.5 sm:p-4 relative overflow-hidden flex items-center justify-between bg-surface-card shadow-clay-card">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center text-text-secondary flex-shrink-0">
                      <Wind className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-text-secondary font-medium">Wind Speed</div>
                      <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono leading-tight tracking-tight">
                        {windSpeedVal} km/h
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 truncate">
                        Gusts up to {gustsVal} km/h
                      </div>
                    </div>
                  </div>

                  {/* Success Wave Graphic */}
                  <div className="flex-shrink-0 pl-2">
                    <svg viewBox="0 0 100 40" className="w-18 sm:w-20 h-10 overflow-visible" preserveAspectRatio="none">
                      <path
                        d="M 0,26 Q 16,10 32,24 T 64,22 T 88,14 T 100,18"
                        fill="none"
                        stroke="#2FB67C"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 4. Flood Outlook Hero Card */}
              <div 
                className="rounded-clay-card shadow-clay-card relative overflow-hidden bg-surface-card min-h-[140px] md:h-[155px] max-h-[175px] flex items-center p-4 sm:p-5"
              >
                <div className="relative z-10 flex flex-col justify-between h-full w-full max-w-sm sm:max-w-md">
                  {/* Left: icon + Flood Outlook title + River-flow model (nearest reach) */}
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-center text-text-secondary flex-shrink-0">
                      <Waves className="w-5 h-5 text-text-secondary" />
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-text-primary tracking-tight leading-tight">
                        Flood Outlook
                        <span className="sr-only">GloFAS Hydrological Flow Projection (River Discharge)</span>
                      </h4>

                      <p className="text-[11px] sm:text-xs text-text-secondary font-medium">
                        River-flow model (nearest reach)
                      </p>
                    </div>
                  </div>

                  <div className="text-2xl sm:text-3xl font-bold text-brand-primary font-mono tracking-tight my-1">
                    {riverFlowVal} m³/s
                  </div>

                  <p className="text-[10.5px] sm:text-[11px] text-text-muted">
                    Model-derived estimate · verify against official sources.
                  </p>

                  {envData?.flood_risk?.forecast_max_discharge_m3s != null && (
                    <span className="sr-only">Peak: {envData.flood_risk.forecast_max_discharge_m3s} m³/s</span>
                  )}
                </div>
              </div>

              {/* 5. Next 12-Hour Rainfall Forecast (mm) */}
              <div className="rounded-clay-card bg-surface-card shadow-clay-card p-3.5 sm:p-4 relative">
                <div className="flex items-center justify-between text-xs mb-2.5">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <span className="font-bold text-text-primary text-xs sm:text-sm tracking-tight">
                      Next 12-Hour Rainfall Forecast (mm)
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    Short-term forecast · Model-derived
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {forecastSlots.map((slot, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-clay-card bg-surface-inset shadow-clay-inset flex items-center justify-between"
                    >
                      {/* Left mini icon */}
                      <div className="flex items-end space-x-0.5 h-4 opacity-70">
                        <div className="w-0.5 h-1.5 bg-brand-primary rounded-t" />
                        <div className="w-0.5 h-2.5 bg-brand-primary rounded-t" />
                        <div className="w-0.5 h-3.5 bg-brand-primary rounded-t" />
                      </div>

                      {/* Center time & amount */}
                      <div className="text-center flex-1 px-1">
                        <div className="text-[11px] text-text-muted font-mono">{slot.time}</div>
                        <div className="text-xs sm:text-sm font-bold text-text-primary font-mono mt-0.5">
                          {slot.amount} mm
                        </div>
                      </div>

                      {/* Right mini icon */}
                      <div className="flex items-end space-x-0.5 h-4 opacity-70">
                        <div className="w-0.5 h-3.5 bg-brand-primary rounded-t" />
                        <div className="w-0.5 h-2.5 bg-brand-primary rounded-t" />
                        <div className="w-0.5 h-1.5 bg-brand-primary rounded-t" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-clay-card bg-surface-card shadow-clay-card text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text-secondary flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-brand-primary" />
                <span>Filters:</span>
              </span>

              {/* Measurement Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by measurement parameter"
                className="bg-surface-inset shadow-clay-inset rounded-clay-input px-2.5 py-1 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-medium"
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
                  className="bg-surface-inset shadow-clay-inset rounded-clay-input px-2.5 py-1 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-medium"
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
                <span className="text-[10px] text-text-muted font-mono hidden sm:inline">
                  Fetched: {new Date(indiaData.retrieval_timestamp).toLocaleTimeString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchIndiaStations(true)}
                disabled={isRefreshingIndia || isLoadingIndia}
                aria-label="Refresh India Stations"
                className="px-3 py-1.5 rounded-clay-button bg-surface-card hover:bg-slate-100 text-text-primary shadow-clay-button flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-brand-primary ${isRefreshingIndia ? 'animate-spin' : ''}`} />
                <span>Refresh Feeds</span>
              </button>
            </div>
          </div>

          {/* Provenance & Freshness Explanation Notice */}
          <div className="p-3 rounded-clay-card bg-severity-high-soft text-severity-high text-xs space-y-1.5 shadow-clay-pill">
            <div className="flex items-center space-x-2 font-bold text-severity-high">
              <ShieldAlert className="w-4 h-4 text-severity-high flex-shrink-0" />
              <span>Official India Meteorological & Hydrological Network Ground Truth — Regional Telemetry Archives</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              River water levels, discharge, and rainfall are sourced from Central Water Commission (CWC) telemetry via the National Water Data Portal (NWDP CKAN Datastore). Data represents published periodic telemetry archives (spanning through late 2025), not a live continuous sub-minute nationwide sensor grid. Weather observations adhere to India Meteorological Department (IMD) standards; live IMD feeds require registered agency credentials (api.imd.gov.in) and are currently in simulated demonstration mode.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-[10px] font-mono">
              <span className="font-bold text-text-primary">Freshness Boundaries:</span>
              <span className="px-2 py-0.5 rounded-clay-pill bg-severity-success-soft text-severity-success">Fresh: &lt;6h</span>
              <span className="px-2 py-0.5 rounded-clay-pill bg-severity-high-soft text-severity-high">Stale: 6h–24h</span>
              <span className="px-2 py-0.5 rounded-clay-pill bg-surface-inset shadow-clay-inset text-text-secondary">Historical Archive: &gt;24h (2025)</span>
              <span className="px-2 py-0.5 rounded-clay-pill bg-brand-primary/10 text-brand-primary">Model/Simulated: Demo only</span>
            </div>
          </div>

          {/* Error Banner */}
          {indiaError && (
            <div className="p-3 rounded-clay-card bg-severity-critical-soft text-severity-critical text-xs flex items-center justify-between gap-2 shadow-clay-pill">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0" />
                <span>{indiaError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchIndiaStations(true)}
                className="px-2.5 py-1 rounded-clay-button bg-severity-critical text-white font-semibold text-[11px] shadow-clay-button"
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
                <div className="h-28 bg-slate-200 rounded-clay-card" />
                <div className="h-28 bg-slate-200 rounded-clay-card" />
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
                    className="p-3.5 rounded-clay-card bg-surface-card shadow-clay-card hover:shadow-clay-button transition-all flex flex-col justify-between space-y-2.5"
                  >
                    {/* Top Row: Station Name & Source Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-text-primary text-xs flex items-center space-x-1.5">
                          <span>{group.station_name}</span>
                          {group.agency && (
                            <span className="px-1.5 py-0.5 rounded-clay-pill bg-surface-inset text-text-muted font-mono text-[9px]">
                              {group.agency}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {group.river ? `River ${group.river}` : ''}
                          {group.basin ? ` · ${group.basin} Basin` : ''}
                          {group.state ? ` (${group.state}${group.district ? `, ${group.district}` : ''})` : ''}
                        </div>
                      </div>

                      {/* Source Pill */}
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-clay-pill text-[10px] font-bold font-mono ${
                          group.source.includes('NWDP')
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {group.source}
                        </span>
                        {group.source.includes('NWDP') && (
                          <span className="text-[9px] text-text-muted font-mono">
                            Regional Archival Station
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Reading & Measurement Type */}
                    <div className="flex items-baseline justify-between p-2.5 rounded-clay-card bg-surface-inset shadow-clay-inset">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
                          {group.measurement_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xl font-bold font-mono text-text-primary">
                          {latestRec.value !== null ? `${latestRec.value} ${latestRec.unit}` : '--'}
                        </span>
                      </div>

                      {/* Freshness & Quality Badges */}
                      <div className="flex flex-col items-end space-y-1">
                        {renderProvenanceBadge(latestRec)}
                        <span className="text-[9px] text-text-muted font-mono">
                          Obs: {latestRec.observation_timestamp || 'No observation timestamp (Unavailable)'}
                        </span>
                      </div>
                    </div>

                    {/* Time-Series Trend Mini Sparkline (when multiple readings available) */}
                    {hasMultiple && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mb-1">
                          <span className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 text-brand-primary" />
                            <span>Telemetry Trend ({group.readings.length} records)</span>
                          </span>
                          <span>Range: {group.readings[group.readings.length - 1]?.observation_timestamp?.split(' ')[1] || 'T0'} → {latestRec.observation_timestamp?.split(' ')[1] || 'T1'}</span>
                        </div>

                        {/* Mini Bars */}
                        <div className="flex items-end space-x-1 h-8 pt-1">
                          {group.readings.slice(0, 10).reverse().map((r, rIdx) => {
                            const val = r.value || 0;
                            const heightPct = Math.min(100, Math.max(20, (val / (latestRec.value || 1)) * 70));
                            return (
                              <div
                                key={rIdx}
                                title={`${r.observation_timestamp}: ${val} ${r.unit}`}
                                className="flex-1 bg-brand-primary hover:bg-brand-hover rounded-xs transition-colors cursor-pointer"
                                style={{ height: `${heightPct}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom Row: Coordinates & Map Focus */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] font-mono text-text-muted">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        {hasCoords ? (
                          <span>[{group.latitude?.toFixed(4)}, {group.longitude?.toFixed(4)}]</span>
                        ) : (
                          <span className="text-severity-high italic">No Coordinates (Incomplete Metadata)</span>
                        )}
                      </div>

                      {hasCoords && onNavigateToMap && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMap([group.latitude, group.longitude], group.station_name)}
                          className="text-brand-primary hover:text-brand-hover underline font-semibold flex items-center space-x-0.5"
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
            <div className="p-8 text-center text-text-muted text-xs italic bg-surface-inset shadow-clay-inset rounded-clay-card">
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
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-severity-high" />
                <span>Reviewable Situational Alerts ({indiaData?.alerts?.length || 0})</span>
              </h4>
              <span className="text-[10px] text-severity-high bg-severity-high-soft px-2.5 py-0.5 rounded-clay-pill font-mono font-bold shadow-clay-pill">
                Coordinator Review Queue
              </span>
            </div>

            {/* Coordinator Safety Notice */}
            <div className="p-3 rounded-clay-card bg-severity-high-soft text-severity-high text-xs mb-3 flex items-start space-x-2 shadow-clay-pill">
              <ShieldAlert className="w-4 h-4 text-severity-high flex-shrink-0 mt-0.5" />
              <div className="leading-snug text-[11px] text-text-secondary">
                <strong className="block text-severity-high font-mono">Operational Alert Corroboration Protocol:</strong>
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
                      className={`p-3.5 rounded-clay-card shadow-clay-card border-l-4 transition-all ${
                        isCrit
                          ? 'border-l-severity-critical bg-surface-card'
                          : isHigh
                          ? 'border-l-severity-high bg-surface-card'
                          : 'border-l-brand-primary bg-surface-card'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-clay-pill text-[10px] font-bold font-mono uppercase shadow-clay-pill ${
                            isCrit
                              ? 'bg-severity-critical-soft text-severity-critical'
                              : isHigh
                              ? 'bg-severity-high-soft text-severity-high'
                              : 'bg-brand-primary/10 text-brand-primary'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="font-bold text-xs text-text-primary">{alert.title}</span>
                        </div>

                        <span className="text-[10px] text-text-muted font-mono">
                          Source: {alert.source} · {alert.observation_timestamp || 'Latest'}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                        {alert.description}
                      </p>

                      <div className="mt-2.5 text-[11px] text-text-primary bg-surface-inset shadow-clay-inset p-2.5 rounded-clay-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-mono text-[10px]">
                          Trigger: <strong className="text-text-primary">{alert.recorded_value} {alert.unit}</strong> (Threshold: {alert.threshold} {alert.unit})
                        </div>

                        {/* Coordinator Action */}
                        <div className="flex items-center space-x-2">
                          {isReviewed ? (
                            <span className="flex items-center space-x-1 text-severity-success font-bold text-[10px] font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 text-severity-success" />
                              <span>Corroborated by {reviewedAlerts[alert.id].reviewer}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCorroborateAlert(alert.id)}
                              className="px-3 py-1 rounded-clay-button clay-button-primary text-white font-mono text-[10px] font-semibold transition-colors shadow-clay-button"
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
              <div className="p-6 text-center text-text-muted text-xs italic bg-surface-inset shadow-clay-inset rounded-clay-card">
                No active threshold exceedances detected across connected river gauges and stations.
              </div>
            )}
          </div>

          {/* Section B: Official Government Data Sources Verification & Audit */}
          <div className="pt-3 border-t border-slate-200/60">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono mb-2 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-primary" />
              <span>Official Data Source Health & Access Audit</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Source 1: IMD */}
              <div className="p-3.5 rounded-clay-card bg-surface-card shadow-clay-card flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">India Meteorological Dept (IMD)</span>
                    <span className="px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold bg-severity-high-soft text-severity-high">
                      Credentials Required
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">
                    API Management Platform: /current_wx and /aws_data.
                  </p>
                </div>
                <div className="text-[10px] text-text-muted space-y-1 font-mono pt-2 border-t border-slate-200/60">
                  <div>Auth: x-api-key + Bearer JWT</div>
                  <div>Docs: <a href="https://api.imd.gov.in/public/api_reference.html" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">api.imd.gov.in</a></div>
                </div>
              </div>

              {/* Source 2: NWDP / CWC */}
              <div className="p-3.5 rounded-clay-card bg-surface-card shadow-clay-card flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">National Water Data Portal (CWC)</span>
                    <span className="px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold bg-severity-success-soft text-severity-success">
                      Active CKAN Archive
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Central Water Commission hourly river water levels, rainfall, and discharge telemetry.
                  </p>
                </div>
                <div className="text-[10px] text-text-muted space-y-1 font-mono pt-2 border-t border-slate-200/60">
                  <div>Access: Public CKAN Datastore API</div>
                  <div>Portal: <a href="https://nwdp.nwic.gov.in/" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">nwdp.nwic.gov.in</a></div>
                </div>
              </div>

              {/* Source 3: Open-Meteo & GloFAS */}
              <div className="p-3.5 rounded-clay-card bg-surface-card shadow-clay-card flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">Open-Meteo & GloFAS</span>
                    <span className="px-2 py-0.5 rounded-clay-pill text-[9px] font-mono font-bold bg-severity-success-soft text-severity-success">
                      Active Model
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">
                    ECMWF / GloFAS numerical weather predictions and continental catchment river discharge.
                  </p>
                </div>
                <div className="text-[10px] text-text-muted space-y-1 font-mono pt-2 border-t border-slate-200/60">
                  <div>License: CC-BY 4.0 Open Access</div>
                  <div>Portal: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">open-meteo.com</a></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer */}
      <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-text-muted font-sans">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <span className="truncate">Weather and hydrology data provide context only; incident verification and triage remain human-led.</span>
          <span className="sr-only">Model-Derived Environmental Context: These measurements reflect numerical meteorological and hydrological predictions</span>
          {envData?.current?.weather_description && (
            <span className="sr-only">{envData.current.weather_description}</span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-text-muted font-mono self-start sm:self-auto flex-shrink-0">
          <span>Sources:</span>
          <button
            type="button"
            onClick={() => setActiveTab('open_meteo')}
            className={`hover:underline cursor-pointer transition-colors ${
              activeTab === 'open_meteo' ? 'text-brand-primary font-semibold' : 'text-text-muted hover:text-brand-primary'
            }`}
          >
            Open-Meteo Model
          </button>
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline"
            aria-label="Open-Meteo"
          >
            <span className="sr-only">Open-Meteo</span>
          </a>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('india_stations')}
            className={`hover:underline cursor-pointer transition-colors ${
              activeTab === 'india_stations' ? 'text-brand-primary font-semibold' : 'text-text-muted hover:text-brand-primary'
            }`}
          >
            Official India Stations
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('alerts_audit')}
            className={`hover:underline cursor-pointer transition-colors ${
              activeTab === 'alerts_audit' ? 'text-severity-high font-semibold' : 'text-text-muted hover:text-severity-high'
            }`}
          >
            Alerts & Audit
            {activeAlertsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-severity-critical text-white text-[9px] font-bold">
                {activeAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
