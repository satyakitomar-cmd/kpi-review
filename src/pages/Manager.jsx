import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getUsersByManager, getKpisByEmployee, getRatingsByEmployee, getRatings, saveRatings, getActiveReviewCycle, getNotifications, markNotificationRead, getComments, addComment, addNotification } from '../lib/storage';
import { calculateContribution, calculateTotalScore, getPerformanceCategory, calculateDifference, getDifferenceHighlight, getScoreBgClass, getEmployeeStatus, calculateTeamAverage } from '../lib/calculations';
import RatingInput from '../components/RatingInput';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Manager() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [managerRatings, setManagerRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const activeCycle = getActiveReviewCycle();
    setCycle(activeCycle);
    if (activeCycle) {
      const reports = getUsersByManager(user.id);
      setEmployees(reports);
    }
    setNotifications(getNotifications(user.id));
    setLoading(false);
  }, [user.id, refreshKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const teamData = useMemo(() => {
    if (!cycle || employees.length === 0) return [];
    return employees.map((emp) => {
      const kpis = getKpisByEmployee(emp.id, cycle.id);
      const ratings = getRatingsByEmployee(emp.id, cycle.id);
      const score = calculateTotalScore(kpis, ratings);
      const status = getEmployeeStatus(kpis, ratings);
      return { ...emp, kpis, ratings, score, status };
    });
  }, [employees, cycle, refreshKey]);

  const teamAvg = useMemo(() => calculateTeamAverage(teamData.map((d) => d.score)), [teamData]);
  const topPerformer = useMemo(() => {
    const scored = teamData.filter((d) => d.score != null);
    return scored.sort((a, b) => b.score - a.score)[0] || null;
  }, [teamData]);
  const atRisk = useMemo(() => {
    const scored = teamData.filter((d) => d.score != null && d.score < 60);
    return scored.sort((a, b) => a.score - b.score)[0] || null;
  }, [teamData]);

  const chartData = useMemo(() => {
    return teamData.map((d) => ({
      name: d.name.split(' ')[0],
      score: d.score ?? 0,
      hasScore: d.score != null,
    }));
  }, [teamData]);

  const selectEmployee = (emp) => {
    const kpis = getKpisByEmployee(emp.id, cycle.id);
    const ratings = getRatingsByEmployee(emp.id, cycle.id);
    const initial = {};
    kpis.forEach((kpi) => {
      const r = ratings.find((r) => r.kpiId === kpi.id);
      initial[kpi.id] = r?.managerRating || '';
    });
    setManagerRatings(initial);
    setSelectedEmp({ ...emp, kpis, ratings });
  };

  const handleSubmitRatings = () => {
    for (const kpi of selectedEmp.kpis) {
      const val = managerRatings[kpi.id];
      if (!val || val < 1 || val > 5) {
        addToast('Please rate all KPIs (1-5)', 'error');
        return;
      }
    }

    const allRatings = getRatings();
    selectedEmp.kpis.forEach((kpi) => {
      const existing = allRatings.find((r) => r.kpiId === kpi.id && r.employeeId === selectedEmp.id);
      if (existing) {
        existing.managerRating = Number(managerRatings[kpi.id]);
        existing.submittedByManager = true;
        existing.locked = true;
      }
    });
    saveRatings(allRatings);
    addNotification({
      targetUserId: selectedEmp.id,
      fromUserId: user.id,
      fromUserName: user.name,
      type: 'manager_rating_submitted',
      message: `${user.name} has completed your performance review for ${cycle.label}`,
      reviewCycleId: cycle.id,
    });
    addToast('Manager ratings submitted successfully');
    setSelectedEmp(null);
    setRefreshKey((k) => k + 1);
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) markNotificationRead(n.id);
    });
    setNotifications(getNotifications(user.id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>;
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No Active Review Cycle</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cycle.label} &middot; {employees.length} direct reports</p>
        </div>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-5 text-center text-sm text-gray-400">No notifications</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className={`px-5 py-3 text-sm ${n.read ? 'bg-white' : 'bg-indigo-50'}`}>
                  <p className={`${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Team Average</p>
          <p className={`text-2xl font-bold mt-1 ${teamAvg != null ? (teamAvg >= 80 ? 'text-emerald-600' : teamAvg >= 60 ? 'text-amber-500' : 'text-red-500') : 'text-gray-400'}`}>
            {teamAvg != null ? `${teamAvg}%` : 'Pending'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Top Performer</p>
          <p className="text-lg font-semibold text-emerald-600 mt-1">{topPerformer?.name ?? '—'}</p>
          {topPerformer && <p className="text-xs text-gray-500">{topPerformer.score}%</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">At Risk</p>
          <p className="text-lg font-semibold text-red-500 mt-1">{atRisk?.name ?? 'None'}</p>
          {atRisk && <p className="text-xs text-gray-500">{atRisk.score}%</p>}
        </div>
      </div>

      {/* Team Chart */}
      {chartData.some((d) => d.hasScore) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Team Scores</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={!entry.hasScore ? '#e2e8f0' : entry.score >= 80 ? '#059669' : entry.score >= 60 ? '#d97706' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Employee Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Direct Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teamData.map((emp) => {
            const cat = getPerformanceCategory(emp.score);
            return (
              <div
                key={emp.id}
                onClick={() => selectEmployee(emp)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{emp.userId}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    emp.status.color === 'green' ? 'bg-emerald-50 text-emerald-700' :
                    emp.status.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                    emp.status.color === 'yellow' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {emp.status.label}
                  </span>
                </div>
                {emp.score != null && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-sm font-semibold ${emp.score >= 80 ? 'text-emerald-600' : emp.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {emp.score}%
                    </span>
                    {cat && (
                      <span className={`text-xs ${getScoreBgClass(emp.score)} px-2 py-0.5 rounded-full`}>
                        {cat.label}
                      </span>
                    )}
                  </div>
                )}
                {emp.kpis.length === 0 && (
                  <p className="mt-2 text-xs text-gray-400">No KPIs Assigned</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating Panel (Modal-like) */}
      {selectedEmp && (
        <RatingPanel
          employee={selectedEmp}
          managerRatings={managerRatings}
          setManagerRatings={setManagerRatings}
          onSubmit={handleSubmitRatings}
          onClose={() => setSelectedEmp(null)}
          currentUser={user}
          cycle={cycle}
        />
      )}
    </div>
  );
}

function RatingPanel({ employee, managerRatings, setManagerRatings, onSubmit, onClose, currentUser, cycle }) {
  const { addToast } = useToast();
  const ratingMap = {};
  employee.ratings.forEach((r) => { ratingMap[r.kpiId] = r; });
  const alreadySubmitted = employee.ratings.length > 0 && employee.ratings.every((r) => r.submittedByManager);
  const employeeSubmitted = employee.ratings.length > 0 && employee.ratings.every((r) => r.submittedByEmployee);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setComments(getComments(employee.id, cycle.id));
  }, [employee.id, cycle.id]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment({
      employeeId: employee.id,
      reviewCycleId: cycle.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: newComment.trim(),
    });
    setComments(getComments(employee.id, cycle.id));
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
            <p className="text-xs text-gray-500">Review {employee.kpis.length} KPIs</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!employeeSubmitted && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-700">
            Employee hasn't submitted self-ratings yet.
          </div>
        )}

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
              {employee.kpis.map((kpi) => {
                const rating = ratingMap[kpi.id];
                const mgrVal = managerRatings[kpi.id];
                const selfVal = rating?.selfRating;
                const diff = mgrVal && selfVal ? Number(mgrVal) - selfVal : null;
                const highlight = getDifferenceHighlight(diff);
                const contribution = mgrVal ? calculateContribution(Number(mgrVal), kpi.weight) : null;

                return (
                  <tr key={kpi.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{kpi.name}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{kpi.weight}%</td>
                    <td className="px-5 py-3 text-center text-gray-600">{selfVal ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {alreadySubmitted ? (
                        <span className="text-gray-700">{rating?.managerRating}</span>
                      ) : (
                        <RatingInput
                          value={mgrVal}
                          onChange={(val) => setManagerRatings((prev) => ({ ...prev, [kpi.id]: val }))}
                        />
                      )}
                    </td>
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

        {!alreadySubmitted && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={onSubmit}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Submit Manager Ratings
            </button>
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Comments</h3>
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 mb-3">No comments yet. Add a note about this review.</p>
          )}
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900">{c.authorName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.authorRole === 'CEO' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
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
