// API Configuration - route through nginx gateway
const API_BASE = '/api';

export const API_ENDPOINTS = {
  // Auth Service
  AUTH_LOGIN: `${API_BASE}/auth/auth/login`,
  AUTH_REGISTER: `${API_BASE}/auth/auth/register`,
  AUTH_PROFILE: `${API_BASE}/auth/auth/profile`,
  AUTH_FORGOT: `${API_BASE}/auth/auth/forgot-password`,
  AUTH_RESET: `${API_BASE}/auth/auth/reset-password`,
  
  // Event Service
  EVENTS: `${API_BASE}/events/api/events`,
  EVENT_BY_ID: (id) => `${API_BASE}/events/api/events/${id}`,
  
  // Diary Service
  DIARY: `${API_BASE}/diary/api/diary`,
  DIARY_BY_ID: (id) => `${API_BASE}/diary/api/diary/${id}`,
  
  // Community Service
  COMMUNITY: `${API_BASE}/community/api/community`,
  COMMUNITY_BY_ID: (id) => `${API_BASE}/community/api/community/${id}`,
  COMMUNITY_REACTIONS: (id) => `${API_BASE}/community/api/community/${id}/reactions`,
  COMMUNITY_COMMENTS: (id) => `${API_BASE}/community/api/community/${id}/comments`,
  COMMUNITY_UPLOADS: `${API_BASE}/community/uploads`,
  
  // Teacher Service
  PROFILE: `${API_BASE}/profile/api/profile`,
  PROFILE_ME: `${API_BASE}/profile/api/profile/me`,
  TEACHER_HEALTH: `${API_BASE}/profile/health`,
  
  // Report Service
  REPORTS: `${API_BASE}/reports/api/reports`,
};

export default API_ENDPOINTS; 