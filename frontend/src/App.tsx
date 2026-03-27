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

const App = () => (
  <AppProvider>
    <AppRoutes />
  </AppProvider>
);

export default App;
