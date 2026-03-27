import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { API, fetchWithAuth } from '../lib/api';

export const Settings: React.FC = () => {
  const { state, dispatch, notify } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
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
      await fetchWithAuth('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_url: sheetUrl })
      });
      notify('Google Sheet URL updated!', 'success');
      fetchProfile();
    } catch (e) { 
      notify('Failed to update Sheet URL', 'error');
    }
  };

  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);
    try {
      const res = await fetchWithAuth('/api/settings/handymen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newStaffEmail, password: newStaffPass })
      });
      if (res.ok) {
        setNewStaffEmail('');
        setNewStaffPass('');
        notify('Staff account created!', 'success');
        fetchProfile();
      } else {
        const data = await res.json();
        notify(data.error || 'Failed to create staff account', 'error');
      }
    } catch (e) { 
      notify('An error occurred during staff creation', 'error');
    }
    setCreatingStaff(false);
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
        <h3 className="text-sm text-text-muted uppercase mb-4">Staff Management</h3>
        
        {profile?.handymen.length > 0 && (
          <div className="mb-6 flex flex-col gap-2">
            {profile.handymen.map((staff: any) => (
              <div key={staff.id} className="flex items-center justify-between bg-bg-base/50 p-3 rounded border border-border-subtle/30">
                <div>
                  <div className="text-sm font-bold text-text-primary">{staff.email}</div>
                  <div className="text-[10px] text-text-muted uppercase tracking-widest">{staff.role}</div>
                </div>
                <div className="text-[10px] text-text-muted">ID: {staff.id.slice(0,8)}...</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddStaff} className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary mb-1">Create an account for your team members (e.g. handymen).</p>
          <input 
            type="email" 
            value={newStaffEmail}
            onChange={e => setNewStaffEmail(e.target.value)}
            placeholder="Staff Email"
            className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary"
            required
          />
          <input 
            type="password" 
            value={newStaffPass}
            onChange={e => setNewStaffPass(e.target.value)}
            placeholder="Initial Password"
            className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary"
            required
            minLength={6}
          />
          <button 
            type="submit" 
            disabled={creatingStaff}
            className="bg-brand-primary text-black px-4 py-3 rounded text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {creatingStaff ? 'CREATING...' : 'ADD STAFF MEMBER'}
          </button>
        </form>
      </div>

      <button onClick={handleLogout} className="w-full py-4 text-status-fraud border border-status-fraud rounded font-bold tracking-widest font-display text-lg">
        SIGN OUT
      </button>
    </div>
  );
};
