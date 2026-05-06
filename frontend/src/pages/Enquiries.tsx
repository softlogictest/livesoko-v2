import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fetchWithAuth } from '../lib/api';

export const Enquiries: React.FC = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [offlineOrders, setOfflineOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INQUIRIES' | 'ORDERS'>('INQUIRIES');
  const { state } = useAppContext();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enqRes, ordRes] = await Promise.all([
        fetchWithAuth('/api/enquiries'),
        fetchWithAuth('/api/orders?status=OFFLINE_REVIEW')
      ]);
      
      if (enqRes.ok) setEnquiries(await enqRes.json());
      if (ordRes.ok) setOfflineOrders(await ordRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setEnquiries(enquiries.map(e => e.id === id ? { ...e, status: newStatus } : e));
      }
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleAcceptOrder = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/orders/${id}/accept_offline`, { method: 'POST' });
      if (res.ok) {
        setOfflineOrders(offlineOrders.filter(o => o.id !== id));
      } else {
        alert('Failed to accept order');
      }
    } catch (e) {
      alert('Failed to accept order');
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading inbox...</div>;

  return (
    <div className="p-4 bg-bg-base min-h-screen text-text-primary pb-24">
      <h2 className="text-2xl font-display font-bold text-brand-primary mb-6 mt-2">Inbox</h2>
      
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('INQUIRIES')}
          className={`flex-1 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-widest border transition-colors ${
            activeTab === 'INQUIRIES'
              ? 'bg-brand-primary text-black border-brand-primary shadow-[0_0_15px_rgba(0,255,136,0.2)]'
              : 'bg-bg-surface text-text-muted border-border-subtle hover:text-text-secondary'
          }`}
        >
          Inquiries ({enquiries.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex-1 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-widest border transition-colors ${
            activeTab === 'ORDERS'
              ? 'bg-brand-primary text-black border-brand-primary shadow-[0_0_15px_rgba(0,255,136,0.2)]'
              : 'bg-bg-surface text-text-muted border-border-subtle hover:text-text-secondary'
          }`}
        >
          Orders ({offlineOrders.length})
        </button>
      </div>

      {activeTab === 'INQUIRIES' ? (
        enquiries.length === 0 ? (
          <div className="text-center p-8 bg-bg-surface border border-dashed border-border-subtle rounded-xl text-text-muted">
            No inquiries yet!
          </div>
        ) : (
        <div className="flex flex-col gap-4">
          {enquiries.map((enq) => (
            <div key={enq.id} className="bg-bg-surface p-4 rounded-xl border border-border-subtle flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{enq.buyer_name}</div>
                  <div className="text-sm text-text-secondary">{enq.buyer_contact}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                  enq.status === 'PENDING' ? 'bg-status-pending/20 text-status-pending' :
                  enq.status === 'REPLIED' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-status-verified/20 text-status-verified'
                }`}>
                  {enq.status}
                </span>
              </div>
              
              <div className="bg-bg-base p-3 rounded-lg border border-border-subtle text-sm italic">
                {enq.message}
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-text-muted">
                  {new Date(enq.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                </div>
                
                <div className="flex gap-2">
                  <a 
                    href={`tel:${enq.buyer_contact}`} 
                    className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-secondary hover:text-white"
                  >
                    📞
                  </a>
                  <a 
                    href={`https://wa.me/${enq.buyer_contact.replace('+', '')}?text=Hi ${enq.buyer_name}, regarding your inquiry on LiveSoko...`}
                    target="_blank" 
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-bg-elevated border border-[#25D366]/30 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/10"
                    onClick={() => enq.status === 'PENDING' && handleUpdateStatus(enq.id, 'REPLIED')}
                  >
                    💬
                  </a>
                  {enq.status !== 'CONVERTED' && (
                    <button 
                      onClick={() => handleUpdateStatus(enq.id, 'CONVERTED')}
                      className="ml-2 px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded hover:bg-brand-primary hover:text-black transition-colors"
                    >
                      MARK SOLD
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        offlineOrders.length === 0 ? (
          <div className="text-center p-8 bg-bg-surface border border-dashed border-border-subtle rounded-xl text-text-muted">
            No offline orders right now.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {offlineOrders.map((ord) => (
              <div key={ord.id} className="bg-bg-surface p-4 rounded-xl border border-border-subtle flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{ord.buyer_name}</div>
                    <div className="text-sm text-text-secondary">{ord.buyer_phone}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                    ord.payment_type === 'COD' ? 'bg-blue-500/20 text-blue-400' : 'bg-status-verified/20 text-status-verified'
                  }`}>
                    {ord.payment_type}
                  </span>
                </div>
                
                <div className="bg-bg-base p-3 rounded-lg border border-border-subtle text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted">Item:</span>
                    <span className="font-bold">{ord.quantity}x {ord.item_name}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted">Price:</span>
                    <span className="font-bold text-brand-primary">Ksh {ord.expected_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Location:</span>
                    <span>{ord.delivery_location}</span>
                  </div>
                  {ord.product_specifics && (
                    <div className="mt-2 text-xs italic text-text-secondary border-t border-border-subtle pt-2">
                      Note: {ord.product_specifics}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-text-muted">
                    {new Date(ord.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <a 
                      href={`tel:${ord.buyer_phone}`} 
                      className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-secondary hover:text-white"
                    >
                      📞
                    </a>
                    <a 
                      href={`https://wa.me/${ord.buyer_phone.replace('+', '')}?text=Hi ${ord.buyer_name}, regarding your order for ${ord.item_name} on LiveSoko...`}
                      target="_blank" 
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-bg-elevated border border-[#25D366]/30 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/10"
                    >
                      💬
                    </a>
                    <button 
                      onClick={() => handleAcceptOrder(ord.id)}
                      className="ml-2 px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded hover:bg-brand-primary hover:text-black transition-colors"
                    >
                      VERIFY MANUALLY
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
