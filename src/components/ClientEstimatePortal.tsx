import React from "react";

interface LineItem {
  name: string;
  amount: number;
  quantity?: number | string;
  unit?: string;
  rate?: number | string;
}

interface SharedEstimate {
  id: string;
  project_name: string;
  company_name: string;
  business_logo_url?: string;
  gstin?: string;
  address?: string;
  phone_number?: string;
  email?: string;
  civil_items: LineItem[];
  electrical_items: LineItem[];
  finishes_items: LineItem[];
  interior_finishing_items: LineItem[];
  gst_rate: number;
  grand_total: number;
  created_at: string;
  subscription_plan?: 'Free Trial' | 'Pro Growth' | 'Enterprise Matrix';
  project_id?: string;
  revision_number?: number;
}

interface ClientEstimatePortalProps {
  estimate: SharedEstimate;
}

export default function ClientEstimatePortal({ estimate }: ClientEstimatePortalProps) {
  const {
    project_name,
    company_name,
    business_logo_url,
    gstin,
    address,
    phone_number,
    email,
    civil_items = [],
    electrical_items = [],
    finishes_items = [],
    interior_finishing_items = [],
    gst_rate = 18,
    grand_total,
    created_at
  } = estimate;

  // Recalculate subtotal
  const totalCivil = civil_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalElectrical = electrical_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalFinishes = finishes_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalInterior = interior_finishing_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  const subtotal = totalCivil + totalElectrical + totalFinishes + totalInterior;
  const gstRupees = Math.round(subtotal * (gst_rate / 100));
  const finalTotal = subtotal + gstRupees;

  const handleWhatsAppInquiry = () => {
    const rawPhone = phone_number ? phone_number.replace(/\D/g, "") : "919876543210";
    const boldedMsg = `*Hello ${company_name} team!*\n\n` +
      `I am reviewing the public shared estimate for *${project_name}* (ID: ${estimate.id}) and would like to discuss the next steps! 🚀`;
    const encodedText = encodeURIComponent(boldedMsg);
    window.open(`https://wa.me/${rawPhone}?text=${encodedText}`, "_blank");
  };

  const renderTableSection = (title: string, items: LineItem[], icon: string) => {
    if (items.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500 text-lg">{icon}</span>
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-5">Item Description</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-center">Unit</th>
                <th className="py-2.5 px-4 text-right">Rate</th>
                <th className="py-2.5 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3 px-5 font-semibold text-slate-800">{item.name}</td>
                  <td className="py-3 px-4 text-center text-slate-500 font-mono">{item.quantity || "1"}</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-medium">{item.unit || "sqft"}</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Number(item.rate || 0).toLocaleString()}</td>
                  <td className="py-3 px-5 text-right font-bold text-slate-900 font-mono">₹{Number(item.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/30 border-t border-slate-150">
                <td colSpan={4} className="py-3 px-5 font-bold text-slate-500 text-right">Section Total:</td>
                <td className="py-3 px-5 text-right font-black text-slate-900 font-mono">
                  ₹{items.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white print:bg-white print:p-0">
      
      {/* Dynamic Action Ribbon */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-50 py-3.5 px-4 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Live Client Proposal Portal
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white inline-flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleWhatsAppInquiry}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.179.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.907-11.893 11.907-2.01-.001-3.986-.51-5.742-1.477L0 24zm6.59-4.846c1.63.967 3.559 1.478 5.35 1.479 5.548 0 10.064-4.515 10.066-10.066.002-2.688-1.043-5.216-2.943-7.115C17.164 1.551 14.639.507 11.95.507c-5.556 0-10.074 4.52-10.076 10.072-.001 1.777.464 3.511 1.348 5.03L1.242 21.22l5.405-1.417z"/>
              </svg>
              <span>WhatsApp Inquiry</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 print:py-0 print:px-0">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-10 print:border-none print:shadow-none print:p-0">
          
          {/* Company & Client Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8 mb-8">
            <div className="space-y-2">
              {business_logo_url && (
                <img
                  src={business_logo_url}
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                  className="max-h-12 object-contain mb-3 rounded-lg"
                />
              )}
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{company_name}</h1>
              {address && <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{address}</p>}
              <div className="text-[11px] text-slate-400 font-medium space-y-0.5">
                {gstin && <p>GSTIN: {gstin}</p>}
                {phone_number && <p>Tel: {phone_number}</p>}
                {email && <p>Email: {email}</p>}
              </div>
            </div>
            <div className="sm:text-right space-y-2 w-full sm:w-auto">
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Commercial Proposal Snapshot
              </span>
              <div className="pt-2 text-xs text-slate-500 space-y-0.5 font-mono">
                {estimate.project_id && <p><strong className="text-slate-700">Project ID:</strong> {estimate.project_id}</p>}
                <p><strong className="text-slate-700">Proposal ID:</strong> {estimate.id}{estimate.revision_number ? `-R${estimate.revision_number}` : ""}</p>
                <p><strong className="text-slate-700">Date Published:</strong> {new Date(created_at).toLocaleDateString('en-IN')}</p>
                <p><strong className="text-slate-700">Valid Until:</strong> {new Date(new Date(created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Project Details Banner */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Official Proposal For</p>
              <h2 className="text-lg font-black text-slate-900">{project_name}</h2>
            </div>
            <div className="text-center sm:text-right bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
              <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-0.5">Estimated Grand Total</p>
              <p className="text-xl font-black text-slate-950 font-mono">₹{finalTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* Render Itemized Estimations */}
          {renderTableSection("1. Civil & Structure Construction", civil_items, "construction")}
          {renderTableSection("2. Electrical & Utility Work", electrical_items, "electrical_services")}
          {renderTableSection("3. Architectural Finishes (Flooring & Paints)", finishes_items, "grid_view")}
          {renderTableSection("4. Premium Woodwork & Interior Finishing", interior_finishing_items, "imagesmode")}

          {/* Pricing Calculation Summary Grid */}
          <div className="border-t border-slate-200 pt-8 mt-8 flex justify-end">
            <div className="w-full sm:w-80 space-y-3 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Net Itemized Base Sum:</span>
                <span className="font-bold font-mono">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST / Taxes (Applicable @ {gst_rate}%):</span>
                <span className="font-bold font-mono">₹{gstRupees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-sm font-black text-slate-950 bg-amber-50 p-3 rounded-xl border border-amber-100">
                <span>Proposal Grand Total:</span>
                <span className="text-slate-950 font-black text-base font-mono">₹{finalTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="mt-12 pt-8 border-t border-slate-150 space-y-2 text-[10px] text-slate-400 leading-relaxed">
            <h4 className="font-extrabold uppercase text-slate-500 tracking-wider">Standard Project Terms</h4>
            <p>1. This digital commercial snapshot presents pricing accurate as of the snapshot date. Any subsequent adjustments or custom scope requests will require a newly generated snapshot proposal.</p>
            <p>2. Payment Terms: 40% Mobilization Advance on sign-off, 40% Mid-stage work progress completion, 20% handover audit cleared.</p>
            <p>3. Electrical and Civil works are estimated as per standard blueprints. All plumbing modifications and external connections are billed as actuals on site.</p>
          </div>

          {/* Subscription Watermark Block */}
          {(!estimate.subscription_plan || estimate.subscription_plan === "Free Trial") && (
            <div className="mt-8 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xs">gpp_maybe</span>
              <span>Generated via BuildEstimate BOS Trial</span>
            </div>
          )}

          {/* Ecosystem Branding Watermark */}
          <div className="mt-12 text-center text-[9px] text-slate-300 font-mono flex items-center justify-center gap-1.5 print:hidden">
            <span className="material-symbols-outlined text-xs text-slate-300">security</span>
            <span>Verified Estimate Snapshot • Powered by Karam AI Ecosystem • Innovation HUB</span>
          </div>

        </div>
      </div>
    </div>
  );
}
