import api from './client';

// Object endpoints
export const objectsAPI = {
  getAll: (params = {}) => api.get('/api/objects', { params }),
  getById: (id) => api.get(`/api/objects/${id}`),
  getThumbnail: (id) => api.get(`/api/objects/${id}/thumbnail`, { responseType: 'blob' }),
  getByClass: (className, params = {}) => api.get(`/api/objects/by-class/${className}`, { params }),
  getNearby: (x, y, z, radius = 500) => api.get('/api/objects/nearby', { params: { x, y, z, radius } }),
  search: (params = {}) => api.get('/api/objects/search', { params }),
  delete: (id) => api.delete(`/api/objects/${id}`),
  bulkDelete: (ids) => api.post('/api/objects/bulk-delete', { object_ids: ids }),
};

// Statistics endpoints
export const statsAPI = {
  getSummary: () => api.get('/api/stats/summary'),
};

// Classes endpoints
export const classesAPI = {
  getAll: (params = {}) => api.get('/api/classes', { params }),
  getById: (id) => api.get(`/api/classes/${id}`),
  getStats: (id) => api.get(`/api/classes/${id}/stats`),
  create: (data) => api.post('/api/classes', data),
  update: (id, data) => api.put(`/api/classes/${id}`, data),
  delete: (id, cascade = false) => api.delete(`/api/classes/${id}`, { params: { cascade } }),
  bulkCreate: (classes) => api.post('/api/classes/bulk-create', { classes }),
  syncDetector: () => api.post('/api/detector/sync-classes'),
};

// Groups endpoints
export const groupsAPI = {
  getAll: () => api.get('/api/groups'),
  getById: (id) => api.get(`/api/groups/${id}`),
  getByName: (name) => api.get(`/api/groups/by-name/${name}`),
  getMembers: (id) => api.get(`/api/groups/${id}/members`),
  getObjectGroups: (objectId) => api.get(`/api/objects/${objectId}/groups`),
  create: (groupName, description = null) => api.post('/api/groups', { group_name: groupName, description }),
  addObjects: (groupId, objectIds) => api.post(`/api/groups/${groupId}/members`, { object_ids: objectIds }),
  removeObjects: (groupId, objectIds) => api.delete(`/api/groups/${groupId}/members`, { data: { object_ids: objectIds } }),
  update: (groupId, data) => api.put(`/api/groups/${groupId}`, data),
  delete: (groupId) => api.delete(`/api/groups/${groupId}`),
};

// Behavioral Events endpoints
export const eventsAPI = {
  getAll: (params = {}) => api.get('/api/events', { params }),
  getStats: () => api.get('/api/events/stats'),
  getStream: (since = null) => api.get('/api/events/stream', { params: { since } }),
  clear: (before = null) => api.delete('/api/events', { params: { before } }),
};

export default {
  objects: objectsAPI,
  stats: statsAPI,
  classes: classesAPI,
  groups: groupsAPI,
  events: eventsAPI,
};
