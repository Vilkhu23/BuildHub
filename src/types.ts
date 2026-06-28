export interface Profile {
  id: string;
  name: string;
  user_role: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  account_status: 'Active' | 'Disabled';
  avatar_url?: string;
  parent_owner_id?: string | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  tags: ('Buyer' | 'Seller' | 'Vendor' | 'Contractor')[];
}

export interface Project {
  id: string;
  project_name: string;
  status: 'Active' | 'Completed' | 'On-Hold' | 'Quotation' | 'Dead';
  client_id?: string;
  location: string;
  type: string;
  completion_pct: number;
  total_budget: number;
  spent: number;
  estimates?: {
    civil: { name: string; amount: number }[];
    electrical: { name: string; amount: number }[];
    finishes: { name: string; amount: number }[];
  };
  gst_rate?: number;
}

export interface Property {
  id: string;
  title: string;
  property_type: 'Plot' | 'Villa' | 'Flat' | 'Commercial';
  location: string;
  asking_price: number;
  target_selling_price: number;
  source_person_name: string;
  source_person_type: 'Builder' | 'Owner' | 'CP' | 'Rental Investor';
  source_person_phone: string;
  image_url: string;
  status: 'Available' | 'Hold' | 'Sold';
}

export interface InboundRevenue {
  id: string;
  project_id: string;
  amount: number;
  head_account: 'Property Sale' | 'Construction' | 'Interior' | 'Renovation' | 'Rent';
  payment_mode: 'Cash' | 'Online';
  payment_stage: 'Advance' | 'Partial' | 'Final';
  date: string;
  registry_deadline?: string;
}

export interface DailyPayment {
  id: string;
  project_id: string;
  amount: number;
  paid_by: string;
  remarks: string;
  category: 'Labor' | 'Materials' | 'Miscellaneous';
  date: string;
}

export interface OfficeExpense {
  id: string;
  subject: string;
  amount: number;
  date: string;
}

export interface DealAdjustment {
  id: string;
  client_id: string;
  direction: 'Inbound_Commission' | 'Outbound_Payout';
  amount: number;
  deal_detail: string;
}

export interface MaterialStock {
  id: string;
  name: string;
  category: string;
  location: string;
  current_stock: number;
  unit: string;
  critical_level: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  icon: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  status: 'PREFERRED' | 'ACTIVE' | 'ON HOLD';
  active_orders_count: number;
  last_delivery_date: string;
  avatar_url?: string;
  total_spent: number;
  paid_amount: number;
  balance_due: number;
  on_time_delivery_pct: number;
  quality_rating: number;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  vendor_name: string;
  project_name: string;
  order_date: string;
  expected_delivery: string;
  amount: number;
  status: 'In Transit' | 'Completed' | 'Cancelled';
  item_name: string;
  item_sku: string;
  quantity_description: string;
  unit_price: number;
  timeline: {
    title: string;
    date: string;
    done: boolean;
  }[];
}

export interface CriticalAlert {
  id: string;
  type: 'Stock' | 'Deadline' | 'General';
  title: string;
  description: string;
  project_name?: string;
}

export interface BuyerRequirement {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  preferred_location: string;
  max_budget: number;
  property_type: 'Plot' | 'Villa' | 'Flat' | 'Commercial';
  status: 'Pending' | 'Matched' | 'Closed';
}

export interface DatabaseState {
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  properties: Property[];
  inbound_revenues: InboundRevenue[];
  daily_payments: DailyPayment[];
  office_expenses: OfficeExpense[];
  deal_adjustments: DealAdjustment[];
  material_stocks: MaterialStock[];
  vendors: Vendor[];
  purchase_orders: PurchaseOrder[];
  alerts: CriticalAlert[];
  buyer_requirements: BuyerRequirement[];
}
