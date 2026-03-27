import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { LiveFeed } from './pages/LiveFeed';
import { SessionDetail } from './pages/SessionDetail';
import { Settings } from './pages/Settings';
import { Dispatch } from './pages/Dispatch';
import { AppProvider, useAppContext } from './context/AppContext';
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
    const token = localStorage.getItem('vibesoko_token');
    if (token) {
      fetchWithAuth('/api/settings')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then(data => {
          dispatch({
            type: 'SET_USER',
            payload: { ...data.seller, token } as any
          });
        })
        .catch(() => {
          localStorage.removeItem('vibesoko_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  if (loading) return <div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-brand-primary animate-ping"></div></div>;

  return (
    <BrowserRouter>
      <div className="app-container max-w-md mx-auto relative min-h-screen bg-bg-base shadow-2xl pb-16">
        <Routes>
          <Route path="/" element={<Navigate to={state.user ? "/dashboard/live" : "/login"} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/live" element={<ProtectedRoute><LiveFeed /></ProtectedRoute>} />
          <Route path="/dashboard/dispatch" element={<ProtectedRoute allowedRoles={['seller']}><Dispatch /></ProtectedRoute>} />
          <Route path="/dashboard/session/:id" element={<ProtectedRoute allowedRoles={['seller']}><SessionDetail /></ProtectedRoute>} />
          <Route path="/dashboard/sessions" element={<ProtectedRoute allowedRoles={['seller']}><div className="p-8 text-center text-text-secondary mt-20 font-body">Sessions list — coming in v2.2</div></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={['seller']}><Settings /></ProtectedRoute>} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  );
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { state } = useAppContext();
  if (!state.user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(state.user.role)) return <Navigate to="/dashboard/live" replace />;
  return children as React.ReactElement;
};

const NavBar = () => {
  const { state } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const role = state.user?.role;
  if (location.pathname === '/login') return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-bg-surface border-t border-border-subtle flex justify-around items-center h-16 z-50 px-2 lg:shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
      <NavLink 
        to="/dashboard/live" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`}
      >
        <span className="text-2xl mb-1">🔴</span>
        <span className="text-[10px] font-display font-bold uppercase">Live</span>
      </NavLink>

      {role === 'seller' && (
        <>
          <NavLink
            to="/dashboard/dispatch"
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="text-xl mb-1">🏍️</span>
            <span className="text-[10px] font-display font-bold uppercase">Dispatch</span>
          </NavLink>
          <div 
            onClick={() => navigate('/dashboard/sessions')}
            className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-all ${location.pathname === '/dashboard/sessions' ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="text-xl mb-0.5">📊</span>
            <span className="text-[10px] font-display font-medium uppercase tracking-tight">Sessions</span>
          </div>
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

const App = () => (
  <AppProvider>
    <AppRoutes />
  </AppProvider>
);

export default App;
