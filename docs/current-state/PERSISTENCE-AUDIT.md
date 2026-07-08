# Persistence Audit Report (AUD-002)
## BuildEstimate BOS — Real Estate Lead Operations System

- **Task ID**: AUD-002
- **Task Name**: Persistence Audit
- **Current Time**: 2026-07-08
- **Status**: COMPLETE
- **Target File**: `docs/current-state/PERSISTENCE-AUDIT.md`

---

## 1. Executive Summary

A comprehensive architectural scan of the BuildEstimate BOS repository was conducted to inspect, index, and trace every persistence, synchronization, mutation, cache, fallback, and state-storage path. The system currently uses **five (5) separate persistence mechanisms** to coordinate frontend and backend states.

### Core Findings
*   **Authoritative Storage**:
    *   **Authenticated Mode**: Direct client-side SDK integration with Google Cloud Firebase Firestore is authoritative.
    *   **Unauthenticated Mode (Guest/Offline fallback)**: An Express REST API routing to a local `db.json` filesystem store is authoritative.
*   **Fallback Storage**:
    *   `localStorage` functions as a client-side settings and metadata fallback cache for unauthenticated company records, onboarding state, and custom templates.
    *   `db.json` functions as a server-side offline fallback when Firestore writes throw connection/permission errors or when no user session is active.
*   **Simulation-Only States**:
    *   `simulation.ts` contains an isolated in-memory list (`leadsDatabase`) and an allocation queue pointer (`lastAssignedIndex`) representing external webhook behaviors.
*   **State Split-Brain / Divergence Vulnerability**:
    *   **YES**, the same business entity can be updated through multiple disjointed paths.
    *   When transitioning from unauthenticated (local guest) to authenticated (Google Auth), a one-way database "seeding" occurs. However, there is **no continuous bi-directional synchronization or reconciliation engine**.
    *   If a user conducts operations locally and subsequently logs in, the local `db.json` states are uploaded to Firestore, potentially overwriting newer cloud documents.
    *   If an authenticated user performs changes, those changes are written to Firestore but are **never written to the backend `db.json`**, creating complete data divergence between the two storage layers.

---

## 2. Persistence Mechanism Inventory

The application currently orchestrates state across five (5) distinct persistence vectors:

### 1. Firestore Direct SDK
*   **Technology**: Google Firebase Firestore v9+ Client SDK (Web client direct-to-cloud).
*   **Exact Files**:
    *   `/src/lib/firebase.ts` (Initialization of `firestoreDb` export)
    *   `/src/App.tsx` (Direct imports of `doc`, `setDoc`, `collection`, `getDocs`, `deleteDoc`, `query`, `where` from `firebase/firestore`)
    *   `/src/components/SettingsView.tsx` (Direct imports of `doc`, `getDoc`, `setDoc` to persist configuration)
    *   `/src/components/EstimatesView.tsx` (Direct write of public proposal snapshots)
*   **Purpose**: Multi-tenant cloud-backed storage for active builders to keep records across sessions.
*   **Data Stored**: Entire enterprise operational schema split into tenant subcollections: profiles, clients, projects, properties, inbound revenues, daily payments, material stocks, purchase orders, vendor indexes, office expenses, commission adjustments, alerts, buyer requirements, and CRM inquiries.
*   **Read Path**: `App.tsx` (lines 195–234) fetches parallel subcollections using a tenant filter query: `query(colRef, where("tenant_id", "==", companyId))`.
*   **Write Path**: `App.tsx` via `saveDocument` (lines 170–183) writes using `setDoc(doc(firestoreDb, "companies", currentTenantId, subcollection, id), dataWithTenant)`.
*   **Delete Path**: `App.tsx` (lines 284, 627, 954) deletes individual documents using `deleteDoc(docRef)`.
*   **Trigger Condition**: Active logged-in user session (`user !== null`) detected by `onAuthStateChanged`.
*   **Authenticated Usage**: Authenticated only. Bypassed entirely when unauthenticated.
*   **Classification**: Production.

### 2. Express JSON API Proxy
*   **Technology**: Node.js + Express REST API endpoints backing a local disk-based `db.json` file.
*   **Exact Files**:
    *   `/server/routes/db.ts` (API routes `GET /api/db` and `POST /api/db`)
    *   `/server/services/database.ts` (`readDb()` and `writeDb()` synchronous file utilities)
    *   `/src/App.tsx` (Client-side `fetch("/api/db")` routines)
*   **Purpose**: Fallback guest and offline local sandboxed database persistence.
*   **Data Stored**: Entire static fallback DatabaseState object.
*   **Read Path**: Client makes standard `GET /api/db` request on mount in unauthenticated state (`App.tsx` lines 365–371).
*   **Write Path**: Client makes a full `POST /api/db` containing the entire serialized state string via `syncWithServer` (`App.tsx` lines 385–395) when `user === null`.
*   **Delete Path**: There is no dedicated delete route; deletions are performed client-side by mutating the local array and overwriting the entire state file via `POST /api/db`.
*   **Trigger Condition**: Triggered when no user session is active, or if Firestore loading throws an error.
*   **Authenticated/Unauthenticated**: Unauthenticated only (writes are bypassed if `user` is logged in).
*   **Classification**: Fallback / Guest Local Sandbox.

### 3. Local Browser Storage
*   **Technology**: Web browser `window.localStorage` synchronous key-value engine.
*   **Exact Files**:
    *   `/src/App.tsx` (Onboarding complete marker)
    *   `/src/components/SettingsView.tsx` (Guest offline settings)
    *   `/src/components/WhatsAppTemplateEditor.tsx` (Outbound follow-up templates)
*   **Purpose**: Local settings persistence, tutorial/onboarding state management, and customized WhatsApp communications blueprints.
*   **Data Stored**:
    *   `onboarding_completed_{uid}`: boolean marker (`"true"`).
    *   `buildhub_settings_{companyId}`: Guest Company general configuration object.
    *   `whatsapp_templates`: Modified templates registry indexed by trigger key.
*   **Read Path**: Local `localStorage.getItem(key)` on load.
*   **Write Path**: `localStorage.setItem(key, value)` immediately on configuration update.
*   **Delete Path**: None. Permanent until cleared by user.
*   **Trigger Condition**: UI interactions (completing wizard, saving templates, updating company address in guest mode).
*   **Authenticated/Unauthenticated**: Both (keys are appended with the user ID to prevent tenant collision where possible).
*   **Classification**: Client Cache / UI Preferences.

### 4. React In-Memory State Cache
*   **Technology**: React component state hooks (`useState` in `App.tsx` and custom components).
*   **Exact Files**:
    *   `/src/App.tsx` (Active `db` state, `activityLogs` buffer)
    *   `/src/components/WhatsAppTemplateEditor.tsx` (Templates config copy)
*   **Purpose**: Authoritative frontend state manager driving real-time view updates.
*   **Data Stored**: Entire running `DatabaseState` memory tree.
*   **Read Path**: Directly from `db` state inside components.
*   **Write Path**: Set via `setDb` and synchronized outwards through `syncWithServer`.
*   **Delete Path**: Modifying local arrays in React state.
*   **Trigger Condition**: Continuous runtime operations.
*   **Authenticated/Unauthenticated**: Both.
*   **Classification**: Runtime authoritative state.

### 5. In-Memory Session Pointers
*   **Technology**: Isolated JS/TS module-level variables.
*   **Exact Files**:
    *   `/src/lib/CRMLeadEngine.ts` (`globalRoundRobinIndex` pointer)
*   **Purpose**: Retains allocation offsets across round-robin invocations without writing back to database.
*   **Data Stored**: Round-Robin pointer (number representing active index).
*   **Read/Write Path**: `CRMLeadEngine.allocateLead` references and increments `globalRoundRobinIndex`.
*   **Delete Path**: None (resets to `0` only on total browser refresh).
*   **Trigger Condition**: Triggered on any lead registration.
*   **Authenticated/Unauthenticated**: Both.
*   **Classification**: Session Temp Cache.

---

## 3. Firestore Inventory

Firestore is organized strictly around a **Tenant-Nested Pattern** grouping data under `/companies/{companyId}/[subcollection]`. 

### Key Schema Translation Discrepancy (CRITICAL)
A severe architectural conflict exists between the property keys of `DatabaseState` in the TypeScript client and the exact collection names used in the Firestore database:
*   TypeScript key `buyer_requirements` maps to Firestore path `/leads`!
*   TypeScript key `leads` maps to Firestore path `/crm_leads`!
*   TypeScript key `crm_leads` maps to Firestore path `/construction_inquiries`!

This mismatch will trigger severe schema misalignment if not accounted for during relational migration.

### Detailed Collection Mapping Matrix

| Firestore Collection Path | Document Pattern | Entity Represented | Reading File | Writing File | Deleting File | Auth Dependency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/public_estimates` | `/public_estimates/{shareId}` | Read-only proposal snapshots | `/src/App.tsx` (lines 135–148) | `/src/components/EstimatesView.tsx` (line 468) | None | **None** (Allows unauthenticated public clients to load quotes) |
| `/companies` | `/companies/{companyId}` | Parent builder profile metadata | `/src/components/SettingsView.tsx` (line 103) | `/src/components/SettingsView.tsx` (line 209) | None | Google Auth |
| `/companies/{id}/profiles` | `/companies/{id}/profiles/{profileId}` | Staff roles & permissions | `/src/App.tsx` (line 196) | `/src/App.tsx` (line 304, 710) | None | Google Auth |
| `/companies/{id}/clients` | `/companies/{id}/clients/{clientId}` | Site buyer index | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 307, 650) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/projects` | `/companies/{id}/projects/{projId}` | Site financial limits, estimates | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 310, 537, 669, 697) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/properties` | `/companies/{id}/properties/{propId}` | Land & inventories | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 313, 841) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/leads` | `/companies/{id}/leads/{reqId}` | **BuyerRequirements** model | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 316, 861) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/crm_leads` | `/companies/{id}/crm_leads/{leadId}` | **Lead** model (Legacy list) | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 346, 459, 478, 538) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/construction_inquiries` | `/companies/{id}/construction_inquiries/{inqId}` | **CRMLead** model (Live CRM) | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 585, 610) | `/src/App.tsx` (line 284, 627, 954) | Google Auth |
| `/companies/{id}/settings` | `/companies/{id}/settings/config` | General CompanySettings | `/src/components/SettingsView.tsx` (line 95) | `/src/components/SettingsView.tsx` (line 204) | None | Google Auth |
| `/companies/{id}/tenant_profiles` | `/companies/{id}/tenant_profiles/{profileId}` | SaaS Subscription Profile details | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 254, 343, 878) | None | Google Auth |
| `/companies/{id}/daily_payments` | `/companies/{id}/daily_payments/{paymentId}` | Construction expenses logs | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 319, 434) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/inbound_revenues` | `/companies/{id}/inbound_revenues/{revId}` | Site inbound payments | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 322, 795) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/vendors` | `/companies/{id}/vendors/{vendorId}` | Supplier directory | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 325) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/purchase_orders` | `/companies/{id}/purchase_orders/{poId}` | Procurement lists | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 328, 723, 779) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/material_stocks` | `/companies/{id}/material_stocks/{stockId}` | Inventory counts | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 331, 777) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/office_expenses` | `/companies/{id}/office_expenses/{expId}` | Office operational cost logs | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 334, 811) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/deal_adjustments` | `/companies/{id}/deal_adjustments/{adjId}` | Brokerage payments | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 337, 826) | `/src/App.tsx` (line 284, 954) | Google Auth |
| `/companies/{id}/alerts` | `/companies/{id}/alerts/{alertId}` | Overdue & notification listings | `/src/App.tsx` (line 223) | `/src/App.tsx` (line 340) | `/src/App.tsx` (line 284, 954) | Google Auth |

---

## 4. `db.json` Inventory

`db.json` acts as a complete, flat, key-value storage of the entire application state on the server filesystem.

### Inventory Schema Details

| Top-Level Key | Entity/State Represented | Readers | Writers | Write Scope |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Staff permissions & role listings | `GET /api/db`, `/server/routes/ai.ts` (line 171) | `POST /api/db` (App.tsx line 385) | Overwrites whole file |
| `clients` | Client directory | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `projects` | Budget tracker, materials estimations | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `properties` | Physical estate catalog | `GET /api/db`, `/server/routes/ai.ts` (line 171) | `POST /api/db` | Overwrites whole file |
| `inbound_revenues`| Received client deposits | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `daily_payments` | Construction spends ledger | `GET /api/db`, `/server/routes/ai.ts` (line 51) | `POST /api/db`, `/server/routes/ai.ts` (line 62, 156) | Partial array unshift then whole file write |
| `office_expenses` | Administrative costs | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `deal_adjustments`| Commissions adjustments | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `material_stocks` | Materials procurement count | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `vendors` | Vendor directory | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `purchase_orders` | Material purchase contracts | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `alerts` | Dashboard alerts queue | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `buyer_requirements`| Unstructured buyer records | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `tenant_profiles` | SaaS tenant profile parameters | `GET /api/db` | `POST /api/db` | Overwrites whole file |
| `leads` | Inbound CRM leads (Legacy List) | `GET /api/db` | `POST /api/db` | Overwrites whole file |

### Technical Risks
1.  **Concurrency / Lock Failures**: Express performs writes using standard `fs.writeFileSync()` in a synchronous, blocking fashion. There are **no file locks, transactional boundaries, or mutexes**. Concurrent posts from two offline browsers will immediately trigger a write race condition, overwriting each other's changes.
2.  **Corruption Risks**: Since writes stringify the entire state (`JSON.stringify(state, null, 2)`), any server crash or container recycling during the execution of `fs.writeFileSync()` will result in a zero-byte truncated or corrupted file, rendering the app unable to load on subsequent boots.
3.  **Fallback Triggers**: `App.tsx` (line 355) falls back to loading `db.json` from `/api/db` if a direct Firestore connection is dropped, or throws permission faults.

---

## 5. Frontend Mutation Inventory

Every mutation initiated in React undergoes client-side array manipulation before writing. There is **no optimistic rollback or transaction handling** on the client.

| Component / Hook | User Action | Entity Affected | Local State Change | Persistence Call | Server Validation | Fallback/Failure Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `App.tsx` (`handleAddPayment`) | Inputs site payment expense | `daily_payments` & `projects` | Appends expense, increments project spent budget | `saveDocument` (Firestore) OR `POST /api/db` | **Absent** | Console error logged; states diverge from server. |
| `App.tsx` (`handleAddLead`) | Registers raw prospect | `leads` | Appends lead object with random id | `saveDocument` (Firestore) OR `POST /api/db` | **Absent** | Logs error; state remains only in local memory. |
| `App.tsx` (`handleUpdateLeadStatus`) | Alters lead lifecycle | `leads` | Maps lead and replaces status field | `saveDocument` (Firestore) OR `POST /api/db` | **Absent** | Logs error; state remains out of sync. |
| `App.tsx` (`handleConvertLead`) | Converts lead to estimate | `clients`, `projects`, `leads` | Creates client, project, updates lead status to Quoted | `saveDocument` (Firestore) for all 3 collections | **Absent** | Fails silently on first error; risk of partial write. |
| `App.tsx` (`handleAddCRMLead`) | Registers live CRM inquiry | `crm_leads` | Runs Round-Robin allocation, appends allocated lead | `saveDocument` (Firestore) OR `POST /api/db` | **Absent** | Logs error; webhook notification logs are preserved in UI. |
| `App.tsx` (`handleUpdateCRMLead`) | Updates inquiry remarks | `crm_leads` | Merges partial remarks, status | `saveDocument` (Firestore) OR `POST /api/db` | **Absent** | Fails on write; local UI remains updated until refresh. |
| `App.tsx` (`handleDeleteCRMLead`) | Triggers deletion | `crm_leads` | Filters lead out of client list | `deleteDoc` (Firestore) OR `POST /api/db` | **Absent** | UI removes card; cloud doc is left orphaned if delete fails. |
| `App.tsx` (`handleOrderMoreStock`) | Refills low material | `material_stocks`, `purchase_orders` | Updates quantity, status, prepends purchase order | `saveDocument` (Firestore) for both | **Absent** | Partial write risk if one document fails. |
| `App.tsx` (`handleResetDatabase`) | Flushes data | All collections except profiles | Empties database arrays | Parallel `deleteDoc` loop (Firestore) OR empty `POST /api/db` | **Absent** | Prone to parallel delete limits in Firestore. |
| `EstimatesView.tsx` (`handleGeneratePublicLink`)| Generates share link | `public_estimates` | Generates share ID | Direct `setDoc` to `/public_estimates/{id}` | **Absent** | Catches error; prevents copying public URL to clip. |
| `SettingsView.tsx` (`handleSaveSettings`)| Configures profile | `settings`, `/companies`, `tenant_profiles` | Saves company settings | Sets doc across 3 disjointed cloud collections | **Absent** | High probability of data mismatch if single call fails. |

---

## 6. Backend Mutation Inventory

The Express backend lacks authorization and transaction structures.

*   **REST Endpoint**: `POST /api/db`
    *   **Route File**: `/server/routes/db.ts`
    *   **Service File**: `/server/services/database.ts`
    *   **Data Changed**: Overwrites the entire local `db.json` file.
    *   **Transaction Support**: None.
    *   **Tenant Verification**: None. The tenant ID is ignored, and any payload completely overwrites the global database file.
    *   **Auth Verification**: None. Unsecured endpoint.
    *   **Validation**: None. Accepts any payload in `req.body`.
    *   **Concurrency Control**: None (Synchronous block).

---

## 7. AI Mutation Inventory

Gemini routes interact with business data as follows:

| Endpoint Path | Route File | Primary AI Purpose | Classification | Data Mutation Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `/api/voice-to-khata` | `/server/routes/ai.ts` | Translates Hindlish/Punjabi audio logs into Ledger structured JSON | **DIRECT MUTATION** | Directly modifies the underlying business data by loading `db.json`, prepending the parsed transaction to `daily_payments`, and rewriting the database file on disk. |
| `/api/auto-match` | `/server/routes/ai.ts` | Matches requirements with catalog using Maps Grounding | **RECOMMENDATION ONLY** | Reads properties from `db.json` but executes no database modifications. |
| `/api/ai/dashboard-summary`| `/server/routes/ai.ts` | CFO-style operational executive performance summary | **RECOMMENDATION ONLY** | Strictly READ ONLY. Reads current records passed in the body. |

---

## 8. Browser Storage Inventory

A detailed list of every active key stored in browser storage:

*   **localStorage Keys**:
    1.  `onboarding_completed_{uidKey}`: Stores string `"true"` to indicate that the multi-step tenant setup has been successfully completed. Prevents onboarding modal popup on subsequent sessions.
    2.  `buildhub_settings_{companyId}`: Caches the Guest/Offline builder settings fallback (companyName, address, logo, gstin) when unauthenticated.
    3.  `whatsapp_templates`: Stringified JSON tracking custom templates edited by the user.
*   **sessionStorage Keys**: None.
*   **IndexedDB**: None.
*   **Cached Business Objects**: No primary or authoritative transaction lists are stored inside browser local/session caches. All records are held purely in volatile React state (`App.tsx` state variable `db`) and synced on modification.

---

## 9. Entity-to-Persistence Matrix

| Domain Entity | React Memory | Firestore | `db.json` | Express API | AI Route | Simulation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Profiles** | YES | YES | YES | YES | YES (`readDb`) | None |
| **Clients** | YES | YES | YES | YES | None | None |
| **Projects** | YES | YES | YES | YES | YES (`/dashboard-summary`)| None |
| **Properties** | YES | YES | YES | YES | YES (`/auto-match`) | None |
| **Daily Payments** | YES | YES | YES | YES | YES (`/voice-to-khata`) | None |
| **Inbound Revenues** | YES | YES | YES | YES | YES (`/dashboard-summary`)| None |
| **Vendors** | YES | YES | YES | YES | YES (`/dashboard-summary`)| None |
| **Purchase Orders** | YES | YES | YES | YES | None | None |
| **Material Stocks** | YES | YES | YES | YES | None | None |
| **Office Expenses** | YES | YES | YES | YES | YES (`/dashboard-summary`)| None |
| **Deal Adjustments**| YES | YES | YES | YES | None | None |
| **Alerts** | YES | YES | YES | YES | None | None |
| **BuyerRequirements**| YES | YES | YES | YES | None | None |
| **Tenant Profiles** | YES | YES | YES | YES | None | None |
| **Leads (Legacy List)**| YES | YES | YES | YES | None | None |
| **CRM Leads (Live)** | YES | YES | YES | YES | None | YES (`simulation.ts` / `leadsDatabase`) |

---

## 10. Dual-Write and Split-Brain Risks

1.  **Direct Auth Boundary Split-Brain**: When a guest logs in via Google Popup, their local database is pushed into Firestore. However, any subsequent modifications made in guest/offline mode (if auth state is lost) will be logged to `db.json` and **never merged back** with Firestore, or vice-versa.
2.  **Lack of Client-Side Lock / Race Conditions**: If a developer accesses Firestore from two screens concurrently, Firestore direct writes use `setDoc()` on the same document path. This can result in **Last-Write-Wins overwrites** with no optimistic currency tracking.
3.  **Fragmented Dual Settings Writes**: When saving settings, `SettingsView.tsx` makes three distinct, parallel SDK calls (under `settings/config`, root `/companies/{id}`, and `tenant_profiles/tp-default`). If any network error occurs mid-way, the client metadata becomes desynchronized and permanently fractured across collections.
4.  **AI Offline Split-Brain on `/voice-to-khata`**: This route writes directly to `db.json`. However, if the active user is authenticated, their main database state is driven by **Firestore** on the client, meaning payments written by the AI route to `db.json` will **never appear in their authenticated UI**.

---

## 11. Migration Classification

| Persistence Path | Classification | Architectural Explanation |
| :--- | :--- | :--- |
| **Direct Client Firestore SDK**| **REMOVE** | Bypasses server-authoritative controllers, introducing major security vulnerabilities, cross-tenant leaks, and validation failure points. |
| **Express JSON API (`db.json`)**| **REMOVE** | Replaced entirely by a relational PostgreSQL database on the backend server for transactional compliance and reliable data constraints. |
| **`localStorage` (Settings)** | **REMOVE** | Settings must be stored strictly in the database; UI preferences can be temporarily retained in the client if needed. |
| **`localStorage` (Templates)** | **MIGRATE** | Custom WhatsApp templates must be migrated to a dedicated PostgreSQL configurations table. |
| **`localStorage` (Wizard State)**| **UI-ONLY** | Pure client state to control whether the wizard modal triggers for first-time users. |
| **`simulation.ts` In-Memory** | **REMOVE** | Redundant test script which has no integration with actual operations. |
| **In-Memory Round-Robin Index**| **MIGRATE** | Pointer index must be stored in PostgreSQL/Redis or computed dynamically to survive server container restarts. |

---

## 12. PostgreSQL Migration Impact

Proposed database schema destinations for current entities:

*   **tenants**: `TenantProfile` model mapping. Houses billing configuration and subscription status.
*   **users**: `Profile` model (role, status, email, name, tenant isolation).
*   **projects**: `Project` model (costs, status, name, location, parent tenant).
*   **campaigns**: Unresolved (not supported by current schema).
*   **contacts**: `Client` model (combines current client records and CRM lead details).
*   **opportunities**: Mapped from the current `crm_leads` (Inquiry stage, status, source, budget tier).
*   **lead_events**: Custom timeline events, logging activities, remarks, and metadata.
*   **opportunity_assignments**: Chronological log of telecaller assignments and round-robin allocations.
*   **activities**: Operational daily payments, site construction expenses, and office expenses.
*   **next_actions**: Operational tracking enforcing exactly one upcoming appointment/follow-up per Opportunity.
*   **site_visits**: Logged properties visits.
*   **webhook_events**: Raw incoming webhooks from Meta/Facebook Ads to allow auditing and safe retries.
*   **configuration table**: Global WhatsApp text templates, company settings, and system parameters.

---

## 13. Critical Risks

### P0 — SECURITY & DATA LOSS (Immediate Action Required)
1.  **Cross-Tenant Leakage**: Unsecured `/api/db` GET/POST endpoints allow any malicious unauthenticated client to completely read or overwrite the entire fallback database, bypassing tenant separation rules.
2.  **No Server-Side Auth Checks**: The server routes inside `/server/routes/ai.ts` and `/server/routes/db.ts` do not inspect token claims or verify authorization headers.
3.  **Missing Database Locks**: blocking, synchronous disk writes on `db.json` are highly prone to race conditions and raw data truncation under load.

### P1 — INCONSISTENCY & STALE STATE
1.  **AI Voice Logs Divergence**: The `/voice-to-khata` endpoint appends payments directly to `db.json`. However, authenticated users view Firestore, causing payments added via voice log to silently disappear for logged-in sessions.
2.  **Fragmented Settings Writes**: Settings updates split changes into three parallel Firestore documents; network failures leave tenant configurations permanently corrupted and inconsistent.

### P2 — MIGRATION COMPLEXITY
1.  **Schema Naming Mismatches**: The confusing mismatch between TS state properties and Firestore collection paths (`buyer_requirements` -> `leads`, `leads` -> `crm_leads`, `crm_leads` -> `construction_inquiries`) creates critical translation hurdles during relational mapping.

---

## 14. Unknowns Requiring Investigation

1.  **Meta Outbound Webhook Verification Pattern**: How to secure the mock bearer token (`EAAXXFakeToken...`) with production API secrets securely.
2.  **Google Auth Server Verification**: The strategy for parsing and verifying the client-supplied Google Auth JWT inside the custom Node/Express middleware to securely isolate tenant scopes on the backend.
3.  **Current Production Active Customer Data Size**: The volume of records in existing collections to determine the feasibility of offline data migration scripts.

---

## 15. Audit Evidence Trace

### Evidence A: Authentication Split-Brain
*   **File**: `/src/App.tsx`
*   **Line**: 384–385
*   **Function**: `syncWithServer(updatedDb)`
*   **Operation**: `SYNC`
*   **Code**:
    ```typescript
    if (!user) {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDb),
      })
    }
    ```
    *This explicitly demonstrates that when a user is authenticated, updates are saved only in the cloud, leaving `db.json` completely stale.*

### Evidence B: Unsecured REST DB Mutation
*   **File**: `/server/routes/db.ts`
*   **Line**: 11–14
*   **Operation**: `UPDATE` / `WRITE`
*   **Code**:
    ```typescript
    router.post("/", (req, res) => {
      const newState = req.body;
      writeDb(newState);
      res.json({ success: true, state: newState });
    });
    ```
    *This exposes an unauthenticated, unvalidated, global overwrite API endpoint.*

### Evidence C: AI Route Direct Write
*   **File**: `/server/routes/ai.ts`
*   **Line**: 51–62
*   **Operation**: `READ` / `UPDATE`
*   **Code**:
    ```typescript
    const db = readDb();
    // ... creates newPayment ...
    db.daily_payments.unshift(newPayment);
    writeDb(db);
    ```
    *This confirms that an AI route directly reads and mutates the server-side filesystem state, bypassing standard business controllers and causing silent auth desynchronization.*

### Evidence D: WhatsApp Graph Fake Dispatches
*   **File**: `/src/lib/CRMLeadEngine.ts`
*   **Line**: 132
*   **Operation**: `SYNC`
*   **Code**:
    ```typescript
    "Authorization": "Bearer EAAXXFakeTokenForMockingBOSInquiries778899"
    ```
    *This proves that the system's external Meta notifications use a mock simulated credential.*
