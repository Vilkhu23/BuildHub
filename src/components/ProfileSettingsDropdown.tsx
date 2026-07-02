import React, { useState, useRef, useEffect } from "react";
import { Settings, Building, CreditCard, LogOut, ShieldCheck, User, Sparkles, ChevronDown } from "lucide-react";
import { TenantProfile } from "../types";

interface ProfileSettingsDropdownProps {
  user: any;
  tenantProfile: TenantProfile;
  onOpenCompanyProfile: () => void;
  onOpenSubscriptionDetails: () => void;
  onSignOut: () => void;
}

export default function ProfileSettingsDropdown({
  user,
  tenantProfile,
  onOpenCompanyProfile,
  onOpenSubscriptionDetails,
  onSignOut,
}: ProfileSettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const planType = tenantProfile?.subscription_plan || "Free Trial";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200/60 transition-all duration-200 cursor-pointer group active:scale-95"
        title="Account Settings"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-xs flex items-center justify-center">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="profile"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="material-symbols-outlined text-slate-500 text-base">
              person
            </span>
          )}
        </div>
        <div className="hidden xs:flex flex-col items-start text-left max-w-[90px] pr-0.5">
          <p className="text-[10px] font-black text-slate-800 leading-none truncate w-full">
            {user?.displayName || "Builder"}
          </p>
          <span className="text-[8px] font-bold text-slate-400 leading-none mt-0.5 truncate w-full">
            {planType === "Enterprise Matrix" ? "Enterprise" : planType === "Pro Growth" ? "Pro Growth" : "Free Mode"}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 group-hover:text-slate-700" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 origin-top-right rounded-2xl bg-slate-950/95 border border-slate-800 text-white shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-slate-900 animate-fadeIn">
          
          {/* Header Info Block */}
          <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Account Profile</span>
                <p className="text-xs font-black text-white truncate max-w-[180px]">
                  {user?.displayName || "Builder Partner"}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                  {user?.email || "developer@buildestimate.com"}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[8px] font-extrabold text-emerald-400 uppercase">Verified</span>
              </div>
            </div>

            {/* Brand Identity / Active Partition Info */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold block">Active Brand</span>
                <span className="text-[10px] text-white font-bold truncate block">
                  {tenantProfile?.company_name || "BuildEstimate Inc."}
                </span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="p-2 space-y-0.5">
            {/* Company Profile Wizard Trigger */}
            <button
              onClick={() => {
                onOpenCompanyProfile();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all cursor-pointer text-left group"
            >
              <Building className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              <div className="flex-grow">
                <span className="block font-extrabold text-[11px] uppercase tracking-wider text-slate-200">🏢 Company Profile</span>
                <span className="block text-[9px] text-slate-400 font-medium">Configure corporate logo & details</span>
              </div>
            </button>

            {/* Subscription Details Portal */}
            <button
              onClick={() => {
                onOpenSubscriptionDetails();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all cursor-pointer text-left group"
            >
              <CreditCard className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              <div className="flex-grow">
                <span className="block font-extrabold text-[11px] uppercase tracking-wider text-slate-200">💳 Subscription Details</span>
                <span className="block text-[9px] text-slate-400 font-medium">Verify billings, cycles & plan tier</span>
              </div>
            </button>
          </div>

          {/* Footer Sign Out */}
          <div className="p-2">
            <button
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 transition-all cursor-pointer text-left group"
            >
              <LogOut className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <div>
                <span className="block font-extrabold text-[11px] uppercase tracking-wider">🚪 Logout</span>
                <span className="block text-[9px] text-rose-300/60 font-medium">Disconnect secure session portal</span>
              </div>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
