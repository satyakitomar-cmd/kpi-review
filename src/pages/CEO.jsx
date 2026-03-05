import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getUsers, getDepartments, getKpisByEmployee, getRatingsByEmployee, getReviewCycles, getKpis, getComments, addComment, getUserById } from '../lib/storage';
import { calculateTotalScore, calculateTeamAverage, getScoreBgClass, calculateContribution, calculateDifference, getDifferenceHighlight, getPerformanceCategory } from '../lib/calculations';
import { ROLES } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CEO() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);

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

    const empScores = employees.map((emp) => {
      const kpis = getKpisByEmployee(emp.id, selectedCycleId);
      const ratings = getRatingsByEmployee(emp.id, selectedCycleId);
      const score = calculateTotalScore(kpis, ratings);
      const manager = allUsers.find((u) => u.id === emp.managerId);
      return { ...emp, score, kpis, ratings, managerName: manager?.name || '—' };
    });

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

    const deptData = departments.map((dept) => {
      const deptEmployees = empScores.filter((e) => e.departmentId === dept.id);
      const avg = calculateTeamAverage(deptEmployees.map((e) => e.score));
      return { name: dept.name, avgScore: avg };
    });

    const companyAvg = calculateTeamAverage(empScores.map((e) => e.score));

    const allKpis = getKpis().filter((k) => k.reviewCycleId === selectedCycleId);
    const kpiCounts = {};
    allKpis.forEach((k) => { kpiCounts[k.name] = (kpiCounts[k.name] || 0) + 1; });
    const kpiDistribution = Object.entries(kpiCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const scoredTeams = [...teamData].filter((t) => t.avgScore != null);
    const bestTeam = [...scoredTeams].sort((a, b) => b.avgScore - a.avgScore)[0] || null;
    const lowestTeam = [...scoredTeams].sort((a, b) => a.avgScore - b.avgScore)[0] || null;

    return { teamData, deptData, companyAvg, kpiDistribution, bestTeam, lowestTeam, empScores };
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

          {/* Individual Employee Scores */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">All Employee Scores</h2>
              <p className="text-xs text-gray-500 mt-0.5">Click an employee to view details and add comments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3 text-center">Score</th>
                    <th className="px-6 py-3 text-center">Category</th>
                    <th className="px-6 py-3 text-center">KPIs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboardData.empScores.map((emp) => {
                    const cat = getPerformanceCategory(emp.score);
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setSelectedEmp(emp)}
                        className="hover:bg-indigo-50/50 cursor-pointer"
                      >
                        <td className="px-6 py-3.5 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-6 py-3.5 text-gray-600">{emp.managerName}</td>
                        <td className="px-6 py-3.5 text-center">
                          {emp.score != null ? (
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgClass(emp.score)}`}>
                              {emp.score}%
                            </span>
                          ) : (
                            <span className="text-gray-400">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {cat ? (
                            <span className={`text-xs font-medium ${
                              cat.color === 'green' ? 'text-emerald-600' :
                              cat.color === 'yellow' ? 'text-amber-600' : 'text-red-600'
                            }`}>{cat.label}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center text-gray-600">{emp.kpis.length}</td>
                      </tr>
                    );
                  })}
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

      {/* Employee Detail Modal */}
      {selectedEmp && (
        <EmployeeDetailModal
          employee={selectedEmp}
          cycleId={selectedCycleId}
          currentUser={user}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </div>
  );
}

function EmployeeDetailModal({ employee, cycleId, currentUser, onClose }) {
  const { addToast } = useToast();
  const kpis = employee.kpis;
  const ratings = employee.ratings;
  const score = employee.score;
  const category = getPerformanceCategory(score);

  const ratingMap = {};
  ratings.forEach((r) => { ratingMap[r.kpiId] = r; });

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setComments(getComments(employee.id, cycleId));
  }, [employee.id, cycleId]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment({
      employeeId: employee.id,
      reviewCycleId: cycleId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: newComment.trim(),
    });
    setComments(getComments(employee.id, cycleId));
    setNewComment('');
    addToast('Comment added');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{employee.name}</h2>
            <p className="text-xs text-gray-500">Manager: {employee.managerName}</p>
          </div>
          <div className="flex items-center gap-3">
            {score != null && category && (
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getScoreBgClass(score)}`}>
                {score}% &mdash; {category.label}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {kpis.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No KPIs assigned</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">KPI</th>
                  <th className="px-5 py-3 text-center">Weight</th>
                  <th className="px-5 py-3 text-center">Self</th>
                  <th className="px-5 py-3 text-center">Manager</th>
                  <th className="px-5 py-3 text-center">Diff</th>
                  <th className="px-5 py-3 text-center">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpis.map((kpi) => {
                  const rating = ratingMap[kpi.id];
                  const selfVal = rating?.selfRating;
                  const mgrVal = rating?.managerRating;
                  const diff = calculateDifference(mgrVal, selfVal);
                  const highlight = getDifferenceHighlight(diff);
                  const contribution = calculateContribution(mgrVal, kpi.weight);

                  return (
                    <tr key={kpi.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{kpi.name}</td>
                      <td className="px-5 py-3 text-center text-gray-600">{kpi.weight}%</td>
                      <td className="px-5 py-3 text-center text-gray-600">{selfVal ?? '—'}</td>
                      <td className="px-5 py-3 text-center text-gray-600">{mgrVal ?? '—'}</td>
                      <td className="px-5 py-3 text-center">
                        {diff != null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            highlight === 'critical' ? 'bg-red-100 text-red-700' :
                            highlight === 'warning' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-gray-700">
                        {contribution != null ? `${contribution.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Comments</h3>
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 mb-3">No comments yet. Add a note about this employee's review.</p>
          )}
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900">{c.authorName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.authorRole === 'CEO' ? 'bg-indigo-100 text-indigo-700' :
                    c.authorRole === 'Manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{c.authorRole}</span>
                  <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <button
              onClick={handleAddComment}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
