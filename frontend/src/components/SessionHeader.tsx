import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';
import { API } from '../App';

// SQLite stores datetimes as "YYYY-MM-DD HH:MM:SS" without timezone info (UTC).
// JavaScript's Date constructor treats bare strings as LOCAL time, causing a 3h offset in EAT.
// Appending 'Z' forces UTC interpretation.
function parseUtc(iso: string): number {
  return new Date(iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
}

function formatDuration(startIso: string): string {
  const elapsed = Math.floor((Date.now() - parseUtc(startIso)) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.max(0, elapsed)}s`;
}

export const SessionHeader: React.FC<{ onSessionEnded?: (sessionId: string) => void }> = ({ onSessionEnded }) => {
  const { state, dispatch } = useAppContext();
  const [showEndModal, setShowEndModal] = useState(false);
  const [liveDuration, setLiveDuration] = useState('0s');
  const { activeSession, user } = state;

  const handleEndSession = async () => {
    if (!activeSession) return;
    const sessionId = activeSession.id;
    try {
      await fetch(`${API}/api/sessions/${sessionId}/end`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
      dispatch({ type: 'SET_ORDERS', payload: [] });
      setShowEndModal(false);
      onSessionEnded?.(sessionId);
    } catch (e) {
      console.error(e);
    }
  };

  // Live duration ticker — updates every 30s
  useEffect(() => {
    if (!activeSession) { setLiveDuration('0s'); return; }
    const update = () => setLiveDuration(formatDuration(activeSession.created_at));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  const isHandyman = user?.role === 'handyman';
  const displayOrders = isHandyman
    ? state.orders.filter(o => o.status === 'VERIFIED')
    : state.orders;

  return (
    <>
      <div className="bg-bg-surface border-b border-border-subtle p-4 sticky top-0 z-40 lg:shadow-md">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-brand-primary text-xl tracking-wide">DukaLive</h1>
            {activeSession && (
              <div className={`flex items-center gap-1.5 ${isHandyman ? 'bg-status-verified/20 text-status-verified' : 'bg-status-fraud/10 text-status-fraud'} px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-widest`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isHandyman ? 'bg-status-verified' : 'bg-status-fraud'} animate-pulse`}></div>
                {isHandyman ? 'Fulfillment Ops' : 'Live'}
              </div>
            )}
          </div>
          {user?.role === 'seller' && activeSession && (
            <button
              onClick={() => setShowEndModal(true)}
              className="px-3 py-1 text-xs font-display font-bold text-status-fraud border border-status-fraud rounded hover:bg-status-fraud hover:text-white transition-all active:scale-95"
            >
              END
            </button>
          )}
        </div>

        {activeSession && (
          <div className="font-body text-[10px] text-text-muted mt-2 uppercase tracking-wide">
            {isHandyman ? (
              <><span className="text-status-verified font-bold">{displayOrders.length} orders</span> to pack & dispatch</>
            ) : (
              <>
                <span className="text-status-fraud font-bold">{liveDuration}</span>
                {' '}• {state.orders.length} orders •{' '}
                <span className="text-brand-primary font-bold">
                  Ksh {state.orders.filter(o => o.status === 'VERIFIED' || o.status === 'FULFILLED').reduce((acc, curr) => acc + (curr.expected_amount || 0), 0).toLocaleString()}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {showEndModal && (
        <ConfirmModal
          title="End Live Session?"
          message="This will stop the live feed. Orders currently pending will remain pending until resolved."
          confirmText="End Session"
          cancelText="Cancel"
          onConfirm={handleEndSession}
          onCancel={() => setShowEndModal(false)}
          destructive={true}
        />
      )}
    </>
  );
};
