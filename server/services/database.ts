import fs from "fs";
import path from "path";
import { DatabaseState } from "../../src/types";

const DB_FILE = path.join(process.cwd(), "db.json");

// Seed Data
export const defaultState: DatabaseState = {
  profiles: [
    { id: "ak-1", name: "Amit Kumar", user_role: "Manager", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "ps-1", name: "Priya Sharma", user_role: "Telecaller", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "rk-1", name: "Rahul Khan", user_role: "Supervisor", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "vj-1", name: "Vikram Joshi", user_role: "Manager", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "owner-1", name: "Rajesh Singh", user_role: "Owner", account_status: "Active", parent_owner_id: null }
  ],
  clients: [
    { id: "cl-1", name: "Rahul Sharma", phone: "9876543210", tags: ["Seller"] },
    { id: "cl-2", name: "Heritage Brokers", phone: "9812345678", tags: ["Contractor"] },
    { id: "cl-3", name: "Amit Verma", phone: "9898989898", tags: ["Buyer"] }
  ],
  projects: [
    {
      id: "pr-1",
      project_name: "Silver Oak Residency",
      status: "Active",
      location: "Sector 45, Chandigarh",
      type: "Residential",
      completion_pct: 65,
      total_budget: 8400000,
      spent: 4250000
    },
    {
      id: "pr-2",
      project_name: "Nara Tower",
      status: "Active",
      location: "CBD South, Mohali",
      type: "Commercial",
      completion_pct: 12,
      total_budget: 25000000,
      spent: 1210000
    },
    {
      id: "pr-3",
      project_name: "Green Valley Estates",
      status: "Active",
      location: "Sector 85, Kharar",
      type: "Residential",
      completion_pct: 42,
      total_budget: 8542000,
      spent: 3843900
    }
  ],
  properties: [
    {
      id: "prop-1",
      title: "10 Marla Luxury Villa",
      property_type: "Villa",
      location: "Sector 125, Kharar",
      asking_price: 7800000,
      target_selling_price: 8550000,
      source_person_name: "Rahul Sharma (Direct)",
      source_person_type: "Owner",
      source_person_phone: "9876543210",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKCjFNjQm8SWpBMT2PqY3MlKIQ9-Srb_sJ3hZIvPB6mI-sdNYP-G8GnkK9m6KqDg8a4xbdu-RYxDp3toSIVgUOihaFhihC8dcJOzAVjala-wvjUE45VvOsJofcB8kXJSmC7d2BgxJBBT6l3hQvvo0N02Vg2PR3_x4efwMWhvYHwes0SG2b-T4CoSfwBrM3NKleq71COVqh3j2dtL054I1gAmjf7Cge9QUCxhsjCSYV3XbIbsSTe4fEpAbqeSqJODR_S8Qa1AqopdaM",
      status: "Available"
    },
    {
      id: "prop-2",
      title: "Skyline 3BHK Penthouse",
      property_type: "Flat",
      location: "Mohali Phase 7",
      asking_price: 10500000,
      target_selling_price: 11200000,
      source_person_name: "Heritage Brokers",
      source_person_type: "CP",
      source_person_phone: "9812345678",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBg1FX6WlwaX3P8fTYruqIC2SfGJByeZxELcQtcg6ySMFtc8HfmCONl_nohGJsuOxkchBeyuZ02BO1vbSJ3NBNA_0jvSw1KzCFFQRpmdsqJTOBXsYloDqsM5hqlqdDItMZHpxpUTJIxeD2U8jGF4HslVagAv8Qa8VJI_72WvnDs0OpyasKp38E-EmfBTv4uKT6mbddBcBfeZKQg9JSIaZChA8BSzJFiPI9toG-qKd5fIeUBCHu4JhPUfs4hFLfiLB5PAxug-VHX86S-",
      status: "Hold"
    },
    {
      id: "prop-3",
      title: "Eco-Luxe Studio Apartment",
      property_type: "Flat",
      location: "New Chandigarh",
      asking_price: 3950000,
      target_selling_price: 4500000,
      source_person_name: "Amit Verma (Re-sale)",
      source_person_type: "Owner",
      source_person_phone: "9898989898",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfbKozjgD6AU0Ej4oGLFGJjAQRBVnlYSMV626C2DEhZ6CRYAJkF5mRdXnF6XgiJjzttz9hppRkdrA8gn70akhzKCETXPVCiJaUSN1ffUbUXRX97dllvqk6cJrQG21eJ_Fz1goQiisK0fsWQ0eLaYhOC8-VzwUvh8-ZewRIIXAAEYeCo-YAt3qZvqrMgWoBARGhku8vcTr2TQhfRSz3k2TtTQGdyOEzwFSmm-u3XzikQ95VxcbQ5Cw9nXL5tW4-VD1ik0ug5E-LIRNd",
      status: "Available"
    },
    {
      id: "prop-4",
      title: "Corporate Office Tower Unit",
      property_type: "Commercial",
      location: "IT Park, Chandigarh",
      asking_price: 21500000,
      target_selling_price: 24000000,
      source_person_name: "J.K. Developers",
      source_person_type: "Builder",
      source_person_phone: "9876540000",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAgrlBoiL2rZBpKzQXOWWkdXPWjHo7ZVWGKRJ6DTkBS_wrrgyyrSEAERpw6iVvmBktjhXhxq9Aely12tZQLDXPp19Q7LG6p02ie3BpGzDwaRTD52DPnVZFSFTP1vTcGwc-BYgN712ZyjXCfvzR9hT0k4VsW9rm-7KKKjYgp-cGoJdsMF9ymBQ00V4DyQgE-hVcseISESOai3mnovy1UBkd113nRXwb8dQ-GMmJnsDWz2AWa5zlVRG8Z6qR3lki2QuNk-eVBfji5gYSf",
      status: "Available"
    }
  ],
  inbound_revenues: [
    {
      id: "rev-1",
      project_id: "pr-3",
      amount: 1500000,
      head_account: "Property Sale",
      payment_mode: "Online",
      payment_stage: "Advance",
      date: "2026-06-25T09:30:00Z",
      registry_deadline: "2026-06-30"
    }
  ],
  daily_payments: [
    {
      id: "dp-1",
      project_id: "pr-3",
      amount: 12500,
      paid_by: "Supervisor Amit",
      remarks: "Paid shuttering labor wages",
      category: "Labor",
      date: "2026-06-26T10:45:00-07:00"
    },
    {
      id: "dp-2",
      project_id: "pr-3",
      amount: 18000,
      paid_by: "Supervisor Amit",
      remarks: "Cement delivery (50 bags)",
      category: "Materials",
      date: "2026-06-26T13:20:00-07:00"
    },
    {
      id: "dp-3",
      project_id: "pr-3",
      amount: 1200,
      paid_by: "Supervisor Amit",
      remarks: "Petty cash for plumbing bits",
      category: "Miscellaneous",
      date: "2026-06-26T16:15:00-07:00"
    }
  ],
  office_expenses: [
    {
      id: "oe-1",
      subject: "Corporate HQ Rent",
      amount: 45000,
      date: "2026-06-01"
    },
    {
      id: "oe-2",
      subject: "Internet and Cloud Server Billing",
      amount: 8200,
      date: "2026-06-15"
    }
  ],
  deal_adjustments: [
    {
      id: "da-1",
      client_id: "cl-1",
      direction: "Inbound_Commission",
      amount: 125000,
      deal_detail: "1.5% commission for Luxury Villa client introduction"
    }
  ],
  buyer_requirements: [
    {
      id: "breq-1",
      buyer_name: "Gurbaksh Singh",
      buyer_phone: "9876543210",
      preferred_location: "Sector 125, Kharar",
      max_budget: 9000000,
      property_type: "Villa",
      status: "Matched"
    },
    {
      id: "breq-2",
      buyer_name: "Kamalpreet Kaur",
      buyer_phone: "9123456789",
      preferred_location: "Mohali Phase 7",
      max_budget: 12000000,
      property_type: "Flat",
      status: "Matched"
    },
    {
      id: "breq-3",
      buyer_name: "Harinder Sidhu",
      buyer_phone: "9501122334",
      preferred_location: "Sector 82, Mohali",
      max_budget: 15000000,
      property_type: "Commercial",
      status: "Pending"
    }
  ],
  material_stocks: [
    {
      id: "st-1",
      name: "Grade 43 OPC Cement",
      category: "Cement",
      location: "Warehouse Sector 4",
      current_stock: 450,
      unit: "Bags",
      critical_level: 100,
      status: "In Stock",
      icon: "architecture"
    },
    {
      id: "st-2",
      name: "TMT Steel 12mm",
      category: "Steel",
      location: "South Yard A",
      current_stock: 0.8,
      unit: "Tons",
      critical_level: 2.0,
      status: "Low Stock",
      icon: "layers"
    },
    {
      id: "st-3",
      name: "Seasoned Teak Wood",
      category: "Wood",
      location: "Carpentry Unit 2",
      current_stock: 1200,
      unit: "Sq. Ft.",
      critical_level: 200,
      status: "In Stock",
      icon: "forest"
    },
    {
      id: "st-4",
      name: "Copper Pipes 0.5\"",
      category: "Plumbing",
      location: "Warehouse Sector 4",
      current_stock: 0,
      unit: "Meters",
      critical_level: 50,
      status: "Out of Stock",
      icon: "plumbing"
    }
  ],
  vendors: [
    {
      id: "ven-1",
      name: "Gupta Marbles",
      category: "Finishes",
      rating: 4.9,
      status: "PREFERRED",
      active_orders_count: 3,
      last_delivery_date: "Oct 24, 2023",
      total_spent: 1240000,
      paid_amount: 820000,
      balance_due: 420000,
      on_time_delivery_pct: 98,
      quality_rating: 4.8
    },
    {
      id: "ven-2",
      name: "Apex Steel",
      category: "Structural",
      rating: 4.7,
      status: "ACTIVE",
      active_orders_count: 1,
      last_delivery_date: "Nov 02, 2023",
      total_spent: 812400,
      paid_amount: 812400,
      balance_due: 0,
      on_time_delivery_pct: 95,
      quality_rating: 4.6
    },
    {
      id: "ven-3",
      name: "Nara Electricals",
      category: "Electrical",
      rating: 3.8,
      status: "ON HOLD",
      active_orders_count: 0,
      last_delivery_date: "Sep 15, 2023",
      total_spent: 150000,
      paid_amount: 50000,
      balance_due: 100000,
      on_time_delivery_pct: 85,
      quality_rating: 3.8
    }
  ],
  purchase_orders: [
    {
      id: "VE-104",
      vendor_id: "ven-1",
      vendor_name: "Gupta Marbles",
      project_name: "Green Valley Estates",
      order_date: "Oct 24, 2023",
      expected_delivery: "Oct 28, 2023",
      amount: 345000,
      status: "In Transit",
      item_name: "Italian Marble (Premium White)",
      item_sku: "MAR-ITA-500",
      quantity_description: "500 Sq. Ft.",
      unit_price: 690,
      timeline: [
        { title: "Order Placed", date: "Oct 24, 09:30 AM", done: true },
        { title: "Processed", date: "Oct 25, 02:15 PM", done: true },
        { title: "In Transit", date: "Rajasthan Hub - En route", done: true },
        { title: "Expected Delivery", date: "Oct 28 (Estimated)", done: false }
      ]
    },
    {
      id: "AS-882",
      vendor_id: "ven-2",
      vendor_name: "Apex Steel",
      project_name: "Green Valley Estates",
      order_date: "Oct 18, 2023",
      expected_delivery: "Oct 22, 2023",
      amount: 812400,
      status: "Completed",
      item_name: "12 Tons Reinforcement Bars",
      item_sku: "STL-RE-12",
      quantity_description: "12 Tons",
      unit_price: 67700,
      timeline: [
        { title: "Order Placed", date: "Oct 18, 08:00 AM", done: true },
        { title: "Processed", date: "Oct 18, 11:30 AM", done: true },
        { title: "In Transit", date: "Dispatched from warehouse", done: true },
        { title: "Delivered", date: "Oct 22, 04:00 PM", done: true }
      ]
    },
    {
      id: "CH-312",
      vendor_id: "ven-3",
      vendor_name: "Modern Paints Ltd.",
      project_name: "Nara Tower",
      order_date: "Oct 15, 2023",
      expected_delivery: "Oct 18, 2023",
      amount: 42500,
      status: "Cancelled",
      item_name: "40 Industrial Primer Tins",
      item_sku: "PNT-PRM-40",
      quantity_description: "40 Tins",
      unit_price: 1062.5,
      timeline: [
        { title: "Order Placed", date: "Oct 15, 10:00 AM", done: true },
        { title: "Rejected / Cancelled", date: "Oct 16, 09:00 AM", done: true }
      ]
    },
    {
      id: "CC-550",
      vendor_id: "ven-4",
      vendor_name: "City Concrete Co.",
      project_name: "Silver Oak Residency",
      order_date: "Oct 23, 2023",
      expected_delivery: "Oct 26, 2023",
      amount: 115000,
      status: "In Transit",
      item_name: "M25 Ready Mix (4 Trucks)",
      item_sku: "CON-M25-TRK",
      quantity_description: "4 Trucks",
      unit_price: 28750,
      timeline: [
        { title: "Order Placed", date: "Oct 23, 11:15 AM", done: true },
        { title: "Processed", date: "Oct 24, 08:30 AM", done: true },
        { title: "In Transit", date: "En route to Sector 45", done: true },
        { title: "Expected Delivery", date: "Oct 26 (Estimated)", done: false }
      ]
    }
  ],
  alerts: [
    { id: "al-1", type: "Stock", title: "Low Cement Stock", description: "Silver Oak Residency • 12 bags left", project_name: "Silver Oak Residency" },
    { id: "al-2", type: "Deadline", title: "Bayana Deadline", description: "Nara Tower • Due in 48 hours", project_name: "Nara Tower" }
  ]
};

// Database utility functions
export function readDb(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading db file, returning default state", err);
  }
  // If db file doesn't exist, write defaultState and return it
  writeDb(defaultState);
  return defaultState;
}

export function writeDb(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file", err);
  }
}
