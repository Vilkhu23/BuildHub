import React, { useState } from "react";
import { Property } from "../types";

interface PropertyViewProps {
  properties: Property[];
  onAddLog: (log: string) => void;
}

export default function PropertyView({ properties, onAddLog }: PropertyViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All Listings");

  const totalPortfolioValue = properties.reduce((sum, p) => sum + p.asking_price, 0);
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
          maxBudget: selectedProperty.asking_price
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
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          REAL ESTATE DESK
        </h2>
        <h1 className="text-lg font-black text-slate-900 mt-1">Live Property Inventory</h1>
      </div>

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
        <div className="flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 py-1.5 px-3 rounded-lg">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-bold">{activeListingsCount} Active Listings</span>
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
                    ₹{(prop.asking_price / 100000).toFixed(1)}L
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
                  <span className="text-slate-500 font-medium">Base Asking:</span>
                  <span className="font-bold text-slate-900">₹{prop.target_selling_price.toLocaleString()}</span>
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
    </div>
  );
}
