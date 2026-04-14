import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { useAppContext } from '../context/AppContext';

export const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { notify } = useAppContext();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/sessions');
        if (res.ok) {
          setSessions(await res.json());
        } else {
          notify('Failed to load history', 'error');
        }
      } catch (e) {
        notify('Network error loading history', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [notify]);

  if (loading) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="font-display text-brand-primary animate-pulse uppercase tracking-widest">Loading History...</div>
    </div>
  );

  const totalRevenue = sessions.reduce((sum, s) => sum + (s.confirmed_revenue || 0), 0);
  const totalOrders = sessions.reduce((sum, s) => sum + (s.order_count || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="min-h-screen bg-bg-base p-5 pb-24 font-body scroll-smooth">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-primary">History</h2>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Enterprise Analytics</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-2 py-1 rounded bg-brand-primary/10 border border-brand-primary/20 text-[9px] text-brand-primary font-bold uppercase tracking-widest">Global Overview</span>
        </div>
      </div>

      {/* Analytics Hero Section */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="col-span-2 bg-gradient-to-br from-bg-surface to-bg-base p-6 rounded-2xl border border-border-subtle relative overflow-hidden group shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover:bg-brand-primary/10 transition-colors"></div>
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 font-bold">Lifetime Revenue</p>
          <h3 className="text-3xl font-display font-bold text-white mb-2">
            <span className="text-brand-primary/50 text-xl mr-1">Ksh</span>
            {totalRevenue.toLocaleString()}
          </h3>
          <div className="flex items-center gap-1.5 mt-4">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></div>
             <p className="text-[9px] text-brand-primary font-mono uppercase font-bold">Active Shop Performance</p>
          </div>
        </div>

        <div className="bg-bg-surface p-5 rounded-2xl border border-border-subtle shadow-lg">
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 font-bold">Total Orders</p>
          <h4 className="text-xl font-display font-bold text-text-primary">{totalOrders.toLocaleString()}</h4>
        </div>

        <div className="bg-bg-surface p-5 rounded-2xl border border-border-subtle shadow-lg">
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 font-bold">Avg. Order</p>
          <h4 className="text-xl font-display font-bold text-text-primary">Ksh {avgOrderValue.toLocaleString()}</h4>
        </div>
      </div>

      <h3 className="text-[11px] text-text-muted uppercase tracking-widest mb-4 font-bold px-1">Past Sessions</h3>

      <div className="flex flex-col gap-4">
        {sessions.length === 0 ? (
          <div className="text-center p-10 bg-bg-surface rounded-lg border border-border-subtle text-text-muted">
            No live sessions found yet.
          </div>
        ) : (
          sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => navigate(`/dashboard/session/${s.id}`)}
              className="bg-bg-surface p-4 rounded-xl border border-border-subtle flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-text-muted'}`}></span>
                  <h3 className="font-display font-bold text-text-primary text-base line-clamp-1">
                    {s.title || `Live — ${new Date(s.created_at.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </h3>
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">
                  {new Date(s.created_at.replace(' ', 'T') + 'Z').toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="text-brand-primary font-display font-bold text-sm">
                  Ksh {(s.confirmed_revenue || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-text-muted">
                  {s.order_count} orders
                </div>
              </div>
              
              <div className="ml-4 text-text-muted group-hover:text-brand-primary transition-colors text-xl">
                →
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
