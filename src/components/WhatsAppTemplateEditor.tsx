import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Sparkles, 
  Share2, 
  Save, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  PhoneCall, 
  User, 
  Briefcase, 
  DollarSign, 
  Send, 
  RotateCcw,
  Maximize2,
  Play,
  Terminal as TerminalIcon,
  Cpu,
  Layers,
  Settings2,
  AlertTriangle
} from "lucide-react";
import { CRMLeadEngine } from "../lib/CRMLeadEngine";
import { whatsappLeadTrigger } from "../lib/whatsappLeadTrigger";

interface Template {
  type: string;
  brochureUrl: string;
  body: string;
}

const DEFAULT_TEMPLATES: Record<string, Template> = {
  welcome: {
    type: "welcome",
    brochureUrl: "https://buildestimate.in/brochure/deluxe-villas.pdf",
    body: `Hello *{{customer_name}}*,

Thank you for contacting *{{company_name}}*! We have successfully received your inquiry for *{{project_interest}}* and are excited to assist you with your construction estimate.

Here is what we have on file:
📍 Requirement: *{{project_interest}}*
💰 Budget Range: *{{budget_tier}}*

Our executive, *{{assigned_telecaller}}*, has been assigned as your dedicated specialist and will call you shortly to finalize details.

In the meantime, feel free to view our digital profile and catalog:
👉 {{brochure_url}}

Best Regards,
*{{company_name}}* Team`,
  },
  followup: {
    type: "followup",
    brochureUrl: "https://buildestimate.in/brochure/premium-specs.pdf",
    body: `Hi *{{customer_name}}*,

This is *{{assigned_telecaller}}* from *{{company_name}}*. I am following up on your inquiry regarding *{{project_interest}}*.

We have verified our material rates and can deliver exceptional quality within your target range of *{{budget_tier}}*.

Could we jump on a brief 5-minute call today to discuss the specifications and deliver your preliminary quote?

Our latest portfolio can be found here:
👉 {{brochure_url}}

Looking forward to building your dream!
Best,
*{{assigned_telecaller}}*`,
  },
  quotation: {
    type: "quotation",
    brochureUrl: "https://buildestimate.in/brochure/rate-card.pdf",
    body: `Dear *{{customer_name}}*,

Our team at *{{company_name}}* has prepared a custom quotation draft for your *{{project_interest}}* project.

Based on your preferred budget tier (*{{budget_tier}}*), we have prioritized high-grade concrete, modular electrical configurations, and elegant premium finishes.

Please review our verified material rate card and itemized checklist here:
👉 {{brochure_url}}

Please reply to this message or call *{{assigned_telecaller}}* to request adjustments or schedules.

Warm regards,
*{{company_name}}*`,
  }
};

export default function WhatsAppTemplateEditor() {
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>("welcome");
  
  // Loaded templates state
  const [templates, setTemplates] = useState<Record<string, Template>>(() => {
    const saved = localStorage.getItem("whatsapp_templates");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved templates, using defaults");
      }
    }
    return DEFAULT_TEMPLATES;
  });

  const activeTemplate = templates[activeTemplateKey] || DEFAULT_TEMPLATES[activeTemplateKey];

  // Input states synchronized with active template
  const [brochureUrl, setBrochureUrl] = useState(activeTemplate.brochureUrl);
  const [messageBody, setMessageBody] = useState(activeTemplate.body);

  // Sync state when template key changes
  useEffect(() => {
    setBrochureUrl(activeTemplate.brochureUrl);
    setMessageBody(activeTemplate.body);
  }, [activeTemplateKey]);

  // Mock data for live rendering
  const [mockName, setMockName] = useState("Amit Sharma");
  const [mockInterest, setMockInterest] = useState("3BHK Premium Villa Construction");
  const [mockTelecaller, setMockTelecaller] = useState("Rohan Deshmukh");
  const [mockBudget, setMockBudget] = useState("50L - 75L");
  const [mockCompany, setMockCompany] = useState("Karam Builders");

  // Lead Intake Automation Simulation State Matrix
  const [simulatedLeadName, setSimulatedLeadName] = useState("Karamjeet Singh");
  const [simulatedPhone, setSimulatedPhone] = useState("+919876543210");
  const [simulatedEmail, setSimulatedEmail] = useState("karamjeet@buildestimate.com");
  const [simulatedProject, setSimulatedProject] = useState("3 BHK Kharar Villa Portfolio");
  const [simulatedSource, setSimulatedSource] = useState<"Facebook_Ads" | "Meta_Ads" | "Website" | "Manual">("Facebook_Ads");
  
  const [simulatedCallers, setSimulatedCallers] = useState([
    { id: "caller_1", name: "Amit Sharma", user_role: "Telecaller", account_status: "Active" },
    { id: "caller_2", name: "Priya Kaur", user_role: "Telecaller", account_status: "Active" },
    { id: "caller_3", name: "Rohan Singh", user_role: "Telecaller", account_status: "Active" }
  ]);

  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);

  // Core Simulation Code Runner
  const runLeadIntakeTest = async () => {
    setIsRunningSimulation(true);
    setSimulationLogs([]);
    
    const logOutput = (text: string) => {
      setSimulationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
    };

    logOutput("🚀 Starting Lead Intake Automation Test...");
    await new Promise(r => setTimeout(r, 650));

    logOutput(`📥 Mock Incoming Lead Webhook Received!`);
    logOutput(`   └─ Name: "${simulatedLeadName}"`);
    logOutput(`   └─ Target Phone: "${simulatedPhone}"`);
    logOutput(`   └─ Traffic Channel: "${simulatedSource}"`);
    logOutput(`   └─ Requirement: "${simulatedProject}"`);
    
    await new Promise(r => setTimeout(r, 700));
    logOutput("➡️ Processing Round-Robin Allocation Matrix...");
    
    // Convert pool for engine compatibility
    const activeCallersPool = simulatedCallers.map(c => ({
      id: c.id,
      name: c.name,
      user_role: c.user_role as any,
      account_status: c.account_status as any,
      email: `${c.name.toLowerCase().replace(" ", "")}@buildestimate.com`,
      created_at: new Date().toISOString()
    }));

    const rawMockLead = {
      id: `lead_mock_99x`,
      tenant_id: "tenant_sachdeva_constructions",
      customer_name: simulatedLeadName,
      phone_number: simulatedPhone,
      email: simulatedEmail,
      source: simulatedSource,
      project_interest: simulatedProject,
      created_at: new Date().toISOString(),
      lead_status: "New" as const,
      budget_tier: "50L - 75L",
      logs: []
    };

    const processedLead = CRMLeadEngine.allocateLead(rawMockLead as any, activeCallersPool as any);
    
    await new Promise(r => setTimeout(r, 800));
    logOutput(`✅ Lead Assigned Sequentially To: ${processedLead.assigned_to_name} (ID: ${processedLead.assigned_to_caller_id})`);
    
    await new Promise(r => setTimeout(r, 700));
    logOutput("➡️ Triggering Outbound WhatsApp Dispatch API Gateway...");

    try {
      const response = await whatsappLeadTrigger(processedLead, {
        vendorPhone: "+919876543210",
        catalogUrl: brochureUrl || "https://buildestimate.com/shared/catalog-premium",
        onAddLog: (msg) => {
          // Stream sublogs directly into terminal
          logOutput(msg);
        }
      });
      
      await new Promise(r => setTimeout(r, 600));
      if (response.success) {
        logOutput("🎉 Test Complete: Outbound Webhook triggers fired with zero payload leaks!");
      } else {
        logOutput(`❌ Automation Dispatch Failed: ${response.error}`);
      }
    } catch (error: any) {
      logOutput(`❌ Automation Dispatch Exception: ${error?.message || String(error)}`);
    }

    setIsRunningSimulation(false);
  };

  const [notification, setNotification] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to show temporary notification toasts
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Save changes to current template
  const handleSaveTemplate = () => {
    const updated = {
      ...templates,
      [activeTemplateKey]: {
        type: activeTemplateKey,
        brochureUrl: brochureUrl.trim(),
        body: messageBody
      }
    };
    setTemplates(updated);
    localStorage.setItem("whatsapp_templates", JSON.stringify(updated));
    triggerNotification(`Successfully saved "${getTemplateLabel(activeTemplateKey)}" template configuration!`);
  };

  // Reset template back to build default
  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset this template to its default built-in structure?")) {
      const updated = {
        ...templates,
        [activeTemplateKey]: DEFAULT_TEMPLATES[activeTemplateKey]
      };
      setTemplates(updated);
      setBrochureUrl(DEFAULT_TEMPLATES[activeTemplateKey].brochureUrl);
      setMessageBody(DEFAULT_TEMPLATES[activeTemplateKey].body);
      localStorage.setItem("whatsapp_templates", JSON.stringify(updated));
      triggerNotification(`Reset "${getTemplateLabel(activeTemplateKey)}" template to initial factory defaults.`);
    }
  };

  // Insert token at cursor location
  const insertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newValue = before + token + after;
    setMessageBody(newValue);

    // Reposition cursor after the inserted token
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + token.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Formatting parser for Live WhatsApp Bubble rendering
  const parseWhatsAppFormatting = (text: string) => {
    // 1. Substitute variables
    let formatted = text
      .replace(/\{\{customer_name\}\}/g, mockName || "Amit Sharma")
      .replace(/\{\{project_interest\}\}/g, mockInterest || "3BHK Premium Villa Construction")
      .replace(/\{\{assigned_telecaller\}\}/g, mockTelecaller || "Rohan Deshmukh")
      .replace(/\{\{budget_tier\}\}/g, mockBudget || "50L - 75L")
      .replace(/\{\{company_name\}\}/g, mockCompany || "Karam Builders")
      .replace(/\{\{brochure_url\}\}/g, brochureUrl || "https://buildestimate.in/brochure/specs.pdf");

    // 2. Escape HTML
    const div = document.createElement("div");
    div.innerText = formatted;
    let html = div.innerHTML;

    // 3. Bold: *text* -> <strong>text</strong>
    html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

    // 4. Italic: _text_ -> <em>text</em>
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");

    // 5. Strikethrough: ~text~ -> <del>text</del>
    html = html.replace(/~(.*?)~/g, "<del>$1</del>");

    // 6. Monospace: ```code``` -> <code class="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs">code</code>
    html = html.replace(/```(.*?)```/g, '<code class="font-mono bg-[#E1F3D4] text-slate-800 px-1 py-0.5 rounded text-[10px]">$1</code>');

    // 7. URLs auto-link
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    html = html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all font-semibold">$1</a>');

    // 8. Linebreaks
    html = html.replace(/\n/g, "<br />");

    return html;
  };

  const getTemplateLabel = (key: string) => {
    switch (key) {
      case "welcome": return "Welcome Greetings & Profile";
      case "followup": return "Follow-up Pro / Call Booking";
      case "quotation": return "Custom Quotation Proposal Draft";
      default: return key;
    }
  };

  return (
    <div id="whatsapp-template-container" className="space-y-6">
      
      {/* Dynamic Toast System */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500 text-white text-xs font-black px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute right-5 top-5 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
          <Sparkles className="h-32 w-32 text-emerald-400" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
                Live Automated Broadcasts
              </span>
              <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                Karam AI Ecosystem
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              WhatsApp Broadcast Template Workspace
            </h2>
            <p className="text-slate-400 text-xs font-semibold mt-1 max-w-2xl">
              Design white-labeled messaging templates. Placeholders are dynamically resolved and pushed via Karam AI telecaller assignment logs instantly.
            </p>
          </div>
          
          <button
            onClick={handleSaveTemplate}
            className="self-start md:self-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-950/20 active:scale-95 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save All Edits</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Template Configuration Form (Cols 1-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          
          {/* Header Segment Selector bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">
              Select WhatsApp Template to Edit
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(DEFAULT_TEMPLATES).map((key) => {
                const isActive = activeTemplateKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTemplateKey(key)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {getTemplateLabel(key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 space-y-5">
            
            {/* Input 1: Brochure / Catalog URL */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-emerald-600" />
                  Brochure / Catalog Attachment Link
                </label>
                <span className="text-[9px] text-slate-400 font-bold">Injected as {"{{brochure_url}}"}</span>
              </div>
              <input
                type="url"
                value={brochureUrl}
                onChange={(e) => setBrochureUrl(e.target.value)}
                placeholder="e.g. https://buildestimate.in/brochure/specs.pdf"
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Variable Insertion Matrix Tool */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  Dynamic Placeholders Tool Matrix
                </span>
                <span className="text-[9px] text-slate-400 font-bold">Click to Insert at Cursor</span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {[
                  { token: "{{customer_name}}", label: "Client Name", icon: User },
                  { token: "{{project_interest}}", label: "Project Requirement", icon: Briefcase },
                  { token: "{{assigned_telecaller}}", label: "Assigned Executive", icon: PhoneCall },
                  { token: "{{budget_tier}}", label: "Budget Tier", icon: DollarSign },
                  { token: "{{company_name}}", label: "Company Name", icon: FileText },
                  { token: "{{brochure_url}}", label: "Brochure Link", icon: Share2 },
                ].map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => insertToken(item.token)}
                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 text-slate-700 hover:text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs"
                    title={`Click to insert ${item.token} token`}
                  >
                    <item.icon className="h-3 w-3 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Message Body & Formatting
                </label>
                <div className="flex gap-2 text-[9px] text-slate-400 font-bold">
                  <span>*bold*</span>
                  <span>•</span>
                  <span>_italic_</span>
                  <span>•</span>
                  <span>~strike~</span>
                  <span>•</span>
                  <span>```code```</span>
                </div>
              </div>
              
              <textarea
                ref={textareaRef}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write message template body..."
                className="w-full h-72 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 placeholder:text-slate-400 font-sans leading-relaxed"
              />
            </div>

            {/* Action Bar Footer */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                title="Reset to factory built-in default text"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>

              <span className="text-[10px] font-bold text-slate-400">
                Characters count: <span className="font-mono font-extrabold text-slate-600">{messageBody.length}</span>
              </span>
            </div>

          </div>
        </div>

        {/* Right Side: Interactive Mockup and Settings (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Vertical Smartphone WhatsApp Mockup Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-4 shadow-xl relative overflow-hidden max-w-sm mx-auto">
            
            {/* Phone Speaker & Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-28 bg-black rounded-full z-20 flex items-center justify-center gap-1">
              <div className="h-1 w-8 bg-slate-800 rounded-full" />
              <div className="h-1.5 w-1.5 bg-slate-900 rounded-full" />
            </div>

            {/* Smartphone screen boundary */}
            <div className="bg-[#E5DDD5] rounded-[32px] overflow-hidden border-2 border-slate-950 relative z-10 flex flex-col min-h-[520px]">
              
              {/* WhatsApp Mock App Header */}
              <div className="bg-[#075E54] text-white pt-6 pb-3 px-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-slate-300 rounded-full border border-white/20 flex items-center justify-center text-slate-700 font-extrabold text-xs relative overflow-hidden">
                    <span className="material-symbols-outlined text-lg">support_agent</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black tracking-wide">Karam AI Broadcast</span>
                    <span className="text-[8px] font-bold text-emerald-200 flex items-center gap-1">
                      <span className="h-1 w-1 bg-emerald-300 rounded-full animate-pulse" />
                      verified active automation
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-white/80">
                  <span className="material-symbols-outlined text-sm font-black">videocam</span>
                  <span className="material-symbols-outlined text-sm font-black">call</span>
                  <span className="material-symbols-outlined text-sm font-black font-black">more_vert</span>
                </div>
              </div>

              {/* Chat Canvas Backing with watermark look */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[380px] min-h-[340px] flex flex-col justify-end">
                
                {/* Simulated timestamp header */}
                <div className="mx-auto bg-white/70 backdrop-blur-xs text-[9px] text-slate-500 font-bold px-2 py-0.5 rounded-md shadow-3xs uppercase tracking-wider select-none mb-2">
                  Today
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="bg-[#DCF8C6] border border-[#C5E1B0] max-w-[90%] text-slate-800 rounded-2xl rounded-tr-none px-3 py-2.5 shadow-sm text-[11.5px] leading-relaxed relative ml-auto">
                  
                  {/* Bubble body content with parsed formatting */}
                  <div 
                    dangerouslySetInnerHTML={{ __html: parseWhatsAppFormatting(messageBody) }} 
                    className="font-sans break-words select-text selection:bg-emerald-200"
                  />

                  {/* Bubble timestamp & double check mark */}
                  <div className="text-right text-[8px] text-slate-400 font-semibold mt-1.5 flex items-center justify-end gap-0.5 select-none">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="material-symbols-outlined text-[10px] text-blue-500 font-extrabold">done_all</span>
                  </div>
                </div>

              </div>

              {/* Chat Input Footer Bar Mockup */}
              <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2 border-t border-slate-200">
                <div className="flex-1 bg-white h-7 px-3 rounded-full flex items-center justify-between text-[10px] text-slate-400">
                  <span>Message...</span>
                  <span className="material-symbols-outlined text-slate-400 text-xs">attach_file</span>
                </div>
                <div className="h-7 w-7 bg-[#075E54] text-white rounded-full flex items-center justify-center">
                  <Send className="h-3 w-3" />
                </div>
              </div>

            </div>
          </div>

          {/* 2. Interactive Mock Preview Configurator card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
                Mockup Custom Preview Data Settings
              </h3>
              <p className="text-slate-400 text-[10px] font-semibold mt-0.5">
                Alter these test attributes to preview variable replacement dynamically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Assigned Telecaller
                </label>
                <input
                  type="text"
                  value={mockTelecaller}
                  onChange={(e) => setMockTelecaller(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Project Interest
                </label>
                <input
                  type="text"
                  value={mockInterest}
                  onChange={(e) => setMockInterest(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Budget Tier
                </label>
                <input
                  type="text"
                  value={mockBudget}
                  onChange={(e) => setMockBudget(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Company Name
                </label>
                <input
                  type="text"
                  value={mockCompany}
                  onChange={(e) => setMockCompany(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Lead Intake Automation Webhook Simulation Terminal */}
      <div id="lead-intake-automation-terminal" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Cpu className="h-2.5 w-2.5" />
                Live API Sandbox
              </span>
              <span className="bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Round-Robin Assignment
              </span>
            </div>
            <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-emerald-400 animate-pulse" />
              Meta / Facebook Webhook Lead Intake Simulation Panel
            </h3>
            <p className="text-slate-400 text-xs font-semibold mt-1">
              Test full-cycle automation from lead creation, round-robin telecaller allocation, to WhatsApp triggers.
            </p>
          </div>

          <button
            onClick={runLeadIntakeTest}
            disabled={isRunningSimulation}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none ${
              isRunningSimulation
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-md active:scale-95"
            }`}
          >
            {isRunningSimulation ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Running Test...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                <span>Run Intake Simulation</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Simulation variables configuration */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                Webhook Simulation Payload
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Lead Name
                  </label>
                  <input
                    type="text"
                    value={simulatedLeadName}
                    onChange={(e) => setSimulatedLeadName(e.target.value)}
                    disabled={isRunningSimulation}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-55"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Lead Phone
                  </label>
                  <input
                    type="text"
                    value={simulatedPhone}
                    onChange={(e) => setSimulatedPhone(e.target.value)}
                    disabled={isRunningSimulation}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-55"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Project Interest Requirement
                  </label>
                  <input
                    type="text"
                    value={simulatedProject}
                    onChange={(e) => setSimulatedProject(e.target.value)}
                    disabled={isRunningSimulation}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-55"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Traffic Source
                  </label>
                  <select
                    value={simulatedSource}
                    onChange={(e: any) => setSimulatedSource(e.target.value)}
                    disabled={isRunningSimulation}
                    className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-55"
                  >
                    <option value="Facebook_Ads">Facebook Ads</option>
                    <option value="Meta_Ads">Meta Instagram Ads</option>
                    <option value="Website">Website Contact</option>
                    <option value="Manual">Manual Telecaller Input</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Lead Email
                  </label>
                  <input
                    type="text"
                    value={simulatedEmail}
                    onChange={(e) => setSimulatedEmail(e.target.value)}
                    disabled={isRunningSimulation}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-55"
                  />
                </div>
              </div>
            </div>

            {/* Simulated Active Telecallers list info */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  Sequential Round-Robin Queue
                </span>
                <span className="text-[9px] text-slate-500 font-bold">3 Active Callers</span>
              </div>

              <div className="space-y-1.5">
                {simulatedCallers.map((caller, idx) => (
                  <div key={caller.id} className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 font-bold">Queue {idx + 1}</span>
                      <span className="font-extrabold text-slate-300">{caller.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                        {caller.user_role}
                      </span>
                      <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Immersive Terminal Output Log console */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden min-h-[300px]">
            
            {/* Terminal Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 bg-rose-500 rounded-full" />
                  <span className="h-2.5 w-2.5 bg-amber-500 rounded-full" />
                  <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full" />
                </div>
                <span className="font-mono text-[10px] text-slate-400 font-black tracking-wide ml-2">karam_ai_test_runner.sh</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500 font-black">
                STDOUT/STDERR logs
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 font-mono text-xs text-slate-300 space-y-2 overflow-y-auto max-h-[340px] bg-slate-950 select-text">
              {simulationLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
                  <TerminalIcon className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
                  <p className="font-semibold text-xs text-slate-500">Terminal Idle.</p>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-sm">
                    Click the "Run Intake Simulation" button above to fire custom payloads and observe telecaller routing logs in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {simulationLogs.map((log, index) => {
                    let isSuccess = log.includes("✅") || log.includes("🎉") || log.includes("Success");
                    let isError = log.includes("❌") || log.includes("Failed");
                    let textClass = "text-slate-300";
                    if (isSuccess) textClass = "text-emerald-400 font-semibold";
                    else if (isError) textClass = "text-rose-400 font-semibold";
                    else if (log.includes("🚀") || log.includes("➡️")) textClass = "text-cyan-400 font-bold";
                    
                    return (
                      <div key={index} className={`leading-relaxed whitespace-pre-wrap ${textClass}`}>
                        {log}
                      </div>
                    );
                  })}
                  
                  {isRunningSimulation && (
                    <div className="flex items-center gap-2 text-cyan-400 animate-pulse font-bold">
                      <span>_</span>
                      <span className="h-3 w-1.5 bg-cyan-400 animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Terminal Footer */}
            <div className="bg-slate-900/60 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
              <span>Environment: Local Container Run</span>
              <span className="font-mono">Exit Code: {simulationLogs.length > 0 && !isRunningSimulation ? "0" : "--"}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
