import { PERFORMANCE_CATEGORIES } from './constants';

/**
 * Calculate the final contribution for a single KPI.
 * Final Contribution = (Manager Rating / 5) * Weight
 */
export function calculateContribution(managerRating, weight) {
  if (managerRating == null) return null;
  return (managerRating / 5) * weight;
}

/**
 * Calculate total score for an employee given their KPIs and ratings.
 * Returns null if manager hasn't rated any KPIs yet.
 * Returns the sum of all final contributions as a percentage.
 */
export function calculateTotalScore(kpis, ratings) {
  if (!kpis || kpis.length === 0) return null;

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r.kpiId] = r;
  });

  let hasAnyManagerRating = false;
  let total = 0;

  for (const kpi of kpis) {
    const rating = ratingMap[kpi.id];
    if (rating && rating.managerRating != null) {
      hasAnyManagerRating = true;
      total += calculateContribution(rating.managerRating, kpi.weight);
    }
  }

  if (!hasAnyManagerRating) return null;
  return Math.round(total * 100) / 100;
}

/**
 * Get performance category based on total score.
 */
export function getPerformanceCategory(score) {
  if (score == null) return null;
  if (score >= PERFORMANCE_CATEGORIES.HIGH.min) return PERFORMANCE_CATEGORIES.HIGH;
  if (score >= PERFORMANCE_CATEGORIES.MEDIUM.min) return PERFORMANCE_CATEGORIES.MEDIUM;
  return PERFORMANCE_CATEGORIES.AT_RISK;
}

/**
 * Calculate the difference between manager rating and self rating.
 */
export function calculateDifference(managerRating, selfRating) {
  if (managerRating == null || selfRating == null) return null;
  return managerRating - selfRating;
}

/**
 * Get the highlight class for a difference value.
 * |diff| == 1 → warning (yellow)
 * |diff| >= 2 → critical (red)
 */
export function getDifferenceHighlight(difference) {
  if (difference == null) return '';
  const abs = Math.abs(difference);
  if (abs >= 2) return 'critical';
  if (abs === 1) return 'warning';
  return '';
}

/**
 * Get color classes for a score value.
 */
export function getScoreColorClass(score) {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function getScoreBgClass(score) {
  if (score == null) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

/**
 * Get submission status for an employee.
 */
export function getEmployeeStatus(kpis, ratings) {
  if (!kpis || kpis.length === 0) return { label: 'No KPIs Assigned', color: 'gray' };

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r.kpiId] = r;
  });

  const allSelfSubmitted = kpis.every((k) => ratingMap[k.id]?.submittedByEmployee);
  const allManagerSubmitted = kpis.every((k) => ratingMap[k.id]?.submittedByManager);

  if (allManagerSubmitted) return { label: 'Reviewed', color: 'green' };
  if (allSelfSubmitted) return { label: 'Awaiting Manager Review', color: 'blue' };
  return { label: 'Pending Self-Rating', color: 'yellow' };
}

/**
 * Calculate team average score.
 */
export function calculateTeamAverage(memberScores) {
  const validScores = memberScores.filter((s) => s != null);
  if (validScores.length === 0) return null;
  const avg = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  return Math.round(avg * 100) / 100;
}
