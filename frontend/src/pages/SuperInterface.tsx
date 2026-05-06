import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAppContext } from '../context/AppContext';

export const SuperInterface: React.FC = () => {
  const { state } = useAppContext();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [system, setSystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mainframeKey = urlParams.get('key');

    const fetchData = async () => {
      const headers: Record<string, string> = mainframeKey ? { 'x-mainframe-key': mainframeKey } : {};
      try {
        const [statsRes, logsRes, sysRes] = await Promise.all([
          fetchWithAuth('/api/admin/stats', { headers }),
          fetchWithAuth('/api/admin/logs', { headers }),
          fetchWithAuth('/api/admin/system', { headers })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (logsRes.ok) setLogs(await logsRes.json());
        if (sysRes.ok) setSystem(await sysRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-brand-primary">
      <div className="text-4xl animate-pulse mb-4">INITIALIZING MAINFRAME...</div>
      <div className="w-64 h-1 bg-zinc-900 overflow-hidden relative">
        <div className="absolute inset-0 bg-brand-primary animate-progress"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 pb-20 selection:bg-brand-primary selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-brand-primary tracking-tighter uppercase italic">LS-MAINFRAME // V2.4.0</h1>
          <p className="text-[10px] text-zinc-500 uppercase">Secure Dev Node: {state.user?.email}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase">System Uptime</p>
          <p className="text-sm font-bold text-brand-primary">{Math.floor((system?.uptime || 0) / 3600)}h {Math.floor(((system?.uptime || 0) % 3600) / 60)}m</p>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Users" value={stats?.totalUsers || 0} color="text-brand-primary" />
        <MetricCard label="Active Shops" value={stats?.shops || 0} color="text-blue-400" />
        <MetricCard label="Live Lives" value={stats?.activeSessions || 0} color="text-status-fraud" pulse />
        <MetricCard label="Total Orders" value={stats?.totalOrders || 0} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal Logs */}
        <div className="lg:col-span-2 flex flex-col h-[500px]">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-t-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">System Activity Stream</span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
            </div>
          </div>
          <div className="flex-1 bg-black border-x border-b border-zinc-800 p-4 overflow-y-auto text-[11px] leading-relaxed scrollbar-hide">
            {logs.length === 0 && <p className="text-zinc-700 italic">Listening for events...</p>}
            {logs.map((log, i) => (
              <div key={i} className="mb-1 flex gap-3 group">
                <span className="text-zinc-600 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                <span className={`shrink-0 uppercase font-bold ${log.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                  {log.type}
                </span>
                <span className={`break-all ${log.type === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* System Details & Actions */}
        <div className="space-y-6">
          <section className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Hardware Vitals</h3>
            <div className="space-y-3">
              <SysMetric label="Platform" value={system?.platform} />
              <SysMetric label="Memory Usage" value={`${Math.round(((system?.totalMemory - system?.freeMemory) / 1024 / 1024 / 1024) * 100) / 100} GB / ${Math.round((system?.totalMemory / 1024 / 1024 / 1024) * 100) / 100} GB`} />
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Load Average</p>
                <div className="flex gap-4 font-bold text-brand-primary">
                  <span>{system?.loadAvg?.[0]?.toFixed(2)}</span>
                  <span>{system?.loadAvg?.[1]?.toFixed(2)}</span>
                  <span>{system?.loadAvg?.[2]?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Master Controls</h3>
            <div className="space-y-2">
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded font-bold text-xs transition-colors uppercase">
                Flush Log Buffer
              </button>
              <button className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 py-2 rounded font-bold text-xs transition-colors uppercase">
                System Maintenance
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-12 text-center text-zinc-700 text-[10px] uppercase tracking-[0.5em]">
        End of Transmission
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color, pulse }: any) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
    <div className={`text-2xl font-black ${color} tracking-tighter flex items-center gap-2`}>
      {value}
      {pulse && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>}
    </div>
    <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">{label}</div>
    <div className="absolute -right-2 -bottom-2 text-4xl opacity-[0.03] font-black italic">{label[0]}</div>
  </div>
);

const SysMetric = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-zinc-500">{label}</span>
    <span className="text-zinc-300 font-bold">{value || '---'}</span>
  </div>
);
