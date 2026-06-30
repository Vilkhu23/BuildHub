import React from "react";
import { Profile } from "../types";

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRole: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller';
  setActiveRole: (role: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller') => void;
  profiles: Profile[];
  user: any;
  onSignIn: () => void;
  onSignOut: () => void;
  filterNavigationLinks?: (
    role: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller',
    items: Array<{ id: string; label: string; icon: string; roles: string[] }>
  ) => Array<{ id: string; label: string; icon: string; roles: string[] }>;
}

export default function Navigation({
  currentTab,
  setCurrentTab,
  activeRole,
  setActiveRole,
  profiles,
  user,
  onSignIn,
  onSignOut,
  filterNavigationLinks,
}: NavigationProps) {
  // Get active role user avatar/profile
  const currentUser = profiles.find((p) => p.user_role === activeRole) || {
    name: "Rajesh Singh",
    user_role: "Owner",
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Owner":
        return "bg-slate-900 text-white";
      case "Manager":
        return "bg-blue-600 text-white";
      case "Supervisor":
        return "bg-amber-600 text-white";
      case "Telecaller":
        return "bg-emerald-600 text-white";
      default:
        return "bg-slate-200 text-slate-800";
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["Owner", "Manager", "Supervisor"] },
    { id: "estimates", label: "Estimates", icon: "calculate", roles: ["Owner", "Manager"] },
    { id: "materials", label: "Materials", icon: "inventory_2", roles: ["Owner", "Manager"] },
    { id: "orders", label: "Orders", icon: "receipt_long", roles: ["Owner", "Manager", "Supervisor"] },
    { id: "sitelog", label: "Site Log", icon: "mic", roles: ["Owner", "Supervisor", "Manager"] },
    { id: "properties", label: "Properties", icon: "domain", roles: ["Owner", "Telecaller", "Manager"] },
    { id: "leads", label: "CRM Leads", icon: "hub", roles: ["Owner", "Manager", "Telecaller"] },
    { id: "settings", label: "Settings", icon: "settings", roles: ["Owner", "Manager"] },
  ];

  // Filter menu items by active role access (RBAC) using helper if provided
  const visibleItems = filterNavigationLinks
    ? filterNavigationLinks(activeRole, menuItems)
    : menuItems.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          
          {/* PRIMARY PLATFORM IDENTITY PLUG */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 font-extrabold text-2xl hidden xs:inline" style={{ fontVariationSettings: "'FILL' 1" }}>
              construction
            </span>
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 leading-none">
                BuildEstimate
              </h1>
              <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5 block whitespace-nowrap">
                Karam AI | Innovation HUB
              </span>
            </div>
            {/* Version Token */}
            <span className="hidden lg:inline-block bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-slate-200/60 ml-2">
              v5.0 Stable
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* RBAC Persona Switcher for Quick Preview - Compact for Mobile */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/50">
              <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                Role:
              </span>
              <select
                value={activeRole}
                onChange={(e) => {
                  const role = e.target.value as any;
                  setActiveRole(role);
                  // Dynamic redirect based on RBAC restrictions
                  if (role === "Telecaller") {
                    setCurrentTab("properties");
                  } else if (role === "Supervisor" && (currentTab === "estimates" || currentTab === "materials" || currentTab === "properties" || currentTab === "settings")) {
                    setCurrentTab("sitelog");
                  } else if (currentTab === "properties" && role === "Supervisor") {
                    setCurrentTab("sitelog");
                  }
                }}
                className="text-[10px] md:text-xs font-bold bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none cursor-pointer py-0.5 pl-1 pr-6 text-slate-800"
              >
                <option value="Owner">👑 Owner</option>
                <option value="Manager">💼 Manager</option>
                <option value="Supervisor">🚧 Supervisor</option>
                <option value="Telecaller">📞 Telecaller</option>
              </select>
            </div>

            {/* Profile / Auth Area */}
            {user ? (
              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[100px]">{user.displayName || "User"}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate max-w-[100px]">{user.email}</p>
                </div>
                <div className="relative shrink-0">
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-xs flex items-center justify-center">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="profile" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500 text-base">
                        person
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500" />
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign out of Google"
                  className="h-8 w-8 sm:w-auto sm:px-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span className="sm:hidden material-symbols-outlined text-sm">logout</span>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="h-8 md:h-9 px-2 md:px-4 bg-slate-900 hover:bg-black text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.714 5.714 0 018.27 12.8a5.714 5.714 0 015.72-5.714c1.554 0 2.97.604 4.04 1.583l3.056-3.057A9.957 9.957 0 0013.99 2 9.99 9.99 0 004 12a9.99 9.99 0 009.99 10c5.518 0 9.99-4.482 9.99-10 0-.672-.08-1.32-.23-1.957l-11.51.242z" />
                </svg>
                <span className="hidden xs:inline">Google Log In</span>
                <span className="xs:hidden">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Tab bar (Visible on Tablet & Desktop) */}
      <div className="hidden md:block w-full bg-white border-b border-slate-200 sticky top-14 z-40">
        <div className="mx-auto max-w-7xl px-4 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-6 h-12 items-center">
            {visibleItems.map((item) => {
              const isAccessible = item.roles.includes(activeRole);
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isAccessible) setCurrentTab(item.id);
                  }}
                  disabled={!isAccessible}
                  className={`flex items-center gap-1.5 h-full px-1 border-b-2 text-xs font-bold uppercase tracking-wider transition-all relative ${
                    !isAccessible
                      ? "opacity-30 cursor-not-allowed border-transparent text-slate-400"
                      : isActive
                      ? "border-black text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <span className={`material-symbols-outlined text-base ${isActive ? "text-black" : "text-slate-400"}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {!isAccessible && (
                    <span className="material-symbols-outlined text-[10px] text-slate-400">
                      lock
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Premium Sticky Bottom Tab Bar for Mobile Devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 z-50 px-2 pb-safe pt-2 flex justify-around items-center shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur-lg">
        {visibleItems.map((item) => {
          const isAccessible = item.roles.includes(activeRole);
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              disabled={!isAccessible}
              onClick={() => {
                if (isAccessible) setCurrentTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                !isAccessible
                  ? "opacity-25 cursor-not-allowed text-slate-300"
                  : isActive
                  ? "text-emerald-600 scale-105"
                  : "text-slate-500 hover:text-slate-950 active:scale-95"
              }`}
            >
              <span className="material-symbols-outlined text-xl transition-transform" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wide mt-1">
                {item.label === "Site Log" ? "Log" : item.label === "Properties" ? "Realty" : item.label === "CRM Leads" ? "CRM" : item.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
