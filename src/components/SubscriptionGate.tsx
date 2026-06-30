import React, { useState } from "react";
import { TenantProfile } from "../types";

export interface SubscriptionGateProps {
  isOpen: boolean;
  onClose: () => void;
  tenantProfile: TenantProfile;
  activeProjectsCount: number;
  onUpgradePlan: (plan: 'Free Trial' | 'Pro Growth' | 'Enterprise Matrix') => Promise<void>;
  onAddLog: (message: string) => void;
}

export default function SubscriptionGate({
  isOpen,
  onClose,
  tenantProfile,
  activeProjectsCount,
  onUpgradePlan,
  onAddLog
}: SubscriptionGateProps) {
  const [selectedPlan, setSelectedPlan] = useState<'Pro Growth' | 'Enterprise Matrix'>('Pro Growth');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'billing' | 'success'>('plans');
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  if (!isOpen) return null;

  const currentPlan = tenantProfile.subscription_plan || 'Free Trial';

  const planPricing = {
    'Free Trial': { price: "₹0", period: "forever", desc: "For independent builders & initial pre-sales evaluations." },
    'Pro Growth': { price: "₹1,999", period: "month", desc: "For growing contracting firms requiring white-label reports." },
    'Enterprise Matrix': { price: "₹4,999", period: "month", desc: "For enterprise builders with multi-site supervisor networks." }
  };

  const handleStartUpgrade = (plan: 'Pro Growth' | 'Enterprise Matrix') => {
    setSelectedPlan(plan);
    setCheckoutStep('billing');
    onAddLog(`Initiated secure subscription upgrade checkout for plan: ${plan}`);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    onAddLog(`Billing Engine: Authorizing payment gateway transaction of ${planPricing[selectedPlan].price} via Karam AI Secure Node...`);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        await onUpgradePlan(selectedPlan);
        setCheckoutStep('success');
        onAddLog(`Billing Engine Auth: Payment successfully captured. Plan upgraded to '${selectedPlan}'.`);
      } catch (err) {
        console.error(err);
        onAddLog(`Billing Engine Error: Payment processing failed.`);
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Banner header with branding */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">verified</span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">BuildEstimate BOS Premium</h2>
              <p className="text-[10px] text-slate-400 font-mono">Ecosystem: Powered by Karam AI | Innovation HUB</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white material-symbols-outlined text-lg cursor-pointer transition-colors"
          >
            close
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {checkoutStep === 'plans' && (
            <div className="space-y-6">
              
              {/* Alert if blocked */}
              {activeProjectsCount >= 3 && currentPlan === 'Free Trial' && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-rose-600 shrink-0 mt-0.5">gpp_maybe</span>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold uppercase tracking-wide">Project Limit Exceeded (Active Count: {activeProjectsCount}/3)</p>
                    <p className="text-rose-700 leading-relaxed font-medium">
                      Your current <strong>Free Trial</strong> subscription allows a maximum of 3 active construction projects. Upgrade to <strong>Pro Growth</strong> for unlimited active site projects, watermark removal, and custom branding!
                    </p>
                  </div>
                </div>
              )}

              {/* Plans Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Free Trial Card */}
                <div className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-all ${
                  currentPlan === 'Free Trial'
                    ? "bg-slate-50 border-slate-300 ring-2 ring-slate-900 ring-offset-2"
                    : "bg-white border-slate-150 opacity-75 hover:opacity-100"
                }`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                        Free Trial
                      </span>
                      {currentPlan === 'Free Trial' && (
                        <span className="material-symbols-outlined text-slate-900 text-sm">check_circle</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-2">₹0</h3>
                    <p className="text-[9px] text-slate-400 font-semibold mb-3">forever</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-4">
                      {planPricing['Free Trial'].desc}
                    </p>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-slate-400">check</span>
                      <span>Max 3 Active Projects</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-slate-400">check</span>
                      <span>Standard Portal Sharing</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-rose-500">lock</span>
                      <span>PDF features watermark</span>
                    </div>
                  </div>
                  <button
                    disabled
                    className="w-full mt-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                  >
                    {currentPlan === 'Free Trial' ? "Current Plan" : "Downgrade Blocked"}
                  </button>
                </div>

                {/* Pro Growth Card */}
                <div className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-all ${
                  currentPlan === 'Pro Growth'
                    ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-600 ring-offset-2"
                    : "bg-white border-slate-200 hover:border-emerald-500 shadow-sm relative overflow-hidden"
                }`}>
                  {currentPlan !== 'Pro Growth' && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black text-[8px] uppercase px-3 py-1 rounded-bl-xl tracking-wider select-none">
                      Recommended
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Pro Growth
                      </span>
                      {currentPlan === 'Pro Growth' && (
                        <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-2">₹1,999</h3>
                    <p className="text-[9px] text-slate-400 font-semibold mb-3">per month</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-4">
                      {planPricing['Pro Growth'].desc}
                    </p>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-150">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
                      <span>Unlimited Projects</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
                      <span>Full White-Label Identity</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
                      <span>No PDF Watermarks</span>
                    </div>
                  </div>
                  {currentPlan === 'Pro Growth' ? (
                    <button
                      disabled
                      className="w-full mt-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 cursor-not-allowed select-none"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartUpgrade('Pro Growth')}
                      className="w-full mt-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      {currentPlan === 'Enterprise Matrix' ? "Select Pro Growth" : "Upgrade to Pro"}
                    </button>
                  )}
                </div>

                {/* Enterprise Matrix Card */}
                <div className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-all ${
                  currentPlan === 'Enterprise Matrix'
                    ? "bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-600 ring-offset-2"
                    : "bg-white border-slate-150 hover:border-indigo-500"
                }`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        Enterprise Matrix
                      </span>
                      {currentPlan === 'Enterprise Matrix' && (
                        <span className="material-symbols-outlined text-indigo-600 text-sm">check_circle</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-2">₹4,999</h3>
                    <p className="text-[9px] text-slate-400 font-semibold mb-3">per month</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-4">
                      {planPricing['Enterprise Matrix'].desc}
                    </p>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-indigo-500">check</span>
                      <span>Unlimited Projects</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-indigo-500">check</span>
                      <span>Sub-Team Supervisors</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-xs text-indigo-500">check</span>
                      <span>Priority Escalation Support</span>
                    </div>
                  </div>
                  {currentPlan === 'Enterprise Matrix' ? (
                    <button
                      disabled
                      className="w-full mt-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 cursor-not-allowed select-none"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartUpgrade('Enterprise Matrix')}
                      className="w-full mt-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Go Enterprise
                    </button>
                  )}
                </div>

              </div>
              
            </div>
          )}

          {checkoutStep === 'billing' && (
            <form onSubmit={handleProcessPayment} className="space-y-5 max-w-md mx-auto">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Selected Subscription</p>
                  <p className="text-sm font-black text-slate-900">{selectedPlan} Plan</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{planPricing[selectedPlan].price}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">/{planPricing[selectedPlan].period}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <span className="material-symbols-outlined text-sm text-slate-400">credit_card</span>
                  Secure Payment Gateway Details
                </h3>

                {/* Cardholder Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wide text-slate-500 block">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. Karam Jit Singh"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wide text-slate-500 block">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                      setCardNumber(formatted);
                    }}
                    placeholder="4111 2222 3333 4444"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Expiry and CVC Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wide text-slate-500 block">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 2) {
                          val = val.substring(0, 2) + "/" + val.substring(2, 4);
                        }
                        setCardExpiry(val);
                      }}
                      placeholder="MM/YY"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-slate-900 transition-colors text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wide text-slate-500 block">
                      Security Code (CVC)
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-slate-900 transition-colors text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Action and back buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setCheckoutStep('plans')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>Pay & Subscribe</span>
                    </>
                  )}
                </button>
              </div>

              {/* Safe billing lock note */}
              <p className="text-[9px] text-slate-400 text-center flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs text-emerald-500">lock</span>
                <span>PCI-DSS Secure Endpoint • Managed by Karam AI Core Billing Engine</span>
              </p>
            </form>
          )}

          {checkoutStep === 'success' && (
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <span className="material-symbols-outlined text-3xl font-black">done_all</span>
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Payment Successfully Captured!</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Congratulations! Your BuildEstimate BOS subscription has been upgraded to <strong>{selectedPlan}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4.5 text-left max-w-sm mx-auto text-xs space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b pb-1">Subscription Details</p>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Tenant ID:</span>
                  <span className="font-mono">{tenantProfile.tenant_id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Plan Level:</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">{selectedPlan}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Active Project Limit:</span>
                  <span className="font-bold text-slate-900 text-[10px]">Unlimited</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">White-Label Branding:</span>
                  <span className="font-bold text-slate-900 text-[10px]">Activated</span>
                </div>
              </div>

              <div className="pt-4 max-w-sm mx-auto">
                <button
                  onClick={onClose}
                  className="w-full h-10 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
