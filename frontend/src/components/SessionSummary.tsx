import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fetchWithAuth } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SessionSummary: React.FC<{ sessionId: string; onDone?: () => void }> = ({ sessionId, onDone }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { state } = useAppContext();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = state.user?.token || localStorage.getItem('dukalive_token');
        const res = await fetch(`${API}/api/sessions/${sessionId}/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          setData({ error: true });
        }
      } catch (e) {
        console.error(e);
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [sessionId]);

  if (loading) return <div className="p-8 text-center font-body text-text-muted">Loading summary...</div>;
  if (!data || data.error) return <div className="p-8 text-center text-status-fraud">Error loading summary.</div>;

  return (
    <div className="p-4 bg-bg-base min-h-screen text-text-primary pb-24">
      <h2 className="text-2xl font-display font-bold text-brand-primary mb-6 mt-4">Session Summary</h2>
      
      <div className="bg-bg-surface p-6 rounded-xl border border-border-subtle mb-6 text-center">
        <div className="text-text-muted text-xs uppercase font-body mb-2">Confirmed Revenue</div>
        <div className="text-4xl font-display font-bold text-text-primary">
          Ksh {data.stats.confirmed_revenue.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1">Total Orders</div>
          <div className="text-2xl font-display font-bold">{data.stats.total_orders}</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1">Paid (Ver+Ful)</div>
          <div className="text-2xl font-display font-bold text-status-verified">{data.stats.verified + data.stats.fulfilled}</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1">Flagged Fraud</div>
          <div className="text-2xl font-display font-bold text-status-fraud">{data.stats.fraud}</div>
          <div className="text-xs text-text-secondary mt-1 font-body">{data.stats.fraud_interception_rate * 100}% rate</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1">Avg Order Value</div>
          <div className="text-2xl font-display font-bold">Ksh {data.stats.average_order_value.toLocaleString()}</div>
        </div>
      </div>

      <h3 className="font-display font-bold text-lg mb-4 border-b border-border-subtle pb-2">Bestsellers</h3>
      <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle h-64 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bestsellers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="item_name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#888888', fontSize: 12, fontFamily: 'DM Mono' }} />
            <Tooltip cursor={{fill: '#1A1A1A'}} contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'DM Mono', fontSize: '12px' }} />
            <Bar dataKey="quantity_sold" fill="#00FF88" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="font-display font-bold text-lg mb-4 border-b border-border-subtle pb-2">Full Order Log</h3>
      <div className="flex flex-col gap-2">
        {data.orders.map((o: any) => (
          <div key={o.id} className="flex justify-between items-center p-3 bg-bg-surface rounded border border-border-subtle">
            <div>
              <div className="font-display font-semibold">{o.tiktok_handle || o.buyer_name}</div>
              <div className="font-body text-xs text-text-secondary">{o.quantity}x {o.item_name}</div>
            </div>
            <div className={`font-display text-xs px-2 py-1 rounded uppercase bg-status-${o.status.toLowerCase()}/20 text-status-${o.status.toLowerCase()}`}>
              {o.status}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-8 mt-4">
        <button
          onClick={onDone}
          className="w-full py-4 rounded-lg bg-brand-primary text-black font-display font-bold text-lg shadow-[0_0_15px_rgba(0,255,136,0.3)] active:scale-[0.98] transition-transform"
        >
          START NEW SESSION
        </button>
      </div>
    </div>
  );
};
