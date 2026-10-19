import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BroadcastModal from '../BroadcastModal';
import IncidentDetailPanel from '../IncidentDetailPanel';
import Sidebar from '../Sidebar';

describe('Priority 2 & 4 Audits — Coordinates Provenance & Honest Simulation Labeling', () => {
  describe('BroadcastModal (Priority 4)', () => {
    it('honestly labels broadcast modal as simulated prototype with disclaimer banner', () => {
      render(
        <BroadcastModal
          isOpen={true}
          onClose={vi.fn()}
          selectedIncident={null}
          onSendBroadcast={vi.fn()}
        />
      );

      // Header title reflects simulated prototype
      expect(screen.getByText(/Public Emergency Broadcast \(Simulated Prototype\)/i)).toBeDefined();

      // Warning disclaimer is present
      expect(screen.getByText(/Simulation Mode: No actual carrier, SMS, or EAS broadcast packets are transmitted/i)).toBeDefined();

      // Submit button reflects logging simulated broadcast
      expect(screen.getByText(/Log Simulated Broadcast/i)).toBeDefined();
    });

    it('displays simulated drill confirmation on submit without claiming real carrier dispatch', () => {
      render(
        <BroadcastModal
          isOpen={true}
          onClose={vi.fn()}
          selectedIncident={null}
          onSendBroadcast={vi.fn()}
        />
      );

      const submitBtn = screen.getByText(/Log Simulated Broadcast/i);
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Simulated Broadcast Logged/i)).toBeDefined();
      expect(screen.getByText(/No actual telecommunications carrier transmission occurred/i)).toBeDefined();
    });
  });

  describe('IncidentDetailPanel (Priority 2 & 4)', () => {
    const baseIncident = {
      id: 'RQN-TEST-01',
      title: 'Structural hazard test',
      severity: 'high',
      sector: 'North Hub',
      locationName: 'North Warehouse',
      timeAgo: '5m ago',
      priorityScore: 78,
      reportReliability: 85,
      locationConfidence: 90,
      peopleAffected: '12 people',
      whyPrioritised: 'High structural integrity risk.',
      verificationStatus: 'unverified',
      responseStatus: 'triage',
      notes: [],
    };

    const mockTeams = [
      { id: 'team-1', name: 'Alpha Search & Rescue', type: 'SAR', status: 'available' },
    ];

    it('renders unknown coordinates badge when coordinates are null', () => {
      const incidentNoCoords = {
        ...baseIncident,
        coordinates: null,
        is_synthetic_location: false,
        location_source: 'unmatched_unknown',
      };

      render(
        <IncidentDetailPanel
          incident={incidentNoCoords}
          responseTeams={mockTeams}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      expect(screen.getByText(/⚠️ Coordinates Unknown \(Unmatched Location\)/i)).toBeDefined();
      expect(screen.getByText(/Unmapped \/ Unknown/i)).toBeDefined();
      expect(screen.getByText('N/A')).toBeDefined();
    });

    it('renders demo/synthetic coordinate badge when coordinates are simulated', () => {
      const incidentSynthetic = {
        ...baseIncident,
        coordinates: [37.7812, -122.3910],
        is_synthetic_location: true,
        location_source: 'synthetic_demo_sf_simulation',
      };

      render(
        <IncidentDetailPanel
          incident={incidentSynthetic}
          responseTeams={mockTeams}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      expect(screen.getByText(/🧪 Demo \/ Synthetic Coords/i)).toBeDefined();
      expect(screen.getByText(/Simulated Demo/i)).toBeDefined();
    });

    it('renders geocoded badge when coordinates are resolved via Indian registry', () => {
      const incidentGeocoded = {
        ...baseIncident,
        coordinates: [19.0760, 72.8777],
        is_synthetic_location: false,
        location_source: 'geocoded_indian_gazetteer (Mumbai, Maharashtra)',
      };

      render(
        <IncidentDetailPanel
          incident={incidentGeocoded}
          responseTeams={mockTeams}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      expect(screen.getByText(/🗺️ Geocoded/i)).toBeDefined();
      expect(screen.getByText(/Registry Geocoded/i)).toBeDefined();
    });

    it('labels response teams honestly as demo fleet roster with simulated tags', () => {
      render(
        <IncidentDetailPanel
          incident={baseIncident}
          responseTeams={mockTeams}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      expect(screen.getByText(/Assigned Response Team \(Demo Fleet Roster\)/i)).toBeDefined();
      expect(screen.getByText(/Alpha Search & Rescue \(SAR\) - available \[Simulated\]/i)).toBeDefined();
    });

    it('displays the exact five-factor scoring breakdown from backend without placeholders', () => {
      const incidentWithBreakdown = {
        ...baseIncident,
        id: 'RQN-0692',
        priorityScore: 75,
        scoring_breakdown: {
          hazard_sub: 80.0,
          scale_sub: 65.0,
          verification_sub: 55.0,
          location_sub: 95.0,
          time_sub: 100.0,
          corroboration_boost: 0,
          weights: {
            hazard: 0.35,
            scale: 0.25,
            verification: 0.20,
            location: 0.10,
            time: 0.10,
          },
          is_overridden: false,
          calculated_score: 75,
          effective_score: 75,
          hazard_raw: 'high',
          scale_raw: '5 affected',
          verification_raw: 'unverified',
          location_raw: '95%',
          time_raw: 'Just now',
        },
      };

      render(
        <IncidentDetailPanel
          incident={incidentWithBreakdown}
          responseTeams={mockTeams}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
          onAddNote={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      // Verify the 5 factor scores are rendered exactly as persisted
      expect(screen.getByText(/80 pts/i)).toBeDefined();
      expect(screen.getByText(/65 pts/i)).toBeDefined();
      expect(screen.getByText(/55 pts/i)).toBeDefined();
      expect(screen.getByText(/95 pts/i)).toBeDefined();
      expect(screen.getByText(/100 pts/i)).toBeDefined();
      expect(screen.getByText(/Algorithmic Base:/i)).toBeDefined();
    });
  });

  describe('Sidebar Telemetry (Priority 4)', () => {
    it('labels telemetry feed as simulated sensor stream', () => {
      render(
        <Sidebar
          activeTab="overview"
          setActiveTab={vi.fn()}
          unverifiedCount={3}
          attentionZonesCount={2}
        />
      );

      expect(screen.getByText(/Signal Feed \(Telemetry Simulation\)/i)).toBeDefined();
      expect(screen.getByText(/Simulated Sensor Stream/i)).toBeDefined();
      expect(screen.getByText('SIMULATED')).toBeDefined();
    });
  });
});
