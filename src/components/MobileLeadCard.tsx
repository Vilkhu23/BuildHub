import React, { useState } from "react";
import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  Check, 
  X, 
  UserPlus, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Clock,
  Sparkles,
  Briefcase
} from "lucide-react";
import { CRMLead, Profile } from "../types";

interface MobileLeadCardProps {
  key?: string | number;
  lead: CRMLead;
  profiles: Profile[];
  onUpdateLead: (leadId: string, updates: Partial<CRMLead>) => void;
  onAddLog?: (message: string) => void;
  activeRole?: string;
}

export default function MobileLeadCard({ 
  lead, 
  profiles, 
  onUpdateLead, 
  onAddLog,
  activeRole = "Telecaller"
}: MobileLeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [tempRemarks, setTempRemarks] = useState(lead.remarks || "");
  const [isEditingFollowup, setIsEditingFollowup] = useState(false);
  const [tempFollowup, setTempFollowup] = useState(lead.next_followup_date || "");

  // Clean phone number for dialer & WhatsApp links
  const cleanedPhone = lead.phone_number.replace(/[^0-9]/g, "");
  
  const handleWhatsAppLaunch = () => {
    const formattedText = encodeURIComponent(`Chardi Kala, ${lead.customer_name} ji! BuildEstimate platform se message bypass ho raha hai.`);
    window.open(`https://wa.me/${cleanedPhone || "919876543210"}?text=${formattedText}`, '_blank');
  };

  // Check if follow-up is overdue
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = lead.next_followup_date && 
                    lead.next_followup_date < todayStr && 
                    lead.lead_status !== "Won" && 
                    lead.lead_status !== "Lost";

  // Filter out active telecaller profiles
  const telecallers = profiles.filter(
    (p) => p.user_role === "Telecaller" || p.user_role === "Manager"
  );

  const handleTransfer = (newCallerId: string) => {
    const selectedCaller = profiles.find(p => p.id === newCallerId);
    if (selectedCaller) {
      const currentLogs = lead.logs || [];
      const newLog = {
        id: `log_assign_${Date.now()}`,
        performed_by: activeRole,
        action: `Lead "${lead.customer_name}" transferred to ${selectedCaller.name}`,
        timestamp: new Date().toISOString()
      };
      onUpdateLead(lead.id, {
        assigned_to_caller_id: selectedCaller.id,
        assigned_to_name: selectedCaller.name,
        logs: [newLog, ...currentLogs]
      });
    }
  };

  const handleSaveRemarks = () => {
    const currentLogs = lead.logs || [];
    const newLog = {
      id: `log_remark_${Date.now()}`,
      performed_by: activeRole,
      action: `Updated remarks for "${lead.customer_name}": ${tempRemarks || "Cleared"}`,
      timestamp: new Date().toISOString()
    };
    onUpdateLead(lead.id, { 
      remarks: tempRemarks,
      logs: [newLog, ...currentLogs]
    });
    setIsEditingRemarks(false);
  };

  const handleSaveFollowup = () => {
    const currentLogs = lead.logs || [];
    const newLog = {
      id: `log_followup_${Date.now()}`,
      performed_by: activeRole,
      action: `Updated next follow-up date for "${lead.customer_name}": ${tempFollowup || "Cleared"}`,
      timestamp: new Date().toISOString()
    };
    onUpdateLead(lead.id, { 
      next_followup_date: tempFollowup || undefined,
      logs: [newLog, ...currentLogs]
    });
    setIsEditingFollowup(false);
  };

  const handleStatusChange = (newStatus: CRMLead["lead_status"]) => {
    const currentLogs = lead.logs || [];
    const newLog = {
      id: `log_status_${Date.now()}`,
      performed_by: activeRole,
      action: `Status of "${lead.customer_name}" updated to ${newStatus}`,
      timestamp: new Date().toISOString()
    };
    onUpdateLead(lead.id, { 
      lead_status: newStatus,
      logs: [newLog, ...currentLogs]
    });
  };

  // Status Badge Themes matching dark slate look and colors
  const statusThemes = {
    'New': 'bg-purple-950/50 text-purple-400 border-purple-800/50',
    'Contacted': 'bg-blue-950/50 text-blue-400 border-blue-800/50',
    'Quotation_Sent': 'bg-amber-950/50 text-amber-400 border-amber-800/50',
    'Lost': 'bg-rose-950/50 text-rose-400 border-rose-800/50',
    'Won': 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50',
  };

  return (
    <div 
      id={`mobile-card-${lead.id}`}
      className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-4 transition-all duration-300 hover:border-slate-700/80 animate-fade-in relative overflow-hidden"
    >
      {/* Background radial soft light highlight */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none rounded-tr-2xl" />

      {/* 1. Compact Header layout */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        
        {/* Left Side: Client Name with dynamic status / overdue badge */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-sm font-black tracking-tight text-white truncate max-w-[150px] sm:max-w-[200px]">
              {lead.customer_name}
            </h4>
            {lead.project_id && (
              <span className="bg-slate-950 text-slate-100 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 select-all" title="Unique Project ID (Primary Key)">
                🔑 {lead.project_id}
              </span>
            )}
            
            {/* Dynamic Badge */}
            {isOverdue ? (
              <span className="bg-rose-950/60 border border-rose-800 text-rose-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse" />
                Overdue
              </span>
            ) : (
              <span className={`border text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${statusThemes[lead.lead_status] || 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                {lead.lead_status === 'Quotation_Sent' ? 'Quoted' : lead.lead_status}
              </span>
            )}
          </div>

          {/* Subtext info */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <span className="font-mono text-slate-300">{lead.phone_number}</span>
            {lead.source && (
              <>
                <span className="text-slate-700">•</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-black">
                  {lead.source.replace("_", " ")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Interaction row with Quick Launcher Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Quick WhatsApp deep-linked button */}
          <button
            type="button"
            onClick={handleWhatsAppLaunch}
            className="h-8 w-8 rounded-lg bg-emerald-950/80 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-900/60 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Launch WhatsApp with customized templates"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>

          {/* Direct call initiator */}
          <a
            href={`tel:${lead.phone_number}`}
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Initiate direct mobile phone dialer call"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>

          {/* Compact Transfer Select Dropdown */}
          <div className="relative">
            <select
              value={lead.assigned_to_caller_id || ""}
              onChange={(e) => handleTransfer(e.target.value)}
              className="h-8 pl-2 pr-6 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer max-w-[90px] truncate"
              title="Re-assign and transfer to telecaller"
            >
              <option value="" disabled className="text-slate-600 bg-slate-900">
                Unassigned
              </option>
              {telecallers.map((tc) => (
                <option key={tc.id} value={tc.id} className="bg-slate-900 text-white font-semibold">
                  {tc.name}
                </option>
              ))}
            </select>
            <UserPlus className="absolute right-1.5 top-2.5 h-3 w-3 text-slate-500 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* 2. Horizontal Parameter Pills layout - only if metadata exists */}
      {(lead.project_interest || lead.budget_tier) && (
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {lead.project_interest && (
            <span className="bg-slate-950 border border-slate-800/80 text-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs max-w-xs truncate">
              <span className="h-1 w-1 bg-indigo-400 rounded-full shrink-0" />
              <span className="text-slate-500 font-black text-[8px] uppercase tracking-wider shrink-0">Interest:</span>
              <span className="truncate">{lead.project_interest}</span>
            </span>
          )}

          {lead.budget_tier && (
            <span className="bg-slate-950 border border-slate-800/80 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              💰 {lead.budget_tier}
            </span>
          )}
        </div>
      )}

      {/* 3. Collapsible Metadata, remarks and Next Follow-up scheduler */}
      <div className="border-t border-slate-800/60 pt-3 space-y-3.5">
        
        {/* Toggle Panel & Owner Header */}
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>Hide Notes & Pipeline</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>View Notes & Pipeline</span>
              </>
            )}
          </button>

          {lead.assigned_to_name && (
            <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
              <span className="h-1 w-1 bg-emerald-400 rounded-full shrink-0" />
              Agent: <span className="text-white">{lead.assigned_to_name}</span>
            </span>
          )}
        </div>

        {/* Collapsible area with inline input blocks replacing messy redirect flows */}
        {isExpanded && (
          <div className="space-y-4 animate-fade-in pl-2.5 border-l border-slate-800">
            
            {/* Inline Operational Matrix (Pipeline State Dropdown & Follow Up Date) */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* Next Follow-up Picker */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">
                  Next Follow Up
                </label>
                
                {isEditingFollowup ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={tempFollowup}
                      onChange={(e) => setTempFollowup(e.target.value)}
                      className="flex-1 h-8 bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 focus:outline-none focus:border-indigo-500 text-white font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveFollowup();
                        if (e.key === "Escape") {
                          setTempFollowup(lead.next_followup_date || "");
                          setIsEditingFollowup(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveFollowup}
                      className="h-8 w-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempFollowup(lead.next_followup_date || "");
                        setIsEditingFollowup(false);
                      }}
                      className="h-8 w-8 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="group/followup">
                    {lead.next_followup_date ? (
                      <div className="flex items-center justify-between gap-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                        <span className={`font-mono text-[10px] font-bold ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                          {lead.next_followup_date}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTempFollowup(lead.next_followup_date || "");
                            setIsEditingFollowup(true);
                          }}
                          className="text-slate-500 hover:text-emerald-400 transition-colors p-0.5 shrink-0"
                        >
                          <Clock className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingFollowup(true)}
                        className="w-full text-left border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 rounded-lg py-1.5 px-2.5 text-slate-500 hover:text-slate-300 font-bold text-[10px] transition-all cursor-pointer"
                      >
                        Click to Schedule
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Lead Operational Lifecycle Status Dropdown (Fixed Interface Mapping) */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-wider text-slate-500 block">Lead Pipeline State</label>
                <select 
                  value={lead.lead_status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="w-full h-8 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 px-2 rounded-lg font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Quotation_Sent">Quotation Sent</option>
                  <option value="Lost">Lost</option>
                  <option value="Won">Won</option>
                </select>
              </div>

            </div>

            {/* Inline Call Remarks Box */}
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1">
                <FileText className="h-3 w-3 text-slate-400" />
                Latest Call Discussion Notes
              </label>

              {isEditingRemarks ? (
                <div className="space-y-1.5">
                  <textarea
                    value={tempRemarks}
                    onChange={(e) => setTempRemarks(e.target.value)}
                    placeholder="Type call minutes, discussion outcomes..."
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-lg focus:outline-none focus:border-indigo-500 resize-none h-16 font-medium"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTempRemarks(lead.remarks || "");
                        setIsEditingRemarks(false);
                      }}
                      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRemarks}
                      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 rounded hover:bg-emerald-300 transition-colors cursor-pointer"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group/remarks">
                  {lead.remarks ? (
                    <div 
                      onClick={() => {
                        setTempRemarks(lead.remarks || "");
                        setIsEditingRemarks(true);
                      }}
                      className="text-xs text-slate-300 font-medium leading-relaxed break-words cursor-pointer min-h-[1.5rem] hover:text-white transition-colors"
                      title="Click to update inline"
                    >
                      "{lead.remarks}"
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingRemarks(true)}
                      className="w-full text-left border border-dashed border-slate-800/80 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 rounded-lg py-2 px-3 text-slate-500 hover:text-slate-300 font-bold text-[10px] transition-all cursor-pointer"
                    >
                      No Remarks Recorded — Click to Add Instantly
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Created Timestamp footer inside card */}
            <div className="text-[9px] text-slate-600 font-semibold pt-1">
              Received: {new Date(lead.created_at).toLocaleDateString()} at {new Date(lead.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
