# Current API and Integration Audit Report (AUD-004)
## BuildEstimate BOS — Real Estate Lead Operations System

- **Task ID**: AUD-004
- **Task Name**: Current API and Integration Audit
- **Current Time**: 2026-07-08
- **Status**: COMPLETE
- **Target File**: `docs/current-state/API-INTEGRATION-AUDIT.md`

---

## 1. Executive Summary

This audit establishes a rigorous, evidence-backed inventory of every backend API endpoint, external service integration, authentication boundary, browser-direct dependency, webhook path, AI route, and simulated integration currently active in the **BuildHub** repository.

### Key Findings
1. **Dual-Path Security Disconnection**: 
   * **Authenticated Path**: Authenticated users write business state directly from the React frontend to Firebase Firestore. Security rules are enforced via client-side queries and `/firestore.rules`.
   * **Unauthenticated/Guest Path**: Guest and local-fallback flows interact with a global, unauthenticated `/api/db` Express API endpoint. This endpoint overwrites a shared `db.json` file in bulk without any security controls, user boundaries, or tenant validation.
2. **Missing Server-Side Token Verification**: The Express backend is completely blind to Firebase Authentication. The backend serves client requests on `/api/db` and `/api/*` without checking for an ID token, validating tenant membership, or applying role-based access control.
3. **Simulated Meta Graph / WhatsApp Integrations**: Outbound WhatsApp notifications are performed **directly from the client browser** using raw `fetch` calls to a mock Meta API endpoint with a hardcoded, fake Bearer token. This design poses a high security risk of token/data exposure if moved to production.
4. **State-of-the-Art Gemini API Integrations**: The backend features elegant, highly resilient Express endpoints wrapping the modern `@google/genai` SDK. These include:
   * Real-time multilingual speech transaction parsing (Voice-to-Khata).
   * Intelligent buyer-inventory matching with real-time **Google Maps Grounding** (extracting verified neighborhood landmarks and customer review links).
   * CFO-level dashboard analytical summary generator.
   * All three AI endpoints feature a dual-layered fallback architecture (handling missing credentials, transient demand spikes, and daily free-tier quota limits gracefully with smart local matching).

---

## 2. Backend Server Architecture

The backend of BuildEstimate BOS is built as a TypeScript-based full-stack Express server that integrates seamlessly with Vite for development and serves static single-page assets in production.

### Core Architecture Components

* **Entry Point**: `server/index.ts`
  * Runs an Express server listening on `PORT = 3000` and host `0.0.0.0`.
  * Configures JSON parsing middleware: `app.use(express.json())`.
  * Integrates two modular sub-routers:
    ```typescript
    app.use("/api/db", dbRouter); // server/routes/db.ts
    app.use("/api", aiRouter);   // server/routes/ai.ts
    ```
* **Vite Dev Server Integration**:
  * In development mode (`process.env.NODE_ENV !== "production"`), mounts Vite's middleware in `middlewareMode` with `appType: "spa"`, enabling Hot Module Replacement support and asset routing directly from the server.
  * In production, serves static compiled client files from the `/dist` directory, using a wildcard routing fallback (`app.get("*")`) pointing to `dist/index.html` to support client-side SPA routing.
* **Server Tooling & Bundling**:
  * **Development**: Executed directly via `tsx` (TypeScript Execute) to run typescript files without separate build loops.
  * **Production**: Bundled using `esbuild` as a single, self-contained CommonJS output file at `dist/server.cjs` (resolving relative paths and bypasses complex ES module imports), paired with frontend builds pointing to `/dist` static files.

### Server-Side Environment Dependencies
* **Required Variable**: `GEMINI_API_KEY` (referenced in `server/services/gemini.ts` line 8). Used to authenticate requests with the Google GenAI service.
* **Fallback Behavior**: If `GEMINI_API_KEY` is not defined or equals `"MOCK_KEY"`, the server activates a local, offline simulation fallback mode for all AI features.

---

## 3. API Endpoint Inventory

The Express server defines five distinct endpoint paths.

### 1. GET `/api/db`
* **Route Implementation**: `server/routes/db.ts` (lines 7–9)
* **Description**: Reads the current database state from the local `db.json` filesystem store.
* **Request Format**: None (Query parameters ignored)
* **Success Response (200 OK)**:
  * Content-Type: `application/json`
  * Body: `DatabaseState` object (mapped from `src/types.ts`), which contains:
    * `profiles`: User/staff array
    * `clients`: Mapped clients array
    * `projects`: Projects/estimating tracks
    * `properties`: Real estate property listings
    * `leads`: Legacy sales opportunities
    * `crm_leads`: Live CRM opportunities
    * `tenant_profiles`: Tenant company metadata
    * Legacy operational tables (`daily_payments`, `material_stocks`, `vendors`, etc.)
* **Mock/Fallback Behavior**: If `db.json` does not exist on disk, the system writes the default seeded structure (`defaultState` defined in `server/services/database.ts` lines 8–40) to disk and returns it.
* **Authentication/Security**: **NONE**. Accessible by anyone without an ID token or API key.

### 2. POST `/api/db`
* **Route Implementation**: `server/routes/db.ts` (lines 11–15)
* **Description**: Receives a full database state payload in bulk and writes it directly to `db.json`.
* **Request Format**:
  * Content-Type: `application/json`
  * Body: Full `DatabaseState` object (replaces previous state entirely).
* **Success Response (200 OK)**:
  * Content-Type: `application/json`
  * Body: `{ success: true, state: DatabaseState }`
* **Mock/Fallback Behavior**: Overwrites disk file immediately using `fs.writeFileSync`.
* **Authentication/Security**: **NONE**. Represents a severe data-override vulnerability since any unauthenticated browser can issue a `POST` and overwrite the entire corporate system of record.

### 3. POST `/api/voice-to-khata`
* **Route Implementation**: `server/routes/ai.ts` (lines 10–164)
* **Description**: Receives a speech-to-text phrase of a site expense transaction (often in Hinglish/Punjabi) and parses it into a structured operational `DailyPayment` transaction ledger row.
* **Request Format**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "phrase": "Paid shuttering labor wages 12500",
      "projectId": "pr-3" // Optional, defaults to "pr-3" if omitted
    }
    ```
* **Success Response (200 OK)**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "payment": {
        "id": "dp-1718290201292",
        "project_id": "pr-3",
        "amount": 12500,
        "paid_by": "Supervisor Amit",
        "remarks": "Paid shuttering labor wages",
        "category": "Labor",
        "date": "2026-07-08, 11:30:00 AM"
      },
      "isMock": false
    }
    ```
* **AI Fallback Mode**:
  * Triggers if the `GEMINI_API_KEY` is missing/mock, OR if real-time generation fails (such as quota exhaustion 429 or service unavailability 503).
  * Implements regular expression matches and phrase keyword scanning on `phrase`:
    * Matches digits (`/\d+/g`) to determine transaction `amount`.
    * Searches for `"cement"`, `"material"`, `"bori"` -> assigns category `"Materials"`.
    * Searches for `"labor"`, `"wage"`, `"shuttering"`, `"plumber"` -> assigns category `"Labor"` or `"Miscellaneous"`.
    * Returns response with `"isMock": true` and saves structural fallback record directly to `db.json`.
* **Authentication/Security**: **NONE**.

### 4. POST `/api/auto-match`
* **Route Implementation**: `server/routes/ai.ts` (lines 167–278)
* **Description**: Matches a buyer's property preferences against current listings in `db.json` and uses Gemini with **Google Maps Grounding** to produce a WhatsApp marketing pitch.
* **Request Format**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "clientName": "Karamjeet Singh",
      "propertyType": "Villa",
      "preferredLocation": "Kharar",
      "maxBudget": 7500000
    }
    ```
* **Success Response (200 OK)**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "matches": [ { "id": "prop-1", "title": "Premium 3 BHK Kharar Villa", ... } ],
      "pitch": "Hi Karamjeet! I found a perfect option matching your requirement...",
      "encodedPitch": "Hi%20Karamjeet%21...",
      "mapsLinks": [
        {
          "title": "View Kharar, Mohali on Google Maps",
          "uri": "https://www.google.com/maps/place/..."
        }
      ]
    }
    ```
* **AI Fallback Mode**:
  * Triggers upon API key validation failure or connection error.
  * Employs standard local state template matching. Pre-formats a generic marketing message using variables like `clientName`, matched property `title`, and its target selling price (formatted as Indian lakhs, e.g., `"₹75.0 Lakh"`).
  * Returns maps links pointing to a static web search query: `https://www.google.com/maps/search/?api=1&query={location}`.
* **Authentication/Security**: **NONE**.

### 5. POST `/api/ai/dashboard-summary`
* **Route Implementation**: `server/routes/ai.ts` (lines 280–371)
* **Description**: Generates a natural language analytical CFO executive summary (exactly 3 to 4 sentences long) of the company's monthly financial net position and operational site health.
* **Request Format**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "projects": [ ... ],
      "inbound_revenues": [ ... ],
      "daily_payments": [ ... ],
      "office_expenses": [ ... ],
      "vendors": [ ... ]
    }
    ```
* **Success Response (200 OK)**:
  * Content-Type: `application/json`
  * Body:
    ```json
    {
      "summary": "Your net position this month is ₹4.2L positive. Sector-85 Construction is 60% complete and runs within expected budget. Suppliers are fully managed with active channels.",
      "isMock": false
    }
    ```
* **AI Fallback Mode**:
  * Calculates financial states in local JavaScript code: `Net Position = Revenues - (Payments + Office Expenses)`.
  * Generates a template-based summary using raw string concatenation based on the computed numeric balances, ensuring that the frontend receives a professional report even when offline.
* **Authentication/Security**: **NONE**.

---

## 4. External Services & Third-Party Integrations

BuildEstimate BOS integrates three primary external service APIs, combining server-mediated workflows with client-direct calls.

### 1. Google Gemini Pro API (Server-Side)
The server communicates directly with the Google GenAI service using the official TypeScript library: `@google/genai`.

```typescript
// server/services/gemini.ts
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

* **Target Models**: Primary calls are routed to `"gemini-3.5-flash"`.
* **Resiliency & Retry Matrix**:
  * Configured in `server/services/gemini.ts` (lines 26–97).
  * **Transient Errors**: Catches server busy codes (`429`, `503`, `"UNAVAILABLE"`) and performs up to 2 sequential retries with exponential backoff delay intervals (`2500ms`, `5000ms`).
  * **Model Fallback**: If retries on the primary model are exhausted, it attempts execution with `"gemini-3.1-flash-lite"`.
  * **Quota Tracking**: Explicitly checks exception codes for `"RESOURCE_EXHAUSTED"` or `"QUOTA EXCEEDED"`. Once hit, it sets `dailyQuotaExceeded = true` to skip future API round-trips and fall back immediately to local client-side calculators.

### 2. Google Maps Grounding API (Server-Side)
The property-matching engine utilizes Gemini's built-in Search and Maps Grounding capability.
* **Activation**: Enabled by attaching the `googleMaps` tool configuration to the API call inside `server/routes/ai.ts` (line 212):
  ```typescript
  const response = await generateContentWithRetry({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }]
    }
  });
  ```
* **Response Processing**: 
  * Parses `response.candidates[0].groundingMetadata.groundingChunks` (lines 219–240).
  * Extracts verified location details (`chunk.maps.title`, `chunk.maps.uri`).
  * Searches for embedded customer review snippets (`chunk.maps.placeAnswerSources.reviewSnippets`) to extract review links.
  * Returns deduplicated map references directly to the property-matching card in the client UI.

### 3. Meta Graph API / WhatsApp Business API (Client-Side Simulation)
Outbound automated sales communications are triggered directly from the user's browser, simulating integration with Meta Cloud API.

* **Target Endpoint**: `https://graph.facebook.com/v17.0/105954558954321/messages`
* **HTTP Method**: `POST`
* **Trigger Interfaces**:
  * `CRMLeadEngine.dispatchWhatsAppStubs` (`src/lib/CRMLeadEngine.ts` lines 99–215): Fired upon assigning an inquiry to a telecaller.
  * `whatsappLeadTrigger.triggerWhatsAppNotifications` (`src/lib/whatsappLeadTrigger.ts` lines 13–128): Fired during lead intake webhook simulation.
* **Credentials**: Dispatched with a hardcoded, fake bearer token header:
  ```json
  "Authorization": "Bearer EAAXXFakeTokenForMockingBOSInquiries778899"
  ```
* **Request Body Payload**:
  ```json
  {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "RECIPIENT_PHONE_NUMBER",
    "type": "text",
    "text": {
      "preview_url": true,
      "body": "Personalized marketing content..."
    }
  }
  ```
* **Fault Tolerance**: Contains a `.catch()` interceptor block. If the local container or network fails to reach the raw Facebook IP range, it traps the exception, intercepts the error, and returns a mock success payload (`{ ok: true, json: ... }`) containing mock message IDs (`mock-telecaller-msg-303`, `mock-buyer-msg-404`) to prevent UI lockups.

---

## 5. Client-Side Browser Service Dependencies

The client-side single-page application interacts with external services and handles public sharing links directly.

```
                  +----------------------------------------------+
                  |               React Frontend                 |
                  +-------+--------------------+-------------+--+
                          |                    |             |
       Direct Auth Calls  |  Direct Firestore  |  REST API   |   Simulated Outbound
                          v  Subcollection     v  Requests   v   WhatsApp messages
                  +-------+-------+     +------+---+   +-----+----+     +---------+
                  | Firebase Auth |     | Firebase |   | Express  |     |  Meta   |
                  | (Google Auth) |     |Firestore |   | Backend  |     |  Graph  |
                  +---------------+     +----------+   +----------+     +---------+
```

### 1. Firebase Authentication & Google Sign-In
* **SDK Module**: `firebase/auth`
* **Initialization Location**: `src/lib/firebase.ts` (lines 17–22)
* **API Objects**:
  * `auth`: Created using `getAuth(app)`.
  * `googleProvider`: Instance of `GoogleAuthProvider` configured with `googleProvider.setCustomParameters({ prompt: "select_account" })`.
* **Login & Logout Handlers**:
  * `handleSignIn`: Located in `src/App.tsx` (lines 398–406). Triggers the Google single-sign-on overlay using `signInWithPopup(auth, googleProvider)`.
  * `handleSignOut`: Triggers standard session sign-out via `signOut(auth)`.
* **Session Mapping**: Listening to auth state changes:
  ```typescript
  // src/App.tsx line 187
  onAuthStateChanged(auth, async (currentUser) => { ... })
  ```
  Saves the user session context directly inside client-side state. The user's unique Firebase authentication identifier (`currentUser.uid`) is mapped directly as the system-wide isolation variable `companyId` (acting as the tenant ID).

### 2. Browser-Direct Firebase Firestore
* **SDK Module**: `firebase/firestore`
* **Initialization Location**: `src/lib/firebase.ts` (line 25)
* **Direct Read Operations**:
  * On login, the React client pulls collection structures in parallel directly from Firestore (lines 196–240 in `src/App.tsx`):
    ```typescript
    const colRef = collection(firestoreDb, "companies", companyId, col.path);
    const q = query(colRef, where("tenant_id", "==", companyId));
    const snap = await getDocs(q);
    ```
  * Collections loaded via parallel promises include: `profiles`, `clients`, `projects`, `properties`, `leads`, `daily_payments`, `inbound_revenues`, `vendors`, `purchase_orders`, `material_stocks`, `office_expenses`, `deal_adjustments`, `alerts`, `tenant_profiles`, `crm_leads`, and `construction_inquiries`.
* **Direct Write Operations**:
  * React bypasses any secure API intermediary when updating CRM states, writing directly via Firestore document hooks (lines 170–183 in `src/App.tsx`):
    ```typescript
    const docRef = doc(firestoreDb, "companies", currentTenantId, subcollection, id);
    await setDoc(docRef, sanitizeFirestoreData(dataWithTenant));
    ```
  * Purges are performed directly using raw `deleteDoc` batches on collections mapped from the browser (lines 284, 628, 954).

### 3. Public Estimate Sharing Path
An elegant, unauthenticated viewing path is implemented to let construction clients read estimate summaries without logging in.
* **Link Structure**: Generated as `/?share=ps-{timestamp}-{random_hash}` (defined in `src/components/EstimatesView.tsx` line 446).
* **Direct Firestore Lookup**:
  * On application mount, `src/App.tsx` checks for the presence of the `?share=` URL search parameter.
  * If detected, the client queries Firestore directly on an unauthenticated path (lines 135–136):
    ```typescript
    const docRef = doc(firestoreDb, "public_estimates", shareId);
    const docSnap = await getDoc(docRef);
    ```
  * Resolves and serves the compiled estimates directly within a dedicated client-facing preview component.

---

## 6. Security & Authentication Boundary Matrix

The following matrix documents the authentication and authorization controls currently governing each logical layer of the application.

| Logical Boundary / Operation | Initiated From | Target Resource | Auth Verification Mechanism | Enforced At | Vulnerability / Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Sign-In** | React Client | Google IDP | Firebase client overlay | Client Auth SDK | **Low**. Secure OAuth flow handled by Google identity providers. |
| **Firestore Subcollection Reads** | React Client | `/companies/{companyId}/*` | `request.auth != null` & Profile role verification | `/firestore.rules` (Security Rules) | **Medium**. Relies entirely on client-side constraints. Rules block cross-tenant leakage but permit direct client deletion. |
| **Firestore Document Writes** | React Client | `/companies/{companyId}/*` | `isOwner` / `isManager` checks based on user profiles | `/firestore.rules` (Security Rules) | **Medium**. Multi-tenant isolation is enforced, but malicious authenticated users could bypass frontend guards via browser devtools. |
| **Public Estimate Reading** | Public Client | `/public_estimates/{id}` | `allow read: if true;` | `/firestore.rules` (Security Rules) | **Low**. Explicitly designed for unauthenticated consumer access. |
| **API DB Read (db.json)** | React Client | GET `/api/db` | **None** | Express Server | **Critical**. Bypasses all authentication. Any internet client can download the entire shared backup data pool. |
| **API DB Write (db.json)** | React Client | POST `/api/db` | **None** | Express Server | **Critical**. Bypasses all authorization. Any client can overwrite the global database backup with random payloads. |
| **Voice Parsing AI** | React Client | POST `/api/voice-to-khata` | **None** | Express Server | **High**. Susceptible to API rate-abuse and unauthorized cost consumption if endpoints are exposed. |
| **Buyer Matching AI** | React Client | POST `/api/auto-match` | **None** | Express Server | **High**. Exposes Maps Grounding capabilities to unauthorized users, increasing API expense risks. |
| **WhatsApp Dispatch** | React Client | POST (Meta IP) | Fake/Mock Bearer Header | Simulated Mock Code | **High**. Dispatched directly from browser. A real Meta token would be exposed to clients. |

---

## 7. Migration Strategy to PostgreSQL (BOS Target)

To transition BuildEstimate BOS from its current dual-persistence architecture to a robust, enterprise-grade relational CRM system of record, the following architectural migration path is recommended:

```
            +-----------------------------------------------------------+
            |                      React Frontend                       |
            +-----------------------------+-----------------------------+
                                          |
                                          | HTTPS Request with
                                          | Bearer ID Token
                                          v
            +-----------------------------------------------------------+
            |                    Express API Server                     |
            |                                                           |
            |  1. Intercept Token & Verify with Firebase Admin SDK     |
            |  2. Resolve and Bind Secure 'tenant_id'                   |
            |  3. Validate User's Role Authorization                    |
            |  4. Route to DB Layer via Drizzle ORM                     |
            +-----------------------------+-----------------------------+
                                          |
                                          | SQL Transaction
                                          v
            +-----------------------------------------------------------+
            |                  PostgreSQL Database                      |
            |                                                           |
            |  * Row-Level Security (RLS) bound to verified tenant_id    |
            |  * Dedicated relational schemas for CRM modules           |
            +-----------------------------------------------------------+
```

### 1. Remove Browser-Direct Database Mutations
* **Action**: Eliminate all `firebase/firestore` imports, query constructors, and direct `setDoc`, `getDocs`, and `deleteDoc` function calls from the frontend application (`src/App.tsx`, `src/components/*`).
* **Justification**: Bypassing server mediation allows client-side data manipulation, preventing consistent server-side audit logs, database transaction boundaries, and centralized validation.

### 2. Implement Server-Side Token Interception & Validation
* **Action**: 
  * Configure the React client to retrieve the Firebase ID token on every state change and attach it as a standard Authorization header:
    ```typescript
    const token = await auth.currentUser.getIdToken();
    headers: { "Authorization": `Bearer ${token}` }
    ```
  * Integrate the secure `firebase-admin` Node.js SDK on the Express server.
  * Build a centralized Authentication Middleware to intercept and verify incoming Bearer ID tokens:
    ```typescript
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    ```

### 3. Establish Multi-Tenant Context Resolution on Server
* **Action**: 
  * Never let the client pass `companyId` or `tenant_id` as part of request payloads.
  * Resolve the `tenant_id` on the server using `decodedToken.uid` (or look up their organization mapping in a relational `tenant_users` table).
  * Automatically inject this resolved `tenant_id` into all SQL queries to enforce multi-tenant isolation.

### 4. Implement Centralized Role & Mutation Validation
* **Action**:
  * Store user profiles (`user_role`) in the relational PostgreSQL database.
  * Look up the user's role on the server during the authentication step.
  * Restrict dangerous CRM mutations (such as deleting leads or altering tenant configurations) using declarative middleware:
    ```typescript
    app.post("/api/tenant-settings", requireRole(["Owner"]), settingsHandler);
    ```

### 5. Transition Storage from `db.json` and Firestore to PostgreSQL
* **Action**:
  * Establish PostgreSQL as the single, authoritative system of record.
  * Move the 17 business entities (separating the core BOS P0 CRM schema from legacy modules) into PostgreSQL tables.
  * Utilize Drizzle ORM or Prisma to run database transactions, migrations, and enforce foreign key constraints (e.g., cascade deletions of lead activity logs when a lead is removed).
  * Completely delete the unauthenticated `/api/db` route and the `db.json` file.
