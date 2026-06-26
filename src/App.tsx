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

// Import Firebase Client Integration
import { auth, googleProvider, db as firestoreDb } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

  // Monitor Firebase Auth State & load Firestore database accordingly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        addActivityLog(`Welcome, ${currentUser.displayName || "User"}! Syncing secure cloud database...`);
        setLoading(true);
        try {
          const userDocRef = doc(firestoreDb, "users", currentUser.uid);
          let userDocSnap;
          try {
            userDocSnap = await getDoc(userDocRef);
          } catch (err: any) {
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            throw err;
          }
          if (userDocSnap.exists()) {
            setDb(userDocSnap.data() as DatabaseState);
            addActivityLog("Secure cloud database loaded successfully from Firestore.");
          } else {
            // Seed Firestore with default database data from local API
            const res = await fetch("/api/db");
            const defaultData = await res.json();
            try {
              await setDoc(userDocRef, defaultData);
            } catch (err: any) {
              handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
              throw err;
            }
            setDb(defaultData);
            addActivityLog("Initialized and seeded your secure cloud database in Firestore.");
          }
        } catch (error: any) {
          console.error("Error loading secure database from Firestore:", error);
          addActivityLog("Firestore access error. Falling back to local sandboxed database.");
          // Fallback to local
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
    if (user) {
      const sanitized = sanitizeFirestoreData(updatedDb);
      const userDocRef = doc(firestoreDb, "users", user.uid);
      setDoc(userDocRef, sanitized)
        .then(() => {
          addActivityLog("Database successfully saved to secure Firestore cloud.");
        })
        .catch((err) => {
          console.error("Error syncing with Firestore:", err);
          addActivityLog("Error: Could not save database to secure Firestore cloud.");
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
    } else {
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
  const handleAddPayment = (payment: DailyPayment) => {
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
  };

  // Handler for adding a new construction project
  const handleAddProject = (project: Omit<Project, "id">) => {
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
  };

  // Handler for updating an existing construction project (such as changing status or progress)
  const handleUpdateProject = (updatedProject: Project) => {
    if (!db) return;
    
    // Automatically initialize estimates if they are missing
    let projectToSave = { ...updatedProject };
    if (!projectToSave.estimates) {
      if (projectToSave.id === "pr-1") {
        projectToSave.estimates = {
          civil: [
            { name: "Foundations & Plinth", amount: 1850000 },
            { name: "Structure Masonry", amount: 2200000 }
          ],
          electrical: [
            { name: "Conduit Pipes Fitting", amount: 250000 },
            { name: "Modular Switches", amount: 150000 }
          ],
          finishes: [
            { name: "External Plaster Paint", amount: 650000 },
            { name: "Vitrified Flooring", amount: 1100000 }
          ]
        };
      } else if (projectToSave.id === "pr-2") {
        projectToSave.estimates = {
          civil: [
            { name: "Basement Excavation", amount: 4500000 },
            { name: "Superstructure Columns", amount: 8200000 }
          ],
          electrical: [
            { name: "HT Substation Transformer", amount: 3500000 },
            { name: "Wiring & Conduit Work", amount: 1500000 }
          ],
          finishes: [
            { name: "Glass Curtain Wall Finishes", amount: 4200000 },
            { name: "Granite Lobby Tiling", amount: 1800000 }
          ]
        };
      } else if (projectToSave.id === "pr-3") {
        projectToSave.estimates = {
          civil: [
            { name: "Reinforcement Steel", amount: 1240000 },
            { name: "RMC (M25 Grade)", amount: 1815000 }
          ],
          electrical: [
            { name: "Internal Wiring Copper", amount: 450000 },
            { name: "Distribution Board Panels", amount: 575000 }
          ],
          finishes: [
            { name: "Italian Marble Premium", amount: 1350000 },
            { name: "Premium Emulsion Paints", amount: 1041700 }
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
  };

  // Handler for Staff Profile account state updates
  const handleUpdateProfiles = (updatedProfiles: Profile[]) => {
    if (!db) return;
    const updatedDb = { ...db, profiles: updatedProfiles };
    syncWithServer(updatedDb);
    addActivityLog("Staff active permissions updated.");
  };

  // Handler for Procurement Purchase order updates
  const handleUpdateOrders = (updatedOrders: PurchaseOrder[]) => {
    if (!db) return;
    const updatedDb = { ...db, purchase_orders: updatedOrders };
    syncWithServer(updatedDb);
  };

  // Handler for Material stock procurement (updates quantity list)
  const handleOrderMoreStock = (stockId: string, qty: number) => {
    if (!db) return;
    const updatedStocks = db.material_stocks.map((stock) => {
      if (stock.id === stockId) {
        const newStockAmt = stock.current_stock + qty;
        return {
          ...stock,
          current_stock: newStockAmt,
          status: newStockAmt > stock.critical_level ? ("In Stock" as const) : ("Low Stock" as const)
        };
      }
      return stock;
    });

    // Create a new purchase order automatically for procurement traceability
    const stockToOrder = db.material_stocks.find(s => s.id === stockId);
    const orderId = "PO-" + Math.floor(100 + Math.random() * 900);
    const newPo: PurchaseOrder = {
      id: orderId,
      vendor_id: "ven-1",
      vendor_name: "Gupta Marbles",
      project_name: db.projects[0]?.project_name || "Active Site",
      order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: qty * 690, // mock price estimate
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
      />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
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
              userRole={activeRole}
              setTab={setCurrentTab}
              onOpenOrderDialog={(stockId) => {
                setCurrentTab("materials");
              }}
              onUpdateProfiles={handleUpdateProfiles}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onAddInboundRevenue={(rev) => {
                const newRev: InboundRevenue = {
                  ...rev,
                  id: "rev-" + Date.now(),
                  date: new Date().toISOString()
                };
                const updatedDb = { ...db, inbound_revenues: [newRev, ...(db.inbound_revenues || [])] };
                syncWithServer(updatedDb);
                addActivityLog(`Success: Logged Inbound Revenue of ₹${newRev.amount.toLocaleString()} for ${newRev.head_account}.`);
              }}
              onAddDailyPayment={handleAddPayment}
              onAddOfficeExpense={(exp) => {
                const newExp: OfficeExpense = {
                  ...exp,
                  id: "oe-" + Date.now(),
                  date: new Date().toISOString().split('T')[0]
                };
                const updatedDb = { ...db, office_expenses: [newExp, ...(db.office_expenses || [])] };
                syncWithServer(updatedDb);
                addActivityLog(`Success: Logged Office Expense of ₹${newExp.amount.toLocaleString()} for "${newExp.subject}".`);
              }}
              onAddDealAdjustment={(adj) => {
                const newAdj: DealAdjustment = {
                  ...adj,
                  id: "da-" + Date.now()
                };
                const updatedDb = { ...db, deal_adjustments: [newAdj, ...(db.deal_adjustments || [])] };
                syncWithServer(updatedDb);
                addActivityLog(`Success: Logged Commission Adjustment of ₹${newAdj.amount.toLocaleString()}.`);
              }}
            />
          )}

          {currentTab === "estimates" && (
            <EstimatesView 
              projects={db.projects} 
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
              onAddProperty={(property) => {
                const newProperty: Property = {
                  ...property,
                  id: "prop-" + Date.now()
                };
                const updatedDb = { ...db, properties: [...db.properties, newProperty] };
                syncWithServer(updatedDb);
                addActivityLog(`Success: Added real estate property "${newProperty.title}" to active deal catalog.`);
              }}
              onAddBuyerRequirement={(req) => {
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
              }}
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
