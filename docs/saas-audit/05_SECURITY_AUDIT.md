# AI SALES CONTROL CENTER — APPLICATION SECURITY AUDIT & VULNERABILITY REGISTER

**Document:** `docs/saas-audit/05_SECURITY_AUDIT.md`  
**Purpose:** Formal vulnerability assessment, severity ranking, and technical remediation plan.

---

## 1. Vulnerability Summary & Severity Matrix

| ID | Title | Severity | CVSS v3.1 | Location | Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **SEC-01** | Telegram Webhook Secret Token Bypass | **CRITICAL** | **9.8** | `app/api/webhooks.py:446-450` | Confirmed Unpatched |
| **SEC-02** | Master Admin Header-Based Impersonation | **CRITICAL** | **9.8** | `app/api/admin.py:44-51` | Confirmed Unpatched |
| **SEC-03** | Next.js Proxy Universal Privilege Escalation | **CRITICAL** | **9.1** | `web/app/api/proxy/route.ts:18-25` | Confirmed Unpatched |
| **SEC-04** | Insecure Direct Object Reference (IDOR) in Live Inbox | **HIGH** | **8.5** | `app/api/admin.py:98-150` | Confirmed Unpatched |
| **SEC-05** | Unsigned Anonymous Session Token in Next.js | **HIGH** | **7.5** | `web/lib/session.ts:10-25` | Confirmed Unpatched |
| **SEC-06** | Unauthenticated Stripe Webhook Endpoint | **HIGH** | **7.5** | `app/api/saas.py:365-384` | Confirmed Unpatched |
| **SEC-07** | Hardcoded Secrets in Config Fallbacks | **MEDIUM** | **6.5** | `app/core/config.py:32-35` | Confirmed Unpatched |
| **SEC-08** | Unbounded Vector RAG Query & AI Prompt Injection | **MEDIUM** | **5.8** | `app/services/ai.py:180-220` | Confirmed Unpatched |
| **SEC-09** | Lack of Rate Limiting & DoS on Public Webhook | **MEDIUM** | **5.3** | `app/api/webhooks.py:437-470` | Confirmed Unpatched |

---

## 2. In-Depth Vulnerability Analysis

---

### SEC-01: Telegram Webhook Secret Token Bypass
* **Severity:** **CRITICAL (CVSS: 9.8)** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
* **Vulnerable Code:** `app/api/webhooks.py` lines 446–450:
  ```python
  expected = settings.telegram_webhook_secret
  if expected and x_telegram_bot_api_secret_token:
      if not hmac.compare_digest(expected, x_telegram_bot_api_secret_token):
          raise HTTPException(status_code=401, detail="Invalid Telegram webhook secret")
  ```
* **Vulnerability Description:** The validation logic checks the secret token **only if the header is present**. If an attacker sends an HTTP POST request to `/api/webhook/telegram` without providing the `X-Telegram-Bot-Api-Secret-Token` header, the condition `expected and x_telegram_bot_api_secret_token` evaluates to `False`. The request bypasses authentication completely!
* **Impact:** An attacker can forge incoming customer messages, trigger unauthorized Gemini LLM calls (causing high financial API costs), inject fabricated orders, or manipulate conversation states.
* **Remediation:**
  ```python
  expected = settings.telegram_webhook_secret
  if expected:
      if not x_telegram_bot_api_secret_token or not hmac.compare_digest(expected, x_telegram_bot_api_secret_token):
          raise HTTPException(status_code=401, detail="Invalid or missing Telegram webhook secret")
  ```

---

### SEC-02: Master Admin Header-Based Impersonation
* **Severity:** **CRITICAL (CVSS: 9.8)** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
* **Vulnerable Code:** `app/api/admin.py` lines 44–51:
  ```python
  if x_admin_telegram_id:
      try:
          tid = int(x_admin_telegram_id)
      except ValueError:
          pass
      else:
          admin = await admin_service.get_admin_by_telegram_id(db, tid)
          if admin is not None:
              return admin
  ```
* **Vulnerability Description:** If the FastAPI backend port (8000) is directly accessible (or accessed via an internal network / SSR route), a client can pass `X-Admin-Telegram-ID: 6990611858` without supplying any password, secret key, or token. The backend unconditionally authenticates the caller as the Master Owner!
* **Impact:** Complete administrative takeover of the backend database, settings, and business connections.
* **Remediation:** Remove header-based user impersonation completely. Replace with standard Bearer JWT authentication verified against an asymmetric key or cryptographic secret.

---

### SEC-03: Next.js Proxy Universal Privilege Escalation
* **Severity:** **CRITICAL (CVSS: 9.1)** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`
* **Vulnerable Code:** `web/app/api/proxy/route.ts` lines 18–25:
  ```python
  const orgId = request.headers.get("x-organization-id") || request.nextUrl.searchParams.get("organization_id");
  const headers: Record<string, string> = {
    "X-Admin-Token": token,
    "Content-Type": "application/json",
  };
  if (orgId) {
    headers["X-Organization-Id"] = orgId;
  }
  ```
* **Vulnerability Description:** The Next.js proxy route injects the backend master secret (`X-Admin-Token: super_secret_admin_token_2026_xyz`) into **every single forwarded request**. Furthermore, it allows the browser client to dictate the target tenant by passing `x-organization-id`.
* **Impact:** Any user who has a valid session (e.g. an operator or tenant admin) is promoted to global platform owner on the FastAPI backend, and can access any organization's data by simply providing a different `x-organization-id` header.
* **Remediation:** Remove static master token forwarding. Forward the user's authentic JWT bearer token containing their verified `user_id` and authorized `organization_id`.

---

### SEC-04: Cross-Tenant Insecure Direct Object Reference (IDOR)
* **Severity:** **HIGH (CVSS: 8.5)** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`
* **Vulnerable Code:** `app/api/admin.py` lines 113–128:
  ```python
  @router.get("/conversations/{conversation_id}/messages")
  async def get_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
      rows = (await db.execute(select(Message).where(Message.conversation_id == conversation_id)...)).scalars().all()
      return [...]
  ```
* **Vulnerability Description:** The endpoint fetches messages purely based on `conversation_id`. It does not verify whether `Conversation.organization_id` matches the caller's organization.
* **Impact:** A tenant operator can iterate over integer `conversation_id` values (e.g., 1, 2, 3...) and read private communications, phone numbers, delivery addresses, and order histories of all other businesses on the platform.
* **Remediation:** Join `Conversation` on `Message.conversation_id` and enforce `Conversation.organization_id == current_user.organization_id`.

---

### SEC-05: Unsigned Anonymous Session Token in Next.js
* **Severity:** **HIGH (CVSS: 7.5)** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`
* **Vulnerable Code:** `web/lib/session.ts` lines 10–13:
  ```typescript
  export function createSessionToken(secret: string) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    return `v1.${timestamp}.${signature(timestamp, secret)}`;
  }
  ```
* **Vulnerability Description:** The session cookie contains only a timestamp and an HMAC signature of that timestamp. It does NOT contain the user ID, role, or organization ID. Consequently, all logged-in sessions are completely anonymous and interchangeable.
* **Remediation:** Replace with standard JWT containing payload: `{ sub: user_id, org_id: organization_id, role: role, exp: timestamp }`.

---

### SEC-06: Unauthenticated Stripe Webhook Endpoint
* **Severity:** **HIGH (CVSS: 7.5)** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`
* **Vulnerable Code:** `app/api/saas.py` lines 365–384 & `app/services/billing_service.py` lines 180–210.
* **Vulnerability Description:** The billing webhook endpoint receives `stripe_signature` from the header, but if Stripe is not configured, or if the mock provider is active, it does not verify cryptographic signatures. An attacker can POST synthetic `checkout.session.completed` events and upgrade any organization to the `ultra` plan for free.
* **Remediation:** Enforce mandatory cryptographic signature verification via `stripe.Webhook.construct_event()` with the webhook signing secret. Reject requests if the secret is not configured in production.

---

## 3. Secret Management & Environment Hygiene

During the audit, the following secrets were observed with default fallbacks in source code:
* `admin_api_token = "super_secret_admin_token_2026_xyz"` (`app/core/config.py:32`)
* `telegram_webhook_secret = "webhook_secret_2026_abc123"` (`app/core/config.py:35`)
* `SESSION_SECRET = "session_signing_secret_key_random_2026_abc"` (`web/app/api/proxy/route.ts:7`)

**Requirement:** All hardcoded fallback secrets must be purged. The application must refuse to start in production (`ENVIRONMENT=production`) if high-entropy secrets are not explicitly provided via environment variables.

