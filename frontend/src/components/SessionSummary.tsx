import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fetchWithAuth } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ReceiptCard = ({ order }: { order: any }) => (
  <div className="bg-[#e6e6e6] text-[#111] p-4 flex flex-col relative mb-4 font-mono select-text">
    {/* Receipt Jagged Edge Top */}
    <div className="absolute top-0 left-0 w-full h-[6px]" style={{
      backgroundImage: 'linear-gradient(-45deg, transparent 4px, #e6e6e6 4px), linear-gradient(45deg, transparent 4px, #e6e6e6 4px)',
      backgroundSize: '8px 8px',
      backgroundRepeat: 'repeat-x',
      transform: 'translateY(-100%)'
    }}></div>
    
    <div className="flex justify-between border-b-2 border-dashed border-[#ccc] pb-2 mb-3 items-end">
      <div>
        <div className="text-[10px] text-[#555] tracking-tight">RECEIPT NO.</div>
        <div className="text-xs font-bold tracking-tighter">#{order.id.slice(0, 8)}</div>
      </div>
      <div className={`text-[11px] font-bold px-1.5 py-0.5 border-2 ${
        order.status === 'VERIFIED' || order.status === 'FULFILLED' ? 'border-[#000] text-[#000]' : 
        order.status === 'FRAUD' ? 'border-red-600 text-red-600' : 'border-[#666] text-[#666]'
      }`}>
        {order.status}
      </div>
    </div>

    <div className="mb-3">
      <div className="text-sm font-bold uppercase">{order.buyer_name}</div>
      <div className="flex justify-between text-[11px] text-[#444] mt-1">
        <div>{order.buyer_tiktok}</div>
        <div>{order.buyer_phone}</div>
      </div>
    </div>

    <div className="flex justify-between items-center text-sm font-bold mb-3">
      <div>{order.quantity}x {order.item_name}</div>
      <div>KES {order.expected_amount ? order.expected_amount.toLocaleString() : '...'}</div>
    </div>

    <div className="border-t-2 border-dashed border-[#ccc] pt-2 text-[10px] text-[#555] flex justify-between">
      <div className="truncate max-w-[60%] shrink-0">DELIV: {order.delivery_location}</div>
      <div className="shrink-0">{new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    </div>

     {/* Receipt Jagged Edge Bottom */}
     <div className="absolute bottom-0 left-0 w-full h-[6px]" style={{
      backgroundImage: 'linear-gradient(-45deg, #e6e6e6 4px, transparent 4px), linear-gradient(45deg, #e6e6e6 4px, transparent 4px)',
      backgroundSize: '8px 8px',
      backgroundRepeat: 'repeat-x',
      transform: 'translateY(100%)'
    }}></div>
  </div>
);

export const SessionSummary: React.FC<{ sessionId: string; onDone?: () => void }> = ({ sessionId, onDone }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { state } = useAppContext();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetchWithAuth(`/api/sessions/${sessionId}/summary`);
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

  const handleExportCsv = () => {
    if (!data?.orders || data.orders.length === 0) return;
    const headers = ['Order ID', 'Status', 'Buyer Name', 'Tiktok Handle', 'Phone', 'Location', 'Item', 'Quantity', 'Amount_Ksh', 'Created At'];
    const rows = data.orders.map((o: any) => [
      `"${o.id}"`,
      `"${o.status}"`,
      `"${(o.buyer_name || '').replace(/"/g, '""')}"`,
      `"${(o.tiktok_handle || o.buyer_tiktok || '').replace(/"/g, '""')}"`,
      `"${(o.buyer_phone || '').replace(/"/g, '""')}"`,
      `"${(o.delivery_location || '').replace(/"/g, '""')}"`,
      `"${(o.item_name || '').replace(/"/g, '""')}"`,
      o.quantity,
      o.expected_amount || o.unit_price,
      `"${o.created_at}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `livesoko_session_${sessionId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center font-body text-text-muted">Loading summary...</div>;
  if (!data || data.error) return <div className="p-8 text-center text-status-fraud">Error loading summary.</div>;

  const pendingOrders = data.orders.filter((o: any) => ['PENDING', 'REVIEW'].includes(o.status));
  const settledOrders = data.orders.filter((o: any) => ['VERIFIED', 'FULFILLED', 'COD_PENDING', 'FRAUD'].includes(o.status));
  const isManagerOrOwner = state.activeShop?.role === 'owner' || state.activeShop?.role === 'manager';

  return (
    <div className="p-5 bg-bg-base min-h-screen text-text-primary pb-24">
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-2xl font-display font-bold text-brand-primary">Session Ledger</h2>
        {isManagerOrOwner && (
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 font-display text-xs font-bold text-[#111] bg-[#00FF88] px-3 py-2 rounded-lg hover:bg-[#00e67a] active:scale-95 transition-transform"
          >
            <span>📥</span> EXPORT CSV
          </button>
        )}
      </div>
      
      <div className="bg-bg-surface p-6 rounded-xl border border-border-subtle mb-6 text-center">
        <div className="text-text-muted text-xs uppercase font-body mb-2 tracking-widest">Confirmed Revenue</div>
        <div className="text-4xl font-display font-bold text-text-primary">
          Ksh {data.stats.confirmed_revenue.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1 tracking-wider">Total Orders</div>
          <div className="text-2xl font-display font-bold">{data.stats.total_orders}</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1 tracking-wider">Paid (Ver+Ful)</div>
          <div className="text-2xl font-display font-bold text-status-verified">{data.stats.verified + data.stats.fulfilled}</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1 tracking-wider">Flagged Fraud</div>
          <div className="text-2xl font-display font-bold text-status-fraud">{data.stats.fraud}</div>
          <div className="text-[10px] text-text-secondary mt-1 font-body">{data.stats.fraud_interception_rate * 100}% rate</div>
        </div>
        <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle">
          <div className="text-text-muted text-[10px] uppercase font-body mb-1 tracking-wider">Avg Value</div>
          <div className="text-2xl font-display font-bold">Ksh {data.stats.average_order_value.toLocaleString()}</div>
        </div>
      </div>

      <h3 className="font-display font-bold text-lg mb-4 text-text-primary border-b border-border-subtle pb-2">Top Inventories</h3>
      <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle h-64 mb-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bestsellers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="item_name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#888888', fontSize: 12, fontFamily: 'DM Mono' }} />
            <Tooltip cursor={{fill: '#1A1A1A'}} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontFamily: 'DM Mono', fontSize: '12px' }} />
            <Bar dataKey="quantity_sold" fill="#00FF88" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="font-display font-bold text-lg text-text-primary mb-6 flex items-center justify-between">
        <span>Requires Fulfillment</span>
        <span className="text-xs bg-bg-surface px-3 py-1 rounded-full border border-border-subtle text-text-muted">{pendingOrders.length}</span>
      </h3>
      <div className="flex flex-col gap-5 mb-10 mt-4 px-1">
        {pendingOrders.length === 0 ? (
          <div className="text-center p-6 text-text-muted border border-dashed border-border-subtle rounded-lg text-sm bg-bg-surface">
            All orders fulfilled! 🎉
          </div>
        ) : (
          pendingOrders.map((o: any) => <ReceiptCard key={o.id} order={o} />)
        )}
      </div>

      <h3 className="font-display font-bold text-lg text-text-primary mb-6 flex items-center justify-between mt-8">
        <span>Settled Receipts</span>
        <span className="text-xs bg-bg-surface px-3 py-1 rounded-full border border-border-subtle text-text-muted">{settledOrders.length}</span>
      </h3>
      <div className="flex flex-col gap-5 mb-10 mt-4 px-1 opacity-75">
        {settledOrders.length === 0 ? (
          <div className="text-center p-6 text-text-muted border border-dashed border-border-subtle rounded-lg text-sm bg-bg-surface">
            No settled receipts yet.
          </div>
        ) : (
          settledOrders.map((o: any) => <ReceiptCard key={o.id} order={o} />)
        )}
      </div>

      {onDone && (
        <div className="px-1 mt-8">
          <button
            onClick={onDone}
            className="w-full py-4 rounded-xl bg-brand-primary text-black font-display font-bold text-lg shadow-[0_0_15px_rgba(0,255,136,0.3)] active:scale-[0.98] transition-transform"
          >
            START NEW SESSION
          </button>
        </div>
      )}
    </div>
  );
};
