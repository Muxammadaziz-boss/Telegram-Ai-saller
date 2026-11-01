"use client";

import React, { useState } from "react";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBrandStripe,
  IconCalendar,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconDownload,
  IconExternalLink,
  IconRefresh,
  IconShieldCheck,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

interface SubscriptionInfo {
  id: number;
  organization_id: number;
  status: string; // trialing, active, past_due, cancelled, expired, paused
  billing_cycle: string;
  provider: string;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number;
  is_trial: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  plan: {
    code: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    features: Record<string, any>;
    limits: Record<string, any>;
  };
}

interface BillingTabProps {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  onRefresh: () => void;
  onUpgradeClick: () => void;
  onCancelSubscription: () => Promise<void>;
  onResumeSubscription: () => Promise<void>;
}

export function BillingTab({
  subscription,
  loading,
  onRefresh,
  onUpgradeClick,
  onCancelSubscription,
  onResumeSubscription,
}: BillingTabProps) {
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!subscription && loading) {
    return (
      <div className="card p-5 text-center">
        <div className="spinner-border text-primary mx-auto mb-3" role="status" />
        <p className="text-secondary mb-0">Obuna ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const plan = subscription?.plan;
  const isTrial = subscription?.is_trial;
  const isCancelled = subscription?.cancel_at_period_end;
  const isExpired = subscription?.status === "expired";
  const cycle = subscription?.billing_cycle || "monthly";
  const price = cycle === "yearly" ? plan?.price_yearly : plan?.price_monthly;

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const handleCancelClick = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setActionBusy(true);
    try {
      await onCancelSubscription();
      setConfirmCancel(false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleResumeClick = async () => {
    setActionBusy(true);
    try {
      await onResumeSubscription();
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Trial Countdown Alert Banner */}
      {isTrial && (
        <div
          className="alert alert-info d-flex align-items-center justify-content-between p-3.5 rounded-3 shadow-sm"
          role="alert"
          style={{ background: "rgba(32, 107, 196, 0.12)", border: "1px solid rgba(32, 107, 196, 0.35)" }}
        >
          <div className="d-flex align-items-center gap-3">
            <IconClock size={28} className="text-primary flex-shrink-0" />
            <div>
              <h4 className="alert-title text-primary mb-1 fw-bold fs-4">
                7 Kunlik Bepul Sinov Muddati Faol ({subscription.trial_days_remaining} kun qoldi)
              </h4>
              <div className="text-white small">
                Siz hozirda START tarifining barcha imkoniyatlaridan 7 kun davomida bepul foydalanmoqdasiz. Sinov muddati tugagach, xizmatni to'xtovsiz davom ettirish uchun to'lov rejasini tasdiqlang.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 px-3.5 py-2 flex-shrink-0"
            onClick={onUpgradeClick}
          >
            <IconSparkles size={16} />
            <span>Tarifni Tanlash & Faollashtirish</span>
          </button>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {isCancelled && !isExpired && (
        <div
          className="alert alert-warning d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm"
          role="alert"
          style={{ background: "rgba(245, 159, 0, 0.12)", border: "1px solid rgba(245, 159, 0, 0.35)" }}
        >
          <div className="d-flex align-items-center gap-3">
            <IconAlertCircle size={26} className="text-warning flex-shrink-0" />
            <div>
              <h4 className="alert-title text-warning mb-0.5 fw-bold">Obuna davr oxirida to'xtatiladi</h4>
              <div className="text-white small">
                Sizning obunangiz {formatDate(subscription?.current_period_end)} sanasiga qadar faol qoladi va avtomatik uzaytirilmaydi.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-success btn-sm d-flex align-items-center gap-1.5 px-3 py-2 flex-shrink-0"
            onClick={handleResumeClick}
            disabled={actionBusy}
          >
            <IconRefresh size={15} />
            <span>Obunani Qayta Faollashtirish</span>
          </button>
        </div>
      )}

      {/* Expired Notice Banner */}
      {isExpired && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3.5 rounded-3 shadow-sm"
          role="alert"
        >
          <div className="d-flex align-items-center gap-3">
            <IconAlertCircle size={28} className="text-danger flex-shrink-0" />
            <div>
              <h4 className="alert-title text-danger mb-1 fw-bold fs-4">Obuna muddati tugagan!</h4>
              <div className="text-white small">
                Premium AI xususiyatlari va avtomatik javoblar to'xtatildi. Barcha ma'lumotlaringiz xavfsiz saqlanmoqda. Davom etish uchun tarifni yangilang.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-2 flex-shrink-0"
            onClick={onUpgradeClick}
          >
            <IconSparkles size={16} />
            <span>Obunani Yangilash</span>
          </button>
        </div>
      )}

      {/* Main Billing Information Card */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="card-title fw-bold mb-0">Joriy Obuna va Tarif Rejasi</h3>
                <span className="text-secondary small">Tashkilot ID: #{subscription?.organization_id}</span>
              </div>
              <span
                className={`badge fs-5 px-3 py-1.5 fw-bold ${
                  subscription?.status === "active"
                    ? "bg-green-lt text-green"
                    : subscription?.status === "trialing"
                    ? "bg-blue-lt text-blue"
                    : "bg-danger-lt text-danger"
                }`}
              >
                {subscription?.status === "active"
                  ? "Faol Obuna"
                  : subscription?.status === "trialing"
                  ? "Sinov Muddati"
                  : "Muddati O'tgan"}
              </span>
            </div>

            <div className="card-body p-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-10 gap-3">
                <div>
                  <div className="text-secondary small text-uppercase fw-bold mb-1">Tarif nomi</div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-1 fw-bold text-white font-monospace">{plan?.name || "START"}</span>
                    {plan?.code === "pro" && (
                      <span className="badge bg-primary text-white fw-bold">Ommabop Tanlov</span>
                    )}
                  </div>
                </div>

                <div className="text-lg-end">
                  <div className="text-secondary small text-uppercase fw-bold mb-1">Narx va Sikl</div>
                  <div className="fs-2 fw-bold text-success font-monospace">
                    ${price}{" "}
                    <span className="text-secondary small fw-normal fs-5">
                      / {cycle === "yearly" ? "yil" : "oy"}
                    </span>
                  </div>
                  {cycle === "yearly" && (
                    <span className="badge bg-green-lt text-green small">Yillik tarif (17% tejalgan)</span>
                  )}
                </div>
              </div>

              {/* Subscription Timing Details */}
              <div className="row g-3 mb-4">
                <div className="col-sm-6 col-md-4">
                  <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                    <div className="text-secondary small mb-1">Boshlangan sana</div>
                    <div className="fw-semibold text-white small">
                      {formatDate(subscription?.current_period_start)}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 col-md-4">
                  <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                    <div className="text-secondary small mb-1">Keyingi hisob / Tugash sanasi</div>
                    <div className="fw-semibold text-white small">
                      {formatDate(subscription?.current_period_end)}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 col-md-4">
                  <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                    <div className="text-secondary small mb-1">To'lov Gateway</div>
                    <div className="fw-semibold text-white small d-flex align-items-center gap-1.5">
                      <IconBrandStripe size={18} className="text-primary" />
                      <span>{subscription?.provider?.toUpperCase() || "STRIPE"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="d-flex flex-wrap align-items-center justify-content-between pt-2 gap-2">
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center gap-1.5"
                    onClick={onUpgradeClick}
                  >
                    <IconSparkles size={16} />
                    <span>Tarifni Oshirish / O'zgartirish</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center gap-1.5"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    <IconRefresh size={15} className={loading ? "spin" : ""} />
                    <span>Yangilash</span>
                  </button>
                </div>

                {!isCancelled && subscription?.status === "active" && (
                  <div>
                    {!confirmCancel ? (
                      <button
                        type="button"
                        className="btn btn-link text-secondary btn-sm p-0 text-decoration-none"
                        onClick={handleCancelClick}
                      >
                        Obunani bekor qilish
                      </button>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-danger small">Haqiqatan ham bekor qilmoqchimisiz?</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger px-2.5 py-1"
                          onClick={handleCancelClick}
                          disabled={actionBusy}
                        >
                          Ha, bekor qilish
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary px-2 py-1"
                          onClick={() => setConfirmCancel(false)}
                        >
                          Yo'q
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="col-lg-4">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-header py-3 px-3">
              <h3 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                <IconCreditCard size={18} className="text-primary" />
                <span>To'lov Usuli</span>
              </h3>
            </div>
            <div className="card-body p-3.5 d-flex flex-column justify-content-between">
              <div>
                <div className="p-3 rounded bg-dark border border-secondary border-opacity-20 mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="badge bg-primary text-white font-monospace">VISA / MASTERCARD</span>
                    <IconShieldCheck size={20} className="text-success" />
                  </div>
                  <div className="font-monospace fs-3 text-white mb-2">•••• •••• •••• 4242</div>
                  <div className="d-flex align-items-center justify-content-between text-secondary small font-monospace">
                    <span>Muddati: 12/28</span>
                    <span>Stripe Verified</span>
                  </div>
                </div>

                <p className="text-secondary small mb-3" style={{ fontSize: "0.8rem", lineHeight: 1.45 }}>
                  Barcha to'lovlar xalqaro Stripe PCI-DSS 1-darajali xavfsizlik standarti orqali shifrlanadi.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1.5"
                  onClick={() => alert("Stripe Customer Portal orqali karta yangilash tez orada ochiladi.")}
                >
                  <IconExternalLink size={15} />
                  <span>Karta / Rekvizitlarni Yangilash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="card shadow-sm border border-secondary border-opacity-15">
        <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
          <h3 className="card-title fw-bold mb-0">Hisob-Fakturalar va To'lovlar Tarixi (Invoices)</h3>
          <span className="badge bg-secondary-lt">PDF Kvitansiyalar</span>
        </div>
        <div className="table-responsive">
          <table className="table table-vcenter card-table table-hover">
            <thead>
              <tr>
                <th>Hisob Raqami</th>
                <th>Sana</th>
                <th>Tarif / Ta'rif</th>
                <th>Summa</th>
                <th>Holati</th>
                <th className="text-end">Kvitansiya</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-monospace fw-semibold text-white">INV-2026-001</td>
                <td className="text-secondary small">{formatDate(subscription?.current_period_start)}</td>
                <td>
                  <span className="fw-medium text-white">{plan?.name} Plan</span>{" "}
                  <span className="text-secondary small">({cycle === "yearly" ? "Yillik" : "Oylik"})</span>
                </td>
                <td className="fw-bold font-monospace text-white">${price}</td>
                <td>
                  <span className="badge bg-green-lt text-green d-inline-flex align-items-center gap-1">
                    <IconCheck size={12} /> To'langan (Paid)
                  </span>
                </td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={() => alert("Hisob-faktura kvitansiyasi tayyorlanmoqda")}
                  >
                    <IconDownload size={14} /> PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

