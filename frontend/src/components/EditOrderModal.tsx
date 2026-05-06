import React, { useState } from 'react';

interface EditOrderModalProps {
  order: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSubmit }) => {
  const [buyerName, setBuyerName] = useState(order.buyer_name);
  const [itemName, setItemName] = useState(order.item_name);
  const [price, setPrice] = useState(order.unit_price.toString());
  const [location, setLocation] = useState(order.delivery_location);
  const [phone, setPhone] = useState(order.buyer_phone);
  const [productSpecifics, setProductSpecifics] = useState(order.product_specifics || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !itemName || !price || !location || !phone) return;
    onSubmit({ 
      buyer_name: buyerName, 
      item_name: itemName, 
      unit_price: parseFloat(price), 
      delivery_location: location,
      buyer_phone: phone,
      product_specifics: productSpecifics 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <form 
        onSubmit={handleSubmit}
        className="bg-bg-elevated w-full max-w-sm rounded-2xl border border-border-subtle p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-display font-bold text-brand-primary uppercase tracking-tight">Edit Order</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Buyer Name</label>
            <input 
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Item Name</label>
            <input 
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Product Specifics <span className="normal-case text-text-muted/70">— optional</span></label>
            <textarea
              rows={3}
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none resize-none"
              value={productSpecifics}
              onChange={e => setProductSpecifics(e.target.value)}
              placeholder="e.g. Size L, Black colour"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Amount (Ksh)</label>
            <input 
              type="number"
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none font-bold"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Buyer Phone</label>
            <input 
              type="tel"
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase font-body">Location / Landmark</label>
            <input 
              className="bg-bg-surface border border-border-subtle rounded p-3 text-sm text-text-primary focus:border-brand-primary outline-none"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-md border border-border-subtle text-text-muted font-display font-medium text-xs uppercase"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-md bg-brand-primary text-black font-display font-bold text-xs uppercase shadow-lg shadow-brand-primary/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
