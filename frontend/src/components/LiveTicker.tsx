import React from 'react';
import { useAppContext } from '../context/AppContext';
import { OrderCard } from './OrderCard/OrderCard';

export const LiveTicker: React.FC = () => {
  const { state } = useAppContext();
  const { orders, activeSession } = state;

  const isManagerOrOwner = state.activeShop?.role === 'owner' || state.activeShop?.role === 'manager' || state.user?.role === 'admin';
  const isStaff = !isManagerOrOwner;

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-text-muted font-body">
        {isManagerOrOwner
          ? "Start a new session to receive orders." 
          : "No active session — wait for an admin to start one."}
      </div>
    );
  }

  const displayOrders = isStaff 
    ? orders.filter(o => o.status === 'VERIFIED' || o.status === 'FULFILLED')
    : orders;

  if (activeSession && displayOrders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-3 h-3 rounded-full bg-brand-primary animate-pulse mb-4"></div>
        <div className="text-text-secondary font-body">
          {isStaff ? "No orders ready for packing." : "Waiting for orders..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 pb-24">
      {displayOrders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};
