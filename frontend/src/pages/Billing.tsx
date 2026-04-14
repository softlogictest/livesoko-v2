import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const Billing: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('livesoko_token');
    localStorage.removeItem('livesoko_shop_id');
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const shopName = state.activeShop?.name || 'Your Shop';

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-6xl mb-6">🔒</h1>
        <h1 className="font-display font-bold text-3xl text-brand-primary mb-2">Subscription Expired</h1>
        <p className="font-body text-text-secondary mb-8">
          The subscription or free trial for <strong>{shopName}</strong> has ended.
        </p>

        <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 mb-8 text-left shadow-lg">
          <h2 className="font-display font-bold text-lg text-text-primary mb-4 border-b border-border-subtle pb-2">How to Renew</h2>
          <ul className="space-y-4 font-body text-sm text-text-secondary list-disc pl-4">
            <li>Choose your tier: <strong className="text-brand-primary">Shop</strong> (Ksh X/mo) or <strong className="text-brand-primary">Suite</strong> (Ksh Y/mo).</li>
            <li>Send the payment via MPESA (Paybill integration coming soon).</li>
            <li>Send the MPESA Confirmation Code to your LiveSoko Administrator.</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-brand-primary text-black font-display font-bold text-lg py-4 rounded mb-4 active:scale-[0.98] transition-transform"
        >
          I HAVE RENEWED, REFRESH
        </button>
        
        <button
          onClick={handleLogout}
          className="text-text-muted text-sm font-body hover:text-text-primary underline"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
