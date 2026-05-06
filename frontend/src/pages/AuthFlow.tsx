import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { API } from '../lib/api';

/**
 * /verify-email?token=xxx
 * Handles the email verification link click from the user's inbox.
 */
export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useAppContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus('success');
          notify('Email verified! You can now sign in.', 'success');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          notify(data.error || 'Verification failed.', 'error');
        }
      })
      .catch(() => {
        setStatus('error');
        notify('Could not reach server.', 'error');
      });
  }, []);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display font-bold text-5xl tracking-wider mb-2 text-brand-primary">LiveSoko</h1>

        {status === 'loading' && (
          <div className="mt-10">
            <div className="w-10 h-10 rounded-full bg-brand-primary animate-ping mx-auto mb-4" />
            <p className="text-text-secondary font-body">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-10 bg-bg-surface border border-status-verified/30 rounded-xl p-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">Email Verified!</h2>
            <p className="text-text-secondary font-body text-sm">Your account is now fully active. Redirecting you to sign in…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-10 bg-bg-surface border border-status-fraud/30 rounded-xl p-8">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">Link Invalid or Expired</h2>
            <p className="text-text-secondary font-body text-sm mb-4">This verification link has already been used or has expired.</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-brand-primary text-black font-display font-bold px-6 py-3 rounded transition-transform active:scale-[0.98]"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * /reset-password?token=xxx
 * Handles the password reset link click from the user's inbox.
 */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useAppContext();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-status-fraud font-body">Invalid reset link.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-brand-primary underline font-body text-sm">Back to Sign In</button>
        </div>
      </div>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return notify('Passwords do not match', 'error');
    if (newPassword.length < 8) return notify('Password must be at least 8 characters', 'error');

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Reset failed.', 'error');
        setLoading(false);
        return;
      }
      setDone(true);
      notify('Password reset! You can now sign in.', 'success');
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      notify('Cannot reach server.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 text-brand-primary">
          <h1 className="font-display font-bold text-5xl tracking-wider mb-2">LiveSoko</h1>
        </div>

        {done ? (
          <div className="text-center bg-bg-surface border border-status-verified/30 rounded-xl p-8">
            <div className="text-5xl mb-4">🔑</div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">Password Reset!</h2>
            <p className="text-text-secondary font-body text-sm">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Set New Password</h2>
            <p className="text-text-secondary font-body text-sm mb-6">Choose a strong new password for your account.</p>
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full bg-bg-input border border-border-subtle rounded p-4 pr-12 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 transition-colors">
                  {showPassword
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full bg-bg-input border border-border-subtle rounded p-4 pr-12 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
                  required
                  minLength={8}
                />
              </div>
              <button
                id="reset-submit"
                type="submit"
                disabled={loading}
                className="mt-2 bg-brand-primary text-black font-display font-bold text-xl py-4 rounded transition-transform active:scale-[0.98] disabled:opacity-50 tracking-wide"
              >
                {loading ? 'RESETTING...' : 'RESET PASSWORD'}
              </button>
            </form>
          </>
        )}

        <button onClick={() => navigate('/login')} className="block text-center mt-6 text-text-muted hover:text-text-secondary font-body text-sm transition-colors">
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
};
