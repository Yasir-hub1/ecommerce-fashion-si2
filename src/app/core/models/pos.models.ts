import type { OrderDetail, ReservationDetail } from './api.models';

export interface PosStockInfo {
  on_hand: number;
  reserved: number;
  available: number;
}

export interface PosSearchResult {
  variant_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  unit_price: string;
  stock: PosStockInfo;
}

export interface PosSearchResponse {
  count: number;
  results: PosSearchResult[];
}

export interface PosQuoteItem {
  variant_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_subtotal: string;
  available: boolean;
  stock: PosStockInfo;
}

export interface PosQuote {
  items: PosQuoteItem[];
  subtotal: string;
  tax_total: string;
  grand_total: string;
  currency: string;
}

export interface PosPaymentInput {
  method: 'CASH' | 'CARD_POS' | 'QR' | 'TRANSFER';
  amount: string;
  received_amount?: string;
}

export interface PosPaymentLine {
  method: string;
  amount: string;
  received_amount?: string;
  change_amount: string;
}

export interface PosPaymentSummary {
  total_due: string;
  total_payment: string;
  total_change: string;
  overpayment: string;
  payments: PosPaymentLine[];
}

export interface PosPaymentPreview {
  quote: PosQuote;
  payment_summary: PosPaymentSummary;
}

export interface PosReceiptMeta {
  id: number;
  receipt_number: string;
  pdf_url: string;
  order_code: string;
}

export interface PosCheckoutResponse {
  message: string;
  order: OrderDetail;
  receipt: PosReceiptMeta;
  total_change: string;
}

export interface PosDailySummary {
  date: string;
  branch_id: number;
  branch_code: string;
  cashier_id: number;
  cashier_name: string;
  order_count: number;
  total_sales: string;
  currency: string;
  by_payment_method: Record<string, { total: string; count: number }>;
}

export interface PosSaleListItem {
  id: number;
  code: string;
  status: string;
  status_display: string;
  grand_total: string;
  currency: string;
  paid_at: string | null;
  created_at: string;
  customer_name?: string;
}
