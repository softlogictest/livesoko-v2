import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, OrderCardProps } from '../types';

type Action =
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'SET_ACTIVE_SESSION'; payload: AppState['activeSession'] }
  | { type: 'SET_ORDERS'; payload: OrderCardProps[] }
  | { type: 'ADD_ORDER'; payload: OrderCardProps }
  | { type: 'UPDATE_ORDER'; payload: OrderCardProps }
  | { type: 'DELETE_ORDER'; payload: { id: string } };

const initialState: AppState = {
  user: null,
  activeSession: null,
  orders: [],
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
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
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
