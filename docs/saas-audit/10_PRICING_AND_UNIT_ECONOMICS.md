# AI SALES CONTROL CENTER — PRICING ARCHITECTURE & UNIT ECONOMICS MODEL

**Document:** `docs/saas-audit/10_PRICING_AND_UNIT_ECONOMICS.md`  
**Purpose:** Quantitative financial analysis, COGS (Cost of Goods Sold) modeling, Gemini API cost estimation, gross margin calculation, and pricing sustainability assessment.

---

## 1. Proposed SaaS Pricing Tiers Overview

The product roadmap defines three initial subscription tiers:

| Tier Parameter | START Plan | PRO Plan (Recommended) | ULTRA Plan |
| :--- | :---: | :---: | :---: |
| **Monthly Subscription** | **$19 / month** | **$59 / month** | **$149 / month** |
| **Annual Subscription** | **$190 / year** (~$15.83/mo) | **$590 / year** (~$49.16/mo) | **$1,490 / year** (~$124.16/mo) |
| **Monthly AI Messages** | 1,000 | 7,500 | 30,000 |
| **Monthly AI Conversations** | 500 | 2,500 | 10,000 |
| **Telegram Business Accounts**| 1 | 3 | 10 |
| **Connected Channels** | 1 | 5 | 20 |
| **Knowledge Base Posts** | 500 | 5,000 | 25,000 |
| **Product Catalog SKUs** | 100 | 1,000 | 10,000 |
| **Customer Directory** | 1,000 | 10,000 | 50,000 |
| **Team Member Seats** | 2 | 10 | Unlimited (Default: 50) |
| **AI Model Tier** | Gemini 2.5 Flash / Lite | Gemini 2.5 Flash | Gemini 2.5 Flash / Pro |
| **Image Understanding** | Limited (Max 50/mo) | Standard (Max 500/mo) | Unlimited (Fair Use) |
| **API & Webhooks** | No | Yes | Yes |

---

## 2. Infrastructure & Variable Cost Breakdown (COGS)

To calculate gross margins, we model every variable cost component per organization per month.

### 2.1 Gemini API Pricing Assumptions (Google AI Studio / Vertex AI)
* **Gemini 2.5 Flash:**
  * Input: $0.075 per 1,000,000 tokens ($0.000075 / 1k tokens)
  * Output: $0.30 per 1,000,000 tokens ($0.00030 / 1k tokens)
  * Multimodal Image Input: ~$0.00013 per image
* **Gemini Text Embedding 004:**
  * $0.00002 per 1,000 tokens
* **Average Consumption per Sales Turn:**
  * Intent Detection: 350 input + 50 output tokens = **$0.000041**
  * Vector Query: 120 input tokens = **$0.000002**
  * RAG Sales Reply: 1,800 input + 250 output tokens = **$0.000210**
  * **Blended Cost per Inbound Message Turn:** **~$0.000253 (~$0.25 per 1,000 messages)**

### 2.2 Payment Gateway Processing Fees
* **Stripe:** 2.9% + $0.30 per transaction.
* **Payme / Click (Uzbekistan local cards - Uzcard/Humo):** 1.5% to 2.0% flat.
* Blended fee modeled at **3.5% of subscription price**.

### 2.3 Shared Cloud Hosting Compute (Per-Tenant Allocation)
* Estimated VPS infrastructure (4 vCPU, 16GB RAM, Managed PostgreSQL, Redis) costs ~$80/month.
* At 100 active organizations, fixed infrastructure cost is **~$0.80 per organization/month**.

---

## 3. Unit Economics & Gross Margin Analysis

We evaluate each plan under two scenarios:
1. **Expected Typical Usage (40% utilization of monthly quotas).**
2. **Worst-Case Ceiling (100% utilization of monthly quotas + full channel ingestion).**

### 3.1 START Plan ($19 / month)

| Cost Component | Typical Usage (40%) | 100% Quota Ceiling |
| :--- | :---: | :---: |
| **AI Messages (Turns)** | 400 turns | 1,000 turns |
| **Gemini Conversational API Cost** | $0.10 | $0.25 |
| **Channel Ingestion (500 posts + 100 photos)** | $0.05 | $0.08 |
| **Payment Gateway Processing (3.5% + $0.30)** | $0.97 | $0.97 |
| **Allocated Hosting & Database** | $0.80 | $0.80 |
| **Total Monthly COGS** | **$1.92** | **$2.10** |
| **Gross Profit ($19.00 - COGS)** | **$17.08** | **$16.90** |
| **Gross Margin Percentage** | **89.9%** | **88.9%** |

---

### 3.2 PRO Plan ($59 / month)

| Cost Component | Typical Usage (40%) | 100% Quota Ceiling |
| :--- | :---: | :---: |
| **AI Messages (Turns)** | 3,000 turns | 7,500 turns |
| **Gemini Conversational API Cost** | $0.76 | $1.90 |
| **Channel Ingestion (5,000 posts + 500 photos)** | $0.25 | $0.60 |
| **Payment Gateway Processing (3.5% + $0.30)** | $2.37 | $2.37 |
| **Allocated Hosting & Database** | $0.80 | $0.80 |
| **Total Monthly COGS** | **$4.18** | **$5.67** |
| **Gross Profit ($59.00 - COGS)** | **$54.82** | **$53.33** |
| **Gross Margin Percentage** | **92.9%** | **90.4%** |

---

### 3.3 ULTRA Plan ($149 / month)

| Cost Component | Typical Usage (40%) | 100% Quota Ceiling |
| :--- | :---: | :---: |
| **AI Messages (Turns)** | 12,000 turns | 30,000 turns |
| **Gemini Conversational API Cost** | $3.04 | $7.59 |
| **Channel Ingestion (25,000 posts + 2,000 photos)**| $0.90 | $2.40 |
| **Payment Gateway Processing (3.5% + $0.30)** | $5.52 | $5.52 |
| **Allocated Hosting & Database** | $0.80 | $0.80 |
| **Total Monthly COGS** | **$10.26** | **$16.31** |
| **Gross Profit ($149.00 - COGS)** | **$138.74** | **$132.69** |
| **Gross Margin Percentage** | **93.1%** | **89.1%** |

---

## 4. Margin Collapse Vulnerabilities & Fair-Use Safeguards

Despite the outstanding modeled margins (88%–93%), the platform is exposed to severe financial loss under the following conditions:

1. **Unmetered Infinite Chat Loops:**
   * *The Threat:* If a customer's automated Telegram bot begins talking to the merchant's AI Sales Assistant, both bots could message each other back and forth indefinitely.
   * *The Loss:* 100,000 turns in 48 hours would consume $25+ in Gemini tokens, completely eradicating the merchant's subscription fee.
   * *Safeguard:* Implement a hard loop detector: if more than 15 messages occur in a conversation within 5 minutes without order progress, automatically flag `human_takeover` and pause AI.
2. **Channel Re-Scraping Token Waste:**
   * *The Threat:* Merchant triggers channel re-sync multiple times daily. Re-embedding 5,000 posts and reprocessing hundreds of photos on every click wastes API budget.
   * *Safeguard:* SHA-256 post content hashing. Skip Gemini Vision and embeddings generation if post text and photo hash have not changed.
3. **Absence of Hard Quota Enforcement:**
   * *The Threat:* As proven in `03_FEATURE_AUDIT.md`, `app/api/webhooks.py` does not currently enforce `monthly_ai_messages`. A single START plan customer ($19) could send 200,000 messages.
   * *Safeguard:* Strict pre-invocation quota gate in the message pipeline.

---

## 5. Pricing Strategy Recommendations

1. **Dual Currency Pricing (USD & UZS):**
   * For international clients: $19 / $59 / $149 USD.
   * For the domestic Uzbekistan market: Price in Uzbek Som (UZS) rounded to convenient figures:
     * START: **250,000 UZS / month** (~$19.50)
     * PRO: **750,000 UZS / month** (~$58.50)
     * ULTRA: **1,900,000 UZS / month** (~$148.00)
2. **Overage Add-On Packs:**
   * When a merchant hits 100% of their message limit, offer an instant top-up:
     * **+1,000 AI Messages:** $5.00 (Cost to platform: ~$0.25 -> 95% margin).
3. **Annual Discount Incentive:**
   * 2 months free when billed annually (e.g., $190/year for START, saving $38). Enhances upfront cash collection and reduces monthly churn.

