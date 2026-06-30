import React, { useState } from "react";
import { Lead, Client, Project, TenantProfile } from "../types";

interface LeadsViewProps {
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  tenantProfile: TenantProfile;
  activeRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  onAddLead: (lead: Omit<Lead, "id" | "created_at" | "tenant_id">) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: 'New' | 'Quoted' | 'Follow-up') => void;
  onConvertLeadToEstimate: (lead: Lead) => void;
  onOpenUpgradeModal: () => void;
}

export default function LeadsView({
  leads = [],
  clients = [],
  projects = [],
  tenantProfile,
  activeRole,
  onAddLead,
  onUpdateLeadStatus,
  onConvertLeadToEstimate,
  onOpenUpgradeModal,
}: LeadsViewProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  
  // Form states for new lead
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<'Meta Ads' | 'WhatsApp' | 'Google Search' | 'Referral'>("Meta Ads");
  const [status, setStatus] = useState<'New' | 'Quoted' | 'Follow-up'>("New");

  const [filterSource, setFilterSource] = useState<string>("All");

  const plan = tenantProfile?.subscription_plan || "Free Trial";
  const isProOrEnterprise = plan === "Pro Growth" || plan === "Enterprise Matrix";

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !phoneNumber.trim() || !location.trim()) return;

    onAddLead({
      client_name: clientName.trim(),
      phone_number: phoneNumber.trim(),
      location: location.trim(),
      source,
      status,
    });

    // Reset Form
    setClientName("");
    setPhoneNumber("");
    setLocation("");
    setSource("Meta Ads");
    setStatus("New");
    setIsAddLeadOpen(false);
  };

  // Pre-populate some sandbox leads for visual polish if empty in Pro mode
  const activeLeads = leads.length > 0 ? leads : [
    {
      id: "ld-sandbox-1",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      client_name: "Vikram Malhotra",
      phone_number: "+91 99887 76655",
      location: "DLF Phase 3, Gurgaon",
      source: "Meta Ads" as const,
      status: "New" as const,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "ld-sandbox-2",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      client_name: "Ananya Deshmukh",
      phone_number: "+91 98765 00112",
      location: "Kharadi, Pune",
      source: "WhatsApp" as const,
      status: "Follow-up" as const,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "ld-sandbox-3",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      client_name: "Sanjay Singhal",
      phone_number: "+91 95400 12345",
      location: "Sector 15, Noida",
      source: "Google Search" as const,
      status: "Quoted" as const,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    }
  ];

  const filteredLeads = activeLeads.filter(
    (lead) => filterSource === "All" || lead.source === filterSource
  );

  const leadsByStatus = {
    "New": filteredLeads.filter((l) => l.status === "New"),
    "Quoted": filteredLeads.filter((l) => l.status === "Quoted"),
    "Follow-up": filteredLeads.filter((l) => l.status === "Follow-up"),
  };

  const getSourceBadge = (src: string) => {
    switch (src) {
      case "Meta Ads":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "WhatsApp":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Google Search":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getSourceIcon = (src: string) => {
    switch (src) {
      case "Meta Ads":
        return "public";
      case "WhatsApp":
        return "chat";
      case "Google Search":
        return "search";
      default:
        return "link";
    }
  };

  // Render Trial Restriction Banner & Mockup
  if (!isProOrEnterprise) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Inline Trial Warning Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <span className="material-symbols-outlined font-black">gpp_maybe</span>
              <span className="text-xs font-black uppercase tracking-widest">SaaS Trial Active</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">
              Unlock Automated Meta & WhatsApp Lead Capture with our Pro Plan
            </h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-2xl">
              Connect your CRM directly to Karam AI WhatsApp Business API and Meta Facebook Ads Webhooks. Instantly capture live buyer inquiries, parse construction floorplans via AI, and auto-populate estimate pipelines in real-time.
            </p>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="w-full md:w-auto px-5 py-3 bg-slate-900 hover:bg-black text-white font-extrabold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-black text-amber-400">workspace_premium</span>
            <span>Upgrade to Pro Growth</span>
          </button>
        </div>

        {/* Locked CRM Board Mockup with Blur */}
        <div className="relative border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[5px] z-20 flex flex-col items-center justify-center text-center p-8">
            <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm mb-4">
              <span className="material-symbols-outlined text-3xl font-black">lock</span>
            </div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
              CRM & Lead Automation Board is Locked
            </h3>
            <p className="text-slate-500 text-xs font-semibold mt-1.5 max-w-sm leading-relaxed">
              Your "Free Trial" subscription allows managing up to 3 active construction projects. Upgrade to **Pro Growth** or **Enterprise Matrix** to enable our Karam AI automated lead engine.
            </p>
            <button
              onClick={onOpenUpgradeModal}
              className="mt-5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span>View Premium Plans</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* Locked Content Preview */}
          <div className="p-6 space-y-6 opacity-30 select-none pointer-events-none">
            <div className="flex justify-between items-center">
              <div className="h-6 w-32 bg-slate-200 rounded-md" />
              <div className="h-9 w-28 bg-slate-200 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((col) => (
                <div key={col} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="h-5 w-24 bg-slate-200 rounded-md" />
                  <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                    <div className="h-4 w-28 bg-slate-200 rounded-md" />
                    <div className="h-3 w-16 bg-slate-200 rounded-md" />
                    <div className="h-6 w-full bg-slate-100 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active CRM view for Pro & Enterprise tiers
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Lead Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
              Pro Feature
            </span>
            <span className="text-slate-400 text-xs font-bold font-mono">
              Ecosystem: Powered by Karam AI
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 font-black">hub</span>
            CRM & Automated Lead Pipeline
          </h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Manage prospects and automate incoming lead transformations into white-labeled estimates.
          </p>
        </div>

        <button
          onClick={() => setIsAddLeadOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-xs">add</span>
          <span>Add Inbound Lead</span>
        </button>
      </div>

      {/* Karam AI Integration Pipeline Banner */}
      <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-15 pointer-events-none flex items-center">
          <span className="material-symbols-outlined text-[140px] font-thin text-slate-300">webhook</span>
        </div>
        <div className="relative space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Live API Integrations Status
            </span>
          </div>
          <h3 className="text-sm font-extrabold tracking-tight">
            BuildEstimate BOS Lead Webhooks — Active & Syncing
          </h3>
          <p className="text-slate-400 text-xs font-medium leading-relaxed">
            Our multi-channel CRM router automatically captures leads arriving from meta Facebook/Instagram campaigns and WhatsApp Business API inquiries. Under the <strong className="text-white">Karam AI Ecosystem</strong>, floorplan specifications are recognized from conversations and parsed into structural estimates.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
              <span className="material-symbols-outlined text-xs text-blue-400">public</span>
              <span>Meta Webhook: <strong className="text-emerald-400">Enabled</strong></span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
              <span className="material-symbols-outlined text-xs text-emerald-400">chat</span>
              <span>WhatsApp API: <strong className="text-emerald-400">Listening</strong></span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
              <span className="material-symbols-outlined text-xs text-indigo-400">robot_2</span>
              <span>Karam AI parsing: <strong className="text-emerald-400">Online</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and pipeline layout */}
      <div className="space-y-4">
        {/* Source Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {["All", "Meta Ads", "WhatsApp", "Google Search", "Referral"].map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterSource === src
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {src}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono hidden md:inline">
            Total Leads: {filteredLeads.length}
          </span>
        </div>

        {/* CRM Pipeline Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["New", "Follow-up", "Quoted"] as const).map((colStatus) => {
            const list = leadsByStatus[colStatus] || [];
            return (
              <div key={colStatus} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col min-h-[450px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      colStatus === "New" ? "bg-blue-500" : colStatus === "Follow-up" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      {colStatus}
                    </span>
                  </div>
                  <span className="bg-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                    {list.length}
                  </span>
                </div>

                {/* Leads list */}
                <div className="space-y-3 flex-grow overflow-y-auto max-h-[600px] no-scrollbar">
                  {list.length === 0 ? (
                    <div className="h-32 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <span className="material-symbols-outlined text-slate-300 text-lg">inbox</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">No Leads</p>
                    </div>
                  ) : (
                    list.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all space-y-3 flex flex-col"
                      >
                        {/* Title & Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-800 leading-tight">
                              {lead.client_name}
                            </h4>
                            <p className="text-[10px] font-semibold text-slate-400 font-mono">
                              {lead.phone_number}
                            </p>
                          </div>
                          <span className={`border px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide flex items-center gap-1 shrink-0 ${getSourceBadge(lead.source)}`}>
                            <span className="material-symbols-outlined text-[10px] font-black">
                              {getSourceIcon(lead.source)}
                            </span>
                            <span>{lead.source}</span>
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                          <span className="truncate">{lead.location}</span>
                        </div>

                        {/* Dropdown status update & Convert Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                          <select
                            value={lead.status}
                            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as any)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="New">📥 New</option>
                            <option value="Follow-up">⏳ Follow-up</option>
                            <option value="Quoted">📄 Quoted</option>
                          </select>

                          <button
                            onClick={() => onConvertLeadToEstimate(lead)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 border border-emerald-200/60 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                            title="Generate estimate for client"
                          >
                            <span className="material-symbols-outlined text-xs font-black">calculate</span>
                            <span>Convert to Estimate</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 font-black">hub</span>
                Add New Inbound Lead
              </h3>
              <button
                onClick={() => setIsAddLeadOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vikram Malhotra"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., +91 99887 76655"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Project Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sector 15, Noida"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Lead Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Meta Ads">🔵 Meta Ads</option>
                    <option value="WhatsApp">🟢 WhatsApp</option>
                    <option value="Google Search">🟡 Google Search</option>
                    <option value="Referral">⚫ Referral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Quoted">Quoted</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="flex-1 h-11 border border-slate-200 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
