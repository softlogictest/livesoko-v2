import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAppContext } from '../context/AppContext';

interface NodeType {
  id: string;
  label: string;
  role?: string;
  type: 'shop' | 'staff' | 'device' | 'public';
  stats?: string;
  active?: boolean;
}

export const Network: React.FC = () => {
  const { state } = useAppContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [renamingDevice, setRenamingDevice] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/network');
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    
    // Listen for real-time pulses
    const handleSse = (e: any) => {
      if (e.detail.type === 'device:active' || e.detail.type === 'order:new') {
        fetchData();
      }
    };
    window.addEventListener('sse-event', handleSse as any);
    return () => window.removeEventListener('sse-event', handleSse as any);
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse text-brand-primary font-bold">SCANNING NETWORK...</div>;

  const handleRename = async (id: string) => {
    if (!newName.trim()) return;
    try {
      await fetchWithAuth(`/api/settings/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      setRenamingDevice(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const themeClass = `theme-${data?.shop?.color_scheme || 'acid-green'}`;

  return (
    <div className={`p-4 min-h-screen bg-bg-base text-text-primary ${themeClass} pb-24`}>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase text-brand-primary leading-none">Enterprise Map</h1>
          <p className="text-[10px] text-text-muted font-bold tracking-[0.2em] mt-1 ml-0.5 uppercase">Live Connectivity Node</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-status-verified font-bold">● SYSTEM ONLINE</div>
          <div className="text-[10px] text-text-muted font-mono uppercase">{new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      {/* THE SHOP WEB (Visualizing Hierarchy) */}
      <div className="flex flex-col gap-12 relative items-center">
        
        {/* CENTER NODE: THE SHOP */}
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full bg-bg-surface border-4 border-brand-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-pulse-slow">
            <span className="text-2xl">🏬</span>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-black uppercase text-brand-primary tracking-widest">{data?.shop?.name}</div>
          </div>
          {/* Decorative radiating lines (SVG) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none opacity-20 border border-brand-primary rounded-full animate-ping"></div>
        </div>

        {/* STAFF WING */}
        <div className="w-full">
          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-text-muted rounded-full"></span> HUMAN CAPITAL
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {data?.staff.map((s: any) => (
              <div key={s.id} className="bg-bg-surface p-3 rounded border border-border-subtle flex flex-col gap-1 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-1 h-full ${s.role === 'owner' ? 'bg-status-verified' : s.role === 'manager' ? 'bg-status-review' : 'bg-status-pending'}`}></div>
                <div className="text-[10px] font-black uppercase text-text-muted">{s.role}</div>
                <div className="text-xs font-bold truncate">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DEVICE WING */}
        <div className="w-full">
          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span> SYNC GATEWAYS (HANDSETS)
          </h3>
          <div className="flex flex-col gap-3">
            {data?.devices.length === 0 && (
              <div className="bg-bg-surface/50 p-6 rounded border border-dashed border-border-subtle text-center">
                <p className="text-[10px] text-text-muted uppercase italic">No devices synced yet. Install the SMS forwarder on your M-Pesa phone.</p>
              </div>
            )}
            {data?.devices.map((d: any) => (
              <div key={d.id} className="bg-bg-surface p-4 rounded-lg border border-brand-primary/20 flex items-center gap-4 relative">
                <div className="text-2xl animate-bounce-slow">📱</div>
                <div className="flex-1">
                  {renamingDevice === d.id ? (
                    <div className="flex gap-2">
                      <input 
                        className="bg-bg-input text-xs p-1 rounded border border-brand-primary outline-none" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleRename(d.id)} className="bg-brand-primary text-black text-[10px] font-bold px-2 rounded">OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setRenamingDevice(d.id); setNewName(d.name || d.sender_number); }} className="cursor-pointer group">
                      <div className="text-sm font-black text-brand-primary flex items-center gap-2">
                        {d.name || d.sender_number}
                        <span className="text-[10px] opacity-0 group-hover:opacity-100 italic font-normal text-text-muted tracking-normal">Edit</span>
                      </div>
                      <div className="text-[9px] text-text-muted uppercase font-mono">{d.sender_number} • {new Date(d.last_seen_at).toLocaleTimeString()}</div>
                    </div>
                  )}
                </div>
                <div className="w-3 h-3 bg-status-verified rounded-full shadow-[0_0_10px_#00FF88] animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* INTEGRATION WING */}
        <div className="w-full bg-bg-surface p-4 rounded border border-border-subtle opacity-80 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase">Public Link</div>
              <div className="text-xs font-mono text-brand-primary truncate max-w-[200px]">livesoko.io/@{data?.shop?.slug}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-status-verified">ACTIVE</div>
              <div className="text-[18px] font-black text-white">{data?.stats?.activeOrders || 0} ORDERS</div>
            </div>
          </div>
        </div>

      </div>

      <p className="text-[9px] text-center mt-8 text-text-muted font-mono uppercase tracking-[0.3em]">Built for Scale • Encrypted Link Established</p>
    </div>
  );
};
