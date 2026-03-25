import React, { useState } from 'react';
import { OrderCardProps } from '../../types';
import { OrderDrawer } from './OrderDrawer';

const statusColors: any = {
  VERIFIED: 'border-status-verified',
  FRAUD: 'border-status-fraud',
  REVIEW: 'border-status-review',
  PENDING: 'border-status-pending',
  COD_PENDING: 'border-blue-500',
  FULFILLED: 'border-status-verified',
};

const statusLabels: any = {
  VERIFIED: '✓ VERIFIED',
  FRAUD: '✗ FLAGGED',
  REVIEW: '⚠ REVIEW',
  PENDING: '· PENDING',
  COD_PENDING: '📦 COD',
  FULFILLED: '✓ FULFILLED',
};

const bgColors: any = {
  VERIFIED: 'text-status-verified bg-status-verified/10',
  FRAUD: 'text-status-fraud bg-status-fraud/10',
  REVIEW: 'text-status-review bg-status-review/10',
  PENDING: 'text-text-primary bg-status-pending/20',
  COD_PENDING: 'text-blue-400 bg-blue-500/10',
  FULFILLED: 'text-status-verified bg-status-verified/10',
};

export const OrderCard: React.FC<{ order: OrderCardProps }> = ({ order }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setDrawerOpen(true)}
        className={`bg-bg-surface border-l-4 ${statusColors[order.status]} p-4 mb-3 rounded-r-md cursor-pointer relative overflow-hidden`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <h3 className="font-display font-semibold text-text-primary text-xl leading-tight">
              {order.buyer_name}
            </h3>
            {order.buyer_tiktok && order.buyer_tiktok !== '@unknown' && order.buyer_tiktok !== '@manual' && (
              <span className="text-[10px] text-text-muted font-mono tracking-tighter mt-0.5">{order.buyer_tiktok}</span>
            )}
            {order.buyer_tiktok === '@manual' && (
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-tighter mt-0.5">@manual entry</span>
            )}
          </div>
          <span className={`font-display text-xs px-2 py-0.5 rounded uppercase ${bgColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
        
        <p className="font-body text-text-secondary text-sm mb-2">
          {order.quantity}x {order.item_name}
        </p>
        
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <div className="text-[10px] text-text-muted uppercase font-body mb-0.5">{order.delivery_location}</div>
            <div className="font-display font-bold text-text-primary text-xl">
              Ksh {order.expected_amount ? order.expected_amount.toLocaleString() : '...'}
            </div>
          </div>
          <div className="flex gap-3">
            <a href={`tel:${order.buyer_phone}`} onClick={e => e.stopPropagation()} className="p-2 rounded-full bg-bg-elevated text-status-verified">
              📞
            </a>
            <a href={`https://wa.me/${order.buyer_phone && order.buyer_phone.replace('+', '')}?text=Hi, I placed an order on DukaLive. Please confirm delivery details.`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-2 rounded-full bg-bg-elevated text-[#25D366]">
              💬
            </a>
          </div>
        </div>
      </div>

      {drawerOpen && <OrderDrawer order={order} onClose={() => setDrawerOpen(false)} />}
    </>
  );
};
