import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import IncidentsPage from '../../pages/IncidentsPage';
import PriorityQueuePage from '../../pages/PriorityQueuePage';
import OverviewPage from '../../pages/OverviewPage';
import IncidentDetailPanel from '../IncidentDetailPanel';
import IncidentMap from '../IncidentMap';

describe('Simulated SMS Frontend Presentation and Map Filtering Suite', () => {
  const sampleSMSIncident = {
    id: 'RQN-0789',
    title: 'Flood - Near Udupi railway underpass',
    type: 'Flood',
    sector: 'Sector Unspecified',
    locationName: 'Near Udupi railway underpass',
    coordinates: null, // Unknown coordinates from SMS intake
    is_synthetic_location: false,
    severity: 'critical',
    priorityScore: 84,
    reportReliability: 65,
    locationConfidence: 40,
    peopleAffected: '3 people trapped',
    affectedCountNumeric: 3,
    timeAgo: 'Just now',
    timestamp: '2026-10-19T16:00:00Z',
    verificationStatus: 'unverified',
    responseStatus: 'triage',
    report_source: 'sms_simulated',
    sourceSummary: 'SMS (Simulated) [Ref: msg-sms-789] - Sender: +919876543210',
    whyPrioritised: 'High hazard flood report with 3 people trapped from simulated SMS.',
    riskFactors: ['Civilians reported trapped', 'Reported need: Need rescue'],
    report_text: 'FLOOD | Near Udupi railway underpass | 3 people trapped | Need rescue',
    notes: [],
  };

  it('renders SIMULATED SMS badge on IncidentsPage incident cards', () => {
    render(
      <IncidentsPage
        incidents={[sampleSMSIncident]}
        selectedIncident={sampleSMSIncident}
        onSelectIncident={() => {}}
        onVerifyStatusChange={() => {}}
        onResponseStatusChange={() => {}}
      />
    );

    const badges = screen.getAllByTestId('sms-source-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Near Udupi railway underpass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coords Unknown/i).length).toBeGreaterThan(0);
  });

  it('renders SIMULATED SMS badge on PriorityQueuePage queue items', () => {
    render(
      <PriorityQueuePage
        incidents={[sampleSMSIncident]}
        selectedIncident={sampleSMSIncident}
        onSelectIncident={() => {}}
        onOpenOverrideModal={() => {}}
      />
    );

    const badges = screen.getAllByTestId('sms-source-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getAllByText('RQN-0789').length).toBeGreaterThan(0);
  });

  it('renders SIMULATED SMS badge and narrative inside IncidentDetailPanel', () => {
    render(
      <IncidentDetailPanel
        incident={sampleSMSIncident}
        onVerifyStatusChange={() => {}}
        onResponseStatusChange={() => {}}
      />
    );

    const badges = screen.getAllByTestId('sms-source-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getByText(/FLOOD \| Near Udupi railway underpass \| 3 people trapped \| Need rescue/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinates Unknown/i)).toBeInTheDocument();
  });

  it('renders SIMULATED SMS badge on OverviewPage highest priority list', () => {
    render(
      <OverviewPage
        incidents={[sampleSMSIncident]}
        selectedIncident={sampleSMSIncident}
        onSelectIncident={() => {}}
        onNavigateTab={() => {}}
      />
    );

    const badges = screen.getAllByTestId('sms-source-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getByText('RQN-0789')).toBeInTheDocument();
  });

  it('does NOT render markers on IncidentMap for incidents without coordinates', () => {
    render(
      <IncidentMap
        incidents={[sampleSMSIncident]}
        selectedIncident={sampleSMSIncident}
        onSelectIncident={() => {}}
      />
    );

    // Map header indicates 0 on map because incident has null coordinates
    expect(screen.getByText(/0\s*on map/i)).toBeInTheDocument();
    // Marker should not be rendered
    const marker = screen.queryByLabelText(/Inspect details for incident RQN-0789/i);
    expect(marker).not.toBeInTheDocument();
  });
});
