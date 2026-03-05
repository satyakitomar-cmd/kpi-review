import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { seedIfNeeded } from './lib/seedData';
import { ROLES } from './lib/constants';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Employee from './pages/Employee';
import Manager from './pages/Manager';
import CEO from './pages/CEO';
import AdminUsers from './pages/AdminUsers';
import AdminKpis from './pages/AdminKpis';
import AdminCycles from './pages/AdminCycles';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <Login />;

  const roleRedirects = {
    [ROLES.ADMIN]: '/admin/users',
    [ROLES.CEO]: '/ceo',
    [ROLES.MANAGER]: '/manager',
    [ROLES.EMPLOYEE]: '/employee',
  };

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Employee */}
        {user.role === ROLES.EMPLOYEE && (
          <Route path="/employee" element={<Employee />} />
        )}
        {/* Manager */}
        {user.role === ROLES.MANAGER && (
          <Route path="/manager" element={<Manager />} />
        )}
        {/* CEO */}
        {user.role === ROLES.CEO && (
          <Route path="/ceo" element={<CEO />} />
        )}
        {/* Admin */}
        {user.role === ROLES.ADMIN && (
          <>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/kpis" element={<AdminKpis />} />
            <Route path="/admin/cycles" element={<AdminCycles />} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to={roleRedirects[user.role] || '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    seedIfNeeded();
  }, []);

  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
