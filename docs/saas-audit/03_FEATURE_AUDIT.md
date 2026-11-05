# AI SALES CONTROL CENTER — COMPREHENSIVE FEATURE AUDIT

**Document:** `docs/saas-audit/03_FEATURE_AUDIT.md`  
**Purpose:** Granular inspection and classification of every functional module across Backend, AI, Telegram, and Frontend.

---

## 1. Classification Methodology

Every capability is evaluated against the source code and categorized into one of eight states:
1. **Fully Implemented:** Production-ready, handles errors, robust validation, tested.
2. **Partially Implemented:** Functional in core path, but missing edge cases, security, or tenant scoping.
3. **UI-Only / Mock:** Rendered in frontend, but driven by static JSON or hardcoded stub state.
4. **Backend-Only:** API endpoint or service method exists, but has no corresponding frontend control.
5. **Implemented but Untested:** Code exists but lacks unit or integration tests to prove stability.
6. **Broken:** Code throws exceptions, fails at runtime, or contains architectural flaws preventing execution.
7. **Missing:** Required SaaS feature does not exist in the codebase.
8. **Not Applicable:** Out of scope for current architectural milestone.

---

## 2. Feature Inventory Matrix

| Feature / Capability | Classification | Source Code Location | API Endpoint / Route | Verifiable Behavior & Deficiencies |
| :--- | :---: | :--- | :--- | :--- |
| **Telegram Business Connection** | **Partially Implemented** | `app/api/webhooks.py:417-434`<br/>`app/models.py:TelegramConnection` | `POST /api/webhook/telegram` (`business_connection`) | Stores connection ID and rights. **Deficiency:** Revocation events (`can_reply=False`) logged but don't disable auto-reply state. |
| **Business Message Ingestion** | **Partially Implemented** | `app/api/webhooks.py:350-415` | `POST /api/webhook/telegram` (`business_message`) | Ingests text/photo, loads conversation. **Deficiency:** Dispatches via raw `asyncio.create_task()`; no retry queue. |
| **Telegram Bot Typing Loop** | **Fully Implemented** | `app/services/telegram.py:send_typing_loop()` | Internal helper | Fires `sendChatAction(upload_document/typing)` every 4s while Gemini generates output. Works well. |
| **AI Sales Reasoning & Prompting** | **Fully Implemented** | `app/services/ai.py:generate_reply()` | Internal service | Uses Gemini 2.5 Flash with Uzbekistan e-commerce context, Uzbek tone, product extraction, price formatting. |
| **Intent Detection & Extraction** | **Fully Implemented** | `app/services/ai.py:detect_intent()` | Internal service | Categorizes messages: greeting, price_inquiry, product_details, order_request, complaint, human_agent. |
| **Channel Web Scraping Ingestion** | **Broken / Fragile** | `app/services/knowledge.py:225-299` | `POST /admin/channels/sync` | Uses regex scraping on `https://t.me/s/{channel}`. **Deficiency:** Only gets last 20 posts; no pagination; fails on private channels. |
| **Channel Sync All Hardcoding** | **Broken** | `app/services/knowledge.py:301-314` | Internal periodic job | Hardcodes `organization_id=1` on line 304, causing all synced data to dump into default tenant! |
| **Image Vision OCR & Description**| **Partially Implemented** | `app/services/knowledge.py:65-98` | Internal helper | Calls Gemini Vision to describe product images. **Deficiency:** Synchronous blocking call inside ingestion loop; no image caching. |
| **Vector Search (RAG)** | **Partially Implemented** | `app/services/knowledge.py:165-210` | Internal helper | Uses `pgvector` cosine similarity (`<=>`). **Deficiency:** Searches single chunks; no document splitting; hardcoded limit=5. |
| **Live Inbox Conversation List** | **Broken (Tenant Leak)** | `app/api/admin.py:98-110` | `GET /admin/conversations` | Returns conversations across ALL organizations without tenant filter! Severe data privacy leak. |
| **Customer Chat Messages Viewer** | **Broken (IDOR)** | `app/api/admin.py:113-116` | `GET /admin/conversations/{id}/messages`| Retrieves messages by `conversation_id` without verifying tenant ownership. Any operator can read any chat. |
| **Human Takeover & AI Pause** | **Partially Implemented** | `app/api/admin.py:119-138` | `POST /admin/conversations/{id}/takeover`<br/>`POST /admin/conversations/{id}/resume` | Sets conversation `status="human_takeover"` and pauses AI. **Deficiency:** No tenant check on `conversation_id`. |
| **Operator Manual Reply** | **Partially Implemented** | `app/api/admin.py:141-168` | `POST /admin/conversations/{id}/reply` | Sends manual reply through Telegram Bot API. **Deficiency:** Can reply to other tenants' customers if ID is guessed. |
| **Product Catalog Management** | **Backend-Only** | `app/models.py:Product` | `GET /admin/products` (defined in schema) | Database model has `organization_id`, title, price, sku, stock. **Deficiency:** Frontend CRUD UI is incomplete/stubbed. |
| **Order Tracking & Capture** | **Partially Implemented** | `app/api/webhooks.py:250-280`<br/>`app/models.py:Order` | `GET /admin/orders` | AI automatically creates order record when customer confirms purchase. **Deficiency:** Missing delivery status workflow. |
| **Multi-Tenant Organization Model**| **Partially Implemented** | `app/models.py:Organization`<br/>`app/api/saas.py:223-264` | `POST /api/organizations` | Model exists with slug, plan, trial dates. **Deficiency:** No tenant switching in frontend; tenant ID accepted blindly from header. |
| **Organization Member & Roles** | **Partially Implemented** | `app/models.py:OrganizationMember`<br/>`app/core/permissions.py` | `GET /admin/admins`<br/>`POST /admin/admins` | Roles: owner, admin, operator. **Deficiency:** UI renders badges in awkward vertical layout; auth doesn't bind to member. |
| **SaaS Plans & Entitlements** | **Partially Implemented** | `app/models.py:Plan`<br/>`app/services/entitlement_service.py`| `GET /api/plans`<br/>`GET /api/entitlements` | START, PRO, ULTRA plans seeded in database. Entitlement checker can query limits. **Deficiency:** Not enforced on all endpoints. |
| **Usage Tracking & Metering** | **Partially Implemented** | `app/services/usage_service.py`<br/>`app/models.py:UsageRecord` | `GET /api/usage` | Tracks `ai_messages_count`, `active_conversations_count`. **Deficiency:** Counts are not automatically incremented on incoming msgs. |
| **Billing Integration (Stripe)** | **UI-Only / Mock** | `app/services/billing_service.py:62-120`<br/>`web/app/components/saas/BillingTab.tsx`| `POST /api/billing/checkout`<br/>`POST /api/billing/portal` | Fallback to `MockBillingProvider` when `STRIPE_SECRET_KEY` is empty. Stripe webhook has no signature verification. |
| **Frontend Authentication** | **Broken / Insecure** | `web/app/api/login/route.ts`<br/>`web/lib/session.ts` | `POST /api/login` | Single shared password (`DASHBOARD_PASSWORD`) in `.env`. Cookie stores unsigned timestamp. No user accounts. |
| **Next.js Backend Proxy** | **Broken / Insecure** | `web/app/api/proxy/route.ts` | `ANY /api/proxy?path=...` | Replaces user token with master `X-Admin-Token`, granting every logged-in user full Owner root access on backend. |
| **System Settings & Tuning** | **Partially Implemented** | `app/api/admin.py:230-265` | `GET /admin/settings`<br/>`PUT /admin/settings` | Updates AI temperature, prompt, business hours. **Deficiency:** Settings are global, not scoped per organization! |

---

## 3. Detailed Subsystem Analysis

### 3.1 Telegram Integration Subsystem
* **Webhook Reception:** Function `telegram_webhook()` in `app/api/webhooks.py` receives Telegram updates. While it correctly branches for `message`, `edited_message`, `business_connection`, and `business_message`, it completely lacks deduplication against `update_id`. If Telegram retries an update, the AI responds multiple times.
* **Message Delivery:** Uses `telegram_service.send_message()`. If Telegram returns `429 Too Many Requests` (retry-after) or `403 Forbidden` (user blocked bot), the error is logged but not handled gracefully.

### 3.2 AI & Knowledge Pipeline
* **Prompt Engineering:** System prompt in `app/services/ai.py` is well-crafted for retail sales in Uzbekistan (bilingual Uzbek/Russian, courteous polite phrasing, polite push toward order closure).
* **RAG Retrieval:** `app/services/knowledge.py` generates query embeddings using Gemini `text-embedding-004`. It performs vector cosine similarity via SQLAlchemy `pgvector`. However, channel posts are stored as whole messages without semantic chunking. Long posts exceed chunk boundaries and lose contextual granularity.

### 3.3 SaaS & Billing Architecture
* **Plan Definitions:** Seeded via `seed_saas_data()` in `app/services/saas_service.py`. Contains three plans:
  * `start`: $19/mo, 500 conversations, 1,000 messages, 1 connection, 1 channel.
  * `pro`: $59/mo, 2,500 conversations, 7,500 messages, 3 connections, 5 channels.
  * `ultra`: $149/mo, 10,000 conversations, 30,000 messages, 10 connections, 20 channels.
* **Enforcement Disconnect:** Although `entitlement_service.check_limit()` exists, it is **only invoked in a handful of isolated routes**. The primary webhook receiver in `app/api/webhooks.py` does NOT check `monthly_ai_messages` before calling Gemini, allowing tenants to generate unlimited AI replies beyond their plan limits!

