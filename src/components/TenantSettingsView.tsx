import React, { useState, useEffect } from "react";
import { TenantProfile } from "../types";

interface TenantSettingsViewProps {
  tenantProfile: TenantProfile;
  isReadOnly: boolean;
  onSave: (updatedProfile: {
    company_name: string;
    business_logo_url: string;
    gstin: string;
    address: string;
    phone_number: string;
    email: string;
  }) => Promise<void>;
  saving: boolean;
}

// Preset dynamic builder logos to make it super-friendly and professional
const PRESET_LOGOS = [
  {
    name: "Classic Construction",
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop"
  },
  {
    name: "Modern Architect",
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=150&auto=format&fit=crop"
  },
  {
    name: "Minimalist Studio",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=150&auto=format&fit=crop"
  },
  {
    name: "Eco-Build",
    url: "https://images.unsplash.com/photo-1448630360428-654a95b93fb1?q=80&w=150&auto=format&fit=crop"
  }
];

export default function TenantSettingsView({
  tenantProfile,
  isReadOnly,
  onSave,
  saving
}: TenantSettingsViewProps) {
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Populate values when tenantProfile loads
  useEffect(() => {
    if (tenantProfile) {
      setCompanyName(tenantProfile.company_name || "");
      setLogoUrl(tenantProfile.business_logo_url || "");
      setGstin(tenantProfile.gstin || "");
      setAddress(tenantProfile.address || "");
      setPhone(tenantProfile.phone_number || "");
      setEmail(tenantProfile.email || "");
    }
  }, [tenantProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      await onSave({
        company_name: companyName,
        business_logo_url: logoUrl,
        gstin: gstin,
        address: address,
        phone_number: phone,
        email: email
      });
      setSuccessMsg("Brand parameters successfully applied!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">verified_user</span>
            White-Label Brand Identity
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Configure dynamic headers, logos, and tax settings for your client-facing quotation portals and PDF sheets.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">apartment</span>
                Business / Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="tenant-company-name"
                type="text"
                disabled={isReadOnly}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="e.g. Sachdeva Constructions"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">receipt</span>
                GSTIN (Tax ID)
              </label>
              <input
                id="tenant-gstin"
                type="text"
                disabled={isReadOnly}
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 27AAACB1234C1Z0 (Leave blank to hide)"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">call</span>
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                id="tenant-phone"
                type="text"
                disabled={isReadOnly}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                Business Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="tenant-email"
                type="email"
                disabled={isReadOnly}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. contact@sachdevabuilders.com"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Logo Image URL */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">image</span>
                Business Logo URL
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <input
                  id="tenant-logo-url"
                  type="text"
                  disabled={isReadOnly}
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="e.g. https://domain.com/logo.png"
                  className="w-full sm:flex-grow px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                />
                
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center relative group">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop";
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-lg">corporate_fare</span>
                  )}
                </div>
              </div>

              {/* Preset construction brand logo gallery for premium user experience */}
              {!isReadOnly && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
                    Quick Brand Templates (Choose Preset)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_LOGOS.map((logo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLogoUrl(logo.url)}
                        className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg transition-all ${
                          logoUrl === logo.url
                            ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {logo.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Office Address */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                Office Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="tenant-address"
                disabled={isReadOnly}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Tricity Region Office, Kharar, Punjab"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {!isReadOnly && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="tenant-save-btn"
                type="submit"
                disabled={saving}
                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider text-[11px] rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Updating Branding...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">palette</span>
                    <span>Apply Brand Identity</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
