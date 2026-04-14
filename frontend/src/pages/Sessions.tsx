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

  return (
    <div className="min-h-screen bg-bg-base p-5 pb-24 font-body">
      <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">Live History</h2>

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
