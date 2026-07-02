import React from "react";
import { 
  Users, 
  MapPin, 
  Wifi, 
  Database, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Plus,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Activity
} from "lucide-react";

// Strict Data Contracts for Team Analytics
export interface TelecallerStatus {
  id: string;
  name: string;
  isOnline: boolean;
  attendanceState: "In Office" | "Outside" | "Absent";
  assignedLeadsCount: number;
  completedTasksToday: number;
  pendingFollowupsCount: number;
}

export interface PipelineSummary {
  freshLeads: number;
  ongoingLeads: number;
  overdueFollowups: number;
  totalInDatabase: number;
}

interface DashboardProps {
  teamProfiles: TelecallerStatus[];
  pipeline: PipelineSummary;
  tenantName: string;
}

export const AttendanceMatrixDashboard: React.FC<DashboardProps> = ({ 
  teamProfiles = [], 
  pipeline = { freshLeads: 0, ongoingLeads: 0, overdueFollowups: 0, totalInDatabase: 0 }, 
  tenantName 
}) => {
  // Compute Live Aggregates from State Array
  const totalTeamSize = teamProfiles.length;
  const activeInOffice = teamProfiles.filter(p => p.attendanceState === "In Office").length;
  const activeOutside = teamProfiles.filter(p => p.attendanceState === "Outside").length;
  const activeOnline = teamProfiles.filter(p => p.isOnline).length;

  return (
    <div 
      id="attendance-matrix-operations-dashboard"
      className="bg-slate-950 border border-slate-800/95 rounded-2xl p-6 max-w-4xl w-full mx-auto space-y-6 text-white font-sans shadow-2xl relative overflow-hidden"
    >
      {/* Background ambient gradient highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Brand Header Meta */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-5 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white uppercase">
              {tenantName} Operations Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Karam AI Engine <span className="text-slate-600">•</span> Real-time Team Synchronization
          </p>
        </div>
        
        <div className="bg-emerald-950/40 border border-emerald-900/60 px-3.5 py-1.5 rounded-full shrink-0 flex items-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase flex items-center gap-1.5">
            Live System Sync
          </span>
        </div>
      </div>

      {/* METRIC MATRIX BLOCK 1: Attendance Core Strips */}
      <div className="space-y-3 relative z-10">
        <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1.5">
          <Users className="h-3 w-3 text-slate-500" />
          Today's Attendance Metrics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Team Size */}
          <div className="bg-slate-900/50 border border-slate-800/70 rounded-xl p-4 text-center space-y-1 hover:border-slate-700/60 transition-all group duration-300">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Team Size</span>
            <div className="text-2xl font-black text-indigo-400 group-hover:scale-105 transition-transform">
              {totalTeamSize}
            </div>
          </div>

          {/* Card 2: In Office */}
          <div className="bg-slate-900/50 border border-slate-800/70 rounded-xl p-4 text-center space-y-1 hover:border-slate-700/60 transition-all group duration-300">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">In Office</span>
            <div className="text-2xl font-black text-emerald-400 group-hover:scale-105 transition-transform">
              {activeInOffice}
            </div>
          </div>

          {/* Card 3: Outside Field */}
          <div className="bg-slate-900/50 border border-slate-800/70 rounded-xl p-4 text-center space-y-1 hover:border-slate-700/60 transition-all group duration-300">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Outside Field</span>
            <div className="text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">
              {activeOutside}
            </div>
          </div>

          {/* Card 4: Online App Chat */}
          <div className="bg-slate-900/50 border border-slate-800/70 rounded-xl p-4 text-center space-y-1 hover:border-slate-700/60 transition-all group duration-300">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Online App Chat</span>
            <div className="text-2xl font-black text-purple-400 group-hover:scale-105 transition-transform">
              {activeOnline}
            </div>
          </div>
        </div>
      </div>

      {/* METRIC MATRIX BLOCK 2: Live Pipeline Status Indicators */}
      <div className="space-y-3 relative z-10">
        <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1.5">
          <Database className="h-3 w-3 text-slate-500" />
          Operational Leads Pipeline
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Fresh Inquiries */}
          <div className="bg-slate-900/40 border border-l-4 border-l-purple-500 border-slate-800/90 rounded-xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-all">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block truncate">Fresh Inquiries</span>
              <span className="text-[9px] text-slate-500 font-bold block truncate">Meta & Web Hooks</span>
            </div>
            <div className="text-2xl font-black text-white shrink-0">
              {pipeline.freshLeads}
            </div>
          </div>

          {/* Card 2: Ongoing Contact */}
          <div className="bg-slate-900/40 border border-l-4 border-l-blue-500 border-slate-800/90 rounded-xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-all">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block truncate">Ongoing Contact</span>
              <span className="text-[9px] text-slate-500 font-bold block truncate">Active Pipeline</span>
            </div>
            <div className="text-2xl font-black text-white shrink-0">
              {pipeline.ongoingLeads}
            </div>
          </div>

          {/* Card 3: Overdue Alerts */}
          <div className="bg-slate-900/40 border border-l-4 border-l-rose-500 border-slate-800/90 rounded-xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-all">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block truncate">Overdue Alerts</span>
              <span className="text-[9px] text-slate-500 font-bold block truncate">Missed Followups</span>
            </div>
            <div className={`text-2xl font-black text-rose-400 shrink-0 ${pipeline.overdueFollowups > 0 ? "animate-pulse" : ""}`}>
              {pipeline.overdueFollowups}
            </div>
          </div>

          {/* Card 4: Global Registry */}
          <div className="bg-slate-900/40 border border-l-4 border-l-slate-400 border-slate-800/90 rounded-xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-all">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block truncate">Global Registry</span>
              <span className="text-[9px] text-slate-500 font-bold block truncate">All Records</span>
            </div>
            <div className="text-2xl font-black text-slate-400 shrink-0">
              {pipeline.totalInDatabase}
            </div>
          </div>
        </div>
      </div>

      {/* METRIC MATRIX BLOCK 3: Team Roster Performance & State */}
      <div className="space-y-3 pt-2 relative z-10">
        <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-slate-500" />
          Telecaller Allocation & Load Distribution
        </h3>
        
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/20 backdrop-blur-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 font-black uppercase tracking-wider border-b border-slate-800 text-[9px]">
                  <th className="p-3.5 pl-4">Staff Identity</th>
                  <th className="p-3.5 text-center">App State</th>
                  <th className="p-3.5 text-center">Attendance</th>
                  <th className="p-3.5 text-center">Total Pool Load</th>
                  <th className="p-3.5 text-center">Completed Today</th>
                  <th className="p-3.5 text-center text-rose-400">Pending Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-medium text-slate-300">
                {teamProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold italic">
                      No active telecallers registered. Add profiles in settings to begin allocation.
                    </td>
                  </tr>
                ) : (
                  teamProfiles.map((caller) => (
                    <tr 
                      key={caller.id} 
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      <td className="p-3.5 pl-4 font-black text-white text-xs flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[10px] text-slate-300 uppercase">
                          {caller.name.charAt(0)}
                        </div>
                        <span className="group-hover:text-indigo-400 transition-colors">{caller.name}</span>
                      </td>
                      
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center justify-center">
                          <span 
                            className={`h-2.5 w-2.5 rounded-full ${
                              caller.isOnline 
                                ? "bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" 
                                : "bg-slate-600"
                            }`} 
                            title={caller.isOnline ? "Online Now" : "Offline"}
                          />
                        </div>
                      </td>
                      
                      <td className="p-3.5 text-center">
                        <span className={`text-[9px] px-2.5 py-1 rounded-md font-black uppercase tracking-wider border ${
                          caller.attendanceState === "In Office" 
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60" 
                            : caller.attendanceState === "Outside" 
                              ? "bg-amber-950/40 text-amber-400 border-amber-900/60" 
                              : "bg-rose-950/40 text-rose-400 border-rose-900/60"
                        }`}>
                          {caller.attendanceState}
                        </span>
                      </td>
                      
                      <td className="p-3.5 text-center font-bold text-indigo-400">
                        {caller.assignedLeadsCount} Leads
                      </td>
                      
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {caller.completedTasksToday} Done
                      </td>
                      
                      <td className="p-3.5 text-center font-black text-rose-400 bg-rose-950/5">
                        <div className="flex items-center justify-center gap-1">
                          {caller.pendingFollowupsCount > 0 && <Clock className="h-3 w-3 text-rose-400 animate-pulse" />}
                          <span>{caller.pendingFollowupsCount} Overdue</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
