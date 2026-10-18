/**
 * RESQNET AI — Frontend API Client
 * Connects the React dashboard to the FastAPI backend service.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const API_V1 = `${API_BASE}/api/v1`;

async function request(endpoint, options = {}) {
  const url = `${API_V1}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = `Request failed: ${res.status} ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`[RESQNET API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getBaseUrl: () => API_BASE,

  // Health & Readiness
  getHealth: () => request('/health'),
  getReadiness: () => request('/health/ready'),

  // Incidents CRUD
  getIncidents: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return request(`/incidents${qs ? `?${qs}` : ''}`);
  },

  getIncidentById: (id) => request(`/incidents/${id}`),

  createIncident: (incidentData) =>
    request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    }),

  updateIncident: (id, updateFields) =>
    request(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateFields),
    }),

  updateVerificationStatus: (id, payload) => {
    const body = typeof payload === 'string'
      ? {
          verificationStatus: payload,
          operator: 'Coordinator Jordan Davis',
          reason: `Coordinator manual verification status transition to ${payload}. Ground truth corroboration.`,
        }
      : {
          verificationStatus: payload.verificationStatus,
          operator: payload.operator || 'Coordinator Jordan Davis',
          reason: payload.reason || 'Coordinator status corroboration.',
        };
    return request(`/incidents/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  updateResponseStatus: (id, payload) => {
    const body = typeof payload === 'string'
      ? {
          responseStatus: payload,
          assignedTeam: null,
          operator: 'Coordinator Jordan Davis',
          reason: `Response lifecycle moved to ${payload}.`,
        }
      : {
          responseStatus: payload.responseStatus,
          assignedTeam: payload.assignedTeam || null,
          operator: payload.operator || 'Coordinator Jordan Davis',
          reason: payload.reason || 'Dispatch response status change.',
        };
    return request(`/incidents/${id}/response-status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  assignResponseTeam: (id, teamName) =>
    request(`/incidents/${id}/response-status`, {
      method: 'PATCH',
      body: JSON.stringify({
        responseStatus: 'dispatched',
        assignedTeam: teamName,
        operator: 'Coordinator Jordan Davis',
        reason: `Unit ${teamName} dispatched to sector.`,
      }),
    }),

  overridePriority: (id, payload) => {
    const newPriority = payload.newPriority !== undefined ? payload.newPriority : payload.newScore;
    return request(`/incidents/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({
        newPriority: Number(newPriority),
        responseStatus: payload.newStatus || payload.responseStatus || null,
        operator: payload.operator || 'Coordinator Jordan Davis (Override)',
        reason: payload.reason || 'Coordinator manual priority override.',
      }),
    });
  },

  savePriorityOverride: (id, payload) => api.overridePriority(id, payload),

  addIncidentNote: (id, note) => {
    const noteText = typeof note === 'string' ? note : (note.text || '');
    const author = (typeof note === 'object' && note.author) ? note.author : 'Coordinator Jordan Davis';
    return request(`/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ author, text: noteText }),
    });
  },

  getIncidentAuditLog: (id) => request(`/incidents/${id}/audit-log`),

  // Audit Logs & Attention Zones
  getAuditLogs: (incidentId = null) => {
    const qs = incidentId ? `?incident_id=${encodeURIComponent(incidentId)}` : '';
    return request(`/audit-log${qs}`);
  },

  getAttentionZones: () => request('/zones'),

  dispatchZoneScout: (zoneId) =>
    request(`/zones/${zoneId}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),

  // NLP Categorization via HumAID DistilBERT
  classifyText: (text, returnAllProbabilities = true) =>
    request('/classify', {
      method: 'POST',
      body: JSON.stringify({ text, return_all_probabilities: returnAllProbabilities }),
    }),

  classifyReport: (report) =>
    request('/reports/classify', {
      method: 'POST',
      body: JSON.stringify(report),
    }),

  // Explainable Duplicate Detection & Human-in-the-Loop Merge
  getIncidentDuplicates: (id) => request(`/incidents/${id}/duplicates`),

  mergeDuplicate: (id, payload) =>
    request(`/incidents/${payload.primaryIncidentId || id}/merge-duplicate`, {
      method: 'POST',
      body: JSON.stringify({
        duplicateIncidentId: payload.duplicateIncidentId,
        primaryIncidentId: payload.primaryIncidentId || id,
        operator: payload.operator || 'Coordinator Jordan Davis',
        reason: payload.reason || 'Corroborating distress report merged into primary incident after human review.',
        updateCorroboration: payload.updateCorroboration !== false,
      }),
    }),

  dismissDuplicate: (id, payload) =>
    request(`/incidents/${id}/dismiss-duplicate`, {
      method: 'POST',
      body: JSON.stringify({
        duplicateIncidentId: payload.duplicateIncidentId,
        operator: payload.operator || 'Coordinator Jordan Davis',
        reason: payload.reason || 'Verified as distinct and separate incident by coordinator.',
      }),
    }),
};

export default api;
