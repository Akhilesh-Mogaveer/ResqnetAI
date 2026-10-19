import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TopNav from '../TopNav';
import NewIncidentModal from '../NewIncidentModal';
import OverviewPage from '../../pages/OverviewPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    classifyText: vi.fn(),
    createIncident: vi.fn(),
  }
}));

describe('RESQNET AI Dashboard Header (TopNav)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T14:41:48.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the breadcrumb "Coordination > Operations Overview" and updates dynamic local clock', () => {
    render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
      />
    );

    // 1. Breadcrumb check
    expect(screen.getByText('Coordination')).toBeInTheDocument();
    expect(screen.getByText('Operations Overview')).toBeInTheDocument();

    // 2. Local date/time operational context
    const clockText = screen.getByText(/LOCAL/);
    expect(clockText).toBeInTheDocument();

    // Fast-forward time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Timestamp updates dynamically
    expect(screen.getByText(/LOCAL/)).toBeInTheDocument();
  });

  it('renders a prominent blue "Submit Report" button and NO blue sparkle-only button', () => {
    const handleOpen = vi.fn();
    render(
      <TopNav
        activeTabName="Operations Overview"
        onOpenNewIncident={handleOpen}
        backendConnected={true}
      />
    );

    // Submit Report button is present
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveClass('bg-blue-600');

    // Clicking it triggers handleOpen
    fireEvent.click(submitBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);

    // Ensure the old "+ New Report" with sparkle is gone
    expect(screen.queryByText('+ New Report')).not.toBeInTheDocument();
  });

  it('preserves Simulate Alert, Export SITREP, and Lead Coordinator profile controls', () => {
    const onSimulate = vi.fn();
    const onExport = vi.fn();

    render(
      <TopNav
        activeTabName="Operations Overview"
        onSimulateIncoming={onSimulate}
        onOpenExportBrief={onExport}
        backendConnected={true}
      />
    );

    // Simulate Alert
    const simulateBtn = screen.getByRole('button', { name: /Simulate Alert/i });
    expect(simulateBtn).toBeInTheDocument();
    fireEvent.click(simulateBtn);
    expect(onSimulate).toHaveBeenCalledTimes(1);

    // Export SITREP
    const exportBtn = screen.getByRole('button', { name: /Export SITREP/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);

    // User profile
    expect(screen.getByText('Jordan Davis')).toBeInTheDocument();
    expect(screen.getByText('Lead Coordinator')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders notification button with internal badge and handles click and unread count', () => {
    const onNotificationClick = vi.fn();
    render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
        onNotificationClick={onNotificationClick}
        unreadNotificationsCount={3}
      />
    );

    const notifBtn = screen.getByRole('button', { name: /Tactical Notifications/i });
    expect(notifBtn).toBeInTheDocument();
    expect(notifBtn).toHaveClass('w-8', 'h-8');

    // Verify unread alert badge is rendered
    expect(screen.getByLabelText(/3 unread alerts/i)).toBeInTheDocument();

    // Clicking notification button triggers callback and clears badge
    fireEvent.click(notifBtn);
    expect(onNotificationClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/unread alerts/i)).not.toBeInTheDocument();
  });

  it('renders compact Ctrl+K shortcut hint in quick search and focuses search input on Ctrl+K', () => {
    render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
      />
    );

    const searchInput = screen.getByRole('textbox', { name: /Quick Search/i });
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();

    // Trigger Ctrl+K keydown
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(searchInput).toHaveFocus();
  });

  it('renders compact Backend Connected indicator for online and offline states', () => {
    const { rerender } = render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
      />
    );

    expect(screen.getByText('Backend Connected')).toBeInTheDocument();

    // Rerender in offline fallback state
    rerender(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={false}
      />
    );
    expect(screen.getByText('Offline (Local Fallback)')).toBeInTheDocument();
  });
});

describe('OverviewPage Hero Banner Refinement', () => {
  it('renders hero title, description, and Live SitRep while removing the 3 red-boxed metric cards', () => {
    render(
      <OverviewPage
        incidents={[]}
        attentionZones={[]}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
        onNavigateTab={vi.fn()}
        onDispatchScout={vi.fn()}
        onVerifyStatusChange={vi.fn()}
        onResponseStatusChange={vi.fn()}
        backendConnected={true}
      />
    );

    // Kept items
    expect(screen.getByText('Emergency Response Operations Overview')).toBeInTheDocument();
    expect(screen.getByText('Live SitRep')).toBeInTheDocument();
    expect(screen.getByText(/Real-time multi-hazard coordination dashboard/i)).toBeInTheDocument();

    // Removed red-boxed hero metric cards
    expect(screen.queryByText(/Median Triage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Est\. Affected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Active Fleet/i)).not.toBeInTheDocument();
  });
});

describe('NewIncidentModal Submission & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required fields before calling backend API', async () => {
    const onToast = vi.fn();
    const onCreated = vi.fn();

    render(
      <NewIncidentModal
        isOpen={true}
        onClose={vi.fn()}
        onIncidentCreated={onCreated}
        onShowToast={onToast}
      />
    );

    // Try submitting with empty fields
    const form = screen.getByRole('button', { name: /Submit Report/i }).closest('form');
    fireEvent.submit(form);

    expect(onToast).toHaveBeenCalledWith('Incident title is required.', 'alert');
    expect(api.createIncident).not.toHaveBeenCalled();
  });

  it('validates coordinate boundaries if provided', async () => {
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
      target: { value: 'Landslide on Hill Road' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
      target: { value: 'Mud and boulders blocking road' }
    });

    // Enter invalid latitude > 90
    fireEvent.change(screen.getByPlaceholderText(/11.6854/i), {
      target: { value: '150.0' }
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    expect(onToast).toHaveBeenCalledWith('Latitude must be between -90 and 90.', 'alert');
    expect(api.createIncident).not.toHaveBeenCalled();
  });

  it('submits report to api.createIncident and handles success state', async () => {
    const fakeIncident = {
      id: 'RQN-0499',
      title: 'Flash flooding near Pier 14',
      type: 'Flood / Inundation',
      sector: 'East Harbor District',
      locationName: 'Pier 14 Slipway',
      coordinates: [37.794, -122.392],
      severity: 'critical',
      priorityScore: 88,
      peopleAffected: '15 people stranded',
      report_text: 'Flooding rapid surge water level rising.',
    };

    api.createIncident.mockResolvedValueOnce(fakeIncident);

    const onCreated = vi.fn();
    const onToast = vi.fn();
    const onClose = vi.fn();

    render(
      <NewIncidentModal
        isOpen={true}
        onClose={onClose}
        onIncidentCreated={onCreated}
        onShowToast={onToast}
      />
    );

    // Fill title
    fireEvent.change(screen.getByPlaceholderText(/Flash flooding/i), {
      target: { value: 'Flash flooding near Pier 14' }
    });

    // Fill narrative
    fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
      target: { value: 'Flooding rapid surge water level rising.' }
    });

    // Fill casualties
    fireEvent.change(screen.getByPlaceholderText(/5 injured/i), {
      target: { value: '15 people stranded' }
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createIncident).toHaveBeenCalledTimes(1);
    });

    expect(api.createIncident).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Flash flooding near Pier 14',
      report_text: 'Flooding rapid surge water level rising.',
      peopleAffected: '15 people stranded',
      type: 'Flood / Inundation',
      run_nlp_classification: true
    }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(fakeIncident);
      expect(onClose).toHaveBeenCalled();
      expect(onToast).toHaveBeenCalledWith(
        expect.stringContaining('RQN-0499 submitted and persisted'),
        'success'
      );
    });
  });

  it('displays error state if api.createIncident fails', async () => {
    api.createIncident.mockRejectedValueOnce(new Error('Network failure 500'));

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
      target: { value: 'Severe collapse' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Rising floodwater/i), {
      target: { value: 'Structure roof cave-in' }
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Network failure 500')).toBeInTheDocument();
      expect(onToast).toHaveBeenCalledWith(
        'Failed to create incident: Network failure 500',
        'alert'
      );
    });
  });
});
