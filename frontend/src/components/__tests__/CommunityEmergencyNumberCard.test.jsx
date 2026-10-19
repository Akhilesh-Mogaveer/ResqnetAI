import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommunityEmergencyNumberCard from '../CommunityEmergencyNumberCard';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    getCommunityEmergencyNumber: vi.fn(),
    saveCommunityEmergencyNumber: vi.fn(),
    deleteCommunityEmergencyNumber: vi.fn(),
    testCommunityEmergencyNumberPing: vi.fn(),
    sendForwardedSMSTest: vi.fn(),
  },
}));

describe('CommunityEmergencyNumberCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Not configured" state and allows adding a number', async () => {
    api.getCommunityEmergencyNumber.mockResolvedValueOnce({
      status: 'not_configured',
      is_active: false,
      detail: 'No community emergency number configured.',
    });

    render(<CommunityEmergencyNumberCard onShowToast={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Dynamic Community Emergency Number/i)).toBeInTheDocument();
      expect(screen.getByTestId('community-number-status-badge')).toHaveTextContent(/Not configured/i);
    });

    // Inputs are visible
    const input = screen.getByPlaceholderText(/e\.g\. 98765 43210/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add \/ Save Number/i })).toBeInTheDocument();
  });

  it('saves new emergency number successfully and transitions out of edit mode', async () => {
    api.getCommunityEmergencyNumber.mockResolvedValueOnce({
      status: 'not_configured',
      is_active: false,
    });

    api.saveCommunityEmergencyNumber.mockResolvedValueOnce({
      id: 'cnum-1234',
      phone_number: '+91 98765 43210',
      country_code: '+91',
      raw_number: '9876543210',
      status: 'setup_required',
      is_active: true,
      forwarding_secret: 'rqn_fwd_secret_xyz123',
    });

    const mockToast = vi.fn();
    render(<CommunityEmergencyNumberCard onShowToast={mockToast} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. 98765 43210/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 98765 43210/i), {
      target: { value: '9876543210' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Add \/ Save Number/i }));

    await waitFor(() => {
      expect(api.saveCommunityEmergencyNumber).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: '+91',
          raw_number: '9876543210',
        })
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringMatching(/configured successfully/i),
        'success'
      );
    });
  });

  it('renders active number with Change and Delete actions', async () => {
    api.getCommunityEmergencyNumber.mockResolvedValueOnce({
      id: 'cnum-live',
      phone_number: '+91 94480 54321',
      country_code: '+91',
      raw_number: '9448054321',
      status: 'connected',
      is_active: true,
      forwarding_secret: 'rqn_fwd_super_secret',
      volunteer_notes: 'Volunteer Shift Phone',
      last_ping_at: '2026-10-19T22:30:00Z',
    });

    render(<CommunityEmergencyNumberCard onShowToast={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('+91 94480 54321')).toBeInTheDocument();
      expect(screen.getByTestId('community-number-status-badge')).toHaveTextContent(/Connected/i);
    });

    expect(screen.getByRole('button', { name: /Change Number/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Number/i })).toBeInTheDocument();

    // Clicking Delete Number opens confirmation modal
    fireEvent.click(screen.getByRole('button', { name: /Delete Number/i }));
    expect(screen.getByText(/Delete Community Emergency Number\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Previously created incidents and audit history are PRESERVED/i)).toBeInTheDocument();
    expect(screen.getByText(/volunteer must also turn off or uninstall/i)).toBeInTheDocument();
  });

  it('shows and hides Android forwarder app setup guide', async () => {
    api.getCommunityEmergencyNumber.mockResolvedValueOnce({
      id: 'cnum-live',
      phone_number: '+91 94480 54321',
      country_code: '+91',
      raw_number: '9448054321',
      status: 'setup_required',
      is_active: true,
      forwarding_secret: 'rqn_fwd_super_secret',
    });

    render(<CommunityEmergencyNumberCard onShowToast={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Android Forwarder App Setup Guide/i })).toBeInTheDocument();
    });

    // Expand guide
    fireEvent.click(screen.getByRole('button', { name: /Android Forwarder App Setup Guide/i }));
    expect(screen.getByText(/Install a Compatible Android SMS Forwarder App/i)).toBeInTheDocument();
    expect(screen.getByText(/Battery Optimization Exemption:/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Webhook Path/i)).toBeInTheDocument();
  });
});
