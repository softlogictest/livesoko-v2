import React, { useState } from 'react';
import { OrderCardProps } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { EditOrderModal } from '../EditOrderModal';
import { API, fetchWithAuth } from '../../lib/api';

export const OrderDrawer: React.FC<{ order: OrderCardProps, onClose: () => void }> = ({ order, onClose }) => {
  const { state, dispatch } = useAppContext();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = async (data: any) => {
    try {
      await fetchWithAuth(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFulfill = async () => {
    if (order.status !== 'VERIFIED' && order.status !== 'COD_PENDING') return;
    await fetchWithAuth(`/api/orders/${order.id}/fulfill`, {
      method: 'PATCH'
    });
    onClose();
  };

  const handleFlag = async () => {
    await fetchWithAuth(`/api/orders/${order.id}/flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FRAUD' })
    });
    onClose();
  };

  const handleUnflag = async () => {
    await fetchWithAuth(`/api/orders/${order.id}/unflag`, {
      method: 'PATCH'
    });
    onClose();
  };

  const maskName = (name: string) =>
    name.split(' ').map(t => t[0] + '*'.repeat(Math.max(t.length - 1, 2))).join(' ');

  const handleVerify = async () => {
    if (order.status !== 'PENDING' && order.status !== 'REVIEW') return;
    await fetchWithAuth(`/api/orders/${order.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
    try {
      const res = await fetchWithAuth(`/api/orders/${order.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        alert(err.error || 'Failed to delete order');
        return;
      }
      dispatch({ type: 'DELETE_ORDER', payload: { id: order.id } });
      onClose();
    } catch {
      alert('Failed to delete order');
    }
  };

  const handleSendToRider = () => {
    const message = `*LiveSoko Delivery Request*%0A%0A*Customer:* ${order.buyer_name}%0A*Phone:* ${order.buyer_phone}%0A*Item:* ${order.quantity}x ${order.item_name}%0A*Location:* ${order.delivery_location}%0A%0A_Please confirm dispatch._`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div 
        className="bg-bg-elevated w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-border-subtle pb-4">
            <div>
              <div className="text-text-muted text-[10px] uppercase font-body mb-1 tracking-wider">Order ID: {order.id.slice(0,8)}</div>
              <h2 className="text-2xl font-display font-bold text-text-primary leading-tight">
                {order.buyer_tiktok === '@manual' ? order.buyer_name : (order.buyer_tiktok || order.buyer_name)}
              </h2>
              {order.buyer_tiktok === '@manual' && (
                <div className="text-[10px] text-brand-primary font-mono uppercase tracking-widest mt-0.5 opacity-80">Manual Entry</div>
              )}
              {order.payment_type === 'COD' && (
                <div className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mt-0.5">📦 Cash on Delivery</div>
              )}
            </div>
            <span className={`font-display text-xs px-3 py-1 rounded-full bg-bg-surface text-brand-primary border border-brand-primary/30 uppercase`}>
              {order.status}
            </span>
          </div>

        <div className="grid grid-cols-2 gap-y-4 mb-6 text-sm font-body">
          <div>
            <div className="text-text-muted text-xs">ITEM</div>
            <div className="text-text-primary">{order.quantity}x {order.item_name}</div>
          </div>
          <div>
            <div className="text-text-muted text-[10px] uppercase mb-1">AMOUNT</div>
            <div className="text-text-primary font-bold">Ksh {order.expected_amount ? order.expected_amount.toLocaleString() : '...'}</div>
          </div>
          <div>
            <div className="text-text-muted text-xs">PHONE</div>
            <div className="text-text-primary">{order.buyer_phone}</div>
          </div>
          <div>
            <div className="text-text-muted text-[10px] uppercase mb-1">LOCATION</div>
            <div className="text-text-primary">{order.delivery_location}</div>
          </div>
        </div>

        {order.status_reason && (
          <div className="mb-4 px-3 py-2 rounded bg-bg-base border border-border-subtle">
            <div className="text-text-muted text-[10px] uppercase mb-1">Note</div>
            <div className="text-text-secondary text-xs font-body">{order.status_reason}</div>
          </div>
        )}

        {(order.mpesa_tx_code || (order as any).mpesa_raw_sms) && (
          <div className="mb-6">
            <div className="text-text-muted text-xs mb-2">M-PESA CONFIRMATION</div>
            {order.mpesa_tx_code && (
              <div className="bg-bg-base border border-status-verified/30 rounded p-3 text-status-verified text-sm font-bold font-mono mb-2">
                TX: {order.mpesa_tx_code}
              </div>
            )}
            {(order as any).mpesa_raw_sms && (
              <div className="bg-bg-base border border-border-subtle rounded p-3 text-text-secondary text-xs font-body break-words">
                {(order as any).mpesa_raw_sms}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
             <a href={`tel:${order.buyer_phone}`} className="flex justify-center items-center py-3 rounded-md bg-bg-surface border border-border-subtle text-text-primary font-body">
                📞 Call
             </a>
             <a href={`https://wa.me/${order.buyer_phone && order.buyer_phone.replace('+', '')}`} target="_blank" rel="noreferrer" className="flex justify-center items-center py-3 rounded-md bg-bg-surface border border-[#25D366]/30 text-[#25D366] font-body">
                💬 WhatsApp
             </a>
          </div>
          {order.status === 'VERIFIED' && (
            <button onClick={handleFulfill} className="w-full py-3 rounded-md bg-brand-primary text-black font-bold font-display text-lg">
              ✓ MARK FULFILLED
            </button>
          )}
          {order.status === 'COD_PENDING' && (
            <button onClick={handleFulfill} className="w-full py-3 rounded-md bg-blue-500 text-white font-bold font-display text-lg">
              📦 MARK COD COLLECTED
            </button>
          )}
          {(order.status === 'PENDING' || order.status === 'REVIEW') && (
            <button onClick={handleVerify} className="w-full py-3 rounded-md bg-status-verified text-black font-bold font-display text-lg">
              ✓ MANUAL VERIFY
            </button>
          )}
          {/* Flag as Fraud — available for any non-FULFILLED, non-FRAUD status */}
          {!['FRAUD', 'FULFILLED'].includes(order.status) && (
            <button onClick={handleFlag} className="w-full py-2 rounded-md border border-status-fraud/50 text-status-fraud font-display text-xs uppercase font-bold hover:bg-status-fraud/10 transition-colors mt-1">
              🚩 Flag as Fraud
            </button>
          )}
          {/* Unflag — restores FRAUD or REVIEW back to PENDING */}
          {['FRAUD', 'REVIEW'].includes(order.status) && (
            <button onClick={handleUnflag} className="w-full py-2 rounded-md border border-text-muted/40 text-text-muted font-display text-xs uppercase font-bold hover:bg-bg-elevated transition-colors mt-1">
              ↩ Remove Flag
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => setShowEditModal(true)} className="w-full py-3 rounded-md border border-status-review/40 text-text-secondary font-display text-xs uppercase font-bold hover:bg-bg-elevated transition-colors">
              EDIT ORDER
            </button>
            <button onClick={handleDelete} className="w-full py-3 rounded-md border border-status-fraud text-status-fraud font-display text-xs uppercase font-bold hover:bg-status-fraud/10 transition-colors">
              DELETE ORDER
            </button>
          </div>
          {(order.status === 'VERIFIED' || order.status === 'FULFILLED') && (
            <button onClick={handleSendToRider} className="w-full py-4 rounded-xl bg-bg-surface border-2 border-brand-primary text-brand-primary font-display font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 mb-2 hover:bg-brand-primary/10 transition-colors">
              <span>🏍️</span> SEND TO RIDER (WHATSAPP)
            </button>
          )}
          <button onClick={onClose} className="w-full py-4 rounded-xl bg-bg-surface border border-border-subtle text-text-muted font-display font-bold uppercase tracking-widest text-xs mt-2">
            CLOSE
          </button>
        </div>
        </div>
      </div>

      {showEditModal && (
        <EditOrderModal 
          order={order}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
};
