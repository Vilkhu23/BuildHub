import React, { useState } from "react";
import { Project } from "../types";

interface EstimatesViewProps {
  projects: Project[];
  onAddLog: (log: string) => void;
  onUpdateProject?: (project: Project) => void;
}

interface LineItem {
  name: string;
  amount: number;
}

export default function EstimatesView({ projects, onAddLog, onUpdateProject }: EstimatesViewProps) {
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Category expanded state
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    civil: true,
    electrical: false,
    finishes: true,
  });

  // Track selected project ID
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.length > 0 ? projects[0].id : ""
  );

  // Ensure selectedProjectId is kept in sync if projects list changes
  const activeProjId = selectedProjectId || (projects.length > 0 ? projects[0].id : "");
  const selectedProject = projects.find(p => p.id === activeProjId) || projects[0];

  // Helper to dynamically get estimates with seed fallbacks
  const getProjectEstimates = (proj: Project | undefined) => {
    if (!proj) return { civil: [], electrical: [], finishes: [] };
    if (proj.estimates) return proj.estimates;
    
    // Fallback default estimates for pr-3 if not set
    if (proj.id === "pr-3") {
      return {
        civil: [
          { name: "Reinforcement Steel", amount: 1240000 },
          { name: "RMC (M25 Grade)", amount: 1815000 },
        ],
        electrical: [
          { name: "Internal Wiring Copper", amount: 450000 },
          { name: "Distribution Board Panels", amount: 575000 },
        ],
        finishes: [
          { name: "Italian Marble Premium", amount: 1350000 },
          { name: "Premium Emulsion Paints", amount: 1041700 },
        ]
      };
    }
    // General fallback defaults for other projects
    if (proj.id === "pr-1") {
      return {
        civil: [
          { name: "Foundations & Plinth", amount: 1850000 },
          { name: "Structure Masonry", amount: 2200000 }
        ],
        electrical: [
          { name: "Conduit Pipes Fitting", amount: 250000 },
          { name: "Modular Switches", amount: 150000 }
        ],
        finishes: [
          { name: "External Plaster Paint", amount: 650000 },
          { name: "Vitrified Flooring", amount: 1100000 }
        ]
      };
    }
    if (proj.id === "pr-2") {
      return {
        civil: [
          { name: "Basement Excavation", amount: 4500000 },
          { name: "Superstructure Columns", amount: 8200000 }
        ],
        electrical: [
          { name: "HT Substation Transformer", amount: 3500000 },
          { name: "Wiring & Conduit Work", amount: 1500000 }
        ],
        finishes: [
          { name: "Glass Curtain Wall Finishes", amount: 4200000 },
          { name: "Granite Lobby Tiling", amount: 1800000 }
        ]
      };
    }

    return { civil: [], electrical: [], finishes: [] };
  };

  const currentEstimates = getProjectEstimates(selectedProject);
  const civilItems = currentEstimates.civil;
  const electricalItems = currentEstimates.electrical;
  const finishesItems = currentEstimates.finishes;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // State for Add/Edit Line Item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [targetCategory, setTargetCategory] = useState<"civil" | "electrical" | "finishes" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<"civil" | "electrical" | "finishes" | null>(null);

  const handleOpenAddModal = (cat: "civil" | "electrical" | "finishes") => {
    setTargetCategory(cat);
    setEditingIndex(null);
    setEditingCategory(null);
    setNewItemName("");
    setNewItemAmount("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: "civil" | "electrical" | "finishes", index: number, item: LineItem) => {
    setTargetCategory(cat);
    setEditingIndex(index);
    setEditingCategory(cat);
    setNewItemName(item.name);
    setNewItemAmount(item.amount.toString());
    setIsModalOpen(true);
  };

  const handleDeleteLineItem = (category: "civil" | "electrical" | "finishes", index: number) => {
    if (!selectedProject || !onUpdateProject) return;
    let itemName = "";
    let nextCivil = [...civilItems];
    let nextElec = [...electricalItems];
    let nextFin = [...finishesItems];

    if (category === "civil") {
      itemName = civilItems[index]?.name || "";
      nextCivil = nextCivil.filter((_, idx) => idx !== index);
    } else if (category === "electrical") {
      itemName = electricalItems[index]?.name || "";
      nextElec = nextElec.filter((_, idx) => idx !== index);
    } else if (category === "finishes") {
      itemName = finishesItems[index]?.name || "";
      nextFin = nextFin.filter((_, idx) => idx !== index);
    }

    const nextGrandTotal = nextCivil.reduce((sum, item) => sum + item.amount, 0) +
                           nextElec.reduce((sum, item) => sum + item.amount, 0) +
                           nextFin.reduce((sum, item) => sum + item.amount, 0);

    onUpdateProject({
      ...selectedProject,
      total_budget: nextGrandTotal,
      estimates: {
        civil: nextCivil,
        electrical: nextElec,
        finishes: nextFin,
      }
    });

    onAddLog(`Deleted estimate line item "${itemName}" from ${category}`);
  };

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !onUpdateProject) return;
    const amountNum = parseFloat(newItemAmount) || 0;
    if (!newItemName || amountNum <= 0) return;

    let nextCivil = [...civilItems];
    let nextElec = [...electricalItems];
    let nextFin = [...finishesItems];

    if (editingIndex !== null && editingCategory !== null) {
      // Editing Mode
      if (editingCategory === "civil") {
        nextCivil = nextCivil.map((item, idx) => idx === editingIndex ? { name: newItemName, amount: amountNum } : item);
      } else if (editingCategory === "electrical") {
        nextElec = nextElec.map((item, idx) => idx === editingIndex ? { name: newItemName, amount: amountNum } : item);
      } else if (editingCategory === "finishes") {
        nextFin = nextFin.map((item, idx) => idx === editingIndex ? { name: newItemName, amount: amountNum } : item);
      }
      onAddLog(`Updated estimate line item to "${newItemName}" under ${editingCategory} for ₹${amountNum.toLocaleString()}`);
    } else if (targetCategory) {
      // Adding Mode
      if (targetCategory === "civil") {
        nextCivil.push({ name: newItemName, amount: amountNum });
      } else if (targetCategory === "electrical") {
        nextElec.push({ name: newItemName, amount: amountNum });
      } else if (targetCategory === "finishes") {
        nextFin.push({ name: newItemName, amount: amountNum });
      }
      onAddLog(`Added estimate line item "${newItemName}" under ${targetCategory} for ₹${amountNum.toLocaleString()}`);
    }

    const nextGrandTotal = nextCivil.reduce((sum, item) => sum + item.amount, 0) +
                           nextElec.reduce((sum, item) => sum + item.amount, 0) +
                           nextFin.reduce((sum, item) => sum + item.amount, 0);

    onUpdateProject({
      ...selectedProject,
      total_budget: nextGrandTotal,
      estimates: {
        civil: nextCivil,
        electrical: nextElec,
        finishes: nextFin,
      }
    });

    // Reset and close
    setNewItemName("");
    setNewItemAmount("");
    setIsModalOpen(false);
    setTargetCategory(null);
    setEditingIndex(null);
    setEditingCategory(null);
  };

  // Compute live sums
  const totalCivil = civilItems.reduce((sum, item) => sum + item.amount, 0);
  const totalElectrical = electricalItems.reduce((sum, item) => sum + item.amount, 0);
  const totalFinishes = finishesItems.reduce((sum, item) => sum + item.amount, 0);

  const grandTotal = totalCivil + totalElectrical + totalFinishes;
  const targetBudget = selectedProject ? selectedProject.total_budget : 8542000;
  
  // GST calculation
  const gstPercent = selectedProject ? (selectedProject.gst_rate ?? (selectedProject.id === "pr-3" ? 12 : 18)) : 18;
  const gstRupees = Math.round(grandTotal * (gstPercent / 100));
  const totalWithGst = grandTotal + gstRupees;

  const handleGstChange = (val: number) => {
    if (!selectedProject || !onUpdateProject) return;
    onUpdateProject({
      ...selectedProject,
      gst_rate: val
    });
  };

  const handleDownloadQuote = () => {
    const projName = selectedProject?.project_name || "Active Project Site";
    const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation - ${projName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      margin: 0;
      padding: 40px;
      background-color: #ffffff;
      line-height: 1.5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 2px 0;
      font-size: 11px;
      color: #64748b;
    }
    .badge {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      border-radius: 4px;
      display: inline-block;
    }
    .quote-info {
      text-align: right;
    }
    .quote-info p {
      margin: 4px 0;
      font-size: 12px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .details-card {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 15px;
      border-radius: 8px;
    }
    .details-card h3 {
      margin: 0 0 8px 0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      font-weight: 700;
    }
    .details-card p {
      margin: 3px 0;
      font-size: 12px;
      color: #334155;
    }
    .details-card .highlight {
      font-weight: 800;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      font-weight: 800;
      margin: 25px 0 10px 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      text-align: left;
      padding: 8px 12px;
    }
    td {
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .text-right {
      text-align: right;
    }
    .totals-container {
      margin-top: 25px;
      border-top: 2px solid #e2e8f0;
      padding-top: 15px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      width: 320px;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .totals-row.grand-total {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      border-top: 1px solid #0f172a;
      padding-top: 10px;
      margin-top: 5px;
    }
    .terms {
      margin-top: 40px;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px dashed #e2e8f0;
      padding-top: 15px;
    }
    .terms h4 {
      margin: 0 0 5px 0;
      color: #64748b;
      font-weight: 700;
    }
    .terms p {
      margin: 2px 0;
    }
    .no-print-bar {
      background-color: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .btn {
      background-color: #10b981;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      text-transform: uppercase;
    }
    .btn-secondary {
      background-color: #475569;
      margin-left: 10px;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar no-print">
    <span>💡 <strong>Proposal Generated!</strong> Ready to Print or Save as PDF.</span>
    <div>
      <button class="btn" onclick="window.print()">Print / Save PDF</button>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div>
        <h1>BuildEstimate Inc.</h1>
        <p>Premium Civil Contractors & Interior Architects</p>
        <p>GSTIN: 27AAAAA1111A1Z1 | contact@buildestimate.com</p>
      </div>
      <div class="quote-info">
        <span class="badge">Commercial Proposal</span>
        <p style="margin-top: 10px;"><strong>Quote #:</strong> EST-${selectedProject?.id || '001'}</p>
        <p style="color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
    </div>

    <div class="details-grid">
      <div class="details-card">
        <h3>Prepared For</h3>
        <p class="highlight">Valued Client</p>
        <p>Ref: ${projName}</p>
      </div>
      <div class="details-card">
        <h3>Site Address & Info</h3>
        <p class="highlight">${selectedProject?.location || 'N/A'}</p>
        <p>Project Type: ${selectedProject?.type || 'Construction'}</p>
      </div>
    </div>

    <div class="section-title">1. Civil, Excavation & Structure Works</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right" style="width: 150px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${civilItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right">₹${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
        ${civilItems.length === 0 ? '<tr><td colspan="2" style="color: #94a3b8; text-align: center;">No civil items added.</td></tr>' : ''}
        <tr style="background-color: #f8fafc; font-weight: 700;">
          <td>Civil Category Subtotal</td>
          <td class="text-right">₹${totalCivil.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">2. Electrical Conduits & Copper Cabling</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right" style="width: 150px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${electricalItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right">₹${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
        ${electricalItems.length === 0 ? '<tr><td colspan="2" style="color: #94a3b8; text-align: center;">No electrical items added.</td></tr>' : ''}
        <tr style="background-color: #f8fafc; font-weight: 700;">
          <td>Electrical Category Subtotal</td>
          <td class="text-right">₹${totalElectrical.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">3. Architectural Painting & Finishes</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right" style="width: 150px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${finishesItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right">₹${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
        ${finishesItems.length === 0 ? '<tr><td colspan="2" style="color: #94a3b8; text-align: center;">No finishes items added.</td></tr>' : ''}
        <tr style="background-color: #f8fafc; font-weight: 700;">
          <td>Finishes Category Subtotal</td>
          <td class="text-right">₹${totalFinishes.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-container">
      <div class="totals-row">
        <span style="color: #64748b;">Subtotal (Base Cost):</span>
        <strong>₹${grandTotal.toLocaleString()}</strong>
      </div>
      <div class="totals-row" style="color: #059669;">
        <span>GST / Taxes (${gstPercent}%):</span>
        <strong>+ ₹${gstRupees.toLocaleString()}</strong>
      </div>
      <div class="totals-row grand-total">
        <span>Grand Total Estimate:</span>
        <span>₹${totalWithGst.toLocaleString()}</span>
      </div>
    </div>

    <div class="terms">
      <h4>Terms & Conditions:</h4>
      <p>1. Prices are valid for 30 days from the proposal date.</p>
      <p>2. Payment Schedule: 40% Advance to mobilize materials, 40% Mid-stage inspection, 20% on final handover.</p>
      <p>3. Any deviations, extra items, or modifications from the listed scopes will be billed extra at actuals.</p>
      <p style="margin-top: 15px; font-style: italic; text-align: center;">Thank you for choosing BuildEstimate Inc. as your construction partner!</p>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Quotation_${projName.replace(/\s+/g, "_")}_EST-${selectedProject?.id || "001"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onAddLog(`Downloaded offline-printable HTML Proposal for "${projName}" with GST ${gstPercent}%.`);
  };

  if (projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            ESTIMATES & QUOTES
          </h2>
          <h1 className="text-lg font-black text-slate-900 mt-1">Project Budget Estimation</h1>
        </div>
        <div className="bg-white border border-slate-200 border-dashed p-12 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-slate-400 text-5xl">calculate</span>
          <p className="text-base font-black text-slate-800">No Active Projects Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no active projects. Create a new construction project from the Dashboard to start building detailed material, electrical, and finishing estimates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Project Context Title with interactive selector dropdown */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
          <span className="material-symbols-outlined text-sm">apartment</span>
          CHOOSE PROJECT OR ESTIMATE QUOTATION
        </div>
        <div className="flex items-center gap-1">
          <select
            value={activeProjId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-lg font-black text-slate-900 bg-transparent border-none ring-none focus:ring-none focus:outline-none p-0 cursor-pointer outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.status === "Quotation" ? "Draft Quote" : p.status === "Dead" ? "Dead Quote" : p.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Proposal/Quotation Lifecycle Control Panel */}
      {selectedProject && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
          selectedProject.status === "Quotation"
            ? "bg-amber-50/70 border-amber-200"
            : selectedProject.status === "Dead"
            ? "bg-red-50/70 border-red-200"
            : "bg-emerald-50/60 border-emerald-200"
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                selectedProject.status === "Quotation"
                  ? "bg-amber-500 animate-pulse"
                  : selectedProject.status === "Dead"
                  ? "bg-red-500"
                  : "bg-emerald-500 animate-pulse"
              }`} />
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                Quotation Lifecycle Stage
              </p>
            </div>
            <p className="text-sm font-extrabold text-slate-900">
              {selectedProject.status === "Quotation" && "📝 Draft Quotation: Pending Client Approval"}
              {selectedProject.status === "Dead" && "❌ Dead Proposal: Quotation Rejected or Expired"}
              {selectedProject.status === "Active" && "🚀 Approved & Active Construction Site"}
              {selectedProject.status === "Completed" && "✅ Construction Fully Completed"}
              {selectedProject.status === "On-Hold" && "⚠️ Construction On Hold"}
            </p>
            <p className="text-xs text-slate-500">
              {selectedProject.status === "Quotation" && "This estimate is a pre-sale quote. You can modify line items below. Client can approve this quote to start construction."}
              {selectedProject.status === "Dead" && "This cost estimation did not convert. You can still revive it or view historical values."}
              {selectedProject.status === "Active" && "Estimates approved! Construction works have commenced at the project site."}
              {selectedProject.status === "Completed" && "This project is complete and handed over to the client."}
              {selectedProject.status === "On-Hold" && "Work is currently paused. Estimates and log sheets remain locked/available."}
            </p>
          </div>

          {onUpdateProject && (
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
              {selectedProject.status === "Quotation" && (
                <>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Are you sure you want to approve this quotation and start construction for "${selectedProject.project_name}"?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Active" });
                          onAddLog(`Quotation for "${selectedProject.project_name}" was approved by client! Starting construction phase.`);
                        }
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">play_circle</span>
                    Approve & Start
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Mark quotation "${selectedProject.project_name}" as Dead (rejected)?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Dead" });
                          onAddLog(`Quotation for "${selectedProject.project_name}" was marked as Dead/Rejected.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-bold text-xs rounded-lg transition-all"
                  >
                    Mark Dead
                  </button>
                </>
              )}

              {selectedProject.status === "Active" && (
                <>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Mark project "${selectedProject.project_name}" as Completed?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Completed" });
                          onAddLog(`Marked project "${selectedProject.project_name}" as Completed.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                    Complete Project
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Pause construction work and put "${selectedProject.project_name}" On Hold?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "On-Hold" });
                          onAddLog(`Put project "${selectedProject.project_name}" on hold.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">pause_circle</span>
                    Hold Work
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Convert "${selectedProject.project_name}" back into a pre-sale Quotation/Proposal stage?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Quotation" });
                          onAddLog(`Moved "${selectedProject.project_name}" back to pre-sale Quotation phase.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all"
                  >
                    Convert back to Quote
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Mark ongoing project "${selectedProject.project_name}" as Dead (cancelled)?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Dead" });
                          onAddLog(`Marked ongoing project "${selectedProject.project_name}" as Dead.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-bold text-xs rounded-lg transition-all"
                  >
                    Mark Dead
                  </button>
                </>
              )}

              {selectedProject.status === "On-Hold" && (
                <>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Resume construction works at "${selectedProject.project_name}"?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Active" });
                          onAddLog(`Resumed construction works at "${selectedProject.project_name}".`);
                        }
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                    Resume Work
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Convert on-hold project "${selectedProject.project_name}" back to pre-sale Quotation phase?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Quotation" });
                          onAddLog(`Moved "${selectedProject.project_name}" back to pre-sale Quotation phase.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all"
                  >
                    Convert back to Quote
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({
                        message: `Mark on-hold project "${selectedProject.project_name}" as Dead (cancelled)?`,
                        onConfirm: () => {
                          onUpdateProject({ ...selectedProject, status: "Dead" });
                          onAddLog(`Marked on-hold project "${selectedProject.project_name}" as Dead.`);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-bold text-xs rounded-lg transition-all"
                  >
                    Mark Dead
                  </button>
                </>
              )}

              {selectedProject.status === "Dead" && (
                <button
                  onClick={() => {
                    onUpdateProject({ ...selectedProject, status: "Quotation" });
                    onAddLog(`Re-opened/Revived quotation for "${selectedProject.project_name}".`);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
                  Revive Quote
                </button>
              )}

              {selectedProject.status === "Completed" && (
                <button
                  onClick={() => {
                    setConfirmAction({
                      message: `Re-open completed project "${selectedProject.project_name}"?`,
                      onConfirm: () => {
                        onUpdateProject({ ...selectedProject, status: "Active" });
                        onAddLog(`Re-opened completed project "${selectedProject.project_name}".`);
                      }
                    });
                  }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
                  Re-open Project
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary Card Hero */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[80px]">calculate</span>
        </div>

        <div className="relative z-10 flex flex-col gap-1">
          <p className="text-[10px] tracking-widest uppercase font-bold text-slate-400">
            TOTAL ESTIMATED QUOTATION (INCL. GST)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight">₹{totalWithGst.toLocaleString()}</span>
            <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">LIVE</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-5 pt-4 border-t border-slate-800">
            {/* GST Rate Slider from 0 to 18% */}
            <div className="flex-grow space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black tracking-wider">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">percent</span>
                  GST Rate Selector
                </span>
                <span className="text-emerald-400 font-extrabold">{gstPercent}% GST</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-850/60 border border-slate-800 rounded-xl px-3 py-1.5">
                <input
                  type="range"
                  min="0"
                  max="18"
                  step="1"
                  value={gstPercent}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleGstChange(val);
                    onAddLog(`Adjusted GST rate for "${selectedProject?.project_name || 'Project'}" to ${val}%`);
                  }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">
                  +₹{(gstRupees / 100000).toFixed(2)}L
                </span>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-px h-10 bg-slate-800 hidden sm:block" />
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Base Material/Labor Cost</p>
                <p className="text-white font-extrabold text-sm mt-0.5">
                  ₹{grandTotal.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Active Items</p>
                <p className="text-white font-extrabold text-sm mt-0.5">
                  {civilItems.length + electricalItems.length + finishesItems.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          CATEGORY BREAKDOWN
        </h3>
        <button
          onClick={() => alert("Estimated log changes:\n1. Initial breakdown created Oct 24.\n2. Verified Gupta Marbles finishes quota.\n3. Base tax rules applied.")}
          className="text-emerald-700 font-bold text-xs flex items-center gap-1 hover:underline"
        >
          <span className="material-symbols-outlined text-sm">history</span> View Changes
        </button>
      </div>

      {/* Category Bento List Cluster */}
      <div className="space-y-4">
        {/* Category Card: Civil Work */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
          <div
            onClick={() => toggleCategory("civil")}
            className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  foundation
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Civil Work</h4>
                <p className="text-xs text-slate-500">
                  {((totalCivil / grandTotal) * 100).toFixed(0)}% of total estimate
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">₹{totalCivil.toLocaleString()}</p>
              </div>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${expandedCategories.civil ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </div>
          </div>

          {expandedCategories.civil && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-950 rounded-full"
                  style={{ width: `${(totalCivil / grandTotal) * 100}%` }}
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {civilItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  civilItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal("civil", idx, item);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({
                                message: `Are you sure you want to delete "${item.name}"?`,
                                onConfirm: () => handleDeleteLineItem("civil", idx)
                              });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAddModal("civil")}
                className="w-full h-11 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-black hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span> ADD LINE ITEM
              </button>
            </div>
          )}
        </section>

        {/* Category Card: Electrical */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
          <div
            onClick={() => toggleCategory("electrical")}
            className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Electrical</h4>
                <p className="text-xs text-slate-500">
                  {((totalElectrical / grandTotal) * 100).toFixed(0)}% of total estimate
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">₹{totalElectrical.toLocaleString()}</p>
              </div>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${expandedCategories.electrical ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </div>
          </div>

          {expandedCategories.electrical && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-950 rounded-full"
                  style={{ width: `${(totalElectrical / grandTotal) * 100}%` }}
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {electricalItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  electricalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal("electrical", idx, item);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({
                                message: `Are you sure you want to delete "${item.name}"?`,
                                onConfirm: () => handleDeleteLineItem("electrical", idx)
                              });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAddModal("electrical")}
                className="w-full h-11 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-black hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span> ADD LINE ITEM
              </button>
            </div>
          )}
        </section>

        {/* Category Card: Finishes */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
          <div
            onClick={() => toggleCategory("finishes")}
            className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
                <span className="material-symbols-outlined">palette</span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Finishes</h4>
                <p className="text-xs text-slate-500">
                  {((totalFinishes / grandTotal) * 100).toFixed(0)}% of total estimate
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">₹{totalFinishes.toLocaleString()}</p>
              </div>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${expandedCategories.finishes ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </div>
          </div>

          {expandedCategories.finishes && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-950 rounded-full"
                  style={{ width: `${(totalFinishes / grandTotal) * 100}%` }}
                />
              </div>

              {/* Vendor Verified Badge */}
              <div className="bg-emerald-50 p-3 rounded-lg flex items-center gap-3 border border-emerald-200">
                <span className="material-symbols-outlined text-emerald-700 font-bold">verified</span>
                <p className="text-xs font-bold text-emerald-800">Verified by Vendor: Gupta Marbles</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {finishesItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  finishesItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal("finishes", idx, item);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({
                                message: `Are you sure you want to delete "${item.name}"?`,
                                onConfirm: () => handleDeleteLineItem("finishes", idx)
                              });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Item"
                          >
                            <span className="material-symbols-outlined text-[15px] font-bold">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAddModal("finishes")}
                className="w-full h-11 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-black hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span> ADD LINE ITEM
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Floating Info Badge */}
      <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-600">info</span>
        <p className="text-xs font-medium text-slate-600">Tax calculations (dynamic GST slider) applied at summary level.</p>
      </div>

      {/* Sticky footer Quote generator action button */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setIsQuoteModalOpen(true);
              const projName = selectedProject?.project_name || "Active Site";
              onAddLog(`Initiated interactive quotation generation flow for ${projName}.`);
            }}
            className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl flex items-center justify-center gap-3 font-bold text-xs tracking-wider uppercase transition-all active:scale-[0.99] shadow-lg"
          >
            <span className="material-symbols-outlined text-lg">description</span>
            GENERATE CLIENT QUOTE
          </button>
        </div>
      </div>

      {/* Interactive Quotation Proposal Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-wide uppercase">
                    Client Quotation Generated
                  </h3>
                  <p className="text-xs text-slate-500">Official Cost Estimate & Commercial Proposal</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Letterhead Preview Sheet */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6 font-sans text-slate-800">
              
              {/* Header Letterhead Grid */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">BuildEstimate Inc.</h4>
                  <p className="text-[10px] text-slate-500">Premium Civil Contractors & Interior Architects</p>
                  <p className="text-[10px] text-slate-500">GSTIN: 27AAAAA1111A1Z1</p>
                </div>
                <div className="sm:text-right">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Commercial Proposal
                  </span>
                  <p className="text-xs text-slate-600 mt-2">
                    <span className="font-semibold">Quote #:</span> EST-{selectedProject?.id || '001'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Client & Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Prepared For</span>
                  <p className="font-extrabold text-slate-900">Valued Client</p>
                  <p className="text-slate-500">Ref: {selectedProject?.project_name || 'Active Project Site'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Site Address</span>
                  <p className="font-bold text-slate-800">{selectedProject?.location || 'N/A'}</p>
                  <p className="text-slate-500">Project Type: {selectedProject?.type || 'Construction'}</p>
                </div>
              </div>

              {/* Line Item Summaries */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-2.5 font-bold text-slate-600">Scope of Work Category</th>
                      <th className="p-2.5 font-bold text-slate-600 text-right">Estimated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="p-2.5 text-slate-700 font-medium">1. Civil, Excavation, Structure & Brickwork</td>
                      <td className="p-2.5 text-slate-900 font-extrabold text-right">₹{totalCivil.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-700 font-medium">2. Electrical conduits, copper cables & DB panels</td>
                      <td className="p-2.5 text-slate-900 font-extrabold text-right">₹{totalElectrical.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-700 font-medium">3. Architectural painting, finishes & marble flooring</td>
                      <td className="p-2.5 text-slate-900 font-extrabold text-right">₹{totalFinishes.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pricing Totals Breakout */}
              <div className="space-y-2 border-t border-slate-200 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Net Material & Labor Cost Sum:</span>
                  <span className="font-bold text-slate-900">₹{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span className="font-semibold">GST/Taxes (Applicable @ {gstPercent}%):</span>
                  <span className="font-black">₹{gstRupees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-sm font-black text-slate-950 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <span>Estimated Grand Total Quotation:</span>
                  <span className="text-slate-950 font-black text-base">₹{totalWithGst.toLocaleString()}</span>
                </div>
              </div>

              {/* Terms & Footer note */}
              <div className="text-[10px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-500">Terms & Conditions:</p>
                <p>1. Prices are valid for 30 days from proposal date.</p>
                <p>2. Payment Schedule: 40% Advance, 40% Mid-stage, 20% on handover.</p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-150">
              <button
                onClick={() => {
                  const text = `
CONSTRUCTION COMMERCIAL PROPOSAL
=================================
BuildEstimate Inc.
Quote #: EST-${selectedProject?.id || '001'}
Date: ${new Date().toLocaleDateString('en-IN')}

Project Site: ${selectedProject?.project_name || 'Active Project Site'}
Address: ${selectedProject?.location || 'N/A'}
Project Type: ${selectedProject?.type || 'Construction'}

SUMMARY OF ESTIMATES:
1. Civil Work: ₹${totalCivil.toLocaleString()}
2. Electrical: ₹${totalElectrical.toLocaleString()}
3. Architectural Finishes: ₹${totalFinishes.toLocaleString()}

---------------------------------
Material & Labor Cost: ₹${grandTotal.toLocaleString()}
GST (${gstPercent}%): ₹${gstRupees.toLocaleString()}
---------------------------------
GRAND TOTAL QUOTATION: ₹${totalWithGst.toLocaleString()}

Thank you for your business!
BuildEstimate Inc.
`;
                  navigator.clipboard.writeText(text.trim()).then(() => {
                    setQuoteCopied(true);
                    onAddLog(`Copied quotation text for "${selectedProject?.project_name}" to clipboard.`);
                    setTimeout(() => setQuoteCopied(false), 2000);
                  });
                }}
                className="flex-1 h-11 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-sm">
                  {quoteCopied ? "task_alt" : "content_copy"}
                </span>
                {quoteCopied ? "COPIED TO CLIPBOARD!" : "COPY PROPOSAL TEXT"}
              </button>

              <button
                onClick={handleDownloadQuote}
                className="flex-1 h-11 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                PRINT / SAVE PDF
              </button>

              {selectedProject?.status === "Quotation" && (
                <button
                  onClick={() => {
                    setConfirmAction({
                      message: `Are you sure you want to approve this quotation and start construction for "${selectedProject.project_name}"?`,
                      onConfirm: () => {
                        onUpdateProject({ ...selectedProject, status: "Active" });
                        onAddLog(`Quotation for "${selectedProject.project_name}" was approved by client! Starting construction phase.`);
                        setIsQuoteModalOpen(false);
                      }
                    });
                  }}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  APPROVE & START
                </button>
              )}

              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="sm:w-24 h-11 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal dialog for adding/editing line item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
              {editingIndex !== null ? "Edit" : "Add"} Estimate Item to <span className="text-emerald-700 capitalize">{targetCategory}</span>
            </h3>

            <form onSubmit={handleAddLineItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Vitrified Tiles"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Rupee Cost (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 250000"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold active:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black active:scale-[0.98]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern custom confirmation modal overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 transform scale-100 transition-all space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <span className="material-symbols-outlined text-3xl text-amber-500 font-bold">warning</span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">Confirm Action</h4>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Verification Required</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-all"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
