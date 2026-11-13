"use client";

import React, { useState } from "react";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconBrandTelegram,
  IconBuildingSkyscraper,
  IconCheck,
  IconKey,
  IconLanguage,
  IconPackage,
  IconRefresh,
  IconRobot,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    name: string;
    slug: string;
    category: string;
    plan_code: string;
    telegram_bot_token?: string;
    channel?: string;
    ai_language?: string;
    ai_personality?: string;
  }) => Promise<void>;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [category, setCategory] = useState("Elektronika va Maishiy Texnika");
  const [botToken, setBotToken] = useState("");
  const [botVerification, setBotVerification] = useState<{
    checking: boolean;
    verified: boolean;
    error?: string;
    bot_name?: string;
    bot_username?: string;
  }>({ checking: false, verified: false });

  const [telegramChannel, setTelegramChannel] = useState("");
  const [aiLanguage, setAiLanguage] = useState("uz");
  const [aiPersonality, setAiPersonality] = useState("Professional va do'stona sotuvchi assistent");
  const [planCode, setPlanCode] = useState("start");

  if (!isOpen) return null;

  const totalSteps = 9;

  const handleVerifyBotToken = async () => {
    if (!botToken.trim()) return;
    setBotVerification({ checking: true, verified: false });
    try {
      const res = await fetch("/api/proxy?path=/api/organizations/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: botToken.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setBotVerification({
          checking: false,
          verified: true,
          bot_name: data.bot_name,
          bot_username: data.bot_username,
        });
      } else {
        setBotVerification({
          checking: false,
          verified: false,
          error: data.error || "Noto'g'ri Telegram bot token kiritildi",
        });
      }
    } catch (err: any) {
      setBotVerification({
        checking: false,
        verified: false,
        error: err.message || "Telegram API bilan bog'lanib bo'lmadi",
      });
    }
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    // Complete onboarding on step 9
    setBusy(true);
    try {
      const defaultSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const finalSlug = (customSlug || defaultSlug || `store-${Date.now()}`).toLowerCase().trim();

      await onComplete({
        name: businessName || "Yangi Biznes",
        slug: finalSlug,
        category,
        plan_code: planCode,
        telegram_bot_token: botToken.trim() || undefined,
        channel: telegramChannel,
        ai_language: aiLanguage,
        ai_personality: aiPersonality,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  return (
    <div
      className="modal modal-blur fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border border-secondary border-opacity-25" style={{ borderRadius: 18 }}>
          {/* Header */}
          <div className="modal-header py-3 px-4 d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10">
            <div className="d-flex align-items-center gap-2.5">
              <div className="p-2 bg-primary-lt rounded-2">
                <IconSparkles size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="modal-title fw-bold mb-0 text-white">Yangi Do'kon Ochish (SaaS Onboarding)</h4>
                <span className="text-secondary small">
                  Bosqich {step} / {totalSteps} • 7 kunlik bepul sinov
                </span>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={busy} />
          </div>

          {/* Progress Bar */}
          <div className="progress progress-xs rounded-0 bg-dark">
            <div
              className="progress-bar bg-primary"
              style={{ width: `${(step / totalSteps) * 100}%`, transition: "width 0.3s ease" }}
            />
          </div>

          {/* Body with Steps */}
          <div className="modal-body p-4">
            {/* Step 1: Business Name & Slug */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">1. Do'koningiz Nomi va URL Manzili</h3>
                  <p className="text-secondary small">
                    Mijozlar va tizim uchun do'koningiz brend nomini hamda do'kon manzilini (slug) belgilang.
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label required">Do'kon / Biznes Nomi</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Masalan: Kiber Magazin, Gadget Store, Laptop World..."
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (!customSlug) {
                        setCustomSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "-")
                            .replace(/-+/g, "-")
                            .replace(/^-|-$/g, "")
                        );
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Do'kon URL Identifikatori (Slug)</label>
                  <div className="input-group">
                    <span className="input-group-text font-monospace text-secondary">/t/</span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="kiber-magazin"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    />
                  </div>
                  <small className="form-hint">
                    Ushbu havola orqali bevosita do'kon boshqaruviga kirasiz: <code>/t/{customSlug || "slug"}</code>
                  </small>
                </div>
              </div>
            )}

            {/* Step 2: Category / Industry */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">2. Faoliyat Sohasi (Kategoriya)</h3>
                  <p className="text-secondary small">
                    AI savdo assistentining lug'ati va muloqot terminologiyasini moslashtirish uchun sohani tanlang.
                  </p>
                </div>
                <div className="row g-2">
                  {[
                    "Elektronika va Maishiy Texnika",
                    "Kiyim-Kechak va Moda",
                    "Restoran va Taom Yetkazib Berish",
                    "Go'zallik va Parfyumeriya",
                    "Mebel va Uy Jihozlari",
                    "Ta'lim va Kurslar",
                    "Avto Ehtiyot Qismlar",
                    "Boshqa Xizmatlar",
                  ].map((cat) => (
                    <div key={cat} className="col-md-6">
                      <div
                        className={`p-3 rounded-3 border cursor-pointer transition-all ${
                          category === cat
                            ? "border-primary bg-primary-lt"
                            : "border-secondary border-opacity-15 bg-body-tertiary"
                        }`}
                        onClick={() => setCategory(cat)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-semibold text-white small">{cat}</span>
                          {category === cat && <IconCheck size={18} className="text-primary" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Telegram Bot Token (NEW!) */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">3. Telegram Bot Tokeni</h3>
                  <p className="text-secondary small">
                    Do'koningiz mijozlari bilan muloqot qiluvchi Telegram botingiz tokenini kiriting.
                  </p>
                </div>

                <div className="mb-3">
                  <label className="form-label">Telegram Bot Token (@BotFather bergan token)</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <IconKey size={18} />
                    </span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                      value={botToken}
                      onChange={(e) => {
                        setBotToken(e.target.value);
                        setBotVerification({ checking: false, verified: false });
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary d-flex align-items-center gap-1.5"
                      onClick={handleVerifyBotToken}
                      disabled={botVerification.checking || !botToken.trim()}
                    >
                      {botVerification.checking ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          <span>Tekshirilmoqda...</span>
                        </>
                      ) : (
                        <>
                          <IconRefresh size={16} />
                          <span>Tekshirish</span>
                        </>
                      )}
                    </button>
                  </div>
                  <small className="form-hint">
                    Token serverimizda <strong>Fernet AES-128</strong> bilan shifrlanadi va hech qachon ochiq ko'rsatilmaydi.
                  </small>
                </div>

                {botVerification.verified && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-0 py-2.5">
                    <IconCheck size={20} className="text-success flex-shrink-0" />
                    <div>
                      <strong className="d-block text-white">Bot muvaffaqiyatli tasdiqlandi!</strong>
                      <span className="small text-secondary">
                        Nomi: <strong>{botVerification.bot_name}</strong> • Username: <code>@{botVerification.bot_username}</code>
                      </span>
                    </div>
                  </div>
                )}

                {botVerification.error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-0 py-2.5">
                    <IconAlertCircle size={20} className="text-danger flex-shrink-0" />
                    <span className="small">{botVerification.error}</span>
                  </div>
                )}

                <div className="p-3 rounded bg-dark border border-secondary border-opacity-20 mt-3 small text-secondary">
                  💡 <strong>Bot tokeningiz yo'qmi?</strong> Telegram'da <code>@BotFather</code> ga <code>/newbot</code> deb yozing, nom tanlang va berilgan tokenni shu yerga nusxalang.
                  Tokenni keyinchalik do'kon sozlamalaridan ham kiritish mumkin.
                </div>
              </div>
            )}

            {/* Step 4: Telegram Business Connection Instructions */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">4. Telegram Business Ulanishi</h3>
                  <p className="text-secondary small">
                    Assistent mijozlaringiz bilan Telegram Business xabarlari orqali avtomatik muloqot qiladi.
                  </p>
                </div>
                <div className="p-3.5 rounded bg-dark border border-secondary border-opacity-20 space-y-2">
                  <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                    <IconBrandTelegram size={20} />
                    <span>Telegram Business Ulanish Bosqichlari:</span>
                  </div>
                  <ol className="text-secondary small ps-3 mb-0 space-y-1">
                    <li>Telegram ilovangizda <strong>Sozlamalar → Telegram Business → Chatbotlar</strong> bo'limiga kiring.</li>
                    <li>Botingiz nomini (masalan: <code>@{botVerification.bot_username || "botingiz_nomi"}</code>) qidiring.</li>
                    <li><strong>"Xabarlarga javob berish (can_reply)"</strong> ruxsatini yoqing va saqlang.</li>
                  </ol>
                </div>
                <p className="text-success small mb-0 mt-2">
                  ✓ Do'kon yaratilgach, Webhook avtomatik Telegram serverlariga ulanadi.
                </p>
              </div>
            )}

            {/* Step 5: Telegram Channel for Knowledge */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">5. Mahsulotlar Kanali (Bilimlar Bazasi)</h3>
                  <p className="text-secondary small">
                    AI o'zbek tilidagi narxlar, fotosuratlar va tavsiflarni qaysi Telegram kanalidan o'rgansin?
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Telegram Kanal Havolasi yoki Username</label>
                  <div className="input-group">
                    <span className="input-group-text">@</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="masalan: mening_dokonim_uz"
                      value={telegramChannel}
                      onChange={(e) => setTelegramChannel(e.target.value.replace(/^@/, ""))}
                    />
                  </div>
                  <small className="form-hint">
                    Kanal postlari avtomatik tahlil qilinadi va mijozlar savol berganda rasm va narxlar taqdim etiladi.
                  </small>
                </div>
              </div>
            )}

            {/* Step 6: AI Language */}
            {step === 6 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">6. AI Muloqot Tili</h3>
                  <p className="text-secondary small">
                    Assistent asosan qaysi tilda mijozlar bilan muloqot qilsin?
                  </p>
                </div>
                <div className="row g-3">
                  {[
                    { code: "uz", label: "O'zbek tili (Lotin / Kirill)", desc: "O'zbekiston ichki bozori uchun to'liq optimallashgan" },
                    { code: "ru", label: "Rus tili (Русский язык)", desc: "MDH va rusiyzabon mijozlar uchun" },
                    { code: "en", label: "Ingliz tili (English)", desc: "Xalqaro savdo va eksport do'konlari uchun" },
                  ].map((lang) => (
                    <div key={lang.code} className="col-12">
                      <div
                        className={`p-3 rounded-3 border transition-all ${
                          aiLanguage === lang.code
                            ? "border-primary bg-primary-lt"
                            : "border-secondary border-opacity-15 bg-body-tertiary"
                        }`}
                        onClick={() => setAiLanguage(lang.code)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-bold text-white">{lang.label}</div>
                            <div className="text-secondary small">{lang.desc}</div>
                          </div>
                          {aiLanguage === lang.code && <IconCheck size={20} className="text-primary" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: AI Personality & Tone */}
            {step === 7 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">7. AI Shaxsi va Muloqot Uslubi</h3>
                  <p className="text-secondary small">
                    Assistent qanday ohangda javob bersin?
                  </p>
                </div>
                <div className="row g-2">
                  {[
                    "Professional va do'stona sotuvchi assistent (Tavsiya etiladi)",
                    "Rasmiy, aniq va lutfli konsultant",
                    "Zamonaviy, yorqin va pozitiv maslahatchi (smayliklar bilan)",
                    "Qat'iy biznes va premium konsyerj uslubi",
                  ].map((p) => (
                    <div key={p} className="col-12">
                      <div
                        className={`p-3 rounded-3 border transition-all ${
                          aiPersonality === p
                            ? "border-primary bg-primary-lt"
                            : "border-secondary border-opacity-15 bg-body-tertiary"
                        }`}
                        onClick={() => setAiPersonality(p)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-semibold text-white small">{p}</span>
                          {aiPersonality === p && <IconCheck size={18} className="text-primary" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 8: Select Initial Plan */}
            {step === 8 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">8. Boshlang'ich Tarifni Tanlang</h3>
                  <p className="text-secondary small">
                    Har bir yangi biznes uchun <strong>7 kunlik bepul sinov muddati</strong> taqdim etiladi!
                  </p>
                </div>
                <div className="row g-3">
                  {[
                    { code: "start", name: "START", price: "$19/oy", desc: "1,000 AI xabar, 1 kanal, 2 operator" },
                    { code: "pro", name: "PRO (Ommabop)", price: "$59/oy", desc: "7,500 AI xabar, Vision, RAG, 10 operator" },
                    { code: "ultra", name: "ULTRA", price: "$149/oy", desc: "30,000 AI xabar, Premium AI, 50 operator" },
                  ].map((pl) => (
                    <div key={pl.code} className="col-md-4">
                      <div
                        className={`p-3.5 rounded-3 border h-100 d-flex flex-column justify-content-between transition-all ${
                          planCode === pl.code
                            ? "border-primary bg-primary-lt"
                            : "border-secondary border-opacity-15 bg-body-tertiary"
                        }`}
                        onClick={() => setPlanCode(pl.code)}
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-bold text-white font-monospace">{pl.name}</span>
                            {planCode === pl.code && <IconCheck size={18} className="text-primary" />}
                          </div>
                          <div className="fs-3 fw-bold text-success font-monospace mb-2">{pl.price}</div>
                          <p className="text-secondary small mb-0">{pl.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 9: Confirmation & Launch Trial */}
            {step === 9 && (
              <div className="text-center py-4 space-y-3">
                <div className="p-3 bg-green-lt text-green rounded-circle d-inline-flex mb-2">
                  <IconCheck size={36} />
                </div>
                <h2 className="fw-bold text-white mb-1">Barchasi Tayyor!</h2>
                <p className="text-secondary small max-w-md mx-auto mb-4">
                  Sizning <strong>{businessName || "Yangi Biznes"}</strong> do'koningiz uchun 7 kunlik to'liq bepul sinov muddati faollashtirilmoqda. Hech qanday karta talab etilmaydi.
                </p>

                <div className="p-3 bg-dark rounded-3 border border-secondary border-opacity-20 text-start max-w-sm mx-auto small space-y-1 mb-4">
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Do'kon nomi:</span>
                    <strong className="text-white">{businessName || "Yangi Biznes"}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Havola (Slug):</span>
                    <strong className="text-primary font-monospace">/t/{customSlug || "biznes"}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Soha:</span>
                    <strong className="text-white">{category}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Telegram Bot:</span>
                    <strong className="text-white">{botVerification.bot_username ? `@${botVerification.bot_username}` : (botToken ? "Kiritilgan" : "Sozlanmagan")}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Tanlangan tarif:</span>
                    <strong className="text-primary text-uppercase">{planCode} Plan</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Sinov muddati:</span>
                    <strong className="text-success">7 kun bepul</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="modal-footer py-3 px-4 d-flex align-items-center justify-content-between border-top border-secondary border-opacity-10">
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center gap-1.5"
                onClick={handleBack}
                disabled={busy}
              >
                <IconArrowLeft size={16} />
                <span>Orqaga</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-1.5 px-4 py-2 fw-bold"
              onClick={handleNext}
              disabled={busy || (step === 1 && !businessName.trim())}
            >
              {busy ? (
                <span>Do'kon ochilmoqda...</span>
              ) : step === totalSteps ? (
                <>
                  <IconSparkles size={16} />
                  <span>Do'konni Ochish & Sinovni Boshlash</span>
                </>
              ) : (
                <>
                  <span>Davom etish</span>
                  <IconArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
