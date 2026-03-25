import React, { useState } from 'react';

interface ManualOrderModalProps {
  onClose: () => void;
  onSubmit: (data: {
    buyer_name: string;
    item_name: string;
    unit_price: string;
    quantity: string;
    delivery_location: string;
    buyer_phone: string;
    payment_type: 'MPESA' | 'COD';
    buyer_mpesa_name?: string;
  }) => void;
}

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({ onClose, onSubmit }) => {
  const [buyerName, setBuyerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'MPESA' | 'COD'>('MPESA');
  const [mpesaName, setMpesaName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !itemName || !location || !phone) return;
    if (paymentType === 'MPESA' && !price) return;
    onSubmit({
      buyer_name: buyerName,
      item_name: itemName,
      unit_price: price || '0',
      quantity: quantity || '1',
      delivery_location: location,
      buyer_phone: phone,
      payment_type: paymentType,
      buyer_mpesa_name: mpesaName || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-bg-elevated w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border-subtle" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-display font-bold text-brand-primary mb-4">Add Manual Order</h3>

        {/* Payment type toggle */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setPaymentType('MPESA')}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-widest border transition-colors ${
              paymentType === 'MPESA'
                ? 'bg-brand-primary text-black border-brand-primary'
                : 'bg-bg-surface text-text-muted border-border-subtle'
            }`}
          >
            MPESA
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('COD')}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-widest border transition-colors ${
              paymentType === 'COD'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-bg-surface text-text-muted border-border-subtle'
            }`}
          >
            📦 COD
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Buyer Name</label>
            <input
              autoFocus
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="e.g. Martha W."
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Item Name</label>
            <input
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Designer Handbag"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] text-text-muted uppercase font-body">
                Amount (Ksh){paymentType === 'COD' && <span className="text-text-muted ml-1 normal-case">— optional</span>}
              </label>
              <input
                type="number"
                className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none font-bold"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={paymentType === 'COD' ? 'e.g. 1500' : 'e.g. 1500'}
                required={paymentType === 'MPESA'}
              />
            </div>
            <div className="flex flex-col gap-1 w-20">
              <label className="text-[10px] text-text-muted uppercase font-body">Qty</label>
              <input
                type="number"
                min="1"
                className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none font-bold text-center"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Buyer Phone</label>
            <input
              type="tel"
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Location / Landmark</label>
            <input
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Nairobi CBD, Near Imenti House"
              required
            />
          </div>

          {paymentType === 'MPESA' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-text-muted uppercase font-body">
                M-Pesa Name <span className="normal-case text-text-muted/70">— name that will appear on confirmation</span>
              </label>
              <input
                className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
                value={mpesaName}
                onChange={e => setMpesaName(e.target.value)}
                placeholder="e.g. JOHN DOE (as on M-Pesa)"
              />
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-text-primary border border-border-subtle font-display font-bold uppercase text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-lg font-display font-bold uppercase text-xs ${
                paymentType === 'COD'
                  ? 'bg-blue-500 text-white'
                  : 'bg-brand-primary text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
              }`}
            >
              Add Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
