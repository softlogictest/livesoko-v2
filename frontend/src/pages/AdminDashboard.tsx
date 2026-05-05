import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAppContext } from '../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { state } = useAppContext();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="min-h-screen bg-bg-base flex items-center justify-center font-display text-brand-primary animate-pulse uppercase tracking-widest">Accessing Mainframe...</div>;

  return (
    <div className="min-h-screen bg-bg-base p-6">
      <header className="mb-8">
        <h1 className="text-xs font-display font-bold text-brand-primary uppercase tracking-[0.3em] mb-1">Control Room</h1>
        <h2 className="text-3xl font-display font-bold text-white">System Vital Signs</h2>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total Shops" value={stats?.shops || 0} icon="🏪" />
        <StatCard label="Active Lives" value={stats?.activeSessions || 0} icon="🔴" color="text-status-fraud" />
        <StatCard label="Total Orders" value={stats?.totalOrders || 0} icon="📦" />
        <StatCard label="Sync Devices" value={stats?.devices || 0} icon="📲" />
      </div>

      <section>
        <h3 className="text-[10px] font-display font-bold text-text-muted uppercase tracking-widest mb-4">Latest Global Activity</h3>
        <div className="space-y-3">
          {stats?.recentOrders?.map((order: any) => (
            <div key={order.id} className="bg-bg-surface border border-border-subtle p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-white text-sm font-bold">{order.item_name}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-tighter">{new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString()}</p>
              </div>
              <div className="text-right">
                <p className="text-brand-primary font-display font-bold">Ksh {order.unit_price}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${order.status === 'VERIFIED' ? 'bg-brand-primary/20 text-brand-primary' : 'bg-bg-elevated text-text-muted'}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <div className="mt-12 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
        <p className="text-brand-primary text-[10px] font-display font-bold uppercase mb-1">Developer Note</p>
        <p className="text-text-secondary text-xs font-body leading-relaxed">
          System is currently in Multi-Tenant mode. Data isolation is enforced via ShopID scoping at the middleware layer.
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = 'text-brand-primary' }: any) => (
  <div className="bg-bg-surface border border-border-subtle p-4 rounded-2xl shadow-lg">
    <div className="text-2xl mb-2">{icon}</div>
    <p className="text-text-muted text-[9px] font-display font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
  </div>
);
