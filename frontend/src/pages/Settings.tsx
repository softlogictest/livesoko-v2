import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { API, fetchWithAuth } from '../lib/api';

const TutorialTab = ({ role }: { role?: string }) => {
  const isManagerOrOwner = role === 'owner' || role === 'manager';

  if (!isManagerOrOwner) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <h3 className="font-display font-medium text-lg text-brand-primary uppercase tracking-tighter italic">How to Use LiveSoko</h3>
        
        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative shadow-lg">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary text-black flex items-center justify-center font-bold text-lg font-display shadow-lg">1</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">Wait for the Session to Start</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Your manager will start a live session. Once it's running, you'll see orders appear on the <strong>Live</strong> tab as customers place them.
          </p>
        </div>

        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-lg font-display">2</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">Pack Verified Orders</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Look for orders with a <strong>green ✓ VERIFIED</strong> tag — that means payment is confirmed. Pack these items and get them ready.
            <br/><br/>
            ⚪ <strong>Pending</strong> = waiting for M-Pesa. Don't pack yet.<br/>
            🟢 <strong>Verified</strong> = paid! Pack it up.
          </p>
        </div>

        <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-lg font-display">3</div>
          <h4 className="font-bold text-text-primary mb-2 mt-1 uppercase tracking-widest text-xs">Send to Rider</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Tap on any verified order, then tap <strong>SEND TO RIDER</strong>. This opens WhatsApp with the customer's name, phone, item, and location already typed out for your rider.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <h3 className="font-display font-medium text-lg text-brand-primary uppercase tracking-tighter italic">Getting Started</h3>
      
      <div className="bg-bg-surface p-5 rounded-xl border border-brand-primary/30 relative">
        <div className="absolute top-0 right-0 bg-brand-primary text-black text-[8px] font-bold px-2 py-1 uppercase">Step 1</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Set Up Your Shop Link</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Go to the <strong>Config</strong> tab above and look for <strong>Customize Slug</strong>. Type your shop name there (e.g. "mystylehub"). This creates your order link — put it in your TikTok bio!
        </p>
      </div>

      <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
        <div className="absolute top-0 right-0 bg-text-muted text-black text-[8px] font-bold px-2 py-1 uppercase">Step 2</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Start a Live Session</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Tap the <strong>Live</strong> tab at the bottom, then tap <strong>START NEW SESSION</strong>. While the session is running, customers can place orders through your shop link.
        </p>
      </div>

      <div className="bg-bg-surface p-5 rounded-xl border border-border-subtle relative">
        <div className="absolute top-0 right-0 bg-text-muted text-black text-[8px] font-bold px-2 py-1 uppercase">Step 3</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Manage Your Orders</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Orders appear on the Live tab as they come in. Tap any order to <strong>verify payment</strong>, <strong>mark it as packed</strong>, or <strong>send delivery info to your rider</strong> via WhatsApp.
        </p>
      </div>

      <div className="bg-bg-surface p-5 rounded-xl border border-brand-primary/20 relative shadow-[0_0_20px_rgba(0,255,136,0.05)]">
        <div className="absolute top-0 right-0 bg-brand-primary/20 text-brand-primary text-[8px] font-bold px-2 py-1 uppercase italic">Bonus</div>
        <h4 className="font-bold text-text-primary mb-1 uppercase tracking-widest text-xs">Automate with Companion App</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Want orders to verify <strong>automatically</strong>? Go to <strong>Config</strong>, download the <strong>Companion App</strong> on your M-Pesa phone, and paste your connection code. 
          <br/><br/>
          💡 <strong>Tip:</strong> Use the "Share via WhatsApp" button in Config to send the link and code directly to your other phone!
        </p>
      </div>
    </div>
  );
};

const FAQTab = () => {
  const faqs = [
    {
      q: 'How do customers place orders?',
      a: 'Share your shop link (found in Config tab) on TikTok, WhatsApp, or anywhere. When customers tap it, they see an order form where they fill in what they want and their details.'
    },
    {
      q: 'How do I change my shop link?',
      a: 'Go to the Config tab and update the text under "Customize Slug". For example, if you type "mystylehub", your link becomes /shop/mystylehub.'
    },
    {
      q: 'What do the order colors mean?',
      a: 'Grey = waiting for payment. Green (Verified) = payment confirmed, pack the order! Red = flagged as suspicious. Blue = Cash on Delivery.'
    },
    {
      q: 'What if a payment doesn\'t match any order?',
      a: 'A 💰 alert will pop up on the Live tab. Tap it to see the payment details and manually link it to the right order.'
    },
    {
      q: 'Can my staff see all orders?',
      a: 'Staff with the "Seller" role only see verified orders that are ready to pack. Managers and owners see everything including pending and flagged orders.'
    },
    {
      q: 'How do I download and install the Companion App?',
      a: 'Go to the Config tab and click "DOWNLOAD COMPANION APP". Once downloaded, tap the file to install it. If Android shows an "Unsafe App Blocked" warning, tap "More details" and then "Install anyway". This happens because our business tool isn\'t listed on the public Play Store.'
    },
    {
      q: 'How do I send delivery info to my rider?',
      a: 'Tap on any green (verified) order, then tap "SEND TO RIDER". It opens WhatsApp with all the delivery details already written out.'
    }
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <h3 className="font-display font-medium text-lg text-brand-primary mb-2">Common Questions</h3>
      <p className="text-xs text-text-muted mb-2 -mt-2">Tap any question below to see the answer.</p>
      {faqs.map((faq, i) => (
        <details key={i} className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden group">
          <summary className="font-bold text-sm p-4 cursor-pointer select-none outline-none group-open:border-b border-border-subtle hover:bg-bg-base/50 transition-colors">
            {faq.q}
          </summary>
          <div className="p-4 text-sm text-text-secondary leading-relaxed bg-[#151515]">
            {faq.a}
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'tutorial' | 'faq'>('config');

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
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

  const webhookUrl = `${window.location.origin}/api/sms/${profile?.seller.webhook_token}`;

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
              <p className="text-xs text-text-secondary mb-3">Copy this link and put it in your TikTok bio! Customers can order directly from here.</p>
              
              {profile?.seller?.slug ? (
                <div className="flex gap-2">
                  <div className="flex-1 bg-bg-base p-3 rounded text-[11px] break-all text-brand-primary border border-brand-primary/20 font-mono">
                    {window.location.origin}/shop/{profile?.seller.slug}
                  </div>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/shop/${profile?.seller.slug}`;
                      // Clipboard API fails on mobile HTTP - use textarea fallback
                      try {
                        const textarea = document.createElement('textarea');
                        textarea.value = url;
                        textarea.style.position = 'fixed';
                        textarea.style.left = '-9999px';
                        textarea.style.top = '-9999px';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        notify('Link copied to clipboard!', 'success');
                      } catch {
                        // Last resort: show the URL in a prompt so user can manually copy
                        window.prompt('Copy this link:', url);
                      }
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

            <div className="bg-bg-surface p-5 rounded-lg border border-brand-primary/30 relative">
              <div className="absolute top-0 right-0 bg-brand-primary text-black text-[8px] font-bold px-2 py-1 uppercase tracking-tighter">M-Pesa</div>
              <h3 className="text-sm text-brand-primary uppercase mb-2 tracking-widest font-bold">Auto-Verify Payments</h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                Install the <strong>LiveSoko Companion App</strong> on the phone that receives M-Pesa messages. 
                It runs securely in the background and automatically verifies orders when payment arrives.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => window.location.href = '/livesoko-sync.apk'}
                  className="bg-brand-primary/20 text-brand-primary border border-brand-primary/40 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  ⬇️ DOWNLOAD
                </button>
                <button 
                  onClick={() => {
                    const shareText = `*LiveSoko Companion Setup*\n\n1. Install the app on the M-Pesa phone:\n${window.location.origin}/livesoko-sync.apk\n\n2. Use this Connection Code:\n${webhookUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                  }}
                  className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/40 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  🟢 SHARE CODE
                </button>
              </div>
              
              <div className="mb-3">
                <label className="text-[10px] uppercase text-text-muted font-bold block mb-2">Shop Connection Code (paste this into the app)</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-bg-base p-3 rounded text-[10px] break-all text-brand-dim border border-brand-primary/20 select-all font-mono">
                    {webhookUrl}
                  </div>
                  <button 
                    onClick={() => {
                      try {
                        const textarea = document.createElement('textarea');
                        textarea.value = webhookUrl;
                        textarea.style.position = 'fixed';
                        textarea.style.left = '-9999px';
                        textarea.style.top = '-9999px';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        notify('Connection Code copied!', 'success');
                      } catch {
                        window.prompt('Copy this Connection Code:', webhookUrl);
                      }
                    }}
                    className="bg-brand-primary text-black px-4 rounded font-bold text-xs hover:bg-brand-dim transition-colors flex-shrink-0"
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="bg-bg-base border border-border-subtle rounded-lg p-3 mt-3">
                <p className="text-[10px] text-text-muted leading-relaxed">
                  <strong>Setup:</strong> Download App → Open it → Paste Connection Code → Tap Connect → Done.
                  The app listens for M-Pesa SMS and verifies your LiveSoko orders automatically.
                </p>
              </div>
            </div>

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

            <div className="mt-8 pt-6 border-t border-border-subtle/30 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-4">Thoughts? Ideas? Bugs?</p>
              <button 
                onClick={() => window.open('https://softlogic.co.ke', '_blank')}
                className="w-full bg-bg-surface border border-border-subtle text-text-secondary py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-2"
              >
                💬 GIVE FEEDBACK / SUGGESTIONS
              </button>
              <p className="text-[9px] text-text-muted mt-4 italic">LiveSoko v2.4.0 • Made with ❤️ by SoftLOGIC</p>
            </div>


          </div>
        )}
      </div>
    </div>
  );
};
