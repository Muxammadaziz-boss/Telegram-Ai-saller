# AI SALES CONTROL CENTER — COMPREHENSIVE RISK REGISTER

**Document:** `docs/saas-audit/13_RISK_REGISTER.md`  
**Purpose:** Enterprise risk register detailing technical, operational, security, financial, and legal risks.

---

## 1. Risk Scoring Matrix

Risk Score = **Probability (1–5)** × **Impact (1–5)**  
* **Score 15 – 25:** **CRITICAL** (Requires immediate mitigation before commercial launch).
* **Score 9 – 14:** **HIGH** (Must be scheduled in Phase 0 or Phase 1).
* **Score 4 – 8:** **MEDIUM** (Operational monitoring & proactive controls).
* **Score 1 – 3:** **LOW** (Acceptable residual risk).

---

## 2. Risk Register Inventory

| Risk ID | Category | Risk Description | Prob (1-5) | Imp (1-5) | Score (1-25) | Severity | Mitigation Strategy | Contingency Plan |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **RSK-SEC-01** | Security | **Cross-Tenant Data Leakage (IDOR):** Insecure queries allow Org B to view Org A's customer conversations, messages, and orders. | 5 | 5 | **25** | **CRITICAL** | Implement automated tenancy middleware and strict query scoping (`WHERE organization_id = :org_id`) in all endpoints. | Immediate rollback to maintenance mode; audit database query logs for unauthorized access. |
| **RSK-SEC-02** | Security | **Telegram Webhook Secret Bypass:** Unauthenticated attackers forge messages or flood the webhook endpoint without a secret token. | 5 | 5 | **25** | **CRITICAL** | Enforce mandatory `X-Telegram-Bot-Api-Secret-Token` validation before payload processing. | Cloudflare firewall rule blocking requests without custom header. |
| **RSK-FIN-01** | Financial | **Margin Collapse via Infinite Chat Loops:** Customer bots exchange recursive messages with AI, consuming hundreds of thousands of Gemini API tokens. | 4 | 5 | **20** | **CRITICAL** | Implement cost firewall: conversation loop detector capping exchanges at 15 turns / 5 mins. | Hard billing circuit breaker killing API access when daily cost threshold is breached. |
| **RSK-OPS-01** | Operational | **Message Loss during In-Flight Restarts:** Ephemeral `asyncio.create_task` jobs dropped during container redeployments while Telegram received HTTP 200 OK. | 5 | 4 | **20** | **CRITICAL** | Replace in-memory coroutines with persistent Redis task broker (Arq / Celery). | Manual review of Telegram webhook delivery logs and customer outreach. |
| **RSK-DAT-01** | Technical | **Vector Performance Collapse:** Cosine similarity vector queries execute sequential scans without HNSW indexes as posts grow. | 4 | 4 | **16** | **CRITICAL** | Add HNSW index on `channel_posts.embedding` with tenant partitioning in Alembic. | Increase database compute memory temporarily until index creation completes. |
| **RSK-OPS-02** | Operational | **Telegram Channel Scraping Blockade:** Telegram rate-limits or serves CAPTCHAs on `t.me/s/{channel}`, breaking product knowledge sync. | 4 | 4 | **16** | **CRITICAL** | Migrate channel sync from HTTP scraping to authenticated MTProto client (Telethon/Pyrogram). | Allow merchants to manually upload CSV/Excel product catalogs or connect via Bot API. |
| **RSK-SEC-03** | Security | **Shared Environment Password Compromise:** Single `DASHBOARD_PASSWORD` leaked, granting unauthorized administrative control. | 3 | 5 | **15** | **CRITICAL** | Replace shared env password with individual multi-user accounts and bcrypt password hashing. | Rotate environment secret immediately; force session invalidation. |
| **RSK-BIL-01** | Financial | **Forged Billing Webhooks:** Attackers send unauthenticated mock webhooks to upgrade their plans for free without payment. | 3 | 4 | **12** | **HIGH** | Enforce mandatory cryptographic HMAC signature verification on Stripe/Payme webhooks. | Audit active subscriptions daily against payment gateway transaction logs. |
| **RSK-UX-01** | Product/UX | **Merchant Confusion from Single-Tenant UI:** Merchants cannot switch between multiple stores or manage team permissions cleanly. | 4 | 3 | **12** | **HIGH** | Decompose `Dashboard.tsx`, fix permission badge layouts, and implement top-bar tenant selector. | Provide customer support manual assistance during onboarding. |
| **RSK-LEG-01** | Legal | **PII & Data Protection Compliance:** Storing customer phone numbers and physical delivery addresses without clear privacy policy or consent. | 3 | 4 | **12** | **HIGH** | Draft explicit Terms of Service and Data Processing Agreement (DPA) regarding customer data storage. | Provide one-click "Delete Customer Data" (right to be forgotten) feature in CRM. |
| **RSK-API-01** | Technical | **Gemini API Outage or Rate Limiting:** Google Gemini experiences downtime or temporary token quotas exhaustion in Central Asia. | 3 | 3 | **9** | **HIGH** | Implement multi-model fallback (Gemini 2.5 Flash -> Gemini 2.0 Flash-Lite -> Groq / OpenAI fallback). | Graceful notification to customer: "Hozirda operatorlarimiz band, tez orada javob beramiz." |
| **RSK-OPS-03** | Operational | **Database Disk Exhaustion from Vector Logs:** Embeddings and high-frequency message logs fill VPS storage without log rotation. | 2 | 4 | **8** | **MEDIUM** | Configure automated WAL log truncation, S3 backup streaming, and disk usage alerts at 80%. | Automated volume auto-scaling or fast snapshot restoration. |

