import React, { useState } from "react";
import { MaterialStock, Vendor, Project } from "../types";

interface MaterialsViewProps {
  stocks: MaterialStock[];
  vendors: Vendor[];
  projects?: Project[];
  onOrderStock: (stockId: string, qty: number) => void;
  onAddStock?: (stock: Omit<MaterialStock, "id">) => void;
  onAddLog: (log: string) => void;
}

export default function MaterialsView({
  stocks,
  vendors,
  projects = [],
  onOrderStock,
  onAddStock,
  onAddLog,
}: MaterialsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"inventory" | "vendors">("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Items");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Dynamic calculations
  const totalStockValue = stocks.reduce((sum, s) => sum + (s.current_stock * (s.category === "Steel" ? 1200 : s.category === "Cement" ? 420 : 650)), 0);
  const lowStockAlertsCount = stocks.filter(s => s.status === "Low Stock" || s.status === "Out of Stock").length;
  const totalVendorsCount = vendors.length;
  const totalPendingPayments = vendors.reduce((sum, v) => sum + v.balance_due, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatLakhsCroresShort = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return formatCurrency(value);
  };

  // State for opening "Order More" modal
  const [orderModalStockId, setOrderModalStockId] = useState<string | null>(null);
  const [orderQty, setOrderQty] = useState("");

  // State for opening "Add Stock Item" modal
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [newStockName, setNewStockName] = useState("");
  const [newStockCategory, setNewStockCategory] = useState("Cement");
  const [newStockLocation, setNewStockLocation] = useState("Main Warehouse");
  const [newStockCurrentStock, setNewStockCurrentStock] = useState("");
  const [newStockUnit, setNewStockUnit] = useState("Bags");
  const [newStockCriticalLevel, setNewStockCriticalLevel] = useState("");
  const [newStockIcon, setNewStockIcon] = useState("inventory_2");

  const selectedStock = stocks.find(s => s.id === orderModalStockId);

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName || !onAddStock) return;

    const currentQty = parseFloat(newStockCurrentStock) || 0;
    const criticalLevel = parseFloat(newStockCriticalLevel) || 10;

    onAddStock({
      name: newStockName,
      category: newStockCategory,
      location: newStockLocation,
      current_stock: currentQty,
      unit: newStockUnit,
      critical_level: criticalLevel,
      status: currentQty > criticalLevel ? "In Stock" : currentQty > 0 ? "Low Stock" : "Out of Stock",
      icon: newStockIcon
    });

    // Reset fields
    setNewStockName("");
    setNewStockCategory("Cement");
    setNewStockLocation("Main Warehouse");
    setNewStockCurrentStock("");
    setNewStockUnit("Bags");
    setNewStockCriticalLevel("");
    setNewStockIcon("inventory_2");
    setIsAddStockModalOpen(false);
  };

  const handleTriggerOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalStockId) return;
    const qty = parseFloat(orderQty) || 0;
    if (qty <= 0) return;

    onOrderStock(orderModalStockId, qty);
    onAddLog(`Placed new procurement order for ${qty} units of ${selectedStock?.name}`);
    alert(` procurement order successfully initiated with vendor!\n- Material: ${selectedStock?.name}\n- Quantity: ${qty} ${selectedStock?.unit}`);

    setOrderQty("");
    setOrderModalStockId(null);
  };

  // Filter stocks
  const filteredStocks = stocks.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          st.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All Items" || st.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    return v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           v.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Categories list
  const categoryChips = ["All Items", "Cement", "Steel", "Wood", "Plumbing", "Electrical"];

  // Open direct vendor detail
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Sub tabs selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveSubTab("inventory");
            setSelectedVendorId(null);
            setSearchQuery("");
          }}
          className={`flex-1 py-3 text-center text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all ${
            activeSubTab === "inventory" && !selectedVendorId
              ? "border-black text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-900"
          }`}
        >
          🏗️ Stock Inventory
        </button>
        <button
          onClick={() => {
            setActiveSubTab("vendors");
            setSearchQuery("");
          }}
          className={`flex-1 py-3 text-center text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all ${
            activeSubTab === "vendors" || selectedVendorId
              ? "border-black text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-900"
          }`}
        >
          🤝 Vendor Directory
        </button>
      </div>

      {/* RENDER VENDOR DETAIL VIEW (IF SELECTED) */}
      {selectedVendorId && selectedVendor ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Back Button */}
          <button
            onClick={() => setSelectedVendorId(null)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-black"
          >
            <span className="material-symbols-outlined text-sm font-black">arrow_back</span>
            Back to Directory
          </button>

          {/* Profile overview card */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 font-black text-lg text-slate-700">
                  {selectedVendor.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900">{selectedVendor.name}</h2>
                    {selectedVendor.status === "PREFERRED" && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-200">
                        PREFERRED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="flex items-center gap-0.5 font-extrabold text-amber-500">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {selectedVendor.rating}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold">{selectedVendor.category}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance progress bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>On-Time Delivery</span>
                  <span className="font-extrabold text-emerald-600">{selectedVendor.on_time_delivery_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${selectedVendor.on_time_delivery_pct}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Quality Score</span>
                  <span className="font-extrabold text-slate-900">{selectedVendor.quality_rating}/5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-900 h-full rounded-full" style={{ width: `${(selectedVendor.quality_rating / 5) * 100}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* Quick contact buttons */}
          <div className="grid grid-cols-3 gap-3">
            <a
              href="tel:919876543210"
              className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-900 text-xl font-bold">call</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase">Call</span>
            </a>
            <button
              onClick={() => {
                const text = `Hi ${selectedVendor.name}, regarding the ledger balance sheet from BuildEstimate. Can you share the latest delivery manifest?`;
                window.open(`https://wa.me/919876543210?text=${encodeURIComponent(text)}`, "_blank");
              }}
              className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-emerald-600 text-xl font-bold">chat</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase text-center">WhatsApp</span>
            </button>
            <a
              href="mailto:contact@buildestimate.in"
              className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-500 text-xl font-bold">mail</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase">Email</span>
            </a>
          </div>

          {/* Spend indications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Spent</span>
              <span className="text-white text-xl font-black mt-1">₹{(selectedVendor.total_spent / 100000).toFixed(1)}L</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Paid Amount</span>
              <span className="text-slate-900 text-xl font-black mt-1">₹{(selectedVendor.paid_amount / 100000).toFixed(1)}L</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-rose-800 font-bold text-[10px] uppercase tracking-wider">Balance Due</span>
              <span className="text-rose-600 text-xl font-black mt-1">₹{(selectedVendor.balance_due / 100000).toFixed(1)}L</span>
            </div>
          </div>

          {/* Active Order Card */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Active Orders (1)
            </h3>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-sm text-slate-900">Order #VE-104</p>
                  <p className="text-xs text-slate-500 mt-0.5">500 Sq. Ft. Premium Italian White Marble</p>
                </div>
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-[9px] border border-amber-200">
                  IN TRANSIT
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <span className="material-symbols-outlined text-slate-500 text-base">schedule</span>
                <p className="text-xs text-slate-700">Expected On-Site: <span className="font-extrabold">Oct 28, 2023</span></p>
              </div>
              <div className="flex gap-1 w-full">
                <div className="h-1.5 flex-1 bg-slate-900 rounded-full" />
                <div className="h-1.5 flex-1 bg-slate-900 rounded-full" />
                <div className="h-1.5 flex-1 bg-slate-900 rounded-full" />
                <div className="h-1.5 flex-1 bg-slate-200 rounded-full" />
              </div>
            </div>
          </section>

          {/* Transaction History list */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Order History
            </h3>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              <div className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">#VE-092 - Granite Slabs</p>
                    <p className="text-[10px] text-slate-400">Sep 14, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-slate-900">₹3,45,000</p>
                  <p className="text-[10px] text-emerald-600 font-extrabold">Completed</p>
                </div>
              </div>

              <div className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">history</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">#VE-088 - Wall Tiles</p>
                    <p className="text-[10px] text-slate-400">Aug 22, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-slate-900">₹1,12,500</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Completed</p>
                </div>
              </div>

              <div className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">priority_high</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">#VE-075 - Mosaic Patterns</p>
                    <p className="text-[10px] text-slate-400">Jul 05, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-slate-900">₹78,000</p>
                  <p className="text-[10px] text-rose-600 font-bold">Pending Payment</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sticky footer actions */}
          <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 w-full z-40">
            <div className="max-w-4xl flex gap-3 mx-auto">
              <button
                onClick={() => alert("Vendor Audit Report:\nOn-Time delivery rate: 98%\nVendor is flagged PREFERRED.\nCompliance: Verified.")}
                className="flex-1 h-11 border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-sm font-bold">analytics</span>
                Review Performance
              </button>
              <button
                onClick={() => {
                  setSelectedVendorId(null);
                  setActiveSubTab("inventory");
                  setOrderModalStockId("st-1");
                }}
                className="flex-[1.5] h-11 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                New Procurement Order
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* RENDER DIRECT INVENTORY OR VENDORS LISTS */
        <>
          {/* Sub Tab 1: Materials Inventory */}
          {activeSubTab === "inventory" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stock Value */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Total Stock Value</span>
                    <span className="material-symbols-outlined text-emerald-700">payments</span>
                  </div>
                  <div className="flex flex-col mt-2">
                    <span className="text-2xl font-black text-slate-900">{formatCurrency(totalStockValue)}</span>
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full w-fit mt-1.5">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      <span className="text-[10px] font-bold">{stocks.length > 0 ? "12% vs last month" : "No stock items"}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Alerts */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
                    <span className="material-symbols-outlined text-rose-600 font-bold">warning</span>
                  </div>
                  <div className="flex flex-col mt-2">
                    <span className={`text-3xl font-black ${lowStockAlertsCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{lowStockAlertsCount.toString().padStart(2, "0")}</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-2">{lowStockAlertsCount > 0 ? "Requires immediate reorder" : "All stocks safe"}</span>
                  </div>
                </div>
              </section>

              {/* Search bar & Filter Category Chips */}
              <section className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search materials, grades, or warehouse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 bg-white border border-slate-300 rounded-xl pl-11 pr-4 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400"
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    search
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {categoryChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setCategoryFilter(chip)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                        categoryFilter === chip
                          ? "bg-slate-950 text-white border-slate-950"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </section>

              {/* Inventory list */}
              <section className="space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Current Inventory</h3>
                  {onAddStock && (
                    <button
                      onClick={() => setIsAddStockModalOpen(true)}
                      className="bg-slate-950 hover:bg-black text-white h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add_circle</span>
                      Add Stock Item
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {filteredStocks.length === 0 ? (
                    <div className="bg-white border border-slate-200 border-dashed p-10 rounded-2xl text-center space-y-3">
                      <span className="material-symbols-outlined text-slate-400 text-4xl">inventory_2</span>
                      <p className="text-sm font-bold text-slate-800">No Stock Items Found</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">There are currently no raw materials in stock. Create procurement requests or register inventory to begin.</p>
                    </div>
                  ) : (
                    filteredStocks.map((st) => {
                      const isLowStock = st.status === "Low Stock" || st.status === "Out of Stock";

                      return (
                        <div
                          key={st.id}
                          className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow transition-shadow ${
                            isLowStock ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-slate-900 ${
                                isLowStock ? "bg-rose-50 text-rose-600" : "bg-slate-100"
                              }`}>
                                <span className="material-symbols-outlined">{st.icon}</span>
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-sm">{st.name}</h4>
                                <div className="flex items-center gap-0.5 text-slate-500 text-xs mt-0.5 font-medium">
                                  <span className="material-symbols-outlined text-xs">location_on</span>
                                  {st.location}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              st.status === "In Stock"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : st.status === "Low Stock"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {st.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <div>
                              <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                                {st.status === "Out of Stock" ? "Critical Level" : "Current Stock"}
                              </span>
                              <span className={`text-base font-extrabold ${isLowStock ? "text-rose-600" : "text-slate-900"}`}>
                                {st.current_stock}{" "}
                                <span className="text-slate-500 text-xs font-normal">{st.unit}</span>
                              </span>
                            </div>

                            {isLowStock ? (
                              <button
                                onClick={() => setOrderModalStockId(st.id)}
                                className="bg-slate-950 hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-sm"
                              >
                                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                                Order More
                              </button>
                            ) : (
                              <button
                                onClick={() => alert(`Material Detail Summary:\n- Name: ${st.name}\n- Warehouse: ${st.location}\n- Threshold level for reorder: ${st.critical_level} ${st.unit}`)}
                                className="text-slate-700 hover:text-black hover:border-slate-400 border border-slate-200 px-4 py-2 rounded-lg font-label-bold text-xs"
                              >
                                Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Sub Tab 2: Vendor Directory */}
          {activeSubTab === "vendors" && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <section className="grid grid-cols-2 gap-3">
                {/* Total Vendors */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Total Active</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalVendorsCount.toString().padStart(2, "0")}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-emerald-700 font-bold text-xs">
                    <span className="material-symbols-outlined text-xs">trending_up</span>
                    <span>+3 this month</span>
                  </div>
                </div>

                {/* Pending Payments */}
                <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-900 text-white flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Pending Payments</span>
                    <p className="text-2xl font-black text-white mt-1">{formatLakhsCroresShort(totalPendingPayments)}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (vendors.length === 0) {
                        alert("No pending vendor invoices.");
                      } else {
                        const info = vendors.map(v => `${v.name}: ${formatCurrency(v.balance_due)}`).join("\n");
                        alert(`REVIEW INVOICES:\n${info}`);
                      }
                    }}
                    className="mt-3 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold text-[10px] uppercase tracking-tight text-center animate-fade-in"
                  >
                    Review Invoices
                  </button>
                </div>
              </section>

              {/* Search and Filters */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-semibold text-sm outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Vendors List Cards */}
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Recent & Preferred Vendors</h2>

                {filteredVendors.length === 0 ? (
                  <div className="bg-white border border-slate-200 border-dashed p-10 rounded-2xl text-center space-y-3">
                    <span className="material-symbols-outlined text-slate-400 text-4xl">storefront</span>
                    <p className="text-sm font-bold text-slate-800">No Vendors Found</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Your supplier directory is empty. Add preferred vendors and contact profiles to dispatch material orders.</p>
                  </div>
                ) : (
                  filteredVendors.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-slate-400 hover:shadow transition-all"
                  >
                    <div className="p-4 flex flex-col space-y-4">
                      {/* Top Row */}
                      <div className="flex justify-between items-start">
                        <div
                          onClick={() => setSelectedVendorId(v.id)}
                          className="flex gap-3 cursor-pointer group"
                        >
                          <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center text-slate-900 group-hover:bg-slate-200 transition-colors">
                            <span className="material-symbols-outlined text-xl">
                              {v.category === "Finishes" ? "home_repair_service" : v.category === "Structural" ? "foundation" : "bolt"}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:underline">{v.name}</h3>
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                              <span>{v.category}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <div className="flex items-center">
                                <span className="material-symbols-outlined text-xs text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="font-bold ml-0.5">{v.rating}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          v.status === "PREFERRED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : v.status === "ACTIVE"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {v.status}
                        </span>
                      </div>

                      {/* Info Columns */}
                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 text-[9px] uppercase font-bold tracking-tight">Active Orders</p>
                          <p className="font-extrabold text-slate-900">{v.active_orders_count.toString().padStart(2, "0")} Orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-[9px] uppercase font-bold tracking-tight">Last Delivery</p>
                          <p className="font-extrabold text-slate-900">{v.last_delivery_date}</p>
                        </div>
                      </div>

                      {/* Call/New Order Actions */}
                      <div className="flex gap-2">
                        <a
                          href="tel:919876543210"
                          className="flex-1 h-10 border border-slate-950 text-slate-900 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">call</span>
                          Call
                        </a>
                        <button
                          onClick={() => {
                            setSelectedVendorId(v.id);
                            setActiveSubTab("inventory");
                            setOrderModalStockId("st-1");
                          }}
                          className="flex-[2] h-10 bg-slate-950 hover:bg-black text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                          New Order
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}
        </>
      )}

      {/* PROCURE STOCK MODAL DIALOG */}
      {orderModalStockId && selectedStock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Reorder Material Stock
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Procuring for {projects && projects.length > 0 ? projects[0].project_name : "Active Site"}</p>
              </div>
              <button
                onClick={() => setOrderModalStockId(null)}
                className="material-symbols-outlined text-slate-400 hover:text-black"
              >
                close
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-rose-600 font-bold">warning</span>
              <div className="text-xs text-rose-950 leading-tight">
                <span className="font-extrabold">Stock Alert:</span> Current quantity in {selectedStock.location} is <span className="font-extrabold">{selectedStock.current_stock} {selectedStock.unit}</span>.
              </div>
            </div>

            <form onSubmit={handleTriggerOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Material
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedStock.name}
                  className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Order Quantity ({selectedStock.unit})
                </label>
                <input
                  type="number"
                  required
                  placeholder={`e.g. ${selectedStock.critical_level * 2}`}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalStockId(null)}
                  className="flex-1 h-10 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold active:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-black active:scale-[0.98]"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER NEW STOCK MODAL DIALOG */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl animate-scale-up my-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500">add_business</span>
                  Register Material Stock
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Define new material specifications to track inventory level & trigger reorder reminders.</p>
              </div>
              <button
                onClick={() => setIsAddStockModalOpen(false)}
                className="material-symbols-outlined text-slate-400 hover:text-black transition-colors"
              >
                close
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ultratech Cement OPC 53"
                    value={newStockName}
                    onChange={(e) => setNewStockName(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStockCategory}
                    onChange={(e) => setNewStockCategory(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium"
                  >
                    <option value="Cement">Cement</option>
                    <option value="Steel">Steel</option>
                    <option value="Wood">Wood</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Bricks">Bricks</option>
                    <option value="Finishes">Finishes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Warehouse Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sector-63 Yard A"
                    value={newStockLocation}
                    onChange={(e) => setNewStockLocation(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Measurement Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bags, Tons, Nos, Brass"
                    value={newStockUnit}
                    onChange={(e) => setNewStockUnit(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Initial Stock Level <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 150"
                    value={newStockCurrentStock}
                    onChange={(e) => setNewStockCurrentStock(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Critical Threshold (Reorder Alert) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 30"
                    value={newStockCriticalLevel}
                    onChange={(e) => setNewStockCriticalLevel(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Material Icon selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Visual Icon representation
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "inventory_2", label: "Box/Bag", icon: "inventory_2" },
                    { id: "foundation", label: "Steel", icon: "foundation" },
                    { id: "carpentry", label: "Wood", icon: "carpentry" },
                    { id: "plumbing", label: "Plumbing", icon: "plumbing" },
                    { id: "bolt", label: "Power", icon: "bolt" },
                    { id: "format_paint", label: "Paint", icon: "format_paint" },
                    { id: "border_outer", label: "Brick", icon: "border_outer" },
                    { id: "hardware", label: "Tools", icon: "hardware" }
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setNewStockIcon(ic.icon)}
                      className={`h-14 border rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-[10px] font-bold cursor-pointer ${
                        newStockIcon === ic.icon
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm scale-[1.03]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{ic.icon}</span>
                      <span>{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddStockModalOpen(false)}
                  className="flex-1 h-10 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold active:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-black active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  Register Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
