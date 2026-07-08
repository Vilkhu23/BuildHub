# Repository Inventory Report (AUD-001)
## BuildEstimate BOS — Real Estate Lead Operations System

- **Task ID**: AUD-001
- **Task Name**: Repository Inventory
- **Current Time**: 2026-07-08
- **Status**: COMPLETE
- **Target File**: `docs/current-state/REPOSITORY-INVENTORY.md`

---

## 1. Executive Summary

The BuildHub repository in its current state acts as a full-stack, real-time real estate operations prototype. It currently operates as an interactive SaaS workspace integrating a React SPA, client-side Firebase Firestore persistence (when authenticated), and an Express API server proxies reading and writing to a local `db.json` fallback database file (when unauthenticated/local guest mode). It also features several Gemini-powered AI routes (transaction parsing, location auto-matching with Maps grounding, and natural language dashboard reports).

To verify stability before production refactoring, type-checking and build compilations were executed successfully:
*   **Type-Check (`npm run lint`)**: PASS (Clean, zero typescript compiler warnings or errors).
*   **Build Compilation (`npm run build`)**: PASS (Bundles client static assets and server TS entry point successfully into `dist/`).

---

## 2. Repository Structure

Below is the directory tree summary of the workspace:

```text
buildestimate-bos/
├── .env.example                # Blueprint for system environment configurations
├── .gitignore                  # Exclusion paths (node_modules, build outputs, local DB)
├── db.json                     # Local JSON database for guest/local fallback persistence
├── firebase-blueprint.json     # Firestore collections and rules scaffolding setup
├── firestore.rules             # Standard Firebase Firestore security policies
├── index.html                  # Core single-page HTML client container
├── metadata.json               # Sandbox workspace metadata and permissions
├── package-lock.json           # Locked node dependencies list
├── package.json                # Project script manifests and npm packages
├── tsconfig.json               # Global TypeScript compiler configurations
├── vite.config.ts              # Vite configurations with React & Tailwind integration
│
├── server/                     # BACKEND Express & Node.js codebase
│   ├── index.ts                # Server bootstrapper & Vite server integration
│   ├── routes/
│   │   ├── ai.ts               # Gemini AI models routing & Hinglish parsers
│   │   └── db.ts               # Local filesystem JSON DB read/write proxies
│   └── services/
│       ├── database.ts         # Handlers for reading/writing db.json state
│       └── gemini.ts           # Google Gen AI integration & fallback wrapper
│
└── src/                        # FRONTEND Client Codebase
    ├── App.tsx                 # Main SPA Router, Auth handler, & Global orchestrator
    ├── index.css               # Global styling, Inter font imports, & Tailwind v4
    ├── main.tsx                # Client React mounter entry point
    ├── simulation.ts           # Client mock lead creation & triggers simulation script
    ├── types.ts                # TypeScript strict interface contracts and domain definitions
    │
    ├── components/             # Reusable UI component modules
    │   ├── AttendanceMatrixDashboard.tsx # Real-time live team synchronized allocation table
    │   ├── CRMLeadHub.tsx      # Main layout for Lead Inquiries, Kanban and allocation logs
    │   ├── ClientEstimatePortal.tsx # Customer-facing cost calculator & design quotes
    │   ├── DailyLogView.tsx    # Daily site construction activity diary logs
    │   ├── DashboardSummaryCard.tsx # KPI display tiles
    │   ├── DashboardView.tsx   # Construction & general site financials dashboard
    │   ├── EstimatesView.tsx   # Material-wise site estimations panel
    │   ├── LeadsView.tsx       # Standard project inquiries view (legacy)
    │   ├── MaterialsView.tsx   # Site material inventory stock card
    │   ├── MobileLeadCard.tsx  # Optimized touch-friendly card with lifecycle status dropdowns
    │   ├── Navigation.tsx      # Persistent modular sidebar navigations
    │   ├── OnboardingWizard.tsx # Multi-step company profiles and configurations wizard
    │   ├── OrdersView.tsx      # Material purchase orders tracker
    │   ├── ProfileSettingsDropdown.tsx # Active profile manager header dropdown
    │   ├── PropertyView.tsx    # Land and construction properties directory
    │   ├── SettingsPanel.tsx   # Legacy system configuration options
    │   ├── SettingsView.tsx    # Standard properties config view
    │   ├── SubscriptionDetailsCard.tsx # Pricing plans widget
    │   ├── SubscriptionGate.tsx # Feature-blocking overlay based on plan status
    │   ├── SubscriptionSimulator.tsx # Workspace billing demo widget
    │   ├── TenantProfileCard.tsx # SaaS tenant configuration card
    │   ├── TenantSettingsView.tsx # Corporate profiles and details panel
    │   └── WhatsAppTemplateEditor.tsx # Client follow-up templates layout
    │
    ├── lib/                    # Standard utilities and services wrappers
    │   ├── CRMLeadEngine.ts    # Sequential round-robin allocator and WhatsApp dispatch
    │   ├── firebase.ts         # Client Firebase Firestore API initializer
    │   └── whatsappLeadTrigger.ts # WhatsApp stub messenger handlers
    │
    └── utils/
        └── subscription.ts     # Active billing calculations & subscription tier utility
```

---

## 3. Runtime Applications

1.  **Frontend SPA**: A single-page application built on **React 19.0.1**, using **Tailwind CSS 4.1.14** for modular styles, styled animations from **motion 12.23.24**, and interactive telemetry charting powered by **recharts 3.9.0**.
2.  **Backend Express API Proxy**: A custom **Node.js + Express 4.21.2** REST application layer acting as an API proxy and integration gateway to manage disk-based mock databases and integrate with Google Gen AI server-side.

---

## 4. Application Entry Points

### Frontend:
*   **Static HTML Frame**: `/index.html` - The central template hosting the root element `<div id="root">`.
*   **React App Bootstrapper**: `/src/main.tsx` - Mounts the `<App />` component in strict mode with standard HTML DOM linking.
*   **Global Layout Orchestrator**: `/src/App.tsx` - Controls app-wide states (such as active SaaS subscriptions, user authorization modes, sidebar routes, and data synchronization).

### Backend:
*   **Server Entry point**: `/server/index.ts` - Binds on port `3000` and host `0.0.0.0`. In development mode, it initializes Vite in middleware mode (`createViteServer`) to route static resources and enable seamless hot asset mapping. In production mode, it serves static files out of `dist/` and acts as a single web server.

---

## 5. Frontend Architecture

*   **View-Based SPA Hierarchy**: Navigation is handled internally via sidebar navigation state in `App.tsx` (switching between Tabs like `"dashboard"`, `"leads"`, `"estimates"`, `"materials"`, `"orders"`, `"properties"`, and `"settings"`).
*   **Style Framework**: Tailwind CSS Version 4 loaded through `@tailwindcss/vite` plugin. Utilizes custom global typography bindings declared in `src/index.css` (primary font is Google Font *Inter*, displayed alongside *JetBrains Mono* for analytical metrics).
*   **Unified Model Contracts**: Types are strictly declared under `/src/types.ts` for SaaS settings, profile cards, properties, and lead entries.
*   **State & Sync Management**: Frontend triggers standard state handlers (`useState`, `useEffect`) directly tied to Firebase Auth. When logged in, it pulls parallel promises from Firebase Firestore subcollections, syncing updates automatically. When unlogged (local guest mode), it falls back to polling `/api/db` REST routes.

---

## 6. Backend Architecture

*   **API Framework**: Standard Express Node.js router with JSON request parsers.
*   **REST Surface Layout**:
    *   `/api/db` [GET]: Pulls active content of `db.json` from disk.
    *   `/api/db` [POST]: Stores the modified data state payload into `db.json`.
    *   `/api/voice-to-khata` [POST]: Converts Mixed-language (Hinglish/Punjabi) text logs into a mapped ledger object utilizing the Gemini model, saving it into disk data.
    *   `/api/auto-match` [POST]: Coordinates buyer records against properties using maps grounding to construct high-conversion sales pitches.
    *   `/api/ai/dashboard-summary` [POST]: Generates natural language CFO-style summaries of monthly site positions.

---

## 7. Current Persistence Architecture

The current codebase maintains a **dual-path persistence model**:

```text
               ┌───────────────────────┐
               │    React App Client   │
               └───────────┬───────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      [Authenticated]              [Unauthenticated]
             │                           │
  Direct Firestore SDK            REST API Proxy
             │                           │
  ┌──────────┴──────────┐         ┌──────┴──────┐
  │ Firestore Database  │         │  db.json    │
  │ (companies/ {uid} /)│         │ (Filesystem)│
  └─────────────────────┘         └─────────────┘
```

1.  **Google Firestore (Direct Client-Side Link)**: When a user authenticates (via Firebase auth), the frontend bypasses Express for database state management, loading and syncing documents directly from Firestore subcollections grouped under standard tenant-isolated paths: `companies/{companyId}/{subcollection}` (e.g. `companies/owner-1/profiles/ak-1`).
2.  **Filesystem JSON (`db.json` / Express Proxy)**: When unauthenticated or on Firestore load failures, the frontend makes standard fetch calls to `/api/db`. The server service `/server/services/database.ts` reads/writes the full state object synchronously via `fs.readFileSync` and `fs.writeFileSync`.

---

## 8. External Services

1.  **Google Gemini API**: Accessed using the modern `@google/genai` (v2.4.0) TypeScript SDK on the server-side. Coordinates with `gemini-3.5-flash` with a built-in fallback redirect to `gemini-3.1-flash-lite` if transient quota issues or rate limit exhaustions occur.
2.  **Google Maps Grounding (Gemini Tool Integration)**: Utilizes Google Search/Maps grounding via `tools: [{ googleMaps: {} }]` to enrich matched properties pitches with Mohali/Kharar real-world landmarks, nearby roads, and routing connectivity.
3.  **Firebase Core Services**: Loaded on the frontend to manage authentication and cloud data persistence.
4.  **Meta Graph API (Simulated WhatsApp Gateway)**: Integrated in `CRMLeadEngine.ts` and `whatsappLeadTrigger.ts` using mock endpoints and stubbed authorization headers (`Bearer EAAXXFakeToken...`) inside fetch requests to simulate notifications to customers.

---

## 9. Current Domain Modules

1.  **SaaS Tenant & Billing Engine**: Handled via `SubscriptionDetailsCard`, `SubscriptionGate`, `SubscriptionSimulator`, and `src/utils/subscription.ts` to manage plans and feature toggles based on fake billing simulations.
2.  **Construction Estimations & Client Portal**: Cost calculations based on materials list config files and shared client snapshots (`ClientEstimatePortal.tsx`).
3.  **Live Operations Hub**: Integrates `AttendanceMatrixDashboard` showing live status allocations, and `CRMLeadHub` displaying active inquiries pipelines.
4.  **Core Project Inquiries / Leads**: Tracking basic lead forms, source entries (Manual, Meta Ads, Web Hooks), and sequential allocation engines.

---

## 10. Existing Test Coverage

*   **Test Engines**: None. No automated unit, integration, or end-to-end test runners (e.g. Vitest, Playwright, Jest) are installed.
*   **Type Coverage**: Fully declared type contracts under `src/types.ts` checked via TypeScript compiler (`tsc --noEmit`).

---

## 11. Build and Run Commands

All commands are defined under `package.json` scripts:

*   `npm run dev`: Fires Node.js Express server on port `3000` via `tsx` TypeScript executor (Vite loaded as middleware for hot resource mapping).
*   `npm run build`: Dual compilation step:
    1. Compiles client static assets via `vite build` to `/dist/`.
    2. Bundles Node.js server scripts into a self-contained, minimized CommonJS file `dist/server.cjs` via `esbuild`.
*   `npm run start`: Launches compiled backend bundle: `node dist/server.cjs`.
*   `npm run clean`: Cleans active temporary runtimes: `rm -rf dist server.js`.
*   `npm run lint`: Conducts strict TypeScript compilation and type checks: `tsc --noEmit`.

---

## 12. High-Risk Files

| File Path | Total Lines | Risk Factors | Impact on BuildEstimate BOS Migration |
| :--- | :--- | :--- | :--- |
| **`/src/App.tsx`** | 1,322 | Huge size; heavily bloated. Mixes client-side state routing, tabs UI rendering, client Firebase auth syncing, Firestore collections mapping, and reset operations. | Highly prone to token cut-offs or compilation failures. Needs to be split into logical sub-routes, services, and domain components. |
| **`/src/components/CRMLeadHub.tsx`** | 1,031 | Large container layout managing lead metrics computations, inline kanban drawers, logs tables, and attendance list bindings. | Multi-concern complexity. Requires separation into clear visual pages and dedicated custom hooks for leads queries. |
| **`/server/routes/ai.ts`** | 374 | Mixes database operations (direct `readDb` / `writeDb` mutations inside router files) with Gemini model prompt constructions. | Directly violates the *Thin Controller/Router* constraint. Leads to data leakage and bypassed business rules. |
| **`/src/components/MobileLeadCard.tsx`**| 415 | Multi-concern card representing a single lead, housing call states, WhatsApp launchers, status updates, and logging. | Violates separation of UI representation from state mutations. High refactoring complexity. |

---

## 13. Architecture Conflicts with BuildEstimate BOS Target

| Core Domain Item | Current Prototype State | Target BOS Production Standard | Architectural Conflict |
| :--- | :--- | :--- | :--- |
| **Authoritative DB** | Dual-Sync: Direct client-side Firestore access AND local filesystem `db.json` proxy. | **Single Source of Truth**: Relational **PostgreSQL** database managed using **Drizzle ORM**. | Direct Firestore queries bypass backend verification. Filesystem writes risk lock failures, concurrency corruptions, and lack transactional guarantees. |
| **Business State Mutations** | Client-driven: Client components update fields directly (e.g. status dropdown in `MobileLeadCard.tsx` calling `onUpdate`) and write updated database records. | **Server-Authoritative Rules**: Only explicit business commands allowed via API routes (e.g., `/api/v1/opportunities/:id/book`). | Client-side updates bypass safety checks, stage transition validations, and optimistic concurrency. |
| **Tenant Isolation** | Client-orchestrated: React code appends `tenant_id` and performs queries using client-supplied IDs. | **Cryptographically Secure Isolation**: Derived exclusively on the server from authenticated context tokens. | High risk of cross-tenant data leakage if client requests manipulate URL parameters or payloads. |
| **Domain Definitions** | Mapped as a single flat `crm_leads` table storing state, logs, and followups. | Relational breakdown: Separated `contacts`, `opportunities`, `lead_events`, `next_actions`, etc. | Mixing contacts identity with specific commercial opportunities prevents multi-project journeys and triggers duplicate anomalies. |
| **Next-Action Enforcement** | Optional: Next followup fields are unstructured text fields inside lead models. | Strict Operational Invariants: Every active Opportunity **must** have exactly **one** pending `next_action` record. | High risk of lead leakage when agents close calls without recording outcomes and future appointment targets. |

---

## 14. Unknowns Requiring Further Investigation

1.  **Identity/Auth Integration Scheme**: The prototype currently uses Firebase Auth directly in the client. The target BOS standard calls for a *"Managed Identity Provider"* with Token Verification middleware on the server to resolve user contexts. The concrete migration strategy from standard Client SDK Auth checks to a server token wrapper requires detailed analysis.
2.  **Active Tenant Database Schemas**: Mapping existing attributes of unstructured prototype columns to strict Zod and PostgreSQL fields without breaking current pilot data.
3.  **Local Database Simulation**: Coordinating local tests with a mock relational PostgreSQL database setup in the container environment.
