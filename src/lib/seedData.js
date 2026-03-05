import { STORAGE_KEYS, ROLES } from './constants';
import { isSeeded, markSeeded } from './storage';

export function seedIfNeeded() {
  if (isSeeded()) return;

  const deptEng = 'dept_eng';
  const deptMkt = 'dept_mkt';

  const departments = [
    { id: deptEng, name: 'Engineering' },
    { id: deptMkt, name: 'Marketing' },
  ];

  const users = [
    { id: 'u_admin', name: 'System Admin', role: ROLES.ADMIN, userId: 'admin', password: 'admin123', managerId: null, departmentId: null },
    { id: 'u_ceo', name: 'Jane Mitchell', role: ROLES.CEO, userId: 'ceo01', password: 'ceo123', managerId: null, departmentId: null },
    { id: 'u_mgr01', name: 'David Chen', role: ROLES.MANAGER, userId: 'mgr01', password: 'mgr123', managerId: null, departmentId: deptEng },
    { id: 'u_mgr02', name: 'Sarah Lopez', role: ROLES.MANAGER, userId: 'mgr02', password: 'mgr456', managerId: null, departmentId: deptMkt },
    { id: 'u_emp01', name: 'Alex Turner', role: ROLES.EMPLOYEE, userId: 'emp01', password: 'emp123', managerId: 'u_mgr01', departmentId: deptEng },
    { id: 'u_emp02', name: 'Priya Sharma', role: ROLES.EMPLOYEE, userId: 'emp02', password: 'emp456', managerId: 'u_mgr01', departmentId: deptEng },
    { id: 'u_emp03', name: 'Marcus Johnson', role: ROLES.EMPLOYEE, userId: 'emp03', password: 'emp789', managerId: 'u_mgr02', departmentId: deptMkt },
    { id: 'u_emp04', name: 'Lisa Wang', role: ROLES.EMPLOYEE, userId: 'emp04', password: 'emp000', managerId: 'u_mgr02', departmentId: deptMkt },
  ];

  const cycleId = 'cycle_q1_2026';
  const reviewCycles = [
    { id: cycleId, label: 'Q1 2026', startDate: '2026-01-01', endDate: '2026-03-31', isActive: true },
  ];

  const kpis = [
    // emp01
    { id: 'kpi_01', employeeId: 'u_emp01', reviewCycleId: cycleId, name: 'Code Quality', weight: 30 },
    { id: 'kpi_02', employeeId: 'u_emp01', reviewCycleId: cycleId, name: 'Delivery Speed', weight: 25 },
    { id: 'kpi_03', employeeId: 'u_emp01', reviewCycleId: cycleId, name: 'Team Collaboration', weight: 20 },
    { id: 'kpi_04', employeeId: 'u_emp01', reviewCycleId: cycleId, name: 'Documentation', weight: 15 },
    { id: 'kpi_05', employeeId: 'u_emp01', reviewCycleId: cycleId, name: 'Innovation', weight: 10 },
    // emp02
    { id: 'kpi_06', employeeId: 'u_emp02', reviewCycleId: cycleId, name: 'Code Quality', weight: 40 },
    { id: 'kpi_07', employeeId: 'u_emp02', reviewCycleId: cycleId, name: 'Delivery Speed', weight: 30 },
    { id: 'kpi_08', employeeId: 'u_emp02', reviewCycleId: cycleId, name: 'Team Collaboration', weight: 30 },
    // emp03
    { id: 'kpi_09', employeeId: 'u_emp03', reviewCycleId: cycleId, name: 'Campaign ROI', weight: 35 },
    { id: 'kpi_10', employeeId: 'u_emp03', reviewCycleId: cycleId, name: 'Content Quality', weight: 25 },
    { id: 'kpi_11', employeeId: 'u_emp03', reviewCycleId: cycleId, name: 'Lead Generation', weight: 25 },
    { id: 'kpi_12', employeeId: 'u_emp03', reviewCycleId: cycleId, name: 'Reporting', weight: 15 },
    // emp04
    { id: 'kpi_13', employeeId: 'u_emp04', reviewCycleId: cycleId, name: 'Campaign ROI', weight: 30 },
    { id: 'kpi_14', employeeId: 'u_emp04', reviewCycleId: cycleId, name: 'Content Quality', weight: 30 },
    { id: 'kpi_15', employeeId: 'u_emp04', reviewCycleId: cycleId, name: 'Lead Generation', weight: 20 },
    { id: 'kpi_16', employeeId: 'u_emp04', reviewCycleId: cycleId, name: 'Social Engagement', weight: 20 },
  ];

  // Pre-fill self-ratings for emp01 and emp03
  const ratings = [
    // emp01 self-ratings
    { id: 'r_01', kpiId: 'kpi_01', employeeId: 'u_emp01', reviewCycleId: cycleId, selfRating: 4, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_02', kpiId: 'kpi_02', employeeId: 'u_emp01', reviewCycleId: cycleId, selfRating: 3, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_03', kpiId: 'kpi_03', employeeId: 'u_emp01', reviewCycleId: cycleId, selfRating: 5, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_04', kpiId: 'kpi_04', employeeId: 'u_emp01', reviewCycleId: cycleId, selfRating: 3, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_05', kpiId: 'kpi_05', employeeId: 'u_emp01', reviewCycleId: cycleId, selfRating: 4, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    // emp03 self-ratings
    { id: 'r_06', kpiId: 'kpi_09', employeeId: 'u_emp03', reviewCycleId: cycleId, selfRating: 4, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_07', kpiId: 'kpi_10', employeeId: 'u_emp03', reviewCycleId: cycleId, selfRating: 3, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_08', kpiId: 'kpi_11', employeeId: 'u_emp03', reviewCycleId: cycleId, selfRating: 5, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
    { id: 'r_09', kpiId: 'kpi_12', employeeId: 'u_emp03', reviewCycleId: cycleId, selfRating: 4, managerRating: null, submittedByEmployee: true, submittedByManager: false, locked: false },
  ];

  localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.REVIEW_CYCLES, JSON.stringify(reviewCycles));
  localStorage.setItem(STORAGE_KEYS.KPIS, JSON.stringify(kpis));
  localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
  markSeeded();
}
