import React, { useState, useEffect } from "react";
import { CompanySettings } from "../types";
import { auth, db as firestoreDb } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface SettingsViewProps {
  userRole: "Owner" | "Manager" | "Supervisor" | "Telecaller";
  user: any;
  onAddLog: (log: string) => void;
  onResetDatabase?: () => Promise<void>;
}

enum OperationType {
  GET = "get",
  WRITE = "write"
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
  };
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
        email: provider.email
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error in SettingsView: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function SettingsView({ userRole, user, onAddLog, onResetDatabase }: SettingsViewProps) {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: "",
    gstin: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const companyId = user ? user.uid : "local-company";
  const isReadOnly = userRole !== "Owner";

  // Show premium auto-expiring toast message
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load settings from Firestore or LocalStorage
  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      setLoading(true);
      if (user) {
        try {
          // Attempt loading from subcollection general settings config
          const docRef = doc(firestoreDb, "companies", companyId, "settings", "config");
          const docSnap = await getDoc(docRef);

          if (active) {
            if (docSnap.exists()) {
              setSettings(docSnap.data() as CompanySettings);
            } else {
              // Fallback: check if stored directly at the company root document
              const companyDocRef = doc(firestoreDb, "companies", companyId);
              const companyDocSnap = await getDoc(companyDocRef);
              if (companyDocSnap.exists()) {
                const data = companyDocSnap.data();
                setSettings({
                  companyName: data.companyName || data.name || "",
                  gstin: data.gstin || "",
                  phone: data.phone || "",
                  email: data.email || "",
                  address: data.address || "",
                  logoUrl: data.logoUrl || data.logo_url || ""
                });
              } else {
                // Return seed defaults if no cloud entry exists
                setSettings({
                  companyName: "BuildEstimate Inc.",
                  gstin: "27AAACB1234C1Z0",
                  phone: "+91 98765 43210",
                  email: "operations@buildestimate.in",
                  address: "4th Floor, Innovation Hub, Sector 62, Noida, UP - 201301",
                  logoUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop"
                });
              }
            }
          }
        } catch (err) {
          console.error("Failed to load settings from Firestore, using fallback", err);
          if (active) {
            // Local fallback values if cloud retrieval fails (e.g. initial dev setup, network issues)
            const localSaved = localStorage.getItem(`buildhub_settings_${companyId}`);
            if (localSaved) {
              setSettings(JSON.parse(localSaved));
            } else {
              setSettings({
                companyName: "BuildEstimate Inc.",
                gstin: "27AAACB1234C1Z0",
                phone: "+91 98765 43210",
                email: "operations@buildestimate.in",
                address: "4th Floor, Innovation Hub, Sector 62, Noida, UP - 201301",
                logoUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop"
              });
            }
          }
        } finally {
          if (active) setLoading(false);
        }
      } else {
        // Guest / local sandboxed mode
        const localSaved = localStorage.getItem(`buildhub_settings_${companyId}`);
        if (localSaved) {
          setSettings(JSON.parse(localSaved));
        } else {
          setSettings({
            companyName: "BuildEstimate Inc. (Guest Mode)",
            gstin: "27AAACB1234C1Z0",
            phone: "+91 98765 43210",
            email: "operations@buildestimate.in",
            address: "4th Floor, Innovation Hub, Sector 62, Noida, UP - 201301",
            logoUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop"
          });
        }
        setLoading(false);
      }
    }

    fetchSettings();
    return () => {
      active = false;
    };
  }, [user, companyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showToast("Unauthorized: Only the Owner is permitted to update company settings.", "error");
      return;
    }

    setSaving(true);
    onAddLog("Initiating save for official company parameters...");

    if (user) {
      try {
        // Write settings to /companies/{companyId}/settings subcollection
        const docRef = doc(firestoreDb, "companies", companyId, "settings", "config");
        await setDoc(docRef, settings);

        // Also update the parent company document fields to stay synced with Schema Page 10
        const companyDocRef = doc(firestoreDb, "companies", companyId);
        await setDoc(companyDocRef, {
          name: settings.companyName,
          gstin: settings.gstin,
          phone: settings.phone,
          logo_url: settings.logoUrl,
          settings: settings // Nest as requested by Page 10
        }, { merge: true });

        // Save local backup as well
        localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(settings));

        showToast("Company settings updated successfully in Firestore!");
        onAddLog("Successfully synced company settings to Firestore.");
      } catch (err: any) {
        console.error("Error saving settings to Firestore:", err);
        showToast("Failed to save settings to Cloud. Saved to local storage fallback instead.", "error");
        localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(settings));
        handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/settings/config`);
      } finally {
        setSaving(false);
      }
    } else {
      // Guest mode storage
      localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(settings));
      showToast("Settings updated locally (Guest Mode)!");
      onAddLog("Successfully updated local guest company settings.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-slate-100 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                <div className="h-10 bg-slate-50 rounded w-full"></div>
              </div>
            ))}
          </div>
          <div className="h-10 bg-slate-200 rounded w-32 mt-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div
          id="toast-notification"
          className={`fixed top-18 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-bounce transition-all ${
            toastType === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {toastType === "success" ? "check_circle" : "error"}
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Panel Header */}
      <div className="flex flex-col gap-1.5 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-9xl">settings</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl">
            <span className="material-symbols-outlined text-emerald-400">domain</span>
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Company Profile Settings</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Official ERP profile configurations used for invoicing, estimates, and PDF headers.
            </p>
          </div>
        </div>
        {isReadOnly && (
          <div className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-[11px] font-bold">
            <span className="material-symbols-outlined text-base">info</span>
            <span>You are viewing settings in Read-Only mode as a {userRole}. Only Owners can modify company details.</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">apartment</span>
                Company Name
              </label>
              <input
                id="settings-company-name"
                type="text"
                disabled={isReadOnly}
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                required
                placeholder="e.g. BuildEstimate Inc."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">receipt</span>
                GSTIN
              </label>
              <input
                id="settings-gstin"
                type="text"
                disabled={isReadOnly}
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                placeholder="e.g. 27AAACB1234C1Z0"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">call</span>
                Phone Number
              </label>
              <input
                id="settings-phone"
                type="text"
                disabled={isReadOnly}
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                disabled={isReadOnly}
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="e.g. info@buildestimate.in"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">image</span>
                Logo URL
              </label>
              <div className="flex gap-4 items-center">
                <input
                  id="settings-logo-url"
                  type="text"
                  disabled={isReadOnly}
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="e.g. https://images.unsplash.com/..."
                  className="flex-grow px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                />
                {settings.logoUrl && (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo Preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                Official Address
              </label>
              <textarea
                id="settings-address"
                disabled={isReadOnly}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                rows={3}
                placeholder="Enter complete office/headquarters address..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-colors resize-none"
              />
            </div>

          </div>
        </div>

        {/* Footer Area with save action */}
        {!isReadOnly && (
          <div className="bg-slate-50 border-t border-slate-100 p-4 md:p-6 flex justify-end">
            <button
              id="settings-save-btn"
              type="submit"
              disabled={saving}
              className="h-10 px-6 bg-slate-900 hover:bg-black text-white font-extrabold uppercase tracking-wider text-[11px] rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* DANGER ZONE - CLEAR DATABASE TO BLANK SLATE */}
      <div id="danger-zone-container" className="mt-8 bg-rose-50 border border-rose-100 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-sm font-extrabold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-600 text-lg">warning</span>
              Danger Zone: Purge Database
            </h3>
            <p className="text-xs text-rose-700 font-semibold leading-relaxed">
              Permanently wipe all projects, clients, material stocks, properties, transactions, and site logs. This will reset your database to a completely blank slate.
            </p>
            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
              * Note: Active roles and user profiles will be retained so you can still log in and switch roles. This action is irreversible.
            </p>
          </div>
          <div className="flex-shrink-0">
            {!confirmingPurge ? (
              <button
                id="settings-reset-db-btn"
                type="button"
                disabled={isReadOnly || purging}
                onClick={() => setConfirmingPurge(true)}
                className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-wider text-[11px] rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete_forever</span>
                <span>Reset to Blank DB</span>
              </button>
            ) : (
              <div className="bg-white p-3 border border-rose-200 rounded-xl shadow-md space-y-3 max-w-xs">
                <p className="text-[10px] text-slate-800 font-bold leading-normal">
                  ⚠️ Are you absolutely sure? All construction logs and estimates will be lost forever.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    id="confirm-purge-btn"
                    type="button"
                    disabled={purging}
                    onClick={async () => {
                      setPurging(true);
                      try {
                        if (onResetDatabase) {
                          await onResetDatabase();
                          showToast("Database successfully cleared to a blank state!", "success");
                          onAddLog("Database purged by owner request.");
                        } else {
                          showToast("Database reset is not supported in this environment.", "error");
                        }
                      } catch (err: any) {
                        showToast("Purge failed: " + (err.message || err), "error");
                      } finally {
                        setPurging(false);
                        setConfirmingPurge(false);
                      }
                    }}
                    className="flex-1 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg text-center transition-all disabled:opacity-50"
                  >
                    {purging ? "Purging..." : "Yes, Purge"}
                  </button>
                  <button
                    id="cancel-purge-btn"
                    type="button"
                    disabled={purging}
                    onClick={() => setConfirmingPurge(false)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider rounded-lg text-center transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
