import React, { useState } from "react";
import { Zap, CheckCircle2, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { TenantProfile } from "../types";

interface SubscriptionSimulatorProps {
  onSimulateSubscription: (mockTenant: TenantProfile) => void;
  onAddLog?: (message: string) => void;
}

export default function SubscriptionSimulator({
  onSimulateSubscription,
  onAddLog
}: SubscriptionSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [latestTenantId, setLatestTenantId] = useState<string | null>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setPaymentSuccess(false);
    
    const mockId = "DL-MOCK-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    setLatestTenantId(mockId);
    
    if (onAddLog) {
      onAddLog(`Simulator: Initiating Mock Payment Gateway handshake for new dealer license...`);
    }

    // Standard simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setPaymentSuccess(true);
    setIsSimulating(false);

    if (onAddLog) {
      onAddLog(`Simulator: Active payment confirmed! Issued Mock Tenant Partition ID: ${mockId}`);
    }

    // Create a new mock profile representing a fresh subscribed dealer ready for onboarding
    const newMockTenant: TenantProfile = {
      id: "tp-" + mockId.toLowerCase(),
      tenant_id: mockId,
      company_name: "BuildEstimate Inc.", // Keep default name so onboarding flow identifies it as unconfigured
      business_logo_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop",
      gstin: "",
      address: "",
      phone_number: "",
      subscription_plan: "Enterprise Matrix"
    };

    // Callback to propagate context change and trigger Onboarding Wizard
    onSimulateSubscription(newMockTenant);
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Visual background ambient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
      <div className="absolute top-4 right-4 text-emerald-500/20">
        <Sparkles className="w-12 h-12" />
      </div>

      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Innovation HUB Sandbox</span>
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-white">
            Dealer Subscription Pipeline
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg font-medium">
            Test the automated SaaS billing and onboarding pipeline. Simulates credit card authorization, allocates isolated secure database partitions, and triggers the white-labeled configuration wizard.
          </p>
        </div>

        {/* Interactive Simulator State Output */}
        {paymentSuccess && latestTenantId && (
          <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Payment Authorization Success</span>
              <p className="text-xs text-slate-200 font-semibold leading-normal">
                Subscribed successfully! Partition <code className="text-emerald-300 font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded">{latestTenantId}</code> initialized.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                <span>Handover to Onboarding Wizard</span>
                <ArrowRight className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
              isSimulating
                ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/10"
            }`}
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing Payment Gateway...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 font-black" />
                <span>Trigger Mock Dealer Subscription (Simulate Payment)</span>
              </>
            )}
          </button>

          {paymentSuccess && (
            <button
              onClick={() => {
                setPaymentSuccess(false);
                setLatestTenantId(null);
              }}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-bold uppercase tracking-wider underline cursor-pointer"
            >
              Reset Simulation State
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
