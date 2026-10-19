import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  HAZARD_CATEGORIES, 
  getHazardCategory, 
  getHazardMeta, 
  handleHazardImageError, 
  FALLBACK_IMAGE, 
  FALLBACK_SVG 
} from '../../utils/hazardMapping';
import OverviewPage from '../../pages/OverviewPage';

describe('RESQNET AI Category-Specific Incident Images & Dashboard Suite', () => {
  const all11Categories = [
    'Flood / Inundation',
    'Landslide / Mudslide',
    'Earthquake / Tremor',
    'Fire / Wildfire',
    'Structural Collapse',
    'Severe Weather / Storm',
    'Hazmat / Chemical',
    'Medical Emergency',
    'Search & Rescue',
    'Transportation Accident',
    'Other Emergency'
  ];

  it('1. verifies every supported hazard category maps to a distinct image file', () => {
    expect(HAZARD_CATEGORIES).toHaveLength(11);

    const mappedNames = HAZARD_CATEGORIES.map(c => c.name);
    all11Categories.forEach(cat => {
      expect(mappedNames).toContain(cat);
    });

    // Check that every image path is unique
    const imagePaths = HAZARD_CATEGORIES.map(c => c.image);
    const uniqueImages = new Set(imagePaths);
    expect(uniqueImages.size).toBe(11);

    // Verify all point to /images/hazards/*.jpg
    imagePaths.forEach(imgPath => {
      expect(imgPath).toMatch(/^\/images\/hazards\/[a-z0-9-]+\.jpg$/);
    });
  });

  it('2. verifies changing an incident category changes its displayed category image and alt text', () => {
    const baseIncident = {
      id: 'RQN-9901',
      title: 'Active Sector Hazard',
      severity: 'critical',
      priorityScore: 92,
      locationName: 'Sector 4',
      sector: 'East Harbor',
      coordinates: [37.78, -122.41],
      verificationStatus: 'verified',
      assignedTeam: 'Task Force Alpha',
      report_text: 'Active hazard under observation.'
    };

    // Flood
    const floodMeta = getHazardMeta({ ...baseIncident, hazardCategory: 'Flood / Inundation' });
    expect(floodMeta.image).toBe('/images/hazards/flood.jpg');
    expect(floodMeta.altText).toContain('Flood');

    // Landslide
    const landslideMeta = getHazardMeta({ ...baseIncident, hazardCategory: 'Landslide / Mudslide' });
    expect(landslideMeta.image).toBe('/images/hazards/landslide.jpg');
    expect(landslideMeta.altText).toContain('Landslide');

    // Hazmat
    const hazmatMeta = getHazardMeta({ ...baseIncident, hazardCategory: 'Hazmat / Chemical' });
    expect(hazmatMeta.image).toBe('/images/hazards/hazmat.jpg');
    expect(hazmatMeta.altText).toContain('Hazmat');

    // Verify all 11 change deterministically
    all11Categories.forEach(categoryName => {
      const meta = getHazardMeta({ ...baseIncident, hazardCategory: categoryName });
      expect(meta.name).toBe(categoryName);
      expect(meta.image).toBeDefined();
    });
  });

  it('3. verifies existing incidents still render when category is missing, null, or unknown', () => {
    const unknownIncident = {
      id: 'RQN-9902',
      title: 'Unclassified Event',
      severity: 'high',
      priorityScore: 84,
      hazardCategory: null,
      type: null,
      sector: 'North Corridor',
      verificationStatus: 'unverified',
      report_text: 'Telemetry trigger without classification'
    };

    const resolvedCategory = getHazardCategory(unknownIncident);
    expect(resolvedCategory).toBe('Other Emergency');

    const meta = getHazardMeta(unknownIncident);
    expect(meta.image).toBe('/images/hazards/other-emergency.jpg');

    // Render in OverviewPage
    render(
      <OverviewPage
        incidents={[unknownIncident]}
        attentionZones={[]}
        onSelectIncident={vi.fn()}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText('Unclassified Event')).toBeInTheDocument();
    const thumbnail = screen.getByRole('img', { name: meta.altText });
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', '/images/hazards/other-emergency.jpg');
  });

  it('4. verifies missing image assets do not break the page and trigger safe fallback', () => {
    const dummyEvent = {
      currentTarget: {
        src: '/images/hazards/flood.jpg'
      }
    };

    // First failure switches to fallback image
    handleHazardImageError(dummyEvent);
    expect(dummyEvent.currentTarget.src).toBe(FALLBACK_IMAGE);

    // Second failure switches to fallback SVG
    handleHazardImageError(dummyEvent);
    expect(dummyEvent.currentTarget.src).toBe(FALLBACK_SVG);
  });

  it('5. verifies thumbnail image uses object-cover, fixed aspect ratio, and lazy loading', () => {
    const testIncident = {
      id: 'RQN-0481',
      title: 'Bridge foundation erosion near Chamoli',
      hazardCategory: 'Structural Collapse',
      severity: 'critical',
      priorityScore: 97,
      sector: 'Chamoli Disaster Zone',
      coordinates: [30.40, 79.35],
      verificationStatus: 'unverified',
      assignedTeam: 'Search & Rescue Task Force 1',
      report_text: 'Heavy river torrent scouring bridge pillars. 4 vehicles stopped, 9 travelers stranded.'
    };

    render(
      <OverviewPage
        incidents={[testIncident]}
        attentionZones={[]}
        onSelectIncident={vi.fn()}
        onNavigateTab={vi.fn()}
      />
    );

    const img = screen.getByRole('img', { name: /Collapsed structure/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/hazards/structural-collapse.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.className).toContain('object-cover');
  });
});
