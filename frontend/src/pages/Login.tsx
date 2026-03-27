import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { API } from '../lib/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const { dispatch, notify } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        notify(data.error || 'Login failed', 'error');
        setLoading(false);
        return;
      }

      // Check if password change is required
      if (data.user.must_change_password) {
        setAuthToken(data.token);
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      // Login successful
      localStorage.setItem('dukalive_token', data.token);
      dispatch({ type: 'SET_USER', payload: { ...data.user, token: data.token } as any });
      navigate('/dashboard/live');
    } catch (err: any) {
      notify('Cannot reach server. Is the backend running?', 'error');
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        notify(data.error || 'Failed to change password', 'error');
        setLoading(false);
        return;
      }

      // Password changed — now login
      localStorage.setItem('dukalive_token', authToken);
      dispatch({ type: 'SET_USER', payload: { ...data.user, token: authToken } as any });
      navigate('/dashboard/live');
    } catch (err: any) {
      notify('Failed to change password', 'error');
      setLoading(false);
    }
  };

  // Force password change screen
  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 text-brand-primary">
            <h1 className="font-display font-bold text-4xl tracking-wider mb-2">🔐</h1>
            <p className="font-display font-bold text-xl">Change Your Password</p>
            <p className="font-body text-text-secondary text-sm mt-2">Before you start, set a secure password for your shop.</p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            {error && <div className="bg-status-fraud/10 text-status-fraud p-3 rounded font-body text-sm border border-status-fraud text-center">{error}</div>}

            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New Password"
              className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
              required
              minLength={6}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-brand-primary text-black font-display font-bold text-xl py-4 rounded transition-transform active:scale-[0.98] disabled:opacity-50 tracking-wide"
            >
              {loading ? 'SAVING...' : 'SET PASSWORD & ENTER'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 text-brand-primary">
          <h1 className="font-display font-bold text-5xl tracking-wider mb-2">DukaLive</h1>
          <p className="font-body text-text-secondary text-sm uppercase tracking-widest">v2.1.0-cloud • 2026-03-27</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && <div className="bg-status-fraud/10 text-status-fraud p-3 rounded font-body text-sm border border-status-fraud text-center">{error}</div>}

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email Address"
            className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
            required
          />

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-brand-primary text-black font-display font-bold text-xl py-4 rounded transition-transform active:scale-[0.98] disabled:opacity-50 tracking-wide"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
};
