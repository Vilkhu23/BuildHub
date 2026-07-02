import React from "react";
import { TenantProfile } from "../types";
import { ShieldCheck, Calendar, Receipt, XCircle, Sparkles } from "lucide-react";

interface SubscriptionDetailsCardProps {
  tenantProfile: TenantProfile;
  onCancelSimulation?: () => void;
  onAddLog?: (message: string) => void;
}

export default function SubscriptionDetailsCard({
  tenantProfile,
  onCancelSimulation,
  onAddLog
}: SubscriptionDetailsCardProps) {
  const currentPlan = tenantProfile?.subscription_plan || "Free Trial";
  const isMocked = tenantProfile?.tenant_id?.startsWith("DL-MOCK-");

  // Format dynamic dates for the subscription cycle
  const activationDate = "July 02, 2026";
  const renewalDate = "August 02, 2026";

  const handleCancelClick = () => {
    if (onCancelSimulation) {
      if (onAddLog) {
        onAddLog(`Simulator: Subscription simulation cancelled. Reverting workspace back to user account defaults.`);
      }
      onCancelSimulation();
    }
  };

  const handleViewReceipts = () => {
    if (onAddLog) {
      onAddLog(`System: Download pipeline opened. Showing simulated PDF receipts for transaction references.`);
    }
    alert("Simulated PDF Receipts download initialized. Transaction Hash: " + Math.random().toString(16).substr(2, 12).toUpperCase());
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/85">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Subscription Control</span>
            <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
              Billing Parameters & Access
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">ACTIVE Badge</span>
            </div>
            {isMocked && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-2 py-1 rounded-md animate-pulse">
                SIMULATION MODE
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plan Tier Block */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Current Plan Type</span>
            <span className="text-xs text-white font-black uppercase tracking-tight block">
              {currentPlan === "Enterprise Matrix" ? "Enterprise Builder Plan" : currentPlan === "Pro Growth" ? "Dealer Pro Tier" : "Free Trial Mode"}
            </span>
          </div>

          {/* Payment Status Block */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Payment Status</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">
                Active & Autopay
              </span>
            </div>
          </div>

          {/* Account Activation Block */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Activation Date</span>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold">{activationDate}</span>
            </div>
          </div>

          {/* Next Renewal Block */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Next Renewal Date</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-xs font-black">{renewalDate}</span>
            </div>
          </div>
        </div>

        {/* Action Utilities Block */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            onClick={handleViewReceipts}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            <span>📄 View Payment Receipts</span>
          </button>

          {isMocked && onCancelSimulation && (
            <button
              onClick={handleCancelClick}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg transition-all cursor-pointer active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Subscription Simulation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
