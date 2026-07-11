import React, { useState } from "react";
import { Project, LineItem, Client, Vendor, TenantProfile } from "../types";
import { db as firestoreDb, auth } from "../lib/firebase";
import { doc, collection, setDoc } from "firebase/firestore";
import { validatePhoneNumber } from "../lib/validation";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface EstimatesViewProps {
  projects: Project[];
  clients?: Client[];
  vendors?: Vendor[];
  onAddLog: (log: string) => void;
  onUpdateProject?: (project: Project) => void;
  onAddClient?: (client: Omit<Client, "id">) => void;
  tenantProfile?: TenantProfile; // Dynamic SaaS brand parameters
  initialProjectId?: string;
}

export default function EstimatesView({ projects, clients = [], vendors = [], onAddLog, onUpdateProject, onAddClient, tenantProfile, initialProjectId }: EstimatesViewProps) {
  const companyName = tenantProfile?.company_name || "BuildEstimate Inc.";
  const businessLogo = tenantProfile?.business_logo_url || "";
  const companyGstin = tenantProfile?.gstin || "";
  const companyAddress = tenantProfile?.address || "";
  const companyPhone = tenantProfile?.phone_number || "";
  const companyEmail = tenantProfile?.email || "";

  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Category expanded state
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    civil: true,
    electrical: false,
    finishes: true,
    interior_finishing: true,
  });

  // Track selected project ID
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || (projects.length > 0 ? projects[0].id : "")
  );

  React.useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  // Ensure selectedProjectId is kept in sync if projects list changes
  const activeProjId = selectedProjectId || (projects.length > 0 ? projects[0].id : "");
  const selectedProject = projects.find(p => p.id === activeProjId) || projects[0];

  // Helper to dynamically get estimates
  const getProjectEstimates = (proj: Project | undefined) => {
    if (!proj) return { civil: [], electrical: [], finishes: [], interior_finishing: [] };
    return {
      civil: proj.estimates?.civil || [],
      electrical: proj.estimates?.electrical || [],
      finishes: proj.estimates?.finishes || [],
      interior_finishing: proj.estimates?.interior_finishing || []
    };
  };

  const currentEstimates = getProjectEstimates(selectedProject);
  const civilItems = currentEstimates.civil;
  const electricalItems = currentEstimates.electrical;
  const finishesItems = currentEstimates.finishes;
  const interiorFinishingItems = currentEstimates.interior_finishing;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // State for Add/Edit Line Item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedShareId, setGeneratedShareId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [targetCategory, setTargetCategory] = useState<"civil" | "electrical" | "finishes" | "interior_finishing" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState<string>("1");
  const [newItemUnit, setNewItemUnit] = useState<string>("sqft");
  const [newItemRate, setNewItemRate] = useState<string>("0");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<"civil" | "electrical" | "finishes" | "interior_finishing" | null>(null);

  // State for Assign Client Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClientIdForAssignment, setSelectedClientIdForAssignment] = useState<string>("");

  // State for Add New Client Modal
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientLocation, setNewClientLocation] = useState("");

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;

    const validation = validatePhoneNumber(newClientPhone);
    if (!validation.isValid) {
      // Invalidate submit if phone is not valid
      return;
    }

    if (onAddClient) {
      onAddClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        tags: ["Buyer"],
        project_location: newClientLocation.trim() || undefined
      });
    }

    // Reset and close
    setNewClientName("");
    setNewClientPhone("");
    setNewClientLocation("");
    setIsAddClientOpen(false);
  };

  // State for Assign Vendor Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorCategory, setVendorCategory] = useState<"civil" | "electrical" | "finishes" | "interior_finishing" | null>(null);
  const [typedVendorName, setTypedVendorName] = useState("");

  const handleOpenAssignVendor = (category: "civil" | "electrical" | "finishes" | "interior_finishing") => {
    setVendorCategory(category);
    let currentName = "";
    if (category === "civil") currentName = selectedProject?.estimates?.civil_vendor_name || "";
    else if (category === "electrical") currentName = selectedProject?.estimates?.electrical_vendor_name || "";
    else if (category === "finishes") currentName = selectedProject?.estimates?.finishes_vendor_name || "";
    else if (category === "interior_finishing") currentName = selectedProject?.estimates?.interior_vendor_name || "";
    
    setTypedVendorName(currentName);
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = (vendorName: string) => {
    if (!selectedProject || !onUpdateProject || !vendorCategory) return;
    
    const updatedEstimates = {
      civil: civilItems,
      electrical: electricalItems,
      finishes: finishesItems,
      interior_finishing: interiorFinishingItems,
      ...selectedProject.estimates,
    };

    if (vendorCategory === "civil") {
      updatedEstimates.civil_vendor_name = vendorName || undefined;
    } else if (vendorCategory === "electrical") {
      updatedEstimates.electrical_vendor_name = vendorName || undefined;
    } else if (vendorCategory === "finishes") {
      updatedEstimates.finishes_vendor_name = vendorName || undefined;
    } else if (vendorCategory === "interior_finishing") {
      updatedEstimates.interior_vendor_name = vendorName || undefined;
    }

    onUpdateProject({
      ...selectedProject,
      estimates: updatedEstimates
    });

    if (vendorName) {
      onAddLog(`Assigned vendor "${vendorName}" to category "${vendorCategory}" on project "${selectedProject.project_name}".`);
    } else {
      onAddLog(`Removed vendor assignment from category "${vendorCategory}" on project "${selectedProject.project_name}".`);
    }

    setIsVendorModalOpen(false);
    setVendorCategory(null);
  };

  const linkedClient = selectedProject?.client_id
    ? clients.find(c => c.id === selectedProject.client_id)
    : undefined;

  const handleOpenAssignModal = () => {
    setSelectedClientIdForAssignment(selectedProject?.client_id || "");
    setIsAssignModalOpen(true);
  };

  // Auto-select newly added client in assignment modal dropdown
  const prevClientsLength = React.useRef(clients.length);
  React.useEffect(() => {
    if (clients.length > prevClientsLength.current) {
      const newestClient = clients[clients.length - 1];
      if (newestClient) {
        setSelectedClientIdForAssignment(newestClient.id);
      }
    }
    prevClientsLength.current = clients.length;
  }, [clients]);

  const handleOpenAddModal = (cat: "civil" | "electrical" | "finishes" | "interior_finishing") => {
    setTargetCategory(cat);
    setEditingIndex(null);
    setEditingCategory(null);
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemUnit("sqft");
    setNewItemRate("0");
    setNewItemAmount("0");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: "civil" | "electrical" | "finishes" | "interior_finishing", index: number, item: LineItem) => {
    setTargetCategory(cat);
    setEditingIndex(index);
    setEditingCategory(cat);
    setNewItemName(item.name);
    setNewItemQuantity((item.quantity ?? 1).toString());
    setNewItemUnit(item.unit ?? "sqft");
    setNewItemRate((item.rate ?? item.amount).toString());
    setNewItemAmount(item.amount.toString());
    setIsModalOpen(true);
  };

  const handleDeleteLineItem = (category: "civil" | "electrical" | "finishes" | "interior_finishing", index: number) => {
    if (!selectedProject || !onUpdateProject) return;
    let itemName = "";
    let nextCivil = [...civilItems];
    let nextElec = [...electricalItems];
    let nextFin = [...finishesItems];
    let nextInterior = [...interiorFinishingItems];

    if (category === "civil") {
      itemName = civilItems[index]?.name || "";
      nextCivil = nextCivil.filter((_, idx) => idx !== index);
    } else if (category === "electrical") {
      itemName = electricalItems[index]?.name || "";
      nextElec = nextElec.filter((_, idx) => idx !== index);
    } else if (category === "finishes") {
      itemName = finishesItems[index]?.name || "";
      nextFin = nextFin.filter((_, idx) => idx !== index);
    } else if (category === "interior_finishing") {
      itemName = interiorFinishingItems[index]?.name || "";
      nextInterior = nextInterior.filter((_, idx) => idx !== index);
    }

    const nextGrandTotal = nextCivil.reduce((sum, item) => sum + item.amount, 0) +
                           nextElec.reduce((sum, item) => sum + item.amount, 0) +
                           nextFin.reduce((sum, item) => sum + item.amount, 0) +
                           nextInterior.reduce((sum, item) => sum + item.amount, 0);

    onUpdateProject({
      ...selectedProject,
      total_budget: nextGrandTotal,
      estimates: {
        ...selectedProject.estimates,
        civil: nextCivil,
        electrical: nextElec,
        finishes: nextFin,
        interior_finishing: nextInterior,
      }
    });

    onAddLog(`Deleted estimate line item "${itemName}" from ${category}`);
  };

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !onUpdateProject) return;
    const qty = parseFloat(newItemQuantity) || 0;
    const rate = parseFloat(newItemRate) || 0;
    const amountNum = qty * rate;
    if (!newItemName || qty <= 0 || rate < 0) return;

    let nextCivil = [...civilItems];
    let nextElec = [...electricalItems];
    let nextFin = [...finishesItems];
    let nextInterior = [...interiorFinishingItems];

    const newItem: LineItem = {
      name: newItemName,
      quantity: qty,
      unit: newItemUnit,
      rate: rate,
      amount: amountNum
    };

    if (editingIndex !== null && editingCategory !== null) {
      // Editing Mode
      if (editingCategory === "civil") {
        nextCivil = nextCivil.map((item, idx) => idx === editingIndex ? newItem : item);
      } else if (editingCategory === "electrical") {
        nextElec = nextElec.map((item, idx) => idx === editingIndex ? newItem : item);
      } else if (editingCategory === "finishes") {
        nextFin = nextFin.map((item, idx) => idx === editingIndex ? newItem : item);
      } else if (editingCategory === "interior_finishing") {
        nextInterior = nextInterior.map((item, idx) => idx === editingIndex ? newItem : item);
      }
      onAddLog(`Updated estimate line item to "${newItemName}" (${qty} ${newItemUnit} @ ₹${rate}/unit) under ${editingCategory} for ₹${amountNum.toLocaleString()}`);
    } else if (targetCategory) {
      // Adding Mode
      if (targetCategory === "civil") {
        nextCivil.push(newItem);
      } else if (targetCategory === "electrical") {
        nextElec.push(newItem);
      } else if (targetCategory === "finishes") {
        nextFin.push(newItem);
      } else if (targetCategory === "interior_finishing") {
        nextInterior.push(newItem);
      }
      onAddLog(`Added estimate line item "${newItemName}" (${qty} ${newItemUnit} @ ₹${rate}/unit) under ${targetCategory} for ₹${amountNum.toLocaleString()}`);
    }

    const nextGrandTotal = nextCivil.reduce((sum, item) => sum + item.amount, 0) +
                           nextElec.reduce((sum, item) => sum + item.amount, 0) +
                           nextFin.reduce((sum, item) => sum + item.amount, 0) +
                           nextInterior.reduce((sum, item) => sum + item.amount, 0);

    onUpdateProject({
      ...selectedProject,
      total_budget: nextGrandTotal,
      estimates: {
        ...selectedProject.estimates,
        civil: nextCivil,
        electrical: nextElec,
        finishes: nextFin,
        interior_finishing: nextInterior,
      }
    });

    // Reset and close
    setNewItemName("");
    setNewItemAmount("");
    setNewItemQuantity("1");
    setNewItemUnit("sqft");
    setNewItemRate("0");
    setIsModalOpen(false);
    setTargetCategory(null);
    setEditingIndex(null);
    setEditingCategory(null);
  };

  // Compute live sums
  const totalCivil = civilItems.reduce((sum, item) => sum + item.amount, 0);
  const totalElectrical = electricalItems.reduce((sum, item) => sum + item.amount, 0);
  const totalFinishes = finishesItems.reduce((sum, item) => sum + item.amount, 0);
  const totalInteriorFinishing = interiorFinishingItems.reduce((sum, item) => sum + item.amount, 0);

  const grandTotal = totalCivil + totalElectrical + totalFinishes + totalInteriorFinishing;

  // Safe percentage helper to avoid division by zero or NaN issues
  const getPercentage = (categoryTotal: number): string | number => {
    const percentage = grandTotal > 0 ? ((categoryTotal / grandTotal) * 100).toFixed(0) : 0;
    return percentage;
  };

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

  const handleWhatsAppShare = () => {
    // 1. WhatsApp Number (Client phone numbers from database)
    let clientPhone = "919876543210"; // Country code ke sath without '+'
    if (linkedClient && linkedClient.phone) {
      const digits = linkedClient.phone.replace(/\D/g, "");
      if (digits.length === 10) {
        clientPhone = "91" + digits;
      } else if (digits.length > 10) {
        clientPhone = digits;
      } else {
        clientPhone = digits || "919876543210";
      }
    }
    
    const projName = selectedProject?.project_name || "MS Sahni Sector-85";

    // 2. Custom Message Body with your Premium Branding
    const messageText = `*${companyName} | Powered by Karam AI | Innovation HUB*\n\n` +
      `Hello Sir, please find the finalized summary of your estimate:\n\n` +
      `📍 *Project:* ${projName}\n` +
      `💰 *Grand Total:* ₹${totalWithGst.toLocaleString('en-IN')}\n\n` +
      `Click the link in your app dashboard to view the itemized breakdown. Let's start building! 🚀`;

    // 3. URL Encoding to handle spaces and formatting characters safely
    const encodedMessage = encodeURIComponent(messageText);
    
    // 4. Trigger system window to open WhatsApp Web or Desktop App
    window.open(`https://wa.me/${clientPhone}?text=${encodedMessage}`, '_blank');
    onAddLog(`Shared quotation summary for "${projName}" via WhatsApp to +${clientPhone}.`);
  };

  const handleWhatsAppText = () => {
    let clientPhone = "919876543210";
    if (linkedClient && linkedClient.phone) {
      const digits = linkedClient.phone.replace(/\D/g, "");
      if (digits.length === 10) {
        clientPhone = "91" + digits;
      } else if (digits.length > 10) {
        clientPhone = digits;
      } else {
        clientPhone = digits || "919876543210";
      }
    }
    
    const projName = selectedProject?.project_name || "Sector-85 Plot Construction";
    const clientName = linkedClient ? linkedClient.name : "Mr. M.S. Sahni";

    const messageText = 
      `*BuildEstimate BOS* 🏢\n` +
      `_Innovation HUB | Powered by Karam AI_\n\n` +
      `Hello ${clientName},\n\n` +
      `Please find attached the clean itemized estimation summary for your upcoming project.\n\n` +
      `📍 *Project:* ${projName}\n` +
      `💰 *Estimated Grand Total:* ₹${totalWithGst.toLocaleString('en-IN')}\n\n` +
      `_Kindly review the attached PDF file below._ 👇\n\n` +
      `Best regards,\n` +
      `*${companyName}*`;

    const encodedMessage = encodeURIComponent(messageText);
    window.open(`https://wa.me/${clientPhone}?text=${encodedMessage}`, '_blank');
    onAddLog(`Opened WhatsApp share thread with premium template message for client "${clientName}".`);
  };

  const handleDualActionWhatsApp = () => {
    let phone = "919876543210";
    if (tenantProfile?.phone_number) {
      phone = tenantProfile.phone_number.replace(/\D/g, "");
    } else if (linkedClient && linkedClient.phone) {
      const digits = linkedClient.phone.replace(/\D/g, "");
      if (digits.length === 10) {
        phone = "91" + digits;
      } else if (digits.length > 10) {
        phone = digits;
      }
    }
    const projName = selectedProject?.project_name || "Active Project Site";
    const grandTotalVal = totalWithGst;

    const boldedMsg = `*${companyName}*\n\n` +
      `📍 *Project:* *${projName}*\n` +
      `💰 *Grand Total:* *₹${grandTotalVal.toLocaleString('en-IN')}*\n\n` +
      `Here is the finalized commercial estimate for your project. Please review and let us know your thoughts. Let's start building! 🚀`;

    const encodedText = encodeURIComponent(boldedMsg);
    window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank");
    onAddLog(`Opened secure WhatsApp thread with phone +${phone} for project "${projName}".`);
  };

  const handleGeneratePublicLink = async (mode?: 'overwrite' | 'new_revision') => {
    if (!selectedProject) return;
    setIsGeneratingLink(true);
    setLinkCopied(false);

    let snapshotId = `ps-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let nextRevision = selectedProject.revision_number || 0;

    if (mode === 'overwrite' && selectedProject.generated_share_id) {
      snapshotId = selectedProject.generated_share_id;
    } else if (mode === 'new_revision') {
      nextRevision = nextRevision + 1;
    }

    try {
      const snapshotRef = doc(firestoreDb, "public_estimates", snapshotId);
      
      const snapshotData = {
        id: snapshotId,
        project_id: selectedProject.project_id || `BOS-PRJ-${selectedProject.id}`,
        project_name: selectedProject.project_name || "Active Project Site",
        company_name: companyName,
        business_logo_url: businessLogo || "",
        gstin: companyGstin || "",
        address: companyAddress || "",
        phone_number: companyPhone || "",
        email: companyEmail || "",
        civil_items: civilItems || [],
        electrical_items: electricalItems || [],
        finishes_items: finishesItems || [],
        interior_finishing_items: interiorFinishingItems || [],
        gst_rate: gstPercent,
        grand_total: totalWithGst,
        subscription_plan: tenantProfile?.subscription_plan || "Free Trial",
        created_at: new Date().toISOString(),
        revision_number: nextRevision
      };
      
      await setDoc(snapshotRef, snapshotData);
      setGeneratedShareId(snapshotId);

      let nextPastRevisions = [...(selectedProject.past_revisions || [])];
      
      if (!selectedProject.generated_share_id || mode === 'new_revision') {
        if (!nextPastRevisions.some(r => r.share_id === snapshotId)) {
          nextPastRevisions.push({
            share_id: snapshotId,
            revision: nextRevision,
            date: new Date().toISOString()
          });
        }
      } else if (mode === 'overwrite') {
        nextPastRevisions = nextPastRevisions.map(r => 
          r.share_id === snapshotId ? { ...r, date: new Date().toISOString() } : r
        );
      }

      // Save back to project state
      if (onUpdateProject) {
        onUpdateProject({
          ...selectedProject,
          generated_share_id: snapshotId,
          revision_number: nextRevision,
          past_revisions: nextPastRevisions
        });
      }

      if (mode === 'overwrite') {
        onAddLog(`Overwrote existing shared estimate snapshot public_estimates/${snapshotId} with latest revisions.`);
      } else if (mode === 'new_revision') {
        onAddLog(`Published new revision R${nextRevision} as a new snapshot public_estimates/${snapshotId}.`);
      } else {
        onAddLog(`Created a read-only estimate snapshot public_estimates/${snapshotId} for project "${selectedProject.project_name}".`);
      }
    } catch (err: any) {
      console.error("Error creating shared estimate:", err);
      onAddLog(`Failed to generate public shared link: ${err.message || err}`);
      handleFirestoreError(err, OperationType.WRITE, `public_estimates/${snapshotId}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyGeneratedLink = () => {
    if (!generatedShareId) return;
    const publicLink = `${window.location.origin}${window.location.pathname}?share=${generatedShareId}`;
    navigator.clipboard.writeText(publicLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
      onAddLog(`Copied public estimate shareable link to clipboard: ${publicLink}`);
    });
  };

  const handleDownloadQuote = () => {
    const projName = selectedProject?.project_name || "Active Project Site";
    const clientName = linkedClient ? linkedClient.name : "Client Not Assigned";
    
    let clientPhone = "919876543210";
    if (linkedClient && linkedClient.phone) {
      const digits = linkedClient.phone.replace(/\D/g, "");
      if (digits.length === 10) {
        clientPhone = "91" + digits;
      } else if (digits.length > 10) {
        clientPhone = digits;
      }
    }
    const messageText = `*${companyName} | Powered by Karam AI | Innovation HUB*\n\n` +
      `Hello Sir, please find the finalized summary of your estimate:\n\n` +
      `📍 *Project:* ${projName}\n` +
      `💰 *Grand Total:* ₹${totalWithGst.toLocaleString('en-IN')}\n\n` +
      `Click the link in your app dashboard to view the itemized breakdown. Let's start building! 🚀`;
    const encodedMessage = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${clientPhone}?text=${encodedMessage}`;

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
      <button class="btn" style="background-color: #059669; margin-right: 10px;" onclick="window.open('${waUrl}', '_blank')">Share on WhatsApp</button>
      <button class="btn" onclick="window.print()">Print / Save PDF</button>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div>
        ${businessLogo ? `<img src="${businessLogo}" alt="Business Logo" style="max-height: 50px; margin-bottom: 10px; display: block;" />` : ""}
        <h1>${companyName}</h1>
        ${companyAddress ? `<p>${companyAddress}</p>` : ""}
        ${(companyGstin || companyPhone || companyEmail) ? `
        <p>
          ${companyGstin ? `GSTIN: ${companyGstin}` : ""}
          ${companyGstin && (companyPhone || companyEmail) ? " | " : ""}
          ${companyPhone ? `Tel: ${companyPhone}` : ""}
          ${companyPhone && companyEmail ? " | " : ""}
          ${companyEmail ? `Email: ${companyEmail}` : ""}
        </p>
        ` : ""}
      </div>
      <div class="quote-info">
        <span class="badge">Commercial Proposal</span>
        <p style="margin-top: 8px;"><strong>Project ID:</strong> ${selectedProject?.project_id || 'BOS-PRJ-3001'}</p>
        <p><strong>Quote #:</strong> EST-${selectedProject?.id || '001'}${selectedProject?.revision_number ? `-R${selectedProject.revision_number}` : ''}</p>
        <p style="color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
    </div>

    <div class="details-grid">
      <div class="details-card">
        <h3>Prepared For</h3>
        <p class="highlight">${clientName}</p>
        <p>Ref: ${projName}</p>
      </div>
      <div class="details-card">
        <h3>Site Address & Info</h3>
        <p class="highlight">${selectedProject?.location || 'N/A'}</p>
        <p>Project Type: ${selectedProject?.type || 'Construction'}</p>
      </div>
    </div>

    ${(() => {
      const categories = [
        {
          id: "civil",
          name: "1. Civil, Excavation, Structure & Brickwork",
          total: totalCivil,
          items: civilItems,
        },
        {
          id: "electrical",
          name: "2. Electrical conduits, copper cables & DB panels",
          total: totalElectrical,
          items: electricalItems,
        },
        {
          id: "finishes",
          name: "3. Architectural painting, finishes & marble flooring",
          total: totalFinishes,
          items: finishesItems,
        },
        {
          id: "interior_finishing",
          name: "Premium Home Interior, Woodwork & False Ceiling",
          total: totalInteriorFinishing,
          items: interiorFinishingItems,
        }
      ];

      return categories
        .filter(c => c.total > 0)
        .map((c, index) => `
          <div class="section-title">${index + 1}. ${c.name.replace(/^\d+\.\s*/, '')}</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right" style="width: 100px;">Qty</th>
                <th class="text-right" style="width: 100px;">Unit</th>
                <th class="text-right" style="width: 120px;">Rate (₹)</th>
                <th class="text-right" style="width: 140px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${c.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-right">${(item.quantity ?? 1).toLocaleString()}</td>
                  <td class="text-right">${item.unit ?? 'sqft'}</td>
                  <td class="text-right">₹${(item.rate ?? item.amount).toLocaleString()}</td>
                  <td class="text-right">₹${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('');
    })()}

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
    ${(tenantProfile?.subscription_plan || "Free Trial") === "Free Trial" ? `
    <div style="margin-top: 30px; text-align: center; border: 1px solid #fed7aa; background-color: #fffbeb; padding: 12px; border-radius: 8px; font-size: 11px; font-weight: bold; color: #b45309; display: flex; align-items: center; justify-content: center; gap: 6px;">
      <span>Generated via BuildEstimate BOS Trial</span>
    </div>
    ` : ""}
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
      {/* Project Context Title with interactive selector dropdown and Linked Client */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
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

        {/* Linked Client Info Card */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <span className="material-symbols-outlined text-slate-400 text-xl">person</span>
          <div className="text-xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Linked Client</span>
            {linkedClient ? (
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-extrabold text-slate-800">{linkedClient.name}</p>
                  {linkedClient.phone && (
                    <p className="text-[10px] text-slate-500">{linkedClient.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenAssignModal}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors flex items-center justify-center"
                  title="Change Linked Client"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-600 italic">Client Not Assigned</span>
                <button
                  type="button"
                  onClick={handleOpenAssignModal}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[10px] font-black transition-all uppercase"
                >
                  Assign Client
                </button>
              </div>
            )}
          </div>
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
          onClick={() => handleOpenAddModal("civil")}
          className="text-xs font-extrabold text-slate-900 hover:underline flex items-center gap-1 py-1 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span> Add Line Item
        </button>
      </div>

      {/* Category Bento List Cluster */}
      <div className="space-y-4">
        {/* Category Card: Civil Work */}
        {totalCivil > 0 && (
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
                    {getPercentage(totalCivil)}% of total estimate
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
                    style={{ width: `${getPercentage(totalCivil)}%` }}
                  />
                </div>

                {totalCivil > 0 && selectedProject?.estimates?.civil_vendor_name && (
                  <div className="bg-emerald-50 p-2.5 rounded-lg flex items-center justify-between border border-emerald-200 shadow-sm transition-all">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-700 text-sm font-bold">verified</span>
                      <p className="text-xs font-bold text-emerald-800">Verified by Vendor: {selectedProject.estimates.civil_vendor_name}</p>
                    </div>
                    <button
                      onClick={() => handleOpenAssignVendor("civil")}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 rounded hover:bg-emerald-100/50 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {totalCivil > 0 && !selectedProject?.estimates?.civil_vendor_name && (
                  <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200/60 border-dashed transition-all">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-slate-400 text-sm">handshake</span>
                      <p className="text-xs font-medium">No verified vendor assigned yet</p>
                    </div>
                    <button
                      onClick={() => handleOpenAssignVendor("civil")}
                      className="text-[11px] font-extrabold text-slate-900 hover:underline flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      Assign Vendor
                    </button>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                  {civilItems.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                  ) : (
                    civilItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                        <div className="flex-1">
                          <span className="text-slate-600 font-medium">{item.name}</span>
                          {item.quantity !== undefined && item.rate !== undefined && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              {item.quantity.toLocaleString()} {item.unit || "sqft"} @ ₹{item.rate.toLocaleString()}/{item.unit || "sqft"}
                            </p>
                          )}
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
        )}

        {/* Category Card: Electrical */}
        {totalElectrical > 0 && (
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
                  {getPercentage(totalElectrical)}% of total estimate
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
                  style={{ width: `${getPercentage(totalElectrical)}%` }}
                />
              </div>

              {totalElectrical > 0 && selectedProject?.estimates?.electrical_vendor_name && (
                <div className="bg-emerald-50 p-2.5 rounded-lg flex items-center justify-between border border-emerald-200 shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-sm font-bold">verified</span>
                    <p className="text-xs font-bold text-emerald-800">Verified by Vendor: {selectedProject.estimates.electrical_vendor_name}</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("electrical")}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 rounded hover:bg-emerald-100/50 transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {totalElectrical > 0 && !selectedProject?.estimates?.electrical_vendor_name && (
                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200/60 border-dashed transition-all">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-slate-400 text-sm">handshake</span>
                    <p className="text-xs font-medium">No verified vendor assigned yet</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("electrical")}
                    className="text-[11px] font-extrabold text-slate-900 hover:underline flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Assign Vendor
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {electricalItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  electricalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                        {item.quantity !== undefined && item.rate !== undefined && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.quantity.toLocaleString()} {item.unit || "sqft"} @ ₹{item.rate.toLocaleString()}/{item.unit || "sqft"}
                          </p>
                        )}
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
        )}

        {/* Category Card: Finishes */}
        {totalFinishes > 0 && (
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
                  {getPercentage(totalFinishes)}% of total estimate
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
                  style={{ width: `${getPercentage(totalFinishes)}%` }}
                />
              </div>

              {totalFinishes > 0 && selectedProject?.estimates?.finishes_vendor_name && (
                <div className="bg-emerald-50 p-2.5 rounded-lg flex items-center justify-between border border-emerald-200 shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-sm font-bold">verified</span>
                    <p className="text-xs font-bold text-emerald-800">Verified by Vendor: {selectedProject.estimates.finishes_vendor_name}</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("finishes")}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 rounded hover:bg-emerald-100/50 transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {totalFinishes > 0 && !selectedProject?.estimates?.finishes_vendor_name && (
                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200/60 border-dashed transition-all">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-slate-400 text-sm">handshake</span>
                    <p className="text-xs font-medium">No verified vendor assigned yet</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("finishes")}
                    className="text-[11px] font-extrabold text-slate-900 hover:underline flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Assign Vendor
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {finishesItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  finishesItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                        {item.quantity !== undefined && item.rate !== undefined && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.quantity.toLocaleString()} {item.unit || "sqft"} @ ₹{item.rate.toLocaleString()}/{item.unit || "sqft"}
                          </p>
                        )}
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
        )}

        {/* Category Card: Interior & Woodwork */}
        {totalInteriorFinishing > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
            <div
              onClick={() => toggleCategory("interior_finishing")}
              className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
                  <span className="material-symbols-outlined">chair</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Premium Home Interior, Woodwork & False Ceiling</h4>
                <p className="text-xs text-slate-500">
                  {getPercentage(totalInteriorFinishing)}% of total estimate
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">₹{totalInteriorFinishing.toLocaleString()}</p>
              </div>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${expandedCategories.interior_finishing ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </div>
          </div>

          {expandedCategories.interior_finishing && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-950 rounded-full"
                  style={{ width: `${getPercentage(totalInteriorFinishing)}%` }}
                />
              </div>

              {totalInteriorFinishing > 0 && selectedProject?.estimates?.interior_vendor_name && (
                <div className="bg-emerald-50 p-2.5 rounded-lg flex items-center justify-between border border-emerald-200 shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-sm font-bold">verified</span>
                    <p className="text-xs font-bold text-emerald-800">Verified by Vendor: {selectedProject.estimates.interior_vendor_name}</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("interior_finishing")}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 rounded hover:bg-emerald-100/50 transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {totalInteriorFinishing > 0 && !selectedProject?.estimates?.interior_vendor_name && (
                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200/60 border-dashed transition-all">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-slate-400 text-sm">handshake</span>
                    <p className="text-xs font-medium">No verified vendor assigned yet</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssignVendor("interior_finishing")}
                    className="text-[11px] font-extrabold text-slate-900 hover:underline flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Assign Vendor
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                {interiorFinishingItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No items added yet</p>
                ) : (
                  interiorFinishingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs group py-1 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                        {item.quantity !== undefined && item.rate !== undefined && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.quantity.toLocaleString()} {item.unit || "sqft"} @ ₹{item.rate.toLocaleString()}/{item.unit || "sqft"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal("interior_finishing", idx, item);
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
                                onConfirm: () => handleDeleteLineItem("interior_finishing", idx)
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
                onClick={() => handleOpenAddModal("interior_finishing")}
                className="w-full h-11 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-black hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span> ADD LINE ITEM
              </button>
            </div>
          )}
        </section>
        )}
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
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDualActionWhatsApp}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all text-xs active:scale-95"
                >
                  {/* WhatsApp Icon */}
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.179.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.907-11.893 11.907-2.01-.001-3.986-.51-5.742-1.477L0 24zm6.59-4.846c1.63.967 3.559 1.478 5.35 1.479 5.548 0 10.064-4.515 10.066-10.066.002-2.688-1.043-5.216-2.943-7.115C17.164 1.551 14.639.507 11.95.507c-5.556 0-10.074 4.52-10.076 10.072-.001 1.777.464 3.511 1.348 5.03L1.242 21.22l5.405-1.417z"/>
                  </svg>
                  Share on WhatsApp
                </button>
                <button 
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Letterhead Preview Sheet */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6 font-sans text-slate-800">
              
              {/* Header Letterhead Grid */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  {businessLogo && (
                    <img 
                      src={businessLogo} 
                      alt="Logo" 
                      referrerPolicy="no-referrer" 
                      className="max-h-12 object-contain mb-2 rounded-lg"
                    />
                  )}
                  <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">{companyName}</h4>
                  {companyAddress && <p className="text-[10px] text-slate-500">{companyAddress}</p>}
                  <p className="text-[10px] text-slate-400 font-medium">
                    {companyGstin && `GSTIN: ${companyGstin}`}
                    {companyGstin && (companyPhone || companyEmail) && " | "}
                    {companyPhone && `Tel: ${companyPhone}`}
                    {companyPhone && companyEmail && " | "}
                    {companyEmail && `Email: ${companyEmail}`}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Commercial Proposal
                  </span>
                  <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                    <p><span className="font-semibold text-slate-900">Project ID:</span> {selectedProject?.project_id || 'BOS-PRJ-3001'}</p>
                    <p><span className="font-semibold text-slate-900">Quote #:</span> EST-{selectedProject?.id || '001'}{selectedProject?.revision_number ? `-R${selectedProject.revision_number}` : ''}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Client & Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Prepared For</span>
                  {linkedClient ? (
                    <div>
                      <p className="font-extrabold text-slate-900">{linkedClient.name}</p>
                      {linkedClient.phone && <p className="text-[10px] text-slate-500">Phone: {linkedClient.phone}</p>}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-extrabold text-rose-600">Client Not Assigned</p>
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        className="text-[10px] font-black uppercase text-emerald-750 hover:text-emerald-900 underline flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[12px] font-bold">person_add</span>
                        Assign Client
                      </button>
                    </div>
                  )}
                  <p className="text-slate-500 mt-1">Ref: {selectedProject?.project_name || 'Active Project Site'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Site Address</span>
                  <p className="font-bold text-slate-800">{selectedProject?.location || 'N/A'}</p>
                  <p className="text-slate-500">Project Type: {selectedProject?.type || 'Construction'}</p>
                </div>
              </div>

              {/* Line Item Summaries */}
              <div className="border border-slate-200 rounded-lg p-5 bg-white text-xs space-y-4 shadow-sm">
                {(() => {
                  const categories = [
                    {
                      id: "civil",
                      name: "1. Civil, Excavation, Structure & Brickwork",
                      total: totalCivil,
                      items: civilItems,
                    },
                    {
                      id: "electrical",
                      name: "2. Electrical conduits, copper cables & DB panels",
                      total: totalElectrical,
                      items: electricalItems,
                    },
                    {
                      id: "finishes",
                      name: "3. Architectural painting, finishes & marble flooring",
                      total: totalFinishes,
                      items: finishesItems,
                    },
                    {
                      id: "interior_finishing",
                      name: "Premium Home Interior, Woodwork & False Ceiling",
                      total: totalInteriorFinishing,
                      items: interiorFinishingItems,
                    }
                  ];

                  const activeCategories = categories.filter((category) => category.total > 0);

                  if (activeCategories.length === 0) {
                    return (
                      <p className="text-center py-4 text-slate-400 italic">No line items added to this estimate yet.</p>
                    );
                  }

                  return activeCategories.map((category, index) => {
                    const categoryTotal = category.total;
                    const percentage = grandTotal > 0 ? ((categoryTotal / grandTotal) * 100).toFixed(0) : 0;
                    return (
                      <div key={category.id} className="mb-6 border-b border-slate-100 pb-4 last:mb-0 last:border-b-0 last:pb-0">
                        {/* Dynamic Category Heading with exact safe percentage layout */}
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                              {index + 1}
                            </span>
                            <span>{category.name.replace(/^\d+\.\s*/, '')}</span>
                          </h3>
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                            {percentage}% of total estimate
                          </span>
                        </div>
                        
                        {/* Sub-items Grid Details (No Subtotal row at the bottom) */}
                        <div className="space-y-2 pl-2">
                          {category.items.map((item: any, idx: number) => {
                            const itemRate = item.rate ?? item.amount;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs text-slate-600 hover:bg-slate-50/50 p-1 rounded transition-colors">
                                <span>{item.name} ({item.quantity} {item.unit || 'sqft'} @ ₹{itemRate.toLocaleString()})</span>
                                <span className="font-semibold text-slate-900">₹{item.amount.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
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

            {/* Share Quote Workflow Card - Dual-Action Action Bar */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 max-w-md mx-auto w-full shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 text-center flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-500">share_reviews</span>
                  Dual-Action Share Workflow
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* ACTION 1: Download Estimate PDF */}
                  <button 
                    onClick={handleDownloadQuote} 
                    className="bg-slate-900 hover:bg-black text-white font-extrabold py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-xs flex flex-col justify-center items-center gap-1.5 active:scale-95 cursor-pointer text-center"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    <span>Download Estimate PDF</span>
                  </button>

                  {/* ACTION 2: Share on WhatsApp */}
                  <button 
                    onClick={handleDualActionWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-xs flex flex-col justify-center items-center gap-1.5 active:scale-95 cursor-pointer text-center"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.179.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.907-11.893 11.907-2.01-.001-3.986-.51-5.742-1.477L0 24zm6.59-4.846c1.63.967 3.559 1.478 5.35 1.479 5.548 0 10.064-4.515 10.066-10.066.002-2.688-1.043-5.216-2.943-7.115C17.164 1.551 14.639.507 11.95.507c-5.556 0-10.074 4.52-10.076 10.072-.001 1.777.464 3.511 1.348 5.03L1.242 21.22l5.405-1.417z"/>
                    </svg>
                    <span>Share on WhatsApp</span>
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-400/90 text-center mt-3 leading-relaxed italic">
                  💡 Pro-Tip: Once the WhatsApp chat opens, click the attachment 📎 icon to instantly forward your downloaded PDF proposal.
                </p>
              </div>

              {/* ACTION 3: Public Shared Snapshot Link */}
              <div className="border-t border-slate-200/60 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 text-center flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-500">public</span>
                  Client Shared Snapshot Portal
                </h4>

                {selectedProject.generated_share_id && !generatedShareId ? (
                  <div className="space-y-2 bg-amber-50/50 border border-amber-200/60 p-3 rounded-xl text-center animate-fade-in">
                    <p className="text-[10px] font-semibold text-amber-900 leading-relaxed">
                      This project already has an active shared link. How would you like to handle your recent changes?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleGeneratePublicLink('overwrite')}
                        disabled={isGeneratingLink}
                        className="h-9 px-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-2xs flex justify-center items-center gap-1 active:scale-95 cursor-pointer"
                        title="Keep the same share URL so your client can see the changes instantly upon refreshing"
                      >
                        <span className="material-symbols-outlined text-xs">sync</span>
                        Update Current Link
                      </button>
                      <button
                        onClick={() => handleGeneratePublicLink('new_revision')}
                        disabled={isGeneratingLink}
                        className="h-9 px-2 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-2xs flex justify-center items-center gap-1 active:scale-95 cursor-pointer"
                        title="Create a separate share URL and increment the revision counter (e.g. R1, R2)"
                      >
                        <span className="material-symbols-outlined text-xs">history</span>
                        New Revision Suffix
                      </button>
                    </div>
                  </div>
                ) : !generatedShareId ? (
                  <button
                    onClick={() => handleGeneratePublicLink()}
                    disabled={isGeneratingLink}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-xs flex justify-center items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    {isGeneratingLink ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        <span>Publishing Snapshot...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">link</span>
                        <span>Generate Public Link</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono truncate text-slate-600 select-all shadow-2xs flex items-center">
                        {`${window.location.origin}${window.location.pathname}?share=${generatedShareId}`}
                      </div>
                      <button
                        onClick={handleCopyGeneratedLink}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 select-none cursor-pointer ${
                          linkCopied 
                            ? "bg-green-600 text-white" 
                            : "bg-slate-900 hover:bg-black text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {linkCopied ? "check" : "content_copy"}
                        </span>
                        <span>{linkCopied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] text-green-600 font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                        Snapshot Active & Shareable!
                      </span>
                      <button 
                        onClick={() => setGeneratedShareId(null)}
                        className="text-[9px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Publish New Suffix
                      </button>
                    </div>
                  </div>
                )}

                {/* Past Revisions List */}
                {selectedProject.past_revisions && selectedProject.past_revisions.length > 0 && (
                  <div className="bg-slate-100/70 border border-slate-200/60 rounded-xl p-3 space-y-2 text-[11px] animate-fade-in">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px] text-slate-600">history</span>
                      Published Revision Logs
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/60">
                      {selectedProject.past_revisions.map((rev, idx) => {
                        const url = `${window.location.origin}${window.location.pathname}?share=${rev.share_id}`;
                        return (
                          <div key={rev.share_id} className="pt-1.5 first:pt-0 flex justify-between items-center gap-1.5 font-mono">
                            <div className="truncate flex-1">
                              <span className="bg-slate-200/80 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-bold mr-1.5">R{rev.revision}</span>
                              <span className="text-slate-500 text-[10px]">{new Date(rev.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-slate-500 hover:text-slate-900 flex items-center p-1 bg-white hover:bg-slate-100 rounded-md border border-slate-200 shadow-2xs transition-all"
                                title="Open Portal View"
                              >
                                <span className="material-symbols-outlined text-xs">open_in_new</span>
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(url);
                                  onAddLog(`Copied link to Revision R${rev.revision} of Project "${selectedProject.project_name}".`);
                                }}
                                className="text-slate-500 hover:text-slate-900 flex items-center p-1 bg-white hover:bg-slate-100 rounded-md border border-slate-200 shadow-2xs transition-all"
                                title="Copy Link"
                              >
                                <span className="material-symbols-outlined text-xs">content_copy</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-150">
              <button
                onClick={() => {
                  const text = `
CONSTRUCTION COMMERCIAL PROPOSAL
=================================
${companyName}
Quote #: EST-${selectedProject?.id || '001'}
Date: ${new Date().toLocaleDateString('en-IN')}

Client: ${linkedClient ? linkedClient.name : 'Client Not Assigned'}
Project Site: ${selectedProject?.project_name || 'Active Project Site'}
Address: ${selectedProject?.location || 'N/A'}
Project Type: ${selectedProject?.type || 'Construction'}

SUMMARY OF ESTIMATES:
1. Civil Work: ₹${totalCivil.toLocaleString()}
2. Electrical: ₹${totalElectrical.toLocaleString()}
3. Architectural Finishes: ₹${totalFinishes.toLocaleString()}
4. Premium Interiors & Woodwork: ₹${totalInteriorFinishing.toLocaleString()}

---------------------------------
Material & Labor Cost: ₹${grandTotal.toLocaleString()}
GST (${gstPercent}%): ₹${gstRupees.toLocaleString()}
---------------------------------
GRAND TOTAL QUOTATION: ₹${totalWithGst.toLocaleString()}

Thank you for your business!
${companyName}
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

              <button
                onClick={handleDualActionWhatsApp}
                className="flex-1 h-11 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
              >
                {/* WhatsApp Icon */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.179.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.907-11.893 11.907-2.01-.001-3.986-.51-5.742-1.477L0 24zm6.59-4.846c1.63.967 3.559 1.478 5.35 1.479 5.548 0 10.064-4.515 10.066-10.066.002-2.688-1.043-5.216-2.943-7.115C17.164 1.551 14.639.507 11.95.507c-5.556 0-10.074 4.52-10.076 10.072-.001 1.777.464 3.511 1.348 5.03L1.242 21.22l5.405-1.417z"/>
                </svg>
                Share on WhatsApp
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
              {editingIndex !== null ? "Edit Item" : "Add Item to Estimate"}
            </h3>

            <form onSubmit={handleAddLineItem} className="space-y-4">
              {editingIndex === null && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Select Category
                  </label>
                  <select
                    value={targetCategory || "civil"}
                    onChange={(e) => setTargetCategory(e.target.value as any)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white cursor-pointer"
                  >
                    <option value="civil">Civil Work</option>
                    <option value="electrical">Electrical</option>
                    <option value="finishes">Finishes</option>
                    <option value="interior_finishing">Premium Home Interior, Woodwork & False Ceiling</option>
                  </select>
                </div>
              )}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    id="line-item-qty"
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Unit
                  </label>
                  <select
                    id="line-item-unit"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-2 text-sm focus:border-slate-900 outline-none bg-white cursor-pointer"
                  >
                    <option value="sqft">sqft</option>
                    <option value="rft">rft</option>
                    <option value="nos">nos</option>
                    <option value="kg">kg</option>
                    <option value="bag">bag</option>
                    <option value="cum">cum</option>
                    <option value="ls">ls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Rate (₹)
                  </label>
                  <input
                    id="line-item-rate"
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 150"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Total Amount (₹) - Auto Calculated
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                  <input
                    id="line-item-amount"
                    type="text"
                    readOnly
                    disabled
                    value={((parseFloat(newItemQuantity) || 0) * (parseFloat(newItemRate) || 0)).toLocaleString("en-IN")}
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 text-sm font-bold text-slate-700 outline-none cursor-not-allowed"
                  />
                </div>
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

      {/* Assign Client Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <span className="material-symbols-outlined text-emerald-600">person_add</span>
                <h3 className="text-base font-black uppercase tracking-wide">Assign Client to Project</h3>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose an existing client from your contact book to link with the project <strong className="text-slate-800">"{selectedProject?.project_name}"</strong>. This will automatically populate their info on official quotations, invoices, and material summaries.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Select Associated Client
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddClientOpen(true)}
                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-extrabold uppercase hover:underline transition-all"
                  >
                    + Add New Client
                  </button>
                </div>
                <select
                  value={selectedClientIdForAssignment}
                  onChange={(e) => setSelectedClientIdForAssignment(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Choose a Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || "No Phone"})
                    </option>
                  ))}
                </select>
              </div>

              {clients.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium leading-relaxed">
                  ⚠️ No client accounts found in your system. To assign a client, please add them in other views first.
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedProject && onUpdateProject) {
                    onUpdateProject({
                      ...selectedProject,
                      client_id: selectedClientIdForAssignment || undefined
                    });
                    const clientName = clients.find(c => c.id === selectedClientIdForAssignment)?.name || "N/A";
                    onAddLog(`Assigned client "${clientName}" to project "${selectedProject.project_name}".`);
                    setIsAssignModalOpen(false);
                  }
                }}
                className="flex-1 h-10 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                Save Association
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW CLIENT MODAL */}
      {isAddClientOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">person_add</span>
                Add New Client
              </h3>
              <button 
                onClick={() => setIsAddClientOpen(false)} 
                className="material-symbols-outlined text-slate-400 hover:text-black transition-colors"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Phone
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className={`w-full h-10 border rounded-lg px-3 text-sm outline-none transition-all ${
                    newClientPhone.trim() 
                      ? (validatePhoneNumber(newClientPhone).isValid 
                        ? "border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500" 
                        : "border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500")
                      : "border-slate-300 focus:border-slate-900"
                  }`}
                />
                {newClientPhone.trim() && (() => {
                  const res = validatePhoneNumber(newClientPhone);
                  if (!res.isValid) {
                    return (
                      <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] font-bold">cancel</span>
                        {res.error}
                      </p>
                    );
                  } else if (res.warning) {
                    return (
                      <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] font-bold">warning</span>
                        {res.warning}
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] font-bold">check_circle</span>
                        Valid mobile number.
                      </p>
                    );
                  }
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Project Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 62, Noida, UP"
                  value={newClientLocation}
                  onChange={(e) => setNewClientLocation(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="w-1/2 h-10 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs uppercase text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <span className="material-symbols-outlined text-emerald-600">handshake</span>
                <h3 className="text-base font-black uppercase tracking-wide">
                  Assign Vendor to {vendorCategory === "civil" ? "Civil Work" : vendorCategory === "electrical" ? "Electrical" : vendorCategory === "finishes" ? "Finishes" : "Interior & Woodwork"}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsVendorModalOpen(false);
                  setVendorCategory(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose an existing vendor from your database or write a custom name to verify material rates and quality.
              </p>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">
                  Select Registered Vendor
                </label>
                <select
                  value={vendors.some(v => v.name === typedVendorName) ? typedVendorName : (typedVendorName ? "CUSTOM" : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "CUSTOM") {
                      setTypedVendorName("");
                    } else {
                      setTypedVendorName(val);
                    }
                  }}
                  className="w-full h-11 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white cursor-pointer"
                >
                  <option value="">-- No Vendor Assigned --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                  <option value="CUSTOM">-- Custom/Other Vendor --</option>
                </select>
              </div>

              {(!vendors.some(v => v.name === typedVendorName) || typedVendorName === "") && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Or Enter Custom Vendor Name
                  </label>
                  <input
                    type="text"
                    value={typedVendorName}
                    onChange={(e) => setTypedVendorName(e.target.value)}
                    placeholder="e.g. Gupta Marbles"
                    className="w-full h-11 border border-slate-300 rounded-lg px-3 text-sm focus:border-slate-900 outline-none bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsVendorModalOpen(false);
                  setVendorCategory(null);
                }}
                className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveVendor(typedVendorName);
                }}
                className="flex-1 h-10 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
