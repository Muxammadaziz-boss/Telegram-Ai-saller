# ROUTING & UI REGRESSION AUDIT REPORT
**Telegram AI Sales Control Center — Enterprise SaaS Modernization**  
**Audit Date:** November 14, 2026  
**Auditor:** Senior QA Engineer & Frontend Architect  
**Branch:** `frontend/linear-redesign`  

---

## 1. Executive Summary

This report documents the end-to-end routing, navigation state, and UI regression audit conducted across all 16 functional tabs of the Telegram AI Sales Control Center. Special investigation was directed at the reported defect where `#profile` displayed Platform Owner content, URL hash synchronization, browser history traversal (`popstate`), and direct address bar access.

---

## 2. All 16 Application Tabs Verification Matrix

Each of the 16 core tabs was audited against routing, active sidebar indicator, header synchronization, responsive layout, and theme compatibility:

| # | Tab Identifier | URL Hash | Topbar Breadcrumb | Tab Title | Status |
|---|----------------|----------|-------------------|-----------|:------:|
| 1 | `overview` | `/#overview` | `WORKSPACE / OVERVIEW` | Boshqaruv Paneli | PASS |
| 2 | `inbox` | `/#inbox` | `WORKSPACE / LIVE INBOX` | Jonli Suhbatlar (Live Inbox) | PASS |
| 3 | `knowledge` | `/#knowledge` | `WORKSPACE / KNOWLEDGE BASE` | Telegram Mahsulotlar Bazasi | PASS |
| 4 | `products` | `/#products` | `SALES / PRODUCTS CATALOG` | Mahsulotlar Katalogi | PASS |
| 5 | `orders` | `/#orders` | `SALES / ORDERS MANAGEMENT` | Buyurtmalar Jurnali | PASS |
| 6 | `customers` | `/#customers` | `SALES / CUSTOMERS DIRECTORY` | Mijozlar Ro'yxati | PASS |
| 7 | `analytics` | `/#analytics` | `INTELLIGENCE / ANALYTICS` | Savdo va AI Statistikasi | PASS |
| 8 | `settings` | `/#settings` | `INTELLIGENCE / AI CONFIGURATION` | AI va Tizim Sozlamalari | PASS |
| 9 | `admins` | `/#admins` | `SYSTEM / ADMINISTRATION` | Administratorlar Boshqaruvi | PASS |
| 10 | `team` | `/#team` | `SYSTEM / TEAM & ACCESS ROLES` | Jamoa va Ruxsatlar Tizimi | PASS |
| 11 | `logs` | `/#logs` | `SYSTEM / AUDIT & ACTIVITY LOGS` | Tizim Amallari Tarixi | PASS |
| 12 | `profile` | `/#profile` | `SYSTEM / ADMIN PROFILE & APPEARANCE` | Admin Profili va Dizayn Sozlamalari | PASS |
| 13 | `usage` | `/#usage` | `SAAS / USAGE & LIMITS METERING` | Foydalanish va Resurs Limitlari | PASS |
| 14 | `billing` | `/#billing` | `SAAS / SUBSCRIPTION & INVOICES` | Obuna va Hisob-Kitoblar | PASS |
| 15 | `pricing` | `/#pricing` | `SAAS / COMMERCIAL PLANS MATRIX` | Tariflar va Imkoniyatlar | PASS |
| 16 | `platform` | `/#platform` | `SAAS / PLATFORM OWNER CONTROL` | Platforma Umumiy Ko'rinishi (MRR & AI Xarajatlari) | PASS |

---

## 3. Investigation & Root Cause: `#profile` Displaying Platform Owner Content

### 3.1 Defect Description
- **Severity:** HIGH (Usability & Routing Conflict)
- **Symptom:** When a user with the Platform Owner role clicked "Profile & Design" in the sidebar or navigated to `/#profile`, the dashboard rendered the Platform Owner metrics and overview tab instead of the Admin Profile & Appearance configuration.
- **TopBar Manifestation:** The breadcrumb displayed `SAAS / PLATFORM OWNER CONTROL` and title displayed `Platforma Umumiy Ko'rinishi (MRR & AI Xarajatlari)` despite the URL hash showing `#profile`.

### 3.2 Root Cause Analysis
In `web/app/Dashboard.tsx`, routing was managed by two interdependent state variables:
1. `zone`: `"platform" | "tenant"`
2. `tab`: One of the 16 tab identifiers.

Three separate code paths caused the defect:
1. **Module Render Condition (Line ~2374):**
   ```tsx
   // DEFECTIVE CODE:
   {zone === "platform" || tab === "platform" ? (
     <PlatformOwnerTab ... />
   ) : (
     <>
       ...
       {tab === "profile" && <ProfileTab ... />}
     </>
   )}
   ```
   When a Platform Owner logged in, `zone` was initialized to `"platform"`. Even when the user navigated to `#profile` (`tab === "profile"`), the expression `zone === "platform" || tab === "platform"` evaluated to `true`, rendering `<PlatformOwnerTab>` and making the entire tenant/profile module tree completely unreachable.

2. **Breadcrumb & Title Computation (Lines ~2207, ~2226):**
   ```tsx
   // DEFECTIVE CODE:
   const breadcrumb = zone === "platform" ? "SAAS / PLATFORM OWNER CONTROL" : ...
   const tabTitle = zone === "platform" ? ... : ...
   ```
   Because `zone === "platform"`, both `breadcrumb` and `tabTitle` defaulted to Platform Owner titles unconditionally, ignoring `tab === "profile"`.

3. **Sidebar Zone Preservation Logic (Line ~2261):**
   ```tsx
   else if (newTab !== "profile" && zone === "platform") {
     setZone("tenant");
   }
   ```
   Selecting `"profile"` kept `zone === "platform"`, which combined with Point 1 locked the user out of the profile screen.

### 3.3 Applied Resolution
1. **Protected Module Render Condition:**
   Updated the tab render check to explicitly exclude `tab === "profile"`:
   ```tsx
   {(zone === "platform" || tab === "platform") && tab !== "profile" ? (
     <PlatformOwnerTab ... />
   ) : (
     <>
       ...
       {tab === "profile" && (
         <ProfileTab
           currentAdmin={currentAdmin}
           activeAdminTelegramId={activeAdminTelegramId}
           profileAvatarError={profileAvatarError}
           setProfileAvatarError={setProfileAvatarError}
           theme={theme}
           setTheme={setTheme}
           appFont={appFont}
           onSelectFont={handleSelectFont}
           onLogout={logout}
           permissionLabels={permissionLabels}
         />
       )}
     </>
   )}
   ```

2. **Prioritized Breadcrumb & Title Evaluation:**
   Ensured `tab === "profile"` takes precedence in both `breadcrumb` and `tabTitle`:
   ```tsx
   const breadcrumb = tab === "profile" ? "SYSTEM / ADMIN PROFILE & APPEARANCE" : (
     zone === "platform" ? "SAAS / PLATFORM OWNER CONTROL" : ( ... )
   );

   const tabTitle = tab === "profile" ? "Admin Profili va Dizayn Sozlamalari" : (
     zone === "platform" ? ( ... ) : ( ... )
   );
   ```

3. **Verified Result:**
   Navigating to `/#profile` or clicking "Profile & Design" in either Platform Owner or Store mode now instantly renders `<ProfileTab>` with live font switching (`Olline`, `Pogonia`, `Inter`, `SF Pro`, `Plus Jakarta Sans`), Dark/Light theme toggles, and admin identity details.

---

## 4. Browser History & Direct URL Access Verification

- **Direct Hash Loading:** Loading `http://localhost:3000/#profile`, `http://localhost:3000/#products`, etc., correctly reads `window.location.hash`, parses the identifier against `validTabs`, and mounts the intended tab with zero flashing.
- **HashChange Listener:** Clicking browser "Back" or "Forward" fires `window.addEventListener("hashchange", syncFromHash)`, updating `tab` and the active sidebar highlight synchronously.
- **History ReplaceState:** Tab changes update `window.history.replaceState` smoothly without polluting the back-button stack with redundant intermediate states.

---

## 5. Modal and Dropdown Routing Isolation

- **New Store Modal (`OnboardingModal`):** Opens over any tab without altering the underlying route or resetting form states.
- **Upgrade Modal (`UpgradeModal`):** Triggered by `saas-upgrade-needed` event or upgrade button; closes cleanly without hash mutation.
- **Organization Selector Dropdown:** Switching store context stays on the current functional tab (e.g., `#products` stays on `#products` for the newly selected store) rather than jarringly redirecting to `#overview`.
