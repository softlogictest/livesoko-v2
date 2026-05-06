import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { API } from '../lib/api';

const PWD_REGEX = /^.{8,}$/;

// Get or create a persistent device ID in localStorage
function getDeviceId(): string {
  let id = localStorage.getItem('ls_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ls_device_id', id);
  }
  return id;
}

// Eye icon components
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// --- Shared UI pieces (defined at module scope to prevent remounting on every keystroke) ---
const PasswordInput = ({
  value, onChange, placeholder = 'Password', show, onToggle, id
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  show: boolean; onToggle: () => void; id: string;
}) => (
  <div className="relative">
    <input
      id={id}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-input border border-border-subtle rounded p-4 pr-12 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
      required
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  </div>
);

const BackLink = ({ to, label = 'Back to Sign In', onClick }: { to?: string; label?: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="block text-center mt-6 text-text-muted hover:text-text-secondary font-body text-sm transition-colors"
  >
    ← {label}
  </button>
);

const SubmitBtn = ({ label, loading }: { label: string; loading: boolean }) => (
  <button
    type="submit"
    disabled={loading}
    className="mt-4 w-full bg-brand-primary text-black font-display font-bold text-xl py-4 rounded transition-transform active:scale-[0.98] disabled:opacity-50 tracking-wide"
  >
    {loading ? 'PROCESSING...' : label}
  </button>
);

const Logo = () => (
  <div className="text-center mb-10 text-brand-primary">
    <h1 className="font-display font-bold text-5xl tracking-wider mb-2">LiveSoko</h1>
    <p className="font-body text-text-secondary text-sm uppercase tracking-widest">v2.5.0 • 2026</p>
  </div>
);

type Screen = 'login' | 'register' | 'forgot' | 'forgot-sent' | 'verify-email' | 'change-password';

export const Login: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { dispatch, notify } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for verify-email or reset-password tokens in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verifyToken = params.get('token');
    const resetToken = params.get('token');

    if (location.pathname === '/verify-email' && verifyToken) {
      handleVerifyEmail(verifyToken);
    }
  }, [location]);

  const handleVerifyEmail = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        setScreen('login');
        setSuccessMsg('✅ Email verified! You can now sign in.');
      } else {
        notify(data.error || 'Verification failed. The link may have expired.', 'error');
        setScreen('login');
      }
    } catch {
      notify('Could not reach server.', 'error');
      setScreen('login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        notify(data.error || (data.errors && data.errors[0]?.msg) || 'Login failed', 'error');
        setLoading(false);
        return;
      }

      // If must_change_password, show change password screen
      if (data.user.must_change_password) {
        setAuthToken(data.token);
        setScreen('change-password');
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

      // If email not verified, let them in but show a banner (handled by App.tsx / dashboard)
      navigate('/dashboard/live');
    } catch {
      notify('Cannot reach server. Is the backend running?', 'error');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName) return notify('Shop name is required', 'error');
    if (!PWD_REGEX.test(password)) return notify('Password must be at least 8 characters', 'error');

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, enterprise_name: shopName, device_id: getDeviceId() })
      });

      const data = await res.json();
      if (!res.ok) {
        notify(data.error || (data.errors && data.errors[0]?.msg) || 'Registration failed', 'error');
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
      notify('Welcome to LiveSoko! Check your email to verify your account.', 'success');
      navigate('/dashboard/live');
    } catch {
      notify('Cannot reach server', 'error');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      // Always show success (backend never reveals if email exists)
      setScreen('forgot-sent');
    } catch {
      notify('Cannot reach server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return notify('Passwords do not match', 'error');
    if (!PWD_REGEX.test(newPassword)) return notify('Password must be at least 8 characters', 'error');

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

      localStorage.setItem('livesoko_token', authToken);
      dispatch({ type: 'SET_USER', payload: { ...data.user, token: authToken } as any });
      navigate('/dashboard/live');
    } catch {
      notify('Failed to change password', 'error');
      setLoading(false);
    }
  };

  // --- Screens ---

  if (screen === 'forgot-sent') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-8">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-3">Check Your Email</h2>
            <p className="text-text-secondary font-body text-sm leading-relaxed">
              If <span className="text-text-primary font-bold">{email}</span> is registered, a password reset link has been sent. It expires in <strong>1 hour</strong>.
            </p>
            <p className="text-text-muted font-body text-xs mt-4">Don't see it? Check your spam folder.</p>
          </div>
          <BackLink onClick={() => { setScreen('login'); setSuccessMsg(''); }} />
        </div>
      </div>
    );
  }

  if (screen === 'verify-email') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-8">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-3">Verify Your Email</h2>
            <p className="text-text-secondary font-body text-sm leading-relaxed mb-6">
              We sent a verification link to <span className="text-text-primary font-bold">{email}</span>.
            </p>
            <ResendVerification email={email} notify={notify} />
          </div>
          <BackLink label="Already verified? Sign In" onClick={() => { setScreen('login'); setSuccessMsg(''); }} />
        </div>
      </div>
    );
  }

  if (screen === 'forgot') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-sm">
          <Logo />
          <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Reset Password</h2>
          <p className="text-text-secondary font-body text-sm mb-6">Enter your account email and we'll send a reset link.</p>
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email Address"
              className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
              required
            />
            <SubmitBtn label="SEND RESET LINK" loading={loading} />
          </form>
          <BackLink onClick={() => { setScreen('login'); setSuccessMsg(''); }} />
        </div>
      </div>
    );
  }

  if (screen === 'change-password') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-sm">
          <Logo />
          <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Set New Password</h2>
          <p className="text-text-secondary font-body text-sm mb-6">Your account requires a password update before you can continue.</p>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="New Password"
              show={showNewPassword}
              onToggle={() => setShowNewPassword(p => !p)}
            />
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm New Password"
              show={showNewPassword}
              onToggle={() => setShowNewPassword(p => !p)}
            />
            <SubmitBtn label="SET PASSWORD" loading={loading} />
          </form>
        </div>
      </div>
    );
  }

  // Default: Login / Register screen
  const isRegistering = screen === 'register';
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 pb-32">
      <div className="w-full max-w-sm">
        <Logo />

        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-status-verified/10 border border-status-verified/30 text-status-verified font-body text-sm text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
          {isRegistering && (
            <input
              id="register-shop-name"
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="Shop Name (e.g. My Style Hub)"
              className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
              required
            />
          )}

          <input
            id={isRegistering ? 'register-email' : 'login-email'}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email Address"
            className="bg-bg-input border border-border-subtle rounded p-4 text-text-primary font-body focus:outline-none focus:border-brand-primary transition-colors"
            required
          />

          <PasswordInput
            id={isRegistering ? 'register-password' : 'login-password'}
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(p => !p)}
          />

          {!isRegistering && (
            <button
              type="button"
              onClick={() => { setScreen('forgot'); setSuccessMsg(''); }}
              className="text-right text-brand-primary font-body text-sm hover:underline -mt-2"
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            id={isRegistering ? 'register-submit' : 'login-submit'}
            className="mt-2 bg-brand-primary text-black font-display font-bold text-xl py-4 rounded transition-transform active:scale-[0.98] disabled:opacity-50 tracking-wide"
          >
            {loading ? 'PROCESSING...' : (isRegistering ? 'CREATE SHOP' : 'SIGN IN')}
          </button>        </form>

        <p className="text-center mt-8 text-text-secondary font-body text-sm">
          {isRegistering ? 'Already have a shop?' : 'Want to sell on LiveSoko?'}
          <button
            onClick={() => { setScreen(isRegistering ? 'login' : 'register'); setSuccessMsg(''); }}
            className="ml-2 text-brand-primary font-bold underline"
          >
            {isRegistering ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  );
};

// Helper component for resending verification
const ResendVerification: React.FC<{ email: string; notify: (m: string, t?: any) => void }> = ({ email, notify }) => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const resend = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSent(true);
      notify('Verification email resent!', 'success');
    } catch {
      notify('Could not resend. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <p className="text-status-verified font-body text-sm">✅ Sent! Check your inbox.</p>;
  }

  return (
    <button
      onClick={resend}
      disabled={loading}
      className="text-brand-primary font-body text-sm hover:underline disabled:opacity-50"
    >
      {loading ? 'Sending...' : 'Resend verification email'}
    </button>
  );
};
