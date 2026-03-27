export interface OrderCardProps {
  id: string;
  buyer_name: string;
  buyer_tiktok: string;
  item_name: string;
  quantity: number;
  expected_amount: number;
  buyer_phone: string;
  delivery_location: string;
  status: 'PENDING' | 'COD_PENDING' | 'VERIFIED' | 'FRAUD' | 'REVIEW' | 'FULFILLED';
  payment_type: 'MPESA' | 'COD';
  mpesa_trace: string | null;
  created_at: string;
  seller_id: string;
  session_id: string;
  mpesa_tx_code: string | null;
  status_reason: string | null;
  buyer_mpesa_name: string | null;
}

export interface AppState {
  user: {
    id: string;
    email: string;
    role: 'seller' | 'handyman';
    shop_name: string;
    seller_id?: string;
    token?: string;
  } | null;
  activeSession: {
    id: string;
    title: string;
    started_at: string;
    created_at: string;
    order_count: number;
    verified_revenue: number;
  } | null;
  orders: OrderCardProps[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}
