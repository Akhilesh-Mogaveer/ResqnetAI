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
  Lock,
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
  const [severity, setSeverity] = useState('high');
  const [priorityScore, setPriorityScore] = useState(75);
  const [peopleAffected, setPeopleAffected] = useState('10 - 25 people');
  const [reportText, setReportText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Source Provenance
  const [reportSource, setReportSource] = useState('Officer/Phone Call');
  const [sourceReference, setSourceReference] = useState('');

  // Priority & Verification Override Controls
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [overrideOperator, setOverrideOperator] = useState('Coordinator Intake');
  const [overrideReason, setOverrideReason] = useState('');

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
        confidence: res.inferred_fields.nlp_confidence || 0.85,
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

    if (isManualOverride) {
      if (!overrideReason.trim()) {
        setErrorMsg('Mandatory justification reason is required for manual priority override.');
        onShowToast?.('Justification reason is required for manual priority override.', 'alert');
        return;
      }
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
        type: hazardCategory || (nlpPrediction?.predicted_category ? nlpPrediction.predicted_category.replace(/_/g, ' ') : "Emergency Incident"),
        sector,
        locationName: locationName.trim() || `${sector} Zone`,
        coordinates: userCoords,
        severity,
        priorityScore: parseInt(priorityScore, 10) || 50,
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
        is_priority_overridden: isManualOverride,
        is_severity_overridden: isManualOverride,
        override_operator: isManualOverride ? (overrideOperator.trim() || 'Coordinator Intake') : null,
        override_reason: isManualOverride ? overrideReason.trim() : null,
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
      setIsManualOverride(false);
      setOverrideReason('');
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
    <div className="fixed inset-0 z-50 bg-[#07111F]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0D1B2D] border border-[#203550] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#132238] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1 font-bold">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span>Incident Intake & AI Structuring</span>
        </div>
        <h2 className="text-lg font-bold text-white mb-4">Submit Emergency Incident Report</h2>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Section 1: Report Source Channel & Provenance */}
          <div className="p-3 rounded-lg bg-[#091629] border border-[#203550] space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="report-source-channel" className="block text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Report Source Channel *</span>
                </label>
                <select
                  id="report-source-channel"
                  value={reportSource}
                  onChange={(e) => setReportSource(e.target.value)}
                  className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
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
                <label className="block text-slate-300 font-medium mb-1">
                  Source Reference / Identification (Optional)
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. CAD #5892, Radio Bravo-4, Rain Gauge #12, or Post ID"
                  className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5 pt-1 border-t border-[#203550]/60">
              <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span>
                Manual Intake Mode: Recording incoming reports received via {reportSource}. Automated SMS, social-media, or telecom carrier integrations are not currently active.
              </span>
            </div>
          </div>

          {/* Incident Headline / Title */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
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
              className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-[#0D1B2D]"
              required
            />
          </div>

          {/* Hazard Category, Sector, & Landmark Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Hazard Category *</label>
              <select
                value={hazardCategory}
                onChange={(e) => setHazardCategory(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
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
              <label className="block text-slate-300 font-medium mb-1">Operational Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
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
                <label className="block text-slate-300 font-medium">Named Landmark / Spot</label>
                <button
                  type="button"
                  onClick={() => handleResolveLocation()}
                  disabled={isResolvingLocation || (!locationName.trim() && !title.trim())}
                  className="flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 font-mono font-semibold"
                  title="Search coordinates in Indian Gazetteer & OSM Geocoder"
                >
                  {isResolvingLocation ? (
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                  ) : (
                    <Search className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>Resolve</span>
                </button>
              </div>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Wayanad Relief Camp or Andheri Metro"
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-[#0D1B2D]"
              />
            </div>
          </div>

          {/* Section 2: Location Candidates & Map Preview Drawer */}
          {locationCandidates.length > 1 && (
            <div className="bg-[#132238] border border-cyan-500/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-cyan-300 flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Multiple Candidates Found — Confirm Location</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {locationCandidates.length} options
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Multiple places matched this description. Select the correct landmark or click its pin on the preview map:
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {locationCandidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#091629] rounded border border-[#203550] flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <div className="font-semibold text-white">{cand.display_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        [{cand.latitude.toFixed(4)}, {cand.longitude.toFixed(4)}] · Provider: {cand.provider} ({(cand.confidence * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#203550]">
                <button
                  type="button"
                  onClick={handleLeaveLocationUnresolved}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  Leave Location Unresolved (Save Without Coordinates)
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className="text-[10px] text-cyan-400 font-mono font-semibold"
                >
                  {showMapPicker ? 'Hide Map Preview' : 'Show Map Preview'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Map Preview (Rendered on candidate search or user toggle) */}
          {(showMapPicker || locationCandidates.length > 0 || hasValidCoordinates) && (
            <div className="rounded-lg overflow-hidden border border-[#203550] bg-[#091629]">
              <div className="bg-[#091629] px-3 py-1.5 border-b border-[#203550] flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span className="flex items-center space-x-1.5 font-semibold">
                  <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Interactive Map Preview & Candidate Selection</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Click map to pin coordinates
                </span>
              </div>
              <div className="h-44 w-full relative z-0">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community"
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
                            className="mt-1 px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]"
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
              <div className="px-3 py-1 bg-[#091629] border-t border-[#203550] text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Geocoding: OpenStreetMap Nominatim & Local Disaster Gazetteer (Rate limited to 1 req/s, cached).</span>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className="text-cyan-400 hover:text-cyan-300 underline ml-2"
                >
                  {showMapPicker ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>
          )}

          {/* Location Resolution Status Tag / Warning */}
          {locationResolutionTag && (
            <div className="flex items-center justify-between p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px]">
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate font-mono">{locationResolutionTag}</span>
              </div>
              <button
                type="button"
                onClick={handleClearCoordinates}
                className="text-[10px] text-emerald-300 underline hover:text-emerald-100 ml-2 whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          )}

          {locationWarning && (
            <div className="p-2.5 rounded bg-[#132238] border border-amber-500/30 text-amber-300 text-[11px] space-y-1.5">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{locationWarning}</span>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono pl-5">
                <button
                  type="button"
                  onClick={handleLeaveLocationUnresolved}
                  className="text-amber-300 font-bold underline hover:text-amber-100"
                >
                  Confirm as Unresolved Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  Open Map Preview to Pin Point
                </button>
              </div>
            </div>
          )}

          {/* Optional User GPS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#091629] border border-[#203550]">
            <div>
              <label className="block text-slate-300 font-medium mb-1 text-[11px]">
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
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1 text-[11px]">
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
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>
                ℹ️ Coordinates are optional. If left blank, RESQNET preserves report as Unresolved Location without inventing fake coordinates.
              </span>
              <div className="flex items-center space-x-2">
                {!showMapPicker && (
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline ml-2 whitespace-nowrap"
                  >
                    Map Picker
                  </button>
                )}
                {(latitude || longitude) && (
                  <button
                    type="button"
                    onClick={handleClearCoordinates}
                    className="text-slate-400 hover:text-slate-200 underline ml-2 whitespace-nowrap"
                  >
                    Clear Coords
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Severity & Casualties / Affected People */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Severity Tier</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="critical">Critical (Red)</option>
                <option value="high">High (Amber)</option>
                <option value="moderate">Moderate (Cyan)</option>
                <option value="low">Low (Green)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Casualties & Affected People</label>
              <input
                type="text"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
                placeholder="e.g. 5 injured, 20 trapped, or 10-25 people"
                className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 3: Verification Status & Priority Scoring Controls */}
          <div className="p-3 rounded-lg bg-[#091629] border border-[#203550] space-y-3">
            {/* Unverified Default Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#132238] border border-amber-500/30 text-slate-300 text-[11px]">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider font-mono text-[10px] text-amber-300">
                    Verification Status: UNVERIFIED (Default)
                  </span>
                  <div className="text-[10px] text-slate-300">
                    All incoming reports default to unverified until evidence is corroborated by the Lead Operations Coordinator.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                Pending Evidence
              </span>
            </div>

            {/* Manual Priority Override Checkbox */}
            <div className="space-y-2">
              <label htmlFor="manual-priority-override" className="flex items-center space-x-2 cursor-pointer text-slate-200 font-medium">
                <input
                  type="checkbox"
                  id="manual-priority-override"
                  checked={isManualOverride}
                  onChange={(e) => setIsManualOverride(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-[#0D1B2D] border-[#203550]"
                />
                <span className="text-xs">
                  Manual Priority / Severity Override (Lead Coordinator Authorization Required)
                </span>
              </label>

              {!isManualOverride ? (
                <div className="text-[11px] text-slate-400 font-mono bg-[#0D1B2D] p-2 rounded border border-[#203550] flex items-center justify-between">
                  <span>
                    ⚡ Automated Priority: Priority score will be calculated dynamically by the RESQNET scoring engine upon submission.
                  </span>
                  <span className="text-cyan-400 font-bold">Auto-Score Active</span>
                </div>
              ) : (
                <div className="p-3 bg-[#132238] border border-amber-500/30 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Authorized Coordinator Override</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                        Override Priority (0-100) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={priorityScore}
                        onChange={(e) => setPriorityScore(e.target.value)}
                        className="w-full bg-[#091629] border border-amber-500/40 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                        Authorizing Coordinator *
                      </label>
                      <input
                        type="text"
                        value={overrideOperator}
                        onChange={(e) => setOverrideOperator(e.target.value)}
                        placeholder="e.g. Coordinator Jordan Davis"
                        className="w-full bg-[#091629] border border-amber-500/40 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                        Mandatory Justification *
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Direct phone dispatch confirmed trapped families"
                        className="w-full bg-[#091629] border border-amber-500/40 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-300 italic">
                    * This override bypasses automated priority calculation and records an immutable audit log entry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Incident Description / Narrative with AI Structuring Tools */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <label className="block text-slate-300 font-medium">
                Incident Description / Distress Message *
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleStructureReport}
                  disabled={isStructuring || !reportText.trim()}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] disabled:opacity-40 transition-colors font-bold"
                  title="Extract reported facts vs model-inferred fields from messy text"
                >
                  {isStructuring ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Structuring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Structure Messy Report</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClassify}
                  disabled={isClassifying || !reportText.trim()}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-mono text-[11px] disabled:opacity-40 transition-colors"
                >
                  {isClassifying ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Classifying...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 text-blue-400" />
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
              className="w-full bg-[#091629] border border-[#203550] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              required
            />
          </div>

          {/* Section 5: Structured Report Breakdown Preview Card */}
          {structuredData && (
            <div className="bg-[#091629] border border-indigo-500/30 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#203550]">
                <span className="font-mono font-bold text-xs text-indigo-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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
                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold transition-colors"
                  >
                    Apply All Suggestions
                  </button>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                    HumAID DistilBERT + NLP Extraction
                  </span>
                </div>
              </div>

              {/* Distinction: Explicit Facts vs Model Inferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* 1. Explicitly Reported Facts */}
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="font-bold text-emerald-300 flex items-center space-x-1 text-[10px] uppercase font-mono">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Explicit Reported Facts</span>
                  </span>
                  <div className="text-slate-200 flex items-center justify-between">
                    <span>Casualties/People: <strong className="font-mono text-white">{structuredData.reported_facts?.people_affected_estimate || 'Unknown'}</strong></span>
                    {structuredData.reported_facts?.people_affected_estimate && structuredData.reported_facts.people_affected_estimate !== 'unknown' && (
                      <button
                        type="button"
                        onClick={() => setPeopleAffected(structuredData.reported_facts.people_affected_estimate)}
                        className="text-[10px] text-emerald-300 underline font-mono"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  <div className="text-slate-200 flex items-center justify-between">
                    <span>Location Clues: <strong className="font-mono text-white">{structuredData.reported_facts?.location_clues || 'None explicitly mentioned'}</strong></span>
                    {structuredData.reported_facts?.location_clues && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationName(structuredData.reported_facts.location_clues);
                          handleResolveLocation(structuredData.reported_facts.location_clues);
                        }}
                        className="text-[10px] text-emerald-300 underline font-mono"
                      >
                        Apply & Resolve
                      </button>
                    )}
                  </div>
                  <div className="text-slate-200">
                    Time Reference: <strong className="font-mono text-white">{structuredData.reported_facts?.time_references || 'None specified'}</strong>
                  </div>
                </div>

                {/* 2. Model Inferred Fields */}
                <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                  <span className="font-bold text-indigo-300 flex items-center space-x-1 text-[10px] uppercase font-mono">
                    <Brain className="w-3 h-3 text-indigo-400" />
                    <span>Model Inferred Fields</span>
                  </span>
                  <div className="text-slate-200 flex items-center justify-between">
                    <span>Category: <strong className="font-mono text-white">{structuredData.inferred_fields?.hazard_category?.replace(/_/g, ' ') || 'Unknown'}</strong></span>
                    {structuredData.inferred_fields?.hazard_category && (
                      <button
                        type="button"
                        onClick={() => setHazardCategory(mapHumaidCategory(structuredData.inferred_fields.hazard_category))}
                        className="text-[10px] text-indigo-300 underline font-mono"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  <div className="text-slate-200">
                    NLP Confidence: <strong className="font-mono text-white">{((structuredData.inferred_fields?.nlp_confidence || 0) * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="text-slate-200">
                    Urgent Indicators: <strong className="font-mono text-white">
                      {structuredData.inferred_fields?.urgent_indicators?.length > 0
                        ? structuredData.inferred_fields.urgent_indicators.join(', ')
                        : 'None detected'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Uncertain or Missing Fields */}
              {structuredData.missing_or_uncertain_fields?.length > 0 && (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/30 flex items-start space-x-1">
                  <HelpCircle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Uncertain/Missing: </strong> {structuredData.missing_or_uncertain_fields.join(' · ')}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 italic">
                * Note: NLP confidence indicates model categorization certainty and must not be confused with field report reliability or ground-truth verification.
              </p>
            </div>
          )}

          {/* Simple NLP Live Prediction Card (if classified without full structuring) */}
          {!structuredData && nlpPrediction && (
            <div className="bg-[#132238] border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-blue-300 mb-1">
                <span className="font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>HumAID Prediction</span>
                </span>
                <span className="text-emerald-400 font-semibold">
                  {(nlpPrediction.confidence * 100).toFixed(1)}% Confidence
                </span>
              </div>
              <div className="text-white font-mono font-bold text-xs uppercase tracking-wide">
                Category: {nlpPrediction.predicted_category.replace(/_/g, ' ')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                * Suggested situational categorization. Coordinator authorization required before dispatching rescue units.
              </p>
            </div>
          )}

          {/* Inline Validation / Backend Error Alert */}
          {errorMsg && (
            <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-2 border-t border-[#203550] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#091629] hover:bg-[#132238] text-slate-300 border border-[#203550] transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold transition-all shadow-xs disabled:opacity-50"
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
