# Phase 0: Security & Migration Guide

**Target Environment:** Production & Staging  
**Impact Level:** Low operational impact; zero database data loss; mandatory environment variables required.

---

## 1. Existing Owner Account Migration Path

Prior to Phase 0, the application relied on an unpersisted, synthetic owner admin if Telegram ID matched `ADMIN_TELEGRAM_ID=6990611858`.

### Safe Migration Procedure:
1. **Persistent Admin Record:**  
   `app/services/admin_service.py` provides `ensure_owner(db)`. When the platform owner signs in via JWT or verified master token, the system ensures a persistent record exists in the `admins` table:
   - `telegram_user_id`: `6990611858`
   - `role`: `owner`
   - `permissions`: All permissions enabled (`ROLE_DEFAULTS["owner"]`)
   - `organization_id`: `1` (or default organization)

2. **User & Membership Association:**  
   If the owner user logs in through the SaaS onboarding flow (`/api/auth/register` or `/api/auth/login`), an `OrganizationMember` record linking `user_id` to `organization_id=1` with `role="owner"` is automatically created or associated.

3. **No Downtime for Single-Tenant Operations:**  
   The existing single-tenant database state remains completely intact. The owner continues to manage Organization 1 without interruption.

---

## 2. Environment Variables & Secret Rotation

In Phase 0, production startup requires cryptographically secure, non-default credentials.

### Required Environment Configuration:

```env
# Runtime Environment
ENVIRONMENT=production

# JWT Authentication (Backend)
# MUST be at least 32 characters long. Never use default dev keys.
JWT_SECRET=super_secure_random_jwt_secret_change_me_in_prod_at_least_32_chars_2026

# Next.js Session Signing (Frontend)
# MUST be at least 32 characters long.
SESSION_SECRET=super_secure_random_session_secret_change_me_in_prod_at_least_32_chars_2026

# Telegram Bot Webhook Secret (Backend & Telegram Bot API)
# MUST be set when registering webhook with Telegram: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>&secret_token=<TELEGRAM_WEBHOOK_SECRET>
TELEGRAM_WEBHOOK_SECRET=telegram_webhook_secret_key_minimum_16_chars_secure_2026

# Backend Master Token (Optional emergency fallback)
# Never use default "super_secret_admin_token_2026_xyz"
ADMIN_API_TOKEN=master_token_fallback_random_string_2026_production_safe
```

### Rotating Webhook Secret with Telegram API:
When updating `TELEGRAM_WEBHOOK_SECRET` in production:
```bash
curl -F "url=https://your-domain.com/telegram/webhook" \
     -F "secret_token=<YOUR_NEW_TELEGRAM_WEBHOOK_SECRET>" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

---

## 3. Backward Compatibility & Operational Checklist

- [x] **Telegram Webhooks:** Ensure your Telegram Bot webhook is registered with `secret_token` matching `TELEGRAM_WEBHOOK_SECRET`.
- [x] **Next.js Dashboard Users:** Clear cookies or re-login once deployed so the client acquires the new identity-bound session payload.
- [x] **API Consumers:** External API calls to `/admin/*` must include `Authorization: Bearer <JWT_TOKEN>` or `X-Admin-Token: <ADMIN_API_TOKEN>`. The deprecated `X-Admin-Telegram-ID` header is ignored.
- [x] **Multi-Tenant Header:** When an operator belongs to multiple organizations, send `X-Organization-Id: <id>` to switch active tenant context. The backend validates membership before serving requests.
