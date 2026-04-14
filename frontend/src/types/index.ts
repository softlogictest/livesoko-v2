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
  shop_id: string;
  session_id: string;
  mpesa_tx_code: string | null;
  status_reason: string | null;
  buyer_mpesa_name: string | null;
}

export interface Shop {
  id: string;
  name: string;
  tier: 'trial' | 'shop' | 'suite';
  status: 'active' | 'past_due' | 'suspended';
  role: 'owner' | 'manager' | 'seller';
}

export interface UnmatchedPayment {
  id: string;
  shop_id: string;
  mpesa_code: string;
  mpesa_amount: number;
  mpesa_sender: string | null;
  raw_sms: string;
  status: 'pending' | 'matched' | 'ignored';
  received_at: string;
}

export interface AppState {
  user: {
    id: string;
    email: string;
    role: 'owner' | 'manager' | 'seller' | 'admin';
    enterprise_name?: string;
    token?: string;
    shops: Shop[];
  } | null;
  activeShop: Shop | null;
  activeSession: {
    id: string;
    title: string;
    started_at: string;
    created_at: string;
    order_count: number;
    verified_revenue: number;
  } | null;
  orders: OrderCardProps[];
  unmatchedPayments: UnmatchedPayment[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  installPrompt: any;
}
