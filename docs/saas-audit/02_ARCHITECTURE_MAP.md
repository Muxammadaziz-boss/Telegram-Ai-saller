# AI SALES CONTROL CENTER — ARCHITECTURE MAP & DATA FLOW

**Document:** `docs/saas-audit/02_ARCHITECTURE_MAP.md`  
**Purpose:** Map the existing application topology against the target multi-tenant SaaS architecture and trace end-to-end data flows.

---

## 1. Current Architecture Topology (As-Is)

Currently, the system operates as a hybrid monolithic backend (FastAPI) paired with a Server-Side Rendered (SSR) / Static frontend (Next.js 14) and local PostgreSQL with `pgvector`.

```mermaid
graph TD
    subgraph Telegram_Ecosystem["Telegram Ecosystem"]
        TC["Telegram Customers"]
        TPC["Public Telegram Channels"]
        TB["Telegram Business Accounts"]
    end

    subgraph External_APIs["External SaaS & AI Providers"]
        GEM["Google Gemini API (text-embedding-004 / gemini-2.5-flash)"]
        STR["Stripe API (Partially Mocked)"]
    end

    subgraph Host_Machine["Host Machine (Windows Dev / Docker Single Container)"]
        NGX["Local Reverse Tunnel (localhost.run / Cloudflare)"]

        subgraph NextJS_Frontend["Next.js 14 Frontend (:3000)"]
            FE_DASH["Tabler UI Dashboard (Dashboard.tsx)"]
            FE_API["Proxy Route (/api/proxy)"]
            FE_AUTH["Single-Password Auth (/api/login)"]
        end

        subgraph FastAPI_Backend["FastAPI Backend (:8000)"]
            WH["Webhook Ingestion (/api/webhook/telegram)"]
            ADM["Admin REST API (/admin/...)"]
            SAAS["SaaS REST API (/api/...)"]
            
            subgraph Internal_Services["Internal Services & Logic"]
                AI_ENG["AI Sales Engine (app/services/ai.py)"]
                KNOW["Knowledge & Scraper (app/services/knowledge.py)"]
                TEL_SRV["Telegram Client (app/services/telegram.py)"]
                ENT_SRV["Entitlement Service (app/services/entitlement_service.py)"]
                USG_SRV["Usage Service (app/services/usage_service.py)"]
                BIL_SRV["Billing Service (app/services/billing_service.py)"]
            end
        end

        subgraph Storage_Layer["Storage & Vector Database"]
            PG[(PostgreSQL 16 + pgvector)]
        end
    end

    TC <-->|Chat Messages| TB
    TB -->|Webhook Events| NGX
    TPC -->|HTTP Web Scraping t.me/s/...| KNOW
    NGX --> WH
    WH -->|asyncio.create_task| AI_ENG
    AI_ENG <-->|Embeddings & Chat Completions| GEM
    AI_ENG <-->|Semantic Vector Search| PG
    AI_ENG -->|Send Reply| TEL_SRV
    TEL_SRV -->|Telegram Bot API| TB

    FE_DASH --> FE_API
    FE_API -->|Forward with Master Token| ADM
    FE_API -->|Forward with Master Token| SAAS
    ADM <-->|Read / Write| PG
    SAAS <-->|Read / Write| PG
    BIL_SRV <-->|Checkout / Portal| STR
```

---

## 2. Target Multi-Tenant SaaS Architecture Topology (To-Be)

In the target state, tenant isolation is strictly enforced at every layer (Network, Gateway, JWT Auth, Service Boundaries, and Database Query Scopes). Background workers handle asynchronous long-running tasks via Redis queues.

```mermaid
graph TD
    subgraph Client_Layer["Client & Tenant Tier"]
        T1["Tenant A (Admin / Agents)"]
        T2["Tenant B (Admin / Agents)"]
        TCUST["End Customers on Telegram"]
    end

    subgraph Ingress_Layer["Ingress & Edge Security"]
        CF["Cloudflare Edge / SSL / WAF / Rate Limiter"]
        REV["Nginx Ingress Reverse Proxy"]
    end

    subgraph Web_Tier["Frontend Tier (Next.js 14 App Router)"]
        NEXT_APP["Multi-Tenant Next.js App\n- Tenant-aware routing\n- JWT session management\n- Tabler UI components\n- RBAC view rendering"]
    end

    subgraph API_Gateway["FastAPI Gateway Tier (:8000)"]
        AUTH_MW["JWT Auth & Tenant Scoping Middleware\n- Resolves User, Org, & Permissions\n- Rejects Cross-Tenant IDOR"]
        API_ROUTERS["Strictly Scoped Routers\n/api/v1/conversations\n/api/v1/knowledge\n/api/v1/orders\n/api/v1/billing\n/api/v1/platform-admin"]
    end

    subgraph Async_Worker_Pool["Asynchronous Worker Tier (Redis + Arq / Celery)"]
        R_QUEUE[(Redis 7 Cache & Task Broker)]
        W_AI["AI Message Processing Workers"]
        W_INGEST["Channel Post Ingestion & OCR Workers"]
        W_SYNC["Sync & Embeddings Batch Workers"]
        W_WEBHOOK["Billing Webhook Dispatchers"]
    end

    subgraph Persistence_Layer["Data Tier (PostgreSQL + Multi-Tenant Scoping)"]
        PG_DB[(PostgreSQL 16 Enterprise\n- Row-Level Security Policies\n- pgvector cosine indexing\n- Alembic Migration Revisions)]
    end

    subgraph External_Services["External Services"]
        TG_API["Telegram Bot & Business API"]
        GEM_API["Google Gemini 2.5 Flash & Embeddings"]
        PAY_API["Payment Gateways (Stripe / Payme / Click)"]
    end

    T1 & T2 --> CF
    TCUST --> TG_API
    TG_API --> CF
    CF --> REV
    REV --> NEXT_APP
    REV --> API_ROUTERS
    NEXT_APP --> API_ROUTERS

    API_ROUTERS --> AUTH_MW
    AUTH_MW --> API_ROUTERS
    API_ROUTERS --> R_QUEUE
    API_ROUTERS <--> PG_DB

    R_QUEUE --> W_AI & W_INGEST & W_SYNC & W_WEBHOOK
    W_AI <--> GEM_API
    W_AI <--> PG_DB
    W_AI --> TG_API
    W_INGEST <--> TG_API
    W_INGEST <--> GEM_API
    W_INGEST --> PG_DB
    W_WEBHOOK <--> PAY_API
    W_WEBHOOK --> PG_DB
```

---

## 3. End-to-End Data Flow Tracing

### Flow 1: Inbound Customer Message & AI Sales Response

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Telegram Customer
    participant TB as Telegram Business Cloud
    participant WH as FastAPI Webhook (/api/webhook/telegram)
    participant Worker as Background Task / Worker
    participant DB as PostgreSQL (Tenant Scoped)
    participant AI as Gemini 2.5 Flash
    participant TG as Telegram Bot API

    Customer->>TB: Sends product inquiry ("Asus TUF Gaming bormi?")
    TB->>WH: POST update with business_message & connection_id
    Note over WH: Webhook validation (Secret token check)
    WH->>DB: Resolve Organization via business_connection_id
    WH->>DB: Load/Upsert Customer & Conversation (Scoped to org_id)
    WH->>DB: Check Subscription status & Monthly message limit
    alt Limit Exceeded or Inactive
        WH->>TG: Fallback notification / Human handoff alert
        WH-->>TB: HTTP 200 OK
    else Entitlement Active
        WH->>Worker: Enqueue message processing job
        WH-->>TB: HTTP 200 OK (Instant acknowledgment)
        Worker->>TG: Send "typing" action loop
        Worker->>DB: Query RAG embeddings (pgvector, filtered by org_id)
        DB-->>Worker: Relevant product knowledge chunks
        Worker->>AI: Generate response with system prompt & context
        AI-->>Worker: Structured Sales Reply & Detected Intent
        Worker->>DB: Store outbound message & increment usage meter
        Worker->>TG: send_message(business_connection_id, customer_id, text)
        TG-->>Customer: AI Sales Assistant responds with price and options
    end
```

### Flow 2: Telegram Channel Knowledge Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tenant Admin
    participant UI as Tabler Frontend (Knowledge Tab)
    participant API as FastAPI Knowledge Router
    participant Queue as Redis Job Queue
    participant IngestWorker as Channel Ingestion Worker
    participant TG as Telegram MTProto / Scraper
    participant Gemini as Gemini Vision & Embeddings
    participant DB as PostgreSQL (ChannelPost & Vector)

    Admin->>UI: Connects public channel (@tech_shop_channel)
    UI->>API: POST /api/knowledge/sync (org_id from JWT)
    API->>DB: Verify Plan limits (e.g. Start=500 posts, Pro=5,000 posts)
    API->>Queue: Enqueue channel_sync_job(org_id, channel_id)
    API-->>UI: Return job_id (HTTP 202 Accepted)
    Queue->>IngestWorker: Consume job
    IngestWorker->>TG: Fetch channel posts & media attachments
    loop For each new or updated post
        alt Has Product Image
            IngestWorker->>Gemini: Generate image description & OCR product specs
            Gemini-->>IngestWorker: Extracted product attributes & description
        end
        IngestWorker->>Gemini: Generate vector embedding (text-embedding-004)
        Gemini-->>IngestWorker: 768-dim float vector
        IngestWorker->>DB: INSERT INTO channel_posts (organization_id, post_id, text, embedding)
    end
    IngestWorker->>DB: Update ConnectedChannel.last_synced_at & sync_status="completed"
    IngestWorker-->>Queue: Acknowledge job completion
    UI->>API: Poll GET /api/knowledge/sync/status
    API-->>UI: Show completed sync count and green badge
```

### Flow 3: Multi-Tenant Frontend Admin Request & Proxy Resolution

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Store Operator
    participant Browser as Browser Client
    participant NextProxy as Next.js Server (/api/proxy)
    participant FastGateway as FastAPI Backend
    participant TenantGuard as Tenant Scoping Dependency
    participant DB as PostgreSQL

    Operator->>Browser: Opens Live Inbox (/conversations)
    Browser->>NextProxy: GET /api/proxy?path=/admin/conversations (Cookie: session)
    Note over NextProxy: Validates session cookie signature<br/>Extracts operator identity & org_id
    NextProxy->>FastGateway: GET /admin/conversations (Authorization: Bearer JWT)
    FastGateway->>TenantGuard: Resolve current user & organization_id
    Note over TenantGuard: Enforces: operator.org_id == query.org_id<br/>Rejects cross-tenant access with 403
    TenantGuard->>DB: SELECT * FROM conversations WHERE organization_id = :tenant_id
    DB-->>FastGateway: Filtered rows for Tenant only
    FastGateway-->>NextProxy: JSON conversation list
    NextProxy-->>Browser: Render Tabler conversation cards
```

---

## 4. Architectural Gaps Identified in As-Is Flow

1. **Missing Asynchronous Broker:** The transition between Flow 1 step 7 and step 8 currently uses `asyncio.create_task()`. There is no retry mechanism, backoff policy, or persistence if FastAPI restarts.
2. **Channel Scraping Bottleneck:** In Flow 2, the HTTP GET scraper in `app/services/knowledge.py` cannot access historical archives or private seller channels, severely crippling RAG accuracy.
3. **Master Token Bypass in Proxy:** In Flow 3, `web/app/api/proxy/route.ts` currently replaces individual operator credentials with the master `X-Admin-Token`, destroying auditability and bypassing permission checks.

