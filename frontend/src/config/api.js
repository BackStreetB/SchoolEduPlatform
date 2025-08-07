// API Configuration
const API_BASE = '';

export const API_ENDPOINTS = {
  // Auth Service
  AUTH_LOGIN: `${API_BASE}/api/auth/auth/login`,
  AUTH_REGISTER: `${API_BASE}/api/auth/auth/register`,
  AUTH_PROFILE: `${API_BASE}/api/auth/auth/profile`,
  
  // Event Service
  EVENTS: `${API_BASE}/api/events/api/events`,
  EVENT_BY_ID: (id) => `${API_BASE}/api/events/api/events/${id}`,
  
  // Diary Service
  DIARY: `${API_BASE}/api/diary/api/diary`,
  DIARY_BY_ID: (id) => `${API_BASE}/api/diary/api/diary/${id}`,
  
  // Community Service
  COMMUNITY: `${API_BASE}/api/community/api/community`,
  COMMUNITY_BY_ID: (id) => `${API_BASE}/api/community/api/community/${id}`,
  COMMUNITY_REACTIONS: (id) => `${API_BASE}/api/community/api/community/${id}/reactions`,
  COMMUNITY_COMMENTS: (id) => `${API_BASE}/api/community/api/community/${id}/comments`,
  COMMUNITY_UPLOADS: `${API_BASE}/api/community/uploads`,
  
  // Teacher Service
  PROFILE: `${API_BASE}/api/profile/api/profile`,
  PROFILE_ME: `${API_BASE}/api/profile/api/profile/me`,
  TEACHER_HEALTH: `${API_BASE}/api/profile/health`,
  
  // Report Service
  REPORTS: `${API_BASE}/api/reports/api/reports`,
};

export default API_ENDPOINTS; 