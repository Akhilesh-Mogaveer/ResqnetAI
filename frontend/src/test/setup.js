import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import React from 'react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }) => React.createElement('div', { 'data-testid': 'leaflet-container', className }, children),
  TileLayer: ({ url, attribution }) => React.createElement('div', { 'data-testid': 'tile-layer', 'data-url': url, 'data-attribution': attribution }),
  Marker: ({ children, position, eventHandlers }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'map-marker',
        'data-position': JSON.stringify(position),
        onClick: eventHandlers?.click,
      },
      children
    ),
  Popup: ({ children }) => React.createElement('div', { 'data-testid': 'marker-popup' }, children),
  Circle: ({ children }) => React.createElement('div', { 'data-testid': 'map-circle' }, children),
  useMap: () => ({
    flyTo: vi.fn(),
    getZoom: () => 13,
    invalidateSize: vi.fn(),
    fitBounds: vi.fn(),
  }),
  useMapEvents: () => null,
}));

afterEach(() => {
  cleanup();
});
