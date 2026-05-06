import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const MaintenanceModal: React.FC = () => {
  const { state } = useAppContext();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show for owners
    if (state.activeShop?.role !== 'owner') return;

    // Check if they've already seen this specific update modal
    const hasSeen = localStorage.getItem('livesoko_update_v2_4_0_seen');
    if (!hasSeen) {
      setShow(true);
    }
  }, [state.activeShop]);

  const handleClose = () => {
    localStorage.setItem('livesoko_update_v2_4_0_seen', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-brand-primary/30 shadow-[0_0_50px_rgba(0,255,136,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-brand-primary p-4 text-black flex items-center justify-between">
          <h3 className="font-display font-black uppercase tracking-tighter text-lg">⚠️ Action Required</h3>
          <span className="text-2xl">🔧</span>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-primary leading-relaxed">
            We've updated the <strong>M-Pesa Companion App</strong> to be much more reliable. 
          </p>
          
          <div className="bg-bg-base p-4 rounded-xl border border-border-subtle space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-brand-primary tracking-widest">How to update (1 minute):</h4>
            <ol className="text-xs text-text-secondary space-y-3 list-decimal ml-4">
              <li>Open <strong>Settings</strong> → <strong>Config</strong> in this app.</li>
              <li>Tap <strong>COPY</strong> on the <strong>Shop Connection Code</strong>.</li>
              <li>Open your <strong>Companion App</strong> (on the M-Pesa phone).</li>
              <li>Paste the new code and tap <strong>Connect</strong>.</li>
            </ol>
          </div>

          <p className="text-[11px] text-text-muted italic">
            Payments will now verify automatically again! Thank you for your patience.
          </p>

          <button 
            onClick={handleClose}
            className="w-full bg-brand-primary text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-dim transition-all active:scale-95"
          >
            Got it, I'll update now
          </button>
        </div>
      </div>
    </div>
  );
};
