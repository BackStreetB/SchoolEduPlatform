// API Configuration - route through nginx gateway
const API_BASE = '/api';

export const API_ENDPOINTS = {
  // Auth Service
  AUTH_LOGIN: `${API_BASE}/auth/login`,
  AUTH_REGISTER: `${API_BASE}/auth/register`,
  AUTH_PROFILE: `${API_BASE}/auth/profile`,
  AUTH_FORGOT: `${API_BASE}/auth/forgot-password`,
  AUTH_RESET: `${API_BASE}/auth/reset-password`,
  AUTH_CHANGE_PASSWORD: `${API_BASE}/auth/change-password`,
  
  // Event Service
  EVENTS: `${API_BASE}/events`,
  EVENT_BY_ID: (id) => `${API_BASE}/events/${id}`,
  EVENTS_JOINED: `${API_BASE}/events/joined`,
  
  // Diary Service
  DIARY: `${API_BASE}/diary`,
  DIARY_BY_ID: (id) => `${API_BASE}/diary/${id}`,
  
  // Community Service
  COMMUNITY: `${API_BASE}/community`,
  COMMUNITY_BY_ID: (id) => `${API_BASE}/community/${id}`,
  COMMUNITY_REACTIONS: (id) => `${API_BASE}/community/${id}/reactions`,
  COMMUNITY_COMMENTS: (id) => `${API_BASE}/community/${id}/comments`,
  COMMUNITY_COMMENT_BY_ID: (id) => `${API_BASE}/community/comments/${id}`,
  COMMUNITY_UPLOADS: `${API_BASE}/community/uploads`,
  
  // Teacher Service
  PROFILE: `${API_BASE}/profile`,
  PROFILE_ME: `${API_BASE}/profile/me`,
  TEACHER_HEALTH: `${API_BASE}/profile/health`,
  
  // Report Service
  REPORTS: `${API_BASE}/reports`,
};

export default API_ENDPOINTS; 