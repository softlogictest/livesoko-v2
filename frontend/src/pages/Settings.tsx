import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { API } from '../App';

export const Settings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/api/settings`, {
        headers: { 'Authorization': `Bearer ${state.user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data.seller.sheet_url) setSheetUrl(data.seller.sheet_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API}/api/settings`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${state.user?.token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ sheet_url: sheetUrl })
      });
      alert('Google Sheet URL updated!');
      fetchProfile();
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('dukalive_token');
    dispatch({ type: 'SET_USER', payload: null });
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  // Determine the local IP from the current window location to show the user
  const currentIp = window.location.hostname;
  const webhookUrl = `http://${currentIp}:3000/api/sms/${profile?.seller.webhook_token}`;

  return (
    <div className="bg-bg-base min-h-screen text-text-primary p-5 pb-24 font-body">
      <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">Settings</h2>

      <div className="bg-bg-surface p-5 rounded-lg border border-border-subtle mb-6">
        <h3 className="text-sm text-text-muted uppercase mb-4">Network & Webhook</h3>
        <p className="text-xs text-text-secondary mb-3">Copy this URL into your SMS Forwarder app. Make sure your phone is on the same WiFi as this laptop.</p>
        <div className="bg-bg-base p-3 rounded text-xs break-all text-brand-dim border border-brand-primary/20 select-all">
          {webhookUrl}
        </div>
      </div>

      <div className="bg-bg-surface p-5 rounded-lg border border-border-subtle mb-6">
        <h3 className="text-sm text-text-muted uppercase mb-4">Google Sheet Integration</h3>
        <p className="text-xs text-text-secondary mb-3">Paste your published Google Sheet CSV URL here. We will read it every 5s during an active live session.</p>
        <form onSubmit={handleUpdateSheet} className="flex flex-col gap-2">
          <input 
            type="url" 
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary"
          />
          <button type="submit" className="bg-brand-primary text-black px-4 py-2 rounded text-sm font-bold w-32 ml-auto">
            SAVE URL
          </button>
        </form>
      </div>

      <div className="bg-bg-surface p-5 rounded-lg border border-border-subtle mb-6">
        <h3 className="text-sm text-text-muted uppercase mb-4">Shop Profile</h3>
        <div className="mb-3">
          <label className="text-xs text-text-secondary block mb-1">Shop Name</label>
          <div className="text-lg">{profile?.seller.shop_name || 'Not set'}</div>
        </div>
        <div className="mb-3">
          <label className="text-xs text-text-secondary block mb-1">Email</label>
          <div className="text-lg">{profile?.seller.email}</div>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full py-4 text-status-fraud border border-status-fraud rounded font-bold tracking-widest font-display text-lg">
        SIGN OUT
      </button>
    </div>
  );
};
