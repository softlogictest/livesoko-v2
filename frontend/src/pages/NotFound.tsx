import React from 'react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-bg-surface border border-border-subtle rounded-3xl flex items-center justify-center text-5xl mb-8 shadow-2xl">
        😕
      </div>
      
      <h1 className="text-3xl font-display font-bold text-white mb-2">
        Page Not Found
      </h1>
      
      <p className="text-text-secondary text-sm max-w-[280px] mb-10 leading-relaxed font-body">
        This page doesn't exist. If you're trying to place an order, please check the link the seller shared with you.
      </p>

      <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={() => window.history.back()}
          className="block w-full bg-bg-surface border border-border-subtle text-text-primary font-display font-bold py-4 rounded-2xl text-sm hover:text-white transition-all"
        >
          GO BACK
        </button>
      </div>

      <p className="mt-12 text-[10px] text-text-muted uppercase tracking-[0.2em] font-display">
        LiveSoko
      </p>
    </div>
  );
};
