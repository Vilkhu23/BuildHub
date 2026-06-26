import React, { useState } from "react";
import { PurchaseOrder, Project } from "../types";

interface OrdersViewProps {
  orders: PurchaseOrder[];
  projects?: Project[];
  onUpdateOrders: (updated: PurchaseOrder[]) => void;
  onAddLog: (log: string) => void;
}

export default function OrdersView({
  orders,
  projects = [],
  onUpdateOrders,
  onAddLog,
}: OrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "In Transit" | "Completed" | "Cancelled">("All");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // FAB Form Toggle
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderVendor, setNewOrderVendor] = useState("");
  const [newOrderProject, setNewOrderProject] = useState("");
  const [newOrderItemName, setNewOrderItemName] = useState("");
  const [newOrderQty, setNewOrderQty] = useState("");
  const [newOrderPrice, setNewOrderPrice] = useState("");

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = (parseFloat(newOrderPrice) || 0) * (parseFloat(newOrderQty) || 1);
    if (!newOrderVendor || !newOrderItemName || cost <= 0) return;

    const newId = "PO-" + Math.floor(100 + Math.random() * 900);
    const newPo: PurchaseOrder = {
      id: newId,
      vendor_id: "ven-" + Date.now(),
      vendor_name: newOrderVendor,
      project_name: newOrderProject || (projects[0]?.project_name || "Active Site"),
      order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      expected_delivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: cost,
      status: "In Transit",
      item_name: newOrderItemName,
      item_sku: "SKU-" + Math.floor(1000 + Math.random() * 9000),
      quantity_description: `${newOrderQty} Units`,
      unit_price: parseFloat(newOrderPrice) || 0,
      timeline: [
        { title: "Order Placed", date: "Just now", done: true },
        { title: "Processed", date: "Pending warehouse dispatch", done: false },
        { title: "In Transit", date: "En route", done: false },
        { title: "Expected Delivery", date: "4 days from now", done: false }
      ]
    };

    const updated = [newPo, ...orders];
    onUpdateOrders(updated);
    onAddLog(`Raised new Purchase Order ${newId} with ${newOrderVendor} for ₹${cost.toLocaleString()}`);
    alert(`Purchase Order ${newId} Raised Successfully!\nTotal Amount: ₹${cost.toLocaleString()}`);

    // Reset
    setNewOrderVendor("");
    setNewOrderItemName("");
    setNewOrderQty("");
    setNewOrderPrice("");
    setIsNewOrderModalOpen(false);
  };

  const handleConfirmReceipt = (id: string) => {
    const updated = orders.map((o) => {
      if (o.id === id) {
        // Complete the timeline
        const completedTimeline = o.timeline.map((t) => ({ ...t, done: true }));
        return {
          ...o,
          status: "Completed" as const,
          timeline: completedTimeline
        };
      }
      return o;
    });

    onUpdateOrders(updated);
    onAddLog(`Confirmed on-site delivery receipt for Purchase Order ${id}`);
    alert(`Order ${id} marked as Completed!\nMaterial quantities synchronized with storage warehouse.`);
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = filterTab === "All" || o.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Compute stats bento
  const totalSpendVal = orders.reduce((sum, o) => o.status !== "Cancelled" ? sum + o.amount : sum, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {selectedOrderId && selectedOrder ? (
        /* RENDER ORDER DETAILS OVERLAY */
        <div className="space-y-6 animate-fade-in">
          {/* Back button row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedOrderId(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-sm font-black">arrow_back</span>
              Back to History
            </button>
            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              selectedOrder.status === "In Transit"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : selectedOrder.status === "Completed"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {selectedOrder.status}
            </span>
          </div>

          {/* Header titles */}
          <div>
            <h2 className="text-xl font-black text-slate-900">Order {selectedOrder.id}</h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wide">
              {selectedOrder.vendor_name} • {selectedOrder.project_name}
            </p>
          </div>

          {/* Budget Hero Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Value</span>
              <span className="text-2xl font-black text-slate-900">₹{selectedOrder.amount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Payment Status</span>
              <span className="text-emerald-700 bg-emerald-50 text-xs px-2.5 py-1 rounded-lg border border-emerald-100 font-extrabold inline-block mt-1">
                Advance Paid (₹1.5L)
              </span>
            </div>
          </div>

          {/* Logistics Timeline Tracker */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              On-Site Logistics Tracker
            </h3>

            <div className="relative pl-6 space-y-6">
              {/* Vertical line connector */}
              <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200" />

              {selectedOrder.timeline.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Timeline bullet dot */}
                  <div className={`absolute -left-[23px] w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 ${
                    step.done
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-300"
                  }`}>
                    {step.done && (
                      <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-xs font-extrabold ${step.done ? "text-slate-950" : "text-slate-400"}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-slate-500">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Item details row */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Item details</h4>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-extrabold text-xs text-slate-900">{selectedOrder.item_name}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">SKU: {selectedOrder.item_sku}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-xs text-slate-900">{selectedOrder.quantity_description}</p>
                <p className="text-[10px] text-slate-500 mt-1">₹{selectedOrder.unit_price.toLocaleString()} / Unit</p>
              </div>
            </div>
          </section>

          {/* Bill Details */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Bill Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Items Subtotal</span>
                <span className="font-semibold text-slate-900">₹{selectedOrder.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Procurement Tax (GST 18% <span className="text-slate-400">Estimated</span>)</span>
                <span className="font-semibold text-slate-900">₹{(selectedOrder.amount * 0.18).toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>Final Ledger Total</span>
                <span>₹{(selectedOrder.amount * 1.18).toLocaleString()}</span>
              </div>
            </div>
          </section>

          {/* Action Footer */}
          <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 w-full z-40">
            <div className="max-w-4xl flex gap-3 mx-auto">
              <button
                onClick={() => alert(`DOWNLOADING INVOICE:\nPurchase Invoice for Order ${selectedOrder.id} ready to export.`)}
                className="flex-1 h-11 border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-sm font-bold">download</span>
                Download Invoice
              </button>
              {selectedOrder.status === "In Transit" && (
                <button
                  onClick={() => handleConfirmReceipt(selectedOrder.id)}
                  className="flex-[1.5] h-11 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Confirm Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* RENDER DIRECT ORDER HISTORY LIST */
        <div className="space-y-6">
          {/* Top Banner stats bento block */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Ordered</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{orders.length.toString().padStart(2, "0")}</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.2 rounded-full">
                  +12%
                </span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Spend</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-slate-900">₹{(totalSpendVal / 100000).toFixed(1)}L</span>
                <span className="material-symbols-outlined text-xs text-slate-400">account_balance_wallet</span>
              </div>
            </div>
          </section>

          {/* Search bar & filter tabs */}
          <section className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search order id, vendor, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-white border border-slate-300 rounded-xl pl-11 pr-4 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
            </div>

            <div className="flex border-b border-slate-200">
              {(["All", "In Transit", "Completed", "Cancelled"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                    filterTab === tab
                      ? "border-slate-950 text-slate-950 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          {/* Order card list */}
          <section className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">inbox</span>
                <p className="text-xs text-slate-500">No purchase orders matches filters.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-400 hover:shadow cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{order.vendor_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ORDER {order.id}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider border ${
                      order.status === "In Transit"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : order.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 mt-1">{order.item_name}</p>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>Expected: {order.expected_delivery}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">₹{order.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Sticky FAB button */}
          <div className="fixed bottom-20 right-4 z-40">
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="w-12 h-12 bg-slate-950 hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined font-black text-xl">add</span>
            </button>
          </div>
        </div>
      )}

      {/* FAB: RAISE NEW PURCHASE ORDER DIALOG */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase">Raise Purchase Order</h3>
              <button onClick={() => setIsNewOrderModalOpen(false)} className="material-symbols-outlined text-slate-400 hover:text-black">
                close
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gupta Marbles"
                  value={newOrderVendor}
                  onChange={(e) => setNewOrderVendor(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Allocation
                </label>
                {projects && projects.length > 0 ? (
                  <select
                    value={newOrderProject || projects[0]?.project_name}
                    onChange={(e) => setNewOrderProject(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white font-medium text-slate-800"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.project_name}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Active Site"
                    value={newOrderProject}
                    onChange={(e) => setNewOrderProject(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Material / Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Italian Granite Blocks"
                  value={newOrderItemName}
                  onChange={(e) => setNewOrderItemName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={newOrderQty}
                    onChange={(e) => setNewOrderQty(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 450"
                    value={newOrderPrice}
                    onChange={(e) => setNewOrderPrice(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="flex-1 h-10 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold active:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-black active:scale-[0.98]"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
