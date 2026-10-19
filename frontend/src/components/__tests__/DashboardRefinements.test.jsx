import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverviewPage from '../../pages/OverviewPage';
import UnderreportedZones from '../UnderreportedZones';
import IncidentMap, { isValidCoordinate } from '../IncidentMap';

describe('RESQNET AI Dashboard Coordinator Refinements Suite', () => {
  const mockIncidents = [
    {
      id: 'RQN-0101',
      title: 'Structural Wall Creep & Dust Plume',
      type: 'structural',
      severity: 'critical',
      priorityScore: 95,
      locationName: 'Pier 38 Terminal A',
      sector: 'Harbor East',
      coordinates: [37.7825, -122.3880],
      timeAgo: '12 min ago',
      timestamp: '2026-10-18T14:30:00Z',
      verificationStatus: 'unverified',
      responseStatus: 'unassigned',
      assignedTeam: null,
      report_text: 'Rapidly widening fissures visible along primary support pilings with audible concrete spalling.',
      whyPrioritised: 'High risk to life in active transit corridor.',
      is_synthetic_location: false,
      is_duplicate: false
    },
    {
      id: 'RQN-0102',
      title: 'High-Voltage Transformer Arc',
      type: 'electrical',
      severity: 'high',
      priorityScore: 82,
      locationName: 'Substation 4',
      sector: 'Central Industrial',
      coordinates: [37.7712, -122.4045],
      timeAgo: '24 min ago',
      timestamp: '2026-10-18T14:18:00Z',
      verificationStatus: 'verified',
      responseStatus: 'dispatched',
      assignedTeam: 'Engine 14',
      description: 'Persistent electrical sparking following tree branch contact on secondary distribution feed.',
      whyPrioritised: 'Secondary fire potential near lumber storage.',
      is_synthetic_location: false,
      is_duplicate: false
    },
    {
      id: 'RQN-0103',
      title: 'Unconfirmed Gas Odor in Basement',
      type: 'hazmat',
      severity: 'moderate',
      priorityScore: 61,
      locationName: 'Unknown Commercial District',
      sector: 'Downtown West',
      coordinates: null, // Unmapped incident without confirmed coordinates
      timeAgo: '35 min ago',
      timestamp: '2026-10-18T14:07:00Z',
      verificationStatus: 'unverified',
      responseStatus: 'unassigned',
      assignedTeam: null,
      report_text: 'Multiple callers reporting pungent sulfur smell near retail alleyway, no exact building identified.',
      is_synthetic_location: false,
      is_duplicate: false
    }
  ];

  const mockZones = [
    {
      id: 'ZONE-Z4',
      name: 'South Mission Floodway',
      signalDeviation: '-82%',
      signalCount: 2,
      lastReportTime: '42 min ago',
      confidence: 'Low Confidence (Uncorroborated)',
      estimatedBarriers: 'Cellular tower backup battery exhausted and local fiber trunk severance.',
      populationAtRisk: '3,200 residents across 14 square blocks',
      notes: 'Historical flood basin during storm surges.',
      scoutStatus: 'Unassigned',
      centerCoordinates: [37.7550, -122.4150],
      radiusMeters: 1000
    },
    {
      id: 'ZONE-Z5',
      name: 'Bayview Uplands',
      signalDeviation: '-65%',
      signalCount: 4,
      lastReportTime: '15 min ago',
      confidence: 'High Confidence (Corroborated)',
      estimatedBarriers: 'Power grid line fault in distribution circuit.',
      populationAtRisk: '1,400 residents',
      notes: 'Localized telemetry blackout.',
      scoutStatus: 'Scout Drone 2 Deployed',
      centerCoordinates: [37.7300, -122.3900],
      radiusMeters: 800
    }
  ];

  describe('1. Highest Priority Emergencies Refinement', () => {
    it('displays essential incident fields, distinct severity, and distinct numeric priority score', () => {
      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={mockZones}
          onSelectIncident={vi.fn()}
          onNavigateTab={vi.fn()}
        />
      );

      // Section title is present
      expect(screen.getByText('Highest Priority Emergencies')).toBeInTheDocument();

      // Redundant badge removed
      expect(screen.queryByText('Immediate Action')).not.toBeInTheDocument();

      // Incident title
      expect(screen.getAllByText('Structural Wall Creep & Dust Plume').length).toBeGreaterThanOrEqual(1);

      // Distinct severity badge
      const severityBadges = screen.getAllByText(/critical/i);
      expect(severityBadges.length).toBeGreaterThanOrEqual(1);

      // Distinct numeric priority score formatted with /100
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('82')).toBeInTheDocument();
      const denominatorElements = screen.getAllByText('/100');
      expect(denominatorElements.length).toBeGreaterThanOrEqual(2);

      // Location and report time
      expect(screen.getAllByText(/Pier 38 Terminal A/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('12 min ago').length).toBeGreaterThanOrEqual(1);

      // Verification status badge
      expect(screen.getAllByText('⚠ Unverified').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('✓ Verified').length).toBeGreaterThanOrEqual(1);

      // Assigned team
      expect(screen.getByText('Engine 14')).toBeInTheDocument();

      // Concise description rendered
      expect(screen.getByText(/Rapidly widening fissures visible along primary support pilings/i)).toBeInTheDocument();

      // Review / Manage action
      const reviewButtons = screen.getAllByRole('button', { name: /Review.*Manage/i });
      expect(reviewButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('navigates to incident details when Review / Manage is clicked', () => {
      const handleSelect = vi.fn();
      const handleNavigate = vi.fn();

      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={mockZones}
          onSelectIncident={handleSelect}
          onNavigateTab={handleNavigate}
        />
      );

      const reviewButtons = screen.getAllByRole('button', { name: /Review.*Manage/i });
      fireEvent.click(reviewButtons[0]);

      expect(handleSelect).toHaveBeenCalledWith(mockIncidents[0]);
      expect(handleNavigate).toHaveBeenCalledWith('incidents');
    });
  });

  describe('2. Geographic Operations Preview', () => {
    it('validates coordinates accurately via isValidCoordinate helper', () => {
      expect(isValidCoordinate([37.7749, -122.4194])).toBe(true);
      expect(isValidCoordinate(null)).toBe(false);
      expect(isValidCoordinate(undefined)).toBe(false);
      expect(isValidCoordinate([])).toBe(false);
      expect(isValidCoordinate([0, 0])).toBe(false); // Null island rejected
      expect(isValidCoordinate([100, -122])).toBe(false); // Lat > 90
      expect(isValidCoordinate(['37', '-122'])).toBe(false); // Non-numeric
      expect(isValidCoordinate([NaN, -122])).toBe(false);
    });

    it('renders compact map legend and expands when clicked', () => {
      render(
        <IncidentMap
          incidents={mockIncidents}
          attentionZones={mockZones}
          defaultShowLegend={false}
        />
      );

      // Initially compact with Show toggle
      expect(screen.getByRole('button', { name: /Expand map legend/i })).toBeInTheDocument();
      expect(screen.getByText('Show')).toBeInTheDocument();

      // Click to expand legend
      fireEvent.click(screen.getByRole('button', { name: /Expand map legend/i }));

      // Expanded items are now visible
      expect(screen.getByText('Hide')).toBeInTheDocument();
      expect(screen.getByText('Priority / Severity')).toBeInTheDocument();
      expect(screen.getByText('Verified (Solid)')).toBeInTheDocument();
      expect(screen.getByText('Unverified (Dashed)')).toBeInTheDocument();
      expect(screen.getByText('Signal Gap Void')).toBeInTheDocument();
    });

    it('plots only incidents with confirmed coordinates and avoids arbitrary placement for unmapped reports', () => {
      render(
        <IncidentMap
          incidents={mockIncidents}
          attentionZones={mockZones}
        />
      );

      // Only the 2 mapped incidents should produce markers
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);

      // The unmapped incident notice displays cleanly without synthetic placement
      expect(screen.getByText(/1 incident/i)).toBeInTheDocument();
      expect(screen.getByText(/not pinned to arbitrary coordinates/i)).toBeInTheDocument();
      expect(screen.getByText(/No synthetic placement/i)).toBeInTheDocument();
    });
  });

  describe('3. Underreported Zones Component Refinement', () => {
    it('displays last signal time, confidence level, and allows expanding details panel', () => {
      const handleDispatch = vi.fn();

      render(
        <UnderreportedZones
          zones={mockZones}
          onDispatchScout={handleDispatch}
        />
      );

      // Zone name and signal deviation
      expect(screen.getByText('South Mission Floodway')).toBeInTheDocument();
      expect(screen.getByText('-82%')).toBeInTheDocument();

      // Last signal time
      expect(screen.getByText('42 min ago')).toBeInTheDocument();

      // Confidence badge
      expect(screen.getByText('Low Confidence (Uncorroborated)')).toBeInTheDocument();

      // Dispatch recon action button
      const dispatchBtn = screen.getByRole('button', { name: /Dispatch Recon/i });
      expect(dispatchBtn).toBeInTheDocument();
      fireEvent.click(dispatchBtn);
      expect(handleDispatch).toHaveBeenCalledWith(mockZones[0]);

      // Details panel initially collapsed
      expect(screen.queryByText(/Cellular tower backup battery/i)).not.toBeInTheDocument();

      // Expand details
      const detailsButtons = screen.getAllByRole('button', { name: /Details/i });
      fireEvent.click(detailsButtons[0]);

      // Details panel contents visible
      expect(screen.getByText(/Cellular tower backup battery/i)).toBeInTheDocument();
      expect(screen.getByText(/3,200 residents across 14 square blocks/i)).toBeInTheDocument();
      expect(screen.getByText(/Uncorroborated telemetry — subject to coordinator ground review/i)).toBeInTheDocument();

      // Explicit Caution statement
      expect(screen.getByText(/Missing telemetry indicates an infrastructure or reporting void, not proof of safety/i)).toBeInTheDocument();
    });
  });

  describe('4. Actions Requiring Coordinator Attention Refinement', () => {
    it('retains Ground Truth Verification, Unmapped Reports, and Squad Dispatch with derived data counts', () => {
      const handleNavigate = vi.fn();

      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={mockZones}
          onSelectIncident={vi.fn()}
          onNavigateTab={handleNavigate}
        />
      );

      // Card 1: Ground Truth Verification (2 unverified in mockIncidents: RQN-0101 & RQN-0103)
      expect(screen.getByText('Ground Truth Verification')).toBeInTheDocument();
      expect(screen.getByText(/2 incoming reports awaiting human verification/i)).toBeInTheDocument();
      const verifyBtn = screen.getByRole('button', { name: /Verification Center/i });
      expect(verifyBtn).toBeInTheDocument();
      fireEvent.click(verifyBtn);
      expect(handleNavigate).toHaveBeenCalledWith('verification');

      // Card 2: Unmapped Reports (1 unmapped in mockIncidents: RQN-0103)
      expect(screen.getByText('Unmapped Reports')).toBeInTheDocument();
      expect(screen.getByText(/1 incidents? lack confirmed coordinates/i)).toBeInTheDocument();
      const mapBtn = screen.getByRole('button', { name: /Resolve on Map/i });
      expect(mapBtn).toBeInTheDocument();
      fireEvent.click(mapBtn);
      expect(handleNavigate).toHaveBeenCalledWith('map');

      // Card 3: Squad Dispatch (2 unassigned in mockIncidents: RQN-0101 & RQN-0103)
      expect(screen.getByText('Squad Dispatch')).toBeInTheDocument();
      expect(screen.getByText(/2 active emergencies currently have no response team assigned/i)).toBeInTheDocument();
      const dispatchBtn = screen.getByRole('button', { name: /Fleet & Dispatch/i });
      expect(dispatchBtn).toBeInTheDocument();
      fireEvent.click(dispatchBtn);
      expect(handleNavigate).toHaveBeenCalledWith('response');
    });
  });
});
