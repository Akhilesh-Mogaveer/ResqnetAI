import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EnvironmentalConditionsPanel from '../EnvironmentalConditionsPanel';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    getEnvironmentalData: vi.fn(),
    getIndiaStationsData: vi.fn(),
    getEnvironmentalAlerts: vi.fn(),
    getEnvironmentalSourcesStatus: vi.fn(),
  },
}));

const MOCK_METEO_DATA = {
  provider: 'Open-Meteo',
  provider_attribution: 'Weather data by Open-Meteo.com (CC-BY 4.0); River discharge by GloFAS / ECMWF.',
  provider_url: 'https://open-meteo.com/',
  data_nature: 'model_derived',
  is_cached: false,
  cached_at: '2026-10-18T15:00:00Z',
  retrieval_timestamp: '2026-10-18T15:00:00Z',
  observation_model_timestamp: '2026-10-18T15:00',
  location: {
    name: 'Udupi, Karnataka',
    latitude: 13.3409,
    longitude: 74.7421,
    elevation_m: 14.0,
  },
  current: {
    temperature_c: 30.5,
    apparent_temperature_c: 35.2,
    relative_humidity_pct: 78,
    precipitation_mm: 2.4,
    rain_mm: 2.4,
    surface_pressure_hpa: 1011.2,
    wind_speed_kmh: 18.5,
    wind_direction_deg: 240,
    weather_code: 61,
    weather_description: 'Slight rain',
  },
  precipitation: {
    current_hour_mm: 2.4,
    next_6h_total_mm: 12.8,
    next_24h_total_mm: 35.0,
    max_hourly_rate_mm: 6.5,
  },
  flood_risk: {
    available: true,
    model_source: 'GloFAS v4 / ECMWF via Open-Meteo Flood API',
    current_discharge_m3s: 2.33,
    forecast_max_discharge_m3s: 3.10,
  },
  source_attribution: {
    primary_source: 'Open-Meteo Forecast & GloFAS Global River Discharge API',
    attribution_url: 'https://open-meteo.com/',
  },
};

const MOCK_INDIA_STATIONS = {
  provider: 'Official India Hydrometeorological Network (IMD & NWDP/CWC)',
  retrieval_timestamp: '2026-10-18T18:00:00Z',
  total_records: 3,
  records: [
    {
      id: 'CWC-WL-1049',
      source: 'NWDP_CWC',
      source_name: 'National Water Data Portal / CWC',
      source_type: 'official_hydrological_telemetry',
      station_id: 'CWC_WL_SARAIKELA',
      station_name: 'Saraikela Rd. Bridge',
      latitude: 22.7,
      longitude: 86.01,
      state: 'Jharkhand',
      basin: 'Subernarekha',
      river: 'Kharkai',
      agency: 'CWC',
      measurement_type: 'water_level',
      value: 378.39,
      unit: 'm',
      observation_timestamp: '2025-10-03T18:00:00Z',
      fetch_timestamp: '2026-10-18T18:00:00Z',
      classification: 'historical',
      freshness_status: 'historical_archive',
      quality_status: 'provisional',
      source_url: 'https://nwdp.nwic.gov.in/en/dataset/river-water-level-telemetry-hourly-central-water-commission-cwc',
    },
    {
      id: 'CWC-RF-4081',
      source: 'NWDP_CWC',
      source_name: 'National Water Data Portal / CWC',
      source_type: 'official_hydrological_telemetry',
      station_id: 'CWC_RF_VONI',
      station_name: 'VONI',
      latitude: 18.82,
      longitude: 83.74,
      state: 'Andhra Pradesh',
      basin: 'Vamsadhara',
      agency: 'CWC',
      measurement_type: 'rainfall',
      value: 43.0,
      unit: 'mm',
      observation_timestamp: '2025-07-28T09:00:00Z',
      fetch_timestamp: '2026-10-18T18:00:00Z',
      classification: 'historical',
      freshness_status: 'historical_archive',
      quality_status: 'provisional',
      source_url: 'https://nwdp.nwic.gov.in/dataset/rainfall-cwc-telemetry-hourly',
    },
    {
      id: 'IMD-WX-DELHI',
      source: 'IMD',
      source_name: 'India Meteorological Department (DEMO / SIMULATED)',
      source_type: 'official_meteorological_agency',
      station_id: 'IMD_VIDD',
      station_name: 'New Delhi Safdarjung [DEMO]',
      latitude: 28.58,
      longitude: 77.21,
      state: 'Delhi',
      agency: 'IMD',
      measurement_type: 'temperature',
      value: 29.4,
      unit: '°C',
      observation_timestamp: '2026-10-18T12:00:00Z',
      fetch_timestamp: '2026-10-18T18:00:00Z',
      classification: 'model_estimate',
      freshness_status: 'historical_archive',
      quality_status: 'simulated',
      source_url: 'https://api.imd.gov.in/public/api_reference.html',
    },
  ],
  alerts: [
    {
      id: 'ALERT-CWC-1049',
      station_id: 'CWC_WL_SARAIKELA',
      station_name: 'Saraikela Rd. Bridge',
      measurement_type: 'water_level',
      title: 'Water Level Exceeded Warning Stage: Saraikela Rd. Bridge (378.39 m)',
      description: 'River water level at Saraikela Rd. Bridge has crossed warning stage. Requires tactical surveillance.',
      severity: 'critical',
      recorded_value: 378.39,
      threshold: 377.0,
      unit: 'm',
      source: 'NWDP_CWC',
      observation_timestamp: '2025-10-03T18:00:00Z',
      is_verified_incident: false,
    },
  ],
  sources_status: [
    {
      source_id: 'imd_api',
      name: 'India Meteorological Dept (IMD)',
      status: 'credentials_required',
      access_requirements: 'x-api-key + Bearer JWT',
      endpoint_url: 'https://api.imd.gov.in/api/v1/current_wx',
      documentation_url: 'https://api.imd.gov.in/public/api_reference.html',
      limitation_notes: 'Developer registration required.',
      supports_realtime: false,
    },
    {
      source_id: 'nwdp_cwc_river_level',
      name: 'National Water Data Portal (CWC)',
      status: 'historical_telemetry_available',
      access_requirements: 'Public CKAN Datastore API',
      endpoint_url: 'https://nwdp.nwic.gov.in/',
      documentation_url: 'https://nwdp.nwic.gov.in/',
      limitation_notes: 'Public telemetry archive.',
      supports_realtime: false,
    },
    {
      source_id: 'open_meteo',
      name: 'Open-Meteo & GloFAS',
      status: 'active',
      access_requirements: 'Open Access (CC-BY 4.0)',
      endpoint_url: 'https://api.open-meteo.com/v1/forecast',
      documentation_url: 'https://open-meteo.com/',
      limitation_notes: 'Numerical forecast and GloFAS river discharge.',
      supports_realtime: true,
    },
  ],
};

describe('Official India Environmental & River Monitoring Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getEnvironmentalData.mockResolvedValue(MOCK_METEO_DATA);
    api.getIndiaStationsData.mockResolvedValue(MOCK_INDIA_STATIONS);
  });

  it('renders initial Open-Meteo view and allows switching to Official India Stations tab', async () => {
    render(<EnvironmentalConditionsPanel />);

    // Initial tab Open-Meteo should be active
    await waitFor(() => {
      expect(screen.getByText('Open-Meteo Model')).toBeInTheDocument();
      expect(screen.getByText('Official India Stations')).toBeInTheDocument();
      expect(screen.getByText(/Alerts & Audit/i)).toBeInTheDocument();
    });

    // Click "Official India Stations" tab
    const indiaStationsBtn = screen.getByRole('button', { name: /Official India Stations/i });
    fireEvent.click(indiaStationsBtn);

    // Verify API called for India stations
    await waitFor(() => {
      expect(api.getIndiaStationsData).toHaveBeenCalled();
    });

    // Verify official stations render
    await waitFor(() => {
      expect(screen.getByText('Saraikela Rd. Bridge')).toBeInTheDocument();
      expect(screen.getByText(/378.39 m/)).toBeInTheDocument();
      expect(screen.getByText('VONI')).toBeInTheDocument();
      expect(screen.getByText(/43 mm/)).toBeInTheDocument();
    });

    // Verify attribution badges and basin metadata
    expect(screen.getAllByText(/NWDP_CWC/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Subernarekha Basin/i)).toBeInTheDocument();
  });

  it('distinguishes official ground telemetry archives from numerical models', async () => {
    render(<EnvironmentalConditionsPanel />);

    const indiaStationsBtn = screen.getByRole('button', { name: /Official India Stations/i });
    fireEvent.click(indiaStationsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Official India Meteorological & Hydrological Network Ground Truth/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/River water levels, discharge, and rainfall are sourced from Central Water Commission/i)
    ).toBeInTheDocument();
  });

  it('renders reviewable alerts on the Alerts & Audit tab without auto-verifying incidents', async () => {
    render(<EnvironmentalConditionsPanel />);

    const alertsTabBtn = screen.getByRole('button', { name: /Alerts & Audit/i });
    fireEvent.click(alertsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Reviewable Situational Alerts/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Water Level Exceeded Warning Stage: Saraikela Rd. Bridge/i)
      ).toBeInTheDocument();
    });

    // Operational safety protocol disclaimer must be present
    expect(
      screen.getByText(/does NOT automatically verify civilian incident reports/i)
    ).toBeInTheDocument();

    // Click "Corroborate Situational Context" button
    const corroborateBtn = screen.getByRole('button', { name: /Corroborate Situational Context/i });
    fireEvent.click(corroborateBtn);

    // Verify alert is marked corroborated by Lead Coordinator without verifying incident
    await waitFor(() => {
      expect(screen.getByText(/Corroborated by Lead Coordinator/i)).toBeInTheDocument();
    });
  });

  it('renders official source health audit cards for IMD, NWDP/CWC and Open-Meteo', async () => {
    render(<EnvironmentalConditionsPanel />);

    const alertsTabBtn = screen.getByRole('button', { name: /Alerts & Audit/i });
    fireEvent.click(alertsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Official Data Source Health & Access Audit')).toBeInTheDocument();
      expect(screen.getByText('India Meteorological Dept (IMD)')).toBeInTheDocument();
      expect(screen.getByText('National Water Data Portal (CWC)')).toBeInTheDocument();
      expect(screen.getByText('Open-Meteo & GloFAS')).toBeInTheDocument();
    });

    // Verify credentials requirement label for IMD
    expect(screen.getByText('Credentials Required')).toBeInTheDocument();
    expect(screen.getByText(/Auth: x-api-key \+ Bearer JWT/i)).toBeInTheDocument();

    // Verify active status for NWDP and Open-Meteo
    expect(screen.getByText('Active CKAN Archive')).toBeInTheDocument();
    expect(screen.getByText('Active Model')).toBeInTheDocument();
  });

  it('handles telemetry service network errors gracefully with retry button', async () => {
    api.getIndiaStationsData.mockRejectedValueOnce(new Error('NWDP CKAN server timeout'));

    render(<EnvironmentalConditionsPanel />);

    const indiaStationsBtn = screen.getByRole('button', { name: /Official India Stations/i });
    fireEvent.click(indiaStationsBtn);

    await waitFor(() => {
      expect(screen.getByText(/NWDP CKAN server timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Retry$/i })).toBeInTheDocument();
    });
  });
});
