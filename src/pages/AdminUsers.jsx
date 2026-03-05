import { useState, useEffect } from 'react';
import { getUsers, createUser, saveUser, deleteUser, getDepartments, getUsersByRole } from '../lib/storage';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { ROLES } from '../lib/constants';

const emptyUser = { name: '', userId: '', password: '', role: ROLES.EMPLOYEE, managerId: '', departmentId: '' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { addToast } = useToast();

  const refresh = () => {
    setUsers(getUsers());
    setManagers(getUsersByRole(ROLES.MANAGER));
    setDepartments(getDepartments());
  };

  useEffect(() => { refresh(); }, []);

  const openAdd = () => {
    setEditUser(null);
    setForm(emptyUser);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, userId: user.userId, password: user.password, role: user.role, managerId: user.managerId || '', departmentId: user.departmentId || '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.userId.trim() || !form.password.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    // Check duplicate userId
    const existing = getUsers().find((u) => u.userId === form.userId.trim() && u.id !== editUser?.id);
    if (existing) {
      addToast('User ID already exists', 'error');
      return;
    }

    if (editUser) {
      saveUser({ ...editUser, ...form, userId: form.userId.trim(), managerId: form.managerId || null, departmentId: form.departmentId || null });
      addToast('User updated successfully');
    } else {
      createUser({ ...form, userId: form.userId.trim(), managerId: form.managerId || null, departmentId: form.departmentId || null });
      addToast('User created successfully');
    }
    setModalOpen(false);
    refresh();
  };

  const handleDelete = (user) => {
    deleteUser(user.id);
    setConfirmDelete(null);
    addToast('User deleted');
    refresh();
  };

  const getManagerName = (managerId) => {
    if (!managerId) return '—';
    const mgr = users.find((u) => u.id === managerId);
    return mgr?.name || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">User ID</th>
                <th className="px-6 py-3">Manager</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === ROLES.ADMIN ? 'bg-purple-100 text-purple-700' :
                      user.role === ROLES.CEO ? 'bg-indigo-100 text-indigo-700' :
                      user.role === ROLES.MANAGER ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600 font-mono text-xs">{user.userId}</td>
                  <td className="px-6 py-3.5 text-gray-600">{getManagerName(user.managerId)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(user)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          {(form.role === ROLES.EMPLOYEE) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              <select
                value={form.managerId}
                onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">None</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete User">
        <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
