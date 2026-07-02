import React from "react";
import { TenantProfile } from "../types";
import { Building, Phone, MapPin, CreditCard, Shield, CheckCircle } from "lucide-react";

interface TenantProfileCardProps {
  tenantProfile: TenantProfile;
  onEditClick?: () => void;
}

export default function TenantProfileCard({ tenantProfile, onEditClick }: TenantProfileCardProps) {
  // Safe fallbacks for each field
  const companyName = tenantProfile?.company_name?.trim() || "No Builder Configured";
  const gstin = tenantProfile?.gstin?.trim() || "Not Registered";
  const phoneNumber = tenantProfile?.phone_number?.trim() || "Not Configured";
  const address = tenantProfile?.address?.trim() || "No Corporate Address Setup";
  const logoUrl = tenantProfile?.business_logo_url || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop";

  return (
    <div className="bg-slate-900 border border-emerald-500/25 rounded-2xl p-6 shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
        {/* Brand Logo Display Block */}
        <div className="flex-shrink-0 text-center md:text-left">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-xl blur-sm opacity-20 group-hover:opacity-40 transition duration-300" />
            <div className="relative w-24 h-24 md:w-28 md:h-28 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
              {tenantProfile?.business_logo_url ? (
                <img
                  src={logoUrl}
                  alt={`${companyName} Logo`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
                  <Building className="w-8 h-8 text-emerald-500/70" />
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">No Brand Logo</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Brand Configured</span>
          </div>
        </div>

        {/* Content & Metadata Fields */}
        <div className="flex-grow space-y-4 text-center md:text-left min-w-0">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Active Tenant Corporate Identity</span>
              {onEditClick && (
                <button
                  onClick={onEditClick}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 font-extrabold uppercase tracking-wider transition-colors self-center md:self-auto cursor-pointer"
                >
                  Configure Profile ↗
                </button>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight mt-1 truncate">
              {companyName}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            {/* GSTIN Row */}
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">GSTIN Register</span>
                <span className="text-xs text-slate-200 font-mono font-bold block truncate">
                  {gstin}
                </span>
              </div>
            </div>

            {/* Mobile Row */}
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                <Phone className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Contact Mobile</span>
                <span className="text-xs text-slate-200 font-semibold block truncate">
                  {phoneNumber}
                </span>
              </div>
            </div>

            {/* Address Row */}
            <div className="flex items-start gap-3 justify-center md:justify-start sm:col-span-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/60 flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-left min-w-0 flex-grow">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Corporate Address</span>
                <p className="text-xs text-slate-300 leading-relaxed font-medium break-words">
                  {address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
