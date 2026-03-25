import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, confirmText, cancelText, onConfirm, onCancel, destructive = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-bg-elevated w-full max-w-sm rounded-xl p-6 shadow-2xl">
        <h3 className="text-xl font-display font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary font-body text-sm mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded text-text-primary bg-bg-surface font-display font-semibold"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-3 rounded font-display font-bold ${destructive ? 'bg-status-fraud text-white' : 'bg-brand-primary text-black'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
