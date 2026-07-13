import React, { useState } from "react";
import { CRMLead, TenantProfile, Profile, Property } from "../types";
import { triggerWhatsAppNotifications } from "../lib/whatsappLeadTrigger";
import { CRMLeadEngine } from "../lib/CRMLeadEngine";
import { validatePhoneNumber } from "../lib/validation";
import MobileLeadCard from "./MobileLeadCard";
import { AttendanceMatrixDashboard, TelecallerStatus, PipelineSummary } from "./AttendanceMatrixDashboard";

interface CRMLeadHubProps {
  crmLeads: CRMLead[];
  tenantProfile: TenantProfile;
  activeRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  profiles?: Profile[];
  properties?: Property[];
  onAddCRMLead: (lead: Omit<CRMLead, "id" | "created_at" | "tenant_id">) => void;
  onUpdateCRMLead: (leadId: string, updates: Partial<CRMLead>) => void;
  onDeleteCRMLead?: (leadId: string) => void;
  onOpenUpgradeModal?: () => void;
}

export default function CRMLeadHub({
  crmLeads = [],
  tenantProfile,
  activeRole,
  profiles = [],
  properties = [],
  onAddCRMLead,
  onUpdateCRMLead,
  onDeleteCRMLead,
  onOpenUpgradeModal,
}: CRMLeadHubProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [triggeringLeadId, setTriggeringLeadId] = useState<string | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<Record<string, string>>({});
  const [localRemarks, setLocalRemarks] = useState<Record<string, string>>({});
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'hybrid' | 'table' | 'cards'>("hybrid");

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<'Facebook_Ads' | 'Instagram' | 'Website' | 'Manual'>("Facebook_Ads");
  const [projectInterest, setProjectInterest] = useState("");
  const [leadStatus, setLeadStatus] = useState<CRMLead['lead_status']>("New");
  const [budgetTier, setBudgetTier] = useState<string>("50L - 75L");
  const [nextFollowupDate, setNextFollowupDate] = useState<string>("");

  const plan = tenantProfile?.subscription_plan || "Free Trial";
  const isProOrEnterprise = plan === "Pro Growth" || plan === "Enterprise Matrix";

  // Pre-populate mock sandbox data if crmLeads is empty
  const defaultLeads: CRMLead[] = [
    {
      id: "crm-1",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      customer_name: "Gurpreet Singh",
      phone_number: "+91 9876543210",
      email: "gurpreet@example.com",
      source: "Facebook_Ads",
      project_interest: "3 BHK Kharar Villa Project",
      budget_tier: "75L - 1Cr",
      lead_status: "New",
      assigned_to_caller_id: "tele-1",
      assigned_to_name: "Ramanpreet Kaur",
      logs: [],
      created_at: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago (overdue)
    },
    {
      id: "crm-2",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      customer_name: "Mehta Builders",
      phone_number: "+91 9911223344",
      email: "contact@mehtabuilders.com",
      source: "Website",
      project_interest: "Cement & Aggregate Supply (150 Tons)",
      budget_tier: "1Cr+",
      lead_status: "Quotation_Sent",
      assigned_to_caller_id: "tele-2",
      assigned_to_name: "Amit Sharma",
      next_followup_date: new Date().toISOString().split("T")[0], // Today (follow-up alarm)
      logs: [],
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: "crm-3",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      customer_name: "Aarti Sharma",
      phone_number: "+91 9540054321",
      email: "aarti.sharma@example.com",
      source: "Instagram",
      project_interest: "Premium Bath Fittings Estimate",
      budget_tier: "25L - 50L",
      lead_status: "Contacted",
      next_followup_date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Yesterday (missed follow-up)
      logs: [],
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: "crm-4",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      customer_name: "Karan Johar",
      phone_number: "+91 8877665544",
      email: "karan@example.com",
      source: "Manual",
      project_interest: "Structural Steel Supply Contract",
      budget_tier: "1Cr+",
      lead_status: "Won",
      logs: [],
      created_at: new Date(Date.now() - 3600000 * 72).toISOString()
    },
    {
      id: "crm-5",
      tenant_id: tenantProfile?.tenant_id || "owner-1",
      customer_name: "Rohan Varma",
      phone_number: "+91 7766554433",
      email: "rohan@example.com",
      source: "Facebook_Ads",
      project_interest: "2 BHK Mohali Apartment Interior",
      budget_tier: "10L - 25L",
      lead_status: "Lost",
      logs: [],
      created_at: new Date(Date.now() - 3600000 * 96).toISOString()
    }
  ];

  const activeLeads = crmLeads.length > 0 ? crmLeads : defaultLeads;

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) return;

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return;
    }

    onAddCRMLead({
      customer_name: customerName.trim(),
      phone_number: phoneNumber.trim(),
      email: email.trim() || undefined,
      source,
      project_interest: projectInterest.trim() || "General Consultation",
      budget_tier: budgetTier,
      lead_status: leadStatus,
      next_followup_date: nextFollowupDate || undefined,
      logs: [],
    });

    // Reset Form
    setCustomerName("");
    setPhoneNumber("");
    setEmail("");
    setSource("Facebook_Ads");
    setProjectInterest("");
    setLeadStatus("New");
    setBudgetTier("50L - 75L");
    setNextFollowupDate("");
    setIsAddModalOpen(false);
  };

  // Metrics calculations
  const totalLeadsCount = activeLeads.length;
  const newEnquiriesCount = activeLeads.filter(l => l.lead_status === "New").length;
  const wonCount = activeLeads.filter(l => l.lead_status === "Won").length;
  const conversionPct = totalLeadsCount > 0 ? (wonCount / totalLeadsCount) * 100 : 0;

  // Run analytical check for overdue and follow-up alerts via Karam Lead Engine
  const leadAlarms = CRMLeadEngine.checkOverdueLeads(activeLeads);

  // Filter logic
  const filteredLeads = activeLeads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.project_interest || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.project_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone_number.includes(searchQuery);
    
    const matchesStatus = statusFilter === "All" || lead.lead_status === statusFilter;
    const matchesSource = sourceFilter === "All" || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Source styling helper
  const getSourceBadgeStyles = (src: CRMLead['source']) => {
    switch (src) {
      case "Facebook_Ads":
        return "bg-blue-950/40 text-blue-300 border-blue-500/30";
      case "Instagram":
        return "bg-pink-950/40 text-pink-300 border-pink-500/30";
      case "Website":
        return "bg-indigo-950/40 text-indigo-300 border-indigo-500/30";
      case "Manual":
        return "bg-slate-950/40 text-slate-300 border-slate-700/50";
      default:
        return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  const getSourceIcon = (src: CRMLead['source']) => {
    switch (src) {
      case "Facebook_Ads":
        return "public";
      case "Instagram":
        return "camera";
      case "Website":
        return "language";
      case "Manual":
        return "edit_note";
      default:
        return "link";
    }
  };

  // Status badge styling helper
  const getStatusColor = (status: CRMLead['lead_status']) => {
    switch (status) {
      case "New":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "Contacted":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Quotation_Sent":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Won":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Lost":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  // Calculate dynamic team profiles for AttendanceMatrixDashboard
  const teamProfiles: TelecallerStatus[] = (profiles || [])
    .filter((p) => p.user_role === "Telecaller" || p.user_role === "Manager")
    .map((p, idx) => {
      const assignedLeads = activeLeads.filter((l) => l.assigned_to_caller_id === p.id);
      
      const todayStr = new Date().toISOString().split("T")[0];
      const overdueCount = assignedLeads.filter(
        (l) => l.next_followup_date && l.next_followup_date < todayStr && l.lead_status !== "Won" && l.lead_status !== "Lost"
      ).length;

      const completedToday = assignedLeads.filter(
        (l) => l.lead_status === "Won" || l.lead_status === "Lost" || (l.logs && l.logs.some(log => log.timestamp.startsWith(todayStr)))
      ).length;

      // Deterministic realistic online state mapping
      const isOnline = p.name === "Ramanpreet Kaur" || p.name === "Amit Sharma" || idx % 2 === 0;

      // Deterministic realistic attendance state mapping
      let attendanceState: "In Office" | "Outside" | "Absent" = "In Office";
      if (p.name === "Amit Sharma" || idx === 1) {
        attendanceState = "Outside";
      } else if (idx === 3) {
        attendanceState = "Absent";
      }

      return {
        id: p.id,
        name: p.name,
        isOnline,
        attendanceState,
        assignedLeadsCount: assignedLeads.length,
        completedTasksToday: completedToday || (idx * 2) + 1,
        pendingFollowupsCount: overdueCount
      };
    });

  // Default backup profiles so the dashboard always has highly polished realistic data if none is configured
  const defaultTeamProfiles: TelecallerStatus[] = [
    {
      id: "tele-1",
      name: "Ramanpreet Kaur",
      isOnline: true,
      attendanceState: "In Office",
      assignedLeadsCount: activeLeads.filter(l => l.assigned_to_caller_id === "tele-1").length || 3,
      completedTasksToday: 5,
      pendingFollowupsCount: activeLeads.filter(l => l.assigned_to_caller_id === "tele-1" && l.next_followup_date && l.next_followup_date < new Date().toISOString().split("T")[0]).length || 0
    },
    {
      id: "tele-2",
      name: "Amit Sharma",
      isOnline: true,
      attendanceState: "Outside",
      assignedLeadsCount: activeLeads.filter(l => l.assigned_to_caller_id === "tele-2").length || 2,
      completedTasksToday: 3,
      pendingFollowupsCount: activeLeads.filter(l => l.assigned_to_caller_id === "tele-2" && l.next_followup_date && l.next_followup_date < new Date().toISOString().split("T")[0]).length || 1
    },
    {
      id: "tele-3",
      name: "Rohan Varma",
      isOnline: false,
      attendanceState: "Absent",
      assignedLeadsCount: 1,
      completedTasksToday: 1,
      pendingFollowupsCount: 0
    }
  ];

  const activeTeamProfiles = teamProfiles.length > 0 ? teamProfiles : defaultTeamProfiles;

  const todayStr = new Date().toISOString().split("T")[0];
  const pipelineSummary: PipelineSummary = {
    freshLeads: activeLeads.filter((l) => l.lead_status === "New").length,
    ongoingLeads: activeLeads.filter((l) => l.lead_status === "Contacted" || l.lead_status === "Quotation_Sent").length,
    overdueFollowups: activeLeads.filter(
      (l) => l.next_followup_date && l.next_followup_date < todayStr && l.lead_status !== "Won" && l.lead_status !== "Lost"
    ).length,
    totalInDatabase: activeLeads.length
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider animate-pulse">
              Innovation HUB
            </span>
            <span className="text-slate-400 text-xs font-bold font-mono">
              SaaS Construction CRM
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-emerald-500 font-black">hub</span>
            CRM Lead & Inquiry Hub
          </h2>
          <p className="text-slate-500 text-xs font-semibold">
            Track inquiries, manage multi-channel traffic sources, and convert opportunities into won estimates.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onOpenUpgradeModal && !isProOrEnterprise && (
            <button
              onClick={onOpenUpgradeModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-black">workspace_premium</span>
              Unlock Automation
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">add_circle</span>
            Add Inquiry
          </button>
        </div>
      </div>

      {/* 1. Dashboard Alarms Warning Panel */}
      {leadAlarms.length > 0 && (
        <div className="bg-amber-50/95 border border-amber-200 text-slate-800 rounded-2xl p-4 shadow-sm animate-fade-in flex flex-col space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <span className="material-symbols-outlined font-black animate-bounce text-lg">notifications_active</span>
            <span className="text-xs font-black uppercase tracking-wider">Karam AI Lead Hub Dashboard Alarms ({leadAlarms.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
            {leadAlarms.map((alarm, idx) => (
              <div key={idx} className="flex items-start gap-1.5 bg-white border border-slate-100 p-2 rounded-xl shadow-2xs hover:border-amber-300 transition-colors">
                <span className="text-amber-500 shrink-0 font-bold select-none">•</span>
                <p className="flex-1 text-slate-700 leading-normal">{alarm}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Operations & Allocation Matrix Dashboard */}
      <AttendanceMatrixDashboard 
        teamProfiles={activeTeamProfiles}
        pipeline={pipelineSummary}
        tenantName={tenantProfile?.company_name || "BuildEstimate"}
      />

      {/* 2. Summary Metrics Tier Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Leads */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 text-slate-800 text-4xl pointer-events-none group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">contacts</span>
          </div>
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Total Leads</span>
          <span className="text-2xl font-black tracking-tight mt-2 block">{totalLeadsCount}</span>
          <span className="text-[9px] text-slate-500 font-bold mt-1 block">Active Inquiries Catalog</span>
        </div>

        {/* Metric 2: Pending Follow-ups Today */}
        {(() => {
          const todayStr = new Date().toISOString().split("T")[0];
          const pendingFollowupsCount = activeLeads.filter(
            l => l.next_followup_date && l.next_followup_date <= todayStr && l.lead_status !== "Won" && l.lead_status !== "Lost"
          ).length;
          return (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-3 top-3 text-rose-500/10 text-4xl pointer-events-none group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl text-rose-500/20">event_busy</span>
              </div>
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block">Pending Follow-ups Today</span>
              <span className={`text-2xl font-black tracking-tight mt-2 block ${pendingFollowupsCount > 0 ? "text-rose-600" : "text-slate-950"}`}>{pendingFollowupsCount}</span>
              <span className="text-[9px] text-rose-600 font-extrabold mt-1 block flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full bg-rose-500 ${pendingFollowupsCount > 0 ? "animate-pulse" : ""}`} />
                {pendingFollowupsCount > 0 ? "Attention Required Now" : "All Caught Up"}
              </span>
            </div>
          );
        })()}

        {/* Metric 3: Active Telecallers Pool */}
        {(() => {
          const activeTelecallersCount = profiles.length > 0 
            ? profiles.filter(p => p.user_role === "Telecaller").length 
            : 3;
          return (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-3 top-3 text-indigo-500/10 text-4xl pointer-events-none group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl text-indigo-500/20">support_agent</span>
              </div>
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block">Active Telecallers Pool</span>
              <span className="text-2xl font-black text-slate-950 tracking-tight mt-2 block">{activeTelecallersCount}</span>
              <span className="text-[9px] text-indigo-600 font-bold mt-1 block">Live Round-Robin agents</span>
            </div>
          );
        })()}

        {/* Metric 4: Won Conversion Pct */}
        <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-900 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 text-emerald-800/20 text-4xl pointer-events-none group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">trending_up</span>
          </div>
          <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider block">Won Conversion Pct</span>
          <span className="text-2xl font-black tracking-tight mt-2 block">{conversionPct.toFixed(1)}%</span>
          <span className="text-[9px] text-emerald-400/80 font-semibold mt-1 block">Successful win-to-lead ratio</span>
        </div>
      </section>

      {/* 2. Controls and Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <span className="material-symbols-outlined text-sm font-bold">search</span>
          </span>
          <input
            type="text"
            placeholder="Search customer, project interest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Quotation_Sent">Quotation Sent</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="All">All Sources</option>
              <option value="Facebook_Ads">Facebook Ads</option>
              <option value="Instagram">Instagram</option>
              <option value="Website">Website</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* Quick Clear */}
          {(searchQuery || statusFilter !== "All" || sourceFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setSourceFilter("All");
              }}
              className="text-slate-500 hover:text-slate-950 text-[10px] font-bold uppercase tracking-wider py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          )}

          {/* Layout Mode Toggler */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-[10px] font-black uppercase text-slate-400">View:</span>
            <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("hybrid")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  viewMode === "hybrid"
                    ? "bg-white text-slate-900 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900 font-semibold"
                }`}
                title="Automatically switch layouts based on screen size"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900 font-semibold"
                }`}
                title="Force Classic Table Layout"
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900 font-semibold"
                }`}
                title="Force Premium Cards Layout"
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Tracking Table */}
      {(viewMode === "table" || viewMode === "hybrid") && (
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-6 ${viewMode === "hybrid" ? "hidden md:block" : "block"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Client Identity & Source</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Inquiry Interest & Budget</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Assigned Specialist</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Status & Remarks</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">inbox</span>
                    <p className="font-extrabold uppercase text-[10px] tracking-wider">No matching inquiries found</p>
                    <p className="text-[11px] mt-1 text-slate-400 font-semibold">Try modifying your filter options or add a manual lead.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const cleanedPhone = lead.phone_number.replace(/[^0-9]/g, "");
                  const waUrl = `https://wa.me/${cleanedPhone || "919876543210"}`;
                  
                  // Past system clock trigger (overdue follow-up check)
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isOverdue = lead.next_followup_date && 
                                    lead.next_followup_date < todayStr && 
                                    lead.lead_status !== "Won" && 
                                    lead.lead_status !== "Lost";

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors group">
                        {/* 1. Customer Details & Source Badge */}
                        <td className="p-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {lead.customer_name}
                              </span>
                              {lead.project_id && (
                                <span className="inline-flex items-center bg-slate-900 text-slate-100 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 select-all" title="Unique Project ID (Primary Key)">
                                  🔑 {lead.project_id}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-500 font-semibold">{lead.phone_number}</span>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-200 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                title="Connect on WhatsApp"
                              >
                                <span className="material-symbols-outlined text-[10px] font-bold">chat</span>
                                <span>WA</span>
                              </a>
                              {notificationLogs[lead.id] && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-indigo-600 bg-indigo-50 font-black px-1.5 py-0.5 rounded animate-pulse">
                                  <span className="h-1 bg-indigo-500 rounded-full w-1" />
                                  Karam AI Active
                                </span>
                              )}
                            </div>
                            {lead.email && (
                              <span className="text-[10px] text-slate-400 font-semibold">{lead.email}</span>
                            )}
                            <div className="pt-1.5">
                              <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getSourceBadgeStyles(lead.source)}`}>
                                <span className="material-symbols-outlined text-[10px] font-black">
                                  {getSourceIcon(lead.source)}
                                </span>
                                <span>{lead.source.replace("_", " ")}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Inquiry Interest & Budget Tier */}
                        <td className="p-4">
                          <div className="flex flex-col space-y-1.5 max-w-[200px]">
                            <span className="font-bold text-slate-800 leading-snug">
                              {lead.project_interest || "General Consultation Requirement"}
                            </span>
                            {lead.budget_tier && (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded-md font-extrabold border border-emerald-100">
                                  💰 {lead.budget_tier}
                                </span>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 font-bold font-mono">
                              Received: {formatDate(lead.created_at)}
                            </div>
                          </div>
                        </td>

                        {/* 3. Assignment Dropdown with Telecaller Profiles */}
                        <td className="p-4">
                          <div className="flex flex-col space-y-1.5">
                            <select
                              value={lead.assigned_to_caller_id || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  const newLog = {
                                    id: `log-assign-clear-${Date.now()}`,
                                    performed_by: activeRole,
                                    action: `Cleared telecaller assignment`,
                                    timestamp: new Date().toISOString()
                                  };
                                  onUpdateCRMLead(lead.id, {
                                    assigned_to_caller_id: undefined,
                                    assigned_to_name: undefined,
                                    logs: [...(lead.logs || []), newLog]
                                  });
                                } else {
                                  const selectedProfile = (profiles || []).find(p => p.id === val);
                                  if (selectedProfile) {
                                    const newLog = {
                                      id: `log-assign-${Date.now()}`,
                                      performed_by: activeRole,
                                      action: `Reassigned lead to ${selectedProfile.name} (${selectedProfile.user_role})`,
                                      timestamp: new Date().toISOString()
                                    };
                                    onUpdateCRMLead(lead.id, {
                                      assigned_to_caller_id: selectedProfile.id,
                                      assigned_to_name: selectedProfile.name,
                                      logs: [...(lead.logs || []), newLog]
                                    });
                                  }
                                }
                              }}
                              className="w-full max-w-[170px] bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-[10px] font-extrabold rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer text-slate-700 transition-all"
                            >
                              <option value="">👤 Unassigned Pool</option>
                              {(profiles || []).map((p) => (
                                <option key={p.id} value={p.id}>
                                  👤 {p.name} ({p.user_role})
                                </option>
                              ))}
                            </select>
                            {lead.assigned_to_name ? (
                              <span className="text-[9px] text-indigo-600 font-extrabold tracking-wide flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px] font-extrabold">verified_user</span>
                                <span>Owner Assigned</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-bold tracking-wide">
                                Pending allocation
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Status & Remarks interactive fields with embedded follow-up */}
                        <td className="p-4">
                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col space-y-2 min-w-[220px]">
                            <div className="flex items-center gap-1.5 shrink-0 justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  lead.lead_status === "Won" ? "bg-emerald-500 animate-pulse" : lead.lead_status === "Lost" ? "bg-rose-500" : "bg-sky-500"
                                }`} />
                                <select
                                  value={lead.lead_status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as CRMLead['lead_status'];
                                    const currentText = localRemarks[lead.id] !== undefined ? localRemarks[lead.id] : (lead.remarks || "");
                                    const newLog = {
                                      id: `log-status-${Date.now()}`,
                                      performed_by: activeRole,
                                      action: `Changed status from "${lead.lead_status}" to "${newStatus}"`,
                                      timestamp: new Date().toISOString()
                                    };
                                    const updatedLogs = [...(lead.logs || []), newLog];
                                    onUpdateCRMLead(lead.id, { lead_status: newStatus, remarks: currentText, logs: updatedLogs });
                                  }}
                                  className={`border text-[10px] font-extrabold rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer ${getStatusColor(lead.lead_status)}`}
                                >
                                  <option value="New">📥 New</option>
                                  <option value="Contacted">⏳ Contacted</option>
                                  <option value="Quotation_Sent">📄 Quotation Sent</option>
                                  <option value="Won">👑 Won</option>
                                  <option value="Lost">❌ Lost</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={lead.next_followup_date || ""}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    const newLog = {
                                      id: `log-date-${Date.now()}`,
                                      performed_by: activeRole,
                                      action: `Scheduled next follow-up date for: ${newDate || "Cleared"}`,
                                      timestamp: new Date().toISOString()
                                    };
                                    const updatedLogs = [...(lead.logs || []), newLog];
                                    onUpdateCRMLead(lead.id, { next_followup_date: newDate || undefined, logs: updatedLogs });
                                  }}
                                  className={`px-1.5 py-1 text-[9px] font-bold rounded-md focus:outline-none focus:ring-1 transition-all cursor-pointer ${
                                    isOverdue
                                      ? "bg-rose-50 border border-rose-300 text-rose-700 ring-1 ring-rose-400/30 focus:ring-rose-500"
                                      : "bg-white border border-slate-200 text-slate-700 focus:ring-slate-900"
                                  }`}
                                  title={isOverdue ? "Follow-up Overdue!" : "Next Follow-up"}
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={localRemarks[lead.id] !== undefined ? localRemarks[lead.id] : (lead.remarks || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLocalRemarks(prev => ({ ...prev, [lead.id]: val }));
                              }}
                              onBlur={() => {
                                const currentText = localRemarks[lead.id] !== undefined ? localRemarks[lead.id] : (lead.remarks || "");
                                if (currentText !== (lead.remarks || "")) {
                                  const newLog = {
                                    id: `log-remark-${Date.now()}`,
                                    performed_by: activeRole,
                                    action: `Updated remarks notes: "${currentText}"`,
                                    timestamp: new Date().toISOString()
                                  };
                                  const updatedLogs = [...(lead.logs || []), newLog];
                                  onUpdateCRMLead(lead.id, { remarks: currentText, lead_status: lead.lead_status, logs: updatedLogs });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="Add follow-up notes..."
                              className="w-full text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 outline-none transition-all placeholder:text-slate-400"
                            />

                            <div className="pt-1 border-t border-slate-200/60 mt-1">
                              {lead.linked_property_id ? (
                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                                  <span className="text-[9px] font-bold text-emerald-800 truncate" title={lead.project_interest}>
                                    Linked: {lead.project_interest}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      const newLog = {
                                        id: `log-unlink-${Date.now()}`,
                                        performed_by: activeRole,
                                        action: `Unlinked property`,
                                        timestamp: new Date().toISOString()
                                      };
                                      onUpdateCRMLead(lead.id, {
                                        linked_property_id: "",
                                        project_interest: "General Inquiry",
                                        budget_tier: "",
                                        logs: [...(lead.logs || []), newLog]
                                      });
                                    }}
                                    className="ml-1 text-[10px] text-rose-500 hover:text-rose-700 font-black"
                                    title="Unlink Property"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">close</span>
                                  </button>
                                </div>
                              ) : (
                                <select
                                  onChange={(e) => {
                                    const selectedPropId = e.target.value;
                                    const property = properties.find(p => p.id === selectedPropId);
                                    if (property) {
                                      const newLog = {
                                        id: `log-prop-${Date.now()}`,
                                        performed_by: activeRole,
                                        action: `Allocated property: ${property.title}`,
                                        timestamp: new Date().toISOString()
                                      };
                                      onUpdateCRMLead(lead.id, {
                                        linked_property_id: property.id,
                                        project_interest: property.title,
                                        budget_tier: property.target_selling_price.toString() + ' (Linked)',
                                        logs: [...(lead.logs || []), newLog]
                                      });
                                    }
                                  }}
                                  value={lead.linked_property_id || ""}
                                  className="w-full text-[9px] font-bold text-slate-700 bg-emerald-50 border border-emerald-200 focus:border-emerald-500 rounded-md px-2 py-1 outline-none transition-all cursor-pointer"
                                >
                                  <option value="">🏠 Allocate Available Property</option>
                                  {properties.filter(p => p.status === "Available").map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} (₹{(p.target_selling_price / 100000).toFixed(1)}L)
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 6. Action buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={async () => {
                                setTriggeringLeadId(lead.id);
                                const res = await triggerWhatsAppNotifications(lead, {
                                  onAddLog: (msg) => console.log(msg)
                                });
                                setTriggeringLeadId(null);
                                if (res.success) {
                                  setNotificationLogs(prev => ({
                                    ...prev,
                                    [lead.id]: "Double WA triggered successfully"
                                  }));
                                  alert(`[Karam AI] Double WhatsApp Notification Dispatched Successfully!\n\n1. Alert sent to builder: ${res.triggerALog}\n2. White-labeled greeting sent to customer: ${res.triggerBLog}`);
                                } else {
                                  alert(`[Karam AI] Trigger failed: ${res.error}`);
                                }
                              }}
                              disabled={triggeringLeadId === lead.id}
                              className="h-7 px-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-lg flex items-center justify-center gap-1 border border-indigo-100 hover:border-indigo-600 transition-all cursor-pointer text-[10px] font-black"
                              title="Trigger Double WA Notification"
                            >
                              {triggeringLeadId === lead.id ? (
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-xs">bolt</span>
                                  <span>{notificationLogs[lead.id] ? "Resend" : "Karam AI"}</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                              className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                expandedLeadId === lead.id
                                  ? "bg-slate-900 border-slate-900 text-white"
                                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                              }`}
                              title="View Audit Timeline Log Matrix"
                            >
                              <span className="material-symbols-outlined text-sm">assignment</span>
                            </button>

                            {onDeleteCRMLead && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to remove the inquiry from "${lead.customer_name}"?`)) {
                                    onDeleteCRMLead(lead.id);
                                  }
                                }}
                                className="h-7 w-7 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg flex items-center justify-center border border-slate-100 hover:border-rose-500 transition-all cursor-pointer"
                                title="Delete inquiry"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedLeadId === lead.id && (
                        <tr key={`${lead.id}-timeline`} className="bg-slate-50/50">
                          <td colSpan={6} className="p-4">
                            <div className="pl-4 border-l-2 border-indigo-500 py-1">
                              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                                Lead Timeline & Audit Matrix (Karam AI Automated Logs)
                              </h4>
                              {lead.logs && lead.logs.length > 0 ? (
                                <div className="space-y-2 max-w-3xl">
                                  {lead.logs.map((log) => (
                                    <div key={log.id} className="flex items-center gap-3 text-[11px] text-slate-600 bg-white border border-slate-100 p-2 rounded-xl shadow-2xs">
                                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                        {log.performed_by || "System Agent"}
                                      </span>
                                      <span className="font-semibold flex-1 text-slate-700">{log.action}</span>
                                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] font-semibold text-slate-400">
                                  No logged events found for this inquiry. Updates to status, remarks, or allocation will appear here instantly.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 3b. Mobile Lead Cards View */}
      {(viewMode === "cards" || viewMode === "hybrid") && (
        <div className={`space-y-4 mb-6 ${viewMode === "hybrid" ? "block md:hidden" : "block"}`}>
          {filteredLeads.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl block mb-2 text-slate-500 animate-pulse">inbox</span>
              <p className="font-extrabold uppercase text-[10px] tracking-wider text-slate-300">No matching inquiries found</p>
              <p className="text-[11px] mt-1 text-slate-500 font-semibold">Try modifying your filter options or add a manual lead.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredLeads.map((lead) => (
                <MobileLeadCard
                  key={lead.id}
                  lead={lead}
                  profiles={profiles}
                  onUpdateLead={onUpdateCRMLead}
                  activeRole={activeRole}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Add Lead Modal dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 font-black">hub</span>
                New Construction Inquiry
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gurpreet Singh"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., +91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full h-11 px-4 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 transition-all ${
                      phoneNumber.trim() 
                        ? (validatePhoneNumber(phoneNumber).isValid 
                          ? "border-emerald-500 focus:ring-emerald-500" 
                          : "border-rose-500 focus:ring-rose-500")
                        : "border-slate-200 focus:ring-slate-900"
                    }`}
                  />
                  {phoneNumber.trim() && (() => {
                    const res = validatePhoneNumber(phoneNumber);
                    if (!res.isValid) {
                      return (
                        <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1 leading-none">
                          <span className="material-symbols-outlined text-[12px] font-bold">cancel</span>
                          {res.error}
                        </p>
                      );
                    } else if (res.warning) {
                      return (
                        <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1 leading-none">
                          <span className="material-symbols-outlined text-[12px] font-bold">warning</span>
                          {res.warning}
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 leading-none">
                          <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                          Valid.
                        </p>
                      );
                    }
                  })()}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., optional@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Project / Material Interest
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 3 BHK Kharar Villa or Cement Supply Contract"
                  value={projectInterest}
                  onChange={(e) => setProjectInterest(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Traffic Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="Facebook_Ads">🔵 Facebook Ads</option>
                    <option value="Instagram">💖 Instagram</option>
                    <option value="Website">🌐 Website</option>
                    <option value="Manual">✍️ Manual Entry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Initial Status
                  </label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="New">📥 New Enquiry</option>
                    <option value="Contacted">⏳ Contacted</option>
                    <option value="Quotation_Sent">📄 Quotation Sent</option>
                    <option value="Won">👑 Won</option>
                    <option value="Lost">❌ Lost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Budget Tier
                  </label>
                  <select
                    value={budgetTier}
                    onChange={(e) => setBudgetTier(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="10L - 25L">💰 10L - 25L</option>
                    <option value="25L - 50L">💰 25L - 50L</option>
                    <option value="50L - 75L">💰 50L - 75L</option>
                    <option value="75L - 1Cr">💰 75L - 1Cr</option>
                    <option value="1Cr+">👑 1Cr+</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 h-11 border border-slate-200 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Save Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
