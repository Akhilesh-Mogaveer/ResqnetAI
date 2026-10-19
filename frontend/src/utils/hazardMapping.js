import React from 'react';
import {
  Waves,
  Mountain,
  Activity,
  Flame,
  Building2,
  CloudLightning,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  Car,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

/**
 * Deterministic Hazard Categories and their respective visual metadata.
 * Matches RESQNET AI intake schemas and the 11 official hazard categories.
 */
export const HAZARD_CATEGORIES = [
  {
    name: 'Flood / Inundation',
    slug: 'flood',
    image: '/images/hazards/flood.jpg',
    altText: 'Flood and inundation emergency scene',
    keywords: ['flood', 'inundation', 'submerged', 'flash flood', 'overflowing', 'river', 'water level', 'torrent'],
    color: '#21D4FD',
    bgBadge: 'bg-sky-950/70',
    textBadge: 'text-[#21D4FD]',
    borderBadge: 'border-sky-800/60',
    icon: Waves,
    iconColor: 'text-[#21D4FD]'
  },
  {
    name: 'Landslide / Mudslide',
    slug: 'landslide',
    image: '/images/hazards/landslide.jpg',
    altText: 'Landslide and mudslide collapsed slope',
    keywords: ['landslide', 'mudslide', 'debris flow', 'collapsed slope', 'rockfall', 'mud debris', 'slope collapse', 'soil slide'],
    color: '#FFB547',
    bgBadge: 'bg-amber-950/70',
    textBadge: 'text-[#FFB547]',
    borderBadge: 'border-amber-800/60',
    icon: Mountain,
    iconColor: 'text-[#FFB547]'
  },
  {
    name: 'Earthquake / Tremor',
    slug: 'earthquake',
    image: '/images/hazards/earthquake.jpg',
    altText: 'Earthquake rubble and structural tremor damage',
    keywords: ['earthquake', 'tremor', 'seismic', 'aftershock', 'fault', 'ground shake'],
    color: '#FF4566',
    bgBadge: 'bg-rose-950/70',
    textBadge: 'text-[#FF4566]',
    borderBadge: 'border-rose-800/60',
    icon: Activity,
    iconColor: 'text-[#FF4566]'
  },
  {
    name: 'Fire / Wildfire',
    slug: 'fire',
    image: '/images/hazards/fire.jpg',
    altText: 'Fire and wildfire smoke plume emergency',
    keywords: ['fire', 'wildfire', 'blaze', 'flames', 'forest fire', 'smoke', 'electrical spark', 'electrical arc', 'sparking'],
    color: '#FF6B4A',
    bgBadge: 'bg-orange-950/70',
    textBadge: 'text-[#FF6B4A]',
    borderBadge: 'border-orange-800/60',
    icon: Flame,
    iconColor: 'text-[#FF6B4A]'
  },
  {
    name: 'Structural Collapse',
    slug: 'structural-collapse',
    image: '/images/hazards/structural-collapse.jpg',
    altText: 'Collapsed structure and damaged building pillars',
    keywords: ['structural collapse', 'structural', 'collapse', 'collapsed', 'wall creep', 'cracked wall', 'bridge collapse', 'fissures', 'spalling', 'foundation erosion', 'infrastructure', 'infrastructure_and_utility_damage'],
    color: '#E056FD',
    bgBadge: 'bg-purple-950/70',
    textBadge: 'text-[#E056FD]',
    borderBadge: 'border-purple-800/60',
    icon: Building2,
    iconColor: 'text-[#E056FD]'
  },
  {
    name: 'Severe Weather / Storm',
    slug: 'severe-weather',
    image: '/images/hazards/severe-weather.jpg',
    altText: 'Severe storm and cyclone winds emergency',
    keywords: ['severe weather', 'storm', 'cyclone', 'hurricane', 'typhoon', 'gale', 'squall', 'lightning', 'heavy rain'],
    color: '#00D2D3',
    bgBadge: 'bg-teal-950/70',
    textBadge: 'text-[#00D2D3]',
    borderBadge: 'border-teal-800/60',
    icon: CloudLightning,
    iconColor: 'text-[#00D2D3]'
  },
  {
    name: 'Hazmat / Chemical',
    slug: 'hazmat',
    image: '/images/hazards/hazmat.jpg',
    altText: 'Hazmat and hazardous chemical plume venting emergency scene',
    keywords: ['hazmat', 'chemical', 'toxic', 'ammonia', 'plume', 'gas leak', 'spill', 'sulfur', 'fume', 'air quality'],
    color: '#FF4566',
    bgBadge: 'bg-rose-950/70',
    textBadge: 'text-[#FF4566]',
    borderBadge: 'border-rose-800/60',
    icon: FlaskConical,
    iconColor: 'text-[#FF4566]'
  },
  {
    name: 'Medical Emergency',
    slug: 'medical-emergency',
    image: '/images/hazards/medical-emergency.jpg',
    altText: 'Emergency medical triage and clinic scene',
    keywords: ['medical emergency', 'medical', 'hospital', 'ambulance', 'clinic', 'generator failure', 'injured', 'dead', 'casualty', 'trauma', 'injured_or_dead_people'],
    color: '#FF4757',
    bgBadge: 'bg-red-950/70',
    textBadge: 'text-[#FF4757]',
    borderBadge: 'border-red-800/60',
    icon: HeartPulse,
    iconColor: 'text-[#FF4757]'
  },
  {
    name: 'Search & Rescue',
    slug: 'search-rescue',
    image: '/images/hazards/search-rescue.jpg',
    altText: 'Search and rescue operations personnel',
    keywords: ['search & rescue', 'search and rescue', 'rescue', 'sar', 'trapped', 'stranded', 'lifeboat', 'rescue_volunteering_or_donation_effort', 'task force'],
    color: '#2ED573',
    bgBadge: 'bg-emerald-950/70',
    textBadge: 'text-[#2ED573]',
    borderBadge: 'border-emerald-800/60',
    icon: LifeBuoy,
    iconColor: 'text-[#2ED573]'
  },
  {
    name: 'Transportation Accident',
    slug: 'transportation-accident',
    image: '/images/hazards/transportation-accident.jpg',
    altText: 'Vehicle collision and transportation accident',
    keywords: ['transportation accident', 'transportation', 'accident', 'collision', 'vehicles in river', 'submerged vehicles', 'derailment', 'freight car', 'highway pileup', 'traffic'],
    color: '#FFA502',
    bgBadge: 'bg-amber-950/70',
    textBadge: 'text-[#FFA502]',
    borderBadge: 'border-amber-800/60',
    icon: Car,
    iconColor: 'text-[#FFA502]'
  },
  {
    name: 'Other Emergency',
    slug: 'other-emergency',
    image: '/images/hazards/other-emergency.jpg',
    altText: 'Emergency operations incident scene',
    keywords: ['other emergency', 'other', 'unknown', 'general', 'power outage'],
    color: '#70A1FF',
    bgBadge: 'bg-blue-950/70',
    textBadge: 'text-[#70A1FF]',
    borderBadge: 'border-blue-800/60',
    icon: ShieldAlert,
    iconColor: 'text-[#70A1FF]'
  }
];

export const FALLBACK_IMAGE = '/images/hazards/other-emergency.jpg';
export const FALLBACK_SVG = '/images/hazards/fallback.svg';

/**
 * Deterministically resolves the hazard category for an incident.
 * Inspects incident.hazardCategory, incident.type, incident.humaid_category,
 * title, and description text in strict priority order.
 *
 * @param {Object} incident
 * @returns {string} The canonical category name (one of the 11 supported)
 */
export function getHazardCategory(incident) {
  if (!incident) return 'Other Emergency';

  // 1. Explicit hazardCategory (e.g. from modal dropdown or API)
  if (incident.hazardCategory) {
    const directMatch = HAZARD_CATEGORIES.find(
      cat => cat.name.toLowerCase() === incident.hazardCategory.trim().toLowerCase()
    );
    if (directMatch) return directMatch.name;
  }

  // 2. Incident type property (e.g. 'Flood / Inundation', 'structural', 'hazmat')
  const typeStr = (incident.type || '').trim().toLowerCase();
  if (typeStr) {
    const directTypeMatch = HAZARD_CATEGORIES.find(
      cat => cat.name.toLowerCase() === typeStr || cat.slug === typeStr
    );
    if (directTypeMatch) return directTypeMatch.name;
  }

  // 3. Check keywords across type, title, whyPrioritised, and report text
  const searchCorpus = [
    incident.hazardCategory || '',
    incident.type || '',
    incident.humaid_category || '',
    incident.predicted_category || '',
    incident.title || '',
    incident.whyPrioritised || '',
    incident.description || '',
    incident.report_text || ''
  ].join(' ').toLowerCase();

  for (const cat of HAZARD_CATEGORIES) {
    if (cat.name === 'Other Emergency') continue;
    for (const kw of cat.keywords) {
      if (searchCorpus.includes(kw.toLowerCase())) {
        return cat.name;
      }
    }
  }

  return 'Other Emergency';
}

/**
 * Returns complete hazard metadata for an incident or category string.
 *
 * @param {Object|string} incidentOrCategory
 * @returns {Object} Hazard category metadata including image, slug, and styling
 */
export function getHazardMeta(incidentOrCategory) {
  const categoryName = typeof incidentOrCategory === 'string'
    ? incidentOrCategory
    : getHazardCategory(incidentOrCategory);

  const matched = HAZARD_CATEGORIES.find(
    cat => cat.name.toLowerCase() === (categoryName || '').trim().toLowerCase()
  );

  return matched || HAZARD_CATEGORIES[HAZARD_CATEGORIES.length - 1]; // Fallback to Other Emergency
}

/**
 * Safe image onError handler to prevent broken thumbnails.
 *
 * @param {Event} e React synthetic image error event
 */
export function handleHazardImageError(e) {
  const target = e.currentTarget || e.target;
  if (!target) return;
  if (target.src.endsWith('other-emergency.jpg')) {
    target.src = FALLBACK_SVG;
  } else if (!target.src.endsWith('fallback.svg')) {
    target.src = FALLBACK_IMAGE;
  }
}
