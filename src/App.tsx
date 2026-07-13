import React, { useState, useEffect } from "react";
import { DatabaseState, Profile, DailyPayment, PurchaseOrder, MaterialStock, Project, InboundRevenue, OfficeExpense, DealAdjustment, Property, BuyerRequirement, Client, Lead, TenantProfile, CRMLead } from "./types";

// Import modular screens
import Navigation from "./components/Navigation";
import DashboardView from "./components/DashboardView";
import EstimatesView from "./components/EstimatesView";
import MaterialsView from "./components/MaterialsView";
import OrdersView from "./components/OrdersView";
import DailyLogView from "./components/DailyLogView";
import PropertyView from "./components/PropertyView";
import SettingsView from "./components/SettingsView";
import ClientEstimatePortal from "./components/ClientEstimatePortal";
import SubscriptionGate from "./components/SubscriptionGate";
import LeadsView from "./components/LeadsView";
import CRMLeadHub from "./components/CRMLeadHub";
import OnboardingWizard from "./components/OnboardingWizard";
import WhatsAppTemplateEditor from "./components/WhatsAppTemplateEditor";
import { triggerWhatsAppNotifications } from "./lib/whatsappLeadTrigger";
import { allocateLead, CRMLeadEngine } from "./lib/CRMLeadEngine";

// Import Firebase Client Integration
import { auth, googleProvider, db as firestoreDb } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";

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

// Recursive helper to sanitize objects for Firestore (removes undefined values)
function sanitizeFirestoreData(obj: any): any {
  if (obj === undefined || obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData);
  }
  if (typeof obj === "object") {
    const clean: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          clean[key] = sanitizeFirestoreData(val);
        }
      }
    }
    return clean;
  }
  return obj;
}

// Helper function to filter navigation links based on 'activeRole' state
export function filterNavigationLinks(
  role: 'Owner' | 'Manager' | 'Supervisor' | 'Telecaller',
  items: Array<{ id: string; label: string; icon: string; roles: string[] }>
) {
  return items.filter((item) => item.roles.includes(role));
}

// Helper function to dynamically synchronize leads with status 'Won' into CRM client profiles
export function ensureWonLeadsAreClients(dbState: DatabaseState, userId?: string): DatabaseState {
  if (!dbState) return dbState;
  const crmLeads: CRMLead[] = dbState.crm_leads || [];
  const existingClients = dbState.clients || [];
  const updatedClients = [...existingClients];
  let updated = false;

  crmLeads.forEach(lead => {
    if (lead.lead_status === "Won") {
      const exists = updatedClients.some(c => 
        (c.phone && c.phone.replace(/[^0-9]/g, "") === lead.phone_number.replace(/[^0-9]/g, "")) ||
        c.name.toLowerCase() === lead.customer_name.toLowerCase()
      );
      if (!exists) {
        const newClient: Client = {
          id: "cl-won-" + lead.id,
          name: lead.customer_name,
          phone: lead.phone_number,
          tags: ["Buyer"],
          project_location: lead.project_interest || undefined,
          tenant_id: userId || "owner-1"
        };
        updatedClients.push(newClient);
        updated = true;
      }
    }
  });

  if (updated) {
    return {
      ...dbState,
      clients: updatedClients
    };
  }
  return dbState;
}

// Helper to ensure every lead and project has a unique project_id reference as a primary key
export function ensureLeadsHaveProjectIds(dbState: DatabaseState): DatabaseState {
  if (!dbState) return dbState;
  let updated = false;

  const leads = dbState.leads || [];
  const updatedLeads = leads.map((lead, index) => {
    if (!lead.project_id) {
      updated = true;
      return {
        ...lead,
        project_id: `BOS-PRJ-${1000 + index + 1}`
      };
    }
    return lead;
  });

  const crmLeads = dbState.crm_leads || [];
  const updatedCrmLeads = crmLeads.map((lead, index) => {
    if (!lead.project_id) {
      updated = true;
      return {
        ...lead,
        project_id: `BOS-PRJ-${2000 + index + 1}`
      };
    }
    return lead;
  });

  const projects = dbState.projects || [];
  const updatedProjects = projects.map((project, index) => {
    if (!project.project_id) {
      updated = true;
      return {
        ...project,
        project_id: `BOS-PRJ-${3000 + index + 1}`
      };
    }
    return project;
  });

  if (updated) {
    return {
      ...dbState,
      leads: updatedLeads,
      crm_leads: updatedCrmLeads,
      projects: updatedProjects
    };
  }
  return dbState;
}

export default function App() {
  const [db, setDbStateOnly] = useState<DatabaseState | null>(null);
  
  const setDb = (value: DatabaseState | null | ((prev: DatabaseState | null) => DatabaseState | null)) => {
    if (typeof value === "function") {
      setDbStateOnly((prev) => {
        const next = value(prev);
        if (!next) return null;
        const withIds = ensureLeadsHaveProjectIds(next);
        return ensureWonLeadsAreClients(withIds, user?.uid || "owner-1");
      });
    } else {
      if (!value) {
        setDbStateOnly(null);
      } else {
        const withIds = ensureLeadsHaveProjectIds(value);
        setDbStateOnly(ensureWonLeadsAreClients(withIds, user?.uid || "owner-1"));
      }
    }
  };
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [activeRole, setActiveRole] = useState<'Owner' | 'Manager' | 'Supervisor' | 'Telecaller'>("Owner");
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Client Shared Snapshot state
  const [sharedEstimate, setSharedEstimate] = useState<any>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedProjectIdForEstimates, setSelectedProjectIdForEstimates] = useState<string>("");
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
  const [activeMockTenant, setActiveMockTenant] = useState<TenantProfile | null>(null);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [activeLeadSubTab, setActiveLeadSubTab] = useState<'hub' | 'kanban' | 'whatsapp'>("hub");

  const addActivityLog = (message: string) => {
    setActivityLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Check URL parameters for a public estimate snapshot link on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get("share");
    if (shareId) {
      const fetchSharedEstimate = async () => {
        setSharedLoading(true);
        try {
          addActivityLog(`Retrieving public estimate snapshot [${shareId}] from Firestore...`);
          const docRef = doc(firestoreDb, "public_estimates", shareId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSharedEstimate(docSnap.data());
            addActivityLog(`Successfully resolved public estimate: ${shareId}`);
          } else {
            setSharedError("This shared estimate snapshot is invalid, does not exist, or has been revoked.");
            addActivityLog(`Public estimate snapshot [${shareId}] not found.`);
          }
        } catch (err: any) {
          console.error("Error fetching public snapshot:", err);
          setSharedError(`Unable to fetch public snapshot: ${err.message || err}`);
          addActivityLog(`Error reading snapshot [${shareId}]: ${err.message || err}`);
        } finally {
          setSharedLoading(false);
        }
      };
      fetchSharedEstimate();
    }
  }, []);

  // Automatically trigger onboarding wizard for new tenants with unconfigured profiles
  useEffect(() => {
    if (db && db.tenant_profiles) {
      const activeTP = db.tenant_profiles.find(tp => tp.tenant_id === (user?.uid || "owner-1")) || db.tenant_profiles[0];
      const uidKey = user?.uid || "owner-1";
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${uidKey}`);
      
      if (activeTP && activeTP.company_name === "BuildEstimate Inc." && !hasCompletedOnboarding) {
        setIsOnboardingWizardOpen(true);
      }
    }
  }, [db, user]);

  // Save document to specified company subcollection
  const saveDocument = async (subcollection: string, id: string, data: any) => {
    if (!auth.currentUser) return;
    try {
      const currentTenantId = auth.currentUser.uid;
      const dataWithTenant = {
        ...data,
        tenant_id: currentTenantId
      };
      const docRef = doc(firestoreDb, "companies", currentTenantId, subcollection, id);
      await setDoc(docRef, sanitizeFirestoreData(dataWithTenant));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${auth.currentUser.uid}/${subcollection}/${id}`);
    }
  };

  // Monitor Firebase Auth State & load Firestore database accordingly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        addActivityLog(`Welcome, ${currentUser.displayName || "User"}! Syncing secure cloud database...`);
        setLoading(true);
        try {
          const companyId = currentUser.uid;
          
          // Let's load the profiles subcollection to see if this company is already seeded in Firestore
          const profilesRef = collection(firestoreDb, "companies", companyId, "profiles");
          const profilesSnap = await getDocs(profilesRef);
          
          let loadedDb: Partial<DatabaseState> = {};
          
          if (!profilesSnap.empty) {
            // Company exists and is seeded. Fetch all subcollections in parallel.
            const collectionsToLoad = [
              { key: "profiles", path: "profiles" },
              { key: "clients", path: "clients" },
              { key: "projects", path: "projects" },
              { key: "properties", path: "properties" },
              { key: "buyer_requirements", path: "leads" },
              { key: "daily_payments", path: "daily_payments" },
              { key: "inbound_revenues", path: "inbound_revenues" },
              { key: "vendors", path: "vendors" },
              { key: "purchase_orders", path: "purchase_orders" },
              { key: "material_stocks", path: "material_stocks" },
              { key: "office_expenses", path: "office_expenses" },
              { key: "deal_adjustments", path: "deal_adjustments" },
              { key: "alerts", path: "alerts" },
              { key: "tenant_profiles", path: "tenant_profiles" },
              { key: "leads", path: "crm_leads" },
              { key: "crm_leads", path: "construction_inquiries" }
            ];

            const loadPromises = collectionsToLoad.map(async (col) => {
              const colRef = collection(firestoreDb, "companies", companyId, col.path);
              // Dynamic SaaS query placeholder for complete Tenant Isolation filter
              const q = query(colRef, where("tenant_id", "==", companyId));
              const snap = await getDocs(q);
              let docsData = snap.docs.map(doc => ({ id: doc.id, tenant_id: companyId, ...doc.data() }));
              
              // Fallback query if tenant_id is not indexed or empty on old rows
              if (docsData.length === 0 && col.key !== "tenant_profiles") {
                const fallbackSnap = await getDocs(colRef);
                docsData = fallbackSnap.docs.map(doc => ({ id: doc.id, tenant_id: companyId, ...doc.data() }));
              }
              return { key: col.key, data: docsData };
            });

            const results = await Promise.all(loadPromises);
            results.forEach(res => {
              (loadedDb as any)[res.key] = res.data;
            });

            // If tenant profiles is missing in old database states, create a default one
            if (!loadedDb.tenant_profiles || loadedDb.tenant_profiles.length === 0) {
              const fallbackProfile = {
                id: "tp-default",
                tenant_id: companyId,
                company_name: "BuildEstimate Inc.",
                business_logo_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop",
                gstin: "27AAACB1234C1Z0",
                address: "4th Floor, Innovation Hub, Sector 62, Noida, UP - 201301",
                phone_number: "+91 98765 43210"
              };
              loadedDb.tenant_profiles = [fallbackProfile];
              await setDoc(doc(firestoreDb, "companies", companyId, "tenant_profiles", "tp-default"), sanitizeFirestoreData(fallbackProfile));
            }
            setDb(loadedDb as DatabaseState);
            addActivityLog("Secure company cloud database loaded successfully from Firestore.");
          } else {
            // Not seeded yet! Seed from local database API.
            const res = await fetch("/api/db");
            const defaultData = await res.json() as DatabaseState;
            
            // Seed each subcollection in Firestore
            addActivityLog("Initializing and seeding your secure company subcollections in Firestore...");
            
            const seedPromises: Promise<void>[] = [];
            
            defaultData.profiles?.forEach(p => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "profiles", p.id), sanitizeFirestoreData({ ...p, tenant_id: companyId })));
            });
            defaultData.clients?.forEach(c => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "clients", c.id), sanitizeFirestoreData({ ...c, tenant_id: companyId })));
            });
            defaultData.projects?.forEach(p => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "projects", p.id), sanitizeFirestoreData({ ...p, tenant_id: companyId })));
            });
            defaultData.properties?.forEach(p => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "properties", p.id), sanitizeFirestoreData({ ...p, tenant_id: companyId })));
            });
            defaultData.buyer_requirements?.forEach(br => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "leads", br.id), sanitizeFirestoreData({ ...br, tenant_id: companyId })));
            });
            defaultData.daily_payments?.forEach(dp => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "daily_payments", dp.id), sanitizeFirestoreData({ ...dp, tenant_id: companyId })));
            });
            defaultData.inbound_revenues?.forEach(ir => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "inbound_revenues", ir.id), sanitizeFirestoreData({ ...ir, tenant_id: companyId })));
            });
            defaultData.vendors?.forEach(v => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "vendors", v.id), sanitizeFirestoreData({ ...v, tenant_id: companyId })));
            });
            defaultData.purchase_orders?.forEach(po => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "purchase_orders", po.id), sanitizeFirestoreData({ ...po, tenant_id: companyId })));
            });
            defaultData.material_stocks?.forEach(ms => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "material_stocks", ms.id), sanitizeFirestoreData({ ...ms, tenant_id: companyId })));
            });
            defaultData.office_expenses?.forEach(oe => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "office_expenses", oe.id), sanitizeFirestoreData({ ...oe, tenant_id: companyId })));
            });
            defaultData.deal_adjustments?.forEach(da => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "deal_adjustments", da.id), sanitizeFirestoreData({ ...da, tenant_id: companyId })));
            });
            defaultData.alerts?.forEach(al => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "alerts", al.id), sanitizeFirestoreData({ ...al, tenant_id: companyId })));
            });
            defaultData.tenant_profiles?.forEach(tp => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "tenant_profiles", tp.id), sanitizeFirestoreData({ ...tp, tenant_id: companyId })));
            });
            defaultData.leads?.forEach(lead => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "crm_leads", lead.id), sanitizeFirestoreData({ ...lead, tenant_id: companyId })));
            });

            await Promise.all(seedPromises);
            setDb(defaultData);
            addActivityLog("Company secure cloud database fully initialized and seeded.");
          }
        } catch (error: any) {
          console.error("Error loading secure database from Firestore:", error);
          addActivityLog("Firestore access error. Falling back to local sandboxed database.");
          const res = await fetch("/api/db");
          const defaultData = await res.json();
          setDb(defaultData);
        } finally {
          setLoading(false);
        }
      } else {
        addActivityLog("Using local sandboxed database. Sign in for secure cloud backup!");
        setLoading(true);
        fetch("/api/db")
          .then((res) => res.json())
          .then((data) => {
            setDb(data);
            setLoading(false);
            addActivityLog("Local guest database loaded successfully.");
          })
          .catch((err) => {
            console.error("Failed to fetch database.", err);
            setLoading(false);
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to sync modified state to backend or secure Firestore cloud
  const syncWithServer = (updatedDb: DatabaseState) => {
    const originalClientsCount = updatedDb.clients?.length || 0;
    const withIds = ensureLeadsHaveProjectIds(updatedDb);
    const migratedDb = ensureWonLeadsAreClients(withIds, user?.uid || "owner-1");
    const newClientsCount = migratedDb.clients?.length || 0;

    setDbStateOnly(migratedDb);

    if (user && newClientsCount > originalClientsCount) {
      const originalIds = new Set(updatedDb.clients?.map(c => c.id) || []);
      migratedDb.clients.forEach(async (c) => {
        if (!originalIds.has(c.id)) {
          await saveDocument("clients", c.id, c);
          addActivityLog(`CRM Lead Hub: Auto-converted client profile saved for "${c.name}".`);
        }
      });
    }

    if (!user) {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(migratedDb),
      })
        .then((res) => res.json())
        .then(() => {
          addActivityLog("Local database synced successfully.");
        })
        .catch((err) => console.error("Error syncing with local database", err));
    }
  };

  const handleSignIn = async () => {
    try {
      addActivityLog("Initiating secure Google Sign-In...");
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      addActivityLog(`Sign-in failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleSignOut = async () => {
    try {
      addActivityLog("Signing out from session...");
      await signOut(auth);
      addActivityLog("Successfully signed out of Google session.");
    } catch (err: any) {
      console.error("Sign-out failed:", err);
      addActivityLog("Failed to sign out properly.");
    }
  };

  // Handler for Daily site voice/text logs addition
  const handleAddPayment = async (payment: DailyPayment) => {
    if (!db) return;
    const updatedPayments = [payment, ...db.daily_payments];
    const updatedProjects = db.projects.map((p) => {
      if (p.id === payment.project_id) {
        return { ...p, spent: p.spent + payment.amount };
      }
      return p;
    });
    const updatedDb = { ...db, daily_payments: updatedPayments, projects: updatedProjects };
    syncWithServer(updatedDb);

    if (user) {
      addActivityLog("Saving payment log and updating project budget in Firestore...");
      await saveDocument("daily_payments", payment.id, payment);
      const updatedProj = updatedProjects.find(p => p.id === payment.project_id);
      if (updatedProj) {
        await saveDocument("projects", updatedProj.id, updatedProj);
      }
    }
  };

  // CRM & Lead Automation pipeline handlers
  const handleAddLead = async (leadData: Omit<Lead, "id" | "created_at" | "tenant_id">) => {
    if (!db) return;
    const newLead: Lead = {
      ...leadData,
      id: "ld-" + ((db.leads || []).length + 1) + "-" + Math.floor(Math.random() * 1000),
      tenant_id: user?.uid || "owner-1",
      created_at: new Date().toISOString()
    };
    const updatedDb = {
      ...db,
      leads: [...(db.leads || []), newLead]
    };
    syncWithServer(updatedDb);
    addActivityLog(`CRM: Added new prospect "${newLead.client_name}" successfully.`);

    if (user) {
      await saveDocument("crm_leads", newLead.id, newLead);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: 'New' | 'Quoted' | 'Follow-up') => {
    if (!db) return;
    const updatedLeads = (db.leads || []).map(l => 
      l.id === leadId ? { ...l, status: newStatus } : l
    );
    const updatedDb = {
      ...db,
      leads: updatedLeads
    };
    syncWithServer(updatedDb);
    addActivityLog(`CRM: Updated lead status to "${newStatus}".`);

    if (user) {
      const activeLead = updatedLeads.find(l => l.id === leadId);
      if (activeLead) {
        await saveDocument("crm_leads", leadId, activeLead);
      }
    }
  };

  const handleConvertLeadToEstimate = async (lead: Lead) => {
    if (!db) return;

    addActivityLog(`CRM: Initiating estimate conversion for lead "${lead.client_name}"...`);

    // 1. Create a new Client
    const newClientId = "cl-" + (db.clients.length + 1) + "-" + Math.floor(Math.random() * 1000);
    const newClient: Client = {
      id: newClientId,
      name: lead.client_name,
      phone: lead.phone_number,
      tags: ["Buyer"],
      project_location: lead.location,
      tenant_id: user?.uid || "owner-1"
    };

    // 2. Create a blank clean Project estimate (status: 'Quotation')
    const newProjectId = "pr-" + (db.projects.length + 1) + "-" + Math.floor(Math.random() * 1000);
    const newProject: Project = {
      id: newProjectId,
      project_name: `Estimate for ${lead.client_name}`,
      status: "Quotation",
      client_id: newClientId,
      location: lead.location,
      type: "Residential",
      completion_pct: 0,
      total_budget: 0,
      spent: 0,
      tenant_id: user?.uid || "owner-1",
      estimates: {
        civil: [],
        electrical: [],
        finishes: [],
        interior_finishing: []
      },
      gst_rate: 18
    };

    // 3. Update the lead status to 'Quoted'
    const updatedLeads = (db.leads || []).map(l => 
      l.id === lead.id ? { ...l, status: "Quoted" as const } : l
    );

    const updatedDb: DatabaseState = {
      ...db,
      clients: [...db.clients, newClient],
      projects: [...db.projects, newProject],
      leads: updatedLeads
    };

    syncWithServer(updatedDb);

    if (user) {
      await saveDocument("clients", newClient.id, newClient);
      await saveDocument("projects", newProject.id, newProject);
      await saveDocument("crm_leads", lead.id, { ...lead, status: "Quoted" });
    }

    addActivityLog(`CRM: Lead converted. Client profile and blank Estimate created successfully.`);

    // 4. Set state to select this new project in the Estimates tab
    setSelectedProjectIdForEstimates(newProjectId);

    // 5. Navigate directly to Estimates tab
    setCurrentTab("estimates");
  };

  // CRM Construction Inquiries Handlers
  const handleAddCRMLead = async (leadData: Omit<CRMLead, "id" | "created_at" | "tenant_id">) => {
    if (!db) return;
    
    // Create initial raw lead structure
    const rawLead: CRMLead = {
      ...leadData,
      id: "crm-" + (((db as any).crm_leads || []).length + 1) + "-" + Math.floor(Math.random() * 1000),
      tenant_id: user?.uid || "owner-1",
      created_at: new Date().toISOString()
    };

    // Perform sequential Round-Robin Allocation to active Telecallers
    const allocatedLead = allocateLead(rawLead, db.profiles || []);

    const updatedDb: DatabaseState = {
      ...db,
      crm_leads: [...((db as any).crm_leads || []), allocatedLead]
    };
    syncWithServer(updatedDb);
    addActivityLog(`CRM Lead Hub: Added new inquiry for "${allocatedLead.customer_name}" successfully.`);

    // Trigger static notification trigger
    triggerWhatsAppNotifications(allocatedLead, {
      onAddLog: (msg) => {
        addActivityLog(msg);
      }
    });

    // Trigger WhatsApp Allocation template dispatches to Telecaller & Buyer
    CRMLeadEngine.dispatchWhatsAppStubs(allocatedLead, undefined, undefined, (msg) => {
      addActivityLog(msg);
    });

    if (user) {
      await saveDocument("construction_inquiries", allocatedLead.id, allocatedLead);
    }
  };

  const handleUpdateCRMLead = async (leadId: string, updates: Partial<CRMLead>) => {
    if (!db) return;
    const updatedCRMLeads = ((db as any).crm_leads || []).map((l: CRMLead) => 
      l.id === leadId ? { ...l, ...updates } : l
    );
    const updatedDb: DatabaseState = {
      ...db,
      crm_leads: updatedCRMLeads
    };
    syncWithServer(updatedDb);
    
    if (updates.lead_status) {
      addActivityLog(`CRM Lead Hub: Updated inquiry status to "${updates.lead_status.replace('_', ' ')}".`);
    }
    if (updates.remarks !== undefined) {
      addActivityLog(`CRM Lead Hub: Updated remarks for inquiry.`);
    }

    if (user) {
      const activeCRMLead = updatedCRMLeads.find((l: CRMLead) => l.id === leadId);
      if (activeCRMLead) {
        await saveDocument("construction_inquiries", leadId, activeCRMLead);
      }
    }
  };

  const handleDeleteCRMLead = async (leadId: string) => {
    if (!db) return;
    const updatedCRMLeads = ((db as any).crm_leads || []).filter((l: CRMLead) => l.id !== leadId);
    const updatedDb: DatabaseState = {
      ...db,
      crm_leads: updatedCRMLeads
    };
    syncWithServer(updatedDb);
    addActivityLog(`CRM Lead Hub: Deleted inquiry.`);

    if (user) {
      try {
        const docRef = doc(firestoreDb, "companies", user.uid, "construction_inquiries", leadId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Error deleting from cloud:", err);
      }
    }
  };

  // Handler for adding a new client
  const handleAddClient = async (clientData: Omit<Client, "id">) => {
    if (!db) return;
    const newClient: Client = {
      ...clientData,
      id: "cl-" + ((db.clients || []).length + 1) + "-" + Math.floor(Math.random() * 1000)
    };
    const updatedDb = {
      ...db,
      clients: [...(db.clients || []), newClient]
    };
    syncWithServer(updatedDb);
    addActivityLog(`Added new client "${newClient.name}" successfully.`);

    if (user) {
      await saveDocument("clients", newClient.id, newClient);
    }
  };

  // Handler for adding a new construction project
  const handleAddProject = async (project: Omit<Project, "id">) => {
    if (!db) return;
    const newProject: Project = {
      ...project,
      id: "pr-" + (db.projects.length + 1)
    };
    const updatedDb = {
      ...db,
      projects: [...db.projects, newProject]
    };
    syncWithServer(updatedDb);
    addActivityLog(`Added new project "${newProject.project_name}" successfully.`);

    if (user) {
      await saveDocument("projects", newProject.id, newProject);
    }
  };

  // Handler for updating an existing construction project (such as changing status or progress)
  const handleUpdateProject = async (updatedProject: Project) => {
    if (!db) return;
    
    // Automatically initialize estimates if they are missing
    let projectToSave = { ...updatedProject };
    if (!projectToSave.estimates) {
      projectToSave.estimates = {
        civil: [],
        electrical: [],
        finishes: [],
        interior_finishing: []
      };
    }

    const updatedProjects = db.projects.map((p) => p.id === projectToSave.id ? projectToSave : p);
    const updatedDb = {
      ...db,
      projects: updatedProjects
    };
    syncWithServer(updatedDb);
    addActivityLog(`Updated project "${projectToSave.project_name}" successfully.`);

    if (user) {
      await saveDocument("projects", projectToSave.id, projectToSave);
    }
  };

  // Handler for Staff Profile account state updates
  const handleUpdateProfiles = async (updatedProfiles: Profile[]) => {
    if (!db) return;
    const updatedDb = { ...db, profiles: updatedProfiles };
    syncWithServer(updatedDb);
    addActivityLog("Staff active permissions updated.");

    if (user) {
      for (const p of updatedProfiles) {
        await saveDocument("profiles", p.id, p);
      }
    }
  };

  // Handler for Procurement Purchase order updates
  const handleUpdateOrders = async (updatedOrders: PurchaseOrder[]) => {
    if (!db) return;
    const updatedDb = { ...db, purchase_orders: updatedOrders };
    syncWithServer(updatedDb);

    if (user) {
      for (const po of updatedOrders) {
        await saveDocument("purchase_orders", po.id, po);
      }
    }
  };

  // Handler for Material stock procurement (updates quantity list)
  const handleOrderMoreStock = async (stockId: string, qty: number) => {
    if (!db) return;
    let stockToSave: MaterialStock | null = null;
    const updatedStocks = db.material_stocks.map((stock) => {
      if (stock.id === stockId) {
        const newStockAmt = stock.current_stock + qty;
        stockToSave = {
          ...stock,
          current_stock: newStockAmt,
          status: newStockAmt > stock.critical_level ? ("In Stock" as const) : ("Low Stock" as const)
        };
        return stockToSave;
      }
      return stock;
    });

    const stockToOrder = db.material_stocks.find(s => s.id === stockId);
    const orderId = "PO-" + Math.floor(100 + Math.random() * 900);
    const newPo: PurchaseOrder = {
      id: orderId,
      vendor_id: "ven-1",
      vendor_name: "Gupta Marbles",
      project_name: db.projects[0]?.project_name || "Active Site",
      order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: qty * 690,
      status: "In Transit",
      item_name: stockToOrder?.name || "Materials",
      item_sku: "SKU-" + Math.floor(1000 + Math.random() * 9000),
      quantity_description: `${qty} ${stockToOrder?.unit || "Bags"}`,
      unit_price: 690,
      timeline: [
        { title: "Order Placed", date: "Just now", done: true },
        { title: "Processed", date: "Dispatched from hub", done: true },
        { title: "In Transit", date: "En route", done: false },
        { title: "Expected Delivery", date: "3 days from now", done: false }
      ]
    };

    const updatedDb = {
      ...db,
      material_stocks: updatedStocks,
      purchase_orders: [newPo, ...db.purchase_orders]
    };
    syncWithServer(updatedDb);

    if (user) {
      if (stockToSave) {
        await saveDocument("material_stocks", (stockToSave as MaterialStock).id, stockToSave);
      }
      await saveDocument("purchase_orders", newPo.id, newPo);
    }
  };

  const handleCreateStock = async (stockData: Omit<MaterialStock, "id">) => {
    if (!db) return;
    const newId = `st-${Date.now()}`;
    const newStock: MaterialStock = {
      ...stockData,
      id: newId,
      status: stockData.current_stock > stockData.critical_level ? "In Stock" : stockData.current_stock > 0 ? "Low Stock" : "Out of Stock"
    };

    const updatedDb = {
      ...db,
      material_stocks: [...db.material_stocks, newStock]
    };
    syncWithServer(updatedDb);

    if (user) {
      await saveDocument("material_stocks", newId, newStock);
    }
    addActivityLog(`Registered new inventory item: "${newStock.name}" with initial stock of ${newStock.current_stock} ${newStock.unit}.`);
  };

  const handleAddInboundRevenue = async (rev: Omit<InboundRevenue, "id" | "date">) => {
    if (!db) return;
    const newRev: InboundRevenue = {
      ...rev,
      id: "rev-" + Date.now(),
      date: new Date().toISOString()
    };
    const updatedDb = { ...db, inbound_revenues: [newRev, ...(db.inbound_revenues || [])] };
    syncWithServer(updatedDb);
    addActivityLog(`Success: Logged Inbound Revenue of ₹${newRev.amount.toLocaleString()} for ${newRev.head_account}.`);

    if (user) {
      await saveDocument("inbound_revenues", newRev.id, newRev);
    }
  };

  const handleAddOfficeExpense = async (exp: Omit<OfficeExpense, "id" | "date">) => {
    if (!db) return;
    const newExp: OfficeExpense = {
      ...exp,
      id: "oe-" + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    const updatedDb = { ...db, office_expenses: [newExp, ...(db.office_expenses || [])] };
    syncWithServer(updatedDb);
    addActivityLog(`Success: Logged Office Expense of ₹${newExp.amount.toLocaleString()} for "${newExp.subject}".`);

    if (user) {
      await saveDocument("office_expenses", newExp.id, newExp);
    }
  };

  const handleAddDealAdjustment = async (adj: Omit<DealAdjustment, "id">) => {
    if (!db) return;
    const newAdj: DealAdjustment = {
      ...adj,
      id: "da-" + Date.now()
    };
    const updatedDb = { ...db, deal_adjustments: [newAdj, ...(db.deal_adjustments || [])] };
    syncWithServer(updatedDb);
    addActivityLog(`Success: Logged Commission Adjustment of ₹${newAdj.amount.toLocaleString()}.`);

    if (user) {
      await saveDocument("deal_adjustments", newAdj.id, newAdj);
    }
  };

  const handleAddProperty = async (property: Omit<Property, "id">) => {
    if (!db) return;
    const newProperty: Property = {
      ...property,
      id: "prop-" + Date.now()
    };
    const updatedDb = { ...db, properties: [...db.properties, newProperty] };
    syncWithServer(updatedDb);
    addActivityLog(`Success: Added real estate property "${newProperty.title}" to active deal catalog.`);

    if (user) {
      await saveDocument("properties", newProperty.id, newProperty);
    }
  };

  const handleAddBuyerRequirement = async (req: Omit<BuyerRequirement, "id" | "status">) => {
    if (!db) return;
    const newReq: BuyerRequirement = {
      ...req,
      id: "breq-" + Date.now(),
      status: "Pending"
    };
    const matches = db.properties.filter(p => p.property_type.toLowerCase() === req.property_type.toLowerCase() && p.target_selling_price <= req.max_budget);
    if (matches.length > 0) {
      newReq.status = "Matched";
    }
    const updatedDb = { ...db, buyer_requirements: [...(db.buyer_requirements || []), newReq] };
    syncWithServer(updatedDb);
    addActivityLog(`Success: Logged buyer requirements for "${newReq.buyer_name}" - running Proactive Match Engine.`);

    if (user) {
      await saveDocument("leads", newReq.id, newReq);
    }
  };

  const handleUpdateTenantProfile = async (updatedFields: Partial<TenantProfile>) => {
    if (!db) return;
    const updatedProfile = {
      ...activeTenantProfile,
      ...updatedFields
    };

    if (activeMockTenant) {
      setActiveMockTenant(updatedProfile);
    }

    if (user) {
      await setDoc(
        doc(firestoreDb, "companies", user.uid, "tenant_profiles", activeTenantProfile.id || "tp-default"),
        sanitizeFirestoreData(updatedProfile)
      );
    }

    setDb(prev => {
      if (!prev) return null;
      const tps = prev.tenant_profiles || [];
      const exists = tps.some(tp => tp.id === activeTenantProfile.id);
      const updatedTps = exists
        ? tps.map(tp => tp.id === activeTenantProfile.id ? updatedProfile : tp)
        : [...tps, { ...updatedProfile, id: activeTenantProfile.id || "tp-default" }];
      return {
        ...prev,
        tenant_profiles: updatedTps
      };
    });
  };

  const handleSimulateSubscription = (mockTenant: TenantProfile) => {
    setActiveMockTenant(mockTenant);
    setIsOnboardingWizardOpen(true);
    addActivityLog(`Simulation: Subscribed successfully with Partition ID ${mockTenant.tenant_id}. Onboarding Wizard triggered.`);
  };

  const handleCancelSimulation = () => {
    setActiveMockTenant(null);
    addActivityLog("Simulation: Cancelled subscription simulation. Restored default tenant profile state.");
  };

  const handleResetDatabase = async () => {
    if (!db) return;
    addActivityLog("Initiating database purge to a clean, blank slate...");
    setLoading(true);
    
    // Blank database state: keep the default profiles so role switching is still functional,
    // and empty out everything else!
    const blankDb: DatabaseState = {
      profiles: db.profiles.map(p => ({ ...p })), // Keep existing profiles so user roles work
      clients: [],
      projects: [],
      properties: [],
      inbound_revenues: [],
      daily_payments: [],
      office_expenses: [],
      deal_adjustments: [],
      material_stocks: [],
      vendors: [],
      purchase_orders: [],
      alerts: [],
      buyer_requirements: [],
      tenant_profiles: db.tenant_profiles ? db.tenant_profiles.map(tp => ({ ...tp })) : []
    };

    if (user) {
      const companyId = user.uid;
      try {
        // Delete documents in Firestore for all collections (except profiles)
        const collectionsToClear = [
          "clients",
          "projects",
          "properties",
          "leads", // buyer_requirements
          "daily_payments",
          "inbound_revenues",
          "vendors",
          "purchase_orders",
          "material_stocks",
          "office_expenses",
          "deal_adjustments",
          "alerts",
        ];

        for (const colPath of collectionsToClear) {
          const colRef = collection(firestoreDb, "companies", companyId, colPath);
          const snap = await getDocs(colRef);
          const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }

        setDb(blankDb);
        addActivityLog("Your cloud database has been successfully purged to a blank slate.");
      } catch (error: any) {
        console.error("Error purging cloud database:", error);
        addActivityLog("Failed to purge cloud database completely. Reverting to local purge.");
        setDb(blankDb);
      } finally {
        setLoading(false);
      }
    } else {
      // Offline/local mode: send POST with blankDb
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blankDb),
        });
        setDb(blankDb);
        addActivityLog("Local sandboxed database reset to a blank slate.");
      } catch (err) {
        console.error("Error resetting local database:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Public Client Snapshot Portal View Routing
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const isSharedMode = urlParams.has("share");

  if (isSharedMode) {
    if (sharedLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <span className="material-symbols-outlined text-slate-400 text-5xl animate-spin mb-4 animate-pulse">
            progress_activity
          </span>
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest">
            Loading Client Estimate Snapshot...
          </h2>
          <p className="text-xs text-slate-400 mt-1">Fetching official proposal snapshot from secure cloud storage</p>
        </div>
      );
    }

    if (sharedError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <span className="material-symbols-outlined text-rose-500 text-5xl mb-4">
            gpp_bad
          </span>
          <h2 className="text-sm font-black uppercase text-slate-700 tracking-widest">
            Access Denied or Link Invalid
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {sharedError}
          </p>
          <a
            href={window.location.origin + window.location.pathname}
            className="mt-6 inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-xs uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-xs">home</span>
            Go to Builder Portal
          </a>
        </div>
      );
    }

    if (sharedEstimate) {
      return <ClientEstimatePortal estimate={sharedEstimate} />;
    }
  }

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-slate-400 text-5xl animate-spin mb-4">
          progress_activity
        </span>
        <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest">
          Initializing BuildEstimate BOS...
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configuring database and server instances</p>
      </div>
    );
  }

  const activeTenantProfile = activeMockTenant || db.tenant_profiles?.find(
    (tp) => tp.tenant_id === (user?.uid || "owner-1")
  ) || db.tenant_profiles?.[0] || {
    id: "tp-fallback",
    tenant_id: "owner-1",
    company_name: "BuildEstimate Inc.",
    business_logo_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=150&auto=format&fit=crop",
    gstin: "27AAACB1234C1Z0",
    address: "4th Floor, Innovation Hub, Sector 62, Noida, UP - 201301",
    phone_number: "+91 98765 43210"
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Navigation Layout Bar with Firebase Google Auth */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        profiles={db.profiles}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        tenantProfile={activeTenantProfile}
        onOpenCompanyProfile={() => setIsOnboardingWizardOpen(true)}
        onOpenSubscriptionDetails={() => setIsSubscriptionModalOpen(true)}
        filterNavigationLinks={filterNavigationLinks}
      />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 pt-6 pb-24 md:py-8">
        <div className="space-y-8">
          {/* Dynamic RBAC Screen Router */}
          {currentTab === "dashboard" && (
            <DashboardView
              projects={db.projects}
              clients={db.clients || []}
              alerts={db.alerts}
              profiles={db.profiles}
              inboundRevenues={db.inbound_revenues || []}
              dailyPayments={db.daily_payments || []}
              officeExpenses={db.office_expenses || []}
              dealAdjustments={db.deal_adjustments || []}
              vendors={db.vendors || []}
              userRole={activeRole}
              setTab={(tab) => {
                if (tab === "crm_leads") {
                  setCurrentTab("leads");
                  setActiveLeadSubTab("hub");
                } else {
                  setCurrentTab(tab);
                }
              }}
              onOpenOrderDialog={(stockId) => {
                setCurrentTab("materials");
              }}
              onUpdateProfiles={handleUpdateProfiles}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onAddInboundRevenue={handleAddInboundRevenue}
              onAddDailyPayment={handleAddPayment}
              onAddOfficeExpense={handleAddOfficeExpense}
              onAddDealAdjustment={handleAddDealAdjustment}
              onAddClient={handleAddClient}
              tenantProfile={activeTenantProfile}
              onOpenUpgradeModal={() => setIsSubscriptionModalOpen(true)}
              onOpenOnboardingWizard={() => setIsOnboardingWizardOpen(true)}
              onSimulateSubscription={handleSimulateSubscription}
              onCancelSimulation={handleCancelSimulation}
              onAddLog={addActivityLog}
            />
          )}

          {currentTab === "estimates" && (
            <EstimatesView 
              projects={db.projects} 
              clients={db.clients || []}
              vendors={db.vendors || []}
              onAddLog={addActivityLog} 
              onUpdateProject={handleUpdateProject} 
              onAddClient={handleAddClient}
              tenantProfile={activeTenantProfile}
              initialProjectId={selectedProjectIdForEstimates}
            />
          )}

          {currentTab === "materials" && (
            <MaterialsView
              stocks={db.material_stocks}
              vendors={db.vendors}
              projects={db.projects}
              onOrderStock={handleOrderMoreStock}
              onAddStock={handleCreateStock}
              onAddLog={addActivityLog}
            />
          )}

          {currentTab === "orders" && (
            <OrdersView
              orders={db.purchase_orders}
              projects={db.projects}
              onUpdateOrders={handleUpdateOrders}
              onAddLog={addActivityLog}
            />
          )}

          {currentTab === "sitelog" && (
            <DailyLogView
              payments={db.daily_payments}
              projects={db.projects}
              profiles={db.profiles}
              activeRole={activeRole}
              onAddPayment={handleAddPayment}
              onAddLog={addActivityLog}
            />
          )}

          {currentTab === "properties" && (
            <PropertyView
              properties={db.properties}
              buyerRequirements={db.buyer_requirements || []}
              crmLeads={db.leads || []}
              onAddLog={addActivityLog}
              activeRole={activeRole}
              onAddProperty={handleAddProperty}
              onAddBuyerRequirement={handleAddBuyerRequirement}
            />
          )}

          {currentTab === "leads" && (
            <div className="space-y-6">
              {/* Modern Segment Control sub-menu */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveLeadSubTab("hub")}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeLeadSubTab === "hub"
                      ? "border-emerald-600 text-emerald-700 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">hub</span>
                  CRM Inquiry Hub
                </button>
                <button
                  onClick={() => setActiveLeadSubTab("kanban")}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeLeadSubTab === "kanban"
                      ? "border-emerald-600 text-emerald-700 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">view_week</span>
                  Pipeline Board (Karam AI)
                </button>
                <button
                  onClick={() => setActiveLeadSubTab("whatsapp")}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeLeadSubTab === "whatsapp"
                      ? "border-emerald-600 text-emerald-700 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  WhatsApp Templates (Karam AI)
                </button>
              </div>

              {activeLeadSubTab === "hub" ? (
                <CRMLeadHub
                  crmLeads={(db as any).crm_leads || []}
                  tenantProfile={activeTenantProfile}
                  activeRole={activeRole}
                  profiles={db.profiles}
                  onAddCRMLead={handleAddCRMLead}
                  onUpdateCRMLead={handleUpdateCRMLead}
                  onDeleteCRMLead={handleDeleteCRMLead}
                  onOpenUpgradeModal={() => setIsSubscriptionModalOpen(true)}
                />
              ) : activeLeadSubTab === "kanban" ? (
                <LeadsView
                  leads={db.leads || []}
                  clients={db.clients || []}
                  projects={db.projects || []}
                  tenantProfile={activeTenantProfile}
                  activeRole={activeRole}
                  onAddLead={handleAddLead}
                  onUpdateLeadStatus={handleUpdateLeadStatus}
                  onConvertLeadToEstimate={handleConvertLeadToEstimate}
                  onOpenUpgradeModal={() => setIsSubscriptionModalOpen(true)}
                />
              ) : (
                <WhatsAppTemplateEditor />
              )}
            </div>
          )}

          {currentTab === "settings" && (
            <SettingsView
              userRole={activeRole}
              user={user}
              onAddLog={addActivityLog}
              onResetDatabase={handleResetDatabase}
              tenantProfile={activeTenantProfile}
              onOpenUpgradeModal={() => setIsSubscriptionModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Behind the scenes status monitor footer for full-stack control pane */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-slate-500 font-semibold">
              BOS Active System Session <span className="text-slate-400">•</span> PORT 3000
            </p>
          </div>
          <div className="w-full md:w-auto max-h-20 overflow-y-auto no-scrollbar bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] font-mono text-slate-500 flex-grow max-w-xl">
            {activityLogs.length === 0 ? (
              <span className="text-slate-400">No session logs recorded yet.</span>
            ) : (
              activityLogs.map((log, idx) => <p key={idx}>{log}</p>)
            )}
          </div>
        </div>
      </footer>

      <SubscriptionGate
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        tenantProfile={activeTenantProfile}
        activeProjectsCount={db ? db.projects.length : 0}
        onAddLog={addActivityLog}
        onUpgradePlan={async (newPlan) => {
          const updatedProfile = {
            ...activeTenantProfile,
            subscription_plan: newPlan
          };
          
          if (user) {
            await setDoc(
              doc(firestoreDb, "companies", user.uid, "tenant_profiles", activeTenantProfile.id || "tp-default"),
              sanitizeFirestoreData(updatedProfile)
            );
          }
          
          setDb(prev => {
            if (!prev) return null;
            return {
              ...prev,
              tenant_profiles: (prev.tenant_profiles || []).map(tp => 
                tp.id === activeTenantProfile.id ? updatedProfile : tp
              )
            };
          });
          
          addActivityLog(`Billing: Successfully upgraded subscription to "${newPlan}" tier!`);
          setIsSubscriptionModalOpen(false);
        }}
      />

      <OnboardingWizard
        isOpen={isOnboardingWizardOpen}
        onClose={() => {
          setIsOnboardingWizardOpen(false);
          localStorage.setItem(`onboarding_completed_${user?.uid || "owner-1"}`, "true");
        }}
        tenantProfile={activeTenantProfile}
        onUpdateTenantProfile={handleUpdateTenantProfile}
        onResetDatabase={handleResetDatabase}
        onAddLog={addActivityLog}
      />
    </div>
  );
}
