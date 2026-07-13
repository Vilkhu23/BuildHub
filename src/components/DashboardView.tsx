import React, { useState } from "react";
import { Project, CriticalAlert, Profile, InboundRevenue, DailyPayment, OfficeExpense, DealAdjustment, Vendor, Client, TenantProfile } from "../types";
import DashboardSummaryCard from "./DashboardSummaryCard";
import SettingsPanel from "./SettingsPanel";
import { checkProjectLimit } from "../utils/subscription";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface DashboardViewProps {
  projects: Project[];
  clients?: Client[];
  alerts: CriticalAlert[];
  profiles: Profile[];
  inboundRevenues: InboundRevenue[];
  dailyPayments: DailyPayment[];
  officeExpenses: OfficeExpense[];
  dealAdjustments: DealAdjustment[];
  vendors: Vendor[];
  userRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  setTab: (tab: string) => void;
  onOpenOrderDialog: (stockId: string) => void;
  onUpdateProfiles: (updated: Profile[]) => void;
  onAddProject?: (project: Omit<Project, "id">) => void;
  onUpdateProject?: (project: Project) => void;
  onAddInboundRevenue?: (rev: Omit<InboundRevenue, "id" | "date">) => void;
  onAddDailyPayment?: (pay: DailyPayment) => void;
  onAddOfficeExpense?: (exp: Omit<OfficeExpense, "id" | "date">) => void;
  onAddDealAdjustment?: (adj: Omit<DealAdjustment, "id">) => void;
  onAddClient?: (client: Omit<Client, "id">) => void;
  tenantProfile: TenantProfile;
  onOpenUpgradeModal: () => void;
  onOpenOnboardingWizard: () => void;
  onSimulateSubscription?: (mockTenant: TenantProfile) => void;
  onCancelSimulation?: () => void;
  onAddLog?: (message: string) => void;
}

export default function DashboardView({
  projects,
  clients = [],
  alerts,
  profiles,
  inboundRevenues,
  dailyPayments,
  officeExpenses,
  dealAdjustments,
  vendors,
  userRole,
  setTab,
  onOpenOrderDialog,
  onUpdateProfiles,
  onAddProject,
  onUpdateProject,
  onAddInboundRevenue,
  onAddDailyPayment,
  onAddOfficeExpense,
  onAddDealAdjustment,
  onAddClient,
  tenantProfile,
  onOpenUpgradeModal,
  onOpenOnboardingWizard,
  onSimulateSubscription,
  onCancelSimulation,
  onAddLog,
}: DashboardViewProps) {
  const isOwnerOrManager = userRole === "Owner" || userRole === "Manager";

  // State to control inline settings dropdown panel in dashboard header
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

  // Active sub-tab state for projects on the dashboard
  const [activeProjectTab, setActiveProjectTab] = useState<'approved' | 'quotations' | 'leads'>('approved');

  // Ledger active tab state
  const [activeLedgerTab, setActiveLedgerTab] = useState<'cash_in' | 'payments' | 'office' | 'deals'>('cash_in');

  // Interactive ledger addition states
  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerRemarks, setLedgerRemarks] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState("");
  const [ledgerProjectId, setLedgerProjectId] = useState("");
  const [ledgerHeadAccount, setLedgerHeadAccount] = useState("Property Sale");
  const [ledgerPaymentMode, setLedgerPaymentMode] = useState("Online");
  const [ledgerPaymentStage, setLedgerPaymentStage] = useState("Advance");
  const [ledgerRegistryDeadline, setLedgerRegistryDeadline] = useState("");
  const [ledgerSubject, setLedgerSubject] = useState("");
  const [ledgerClientId, setLedgerClientId] = useState("");
  const [ledgerDirection, setLedgerDirection] = useState("Inbound_Commission");

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
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Add Client Modal States
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientLocation, setNewClientLocation] = useState("");

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;

    if (onAddClient) {
      onAddClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        tags: ["Buyer"],
        project_location: newClientLocation.trim() || undefined
      });
    }

    // Reset fields and close modal
    setNewClientName("");
    setNewClientPhone("");
    setNewClientLocation("");
    setIsAddClientOpen(false);
  };

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const handleOpenAddProject = () => {
    const plan = tenantProfile?.subscription_plan || "Free Trial";
    if (checkProjectLimit(projects, plan)) {
      onOpenUpgradeModal();
    } else {
      setIsAddProjectOpen(true);
    }
  };
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

  // New staff modal states
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<'Manager' | 'Supervisor' | 'Telecaller'>("Manager");

  React.useEffect(() => {
    setStaffList(profiles.filter(p => p.user_role !== "Owner"));
  }, [profiles]);

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newStaff: Profile = {
      id: "staff-" + Date.now(),
      name: newStaffName.trim(),
      user_role: newStaffRole,
      account_status: "Active",
      parent_owner_id: null,
      tenant_id: tenantProfile.tenant_id || "tp-default"
    };

    const updatedProfiles = [...profiles, newStaff];
    onUpdateProfiles(updatedProfiles);

    // Reset and close
    setNewStaffName("");
    setNewStaffRole("Manager");
    setIsAddStaffOpen(false);
  };

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
  const [waSent, setWaSent] = useState(false);

  const handleSendReminder = (client: string, days: number, deadline: string) => {
    setWaSent(true);
    const msg = `ALERT: Dear builder/client, the Bayana Registry Deadline for Project is on ${deadline} (${days} days remaining). Please finalize the ledger transactions. - BuildEstimate Owner Agent`;
    const url = `https://wa.me/919876543210?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setTimeout(() => setWaSent(false), 3000);
  };

  // Track selected project for analytics (defaults to "all")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Helper to dynamically calculate projected cost based on estimates
  const getProjectedCost = (p: Project) => {
    const civilSum = p.estimates?.civil?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const electricalSum = p.estimates?.electrical?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const finishesSum = p.estimates?.finishes?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const totalEstimates = civilSum + electricalSum + finishesSum;
    
    // If estimates are populated, use them. Otherwise, default to 80% of total budget (20% margin)
    return totalEstimates > 0 ? totalEstimates : p.total_budget * 0.8;
  };

  // Filter projects based on dropdown selection
  const allActiveProjects = projects.filter(p => p.status !== "Quotation" && p.status !== "Dead");
  const activeProjectsList = selectedProjectId === "all"
    ? allActiveProjects
    : projects.filter(p => p.id === selectedProjectId);

  const totalBudget = activeProjectsList.reduce((sum, p) => sum + p.total_budget, 0);
  
  // Real Khata Calculations!
  // Inflow (be_cash_in):
  const filteredInboundRevenues = selectedProjectId === "all"
    ? inboundRevenues
    : inboundRevenues.filter(r => r.project_id === selectedProjectId);
  const totalInboundSum = filteredInboundRevenues.reduce((sum, r) => sum + r.amount, 0);

  // Outflow (be_daily_payments):
  const filteredDailyPayments = selectedProjectId === "all"
    ? dailyPayments
    : dailyPayments.filter(p => p.project_id === selectedProjectId);
  const totalDailySpentSum = filteredDailyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Office Overhead Outflow (be_office_expenses): (Not tied to projects)
  const totalOfficeExpensesSum = officeExpenses.reduce((sum, o) => sum + o.amount, 0);

  // Broker Commission Adjustments (be_deal_adjustments): (Not tied to projects)
  const totalInboundCommissions = dealAdjustments
    .filter(d => d.direction === "Inbound_Commission")
    .reduce((sum, d) => sum + d.amount, 0);
  const totalOutboundPayouts = dealAdjustments
    .filter(d => d.direction === "Outbound_Payout")
    .reduce((sum, d) => sum + d.amount, 0);

  const netCommissionBalance = totalInboundCommissions - totalOutboundPayouts;

  // Real-time Cash Reservoirs Ledger Equation:
  // Cash Reservoir = Total Inbound Cash + Inbound Commissions - Total Daily Payments - Total Office Expenses - Outbound Commission Payouts
  const actualCashReservoirVal = totalInboundSum + totalInboundCommissions - totalDailySpentSum - totalOfficeExpensesSum - totalOutboundPayouts;

  // Real-time Net Profit: total project budget minus either projected estimates or actual disbursements (whichever is higher) + commission margin minus office overheads
  const netProjectMargins = activeProjectsList.reduce((sum, p) => {
    const projectSpent = dailyPayments.filter(dp => dp.project_id === p.id).reduce((sum, dp) => sum + dp.amount, 0);
    const cost = Math.max(getProjectedCost(p), projectSpent);
    return sum + (p.total_budget - cost);
  }, 0);
  const netProfitVal = netProjectMargins + netCommissionBalance - totalOfficeExpensesSum;
  const projectedMarginVal = totalBudget > 0 ? (netProfitVal / totalBudget) * 100 : 0;

  // Pending Collections: total contract budget of filtered projects minus their collected revenues
  const pendingCollectionsVal = Math.max(0, totalBudget - totalInboundSum);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatLakhsCrores = (value: number) => {
    const isNeg = value < 0;
    const absVal = Math.abs(value);
    let out = "";
    if (absVal >= 10000000) {
      out = `₹${(absVal / 10000000).toFixed(2)}Cr`;
    } else if (absVal >= 100000) {
      out = `₹${(absVal / 100000).toFixed(1)}L`;
    } else {
      out = formatINR(absVal);
    }
    return isNeg ? `-${out}` : out;
  };

  // Bayana Countdown Engine calculations:
  // Detects advances with a deadline coming up within 7 days
  const bayanaDeadlines = inboundRevenues
    .filter(r => r.registry_deadline)
    .map(r => {
      const deadlineDate = new Date(r.registry_deadline);
      const today = new Date(); // Real-time date
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return {
        ...r,
        daysRemaining,
        project: projects.find(p => p.id === r.project_id)
      };
    })
    .filter(item => item.daysRemaining >= 0 && item.daysRemaining <= 7);

  const activeBayanaAlert = bayanaDeadlines[0];

  // Generate last 30 days of cash flow data
  const chartData = React.useMemo(() => {
    const data: Array<{ dateLabel: string; Inflow: number; Outflow: number }> = [];
    const today = new Date(); // Real-time date
    
    // Create map of last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`; // "YYYY-MM-DD"
      
      const dayLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); // e.g. "28 Jun"
      
      // Calculate inbound revenues on this day
      const inflowSum = inboundRevenues
        .filter(r => {
          if (!r.date) return false;
          try {
            const parsed = new Date(r.date);
            if (isNaN(parsed.getTime())) return false;
            const pyear = parsed.getFullYear();
            const pmonth = String(parsed.getMonth() + 1).padStart(2, "0");
            const pday = String(parsed.getDate()).padStart(2, "0");
            return `${pyear}-${pmonth}-${pday}` === dateStr;
          } catch {
            return false;
          }
        })
        .reduce((sum, r) => sum + r.amount, 0);
        
      // Calculate daily payments on this day
      const outflowSum = dailyPayments
        .filter(p => {
          if (!p.date) return false;
          try {
            const parsed = new Date(p.date);
            if (isNaN(parsed.getTime())) return false;
            const pyear = parsed.getFullYear();
            const pmonth = String(parsed.getMonth() + 1).padStart(2, "0");
            const pday = String(parsed.getDate()).padStart(2, "0");
            return `${pyear}-${pmonth}-${pday}` === dateStr;
          } catch {
            return false;
          }
        })
        .reduce((sum, p) => sum + p.amount, 0);
        
      data.push({
        dateLabel: dayLabel,
        Inflow: inflowSum,
        Outflow: outflowSum
      });
    }
    return data;
  }, [inboundRevenues, dailyPayments]);

  const formatYAxis = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 border border-slate-700 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-extrabold mb-1.5 text-slate-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-slate-400">{entry.name}:</span>
              <span className="font-bold text-white">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleAddLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerAmount || isNaN(Number(ledgerAmount))) return;

    if (activeLedgerTab === "cash_in") {
      if (onAddInboundRevenue) {
        onAddInboundRevenue({
          project_id: ledgerProjectId || projects[0]?.id || "pr-1",
          amount: Number(ledgerAmount),
          head_account: ledgerHeadAccount as any,
          payment_mode: ledgerPaymentMode as any,
          payment_stage: ledgerPaymentStage as any,
          registry_deadline: ledgerPaymentStage === "Advance" ? ledgerRegistryDeadline : undefined
        });
      }
    } else if (activeLedgerTab === "payments") {
      if (onAddDailyPayment) {
        onAddDailyPayment({
          id: "dp-" + Date.now(),
          project_id: ledgerProjectId || projects[0]?.id || "pr-1",
          amount: Number(ledgerAmount),
          paid_by: "Manager Amit",
          remarks: ledgerRemarks.trim() || "Manual cash entry",
          category: (ledgerCategory || "Miscellaneous") as any,
          date: new Date().toISOString()
        });
      }
    } else if (activeLedgerTab === "office") {
      if (onAddOfficeExpense) {
        onAddOfficeExpense({
          subject: ledgerRemarks.trim() || "Corporate expense",
          amount: Number(ledgerAmount)
        });
      }
    } else if (activeLedgerTab === "deals") {
      if (onAddDealAdjustment) {
        onAddDealAdjustment({
          client_id: ledgerClientId || "cl-1",
          direction: ledgerDirection as any,
          amount: Number(ledgerAmount),
          deal_detail: ledgerRemarks.trim() || "Broker commission entry"
        });
      }
    }

    // Reset values
    setLedgerAmount("");
    setLedgerRemarks("");
    setLedgerRegistryDeadline("");
    setIsAddLedgerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* COMPACT TOP NAVIGATION HEADER BAR (Max height: 65px) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 flex items-center justify-between gap-3 text-white shadow-md h-[65px] md:h-16 overflow-hidden mb-4">
        {/* Left Side: Brand Logo & Sync Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-emerald-400 font-black text-xl flex-shrink-0">
            construction
          </span>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs md:text-sm font-black tracking-tight text-white truncate leading-none">
              BuildEstimate BOS
            </h1>
            <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1 block whitespace-nowrap">
              Powered by Karam AI | Innovation HUB
            </span>
          </div>
        </div>

        {/* Right Side: Workspace Badge & Project Filter inline */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {/* Subscription Tier Badge */}
          {(() => {
            const plan = tenantProfile?.subscription_plan || "Free Trial";
            if (plan === "Free Trial") {
              return (
                <button
                  onClick={onOpenUpgradeModal}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Click to upgrade"
                >
                  <span>Free Trial</span>
                  <span className="material-symbols-outlined text-[10px] font-black">arrow_upward</span>
                </button>
              );
            } else if (plan === "Pro Growth") {
              return (
                <button
                  onClick={onOpenUpgradeModal}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[9px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="View subscription"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>Pro Growth</span>
                </button>
              );
            } else {
              return (
                <button
                  onClick={onOpenUpgradeModal}
                  className="bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 text-[9px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="View subscription"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  <span>Enterprise</span>
                </button>
              );
            }
          })()}

          <span className="hidden sm:inline-block bg-slate-800 text-slate-300 text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-slate-700/60 flex-shrink-0">
            👑 {userRole}
          </span>

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
              className="h-9 w-9 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
            </button>

            {isSettingsDropdownOpen && (
              <div className="absolute right-0 mt-3 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-4 w-[320px] md:w-[420px] z-[200]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">Settings Panel</h4>
                  <button onClick={() => setIsSettingsDropdownOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  <SettingsPanel
                    tenantProfile={tenantProfile}
                    onOpenOnboardingWizard={onOpenOnboardingWizard}
                    onCancelSimulation={onCancelSimulation}
                    onSimulateSubscription={onSimulateSubscription}
                    onAddLog={onAddLog}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <select
              id="project-select-dropdown"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg py-1 md:py-1.5 pl-2 pr-7 text-[10px] md:text-xs text-white font-bold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[130px] xs:max-w-[180px] sm:max-w-[240px] truncate"
            >
              <option value="all" className="bg-slate-950 text-slate-200 font-bold">
                📁 All Active Projects ({projects.filter(p => p.status !== "Quotation" && p.status !== "Dead").length})
              </option>
              <optgroup label="Ongoing Construction" className="bg-slate-950 text-slate-400 font-bold">
                {projects.filter(p => p.status === "Active" || p.status === "On-Hold" || p.status === "Completed").map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-100 font-bold">
                    {p.status === "On-Hold" ? "⏸️" : p.status === "Completed" ? "✅" : "🏗️"} {p.project_name} ({p.status})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Pre-Sale Quotations / Proposals" className="bg-slate-950 text-slate-400 font-bold">
                {projects.filter(p => p.status === "Quotation").map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-100 font-bold">
                    📝 {p.project_name} (Quotation)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Dead / Rejected" className="bg-slate-950 text-slate-400 font-bold">
                {projects.filter(p => p.status === "Dead").map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-100 font-bold">
                    💀 {p.project_name} (Dead)
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[14px] font-bold">unfold_more</span>
            </div>
          </div>
        </div>
      </div>

        {/* Selected Project Quick details strip */}
        {selectedProjectId !== "all" && (
          (() => {
            const p = projects.find(proj => proj.id === selectedProjectId);
            if (!p) return null;
            return (
              <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold animate-fade-in">
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Project Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      p.status === "Active" ? "bg-emerald-500 animate-pulse" :
                      p.status === "Completed" ? "bg-blue-500" :
                      p.status === "On-Hold" ? "bg-amber-500" :
                      p.status === "Quotation" ? "bg-slate-400" : "bg-red-500"
                    }`} />
                    <span className="font-extrabold tracking-wide uppercase text-white">{p.status}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Site Location</span>
                  <p className="text-slate-200 truncate" title={p.location}>📍 {p.location}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Project Type</span>
                  <p className="text-slate-200">🏗️ {p.type}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Work Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${p.completion_pct}%` }} />
                    </div>
                    <span className="text-emerald-400 font-bold">{p.completion_pct}%</span>
                  </div>
                </div>
              </div>
            );
          })()
        )}





      {/* Role-Based Security Enforcement Warning Block for Supervisors & Telecallers */}
      {!isOwnerOrManager ? (
        <section className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <div className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">lock</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">Oversight Metrics Restricted</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Notice: As a registered <span className="text-amber-800 font-black uppercase tracking-wider">{userRole}</span>, your security permissions are restricted from viewing overall company net profit dashboards, financial cash reservoirs, or supplier cost structures.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Executive Oversight Section (Only for Owners and Managers) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Executive Oversight
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                🔒 RLS Secure Owner View
              </span>
            </div>

            {/* 📊 Centralized Financial Metrics Grid Stripe */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
              {/* Card 1: Net Profit */}
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Net Profit</span>
                <span className="text-xl font-black tracking-tight mt-1 block">{formatLakhsCrores(netProfitVal)}</span>
                <span className={`text-[9px] font-bold mt-1 block ${projectedMarginVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  Margin: {projectedMarginVal.toFixed(1)}%
                </span>
              </div>

              {/* Card 2: Cash Reservoir */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block">Cash Reservoir</span>
                <span className="text-xl font-black text-slate-900 tracking-tight mt-1 block">{formatLakhsCrores(actualCashReservoirVal)}</span>
              </div>

              {/* Card 3: Contract Value */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block">Contract Value</span>
                <span className="text-xl font-black text-slate-900 tracking-tight mt-1 block">{formatINR(totalBudget)}</span>
              </div>

              {/* Card 4: Pending Collections */}
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wider block">Pending Collections</span>
                <span className="text-xl font-black text-rose-900 tracking-tight mt-1 block">{formatLakhsCrores(pendingCollectionsVal)}</span>
              </div>
            </section>

            {/* Bayana Countdown Engine Panel */}
            {activeBayanaAlert && (
              <div className="relative overflow-hidden bg-rose-50 border-2 border-rose-300 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined font-bold text-xl">hourglass_bottom</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                      Bayana Countdown Engine
                    </span>
                    <p className="font-bold text-rose-950 text-sm leading-tight mt-1">
                      ⚠️ Registry Deadline due in <span className="text-rose-600 font-black">{activeBayanaAlert.daysRemaining} days</span> (Date: {activeBayanaAlert.registry_deadline}) for client. Advance receipt of ₹{activeBayanaAlert.amount.toLocaleString()} logged.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendReminder(activeBayanaAlert.head_account, activeBayanaAlert.daysRemaining, activeBayanaAlert.registry_deadline)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-lg text-xs font-bold flex items-center gap-2 w-full md:w-auto justify-center active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-sm font-bold">chat</span>
                  {waSent ? "Opening WhatsApp Client..." : "Send Outbound WhatsApp Reminder"}
                </button>
              </div>
            )}
          </section>

          {/* Standard Financial Overview */}
          <section className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Financial Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Budget Card */}
              <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Contract Value</p>
                <p className="text-2xl font-black text-slate-900">{formatINR(totalBudget)}</p>
              </div>

              {/* Expenses Card */}
              <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Ledger Disbursements</p>
                <p className="text-2xl font-black text-slate-900">{formatINR(totalDailySpentSum + totalOfficeExpensesSum)}</p>
              </div>

              {/* Projected Profit Margin Card */}
              <div className={`${projectedMarginVal >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"} p-4 border rounded-xl shadow-sm`}>
                <p className={`text-[11px] font-bold mb-1 uppercase tracking-wider ${projectedMarginVal >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                  Projected Business Margin
                </p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-2xl font-black ${projectedMarginVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {projectedMarginVal.toFixed(1)}%
                  </p>
                  <span 
                    className={`material-symbols-outlined text-sm font-bold ${projectedMarginVal >= 0 ? "text-emerald-700" : "text-rose-700"}`} 
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {projectedMarginVal >= 0 ? "trending_up" : "trending_down"}
                  </span>
                </div>
              </div>
            </div>

            {/* 30-Day Liquidity & Cash Flow Analytics */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">show_chart</span>
                    30-Day Cash Flow Liquidity
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Daily tracking of cash inflows vs site disbursements</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Inflows
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Payments (Outflow)
                  </span>
                </div>
              </div>
              <div className="h-64 w-full text-xs font-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dateLabel"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={9}
                      dy={10}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={9}
                      tickFormatter={formatYAxis}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Inflow"
                      name="Cash Inflow"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 2, strokeWidth: 1, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Outflow"
                      name="Site Outflows"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 2, strokeWidth: 1, fill: "#f43f5e" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}
      {/* BuildEstimate BOS Khata Ledgers Section */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
        <div className="bg-slate-900 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">account_balance</span>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-white">BuildEstimate BOS Khata Ledgers</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Four-Ledger Double Entry Matrix</p>
            </div>
          </div>
          {isOwnerOrManager && (
            <button
              onClick={() => setIsAddLedgerOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              LOG TRANSACTION
            </button>
          )}
        </div>

        {/* Ledger Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              if (isOwnerOrManager) setActiveLedgerTab("cash_in");
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 text-xs font-bold border-r border-slate-200 text-center transition-all flex items-center justify-center gap-1.5 ${
              activeLedgerTab === "cash_in"
                ? "bg-white text-slate-900 border-b-2 border-b-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            } ${!isOwnerOrManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            📥 Cash Inflow
            {!isOwnerOrManager && <span className="material-symbols-outlined text-xs">lock</span>}
          </button>
          <button
            onClick={() => setActiveLedgerTab("payments")}
            className={`flex-1 min-w-[140px] px-4 py-3 text-xs font-bold border-r border-slate-200 text-center transition-all flex items-center justify-center gap-1.5 ${
              activeLedgerTab === "payments"
                ? "bg-white text-slate-900 border-b-2 border-b-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            💸 Daily Site Payments
          </button>
          <button
            onClick={() => {
              if (isOwnerOrManager) setActiveLedgerTab("office");
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 text-xs font-bold border-r border-slate-200 text-center transition-all flex items-center justify-center gap-1.5 ${
              activeLedgerTab === "office"
                ? "bg-white text-slate-900 border-b-2 border-b-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            } ${!isOwnerOrManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            🏢 Office Expenses
            {!isOwnerOrManager && <span className="material-symbols-outlined text-xs">lock</span>}
          </button>
          <button
            onClick={() => {
              if (isOwnerOrManager) setActiveLedgerTab("deals");
            }}
            className={`flex-1 min-w-[140px] px-4 py-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
              activeLedgerTab === "deals"
                ? "bg-white text-slate-900 border-b-2 border-b-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            } ${!isOwnerOrManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            🤝 Commissions Matrix
            {!isOwnerOrManager && <span className="material-symbols-outlined text-xs">lock</span>}
          </button>
        </div>

        {/* Ledger Lists Content */}
        <div className="p-4 bg-white">
          {activeLedgerTab === "cash_in" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded">
                <span>Account Head & Project</span>
                <span>Mode / Stage</span>
                <span className="text-right">Amount</span>
              </div>
              {filteredInboundRevenues.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6 font-semibold">No inbound receipts logged for this site filter.</p>
              ) : (
                filteredInboundRevenues.map((rev) => {
                  const p = projects.find(proj => proj.id === rev.project_id);
                  return (
                    <div key={rev.id} className="flex justify-between items-center py-2 px-1 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{rev.head_account}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">Site: {p?.project_name || "Direct Sale"}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">{rev.payment_mode}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">{rev.payment_stage}</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-sm font-extrabold text-emerald-700">+{formatINR(rev.amount)}</span>
                        {rev.registry_deadline && (
                          <span className="text-[9px] text-rose-600 font-bold">Registry: {rev.registry_deadline}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeLedgerTab === "payments" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded">
                <span>Description & Project</span>
                <span>Category</span>
                <span className="text-right">Disbursement</span>
              </div>
              {filteredDailyPayments.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6 font-semibold">No daily payments logged for this site filter.</p>
              ) : (
                filteredDailyPayments.map((pay) => {
                  const p = projects.find(proj => proj.id === pay.project_id);
                  return (
                    <div key={pay.id} className="flex justify-between items-center py-2 px-1 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col max-w-[50%]">
                        <span className="text-sm font-bold text-slate-900 truncate" title={pay.remarks}>{pay.remarks}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Logged by: {pay.paid_by} • {p?.project_name || "Direct"}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        pay.category === "Labor" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        pay.category === "Materials" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700"
                      }`}>{pay.category}</span>
                      <span className="text-sm font-extrabold text-rose-700">-{formatINR(pay.amount)}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeLedgerTab === "office" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded">
                <span>Expense Description</span>
                <span>Due Date</span>
                <span className="text-right">Amount</span>
              </div>
              {officeExpenses.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6 font-semibold">No corporate headquarters fixed overheads recorded.</p>
              ) : (
                officeExpenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center py-2 px-1 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-bold text-slate-900">{exp.subject}</span>
                    <span className="text-xs text-slate-500 font-mono">{exp.date}</span>
                    <span className="text-sm font-extrabold text-rose-700">-{formatINR(exp.amount)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeLedgerTab === "deals" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded">
                <span>Broker & Client Details</span>
                <span>Type</span>
                <span className="text-right">Adjustment</span>
              </div>
              {dealAdjustments.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6 font-semibold">No active real estate broker commission adjustments logged.</p>
              ) : (
                dealAdjustments.map((adj) => (
                  <div key={adj.id} className="flex justify-between items-center py-2 px-1 border-b border-slate-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{adj.deal_detail}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Mapped client reference: {adj.client_id}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                      adj.direction === "Inbound_Commission" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                    }`}>
                      {adj.direction === "Inbound_Commission" ? "INBOUND COMM" : "OUTBOUND PAY"}
                    </span>
                    <span className={`text-sm font-extrabold ${adj.direction === "Inbound_Commission" ? "text-emerald-700" : "text-rose-700"}`}>
                      {adj.direction === "Inbound_Commission" ? "+" : "-"}{formatINR(adj.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
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
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
            onClick={handleOpenAddProject}
            className="h-12 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm animate-fade-in"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Project
          </button>
        )}
        {isOwnerOrManager && (
          <button
            onClick={() => setIsAddClientOpen(true)}
            className="h-12 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm animate-fade-in"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add New Client
          </button>
        )}
        <button
          onClick={() => setTab("crm_leads")}
          className="h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm animate-fade-in col-span-2 md:col-span-1"
        >
          <span className="material-symbols-outlined text-lg">leaderboard</span>
          CRM Leads Hub
        </button>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddClientOpen(true)}
                    className="text-indigo-700 font-bold text-xs flex items-center gap-0.5 hover:underline animate-fade-in"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">person_add</span>
                    Add Client
                  </button>
                  <span className="text-slate-300 text-xs font-bold">|</span>
                  <button
                    onClick={handleOpenAddProject}
                    className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 hover:underline animate-fade-in"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                    Add Project / Quote
                  </button>
                </div>
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
            <button
              onClick={() => setActiveProjectTab('leads')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                activeProjectTab === 'leads'
                  ? 'border-slate-900 text-slate-900 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              CRM Inquiries
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
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`p-4 rounded-xl shadow-sm border transition-all cursor-pointer ${
                      selectedProjectId === project.id
                        ? "bg-slate-50 border-slate-900 ring-2 ring-slate-950/10"
                        : "bg-white border-slate-200 hover:border-slate-400 hover:shadow"
                    }`}
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
                                setConfirmAction({
                                  message: `Mark project "${project.project_name}" as Completed?`,
                                  onConfirm: () => handleStatusChange(project, "Completed", { completion_pct: 100 })
                                });
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[11px]">check_circle</span>
                              Complete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmAction({
                                  message: `Pause construction work and put "${project.project_name}" On Hold?`,
                                  onConfirm: () => handleStatusChange(project, "On-Hold")
                                });
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[11px]">pause_circle</span>
                              Hold
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmAction({
                                  message: `Mark ongoing project "${project.project_name}" as Dead?`,
                                  onConfirm: () => handleStatusChange(project, "Dead")
                                });
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
                                setConfirmAction({
                                  message: `Resume construction works at "${project.project_name}"?`,
                                  onConfirm: () => handleStatusChange(project, "Active")
                                });
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[11px]">play_arrow</span>
                              Resume
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmAction({
                                  message: `Mark on-hold project "${project.project_name}" as Dead?`,
                                  onConfirm: () => handleStatusChange(project, "Dead")
                                });
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
                              setConfirmAction({
                                  message: `Re-open completed project "${project.project_name}"?`,
                                  onConfirm: () => handleStatusChange(project, "Active")
                              });
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
            ) : activeProjectTab === 'quotations' ? (
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
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`p-4 rounded-xl shadow-sm border transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      selectedProjectId === project.id
                        ? "bg-slate-50 border-slate-900 ring-2 ring-slate-950/10"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
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
                                  setConfirmAction({
                                    message: `Approve and Start construction project for "${project.project_name}"?`,
                                    onConfirm: () => handleStatusChange(project, "Active")
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                title="Approve & Start"
                              >
                                <span className="material-symbols-outlined text-sm">play_circle</span>
                                Approve & Start
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    message: `Mark quotation "${project.project_name}" as Dead (rejected)?`,
                                    onConfirm: () => handleStatusChange(project, "Dead")
                                  });
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
                                setConfirmAction({
                                  message: `Revive quotation/proposal for "${project.project_name}"?`,
                                  onConfirm: () => handleStatusChange(project, "Quotation")
                                });
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
            ) : (
              // Lead Management Conditional Block Trigger
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl text-white">hub</span>
                </div>
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                      Ecosystem: CRM Lead Integration
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight leading-none text-white flex items-center justify-center md:justify-start gap-1.5">
                    <span>Manage CRM Leads & Inquiries</span>
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-300 font-semibold max-w-lg leading-normal">
                    Track incoming construction project and material supply inquiries, update statuses, and convert them to quotations.
                  </p>
                </div>
                <button
                  onClick={() => setTab("crm_leads")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-2 font-black"
                >
                  <span className="material-symbols-outlined text-sm font-bold">leaderboard</span>
                  <span>Open CRM Lead Hub</span>
                </button>
              </div>
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
              <button 
                onClick={() => setIsAddStaffOpen(true)}
                className="text-slate-900 font-bold text-xs flex items-center gap-0.5 hover:underline cursor-pointer"
              >
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

      {/* ADD NEW CLIENT MODAL */}
      {isAddClientOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">person_add</span>
                Add New Client
              </h3>
              <button 
                onClick={() => setIsAddClientOpen(false)} 
                className="material-symbols-outlined text-slate-400 hover:text-black transition-colors"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Phone
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 62, Noida, UP"
                  value={newClientLocation}
                  onChange={(e) => setNewClientLocation(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STAFF MODAL */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">person_add</span>
                Add New Staff
              </h3>
              <button 
                onClick={() => setIsAddStaffOpen(false)} 
                className="material-symbols-outlined text-slate-400 hover:text-black transition-colors cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Staff Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anil Sharma"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Assign Workspace Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full h-10 border border-slate-300 bg-white rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                >
                  <option value="Manager">💼 Manager (Financials, Material & Estimates)</option>
                  <option value="Supervisor">🚧 Supervisor (Site Logs, Orders & Daily Attendance)</option>
                  <option value="Telecaller">📞 Telecaller (CRM Lead Hub & Realty Properties)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                  Roles restrict which tabs and modules the staff member can access within the mobile and desktop app.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* ADD NEW TRANSACTION LEDGER MODAL */}
      {isAddLedgerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase">
                Log {activeLedgerTab === "cash_in" ? "Inbound Revenue" : activeLedgerTab === "payments" ? "Daily site Payment" : activeLedgerTab === "office" ? "Office Expense" : "Commission/Deal Payout"}
              </h3>
              <button onClick={() => setIsAddLedgerOpen(false)} className="material-symbols-outlined text-slate-400 hover:text-black">
                close
              </button>
            </div>

            <form onSubmit={handleAddLedgerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={ledgerAmount}
                  onChange={(e) => setLedgerAmount(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-bold"
                />
              </div>

              {(activeLedgerTab === "cash_in" || activeLedgerTab === "payments") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Select Site / Project
                  </label>
                  <select
                    value={ledgerProjectId}
                    onChange={(e) => setLedgerProjectId(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeLedgerTab === "cash_in" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Head Account Type
                    </label>
                    <select
                      value={ledgerHeadAccount}
                      onChange={(e) => setLedgerHeadAccount(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium"
                    >
                      <option value="Property Sale">Property Sale Contract</option>
                      <option value="Mobilization Advance">Mobilization Advance</option>
                      <option value="Progressive Billing">Progressive Billing Milestone</option>
                      <option value="Retention Money">Retention Release</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={ledgerPaymentMode}
                        onChange={(e) => setLedgerPaymentMode(e.target.value)}
                        className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white"
                      >
                        <option value="Online">Online Bank Transfer</option>
                        <option value="Cash">Hard Cash Payment</option>
                        <option value="Cheque">Banker Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Stage
                      </label>
                      <select
                        value={ledgerPaymentStage}
                        onChange={(e) => setLedgerPaymentStage(e.target.value)}
                        className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white"
                      >
                        <option value="Advance">Advance (Enters Countdown)</option>
                        <option value="Running Bill">Progress Bill</option>
                        <option value="Registry">Final Deed Registry</option>
                      </select>
                    </div>
                  </div>

                  {ledgerPaymentStage === "Advance" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                        Bayana Registry Deadline Date <span className="text-[10px] text-slate-400 normal-case font-normal">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={ledgerRegistryDeadline}
                        onChange={(e) => setLedgerRegistryDeadline(e.target.value)}
                        className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                      />
                    </div>
                  )}
                </>
              )}

              {activeLedgerTab === "payments" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Expense Category
                    </label>
                    <select
                      value={ledgerCategory}
                      onChange={(e) => setLedgerCategory(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium"
                    >
                      <option value="Labor">Labor Wages</option>
                      <option value="Materials">Cement & Raw Materials Delivery</option>
                      <option value="Fuel">Generator / Diesel Fuel</option>
                      <option value="Machinery">Machine Rental</option>
                      <option value="Miscellaneous">Site Petty Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Payment Remarks / Narrative
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paid 100 bags Ambuja Cement"
                      value={ledgerRemarks}
                      onChange={(e) => setLedgerRemarks(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>
                </>
              )}

              {activeLedgerTab === "office" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Corporate Expense Subject / Details
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sector 82 Office Rental"
                    value={ledgerRemarks}
                    onChange={(e) => setLedgerRemarks(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
              )}

              {activeLedgerTab === "deals" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Adjustment Direction
                    </label>
                    <select
                      value={ledgerDirection}
                      onChange={(e) => setLedgerDirection(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-semibold"
                    >
                      <option value="Inbound_Commission">📥 Inbound Brokerage Commission Receipt</option>
                      <option value="Outbound_Payout">📤 Outbound Broker Sub-agent Payout</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Client ID / Name reference
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunil Chawla (Agent ref)"
                      value={ledgerRemarks}
                      onChange={(e) => setLedgerRemarks(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddLedgerOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Log Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern custom confirmation modal overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 transform scale-100 transition-all space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <span className="material-symbols-outlined text-3xl text-amber-500 font-bold">warning</span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">Confirm Action</h4>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Verification Required</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-all"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
