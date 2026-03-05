import { STORAGE_KEYS } from './constants';

// Generic helpers
function getCollection(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Users
export function getUsers() {
  return getCollection(STORAGE_KEYS.USERS);
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

export function getUserByCredentials(userId, password) {
  return getUsers().find((u) => u.userId === userId && u.password === password) || null;
}

export function saveUser(user) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push({ ...user, id: user.id || generateId() });
  }
  saveCollection(STORAGE_KEYS.USERS, users);
  return user;
}

export function createUser(userData) {
  const user = { ...userData, id: generateId() };
  const users = getUsers();
  users.push(user);
  saveCollection(STORAGE_KEYS.USERS, users);
  return user;
}

export function deleteUser(id) {
  const users = getUsers().filter((u) => u.id !== id);
  saveCollection(STORAGE_KEYS.USERS, users);
}

export function getUsersByManager(managerId) {
  return getUsers().filter((u) => u.managerId === managerId);
}

export function getUsersByRole(role) {
  return getUsers().filter((u) => u.role === role);
}

export function getUsersByDepartment(departmentId) {
  return getUsers().filter((u) => u.departmentId === departmentId);
}

// Departments
export function getDepartments() {
  return getCollection(STORAGE_KEYS.DEPARTMENTS);
}

export function getDepartmentById(id) {
  return getDepartments().find((d) => d.id === id) || null;
}

export function saveDepartment(dept) {
  const depts = getDepartments();
  const idx = depts.findIndex((d) => d.id === dept.id);
  if (idx >= 0) {
    depts[idx] = dept;
  } else {
    depts.push({ ...dept, id: dept.id || generateId() });
  }
  saveCollection(STORAGE_KEYS.DEPARTMENTS, depts);
}

// KPIs
export function getKpis() {
  return getCollection(STORAGE_KEYS.KPIS);
}

export function getKpisByEmployee(employeeId, reviewCycleId) {
  return getKpis().filter(
    (k) => k.employeeId === employeeId && k.reviewCycleId === reviewCycleId
  );
}

export function saveKpi(kpi) {
  const kpis = getKpis();
  const idx = kpis.findIndex((k) => k.id === kpi.id);
  if (idx >= 0) {
    kpis[idx] = kpi;
  } else {
    kpis.push({ ...kpi, id: kpi.id || generateId() });
  }
  saveCollection(STORAGE_KEYS.KPIS, kpis);
  return kpi;
}

export function deleteKpi(id) {
  const kpis = getKpis().filter((k) => k.id !== id);
  saveCollection(STORAGE_KEYS.KPIS, kpis);
  // Also delete associated ratings
  const ratings = getRatings().filter((r) => r.kpiId !== id);
  saveCollection(STORAGE_KEYS.RATINGS, ratings);
}

export function saveKpis(kpiList) {
  saveCollection(STORAGE_KEYS.KPIS, kpiList);
}

// Ratings
export function getRatings() {
  return getCollection(STORAGE_KEYS.RATINGS);
}

export function getRatingsByEmployee(employeeId, reviewCycleId) {
  return getRatings().filter(
    (r) => r.employeeId === employeeId && r.reviewCycleId === reviewCycleId
  );
}

export function getRatingByKpi(kpiId) {
  return getRatings().find((r) => r.kpiId === kpiId) || null;
}

export function saveRating(rating) {
  const ratings = getRatings();
  const idx = ratings.findIndex((r) => r.id === rating.id);
  if (idx >= 0) {
    ratings[idx] = rating;
  } else {
    ratings.push({ ...rating, id: rating.id || generateId() });
  }
  saveCollection(STORAGE_KEYS.RATINGS, ratings);
  return rating;
}

export function saveRatings(ratingList) {
  saveCollection(STORAGE_KEYS.RATINGS, ratingList);
}

// Review Cycles
export function getReviewCycles() {
  return getCollection(STORAGE_KEYS.REVIEW_CYCLES);
}

export function getActiveReviewCycle() {
  return getReviewCycles().find((c) => c.isActive) || null;
}

export function getReviewCycleById(id) {
  return getReviewCycles().find((c) => c.id === id) || null;
}

export function saveReviewCycle(cycle) {
  const cycles = getReviewCycles();
  const idx = cycles.findIndex((c) => c.id === cycle.id);
  if (idx >= 0) {
    cycles[idx] = cycle;
  } else {
    cycles.push({ ...cycle, id: cycle.id || generateId() });
  }
  saveCollection(STORAGE_KEYS.REVIEW_CYCLES, cycles);
  return cycle;
}

export function setActiveCycle(cycleId) {
  const cycles = getReviewCycles().map((c) => ({
    ...c,
    isActive: c.id === cycleId,
  }));
  saveCollection(STORAGE_KEYS.REVIEW_CYCLES, cycles);
}

export function createReviewCycle(cycleData) {
  const cycle = { ...cycleData, id: generateId() };
  const cycles = getReviewCycles();
  if (cycle.isActive) {
    cycles.forEach((c) => (c.isActive = false));
  }
  cycles.push(cycle);
  saveCollection(STORAGE_KEYS.REVIEW_CYCLES, cycles);
  return cycle;
}

// Notifications
export function getNotifications(targetUserId) {
  const all = getCollection(STORAGE_KEYS.NOTIFICATIONS);
  return all.filter((n) => n.targetUserId === targetUserId).sort((a, b) => b.timestamp - a.timestamp);
}

export function addNotification(data) {
  const notifications = getCollection(STORAGE_KEYS.NOTIFICATIONS);
  notifications.push({
    ...data,
    id: generateId(),
    timestamp: Date.now(),
    read: false,
  });
  saveCollection(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function markNotificationRead(id) {
  const notifications = getCollection(STORAGE_KEYS.NOTIFICATIONS);
  const n = notifications.find((n) => n.id === id);
  if (n) n.read = true;
  saveCollection(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

// Comments
export function getComments(employeeId, reviewCycleId) {
  const all = getCollection(STORAGE_KEYS.COMMENTS);
  return all
    .filter((c) => c.employeeId === employeeId && c.reviewCycleId === reviewCycleId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function addComment(data) {
  const comments = getCollection(STORAGE_KEYS.COMMENTS);
  comments.push({
    ...data,
    id: generateId(),
    timestamp: Date.now(),
  });
  saveCollection(STORAGE_KEYS.COMMENTS, comments);
}

// Seeded check
export function isSeeded() {
  return localStorage.getItem(STORAGE_KEYS.SEEDED) === 'true';
}

export function markSeeded() {
  localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
}
