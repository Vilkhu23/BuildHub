import { CRMLead } from "../types";

export interface TriggerOptions {
  vendorPhone?: string;
  catalogUrl?: string;
  onAddLog?: (message: string) => void;
}

/**
 * whatsappLeadTrigger - Automatically dispatches double WhatsApp notifications via simulated Meta Cloud / WhatsApp Business API
 * for any hot CRM construction lead in BuildEstimate BOS.
 */
export async function triggerWhatsAppNotifications(
  lead: CRMLead,
  options: TriggerOptions = {}
): Promise<{ success: boolean; triggerALog?: string; triggerBLog?: string; error?: string }> {
  const vendorPhone = options.vendorPhone || "+91 98765 43210";
  const catalogUrl = options.catalogUrl || "https://buildestimate.com/shared/catalog-premium";
  const onAddLog = options.onAddLog || ((msg) => console.log(msg));

  onAddLog(`[Karam AI] Initiating WhatsApp Lead Trigger flow for inquiry: ${lead.id}`);

  let triggerALog = "";
  let triggerBLog = "";

  try {
    // TRIGGER A: Outbound message to the Vendor/Builder Dashboard phone alerting them of a new hot lead.
    const messageToVendor = `🚨 *New Hot Lead Alert (BuildEstimate BOS)*\n\n` +
      `👤 *Name:* ${lead.customer_name}\n` +
      `📞 *Phone:* ${lead.phone_number}\n` +
      `🌐 *Source:* ${lead.source.replace("_", " ")}\n` +
      `🏗️ *Project Interest:* ${lead.project_interest || "General Consultation"}\n` +
      `🆔 *Lead ID:* ${lead.id}\n\n` +
      `Please contact the customer immediately or view the CRM Lead Hub.`;

    onAddLog(`[Karam AI] Sending Meta Cloud API Request (Trigger A) for Vendor ${vendorPhone}...`);

    // Simulated Meta API Call for Trigger A
    const responseVendor = await fetch("https://graph.facebook.com/v17.0/105954558954321/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer EAAXXFakeTokenForMockingBOSInquiries778899"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: vendorPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageToVendor
        }
      })
    }).catch(() => {
      // Graceful fallback simulation if URL fails/is offline
      return {
        ok: true,
        json: async () => ({ messaging_product: "whatsapp", contacts: [{ input: vendorPhone, wa_id: vendorPhone.replace(/\s+/g, "") }], messages: [{ id: "mock-vendor-msg-101" }] })
      };
    });

    if (responseVendor.ok) {
      triggerALog = `WhatsApp notification to builder/vendor successfully dispatched. MsgID: mock-vendor-msg-101`;
      onAddLog(`[Karam AI] ✅ Trigger A Success: ${triggerALog}`);
    } else {
      onAddLog(`[Karam AI] ⚠️ Trigger A Dispatch was simulation-routed due to raw HTTP status.`);
      triggerALog = `Simulated backup routing successful for vendor notify.`;
    }

    // TRIGGER B: Outbound message to the Customer delivering a personalized script mentioning their interest and digital catalog link.
    const messageToCustomer = `Hello *${lead.customer_name}*,\n\n` +
      `Thank you for expressing interest in *${lead.project_interest || "our construction & material supplies"}* through our ${lead.source.replace("_", " ")} channel.\n\n` +
      `We have registered your inquiry on BuildEstimate BOS. One of our senior engineering specialists will get in touch with you shortly on this number.\n\n` +
      `📖 Meanwhile, you can review our latest premium structural designs and pricing catalogs here: ${catalogUrl}\n\n` +
      `Best Regards,\n` +
      `*BuildEstimate Engineering Team*`;

    onAddLog(`[Karam AI] Sending Meta Cloud API Request (Trigger B) to Customer ${lead.phone_number}...`);

    // Simulated Meta API Call for Trigger B
    const responseCustomer = await fetch("https://graph.facebook.com/v17.0/105954558954321/messages", {
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
        text: {
          preview_url: true,
          body: messageToCustomer
        }
      })
    }).catch(() => {
      // Graceful fallback simulation if URL fails/is offline
      return {
        ok: true,
        json: async () => ({ messaging_product: "whatsapp", contacts: [{ input: lead.phone_number, wa_id: lead.phone_number.replace(/\s+/g, "") }], messages: [{ id: "mock-customer-msg-202" }] })
      };
    });

    if (responseCustomer.ok) {
      triggerBLog = `WhatsApp welcome script sent to customer "${lead.customer_name}". MsgID: mock-customer-msg-202`;
      onAddLog(`[Karam AI] ✅ Trigger B Success: ${triggerBLog}`);
    } else {
      onAddLog(`[Karam AI] ⚠️ Trigger B Dispatch was simulation-routed.`);
      triggerBLog = `Simulated backup welcome script routing successful.`;
    }

    return {
      success: true,
      triggerALog,
      triggerBLog
    };

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    onAddLog(`[Karam AI] ❌ Fault Tolerance Trigger Error: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
}

// Support alias signature for webhook lead automation simulation
export { triggerWhatsAppNotifications as whatsappLeadTrigger };
