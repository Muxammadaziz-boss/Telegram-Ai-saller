# AI SALES CONTROL CENTER — PRODUCT OWNER DECISION MATRIX

**Document:** `docs/saas-audit/14_DECISIONS_REQUIRED.md`  
**Purpose:** Unresolved business, architectural, and operational decisions requiring sign-off from the Product Owner.

---

## 1. Decision Inventory & Urgency Matrix

| Decision ID | Decision Topic | Impacted Phase | Urgency | Architect's Recommendation |
| :--- | :--- | :---: | :---: | :--- |
| **DEC-01** | Regional Currency & Pricing Units (USD vs UZS) | Phase 8 | **High** | Dual Currency: USD for international, UZS (Uzcard/Humo) for Uzbekistan. |
| **DEC-02** | Payment Gateway Strategy | Phase 8 | **High** | Payme / Click for domestic Uzbekistan; Stripe for international cards. |
| **DEC-03** | Free Trial Policy & Payment Card Requirement | Phase 5 | **High** | 7-day free trial WITHOUT card upfront to maximize user acquisition. |
| **DEC-04** | Telegram Channel Knowledge Ingestion Mechanism | Phase 6 | **Critical** | Dual strategy: Bot Admin for new posts; MTProto userbot for historical import. |
| **DEC-05** | Human Handoff Push Alert Channel | Phase 4 | **Medium** | Dedicated Telegram Notification Bot pushing alerts directly to operator's phone. |
| **DEC-06** | AI Quota Exhaustion Behavior (Hard vs Soft Cap) | Phase 5 | **Medium** | Soft Cap: pause AI auto-reply, switch conversation to Human, notify merchant. |
| **DEC-07** | Primary User Authentication Standard | Phase 3 | **High** | Telegram Login Widget + Email/Password fallback. |
| **DEC-08** | Cloud Infrastructure & Hosting Topology | Phase 9 | **Medium** | Dedicated VPS (Hetzner 8 vCPU/32GB) with Docker Compose + Managed Backups. |

---

## 2. In-Depth Decision Breakdown

---

### DEC-01: Regional Currency & Pricing Units
* **Context:** The current proposal lists pricing in USD ($19 / $59 / $149). However, over 90% of prospective Telegram Business clients in Uzbekistan operate in Uzbek Som (UZS) using domestic bank cards (Uzcard, Humo).
* **Options:**
  * **Option A (USD Only):** Simplifies international accounting, but creates severe friction for local businesses without Visa/Mastercard.
  * **Option B (Dual Currency - Recommended):** Set official pricing in UZS for the local market (250,000 UZS / 750,000 UZS / 1,900,000 UZS) and USD for foreign accounts.
* **Impact:** Requires multi-currency support in the `plans` table and checkout router.

---

### DEC-02: Payment Gateway Selection
* **Context:** The codebase currently has a mock implementation and preliminary Stripe provider in `app/services/billing_service.py`. Stripe does NOT support Uzbek bank accounts or Uzcard/Humo cards directly.
* **Options:**
  * **Option A (Stripe Alone):** Fast to build, but blocks 85%+ of local merchants in Uzbekistan.
  * **Option B (Stripe + Payme / Click - Recommended):** Integrate Payme Merchant API and Click Acquiring alongside Stripe.
* **Impact:** Adds 3 days to Phase 8 (Billing Gateways).

---

### DEC-03: Free Trial Policy & Card Requirement
* **Context:** The current system provides a 7-day trial upon organization creation.
* **Options:**
  * **Option A (Require Card Upfront):** Higher quality leads, lower fraud, but reduces sign-up conversion by 60%–70%.
  * **Option B (No Card Required Upfront - Recommended):** Maximum viral sign-ups. At day 7, AI auto-replies are suspended until the merchant enters payment.
* **Impact:** Requires automated trial expiration check in Phase 5.

---

### DEC-04: Telegram Channel Knowledge Ingestion Mechanism
* **Context:** As proven in `08_AI_AND_RAG_AUDIT.md`, the current web scraper (`t.me/s/{channel}`) only captures the last 20 posts and completely fails on private channels.
* **Options:**
  * **Option A (Bot Admin in Channel):** Require merchant to add the AI bot as an Admin in their channel. The bot receives real-time `channel_post` updates via the official Telegram Bot API. *(Pros: 100% compliant with Telegram TOS; Cons: Cannot read historical posts before the bot was added).*
  * **Option B (MTProto Userbot Client):** Connect an authenticated Telegram user session (Telethon/Pyrogram) to scrape full historical post archives. *(Pros: Fetches thousands of historical posts; Cons: Risk of Telegram phone number bans if aggressive).*
  * **Option C (Hybrid - Recommended):** Use Bot Admin for all ongoing new/edited posts. Provide an optional MTProto userbot runner or manual catalog file import (Excel/CSV) for historical bootstrap.
* **Impact:** Dictates the architecture of Phase 6.

---

### DEC-05: Human Handoff Push Alert Channel
* **Context:** When a customer requests a human operator or files a complaint, the AI pauses and marks the conversation as `human_takeover`. Currently, operators are not alerted unless they have the web dashboard open.
* **Options:**
  * **Option A (Web Dashboard Live Inbox Only):** Low development effort, but operators miss customer inquiries if they are away from their computers.
  * **Option B (Dedicated Telegram Notification Bot - Recommended):** Build a companion notification bot (`@AISalesAlertBot`) that sends an instant Telegram message with customer details and a "Qabul qilish" (Takeover) inline button directly to the operator's personal Telegram account.
* **Impact:** Adds 1.5 days to Phase 4.

---

### DEC-06: AI Quota Exhaustion Policy
* **Context:** What should happen when an organization reaches 100% of its monthly AI message quota (e.g. 1,000 messages on START plan)?
* **Options:**
  * **Option A (Hard Stop):** Bot abruptly ceases replying. Customer is left hanging.
  * **Option B (Graceful Human Handoff + Alert - Recommended):** Bot automatically routes the conversation to human operators, sends an SMS/Telegram alert to the merchant ("Sizning oylik AI limit tugadi, suhbat operatorga o'tkazildi"), and prompts an instant top-up.
  * **Option C (Automatic Overage Billing):** Automatically charge $5 for the next 1,000 messages (only viable with credit card on file).
* **Impact:** Dictates logic in `app/workers/telegram_worker.py`.

---

### DEC-07: Primary User Authentication Standard
* **Context:** The current system has no user accounts (only a shared environment password).
* **Options:**
  * **Option A (Traditional Email & Password):** Standard SaaS pattern, but Telegram channel owners in Central Asia strongly favor Telegram-native interactions.
  * **Option B (Telegram Login Widget - Recommended):** One-click sign-in using their Telegram account. Seamlessly binds their Telegram ID for operator notifications. Email/password provided as a secondary option.
* **Impact:** Dictates Phase 3 frontend and backend authentication design.

---

### DEC-08: Cloud Infrastructure & Hosting Topology
* **Context:** The application currently runs on a local Windows machine with localhost reverse tunnels.
* **Options:**
  * **Option A (Single High-Performance VPS - Recommended for Initial Launch):**
    * Hetzner Cloud CPX51 (8 vCPU, 32GB RAM, 240GB NVMe) = **~$35/month**.
    * Runs Docker Compose: Nginx + FastAPI + Celery Workers + Redis 7 + PostgreSQL 16 + Next.js SSR.
    * Sufficient for the first 100–300 active paying businesses.
  * **Option B (Fully Managed Cloud - AWS / Google Cloud):**
    * Cloud Run + Cloud SQL + ElastiCache Redis = **~$250–$400/month**.
    * Highly scalable, but significantly higher upfront operational overhead.
* **Impact:** Dictates Phase 9 infrastructure configuration.

