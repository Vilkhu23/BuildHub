import React, { useState, useEffect } from "react";
import { DailyPayment, Project, Profile } from "../types";

interface DailyLogViewProps {
  payments: DailyPayment[];
  projects: Project[];
  profiles: Profile[];
  activeRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  onAddPayment: (payment: DailyPayment) => void;
  onAddLog: (log: string) => void;
}

export default function DailyLogView({
  payments,
  projects,
  profiles,
  activeRole,
  onAddPayment,
  onAddLog,
}: DailyLogViewProps) {
  // Site filter selector: "all" or specific project_id
  const [siteSelector, setSiteSelector] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Mic overlay state
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("Hold mic to speak site transaction in Punjabi or Hindi");
  const [voiceText, setVoiceText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Direct manual transcription keyboard entry fallback
  const [textQuery, setTextQuery] = useState("");

  // Manual Punching Form States
  const [manualAmount, setManualAmount] = useState("");
  const [manualRemarks, setManualRemarks] = useState("");
  const [manualCategory, setManualCategory] = useState<'Labor' | 'Materials' | 'Miscellaneous'>('Miscellaneous');
  const [manualPaidBy, setManualPaidBy] = useState("");
  const [manualProjectId, setManualProjectId] = useState("");
  const [manualDate, setManualDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [successNotification, setSuccessNotification] = useState("");

  // Set default manualPaidBy and manualProjectId on mount or role/projects change
  useEffect(() => {
    // Set default paid by based on active persona
    const matchedProfile = profiles.find((p) => p.user_role === activeRole);
    if (matchedProfile) {
      setManualPaidBy(matchedProfile.name);
    } else {
      if (activeRole === "Owner") setManualPaidBy("Rajesh Singh");
      else if (activeRole === "Manager") setManualPaidBy("Amit Kumar");
      else if (activeRole === "Supervisor") setManualPaidBy("Rahul Khan");
      else if (activeRole === "Telecaller") setManualPaidBy("Priya Sharma");
      else setManualPaidBy("Supervisor Amit");
    }

    // Set default manualProjectId to first project
    if (projects.length > 0) {
      setManualProjectId(projects[0].id);
    }
  }, [activeRole, profiles, projects]);

  // Sample quick presets
  const presets = [
    "Paid shuttering labor wages 12500",
    "Aaj cement bori mangaaye athara hazar ka",
    "petty cash plumbers ko diya baara sau"
  ];

  const handleApplyPreset = (val: string) => {
    setTextQuery(val);
  };

  const handleVoiceParseSubmit = async (phraseToParse: string) => {
    if (!phraseToParse) return;
    setIsProcessing(true);
    setStatusText("Transcribing & parsing ledger with Gemini...");

    // Determine target project ID for the voiced payment
    const targetProjId = siteSelector === "all" 
      ? (projects[0]?.id || "pr-3") 
      : siteSelector;

    try {
      const res = await fetch("/api/voice-to-khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phrase: phraseToParse,
          projectId: targetProjId
        }),
      });

      const data = await res.json();
      if (res.ok && data.payment) {
        onAddPayment(data.payment);
        onAddLog(`Processed multi-lingual voice transaction: "${phraseToParse}" -> ₹${data.payment.amount.toLocaleString()}`);
        setStatusText("Transaction successfully logged to ledger book!");
        setVoiceText(`Parsed: ${data.payment.remarks} (₹${data.payment.amount.toLocaleString()})`);
        setTextQuery("");
        
        // Show success banner
        setSuccessNotification(`Success: Added ₹${data.payment.amount.toLocaleString()} - ${data.payment.remarks}`);
        setTimeout(() => setSuccessNotification(""), 5000);

        setTimeout(() => {
          setIsListening(false);
          setVoiceText("");
          setStatusText("Hold mic to speak site transaction in Punjabi or Hindi");
        }, 3000);
      } else {
        setStatusText("Error: " + (data.error || "Failed to analyze speech."));
      }
    } catch (err) {
      console.error(err);
      setStatusText("Network error. Standard mock fallback applied.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListeningSimulation = () => {
    setIsListening(true);
    setStatusText("Listening... speak now");
    setVoiceText("");

    // Simulate speech detection
    setTimeout(() => {
      setStatusText("Analyzing voice signature...");
      // Pick a random preset
      const randomPreset = presets[Math.floor(Math.random() * presets.length)];
      setVoiceText(`"${randomPreset}"`);

      // Send to parser
      setTimeout(() => {
        handleVoiceParseSubmit(randomPreset);
      }, 1500);
    }, 2500);
  };

  // Submit manual punching ledger entry (No AI required, 100% saved)
  const handleManualPunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(manualAmount);
    if (!manualAmount || isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }
    if (!manualRemarks.trim()) {
      alert("Please enter transaction remarks/description");
      return;
    }

    const targetProj = projects.find(p => p.id === manualProjectId) || projects[0];
    const projectName = targetProj ? targetProj.project_name : "Active Site";

    const newPayment: DailyPayment = {
      id: "dp-" + Date.now(),
      project_id: manualProjectId || (projects[0]?.id || "pr-3"),
      amount: amountNum,
      paid_by: manualPaidBy || "Supervisor Amit",
      remarks: manualRemarks.trim(),
      category: manualCategory,
      date: new Date(manualDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };

    // Save transaction
    onAddPayment(newPayment);
    onAddLog(`Punched ledger entry: ₹${amountNum.toLocaleString()} for "${manualRemarks.trim()}" at ${projectName}`);
    
    // Clear manual inputs
    setManualAmount("");
    setManualRemarks("");
    setSuccessNotification(`Successfully punched entry of ₹${amountNum.toLocaleString()} to "${projectName}"!`);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
      setSuccessNotification("");
    }, 4000);
  };

  // Filter payments list by siteSelector and searchQuery
  const filteredPayments = payments.filter((p) => {
    const matchesSite = siteSelector === "all" || p.project_id === siteSelector;
    const matchesQuery = p.remarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.paid_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesQuery;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Labor":
        return "engineering";
      case "Materials":
        return "inventory_2";
      default:
        return "payments";
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Labor":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Materials":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Find project name for display in transaction list
  const getProjectName = (projId: string) => {
    const proj = projects.find((p) => p.id === projId);
    return proj ? proj.project_name : "General Site";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 relative">
      {/* Dynamic Success Notification Banner */}
      {successNotification && (
        <div className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm font-black">check_circle</span>
            <span>{successNotification}</span>
          </div>
          <button onClick={() => setSuccessNotification("")} className="text-white hover:text-slate-200">
            <span className="material-symbols-outlined text-xs font-bold">close</span>
          </button>
        </div>
      )}

      {/* Header site log selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            DAILY LEDGER & SITE LOG
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-emerald-600 font-bold">location_on</span>
            <select
              value={siteSelector}
              onChange={(e) => {
                setSiteSelector(e.target.value);
                if (e.target.value !== "all") {
                  setManualProjectId(e.target.value);
                }
              }}
              className="text-lg font-black bg-transparent border-none ring-none focus:ring-none focus:outline-none p-0 cursor-pointer text-slate-900 focus:ring-0 outline-none"
            >
              <option value="all">📂 All Active Construction Sites</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  🚧 {p.project_name} ({p.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold bg-white border border-slate-200 py-1.5 px-3 rounded-lg">
          System Date: {new Date().toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Grid Layout: Left Voice/AI, Right Direct Manual Punch Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Voice and AI Input */}
        <div className="space-y-4">
          {/* Mic Trigger Banner Card */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-850 flex flex-col justify-between h-full min-h-[160px] gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-400">AI Voice-to-Ledger</h3>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Tap mic to dictate site transactions in Hindi, Punjabi, or Hinglish directly into your khata ledger.
              </p>
              <p className="text-[10px] text-slate-500 italic font-mono pt-1">
                E.g. "Paid labor wages ₹12,500" or "Aaj cement mangaaya 18000 ka"
              </p>
            </div>
            <button
              onClick={startListeningSimulation}
              className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined font-black text-sm">mic</span>
              TAP TO SPEAK (OPEN MIC)
            </button>
          </section>

          {/* Hinglish Dictate Keyboard Input fallback */}
          <section className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dictate Hinglish Keyboard Helper</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type e.g. Shuttering labor wages paid 12500..."
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                className="flex-grow h-11 border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-slate-900 shadow-sm"
              />
              <button
                onClick={() => handleVoiceParseSubmit(textQuery)}
                disabled={!textQuery}
                className="h-11 px-4 bg-slate-900 disabled:opacity-40 hover:bg-black text-white text-xs font-bold rounded-xl whitespace-nowrap"
              >
                Run AI Parse
              </button>
            </div>

            {/* Quick Click presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-100 mt-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Tap presets:</span>
              {presets.map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(val)}
                  className="text-[9px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors font-medium"
                >
                  "{val}"
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Direct Manual Punch Form (100% Reliable, No AI) */}
        <section className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="material-symbols-outlined text-slate-800 text-base font-black">edit_note</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              PUNCH MANUAL LEDGER ENTRY
            </h3>
          </div>

          <form onSubmit={handleManualPunchSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="12500"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl pl-6 pr-2 text-xs font-extrabold outline-none focus:border-slate-900 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as any)}
                  className="w-full h-10 border border-slate-200 bg-white rounded-xl px-2.5 text-xs font-bold outline-none focus:border-slate-900 shadow-sm"
                >
                  <option value="Labor">👷 Labor Wages</option>
                  <option value="Materials">📦 Materials Supply</option>
                  <option value="Miscellaneous">🪙 Miscellaneous Expense</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remarks / Description</label>
              <input
                type="text"
                required
                placeholder="E.g. Paid shuttering labor for first floor"
                value={manualRemarks}
                onChange={(e) => setManualRemarks(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-slate-900 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Site/Project</label>
                <select
                  value={manualProjectId}
                  onChange={(e) => setManualProjectId(e.target.value)}
                  className="w-full h-10 border border-slate-200 bg-white rounded-xl px-2 text-xs outline-none focus:border-slate-900 shadow-sm font-semibold"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Punched By</label>
                <select
                  value={manualPaidBy}
                  onChange={(e) => setManualPaidBy(e.target.value)}
                  className="w-full h-10 border border-slate-200 bg-white rounded-xl px-2 text-xs outline-none focus:border-slate-900 shadow-sm font-semibold"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.name}>
                      👤 {p.name} ({p.user_role})
                    </option>
                  ))}
                  {!profiles.some(p => p.name === manualPaidBy) && manualPaidBy && (
                    <option value={manualPaidBy}>{manualPaidBy}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-slate-900 shadow-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-10 bg-slate-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  PUNCH ENTRY
                </button>
              </div>
            </div>
          </form>
        </section>

      </div>

      {/* Today's ledger transactions list */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Ledger Book Entries {siteSelector !== "all" ? `for "${getProjectName(siteSelector)}"` : "(Global)"}
          </h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search remarks, categories, paid by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs outline-none focus:border-slate-500 shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
              search
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed p-10 rounded-xl text-center space-y-3">
              <span className="material-symbols-outlined text-slate-400 text-4xl">payments</span>
              <p className="text-sm font-bold text-slate-800">No Transactions Found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No ledger entries matched your filter. Use the voice tool or manual punch form above to instantly add new ones.
              </p>
            </div>
          ) : (
            filteredPayments.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between hover:border-slate-400 transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <span className="material-symbols-outlined">{getCategoryIcon(p.category)}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.remarks}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold mt-1 uppercase">
                      <span>{p.date}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded border uppercase shrink-0 ${getCategoryBadge(p.category)}`}>
                        {p.category}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 font-black truncate max-w-[150px]">
                        📍 {getProjectName(p.project_id)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-900">₹{p.amount.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">By: {p.paid_by.split(" ")[1] || p.paid_by}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FULL RECORDING OVERLAY (SIMULATION) */}
      {isListening && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
          <div className="max-w-md space-y-8 flex flex-col items-center">
            {/* Listening Wave Pulse Indicator */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="absolute inset-3 bg-emerald-500/30 rounded-full voice-active-ring" />
              <div className="relative w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <span className="material-symbols-outlined text-2xl font-bold animate-pulse">mic</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white text-lg font-black tracking-tight uppercase">Speech Ledger Active</h3>
              <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">{isProcessing ? "PROCESSING..." : "LISTENING..."}</p>
              <p className="text-slate-400 text-sm max-w-xs">{statusText}</p>
            </div>

            {/* Display voice text as it transcribes */}
            {voiceText && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-left mb-1">Transcript signature</p>
                <p className="text-slate-200 text-sm italic font-extrabold text-left">{voiceText}</p>
              </div>
            )}

            <button
              onClick={() => setIsListening(false)}
              className="px-6 h-10 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-bold"
            >
              Close Ledger Mic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
