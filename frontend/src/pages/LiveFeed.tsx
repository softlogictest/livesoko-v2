import React, { useEffect, useState } from 'react';
import { SessionHeader } from '../components/SessionHeader';
import { LiveTicker } from '../components/LiveTicker';
import { ManualOrderModal } from '../components/ManualOrderModal';
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
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);

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
      await fetchWithAuth('/api/orders', {
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
          <h1 className="font-display font-bold text-brand-primary text-xl">VibeSoko</h1>
        </div>
        <SessionSummary sessionId={endedSessionId} onDone={() => setEndedSessionId(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <SessionHeader onSessionEnded={(id) => setEndedSessionId(id)} />

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
      
      {!state.activeSession && state.user?.role === 'seller' && (
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
    </div>
  );
};
