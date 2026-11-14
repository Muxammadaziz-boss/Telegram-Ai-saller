# MULTI-TENANT AUTHORIZATION MATRIX & SECURITY REPORT — PHASE 3.1

**Project:** Telegram AI Sales Control Center  
**Repository:** `https://github.com/Muxammadaziz-boss/Telegram-Ai-saller.git`  
**Branch:** `frontend/linear-redesign`  
**Security Standard:** Multi-Tenant Defense-in-Depth & RBAC Isolation  
**Date:** 2026-11-14  
**Audit Status:** FULLY VERIFIED & ISOLATED

---

## 1. Multi-Tenant Architecture Overview

The Telegram AI Sales Control Center operates on a shared-database, row-level tenant isolation architecture where every tenant-sensitive database entity is scoped by `organization_id`:

- `User`: Tied to `organization_id`. Carries `is_platform_owner: bool` for super-admin capabilities.
- `Conversation`, `Message`: Scoped by `organization_id`.
- `Product`, `Order`: Scoped by `organization_id`.
- `Subscription`, `Plan`: Tied to `organization_id`.
- `UsageRecord`: Scoped by `organization_id`, `metric`, and `period`.
- `AuditLog`: Global and tenant-specific event stream.

Authorization is enforced at the FastAPI backend routing layer through dependency injection (`get_current_user`, `get_current_tenant`, `require_platform_owner`), guaranteeing that client-side route spoofing cannot bypass backend security boundaries.

---

## 2. Multi-Tenant Authorization Matrix

The table below outlines authorization rules, required scopes, positive access cases, and negative isolation enforcement across all sensitive endpoints:

| Endpoint Route | HTTP Method | Required Role | Tenant Context Scoping | Positive Test Case | Negative Test Case (Attack Scenario) | Enforcement Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/platform/metrics` | GET | `Platform Owner` | Global SaaS | Owner (`is_platform_owner=True`) retrieves MRR, ARR, and store list | Regular tenant admin accesses endpoint | **HTTP 403 Forbidden** |
| `/api/platform/stores` | GET | `Platform Owner` | Global SaaS | Owner lists all 86 organizations across database | Tenant user attempts store enumeration | **HTTP 403 Forbidden** |
| `/api/platform/stores/{id}` | GET/PUT | `Platform Owner` | Target Store ID | Owner inspects/updates store metadata and subscription | Tenant owner modifies another tenant's store settings | **HTTP 403 Forbidden** |
| `/api/platform/impersonate` | POST | `Platform Owner` | Target Store ID | Owner impersonates store `org_id=2`; audit log written | Non-owner attempts to impersonate store `org_id=2` | **HTTP 403 Forbidden** |
| `/api/conversations` | GET | `Store Admin` / `Owner` | `user.organization_id` | Store admin sees only conversations for their store | User A passes `organization_id=2` query parameter | **Filtered strictly to User A's `org_id`** |
| `/api/conversations/{id}` | GET/POST | `Store Admin` / `Owner` | Object `org_id` match | Admin views conversation belonging to their own store | User A attempts Direct Object Reference to conv of Store B | **HTTP 404 Not Found / 403** |
| `/api/products` | GET/POST | `Store Admin` / `Owner` | `user.organization_id` | Admin creates and manages products for own store | User A attempts to edit product ID belonging to Store B | **HTTP 404 Not Found / 403** |
| `/api/orders` | GET/PATCH | `Store Admin` / `Owner` | `user.organization_id` | Admin views and updates order status for own store | User A attempts to modify order belonging to Store B | **HTTP 404 Not Found / 403** |
| `/api/knowledge` | GET/POST | `Store Admin` / `Owner` | `user.organization_id` | Admin adds Q&A posts to own store knowledge base | User A attempts to delete knowledge post of Store B | **HTTP 404 Not Found / 403** |
| `/api/admins` | GET/POST | `Store Owner` | `user.organization_id` | Store owner invites sub-admin to own store | Sub-admin attempts to elevate privileges or invite cross-tenant | **HTTP 403 Forbidden** |
| `/api/tenants/{id}` | GET | Any authenticated | Target Tenant ID | User accesses valid existing tenant ID | User passes non-existent tenant `id=999999` | **HTTP 404 (No silent fallback)** |

---

## 3. Impersonation & Security Audit Trail

To enable super-admin support while maintaining complete regulatory compliance, Platform Owner impersonation adheres to the following strict requirements:

### 3.1 Impersonation Lifecycle
1. **Initiation:** Platform Owner selects a store in `#platform` and initiates support view.
2. **Audit Event Logged:**
   ```json
   {
     "action": "platform_owner_impersonation_start",
     "actor_user_id": 1,
     "actor_email": "admin@telegram-ai.uz",
     "target_organization_id": 2,
     "timestamp": "2026-11-14T10:14:22Z",
     "ip_address": "127.0.0.1"
   }
   ```
3. **Frontend Impersonation Banner:**
   An amber sticky alert banner is displayed at the top of the interface:
   > ⚠️ **Siz hozirda "Do'kon #2" do'koni nomidan ko'rmoqdasiz (Platform Owner Imkoniyati).**  
   > *[Platforma Boshqaruviga Qaytish]* button is persistently visible.
4. **Termination:** Platform Owner clicks return button or navigates to `#platform`.
5. **Audit Event Logged:**
   ```json
   {
     "action": "platform_owner_impersonation_exit",
     "actor_user_id": 1,
     "target_organization_id": 2,
     "timestamp": "2026-11-14T10:15:05Z"
   }
   ```

### 3.2 Tenant Isolation Rule: Tenant Admins Cannot Impersonate
Non-platform owners attempting to call `/api/platform/impersonate` or send `X-Tenant-Override` headers receive an immediate `HTTP 403 Forbidden`. Under no circumstances can a store owner explore or mutate another store's data.

---

## 4. Stale Tenant Context Recovery & 404 Guarantees

A critical architectural fix in Phase 3.1 addressed stale tenant context recovery:

- **Historical Flaw:** Previously, if a request to `/api/tenants/{id}` returned HTTP 404, the frontend catch block caught the error and automatically fell back to `organization_id = 1`.
- **Security Hardening Applied:**
  ```typescript
  // web/app/Dashboard.tsx
  // Stale tenant handler: Never silently mask missing tenants
  if (response.status === 404) {
    console.error(`Tenant ${targetId} not found.`);
    setTenantNotFound(true);
    // Explicitly preserve error state and prompt user; DO NOT silently switch to org 1
    return;
  }
  ```
- **Automated Verification:**
  - Tested probe with `tenant_id=999999`.
  - Verified backend returned `HTTP 404 Not Found`.
  - Verified frontend remained on 404 boundary without mutating active tenant ID to 1.

---

## 5. Security Certification

All negative authorization tests, cross-tenant isolation boundaries, and audit trail mechanisms have been verified in both automated Python integration tests (`scripts/independent_verification.py`, `pytest`) and browser E2E test runs. The multi-tenant architecture satisfies enterprise SaaS isolation requirements.
