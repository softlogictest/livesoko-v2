import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { OrderCardProps } from '../types';
import { fetchWithAuth } from '../lib/api';

export const Dispatch: React.FC = () => {
  const { state } = useAppContext();
  const [orders, setOrders] = useState<OrderCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!state.user || !state.activeSession) { setLoading(false); return; }
      try {
        const [r1, r2] = await Promise.all([
          fetchWithAuth(`/api/orders?session_id=${state.activeSession.id}&status=VERIFIED`),
          fetchWithAuth(`/api/orders?session_id=${state.activeSession.id}&status=COD_PENDING`),
        ]);
        const [v, c] = await Promise.all([r1.json(), r2.json()]);
        const combined = [...(Array.isArray(v) ? v : []), ...(Array.isArray(c) ? c : [])];
        combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setOrders(combined);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [state.user, state.activeSession]);

  const buildManifest = () => {
    const date = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    const title = state.activeSession?.title || 'Session';
    const lines = orders.map((o, i) => {
      const amt = o.expected_amount ? `Ksh ${o.expected_amount.toLocaleString()}` : 'TBD';
      const tag = o.payment_type === 'COD' ? '[COD]' : '[PAID]';
      return `${i + 1}. ${o.buyer_name} | ${o.buyer_phone} | ${o.item_name} (x${o.quantity}) | ${o.delivery_location} | ${amt} ${tag}`;
    });
    const codTotal = orders
      .filter(o => o.payment_type === 'COD')
      .reduce((sum, o) => sum + (o.expected_amount || 0), 0);
    return [
      `DUKALIVE DISPATCH — ${title} — ${date}`,
      '',
      ...lines,
      '',
      `Total orders: ${orders.length} | COD to collect: Ksh ${codTotal.toLocaleString()}`,
    ].join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildManifest());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy. Try long-pressing the text.');
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildManifest());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center font-display text-brand-primary animate-pulse tracking-widest uppercase">
      Loading Dispatch...
    </div>
  );

  if (!state.activeSession) return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="text-4xl">🏍️</span>
      <p className="text-text-secondary font-body">No active session. Start a live session first.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border-subtle">
        <div className="text-text-muted text-[10px] uppercase font-body tracking-wider mb-1">Active Session</div>
        <h1 className="font-display font-bold text-2xl text-text-primary">🏍️ Dispatch</h1>
        <div className="text-text-muted text-xs font-body mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} ready to go out</div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-8 mt-12">
          <span className="text-5xl">📭</span>
          <p className="text-text-secondary font-body text-sm">No verified or COD orders yet.<br />They'll appear here once confirmed.</p>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="px-4 pt-4 pb-2 flex gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 rounded-lg font-display font-bold uppercase text-xs tracking-widest border transition-colors ${
                copied
                  ? 'bg-brand-primary text-black border-brand-primary'
                  : 'bg-bg-surface border-border-subtle text-text-primary hover:border-brand-primary'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy All for Rider'}
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 py-3 rounded-lg font-display font-bold uppercase text-xs tracking-widest border border-[#25D366]/40 text-[#25D366] bg-bg-surface hover:bg-[#25D366]/10 transition-colors"
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Order list */}
          <div className="px-4 pt-2 flex flex-col gap-2">
            {orders.map((o, i) => (
              <div key={o.id} className="bg-bg-surface rounded-lg border border-border-subtle px-4 py-3 flex gap-3 items-start">
                <div className="text-text-muted font-display text-sm w-5 mt-0.5">{i + 1}.</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <div className="font-display font-semibold text-text-primary truncate">{o.buyer_name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-display font-bold uppercase shrink-0 ${
                      o.payment_type === 'COD' ? 'text-blue-400 bg-blue-500/10' : 'text-status-verified bg-status-verified/10'
                    }`}>
                      {o.payment_type === 'COD' ? '📦 COD' : '✓ PAID'}
                    </span>
                  </div>
                  <div className="text-text-secondary text-xs font-body mt-0.5">{o.item_name} × {o.quantity}</div>
                  <div className="flex justify-between mt-1">
                    <div className="text-text-muted text-[11px] font-body truncate">{o.delivery_location}</div>
                    <div className="font-display font-bold text-text-primary text-sm shrink-0 ml-2">
                      Ksh {o.expected_amount ? o.expected_amount.toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="text-text-muted text-[11px] font-body mt-0.5">{o.buyer_phone}</div>
                </div>
              </div>
            ))}
          </div>

          {/* COD total */}
          {orders.some(o => o.payment_type === 'COD') && (
            <div className="mx-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-blue-400 text-[10px] uppercase font-body mb-1">COD Cash to Collect</div>
              <div className="font-display font-bold text-blue-300 text-2xl">
                Ksh {orders.filter(o => o.payment_type === 'COD').reduce((s, o) => s + (o.expected_amount || 0), 0).toLocaleString()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
