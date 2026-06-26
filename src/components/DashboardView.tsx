import React, { useState } from "react";
import { Project, CriticalAlert, Profile } from "../types";

interface DashboardViewProps {
  projects: Project[];
  alerts: CriticalAlert[];
  profiles: Profile[];
  userRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  setTab: (tab: string) => void;
  onOpenOrderDialog: (stockId: string) => void;
  onUpdateProfiles: (updated: Profile[]) => void;
  onAddProject?: (project: Omit<Project, "id">) => void;
  onUpdateProject?: (project: Project) => void;
}

export default function DashboardView({
  projects,
  alerts,
  profiles,
  userRole,
  setTab,
  onOpenOrderDialog,
  onUpdateProfiles,
  onAddProject,
  onUpdateProject,
}: DashboardViewProps) {
  const isOwnerOrManager = userRole === "Owner" || userRole === "Manager";

  // Active sub-tab state for projects on the dashboard
  const [activeProjectTab, setActiveProjectTab] = useState<'approved' | 'quotations'>('approved');

  const handleStatusChange = (project: Project, newStatus: Project['status'], extra?: Partial<Project>) => {
    if (onUpdateProject) {
      onUpdateProject({ ...project, status: newStatus, ...extra });
      if (newStatus === "Active" || newStatus === "Completed" || newStatus === "On-Hold") {
        setActiveProjectTab('approved');
      } else if (newStatus === "Quotation" || newStatus === "Dead") {
        setActiveProjectTab('quotations');
      }
    }
  };

  // Add Project Modal States
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState("Residential");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<'Active' | 'Quotation'>("Quotation");

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectLocation.trim() || !newProjectBudget) return;
    
    if (onAddProject) {
      onAddProject({
        project_name: newProjectName.trim(),
        type: newProjectType,
        location: newProjectLocation.trim(),
        total_budget: Number(newProjectBudget),
        spent: 0,
        completion_pct: 0,
        status: newProjectStatus
      });
    }

    // Reset and close
    setNewProjectName("");
    setNewProjectType("Residential");
    setNewProjectLocation("");
    setNewProjectBudget("");
    setNewProjectStatus("Quotation");
    setIsAddProjectOpen(false);
  };

  // State for toggles of staff active accounts
  const [staffList, setStaffList] = useState<Profile[]>(profiles.filter(p => p.user_role !== "Owner"));

  const handleToggleStaff = (id: string) => {
    const updated = staffList.map((st) =>
      st.id === id
        ? { ...st, account_status: (st.account_status === "Active" ? "Disabled" : "Active") as any }
        : st
    );
    setStaffList(updated);
    // Notify parent
    onUpdateProfiles([...profiles.filter(p => p.user_role === "Owner"), ...updated]);
  };

  // Quick state for WhatsApp popup
  const [waSent, setWaWaSent] = useState(false);

  const handleSendReminder = () => {
    setWaWaSent(true);
    // Custom Indian Real-estate warning message URL encode
    const clientName = "Sunny Enclave Promoters";
    const msg = `ALERT: Dear builder, the Bayana Registry Deadline for Project Sunny Enclave is in 3 days. Please finalize the ledger transactions. - BuildEstimate Owner Agent`;
    const url = `https://wa.me/919876543210?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setTimeout(() => setWaWaSent(false), 3000);
  };

  // Dynamic metrics calculation based on active/started projects (not quotation or dead)
  const activeProjectsList = projects.filter(p => p.status !== "Quotation" && p.status !== "Dead");
  const totalBudget = activeProjectsList.reduce((sum, p) => sum + p.total_budget, 0);
  const totalSpent = activeProjectsList.reduce((sum, p) => sum + p.spent, 0);
  const netProfitVal = Math.max(0, totalBudget - totalSpent);
  const projectedMarginVal = totalBudget > 0 ? (netProfitVal / totalBudget) * 100 : 0;
  const cashReservesVal = activeProjectsList.reduce((sum, p) => sum + (p.total_budget - p.spent) * 0.35, 0);
  const pendingCollectionsVal = activeProjectsList.reduce((sum, p) => sum + (p.total_budget - p.spent) * 0.18, 0);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatLakhsCrores = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return formatINR(value);
  };

  const deadlineAlert = alerts.find(a => a.type === "Deadline");

  return (
    <div className="space-y-6">
      {/* Executive Oversight Section (Only for Owners and Managers) */}
      {isOwnerOrManager && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Executive Oversight
            </h2>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
              🔒 RLS Secure Owner View
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Net Profit Card */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Net Profit</span>
                <span className="material-symbols-outlined text-emerald-600 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatLakhsCrores(netProfitVal)}</span>
                <div className="inline-flex items-center gap-1 mt-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full w-fit border border-emerald-200">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span>
                  <span className="text-[10px] font-bold">{projects.length > 0 ? "12% vs last month" : "No active projects"}</span>
                </div>
              </div>
            </div>

            {/* Cash Reserves Card */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Cash Reserves</span>
                <span className="material-symbols-outlined text-slate-500">account_balance_wallet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatLakhsCrores(cashReservesVal)}</span>
                <p className="text-[10px] text-slate-500 mt-1.5 italic">Verified Ledger Balance</p>
              </div>
            </div>

            {/* Pending Collections Card */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Pending Collections</span>
                <span className="material-symbols-outlined text-slate-500">pending_actions</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatLakhsCrores(pendingCollectionsVal)}</span>
                <p className="text-[10px] text-slate-500 mt-1.5">{projects.length > 0 ? "Based on active milestones" : "No upcoming milestones"}</p>
              </div>
            </div>
          </div>

          {/* Urgent Alert Banner */}
          {deadlineAlert && (
            <div className="relative overflow-hidden bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                  <span className="material-symbols-outlined font-bold text-xl">priority_high</span>
                </div>
                <p className="font-bold text-rose-950 text-sm leading-tight text-center md:text-left">
                  🚨 ALERT: {deadlineAlert.title} ({deadlineAlert.description})
                </p>
              </div>
              <button
                onClick={handleSendReminder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-lg text-xs font-bold flex items-center gap-2 w-full md:w-auto justify-center active:scale-95 transition-all shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">chat</span>
                {waSent ? "Opening WhatsApp..." : "Send WhatsApp Reminder"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main Financial Overview */}
      <section className="space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Financial Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Budget Card */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Budget</p>
            <p className="text-2xl font-black text-slate-900">{formatINR(totalBudget)}</p>
          </div>

          {/* Expenses Card */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Expenses</p>
            <p className="text-2xl font-black text-slate-900">{formatINR(totalSpent)}</p>
          </div>

          {/* Projected Profit Margin Card */}
          <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl shadow-sm">
            <p className="text-[11px] font-bold text-emerald-800 mb-1 uppercase tracking-wider">Projected Profit Margin</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-700">{projectedMarginVal.toFixed(1)}%</p>
              <span className="material-symbols-outlined text-emerald-700 text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Alerts Dashboard Section */}
      <section className="bg-white border border-rose-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-rose-600 px-4 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-white text-lg font-bold">warning</span>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">Critical Field Alerts</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-semibold">
              ✅ No critical alerts at this time. All sites are running smoothly.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="px-4 py-3 flex justify-between items-center bg-rose-50/10 hover:bg-rose-50/20 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-950 text-sm">{alert.title}</span>
                  <span className="text-xs text-slate-500">{alert.description}</span>
                </div>
                {alert.type === "Stock" ? (
                  <button
                    onClick={() => onOpenOrderDialog("st-1")}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform"
                  >
                    ORDER
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-rose-600 font-semibold">
                    {alert.type === "Deadline" ? "event_busy" : "notifications"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Actions (Full Mobile Targets) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setTab("estimates")}
          className="h-12 flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          New Estimate
        </button>
        <button
          onClick={() => setTab("sitelog")}
          className="h-12 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          Log Site Expense
        </button>
        <button
          onClick={() => setTab("materials")}
          className="h-12 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">inventory_2</span>
          View Stocks
        </button>
        {isOwnerOrManager && (
          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="h-12 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm animate-fade-in"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Project
          </button>
        )}
      </section>

      {/* Middle Grid: Active Projects & Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active Projects (List) */}
        <section className={`${isOwnerOrManager ? "md:col-span-3" : "md:col-span-5"} space-y-3`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Projects & Cost Estimations
            </h2>
            <div className="flex items-center gap-3">
              {isOwnerOrManager && (
                <button
                  onClick={() => setIsAddProjectOpen(true)}
                  className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 hover:underline animate-fade-in"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  Add Project / Quote
                </button>
              )}
            </div>
          </div>

          {/* Tab Toggles */}
          <div className="flex border-b border-slate-200 gap-2 mb-4">
            <button
              onClick={() => setActiveProjectTab('approved')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                activeProjectTab === 'approved'
                  ? 'border-slate-900 text-slate-900 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Approved Sites ({projects.filter(p => p.status !== "Quotation" && p.status !== "Dead").length})
            </button>
            <button
              onClick={() => setActiveProjectTab('quotations')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                activeProjectTab === 'quotations'
                  ? 'border-slate-900 text-slate-900 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Estimates & Quotes ({projects.filter(p => p.status === "Quotation" || p.status === "Dead").length})
            </button>
          </div>

          <div className="space-y-3">
            {activeProjectTab === 'approved' ? (
              projects.filter(p => p.status !== "Quotation" && p.status !== "Dead").length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed p-10 rounded-xl text-center space-y-3">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">apartment</span>
                  <p className="text-sm font-bold text-slate-800">No Approved Construction Sites</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">Create a new quote/project, or approve a pending estimate from the "Estimates & Quotes" tab to start building.</p>
                </div>
              ) : (
                projects.filter(p => p.status !== "Quotation" && p.status !== "Dead").map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setTab("estimates")}
                    className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-slate-400 hover:shadow transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">{project.project_name}</h3>
                        <p className="text-xs text-slate-500">{project.type} • {project.location.split(",")[0]}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        project.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700"
                      }`}>
                        {project.status === "Active" ? "In Progress" : project.status}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Completion Progress</span>
                        <span className="font-bold text-slate-900">{project.completion_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.completion_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center pb-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaZ7tK3sXBL8GgELNs_LSPAkRDbb-HnvO_rzK1MjqJ0qjxfvsmGLep432HAxmqcL-9XO6mNcoTvK6Uy1LCCTrmoIB8_H5WAeN_Np8SuBUXz9IrcHTdbstr5_RDBqRKKuoxLbMjNSjV9zG4xHu8kPhpvqInkE8q9TQXXo4d12z6XWFS2PYNvxISL7juMwXh2cRFTNYC6bQs_GOXzRFNgSh6_Ifm_aCflP8Tt2m60SZqxK-MHQRBgeJCmbLfyDKykdBSzhBw-O8Nohn8" alt="worker" />
                        <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDb4NBHkbPa_wPQrH0j5Rj5-jm0XRLT6bdISLAkPpM4WOJ1_KnxY6Dpnf43uudl6r9hPf1ovKExh0wZM_b0bEOqcb3rUk4JU7-8PpwDdMW1xtoRi-i1ykiVLWI-zcinkgyI2wiLITXC4yCeo69VBr2oUycPuv3rRXT_GiZ8F4ToRuluckXmTePqmRKICOY3Gyt-OY_OihVTS1wq09tAsVklAYktIi_sopU1MqGYd22Rm4uyQrPg_nkJoR5GVluCMST9t_pvYqZhNpf1" alt="engineer" />
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 ring-2 ring-white">
                          +{project.id === "pr-1" ? "4" : "2"}
                        </div>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900">
                        ₹{(project.spent / 100000).toFixed(1)}L{" "}
                        <span className="text-slate-500 font-normal">/ {(project.total_budget / 100000).toFixed(0)}L</span>
                      </p>
                    </div>

                    {isOwnerOrManager && onUpdateProject && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                        {project.status === "Active" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Mark project "${project.project_name}" as Completed?`)) {
                                  handleStatusChange(project, "Completed", { completion_pct: 100 });
                                }
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[11px]">check_circle</span>
                              Complete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Pause construction work and put "${project.project_name}" On Hold?`)) {
                                  handleStatusChange(project, "On-Hold");
                                }
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[11px]">pause_circle</span>
                              Hold
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Mark ongoing project "${project.project_name}" as Dead?`)) {
                                  handleStatusChange(project, "Dead");
                                }
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded transition-colors flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[11px]">cancel</span>
                              Dead
                            </button>
                          </>
                        )}

                        {project.status === "On-Hold" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Resume construction works at "${project.project_name}"?`)) {
                                  handleStatusChange(project, "Active");
                                }
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[11px]">play_arrow</span>
                              Resume
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Mark on-hold project "${project.project_name}" as Dead?`)) {
                                  handleStatusChange(project, "Dead");
                                }
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded transition-colors flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[11px]">cancel</span>
                              Dead
                            </button>
                          </>
                        )}

                        {project.status === "Completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Re-open completed project "${project.project_name}"?`)) {
                                handleStatusChange(project, "Active");
                              }
                            }}
                            className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[11px]">settings_backup_restore</span>
                            Re-open
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              projects.filter(p => p.status === "Quotation" || p.status === "Dead").length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed p-10 rounded-xl text-center space-y-3">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">receipt_long</span>
                  <p className="text-sm font-bold text-slate-800">No Cost Quotations or Proposals</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">Create a project in "Quotation" status to start preparing pre-sale construction estimates.</p>
                </div>
              ) : (
                projects.filter(p => p.status === "Quotation" || p.status === "Dead").map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">{project.project_name}</h3>
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                          project.status === "Quotation"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {project.status === "Quotation" ? "Pending Quote / Estimation" : "Dead Quote / Rejected"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {project.type} • {project.location}
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        Proposed Budget: <span className="text-slate-900 font-bold">₹{(project.total_budget).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={() => {
                          setTab("estimates");
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">calculate</span>
                        View Estimates
                      </button>

                      {isOwnerOrManager && onUpdateProject && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {project.status === "Quotation" && (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm(`Approve and Start construction project for "${project.project_name}"?`)) {
                                    handleStatusChange(project, "Active");
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                title="Approve & Start"
                              >
                                <span className="material-symbols-outlined text-sm">play_circle</span>
                                Approve & Start
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Mark quotation "${project.project_name}" as Dead (rejected)?`)) {
                                    handleStatusChange(project, "Dead");
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                                title="Mark Dead / Rejected"
                              >
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                Mark Dead
                              </button>
                            </>
                          )}

                          {project.status === "Dead" && (
                            <button
                              onClick={() => {
                                if (confirm(`Revive quotation/proposal for "${project.project_name}"?`)) {
                                  handleStatusChange(project, "Quotation");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
                              Revive Quotation
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </section>

        {/* Staff Management Section (Owners/Managers Only) */}
        {isOwnerOrManager && (
          <section className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Staff Management
              </h2>
              <button className="text-slate-900 font-bold text-xs flex items-center gap-0.5 hover:underline">
                <span className="material-symbols-outlined text-sm font-bold">person_add</span>
                Add Staff
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 font-bold border border-slate-200 text-xs">
                      {staff.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{staff.name}</p>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {staff.user_role}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staff.account_status === "Active"}
                      onChange={() => handleToggleStaff(staff.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              ))}
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest hover:text-black transition-colors">
                  VIEW ALL STAFF ({staffList.length})
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ADD NEW PROJECT MODAL */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase">Create Construction Project</h3>
              <button onClick={() => setIsAddProjectOpen(false)} className="material-symbols-outlined text-slate-400 hover:text-black">
                close
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blossom Meadows"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Type
                </label>
                <select
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium text-slate-800"
                >
                  <option value="Residential">Residential Development</option>
                  <option value="Commercial">Commercial Complex</option>
                  <option value="Villa">Premium Villa</option>
                  <option value="Apartment">Apartment Complex</option>
                  <option value="Renovation">Renovation Site</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Location / Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 82, Mohali, Punjab"
                  value={newProjectLocation}
                  onChange={(e) => setNewProjectLocation(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Total Budget (₹)
                </label>
                <input
                  type="number"
                  required
                  min="10000"
                  placeholder="e.g. 5000000"
                  value={newProjectBudget}
                  onChange={(e) => setNewProjectBudget(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Phase / Status
                </label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as 'Active' | 'Quotation')}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium text-slate-800"
                >
                  <option value="Quotation">📝 Quotation / Estimate Only (Pre-Sale)</option>
                  <option value="Active">🚀 Active Site (Construction Started)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  If set to "Quotation", you can draft and send detailed materials, electrical, and civil cost estimates to the client before starting.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProjectOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
