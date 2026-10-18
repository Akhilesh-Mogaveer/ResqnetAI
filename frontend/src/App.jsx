import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import CoordinatorOverrideModal from './components/CoordinatorOverrideModal';
import ExportBriefModal from './components/ExportBriefModal';
import BroadcastModal from './components/BroadcastModal';
import NewIncidentModal from './components/NewIncidentModal';

// 7 Dedicated Page Components
import OverviewPage from './pages/OverviewPage';
import IncidentsPage from './pages/IncidentsPage';
import LiveMapPage from './pages/LiveMapPage';
import PriorityQueuePage from './pages/PriorityQueuePage';
import VerificationCenterPage from './pages/VerificationCenterPage';
import ResponseCommPage from './pages/ResponseCommPage';
import ActivityHealthPage from './pages/ActivityHealthPage';

import api from './services/api';

import {
  INITIAL_INCIDENTS,
  ATTENTION_NEEDED_ZONES,
  INITIAL_AUDIT_LOG,
  RESPONSE_TEAMS
} from './data/mockData';

import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    overview: 'Operations Overview',
    incidents: 'Incident Management',
    map: 'Live Operations Map',
    priority: 'Priority Queue',
    priority_queue: 'Priority Queue',
    verification: 'Verification Center',
    response: 'Response & Communication',
    health: 'Activity & System Health',
    audit_log: 'Activity & System Health',
    zones: 'Operations Overview'
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
  const handleDuplicateMerged = ({ primaryId, duplicateId, updatedPrimary, updatedDuplicate }) => {
    setIncidents(prev => prev.map(inc => {
      if (updatedPrimary && inc.id === updatedPrimary.id) return { ...inc, ...updatedPrimary };
      if (updatedDuplicate && inc.id === updatedDuplicate.id) return { ...inc, ...updatedDuplicate };
      if (inc.id === duplicateId) {
        return {
          ...inc,
          is_duplicate: true,
          duplicate_of_id: primaryId,
          responseStatus: 'merged_duplicate'
        };
      }
      return inc;
    }));

    if (backendConnected) {
      api.getAuditLogs().then(logs => {
        if (Array.isArray(logs)) setAuditLog(logs);
      }).catch(() => {});

      api.getIncidents().then(apiIncidents => {
        if (Array.isArray(apiIncidents) && apiIncidents.length > 0) {
          setIncidents(apiIncidents);
          setSelectedIncidentId(prevId => {
            const exists = apiIncidents.some(i => i.id === prevId);
            return exists ? prevId : primaryId;
          });
        }
      }).catch(() => {});
    }
  };

  // 10. Handle Human-Reviewed Duplicate Dismissed
  const handleDuplicateDismissed = ({ primaryId, candidateId, updatedPrimary }) => {
    if (updatedPrimary) {
      setIncidents(prev => prev.map(inc => inc.id === updatedPrimary.id ? { ...inc, ...updatedPrimary } : inc));
    }

    if (backendConnected) {
      api.getAuditLogs().then(logs => {
        if (Array.isArray(logs)) setAuditLog(logs);
      }).catch(() => {});

      api.getIncidents().then(apiIncidents => {
        if (Array.isArray(apiIncidents) && apiIncidents.length > 0) {
          setIncidents(apiIncidents);
          setSelectedIncidentId(prevId => {
            const exists = apiIncidents.some(i => i.id === prevId);
            return exists ? prevId : apiIncidents[0].id;
          });
        }
      }).catch(() => {});
    }
  };

  const handleSelectIncidentById = (id) => {
    setSelectedIncidentId(id);
    setActiveTab('incidents');
  };

  // Current normalized tab
  const currentTab =
    activeTab === 'priority_queue' ? 'priority' :
    activeTab === 'zones' ? 'overview' :
    activeTab === 'audit_log' ? 'health' : activeTab;

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={setActiveTab}
        unverifiedCount={incidents.filter(i => i.verificationStatus === 'unverified' && !i.is_duplicate).length}
        attentionZonesCount={attentionZones.length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation */}
        <TopNav
          activeTabName={tabTitles[currentTab] || 'Coordination'}
          onSimulateIncoming={handleSimulateIncoming}
          onOpenExportBrief={() => setIsExportBriefOpen(true)}
          onOpenBroadcast={() => setIsBroadcastOpen(true)}
          backendConnected={backendConnected}
          onOpenNewIncidentModal={() => setIsNewIncidentModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1700px] w-full mx-auto">
          {/* Backend Offline Fallback Banner */}
          {backendConnected === false && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="text-amber-900">
                  <span className="font-semibold text-amber-950 font-mono">BACKEND OFFLINE:</span>{' '}
                  Cannot connect to FastAPI at <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">{api.getBaseUrl()}</code>.
                  Running with reliable local data. Start backend with <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">uvicorn backend.app.main:app</code>.
                </div>
              </div>
              <button
                onClick={() => loadDashboardData(true)}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono text-[11px] self-start sm:self-auto flex-shrink-0 transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Connecting...' : 'Retry Connection'}</span>
              </button>
            </div>
          )}

          {/* PAGE 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <OverviewPage
              incidents={incidents}
              attentionZones={attentionZones}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDispatchScout={handleDispatchScout}
              onVerifyStatusChange={handleVerifyStatusChange}
              onResponseStatusChange={handleResponseStatusChange}
              backendConnected={backendConnected}
            />
          )}

          {/* PAGE 2: INCIDENTS */}
          {currentTab === 'incidents' && (
            <IncidentsPage
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onVerifyStatusChange={handleVerifyStatusChange}
              onResponseStatusChange={handleResponseStatusChange}
              onAssignTeam={handleAssignTeam}
              onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
              onAddNote={handleAddNote}
              onDuplicateMerged={handleDuplicateMerged}
              onDuplicateDismissed={handleDuplicateDismissed}
              onShowToast={showToast}
              responseTeams={responseTeams}
              onOpenNewIncidentModal={() => setIsNewIncidentModalOpen(true)}
            />
          )}

          {/* PAGE 3: LIVE MAP */}
          {currentTab === 'map' && (
            <LiveMapPage
              incidents={incidents}
              attentionZones={attentionZones}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* PAGE 4: PRIORITY QUEUE */}
          {currentTab === 'priority' && (
            <PriorityQueuePage
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* PAGE 5: VERIFICATION CENTER */}
          {currentTab === 'verification' && (
            <VerificationCenterPage
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onVerifyStatusChange={handleVerifyStatusChange}
              onDuplicateMerged={handleDuplicateMerged}
              onDuplicateDismissed={handleDuplicateDismissed}
              onShowToast={showToast}
              auditLog={auditLog}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* PAGE 6: RESPONSE & COMMUNICATION */}
          {currentTab === 'response' && (
            <ResponseCommPage
              responseTeams={responseTeams}
              incidents={incidents}
              onOpenBroadcast={() => setIsBroadcastOpen(true)}
              onOpenExportBrief={() => setIsExportBriefOpen(true)}
              onSimulateIncoming={handleSimulateIncoming}
              onAssignTeam={handleAssignTeam}
              selectedIncident={selectedIncident}
              onShowToast={showToast}
            />
          )}

          {/* PAGE 7: ACTIVITY & SYSTEM HEALTH */}
          {currentTab === 'health' && (
            <ActivityHealthPage
              auditLog={auditLog}
              backendConnected={backendConnected}
              backendError={backendError}
              onRetryConnection={() => loadDashboardData(true)}
              isLoading={isLoading}
              onSelectIncidentById={handleSelectIncidentById}
            />
          )}
        </main>
      </div>

      {/* 3. Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-xs text-white animate-bounce-subtle">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
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
          showToast(`[SIMULATED] Emergency broadcast alert logged for ${data.targetZone} (No live carrier transmission dispatched).`, 'info');
        }}
      />

      {/* 7. New Incident & HumAID Classifier Modal */}
      <NewIncidentModal
        isOpen={isNewIncidentModalOpen}
        onClose={() => setIsNewIncidentModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
        onShowToast={showToast}
      />
    </div>
  );
}
