# AI Sales Assistant — MVP foundation

Telegram Business accountida sotuvchi sifatida ishlaydigan AI tizimining dastlabki ishlaydigan poydevori.

## Hozirgi MVP tarkibi

- Telegram Business webhook: business connection, incoming business messages va kanal postlari.
- AI javob engine: OpenAI Responses API orqali o'zbekcha javob, qat'iy katalog konteksti va operatorga topshirish qarori.
- Knowledge ingestion: Telegram kanalidagi matn, caption va rasm; rasmga AI tavsifi; embeddinglar pgvector'da saqlanadi.
- Public kanal tarixini import qilish uchun alohida, read-only Telethon importer.
- Admin API: suhbatlar, xabarlar, operatorga olish/qayta AI'ga topshirish, admin javobi, bilim bazasi.
- Next.js admin panel: Live Inbox va Knowledge Base boshlang'ich interfeysi.
- PostgreSQL + pgvector va Redis uchun Docker Compose.

Bu — MVP poydevori, hali ishlab chiqarishga tayyor yakuniy mahsulot emas. To'liq order workflow, adminlar uchun individual login/RBAC, audit eksporti, rate limit, retry queue, billing va deployment hardening keyingi bosqichlarda qo'shiladi.

## 1. Kerakli narsalar

- Docker Desktop yoki Docker Engine + Compose.
- Telegram bot tokeni. BotFather'da bot yarating va **Business / Secretary Mode** imkoniyatini yoqing.
- Sotuvchi Telegram akkaunti: Business bot ulanishida botga kerakli chatlar uchun ruxsat, xususan `can_reply` huquqi berilishi kerak.
- Public Telegram kanal username'i. Yangi postlarni webhook orqali olish uchun bot kanalga administrator qilib qo'shiladi.
- AI API kaliti. Standart adapter OpenAI Responses API va `text-embedding-3-small` embedding modelidan foydalanadi. `OPENAI_BASE_URL` faqat Responses API, embeddings va rasmli input'ni qo'llab-quvvatlaydigan mos provayder uchun ishlatiladi.
- Kanal tarixini bir martalik import qilish uchun Telegram API `api_id` va `api_hash` (Telegram developer portal) hamda kanalga kirish huquqiga ega foydalanuvchi akkaunti.

## 2. Muhitni sozlash

Root papkada (Windows PowerShell):

```powershell
Copy-Item .env.example .env
Copy-Item web/.env.example web/.env
```

Linux/macOS uchun `cp .env.example .env` va `cp web/.env.example web/.env` ishlatish mumkin.

`.env` ichida quyidagilarni to'ldiring:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=uzun_va_tasodifiy_secret
TELEGRAM_PUBLIC_CHANNEL=kanal_username
OPENAI_API_KEY=...
OPENAI_BASE_URL=  # OpenAI-compatible boshqa API bo'lsa to'ldiriladi
OPENAI_MODEL=gpt-4.1-mini
ADMIN_API_TOKEN=uzun_admin_token
INTERNAL_INGEST_TOKEN=boshqa_uzun_import_token
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_PHONE=+998...
```

`TELEGRAM_PUBLIC_CHANNEL` qiymatiga `@` belgisiz username yoziladi. `TELEGRAM_ADMIN_CHAT_ID`ga operator bildirishnomalari yuboriladigan Telegram chat ID yoziladi; admin avval botga `/start` yuborgan bo'lishi kerak. `POSTGRES_PASSWORD`ni ham kuchli alohida qiymatga almashtiring. Maxfiy kalitlarni Git'ga yubormang yoki chatga joylamang.

## 3. Admin panel va backendni sozlash

`web/.env` faylida `ADMIN_API_TOKEN` qiymatini root `.env` bilan bir xil qiling; `DASHBOARD_PASSWORD` va `SESSION_SECRET`ni alohida kuchli qiymatlarga almashtiring. Panel uchun login paroli frontend serverida saqlanadi, Telegram bot tokeni va AI kaliti brauzerga uzatilmaydi.

`SESSION_SECRET`, `DASHBOARD_PASSWORD`, `ADMIN_API_TOKEN` va `INTERNAL_INGEST_TOKEN` uchun tasodifiy, bir-biridan farqli qiymatlar ishlating.

## 4. Backend va admin panelni ishga tushirish

```bash
docker compose up --build -d
```

Tekshirish:

```bash
curl http://localhost:8000/health
```

API hujjatlari: `http://localhost:8000/docs`. Admin panel: `http://localhost:3000`.

Frontendni alohida development rejimida ishga tushirish kerak bo'lsa, `web` papkasida `npm install` va `npm run dev` ishlating; bunda `web/.env` dagi `BACKEND_URL=http://localhost:8000` bo'lishi kerak.

## 5. Telegram webhook

Backend internetdan HTTPS orqali ochiq bo'lishi kerak. Masalan, serveringizdagi HTTPS domenni `.env`ga qo'shib, terminalda:

Windows PowerShell:

```powershell
$env:PUBLIC_WEBHOOK_URL = "https://your-domain.example"
python scripts/set_webhook.py
```

Linux/macOS:

```bash
PUBLIC_WEBHOOK_URL=https://your-domain.example python scripts/set_webhook.py
```

Webhook quyidagi update turlarini qabul qiladi: `business_connection`, `business_message`, `edited_business_message`, `channel_post`, `edited_channel_post`.

Sotuvchi akkauntida botni Business bot sifatida ulang. `can_reply` ruxsati bo'lmasa, bot sotuvchi nomidan javob yubora olmaydi. Ruxsat beriladigan chatlarni sotuvchi o'zi tanlashi kerak.

Kanalda kelajakdagi postlarni olish uchun bot kanalga administrator sifatida qo'shiladi. Bot faqat kerakli minimal huquqlar bilan ishlasin.

## 6. Eski kanal tarixini import qilish

Bu vazifa Bot API orqali emas, Telegram MTProto foydalanuvchi klienti orqali read-only bajariladi. Importer `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` va `TELEGRAM_PHONE`dan foydalanadi. Birinchi ishga tushishda Telegram login kodi so'raladi.

Root `.env` sozlanganidan keyin:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
python scripts/import_public_channel.py
```

Importer faqat ko'rsatilgan public kanal tarixini o'qiydi, post matni/caption va rasmlarni backendga yuboradi. Kanal sizga tegishli yoki import qilishga ruxsat berilgan bo'lishi kerak. Importer `.session` fayli akkaunt sessiyasini saqlaydi — uni hech kimga bermang va repository'ga qo'shmang. Katta kanal uchun import vaqt olishi mumkin; jarayonni qayta ishga tushirish dublikat yaratmaydi.

## 7. Ishlash mantig'i

1. Telegram Business update webhookga keladi.
2. Backend mijoz xabarini conversation tarixiga yozadi.
3. Knowledge service tegishli postlarni pgvector embedding qidiruvi bilan topadi.
4. AI faqat topilgan katalog dalillariga tayangan holda o'zbekcha javob tayyorlaydi.
5. Ma'lumot topilmasa, mijoz operator so'rasa yoki javob noaniq bo'lsa, chat `human_takeover` holatiga o'tadi.
6. Operator chatni qabul qilgach, AI javob yubormaydi. Admin paneldan `Resume AI` bosilganda qayta faollashadi.

## 8. API endpointlar

- `GET /health`
- `POST /telegram/webhook`
- `GET /admin/overview`
- `GET /admin/conversations`
- `GET /admin/conversations/{id}/messages`
- `POST /admin/conversations/{id}/takeover`
- `POST /admin/conversations/{id}/resume`
- `POST /admin/conversations/{id}/reply`
- `GET /admin/knowledge`
- `POST /internal/knowledge/ingest`

Admin endpointlar `X-Admin-Token`, import endpoint esa `X-Ingest-Token` headerini talab qiladi. MVP token himoyasi production'da SSO/session auth, RBAC, CSRF va audit log bilan almashtirilishi kerak.

## 9. Muhim texnik cheklovlar

- Bot API kanalning yangi postlarini olishi uchun bot kanalga admin bo'lishi kerak.
- Bot API kanalning butun eski tarixini qaytaradigan metod bermaydi. Shu sabab tarix importi alohida Telegram MTProto sessiyasi bilan bajariladi. Telegram API `api_id` va `api_hash` rasmiy `my.telegram.org` API development tools sahifasidan olinadi; API shartlariga amal qilish va faqat ruxsat berilgan kanalni o'qish zarur.
- Business bot faqat sotuvchi bergan huquqlar doirasida ishlaydi; `can_reply` va Business ulanishining faol holati muhim.
- Hozirgi qidiruv vector embedding va sodda lexical fallbackdan foydalanadi. Narx/mavjudlik kabi operatsion faktlar uchun alohida strukturali Products/Inventory modulini qo'shish kerak.
- AI hozircha tayyor buyurtmani avtomatik DB'ga yozmaydi. Buyurtma yig'ish/validatsiya va status workflow alohida keyingi modul bo'ladi.
- Rasm tahlili AI API ishlayotganida amalga oshadi; API kaliti bo'lmasa rasm saqlanadi, lekin avtomatik tavsifi yaratilmaydi. Agar AI mos post rasmini tanlasa, u Telegram chatiga yuborilishi mumkin.

## 10. Keyingi ishlab chiqish bosqichi

1. Admin panel uchun individual hisoblar va jamoaviy rollar.
2. Mahsulot katalogini strukturali jadvalga ajratish va narx/mavjudlikni tasdiqlash.
3. Buyurtma yig'ish wizard'i va order status workflow.
4. AI handoff queue, operator assign va qayta AI'ga o'tkazish nazorati.
5. Background task queue, retry, monitoring va audit trail.
6. Integratsion testlar va staging deployment.
