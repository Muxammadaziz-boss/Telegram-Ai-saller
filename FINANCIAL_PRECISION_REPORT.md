# FINANCIAL PRECISION & SUB-CENT BILLING ARCHITECTURE REPORT — PHASE 3.2

**Project:** Telegram AI Sales Control Center  
**Repository:** `https://github.com/Muxammadaziz-boss/Telegram-Ai-saller.git`  
**Branch:** `frontend/linear-redesign`  
**Author:** Principal Software Architect & Financial Systems Auditor  
**Date:** November 14, 2026  
**Status:** **PASSED / FULLY VERIFIED**  

---

## 1. Problem Analysis & The 1-Cent Floor Flaw

In previous versions (Phase 3.0 / Phase 3.1), AI call billing utilized the following formulation:

```python
# Legacy formulation (Flawed)
cost_usd = estimate_token_cost_usd(model, input_tokens, output_tokens)
cost_cents = max(1, int(cost_usd * 100))  # <-- 1-Cent Minimum Clamp
```

### Critical Flaws Identified:
1. **Severe Billing Distortion on Short Turns:**
   - A short Gemini turn consuming 5 input tokens and 2 output tokens under `gemini-3.1-flash-lite` costs approximately **\$0.000001 USD** (0.0001 cents).
   - Clamping to `max(1, ...)` inflated this cost to **1.0 cent (\$0.010000 USD)** — a **10,000x overcharge** to the tenant!
2. **Floating-Point Accumulation Drift:**
   - Repeated float additions (`cost_usd += round(...)`) introduce IEEE 754 precision drift over millions of AI interactions.
3. **Margin Calculation Distortion:**
   - At high interaction volumes, artificial 1-cent increments artificially deflated platform gross margins, making profitable tenants appear unprofitable.

---

## 2. Micro-USD Integer Sub-Cent Architecture

To resolve this without introducing database schema disruptions, the system was upgraded to **Fixed-Precision Integer Micro-USD Accounting**:

$$\text{1 USD} = 1{,}000{,}000 \text{ micro-USD} \quad (\mu\text{USD})$$
$$\text{1 Cent} = 10{,}000 \text{ micro-USD} \quad (\mu\text{USD})$$

### 2.1 Model Pricing Table in Micro-USD

Rates are scaled to integer micro-USD per 1,000,000 tokens:

```python
MODEL_PRICING_MICROS = {
    "gemini-3.1-flash-lite": {"input_micros_per_m": 75_000,    "output_micros_per_m": 300_000},
    "gemini-3.5-flash":      {"input_micros_per_m": 150_000,   "output_micros_per_m": 600_000},
    "gemini-3.8-flash":      {"input_micros_per_m": 1_250_000, "output_micros_per_m": 5_000_000},
    "gemini-embedding-001":  {"input_micros_per_m": 20_000,    "output_micros_per_m": 0},
    "default":               {"input_micros_per_m": 150_000,   "output_micros_per_m": 600_000},
}
```

### 2.2 Exact Integer Arithmetic Formula

```python
def estimate_token_cost_micros(model: str, input_tokens: int, output_tokens: int) -> int:
    """Calculate exact LLM API cost in integer micro-USD (1 USD = 1,000,000 micro-USD)."""
    if input_tokens <= 0 and output_tokens <= 0:
        return 0
    rates = MODEL_PRICING_MICROS.get(model, MODEL_PRICING_MICROS["default"])
    numerator = (input_tokens * rates["input_micros_per_m"]) + (output_tokens * rates["output_micros_per_m"])
    # Half-up rounding to nearest integer micro-USD
    micros = (numerator + 500_000) // 1_000_000
    return max(1, micros) if numerator > 0 else 0
```

---

## 3. Backward Compatibility & Migration Strategy

The underlying `UsageRecord` database model stores usage in a 64-bit integer (`BigInteger`):

```python
class UsageRecord(Base):
    metric: Mapped[str] = mapped_column(String(64), index=True)
    used: Mapped[int] = mapped_column(BigInteger, default=0)
```

Because `UsageRecord.metric` is a flexible string and `used` is an integer, zero SQL migrations were required:
1. **New AI Usage Records:**
   - Every AI call writes to `metric="estimated_ai_cost_micros"`.
   - Cents compatibility is maintained by mirroring full integer cents: `cost_micros // 10_000` to `estimated_ai_cost_cents` (without the 1-cent floor).
2. **Dual-Read Aggregation:**
   - `get_platform_financial_metrics` and `get_organization_profitability_list` query `estimated_ai_cost_micros`.
   - If an organization or period only contains historical `estimated_ai_cost_cents`, the system seamlessly converts:
     $$\text{cost\_usd} = \frac{\text{cost\_cents}}{100.0}$$
   - When micro-USD records exist, they take precedence:
     $$\text{cost\_usd} = \frac{\text{cost\_micros}}{1{,}000{,}000.0}$$

---

## 4. Verification Test Results across Volume Profiles

The verification suite (`scripts/financial_formula_trace.py`) executes 18 automated assertions against both synthetic scenarios and live database entities:

| Scenario | Input Tokens | Output Tokens | Model | Calculated Micro-USD | Calculated USD | Result |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Zero Tokens** | 0 | 0 | `gemini-3.5-flash` | **0 $\mu$USD** | **\$0.000000** | **PASSED** |
| **Sub-Cent Tiny Turn** | 5 | 2 | `gemini-3.1-flash-lite` | **1 $\mu$USD** | **\$0.000001** | **PASSED (No Clamp)** |
| **Standard Dialog Turn** | 10,000 | 2,000 | `gemini-3.5-flash` | **2,700 $\mu$USD** | **\$0.002700** | **PASSED** |
| **High-Volume Context** | 1,000,000 | 500,000 | `gemini-3.8-flash` | **3,750,000 $\mu$USD** | **\$3.750000** | **PASSED** |
| **1M Symmetric Turn** | 1,000,000 | 1,000,000 | `gemini-3.1-flash-lite` | **375,000 $\mu$USD** | **\$0.375000** | **PASSED** |

### Live Financial Metrics Snapshot (Verified against Database)
- **Monthly Recurring Revenue (MRR):** \$133.83 USD
- **Annual Run Rate (ARR):** \$1,606.00 USD (matches $\text{MRR} \times 12$)
- **Average Revenue Per User (ARPU):** \$44.61 USD (matches $\text{MRR} / 3 \text{ active subs}$)
- **Gross Margin %:** 100.0% (Zero AI cost incurred this period)
- **Formula Trace Summary:** **18 / 18 Tests PASSED (0 Failed)**
