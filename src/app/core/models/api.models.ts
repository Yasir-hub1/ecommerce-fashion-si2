export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id?: number;
  permissions?: string[];
}

export type UserRole = string;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorBody {
  error?: { code: string; message: string; details?: Record<string, unknown> };
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  detail?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  city: number;
  city_name: string;
  department?: string;
  address: string;
  phone?: string;
  email?: string;
  opens_at?: string;
  closes_at?: string;
  fitting_rooms?: number;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  is_active: boolean;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: number;
  size_name: string;
  color: number;
  color_name: string;
  color_hex: string;
  price_override: string | null;
  effective_price: string;
  is_active: boolean;
}

export interface ProductListItem {
  id: number;
  public_id: string;
  name: string;
  category_name: string;
  brand_name: string;
  collection_name: string;
  base_price: string;
  primary_image: string | null;
  is_active: boolean;
  total_available?: number;
}

export interface ProductImage {
  id: number;
  product?: number;
  image: string;
  image_url?: string | null;
  alt_text: string;
  color: number | null;
  color_name?: string | null;
  is_primary: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/** Resuelve URL absoluta de una imagen de producto */
export function productImageUrl(img: ProductImage): string {
  return img.image_url ?? img.image;
}

export interface ProductDetail {
  id: number;
  public_id: string;
  name: string;
  description: string;
  base_price: string;
  gender: string;
  material: string;
  care_instructions: string;
  category: Category;
  brand: Brand;
  collection: { id: number; name: string; season: { id: number; name: string } };
  images: ProductImage[];
  variants: ProductVariant[];
  is_active: boolean;
}

export interface VariantAvailability {
  variant_id: number;
  sku: string;
  size: string;
  color: string;
  price: string;
  branches: {
    branch_id: number;
    branch_code: string;
    branch_name: string;
    on_hand: number;
    reserved: number;
    available: number;
  }[];
  total_available: number;
}

export interface ProductAvailability {
  product_id: number;
  product_name: string;
  variants: VariantAvailability[];
}

export interface CartItem {
  id: number;
  variant: ProductVariant;
  quantity: number;
  line_total: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total_items: number;
  subtotal: string;
}

export interface OrderListItem {
  id: number;
  code: string;
  customer_name: string;
  branch_name: string;
  channel: string;
  channel_display: string;
  status: string;
  status_display: string;
  grand_total: string;
  currency: string;
  created_at: string;
  paid_at: string | null;
}

export interface OrderDetail extends OrderListItem {
  items: {
    id: number;
    variant: ProductVariant;
    product_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
  subtotal: string;
  discount_total: string;
  tax_total: string;
}

export interface ReservationListItem {
  id: number;
  code: string;
  customer_name: string;
  branch_name: string;
  scheduled_for: string;
  expires_at: string;
  status: string;
  status_display: string;
  items_count: number;
  created_at: string;
}

export interface ReservationDetail extends ReservationListItem {
  items: {
    id: number;
    variant: ProductVariant;
    product_name: string;
    quantity: number;
    item_status: string;
    item_status_display: string;
  }[];
  notes: string;
  branch: number;
  customer_email?: string;
}

export interface CheckoutSessionData {
  checkout_session_id: string;
  client_secret: string;
  publishable_key: string;
  amount: string;
  currency: string;
  payment_id: number;
}

export interface CheckoutSessionStatus {
  id: string;
  status: string;
  payment_status: string;
  order_code?: string;
  payment_intent_id?: string;
  payment_intent_status?: string;
}
