import { useState, useEffect, useMemo } from 'react';
import { getUsers, getDepartments, getKpisByEmployee, getRatingsByEmployee, getReviewCycles, getActiveReviewCycle, getKpis } from '../lib/storage';
import { calculateTotalScore, calculateTeamAverage, getScoreBgClass } from '../lib/calculations';
import { ROLES } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CEO() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allCycles = getReviewCycles();
    setCycles(allCycles);
    const active = allCycles.find((c) => c.isActive);
    if (active) setSelectedCycleId(active.id);
    setLoading(false);
  }, []);

  const dashboardData = useMemo(() => {
    if (!selectedCycleId) return null;

    const allUsers = getUsers();
    const departments = getDepartments();
    const managers = allUsers.filter((u) => u.role === ROLES.MANAGER);
    const employees = allUsers.filter((u) => u.role === ROLES.EMPLOYEE);

    // Calculate scores per employee
    const empScores = employees.map((emp) => {
      const kpis = getKpisByEmployee(emp.id, selectedCycleId);
      const ratings = getRatingsByEmployee(emp.id, selectedCycleId);
      const score = calculateTotalScore(kpis, ratings);
      return { ...emp, score };
    });

    // Team data per manager
    const teamData = managers.map((mgr) => {
      const teamMembers = empScores.filter((e) => e.managerId === mgr.id);
      const scores = teamMembers.map((m) => m.score);
      const avg = calculateTeamAverage(scores);
      const topPerformer = teamMembers.filter((m) => m.score != null).sort((a, b) => b.score - a.score)[0];
      const atRiskCount = teamMembers.filter((m) => m.score != null && m.score < 60).length;
      const dept = departments.find((d) => d.id === mgr.departmentId);
      return {
        managerId: mgr.id,
        managerName: mgr.name,
        teamName: dept?.name || 'Unassigned',
        avgScore: avg,
        topPerformer: topPerformer?.name || '—',
        atRiskCount,
        memberCount: teamMembers.length,
      };
    });

    // Department comparison
    const deptData = departments.map((dept) => {
      const deptEmployees = empScores.filter((e) => e.departmentId === dept.id);
      const avg = calculateTeamAverage(deptEmployees.map((e) => e.score));
      return { name: dept.name, avgScore: avg };
    });

    // Company average
    const companyAvg = calculateTeamAverage(empScores.map((e) => e.score));

    // KPI distribution
    const allKpis = getKpis().filter((k) => k.reviewCycleId === selectedCycleId);
    const kpiCounts = {};
    allKpis.forEach((k) => { kpiCounts[k.name] = (kpiCounts[k.name] || 0) + 1; });
    const kpiDistribution = Object.entries(kpiCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Best and lowest teams
    const scoredTeams = teamData.filter((t) => t.avgScore != null);
    const bestTeam = scoredTeams.sort((a, b) => b.avgScore - a.avgScore)[0] || null;
    const lowestTeam = scoredTeams.sort((a, b) => a.avgScore - b.avgScore)[0] || null;

    return { teamData, deptData, companyAvg, kpiDistribution, bestTeam, lowestTeam };
  }, [selectedCycleId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Company Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organization-wide performance overview</p>
        </div>
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.label}{c.isActive ? ' (Active)' : ''}</option>
          ))}
        </select>
      </div>

      {!dashboardData || (!dashboardData.teamData.some((t) => t.avgScore != null) && !dashboardData.companyAvg) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No review data available for this cycle yet.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company Average</p>
              <p className={`text-2xl font-bold mt-1 ${dashboardData.companyAvg != null ? (dashboardData.companyAvg >= 80 ? 'text-emerald-600' : dashboardData.companyAvg >= 60 ? 'text-amber-500' : 'text-red-500') : 'text-gray-400'}`}>
                {dashboardData.companyAvg != null ? `${dashboardData.companyAvg}%` : 'Pending'}
              </p>
            </div>
            <div className={`rounded-xl border p-5 ${dashboardData.bestTeam ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Best Team</p>
              <p className="text-lg font-semibold text-emerald-700 mt-1">{dashboardData.bestTeam?.teamName ?? '—'}</p>
              {dashboardData.bestTeam && <p className="text-xs text-emerald-600">{dashboardData.bestTeam.avgScore}% avg</p>}
            </div>
            <div className={`rounded-xl border p-5 ${dashboardData.lowestTeam && dashboardData.lowestTeam.avgScore < 60 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Needs Attention</p>
              <p className={`text-lg font-semibold mt-1 ${dashboardData.lowestTeam && dashboardData.lowestTeam.avgScore < 60 ? 'text-red-700' : 'text-gray-700'}`}>
                {dashboardData.lowestTeam?.teamName ?? '—'}
              </p>
              {dashboardData.lowestTeam && <p className="text-xs text-gray-500">{dashboardData.lowestTeam.avgScore}% avg</p>}
            </div>
          </div>

          {/* Department Chart */}
          {dashboardData.deptData.some((d) => d.avgScore != null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Department Comparison</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dashboardData.deptData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                    {dashboardData.deptData.map((entry, i) => (
                      <Cell key={i} fill={entry.avgScore == null ? '#e2e8f0' : entry.avgScore >= 80 ? '#059669' : entry.avgScore >= 60 ? '#d97706' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Team Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Team Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3 text-center">Members</th>
                    <th className="px-6 py-3 text-center">Avg Score</th>
                    <th className="px-6 py-3">Top Performer</th>
                    <th className="px-6 py-3 text-center">At Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboardData.teamData.map((team) => (
                    <tr key={team.managerId} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 font-medium text-gray-900">{team.teamName}</td>
                      <td className="px-6 py-3.5 text-gray-600">{team.managerName}</td>
                      <td className="px-6 py-3.5 text-center text-gray-600">{team.memberCount}</td>
                      <td className="px-6 py-3.5 text-center">
                        {team.avgScore != null ? (
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgClass(team.avgScore)}`}>
                            {team.avgScore}%
                          </span>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{team.topPerformer}</td>
                      <td className="px-6 py-3.5 text-center">
                        {team.atRiskCount > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{team.atRiskCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI Distribution */}
          {dashboardData.kpiDistribution.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">KPI Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dashboardData.kpiDistribution} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
