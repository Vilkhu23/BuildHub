export interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface CompanySettings {
  companyName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
}

export interface TenantProfile {
  id: string;
  tenant_id: string;
  company_name: string;
  business_logo_url: string;
  gstin: string;
  address: string;
  phone_number: string;
  email?: string;
  subscription_plan?: 'Free Trial' | 'Pro Growth' | 'Enterprise Matrix';
}

export interface Profile {
  id: string;
  name: string;
  user_role: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  account_status: 'Active' | 'Disabled';
  avatar_url?: string;
  parent_owner_id?: string | null;
  tenant_id?: string; // Tenant isolation key
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  tags: ('Buyer' | 'Seller' | 'Vendor' | 'Contractor')[];
  project_location?: string;
  tenant_id?: string; // Tenant isolation key
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
  tenant_id?: string; // Tenant isolation key
  estimates?: {
    civil: LineItem[];
    electrical: LineItem[];
    finishes: LineItem[];
    interior_finishing?: LineItem[];
    civil_vendor_name?: string;
    electrical_vendor_name?: string;
    finishes_vendor_name?: string;
    interior_vendor_name?: string;
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
  tenant_id?: string; // Tenant isolation key
}

export interface DailyPayment {
  id: string;
  project_id: string;
  amount: number;
  paid_by: string;
  remarks: string;
  category: 'Labor' | 'Materials' | 'Miscellaneous';
  date: string;
  tenant_id?: string; // Tenant isolation key
}

export interface OfficeExpense {
  id: string;
  subject: string;
  amount: number;
  date: string;
  tenant_id?: string; // Tenant isolation key
}

export interface DealAdjustment {
  id: string;
  client_id: string;
  direction: 'Inbound_Commission' | 'Outbound_Payout';
  amount: number;
  deal_detail: string;
  tenant_id?: string; // Tenant isolation key
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
  tenant_id?: string; // Tenant isolation key
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
  tenant_id?: string; // Tenant isolation key
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
  tenant_id?: string; // Tenant isolation key
}

export interface CriticalAlert {
  id: string;
  type: 'Stock' | 'Deadline' | 'General';
  title: string;
  description: string;
  project_name?: string;
  tenant_id?: string; // Tenant isolation key
}

export interface BuyerRequirement {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  preferred_location: string;
  max_budget: number;
  property_type: 'Plot' | 'Villa' | 'Flat' | 'Commercial';
  status: 'Pending' | 'Matched' | 'Closed';
  tenant_id?: string; // Tenant isolation key
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
  tenant_profiles: TenantProfile[]; // SaaS Tenant profiles
  leads?: Lead[];
  crm_leads?: CRMLead[];
}

export interface Lead {
  id: string;
  tenant_id: string;
  client_name: string;
  phone_number: string;
  location: string;
  source: 'Meta Ads' | 'WhatsApp' | 'Google Search' | 'Referral';
  status: 'New' | 'Quoted' | 'Follow-up';
  created_at: string;
}

export interface LeadActivityLog {
  id: string;
  performed_by: string; // Name of the Owner/Manager/Telecaller
  action: string;       // e.g., "Status Changed to Contacted", "Added Remark"
  timestamp: string;
}

export interface CRMLead {
  id: string;
  tenant_id: string;
  customer_name: string;
  phone_number: string;
  email?: string;
  source: 'Facebook_Ads' | 'Instagram' | 'Website' | 'Manual';
  project_interest: string;     // Specific tracking (e.g., "3 BHK Kharar Villa")
  budget_tier?: string;         // e.g., "50L - 75L", "1Cr+"
  lead_status: 'New' | 'Contacted' | 'Quotation_Sent' | 'Lost' | 'Won';
  assigned_to_caller_id?: string; // Telecaller Profile ID mapping
  assigned_to_name?: string;     // Telecaller Name for easy rendering
  remarks?: string;
  next_followup_date?: string;  // "YYYY-MM-DD" for dashboard alarms
  logs: LeadActivityLog[];       // Audit log timeline matrix
  created_at: string;
}
