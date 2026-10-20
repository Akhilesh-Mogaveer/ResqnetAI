import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnimatedPriorityScore from '../AnimatedPriorityScore';
import OverviewPage from '../../pages/OverviewPage';
import PriorityQueuePage from '../../pages/PriorityQueuePage';
import IncidentsPage from '../../pages/IncidentsPage';
import IncidentDetailPanel from '../IncidentDetailPanel';
import { getHazardMeta } from '../../utils/hazardMapping';

describe('RESQNET AI — Compact Incident Cards & Animated Priority Score Suite', () => {
  const sampleIncidents = [
    {
      id: 'RQN-0481',
      title: 'Bridge foundation erosion near Chamoli Disaster Zone with rapidly widening fissure',
      severity: 'critical',
      priorityScore: 97,
      sector: 'Chamoli Disaster Zone',
      locationName: 'Alaknanda River Crossing Sector B',
      timeAgo: '4 min ago',
      verificationStatus: 'verified',
      assignedTeam: 'Search & Rescue Task Force 1',
      report_text: 'Heavy river torrent scouring bridge foundation pillars. 4 vehicles stopped, 9 travelers stranded.',
      casualties: 2,
      hazardCategory: 'Structural Collapse'
    },
    {
      id: 'RQN-0512',
      title: 'Flash flooding across main market corridor',
      severity: 'high',
      priorityScore: 78,
      sector: 'North Hub',
      locationName: 'Market Square',
      timeAgo: '12 min ago',
      verificationStatus: 'unverified',
      assignedTeam: null,
      report_text: 'Water level reached 3 feet. Ground floor shops flooded.',
      casualties: 0,
      hazardCategory: 'Flood / Inundation'
    },
    {
      id: 'RQN-0623',
      title: 'Power grid line sparking after tree fall',
      severity: 'moderate',
      priorityScore: 54,
      sector: 'West Hills',
      locationName: 'Substation 4',
      timeAgo: '28 min ago',
      verificationStatus: 'unverified',
      assignedTeam: null,
      report_text: 'Sparks observed on overhead line, fire department notified.',
      hazardCategory: 'Fire / Wildfire'
    },
    {
      id: 'RQN-0734',
      title: 'Minor road obstruction due to loose gravel',
      severity: 'low',
      priorityScore: 32,
      sector: 'South Ridge',
      locationName: 'Highway 12 Km 4',
      timeAgo: '45 min ago',
      verificationStatus: 'verified',
      assignedTeam: 'Logistics Alpha',
      report_text: 'Traffic moving slowly around debris.',
      hazardCategory: 'Landslide / Mudslide'
    }
  ];

  describe('1. AnimatedPriorityScore Component', () => {
    it('renders numerical score as primary focal point and smaller /100 denominator', () => {
      render(
        <AnimatedPriorityScore
          score={97}
          severity="critical"
          size="md"
          showDenominator={true}
          showLabel={true}
          label="Priority"
        />
      );

      // Score is prominent
      expect(screen.getByText('97')).toBeInTheDocument();
      // /100 is smaller secondary label
      expect(screen.getByText('/100')).toBeInTheDocument();
      // Label is rendered
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    it('has complete accessibility attributes for progressbar role', () => {
      render(
        <AnimatedPriorityScore
          score={85}
          severity="critical"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '85');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute('aria-label', 'Priority score: 85 out of 100');
    });

    it('clamps scores safely between 0 and 100 without mutating display logic', () => {
      const { rerender } = render(
        <AnimatedPriorityScore score={145} severity="critical" />
      );
      expect(screen.getByText('100')).toBeInTheDocument();

      rerender(<AnimatedPriorityScore score={-25} severity="low" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('applies severity-aware colors and subtle glow for critical emergencies', () => {
      const { container, rerender } = render(
        <AnimatedPriorityScore score={95} severity="critical" />
      );

      // Critical glow
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar.className).toContain('drop-shadow');

      // Moderate emergency
      rerender(<AnimatedPriorityScore score={55} severity="moderate" />);
      expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('respects prefers-reduced-motion without throwing errors', () => {
      // Mock window.matchMedia for reduced motion
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<AnimatedPriorityScore score={88} severity="high" />);
      expect(screen.getByText('88')).toBeInTheDocument();

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('2. Compact Three-Column Incident Cards (OverviewPage)', () => {
    it('renders a compact three-column layout with severity rank, image + info, and score + action', () => {
      const onSelect = vi.fn();
      const onNavigate = vi.fn();

      render(
        <OverviewPage
          incidents={sampleIncidents}
          attentionZones={[]}
          onSelectIncident={onSelect}
          onNavigateTab={onNavigate}
        />
      );

      // 1. Severity Rank Indicator in column 1
      expect(screen.getAllByText('01').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/critical/i).length).toBeGreaterThan(0);

      // 2. Center column: Thumbnail with consistent aspect ratio
      const thumbnails = screen.getAllByRole('img');
      expect(thumbnails.length).toBeGreaterThanOrEqual(sampleIncidents.length);
      const firstImg = screen.getByRole('img', { name: /Collapsed structure/i });
      expect(firstImg).toBeInTheDocument();
      expect(firstImg).toHaveAttribute('src', '/images/hazards/structural-collapse.jpg');
      expect(firstImg).toHaveAttribute('loading', 'lazy');
      expect(firstImg.className).toContain('object-cover');

      // Title & ID & Casualties
      expect(screen.getByText(/Bridge foundation erosion/i)).toBeInTheDocument();
      expect(screen.getByText('RQN-0481')).toBeInTheDocument();
      expect(screen.getByText(/2 casualties/i)).toBeInTheDocument();

      // 3. Right column: Animated priority score + Review/Manage button
      expect(screen.getAllByText('97').length).toBeGreaterThan(0);
      const reviewBtns = screen.getAllByRole('button', { name: /Review and manage incident/i });
      expect(reviewBtns.length).toBe(sampleIncidents.length);

      // Vertically centered alignment test (button triggers navigation)
      fireEvent.click(reviewBtns[0]);
      expect(onSelect).toHaveBeenCalledWith(sampleIncidents[0]);
      expect(onNavigate).toHaveBeenCalledWith('incidents');
    });

    it('maintains consistent image mapping across categories without hardcoded flood images', () => {
      sampleIncidents.forEach(inc => {
        const meta = getHazardMeta(inc);
        expect(meta.image).toBeDefined();
        expect(meta.image).toMatch(/^\/images\/hazards\/[a-z0-9-]+\.jpg$/);
      });
    });

    it('gracefully wraps and truncates long titles and descriptions', () => {
      const veryLongIncident = {
        ...sampleIncidents[0],
        id: 'RQN-LONG',
        title: 'Extremely long incident report title detailing an extensive regional disaster stretching across multiple municipal administrative sectors and highway routes',
        report_text: 'An exceptionally verbose eyewitness submission that describes meteorological occurrences, structural fissures, water table elevation, transportation bottlenecks, and civilian evacuations in excessive detail spanning many sentences.'
      };

      render(
        <OverviewPage
          incidents={[veryLongIncident]}
          attentionZones={[]}
          onSelectIncident={vi.fn()}
          onNavigateTab={vi.fn()}
        />
      );

      expect(screen.getByText(veryLongIncident.title)).toHaveClass('truncate');
      expect(screen.getByText(veryLongIncident.report_text)).toHaveClass('line-clamp-1');
    });
  });

  describe('3. Cross-Page Image & Score Consistency', () => {
    it('renders the same category image and animated score on PriorityQueuePage', () => {
      render(
        <PriorityQueuePage
          incidents={sampleIncidents}
          selectedIncident={sampleIncidents[0]}
          onSelectIncident={vi.fn()}
          onOpenOverrideModal={vi.fn()}
        />
      );

      // Shows category thumbnail on the queue card
      const floodImg = screen.getByRole('img', { name: /Flood and inundation/i });
      expect(floodImg).toBeInTheDocument();
      expect(floodImg).toHaveAttribute('src', '/images/hazards/flood.jpg');

      // Shows score
      expect(screen.getAllByText('97').length).toBeGreaterThan(0);
      expect(screen.getAllByText('78').length).toBeGreaterThan(0);
    });

    it('renders the same category image and animated score on IncidentsPage', () => {
      render(
        <IncidentsPage
          incidents={sampleIncidents}
          selectedIncident={sampleIncidents[0]}
          onSelectIncident={vi.fn()}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
        />
      );

      // Shows thumbnail on incident card
      const collapseImg = screen.getAllByRole('img', { name: /Collapsed structure/i });
      expect(collapseImg.length).toBeGreaterThan(0);
      expect(collapseImg[0]).toHaveAttribute('src', '/images/hazards/structural-collapse.jpg');

      // Shows priority score
      expect(screen.getAllByText('97').length).toBeGreaterThan(0);
    });

    it('renders the exact category image inside the selected IncidentDetailPanel', () => {
      render(
        <IncidentDetailPanel
          incident={sampleIncidents[0]}
          responseTeams={[]}
          onVerifyStatusChange={vi.fn()}
          onResponseStatusChange={vi.fn()}
          onAssignTeam={vi.fn()}
        />
      );

      const detailThumbnail = screen.getByRole('img', { name: /Collapsed structure/i });
      expect(detailThumbnail).toBeInTheDocument();
      expect(detailThumbnail).toHaveAttribute('src', '/images/hazards/structural-collapse.jpg');
    });
  });
});
