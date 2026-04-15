import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API } from '../lib/api';

export const PublicOrderPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    buyer_name: '',
    buyer_tiktok: '',
    buyer_phone: '',
    delivery_location: '',
    item_name: '',
    quantity: 1,
    unit_price: 0
  });

  useEffect(() => {
    fetch(`${API}/api/public/shop/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Shop not found or inactive');
        return res.json();
      })
      .then(data => {
        setShop(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message === 'Shop not found or inactive' ? 'This shop does not exist or has been disabled.' : err.message);
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/public/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, shop_id: shop.id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit order');
      
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !shop) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold mb-2">Shop Unavailable</h1>
      <p className="text-text-secondary">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-bg-surface border border-border-subtle rounded-lg"
      >
        Retry
      </button>
    </div>
  );

  if (submitted) return (
    <div className={`min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center theme-${shop?.color_scheme || 'acid-green'}`}>
      <div className="w-24 h-24 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center text-5xl mb-6 animate-bounce-in">
        ✅
      </div>
      <h1 className="text-3xl font-bold mb-2">Order Received!</h1>
      <p className="text-text-secondary mb-8">Thank you for shopping with <strong>{shop?.name}</strong>.</p>
      
      <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl max-w-sm w-full text-left">
        <h3 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
          <span>📲</span> HOW TO PAY
        </h3>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="bg-brand-primary/20 text-brand-primary w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">1</span>
            <span>Go to your <strong>M-PESA</strong> menu.</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-primary/20 text-brand-primary w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">2</span>
            <span>Send <strong>Ksh {formData.quantity * formData.unit_price}</strong> to the seller's number.</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-primary/20 text-brand-primary w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">3</span>
            <span>Stay in the <strong>Live Session</strong>! Your order will turn green once verified.</span>
          </li>
        </ol>
      </div>

      <button 
        onClick={() => setSubmitted(false)}
        className="mt-8 text-text-secondary text-sm underline hover:text-brand-primary transition-colors"
      >
        Place another order
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen bg-bg-base theme-${shop?.color_scheme || 'acid-green'}`}>
      {/* Header */}
      <div className="bg-bg-surface border-b border-border-subtle p-6 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-primary leading-tight">{shop?.name}</h1>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-display">Official Order Page</p>
          </div>
          {shop?.is_live && (
            <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold animate-pulse">
              🔴 LIVE NOW
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 pb-12">
        {!shop?.is_live ? (
          <div className="py-20 text-center space-y-4">
            <div className="text-6xl mb-6 opacity-40">😴</div>
            <h2 className="text-2xl font-bold">Shop is Currently Offline</h2>
            <p className="text-text-secondary">Please wait for the seller to go live to place your order!</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-bg-surface border border-border-subtle rounded-xl text-sm"
            >
              Refresh Status
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Item Details</h2>
              
              <div className="space-y-2">
                <label className="text-xs text-text-secondary ml-1">What are you buying?</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Green Dress, Wireless Buds"
                  className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                  value={formData.item_name}
                  onChange={e => setFormData({...formData, item_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary ml-1">Quantity</label>
                  <input 
                    required
                    type="number"
                    min="1"
                    className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary ml-1">Price (Ksh)</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                    value={formData.unit_price}
                    onChange={e => setFormData({...formData, unit_price: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-border-subtle">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Your Details</h2>
              
              <div className="space-y-2">
                <label className="text-xs text-text-secondary ml-1">Your Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="Name on M-Pesa"
                  className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                  value={formData.buyer_name}
                  onChange={e => setFormData({...formData, buyer_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-secondary ml-1">TikTok Handle</label>
                <input 
                  required
                  type="text"
                  placeholder="@username"
                  className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all text-brand-primary font-bold"
                  value={formData.buyer_tiktok}
                  onChange={e => setFormData({...formData, buyer_tiktok: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-secondary ml-1">Phone Number</label>
                <input 
                  required
                  type="tel"
                  placeholder="0712 345 678"
                  className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                  value={formData.buyer_phone}
                  onChange={e => setFormData({...formData, buyer_phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-secondary ml-1">Delivery Location</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Nairobi CBD, Estate Name"
                  className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-primary outline-none transition-all"
                  value={formData.delivery_location}
                  onChange={e => setFormData({...formData, delivery_location: e.target.value})}
                />
              </div>
            </section>

            <footer className="pt-6">
              <div className="bg-brand-primary/5 p-4 rounded-2xl mb-6 border border-brand-primary/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-secondary text-sm">Total Amount</span>
                  <span className="text-2xl font-bold text-brand-primary">Ksh {formData.quantity * formData.unit_price}</span>
                </div>
                <p className="text-[10px] text-text-muted text-center italic">Pay after clicking the button below</p>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-bg-base font-bold py-4 rounded-2xl text-lg shadow-[0_10px_30px_rgba(0,255,136,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Sinking order...' : 'PLACE ORDER NOW'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
};
