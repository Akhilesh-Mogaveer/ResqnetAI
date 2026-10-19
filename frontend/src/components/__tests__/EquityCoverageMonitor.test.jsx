import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EquityCoverageMonitor from '../EquityCoverageMonitor';
import IncidentDetailPanel from '../IncidentDetailPanel';

describe('Equitable Emergency Prioritization Layer — Frontend Test Suite', () => {
  const sampleIncidents = [
    {
      id: 'RQN-EQ-01',
      title: 'Structural collapse with trapped civilians',
      severity: 'critical',
      priorityScore: 92,
      sector: 'Downtown West',
      locationName: 'Grand Central Plaza',
      coordinates: [37.7749, -122.4194],
      location_source: 'user_supplied',
      verificationStatus: 'verified',
      responseStatus: 'triage',
      duplicate_count: 3,
      equity_review_flag: false,
      equity_reasons: [],
    },
    {
      id: 'RQN-EQ-02',
      title: 'Flash flood trapping residents in remote canyon',
      severity: 'critical',
      priorityScore: 86,
      sector: 'North Canyon',
      locationName: 'Canyon Stream Trail',
      coordinates: null, // Missing coordinates
      location_source: 'unmatched_unknown',
      verificationStatus: 'unverified',
      responseStatus: 'triage',
      duplicate_count: 0, // Single uncorroborated report
      equity_review_flag: true,
      equity_reasons: [
        'Unresolved coordinates: incident lacks confirmed geospatial coordinates (scout or manual resolution required)',
        'Verification pending: serious report has unverified ground-truth status',
        'Limited reporting evidence: isolated single report without corroborating duplicates (sparse reporting proxy)',
      ],
    },
    {
      id: 'RQN-EQ-03',
      title: 'Downed power line on rural route',
      severity: 'high',
      priorityScore: 72,
      sector: 'South Ridge Estate', // Identified underreported attention zone
      locationName: 'Route 9 Ridge Road',
      coordinates: [37.7480, -122.4080],
      location_source: 'geocoded',
      verificationStatus: 'under_review',
      responseStatus: 'triage',
      duplicate_count: 0,
      equity_review_flag: true,
      equity_reasons: [
        'Verification pending: serious report has under_review ground-truth status',
        'Limited reporting evidence: isolated single report without corroborating duplicates (sparse reporting proxy)',
        "Telemetry coverage barrier: sector 'South Ridge Estate' is an identified underreported attention zone",
      ],
    },
    {
      id: 'RQN-EQ-04',
      title: 'Minor tree limb down on sidewalk',
      severity: 'low',
      priorityScore: 30,
      sector: 'East Marina',
      locationName: 'Harbor Walk',
      coordinates: [37.7800, -122.4000],
      location_source: 'geocoded',
      verificationStatus: 'unverified',
      responseStatus: 'triage',
      duplicate_count: 0,
      equity_review_flag: false,
      equity_reasons: [],
    },
  ];

  it('renders Equity & Coverage Monitor with correct metrics derived from real data', () => {
    render(
      <EquityCoverageMonitor
        incidents={sampleIncidents}
        onNavigateTab={vi.fn()}
        onSelectIncident={vi.fn()}
      />
    );

    // 1. Header is present
    expect(screen.getByText(/Equity & Coverage Monitor/i)).toBeDefined();
    expect(screen.getByText(/Fair Prioritization Layer/i)).toBeDefined();

    // 2. Counts check:
    // Equity-Review Flags: RQN-EQ-02 and RQN-EQ-03 -> 2
    const equityCountEl = screen.getByTestId('equity-review-flag-count');
    expect(equityCountEl.textContent.trim()).toBe('2');

    // Unresolved Location: RQN-EQ-02 (null coords) -> 1
    const unmappedCountEl = screen.getByTestId('unresolved-location-count');
    expect(unmappedCountEl.textContent.trim()).toBe('1');

    // Serious Unverified: RQN-EQ-02 (critical unverified) & RQN-EQ-03 (high under_review) -> 2
    const seriousUnverifiedEl = screen.getByTestId('serious-unverified-count');
    expect(seriousUnverifiedEl.textContent.trim()).toBe('2');

    // High Urgency Pending: RQN-EQ-01 (92), RQN-EQ-02 (86), RQN-EQ-03 (72) all in triage -> 3
    const highUrgencyEl = screen.getByTestId('high-urgency-pending-count');
    expect(highUrgencyEl.textContent.trim()).toBe('3');
  });

  it('transparently distinguishes measured telemetry from labeled reporting proxies', () => {
    render(
      <EquityCoverageMonitor
        incidents={sampleIncidents}
        onNavigateTab={vi.fn()}
        onSelectIncident={vi.fn()}
      />
    );

    expect(screen.getByText(/Coverage Methodology & Transparency:/i)).toBeDefined();
    expect(screen.getByText(/Measured Telemetry:/i)).toBeDefined();
    expect(screen.getByText(/Reporting Proxy:/i)).toBeDefined();
    expect(screen.getByText(/No connectivity or population data is invented/i)).toBeDefined();
  });

  it('renders honest empty state when no incidents are loaded', () => {
    render(
      <EquityCoverageMonitor
        incidents={[]}
        onNavigateTab={vi.fn()}
        onSelectIncident={vi.fn()}
      />
    );

    const emptyState = screen.getByTestId('equity-empty-state');
    expect(emptyState).toBeDefined();
    expect(screen.getByText(/No Active Incidents Loaded/i)).toBeDefined();
    expect(screen.getByText(/Application currently has 0 active incident reports/i)).toBeDefined();
  });

  it('filters displayed incidents when metric cards are clicked', () => {
    render(
      <EquityCoverageMonitor
        incidents={sampleIncidents}
        onNavigateTab={vi.fn()}
        onSelectIncident={vi.fn()}
      />
    );

    // Click Unresolved Location button
    const unmappedBtn = screen.getByTestId('unresolved-location-count').closest('button');
    fireEvent.click(unmappedBtn);

    // Only RQN-EQ-02 should be in the list
    expect(screen.getByTestId('equity-incident-RQN-EQ-02')).toBeDefined();
    expect(screen.queryByTestId('equity-incident-RQN-EQ-03')).toBeNull();

    // Click Clear filter
    const clearBtn = screen.getByText(/\(Clear filter\)/i);
    fireEvent.click(clearBtn);

    // Both flagged incidents return
    expect(screen.getByTestId('equity-incident-RQN-EQ-02')).toBeDefined();
    expect(screen.getByTestId('equity-incident-RQN-EQ-03')).toBeDefined();
  });

  it('triggers navigation callbacks for Verification Center and Priority Queue', () => {
    const onNavigateTab = vi.fn();
    render(
      <EquityCoverageMonitor
        incidents={sampleIncidents}
        onNavigateTab={onNavigateTab}
        onSelectIncident={vi.fn()}
      />
    );

    const verifBtn = screen.getByText(/Review Pending Verification →/i);
    fireEvent.click(verifBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('verification');

    const prioBtn = screen.getByText(/Priority Queue →/i);
    fireEvent.click(prioBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('priority');
  });

  it('triggers onSelectIncident callback when clicking Inspect Incident', () => {
    const onSelectIncident = vi.fn();
    render(
      <EquityCoverageMonitor
        incidents={sampleIncidents}
        onNavigateTab={vi.fn()}
        onSelectIncident={onSelectIncident}
      />
    );

    const inspectBtns = screen.getAllByText(/Inspect Incident/i);
    fireEvent.click(inspectBtns[0]);
    expect(onSelectIncident).toHaveBeenCalled();
  });

  describe('IncidentDetailPanel Equity Integration', () => {
    it('renders Equity Review Required banner and reasons when incident is flagged', () => {
      const flaggedIncident = sampleIncidents[1]; // RQN-EQ-02
      render(
        <IncidentDetailPanel
          incident={flaggedIncident}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      const banner = screen.getByTestId('equity-review-banner');
      expect(banner).toBeDefined();
      expect(screen.getByText(/EQUITY REVIEW REQUIRED/i)).toBeDefined();
      expect(screen.getByText(/Unresolved coordinates: incident lacks confirmed geospatial coordinates/i)).toBeDefined();
      expect(screen.getByText(/Limited reporting evidence: isolated single report without corroborating duplicates/i)).toBeDefined();
    });

    it('omits Equity Review banner when incident has complete verified information', () => {
      const completeIncident = sampleIncidents[0]; // RQN-EQ-01 (verified, coords, duplicate_count 3)
      render(
        <IncidentDetailPanel
          incident={completeIncident}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      expect(screen.queryByTestId('equity-review-banner')).toBeNull();
    });
  });
});
