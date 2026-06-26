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
}: NavigationProps) {
  // Get active role user avatar/profile
  const currentUser = profiles.find((p) => p.user_role === activeRole) || {
    name: "Rajesh Singh",
    user_role: "Owner",
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Owner":
        return "bg-black text-white";
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
  ];

  // Filter menu items by active role access (RBAC)
  const visibleItems = menuItems.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-900 font-bold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              construction
            </span>
            <div className="flex flex-col">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                BuildEstimate
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                BOS • Enterprise Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* RBAC Persona Switcher for Quick Preview */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
              <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1.5">
                Role Persona:
              </span>
              <select
                value={activeRole}
                onChange={(e) => {
                  const role = e.target.value as any;
                  setActiveRole(role);
                  // Dynamic redirect based on RBAC restrictions
                  if (role === "Telecaller") {
                    setCurrentTab("properties");
                  } else if (role === "Supervisor" && (currentTab === "estimates" || currentTab === "materials" || currentTab === "properties")) {
                    setCurrentTab("sitelog");
                  } else if (currentTab === "properties" && role === "Supervisor") {
                    setCurrentTab("sitelog");
                  }
                }}
                className="text-xs font-bold bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none cursor-pointer py-1 pl-1 pr-6"
              >
                <option value="Owner">👑 Owner (Rajesh Singh)</option>
                <option value="Manager">💼 Manager (Amit Kumar)</option>
                <option value="Supervisor">🚧 Supervisor (Rahul Khan)</option>
                <option value="Telecaller">📞 Telecaller (Priya Sharma)</option>
              </select>
            </div>

            {/* Profile / Auth Area */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-black text-slate-900 leading-none">{user.displayName || "Authorized User"}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{user.email}</p>
                </div>
                <div className="relative">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm flex items-center justify-center">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="profile" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500 text-lg">
                        person
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign out of Google"
                  className="h-8 px-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="h-9 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.714 5.714 0 018.27 12.8a5.714 5.714 0 015.72-5.714c1.554 0 2.97.604 4.04 1.583l3.056-3.057A9.957 9.957 0 0013.99 2 9.99 9.99 0 004 12a9.99 9.99 0 009.99 10c5.518 0 9.99-4.482 9.99-10 0-.672-.08-1.32-.23-1.957l-11.51.242z" />
                </svg>
                Google Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Tab bar (Dynamic Desktop/Mobile) */}
      <div className="w-full bg-white border-b border-slate-200 sticky top-14 z-40">
        <div className="mx-auto max-w-7xl px-4 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-6 h-12 items-center">
            {menuItems.map((item) => {
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
    </>
  );
}
