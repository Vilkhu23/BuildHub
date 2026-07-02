import { CRMLead, Profile, LeadActivityLog } from "../types";

// Keep a persistent in-memory pointer for round-robin allocation
let globalRoundRobinIndex = 0;

export class CRMLeadEngine {
  /**
   * Performs sequential Round-Robin Allocation of an incoming CRMLead to an active Telecaller.
   * Checks the total pool of active users with role 'Telecaller' and assigns leads sequentially.
   */
  static allocateLead(
    newLead: Omit<CRMLead, "assigned_to_caller_id">,
    activeCallers: Profile[]
  ): CRMLead {
    // Filter active callers that have role 'Telecaller' and status 'Active'
    const telecallers = activeCallers.filter(
      (c) => c.user_role === "Telecaller" && c.account_status === "Active"
    );

    let assignedId: string | undefined = undefined;
    let assignedName: string | undefined = undefined;
    const assignmentLogs: LeadActivityLog[] = [...(newLead.logs || [])];

    if (telecallers.length > 0) {
      // Pick sequentially using round-robin index
      const caller = telecallers[globalRoundRobinIndex % telecallers.length];
      globalRoundRobinIndex = (globalRoundRobinIndex + 1) % telecallers.length;

      assignedId = caller.id;
      assignedName = caller.name;

      assignmentLogs.push({
        id: `log-alloc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        performed_by: "Karam AI Allocation Engine",
        action: `Lead automatically assigned to Telecaller: ${caller.name} via Round-Robin`,
        timestamp: new Date().toISOString(),
      });
    } else {
      assignmentLogs.push({
        id: `log-alloc-failed-${Date.now()}`,
        performed_by: "Karam AI Allocation Engine",
        action: "No active Telecallers available for automatic allocation.",
        timestamp: new Date().toISOString(),
      });
    }

    return {
      ...newLead,
      assigned_to_caller_id: assignedId,
      assigned_to_name: assignedName,
      logs: assignmentLogs,
    } as CRMLead;
  }

  /**
   * Scans for any lead in 'New' status for more than 4 hours or where the 'next_followup_date'
   * matches the current local timestamp, returning a list of alert notifications for the dashboard.
   */
  static checkOverdueLeads(leads: CRMLead[]): string[] {
    const alerts: string[] = [];
    const now = Date.now();
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    leads.forEach((lead) => {
      // Check if lead is in 'New' status for more than 4 hours
      if (lead.lead_status === "New") {
        const createdAtTime = Date.parse(lead.created_at);
        if (!isNaN(createdAtTime)) {
          const elapsedHours = (now - createdAtTime) / (1000 * 60 * 60);
          if (elapsedHours >= 4) {
            alerts.push(
              `🚨 OVERDUE: Lead "${lead.customer_name}" has been left in "New" status for ${elapsedHours.toFixed(1)} hours (Interest: ${lead.project_interest}).`
            );
          }
        }
      }

      // Check if next_followup_date matches today's date
      if (lead.next_followup_date) {
        if (lead.next_followup_date === todayStr) {
          alerts.push(
            `📅 TODAY'S FOLLOW-UP: Urgent follow-up required today for "${lead.customer_name}" (Interest: ${lead.project_interest}).`
          );
        } else if (lead.next_followup_date < todayStr && lead.lead_status !== "Won" && lead.lead_status !== "Lost") {
          alerts.push(
            `⚠️ OVERDUE FOLLOW-UP: Missed follow-up date (${lead.next_followup_date}) for "${lead.customer_name}" (Interest: ${lead.project_interest}).`
          );
        }
      }
    });

    return alerts;
  }

  /**
   * Integrates mock external service gateway dispatches using fetch requests to shoot personalized templates
   * to both the newly mapped Telecaller and the prospective buyer.
   */
  static async dispatchWhatsAppStubs(
    lead: CRMLead,
    telecallerPhone?: string,
    brochureUrl?: string,
    onAddLog?: (msg: string) => void
  ): Promise<{ success: boolean; telecallerLog?: string; buyerLog?: string; error?: string }> {
    const log = onAddLog || ((msg) => console.log(msg));
    const phoneToNotify = telecallerPhone || "+91 99999 88888";
    const catalogUrl = brochureUrl || "https://buildestimate.com/shared/brochure-premium";

    log(`[Karam AI Engine] Starting dispatch of allocation WhatsApp stubs for: ${lead.customer_name}`);

    let telecallerLog = "";
    let buyerLog = "";

    try {
      // Dispatch A: Outbound template to newly mapped Telecaller
      if (lead.assigned_to_name && lead.assigned_to_caller_id) {
        const telecallerMessage = `💼 *New CRM Lead Assigned (BuildEstimate BOS)*\n\n` +
          `Hello *${lead.assigned_to_name}*,\n` +
          `A new hot lead has been assigned to you for immediate follow-up:\n\n` +
          `👤 *Client Name:* ${lead.customer_name}\n` +
          `📞 *Client Phone:* ${lead.phone_number}\n` +
          `🏗️ *Project Interest:* ${lead.project_interest}\n` +
          `💰 *Budget Tier:* ${lead.budget_tier || "Not specified"}\n\n` +
          `Please contact them immediately and update the CRM Lead Hub remarks.`;

        log(`[Karam AI Engine] Sending WhatsApp Template via fetch to Telecaller (${lead.assigned_to_name}) at ${phoneToNotify}...`);

        const responseTelecaller = await fetch("https://graph.facebook.com/v17.0/105954558954321/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer EAAXXFakeTokenForMockingBOSInquiries778899"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneToNotify,
            type: "text",
            text: { preview_url: false, body: telecallerMessage }
          })
        }).catch(() => {
          // Fallback simulation
          return {
            ok: true,
            json: async () => ({ messaging_product: "whatsapp", messages: [{ id: "mock-telecaller-msg-303" }] })
          };
        });

        if (responseTelecaller.ok) {
          telecallerLog = `Notification sent to Telecaller ${lead.assigned_to_name}. MsgID: mock-telecaller-msg-303`;
          log(`[Karam AI Engine] ✅ Telecaller Dispatch Success: ${telecallerLog}`);
        } else {
          telecallerLog = `Simulated backup notification sent to Telecaller.`;
          log(`[Karam AI Engine] ⚠️ Telecaller Dispatch simulation-routed.`);
        }
      } else {
        log(`[Karam AI Engine] ℹ️ Lead has no assigned telecaller; skipping Telecaller alert.`);
      }

      // Dispatch B: Outbound template to prospective buyer with catalog brochure link
      const buyerMessage = `Dear *${lead.customer_name}*,\n\n` +
        `Thank you for reaching out to us regarding *${lead.project_interest}*.\n\n` +
        `Our dedicated specialist, *${lead.assigned_to_name || "one of our construction consultants"}*, has been assigned to assist you and will be contacting you shortly.\n\n` +
        `📥 In the meantime, feel free to view our digital corporate brochure and catalog designs:\n` +
        `${catalogUrl}\n\n` +
        `Warm regards,\n` +
        `*BuildEstimate BOS*`;

      log(`[Karam AI Engine] Sending WhatsApp Catalog Template via fetch to Buyer at ${lead.phone_number}...`);

      const responseBuyer = await fetch("https://graph.facebook.com/v17.0/105954558954321/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer EAAXXFakeTokenForMockingBOSInquiries778899"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: lead.phone_number,
          type: "text",
          text: { preview_url: true, body: buyerMessage }
        })
      }).catch(() => {
        // Fallback simulation
        return {
          ok: true,
          json: async () => ({ messaging_product: "whatsapp", messages: [{ id: "mock-buyer-msg-404" }] })
        };
      });

      if (responseBuyer.ok) {
        buyerLog = `Personalized brochure link sent to prospective buyer. MsgID: mock-buyer-msg-404`;
        log(`[Karam AI Engine] ✅ Buyer Dispatch Success: ${buyerLog}`);
      } else {
        buyerLog = `Simulated backup catalog sent to buyer.`;
        log(`[Karam AI Engine] ⚠️ Buyer Dispatch simulation-routed.`);
      }

      return {
        success: true,
        telecallerLog,
        buyerLog
      };

    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`[Karam AI Engine] ❌ External Gateway Dispatch Error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
}

// Standalone function exports to guarantee absolute compatibility with the requested signatures
export function allocateLead(
  newLead: Omit<CRMLead, "assigned_to_caller_id">,
  activeCallers: Profile[]
): CRMLead {
  return CRMLeadEngine.allocateLead(newLead, activeCallers);
}

export function checkOverdueLeads(leads: CRMLead[]): string[] {
  return CRMLeadEngine.checkOverdueLeads(leads);
}
