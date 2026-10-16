import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import SummaryCards from './components/SummaryCards';
import IncidentMap from './components/IncidentMap';
import PriorityQueue from './components/PriorityQueue';
import IncidentDetailPanel from './components/IncidentDetailPanel';
import UnderreportedZones from './components/UnderreportedZones';
import CoordinatorOverrideModal from './components/CoordinatorOverrideModal';
import AuditLogView from './components/AuditLogView';
import ExportBriefModal from './components/ExportBriefModal';
import BroadcastModal from './components/BroadcastModal';
import NewIncidentModal from './components/NewIncidentModal';

import api from './services/api';

import { 
  INITIAL_INCIDENTS, 
  ATTENTION_NEEDED_ZONES, 
  INITIAL_AUDIT_LOG, 
  RESPONSE_TEAMS 
} from './data/mockData';

import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Radio, 
  Bell, 
  ShieldCheck,
  Zap,
  ListOrdered,
  RefreshCw,
  Server
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [selectedIncidentId, setSelectedIncidentId] = useState(INITIAL_INCIDENTS[0].id);
  const [attentionZones, setAttentionZones] = useState(ATTENTION_NEEDED_ZONES);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [responseTeams, setResponseTeams] = useState(RESPONSE_TEAMS);

  // Backend Integration State
  const [backendConnected, setBackendConnected] = useState(null); // null = checking, true = live, false = fallback
  const [backendError, setBackendError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isExportBriefOpen, setIsExportBriefOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Load Initial Data from Backend (with graceful mock fallback)
  const loadDashboardData = useCallback(async (isRetry = false) => {
    setIsLoading(true);
    try {
      await api.getHealth();
      const [apiIncidents, apiZones, apiAuditLogs] = await Promise.all([
        api.getIncidents(),
        api.getAttentionZones(),
        api.getAuditLogs()
      ]);

      if (Array.isArray(apiIncidents) && apiIncidents.length > 0) {
        setIncidents(apiIncidents);
        setSelectedIncidentId(apiIncidents[0].id);
      }
      if (Array.isArray(apiZones) && apiZones.length > 0) {
        setAttentionZones(apiZones);
      }
      if (Array.isArray(apiAuditLogs) && apiAuditLogs.length > 0) {
        setAuditLog(apiAuditLogs);
      }

      setBackendConnected(true);
      setBackendError(null);
      if (isRetry) {
        showToast("Connected to RESQNET AI Backend!", "success");
      }
    } catch (err) {
      console.warn("Backend not reached, running in offline fallback mode:", err.message);
      setBackendConnected(false);
      setBackendError(err.message || "FastAPI backend unreachable at " + api.getBaseUrl());
      if (isRetry) {
        showToast("Backend connection failed. Using local fallback data.", "alert");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  // Tab Title mapping
  const tabTitles = {
    overview: 'Operations overview',
    incidents: 'Incident Management',
    priority_queue: 'Priority Queue',
    zones: 'Attention Needed Zones',
    audit_log: 'Audit & Accountability Log'
  };

  // 1. Change Verification Status (Kept strictly separate from response status!)
  const handleVerifyStatusChange = async (incidentId, newStatus) => {
    // Optimistic UI update
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, verificationStatus: newStatus } : inc));

    if (backendConnected) {
      try {
        const updated = await api.updateVerificationStatus(incidentId, newStatus);
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? updated : inc));
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`Verification status for ${incidentId} updated to ${newStatus.toUpperCase()}`, 'success');
        return;
      } catch (err) {
        console.error("Failed to update verification status on backend:", err);
        showToast(`Server update failed: ${err.message}`, 'alert');
      }
    }

    const currentInc = incidents.find(i => i.id === incidentId);
    const oldStatus = currentInc ? currentInc.verificationStatus : 'unverified';

    // Append to Local Audit Log
    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      incidentId,
      operator: "Jordan Davis (Coordinator)",
      actionType: "VERIFICATION_STATUS_CHANGE",
      oldValue: oldStatus.toUpperCase(),
      newValue: newStatus.toUpperCase(),
      reason: `Coordinator manual verification status transition to ${newStatus}. Ground truth corroboration.`
    };
    setAuditLog(prev => [newLog, ...prev]);
    showToast(`Verification status for ${incidentId} updated to ${newStatus.toUpperCase()}`, 'success');
  };

  // 2. Change Response Status
  const handleResponseStatusChange = async (incidentId, newStatus) => {
    // Optimistic UI update
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, responseStatus: newStatus } : inc));

    if (backendConnected) {
      try {
        const updated = await api.updateResponseStatus(incidentId, newStatus);
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? updated : inc));
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`Response status for ${incidentId} set to ${newStatus.toUpperCase()}`, 'info');
        return;
      } catch (err) {
        console.error("Failed to update response status on backend:", err);
        showToast(`Server update failed: ${err.message}`, 'alert');
      }
    }

    const currentInc = incidents.find(i => i.id === incidentId);
    const oldStatus = currentInc ? currentInc.responseStatus : 'unassigned';

    // Append to Local Audit Log
    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      incidentId,
      operator: "Jordan Davis (Coordinator)",
      actionType: "RESPONSE_STATUS_CHANGE",
      oldValue: oldStatus.toUpperCase(),
      newValue: newStatus.toUpperCase(),
      reason: `Response lifecycle moved from ${oldStatus} to ${newStatus}.`
    };
    setAuditLog(prev => [newLog, ...prev]);
    showToast(`Response status for ${incidentId} set to ${newStatus.toUpperCase()}`, 'info');
  };

  // 3. Assign Response Team
  const handleAssignTeam = async (incidentId, teamName) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          assignedTeam: teamName,
          responseStatus: teamName && inc.responseStatus === 'unassigned' ? 'dispatched' : inc.responseStatus
        };
      }
      return inc;
    }));

    if (backendConnected) {
      try {
        const updated = await api.assignResponseTeam(incidentId, teamName);
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? updated : inc));
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`${teamName} assigned to ${incidentId}`, 'info');
        return;
      } catch (err) {
        console.error("Failed to assign team on backend:", err);
        showToast(`Server assignment failed: ${err.message}`, 'alert');
      }
    }

    if (teamName) {
      const newLog = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        incidentId,
        operator: "Jordan Davis (Coordinator)",
        actionType: "TEAM_ASSIGNMENT",
        oldValue: "None",
        newValue: teamName,
        reason: `Unit dispatched to sector.`
      };
      setAuditLog(prev => [newLog, ...prev]);
      showToast(`${teamName} assigned to ${incidentId}`, 'info');
    }
  };

  // 4. Save Coordinator Override
  const handleSaveOverride = async (overrideData) => {
    const { incidentId, oldScore, newScore, oldStatus, newStatus, reason } = overrideData;

    if (backendConnected) {
      try {
        const updated = await api.savePriorityOverride(incidentId, overrideData);
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? updated : inc));
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`Priority Override for ${incidentId} recorded in Audit Log`, 'success');
        return;
      } catch (err) {
        console.error("Failed to save override on backend:", err);
        showToast(`Server override failed: ${err.message}`, 'alert');
      }
    }

    // Local state fallback
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          priorityScore: newScore,
          responseStatus: newStatus,
          notes: [
            {
              id: `n-${Date.now()}`,
              author: "Coordinator Jordan Davis (Override)",
              time: "Just now",
              text: `Manual Override Applied: Score ${oldScore} -> ${newScore}. Reason: ${reason}`
            },
            ...(inc.notes || [])
          ]
        };
      }
      return inc;
    }));

    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      incidentId,
      operator: "Jordan Davis (Lead Coordinator)",
      actionType: "PRIORITY_SCORE_OVERRIDE",
      oldValue: `Score ${oldScore} / Status ${oldStatus}`,
      newValue: `Score ${newScore} / Status ${newStatus}`,
      reason: reason
    };
    setAuditLog(prev => [newLog, ...prev]);
    showToast(`Priority Override for ${incidentId} recorded in Audit Log`, 'success');
  };

  // 5. Add Coordinator Note
  const handleAddNote = async (incidentId, noteText) => {
    if (backendConnected) {
      try {
        const updated = await api.addIncidentNote(incidentId, {
          author: "Coordinator Jordan Davis",
          text: noteText
        });
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? updated : inc));
        showToast(`Note appended to ${incidentId}`, 'info');
        return;
      } catch (err) {
        console.error("Failed to add note on backend:", err);
      }
    }

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          notes: [
            {
              id: `n-${Date.now()}`,
              author: "Coordinator Jordan Davis",
              time: "Just now",
              text: noteText
            },
            ...(inc.notes || [])
          ]
        };
      }
      return inc;
    }));
    showToast(`Note appended to ${incidentId}`, 'info');
  };

  // 6. Dispatch Scout to Underreported Zone
  const handleDispatchScout = async (zone) => {
    setAttentionZones(prev => prev.map(z => z.id === zone.id ? { ...z, scoutStatus: 'Recon In Progress' } : z));

    if (backendConnected) {
      try {
        const updatedZone = await api.dispatchZoneScout(zone.id);
        setAttentionZones(prev => prev.map(z => z.id === zone.id ? updatedZone : z));
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`Scout team dispatched to underreported sector: ${zone.name}`, 'info');
        return;
      } catch (err) {
        console.error("Failed to dispatch scout on backend:", err);
      }
    }

    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      incidentId: zone.id,
      operator: "Jordan Davis (Coordinator)",
      actionType: "RECON_DISPATCHED",
      oldValue: "Unassigned",
      newValue: "Recon Drone / Scout Dispatched",
      reason: `Proactive ground truth scout sent to underreported sector ${zone.name}. Countering signal void.`
    };
    setAuditLog(prev => [newLog, ...prev]);
    showToast(`Scout team dispatched to underreported sector: ${zone.name}`, 'info');
  };

  // 7. Simulate New Incoming Incident (For live demonstration)
  const handleSimulateIncoming = async () => {
    const idNum = Math.floor(430 + Math.random() * 50);
    const mockTypes = [
      {
        title: "Toxic chemical plume venting from freight car",
        type: "Hazmat",
        sector: "North Industrial",
        loc: "Track 9 Marshalling Yard",
        coords: [37.792, -122.399],
        severity: "critical",
        score: 95,
        people: "50 - 80 nearby workers",
        why: "Anhydrous ammonia vapor detected; downwind shift change underway."
      },
      {
        title: "Substation transformer explosion with active fire",
        type: "Fire / Grid Failure",
        sector: "West Market Square",
        loc: "Substation 7 (14th St)",
        coords: [37.768, -122.422],
        severity: "high",
        score: 83,
        people: "850 apartments unpowered",
        why: "Live fire near commercial mid-rise with trapped elevator reports."
      },
      {
        title: "Distress signal from flooded retirement annex",
        type: "Vulnerable Population Need",
        sector: "Lower Marina Basin",
        loc: "Marina Shore Residences",
        coords: [37.772, -122.441],
        severity: "critical",
        score: 89,
        people: "18 non-ambulatory seniors",
        why: "Ground-floor floodwater penetration; power cut to motorized wheelchairs."
      }
    ];

    const pick = mockTypes[Math.floor(Math.random() * mockTypes.length)];
    const newInc = {
      id: `RQN-0${idNum}`,
      title: pick.title,
      type: pick.type,
      sector: pick.sector,
      locationName: pick.loc,
      coordinates: pick.coords,
      severity: pick.severity,
      priorityScore: pick.score,
      reportReliability: Math.floor(65 + Math.random() * 30),
      locationConfidence: Math.floor(75 + Math.random() * 20),
      peopleAffected: pick.people,
      affectedCountNumeric: 25,
      timeAgo: "Just now",
      timestamp: new Date().toISOString(),
      verificationStatus: "unverified",
      responseStatus: "unassigned",
      assignedTeam: null,
      sourceSummary: "Live Simulated Sensor Ingestion",
      signalSynthesis: "Automated telemetry ingestion detected critical threshold breach. Multi-source triangulation in progress.",
      whyPrioritised: pick.why,
      riskFactors: [
        "Rapidly evolving emergency event",
        "Initial report unconfirmed by ground crew"
      ],
      notes: []
    };

    if (backendConnected) {
      try {
        const created = await api.createIncident(newInc);
        setIncidents(prev => [created, ...prev]);
        setSelectedIncidentId(created.id);
        const logs = await api.getAuditLogs();
        setAuditLog(logs);
        showToast(`⚡ New Alert Ingested: ${created.id} (${created.title})`, 'alert');
        return;
      } catch (err) {
        console.error("Failed to persist simulated incident to backend:", err);
      }
    }

    setIncidents(prev => [newInc, ...prev]);
    setSelectedIncidentId(newInc.id);

    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      incidentId: newInc.id,
      operator: "System Sensor Ingestion (Mock)",
      actionType: "NEW_INCIDENT_INGESTED",
      oldValue: "None",
      newValue: `Score ${newInc.priorityScore}`,
      reason: "Initial synthetic triage score calculated by mock multi-signal model."
    };
    setAuditLog(prev => [newLog, ...prev]);
    showToast(`⚡ New Alert Simulated: ${newInc.id} (${newInc.title})`, 'alert');
  };

  // 8. Handle Report Creation from NewIncidentModal
  const handleIncidentCreated = (created) => {
    setIncidents(prev => [created, ...prev]);
    setSelectedIncidentId(created.id);
    if (backendConnected) {
      api.getAuditLogs().then(setAuditLog).catch(() => {});
    }
    showToast(`Report created: ${created.id} [${created.humaidCategory || 'HumAID Analyzed'}]`, 'success');
  };

  // 9. Handle Human-Reviewed Duplicate Merged
  const handleDuplicateMerged = (updatedPrimary) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === updatedPrimary.id) return updatedPrimary;
      return inc;
    }));
    if (backendConnected) {
      api.getAuditLogs().then(setAuditLog).catch(() => {});
      api.getIncidents().then(setIncidents).catch(() => {});
    }
    showToast(`Corroborating report merged into ${updatedPrimary.id}. Reliability updated.`, 'success');
  };

  const handleSelectIncidentById = (id) => {
    setSelectedIncidentId(id);
    setActiveTab('overview');
  };

  return (
    <div className="flex h-screen w-screen bg-[#070a13] text-slate-100 font-sans overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unverifiedCount={incidents.filter(i => i.verificationStatus === 'unverified').length}
        attentionZonesCount={attentionZones.length}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation */}
        <TopNav
          activeTabName={tabTitles[activeTab]}
          onSimulateIncoming={handleSimulateIncoming}
          onOpenExportBrief={() => setIsExportBriefOpen(true)}
          onOpenBroadcast={() => setIsBroadcastOpen(true)}
          backendConnected={backendConnected}
          onOpenNewIncidentModal={() => setIsNewIncidentModalOpen(true)}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-6 space-y-6 max-w-[1700px] w-full mx-auto">
          {/* Backend Connectivity / Environment Status Banner */}
          {backendConnected === false && (
            <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-amber-200">
                  <span className="font-semibold text-amber-300 font-mono">BACKEND OFFLINE:</span>{' '}
                  Cannot connect to FastAPI at <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200 font-mono">{api.getBaseUrl()}</code>.
                  Running in local mock mode. Start the backend with <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono">uvicorn app.main:app</code>.
                </div>
              </div>
              <button
                onClick={() => loadDashboardData(true)}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-800/60 hover:bg-amber-700/60 text-amber-100 border border-amber-500/50 transition-all font-mono text-[11px] self-start sm:self-auto flex-shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Connecting...' : 'Retry Connection'}</span>
              </button>
            </div>
          )}

          {backendConnected === true && (
            <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-xl p-2.5 px-4 flex items-center justify-between text-xs gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-medium">
                  FastAPI Backend Online
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">
                  SQLite Persistent Database Active · HumAID DistilBERT (87.8% F1) Ready
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider">
                api: {api.getBaseUrl()}
              </span>
            </div>
          )}

          {/* Transparent Simulation Environment Disclaimer Banner */}
          <div className="bg-[#0c1424] border border-cyan-900/50 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              <div className="text-slate-300 leading-snug">
                <span className="font-semibold text-cyan-300 font-mono">HUMAID TRIAGE NOTICE:</span>{' '}
                HumAID DistilBERT classifications are predictive decision-support suggestions for situational triage. 
                <span className="text-amber-300 font-medium ml-1">Verification status and operational dispatch remain strictly human-in-the-loop.</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap self-start sm:self-auto">
              RESQNET AI Engine v0.84
            </span>
          </div>

          {/* VIEW: OPERATIONS OVERVIEW (Matches Reference Screenshot Layout!) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Titles matching Screenshot */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Operations overview
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prioritised situational awareness for the coordination team.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-3">
                  <span>Median response: <strong className="text-slate-200">11m</strong></span>
                  <span>·</span>
                  <span>Estimated affected: <strong className="text-slate-200">1,284</strong></span>
                </div>
              </div>

              {/* 4 Summary Cards (Active, Critical, Unverified, Attention Zones) */}
              <SummaryCards
                incidents={incidents}
                attentionZones={attentionZones}
                onFilterClick={(filterType) => {
                  if (filterType === 'zones') setActiveTab('zones');
                  else setActiveTab('overview');
                }}
              />

              {/* Middle Row: Left Map (Incident landscape) + Right (Underreported zones) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <IncidentMap
                    incidents={incidents}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                    attentionZones={attentionZones}
                  />
                </div>
                <div className="lg:col-span-4">
                  <UnderreportedZones
                    zones={attentionZones}
                    onSelectZone={(z) => showToast(`Focused on sector: ${z.name}`)}
                    onDispatchScout={handleDispatchScout}
                  />
                </div>
              </div>

              {/* Bottom Row: Left (Priority Queue) + Right (Incident Detail Panel) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <PriorityQueue
                    incidents={incidents}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                  />
                </div>
                <div className="lg:col-span-5">
                  <IncidentDetailPanel
                    incident={selectedIncident}
                    onVerifyStatusChange={handleVerifyStatusChange}
                    onResponseStatusChange={handleResponseStatusChange}
                    onAssignTeam={handleAssignTeam}
                    onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
                    onAddNote={handleAddNote}
                    onDuplicateMerged={handleDuplicateMerged}
                    onShowToast={showToast}
                    responseTeams={responseTeams}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: INCIDENT MANAGEMENT */}
          {activeTab === 'incidents' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Incident Management & Tactical Triage
                </h1>
                <p className="text-xs text-slate-400">
                  Full list of emergency incidents with verification controls and squad dispatch.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <PriorityQueue
                    incidents={incidents}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                  />
                </div>
                <div className="lg:col-span-5">
                  <IncidentDetailPanel
                    incident={selectedIncident}
                    onVerifyStatusChange={handleVerifyStatusChange}
                    onResponseStatusChange={handleResponseStatusChange}
                    onAssignTeam={handleAssignTeam}
                    onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
                    onAddNote={handleAddNote}
                    onDuplicateMerged={handleDuplicateMerged}
                    onShowToast={showToast}
                    responseTeams={responseTeams}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PRIORITY QUEUE FOCUSED */}
          {activeTab === 'priority_queue' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Priority Queue Deep-Dive
                </h1>
                <p className="text-xs text-slate-400">
                  Multi-signal algorithmic ranking with transparent weighting of life safety, corroboration, and density.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <PriorityQueue
                    incidents={incidents}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                  />
                </div>
                <div className="lg:col-span-4">
                  <IncidentDetailPanel
                    incident={selectedIncident}
                    onVerifyStatusChange={handleVerifyStatusChange}
                    onResponseStatusChange={handleResponseStatusChange}
                    onAssignTeam={handleAssignTeam}
                    onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
                    onAddNote={handleAddNote}
                    onDuplicateMerged={handleDuplicateMerged}
                    onShowToast={showToast}
                    responseTeams={responseTeams}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ATTENTION NEEDED ZONES */}
          {activeTab === 'zones' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Attention Needed Zones (Underreported Sectors)
                </h1>
                <p className="text-xs text-slate-400">
                  Signal dropoffs and reporting voids requiring proactive field scouts.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <UnderreportedZones
                    zones={attentionZones}
                    onSelectZone={(z) => showToast(`Focused on sector: ${z.name}`)}
                    onDispatchScout={handleDispatchScout}
                  />
                </div>
                <div className="lg:col-span-6">
                  <IncidentMap
                    incidents={incidents}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                    attentionZones={attentionZones}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AUDIT LOG */}
          {activeTab === 'audit_log' && (
            <AuditLogView
              auditLog={auditLog}
              onSelectIncidentById={handleSelectIncidentById}
            />
          )}
        </main>
      </div>

      {/* 3. Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-lg bg-[#0e182e] border border-cyan-500/50 shadow-2xl text-xs text-white animate-bounce-subtle">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* 4. Coordinator Override Modal */}
      <CoordinatorOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        incident={selectedIncident}
        onSaveOverride={handleSaveOverride}
      />

      {/* 5. Export SITREP Brief Modal */}
      <ExportBriefModal
        isOpen={isExportBriefOpen}
        onClose={() => setIsExportBriefOpen(false)}
        incidents={incidents}
        attentionZones={attentionZones}
      />

      {/* 6. Emergency Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        selectedIncident={selectedIncident}
        onSendBroadcast={(data) => {
          showToast(`Emergency Broadcast dispatched to ${data.targetZone}!`, 'alert');
        }}
      />

      {/* 7. New Incident & HumAID Classifier Modal */}
      <NewIncidentModal
        isOpen={isNewIncidentModalOpen}
        onClose={() => setIsNewIncidentModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
      />
    </div>
  );
}
