import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DuplicateSuggestionsCard from '../DuplicateSuggestionsCard';
import DuplicateReviewModal from '../DuplicateReviewModal';
import api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  default: {
    getIncidentDuplicates: vi.fn(),
    mergeDuplicate: vi.fn(),
    dismissDuplicate: vi.fn(),
  },
}));

describe('RESQNET AI Duplicate Detection Workflow (RQN-0444 & RQN-0445)', () => {
  const mockIncidentRQN0444 = {
    id: 'RQN-0444',
    title: 'Flash flood trapping 4 vehicles on Coastal Highway',
    sector: 'East Harbor District',
    locationName: 'Coastal Highway KM 14',
    coordinates: { lat: 34.02, lng: -118.25 },
    priorityScore: 82,
    severity: 'critical',
    report_text: 'Water rising rapidly on Coastal Highway KM 14. 4 cars submerged up to hood.',
    humaid_category: 'rescue_volunteering_or_donation_effort',
    verificationStatus: 'unverified',
    responseStatus: 'active',
    is_duplicate: false,
    corroborationCount: 1,
  };

  const mockCandidateRQN0445 = {
    id: 'dup-RQN-0444-RQN-0445',
    primary_incident_id: 'RQN-0444',
    candidate_incident_id: 'RQN-0445',
    candidate_id: 'RQN-0445',
    candidate_title: 'Rising flood waters trapping cars on Highway 14',
    candidate_sector: 'East Harbor District',
    candidate_severity: 'critical',
    candidate_category: 'rescue_volunteering_or_donation_effort',
    candidate_time_ago: '8m ago',
    overall_score: 79,
    confidence_level: 'HIGH',
    distance_km: 2.43,
    time_diff_minutes: 12,
    text_similarity: 0.81,
    category_match: true,
    reasons: [
      'High text semantic similarity (81%)',
      'Spatial proximity (2.43 km apart in East Harbor District)',
      'Identical disaster category (rescue_volunteering_or_donation_effort)',
    ],
    review_status: 'pending',
    candidate_incident: {
      id: 'RQN-0445',
      title: 'Rising flood waters trapping cars on Highway 14',
      sector: 'East Harbor District',
      locationName: 'Coastal Highway near Mile 14',
      report_text: 'Water rising rapidly on Coastal Highway KM 14. 4 cars submerged up to hood.',
      priorityScore: 78,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders duplicate candidate RQN-0445 with 79% match and stable suggestion ID', async () => {
    api.getIncidentDuplicates.mockImplementation(async () => [mockCandidateRQN0445]);

    render(
      <DuplicateSuggestionsCard
        incident={mockIncidentRQN0444}
        onDuplicateMerged={vi.fn()}
        onDuplicateDismissed={vi.fn()}
        onShowToast={vi.fn()}
        onSelectIncident={vi.fn()}
      />
    );

    // After fetch completes
    await waitFor(() => {
      expect(screen.getByText('RQN-0445')).toBeInTheDocument();
    });

    expect(screen.getByText(/79% Match \(HIGH\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review & Merge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
  });

  it('renders readable color-coded match badges for every confidence tier', async () => {
    api.getIncidentDuplicates.mockResolvedValue([
      { ...mockCandidateRQN0445, id: 'low', candidate_id: 'LOW-1', overall_score: 50, confidence_level: 'LOW' },
      { ...mockCandidateRQN0445, id: 'medium', candidate_id: 'MEDIUM-1', overall_score: 65, confidence_level: 'MEDIUM' },
      { ...mockCandidateRQN0445, id: 'high', candidate_id: 'HIGH-1', overall_score: 100, confidence_level: 'HIGH Confidence' },
    ]);

    render(<DuplicateSuggestionsCard incident={mockIncidentRQN0444} />);

    await waitFor(() => {
      expect(screen.getByText('50% Match (LOW)')).toBeInTheDocument();
    });

    expect(screen.getByText('50% Match (LOW)')).toHaveClass('bg-amber-100', 'text-amber-950');
    expect(screen.getByText('65% Match (MEDIUM)')).toHaveClass('bg-blue-100', 'text-blue-950');
    expect(screen.getByText('100% Match (HIGH Confidence)')).toHaveClass('bg-red-600', 'text-white');
  });

  it('performs Review & Merge on RQN-0444 and RQN-0445 with confirmation and shows "Merge recorded"', async () => {
    api.getIncidentDuplicates.mockImplementation(async () => [mockCandidateRQN0445]);

    const mockMergeResponse = {
      success: true,
      action: 'merged',
      message: 'Merge recorded: RQN-0445 merged into primary record RQN-0444.',
      primary_incident: {
        ...mockIncidentRQN0444,
        corroborationCount: 2,
        corroborating_sources: ['RQN-0445'],
      },
      merged_incident: {
        ...mockCandidateRQN0445.candidate_incident,
        is_duplicate: true,
        duplicate_of_id: 'RQN-0444',
        responseStatus: 'merged_duplicate',
      },
    };
    api.mergeDuplicate.mockResolvedValueOnce(mockMergeResponse);

    const onDuplicateMerged = vi.fn();
    const onShowToast = vi.fn();

    render(
      <DuplicateSuggestionsCard
        incident={mockIncidentRQN0444}
        onDuplicateMerged={onDuplicateMerged}
        onDuplicateDismissed={vi.fn()}
        onShowToast={onShowToast}
        onSelectIncident={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('RQN-0445')).toBeInTheDocument();
    });

    // After merge, duplicate query will return empty
    api.getIncidentDuplicates.mockImplementation(async () => []);

    // Click "Review & Merge"
    fireEvent.click(screen.getByRole('button', { name: /Review & Merge/i }));

    // Review Modal opens
    expect(screen.getByText(/Review & Corroborate Candidate Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Primary Record/i)).toBeInTheDocument();
    expect(screen.getByText(/Merge Confirmation:/i)).toBeInTheDocument();
    expect(screen.getByText(/will be merged into primary record/i)).toBeInTheDocument();

    // Confirm Merge with Authorize Merge button
    const authorizeBtn = screen.getByRole('button', { name: /Authorize Merge/i });
    fireEvent.click(authorizeBtn);

    // Verify API called with exact parameters
    await waitFor(() => {
      expect(api.mergeDuplicate).toHaveBeenCalledTimes(1);
    });

    expect(api.mergeDuplicate).toHaveBeenCalledWith(
      'RQN-0444',
      expect.objectContaining({
        primaryIncidentId: 'RQN-0444',
        duplicateIncidentId: 'RQN-0445',
        suggestionId: 'dup-RQN-0444-RQN-0445',
        operator: 'Coordinator Jordan Davis',
      })
    );

    // Check frontend callback called with both records
    expect(onDuplicateMerged).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryId: 'RQN-0444',
        duplicateId: 'RQN-0445',
      })
    );

    // Verify truthful outcome message "Merge Recorded:" is displayed
    await waitFor(() => {
      expect(screen.getByText('Merge Recorded:')).toBeInTheDocument();
      expect(screen.getByText(mockMergeResponse.message)).toBeInTheDocument();
    });
  });

  it('allows coordinator to switch primary record to RQN-0445 during Review & Merge', async () => {
    const onConfirmMerge = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    render(
      <DuplicateReviewModal
        isOpen={true}
        onClose={onClose}
        primaryIncident={mockIncidentRQN0444}
        candidateSuggestion={mockCandidateRQN0445}
        onConfirmMerge={onConfirmMerge}
      />
    );

    expect(screen.getByText(/Review & Corroborate Candidate Report/i)).toBeInTheDocument();

    // Find candidate primary selector button
    const candidatePrimaryBtn = screen.getByRole('button', { name: /RQN-0445/i });
    fireEvent.click(candidatePrimaryBtn);

    // Now RQN-0445 should be selected primary, and RQN-0444 the duplicate
    const authorizeBtn = screen.getByRole('button', { name: /Authorize Merge/i });
    fireEvent.click(authorizeBtn);

    await waitFor(() => {
      expect(onConfirmMerge).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryIncidentId: 'RQN-0445',
          duplicateIncidentId: 'RQN-0444',
        })
      );
    });
  });

  it('performs Dismiss on candidate RQN-0445 without affecting merge state and shows "Suggestion dismissed"', async () => {
    api.getIncidentDuplicates.mockImplementation(async () => [mockCandidateRQN0445]);

    const mockDismissResponse = {
      success: true,
      action: 'dismissed',
      message: 'Suggestion dismissed: Candidate RQN-0445 confirmed as distinct event.',
      primary_incident: {
        ...mockIncidentRQN0444,
        dismissed_duplicates: ['RQN-0445'],
      },
    };
    api.dismissDuplicate.mockResolvedValueOnce(mockDismissResponse);

    const onDuplicateMerged = vi.fn();
    const onDuplicateDismissed = vi.fn();
    const onShowToast = vi.fn();

    render(
      <DuplicateSuggestionsCard
        incident={mockIncidentRQN0444}
        onDuplicateMerged={onDuplicateMerged}
        onDuplicateDismissed={onDuplicateDismissed}
        onShowToast={onShowToast}
        onSelectIncident={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('RQN-0445')).toBeInTheDocument();
    });

    // After dismissal, backend returns empty
    api.getIncidentDuplicates.mockImplementation(async () => []);

    // Click "Dismiss"
    fireEvent.click(screen.getByRole('button', { name: /^Dismiss$/i }));

    // Dismissal modal opens
    expect(screen.getByText(/Confirm Duplicate Dismissal/i)).toBeInTheDocument();
    expect(screen.getByText(/Both incidents will remain separate and active/i)).toBeInTheDocument();

    // Confirm dismissal
    fireEvent.click(screen.getByRole('button', { name: /Confirm Dismissal/i }));

    await waitFor(() => {
      expect(api.dismissDuplicate).toHaveBeenCalledTimes(1);
    });

    expect(api.dismissDuplicate).toHaveBeenCalledWith(
      'RQN-0444',
      expect.objectContaining({
        duplicateIncidentId: 'RQN-0445',
        operator: 'Coordinator Jordan Davis',
      })
    );

    // Merge handler should NOT have been called
    expect(onDuplicateMerged).not.toHaveBeenCalled();
    // Dismiss handler should have been called
    expect(onDuplicateDismissed).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryId: 'RQN-0444',
        candidateId: 'RQN-0445',
      })
    );

    // Distinct truthful outcome "Suggestion Dismissed:" is displayed
    await waitFor(() => {
      expect(screen.getByText('Suggestion Dismissed:')).toBeInTheDocument();
      expect(screen.getByText(mockDismissResponse.message)).toBeInTheDocument();
    });
  });

  it('displays error banner and does not claim success when merge fails', async () => {
    api.getIncidentDuplicates.mockImplementation(async () => [mockCandidateRQN0445]);
    api.mergeDuplicate.mockRejectedValueOnce(new Error('Database lock error during merge'));

    const onDuplicateMerged = vi.fn();
    const onShowToast = vi.fn();

    render(
      <DuplicateSuggestionsCard
        incident={mockIncidentRQN0444}
        onDuplicateMerged={onDuplicateMerged}
        onDuplicateDismissed={vi.fn()}
        onShowToast={onShowToast}
        onSelectIncident={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('RQN-0445')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Review & Merge/i }));
    fireEvent.click(screen.getByRole('button', { name: /Authorize Merge/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Database lock error during merge/i).length).toBeGreaterThanOrEqual(1);
    });

    // Merge callback was not called
    expect(onDuplicateMerged).not.toHaveBeenCalled();
  });

  it('displays Merged Duplicate banner when incident itself is marked as duplicate', () => {
    const mergedIncident = {
      ...mockIncidentRQN0444,
      is_duplicate: true,
      duplicate_of_id: 'RQN-0445',
      responseStatus: 'merged_duplicate',
    };

    const onSelectIncident = vi.fn();

    render(
      <DuplicateSuggestionsCard
        incident={mergedIncident}
        onDuplicateMerged={vi.fn()}
        onDuplicateDismissed={vi.fn()}
        onShowToast={vi.fn()}
        onSelectIncident={onSelectIncident}
      />
    );

    expect(screen.getByText(/Merged Duplicate Report/i)).toBeInTheDocument();
    expect(screen.getByText(/corroborated and merged into primary record/i)).toBeInTheDocument();

    const viewPrimaryBtn = screen.getByRole('button', { name: /View Primary Incident \(RQN-0445\)/i });
    expect(viewPrimaryBtn).toBeInTheDocument();

    fireEvent.click(viewPrimaryBtn);
    expect(onSelectIncident).toHaveBeenCalledWith('RQN-0445');
  });
});
