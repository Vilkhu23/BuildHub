import React, { useState } from "react";
import { User, CreditCard, Sliders, Check, Globe, Bell, Shield, Eye } from "lucide-react";
import { TenantProfile } from "../types";
import TenantProfileCard from "./TenantProfileCard";
import SubscriptionDetailsCard from "./SubscriptionDetailsCard";
import SubscriptionSimulator from "./SubscriptionSimulator";

interface SettingsPanelProps {
  tenantProfile: TenantProfile;
  onOpenOnboardingWizard: () => void;
  onCancelSimulation?: () => void;
  onSimulateSubscription?: (mockTenant: TenantProfile) => void;
  onAddLog?: (message: string) => void;
}

type TabType = "profile" | "subscription" | "preferences";

export default function SettingsPanel({
  tenantProfile,
  onOpenOnboardingWizard,
  onCancelSimulation,
  onSimulateSubscription,
  onAddLog,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  
  // Local preferences state for demonstration and testing configuration
  const [currency, setCurrency] = useState("INR");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [auditLogsEnabled, setAuditLogsEnabled] = useState(true);
  const [showPreferencesSaved, setShowPreferencesSaved] = useState(false);

  const handleSavePreferences = () => {
    if (onAddLog) {
      onAddLog(`System: Preference parameters updated. Currency set to ${currency}, Alerts: ${notificationEnabled}`);
    }
    setShowPreferencesSaved(true);
    setTimeout(() => setShowPreferencesSaved(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Banner Accent */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-indigo-950 p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Administration Console</span>
          <h2 className="text-xl font-black text-white tracking-tight uppercase mt-1">
            BuildEstimate BOS Control
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Manage your corporate branding, subscription tiers, and system preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure Console</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Navigation Sidebar/Tabs */}
        <div className="w-full lg:w-64 bg-slate-950/40 p-4 border-r border-b lg:border-b-0 border-slate-800/80 space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">👤 Profile Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "subscription"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="truncate">💳 Subscription & Billing</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "preferences"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="truncate">⚙️ Preferences</span>
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-grow p-6 lg:p-8 bg-slate-900/30">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Corporate Brand Profile
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Review and configure your public identity, business GSTIN, logo, and active parameters.
                </p>
              </div>

              {/* Render dynamic TenantProfileCard */}
              <TenantProfileCard
                tenantProfile={tenantProfile}
                onEditClick={onOpenOnboardingWizard}
              />
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Billing & License Status
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Analyze active billing cycles, subscription tiers, simulated transactions, and developer gateways.
                </p>
              </div>

              {/* Render dynamic SubscriptionDetailsCard */}
              <SubscriptionDetailsCard
                tenantProfile={tenantProfile}
                onCancelSimulation={onCancelSimulation}
                onAddLog={onAddLog}
              />

              {/* Sandbox Simulator */}
              {onSimulateSubscription && (
                <div className="pt-2 border-t border-slate-800/60">
                  <SubscriptionSimulator
                    onSimulateSubscription={onSimulateSubscription}
                    onAddLog={onAddLog}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  System Preferences
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Customise system currency formats, background tracking alerts, and active logs preferences.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800/85 rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Currency Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Default System Currency
                    </label>
                    <div className="flex gap-2">
                      {["INR", "USD", "AED"].map((cur) => (
                        <button
                          key={cur}
                          onClick={() => setCurrency(cur)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currency === cur
                              ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                              : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {cur === "INR" ? "₹ INR" : cur === "USD" ? "$ USD" : "د.إ AED"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UI Scaling */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Display Theme Profile
                    </label>
                    <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Emerald-Slate (Default)</span>
                      </span>
                      <span className="text-[9px] font-black uppercase bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
                        LOCKED
                      </span>
                    </div>
                  </div>

                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl sm:col-span-2">
                    <div className="space-y-0.5 pr-4">
                      <span className="text-xs font-bold text-slate-200 block">Dashboard Event Alerts</span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Receive instant visual toast notifications when materials prices or deals undergo shift changes.
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationEnabled(!notificationEnabled)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                        notificationEnabled ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          notificationEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Developer Audit Logs Toggle */}
                  <div className="flex items-center justify-between bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl sm:col-span-2">
                    <div className="space-y-0.5 pr-4">
                      <span className="text-xs font-bold text-slate-200 block">Developer Event Console</span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Log underlying transactions, partition mappings, and state changes into the live sandbox tracker.
                      </span>
                    </div>
                    <button
                      onClick={() => setAuditLogsEnabled(!auditLogsEnabled)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                        auditLogsEnabled ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          auditLogsEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Save Block */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="min-h-[20px]">
                    {showPreferencesSaved && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                        <Check className="w-3.5 h-3.5" />
                        <span>Preferences Saved Successfully</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSavePreferences}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Save Preference Changes</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
