import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { API } from '../lib/api';

const PWD_REGEX = /^.{8,}$/;

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [shopName, setShopName] = useState('');
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
        const errorMessage = data.error || (data.errors && data.errors[0]?.msg) || 'Login failed';
        notify(errorMessage, 'error');
        setLoading(false);
        return;
      }

      // Login successful
      localStorage.setItem('livesoko_token', data.token);
      
      // Auto-select first shop if available
      const primaryShop = data.user.shops?.[0];
      if (primaryShop) {
        localStorage.setItem('livesoko_shop_id', primaryShop.id);
        dispatch({ type: 'SET_ACTIVE_SHOP', payload: primaryShop });
      }

      dispatch({ type: 'SET_USER', payload: { ...data.user, token: data.token } as any });
      navigate('/dashboard/live');
    } catch (err: any) {
      notify('Cannot reach server. Is the backend running?', 'error');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName) return notify('Shop name is required', 'error');
    
    // Pillar: Sync validation with backend
    if (!PWD_REGEX.test(password)) {
      return notify('Password must be at least 8 characters', 'error');
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, enterprise_name: shopName })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data.error || (data.errors && data.errors[0]?.msg) || 'Registration failed';
        notify(errorMessage, 'error');
        setLoading(false);
        return;
      }

      localStorage.setItem('livesoko_token', data.token);
      
      const primaryShop = data.user.shops?.[0];
      if (primaryShop) {
        localStorage.setItem('livesoko_shop_id', primaryShop.id);
        dispatch({ type: 'SET_ACTIVE_SHOP', payload: primaryShop });
      }

      dispatch({ type: 'SET_USER', payload: { ...data.user, token: data.token } as any });
      notify('Welcome to LiveSoko!', 'success');
      navigate('/dashboard/live');
    } catch (err: any) {
      notify('Cannot reach server', 'error');
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
    if (!PWD_REGEX.test(newPassword)) {
      setError('Password must be at least 8 characters');
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
      localStorage.setItem('livesoko_token', authToken);
      dispatch({ type: 'SET_USER', payload: { ...data.user, token: authToken } as any });
      navigate('/dashboard/live');
    } catch (err: any) {
      notify('Failed to change password', 'error');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 text-brand-primary">
          <h1 className="font-display font-bold text-5xl tracking-wider mb-2">LiveSoko</h1>
          <p className="font-body text-text-secondary text-sm uppercase tracking-widest">v2.2.0 • 2026-03-27</p>
        </div>

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
          {isRegistering && (
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="Shop Name (e.g. My Style Hub)"
              className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
              required
            />
          )}

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
            {loading ? 'PROCESSING...' : (isRegistering ? 'CREATE SHOP' : 'SIGN IN')}
          </button>
        </form>

        <p className="text-center mt-8 text-text-secondary font-body text-sm">
          {isRegistering ? 'Already have a shop?' : 'Want to sell on LiveSoko?'}
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-2 text-brand-primary font-bold underline"
          >
            {isRegistering ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  );
};
