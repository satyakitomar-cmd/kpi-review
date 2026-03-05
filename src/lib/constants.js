export const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  CEO: 'CEO',
  ADMIN: 'Admin',
};

export const STORAGE_KEYS = {
  USERS: 'kpi_users',
  DEPARTMENTS: 'kpi_departments',
  KPIS: 'kpi_kpis',
  RATINGS: 'kpi_ratings',
  REVIEW_CYCLES: 'kpi_review_cycles',
  NOTIFICATIONS: 'kpi_notifications',
  COMMENTS: 'kpi_comments',
  SEEDED: 'kpi_seeded',
};

export const PERFORMANCE_CATEGORIES = {
  HIGH: { label: 'High Performer', color: 'green', min: 80 },
  MEDIUM: { label: 'Medium Performer', color: 'yellow', min: 60 },
  AT_RISK: { label: 'At Risk', color: 'red', min: 0 },
};

export const RATING_MIN = 1;
export const RATING_MAX = 5;
