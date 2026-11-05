# AI SALES CONTROL CENTER — FRONTEND ARCHITECTURE & TABLER UI AUDIT

**Document:** `docs/saas-audit/07_FRONTEND_AUDIT.md`  
**Purpose:** Comprehensive audit of Next.js 14 App Router, Tabler design system fidelity, frontend state management, security boundaries, and UI defect analysis.

---

## 1. Frontend Technology Stack & Structure

* **Framework:** Next.js 14.2 (App Router with TypeScript).
* **Styling Framework:** Tailwind CSS with custom Tabler CSS theme overrides.
* **Component Architecture:** Monolithic stateful component (`web/app/Dashboard.tsx` ~1,800 lines) with extracted SaaS tabs in `web/app/components/saas/`.
* **State Management:** React local state (`useState`, `useEffect`) without a centralized state store (Zustand/Redux).
* **Network Layer:** Client calls Next.js proxy route `/api/proxy?path=...` which attaches headers and forwards to FastAPI on port 8000.

---

## 2. Tabler UI Design System Evaluation

The project's architectural mandate specifies:
> **"Preserve the native Tabler visual identity, components, colors, interactions, and animations. Do not introduce a custom purple AI dashboard design."**

### 2.1 Tabler Compliance Assessment:
* **The Good:**
  * Navigation sidebar matches Tabler standard dimensions, icons, and hierarchy.
  * Status badges (`badge bg-success-lt`, `badge bg-warning-lt`) follow Tabler semantic conventions.
  * Card layouts (`card`, `card-header`, `card-body`) and data tables reflect Tabler's clean typography.
* **Deviations & Regressions:**
  * Some cards in `Dashboard.tsx` employ heavy radial gradients and deep navy-black backgrounds reminiscent of generic AI dashboards rather than standard Tabler Dark Mode.
  * Custom scrollbars and glow effects conflict with native Tabler minimalist aesthetics.

---

## 3. UI Defect Analysis (Direct Evidence from Screenshots)

### Defect 1: Awkward Vertical Badge Stacking in Team Management
* **Evidence:** Screenshot `media_1793537537186_df4f3c1d.jpg` showing admin item `Test @https://t.me/Saida4881` with Telegram ID `1015104283`.
* **The Bug:** The permissions list (`Suhbatlarni ko'rish`, `Mijozlarga javob berish`, `Suhbatni qabul qilish`...) renders as an uninterrupted vertical stack of 10+ pill badges, forcing the table row height to expand enormously and distorting table alignment.
* **Root Cause:** In the Admin management table, permissions are rendered inside a `flex flex-col gap-1` container instead of a horizontal wrapping layout (`flex flex-wrap gap-1 max-w-md`) or a concise summarized indicator (e.g. `"7/10 ruxsatlar faol"` with a tooltip/popover).
* **Fix Required:** Replace vertical flex layout with:
  ```tsx
  <div className="d-flex flex-wrap gap-1" style={{ maxWidth: "320px" }}>
    {admin.permissions.map(perm => (
      <span key={perm} className="badge bg-success-lt text-xs">{permLabel(perm)}</span>
    ))}
  </div>
  ```

### Defect 2: HTTP 500 and HTTP 405 Errors on Dynamic Actions
* **Evidence:** Screenshots `media_1793561422916_8b5af448.png` (`HTTP 500`) and `media_1793534067232_067e93c2.png` (`HTTP 405`).
* **Root Causes:**
  1. **HTTP 500:** Occurs when calling `/api/proxy?path=/admin/users/1/avatar` or `/api/proxy?path=/api/usage` when backend encounters missing columns or uncaught `NoneType` exceptions in unseeded organizations.
  2. **HTTP 405 (Method Not Allowed):** Occurs because Next.js App Router previously lacked explicit route handlers for all HTTP verbs (e.g., `PATCH` or `PUT`) in `web/app/api/proxy/route.ts`, or because client sent a `POST` request to an endpoint expecting `PUT` (e.g. updating settings).
* **Fix Required:** Ensure every proxy method forwards the exact HTTP verb and handles backend 500 error payloads gracefully without crashing the UI.

### Defect 3: Single Shared Password Login & Hardcoded Admin ID
* **Evidence:** Screenshot `media_1793534130375_e89a0287.jpg` (`Tizimga kirish`).
* **The Flaw:** The login form displays a hardcoded Admin Telegram ID (`6990611858`) and asks for a single password.
* **Impact:** In a multi-tenant SaaS, independent business owners cannot register or log into their own organization accounts. Every business would be logging in with the same master password into the same owner account.
* **Fix Required:** Implement a true multi-tenant authentication page supporting:
  1. Email + Password with verification.
  2. Telegram Login Widget (seamless one-click sign in via Telegram bot).
  3. Organization selection dropdown upon login.

---

## 4. Frontend Component Inventory & Status

| View / Tab | File | Status | Evaluation & Missing Capabilities |
| :--- | :--- | :---: | :--- |
| **Workspace Overview** | `web/app/Dashboard.tsx` | **Functional** | Renders stats cards, recent conversations, revenue summary. Auto-refresh works. |
| **Live Inbox** | `web/app/Dashboard.tsx` | **Partially Functional** | Shows conversation list and active chat. Takeover and resume buttons work, but vulnerable to cross-tenant leak. |
| **Knowledge Base** | `web/app/Dashboard.tsx` | **Partially Functional** | Connects channel and triggers sync. Lacks progress bar for long sync jobs. |
| **Products Catalog** | `web/app/Dashboard.tsx` | **UI-Only / Stub** | Displays hardcoded table rows. Product addition modal does not persist to database. |
| **Orders** | `web/app/Dashboard.tsx` | **Functional** | Displays AI-captured orders. Lacks filtering by status (Pending, Shipped, Cancelled). |
| **Customers** | `web/app/Dashboard.tsx` | **Functional** | Displays customer phone numbers and usernames. Lacks export to CSV/Excel. |
| **Analytics** | `web/app/Dashboard.tsx` | **UI-Only** | Charts render simulated data; does not query backend analytics aggregation. |
| **AI Settings** | `web/app/Dashboard.tsx` | **Functional** | Updates system prompt, tone, language. Settings are mistakenly global across all tenants. |
| **Usage & Limits** | `web/app/components/saas/UsageTab.tsx` | **Functional** | Displays visual percentage progress bars for AI messages, conversations, and team seats. |
| **Subscription & Invoices**| `web/app/components/saas/BillingTab.tsx` | **Functional (Mocked)**| Displays active plan, renewal date, mock invoice history. Checkout button opens mock portal. |
| **Plans & Pricing** | `web/app/components/saas/PricingTab.tsx` | **Functional** | Renders START ($19), PRO ($59), ULTRA ($149) with feature comparison checklist. |
| **Platform Owner Admin**| `web/app/components/saas/PlatformOwnerTab.tsx`| **Functional** | Super-admin view to inspect all registered tenants, MRR, and platform metrics. |
| **Onboarding Modal** | `web/app/components/saas/OnboardingModal.tsx` | **Functional** | 3-step modal to create organization, set business category, and connect channel. |

---

## 5. Frontend Architecture Recommendations

1. **Split `Dashboard.tsx`:** The 1,800-line monolithic file should be decomposed into dedicated route pages using Next.js App Router:
   * `/dashboard/inbox`
   * `/dashboard/knowledge`
   * `/dashboard/products`
   * `/dashboard/orders`
   * `/dashboard/billing`
   * `/dashboard/settings`
2. **Implement Organization Switcher in Navbar:** Replace static "PRO" badge with a Tabler dropdown menu allowing users belonging to multiple organizations to switch tenants seamlessly.
3. **Session Context Provider:** Create a React `AuthContext` to expose `currentUser`, `currentOrganization`, and `permissions` globally, avoiding redundant prop-drilling.

