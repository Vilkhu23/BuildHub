import React, { useState, useEffect } from "react";
import { DatabaseState, Profile, DailyPayment, PurchaseOrder, MaterialStock, Project, InboundRevenue, OfficeExpense, DealAdjustment, Property, BuyerRequirement } from "./types";

// Import modular screens
import Navigation from "./components/Navigation";
import DashboardView from "./components/DashboardView";
import EstimatesView from "./components/EstimatesView";
import MaterialsView from "./components/MaterialsView";
import OrdersView from "./components/OrdersView";
import DailyLogView from "./components/DailyLogView";
import PropertyView from "./components/PropertyView";
import SettingsView from "./components/SettingsView";

// Import Firebase Client Integration
import { auth, googleProvider, db as firestoreDb } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

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

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [activeRole, setActiveRole] = useState<'Owner' | 'Manager' | 'Supervisor' | 'Telecaller'>("Owner");
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const addActivityLog = (message: string) => {
    setActivityLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Save document to specified company subcollection
  const saveDocument = async (subcollection: string, id: string, data: any) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(firestoreDb, "companies", auth.currentUser.uid, subcollection, id);
      await setDoc(docRef, sanitizeFirestoreData(data));
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
            ];

            const loadPromises = collectionsToLoad.map(async (col) => {
              const colRef = collection(firestoreDb, "companies", companyId, col.path);
              const snap = await getDocs(colRef);
              const docsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              return { key: col.key, data: docsData };
            });

            const results = await Promise.all(loadPromises);
            results.forEach(res => {
              (loadedDb as any)[res.key] = res.data;
            });

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
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "profiles", p.id), sanitizeFirestoreData(p)));
            });
            defaultData.clients?.forEach(c => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "clients", c.id), sanitizeFirestoreData(c)));
            });
            defaultData.projects?.forEach(p => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "projects", p.id), sanitizeFirestoreData(p)));
            });
            defaultData.properties?.forEach(p => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "properties", p.id), sanitizeFirestoreData(p)));
            });
            defaultData.buyer_requirements?.forEach(br => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "leads", br.id), sanitizeFirestoreData(br)));
            });
            defaultData.daily_payments?.forEach(dp => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "daily_payments", dp.id), sanitizeFirestoreData(dp)));
            });
            defaultData.inbound_revenues?.forEach(ir => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "inbound_revenues", ir.id), sanitizeFirestoreData(ir)));
            });
            defaultData.vendors?.forEach(v => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "vendors", v.id), sanitizeFirestoreData(v)));
            });
            defaultData.purchase_orders?.forEach(po => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "purchase_orders", po.id), sanitizeFirestoreData(po)));
            });
            defaultData.material_stocks?.forEach(ms => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "material_stocks", ms.id), sanitizeFirestoreData(ms)));
            });
            defaultData.office_expenses?.forEach(oe => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "office_expenses", oe.id), sanitizeFirestoreData(oe)));
            });
            defaultData.deal_adjustments?.forEach(da => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "deal_adjustments", da.id), sanitizeFirestoreData(da)));
            });
            defaultData.alerts?.forEach(al => {
              seedPromises.push(setDoc(doc(firestoreDb, "companies", companyId, "alerts", al.id), sanitizeFirestoreData(al)));
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
    setDb(updatedDb);
    if (!user) {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDb),
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
      if (projectToSave.id === "pr-1") {
        projectToSave.estimates = {
          civil: [
            { name: "Foundations & Plinth", quantity: 1, unit: "ls", rate: 1850000, amount: 1850000 },
            { name: "Structure Masonry", quantity: 1, unit: "ls", rate: 2200000, amount: 2200000 }
          ],
          electrical: [
            { name: "Conduit Pipes Fitting", quantity: 1, unit: "ls", rate: 250000, amount: 250000 },
            { name: "Modular Switches", quantity: 1, unit: "ls", rate: 150000, amount: 150000 }
          ],
          finishes: [
            { name: "External Plaster Paint", quantity: 1, unit: "ls", rate: 650000, amount: 650000 },
            { name: "Vitrified Flooring", quantity: 1, unit: "ls", rate: 1100000, amount: 1100000 }
          ]
        };
      } else if (projectToSave.id === "pr-2") {
        projectToSave.estimates = {
          civil: [
            { name: "Basement Excavation", quantity: 1, unit: "ls", rate: 4500000, amount: 4500000 },
            { name: "Superstructure Columns", quantity: 1, unit: "ls", rate: 8200000, amount: 8200000 }
          ],
          electrical: [
            { name: "HT Substation Transformer", quantity: 1, unit: "ls", rate: 3500000, amount: 3500000 },
            { name: "Wiring & Conduit Work", quantity: 1, unit: "ls", rate: 1500000, amount: 1500000 }
          ],
          finishes: [
            { name: "Glass Curtain Wall Finishes", quantity: 1, unit: "ls", rate: 4200000, amount: 4200000 },
            { name: "Granite Lobby Tiling", quantity: 1, unit: "ls", rate: 1800000, amount: 1800000 }
          ]
        };
      } else if (projectToSave.id === "pr-3") {
        projectToSave.estimates = {
          civil: [
            { name: "Reinforcement Steel", quantity: 1, unit: "ls", rate: 1240000, amount: 1240000 },
            { name: "RMC (M25 Grade)", quantity: 1, unit: "ls", rate: 1815000, amount: 1815000 }
          ],
          electrical: [
            { name: "Internal Wiring Copper", quantity: 1, unit: "ls", rate: 450000, amount: 450000 },
            { name: "Distribution Board Panels", quantity: 1, unit: "ls", rate: 575000, amount: 575000 }
          ],
          finishes: [
            { name: "Italian Marble Premium", quantity: 1, unit: "ls", rate: 1350000, amount: 1350000 },
            { name: "Premium Emulsion Paints", quantity: 1, unit: "ls", rate: 1041700, amount: 1041700 }
          ]
        };
      } else {
        // Default blank estimates for newly created projects
        projectToSave.estimates = {
          civil: [],
          electrical: [],
          finishes: []
        };
      }
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
        filterNavigationLinks={filterNavigationLinks}
      />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 pt-6 pb-24 md:py-8">
        <div className="space-y-8">
          {/* Dynamic RBAC Screen Router */}
          {currentTab === "dashboard" && (
            <DashboardView
              projects={db.projects}
              alerts={db.alerts}
              profiles={db.profiles}
              inboundRevenues={db.inbound_revenues || []}
              dailyPayments={db.daily_payments || []}
              officeExpenses={db.office_expenses || []}
              dealAdjustments={db.deal_adjustments || []}
              vendors={db.vendors || []}
              userRole={activeRole}
              setTab={setCurrentTab}
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
            />
          )}

          {currentTab === "estimates" && (
            <EstimatesView 
              projects={db.projects} 
              clients={db.clients || []}
              onAddLog={addActivityLog} 
              onUpdateProject={handleUpdateProject} 
            />
          )}

          {currentTab === "materials" && (
            <MaterialsView
              stocks={db.material_stocks}
              vendors={db.vendors}
              projects={db.projects}
              onOrderStock={handleOrderMoreStock}
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
              onAddLog={addActivityLog}
              activeRole={activeRole}
              onAddProperty={handleAddProperty}
              onAddBuyerRequirement={handleAddBuyerRequirement}
            />
          )}

          {currentTab === "settings" && (
            <SettingsView
              userRole={activeRole}
              user={user}
              onAddLog={addActivityLog}
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
    </div>
  );
}
