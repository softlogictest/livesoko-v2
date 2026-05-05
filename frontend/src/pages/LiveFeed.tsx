import React, { useEffect, useState } from 'react';
import { SessionHeader } from '../components/SessionHeader';
import { LiveTicker } from '../components/LiveTicker';
import { ManualOrderModal } from '../components/ManualOrderModal';
import { UnmatchedPaymentsModal } from '../components/UnmatchedPaymentsModal';
import { SessionSummary } from '../components/SessionSummary';
import { useRealtime } from '../hooks/useRealtime';
import { useAppContext } from '../context/AppContext';
import { API, fetchWithAuth } from '../lib/api';

export const LiveFeed: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [staleCount, setStaleCount] = useState(0);
  const [dismissedStale, setDismissedStale] = useState(false);
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);
  const [isSyncPaused, setIsSyncPaused] = useState(false);

  const isManagerOrOwner = state.activeShop?.role === 'owner' || state.activeShop?.role === 'manager' || state.user?.role === 'admin';

  useRealtime();

  useEffect(() => {
    const init = async () => {
      if (!state.user) return; 

      try {
        // Fetch active session
        const resSession = await fetchWithAuth('/api/sessions');
        
        if (resSession.ok) {
          const sessions = await resSession.json();
          const activeSession = sessions.find((s: any) => s.status === 'active');
          
          if (activeSession) {
            dispatch({ type: 'SET_ACTIVE_SESSION', payload: activeSession });
            
            // Fetch orders for this session using backend
            const resOrders = await fetchWithAuth(`/api/orders?session_id=${activeSession.id}`);
            
            if (resOrders.ok) {
              const orders = await resOrders.json();
              dispatch({ type: 'SET_ORDERS', payload: Array.isArray(orders) ? orders : [] });
            }
          } else {
            dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
            dispatch({ type: 'SET_ORDERS', payload: [] });
          }

          // Always fetch unmatched payments on load
          const resPayments = await fetchWithAuth('/api/payments/unmatched');
          if (resPayments.ok) {
            const payments = await resPayments.json();
            dispatch({ type: 'SET_UNMATCHED_PAYMENTS', payload: payments });
          }
        }
      } catch (e) {
        console.error('Initial fetch error:', e);
      }
      setLoading(false);
    };

    init();
  }, [state.user, dispatch]);

  // ── Staleness alert ────────────────────────────────────────────────────────
  // Shows when any MPESA PENDING order in the current session is > 5 min old.
  // Only fires after the session itself has been running for 5+ minutes.
  // Resets completely when the session changes.
  const prevStaleRef = React.useRef(0);

  useEffect(() => {
    // Hard reset when session switches
    prevStaleRef.current = 0;
    setStaleCount(0);
    setDismissedStale(false);
  }, [state.activeSession?.id]);

  useEffect(() => {
    if (!state.activeSession) return;

    const FIVE_MIN = 5 * 60 * 1000;
    // Parse SQLite UTC timestamps correctly (append Z so JS doesn't treat as local)
    const toMs = (s: string) => new Date(s.replace(' ', 'T') + 'Z').getTime();
    const sessionStart = toMs(state.activeSession.created_at);

    const check = () => {
      // Session must be >5 min old before we can have stale orders
      if (Date.now() - sessionStart < FIVE_MIN) return;

      const count = state.orders.filter(o =>
        o.status === 'PENDING' &&
        o.payment_type === 'MPESA' &&
        toMs(o.created_at) >= sessionStart &&
        Date.now() - toMs(o.created_at) > FIVE_MIN
      ).length;

      setStaleCount(count);
      if (count > prevStaleRef.current) setDismissedStale(false); // new stale order → re-show
      prevStaleRef.current = count;
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeSession?.id, state.orders]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Sync Pulse Check ──────────────────────────────────────────────────────
  // Checks if the SMS Forwarder has checked in recently
  useEffect(() => {
    const checkPulse = async () => {
      try {
        const res = await fetchWithAuth('/api/settings/network');
        if (res.ok) {
          const data = await res.json();
          const devices = data.devices || [];
          if (devices.length === 0) {
            setIsSyncPaused(false); // No device configured yet, don't nag
            return;
          }
          
          const latestSeen = Math.max(...devices.map((d: any) => new Date(d.last_seen_at.replace(' ', 'T') + 'Z').getTime()));
          const TEN_MIN = 10 * 60 * 1000;
          setIsSyncPaused(!!state.activeSession && Date.now() - latestSeen > TEN_MIN);
        }
      } catch (e) {
        console.error('Pulse check error:', e);
      }
    };

    checkPulse();
    const id = setInterval(checkPulse, 30_000); // Check every 30s
    return () => clearInterval(id);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────


  const handleStartSession = async () => {
    try {
      const res = await fetchWithAuth('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Live' })
      });
      if (res.ok) {
        const session = await res.json();
        dispatch({ type: 'SET_ACTIVE_SESSION', payload: session });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start session');
      }
    } catch (e) {
      console.error(e);
      alert('Error starting session');
    }
  };

  const handleManualOrder = async (data: { buyer_name: string; item_name: string; unit_price: string; quantity: string; delivery_location: string; buyer_phone: string; payment_type: 'MPESA' | 'COD'; buyer_mpesa_name?: string }) => {
    try {
      const res = await fetchWithAuth('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: data.buyer_name,
          buyer_tiktok: '@manual',
          buyer_phone: data.buyer_phone,
          delivery_location: data.delivery_location,
          item_name: data.item_name,
          quantity: parseInt(data.quantity) || 1,
          unit_price: data.unit_price,
          payment_type: data.payment_type,
          buyer_mpesa_name: data.buyer_mpesa_name || undefined
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create order' }));
        alert(err.error || 'Failed to create order');
        return;
      }
      const order = await res.json();
      dispatch({ type: 'ADD_ORDER', payload: order });
      setShowManualModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create manual order');
    }
  };

  if (loading) return <div className="min-h-screen bg-bg-base flex items-center justify-center font-display text-brand-primary animate-pulse tracking-widest uppercase">Initializing Ops...</div>;

  // Show session summary after session ends
  if (endedSessionId) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col">
        <div className="bg-bg-surface border-b border-border-subtle p-4 sticky top-0 z-40">
          <h1 className="font-display font-bold text-brand-primary text-xl">LiveSoko</h1>
        </div>
        <SessionSummary sessionId={endedSessionId} onDone={() => setEndedSessionId(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <SessionHeader onSessionEnded={(id) => setEndedSessionId(id)} />

      {/* Floating Unmatched Payments Alert */}
      {state.unmatchedPayments.length > 0 && (
        <div 
          onClick={() => setShowUnmatchedModal(true)}
          className="mx-4 mt-3 flex items-center justify-between bg-brand-primary/10 border border-brand-primary/40 rounded-xl px-4 py-3 cursor-pointer shadow-[0_0_20px_rgba(0,255,136,0.15)] animate-in fade-in slide-in-from-top-2 duration-500 hover:bg-brand-primary/20 transition-all relative group overflow-hidden"
        >
          {/* Pulsing Glow Background */}
          <div className="absolute inset-0 bg-brand-primary/5 animate-pulse"></div>
          
          <div className="flex items-center gap-3 relative z-10">
             <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,255,136,0.3)] group-hover:scale-110 transition-transform">
               💰
             </div>
             <div>
                <p className="text-brand-primary text-[10px] font-display font-bold uppercase tracking-widest leading-none mb-1">
                  System Alert
                </p>
                <p className="text-white text-sm font-display font-bold">
                  {state.unmatchedPayments.length} Floating Payment{state.unmatchedPayments.length > 1 ? 's' : ''}
                </p>
                <p className="text-text-muted text-[10px] font-body uppercase tracking-tight mt-0.5">Claim funds & link to order</p>
             </div>
          </div>
          <div className="relative z-10 bg-brand-primary text-black w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg group-hover:translate-x-1 transition-transform">
            →
          </div>
        </div>
      )}

      {/* Sync Paused Alert */}
      {isSyncPaused && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-status-fraud/10 border border-status-fraud/40 rounded-xl px-4 py-3 animate-pulse shadow-[0_0_20px_rgba(255,59,48,0.1)]">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-status-fraud/20 flex items-center justify-center text-lg">
                📵
              </div>
              <div>
                 <p className="text-status-fraud text-[10px] font-display font-bold uppercase tracking-widest leading-none mb-1">
                   Connection Alert
                 </p>
                 <p className="text-white text-sm font-display font-bold">
                   Live Sync Paused
                 </p>
                 <p className="text-text-muted text-[10px] font-body uppercase tracking-tight mt-0.5">Please check your phone's connection</p>
              </div>
           </div>
        </div>
      )}

      {/* Staleness alert */}
      {staleCount > 0 && !dismissedStale && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-status-review/10 border border-status-review/40 rounded-lg px-4 py-3">
          <span className="text-status-review text-lg">⚠</span>
          <div className="flex-1">
            <p className="text-status-review text-xs font-display font-bold uppercase tracking-wide">
              {staleCount} order{staleCount > 1 ? 's' : ''} pending for over 5 minutes
            </p>
            <p className="text-text-muted text-[11px] font-body mt-0.5">
              Is your SMS Forwarder connected? Check Settings.
            </p>
          </div>
          <button onClick={() => setDismissedStale(true)} className="text-text-muted text-sm">✕</button>
        </div>
      )}
      
      {!state.activeSession && isManagerOrOwner && (
        <div className="p-4 mt-6">
          <button 
            onClick={handleStartSession}
            className="w-full bg-brand-primary text-black py-4 rounded font-display font-bold text-xl shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-transform active:scale-[0.98]"
          >
            START NEW SESSION
          </button>
        </div>
      )}

      {state.activeSession && (
        <div className="px-4 py-2 flex justify-end">
          <button 
            onClick={() => setShowManualModal(true)}
            className="text-xs bg-bg-surface border border-border-subtle text-text-primary px-3 py-1 rounded flex items-center gap-1 active:bg-bg-elevated"
          >
            <span className="text-brand-primary">+</span> Add Order Info
          </button>
        </div>
      )}
      
      <LiveTicker />

      {showManualModal && (
        <ManualOrderModal 
          onClose={() => setShowManualModal(false)}
          onSubmit={handleManualOrder}
        />
      )}

      {showUnmatchedModal && (
        <UnmatchedPaymentsModal 
          onClose={() => setShowUnmatchedModal(false)}
        />
      )}
    </div>
  );
};
