import React, { useState } from "react";
import { Property, BuyerRequirement } from "../types";

interface PropertyViewProps {
  properties: Property[];
  buyerRequirements: BuyerRequirement[];
  onAddLog: (log: string) => void;
  activeRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  onAddProperty?: (property: Omit<Property, "id">) => void;
  onAddBuyerRequirement?: (req: Omit<BuyerRequirement, "id" | "status">) => void;
}

export default function PropertyView({
  properties,
  buyerRequirements,
  onAddLog,
  activeRole,
  onAddProperty,
  onAddBuyerRequirement,
}: PropertyViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All Listings");

  // Role permissions
  const canSeeSupplierCosts = activeRole === "Owner" || activeRole === "Manager" || activeRole === "Supervisor";

  // Sub-tabs on the Property View: "Inventory" vs "Buyer Demands"
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'demands'>('inventory');

  // Add Property states
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState("");
  const [newPropType, setNewPropType] = useState<'Plot' | 'Villa' | 'Flat' | 'Commercial'>("Villa");
  const [newPropLocation, setNewPropLocation] = useState("");
  const [newPropAskingPrice, setNewPropAskingPrice] = useState("");
  const [newPropSellingPrice, setNewPropSellingPrice] = useState("");
  const [newPropSource, setNewPropSource] = useState("");
  const [newPropSourceType, setNewPropSourceType] = useState<'Builder' | 'Owner' | 'CP' | 'Rental Investor'>("Owner");

  // Add Buyer Requirement states
  const [isAddBuyerOpen, setIsAddBuyerOpen] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerPhone, setNewBuyerPhone] = useState("");
  const [newBuyerLocation, setNewBuyerLocation] = useState("");
  const [newBuyerBudget, setNewBuyerBudget] = useState("");
  const [newBuyerPropType, setNewBuyerPropType] = useState<'Plot' | 'Villa' | 'Flat' | 'Commercial'>("Villa");

  const totalPortfolioValue = properties.reduce((sum, p) => sum + p.target_selling_price, 0);
  const activeListingsCount = properties.filter(p => p.status === "Available").length;

  // Lead matcher Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Lead inputs
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // Match result
  const [isMatching, setIsMatching] = useState(false);
  const [compiledPitch, setCompiledPitch] = useState("");
  const [encodedPitch, setEncodedPitch] = useState("");
  const [mapsLinks, setMapsLinks] = useState<{ title: string; uri: string }[]>([]);

  const handleOpenMatcher = (prop: Property) => {
    setSelectedProperty(prop);
    setBuyerName("");
    setBuyerPhone("");
    setCompiledPitch("");
    setEncodedPitch("");
    setMapsLinks([]);
    setIsDrawerOpen(true);
  };

  const handleRunAutoMatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setIsMatching(true);

    try {
      const res = await fetch("/api/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: buyerName,
          propertyType: selectedProperty.property_type,
          preferredLocation: selectedProperty.location,
          maxBudget: selectedProperty.target_selling_price
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompiledPitch(data.pitch || "");
        setEncodedPitch(data.encodedPitch || "");
        setMapsLinks(data.mapsLinks || []);
        onAddLog(`Matched buyer "${buyerName}" against property "${selectedProperty.title}" & generated WhatsApp pitch.`);
      } else {
        alert("Error: " + (data.error || "Failed to generate pitch."));
      }
    } catch (err) {
      console.error(err);
      alert("Network error running match.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddPropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle || !newPropLocation || !newPropSellingPrice) return;

    if (onAddProperty) {
      onAddProperty({
        title: newPropTitle,
        property_type: newPropType,
        location: newPropLocation,
        asking_price: Number(newPropAskingPrice || newPropSellingPrice),
        target_selling_price: Number(newPropSellingPrice),
        source_person_name: newPropSource || "Direct Owner",
        source_person_type: newPropSourceType,
        image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
        status: "Available"
      });
    }

    // Reset and close
    setNewPropTitle("");
    setNewPropLocation("");
    setNewPropAskingPrice("");
    setNewPropSellingPrice("");
    setNewPropSource("");
    setIsAddPropertyOpen(false);
  };

  const handleAddBuyerRequirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerName || !newBuyerPhone || !newBuyerBudget) return;

    if (onAddBuyerRequirement) {
      onAddBuyerRequirement({
        buyer_name: newBuyerName,
        buyer_phone: newBuyerPhone,
        preferred_location: newBuyerLocation || "Anywhere",
        max_budget: Number(newBuyerBudget),
        property_type: newBuyerPropType
      });
    }

    // Reset and close
    setNewBuyerName("");
    setNewBuyerPhone("");
    setNewBuyerLocation("");
    setNewBuyerBudget("");
    setIsAddBuyerOpen(false);
  };

  // Filter properties
  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All Listings" || p.property_type === filterType;
    return matchesSearch && matchesType;
  });

  const propertyTypeChips = ["All Listings", "Villa", "Flat", "Plot", "Commercial"];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 relative">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            REAL ESTATE DESK
          </h2>
          <h1 className="text-lg font-black text-slate-900 mt-1">Live Property & Demands Registry</h1>
        </div>

        {/* View mode toggle sub-tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'inventory' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🏠 Listings ({properties.length})
          </button>
          <button
            onClick={() => setActiveSubTab('demands')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'demands' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 Buyer Demands ({buyerRequirements.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'inventory' ? (
        <>
          {/* Value Hero Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex justify-between items-center h-28 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 font-black text-6xl">
              REALTY
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Portfolio Value</span>
              <p className="text-3xl font-black mt-1">
                {totalPortfolioValue >= 10000000 
                  ? `₹${(totalPortfolioValue / 10000000).toFixed(2)}Cr` 
                  : totalPortfolioValue >= 100000 
                    ? `₹${(totalPortfolioValue / 100000).toFixed(1)}L` 
                    : `₹${totalPortfolioValue.toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 py-1.5 px-3 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-bold">{activeListingsCount} Active Listings</span>
              </div>
              {activeRole !== "Telecaller" && (
                <button
                  onClick={() => setIsAddPropertyOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 px-4 rounded-lg flex items-center gap-1 shadow-md transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  ADD PROPERTY
                </button>
              )}
            </div>
          </div>

          {/* Search Input and Filter Chips */}
          <section className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search address, project name, landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-white border border-slate-300 rounded-xl pl-11 pr-4 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {propertyTypeChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setFilterType(chip)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    filterType === chip
                      ? "bg-slate-950 text-white border-slate-950"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {chip === "All Listings" ? "All Listings" : chip}
                </button>
              ))}
            </div>
          </section>

          {/* Property inventory grid list */}
          <div className="grid grid-cols-1 gap-6">
            {filteredProperties.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed p-10 rounded-2xl text-center space-y-3">
                <span className="material-symbols-outlined text-slate-400 text-4xl">home_work</span>
                <p className="text-sm font-bold text-slate-800">No Listings Found</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">There are currently no real estate listings in your inventory. Add properties to manage the portfolio here.</p>
              </div>
            ) : (
              filteredProperties.map((prop) => (
              <div
                key={prop.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row"
              >
                {/* Image section */}
                <div className="relative w-full md:w-52 h-44 shrink-0 bg-slate-100">
                  <img
                    src={prop.image_url}
                    alt={prop.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm ${
                    prop.status === "Available" ? "bg-emerald-600" : "bg-amber-600"
                  }`}>
                    {prop.status}
                  </span>
                </div>

                {/* Details Section */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight hover:underline">
                        {prop.title}
                      </h3>
                      <span className="text-base font-black text-slate-900 shrink-0">
                        ₹{(prop.target_selling_price / 100000).toFixed(1)}L
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-slate-500 text-xs mt-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span>{prop.location}</span>
                    </div>
                  </div>

                  {/* Confidential specs (authenticated metrics) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>Confidential Supplier Specs</span>
                      <span className="text-emerald-700">🔒 Broker Access</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Original Source:</span>
                      <span className="font-bold text-slate-900">{prop.source_person_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Internal supplier Cost:</span>
                      <span className="font-bold text-slate-900">
                        {canSeeSupplierCosts ? `₹${prop.asking_price.toLocaleString()}` : "🔒 RESTRICTED"}
                      </span>
                    </div>
                  </div>

                  {/* Action Pitch button */}
                  <button
                    onClick={() => handleOpenMatcher(prop)}
                    className="w-full h-10 bg-slate-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    Generate Dynamic Pitch & Share
                  </button>
                </div>
              </div>
            )))}
          </div>
        </>
      ) : (
        /* BUYER DEMANDS REGISTER UI SECTION */
        <div className="space-y-4 animate-fade-in">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-5 rounded-2xl text-white flex justify-between items-center shadow-lg">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded">
                Live Lead Matcher
              </span>
              <h2 className="text-xl font-black">Proactive Buyer Matching</h2>
              <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Log buyer demands and connect them directly to listing inventory</p>
            </div>
            <button
              onClick={() => setIsAddBuyerOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs h-10 px-4 rounded-xl flex items-center gap-1 shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-bold">person_add</span>
              LOG BUYER DEMAND
            </button>
          </div>

          {/* List of Buyer Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buyerRequirements.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-200 border-dashed p-10 rounded-2xl text-center space-y-3">
                <span className="material-symbols-outlined text-slate-400 text-4xl">person_search</span>
                <p className="text-sm font-bold text-slate-800">No Buyer Requirements Registered</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Add a buyer requirement to run the proactive matching engine against your live properties.</p>
              </div>
            ) : (
              buyerRequirements.map((req) => {
                const autoMatches = properties.filter(
                  p => p.property_type === req.property_type && p.target_selling_price <= req.max_budget
                );
                return (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-slate-950 text-base">{req.buyer_name}</h3>
                          <p className="text-xs text-slate-500 font-mono">📱 {req.buyer_phone}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                          autoMatches.length > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {autoMatches.length > 0 ? `${autoMatches.length} Matches Found` : "Pending Match"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wide block">Preferred Type</span>
                          <span className="font-bold text-slate-800">🏗️ {req.property_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wide block">Budget (Max)</span>
                          <span className="font-extrabold text-slate-900">₹{(req.max_budget / 100000).toFixed(1)} Lakhs</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wide block">Location Match</span>
                          <span className="font-bold text-slate-800">📍 {req.preferred_location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Proactive match action list */}
                    {autoMatches.length > 0 ? (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block">Direct Inventory Matches:</span>
                        <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                          {autoMatches.map(match => (
                            <div key={match.id} className="flex justify-between items-center text-xs py-1.5 px-2 bg-emerald-50/50 hover:bg-emerald-50 rounded border border-emerald-100/50">
                              <span className="font-bold text-slate-800 truncate max-w-[65%]" title={match.title}>{match.title}</span>
                              <button
                                onClick={() => {
                                  setSelectedProperty(match);
                                  setBuyerName(req.buyer_name);
                                  setBuyerPhone(req.buyer_phone);
                                  setIsDrawerOpen(true);
                                }}
                                className="bg-slate-950 text-white font-extrabold text-[10px] px-2 py-1 rounded hover:bg-black transition-colors"
                              >
                                AUTO-PITCH
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded text-center border border-amber-100/50 font-bold uppercase tracking-wider">
                        ⚠️ No budget-friendly property in catalog matches this lead.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* DYNAMIC PITCH GENERATOR DRAWER MODAL */}
      {isDrawerOpen && selectedProperty && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 overflow-y-auto space-y-6 flex flex-col justify-between shadow-2xl animate-slide-in">
            <div className="space-y-6">
              {/* Drawer header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">AI Auto-Match & Pitch</h3>
                  <p className="text-xs text-slate-500 mt-1">Matching against "{selectedProperty.title}"</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="material-symbols-outlined text-slate-400 hover:text-black p-1 hover:bg-slate-100 rounded-full"
                >
                  close
                </button>
              </div>

              {/* Lead registration form */}
              <form onSubmit={handleRunAutoMatcher} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Buyer Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amit Verma"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isMatching || !buyerName}
                  className="w-full h-11 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-bold">analytics</span>
                  {isMatching ? "AI Matcher Running..." : "Run AI Lead Auto-Matcher"}
                </button>
              </form>

              {/* Sales pitch display section */}
              {compiledPitch && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                      Gemini Auto-Compiled Marketing Pitch
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(compiledPitch);
                        alert("Copied to clipboard!");
                      }}
                      className="text-emerald-700 hover:underline text-xs font-bold"
                    >
                      Copy Text
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto no-scrollbar">
                    {compiledPitch}
                  </div>

                  {/* Grounded Google Maps Links */}
                  {mapsLinks && mapsLinks.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        📍 Verified Location Highlights (Maps Grounding)
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {mapsLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">map</span>
                            <span>{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direct sharing WhatsApp integration */}
            {compiledPitch && (
              <div className="border-t border-slate-100 pt-4 bg-white">
                <a
                  href={`https://wa.me/${buyerPhone || "919876543210"}?text=${encodedPitch}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/15"
                >
                  <span className="material-symbols-outlined text-base font-bold">chat</span>
                  Share Direct via WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD NEW PROPERTY MODAL */}
      {isAddPropertyOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase">Add Real Estate Property</h3>
              <button onClick={() => setIsAddPropertyOpen(false)} className="material-symbols-outlined text-slate-400 hover:text-black">
                close
              </button>
            </div>

            <form onSubmit={handleAddPropertySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Property Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3BHK Luxury Apartment, Sunrise Greens"
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Property Type
                  </label>
                  <select
                    value={newPropType}
                    onChange={(e) => setNewPropType(e.target.value as any)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-semibold"
                  >
                    <option value="Villa">Villa</option>
                    <option value="Flat">Flat / Apartment</option>
                    <option value="Plot">Plot</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Site Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sector 82, Mohali"
                    value={newPropLocation}
                    onChange={(e) => setNewPropLocation(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Supplier Cost Asking Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 7500000"
                    value={newPropAskingPrice}
                    onChange={(e) => setNewPropAskingPrice(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Target Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 8200000"
                    value={newPropSellingPrice}
                    onChange={(e) => setNewPropSellingPrice(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Supplier Name ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Chawla Builder"
                    value={newPropSource}
                    onChange={(e) => setNewPropSource(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Supplier Type
                  </label>
                  <select
                    value={newPropSourceType}
                    onChange={(e) => setNewPropSourceType(e.target.value as any)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium"
                  >
                    <option value="Builder">Builder</option>
                    <option value="Owner">Direct Owner</option>
                    <option value="CP">Channel Partner</option>
                    <option value="Rental Investor">Investor</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPropertyOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Save Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BUYER REQUIREMENT MODAL */}
      {isAddBuyerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase">Log Buyer Demand</h3>
              <button onClick={() => setIsAddBuyerOpen(false)} className="material-symbols-outlined text-slate-400 hover:text-black">
                close
              </button>
            </div>

            <form onSubmit={handleAddBuyerRequirementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Buyer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Buyer Phone
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="919876543210"
                    value={newBuyerPhone}
                    onChange={(e) => setNewBuyerPhone(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Max Budget (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 8000000"
                    value={newBuyerBudget}
                    onChange={(e) => setNewBuyerBudget(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Property Type Interest
                  </label>
                  <select
                    value={newBuyerPropType}
                    onChange={(e) => setNewBuyerPropType(e.target.value as any)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-semibold"
                  >
                    <option value="Villa">Villa</option>
                    <option value="Flat">Flat / Apartment</option>
                    <option value="Plot">Plot</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    placeholder="Sector 82, Mohali"
                    value={newBuyerLocation}
                    onChange={(e) => setNewBuyerLocation(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBuyerOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Log Demand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

