import { useState, useEffect, useMemo } from 'react';
import { getUsers, getReviewCycles, getKpisByEmployee, getKpis, saveKpi, deleteKpi } from '../lib/storage';
import { useToast } from '../components/Toast';
import { ROLES } from '../lib/constants';

export default function AdminKpis() {
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [kpiName, setKpiName] = useState('');
  const [kpiWeight, setKpiWeight] = useState('');
  const [editingKpi, setEditingKpi] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    setEmployees(getUsers().filter((u) => u.role === ROLES.EMPLOYEE));
    const allCycles = getReviewCycles();
    setCycles(allCycles);
    const active = allCycles.find((c) => c.isActive);
    if (active) setSelectedCycleId(active.id);
  }, []);

  const assignedKpis = useMemo(() => {
    if (!selectedEmpId || !selectedCycleId) return [];
    return getKpisByEmployee(selectedEmpId, selectedCycleId);
  }, [selectedEmpId, selectedCycleId, refreshKey]);

  const totalWeight = useMemo(() => {
    return assignedKpis.reduce((sum, k) => sum + k.weight, 0);
  }, [assignedKpis]);

  const handleAddKpi = () => {
    if (!selectedEmpId || !selectedCycleId) {
      addToast('Select an employee and review cycle first', 'error');
      return;
    }
    if (!kpiName.trim() || !kpiWeight) {
      addToast('Fill in KPI name and weight', 'error');
      return;
    }
    const weight = Number(kpiWeight);
    if (weight <= 0 || weight > 100) {
      addToast('Weight must be between 1 and 100', 'error');
      return;
    }

    if (editingKpi) {
      const otherWeight = totalWeight - editingKpi.weight;
      if (otherWeight + weight > 100) {
        addToast(`Total weight would be ${otherWeight + weight}%. Must not exceed 100%.`, 'error');
        return;
      }
      saveKpi({ ...editingKpi, name: kpiName.trim(), weight });
      setEditingKpi(null);
      addToast('KPI updated');
    } else {
      if (totalWeight + weight > 100) {
        addToast(`Total weight would be ${totalWeight + weight}%. Must not exceed 100%.`, 'error');
        return;
      }
      saveKpi({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        employeeId: selectedEmpId,
        reviewCycleId: selectedCycleId,
        name: kpiName.trim(),
        weight,
      });
      addToast('KPI added');
    }

    setKpiName('');
    setKpiWeight('');
    setRefreshKey((k) => k + 1);
  };

  const handleEdit = (kpi) => {
    setEditingKpi(kpi);
    setKpiName(kpi.name);
    setKpiWeight(kpi.weight.toString());
  };

  const handleDeleteKpi = (kpiId) => {
    deleteKpi(kpiId);
    addToast('KPI deleted');
    setRefreshKey((k) => k + 1);
  };

  const cancelEdit = () => {
    setEditingKpi(null);
    setKpiName('');
    setKpiWeight('');
  };

  const weightColor = totalWeight === 100 ? 'text-emerald-600' : totalWeight > 100 ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">KPI Assignment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign KPIs with weights to employees</p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedEmpId}
              onChange={(e) => { setSelectedEmpId(e.target.value); setEditingKpi(null); setKpiName(''); setKpiWeight(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Select Employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.userId})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Cycle</label>
            <select
              value={selectedCycleId}
              onChange={(e) => { setSelectedCycleId(e.target.value); setRefreshKey((k) => k + 1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Select Cycle</option>
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedEmpId && selectedCycleId && (
        <>
          {/* Add/Edit KPI Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">{editingKpi ? 'Edit KPI' : 'Add KPI'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Total Weight:</span>
                <span className={`text-sm font-bold ${weightColor}`}>{totalWeight}%</span>
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">KPI Name</label>
                <input
                  type="text"
                  value={kpiName}
                  onChange={(e) => setKpiName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Code Quality"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-500 mb-1">Weight (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={kpiWeight}
                  onChange={(e) => setKpiWeight(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={handleAddKpi}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                {editingKpi ? 'Update' : 'Add'}
              </button>
              {editingKpi && (
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
              )}
            </div>
            {/* Weight progress bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${totalWeight === 100 ? 'bg-emerald-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Assigned KPIs */}
          {assignedKpis.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Assigned KPIs</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">KPI Name</th>
                    <th className="px-6 py-3 text-center">Weight</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignedKpis.map((kpi) => (
                    <tr key={kpi.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-900">{kpi.name}</td>
                      <td className="px-6 py-3 text-center text-gray-600">{kpi.weight}%</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => handleEdit(kpi)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">Edit</button>
                        <button onClick={() => handleDeleteKpi(kpi.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No KPIs assigned yet. Add KPIs above.
            </div>
          )}
        </>
      )}
    </div>
  );
}
