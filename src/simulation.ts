/**
 * BuildEstimate BOS CRM Hub - Lead Intake & Dispatch Simulation Script
 * Powered by Karam AI Ecosystem
 * 
 * This is a fully self-contained, self-executing TypeScript simulation script.
 * It models:
 * 1. In-memory databases & state tracking (Round-Robin).
 * 2. Incoming Webhook parsing and Telecaller allocation.
 * 3. Dynamic WhatsApp outbound template rendering with variable token replacement.
 * 4. Automatic transaction history logging.
 */

// ==========================================
// 1. Static In-Memory State Mockup
// ==========================================

export interface TelecallerProfile {
  id: string;
  name: string;
  role: "Telecaller";
  isActive: boolean;
}

export interface CRMLead {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string;
  source: string;
  project_interest: string;
  assigned_to_name?: string;
  assigned_to_caller_id?: string;
  lead_status: "New" | "Contacted" | "Quotation_Sent" | "Won" | "Lost";
  budget_tier: string;
  remarks: string;
  created_at: string;
  logs: Array<{
    id: string;
    action: string;
    performed_by: string;
    timestamp: string;
  }>;
}

// Active profiles with role 'Telecaller'
export const telecallersPool: TelecallerProfile[] = [
  { id: "caller_1", name: "Amit Sharma", role: "Telecaller", isActive: true },
  { id: "caller_2", name: "Priya Kaur", role: "Telecaller", isActive: true },
  { id: "caller_3", name: "Rohan Singh", role: "Telecaller", isActive: true }
];

// State array to store processed inquiries
export const leadsDatabase: CRMLead[] = [];

// Pointer tracker to handle the sequential Round-Robin logic
export let lastAssignedIndex = -1;


// ==========================================
// 2. Allocation & Automation Engine Logic
// ==========================================

export const DEFAULT_TEMPLATE = `Hello *{{customer_name}}*,

Thank you for contacting *Karam Builders*! We have successfully received your inquiry for *{{project_interest}}* and are excited to assist you with your construction estimate.

Our executive, *{{assigned_telecaller}}*, has been assigned as your dedicated specialist and will call you shortly to finalize details.

Best Regards,
*Karam Builders* Team`;

/**
 * Main process engine that handles intake, allocation, formatting, and saving.
 */
export function processIncomingLead(rawLead: { name: string; phone: string; interest: string; email?: string }) {
  // a. Round-Robin allocation matrix calculation
  const activeCallers = telecallersPool.filter(c => c.isActive);
  if (activeCallers.length === 0) {
    throw new Error("No active telecallers found in the sequential pool!");
  }

  // Increment pointer and apply modulo index formula
  lastAssignedIndex = (lastAssignedIndex + 1) % activeCallers.length;
  const assignedTelecaller = activeCallers[lastAssignedIndex];

  // Initialize new processed lead object
  const newLead: CRMLead = {
    id: `lead_${Math.random().toString(36).substr(2, 9)}`,
    customer_name: rawLead.name,
    phone_number: rawLead.phone,
    email: rawLead.email || "inquiry@buildestimate.in",
    source: "Facebook_Ads",
    project_interest: rawLead.interest,
    assigned_to_name: assignedTelecaller.name,
    assigned_to_caller_id: assignedTelecaller.id,
    lead_status: "New",
    budget_tier: "50L - 75L",
    remarks: "Pending first contact call setup.",
    created_at: new Date().toISOString(),
    logs: []
  };

  // Add chronological audit history
  newLead.logs.push({
    id: `log_init_${Date.now()}`,
    action: "Inbound Meta/Facebook Lead Webhook Intake complete.",
    performed_by: "Karam AI Gateway",
    timestamp: new Date().toISOString()
  });

  newLead.logs.push({
    id: `log_allocate_${Date.now()}`,
    action: `Round-Robin assignment completed. Designated Owner: ${assignedTelecaller.name}`,
    performed_by: "CRM Lead Engine",
    timestamp: new Date().toISOString()
  });

  // b. Simulated Outbound WhatsApp Template Rendering Pipeline
  // Replace template variables dynamically
  const renderedMessage = DEFAULT_TEMPLATE
    .replace(/\{\{customer_name\}\}/g, newLead.customer_name)
    .replace(/\{\{project_interest\}\}/g, newLead.project_interest)
    .replace(/\{\{assigned_telecaller\}\}/g, newLead.assigned_to_name || "Unassigned");

  // c. Save processed output payload straight into leadsDatabase
  leadsDatabase.push(newLead);

  return {
    lead: newLead,
    assignedTo: assignedTelecaller,
    renderedWhatsAppMessage: renderedMessage
  };
}


// ==========================================
// 3. The Mock Simulation Data Payload
// ==========================================

export const mockMetaWebhookPayload = {
  name: "Karamjeet Singh",
  phone: "+919876543210",
  interest: "3 BHK Kharar Villa Portfolio",
  email: "karamjeet@buildestimate.com"
};


// ==========================================
// 4. Self-Executing Live Test & Formatted Console Logger
// ==========================================

(() => {
  console.log("================================================================================");
  console.log("🚀 Firing Lead Intake Trigger Script simulation...");
  console.log("================================================================================");
  console.log(`📡 WEBHOOK PAYLOAD INGESTED:`);
  console.log(`   ├─ Client: ${mockMetaWebhookPayload.name}`);
  console.log(`   ├─ Phone:  ${mockMetaWebhookPayload.phone}`);
  console.log(`   └─ Target: ${mockMetaWebhookPayload.interest}`);
  console.log("--------------------------------------------------------------------------------");

  try {
    // Process lead intake
    const outcome = processIncomingLead(mockMetaWebhookPayload);

    console.log(`✅ Round-Robin Allocation Matrix Complete:`);
    console.log(`   └─ Lead successfully dispatched to [${outcome.assignedTo.name}] (ID: ${outcome.assignedTo.id})`);
    console.log("--------------------------------------------------------------------------------");

    console.log("📱 Custom Outbound Customer Greeting Script:");
    console.log("--------------------------------------------------------------------------------");
    console.log(outcome.renderedWhatsAppMessage);
    console.log("--------------------------------------------------------------------------------");

    console.log("📊 Global System Logs Matrix Updated successfully.");
    console.log(`   ├─ Current Database Count: ${leadsDatabase.length} records`);
    console.log(`   ├─ Assignment Queue Pointer state: lastAssignedIndex = ${lastAssignedIndex}`);
    console.log(`   └─ Saved Lead ID: ${outcome.lead.id}`);
    console.log("================================================================================");
  } catch (err: any) {
    console.error("❌ Lead intake simulation failed with exception:", err.message);
  }
})();
