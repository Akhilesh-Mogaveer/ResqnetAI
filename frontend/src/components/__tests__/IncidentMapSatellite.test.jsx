import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IncidentMap from '../IncidentMap';

describe('IncidentMap Satellite View & Geospatial Intelligence Layer Suite', () => {
  const sampleIncidents = [
    {
      id: 'RQN-1001',
      title: 'Substation Flashover & Smoke',
      type: 'structural',
      severity: 'critical',
      verificationStatus: 'verified',
      coordinates: [37.7749, -122.4194],
      sector: 'Sector Alpha',
      locationName: 'North Substation',
      priorityScore: 92,
      responseStatus: 'dispatch_assigned'
    },
    {
      id: 'RQN-1002',
      title: 'Localized Water Main Rupture',
      type: 'flood',
      severity: 'moderate',
      verificationStatus: 'unverified',
      coordinates: [37.7833, -122.4167],
      sector: 'Sector Bravo',
      locationName: 'Market & 4th St',
      priorityScore: 54,
      responseStatus: 'under_investigation'
    },
    {
      id: 'RQN-1003',
      title: 'Unconfirmed Odor Report',
      type: 'hazmat',
      severity: 'high',
      verificationStatus: 'unverified',
      coordinates: null, // Unmapped incident without coordinates
      sector: 'Sector Gamma',
      locationName: 'Unknown Vicinity',
      priorityScore: 68,
      responseStatus: 'awaiting_triaging'
    }
  ];

  const sampleZones = [
    {
      id: 'zone-1',
      name: 'South Sector Signal Void',
      centerCoordinates: [37.7600, -122.4200],
      radiusMeters: 1000,
      signalDeviation: '-85%'
    }
  ];

  it('defaults to Esri World Imagery high-resolution satellite imagery', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toBeInTheDocument();
    expect(tileLayer.getAttribute('data-url')).toContain('ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    expect(tileLayer.getAttribute('data-attribution')).toContain('Esri');
  });

  it('renders all 4 available basemap layer options (Satellite, Streets, Dark, Terrain)', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    expect(screen.getByRole('button', { name: /Satellite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Streets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terrain/i })).toBeInTheDocument();
  });

  it('switches to OpenStreetMap Streets basemap when clicked without removing markers', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    // Initial: Satellite
    let tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.getAttribute('data-url')).toContain('World_Imagery');

    // Click Streets button
    const streetsBtn = screen.getByRole('button', { name: /Streets/i });
    fireEvent.click(streetsBtn);

    tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.getAttribute('data-url')).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(tileLayer.getAttribute('data-attribution')).toContain('OpenStreetMap');

    // Markers are preserved
    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(2); // Only the 2 mapped incidents
  });

  it('switches to CartoDB Dark Matter basemap when clicked', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    const darkBtn = screen.getByRole('button', { name: /Dark/i });
    fireEvent.click(darkBtn);

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.getAttribute('data-url')).toContain('basemaps.cartocdn.com/dark_all');
  });

  it('preserves real incident coordinates and avoids plotting unmapped incidents arbitrarily', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    // Mapped markers count = 2
    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(2);

    // Header count shows 2 on map
    expect(screen.getByText('(2 on map)')).toBeInTheDocument();

    // Warning banner shows 1 unmapped incident with no synthetic placement
    expect(screen.getByText(/1 incident/i)).toBeInTheDocument();
    expect(screen.getByText(/not pinned to arbitrary coordinates/i)).toBeInTheDocument();
    expect(screen.getByText(/No synthetic placement/i)).toBeInTheDocument();
  });

  it('filters markers by severity accurately', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    // Filter to critical only
    const criticalBtn = screen.getByRole('button', { name: /critical/i });
    fireEvent.click(criticalBtn);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].getAttribute('data-position')).toBe(JSON.stringify([37.7749, -122.4194]));
  });

  it('toggles underreported signal void circle overlays on and off', () => {
    render(
      <IncidentMap
        incidents={sampleIncidents}
        attentionZones={sampleZones}
      />
    );

    expect(screen.getByTestId('map-circle')).toBeInTheDocument();

    const signalGapsBtn = screen.getByRole('button', { name: /Signal Gaps/i });
    fireEvent.click(signalGapsBtn);

    expect(screen.queryByTestId('map-circle')).not.toBeInTheDocument();
  });

  it('invokes onSelectIncident when marker is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <IncidentMap
        incidents={sampleIncidents}
        onSelectIncident={handleSelect}
        attentionZones={sampleZones}
      />
    );

    const markers = screen.getAllByTestId('map-marker');
    fireEvent.click(markers[0]);

    expect(handleSelect).toHaveBeenCalledWith(sampleIncidents[0]);
  });
});
