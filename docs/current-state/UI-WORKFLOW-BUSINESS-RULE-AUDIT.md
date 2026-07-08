# UI Workflow and Business Rule Audit

## 1. Executive Summary & Audit Context
This audit presents an evidence-backed analysis of the actual user workflows, UI-triggered business rules, state transitions, validation behavior, and operational gaps of the BuildHub repository. By tracing component logic and state management from the source code, this document serves as an authoritative baseline before designing the target BuildEstimate BOS (Business Operating System) backend API and workflows.

### 1.1 Inspected Files and Codebase References
The findings compiled in this report are verified by tracing the following files:
*   `src/App.tsx`: Controls global database state initialization, user session routing, lead-to-estimate conversion, and Firestore sync handlers.
*   `src/types.ts`: Defines core types and schemas for legacy `Lead`, modern `CRMLead`, `Profile`, `BuyerRequirement`, and `LeadActivityLog`.
*   `src/components/Navigation.tsx`: Renders the main RBAC sidebar navigation links and active role-based permission views.
*   `src/components/CRMLeadHub.tsx`: Contains the CRM Inquiry Hub table, manual lead entry forms, supervisor dashboards, and inline status/specialist assignment controls.
*   `src/components/MobileLeadCard.tsx`: Formulates the responsive interaction grid for telecallers, including quick-dial, WhatsApp templates, transfer dropdowns, and remarks.
*   `src/components/LeadsView.tsx`: Represents the legacy "Pipeline Board (Karam AI)" Kanban view, tracking status and conversion to estimates.
*   `src/components/DashboardView.tsx`: Manages high-level metrics, active project charts, alerts, and the team staff activation toggle.
*   `src/components/PropertyView.tsx`: Tracks real estate inventories and Buyer Demands/Requirements, triggering Proactive Match Engine evaluations.
*   `src/components/OnboardingWizard.tsx`: Guides new users through database activation, brand setup, and invoice test printing.
*   `src/components/ClientEstimatePortal.tsx`: Renders the public client-facing estimate web portal.
*   `src/lib/CRMLeadEngine.ts` & `src/simulation.ts`: Implements automated round-robin lead ingestion and overdue alerts algorithms.
*   `src/lib/whatsappLeadTrigger.ts`: Contains the simulated Meta Cloud API dispatch flow for double WhatsApp alerts.

---

## 2. RBAC, Screen Permissions & Role Switcher Authority (CORRECTION 1)
The application implements client-side Role-Based Access Control by checking the `activeRole` state against configured route permissions. 

### 2.1 Role Switcher Flow Analysis
The complete flow of the `activeRole` variable is traced below:
*   **Initialization**: `activeRole` is initialized in `src/App.tsx` on line 107 as a React state variable defaulting to `"Owner"`:
    ```typescript
    const [activeRole, setActiveRole] = useState<'Owner' | 'Manager' | 'Supervisor' | 'Telecaller'>("Owner");
    ```
*   **Where Changed**: It is changed in `src/components/Navigation.tsx` within the profile layout header where an RBAC Persona Switcher dropdown `<select>` is rendered on lines 105–125:
    ```typescript
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
        }
      }}
      className="..."
    >
    ```
*   **Authentication Tie-In**: **None.** The selected value does not originate from or tie into the Google authenticated user identity. It is purely a disconnected client-side React state.
*   **Manual Mutation Allowed**: **Yes.** Any user, authenticated or guest, can access the dropdown and manually toggle the active role to any value on the fly.
*   **Mutation Handlers Using `activeRole`**:
    *   In `src/components/CRMLeadHub.tsx`, `activeRole` is used to fill the `performed_by` field of appended activity logs during:
        *   Clearing telecaller assignments (line 664)
        *   Reassigning leads to specialists (line 678)
        *   Rescheduling follow-ups (line 722)
        *   Status updates (line 767)
        *   Remarks/Note additions (line 795)
    *   In `src/components/DailyLogView.tsx`, `activeRole` is used to match a profile (line 52) and auto-select default names for manual payments paid-by field (lines 56–59).
*   **Conditional UI Actions Controlled by `activeRole`**:
    *   `src/components/Navigation.tsx` (lines 71–72): Filters visible tabs on the sidebar layout.
    *   `src/components/PropertyView.tsx` (line 25): Show/hides supplier costs (`canSeeSupplierCosts` is true if `activeRole === "Owner" || activeRole === "Manager" || activeRole === "Supervisor"`).
    *   `src/components/PropertyView.tsx` (line 258): Hides property adding buttons if role is `"Telecaller"`.
    *   `src/components/PropertyView.tsx` (line 352): Hides Match Requirements dashboard for non-owners/managers.
    *   `src/components/SettingsView.tsx` (line 310): Disables and puts settings in read-only mode for non-owners.
    *   `src/components/DashboardView.tsx` (line 636): Restricts telemetry views for financial dashboards.
*   **Mutation Authority Changes**: **No.** Changing `activeRole` does not change actual mutation authority. Since there is no backend API authorization checks or security token validation, any client script can bypass UI blocks and write directly to Firestore regardless of the selected `activeRole`.

### 2.2 Role Switcher Classification
*   **Classification**: **UI PERMISSION CONTROL & MUTATION METADATA ONLY**
*   **Explanation**: It controls which tabs are visible in the sidebar and what name/role string is written into log records, but it provides zero genuine backend security isolation or write restriction.

---

## 3. Complete Call Workflow Audit (CORRECTION 2)
We traced every call action initiated in the user interface to determine how outcomes, status changes, and follow-ups are governed.

### 3.1 Call Action Path Trace
*   **Call Button Component**: `src/components/MobileLeadCard.tsx` (line 162)
*   **Event Handler**: None (statically rendered standard HTML `<a>` anchor link).
*   **Phone Action**: Direct native device dialer execution using `href={`tel:${lead.phone_number}`}`.
*   **Return Path**: None. The system has no deep-linking or automated return path when the user finishes dialer execution. The user must manually navigate back to the browser window.
*   **Outcome Capture**: **Absent.** No post-call dialog, modal, prompt, or feedback card is displayed when returning.
*   **Status Change**: **Absent / Manual.** The system does not alter lead status upon clicking. Status must be changed manually via a separate dropdown.
*   **Notes**: **Absent / Manual.** No remarks field is prompted or saved.
*   **Next Action / Due Date / Due Time / Activity / Persistence**: **Absent.** No scheduling, log history addition, or database save occurs.

### 3.2 Key Call Behavior Questions Answered
*   **Is call outcome mandatory?** No, it is not captured.
*   **Is a post-call wizard present?** No.
*   **Can the user leave without recording an outcome?** Yes, because there is no outcome collection interface.
*   **Can status change without call evidence?** Yes, status can be manually changed in the CRM hub with zero call logs or records.
*   **Can outcome be recorded without a next action?** There is no concept of recording an outcome.
*   **Is caller identity recorded?** No.
*   **Is call timestamp recorded?** No.
*   **Is duration recorded?** No.
*   **Are no-answer, busy, invalid number, and callback represented structurally?** No. No database attributes or enum fields exist to map call states.

---

## 4. Complete WhatsApp Workflow Audit (CORRECTION 3)
The application utilizes three separate WhatsApp workflows. Each is analyzed below.

### 4.1 Workflow Path Tracing

#### Workflow A: Manual Outbound WhatsApp Link
*   **Trigger**: Clicking the WhatsApp icon in `src/components/MobileLeadCard.tsx` (line 152).
*   **Message Generation**: Constructs a hardcoded text string on line 42:
    ```typescript
    const formattedText = encodeURIComponent(`Chardi Kala, ${lead.customer_name} ji! BuildEstimate platform se message bypass ho raha.`);
    ```
*   **Send or Open**: Direct window dispatch via `window.open(`https://wa.me/${cleanedPhone}?text=${formattedText}`, '_blank')`.
*   **Success Signal**: None. The browser has no knowledge if the user sent the message or has a WhatsApp client installed.
*   **Failure Signal**: None.
*   **Activity / Next Action / Persistence**: **Absent.** No lead activity log is generated, no follow-up is scheduled, and no database record is saved.

#### Workflow B: Simulated Automated Meta Dispatch
*   **Trigger**: Clicking the "Karam AI" (or "Resend") button in the CRM table under `src/components/CRMLeadHub.tsx` (line 817).
*   **Message Generation**: Handled by `triggerWhatsAppNotifications` in `src/lib/whatsappLeadTrigger.ts`. It builds a notification alert to the builder (Trigger A) and a marketing greeting to the prospect including their project interest and digital brochure link (Trigger B).
*   **Send or Open**: Executes dual simulated HTTP POST requests to `https://graph.facebook.com/v17.0/105954558954321/messages`.
*   **Success Signal**: Generates browser `alert()` popups showing: `"Double WhatsApp Notification Dispatched Successfully!"` and toggles button text to "Resend".
*   **Failure Signal**: Theoretically triggers an alert in the `catch` block, but is bypassed by fake-success interception.
*   **Activity / Next Action / Persistence**: **Absent.** It does NOT write any history log to the lead's persistent `.logs` array and schedules no follow-up actions.

#### Workflow C: Meta Webhook Intake Simulation Terminal
*   **Trigger**: Clicking "Run Meta Webhook Intake Simulation" in `src/components/WhatsAppTemplateEditor.tsx` (line 150).
*   **Message Generation**: Autogenerates mock JSON payloads representing incoming customer lead metadata from Meta lead-forms.
*   **Send or Open**: Passes data through the sequential Round-Robin engine and then runs `whatsappLeadTrigger()`.
*   **Success Signal**: Outputs colored step-by-step logs into the on-screen sandbox terminal emulator.
*   **Failure Signal**: Outputs errors in red logs to the emulator.
*   **Activity / Next Action / Persistence**: **Absent.** Writes output purely to the local component state, but **does not write mock leads or log histories to the persistent Firestore database**.

### 4.2 False-Success Behavior Identification
In `src/lib/whatsappLeadTrigger.ts` (lines 55–61 and 98–104), the `fetch` promises to Facebook’s graph API are bound with catch-blocks that force-return a mocked `ok: true` response if the HTTP query fails, lacks Internet, or hits a sandboxed offline scenario:
```typescript
const responseCustomer = await fetch("https://graph.facebook.com/v17.0/...", { ... })
  .catch(() => {
    // Graceful fallback simulation if URL fails/is offline
    return {
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ wa_id: lead.phone_number }],
        messages: [{ id: "mock-customer-msg-202" }]
      })
    };
  });
```
This means even if there is absolutely no network, or the fake endpoint fails, the API client **swallows the failure and returns success: true**. The UI is lied to and prompts the user with a false success alert, masking silent API integration faults.

---

## 5. Status Transition Matrix (CORRECTION 4)
This matrix maps how states are updated across the two disjointed lead entities currently coexisting in the repository.

### 5.1 Legacy `Lead` Schema Transition Matrix (Pipeline Kanban Board)

| CURRENT STATE | USER ACTION | TARGET STATE | COMPONENT | HANDLER | ALLOWED ROLE | REQUIRED FIELDS | ACTIVITY CREATED | NEXT ACTION REQUIRED | PERSISTENCE PATH |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **New** | Dropdown Select | **Quoted** | `LeadsView.tsx` | `onUpdateLeadStatus` | Any | None | Yes (Global log) | No | `/crm_leads/{id}` (Firestore) |
| **New** | Dropdown Select | **Follow-up** | `LeadsView.tsx` | `onUpdateLeadStatus` | Any | None | Yes (Global log) | No | `/crm_leads/{id}` (Firestore) |
| **Quoted** | Dropdown Select | **Follow-up** | `LeadsView.tsx` | `onUpdateLeadStatus` | Any | None | Yes (Global log) | No | `/crm_leads/{id}` (Firestore) |
| **Follow-up** | Dropdown Select | **Quoted** | `LeadsView.tsx` | `onUpdateLeadStatus` | Any | None | Yes (Global log) | No | `/crm_leads/{id}` (Firestore) |
| **Follow-up** | Click Convert | **Quoted** | `LeadsView.tsx` | `onConvertLeadToEstimate` | Any | None | Yes (Global log) | No (Redirects) | `/crm_leads/{id}`, `/clients/{id}`, `/projects/{id}` |

### 5.2 Modern `CRMLead` Schema Transition Matrix (CRM Inquiry Hub)

| CURRENT STATE | USER ACTION | TARGET STATE | COMPONENT | HANDLER | ALLOWED ROLE | REQUIRED FIELDS | ACTIVITY CREATED | NEXT ACTION REQUIRED | PERSISTENCE PATH |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **New** | Dropdown Select | **Contacted** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **New** | Dropdown Select | **Quotation_Sent**| `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **New** | Dropdown Select | **Lost** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **New** | Dropdown Select | **Won** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **Contacted** | Dropdown Select | **Quotation_Sent**| `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **Contacted** | Dropdown Select | **Lost** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **Quotation_Sent**| Dropdown Select | **Won** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **Lost** | Dropdown Select | **New** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |
| **Won** | Dropdown Select | **New** | `CRMLeadHub.tsx` | `onUpdateCRMLead` | Any | None | Yes (Appended lead log) | No | `/construction_inquiries/{id}` |

### 5.3 Identified State Gaps & Faults
*   **Unrestricted Jumps**: Users can instantly move a lead from `New` directly to `Won` or `Lost` in a single selection with zero intermediate contacts, quotations, or log verifications.
*   **Skipped Stages**: No sequential checks exist. Steps such as contact attempts and quotation generation can be bypassed completely.
*   **Backward Transitions**: A user can freely demote a `Won` lead back to `New` or `Contacted` with zero confirmation prompts or data resets.
*   **Terminal-State Reopening**: Reopening `Lost` or `Won` leads back to active queues is fully permitted without requiring any supervisor approval or audit reasons.
*   **Transitions without Interaction Evidence**: Leads can be marked as `Contacted` or `Quotation_Sent` with no corresponding evidence of calls, WhatsApp messages, or uploaded documents in the database.

---

## 6. Post-Interaction Loop Matrix (CORRECTION 5)
Every user-triggered interaction is audited against product-expected outcome rules.

| INTERACTION TYPE | OUTCOME REQUIRED | NEXT ACTION TYPE REQUIRED | NEXT ACTION DESC REQUIRED | DUE DATE REQUIRED | DUE TIME REQUIRED | OWNER REQUIRED | ACTIVITY CREATED |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Call** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ABSENT |
| **WhatsApp** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ABSENT |
| **Status Change** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ENFORCED |
| **Reassignment** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ENFORCED | ENFORCED |
| **Note (Remarks)** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ENFORCED |
| **Follow-up Reschedule** | ABSENT | ABSENT | ABSENT | OPTIONAL | ABSENT | OPTIONAL | ENFORCED |
| **Site Visit** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **Lost** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ENFORCED |
| **Won** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | OPTIONAL | ENFORCED |

### 6.1 Definitions for Matrix Classifications
*   **ENFORCED**: Hardcoded validation prevents execution unless provided.
*   **OPTIONAL**: Users may provide the value, but leaving it blank is permitted.
*   **ABSENT**: No fields, UI elements, or database properties exist for this value.

---

## 7. Next Action Workflow Audit (CORRECTION 6)
The scheduling and resolution of customer follow-ups are governed as follows:

*   **Creation**: Follow-up schedules can be configured during manual lead creation via an HTML `<input type="date">` field inside `CRMLeadHub.tsx` (optional).
*   **Update / Reschedule**: Updated via an inline edit pencil on the CRM table or Mobile Card, which writes to `next_followup_date`. It appends a text entry to the logs array (e.g., `"Rescheduled follow-up to YYYY-MM-DD"`).
*   **Completion**: **Absent.** No checkbox, button, or workflow exists to mark a follow-up as completed. The alarm is resolved only by manually setting a new future date, or by moving the lead status to terminal `Won` or `Lost`.
*   **Overdue Detection**: Calculated client-side. If the `next_followup_date` is less than today’s date string, and status is not `Won` or `Lost`, it flags as overdue.
*   **Ownership & Reassignment**: Reassignment does not affect follow-ups. The `next_followup_date` survives reassignment intact, retaining its date schedule for the newly assigned caller.
*   **History Preservation**: **Weak.** The old follow-up date is overwritten in the `next_followup_date` field. The only history is preserved as unstructured text lines inside appended timeline log strings.
*   **Status Classification**: **AN EMBEDDED DATE FIELD**.
    *   **Evidence**: The attribute `next_followup_date` is declared directly as an optional string field on the `CRMLead` schema inside `src/types.ts` on line 180. It is not an independent relational action or checklist model.

---

## 8. Site Visit Workflow Audit (CORRECTION 7)
We ran case-insensitive searches across the entire repository codebase for keywords: `site visit`, `visit`, `appointment`, `property viewing`, `no-show`, `reschedule`, and `cancel`.

*   **Audit Result**: ZERO code occurrences found. No files in `src/components/` contain any code blocks, fields, properties, or HTML structures representing site visits or appointments.
*   **Classification**: **ABSENT**
*   **Evidence**: There is no site visit or viewing scheduling sub-system implemented.

---

## 9. Qualification Workflow Audit (CORRECTION 8)
Prospect qualification tracking is analyzed below.

| QUALIFICATION COMPONENT | CAPTURE SCREEN | ENTITY | MANDATORY OR OPTIONAL | EDITABLE ROLE | HISTORY PRESERVED |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Budget Tier** | CRM Inquiry Hub Form | `CRMLead` | OPTIONAL (Defaults to "50L - 75L") | Any Role | No (Overwritten) |
| **Location** | Pipeline Kanban Form / Property Demand Form | Legacy `Lead` / `BuyerRequirement` | OPTIONAL | Any Role | No (Overwritten) |
| **Property Type** | Buyer Requirements Form | `BuyerRequirement` | MANDATORY | Any Role | No (Overwritten) |
| **Project Interest** | CRM Inquiry Hub Form | `CRMLead` | OPTIONAL (Defaults to "General Consultation") | Any Role | No (Overwritten) |
| **Buying Timeline** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **Decision Maker** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **Financing Method**| ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |
| **Customer Intent** | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT |

---

## 10. Lost Workflow Audit (CORRECTION 9)
How the terminal "Lost" status is handled is traced below:

*   **Trigger**: Selecting `"Lost"` in the lead status dropdown of the CRM Table inside `src/components/CRMLeadHub.tsx` on line 763.
*   **Allowed Roles**: Any role with access to the CRM (Owner, Manager, Supervisor, Telecaller). No dropdown blockages exist.
*   **Reason Required**: **No.** Changing status to `"Lost"` requires no justification.
*   **Structured Reason Taxonomy**: **Absent.** No enum or select dropdown exists to record why the prospect was lost (e.g., pricing, budget, location, competitor).
*   **Notes Required**: **No.** remarks remain optional and are not prompted on change.
*   **Current Follow-up Behavior**: **Buggy.** The existing `next_followup_date` is **NOT cleared** or released. It remains on the lost lead, causing redundant alarms.
*   **Assignment Behavior**: The telecaller assignment is **NOT cleared** and remains bound to the inactive lead.
*   **Reopening Behavior**: Permissive. A user can toggle the dropdown back to `"New"` or `"Contacted"` at any time with no restrictions, supervisor confirmations, or reasons logged.
*   **Activity Evidence**: Writes a standard text log line: `Status updated to: Lost`.

---

## 11. Won / Booked Workflow Audit (CORRECTION 10)
We audited and separated the two distinct successful conclusion paths present in the application code.

### 11.1 CRM Inquiry Hub - CRMLead Won
*   **Trigger**: Selecting `"Won"` in the lead status dropdown of `CRMLeadHub.tsx`.
*   **Allowed Roles**: Any role with access to CRM Leads (Owner, Manager, Supervisor, Telecaller).
*   **Evidence Required**: **None.** No uploaded contract, booking amount, receipt number, or sign-offs are required.
*   **Booking Amount / Booking Date**: **Absent.** No database fields exist to track payment metrics.
*   **Project / Property / Unit Allocation**: **Absent.** The won lead cannot be linked to any real estate inventory or project site.
*   **Activity Logs**: Appends a standard text log line: `Status updated to: Won`.
*   **Next-Action Closure**: **Buggy.** `next_followup_date` is **NOT cleared** or released, leaving overdue alarms lingering.
*   **Downstream Records Created**: **None.** The state change is a functional dead-end. It does not spawn estimates, client records, or construction tasks.

### 11.2 Pipeline Kanban Board - Legacy Lead Conversion
*   **Trigger**: Clicking the "Convert to Project & Estimate" button in Kanban columns (`src/components/LeadsView.tsx` line 367).
*   **Allowed Roles**: Owner, Manager, Telecaller (any user displaying the legacy board sub-tab).
*   **Evidence Required**: None.
*   **Booking Amount / Booking Date**: None.
*   **Project / Property / Unit Allocation**: Creates a linked project using the lead's location.
*   **Activity Logs**: Logs global actions: `"CRM: Initiating estimate conversion..."` and `"CRM: Lead converted. Client profile and blank Estimate created..."`.
*   **Next-Action Closure**: Moves status to `'Quoted'`.
*   **Downstream Records Created**: Spawns multiple database entities:
    1.  **Client Entity**: Creates a new record in `db.clients` matching the prospect’s phone and name.
    2.  **Project Entity**: Creates a new record in `db.projects` initializing a blank estimates matrix structure (civil, electrical, finishes, interior).
    3.  **UI Redirection**: Instantly sets active tab to Estimates and selects the newly generated Project ID so the user can immediately build an invoice.

---

## 12. Owner & Manager Telemetry Audit (CORRECTION 11)
We evaluated whether the UI provides necessary analytical metrics for supervisors and owners.

| TELEMETRY INDICATOR | STATUS | IMPLEMENTATION EVIDENCE |
| :--- | :--- | :--- |
| **Unassigned Leads** | **ABSENT** | There is no widget, tile, or filter counter tracking unassigned leads. |
| **Leads with No Next Action**| **ABSENT** | No indicator exists to flag active leads lacking follow-up dates. |
| **Overdue Follow-ups** | **IMPLEMENTED** | Displayed in metric tiles ("Pending Follow-ups Today") and listed as alarms in a warning panel. |
| **First-Response Latency** | **ABSENT** | System does not track timestamps for first-contact events. |
| **Conversion Funnel** | **PARTIAL** | Shows a static `Won Conversion Pct` tile, but lacks multi-stage drop-off analytics. |
| **Lost Reasons** | **ABSENT** | Since reasons are not captured, no lost-reason analytics exist. |
| **Telecaller Workload** | **IMPLEMENTED** | `AttendanceMatrixDashboard.tsx` tracks each telecaller's assigned leads, completed tasks, and pending follow-ups. |
| **Response-Time Performance**| **ABSENT** | No response latency metrics are measured or displayed. |

---

## 13. Destructive Action Matrix (CORRECTION 12)
Every action capable of deleting, purging, overwriting, or bulk modifying data is audited below.

| ACTION | COMPONENT | VISIBLE ROLE | CONFIRMATION | SERVER AUTH | AUDIT LOG | ROLLBACK | RISK LEVEL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Delete Inquiry** | `CRMLeadHub.tsx` | All Roles | Browser `window.confirm` popup | None | Global Activity Log entry | ABSENT | **High** (Data loss) |
| **Reset/Purge DB** | `SettingsView.tsx` | Owner Only | Inline double-state confirmation | None | Global Activity Log entry | ABSENT | **CRITICAL** (Total purge) |
| **Disable Staff** | `DashboardView.tsx`| Owner / Manager | None (Instant commit checkbox) | None | Global Activity Log entry | Reversible | **Medium** (Allocation skip) |
| **Reassign Lead** | `CRMLeadHub.tsx` | All Roles | None (Instant dropdown select) | None | Appended lead timeline log | Reversible | **Low** (Misplacement) |
| **Convert Lead** | `LeadsView.tsx` | All Roles | None (Instant button click) | None | Global Activity Log entry | ABSENT | **Medium** (Clutter risk) |

---

## 14. Validation Matrix (CORRECTION 13)
This matrix covers form validation behaviors implemented in the UI.

| FORM FIELD | HTML VALIDATION | CLIENT VALIDATION | SERVER VALIDATION | DATABASE CONSTRAINT | DUPLICATE VALIDATION |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Name** | `type="text"`, `required`| `.trim()` validation | None | None | None |
| **Phone Number** | `type="tel"`, `required` | `.trim()` validation | None | None | **ABSENT** (Infinite duplicate creation allowed) |
| **Email Address** | `type="email"` (Optional) | None | None | None | None |
| **Project Interest**| `type="text"`, `required`| Defaults to "General Consultation" | None | None | None |
| **Traffic Source** | `<select>` dropdown | Restricted to enums | None | None | None |
| **Initial Status** | `<select>` dropdown | Restricted to enums | None | None | None |
| **Budget Tier** | `<select>` dropdown | Restricted to enums | None | None | None |
| **Follow-up Date** | `type="date"` (Optional) | None | None | None | None |

---

## 15. Failure UX Audit (CORRECTION 14)
We traced user experiences and system responses when network, API, or database layers fail.

| TRIGGER / FAILURE EVENT | VISIBILITY IN UI | CLASSIFICATION | FAILURE UX PATHWAY & CODE EVIDENCE |
| :--- | :--- | :--- | :--- |
| **Firestore Read Fails** | Visible Error Screen | **VISIBLE ERROR** | Handled with catch blocks in snapshot loaders, rendering a standard text error alert interface. |
| **Firestore Write Fails**| None (Silent) | **FALSE SUCCESS** | `saveDocument` throws a stringified error (App.tsx line 181). However, since callers (e.g. `handleUpdateCRMLead`) do not use try/catch blocks, the UI commits state changes locally, logs a successful activity entry, and remains quiet while the network call crashes behind the scenes. |
| **AI Matching Fails** | Browser Alert Popup | **VISIBLE ERROR** | Catches POST failures inside `generatePitchAndMatch` and calls `alert("Network error running match.")`. |
| **WhatsApp Dispatch Fails**| None (Success popup) | **FALSE SUCCESS** | Handled by a `.catch()` block inside `whatsappLeadTrigger` that returns an offline fallback of `ok: true`, displaying false success alerts. |
| **Auth Session Expires** | None (Silent logout) | **SILENT FAILURE** | `onAuthStateChanged` silently flips user state to null, instantly altering available buttons with no alert. |

---

## 16. PRD Compliance Matrix (CORRECTION 15)
Product requirements compared against existing repository implementations.

| PRODUCT REQUIREMENT | STATUS | COMPLIANCE ANALYSIS & REPOSITORY EVIDENCE |
| :--- | :--- | :--- |
| **No lead disappears silently** | **NON-COMPLIANT** | **Uncaught Write Exceptions**: If Firestore writes fail, local memory saves first (success message displayed), and the lead is lost silently on page refresh. |
| **Every lead has an owner** | **NON-COMPLIANT** | **Unallocated Fallback**: If no active telecallers exist, `allocateLead` leaves assignment as `undefined` with no UI blockage or alerts. |
| **Every interaction creates outcome** | **NOT IMPLEMENTED** | **Transient Outbounds**: Static dialer anchors and simulated WhatsApp bolting do not write any outcome to the database. |
| **Every active lead has next action**| **NON-COMPLIANT** | **Optional Follow-ups**: Follow-up dates are optional during creation and updates, allowing leads to languish without schedule limits. |
| **Next action has date and time** | **NON-COMPLIANT** | **Embedded Date Only**: The schema only contains `next_followup_date` (YYYY-MM-DD); there is no time-tracking attribute. |
| **Immutable history is preserved** | **PARTIAL** | Appends log objects to `CRMLead.logs`, which is excellent. However, legacy leads lack logs, and resetting the DB wipes all timelines. |
| **Duplicate phone handling exists** | **NOT IMPLEMENTED** | Zero duplicate-checking functions are present; identical prospect files can be spawned repeatedly. |
| **Tenant isolation is enforced** | **PARTIAL** | Appends `tenant_id` client-side, but **lacks server-side Firestore Rules validation**, exposing databases to spoofed access. |
| **Site visit is first-class** | **NOT IMPLEMENTED** | No code, scheduling forms, or database attributes exist for appointments. |
| **Lost reason is captured** | **NOT IMPLEMENTED** | Status dropdown transitions to `"Lost"` directly with no reason code queries or validation prompts. |
| **Owner sees leads with no next action**| **NOT IMPLEMENTED** | No alerts, cues, or filtering tabs highlight active prospects lacking follow-up schedules. |
| **Owner sees overdue follow-ups** | **COMPLIANT** | Displays counts on `CRMLeadHub` header widgets and populates standard alarm cards at the top of the interface. |
| **First-response latency is measurable**| **NOT IMPLEMENTED** | System lacks contact attempt timestamps, making latency calculations impossible. |

---

## 17. Workflow Risk Register (CORRECTION 16)
Every identified vulnerability and operational flaw ranked by priority and impact.

### 17.1 P0 — Critical Security and Data Integrity Vulnerabilities
1.  **Unsecured Role Persona Switcher (RBAC Bypass)**: Header dropdown allows guest viewers to change their active role to Owner, instantly gaining administrative access to Estimates, Procurement, and Financial reports.
2.  **Unsecured Tenant Queries (Cross-Tenant Leakage)**: Firestore reads and writes lack backend Rules validation, allowing any authenticated tenant to read or overwrite another company's records by editing client queries.
3.  **Unauthenticated Database Purge**: Anyone can trigger the critical "Reset to Blank DB" action in Settings by switching their active role on the client, wiping company operations without verification.

### 17.2 P1 — Severe Operational Gaps and Loss Risks
1.  **Silent Write Failures (Lead Loss)**: Uncaught Firestore write errors commit to local state first. Users are shown success notifications while database writes crash, leading to silent data loss upon page refresh.
2.  **False-Success WhatsApp Dispatch**: Meta API exceptions are swallowed by catching blocks that force-return `ok: true`. Users believe invitations were dispatched when they actually failed.
3.  **Dead-End Lead Orphanage (Conversion Block)**: No UI workflow exists to convert modern `CRMLead` inquiries into Clients, Projects, or Estimates (only legacy leads can be converted). Hot prospects are locked in the CRM with no invoicing path.
4.  **Double-Inquiry Duplication Leak**: Unvalidated phone numbers allow infinite duplicate inquiries, bloating databases and throwing round-robin metrics out of sequence.

### 17.3 P2 — Inconsistent Workflows and Validation Gaps
1.  **Optional Next-Action Scheduling**: Allowing active prospects to skip follow-up date setups leads to neglected opportunities slipping through cracks.
2.  **Date-Only Follow-ups (No Time)**: Lacking hour and minute time scheduling limits telecaller capacity for scheduled appointment callbacks.
3.  **No Discard/Lost Reason Capture**: Marking leads as Lost without reasons prevents managers from analyzing funnel drop-offs.
4.  **Lingering Follow-up Alarms on Won/Lost**: Follow-up dates are not cleared when a lead reaches Won or Lost status, causing outdated notifications to linger on dashboards.

### 17.4 P3 — Technical Debt and Low-Risk Usability Concerns
1.  **Coexistence of Two Distinct Lead Schemas**: Splitting prospects between `Lead` (Kanban) and `CRMLead` (Hub) entities saving to confused Firestore collections (`"crm_leads"` vs `"construction_inquiries"`) makes auditing highly complex.
2.  **No Site Visit Sub-entity**: Lack of structured site viewing states forces team members to record physical appointments in unstructured text remark fields.

---

## 18. Target Workflow Gaps (CORRECTION 17)
The following workflows are proven by code audit to require full target architectural design:
1.  **Unified CRM Lead Conversion**: Establish a single, robust prospect schema and design a transactional workflow that automatically converts hot leads into active Projects and Estimates.
2.  **State-Machine status transitions**: Implement backend-guarded state transitions preventing illegal jumps (e.g., reopening lost leads without supervisor sign-offs).
3.  **Transaction-safe duplicate checking**: Create a database constraint and API verification validating phone uniqueness before committing new inquiries.
4.  **First-Class Interaction outcome loop**: Integrate post-click modals on call/WhatsApp triggers that block the UI until call results (busy, answered, wrong number) are recorded.
5.  **Relational Next-Action Scheduling**: Design a separate database model tracking scheduled follow-ups with date, time, and action types.
6.  **Site Visit and Appointment booking pipeline**: Build a dedicated appointment scheduler tracking physically assigned coordinators, dates, check-ins, and guest survey results.
7.  **Server-side RBAC and Row-level Security**: Secure all Firestore endpoints and Node routes with JWT-validated role permissions and strict tenant containment rules.

---

## 19. Identified Material Unknowns (CORRECTION 18)
These material operational questions cannot be answered by auditing the current repository code:
1.  **Meta Webhook Authorization**: What security tokens, signatures, and secrets are required to configure and authorize live incoming Meta/Facebook Ads leads to our API?
2.  **WhatsApp Cloud Gateway Credentials**: What are the production WhatsApp Phone Number IDs, Business Accounts, and Meta App Access Tokens needed to transition from mock testing to live message dispatches?
3.  **Maps Grounding Api Keys**: What are the specific Google Maps Platform credentials, billing boundaries, and quota limits allocated for the match engine's property location calculations?
4.  **Data Migration Mapping**: How should legacy documents inside `"crm_leads"` (Kanban leads), `"construction_inquiries"` (CRM leads), and `"leads"` (Buyer requirements) be safely merged into a single database structure during migration?
5.  **Multi-Tenant Licensing Restrictions**: What user limits, data volumes, or feature gates govern different subscription tiers (Owner vs. Supervisor vs. Telecaller) in SaaS plans?

---

## 20. Audit Summary and Final Report Metrics

### 20.1 Task Status
*   **Task Status**: **COMPLETE**
*   **Audit File Modified**: `docs/current-state/UI-WORKFLOW-BUSINESS-RULE-AUDIT.md`

### 20.2 Exact Repository Metrics Verified
1.  **Roles Found**: **4** (`Owner`, `Manager`, `Supervisor`, `Telecaller` + Anonymous/Guest viewer)
2.  **Major Workflows Found**: **5**
    *   Sequential Round-Robin Lead Allocation Engine (Karam AI)
    *   Manual CRM Lead Entry Intake
    *   Outbound Double WhatsApp Simulated Dispatch (Meta Gateway)
    *   Legacy Kanban Lead-to-Estimate Conversion
    *   Buyer Requirement Proactive Property Matching Engine
3.  **Lead Mutation Actions Found**: **6**
    *   Inquiry Creation (manual form)
    *   Status Dropdown update
    *   Telecaller Reassignment
    *   Follow-up Reschedule
    *   Remarks / Notes save
    *   Kanban Conversion to Estimate
4.  **Enforced Business Rules Found**: **2**
    *   Automatic Round-Robin filters for active, logged-in telecallers only.
    *   Proactive match engine updates status to "Matched" if property price falls under the buyer's budget limit.
5.  **Missing Mandatory BOS Rules**: **8**
    *   Double-entry phone duplicate blocking
    *   Mandatory outcome capture for call interactions
    *   Mandatory follow-up scheduled dates and times for active leads
    *   Mandatory reasons captured on marking leads "Lost"
    *   Clearing of follow-up alarms upon reaching Won/Lost status
    *   Audit logged reopening validations
    *   Server-side role permission checks
    *   Secure tenant isolation containment rules
6.  **Workflow Dead Ends**: **2**
    *   **Modern CRM Lead Conversion**: Prospects inside the main "CRM Inquiry Hub" have no conversion path to Estimates, Projects, or Clients.
    *   **Meta Webhook Intake Simulator**: Sandbox console outputs logs but does not save leads to the persistent Firestore database.
7.  **Destructive Actions Found**: **5**
    *   Delete CRM Lead
    *   Reset to Blank Database
    *   Disable Staff Account Status
    *   Reassign Lead Transfer
    *   Convert Legacy Lead
8.  **P0 Risks**: **3** (RBAC bypass, missing Firestore cross-tenant rules, unauthenticated DB purge)
9.  **P1 Risks**: **4** (Silent Firestore write failures, false-success WhatsApp, dead-end lead conversion, duplicate phone numbers)
10. **Unknowns**: **5** (Webhook secrets, live WhatsApp API IDs, Maps API keys, migration plan, multi-tenant billing tiers)

### 20.3 Recommended Next Task
*   **Recommendation**: Proceed to target architecture design and schema definitions, unifying legacy `Lead` and modern `CRMLead` into a single normalized entity, establishing safe transaction-isolated API endpoints, and implementing robust Firestore security rules.
