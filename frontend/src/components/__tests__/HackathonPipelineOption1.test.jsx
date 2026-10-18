import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewIncidentModal from '../NewIncidentModal';
import IncidentMap from '../IncidentMap';
import LiveMapPage from '../../pages/LiveMapPage';
import api from '../../services/api';

// Mock Leaflet and React-Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="leaflet-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position, eventHandlers }) => (
    <div
      data-testid="map-marker"
      data-position={JSON.stringify(position)}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="marker-popup">{children}</div>,
  Circle: ({ children }) => <div data-testid="map-circle">{children}</div>,
  useMap: () => ({
    flyTo: vi.fn(),
    getZoom: () => 13,
    invalidateSize: vi.fn(),
  }),
  useMapEvents: () => null,
}));

vi.mock('../../services/api', () => ({
  default: {
    classifyText: vi.fn(),
    createIncident: vi.fn(),
    structureReport: vi.fn(),
    searchLocationCandidates: vi.fn(),
    confirmLocation: vi.fn(),
    getAuditLogs: vi.fn().mockResolvedValue([]),
  }
}));

describe('Hackathon Pipeline Option 1 Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Part A: Structuring Messy Incident Reports in NewIncidentModal', () => {
    it('structures messy incident text into reported facts vs model-inferred fields', async () => {
      const mockStructured = {
        raw_text: 'Flash flood at Wayanad camp, 8 people trapped in building since 20 mins ago.',
        reported_facts: {
          people_affected_estimate: '8 people',
          location_clues: 'Wayanad camp',
          time_references: '20 mins ago',
        },
        inferred_fields: {
          hazard_category: 'flood_inundation',
          nlp_confidence: 0.945,
          urgent_indicators: ['trapped', 'flood'],
        },
        missing_or_uncertain_fields: ['Exact GPS coordinates (requires gazetteer resolution or GPS)'],
        extraction_notes: 'Extracted facts separated from inferences',
      };

      api.structureReport.mockResolvedValueOnce(mockStructured);
      const onToast = vi.fn();

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={onToast}
        />
      );

      // Enter messy distress text
      const textarea = screen.getByPlaceholderText(/Rising floodwater/i);
      fireEvent.change(textarea, {
        target: { value: 'Flash flood at Wayanad camp, 8 people trapped in building since 20 mins ago.' }
      });

      // Click "Structure Messy Report"
      const structureBtn = screen.getByRole('button', { name: /Structure Messy Report/i });
      fireEvent.click(structureBtn);

      await waitFor(() => {
        expect(api.structureReport).toHaveBeenCalledWith(
          'Flash flood at Wayanad camp, 8 people trapped in building since 20 mins ago.'
        );
      });

      // Verify fields were populated into form
      await waitFor(() => {
        expect(screen.getByDisplayValue('8 people')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Wayanad camp')).toBeInTheDocument();
      });

      // Verify Breakdown Card is displayed
      expect(screen.getByText('Report Structuring Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Explicit Reported Facts')).toBeInTheDocument();
      expect(screen.getByText('Model Inferred Fields')).toBeInTheDocument();
      expect(screen.getByText(/94.5%/)).toBeInTheDocument();
      expect(screen.getByText(/trapped, flood/)).toBeInTheDocument();
      expect(screen.getByText(/Exact GPS coordinates/)).toBeInTheDocument();

      // Verify confidence disclaimer is present
      expect(screen.getByText(/NLP confidence indicates model categorization certainty and must not be confused/i)).toBeInTheDocument();
    });

    it('handles messy report with missing fields gracefully as unknown without inventing facts', async () => {
      const mockStructuredUnknown = {
        raw_text: 'Something happened on the street.',
        reported_facts: {
          people_affected_estimate: 'unknown',
          location_clues: null,
          time_references: null,
        },
        inferred_fields: {
          hazard_category: 'other_relevant_information',
          nlp_confidence: 0.55,
          urgent_indicators: [],
        },
        missing_or_uncertain_fields: [
          'No casualty count reported (treated as unknown)',
          'No specific location landmark mentioned (coordinates unresolved)',
        ],
        extraction_notes: 'Missing facts treated as unknown',
      };

      api.structureReport.mockResolvedValueOnce(mockStructuredUnknown);

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText(/Rising floodwater/i);
      fireEvent.change(textarea, { target: { value: 'Something happened on the street.' } });

      fireEvent.click(screen.getByRole('button', { name: /Structure Messy Report/i }));

      await waitFor(() => {
        expect(screen.getByText(/No casualty count reported/i)).toBeInTheDocument();
        expect(screen.getByText(/No specific location landmark/i)).toBeInTheDocument();
      });
    });
  });

  describe('Part B: Location Resolution & Geocoding Candidates', () => {
    it('resolves location with single candidate and sets coordinates automatically', async () => {
      api.searchLocationCandidates.mockResolvedValueOnce({
        query: 'Wayanad',
        candidates_count: 1,
        candidates: [
          {
            display_name: 'Wayanad, Kerala, India',
            latitude: 11.6854,
            longitude: 76.132,
            provider: 'offline_gazetteer',
            confidence: 0.95,
            place_type: 'district',
          }
        ]
      });

      const onToast = vi.fn();

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={onToast}
        />
      );

      const locationInput = screen.getByPlaceholderText(/Wayanad Relief Camp/i);
      fireEvent.change(locationInput, { target: { value: 'Wayanad' } });

      const resolveBtn = screen.getByRole('button', { name: /Resolve/i });
      fireEvent.click(resolveBtn);

      await waitFor(() => {
        expect(api.searchLocationCandidates).toHaveBeenCalledWith('Wayanad');
      });

      // Coordinates automatically populated into latitude and longitude inputs
      await waitFor(() => {
        expect(screen.getByDisplayValue('11.6854')).toBeInTheDocument();
        expect(screen.getByDisplayValue('76.132')).toBeInTheDocument();
      });

      expect(screen.getByText(/Resolved: Wayanad, Kerala, India/i)).toBeInTheDocument();
    });

    it('displays candidate selector when multiple candidates match and requires confirmation', async () => {
      api.searchLocationCandidates.mockResolvedValueOnce({
        query: 'Gandhi Nagar',
        candidates_count: 2,
        candidates: [
          {
            display_name: 'Gandhi Nagar, Bengaluru, Karnataka',
            latitude: 12.9784,
            longitude: 77.5786,
            provider: 'offline_gazetteer',
            confidence: 0.85,
            place_type: 'neighborhood',
          },
          {
            display_name: 'Gandhi Nagar, Delhi, NCR',
            latitude: 28.6652,
            longitude: 77.2764,
            provider: 'offline_gazetteer',
            confidence: 0.85,
            place_type: 'neighborhood',
          }
        ]
      });

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Wayanad Relief Camp/i), {
        target: { value: 'Gandhi Nagar' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Resolve/i }));

      // Both candidates rendered in candidate drawer
      await waitFor(() => {
        expect(screen.getByText(/Multiple Candidates Found — Confirm Location/i)).toBeInTheDocument();
        expect(screen.getByText('Gandhi Nagar, Bengaluru, Karnataka')).toBeInTheDocument();
        expect(screen.getByText('Gandhi Nagar, Delhi, NCR')).toBeInTheDocument();
      });

      // Officer selects the Delhi candidate
      const selectButtons = screen.getAllByRole('button', { name: /Select/i });
      fireEvent.click(selectButtons[1]); // second candidate

      await waitFor(() => {
        expect(screen.getByDisplayValue('28.6652')).toBeInTheDocument();
        expect(screen.getByDisplayValue('77.2764')).toBeInTheDocument();
      });
    });

    it('warns when no candidates match and does not invent fake coordinates', async () => {
      api.searchLocationCandidates.mockResolvedValueOnce({
        query: 'Nowhere XYZ Sector 999',
        candidates_count: 0,
        candidates: []
      });

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Wayanad Relief Camp/i), {
        target: { value: 'Nowhere XYZ Sector 999' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Resolve/i }));

      await waitFor(() => {
        expect(screen.getByText(/No exact coordinates found for 'Nowhere XYZ Sector 999'/i)).toBeInTheDocument();
      });

      // Ensure latitude and longitude inputs remain empty
      expect(screen.getByPlaceholderText(/11.6854/i).value).toBe('');
      expect(screen.getByPlaceholderText(/76.1320/i).value).toBe('');
    });
  });

  describe('Part C: IncidentMap Display & Merged Duplicate Filtering', () => {
    it('plots only non-merged incidents with valid coordinates and renders distinct verified/unverified markers', () => {
      const mockIncidents = [
        {
          id: 'RQN-0001',
          title: 'Verified Flood Point',
          severity: 'critical',
          verificationStatus: 'verified',
          coordinates: [13.3409, 74.7421],
          is_duplicate: false,
          responseStatus: 'active',
          priorityScore: 92,
        },
        {
          id: 'RQN-0002',
          title: 'Unverified Landslide Alert',
          severity: 'high',
          verificationStatus: 'unverified',
          coordinates: [11.6854, 76.132],
          is_duplicate: false,
          responseStatus: 'dispatched',
          priorityScore: 78,
        },
        {
          id: 'RQN-0003',
          title: 'Merged Duplicate Report',
          severity: 'critical',
          verificationStatus: 'verified',
          coordinates: [13.3409, 74.7421],
          is_duplicate: true, // Should be filtered out!
          duplicate_of_id: 'RQN-0001',
          responseStatus: 'merged_duplicate',
          priorityScore: 92,
        },
        {
          id: 'RQN-0004',
          title: 'Unresolved Location Incident',
          severity: 'moderate',
          verificationStatus: 'unverified',
          coordinates: null, // Should not receive a marker!
          is_duplicate: false,
          responseStatus: 'active',
          priorityScore: 45,
        }
      ];

      render(
        <IncidentMap
          incidents={mockIncidents}
          selectedIncident={mockIncidents[0]}
          onSelectIncident={vi.fn()}
        />
      );

      // Only RQN-0001 and RQN-0002 should render markers (2 total)
      // RQN-0003 is duplicate, RQN-0004 has null coordinates
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);

      // Map header shows 2 on map
      expect(screen.getByText('(2 on map)')).toBeInTheDocument();

      // Unmapped incident bar callout shows 1 unconfirmed incident
      expect(screen.getByText(/1 incident/i)).toBeInTheDocument();
      expect(screen.getByText(/No synthetic placement/i)).toBeInTheDocument();

      // Map legend is rendered with accessible labels
      expect(screen.getByLabelText('Map Legend')).toBeInTheDocument();
      expect(screen.getByText('Verified (Solid)')).toBeInTheDocument();
      expect(screen.getByText('Unverified (Dashed)')).toBeInTheDocument();
    });
  });

  describe('Part D: LiveMapPage Unmapped Review and Officer Location Confirmation', () => {
    it('allows coordinator to resolve unmapped incident coordinates directly from map view', async () => {
      const mockIncidents = [
        {
          id: 'RQN-0005',
          title: 'Unmapped Flash Flood',
          locationName: 'Udupi Krishna Temple',
          sector: 'Coastal Sector',
          severity: 'high',
          priorityScore: 82,
          verificationStatus: 'unverified',
          coordinates: null, // Unmapped!
          is_duplicate: false,
          responseStatus: 'active',
        }
      ];

      const onLocationUpdated = vi.fn();
      const onToast = vi.fn();

      api.searchLocationCandidates.mockResolvedValueOnce({
        query: 'Udupi Krishna Temple',
        candidates_count: 1,
        candidates: [
          {
            display_name: 'Udupi, Karnataka, India',
            latitude: 13.3409,
            longitude: 74.7421,
            provider: 'offline_gazetteer',
            confidence: 0.9,
            place_type: 'city',
          }
        ]
      });

      api.confirmLocation.mockResolvedValueOnce({
        ...mockIncidents[0],
        coordinates: [13.3409, 74.7421],
        location_source: 'officer_confirmed (Coordinator Jordan Davis)',
        location_resolution_status: 'candidate_selected',
        locationConfidence: 85,
      });

      render(
        <LiveMapPage
          incidents={mockIncidents}
          attentionZones={[]}
          selectedIncident={mockIncidents[0]}
          onSelectIncident={vi.fn()}
          onNavigateTab={vi.fn()}
          onLocationUpdated={onLocationUpdated}
          onShowToast={onToast}
        />
      );

      // Unmapped incident panel displays the unmapped incident
      expect(screen.getByText(/1 Incidents with Unknown Coordinates/i)).toBeInTheDocument();

      // Click "Resolve & Plot Coordinates" on the selected incident card
      const resolveBtn = screen.getByRole('button', { name: /Resolve & Plot Coordinates/i });
      fireEvent.click(resolveBtn);

      // Resolver modal opens
      expect(screen.getByText(/Geospatial Location Resolver/i)).toBeInTheDocument();
      expect(screen.getByText(/Resolve Coordinates for RQN-0005/i)).toBeInTheDocument();

      // Click Search inside resolver modal
      const searchBtn = screen.getByRole('button', { name: /^Search$/i });
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(api.searchLocationCandidates).toHaveBeenCalledWith('Udupi Krishna Temple');
      });

      // Confirm candidate
      const confirmBtn = screen.getByRole('button', { name: /Confirm & Plot on Map/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.confirmLocation).toHaveBeenCalledWith('RQN-0005', expect.objectContaining({
          coordinates: [13.3409, 74.7421],
          confirmationStatus: 'officer_confirmed',
        }));
      });

      expect(onLocationUpdated).toHaveBeenCalled();
      expect(onToast).toHaveBeenCalledWith(
        expect.stringContaining('Coordinates for RQN-0005 confirmed'),
        'success'
      );
    });
  });

  describe('Part E: Comprehensive Modal Intake & Provenance Testing', () => {
    it('supports selecting report source channel and persists provenance reference', async () => {
      api.createIncident.mockResolvedValueOnce({
        id: 'RQN-0501',
        title: 'SMS Distress from Coastal Outpost',
        report_source: 'SMS',
        source_reference: 'SMS-MSG-8821',
        sourceSummary: 'SMS [Ref: SMS-MSG-8821] - Intake via Emergency Report Form',
        verificationStatus: 'unverified',
      });

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      // Select SMS channel
      const sourceSelect = screen.getByLabelText(/Report Source Channel/i);
      fireEvent.change(sourceSelect, { target: { value: 'SMS' } });

      // Enter source reference
      const refInput = screen.getByPlaceholderText(/CAD #5892/i);
      fireEvent.change(refInput, { target: { value: 'SMS-MSG-8821' } });

      // Verify disclaimer shows manual intake for SMS
      expect(screen.getByText(/Recording incoming reports received via SMS/i)).toBeInTheDocument();

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText(/Flash flooding/i), {
        target: { value: 'SMS Distress from Coastal Outpost' }
      });
      fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
        target: { value: 'High sea waves breaching perimeter wall' }
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

      await waitFor(() => {
        expect(api.createIncident).toHaveBeenCalledWith(expect.objectContaining({
          report_source: 'SMS',
          source_reference: 'SMS-MSG-8821',
          sourceSummary: 'SMS [Ref: SMS-MSG-8821] - Intake via Emergency Report Form',
        }));
      });
    });

    it('allows applying all structured suggestions into the form with one click', async () => {
      const mockStructured = {
        raw_text: 'Landslide in Chamoli, 12 workers trapped under debris.',
        reported_facts: {
          people_affected_estimate: '12 trapped',
          location_clues: 'Chamoli Disaster Zone',
          time_references: 'Recent',
        },
        inferred_fields: {
          hazard_category: 'landslide_mudslide',
          nlp_confidence: 0.96,
          urgent_indicators: ['trapped', 'debris'],
        },
        missing_or_uncertain_fields: [],
      };

      api.structureReport.mockResolvedValueOnce(mockStructured);
      api.searchLocationCandidates.mockResolvedValueOnce({
        query: 'Chamoli Disaster Zone',
        candidates_count: 1,
        candidates: [{ display_name: 'Chamoli, Uttarakhand', latitude: 30.42, longitude: 79.33, provider: 'offline_gazetteer', confidence: 0.95 }]
      });

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
        target: { value: 'Landslide in Chamoli, 12 workers trapped under debris.' }
      });
      fireEvent.click(screen.getByRole('button', { name: /Structure Messy Report/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply All Suggestions/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apply All Suggestions/i }));

      // Form updated
      expect(screen.getByDisplayValue('12 trapped')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chamoli Disaster Zone')).toBeInTheDocument();
    });

    it('enforces coordinator justification when manual priority override is toggled', async () => {
      const onToast = vi.fn();

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={onToast}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Flash flooding/i), {
        target: { value: 'Bridge structural failure' }
      });
      fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
        target: { value: 'Pillars cracked under load' }
      });

      // Toggle manual override
      const overrideCheckbox = screen.getByRole('checkbox', { name: /Manual Priority \/ Severity Override/i });
      fireEvent.click(overrideCheckbox);

      // Try submitting without justification reason
      const form = screen.getByRole('button', { name: /Submit Report/i }).closest('form');
      fireEvent.submit(form);

      expect(onToast).toHaveBeenCalledWith(
        'Justification reason is required for manual priority override.',
        'alert'
      );
      expect(api.createIncident).not.toHaveBeenCalled();

      // Now enter coordinator and reason
      const reasonInput = screen.getByPlaceholderText(/Direct phone dispatch/i);
      fireEvent.change(reasonInput, {
        target: { value: 'Confirmed by District Collector via secure radio call' }
      });

      api.createIncident.mockResolvedValueOnce({
        id: 'RQN-0502',
        title: 'Bridge structural failure',
        is_priority_overridden: true,
        priorityScore: 95,
        verificationStatus: 'unverified',
      });

      fireEvent.submit(form);

      await waitFor(() => {
        expect(api.createIncident).toHaveBeenCalledWith(expect.objectContaining({
          is_priority_overridden: true,
          override_reason: 'Confirmed by District Collector via secure radio call',
          override_operator: 'Coordinator Intake',
        }));
      });
    });

    it('preserves unresolved location without inventing fake coordinates when officer selects Leave Unresolved', async () => {
      api.createIncident.mockResolvedValueOnce({
        id: 'RQN-0503',
        title: 'Rural flood sighting',
        coordinates: null,
        location_source: 'unresolved_ambiguous',
        location_resolution_status: 'unresolved_ambiguous',
        verificationStatus: 'unverified',
      });

      render(
        <NewIncidentModal
          isOpen={true}
          onClose={vi.fn()}
          onIncidentCreated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Flash flooding/i), {
        target: { value: 'Rural flood sighting' }
      });
      fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
        target: { value: 'Remote village flooded, coordinates unknown' }
      });

      // Submit with empty coordinates
      fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

      await waitFor(() => {
        expect(api.createIncident).toHaveBeenCalledWith(expect.objectContaining({
          coordinates: null,
          location_source: 'unresolved_ambiguous',
          location_resolution_status: 'unresolved_ambiguous',
        }));
      });
    });
  });
});

