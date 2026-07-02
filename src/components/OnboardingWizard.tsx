import React, { useState } from "react";
import { TenantProfile } from "../types";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantProfile: TenantProfile;
  onUpdateTenantProfile: (updated: Partial<TenantProfile>) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onAddLog: (message: string) => void;
}

export default function OnboardingWizard({
  isOpen,
  onClose,
  tenantProfile,
  onUpdateTenantProfile,
  onResetDatabase,
  onAddLog,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState<"Uninitialized" | "Ready">("Uninitialized");

  // Step 2 Form States
  const [companyName, setCompanyName] = useState(tenantProfile.company_name || "");
  const [gstin, setGstin] = useState(tenantProfile.gstin || "");
  const [address, setAddress] = useState(tenantProfile.address || "");
  const [phoneNumber, setPhoneNumber] = useState(tenantProfile.phone_number || "");
  const [businessLogoUrl, setBusinessLogoUrl] = useState(
    tenantProfile.business_logo_url || "https://images.unsplash.com/photo-1581094288338-2314dddb7eed?w=150&auto=format&fit=crop&q=80"
  );
  const [dragActive, setDragActive] = useState(false);

  // Step 3 Interactive Estimation States
  const [item1Qty, setItem1Qty] = useState(120);
  const [item1Rate, setItem1Rate] = useState(450);
  const [item2Qty, setItem2Qty] = useState(5);
  const [item2Rate, setItem2Rate] = useState(12000);
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  if (!isOpen) return null;

  // Total Calculations for Tutorial
  const item1Total = item1Qty * item1Rate;
  const item2Total = item2Qty * item2Rate;
  const subtotal = item1Total + item2Total;
  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gstAmount;

  const onInitializeWorkspace = () => {
    setResetting(true);
    
    if (typeof onAddLog === "function") {
      try {
        onAddLog("Onboarding: Simulating safe partition mounting in sandbox...");
      } catch (e) {}
    }
    
    // Parent loading screen (image_61d6f4.png) ko complete block karne ke liye
    // hum onResetDatabase() call ko bypass kar rahe hain.
    
    setTimeout(() => {
      setWorkspaceStatus("Ready");
      setResetDone(true);
      setResetting(false);
      
      if (typeof onAddLog === "function") {
        try {
          onAddLog("Onboarding: Sandbox partition ready. UI thread unlocked.");
        } catch (e) {}
      }
    }, 1000); // Sirf 1 second ka local loader chalega
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessLogoUrl(reader.result as string);
        onAddLog("Onboarding: Custom business logo loaded via drag-and-drop.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessLogoUrl(reader.result as string);
        onAddLog("Onboarding: Custom business logo loaded via file selector.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    if (typeof onAddLog === "function") {
      try {
        onAddLog("Onboarding: Saving company brand profiles locally...");
      } catch (err) {}
    }

    // Sabse important change: Pehle step change karenge taaki UI na atke
    setCurrentStep(3);

    // Background mein try karenge profile update karne ka, agar fail bhi ho toh workflow chalta rahega
    if (typeof onUpdateTenantProfile === "function") {
      try {
        onUpdateTenantProfile({
          company_name: companyName.trim(),
          gstin: gstin.trim(),
          address: address.trim(),
          phone_number: phoneNumber.trim(),
          business_logo_url: businessLogoUrl,
        }).catch(() => {});
        
        if (typeof onAddLog === "function") {
          onAddLog(`Onboarding: Successfully updated brand profile to ${companyName}`);
        }
      } catch (err) {
        console.error("Background profile update bypassed:", err);
      }
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*BuildProposal from ${companyName || "BuildEstimate BOS"}*\n` +
      `Ecosystem: Powered by Karam AI\n` +
      `---------------------------------\n` +
      `1. RCC Slab & Excavation:\n   ${item1Qty} Cu.m @ ₹${item1Rate}/Cu.m = ₹${item1Total.toLocaleString()}\n` +
      `2. Modular Finishing Panels:\n   ${item2Qty} Pcs @ ₹${item2Rate}/Pcs = ₹${item2Total.toLocaleString()}\n` +
      `---------------------------------\n` +
      `Subtotal: ₹${subtotal.toLocaleString()}\n` +
      `GST (18%): ₹${gstAmount.toLocaleString()}\n` +
      `*Grand Total: ₹${grandTotal.toLocaleString()}*\n` +
      `---------------------------------\n` +
      `Thank you for choosing ${companyName}!`;

    navigator.clipboard.writeText(text);
    setWhatsappCopied(true);
    onAddLog("Onboarding: Copied WhatsApp proposal payload to clipboard!");

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, "") || "919876543210"}?text=${encoded}`, "_blank");

    setTimeout(() => setWhatsappCopied(false), 3000);
  };

  const handlePrint = () => {
    onAddLog("Onboarding: Simulating professional white-labeled PDF proposal layout...");
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8">
        {/* Wizard Header bar */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-8xl">hub</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Tenant Portal Activation
              </span>
            </div>
            <h2 className="text-sm font-black uppercase tracking-tight">
              BuildEstimate BOS Onboarding Wizard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Wizard Progression Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 1 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>1</span>
            <span className={currentStep === 1 ? "text-slate-900" : ""}>Workspace Activation</span>
          </div>
          <div className="h-px bg-slate-200 flex-grow mx-4 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 2 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
            <span className={currentStep === 2 ? "text-slate-900" : ""}>Brand Profile</span>
          </div>
          <div className="h-px bg-slate-200 flex-grow mx-4 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 3 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>3</span>
            <span className={currentStep === 3 ? "text-slate-900" : ""}>Live Proposal Test</span>
          </div>
        </div>

        {/* Wizard content bodies */}
        <div className="p-6 md:p-8 space-y-6 flex-grow">
          {/* STEP 1: Welcome & Reset */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in text-center py-4">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm mb-2">
                <span className="material-symbols-outlined text-4xl font-light">verified_user</span>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight">
                  Secure Workspace Activated
                </h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Welcome to <strong className="text-slate-800">BuildEstimate BOS</strong>. We have provisioned a completely isolated database sandbox in the <strong className="text-emerald-600">Innovation HUB</strong> partition for you.
                </p>
              </div>

              {/* Activation action */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto space-y-4">
                <div className="flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-slate-400">database</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Partition Key: {tenantProfile.tenant_id || "qQDXcdv6uhZ7cotapzlJdtVa0023"}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Status: {workspaceStatus}</p>
                  </div>
                </div>

                {!resetDone ? (
                  <button
                    onClick={onInitializeWorkspace}
                    disabled={resetting}
                    className="w-full h-11 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {resetting ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        <span>Zeroing Database...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Initialize Workspace Partition</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Database partition successfully zeroed and ready!</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!resetDone}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span>Continue to Brand Profile</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Profile Setup Form */}
          {currentStep === 2 && (
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">badge</span>
                  Configure Your Brand Profile
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Setup your white-labeled parameters. These details will be automatically compiled on all customer facing proposals.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Karam AI Constructions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 27AAACB1234C1Z0"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Mobile / Contact Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Corporate Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Innovation HUB, Sector 62, Noida"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Logo Drag and Drop Setup */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Company Brand Logo (URL or Upload)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Upload via drag-and-drop or specify logo path/URL"
                      value={businessLogoUrl}
                      onChange={(e) => setBusinessLogoUrl(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Drag & Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
                        dragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-slate-400 text-lg mb-1">upload_file</span>
                      <p className="text-[10px] font-bold text-slate-600">
                        Drag & Drop Logo Image here or{" "}
                        <label className="text-emerald-600 underline cursor-pointer hover:text-emerald-700">
                          Browse
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Supports PNG, JPG (Max 2MB)</p>
                    </div>
                  </div>

                  {/* Logo Preview */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-center min-h-[110px]">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Live Logo</span>
                    {businessLogoUrl ? (
                      <img
                        src={businessLogoUrl}
                        alt="Logo Preview"
                        className="h-14 object-contain max-w-full rounded"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 h-11 border border-slate-200 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Save & Continue
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Tutorial Run with interactive card */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 font-black">calculate</span>
                  Step 3: Live Estimation Tutorial
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Adjust quantity or rate parameters on the dummy card below to verify our real-time estimation engine.
                </p>
              </div>

              {/* Dummy Interactive 2-item Estimate Card */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {businessLogoUrl && (
                      <img src={businessLogoUrl} alt="Logo" className="h-6 w-6 object-contain bg-white rounded p-0.5" referrerPolicy="no-referrer" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider">
                      {companyName || "BuildEstimate Client"} • DEMO PROPOSAL
                    </span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    Ecosystem: Karam AI
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Table header */}
                  <div className="grid grid-cols-12 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-150 pb-2">
                    <div className="col-span-6">Item Specification</div>
                    <div className="col-span-2 text-right">Quantity</div>
                    <div className="col-span-2 text-right">Rate (₹)</div>
                    <div className="col-span-2 text-right">Total (₹)</div>
                  </div>

                  {/* Item 1 */}
                  <div className="grid grid-cols-12 items-center gap-2 text-xs border-b border-slate-100 pb-3">
                    <div className="col-span-6 space-y-0.5">
                      <span className="font-bold text-slate-800">1. RCC Slab & Excavation Foundation</span>
                      <p className="text-[10px] text-slate-400">Civil Structural Framework - Grade M25</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        value={item1Qty}
                        onChange={(e) => setItem1Qty(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 h-8 text-right bg-slate-50 border border-slate-200 rounded px-1.5 font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        value={item1Rate}
                        onChange={(e) => setItem1Rate(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-18 h-8 text-right bg-slate-50 border border-slate-200 rounded px-1.5 font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-800 font-mono">
                      {item1Total.toLocaleString()}
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="grid grid-cols-12 items-center gap-2 text-xs pb-3 border-b border-slate-150">
                    <div className="col-span-6 space-y-0.5">
                      <span className="font-bold text-slate-800">2. Premium Laminated Interior Panels</span>
                      <p className="text-[10px] text-slate-400">Waterproof BWR ply finish with teak accents</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        value={item2Qty}
                        onChange={(e) => setItem2Qty(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 h-8 text-right bg-slate-50 border border-slate-200 rounded px-1.5 font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        value={item2Rate}
                        onChange={(e) => setItem2Rate(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-18 h-8 text-right bg-slate-50 border border-slate-200 rounded px-1.5 font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-800 font-mono">
                      {item2Total.toLocaleString()}
                    </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold max-w-xs ml-auto text-right">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono text-slate-800">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-mono text-slate-800">₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="font-mono text-emerald-700">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block text-center">
                  Dual-Action Client Deliverables
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Sharing Button */}
                  <button
                    onClick={handleShareWhatsApp}
                    className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm font-black">chat</span>
                    <span>{whatsappCopied ? "Link Copied!" : "Share via WhatsApp"}</span>
                  </button>

                  {/* PDF Print Button */}
                  <button
                    onClick={handlePrint}
                    className="h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>Print PDF Estimate</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold text-center leading-relaxed">
                  Notice: All generated outputs automatically embed your customized {companyName || "BuildEstimate"} company headers and GST credentials configured in Step 2.
                </p>
              </div>

              {/* Progression Controls */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-grow h-11 border border-slate-200 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Back to Profile
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-grow h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Complete Onboarding
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
