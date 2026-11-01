"use client";

import React, { useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconCrown,
  IconHelpCircle,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

interface PlanItem {
  id: number;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_featured: boolean;
  features: Record<string, any>;
  limits: Record<string, any>;
}

interface PricingTabProps {
  plans: PlanItem[];
  currentPlanCode?: string;
  onSelectPlan: (planCode: string, billingCycle: "monthly" | "yearly") => Promise<void>;
  loading?: boolean;
}

export function PricingTab({
  plans,
  currentPlanCode = "pro",
  onSelectPlan,
  loading = false,
}: PricingTabProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [busyPlanCode, setBusyPlanCode] = useState<string | null>(null);

  const handleChoose = async (planCode: string) => {
    setBusyPlanCode(planCode);
    try {
      await onSelectPlan(planCode, billingCycle);
    } finally {
      setBusyPlanCode(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title & Billing Cycle Switch */}
      <div className="text-center max-w-xl mx-auto pt-2 pb-3">
        <span className="badge bg-primary-lt text-primary fw-bold text-uppercase px-3 py-1.5 mb-2">
          Moslashuvchan SaaS Tariflar
        </span>
        <h2 className="fs-1 fw-bold text-white mb-2">Biznesingiz Ko'lamiga Mos Rejani Tanlang</h2>
        <p className="text-secondary small mb-4">
          Barcha tariflarda xavfsiz multi-tenant ma'lumotlar izolyatsiyasi, Telegram Business ulanishi va sun'iy intellekt integratsiyasi mavjud.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="d-inline-flex align-items-center bg-dark p-1.5 rounded-pill border border-secondary border-opacity-20 shadow-sm">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 py-2 border-0 fw-bold transition-all ${
              billingCycle === "monthly" ? "btn-primary shadow" : "text-secondary"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Oylik To'lov
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 py-2 border-0 fw-bold transition-all d-flex align-items-center gap-1.5 ${
              billingCycle === "yearly" ? "btn-primary shadow" : "text-secondary"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            <span>Yillik To'lov</span>
            <span className="badge bg-green text-white fw-bold" style={{ fontSize: "10px" }}>
              17% TEJASH
            </span>
          </button>
        </div>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="row g-3 align-items-stretch justify-content-center">
        {plans.map((p) => {
          const isCurrent = currentPlanCode.toLowerCase() === p.code.toLowerCase();
          const price = billingCycle === "yearly" ? p.price_yearly : p.price_monthly;
          const monthlyEquivalent = billingCycle === "yearly" ? Math.round(p.price_yearly / 12) : p.price_monthly;
          const isFeatured = p.is_featured || p.code === "pro";

          return (
            <div key={p.code} className="col-md-6 col-lg-4 d-flex">
              <div
                className={`card w-100 shadow-sm d-flex flex-column justify-content-between position-relative ${
                  isFeatured
                    ? "border-primary shadow-lg"
                    : "border-secondary border-opacity-20"
                }`}
                style={{
                  borderRadius: 16,
                  background: isFeatured ? "rgba(32, 107, 196, 0.05)" : "inherit",
                  transform: isFeatured ? "scale(1.02)" : "none",
                  zIndex: isFeatured ? 2 : 1,
                }}
              >
                {/* Most Popular Badge */}
                {isFeatured && (
                  <div className="position-absolute top-0 start-50 translate-middle">
                    <span className="badge bg-primary text-white fw-bold px-3 py-1.5 rounded-pill shadow d-flex align-items-center gap-1">
                      <IconCrown size={14} /> ENG OMMABOP REJA
                    </span>
                  </div>
                )}

                <div className="card-body p-4">
                  {/* Plan Name & Tagline */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h3 className="card-title fw-bold fs-2 text-white mb-0 font-monospace">{p.name}</h3>
                      {isCurrent && (
                        <span className="badge bg-green-lt text-green fw-bold">Joriy Reja</span>
                      )}
                    </div>
                    <p className="text-secondary small mb-0" style={{ minHeight: "38px" }}>
                      {p.description}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="py-3 my-2 border-top border-bottom border-secondary border-opacity-10">
                    <div className="d-flex align-items-baseline gap-1">
                      <span className="fs-1 fw-bold text-white font-monospace">${monthlyEquivalent}</span>
                      <span className="text-secondary small">/ oy</span>
                    </div>
                    {billingCycle === "yearly" && (
                      <div className="text-secondary small mt-0.5">
                        Yiliga ${price} hisoblanadi (2 oy bepul)
                      </div>
                    )}
                  </div>

                  {/* Core Limits Highlights */}
                  <div className="py-2 mb-3">
                    <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "11px" }}>
                      Resurs Limitlari
                    </div>
                    <ul className="list-unstyled space-y-1.5 mb-0 small">
                      <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                        <span className="text-secondary">AI Xabarlar</span>
                        <span className="fw-bold text-white">{p.limits?.ai_messages?.toLocaleString()} / oy</span>
                      </li>
                      <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                        <span className="text-secondary">Faol Suhbatlar</span>
                        <span className="fw-bold text-white">{p.limits?.ai_conversations?.toLocaleString()} / oy</span>
                      </li>
                      <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                        <span className="text-secondary">Telegram Ulanish</span>
                        <span className="fw-bold text-white">{p.limits?.telegram_connections} ta akkaunt</span>
                      </li>
                      <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                        <span className="text-secondary">Telegram Kanallar</span>
                        <span className="fw-bold text-white">{p.limits?.telegram_channels} ta</span>
                      </li>
                      <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                        <span className="text-secondary">Katalog Mahsulotlari</span>
                        <span className="fw-bold text-white">{p.limits?.products?.toLocaleString()} ta</span>
                      </li>
                      <li className="d-flex align-items-center justify-content-between py-1">
                        <span className="text-secondary">Jamoa Operatorlari</span>
                        <span className="fw-bold text-white">{p.limits?.team_members} kishi</span>
                      </li>
                    </ul>
                  </div>

                  {/* Feature Checklist */}
                  <div>
                    <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "11px" }}>
                      Qo'shilgan Imkoniyatlar
                    </div>
                    <ul className="list-unstyled space-y-2 mb-0 small">
                      <li className="d-flex align-items-center gap-2">
                        <IconCheck size={16} className="text-success flex-shrink-0" />
                        <span className="text-white">Jonli Suhbatlar va Takeover</span>
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <IconCheck size={16} className="text-success flex-shrink-0" />
                        <span className="text-white">Telegram Mahsulotlar Bazasi</span>
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <IconCheck size={16} className="text-success flex-shrink-0" />
                        <span className="text-white">Avtomatik Buyurtma Rasmiylashtirish</span>
                      </li>

                      {/* Pro & Ultra specific */}
                      <li className="d-flex align-items-center gap-2">
                        {p.features?.advanced_rag ? (
                          <IconCheck size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <IconX size={16} className="text-secondary flex-shrink-0 opacity-40" />
                        )}
                        <span className={p.features?.advanced_rag ? "text-white" : "text-secondary text-decoration-line-through opacity-50"}>
                          Kengaytirilgan RAG (Vektor Qidiruv)
                        </span>
                      </li>

                      <li className="d-flex align-items-center gap-2">
                        {p.features?.ai_image_understanding ? (
                          <IconCheck size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <IconX size={16} className="text-secondary flex-shrink-0 opacity-40" />
                        )}
                        <span className={p.features?.ai_image_understanding ? "text-white" : "text-secondary text-decoration-line-through opacity-50"}>
                          Rasm va Skrinshotlarni Tahlil Qilish (Vision)
                        </span>
                      </li>

                      <li className="d-flex align-items-center gap-2">
                        {p.features?.data_export ? (
                          <IconCheck size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <IconX size={16} className="text-secondary flex-shrink-0 opacity-40" />
                        )}
                        <span className={p.features?.data_export ? "text-white" : "text-secondary text-decoration-line-through opacity-50"}>
                          Eksport va Hisobotlar
                        </span>
                      </li>

                      <li className="d-flex align-items-center gap-2">
                        {p.features?.api_access ? (
                          <IconCheck size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <IconX size={16} className="text-secondary flex-shrink-0 opacity-40" />
                        )}
                        <span className={p.features?.api_access ? "text-white" : "text-secondary text-decoration-line-through opacity-50"}>
                          API va Webhook Integratsiyasi
                        </span>
                      </li>

                      <li className="d-flex align-items-center gap-2">
                        {p.features?.custom_ai_tools ? (
                          <IconCheck size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <IconX size={16} className="text-secondary flex-shrink-0 opacity-40" />
                        )}
                        <span className={p.features?.custom_ai_tools ? "text-white" : "text-secondary text-decoration-line-through opacity-50"}>
                          Maxsus AI Asboblari & Integratsiyalar
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Card CTA Button */}
                <div className="card-footer bg-transparent p-4 pt-0 border-0">
                  <button
                    type="button"
                    className={`btn w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-1.5 ${
                      isCurrent
                        ? "btn-outline-success disabled"
                        : isFeatured
                        ? "btn-primary shadow"
                        : "btn-outline-primary"
                    }`}
                    disabled={isCurrent || busyPlanCode === p.code || loading}
                    onClick={() => handleChoose(p.code)}
                  >
                    {busyPlanCode === p.code ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : isCurrent ? (
                      <>
                        <IconCheck size={16} />
                        <span>Joriy Rejangiz</span>
                      </>
                    ) : (
                      <>
                        <span>{p.code === "start" ? "START Rejasiga O'tish" : p.code === "ultra" ? "ULTRA Rejasiga O'tish" : "PRO Rejasiga O'tish"}</span>
                        <IconArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise / Custom Requirement Footnote */}
      <div className="text-center p-4 bg-body-tertiary rounded-3 border border-secondary border-opacity-10 mt-4">
        <h4 className="fw-bold text-white mb-1">Maxsus talablar yoki yirik korporativ integratsiyalar bormi?</h4>
        <p className="text-secondary small mb-3">
          Cheksiz kanallar, maxsus ERP/CRM integratsiyalari va lokal serverda o'rnatish uchun bevosita biz bilan bog'laning.
        </p>
        <a
          href="https://t.me/Dr4x1l"
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline-secondary px-3"
        >
          Telegram orqali bog'lanish (@Dr4x1l)
        </a>
      </div>
    </div>
  );
}
