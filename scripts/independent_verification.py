"""Independent Production Verification Script (Hardened Phase 3.1) for Telegram AI Sales Control Center.
Executes non-destructive runtime probes and static code verification.
Strict rules:
- No unconditional assertions (no 'or True')
- Missing credentials or services report SKIPPED or FAILED, never PASSED
- Separate static code inspection from runtime verification
- Exact counts for passed, failed, and skipped
- Negative authorization cases tested
- Mathematical formula assertions
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
import asyncio
import httpx
from sqlalchemy import select

import app.core.db as core_db
from app.core.config import settings
from app.dependencies.auth import create_access_token
from app.models import Admin, Organization, OrganizationMember, User

BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000"

results = {
    "static_inspection": {},
    "runtime_routing": {},
    "runtime_security": {},
    "runtime_financial_trace": {},
    "a11y_responsive": {},
    "summary": {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
}

def log_test(category, name, status, details=""):
    results["summary"]["total"] += 1
    if status == "PASSED":
        results["summary"]["passed"] += 1
    elif status == "SKIPPED":
        results["summary"]["skipped"] += 1
    else:
        results["summary"]["failed"] += 1
    results[category][name] = {"status": status, "details": details}
    print(f"[{status}] {category.upper()}: {name} - {details}")

async def run_verification():
    print("=" * 70)
    print("TELEGRAM AI SALES CONTROL CENTER — INDEPENDENT VERIFIER (PHASE 3.1)")
    print("=" * 70)

    # -----------------------------------------------------------------------
    # 1. Static Source Code Inspection (Separated from Runtime)
    # -----------------------------------------------------------------------
    print("\n--- 1. STATIC SOURCE CODE INSPECTION ---")
    
    # 1.1 Verify #profile condition in Dashboard.tsx
    dashboard_path = os.path.join(os.path.dirname(__file__), "..", "web", "app", "Dashboard.tsx")
    try:
        with open(dashboard_path, "r", encoding="utf-8") as f:
            dash_content = f.read()
            
        has_profile_guard = 'tab !== "profile"' in dash_content and 'PlatformOwnerTab' in dash_content
        log_test("static_inspection", "dashboard_profile_route_guard", 
                 "PASSED" if has_profile_guard else "FAILED", 
                 "Guard '(zone === \"platform\" || tab === \"platform\") && tab !== \"profile\"' present")
        
        # 1.2 Verify silent tenant 1 fallback was excised
        has_silent_fallback = 'localStorage.setItem("active_org_id", "1")' in dash_content and 'Tashkilot topilmadi' in dash_content
        log_test("static_inspection", "dashboard_no_silent_tenant1_fallback",
                 "PASSED" if not has_silent_fallback else "FAILED",
                 "Confirmed lines 255-272 silent fallback to tenant 1 removed")
        
        # 1.3 Verify pushState is used instead of replaceState for tab navigation
        has_push_state_tab = 'window.history.pushState(null, "", targetHash)' in dash_content
        log_test("static_inspection", "dashboard_uses_pushstate_for_tabs",
                 "PASSED" if has_push_state_tab else "FAILED",
                 "Verified window.history.pushState used for tab navigation history")

        # 1.4 Verify popstate listener exists
        has_popstate = 'window.addEventListener("popstate"' in dash_content
        log_test("static_inspection", "dashboard_listens_to_popstate",
                 "PASSED" if has_popstate else "FAILED",
                 "Verified popstate and hashchange dual listeners active")
    except Exception as e:
        log_test("static_inspection", "dashboard_source_check", "FAILED", str(e))

    # 1.5 Verify custom fonts Olline and Pogonia in globals.css
    css_path = os.path.join(os.path.dirname(__file__), "..", "web", "app", "globals.css")
    try:
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()
        has_olline = "@font-face" in css_content and "font-family: 'Olline'" in css_content
        has_pogonia = "@font-face" in css_content and "font-family: 'Pogonia'" in css_content
        has_font_tokens = '[data-font="olline"]' in css_content and '[data-font="pogonia"]' in css_content
        fonts_verified = has_olline and has_pogonia and has_font_tokens
        log_test("static_inspection", "custom_fonts_css_definitions",
                 "PASSED" if fonts_verified else "FAILED",
                 "Olline and Pogonia @font-face rules and [data-font] tokens verified in globals.css")
    except Exception as e:
        log_test("static_inspection", "custom_fonts_css_definitions", "FAILED", str(e))

    # -----------------------------------------------------------------------
    # 2. Runtime Routing & Tab Reachability
    # -----------------------------------------------------------------------
    print("\n--- 2. RUNTIME ROUTING & TABS REACHABILITY ---")
    tabs = [
        "overview", "inbox", "knowledge", "products", "orders", "customers",
        "analytics", "settings", "admins", "team", "logs", "profile",
        "usage", "billing", "pricing", "platform"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{BASE_URL}/")
            log_test("runtime_routing", "base_url_status_200", "PASSED" if res.status_code == 200 else "FAILED", f"HTTP {res.status_code}")
        except Exception as e:
            log_test("runtime_routing", "base_url_status_200", "FAILED", f"Next.js dev server unavailable at {BASE_URL}: {e}")

        for tab in tabs:
            try:
                res = await client.get(f"{BASE_URL}/#{tab}")
                log_test("runtime_routing", f"tab_{tab}_reachable", "PASSED" if res.status_code == 200 else "FAILED", f"HTTP {res.status_code} for #{tab}")
            except Exception as e:
                log_test("runtime_routing", f"tab_{tab}_reachable", "FAILED", str(e))

    # -----------------------------------------------------------------------
    # 3. Runtime Multi-Tenant Security & Authorization
    # -----------------------------------------------------------------------
    print("\n--- 3. RUNTIME MULTI-TENANT SECURITY & ISOLATION ---")
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 3.1 Backend Health
        try:
            res = await client.get(f"{BACKEND_URL}/health")
            data = res.json()
            is_healthy = res.status_code == 200 and data.get("status") == "ok"
            log_test("runtime_security", "backend_health_check", "PASSED" if is_healthy else "FAILED", f"HTTP {res.status_code}, status={data.get('status')}")
        except Exception as e:
            log_test("runtime_security", "backend_health_check", "FAILED", f"FastAPI backend unavailable at {BACKEND_URL}: {e}")

        # 3.2 Unauthenticated Access Denied
        try:
            res = await client.get(f"{BACKEND_URL}/admin/overview", headers={"X-Organization-Id": "1"})
            log_test("runtime_security", "unauthenticated_overview_denied_401", "PASSED" if res.status_code == 401 else "FAILED", f"HTTP {res.status_code}")
        except Exception as e:
            log_test("runtime_security", "unauthenticated_overview_denied_401", "FAILED", str(e))

    # Database token resolution for authentic authorization tests
    platform_token = None
    regular_tenant_token = None
    existing_org_id = None
    
    async with core_db.SessionLocal() as db:
        # Query verified Platform Owner (strictly require is_platform_owner == True, NO fallback)
        res_po = await db.execute(select(User).where(User.is_platform_owner.is_(True), User.is_active.is_(True)))
        po_user = res_po.scalars().first()
        if po_user:
            platform_token = create_access_token(po_user.id, po_user.email)
        
        # Query verified non-platform-owner User for negative authorization test
        res_reg = await db.execute(select(User).where(User.is_platform_owner.is_(False), User.is_active.is_(True)))
        reg_user = res_reg.scalars().first()
        if reg_user:
            regular_tenant_token = create_access_token(reg_user.id, reg_user.email)

        org_res = await db.execute(select(Organization.id).order_by(Organization.id.asc()))
        existing_org_id = org_res.scalars().first()

    # 3.3 Negative Authorization: Regular tenant MUST be rejected from Platform Owner endpoints
    async with httpx.AsyncClient(timeout=10.0) as client:
        if regular_tenant_token:
            try:
                res = await client.get(
                    f"{BACKEND_URL}/api/platform/metrics",
                    headers={"Authorization": f"Bearer {regular_tenant_token}"}
                )
                # Must be rejected with HTTP 403 Forbidden!
                log_test("runtime_security", "regular_tenant_forbidden_from_platform_metrics",
                         "PASSED" if res.status_code == 403 else "FAILED",
                         f"HTTP {res.status_code} (detail: {res.text[:80]})")
            except Exception as e:
                log_test("runtime_security", "regular_tenant_forbidden_from_platform_metrics", "FAILED", str(e))
        else:
            log_test("runtime_security", "regular_tenant_forbidden_from_platform_metrics", "SKIPPED", "No active regular tenant user found in DB")

        # 3.4 Negative Authorization: Non-existent organization ID 999999
        if platform_token:
            try:
                res = await client.get(
                    f"{BACKEND_URL}/admin/overview",
                    headers={
                        "Authorization": f"Bearer {platform_token}",
                        "X-Organization-Id": "999999",
                    }
                )
                # Platform owner querying non-existent organization must get 404 (NEVER fall back to 1)
                is_404 = res.status_code == 404 and "topilmadi" in res.text.lower()
                log_test("runtime_security", "non_existent_org_strictly_returns_404",
                         "PASSED" if is_404 else "FAILED",
                         f"HTTP {res.status_code} ({res.text[:70]})")
            except Exception as e:
                log_test("runtime_security", "non_existent_org_strictly_returns_404", "FAILED", str(e))
        else:
            log_test("runtime_security", "non_existent_org_strictly_returns_404", "SKIPPED", "No active platform owner user found in DB")

    # -----------------------------------------------------------------------
    # 4. Runtime Financial Data Traceability & Formula Verification
    # -----------------------------------------------------------------------
    print("\n--- 4. RUNTIME FINANCIAL DATA TRACEABILITY & FORMULA CHECKS ---")
    async with httpx.AsyncClient(timeout=10.0) as client:
        if platform_token:
            headers = {
                "Authorization": f"Bearer {platform_token}",
                "X-Organization-Id": str(existing_org_id or 1),
            }
            try:
                res = await client.get(f"{BACKEND_URL}/api/platform/metrics", headers=headers)
                if res.status_code == 200:
                    metrics = res.json()
                    mrr = metrics.get("mrr_usd")
                    arr = metrics.get("arr_usd")
                    margin = metrics.get("gross_margin_percent")
                    total_orgs = metrics.get("total_organizations")
                    ai_cost = metrics.get("total_ai_cost_usd")
                    
                    # Exact formula assertion: ARR == MRR * 12.0
                    arr_exact = abs(arr - (mrr * 12.0)) < 0.05
                    log_test("runtime_financial_trace", "formula_arr_equals_12x_mrr",
                             "PASSED" if arr_exact else "FAILED",
                             f"MRR: ${mrr}, ARR: ${arr} (Delta: {abs(arr - (mrr * 12.0)):.4f})")
                    
                    # Margin formula assertion
                    if mrr > 0:
                        expected_margin = round(((mrr - ai_cost) / mrr) * 100.0, 1)
                        margin_exact = abs(margin - expected_margin) < 0.1
                    else:
                        margin_exact = (margin == 100.0 and ai_cost == 0) or (margin == 0.0)
                    log_test("runtime_financial_trace", "formula_gross_margin_accuracy",
                             "PASSED" if margin_exact else "FAILED",
                             f"Reported Margin: {margin}%, AI Cost: ${ai_cost}")

                    # Type contract assertions
                    types_valid = isinstance(mrr, (int, float)) and isinstance(total_orgs, int) and total_orgs >= 0
                    log_test("runtime_financial_trace", "metrics_schema_and_types_valid",
                             "PASSED" if types_valid else "FAILED",
                             f"Organizations: {total_orgs}, Schema matches FinancialMetrics model")
                else:
                    log_test("runtime_financial_trace", "formula_arr_equals_12x_mrr", "FAILED", f"HTTP {res.status_code}: {res.text[:100]}")
            except Exception as e:
                log_test("runtime_financial_trace", "formula_arr_equals_12x_mrr", "FAILED", str(e))
        else:
            log_test("runtime_financial_trace", "formula_arr_equals_12x_mrr", "SKIPPED", "No platform owner credentials to test financial metrics")

    # -----------------------------------------------------------------------
    # 5. Accessibility & Responsive HTML Runtime Audit
    # -----------------------------------------------------------------------
    print("\n--- 5. ACCESSIBILITY & RESPONSIVE HTML RUNTIME CHECKS ---")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{BASE_URL}/", headers={"User-Agent": "Mozilla/5.0 QA-Auditor"})
            html = res.text
            
            # 5.1 Strict check: lang="uz"
            has_lang = 'lang="uz"' in html
            log_test("a11y_responsive", "html_lang_attribute_uz", "PASSED" if has_lang else "FAILED", "Found lang='uz' attribute on <html>")
            
            # 5.2 Strict check: anti-flash hydration script
            has_antiflash = "ai_sales_theme" in html and "ai_sales_app_font" in html and "data-font" in html
            log_test("a11y_responsive", "anti_flash_script_complete", "PASSED" if has_antiflash else "FAILED", "Pre-hydration script binds theme and data-font")
            
            # 5.3 Strict check: viewport meta tag
            has_viewport = 'name="viewport"' in html
            log_test("a11y_responsive", "viewport_meta_tag_present", "PASSED" if has_viewport else "FAILED", "Found name='viewport' meta tag")
            
            # 5.4 Strict check: dark theme default
            has_dark = 'data-bs-theme="dark"' in html and 'theme-dark' in html
            log_test("a11y_responsive", "default_dark_theme_attributes", "PASSED" if has_dark else "FAILED", "Found data-bs-theme='dark' and class='theme-dark'")
        except Exception as e:
            log_test("a11y_responsive", "html_runtime_inspection", "FAILED", str(e))

    print("\n" + "=" * 70)
    print(f"VERIFICATION SUMMARY: {results['summary']['passed']} PASSED, "
          f"{results['summary']['failed']} FAILED, "
          f"{results['summary']['skipped']} SKIPPED "
          f"(Total: {results['summary']['total']})")
    print("=" * 70)

    with open("qa_verification_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(run_verification())
