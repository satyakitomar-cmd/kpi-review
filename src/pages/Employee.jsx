import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getKpisByEmployee, getRatingsByEmployee, saveRatings, getRatings, getActiveReviewCycle } from '../lib/storage';
import { calculateContribution, calculateTotalScore, getPerformanceCategory, calculateDifference, getDifferenceHighlight, getScoreBgClass } from '../lib/calculations';
import { RATING_MIN, RATING_MAX } from '../lib/constants';

export default function Employee() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [kpis, setKpis] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selfRatings, setSelfRatings] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeCycle = getActiveReviewCycle();
    setCycle(activeCycle);
    if (activeCycle) {
      const empKpis = getKpisByEmployee(user.id, activeCycle.id);
      const empRatings = getRatingsByEmployee(user.id, activeCycle.id);
      setKpis(empKpis);
      setRatings(empRatings);

      const initial = {};
      empKpis.forEach((kpi) => {
        const rating = empRatings.find((r) => r.kpiId === kpi.id);
        initial[kpi.id] = rating?.selfRating || '';
      });
      setSelfRatings(initial);
      setSubmitted(empRatings.length > 0 && empRatings.every((r) => r.submittedByEmployee));
    }
    setLoading(false);
  }, [user.id]);

  const ratingMap = useMemo(() => {
    const map = {};
    ratings.forEach((r) => { map[r.kpiId] = r; });
    return map;
  }, [ratings]);

  const totalScore = useMemo(() => calculateTotalScore(kpis, ratings), [kpis, ratings]);
  const category = useMemo(() => getPerformanceCategory(totalScore), [totalScore]);
  const hasManagerRatings = ratings.some((r) => r.managerRating != null);

  const handleSubmit = () => {
    // Validate all KPIs have ratings
    for (const kpi of kpis) {
      const val = selfRatings[kpi.id];
      if (!val || val < RATING_MIN || val > RATING_MAX) {
        addToast(`Please rate all KPIs (${RATING_MIN}-${RATING_MAX})`, 'error');
        return;
      }
    }

    const allRatings = getRatings();
    kpis.forEach((kpi) => {
      const existing = allRatings.find((r) => r.kpiId === kpi.id && r.employeeId === user.id);
      if (existing) {
        existing.selfRating = Number(selfRatings[kpi.id]);
        existing.submittedByEmployee = true;
      } else {
        allRatings.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          kpiId: kpi.id,
          employeeId: user.id,
          reviewCycleId: cycle.id,
          selfRating: Number(selfRatings[kpi.id]),
          managerRating: null,
          submittedByEmployee: true,
          submittedByManager: false,
          locked: false,
        });
      }
    });
    saveRatings(allRatings);
    setRatings(getRatingsByEmployee(user.id, cycle.id));
    setSubmitted(true);
    addToast('Self-ratings submitted successfully');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>;
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No Active Review Cycle</p>
        <p className="text-sm mt-1">Contact your administrator to set up a review cycle.</p>
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div>
        <Header cycle={cycle} />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium">No KPIs Assigned</p>
          <p className="text-sm text-gray-400 mt-1">Your KPIs haven't been assigned for this cycle yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header cycle={cycle} />

      {/* Score Summary */}
      {hasManagerRatings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Score</p>
              <p className={`text-3xl font-bold mt-1 ${totalScore >= 80 ? 'text-emerald-600' : totalScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {totalScore}%
              </p>
            </div>
            {category && (
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getScoreBgClass(totalScore)}`}>
                {category.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Table / Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {submitted ? 'Review Results' : 'Self-Assessment'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {submitted ? 'Your ratings have been submitted' : 'Rate yourself on each KPI (1-5)'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">KPI</th>
                <th className="px-6 py-3 text-center">Weight</th>
                <th className="px-6 py-3 text-center">Self Rating</th>
                {hasManagerRatings && (
                  <>
                    <th className="px-6 py-3 text-center">Manager Rating</th>
                    <th className="px-6 py-3 text-center">Difference</th>
                    <th className="px-6 py-3 text-center">Contribution</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kpis.map((kpi) => {
                const rating = ratingMap[kpi.id];
                const diff = rating ? calculateDifference(rating.managerRating, rating.selfRating) : null;
                const highlight = getDifferenceHighlight(diff);
                const contribution = rating ? calculateContribution(rating.managerRating, kpi.weight) : null;

                return (
                  <tr key={kpi.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{kpi.name}</td>
                    <td className="px-6 py-3.5 text-center text-gray-600">{kpi.weight}%</td>
                    <td className="px-6 py-3.5 text-center">
                      {submitted ? (
                        <span className="text-gray-700">{selfRatings[kpi.id]}</span>
                      ) : (
                        <input
                          type="number"
                          min={RATING_MIN}
                          max={RATING_MAX}
                          value={selfRatings[kpi.id]}
                          onChange={(e) => setSelfRatings((prev) => ({ ...prev, [kpi.id]: e.target.value }))}
                          className="w-16 text-center border border-gray-300 rounded-lg py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      )}
                    </td>
                    {hasManagerRatings && (
                      <>
                        <td className="px-6 py-3.5 text-center text-gray-700">
                          {rating?.managerRating ?? '—'}
                        </td>
                        <td className="px-6 py-3.5 text-center">
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
                        <td className="px-6 py-3.5 text-center font-medium text-gray-700">
                          {contribution != null ? `${contribution.toFixed(1)}%` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!submitted && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Submit Self-Ratings
            </button>
          </div>
        )}

        {submitted && !hasManagerRatings && (
          <div className="px-6 py-4 border-t border-gray-100 bg-blue-50">
            <p className="text-sm text-blue-700">Your self-ratings have been submitted. Waiting for your manager's review.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ cycle }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">My Performance Review</h1>
      <p className="text-sm text-gray-500 mt-0.5">Review Cycle: {cycle.label}</p>
    </div>
  );
}
