/**
 * RESQNET AI — Frontend API Client
 * Connects the React dashboard to the FastAPI backend service.
 */

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
export const API_V1 = `${API_BASE}/api/v1`;

let _cachedToken = null;

export const getAuthToken = () => {
  if (_cachedToken) return _cachedToken;
  try {
    return localStorage.getItem('resqnet_auth_token') || 'dev-coordinator-token';
  } catch {
    return 'dev-coordinator-token';
  }
};

export const setAuthToken = (token) => {
  _cachedToken = token;
  try {
    if (token) {
      localStorage.setItem('resqnet_auth_token', token);
    } else {
      localStorage.removeItem('resqnet_auth_token');
    }
  } catch {
    // Ignore localStorage errors in non-browser/test environments
  }
};

async function request(endpoint, options = {}) {
  const url = `${API_V1}${endpoint}`;
  const timeoutMs = options.timeoutMs ?? (endpoint === '/health' ? 5000 : 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const { timeoutMs: _timeoutMs, signal: callerSignal, ...fetchOptions } = options;
    if (callerSignal) {
      callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const started = performance.now();
    const res = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
    console.info(`[RESQNET API] ${endpoint} ${res.status} in ${(performance.now() - started).toFixed(0)} ms`);
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
    if (err?.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${timeoutMs} ms`);
      timeoutError.code = 'REQUEST_TIMEOUT';
      console.warn(`[RESQNET API Timeout] ${endpoint} after ${timeoutMs} ms`);
      throw timeoutError;
    }
    console.error(`[RESQNET API Error] ${endpoint}:`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getBaseUrl: () => API_BASE,

  // Health & Readiness
  getHealth: () => request('/health', { timeoutMs: 5000 }),
  getReadiness: () => request('/health/ready'),

  // Public Environmental Data via Open-Meteo
  getEnvironmentalData: (params = {}) => {
    const query = new URLSearchParams();
    if (params.latitude !== undefined && params.latitude !== null && params.latitude !== '') {
      query.append('latitude', params.latitude);
    }
    if (params.longitude !== undefined && params.longitude !== null && params.longitude !== '') {
      query.append('longitude', params.longitude);
    }
    if (params.locationName) {
      query.append('location_name', params.locationName);
    }
    if (params.forceRefresh) {
      query.append('force_refresh', 'true');
    }
    const qs = query.toString();
    return request(`/environmental-data${qs ? `?${qs}` : ''}`);
  },

  // Official India Meteorological & Hydrological Stations (IMD & NWDP/CWC)
  getIndiaStationsData: (params = {}) => {
    const query = new URLSearchParams();
    if (params.measurement_type && params.measurement_type !== 'all') {
      query.append('measurement_type', params.measurement_type);
    }
    if (params.state) {
      query.append('state', params.state);
    }
    if (params.basin) {
      query.append('basin', params.basin);
    }
    if (params.limit) {
      query.append('limit', params.limit);
    }
    if (params.forceRefresh) {
      query.append('force_refresh', 'true');
    }
    const qs = query.toString();
    return request(`/environmental-data/india-stations${qs ? `?${qs}` : ''}`);
  },

  getEnvironmentalAlerts: () => request('/environmental-data/alerts'),

  getEnvironmentalSourcesStatus: () => request('/environmental-data/sources-status'),

  // Incidents CRUD
  getIncidents: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return request(`/incidents${qs ? `?${qs}` : ''}`);
  },

  getEquityMonitor: () => request('/incidents/equity-monitor'),

  getPriorityQueue: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return request(`/incidents/priority-queue${qs ? `?${qs}` : ''}`);
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

  // Hackathon Pipeline Option 1: Structure Messy Reports & Resolve Locations
  structureReport: (text) =>
    request('/incidents/structure-report', {
      method: 'POST',
      body: JSON.stringify({ raw_text: text }),
    }),

  searchLocationCandidates: (query, limit = 5) => {
    const qs = `query=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`;
    return request(`/geocoding/search?${qs}`);
  },

  confirmLocation: (incidentId, payload) =>
    request(`/incidents/${incidentId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({
        coordinates: payload.coordinates,
        locationName: payload.locationName || null,
        sector: payload.sector || null,
        confirmationStatus: payload.confirmationStatus || 'officer_confirmed',
        operator: payload.operator || 'Coordinator Jordan Davis',
        reason: payload.reason || 'Officer confirmed coordinates for incident.',
      }),
    }),

  // Simulated SMS Intake (token must be provided by authorized caller/tooling)
  sendSimulatedSMS: (payload, token) =>
    request('/sms/incoming', {
      method: 'POST',
      headers: {
        ...(token ? { 'X-RESQNET-SMS-TOKEN': token } : {}),
      },
      body: JSON.stringify(payload),
    }),

  // Dynamic Community Emergency Number & Android SMS Gateway
  getCommunityEmergencyNumber: () => request('/sms/community-number'),

  saveCommunityEmergencyNumber: (payload) =>
    request('/sms/community-number', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteCommunityEmergencyNumber: () =>
    request('/sms/community-number', {
      method: 'DELETE',
    }),

  testCommunityEmergencyNumberPing: () =>
    request('/sms/community-number/test-ping', {
      method: 'POST',
    }),

  sendForwardedSMSTest: (payload, secret) =>
    request('/sms/forwarded', {
      method: 'POST',
      headers: {
        ...(secret ? { 'X-RESQNET-FORWARDING-SECRET': secret } : {}),
      },
      body: JSON.stringify(payload),
    }),

  // Global Real-Time Tactical Notification Center
  getNotifications: ({ unreadOnly = false, limit = 50 } = {}) => {
    const qs = new URLSearchParams();
    if (unreadOnly) qs.append('unread_only', 'true');
    if (limit) qs.append('limit', limit);
    const queryStr = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/notifications${queryStr}`);
  },

  getUnreadNotificationsCount: () => request('/notifications/unread-count'),

  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true }),
    }),

  markAllNotificationsRead: () =>
    request('/notifications/mark-all-read', {
      method: 'POST',
    }),

  getNotificationWebSocketUrl: () => {
    const isHttps = API_BASE.startsWith('https:') || (typeof window !== 'undefined' && window.location.protocol === 'https:');
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = API_BASE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const token = getAuthToken();
    return `${wsProto}//${host}/api/v1/notifications/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export default api;
