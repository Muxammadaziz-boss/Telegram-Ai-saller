"use client";

import React, { useState } from "react";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconBuildingSkyscraper,
  IconChartBar,
  IconCheck,
  IconCoin,
  IconCreditCard,
  IconCrown,
  IconFileText,
  IconPencil,
  IconRefresh,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";

interface PlatformFinancialMetrics {
  mrr_usd: number;
  arr_usd: number;
  arpu_usd: number;
  total_organizations: number;
  active_subscriptions: number;
  trial_organizations: number;
  churn_rate_percent: number;
  total_ai_messages_this_month: number;
  total_ai_cost_usd: number;
  gross_margin_percent: number;
  plan_distribution: Record<string, number>;
}

interface OrganizationProfitability {
  id: number;
  name: string;
  slug: string;
  category: string;
  plan: string;
  subscription_status: string;
  monthly_revenue_usd: number;
  monthly_ai_cost_usd: number;
  gross_margin_percent: number;
  is_profitable: boolean;
}

interface PlatformOwnerTabProps {
  metrics: PlatformFinancialMetrics | null;
  organizations: OrganizationProfitability[];
  loading: boolean;
  onRefresh: () => void;
  onUpdatePlan: (planCode: string, payload: any) => Promise<void>;
}

export function PlatformOwnerTab({
  metrics,
  organizations,
  loading,
  onRefresh,
  onUpdatePlan,
}: PlatformOwnerTabProps) {
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [newMonthlyPrice, setNewMonthlyPrice] = useState<number>(59);
  const [newYearlyPrice, setNewYearlyPrice] = useState<number>(590);
  const [saveBusy, setSaveBusy] = useState(false);

  const handleSavePlan = async () => {
    if (!editingPlanCode) return;
    setSaveBusy(true);
    try {
      await onUpdatePlan(editingPlanCode, {
        price_monthly: newMonthlyPrice,
        price_yearly: newYearlyPrice,
      });
      setEditingPlanCode(null);
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Platform Owner Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between p-3.5 bg-body-tertiary rounded-3 border border-secondary border-opacity-10 gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2.5 bg-yellow-lt rounded-2">
            <IconCrown size={24} className="text-warning" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h3 className="card-title fw-bold mb-0">Platforma Egasi Boshqaruv Markazi</h3>
              <span className="badge bg-yellow text-dark fw-bold">Platform Owner</span>
            </div>
            <p className="text-secondary small mb-0">
              Barcha tenant tashkilotlar, real MRR daromadlari, AI LLM xarajatlari va yalpi rentabellik tahlili.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
            onClick={onRefresh}
            disabled={loading}
          >
            <IconRefresh size={15} className={loading ? "spin" : ""} />
            <span>Ko'rsatkichlarni Yangilash</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPI Row (MRR, ARR, Margin, AI Cost) */}
      <div className="row g-3">
        {/* MRR Card */}
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Oylik Takroriy Daromad (MRR)</span>
                <span className="badge bg-green-lt text-green">Real-time</span>
              </div>
              <div className="fs-1 fw-bold text-success font-monospace mb-1">
                ${metrics?.mrr_usd?.toFixed(2) || "0.00"}
              </div>
              <div className="text-secondary small">
                Yillik prognoz (ARR): <strong className="text-white font-monospace">${metrics?.arr_usd?.toFixed(2) || "0.00"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Gross Margin % */}
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Yalpi Foyda Marjasi</span>
                <span className="badge bg-primary-lt text-primary">Margin</span>
              </div>
              <div className="fs-1 fw-bold text-white font-monospace mb-1">
                {metrics?.gross_margin_percent?.toFixed(1) || "100"}%
              </div>
              <div className="text-secondary small">
                ARPU: <strong className="text-info font-monospace">${metrics?.arpu_usd?.toFixed(2) || "0.00"}</strong> / mijoz
              </div>
            </div>
          </div>
        </div>

        {/* Total AI Compute Cost */}
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Jami AI Xarajati</span>
                <span className="badge bg-orange-lt text-orange">Compute Cost</span>
              </div>
              <div className="fs-1 fw-bold text-warning font-monospace mb-1">
                ${metrics?.total_ai_cost_usd?.toFixed(2) || "0.00"}
              </div>
              <div className="text-secondary small">
                Bu oy: <strong className="text-white font-monospace">{metrics?.total_ai_messages_this_month?.toLocaleString() || "0"}</strong> ta AI xabari
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Portfolio Count */}
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Tenant Tashkilotlar</span>
                <span className="badge bg-blue-lt text-blue">Mijozlar</span>
              </div>
              <div className="fs-1 fw-bold text-white font-monospace mb-1">
                {metrics?.total_organizations || 1}{" "}
                <span className="text-secondary small fs-4 fw-normal">ta</span>
              </div>
              <div className="text-secondary small">
                Faol obuna: <strong className="text-success">{metrics?.active_subscriptions || 1} ta</strong> • Sinov: {metrics?.trial_organizations || 0} ta
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Organizations Portfolio Table */}
      <div className="card shadow-sm border border-secondary border-opacity-15">
        <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
          <div>
            <h3 className="card-title fw-bold mb-0">Tashkilotlar Portfeli va Rentabellik Tahlili</h3>
            <span className="text-secondary small">Har bir tashkilotning oylik to'lovi va AI resurs sarfi</span>
          </div>
          <span className="badge bg-primary-lt text-primary font-monospace">
            {organizations.length} ta tashkilot
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table table-hover">
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Tashkilot Nomi</th>
                <th>Sohasi</th>
                <th>Tarif</th>
                <th>Obuna Holati</th>
                <th>Oylik Daromad</th>
                <th>AI Xarajati</th>
                <th>Marja (%)</th>
                <th className="text-end">Holat</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="p-1.5 bg-primary-lt rounded text-primary">
                        <IconBuildingSkyscraper size={16} />
                      </div>
                      <div>
                        <div className="fw-bold text-white">{org.name}</div>
                        <div className="text-secondary small font-monospace">id: #{org.id} • {org.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-secondary small">{org.category || "Retail"}</td>
                  <td>
                    <span className="badge bg-azure-lt font-monospace fw-bold">{org.plan}</span>
                  </td>
                  <td>
                    <span
                      className={`badge small ${
                        org.subscription_status === "active"
                          ? "bg-green-lt text-green"
                          : org.subscription_status === "trialing"
                          ? "bg-blue-lt text-blue"
                          : "bg-danger-lt text-danger"
                      }`}
                    >
                      {org.subscription_status}
                    </span>
                  </td>
                  <td className="font-monospace fw-bold text-success">${org.monthly_revenue_usd}</td>
                  <td className="font-monospace text-warning">${org.monthly_ai_cost_usd}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="font-monospace fw-bold text-white small">{org.gross_margin_percent}%</span>
                      <div className="progress progress-xs w-100" style={{ maxWidth: 60 }}>
                        <div
                          className={`progress-bar ${org.gross_margin_percent >= 50 ? "bg-success" : "bg-warning"}`}
                          style={{ width: `${Math.max(10, Math.min(100, org.gross_margin_percent))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="text-end">
                    {org.is_profitable ? (
                      <span className="badge bg-green-lt text-green small">🟢 Foydali</span>
                    ) : (
                      <span className="badge bg-danger-lt text-danger small">🔴 Zararli</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Plan Limits & Pricing Configurator */}
      <div className="card shadow-sm border border-secondary border-opacity-15">
        <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
          <div>
            <h3 className="card-title fw-bold mb-0">Tariflar Narxi va Limitlarini Sozlash</h3>
            <span className="text-secondary small">Platforma egasi barcha tariflarni kod yozmasdan shu yerdan boshqara oladi</span>
          </div>
          <span className="badge bg-yellow-lt text-warning">Dynamic Config</span>
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            {[
              { code: "start", name: "START", defaultM: 19, defaultY: 190, desc: "Kichik biznes uchun" },
              { code: "pro", name: "PRO", defaultM: 59, defaultY: 590, desc: "Eng ommabop tarif" },
              { code: "ultra", name: "ULTRA", defaultM: 149, defaultY: 1490, desc: "Katta korxonalar uchun" },
            ].map((p) => (
              <div key={p.code} className="col-md-4">
                <div className="p-3.5 rounded bg-body-tertiary border border-secondary border-opacity-15 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fs-3 fw-bold text-white font-monospace">{p.name}</span>
                      <span className="badge bg-secondary-lt font-monospace text-uppercase">{p.code}</span>
                    </div>
                    <p className="text-secondary small mb-3">{p.desc}</p>
                    <div className="small text-secondary mb-1">
                      Oylik: <strong className="text-white">${p.defaultM}/oy</strong> • Yillik: <strong className="text-white">${p.defaultY}/yil</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1.5 mt-3"
                    onClick={() => {
                      setEditingPlanCode(p.code);
                      setNewMonthlyPrice(p.defaultM);
                      setNewYearlyPrice(p.defaultY);
                    }}
                  >
                    <IconPencil size={14} />
                    <span>Narxni Tahrirlash</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {editingPlanCode && (
        <div className="modal modal-blur fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border border-secondary border-opacity-25">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingPlanCode.toUpperCase()} Tarifi Narxlarini O'zgartirish
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingPlanCode(null)}
                />
              </div>
              <div className="modal-body space-y-3">
                <div className="mb-3">
                  <label className="form-label required">Oylik Narx ($USD)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newMonthlyPrice}
                    onChange={(e) => setNewMonthlyPrice(Number(e.target.value))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label required">Yillik Narx ($USD)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newYearlyPrice}
                    onChange={(e) => setNewYearlyPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setEditingPlanCode(null)}
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePlan}
                  disabled={saveBusy}
                >
                  {saveBusy ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

