import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-bg-surface border border-border-subtle rounded-3xl flex items-center justify-center text-5xl mb-8 shadow-2xl animate-float">
        🕵️‍♂️
      </div>
      
      <h1 className="text-4xl font-display font-bold text-white mb-2 uppercase tracking-tighter">
        Lost in the <span className="text-brand-primary">Soko?</span>
      </h1>
      
      <p className="text-text-secondary text-sm max-w-[250px] mb-10 leading-relaxed font-body">
        We couldn't find this shop. It might have moved or the link is slightly off.
      </p>

      <div className="space-y-4 w-full max-w-xs">
        <a 
          href="https://www.tiktok.com"
          className="block w-full bg-[#00f2ea] text-black font-display font-bold py-4 rounded-2xl text-sm shadow-[0_10px_20px_rgba(0,242,234,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          RETURN TO TIKTOK
        </a>
        
        <button 
          onClick={() => navigate('/')}
          className="block w-full bg-bg-surface border border-border-subtle text-text-muted font-display font-bold py-4 rounded-2xl text-sm hover:text-white transition-all"
        >
          SELLER LOGIN
        </button>
      </div>

      <p className="mt-12 text-[10px] text-text-muted uppercase tracking-[0.2em] font-display">
        LiveSoko Reliability Engine
      </p>
    </div>
  );
};
