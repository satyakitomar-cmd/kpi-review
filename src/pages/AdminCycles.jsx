import { useState, useEffect } from 'react';
import { getReviewCycles, createReviewCycle, setActiveCycle } from '../lib/storage';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function AdminCycles() {
  const [cycles, setCycles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '', isActive: false });
  const { addToast } = useToast();

  const refresh = () => setCycles(getReviewCycles());
  useEffect(() => { refresh(); }, []);

  const handleCreate = () => {
    if (!form.label.trim() || !form.startDate || !form.endDate) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    if (form.startDate >= form.endDate) {
      addToast('End date must be after start date', 'error');
      return;
    }
    createReviewCycle({ ...form, label: form.label.trim() });
    addToast('Review cycle created');
    setModalOpen(false);
    setForm({ label: '', startDate: '', endDate: '', isActive: false });
    refresh();
  };

  const handleSetActive = (cycleId) => {
    setActiveCycle(cycleId);
    addToast('Active cycle updated');
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Review Cycles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cycles.length} cycles</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No review cycles created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map((cycle) => (
            <div key={cycle.id} className={`bg-white rounded-xl border p-5 ${cycle.isActive ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{cycle.label}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  cycle.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cycle.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Start: {cycle.startDate}</p>
                <p>End: {cycle.endDate}</p>
              </div>
              {!cycle.isActive && (
                <button
                  onClick={() => handleSetActive(cycle.id)}
                  className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Set as Active
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Review Cycle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="e.g., Q2 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Set as active cycle
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Create Cycle</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
