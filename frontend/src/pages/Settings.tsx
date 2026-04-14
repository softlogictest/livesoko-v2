import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { API, fetchWithAuth } from '../lib/api';

const TutorialTab = ({ role }: { role?: string }) => {
  const isManagerOrOwner = role === 'owner' || role === 'manager';

  if (!isManagerOrOwner) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <h3 className="font-display font-medium text-lg text-brand-primary uppercase tracking-tighter italic">Seller Ops Guide</h3>
        
        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative shadow-lg">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary text-black flex items-center justify-center font-bold text-lg font-display shadow-lg">1</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">Start the Live</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Go to the <strong>Live</strong> tab and tap <strong>START NEW SESSION</strong>. This wakes up the system and prepares your dashboard for incoming orders.
          </p>
        </div>

        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-lg font-display">2</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">Watch the Ticker</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            As buyers use your hosted link (`livesoko.io/@slug`), orders appear here instantly.
            <br/><br/>
            🟢 <strong>Verified:</strong> Payment matched! Box it up.<br/>
            ⚪ <strong>Pending:</strong> Payment hasn't arrived. Keep selling on Live!
          </p>
        </div>

        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-lg font-display">3</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">WhatsApp Dispatch</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Tap on any 🟢 order and click <strong>SEND TO RIDER</strong>. This generates the delivery instructions for your riders automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <h3 className="font-display font-medium text-lg text-brand-primary uppercase tracking-tighter italic">Enterprise Launch Checklist</h3>
      
      <div className="bg-bg-surface p-5 rounded-xl border border-brand-primary/30 relative">
        <div className="absolute top-0 right-0 bg-brand-primary text-black text-[8px] font-bold px-2 py-1 uppercase">Step 1</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Claim Your Handle</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Go to <strong>Config</strong> and set your unique Shop Slug. This creates your public ordering link. Share this link on your TikTok Bio or Live pinning!
        </p>
      </div>

      <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
        <div className="absolute top-0 right-0 bg-text-muted text-black text-[8px] font-bold px-2 py-1 uppercase">Step 2</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Sync M-Pesa</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Download the <strong>LiveSoko Sync APK</strong> (found in Config) onto the phone that receives your business M-Pesa. Paste your Webhook URL into the app to enable auto-verification.
        </p>
      </div>

      <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
        <div className="absolute top-0 right-0 bg-text-muted text-black text-[8px] font-bold px-2 py-1 uppercase">Step 3</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Monitor Your Web</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Use the <strong>Network Web</strong> to ensure your phones were connected and your staff are active. A glowing phone node means your M-Pesa is syncing properly!
        </p>
      </div>
    </div>
  );
};

const FAQTab = () => {
  const faqs = [
    {
      q: 'Do I still need Google Forms?',
      a: 'No! You can now use your Hosted Order Page (`livesoko.io/@slug`). It is much faster and doesn\'t require you to touch any Google Sheets code.'
    },
    {
      q: 'How do I change my shop URL?',
      a: 'Go to the Config tab and update the "Shop Slug". For example, changing it to "mystylehub" makes your link livesoko.io/@mystylehub.'
    },
    {
      q: 'What is the "Network Web"?',
      a: 'It\'s a visual map of your enterprise. It shows if your owners, managers, and sellers are online, and exactly which phone is currently syncing your M-Pesa and orders.'
    },
    {
      q: 'Can I name my M-Pesa phones?',
      a: 'Yes! Open the Network Web view and click on a phone node to give it a nickname like "Shop Main Phone" or "Dispatch S20".'
    },
    {
      q: 'What if a payment doesn\'t match?',
      a: 'A 💰 bag will pulse on your screen. Tap it to see the "Floating Payment" and link it manually to the right order.'
    }
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <h3 className="font-display font-medium text-lg text-brand-primary mb-2">Frequently Asked Questions</h3>
      <p className="text-xs text-text-muted mb-2 -mt-2">Tap any question below to see the answer.</p>
      {faqs.map((faq, i) => (
        <details key={i} className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden group">
          <summary className="font-bold text-sm p-4 cursor-pointer select-none outline-none group-open:border-b border-border-subtle hover:bg-bg-base/50 transition-colors">
            {faq.q}
          </summary>
          <div className="p-4 text-sm text-text-secondary leading-relaxed bg-[#151515]">
            <span className="font-bold text-brand-primary mr-1 flex-shrink-0">Answer:</span> {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
};

export const Settings: React.FC = () => {
  const { state, dispatch, notify } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'tutorial' | 'faq'>('config');

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
  const [newStaffRole, setNewStaffRole] = useState<'manager' | 'seller'>('seller');
  const [creatingStaff, setCreatingStaff] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);
    try {
      const res = await fetchWithAuth('/api/settings/handymen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newStaffEmail, 
          password: newStaffPass,
          role: newStaffRole
        })
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
    localStorage.removeItem('livesoko_token');
    dispatch({ type: 'SET_USER', payload: null });
  };

  const handleInstall = async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    const { outcome } = await state.installPrompt.userChoice;
    if (outcome === 'accepted') {
      dispatch({ type: 'SET_INSTALL_PROMPT', payload: null });
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  const currentIp = window.location.hostname;
  const webhookUrl = `http://${currentIp}:3000/api/sms/${profile?.seller.webhook_token}`;

  return (
    <div className="bg-bg-base min-h-screen text-text-primary pb-24">
      {/* Settings Header & Tabs */}
      <div className="sticky top-0 bg-bg-base z-10 pt-5 px-5 pb-2 border-b border-border-subtle">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-display font-bold text-brand-primary">Settings</h2>
          <button onClick={handleLogout} className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[#aaa] border border-[#555] rounded hover:text-white hover:border-white transition-colors">
            Log Out
          </button>
        </div>
        
        <div className="flex gap-2 font-display text-sm">
          <button 
            className={`px-4 py-2 rounded-t-lg transition-colors border-b-2 font-bold ${activeTab === 'config' ? 'border-brand-primary text-white bg-bg-surface' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            onClick={() => setActiveTab('config')}
          >
            Config
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg transition-colors border-b-2 font-bold ${activeTab === 'tutorial' ? 'border-brand-primary text-white bg-bg-surface' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            onClick={() => setActiveTab('tutorial')}
          >
            Tutorial
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg transition-colors border-b-2 font-bold ${activeTab === 'faq' ? 'border-brand-primary text-white bg-bg-surface' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQ
          </button>
        </div>
      </div>

      <div className="p-5 mt-2">
        {activeTab === 'tutorial' && <TutorialTab role={state.activeShop?.role} />}
        {activeTab === 'faq' && <FAQTab />}

        {activeTab === 'config' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-bg-surface p-5 rounded-lg border border-brand-primary/30 relative">
              <div className="absolute top-0 right-0 bg-brand-primary text-black text-[8px] font-bold px-2 py-1 uppercase">Instant Setup</div>
              <h3 className="text-sm text-brand-primary uppercase mb-4 tracking-widest font-bold">Public Order Page</h3>
              <p className="text-xs text-text-secondary mb-3">Copy this link and put it in your TikTok bio! Customers can use it to place orders without needing Google Forms.</p>
              
              {profile?.seller?.slug ? (
                <div className="flex gap-2">
                  <div className="flex-1 bg-bg-base p-3 rounded text-[11px] break-all text-brand-primary border border-brand-primary/20 font-mono">
                    {window.location.origin}/@{profile?.seller.slug}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/@${profile?.seller.slug}`);
                      notify('Link copied to clipboard!', 'success');
                    }}
                    className="bg-brand-primary text-black px-4 rounded font-bold text-xs hover:bg-brand-dim transition-colors"
                  >
                    COPY
                  </button>
                </div>
              ) : (
                <div className="bg-brand-primary/10 border border-brand-primary/30 p-3 rounded-lg text-center animate-pulse">
                  <p className="text-brand-primary text-xs font-bold uppercase tracking-widest">⚠️ Link Not Ready</p>
                  <p className="text-text-secondary text-[10px] mt-1">Please configure your Shop Slug below to generate your link.</p>
                </div>
              )}

              <div className="mt-6 space-y-4 pt-4 border-t border-border-subtle/50">
                <div>
                  <label className="text-[10px] uppercase text-text-muted font-bold block mb-2">Customize Slug</label>
                  <div className="flex gap-2">
                    <div className="bg-bg-input px-3 py-2 rounded text-text-muted text-sm border border-border-subtle flex items-center">@</div>
                    <input 
                      type="text"
                      value={profile?.seller.slug || ''}
                      onChange={async (e) => {
                        const newSlug = e.target.value;
                        setProfile({ ...profile, seller: { ...profile.seller, slug: newSlug } });
                      }}
                      onBlur={async (e) => {
                        try {
                          const res = await fetchWithAuth('/api/settings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ slug: e.target.value })
                          });
                          if (!res.ok) {
                            const d = await res.json();
                            notify(d.error || 'Failed to update slug', 'error');
                            fetchProfile();
                          } else {
                            notify('Slug updated!', 'success');
                          }
                        } catch (e) { notify('Error updating slug', 'error'); }
                      }}
                      className="flex-1 bg-bg-input border border-border-subtle p-2 rounded text-sm text-brand-primary outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => window.location.href = '/dashboard/network'}
                    className="w-full bg-bg-base border border-brand-primary/40 text-brand-primary py-3 rounded font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-primary hover:text-black transition-all"
                  >
                    🕸️ View Shop Network Web
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-text-muted font-bold block mb-2">Color Scheme</label>
                  <div className="flex gap-3">
                    {['acid-green', 'sweet-pink', 'sky-blue', 'hot-lava', 'royal-gold'].map(c => (
                      <button 
                        key={c}
                        onClick={async () => {
                          await fetchWithAuth('/api/settings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color_scheme: c })
                          });
                          notify('Color scheme updated!', 'success');
                          fetchProfile();
                        }}
                        className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${profile?.seller.color_scheme === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                        style={{ 
                          backgroundColor: 
                            c === 'acid-green' ? '#00FF88' : 
                            c === 'sweet-pink' ? '#FF007A' : 
                            c === 'sky-blue' ? '#00D1FF' : 
                            c === 'hot-lava' ? '#FF4D00' : 
                            '#FFB800' 
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-surface p-5 rounded-lg border border-border-subtle">
              <h3 className="text-sm text-text-muted uppercase mb-4 tracking-widest">Advanced: SMS Forwarder URL</h3>

              <p className="text-xs text-text-secondary mb-3">Copy this URL into your SMS Forwarder app. Make sure your phone is on the same WiFi as this laptop.</p>
              <div className="bg-bg-base p-3 rounded text-[10px] break-all text-brand-dim border border-brand-primary/20 select-all font-mono">
                {webhookUrl}
              </div>
            </div>

            <details className="bg-bg-surface p-4 rounded-lg border border-border-subtle group">
              <summary className="text-[10px] text-text-muted uppercase tracking-widest cursor-pointer select-none">Legacy: Google Sheet Integration</summary>
              <div className="mt-4">
                <p className="text-[10px] text-text-secondary mb-3">Paste your published Google Sheet CSV URL here for backward compatibility.</p>
                <form onSubmit={handleUpdateSheet} className="flex flex-col gap-3">
                  <input 
                    type="url" 
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                    className="bg-bg-input border border-border-subtle p-3 rounded text-[11px] text-text-primary w-full outline-none focus:border-brand-primary"
                  />
                  <button type="submit" className="bg-[#222] border border-[#555] text-white px-4 py-2 rounded text-[10px] font-bold ml-auto hover:bg-[#333] transition-colors">
                    SAVE URL
                  </button>
                </form>
              </div>
            </details>

            <div className="bg-bg-surface p-5 rounded-lg border border-border-subtle">
              <h3 className="text-sm text-text-muted uppercase mb-4 tracking-widest">Staff Management</h3>
              
              {profile?.handymen.length > 0 && (
                <div className="mb-6 flex flex-col gap-2">
                  {profile.handymen.map((staff: any) => (
                    <div key={staff.id} className="flex items-center justify-between bg-bg-base/50 p-3 rounded border border-border-subtle/30">
                      <div>
                        <div className="text-sm font-bold text-text-primary">{staff.email}</div>
                        <div className="text-[10px] text-brand-primary uppercase tracking-widest mt-0.5">{staff.role}</div>
                      </div>
                      <div className="text-[10px] text-[#555] font-mono">ID: {staff.id.slice(0,8)}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddStaff} className="flex flex-col gap-3 mt-4 pt-4 border-t border-border-subtle/30">
                <p className="text-xs text-text-secondary mb-2">Create an account for your team members.</p>
                <input 
                  type="email" 
                  value={newStaffEmail}
                  onChange={e => setNewStaffEmail(e.target.value)}
                  placeholder="Staff Email"
                  className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary outline-none focus:border-brand-primary"
                  required
                />
                <input 
                  type="password" 
                  value={newStaffPass}
                  onChange={e => setNewStaffPass(e.target.value)}
                  placeholder="Initial Password"
                  className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary outline-none focus:border-brand-primary"
                  required
                  minLength={8}
                />
                <select 
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value as any)}
                  className="bg-bg-input border border-border-subtle p-3 rounded text-sm text-text-primary outline-none focus:border-brand-primary appearance-none cursor-pointer"
                >
                  <option value="seller">Role: Seller (View Only)</option>
                  <option value="manager">Role: Manager (Admin Access)</option>
                </select>
                <button 
                  type="submit" 
                  disabled={creatingStaff}
                  className="bg-brand-primary text-black px-4 py-3 rounded text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50 mt-2 tracking-widest uppercase"
                >
                  {creatingStaff ? 'CREATING...' : 'ADD MEMBER'}
                </button>
              </form>
            </div>

            {state.installPrompt && (
              <button 
                onClick={handleInstall}
                className="w-full py-4 mt-6 bg-brand-primary text-black rounded-lg font-bold tracking-widest font-display text-[15px] shadow-[0_0_15px_rgba(0,255,136,0.2)]"
              >
                INSTALL COMPANION WEB APP
              </button>
            )}

            <div className="bg-bg-surface p-5 rounded-lg border border-brand-primary/30 mt-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-brand-primary text-black text-[8px] font-bold px-2 py-1 uppercase tracking-tighter">Recommended</div>
              <h3 className="text-sm text-brand-primary uppercase mb-2 tracking-widest font-bold">LiveSoko Sync (Android)</h3>
              <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">
                Download our standalone Android app to automatically sync M-Pesa receipts. This is faster and more reliable than manual verification.
              </p>
              <a 
                href="/downloads/livesoko_sync.apk" 
                download
                className="flex items-center justify-center gap-2 w-full py-4 bg-bg-base border border-brand-primary/50 text-brand-primary rounded-lg font-bold tracking-widest font-display text-sm hover:bg-brand-primary/10 transition-colors"
                onClick={(e) => {
                  // If the file doesn't exist yet, we show a helpful toast
                  // In a real build, the user would place the APK in the public/downloads folder
                  notify('LiveSoko Sync APK starting...', 'info');
                }}
              >
                <span>📲</span> DOWNLOAD .APK
              </a>
              <div className="text-[9px] text-text-muted mt-3 text-center italic">
                *Requires Android 8.0+. Must allow "Install from Unknown Sources".
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
