import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationCenterDropdown from '../NotificationCenterDropdown';
import TopNav from '../TopNav';

describe('RESQNET AI — Global Tactical Notification Center Suite', () => {
  const mockNotifications = [
    {
      id: 'notif-001',
      type: 'incident_created',
      incident_id: 'RQN-0721',
      title: 'New critical incident reported — RQN-0721',
      message: 'Severe Gas Odor in Market in West Market Square. Priority: 92/100. Status: unverified.',
      source: 'website',
      severity: 'critical',
      priority_score: 92,
      is_read: false,
      recipient_role: 'coordinator',
      created_at: new Date(Date.now() - 120000).toISOString(), // 2m ago
      metadata: { incident_id: 'RQN-0721', severity: 'critical' }
    },
    {
      id: 'notif-002',
      type: 'incident_created',
      incident_id: 'RQN-0722',
      title: 'New SMS report received — RQN-0722',
      message: 'Flash flood at railway underpass in Udupi Central. Priority: 78/100. Status: unverified.',
      source: 'sms_simulated',
      severity: 'high',
      priority_score: 78,
      is_read: false,
      recipient_role: 'coordinator',
      created_at: new Date(Date.now() - 300000).toISOString(), // 5m ago
      metadata: { incident_id: 'RQN-0722', severity: 'high' }
    },
    {
      id: 'notif-003',
      type: 'incident_created',
      incident_id: 'RQN-0723',
      title: 'New sensor-generated incident — RQN-0723',
      message: 'SCADA Pressure Drop Alarm in Lower Marina Basin. Priority: 65/100. Status: unverified.',
      source: 'sensor',
      severity: 'moderate',
      priority_score: 65,
      is_read: true,
      recipient_role: 'coordinator',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1h ago
      metadata: { incident_id: 'RQN-0723', severity: 'moderate' }
    }
  ];

  it('renders unread badge count on TopNav notification bell', () => {
    render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
        unreadNotificationsCount={2}
        notifications={mockNotifications}
      />
    );

    const bellBtn = screen.getByRole('button', { name: /Tactical Notifications/i });
    expect(bellBtn).toBeInTheDocument();

    const badge = screen.getByLabelText(/2 unread alerts/i);
    expect(badge).toBeInTheDocument();
  });

  it('toggles NotificationCenterDropdown panel when bell is clicked', () => {
    render(
      <TopNav
        activeTabName="Operations Overview"
        backendConnected={true}
        unreadNotificationsCount={2}
        notifications={mockNotifications}
      />
    );

    const bellBtn = screen.getByRole('button', { name: /Tactical Notifications/i });
    expect(screen.queryByText(/Tactical Notification Center/i)).not.toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(bellBtn);
    expect(screen.getByText(/Tactical Notification Center/i)).toBeInTheDocument();
    expect(screen.getByTestId('unread-count-pill')).toHaveTextContent('2 unread');

    // Click again to close
    fireEvent.click(bellBtn);
    expect(screen.queryByText(/Tactical Notification Center/i)).not.toBeInTheDocument();
  });

  it('renders distinct reporting source labels, severity badges, and priority scores', () => {
    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    // Verify reporting sources
    expect(screen.getByText('CITIZEN WEB')).toBeInTheDocument();
    expect(screen.getByText('SIMULATED SMS')).toBeInTheDocument();
    expect(screen.getByText('SENSOR IOT')).toBeInTheDocument();

    // Verify severities (exact string match for badge)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MODERATE')).toBeInTheDocument();

    // Verify priority scores
    expect(screen.getByText(/PRIO 92/i)).toBeInTheDocument();
    expect(screen.getByText(/PRIO 78/i)).toBeInTheDocument();
    expect(screen.getByText(/PRIO 65/i)).toBeInTheDocument();

    // Verify incident references
    expect(screen.getByText('RQN-0721')).toBeInTheDocument();
    expect(screen.getByText('RQN-0722')).toBeInTheDocument();
    expect(screen.getByText('RQN-0723')).toBeInTheDocument();

    // Verify unverified status is clearly displayed
    const unverifiedPills = screen.getAllByText('UNVERIFIED');
    expect(unverifiedPills.length).toBe(3);
  });

  it('filters between All and Unread notifications', () => {
    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    // Initial: All (3)
    expect(screen.getByText('RQN-0721')).toBeInTheDocument();
    expect(screen.getByText('RQN-0722')).toBeInTheDocument();
    expect(screen.getByText('RQN-0723')).toBeInTheDocument();

    // Filter to Unread (2)
    const unreadTab = screen.getByRole('button', { name: /Unread \(2\)/i });
    fireEvent.click(unreadTab);

    expect(screen.getByText('RQN-0721')).toBeInTheDocument();
    expect(screen.getByText('RQN-0722')).toBeInTheDocument();
    expect(screen.queryByText('RQN-0723')).not.toBeInTheDocument(); // read notification hidden
  });

  it('clicking a notification opens exact incident, navigates to incidents tab, and marks read', () => {
    const handleSelectIncident = vi.fn();
    const handleNavigateTab = vi.fn();
    const handleMarkRead = vi.fn();
    const handleClose = vi.fn();

    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={handleClose}
        notifications={mockNotifications}
        unreadCount={2}
        onSelectIncident={handleSelectIncident}
        onNavigateTab={handleNavigateTab}
        onMarkRead={handleMarkRead}
      />
    );

    // Click RQN-0721 notification
    const item = screen.getByText('New critical incident reported — RQN-0721').closest('div[class*="cursor-pointer"]');
    expect(item).not.toBeNull();
    fireEvent.click(item);

    // 1. Opens exact incident
    expect(handleSelectIncident).toHaveBeenCalledWith('RQN-0721');

    // 2. Navigates to incidents tab
    expect(handleNavigateTab).toHaveBeenCalledWith('incidents');

    // 3. Marks notification as read
    expect(handleMarkRead).toHaveBeenCalledWith('notif-001');

    // 4. Closes dropdown
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkAllRead when Mark All Read button is clicked', () => {
    const handleMarkAllRead = vi.fn();

    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkAllRead={handleMarkAllRead}
      />
    );

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
    expect(markAllBtn).toBeInTheDocument();
    fireEvent.click(markAllBtn);

    expect(handleMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no notifications', () => {
    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={vi.fn()}
        notifications={[]}
        unreadCount={0}
      />
    );

    expect(screen.getByText(/No notifications in history/i)).toBeInTheDocument();
    expect(screen.getByText(/All emergency reports and automated sensor feeds have been acknowledged/i)).toBeInTheDocument();
  });

  it('renders loading state when synchronizing', () => {
    render(
      <NotificationCenterDropdown
        isOpen={true}
        onClose={vi.fn()}
        notifications={[]}
        unreadCount={0}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Synchronizing persistent notifications.../i)).toBeInTheDocument();
  });
});
