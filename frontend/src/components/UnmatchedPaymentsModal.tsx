import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fetchWithAuth } from '../lib/api';

interface UnmatchedPaymentsModalProps {
  onClose: () => void;
}

export const UnmatchedPaymentsModal: React.FC<UnmatchedPaymentsModalProps> = ({ onClose }) => {
  const { state, notify } = useAppContext();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pendingOrders = state.orders.filter(o => o.status === 'PENDING' || o.status === 'REVIEW');
  const selectedPayment = state.unmatchedPayments.find(p => p.id === selectedPaymentId);

  const handleLink = async (orderId: string) => {
    if (!selectedPaymentId) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/payments/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: selectedPaymentId, order_id: orderId })
      });

      if (res.ok) {
        notify('Payment successfully linked!', 'success');
        if (state.unmatchedPayments.length <= 1) onClose();
        else setSelectedPaymentId(null);
      } else {
        const err = await res.json();
        notify(err.error || 'Failed to link payment', 'error');
      }
    } catch (e) {
      notify('Network error linking payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-bg-elevated w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-surface rounded-t-2xl">
          <div>
            <h2 className="text-xl font-display font-bold text-brand-primary">
              {selectedPaymentId ? 'Select Order to Link' : 'Floating Payments'}
            </h2>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
              {selectedPaymentId ? `Linking Ksh ${selectedPayment?.mpesa_amount.toLocaleString()}` : `${state.unmatchedPayments.length} unassigned receipts`}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted text-xl p-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!selectedPaymentId ? (
            <div className="flex flex-col gap-3">
              {state.unmatchedPayments.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedPaymentId(p.id)}
                  className="bg-bg-surface border border-border-subtle p-4 rounded-xl cursor-pointer hover:border-brand-primary/50 active:scale-[0.98] transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-brand-primary font-mono font-bold text-sm">{p.mpesa_code}</span>
                    <span className="text-text-primary font-display font-bold">Ksh {p.mpesa_amount.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-text-secondary font-body mb-2 uppercase line-clamp-1">From: {p.mpesa_sender}</div>
                  <div className="text-[10px] text-text-muted font-mono bg-bg-base/50 p-2 rounded italic">
                    {p.raw_sms.slice(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4">
              <button 
                onClick={() => setSelectedPaymentId(null)}
                className="text-[10px] text-brand-primary font-display font-bold mb-2 uppercase tracking-widest"
              >
                ← Back to payments
              </button>
              
              {pendingOrders.length === 0 ? (
                <div className="text-center py-10 px-6 bg-bg-surface rounded-xl border border-dashed border-border-subtle text-text-muted text-sm italic">
                  No pending M-Pesa orders found to link this payment to.
                </div>
              ) : (
                pendingOrders.map(o => (
                  <div 
                    key={o.id}
                    onClick={() => !loading && handleLink(o.id)}
                    className="bg-bg-surface border border-border-subtle p-4 rounded-xl cursor-pointer hover:bg-brand-primary/5 group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-display font-bold text-text-primary">{o.buyer_name}</span>
                      <span className="text-brand-primary font-display font-bold">Ksh {o.expected_amount.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-text-muted mb-3">{o.item_name}</div>
                    <button className="w-full py-2 bg-brand-primary text-black font-display font-bold text-[10px] rounded uppercase tracking-widest group-hover:scale-[1.02] transition-transform">
                      LINK & VERIFY
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-bg-surface/50 border-t border-border-subtle rounded-b-2xl">
          <p className="text-[9px] text-text-muted text-center leading-relaxed">
            Linking a payment will instantly turn the selected order <span className="text-status-verified font-bold">GREEN</span> and mark it as Verified.
          </p>
        </div>
      </div>
    </div>
  );
};
