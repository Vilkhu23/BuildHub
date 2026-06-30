import React, { useState, useEffect } from "react";
import { CompanySettings, TenantProfile } from "../types";
import { auth, db as firestoreDb } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import TenantSettingsView from "./TenantSettingsView";

interface SettingsViewProps {
  userRole: "Owner" | "Manager" | "Supervisor" | "Telecaller";
  user: any;
  onAddLog: (log: string) => void;
  onResetDatabase?: () => Promise<void>;
  tenantProfile: TenantProfile;
  onOpenUpgradeModal: () => void;
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

export default function SettingsView({ userRole, user, onAddLog, onResetDatabase, tenantProfile, onOpenUpgradeModal }: SettingsViewProps) {
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

  const handleTenantSave = async (updated: {
    company_name: string;
    business_logo_url: string;
    gstin: string;
    address: string;
    phone_number: string;
    email: string;
  }) => {
    if (isReadOnly) {
      showToast("Unauthorized: Only the Owner is permitted to update company settings.", "error");
      return;
    }

    setSaving(true);
    onAddLog("Initiating save for official company parameters...");

    const updatedSettings: CompanySettings = {
      companyName: updated.company_name,
      gstin: updated.gstin,
      phone: updated.phone_number,
      email: updated.email,
      address: updated.address,
      logoUrl: updated.business_logo_url
    };

    setSettings(updatedSettings);

    if (user) {
      try {
        // Write settings to /companies/{companyId}/settings subcollection
        const docRef = doc(firestoreDb, "companies", companyId, "settings", "config");
        await setDoc(docRef, updatedSettings);

        // Also update the parent company document fields to stay synced with Schema Page 10
        const companyDocRef = doc(firestoreDb, "companies", companyId);
        await setDoc(companyDocRef, {
          name: updated.company_name,
          gstin: updated.gstin,
          phone: updated.phone_number,
          logo_url: updated.business_logo_url,
          settings: updatedSettings // Nest as requested by Page 10
        }, { merge: true });

        // Also update the tenant_profiles subcollection to stay synced with multi-tenant SaaS requirements
        const tenantProfileRef = doc(firestoreDb, "companies", companyId, "tenant_profiles", "tp-default");
        await setDoc(tenantProfileRef, {
          id: "tp-default",
          tenant_id: companyId,
          company_name: updated.company_name,
          business_logo_url: updated.business_logo_url,
          gstin: updated.gstin,
          address: updated.address,
          phone_number: updated.phone_number,
          email: updated.email
        });

        // Save local backup as well
        localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(updatedSettings));

        showToast("Company settings updated successfully in Firestore!");
        onAddLog("Successfully synced company settings to Firestore.");
      } catch (err: any) {
        console.error("Error saving settings to Firestore:", err);
        showToast("Failed to save settings to Cloud. Saved to local storage fallback instead.", "error");
        localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(updatedSettings));
        handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/settings/config`);
      } finally {
        setSaving(false);
      }
    } else {
      // Guest mode storage
      localStorage.setItem(`buildhub_settings_${companyId}`, JSON.stringify(updatedSettings));
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

      {/* SaaS Subscription Billing status section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500">subscriptions</span>
              SaaS Billing Plan & Subscription Status
            </h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Manage your BuildEstimate BOS subscription tiers and white-label permissions.
            </p>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">arrow_upward</span>
            <span>View Plans / Upgrade</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Plan</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide ${
              (tenantProfile?.subscription_plan || "Free Trial") === "Free Trial"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : (tenantProfile?.subscription_plan || "Free Trial") === "Pro Growth"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-indigo-50 text-indigo-800 border border-indigo-200"
            }`}>
              {tenantProfile?.subscription_plan || "Free Trial"}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Project Limit</span>
            <span className="text-xs font-bold text-slate-800">
              {(tenantProfile?.subscription_plan || "Free Trial") === "Free Trial" ? "Maximum 3 active projects" : "Unlimited active projects"}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">White-Label Status</span>
            <span className="text-xs font-bold text-slate-800">
              {(tenantProfile?.subscription_plan || "Free Trial") === "Free Trial" ? "Watermark enabled (Trial Mode)" : "Active (White-Label Clean)"}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic White-Label Brand Settings */}
      <TenantSettingsView
        tenantProfile={{
          id: "tp-default",
          tenant_id: companyId,
          company_name: settings.companyName,
          business_logo_url: settings.logoUrl,
          gstin: settings.gstin,
          address: settings.address,
          phone_number: settings.phone,
          email: settings.email
        }}
        isReadOnly={isReadOnly}
        onSave={handleTenantSave}
        saving={saving}
      />

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
