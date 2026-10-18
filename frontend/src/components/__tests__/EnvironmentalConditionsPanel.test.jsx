import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnvironmentalConditionsPanel from '../EnvironmentalConditionsPanel';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    getEnvironmentalData: vi.fn(),
  }
}));

const MOCK_ENV_DATA = {
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
    elevation_m: 18.0,
    timezone: 'Asia/Kolkata',
  },
  current: {
    temperature_c: 30.5,
    apparent_temperature_c: 35.2,
    relative_humidity_pct: 72,
    precipitation_mm: 2.4,
    rain_mm: 2.4,
    surface_pressure_hpa: 1007.5,
    wind_speed_kmh: 11.2,
    wind_direction_deg: 280,
    wind_gusts_kmh: 22.0,
    weather_code: 61,
    weather_description: 'Slight rain',
  },
  precipitation: {
    current_hour_mm: 2.4,
    next_6h_total_mm: 12.8,
    next_24h_total_mm: 35.0,
    max_hourly_rate_mm: 6.5,
    hourly: [
      { time: '2026-10-18T15:00', precipitation_mm: 2.4, rain_mm: 2.4, temperature_c: 30.5, weather_code: 61 },
      { time: '2026-10-18T16:00', precipitation_mm: 4.0, rain_mm: 4.0, temperature_c: 29.8, weather_code: 63 },
      { time: '2026-10-18T17:00', precipitation_mm: 6.4, rain_mm: 6.4, temperature_c: 29.0, weather_code: 65 },
    ],
  },
  flood_risk: {
    available: true,
    model_source: 'GloFAS v4 / ECMWF via Open-Meteo Flood API',
    current_discharge_m3s: 2.33,
    forecast_max_discharge_m3s: 3.10,
    daily_forecast: [
      { date: '2026-10-18', river_discharge_m3s: 2.33, river_discharge_max_m3s: 3.10 },
      { date: '2026-10-19', river_discharge_m3s: 1.85, river_discharge_max_m3s: 2.45 },
    ],
    notes: 'GloFAS 5km grid model projection for closest river reach.',
  },
  disclaimer: 'Public meteorological and hydrological model data for operational awareness only.',
};

describe('EnvironmentalConditionsPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders weather variables, rainfall, and GloFAS river discharge', async () => {
    api.getEnvironmentalData.mockResolvedValueOnce(MOCK_ENV_DATA);

    render(<EnvironmentalConditionsPanel />);

    // Initial loading or fetched state
    await waitFor(() => {
      expect(screen.getByText('Environmental Conditions & Hydrology')).toBeInTheDocument();
    });

    // Location name
    await waitFor(() => {
      expect(screen.getAllByText('Udupi, Karnataka')[0]).toBeInTheDocument();
      expect(screen.getByText(/30.5°C/)).toBeInTheDocument();
      expect(screen.getByText(/2.4 mm/)).toBeInTheDocument();
      expect(screen.getByText(/35 mm/)).toBeInTheDocument();
      expect(screen.getByText('Slight rain')).toBeInTheDocument();
    });

    // Hydrology
    expect(screen.getByText('GloFAS Hydrological Flow Projection (River Discharge)')).toBeInTheDocument();
    expect(screen.getByText(/2.33 m³\/s/)).toBeInTheDocument();
    expect(screen.getByText(/3.1 m³\/s/)).toBeInTheDocument();
  });

  it('clearly distinguishes model-derived environmental context from incident reports', async () => {
    api.getEnvironmentalData.mockResolvedValueOnce(MOCK_ENV_DATA);

    render(<EnvironmentalConditionsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Model-Derived Environmental Context:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/These measurements reflect numerical meteorological and hydrological predictions/i)).toBeInTheDocument();
  });

  it('includes mandatory attribution and link to Open-Meteo', async () => {
    api.getEnvironmentalData.mockResolvedValueOnce(MOCK_ENV_DATA);

    render(<EnvironmentalConditionsPanel />);

    await waitFor(() => {
      const openMeteoLink = screen.getByRole('link', { name: /Open-Meteo/i });
      expect(openMeteoLink).toBeInTheDocument();
      expect(openMeteoLink).toHaveAttribute('href', 'https://open-meteo.com/');
    });
  });

  it('allows a coordinator to force refresh data', async () => {
    api.getEnvironmentalData.mockResolvedValue(MOCK_ENV_DATA);

    render(<EnvironmentalConditionsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Udupi, Karnataka')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshBtn = screen.getByRole('button', { name: /Refresh Environmental Data/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.getEnvironmentalData).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 13.3409,
          longitude: 74.7421,
          forceRefresh: true,
        })
      );
    });
  });

  it('displays graceful error banner and allows retry when API fails', async () => {
    api.getEnvironmentalData.mockRejectedValueOnce(new Error('Open-Meteo connection timed out'));

    render(<EnvironmentalConditionsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Open-Meteo connection timed out')).toBeInTheDocument();
    });

    // Retry button is available
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock success for retry
    api.getEnvironmentalData.mockResolvedValueOnce(MOCK_ENV_DATA);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Udupi, Karnataka')).toBeInTheDocument();
    });
  });
});
