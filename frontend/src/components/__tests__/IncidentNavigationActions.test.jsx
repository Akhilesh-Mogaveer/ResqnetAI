import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverviewPage from '../../pages/OverviewPage';
import IncidentMap from '../IncidentMap';
import IncidentDetailPanel from '../IncidentDetailPanel';
import EquityCoverageMonitor from '../EquityCoverageMonitor';

describe('RESQNET AI — Incident Navigation Actions (Bug 1 & Bug 2 Fixes)', () => {
  const mockIncidents = [
    {
      id: 'RQN-0715',
      title: 'Isolated hamlet cut off by river surge without GPS coordinates',
      type: 'Flood',
      sector: 'Mountain Basin Sector',
      locationName: 'North Hollow Road',
      coordinates: null, // Missing / unresolved coordinates
      location_source: 'unmatched_unknown',
      severity: 'critical',
      priorityScore: 89,
      reportReliability: 70,
      locationConfidence: 10,
      peopleAffected: '8 people stranded',
      timeAgo: '15 min ago',
      timestamp: '2026-10-19T14:00:00Z',
      verificationStatus: 'unverified',
      responseStatus: 'triage',
      assignedTeam: null,
      duplicate_count: 0,
      equity_review_flag: true,
      equity_reasons: [
        'Unresolved coordinates: incident lacks confirmed geospatial coordinates',
        'Verification pending: ground truth has not yet been confirmed',
        'Limited reporting evidence: isolated single report (sparse reporting proxy)'
      ],
      is_duplicate: false
    },
    {
      id: 'RQN-0427',
      title: 'Structural collapse at pier warehouse',
      type: 'Structural Collapse',
      sector: 'East Harbor District',
      locationName: 'Pier 14 Logistics Complex',
      coordinates: [37.7845, -122.3965], // Valid coordinates
      location_source: 'user_supplied',
      severity: 'critical',
      priorityScore: 94,
      reportReliability: 88,
      locationConfidence: 92,
      peopleAffected: '12 - 20 trapped',
      timeAgo: '18 min ago',
      timestamp: '2026-10-19T13:50:00Z',
      verificationStatus: 'verified',
      responseStatus: 'triage',
      assignedTeam: null,
      duplicate_count: 3,
      equity_review_flag: false,
      equity_reasons: [],
      is_duplicate: false
    },
    {
      id: 'RQN-0428',
      title: 'Flash flooding at commuter underpass',
      type: 'Flash Flood',
      sector: 'Northgate Expressway',
      locationName: 'Bayview Underpass Mile 4',
      coordinates: [37.7985, -122.4120], // Valid coordinates
      location_source: 'geocoded_exact',
      severity: 'high',
      priorityScore: 82,
      reportReliability: 78,
      locationConfidence: 85,
      peopleAffected: '6 submerged vehicles',
      timeAgo: '25 min ago',
      timestamp: '2026-10-19T13:40:00Z',
      verificationStatus: 'verified',
      responseStatus: 'dispatched',
      assignedTeam: 'Engine 3',
      duplicate_count: 2,
      equity_review_flag: false,
      equity_reasons: [],
      is_duplicate: false
    }
  ];

  // =========================================================================
  // BUG 1: Equity & Coverage Monitor — Inspect Incident Navigation
  // =========================================================================
  describe('Bug 1: Equity & Coverage Monitor — Inspect Incident', () => {
    it('clicking "Inspect Incident" navigates to exact equity-flagged incident RQN-0715 on OverviewPage', () => {
      const handleSelectIncident = vi.fn();
      const handleNavigateTab = vi.fn();

      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={[]}
          selectedIncident={mockIncidents[1]} // Initially selecting RQN-0427
          onSelectIncident={handleSelectIncident}
          onNavigateTab={handleNavigateTab}
        />
      );

      // Verify Equity & Coverage Monitor renders RQN-0715 in the flagged drawer/list
      expect(screen.getAllByText('RQN-0715').length).toBeGreaterThan(0);
      expect(screen.getByText(/⚠️ Missing Coords/i)).toBeInTheDocument();

      // Find the Inspect Incident button specifically for RQN-0715
      const inspectBtn = screen.getByRole('button', { name: /Inspect incident RQN-0715/i });
      expect(inspectBtn).toBeInTheDocument();

      // Click "Inspect Incident"
      fireEvent.click(inspectBtn);

      // Must call onSelectIncident with the exact incident object (containing stable ID 'RQN-0715')
      expect(handleSelectIncident).toHaveBeenCalledTimes(1);
      const selectedArg = handleSelectIncident.mock.calls[0][0];
      expect(selectedArg).toBeDefined();
      expect(selectedArg.id).toBe('RQN-0715');
      expect(selectedArg.title).toContain('Isolated hamlet cut off');

      // Must trigger navigation to the dedicated 'incidents' management interface
      expect(handleNavigateTab).toHaveBeenCalledWith('incidents');
    });

    it('displays full details for RQN-0715 inside IncidentDetailPanel including equity reasons and missing coordinates', () => {
      const rqn0715 = mockIncidents.find(i => i.id === 'RQN-0715');

      render(
        <IncidentDetailPanel
          incident={rqn0715}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onOpenOverrideModal={vi.fn()}
          onAddNote={vi.fn()}
        />
      );

      // Verify incident identifier and title
      expect(screen.getByText('RQN-0715')).toBeInTheDocument();
      expect(screen.getByText(/Isolated hamlet cut off/i)).toBeInTheDocument();

      // Verify missing coordinates status warning is rendered (never invented coordinates)
      expect(screen.getByText(/⚠️ Coordinates Unknown \(Unmatched Location\)/i)).toBeInTheDocument();

      // Verify severity and priority score
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();

      // Verify prominent Equity Review Required banner and all equity reasons
      expect(screen.getByTestId('equity-review-banner')).toBeInTheDocument();
      expect(screen.getByText(/EQUITY REVIEW REQUIRED/i)).toBeInTheDocument();
      expect(screen.getByText(/Unresolved coordinates: incident lacks confirmed geospatial coordinates/i)).toBeInTheDocument();
      expect(screen.getByText(/Verification pending: ground truth has not yet been confirmed/i)).toBeInTheDocument();
      expect(screen.getByText(/Limited reporting evidence: isolated single report/i)).toBeInTheDocument();
    });

    it('EquityCoverageMonitor component standalone triggers both onSelectIncident and onNavigateTab', () => {
      const handleSelect = vi.fn();
      const handleNav = vi.fn();

      render(
        <EquityCoverageMonitor
          incidents={mockIncidents}
          onSelectIncident={handleSelect}
          onNavigateTab={handleNav}
        />
      );

      const inspectBtn = screen.getByRole('button', { name: /Inspect incident RQN-0715/i });
      fireEvent.click(inspectBtn);

      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'RQN-0715' })
      );
      expect(handleNav).toHaveBeenCalledWith('incidents');
    });
  });

  // =========================================================================
  // BUG 2: Geographic Operations Preview — Inspect Incident Details
  // =========================================================================
  describe('Bug 2: Geographic Operations Preview — Inspect Incident Details', () => {
    it('clicking "Inspect Incident Details" in map popup navigates to the exact incident on OverviewPage', () => {
      const handleSelectIncident = vi.fn();
      const handleNavigateTab = vi.fn();

      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={[]}
          selectedIncident={mockIncidents[0]}
          onSelectIncident={handleSelectIncident}
          onNavigateTab={handleNavigateTab}
        />
      );

      // The map preview should render markers for the 2 mapped incidents (RQN-0427 and RQN-0428)
      const inspectButtons = screen.getAllByRole('button', { name: /Inspect details for incident/i });
      expect(inspectButtons.length).toBe(2);

      // Find inspect button for RQN-0427
      const btn0427 = screen.getByRole('button', { name: /Inspect details for incident RQN-0427/i });
      expect(btn0427).toBeInTheDocument();

      // Click "Inspect Incident Details"
      fireEvent.click(btn0427);

      // Verify it selects RQN-0427
      expect(handleSelectIncident).toHaveBeenCalled();
      const selectedArg = handleSelectIncident.mock.calls[0][0];
      expect(selectedArg.id).toBe('RQN-0427');
      expect(selectedArg.title).toContain('Structural collapse at pier warehouse');

      // Verify it navigates to 'incidents' tab
      expect(handleNavigateTab).toHaveBeenCalledWith('incidents');
    });

    it('clicking "Inspect Incident Details" for RQN-0428 selects RQN-0428 and does not open a stale selection', () => {
      const handleSelectIncident = vi.fn();
      const handleNavigateTab = vi.fn();

      render(
        <OverviewPage
          incidents={mockIncidents}
          attentionZones={[]}
          selectedIncident={mockIncidents[1]} // Initial selection is RQN-0427
          onSelectIncident={handleSelectIncident}
          onNavigateTab={handleNavigateTab}
        />
      );

      // Click inspect button for RQN-0428
      const btn0428 = screen.getByRole('button', { name: /Inspect details for incident RQN-0428/i });
      fireEvent.click(btn0428);

      // Must select RQN-0428 specifically, NOT RQN-0427 or stale selection
      expect(handleSelectIncident).toHaveBeenCalled();
      const selectedArg = handleSelectIncident.mock.calls[0][0];
      expect(selectedArg.id).toBe('RQN-0428');
      expect(selectedArg.title).toContain('Flash flooding at commuter underpass');
      expect(handleNavigateTab).toHaveBeenCalledWith('incidents');
    });

    it('IncidentMap stops event propagation and does not re-trigger marker click when inspecting popup details', () => {
      const handleSelectMarker = vi.fn();
      const handleInspect = vi.fn();

      render(
        <IncidentMap
          incidents={mockIncidents}
          selectedIncident={mockIncidents[1]}
          onSelectIncident={handleSelectMarker}
          onInspectIncident={handleInspect}
        />
      );

      const inspectBtn = screen.getByRole('button', { name: /Inspect details for incident RQN-0427/i });

      // Click Inspect button inside the popup
      fireEvent.click(inspectBtn);

      // onInspectIncident must be invoked with RQN-0427
      expect(handleInspect).toHaveBeenCalledTimes(1);
      expect(handleInspect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'RQN-0427' })
      );

      // Marker click handler (handleSelectMarker) should NOT be called again from this popup button click
      expect(handleSelectMarker).not.toHaveBeenCalled();
    });

    it('displays correct incident details in IncidentDetailPanel for mapped incident RQN-0427', () => {
      const rqn0427 = mockIncidents.find(i => i.id === 'RQN-0427');

      render(
        <IncidentDetailPanel
          incident={rqn0427}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onOpenOverrideModal={vi.fn()}
          onAddNote={vi.fn()}
        />
      );

      expect(screen.getByText('RQN-0427')).toBeInTheDocument();
      expect(screen.getByText(/Structural collapse at pier warehouse/i)).toBeInTheDocument();
      expect(screen.getByText('Pier 14 Logistics Complex')).toBeInTheDocument();
      expect(screen.getByText('94')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
      // Should show geocoded/GPS coordinate badge rather than missing coordinates warning
      expect(screen.queryByText(/⚠️ Coordinates Unknown/i)).not.toBeInTheDocument();
      expect(screen.getByText(/37\.785/i)).toBeInTheDocument();
    });
  });
});
