/** Admin/backoffice DTOs aligned with Django serializers */

export interface City {
  id: number;
  name: string;
  department: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SizeGroup {
  id: number;
  name: string;
  description?: string;
}

export interface Size {
  id: number;
  group: number;
  group_name?: string;
  code: string;
  display_order: number;
}

export interface Color {
  id: number;
  name: string;
  slug: string;
  hex_code: string;
}

export interface Season {
  id: number;
  name: string;
  code: string;
  kind: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  created_at?: string;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  season: number;
  season_name?: string;
  supplier: number | null;
  launch_date?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
}

export interface ProductWritePayload {
  name: string;
  description?: string;
  category_id: number;
  brand_id: number;
  collection_id: number;
  gender: string;
  base_price: string;
  material?: string;
  care_instructions?: string;
  is_active?: boolean;
}

export interface VariantWritePayload {
  product: number;
  size: number;
  color: number;
  price_override?: string | null;
  barcode?: string;
  is_active?: boolean;
}

export interface VariantDetail {
  id: number;
  sku: string;
  size: Size | number;
  color: Color | number;
  price_override: string | null;
  effective_price: string;
  barcode?: string;
  is_active: boolean;
}

export interface EmployeeCreatePayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  position: string;
  branch: number;
  hire_date: string;
}

export interface BranchStock {
  id: number;
  branch: number;
  branch_code: string;
  branch_name: string;
  variant: number;
  variant_sku: string;
  product_name: string;
  size_code: string;
  color_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  min_threshold: number;
}

export interface InventoryMovement {
  id: number;
  branch: number;
  branch_code: string;
  variant: number;
  variant_sku: string;
  movement_type: string;
  movement_type_display: string;
  quantity: number;
  reference_type: string;
  reference_id: number | null;
  note: string;
  created_by_email: string | null;
  created_at: string;
}

export interface StockAdjustPayload {
  branch_id: number;
  variant_id: number;
  quantity: number;
  direction: 'in' | 'out';
  note?: string;
}

export interface StockTransferPayload {
  from_branch_id: number;
  to_branch_id: number;
  variant_id: number;
  quantity: number;
  note?: string;
}

export interface Supplier {
  id: number;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  user: number | null;
  is_active: boolean;
}

export interface PurchaseReceiptItem {
  id?: number;
  variant: number;
  variant_sku?: string;
  quantity: number;
  unit_cost: string;
  line_total?: string;
}

export interface PurchaseReceipt {
  id: number;
  code: string;
  supplier: number;
  supplier_name?: string;
  branch: number;
  branch_code?: string;
  status: string;
  status_display?: string;
  received_at: string | null;
  invoice_number: string;
  notes: string;
  items: PurchaseReceiptItem[];
  item_count?: number;
  created_at?: string;
}

export const SEASON_KINDS = [
  { value: 'SPRING_SUMMER', label: 'Primavera-Verano' },
  { value: 'AUTUMN_WINTER', label: 'Otoño-Invierno' },
  { value: 'SCHOOL', label: 'Escolar' },
  { value: 'PROMO', label: 'Promoción' },
  { value: 'NEW_COLLECTION', label: 'Nueva colección' },
] as const;

export const GENDERS = [
  { value: 'MALE', label: 'Hombre' },
  { value: 'FEMALE', label: 'Mujer' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Niños' },
] as const;

export const EMPLOYEE_POSITIONS = [
  { value: 'MANAGER', label: 'Encargado' },
  { value: 'CASHIER', label: 'Cajero' },
  { value: 'STAFF', label: 'Personal' },
] as const;
