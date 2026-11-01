"use client";

import React, { useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBrandTelegram,
  IconBuildingSkyscraper,
  IconCheck,
  IconLanguage,
  IconPackage,
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
  const [category, setCategory] = useState("Elektronika va Maishiy Texnika");
  const [telegramChannel, setTelegramChannel] = useState("");
  const [aiLanguage, setAiLanguage] = useState("uz");
  const [aiPersonality, setAiPersonality] = useState("Professional va do'stona sotuvchi assistent");
  const [planCode, setPlanCode] = useState("start");

  if (!isOpen) return null;

  const totalSteps = 8;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    // Complete onboarding on step 8
    setBusy(true);
    try {
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      await onComplete({
        name: businessName || "Yangi Biznes",
        slug: slug || `biz-${Date.now()}`,
        category,
        plan_code: planCode,
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
                <h4 className="modal-title fw-bold mb-0 text-white">Yangi Biznesni Ulash (SaaS Onboarding)</h4>
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
            {/* Step 1: Business Name */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">1. Biznesingiz yoki Kompaniyangiz Nomi</h3>
                  <p className="text-secondary small">
                    Mijozlar va operatorlar tizimda ko'radigan brend yoki do'koningiz nomini kiriting.
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label required">Biznes Nomi</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Masalan: Gadget Store, Elegant Fashion, Laptop World..."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                  <small className="form-hint">
                    Keyinchalik istalgan vaqtda sozlamalardan o'zgartirishingiz mumkin.
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
                    AI savdo assistentining lug'ati va muloqot terminologiyasini moslashtirish uchun sohali tanlang.
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

            {/* Step 3: Telegram Business Connection */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">3. Telegram Business Akkauntni Ulash</h3>
                  <p className="text-secondary small">
                    Assistent mijozlaringiz bilan Telegram Business xabarlari orqali avtomatik muloqot qiladi.
                  </p>
                </div>
                <div className="p-3.5 rounded bg-dark border border-secondary border-opacity-20 space-y-2">
                  <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                    <IconBrandTelegram size={20} />
                    <span>Telegram Business Ulanish Qoidalari:</span>
                  </div>
                  <ol className="text-secondary small ps-3 mb-0 space-y-1">
                    <li>Telegram ilovangizda <strong>Sozlamalar → Telegram Business → Chatbotlar</strong> bo'limiga kiring.</li>
                    <li>Bizning savdo botimiz foydalanuvchi nomini kiriting.</li>
                    <li><strong>"Xabarlarga javob berish (can_reply)"</strong> ruxsatini yoqing.</li>
                  </ol>
                </div>
                <p className="text-success small mb-0 mt-2">
                  ✓ Ushbu ulanishni hozir yoki tizimga kirganingizdan so'ng ham faollashtirishingiz mumkin.
                </p>
              </div>
            )}

            {/* Step 4: Telegram Channel for Knowledge */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">4. Mahsulotlar Kanali (Bilimlar Bazasi)</h3>
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

            {/* Step 5: AI Language */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">5. AI Muloqot Tili</h3>
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

            {/* Step 6: AI Personality & Tone */}
            {step === 6 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">6. AI Shaxsi va Muloqot Uslubi</h3>
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

            {/* Step 7: Select Initial Plan */}
            {step === 7 && (
              <div className="space-y-3">
                <div className="text-center py-2 mb-3">
                  <h3 className="fw-bold text-white mb-1">7. Boshlang'ich Tarifni Tanlang</h3>
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

            {/* Step 8: Confirmation & Launch Trial */}
            {step === 8 && (
              <div className="text-center py-4 space-y-3">
                <div className="p-3 bg-green-lt text-green rounded-circle d-inline-flex mb-2">
                  <IconCheck size={36} />
                </div>
                <h2 className="fw-bold text-white mb-1">Barchasi Tayyor!</h2>
                <p className="text-secondary small max-w-md mx-auto mb-4">
                  Sizning <strong>{businessName || "Yangi Biznes"}</strong> tashkilotingiz uchun 7 kunlik to'liq bepul sinov muddati faollashtirilmoqda. Hech qanday karta talab etilmaydi.
                </p>

                <div className="p-3 bg-dark rounded-3 border border-secondary border-opacity-20 text-start max-w-sm mx-auto small space-y-1 mb-4">
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Biznes nomi:</span>
                    <strong className="text-white">{businessName || "Yangi Biznes"}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Soha:</span>
                    <strong className="text-white">{category}</strong>
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
                <span>Faollashtirilmoqda...</span>
              ) : step === totalSteps ? (
                <>
                  <IconSparkles size={16} />
                  <span>Sinovni Boshlash (Start Free Trial)</span>
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
