# Domain Model Audit & Target Mapping Report (AUD-003)
## BuildEstimate BOS — Real Estate Lead Operations System

- **Task ID**: AUD-003
- **Task Name**: Domain Model Audit & Target Mapping
- **Current Time**: 2026-07-08
- **Status**: COMPLETE
- **Target File**: `docs/current-state/DOMAIN-MAPPING.md`

---

## 1. Executive Summary

A comprehensive domain audit of the BuildHub repository was performed to establish an evidence-backed mapping between the existing business models and the approved **BuildEstimate BOS** target domain.

### Key Conclusions
* **Entity Count**: There are currently **17 distinct business entities** active in the codebase (excluding nested structures such as `LineItem` and `LeadActivityLog`).
* **Overlap Vulnerabilities**:
  * **Sales Prospects**: The legacy `Lead` model and the active `CRMLead` model both represent incoming sales opportunities, leading to fragmented view structures.
  * **Client vs. Lead**: The `Client` entity duplicates person-level identity from `Lead` and `CRMLead` records upon conversion, leading to duplicate customer entries.
  * **Buyer Requirements**: The `BuyerRequirement` entity captures budget and location parameters that overlap with `CRMLead` interests but remains isolated from the sales pipeline.
* **Ambiguous Definitions**:
  * `Client`: Includes a multi-value tag field `tags: ('Buyer' | 'Seller' | 'Vendor' | 'Contractor')[]`, conflating CRM leads with operational supply partners.
  * `Project`: Simultaneously serves as a sales-pipeline quotation calculator (`estimates`) and an active post-sales construction tracker (`completion_pct`, `spent`).
* **BOS Scope Alignment**:
  * **BOS Core**: `CRMLead`, `Lead`, `BuyerRequirement`, `Profile` (Users), `TenantProfile` (Tenants) form the core CRM.
  * **BOS Supporting**: `Property` (matching inventory), `CriticalAlert` (overdue notifications).
  * **Legacy Exclusions (Exempt from P0 CRM Migration)**: `Project`, `InboundRevenue`, `DailyPayment`, `OfficeExpense`, `DealAdjustment`, `MaterialStock`, `Vendor`, and `PurchaseOrder`. These models belong strictly to the legacy construction-management domain and should not be migrated to the BOS CRM core database.

---

## 2. Current Domain Inventory

Below is an exhaustive inventory of all 17 business entities identified during the audit, mapping their code definitions, lifecycle paths, and business roles.

### 1. TenantProfile
* **Exact Interface**: `TenantProfile` (defined in `src/types.ts` lines 18–28)
* **All Fields**:
  * `id`: `string` (Primary Key)
  * `tenant_id`: `string` (Tenant Isolation Key)
  * `company_name`: `string`
  * `business_logo_url`: `string`
  * `gstin`: `string`
  * `address`: `string`
  * `phone_number`: `string`
  * `email`: `string` (Optional)
  * `subscription_plan`: `'Free Trial' | 'Pro Growth' | 'Enterprise Matrix'` (Optional)
* **Persistence Location**: Firestore path `/companies/{companyId}/tenant_profiles/tp-default` and disk storage `db.json` key `tenant_profiles`.
* **Creation Code Path**: `App.tsx` (lines 244–254) initializes a fallback profile during Google OAuth initialization if no tenant metadata is loaded.
* **Update Code Path**: `handleUpdateTenantProfile` in `App.tsx` (lines 865–890) and `TenantSettingsView.tsx` writes updates to Firestore and state.
* **Deletion Code Path**: None implemented.
* **UI Consumers**: `OnboardingWizard.tsx`, `TenantSettingsView.tsx`, `TenantProfileCard.tsx`, and general navigation headers.
* **Business Meaning**: Represents a registered real estate builder/vendor operating as a tenant on the SaaS platform.

### 2. Profile (Staff Profile)
* **Exact Interface**: `Profile` (defined in `src/types.ts` lines 30–38)
* **All Fields**:
  * `id`: `string` (Primary Key)
  * `name`: `string`
  * `user_role`: `'Owner' | 'Manager' | 'Supervisor' | 'Telecaller'`
  * `account_status`: `'Active' | 'Disabled'`
  * `avatar_url`: `string` (Optional)
  * `parent_owner_id`: `string | null` (Optional)
  * `tenant_id`: `string` (Tenant Isolation Key - Optional)
* **Persistence Location**: Firestore path `/companies/{companyId}/profiles/{profileId}` and disk storage `db.json` key `profiles`.
* **Creation Code Path**: Seeded during tenant initialization (`App.tsx` line 304). Added via `handleUpdateProfiles` in `App.tsx` (line 701) inside `SettingsView.tsx`.
* **Update Code Path**: `handleUpdateProfiles` in `App.tsx` (line 701).
* **Deletion Code Path**: None implemented.
* **UI Consumers**: `SettingsView.tsx`, `CRMLeadHub.tsx` (caller allocation dropdown), `DashboardView.tsx`.
* **Business Meaning**: Represents a system user or staff member (owner, manager, supervisor, telecaller) isolated within a tenant's scope.

### 3. CRMLead (Live CRM Inquiry)
* **Exact Interface**: `CRMLead` (defined in `src/types.ts` lines 235–251)
* **All Fields**:
  * `id`: `string` (Primary Key)
  * `tenant_id`: `string`
  * `customer_name`: `string`
  * `phone_number`: `string`
  * `email`: `string` (Optional)
  * `source`: `'Facebook_Ads' | 'Instagram' | 'Website' | 'Manual'`
  * `project_interest`: `string` (e.g. `"3 BHK Kharar Villa"`)
  * `budget_tier`: `string` (Optional, e.g. `"50L - 75L"`, `"1Cr+"`)
  * `lead_status`: `'New' | 'Contacted' | 'Quotation_Sent' | 'Lost' | 'Won'`
  * `assigned_to_caller_id`: `string` (Telecaller profile ID mapping - Optional)
  * `assigned_to_name`: `string` (Telecaller name - Optional)
  * `remarks`: `string` (Optional)
  * `next_followup_date`: `string` (Optional, format `"YYYY-MM-DD"`)
  * `logs`: `LeadActivityLog[]` (Chronological history array)
  * `created_at`: `string` (Timestamp)
* **Persistence Location**: Firestore path `/companies/{companyId}/construction_inquiries/{id}` and disk `db.json` key `crm_leads`.
* **Creation Code Path**: `App.tsx` (lines 570–590) during webhook intake simulations or manual additions in `CRMLeadHub.tsx`.
* **Update Code Path**: `handleUpdateCRMLead` in `App.tsx` (line 595) which updates status, remarks, followup dates, and pushes logs.
* **Deletion Code Path**: `handleDeleteCRMLead` in `App.tsx` (line 615) deletes the record from memory and Firestore.
* **UI Consumers**: `CRMLeadHub.tsx`, `MobileLeadCard.tsx`, and `DashboardView.tsx`.
* **Business Meaning**: Core CRM sales pipeline record tracking a prospect's commercial property purchase journey.

### 4. Lead (Legacy Prospect)
* **Exact Interface**: `Lead` (defined in `src/types.ts` lines 217–226)
* **All Fields**:
  * `id`: `string`
  * `tenant_id`: `string`
  * `client_name`: `string`
  * `phone_number`: `string`
  * `location`: `string`
  * `source`: `'Meta Ads' | 'WhatsApp' | 'Google Search' | 'Referral'`
  * `status`: `'New' | 'Quoted' | 'Follow-up'`
  * `created_at`: `string`
* **Persistence Location**: Firestore path `/companies/{companyId}/crm_leads/{id}` and disk `db.json` key `leads`.
* **Creation Code Path**: `handleAddLead` in `App.tsx` (line 442).
* **Update Code Path**: `handleUpdateLeadStatus` in `App.tsx` (line 462).
* **Deletion Code Path**: Cleaned up on database resets.
* **UI Consumers**: `LeadsView.tsx`.
* **Business Meaning**: A legacy flat representation of leads before the implementation of the advanced `CRMLeadHub`.

### 5. BuyerRequirement
* **Exact Interface**: `BuyerRequirement` (defined in `src/types.ts` lines 187–196)
* **All Fields**:
  * `id`: `string`
  * `buyer_name`: `string`
  * `buyer_phone`: `string`
  * `preferred_location`: `string`
  * `max_budget`: `number`
  * `property_type`: `'Plot' | 'Villa' | 'Flat' | 'Commercial'`
  * `status`: `'Pending' | 'Matched' | 'Closed'`
  * `tenant_id`: `string` (Optional)
* **Persistence Location**: Firestore path `/companies/{companyId}/leads/{id}` and disk `db.json` key `buyer_requirements`.
* **Creation Code Path**: `handleAddBuyerRequirement` in `App.tsx` (line 845) called in `PropertyView.tsx`.
* **Update Code Path**: Status mapped and updated inside property match actions.
* **Deletion Code Path**: Handled on database resets.
* **UI Consumers**: `PropertyView.tsx`.
* **Business Meaning**: Captures property search preferences of a prospective purchaser to run catalog match calculations.

### 6. Client (Legacy CRM/Construction Customer)
* **Exact Interface**: `Client` (defined in `src/types.ts` lines 40–47)
* **All Fields**:
  * `id`: `string`
  * `name`: `string`
  * `phone`: `string`
  * `tags`: `('Buyer' | 'Seller' | 'Vendor' | 'Contractor')[]`
  * `project_location`: `string` (Optional)
  * `tenant_id`: `string` (Optional)
* **Persistence Location**: Firestore path `/companies/{companyId}/clients/{id}` and disk `db.json` key `clients`.
* **Creation Code Path**: `handleAddClient` in `App.tsx` (line 636) or converted from raw lead in `handleConvertLead` (line 489).
* **UI Consumers**: `LeadsView.tsx`, `EstimatesView.tsx`.
* **Business Meaning**: Represents a verified customer with an active construction contract.

### 7. Project (Construction / Estimate Tracker)
* **Exact Interface**: `Project` (defined in `src/types.ts` lines 49–71)
* **All Fields**:
  * `id`: `string`
  * `project_name`: `string`
  * `status`: `'Active' | 'Completed' | 'On-Hold' | 'Quotation' | 'Dead'`
  * `client_id`: `string` (Optional)
  * `location`: `string`
  * `type`: `string`
  * `completion_pct`: `number`
  * `total_budget`: `number`
  * `spent`: `number`
  * `tenant_id`: `string` (Optional)
  * `estimates`: Estimate line items and vendor bindings (Optional)
  * `gst_rate`: `number` (Optional)
* **Persistence Location**: Firestore path `/companies/{companyId}/projects/{id}` and disk `db.json` key `projects`.
* **Creation Code Path**: Generated during lead conversion in `handleConvertLead` (line 499) with status `'Quotation'`.
* **Update Code Path**: `handleUpdateProject` in `App.tsx` (line 673).
* **Business Meaning**: Represents a physical building/contract job. Conflates quotation estimates with operational accounting.

### 8. Property (Inventory List)
* **Exact Interface**: `Property` (defined in `src/types.ts` lines 73–85)
* **All Fields**:
  * `id`: `string`
  * `title`: `string`
  * `property_type`: `'Plot' | 'Villa' | 'Flat' | 'Commercial'`
  * `location`: `string`
  * `asking_price`: `number`
  * `target_selling_price`: `number`
  * `source_person_name`: `string`
  * `source_person_type`: `'Builder' | 'Owner' | 'CP' | 'Rental Investor'`
  * `source_person_phone`: `string`
  * `image_url`: `string`
  * `status`: `'Available' | 'Hold' | 'Sold'`
* **Persistence Location**: Firestore path `/companies/{companyId}/properties/{id}` and disk `db.json` key `properties`.
* **Creation Code Path**: Added via standard save pathways inside `PropertyView.tsx`.
* **UI Consumers**: `PropertyView.tsx`, Maps auto-match API `/api/auto-match`.
* **Business Meaning**: Real estate asset catalog database used for matching inbound buyer requirements.

### 9. DailyPayment (Construction Expense Log)
* **Exact Interface**: `DailyPayment` (defined in `src/types.ts` lines 99–108)
* **All Fields**:
  * `id`, `project_id`, `amount`, `paid_by`, `remarks`, `category: 'Labor' | 'Materials' | 'Miscellaneous'`, `date`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/daily_payments/{id}` and disk `db.json` key `daily_payments`.
* **Creation Path**: `handleAddPayment` or via voice log AI parsing `/api/voice-to-khata`.
* **Business Meaning**: Core construction site micro-expense book.

### 10. InboundRevenue (Client Deposits Ledger)
* **Exact Interface**: `InboundRevenue` (defined in `src/types.ts` lines 87–97)
* **All Fields**:
  * `id`, `project_id`, `amount`, `head_account`, `payment_mode`, `payment_stage`, `date`, `registry_deadline`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/inbound_revenues/{id}` and disk `db.json` key `inbound_revenues`.
* **Business Meaning**: Records financial deposits and progress milestones paid by buyers.

### 11. OfficeExpense (Administrative Spends Ledger)
* **Exact Interface**: `OfficeExpense` (defined in `src/types.ts` lines 110–116)
* **All Fields**:
  * `id`, `subject`, `amount`, `date`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/office_expenses/{id}` and disk `db.json` key `office_expenses`.
* **Business Meaning**: General non-site administrative ledger.

### 12. DealAdjustment (Commission Log)
* **Exact Interface**: `DealAdjustment` (defined in `src/types.ts` lines 118–125)
* **All Fields**:
  * `id`, `client_id`, `direction: 'Inbound_Commission' | 'Outbound_Payout'`, `amount`, `deal_detail`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/deal_adjustments/{id}` and disk `db.json` key `deal_adjustments`.
* **Business Meaning**: Captures real estate channel brokerage adjustments.

### 13. MaterialStock (Inventory Tracker)
* **Exact Interface**: `MaterialStock` (defined in `src/types.ts` lines 127–138)
* **All Fields**:
  * `id`, `name`, `category`, `location`, `current_stock`, `unit`, `critical_level`, `status`, `icon`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/material_stocks/{id}` and disk `db.json` key `material_stocks`.
* **Business Meaning**: Tracks site construction supplies inventory levels.

### 14. Vendor (Supplier Directory)
* **Exact Interface**: `Vendor` (defined in `src/types.ts` lines 140–155)
* **All Fields**:
  * `id`, `name`, `category`, `rating`, `status: 'PREFERRED' | 'ACTIVE' | 'ON HOLD'`, `active_orders_count`, `last_delivery_date`, `avatar_url`, `total_spent`, `paid_amount`, `balance_due`, `on_time_delivery_pct`, `quality_rating`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/vendors/{id}` and disk `db.json` key `vendors`.
* **Business Meaning**: Directory of construction raw material vendors.

### 15. PurchaseOrder (Procurement Contracts)
* **Exact Interface**: `PurchaseOrder` (defined in `src/types.ts` lines 157–176)
* **All Fields**:
  * `id`, `vendor_id`, `vendor_name`, `project_name`, `order_date`, `expected_delivery`, `amount`, `status: 'In Transit' | 'Completed' | 'Cancelled'`, `item_name`, `item_sku`, `quantity_description`, `unit_price`, `timeline: { title: string; date: string; done: boolean }[]`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/purchase_orders/{id}` and disk `db.json` key `purchase_orders`.
* **Business Meaning**: Procurement contracts for site supplies.

### 16. CriticalAlert (System Alarm Notification)
* **Exact Interface**: `CriticalAlert` (defined in `src/types.ts` lines 178–185)
* **All Fields**:
  * `id`, `type: 'Stock' | 'Deadline' | 'General'`, `title`, `description`, `project_name`, `tenant_id`
* **Persistence Location**: Firestore `/companies/{companyId}/alerts/{id}` and disk `db.json` key `alerts`.
* **Business Meaning**: Overdue tasks, stock drops, and payment delay warnings.

### 17. CompanySettings (Unauthenticated Local Profile)
* **Exact Interface**: `CompanySettings` (defined in `src/types.ts` lines 9–16)
* **All Fields**:
  * `companyName`, `gstin`, `phone`, `email`, `address`, `logoUrl`
* **Persistence Location**: Cached in `localStorage` under key `buildhub_settings_{companyId}` for guest sessions.
* **Business Meaning**: Basic fallback identity card for unauthenticated builders.

---

## 3. Prospect and Customer Model Comparison

The following matrix isolates and evaluates every field across the four customer/prospect representations in the current system, categorizing their functional purpose in relation to the target domain:

| Field Name | Client Model | BuyerRequirement | Lead (Legacy) | CRMLead (Live) | Dominant Domain Class |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **id** | `cl-X` | `req-X` | `l-X` | `lead_X` | SALES_JOURNEY |
| **name / customer_name / buyer_name** | `name` | `buyer_name` | `client_name` | `customer_name` | PERSON_IDENTITY |
| **phone / buyer_phone / phone_number**| `phone` | `buyer_phone` | `phone_number`| `phone_number` | PERSON_IDENTITY |
| **email** | Absent | Absent | Absent | `email` | PERSON_IDENTITY |
| **source** | Absent | Absent | `source` | `source` | ENQUIRY_EVENT |
| **status / lead_status** | Absent | `status` | `status` | `lead_status` | SALES_JOURNEY |
| **budget / budget_tier / max_budget** | Absent | `max_budget` | Absent | `budget_tier` | QUALIFICATION |
| **project_interest / preferred_location**| `project_location` | `preferred_location`| `location`| `project_interest`| PROPERTY_REQUIREMENT |
| **assigned_to_caller_id / name** | Absent | Absent | Absent | `assigned_to_caller_id` / `name`| ASSIGNMENT |
| **remarks** | Absent | Absent | Absent | `remarks` | ACTIVITY_HISTORY (Overloaded) |
| **next_followup_date** | Absent | Absent | Absent | `next_followup_date`| NEXT_ACTION |
| **logs** | Absent | Absent | Absent | `logs` | ACTIVITY_HISTORY |
| **created_at** | Absent | Absent | `created_at` | `created_at` | ENQUIRY_EVENT |
| **tags** | `tags` | Absent | Absent | Absent | LEGACY_CONSTRUCTION_DOMAIN |

---

## 4. Status and Lifecycle Inventory

Below is an audit of every status string discovered within the codebase, compared against the target approved **BOS CRM State Machine**:

| Current Status Value | Found In | UI Presentation | Mutation Trigger | Database Path | Approved BOS State Mapping | Semantic Conflicts / Inconsistencies |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `"New"` | `Lead`, `CRMLead` | "New" Badge | Webhook intake simulation / Manual add | `/crm_leads` & `/construction_inquiries` | **ASSIGNED** | A "New" CRMLead is automatically allocated via Round-Robin immediately upon webhook intake, meaning it is pre-assigned, conflating raw and owned pipelines. |
| `"Contacted"` | `CRMLead` | "Contacted" | Telecaller sets status in active card | `/construction_inquiries` | **CONNECTED** / **FIRST_ATTEMPT** | Conflates successfully connected deep discussions with missed calls or "first attempt" connections. |
| `"Quotation_Sent"` | `CRMLead` | "Quoted" | Telecaller delivers construction outline | `/construction_inquiries` | **NEGOTIATION** | Assumes sending a quote begins negotiation immediately, missing a qualification step. |
| `"Won"` | `CRMLead` | "Won" | Deal confirmed / client logs estimate | `/construction_inquiries` | **BOOKED** | No explicit booking transaction or contract registration is recorded in CRM. |
| `"Lost"` | `CRMLead` | "Lost" | Lead marked dead or archived | `/construction_inquiries` | **LOST** | Fails to capture structural reasons for loss (e.g. Price, Location, unresponsive). |
| `"Follow-up"` | `Lead` (Legacy) | "Follow-up" | Manual list change | `/crm_leads` | **FOLLOW_UP** | Lacks individual next-action logging or reminder timers. |
| `"Pending"` | `BuyerRequirement` | "Pending Search" | Requirement submission | `/leads` | **NEW** | Disconnected from the main telecaller assignment matrices. |
| `"Matched"` | `BuyerRequirement` | "Matched Properties" | Auto-matching script ran | `/leads` | **QUALIFIED** | Indicates properties match budget, but doesn't track user interest. |
| `"Quotation"` | `Project` | "Estimate Quote" | Conversion of Legacy Lead | `/projects` | **NEGOTIATION** | Exists in construction projects collection rather than the CRM pipeline. |

---

## 5. Contact Mapping

To construct a clean, unified `Contact` entity under PostgreSQL, current person-level fields must be extracted and normalized:

### Proposed Contact Fields Extraction

| Source Entity | Source Field | Transformation Rule | Duplicate Risk | Conflict Resolution Rule |
| :--- | :--- | :--- | :--- | :--- |
| `CRMLead` | `customer_name` | Trim spaces, apply Title Case | High | Merge with Client name if phone matches. |
| `CRMLead` | `phone_number` | Strip all spaces/dashes, prepend country code (`+91`) | High | **Deduplication Key**: Absolute unique constraint on `phone_number`. |
| `CRMLead` | `email` | Downcase, trim | Medium | Coalesce first non-empty string. |
| `Lead` | `client_name` | Trim spaces, apply Title Case | High | Coalesce to contact name if phone matches. |
| `Lead` | `phone_number` | Normalize phone format | High | Map to deduplication key. |
| `BuyerRequirement` | `buyer_name` | Trim spaces, apply Title Case | High | Coalesce to contact name. |
| `BuyerRequirement` | `buyer_phone`| Normalize phone format | High | Map to deduplication key. |
| `Client` | `name` | Trim spaces, apply Title Case | High | Coalesce to contact name. |
| `Client` | `phone` | Normalize phone format | High | Map to deduplication key. |

---

## 6. Lead Event Mapping

A **Lead Event** in BuildEstimate BOS represents a unique, immutable enquiry occurrence.

### Current Acquisition Fields Analysis
* **Lead Sources**: 
  * `Lead.source`: `'Meta Ads' | 'WhatsApp' | 'Google Search' | 'Referral'` (defined in `src/types.ts` line 223)
  * `CRMLead.source`: `'Facebook_Ads' | 'Instagram' | 'Website' | 'Manual'` (defined in `src/types.ts` line 241)
* **Metadata Overwriting**: The current system **does not** preserve historical repeat enquiry events. If a consumer makes a second enquiry:
  * In `CRMLeadHub.tsx`, submitting an existing phone number generates a completely separate duplicate `CRMLead` record with a distinct ID, breaking contact identity.
  * Webhook simulation (`simulation.ts` line 75) initializes a new `CRMLead` structure from scratch and appends it to the running database array without checking for previous customer instances.
  * To resolve this, PostgreSQL migrations must intercept incoming lead forms, associate them with a unified `Contact` ID, and insert a new immutable row in the `lead_events` table rather than duplicating the prospect.

---

## 7. Opportunity Mapping

The **Opportunity** represents the active, multi-stage commercial sales journey. Currently, `CRMLead` conflates multiple domain boundaries.

### Deconstructing the Conflated `CRMLead` Model

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                            CRMLead                              │
   └────────────────────────────────┬────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Contact Fields  │       │Lead Event Fields │       │Opportunity Fields│
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ - customer_name  │       │ - source         │       │ - lead_status    │
│ - phone_number   │       │ - created_at     │       │ - project_interest
│ - email          │       │                  │       │ - budget_tier    │
│                  │       │                  │       │ - assigned_caller│
│                  │       │                  │       │ - remarks        │
│                  │       │                  │       │ - followup_date  │
│                  │       │                  │       │ - logs           │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

* **CRM Lead Conversion Route**: Conceived in `App.tsx` (lines 482–540) via `handleConvertLead` which transitions a legacy `Lead` to `Client` and `Project` estimates. It initializes structural duplication of fields rather than relational referencing.
* **Loss & Won Tracking**: In `CRMLeadHub.tsx` (line 763), statuses are updated directly on the `CRMLead` record. A "Won" or "Lost" status update triggers writing a string log entry inside `LeadActivityLog` rather than writing back to a dedicated opportunity outcome tracker.

---

## 8. Assignment Mapping

The current system allocates telecallers and logs assignments as unstructured event strings.

### Current Owner Assignment
* **Fields**: `assigned_to_caller_id` (pointing to `Profile.id`) and `assigned_to_name` stored directly on the `CRMLead`.
* **State Machine**: Multi-tenant round-robin sequential allocation in `CRMLeadEngine.ts` (lines 11–53) based on:
  ```typescript
  const telecallers = activeCallers.filter(c => c.user_role === "Telecaller" && c.account_status === "Active");
  const caller = telecallers[globalRoundRobinIndex % telecallers.length];
  globalRoundRobinIndex = (globalRoundRobinIndex + 1) % telecallers.length;
  ```
* **History Preservation**: Reassigning a caller **overwrites** the active fields. The historical chain of owners is pushed as unstructured strings in the `logs` array:
  * *Example action*: `"Lead automatically assigned to Telecaller: Priya Kaur via Round-Robin"` (logged by `"Karam AI Allocation Engine"`).
* **Missing PostgreSQL Data**:
  * Assignment start and end timestamps.
  * Structured reassignment reasons and old/new owner reference IDs.
  * Active/Inactive status indicators.

---

## 9. Activity Mapping

BuildEstimate BOS requires an immutable, structured historical record of opportunity events.

### Logging System Extraction
* **Source Logs**: `CRMLead.logs` containing `LeadActivityLog` elements:
  * `id`: `string`
  * `performed_by`: `string`
  * `action`: `string`
  * `timestamp`: `string`
* **Applicable Events**: These records can be cleanly transformed into immutable relational `activities` under PostgreSQL, capturing status changes, telecaller touches, and remarks.
* **Legacy Exclusion Warning**: Chronological ledger rows from `daily_payments` (labor/materials ledger), `office_expenses`, and `purchase_orders` must **not** be mapped to `activities` as they represent real-world operations in the building domain and have no relationship to active CRM sales journeys.

---

## 10. Next Action Mapping

The current codebase maintains an informal tracking mechanism for subsequent customer engagements.

### Next Action Audit
* **Structured Follow-up**: Handled via `CRMLead.next_followup_date` which holds a flat date string `"YYYY-MM-DD"`.
* **Structural Limitations**:
  * **No Task Descriptions**: The actual task content (e.g. "Call to arrange site visit") is merged with overall operational commentary in the unstructured `remarks` field.
  * **Single Action Limit**: Only one followup date can exist per lead; scheduling a new follow-up completely overwrites the previous date, erasing historical task performance.
  * **Missing Task Status**: There is no boolean flag or status (e.g., `'Completed' | 'Pending'`) indicating whether the follow-up was executed successfully.

---

## 11. Site Visit Mapping

### Evaluation of Site Visits
A global repository search for `visit`, `viewing`, `no-show`, and `appointment` was executed:
* **Current Status**: **NOT IMPLEMENTED**.
* **Gaps**: There is no model, DB collection, status value, form, or scheduling widget representing physical properties site tours. Site visits are handled purely as unstructured text entries in the `remarks` log when telecallers manually input comments.

---

## 12. Legacy Domain Separation

To focus development strictly on BuildEstimate BOS P0 CRM capabilities, existing application modules are classified into core, supporting, and legacy-only blocks:

| Module / Component | Defining File Path | Functional Domain | Audit Classification |
| :--- | :--- | :--- | :--- |
| **CRM Lead Hub** | `src/components/CRMLeadHub.tsx` | CRM Sales Pipeline | **BOS CORE** |
| **Mobile Lead Card**| `src/components/MobileLeadCard.tsx` | CRM Sales Actions | **BOS CORE** |
| **Property View** | `src/components/PropertyView.tsx` | Buyer Requirements | **BOS CORE** |
| **Leads View** | `src/components/LeadsView.tsx` | Legacy Prospect List | **BOS CORE** |
| **Daily Log View** | `src/components/DailyLogView.tsx` | Construction Ledger | **LEGACY ONLY** |
| **Materials View** | `src/components/MaterialsView.tsx` | Inventory Tracking | **LEGACY ONLY** |
| **Orders View** | `src/components/OrdersView.tsx` | Procurement Contracts | **LEGACY ONLY** |
| **Estimates View** | `src/components/EstimatesView.tsx` | Estimate Shared Snapshots | **LEGACY ONLY** |
| **Attendance Matrix**| `src/components/AttendanceMatrixDashboard.tsx`| Team Management | **LEGACY ONLY** |
| **Client Portal** | `src/components/ClientEstimatePortal.tsx` | Estimate Sharing | **LEGACY ONLY** |
| **Voice-to-Khata AI**| `/server/routes/ai.ts` (lines 40–100) | Voice Spends Ledger | **LEGACY ONLY** |
| **Auto-Match AI** | `/server/routes/ai.ts` (lines 140–180) | Maps Grounding Matcher | **BOS SUPPORTING** |
| **Dashboard Summary**| `/server/routes/ai.ts` (lines 101–139) | Office Spends Analytics | **LEGACY ONLY** |
| **Onboarding Wizard**| `src/components/OnboardingWizard.tsx` | Tenant Configuration | **SHARED PLATFORM** |
| **Subscription Simulator**| `src/components/SubscriptionSimulator.tsx`| Tenant Billing Plans | **SHARED PLATFORM** |
| **Simulation Script**| `src/simulation.ts` | Intake Script Testing | **REMOVE** |

---

## 13. Field-Level Migration Matrix

The following table documents the field-by-field migration path from current client-side state objects to the target PostgreSQL relational schema:

| Current Entity | Current Field | Current Meaning | Target Entity | Target Field | Transformation Required | Confidence | Migration Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `CRMLead` | `id` | Inquiry UUID | `opportunities` | `id` | Maintain UUID format or map to integer PK. | **HIGH** | Low risk. |
| `CRMLead` | `customer_name`| Contact Name | `contacts` | `name` | Trim and Title Case names. | **HIGH** | Duplicates if same phone exists. |
| `CRMLead` | `phone_number` | Contact Phone | `contacts` | `phone` | Standardize to E.164. | **HIGH** | Duplication & merge conflicts. |
| `CRMLead` | `email` | Contact Email | `contacts` | `email` | Lowercase and trim. | **HIGH** | Nullable fields. |
| `CRMLead` | `source` | Meta Ads, Web, etc | `lead_events` | `source` | Convert string labels to matches. | **HIGH** | Minor schema variation. |
| `CRMLead` | `lead_status` | Sales stage | `opportunities` | `stage` | Map to BOS State Machine. | **HIGH** | Pre-assigned status mismatch. |
| `CRMLead` | `project_interest`| Target property | `opportunities`| `project_interest`| Store as raw string or map to properties PK. | **MEDIUM**| Flat string lacks property reference. |
| `CRMLead` | `budget_tier` | qualification | `opportunities`| `budget_tier` | Map text range to structured budget column. | **MEDIUM**| Standardizing text ranges. |
| `CRMLead` | `assigned_to_caller_id`| Current Caller | `opportunities`| `owner_id` | Map to corresponding user Profile ID. | **HIGH** | Unassigned values handle. |
| `CRMLead` | `remarks` | Latest notes | `lead_events` | `description` | Extract initial notes; subsequent notes to activities. | **MEDIUM**| High risk of lost follow-up context. |
| `CRMLead` | `next_followup_date`| Reminders date | `next_actions` | `scheduled_at` | Map date string to timestamptz. | **HIGH** | Missing details of task. |
| `CRMLead` | `logs` | Audit trail | `activities` | (Rows) | Loop over array and insert multiple activity rows. | **HIGH** | Parsing nested JSON. |
| `BuyerRequirement`| `preferred_location`| Preferred area| `opportunities`| `preferred_location`| Move preferences to opportunity preferences. | **MEDIUM**| Loss of properties linkages. |
| `BuyerRequirement`| `max_budget` | Limit amount | `opportunities`| `budget` | Cast number directly to numeric budget. | **HIGH** | Column type casting. |
| `Profile` | `user_role` | Staff Permissions| `users` | `role` | Map directly to role enums. | **HIGH** | Low risk. |
| `Profile` | `account_status`| Active marker | `users` | `status` | Map directly to status enums. | **HIGH** | Low risk. |

---

## 14. Data Loss Risks

The transition to the approved PostgreSQL schema introduces several risks of operational history and contextual metadata loss:

### 1. P1 — Operational Sales History Loss (High Severity)
* **Reassignment Erasure**: In the current system, reassigning a `CRMLead` simply overwrites `assigned_to_caller_id`. This means the history of previous telecaller owners is completely erased, making it impossible to audit telecaller performance or calculate lead distribution metrics.
* **Follow-up Overwriting**: Scheduling a follow-up overwrites `CRMLead.next_followup_date`. There is no history of past completed, missed, or rescheduled appointments, which leads to a loss of customer touchpoint analytics.

### 2. P2 — Business Context Loss (Medium Severity)
* **Flat Remarks Conflation**: The single `remarks` string is used for log notes, call outcomes, customer feedback, and next-action tasks. Splitting this field relatonally without a smart text-parsing pipeline risks losing details or dropping context.
* **Buyer Preference Disconnection**: Match parameters inside `BuyerRequirement` are stored separately from pipeline `crm_leads`. If buyer requirements are deleted, the matched properties history is lost.

### 3. P3 — Legacy Feature Loss
* **Construction Spends**: Immediate implementation of a CRM-only schema means discarding `daily_payments`, `material_stocks`, and `purchase_orders`, which will disable the construction tracking dashboards currently active in the UI.

---

## 15. Duplicate and Identity Risks

Because the current database is non-relational and split across several disjointed collections, a single physical customer is highly susceptible to identity fragmentation:

```
                  ┌──────────────────────────────┐
                  │      One Real Customer       │
                  │   (e.g. phone: 9876543210)   │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Legacy Lead Card │    │   CRM Inquiry    │    │Buyer Requirement │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ - Name: Ramesh   │    │ - Name: R. Kumar │    │ - Name: Ramesh K.│
│ - ID: l-404      │    │ - ID: lead_992   │    │ - ID: req-881    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

* **Deduplication Scenario**: If a prospective buyer fills out a Meta Lead Form (ingested via webhook to `crm_leads`), has a manual logging step in legacy `leads`, gets a matching run in `buyer_requirements`, and is converted to a project customer in `clients`, **four (4) disconnected duplicate profiles** are created.
* **Risk Mitigation**: The target migration must use a **phone-number unique constraint** as the primary contact identity key, merging all associated inquiries, requirements, and logs under a single unified `Contact` ID.

---

## 16. Missing Target Data

The current codebase does not collect or track several data points required by the approved target domain:

| Target Domain Entity | Required Attribute | Missing Fields in Current Codebase |
| :--- | :--- | :--- |
| **Opportunity Assignment**| Assignment Timeline | Start/end timestamps, assignment reason, and active status. |
| **Lead Event** | Webhook Metadata | Raw JSON payload, source IP address, delivery status, and retry counts. |
| **Activity** | Engagement Metrics | Call duration, email body texts, and call recording file links. |
| **Next Action** | Task Context | Task type (call, email, visit), task descriptions, and completion status. |
| **Site Visit** | Appointment Tracking | Coordinator ID, scheduled property reference ID, visitor feedback, and show/no-show statuses. |

---

## 17. Proposed Migration Decision

The recommended migration strategies for the existing repository elements are detailed below:

* **TenantProfile** ➡️ `MIGRATE & MERGE`
  * *Reason*: High-confidence mapping. Consolidate current SaaS subscriber settings into the target SQL `tenants` table.
* **Profile** ➡️ `MIGRATE`
  * *Reason*: Map directly to target `users` table, retaining organizational roles and tenant-level isolation.
* **CRMLead** ➡️ `SPLIT & MIGRATE`
  * *Reason*: Extract identity fields to `contacts`, map budget and pipeline states to `opportunities`, write logs to `activities`, and map allocations to `opportunity_assignments`.
* **Lead (Legacy)** ➡️ `MERGE & TRANSFORM`
  * *Reason*: Standardize and merge duplicates into `contacts` based on phone numbers, and generate historical activities.
* **BuyerRequirement** ➡️ `SPLIT`
  * *Reason*: Extract buyer identity to `contacts` and map property search criteria into `opportunities`.
* **Property** ➡️ `MIGRATE`
  * *Reason*: Retain as supporting real estate inventory database.
* **Project** ➡️ `LEGACY ONLY`
  * *Reason*: Keep outside of the active CRM scope, as this represents construction phase tracking.
* **DailyPayment, MaterialStock, PurchaseOrder, Vendor, InboundRevenue, OfficeExpense** ➡️ `LEGACY ONLY`
  * *Reason*: Exclude from the target BOS P0 CRM relational schema, keeping them isolated.

---

## 18. Unresolved Architecture Decisions

The following architectural questions require developer and product approval before implementation:

1. **Legacy Construction Feature Lifecycle**: Should existing construction dashboards (`daily_payments`, `material_stocks`, etc.) be deprecated entirely in P0, or maintained in a legacy NoSQL fallback alongside the new relational CRM PostgreSQL database?
2. **Deduplication Tie-Breaker Logic**: When consolidating duplicates (e.g., phone match with variations in name like "Ramesh Kumar" vs. "Ramesh"), which source model (`Client`, `CRMLead`, or `Lead`) holds priority?
3. **Round-Robin State Persistence**: Should the round-robin active allocation index be dynamically computed at runtime based on the last allocated telecaller ID in the PostgreSQL assignments log, or stored separately?
4. **Site Visit Entity Specifications**: How detailed should the newly introduced `site_visits` schema be? (e.g. tracking transport logistics, visitor feedback, and multi-user scheduling).

---
