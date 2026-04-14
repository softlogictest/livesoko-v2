import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, OrderCardProps, Shop } from '../types';

type Action =
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'SET_ACTIVE_SHOP'; payload: Shop }
  | { type: 'SET_ACTIVE_SESSION'; payload: AppState['activeSession'] }
  | { type: 'SET_ORDERS'; payload: OrderCardProps[] }
  | { type: 'ADD_ORDER'; payload: OrderCardProps }
  | { type: 'UPDATE_ORDER'; payload: OrderCardProps }
  | { type: 'DELETE_ORDER'; payload: { id: string } }
  | { type: 'SET_TOAST'; payload: { message: string; type: 'success' | 'error' | 'info' } | null }
  | { type: 'SET_UNMATCHED_PAYMENTS'; payload: any[] }
  | { type: 'ADD_UNMATCHED_PAYMENT'; payload: any }
  | { type: 'REMOVE_UNMATCHED_PAYMENT'; payload: string }
  | { type: 'SET_INSTALL_PROMPT'; payload: any };

const initialState: AppState = {
  user: null,
  activeShop: null,
  activeSession: null,
  orders: [],
  unmatchedPayments: [],
  toast: null,
  installPrompt: null,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER': {
      // Auto-select first shop if available
      const firstShop = action.payload?.shops?.[0] || null;
      if (firstShop) localStorage.setItem('livesoko_shop_id', firstShop.id);
      return { 
        ...state, 
        user: action.payload,
        activeShop: firstShop,
        activeSession: null,
        orders: []
      };
    }
    case 'SET_ACTIVE_SHOP': {
      if (action.payload) localStorage.setItem('livesoko_shop_id', action.payload.id);
      return {
        ...state,
        activeShop: action.payload,
        activeSession: null,
        orders: []
      };
    }
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSession: action.payload };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'ADD_ORDER':
      // Prepend to feed
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o)
      };
    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(o => o.id !== action.payload.id)
      };
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    case 'SET_UNMATCHED_PAYMENTS':
      return { ...state, unmatchedPayments: action.payload };
    case 'ADD_UNMATCHED_PAYMENT':
      return { ...state, unmatchedPayments: [action.payload, ...state.unmatchedPayments] };
    case 'REMOVE_UNMATCHED_PAYMENT':
      return { ...state, unmatchedPayments: state.unmatchedPayments.filter(p => p.id !== action.payload) };
    case 'SET_INSTALL_PROMPT':
      return { ...state, installPrompt: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    dispatch({ type: 'SET_TOAST', payload: { message, type } });
    setTimeout(() => {
      dispatch({ type: 'SET_TOAST', payload: null });
    }, 3000);
  };

  React.useEffect(() => {
    const handleAuthError = () => {
      dispatch({ type: 'SET_USER', payload: null });
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, notify }}>
      {children}
      {state.toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce-in border flex items-center gap-2 ${
          state.toast.type === 'error' ? 'bg-status-fraud/10 text-status-fraud border-status-fraud/30' : 
          state.toast.type === 'success' ? 'bg-status-verified/10 text-status-verified border-status-verified/30' : 
          'bg-bg-surface text-text-primary border-border-subtle'
        }`}>
          <span>{state.toast.type === 'error' ? '🚫' : state.toast.type === 'success' ? '✅' : 'ℹ️'}</span>
          {state.toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
