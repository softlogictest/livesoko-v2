import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { LiveFeed } from './pages/LiveFeed';
import { SessionDetail } from './pages/SessionDetail';
import { Settings } from './pages/Settings';
import { Dispatch } from './pages/Dispatch';
import { Sessions } from './pages/Sessions';
import { Billing } from './pages/Billing';
import { PublicOrderPage } from './pages/PublicOrderPage';
import { Network } from './pages/Network';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperInterface } from './pages/SuperInterface';
import { NotFound } from './pages/NotFound';
import { AppProvider, useAppContext } from './context/AppContext';
import { MaintenanceModal } from './components/MaintenanceModal';
import { fetchWithAuth, API } from './lib/api';

export { API };

const AppRoutes: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      dispatch({ type: 'SET_INSTALL_PROMPT', payload: e });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dispatch]);

  useEffect(() => {
    // Check for existing auth token in localStorage
    const token = localStorage.getItem('livesoko_token');
    if (token) {
      fetchWithAuth('/api/auth/me')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then(data => {
          dispatch({
            type: 'SET_USER',
            payload: { ...data.user, token } as any
          });
        })
        .catch(() => {
          localStorage.removeItem('livesoko_token');
          dispatch({ type: 'SET_USER', payload: null });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  if (loading) return <div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-brand-primary animate-ping"></div></div>;

  return (
      <div className="app-container max-w-md mx-auto relative min-h-screen bg-bg-base shadow-2xl pb-16">
        <Routes>
          <Route path="/" element={<Navigate to={state.user ? "/dashboard/live" : "/login"} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/live" element={<ProtectedRoute><LiveFeed /></ProtectedRoute>} />
          <Route path="/dashboard/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
          <Route path="/dashboard/session/:id" element={<ProtectedRoute><SessionDetail /></ProtectedRoute>} />
          <Route path="/dashboard/sessions" element={<ProtectedRoute requireManager><Sessions /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute requireManager><Settings /></ProtectedRoute>} />
          <Route path="/dashboard/network" element={<ProtectedRoute requireManager><Network /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/mainframe" element={<ProtectedRoute requireAdmin><SuperInterface /></ProtectedRoute>} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/shop/:slug" element={<PublicOrderPage />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <NavBar />
        <MaintenanceModal />
      </div>
  );
};

const ProtectedRoute = ({ children, requireManager, requireAdmin }: { children: React.ReactNode, requireManager?: boolean, requireAdmin?: boolean }) => {
  const { state } = useAppContext();
  if (!state.user) return <Navigate to="/login" replace />;
  
  if (requireAdmin && state.user.role !== 'admin') {
    return <Navigate to="/dashboard/live" replace />;
  }

  if (!state.activeShop && !requireAdmin) return <Navigate to="/login" replace />;
  
  if (requireManager) {
    const role = state.activeShop?.role;
    if (role !== 'owner' && role !== 'manager') {
      return <Navigate to="/dashboard/live" replace />;
    }
  }
  return children as React.ReactElement;
};

const NavBar = () => {
  const { state } = useAppContext();
  const location = useLocation();
  const isPublicPath = location.pathname === '/login' || 
                       location.pathname === '/404' || 
                       location.pathname.startsWith('/shop/');

  if (isPublicPath) return null;

  const role = state.activeShop?.role;
  const isManagerOrOwner = role === 'owner' || role === 'manager';

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-bg-surface border-t border-border-subtle flex justify-around items-center h-16 z-50 px-2 lg:shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
      <NavLink 
        to="/dashboard/live" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`}
      >
        <span className="text-2xl mb-1">🔴</span>
        <span className="text-[10px] font-display font-bold uppercase">Live</span>
      </NavLink>

      <NavLink
        to="/dashboard/dispatch"
        className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-text-muted hover:text-text-secondary'}`}
      >
        <span className="text-xl mb-1">🏍️</span>
        <span className="text-[10px] font-display font-bold uppercase">Dispatch</span>
      </NavLink>

      {isManagerOrOwner && (
        <>
          <NavLink
            to="/dashboard/sessions"
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="text-xl mb-0.5">📊</span>
            <span className="text-[10px] font-display font-medium uppercase tracking-tight">Sessions</span>
          </NavLink>
          <NavLink 
            to="/dashboard/settings" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="text-xl mb-1 mt-1">⚙️</span>
            <span className="text-[10px] font-display font-bold uppercase">Settings</span>
          </NavLink>
        </>
      )}

    </div>
  );
};

const AppRoutesWrapper = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handleBillingError = () => {
      navigate('/billing');
    };
    window.addEventListener('billing-error', handleBillingError);
    return () => window.removeEventListener('billing-error', handleBillingError);
  }, [navigate]);
  return <AppRoutes />;
};

const App = () => (
  <AppProvider>
    <BrowserRouter>
      <AppRoutesWrapper />
    </BrowserRouter>
  </AppProvider>
);

export default App;
