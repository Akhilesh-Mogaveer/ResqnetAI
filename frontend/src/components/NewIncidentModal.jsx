import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Send,
  Loader2,
  Brain,
  Search,
  Compass,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Radio,
  Info,
  Map as MapIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

function mapHumaidCategory(rawCategory) {
  if (!rawCategory) return 'Other Emergency';
  const norm = rawCategory.toLowerCase().replace(/_/g, ' ');
  if (norm.includes('flood') || norm.includes('water') || norm.includes('submerged')) return 'Flood / Inundation';
  if (norm.includes('landslide') || norm.includes('mudslide')) return 'Landslide / Mudslide';
  if (norm.includes('earthquake') || norm.includes('tremor')) return 'Earthquake / Tremor';
  if (norm.includes('fire') || norm.includes('wildfire')) return 'Fire / Wildfire';
  if (norm.includes('infrastructure') || norm.includes('damage') || norm.includes('collapse')) return 'Structural Collapse';
  if (norm.includes('storm') || norm.includes('weather') || norm.includes('cyclone') || norm.includes('hurricane')) return 'Severe Weather / Storm';
  if (norm.includes('rescue') || norm.includes('trapped')) return 'Search & Rescue';
  if (norm.includes('medical') || norm.includes('casualty') || norm.includes('injured')) return 'Medical Emergency';
  if (norm.includes('transport') || norm.includes('accident')) return 'Transportation Accident';
  return 'Other Emergency';
}

function formatHumaidSituationalNeed(cat) {
  if (!cat) return 'Unclassified / General Distress';
  const dict = {
    requests_or_urgent_needs: 'Requests or Urgent Needs',
    injured_or_dead_people: 'Injured or Dead People',
    infrastructure_and_utility_damage: 'Infrastructure & Utility Damage',
    displaced_people_and_evacuations: 'Displaced People & Evacuations',
    caution_and_advice: 'Caution & Advice',
    missing_or_found_people: 'Missing or Found People',
    other_relevant_information: 'Other Relevant Information',
    not_humanitarian: 'Not Humanitarian',
    sympathy_and_support: 'Sympathy & Support',
    dont_know_or_cant_judge: 'Cannot Determine (Uncertain)',
  };
  return dict[cat] || cat.replace(/_/g, ' ');
}

const SATELLITE_TILE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_SATELLITE_TILE_URL) ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community';

const STREETS_TILE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_STREETS_TILE_URL) ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREETS_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

function MapPreviewClickPicker({ onPickLocation }) {
  useMapEvents({
    click(e) {
      if (e.latlng && onPickLocation) {
        onPickLocation(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null && map && map.flyTo) {
      try {
        map.flyTo(center, zoom || 12, { duration: 0.5 });
      } catch {
        // Safe in test environments
      }
    }
  }, [center, zoom, map]);
  return null;
}

export default function NewIncidentModal({ isOpen, onClose, onIncidentCreated, onShowToast }) {
  const [title, setTitle] = useState('');
  const [hazardCategory, setHazardCategory] = useState('Flood / Inundation');
  const [sector, setSector] = useState('East Harbor District');
  const [locationName, setLocationName] = useState('');
  const [peopleAffected, setPeopleAffected] = useState('10 - 25 people');
  const [reportText, setReportText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Source Provenance
  const [reportSource, setReportSource] = useState('Officer/Phone Call');
  const [sourceReference, setSourceReference] = useState('');

  // NLP & Structuring State
  const [isClassifying, setIsClassifying] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [nlpPrediction, setNlpPrediction] = useState(null);
  const [structuredData, setStructuredData] = useState(null);

  // Geocoding Candidate State
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationCandidates, setLocationCandidates] = useState([]);
  const [locationResolutionTag, setLocationResolutionTag] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [basemapType, setBasemapType] = useState('satellite');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Leaflet Marker Icons
  const candidateIcon = useMemo(() => {
    try {
      if (typeof L !== 'undefined' && L.divIcon) {
        return L.divIcon({
          className: 'resqnet-candidate-pin',
          html: `<div style="background-color: #2563eb; color: white; border-radius: 9999px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      }
    } catch {
      // Safe fallback in test mock
    }
    return undefined;
  }, []);

  const confirmedIcon = useMemo(() => {
    try {
      if (typeof L !== 'undefined' && L.divIcon) {
        return L.divIcon({
          className: 'resqnet-confirmed-pin',
          html: `<div style="background-color: #059669; color: white; border-radius: 9999px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">✓</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      }
    } catch {
      // Safe fallback
    }
    return undefined;
  }, []);

  const mapCenter = useMemo(() => {
    const latF = parseFloat(latitude);
    const lngF = parseFloat(longitude);
    if (!isNaN(latF) && !isNaN(lngF) && latF >= -90 && latF <= 90 && lngF >= -180 && lngF <= 180) {
      return [latF, lngF];
    }
    if (locationCandidates.length > 0) {
      return [locationCandidates[0].latitude, locationCandidates[0].longitude];
    }
    return [13.3409, 74.7421];
  }, [latitude, longitude, locationCandidates]);

  const mapZoom = useMemo(() => {
    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) return 13;
    if (locationCandidates.length > 0) return 11;
    return 9;
  }, [latitude, longitude, locationCandidates]);

  if (!isOpen) return null;

  // 1. Quick HumAID Classification
  const handleClassify = async () => {
    if (!reportText.trim()) {
      onShowToast?.('Please enter message text before running classification.', 'info');
      return;
    }
    setIsClassifying(true);
    setNlpPrediction(null);
    try {
      const res = await api.classifyText(reportText);
      setNlpPrediction(res);
      if (res.status !== 'SUCCESS') {
        onShowToast?.(`HumAID classification unavailable: ${res.error || res.status}`, 'alert');
        return;
      }
      const catClean = mapHumaidCategory(res.predicted_category);
      setHazardCategory(catClean);
      onShowToast?.(`HumAID classified: ${catClean} (${(res.confidence * 100).toFixed(1)}%)`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast?.(`Classification error: ${err.message}`, 'alert');
    } finally {
      setIsClassifying(false);
    }
  };

  // 2. Full NLP Structuring of Messy Reports
  const handleStructureReport = async () => {
    if (!reportText.trim()) {
      onShowToast?.('Please enter message text before structuring report.', 'info');
      return;
    }
    setIsStructuring(true);
    setStructuredData(null);
    setErrorMsg(null);
    try {
      const res = await api.structureReport(reportText.trim());
      setStructuredData(res);

      // Populate category
      if (res.inferred_fields?.hazard_category) {
        const mapped = mapHumaidCategory(res.inferred_fields.hazard_category);
        setHazardCategory(mapped);
      }

      // Populate people affected if explicitly reported
      if (res.reported_facts?.people_affected_estimate && res.reported_facts.people_affected_estimate !== 'unknown') {
        setPeopleAffected(res.reported_facts.people_affected_estimate);
      }

      // Populate location clues if extracted
      if (res.reported_facts?.location_clues) {
        setLocationName(res.reported_facts.location_clues);
      }

      // Suggest title if empty
      if (!title.trim() && res.inferred_fields?.hazard_category) {
        const loc = res.reported_facts?.location_clues || sector;
        const cat = mapHumaidCategory(res.inferred_fields.hazard_category);
        setTitle(`${cat} reported at ${loc}`);
      }

      // Synchronize nlpPrediction state
      setNlpPrediction({
        predicted_category: res.inferred_fields.hazard_category,
        confidence: typeof res.inferred_fields.hazard_category_confidence === 'number'
          ? res.inferred_fields.hazard_category_confidence
          : res.inferred_fields.nlp_confidence,
        status: res.nlp_status,
        error: res.nlp_status === 'SUCCESS' ? undefined : 'Model classification unavailable',
      });

      onShowToast?.('Report analyzed & structured! Explicit facts separated from inferences.', 'success');
    } catch (err) {
      console.error(err);
      onShowToast?.(`Structuring error: ${err.message}`, 'alert');
    } finally {
      setIsStructuring(false);
    }
  };

  // 3. Resolve Location Candidates via Backend Gazetteer / Nominatim
  const handleResolveLocation = async (overrideQuery) => {
    const query = (typeof overrideQuery === 'string' ? overrideQuery : locationName).trim() || title.trim();
    if (!query) {
      setLocationWarning('Enter a landmark, place name, or title to resolve coordinates.');
      return;
    }
    setIsResolvingLocation(true);
    setLocationCandidates([]);
    setLocationWarning(null);
    setLocationResolutionTag(null);

    try {
      const res = await api.searchLocationCandidates(query);
      if (res && res.candidates && res.candidates.length > 0) {
        if (res.candidates.length === 1) {
          const c = res.candidates[0];
          setLatitude(c.latitude.toString());
          setLongitude(c.longitude.toString());
          setLocationResolutionTag(`Resolved: ${c.display_name} (${(c.confidence * 100).toFixed(0)}% via ${c.provider})`);
          onShowToast?.(`Resolved coordinates via ${c.provider}`, 'success');
        } else {
          setLocationCandidates(res.candidates);
          setShowMapPicker(true);
          onShowToast?.(`Found ${res.candidates.length} candidates. Please confirm one.`, 'info');
        }
      } else {
        setLocationWarning(`No exact coordinates found for '${query}'. Incident will be saved with Unresolved Location status.`);
      }
    } catch (err) {
      console.error(err);
      setLocationWarning(`Geocoding lookup failed: ${err.message}`);
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleSelectCandidate = (c) => {
    setLatitude(c.latitude.toString());
    setLongitude(c.longitude.toString());
    setLocationName(c.display_name);
    setLocationResolutionTag(`Selected: ${c.display_name} (${(c.confidence * 100).toFixed(0)}% via ${c.provider})`);
    setLocationCandidates([]);
    setLocationWarning(null);
    onShowToast?.(`Coordinates set to [${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}]`, 'success');
  };

  const handleClearCoordinates = () => {
    setLatitude('');
    setLongitude('');
    setLocationResolutionTag(null);
    setLocationCandidates([]);
    setLocationWarning(null);
  };

  const handleLeaveLocationUnresolved = () => {
    setLatitude('');
    setLongitude('');
    setLocationCandidates([]);
    setLocationWarning(null);
    setLocationResolutionTag('Unresolved Location (Preserved without fake coordinates)');
    onShowToast?.('Report marked with Unresolved Location. Rescue units will request field verification.', 'info');
  };

  const handleMapPinSelected = (lat, lng) => {
    setLatitude(lat.toFixed(5));
    setLongitude(lng.toFixed(5));
    setLocationCandidates([]);
    setLocationWarning(null);
    setLocationResolutionTag(`Manually pinned on map preview: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
    onShowToast?.(`Coordinates set to [${lat.toFixed(4)}, ${lng.toFixed(4)}] from map`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Incident title is required.');
      onShowToast?.('Incident title is required.', 'alert');
      return;
    }

    if (!reportText.trim()) {
      setErrorMsg('Incident description or message text is required.');
      onShowToast?.('Incident description or message text is required.', 'alert');
      return;
    }

    let userCoords = null;
    let locSource = 'unknown';
    let locStatus = 'unknown';

    if (latitude.trim() || longitude.trim()) {
      const latF = parseFloat(latitude);
      const lngF = parseFloat(longitude);
      if (isNaN(latF) || latF < -90 || latF > 90) {
        setErrorMsg('Latitude must be a valid coordinate between -90 and 90.');
        onShowToast?.('Latitude must be between -90 and 90.', 'alert');
        return;
      }
      if (isNaN(lngF) || lngF < -180 || lngF > 180) {
        setErrorMsg('Longitude must be a valid coordinate between -180 and 180.');
        onShowToast?.('Longitude must be between -180 and 180.', 'alert');
        return;
      }
      userCoords = [latF, lngF];
      if (locationResolutionTag && locationResolutionTag.includes('Selected:')) {
        locSource = 'geocoded';
        locStatus = 'candidate_selected';
      } else if (locationResolutionTag && locationResolutionTag.includes('Resolved:')) {
        locSource = 'geocoded';
        locStatus = 'resolved_verified';
      } else {
        locSource = 'user_supplied';
        locStatus = 'user_manual';
      }
    } else {
      locSource = 'unresolved_ambiguous';
      locStatus = 'unresolved_ambiguous';
    }

    setIsSubmitting(true);
    try {
      const formattedSourceSummary = sourceReference.trim()
        ? `${reportSource} [Ref: ${sourceReference.trim()}] - Intake via Emergency Report Form`
        : `${reportSource} - Intake via Emergency Report Form`;

      const payload = {
        title: title.trim(),
        type: hazardCategory || "Emergency Incident",
        sector,
        locationName: locationName.trim() || `${sector} Zone`,
        coordinates: userCoords,
        peopleAffected: peopleAffected.trim() || "Unknown count",
        report_text: reportText.trim(),
        rawReportText: reportText.trim(),
        report_source: reportSource,
        source_reference: sourceReference.trim() || null,
        sourceSummary: formattedSourceSummary,
        signalSynthesis: `Intake channel: ${reportSource}. Automated NLP & scoring applied.`,
        location_source: locSource,
        location_resolution_status: locStatus,
        run_nlp_classification: true,
      };

      const created = await api.createIncident(payload);
      onIncidentCreated(created);
      onShowToast?.(`Incident ${created.id} submitted and persisted to database!`, 'success');
      onClose();

      // Reset form
      setTitle('');
      setLocationName('');
      setReportText('');
      setLatitude('');
      setLongitude('');
      setHazardCategory('Flood / Inundation');
      setPeopleAffected('10 - 25 people');
      setReportSource('Officer/Phone Call');
      setSourceReference('');
      setNlpPrediction(null);
      setStructuredData(null);
      setLocationResolutionTag(null);
      setLocationCandidates([]);
      setLocationWarning(null);
      setShowMapPicker(false);
      setErrorMsg(null);
    } catch (err) {
      console.error("Failed to create incident:", err);
      setErrorMsg(err.message || 'Failed to submit incident report to backend.');
      onShowToast?.(`Failed to create incident: ${err.message}`, 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidCoordinates = latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2A3C]/35 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-elevated rounded-clay-modal max-w-2xl w-full p-6 shadow-clay-modal relative max-h-[90vh] overflow-y-auto text-text-primary">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-card transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-brand-primary font-mono text-xs uppercase tracking-wider mb-1 font-bold">
          <Brain className="w-4 h-4 text-brand-primary" />
          <span>Incident Intake & AI Structuring</span>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-3">Submit Emergency Incident Report</h2>

        {/* Multi-Step Wizard: Step Indicator as Clay Pills */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto py-1">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-clay-pill bg-surface-elevated text-brand-primary text-xs font-semibold shadow-clay-button border border-brand-primary/20">
            <span className="w-4 h-4 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Intake & Source</span>
          </div>
          <span className="text-text-muted text-xs">→</span>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-clay-pill bg-surface-inset text-text-secondary text-xs font-medium shadow-clay-inset">
            <span className="w-4 h-4 rounded-full bg-slate-300 text-text-primary flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Location & Coordinates</span>
          </div>
          <span className="text-text-muted text-xs">→</span>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-clay-pill bg-surface-inset text-text-secondary text-xs font-medium shadow-clay-inset">
            <span className="w-4 h-4 rounded-full bg-slate-300 text-text-primary flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Narrative & AI Structuring</span>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Section 1: Report Source Channel & Provenance */}
          <div className="p-4 rounded-clay-card bg-surface-card shadow-clay-card space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="report-source-channel" className="block text-text-secondary font-medium mb-1 flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Report Source Channel *</span>
                </label>
                <select
                  id="report-source-channel"
                  value={reportSource}
                  onChange={(e) => setReportSource(e.target.value)}
                  className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-sans"
                >
                  <option value="Officer/Phone Call">Officer/Phone Call</option>
                  <option value="SMS">SMS</option>
                  <option value="Field Responder">Field Responder</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary font-medium mb-1">
                  Source Reference / Identification (Optional)
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. CAD #5892, Radio Bravo-4, Rain Gauge #12, or Post ID"
                  className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono text-xs"
                />
              </div>
            </div>

            <div className="text-[10px] text-text-muted font-mono flex items-center space-x-1.5 pt-2 border-t border-slate-200/60">
              <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <span>
                Manual Intake Mode: Recording incoming reports received via {reportSource}. Automated SMS, social-media, or telecom carrier integrations are not currently active.
              </span>
            </div>
          </div>

          {/* Incident Headline / Title */}
          <div>
            <label className="block text-text-secondary font-medium mb-1">
              Incident Title / Headline *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. Flash flooding trapped civilian vehicles under arch"
              className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              required
            />
          </div>

          {/* Hazard Category, Sector, & Landmark Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">Hazard Category *</label>
              <select
                value={hazardCategory}
                onChange={(e) => setHazardCategory(e.target.value)}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-sans"
              >
                <option value="Flood / Inundation">Flood / Inundation</option>
                <option value="Landslide / Mudslide">Landslide / Mudslide</option>
                <option value="Earthquake / Tremor">Earthquake / Tremor</option>
                <option value="Fire / Wildfire">Fire / Wildfire</option>
                <option value="Structural Collapse">Structural Collapse</option>
                <option value="Severe Weather / Storm">Severe Weather / Storm</option>
                <option value="Hazmat / Chemical">Hazmat / Chemical</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Search & Rescue">Search & Rescue</option>
                <option value="Transportation Accident">Transportation Accident</option>
                <option value="Other Emergency">Other Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">Operational Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono"
              >
                <option value="East Harbor District">East Harbor District</option>
                <option value="Northgate Expressway">Northgate Expressway</option>
                <option value="West Market Square">West Market Square</option>
                <option value="South Ridge Estate">South Ridge Estate</option>
                <option value="Old Rail Corridor">Old Rail Corridor</option>
                <option value="Lower Marina Basin">Lower Marina Basin</option>
                <option value="Wayanad Relief Sector">Wayanad Relief Sector (Kerala)</option>
                <option value="Chamoli Disaster Zone">Chamoli Disaster Zone (Uttarakhand)</option>
                <option value="Mumbai Coastal Belt">Mumbai Coastal Belt (Maharashtra)</option>
                <option value="Brahmaputra Valley">Brahmaputra Valley (Assam)</option>
                <option value="Delhi NCR Command">Delhi NCR Command</option>
                <option value="Custom Sector">Other / Custom Sector</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-text-secondary font-medium">Named Landmark / Spot</label>
                <button
                  type="button"
                  onClick={() => handleResolveLocation()}
                  disabled={isResolvingLocation || (!locationName.trim() && !title.trim())}
                  className="flex items-center space-x-1 text-[11px] text-brand-primary hover:text-brand-hover disabled:opacity-40 font-mono font-semibold"
                  title="Search coordinates in Indian Gazetteer & OSM Geocoder"
                >
                  {isResolvingLocation ? (
                    <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />
                  ) : (
                    <Search className="w-3 h-3 text-brand-primary" />
                  )}
                  <span>Resolve</span>
                </button>
              </div>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Wayanad Relief Camp or Andheri Metro"
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          {/* Section 2: Location Candidates & Map Preview Drawer */}
          {locationCandidates.length > 1 && (
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-brand-primary flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Multiple Candidates Found — Confirm Location</span>
                </span>
                <span className="text-[10px] text-brand-primary font-mono bg-brand-primary/10 px-2 py-0.5 rounded-clay-pill">
                  {locationCandidates.length} options
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Multiple places matched this description. Select the correct landmark or click its pin on the preview map:
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {locationCandidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-surface-inset shadow-clay-inset rounded-clay-card flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <div className="font-semibold text-text-primary">{cand.display_name}</div>
                      <div className="text-[10px] font-mono text-text-muted">
                        [{cand.latitude.toFixed(4)}, {cand.longitude.toFixed(4)}] · Provider: {cand.provider} ({(cand.confidence * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className="px-2.5 py-1 rounded-clay-button clay-button-primary text-white font-bold text-[10px] transition-colors shadow-clay-button"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={handleLeaveLocationUnresolved}
                  className="text-[10px] text-brand-primary hover:text-brand-hover underline font-mono"
                >
                  Leave Location Unresolved (Save Without Coordinates)
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className="text-[10px] text-brand-primary font-mono font-semibold"
                >
                  {showMapPicker ? 'Hide Map Preview' : 'Show Map Preview'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Map Preview (Rendered on candidate search or user toggle) */}
          {(showMapPicker || locationCandidates.length > 0 || hasValidCoordinates) && (
            <div className="rounded-clay-card overflow-hidden shadow-clay-card bg-surface-card border border-slate-200/40">
              <div className="bg-surface-card px-3 py-2 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-text-secondary">
                <span className="flex items-center space-x-1.5 font-semibold text-text-primary">
                  <MapIcon className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Interactive Map Preview & Candidate Selection</span>
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-surface-inset rounded-clay-pill p-0.5 shadow-clay-inset">
                    <button
                      type="button"
                      onClick={() => setBasemapType('satellite')}
                      className={`px-2 py-0.5 rounded-clay-pill text-[10px] font-semibold transition-all ${
                        basemapType === 'satellite'
                          ? 'bg-brand-primary text-white shadow-clay-button'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Satellite
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasemapType('streets')}
                      className={`px-2 py-0.5 rounded-clay-pill text-[10px] font-semibold transition-all ${
                        basemapType === 'streets'
                          ? 'bg-brand-primary text-white shadow-clay-button'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Streets
                    </button>
                  </div>
                  <span className="text-[10px] text-text-muted hidden sm:inline">
                    Click map to pin coordinates
                  </span>
                </div>
              </div>
              <div className="h-48 w-full relative z-0">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    key={basemapType}
                    url={basemapType === 'satellite' ? SATELLITE_TILE_URL : STREETS_TILE_URL}
                    attribution={basemapType === 'satellite' ? SATELLITE_ATTRIBUTION : STREETS_ATTRIBUTION}
                    maxZoom={19}
                  />
                  <MapCenterController center={mapCenter} zoom={mapZoom} />
                  <MapPreviewClickPicker onPickLocation={handleMapPinSelected} />

                  {/* Render candidate markers */}
                  {locationCandidates.map((cand, idx) => (
                    <Marker
                      key={`candidate-pin-${idx}`}
                      position={[cand.latitude, cand.longitude]}
                      icon={candidateIcon}
                      eventHandlers={{
                        click: () => handleSelectCandidate(cand),
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <strong className="block text-slate-900">Pin: {cand.display_name}</strong>
                          <div className="text-[10px] text-slate-500 font-mono">
                            [{cand.latitude.toFixed(4)}, {cand.longitude.toFixed(4)}] · {cand.provider}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectCandidate(cand)}
                            className="mt-1 px-2 py-0.5 rounded-clay-button bg-blue-600 text-white font-bold text-[10px] shadow-clay-button"
                          >
                            Confirm Candidate Location
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Render selected marker */}
                  {hasValidCoordinates && (
                    <Marker
                      position={[parseFloat(latitude), parseFloat(longitude)]}
                      icon={confirmedIcon}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong className="block text-emerald-800">Confirmed Coordinates</strong>
                          <div className="text-[10px] font-mono text-slate-600">
                            [{parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}]
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              <div className="px-3 py-1.5 bg-surface-card border-t border-slate-200/60 text-[10px] text-text-muted font-mono flex items-center justify-between">
                <span>
                  {basemapType === 'satellite'
                    ? 'Satellite: Esri High-Resolution World Imagery · Click map to pin coordinates.'
                    : 'Basemap: OpenStreetMap Infrastructure · Click map to pin coordinates.'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className="text-brand-primary hover:text-brand-hover underline ml-2 font-semibold"
                >
                  {showMapPicker ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>
          )}

          {/* Location Resolution Status Tag / Warning */}
          {locationResolutionTag && (
            <div className="flex items-center justify-between p-2.5 rounded-clay-card bg-severity-success-soft text-severity-success text-[11px] shadow-clay-pill">
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-severity-success flex-shrink-0" />
                <span className="truncate font-mono font-medium">{locationResolutionTag}</span>
              </div>
              <button
                type="button"
                onClick={handleClearCoordinates}
                className="text-[10px] text-severity-success underline hover:opacity-80 ml-2 whitespace-nowrap font-bold"
              >
                Clear
              </button>
            </div>
          )}

          {locationWarning && (
            <div className="p-3 rounded-clay-card bg-severity-high-soft text-severity-high text-[11px] space-y-1.5 shadow-clay-pill">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-severity-high flex-shrink-0" />
                <span>{locationWarning}</span>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono pl-5">
                <button
                  type="button"
                  onClick={handleLeaveLocationUnresolved}
                  className="text-severity-high font-bold underline hover:opacity-80"
                >
                  Confirm as Unresolved Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-brand-primary underline hover:text-brand-hover font-semibold"
                >
                  Open Map Preview to Pin Point
                </button>
              </div>
            </div>
          )}

          {/* Optional User GPS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-clay-card bg-surface-card shadow-clay-card">
            <div>
              <label className="block text-text-secondary font-medium mb-1 text-[11px]">
                Latitude (Optional GPS: -90 to 90)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. 11.6854"
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1 text-[11px]">
                Longitude (Optional GPS: -180 to 180)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. 76.1320"
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2 text-[10px] text-text-muted font-mono flex items-center justify-between pt-1">
              <span>
                Coordinates are optional. If left blank, RESQNET preserves report as Unresolved Location without inventing fake coordinates.
              </span>
              <div className="flex items-center space-x-2">
                {!showMapPicker && (
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-brand-primary hover:text-brand-hover underline ml-2 whitespace-nowrap font-semibold"
                  >
                    Map Picker
                  </button>
                )}
                {(latitude || longitude) && (
                  <button
                    type="button"
                    onClick={handleClearCoordinates}
                    className="text-text-muted hover:text-text-primary underline ml-2 whitespace-nowrap font-medium"
                  >
                    Clear Coords
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Casualties & Affected Population + Automated Severity / Priority Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">Casualties & Affected Population *</label>
              <input
                type="text"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
                placeholder="e.g. 5 injured, 20 trapped, or 10-25 people"
                className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>

            <div className="p-3 rounded-clay-card bg-surface-card shadow-clay-card flex flex-col justify-center text-[11px]">
              <span className="font-mono text-brand-primary font-bold uppercase text-[10px] flex items-center space-x-1 mb-0.5">
                <Brain className="w-3.5 h-3.5 text-brand-primary" />
                <span>Automated Severity & Priority Engine</span>
              </span>
              <span className="text-text-muted text-[10px] leading-snug">
                Initial severity tier and priority score (0–100) are dynamically computed by the backend 5-factor scoring engine upon ingestion.
              </span>
            </div>
          </div>

          {/* Section 3: Verification Status & Scoring Protocol */}
          <div className="p-4 rounded-clay-card bg-surface-card shadow-clay-card space-y-2">
            {/* Unverified Default Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-clay-card bg-severity-high-soft text-text-primary text-[11px]">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-severity-high flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider font-mono text-[10px] text-severity-high">
                    Verification Status: UNVERIFIED (Default)
                  </span>
                  <div className="text-[10px] text-text-secondary">
                    All incoming reports default to unverified until evidence is corroborated by the Lead Operations Coordinator.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-clay-pill bg-white shadow-clay-pill text-severity-high font-mono font-bold text-[10px]">
                Pending Evidence
              </span>
            </div>

            <div className="text-[11px] text-text-muted font-mono bg-surface-inset shadow-clay-inset p-2.5 rounded-clay-card flex items-center justify-between">
              <span>
                Intake Protocol: Manual priority overrides are restricted to authenticated Lead Coordinators in the Operations Management console.
              </span>
              <span className="text-brand-primary font-bold ml-2 whitespace-nowrap">Auto-Score Active</span>
            </div>
          </div>

          {/* Section 4: Incident Description / Narrative with AI Structuring Tools */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <label className="block text-text-secondary font-medium">
                Incident Description / Distress Message *
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleStructureReport}
                  disabled={isStructuring || !reportText.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-mono text-[11px] disabled:opacity-40 transition-all font-bold shadow-clay-button"
                  title="Extract reported facts vs model-inferred fields from messy text"
                >
                  {isStructuring ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Structuring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-brand-primary" />
                      <span>Structure Messy Report</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClassify}
                  disabled={isClassifying || !reportText.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-surface-card hover:bg-slate-100 text-text-secondary font-mono text-[11px] disabled:opacity-40 transition-all shadow-clay-button font-medium"
                >
                  {isClassifying ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Classifying...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 text-brand-primary" />
                      <span>HumAID Classify</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={reportText}
              onChange={(e) => {
                setReportText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. Rising floodwater at the expressway underpass, 6 passenger vehicles trapped under bridge, water at window height, occupants waving for assistance."
              className="w-full bg-surface-inset shadow-clay-inset rounded-clay-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono leading-relaxed"
              required
            />
          </div>

          {/* Section 5: Structured Report Breakdown Preview Card */}
          {structuredData && (
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="font-mono font-bold text-xs text-brand-primary flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Report Structuring Breakdown</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (structuredData.inferred_fields?.hazard_category) {
                        setHazardCategory(mapHumaidCategory(structuredData.inferred_fields.hazard_category));
                      }
                      if (structuredData.reported_facts?.people_affected_estimate && structuredData.reported_facts.people_affected_estimate !== 'unknown') {
                        setPeopleAffected(structuredData.reported_facts.people_affected_estimate);
                      }
                      if (structuredData.reported_facts?.location_clues) {
                        setLocationName(structuredData.reported_facts.location_clues);
                        handleResolveLocation(structuredData.reported_facts.location_clues);
                      }
                      onShowToast?.('All extracted suggestions applied to report!', 'success');
                    }}
                    className="px-2.5 py-1 rounded-clay-button bg-brand-primary hover:bg-brand-hover text-white font-mono text-[10px] font-bold transition-all shadow-clay-button"
                  >
                    Apply All Suggestions
                  </button>
                  <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-clay-pill font-medium">
                    HumAID DistilBERT + NLP Extraction
                  </span>
                </div>
              </div>

              {/* Distinction: Explicit Facts vs Model Inferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                {/* 1. Explicitly Reported Facts */}
                <div className="p-3 rounded-clay-card bg-severity-success-soft space-y-1.5">
                  <span className="font-bold text-severity-success flex items-center space-x-1 text-[10px] uppercase font-mono">
                    <CheckCircle className="w-3 h-3 text-severity-success" />
                    <span>Explicit Reported Facts</span>
                  </span>
                  <div className="text-text-primary flex items-center justify-between">
                    <span>Casualties/People: <strong className="font-mono text-text-primary">{structuredData.reported_facts?.people_affected_estimate || 'Unknown'}</strong></span>
                    {structuredData.reported_facts?.people_affected_estimate && structuredData.reported_facts.people_affected_estimate !== 'unknown' && (
                      <button
                        type="button"
                        onClick={() => setPeopleAffected(structuredData.reported_facts.people_affected_estimate)}
                        className="text-[10px] text-severity-success underline font-mono font-bold"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  <div className="text-text-primary flex items-center justify-between">
                    <span>Location Clues: <strong className="font-mono text-text-primary">{structuredData.reported_facts?.location_clues || 'None explicitly mentioned'}</strong></span>
                    {structuredData.reported_facts?.location_clues && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationName(structuredData.reported_facts.location_clues);
                          handleResolveLocation(structuredData.reported_facts.location_clues);
                        }}
                        className="text-[10px] text-severity-success underline font-mono font-bold"
                      >
                        Apply & Resolve
                      </button>
                    )}
                  </div>
                  <div className="text-text-primary">
                    Time Reference: <strong className="font-mono text-text-primary">{structuredData.reported_facts?.time_references || 'None specified'}</strong>
                  </div>
                </div>

                {/* 2. Model Inferred Fields */}
                <div className="p-3 rounded-clay-card bg-brand-primary/10 space-y-1.5">
                  <span className="font-bold text-brand-primary flex items-center space-x-1 text-[10px] uppercase font-mono">
                    <Brain className="w-3 h-3 text-brand-primary" />
                    <span>Model Inferred Fields</span>
                  </span>
                  <div className="text-text-primary flex items-center justify-between">
                    <span>HumAID Situational Need: <strong className="font-mono text-text-primary">{formatHumaidSituationalNeed(structuredData.inferred_fields?.hazard_category)}</strong></span>
                    {structuredData.inferred_fields?.hazard_category && (
                      <button
                        type="button"
                        onClick={() => setHazardCategory(mapHumaidCategory(structuredData.inferred_fields.hazard_category))}
                        className="text-[10px] text-brand-primary underline font-mono font-bold"
                        title="Map situational clue to closest physical hazard option"
                      >
                        Set Hazard Type
                      </button>
                    )}
                  </div>
                  <div className="text-text-primary">
                    Model Classification Confidence: <strong className="font-mono text-text-primary">
                      {(structuredData.nlp_status === 'SUCCESS' || !structuredData.nlp_status) && typeof (structuredData.inferred_fields?.hazard_category_confidence ?? structuredData.inferred_fields?.nlp_confidence) === 'number'
                        ? `${((structuredData.inferred_fields.hazard_category_confidence ?? structuredData.inferred_fields.nlp_confidence) * 100).toFixed(1)}%`
                        : 'Unavailable'}
                    </strong>
                  </div>
                  <div className="text-text-primary">
                    Urgent Indicators: <strong className="font-mono text-text-primary">
                      {structuredData.inferred_fields?.urgent_indicators?.length > 0
                        ? structuredData.inferred_fields.urgent_indicators.join(', ')
                        : 'None detected'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Uncertain or Missing Fields */}
              {structuredData.missing_or_uncertain_fields?.length > 0 && (
                <div className="text-[10px] text-severity-high bg-severity-high-soft p-2.5 rounded-clay-card flex items-start space-x-1.5 shadow-clay-pill">
                  <HelpCircle className="w-3.5 h-3.5 text-severity-high mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Uncertain/Missing: </strong> {structuredData.missing_or_uncertain_fields.join(' · ')}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-text-muted italic">
                * Note: NLP confidence indicates model categorization certainty and must not be confused with field report reliability or ground-truth verification. Model confidence does not establish that a report is factually true.
              </p>
            </div>
          )}

          {/* Simple NLP Live Prediction Card (if classified without full structuring) */}
          {!structuredData && nlpPrediction && (
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-brand-primary mb-1">
                <span className="font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-severity-success" />
                  <span>HumAID Situational Need (AI Inferred)</span>
                </span>
                <span className={nlpPrediction.status === 'SUCCESS' ? 'text-severity-success font-semibold' : 'text-severity-high font-semibold'}>
                  {nlpPrediction.status === 'SUCCESS' && typeof nlpPrediction.confidence === 'number'
                    ? `${(nlpPrediction.confidence * 100).toFixed(1)}% Confidence`
                    : 'Confidence Unavailable'}
                </span>
              </div>
              <div className="text-text-primary font-mono font-bold text-xs uppercase tracking-wide">
                Situational Need: {nlpPrediction.status === 'SUCCESS'
                  ? formatHumaidSituationalNeed(nlpPrediction.predicted_category)
                  : 'Unclassified — Model Unavailable'}
              </div>
              <div className="text-[11px] text-text-secondary mt-1 font-sans">
                Physical Hazard Selected: <strong className="text-brand-primary">{hazardCategory}</strong>
              </div>
              <p className="text-[10px] text-text-muted mt-1 italic">
                * Suggested situational categorization. Model confidence reflects classification likelihood only, not ground-truth proof. Coordinator authorization required before dispatching rescue units.
              </p>
            </div>
          )}

          {/* Inline Validation / Backend Error Alert */}
          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 rounded-clay-card bg-severity-critical-soft text-severity-critical text-xs shadow-clay-pill">
              <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-clay-button clay-button-primary text-white font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
