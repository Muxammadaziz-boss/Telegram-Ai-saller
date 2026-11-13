"use client";

import React, { useState } from "react";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowRight,
  IconArrowUpRight,
  IconBuildingSkyscraper,
  IconChartBar,
  IconCheck,
  IconCoin,
  IconCpu,
  IconCreditCard,
  IconCrown,
  IconDatabase,
  IconFileText,
  IconGauge,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconServer,
  IconShieldCheck,
  IconTrendingUp,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";

export interface PlatformFinancialMetrics {
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

export interface OrganizationProfitability {
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
  conversations_count?: number;
  bot_configured?: boolean;
  created_at?: string;
}

export interface PlatformUser {
  id: number;
  email: string;
  full_name?: string;
  telegram_user_id?: number;
  is_platform_owner: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface PlatformAuditLog {
  id: number;
  organization_id?: number | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  metadata?: any;
  created_at?: string;
}

export interface PlatformSystemHealth {
  status: string;
  database: string;
  app_env: string;
  version: string;
  gemini_configured: boolean;
  openai_configured: boolean;
  telegram_configured: boolean;
}

interface PlatformOwnerTabProps {
  subTab?: "overview" | "stores" | "users" | "plans" | "usage" | "system" | "audit";
  metrics: PlatformFinancialMetrics | null;
  organizations: OrganizationProfitability[];
  usersList?: PlatformUser[];
  systemHealth?: PlatformSystemHealth | null;
  auditLogs?: PlatformAuditLog[];
  loading: boolean;
  onRefresh: () => void;
  onUpdatePlan: (planCode: string, payload: any) => Promise<void>;
  onEnterStore?: (store: OrganizationProfitability) => void;
  onSwitchSubTab?: (subTab: "overview" | "stores" | "users" | "plans" | "usage" | "system" | "audit") => void;
}

export function PlatformOwnerTab({
  subTab = "overview",
  metrics,
  organizations,
  usersList = [],
  systemHealth = null,
  auditLogs = [],
  loading,
  onRefresh,
  onUpdatePlan,
  onEnterStore,
  onSwitchSubTab,
}: PlatformOwnerTabProps) {
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [newMonthlyPrice, setNewMonthlyPrice] = useState<number>(59);
  const [newYearlyPrice, setNewYearlyPrice] = useState<number>(590);
  const [saveBusy, setSaveBusy] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

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

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(storeSearch.toLowerCase()) ||
      (o.category && o.category.toLowerCase().includes(storeSearch.toLowerCase()))
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

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
              Barcha do'konlar, real daromad (MRR), AI xarajatlari va tizim audit nazorati.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {onSwitchSubTab && (
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${subTab === "overview" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`btn ${subTab === "stores" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("stores")}
              >
                Do'konlar ({organizations.length})
              </button>
              <button
                type="button"
                className={`btn ${subTab === "users" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("users")}
              >
                Foydalanuvchilar
              </button>
              <button
                type="button"
                className={`btn ${subTab === "plans" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("plans")}
              >
                Tariflar
              </button>
              <button
                type="button"
                className={`btn ${subTab === "usage" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("usage")}
              >
                AI xarajati
              </button>
              <button
                type="button"
                className={`btn ${subTab === "system" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("system")}
              >
                Tizim
              </button>
              <button
                type="button"
                className={`btn ${subTab === "audit" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onSwitchSubTab("audit")}
              >
                Audit
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
            onClick={onRefresh}
            disabled={loading}
          >
            <IconRefresh size={15} className={loading ? "spin" : ""} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* SUBTAB: OVERVIEW */}
      {subTab === "overview" && (
        <>
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
                    <span className="text-secondary small fw-bold text-uppercase">Do'konlar Soni</span>
                    <span className="badge bg-blue-lt text-blue">Tenants</span>
                  </div>
                  <div className="fs-1 fw-bold text-white font-monospace mb-1">
                    {metrics?.total_organizations || organizations.length || 1}{" "}
                    <span className="text-secondary small fs-4 fw-normal">ta</span>
                  </div>
                  <div className="text-secondary small">
                    Faol: <strong className="text-success">{metrics?.active_subscriptions || 1} ta</strong> • Sinov: {metrics?.trial_organizations || 0} ta
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stores Overview & Plan Distribution */}
          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
                <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
                  <div>
                    <h4 className="card-title fw-bold mb-0">Eng Faol Do'konlar</h4>
                    <span className="text-secondary small">So'nggi faollik va AI resurs sarfi</span>
                  </div>
                  {onSwitchSubTab && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost-primary"
                      onClick={() => onSwitchSubTab("stores")}
                    >
                      Barcha do'konlar ➜
                    </button>
                  )}
                </div>
                <div className="table-responsive">
                  <table className="table table-vcenter card-table table-hover">
                    <thead>
                      <tr>
                        <th>Do'kon</th>
                        <th>Tarif</th>
                        <th>Oylik Daromad</th>
                        <th>AI Xarajati</th>
                        <th>Marja</th>
                        <th className="text-end">Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.slice(0, 5).map((org) => (
                        <tr key={org.id}>
                          <td>
                            <div className="fw-bold text-white">{org.name}</div>
                            <div className="text-secondary small font-monospace">{org.slug}</div>
                          </td>
                          <td>
                            <span className="badge bg-azure-lt font-monospace">{org.plan}</span>
                          </td>
                          <td className="font-monospace text-success fw-bold">${org.monthly_revenue_usd}</td>
                          <td className="font-monospace text-warning">${org.monthly_ai_cost_usd}</td>
                          <td className="font-monospace text-white">{org.gross_margin_percent}%</td>
                          <td className="text-end">
                            {onEnterStore && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                                onClick={() => onEnterStore(org)}
                              >
                                <span>Kirish</span>
                                <IconArrowRight size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card shadow-sm border border-secondary border-opacity-15 h-100">
                <div className="card-header py-3 px-4">
                  <h4 className="card-title fw-bold mb-0">Tariflar Taqsimoti</h4>
                </div>
                <div className="card-body p-4">
                  <div className="space-y-3">
                    {Object.entries(metrics?.plan_distribution || { start: 1, pro: 0, ultra: 0 }).map(
                      ([plan, count]) => (
                        <div key={plan}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-semibold text-uppercase font-monospace">{plan}</span>
                            <span className="badge bg-secondary-lt font-monospace">{count} ta</span>
                          </div>
                          <div className="progress progress-sm">
                            <div
                              className={`progress-bar ${
                                plan === "ultra" ? "bg-purple" : plan === "pro" ? "bg-primary" : "bg-info"
                              }`}
                              style={{
                                width: `${Math.max(
                                  15,
                                  ((count as number) / Math.max(1, metrics?.total_organizations || 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUBTAB: STORES */}
      {subTab === "stores" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h3 className="card-title fw-bold mb-0">Barcha Do'konlar (Tenants)</h3>
              <span className="text-secondary small">
                Har bir do'konga kirish (impersonate) va uning real ma'lumotlarini kuzatish
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="input-icon" style={{ minWidth: 240 }}>
                <span className="input-icon-addon">
                  <IconSearch size={16} />
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Do'kon nomi yoki slug..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />
              </div>
              <span className="badge bg-primary-lt font-monospace">
                {filteredOrgs.length} ta do'kon
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-vcenter card-table table-hover">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Do'kon Nomi</th>
                  <th>Sohasi</th>
                  <th>Tarif</th>
                  <th>Obuna Holati</th>
                  <th>Suhbatlar</th>
                  <th>Oylik Daromad</th>
                  <th>AI Xarajati</th>
                  <th>Marja (%)</th>
                  <th className="text-end">Harakat</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
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
                    <td className="font-monospace text-secondary small">
                      {org.conversations_count ?? "—"} ta
                    </td>
                    <td className="font-monospace fw-bold text-success">${org.monthly_revenue_usd}</td>
                    <td className="font-monospace text-warning">${org.monthly_ai_cost_usd}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="font-monospace fw-bold text-white small">{org.gross_margin_percent}%</span>
                        <div className="progress progress-xs w-100" style={{ maxWidth: 50 }}>
                          <div
                            className={`progress-bar ${org.gross_margin_percent >= 50 ? "bg-success" : "bg-warning"}`}
                            style={{ width: `${Math.max(10, Math.min(100, org.gross_margin_percent))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="text-end">
                      {onEnterStore && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5"
                          onClick={() => onEnterStore(org)}
                          title="Ushbu do'kon ichiga kirish (Owner ko'rinishi)"
                        >
                          <span>Ichiga kirish</span>
                          <IconArrowRight size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-secondary">
                      Mos keluvchi do'kon topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: USERS */}
      {subTab === "users" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
            <div>
              <h3 className="card-title fw-bold mb-0">Platforma Foydalanuvchilari</h3>
              <span className="text-secondary small">Tizimda ro'yxatdan o'tgan barcha akkauntlar</span>
            </div>
            <div className="input-icon" style={{ minWidth: 240 }}>
              <span className="input-icon-addon">
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Email yoki ism..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-vcenter card-table table-hover">
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Telegram ID</th>
                  <th>Roli</th>
                  <th>Holati</th>
                  <th>Ro'yxatdan o'tgan</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-1.5 bg-blue-lt rounded">
                          <IconUsers size={16} />
                        </div>
                        <div>
                          <div className="fw-bold text-white">{u.full_name || u.email}</div>
                          <div className="text-secondary small font-monospace">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-monospace text-secondary small">
                      {u.telegram_user_id ? String(u.telegram_user_id) : "—"}
                    </td>
                    <td>
                      {u.is_platform_owner ? (
                        <span className="badge bg-yellow text-dark fw-bold">Platform Owner</span>
                      ) : (
                        <span className="badge bg-secondary-lt">User</span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge bg-green-lt text-green">Faol</span>
                      ) : (
                        <span className="badge bg-danger-lt text-danger">Nofaol</span>
                      )}
                    </td>
                    <td className="text-secondary small font-monospace">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-secondary">
                      Foydalanuvchilar topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: PLANS */}
      {subTab === "plans" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
            <div>
              <h3 className="card-title fw-bold mb-0">Tariflar Narxi va Limitlarini Sozlash</h3>
              <span className="text-secondary small">Platforma egasi barcha tariflarni shu yerdan boshqara oladi</span>
            </div>
            <span className="badge bg-yellow-lt text-warning">Dynamic Config</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {[
                { code: "start", name: "START", defaultM: 19, defaultY: 190, desc: "Kichik biznes uchun boshlang'ich tarif" },
                { code: "pro", name: "PRO", defaultM: 59, defaultY: 590, desc: "Eng ommabop tarif — jamoa va to'liq AI funksiyalari" },
                { code: "ultra", name: "ULTRA", defaultM: 149, defaultY: 1490, desc: "Katta korxonalar uchun cheksiz imkoniyatlar" },
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
      )}

      {/* SUBTAB: USAGE (AI Xarajatlari) */}
      {subTab === "usage" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4">
            <h3 className="card-title fw-bold mb-0">Platforma AI LLM Xarajatlari va Tokenlar</h3>
            <span className="text-secondary small">Joriy oyda barcha do'konlar bo'yicha ishlatilgan hisoblash resurslari</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3.5 rounded bg-body-tertiary border border-secondary border-opacity-15">
                  <div className="text-secondary small fw-bold text-uppercase mb-2">Jami Hisoblangan Xarajat</div>
                  <div className="fs-1 fw-bold text-warning font-monospace mb-1">
                    ${metrics?.total_ai_cost_usd?.toFixed(3) || "0.000"}
                  </div>
                  <p className="text-secondary small mb-0">
                    Oylik marja: <strong className="text-success">{metrics?.gross_margin_percent?.toFixed(1) || "100"}%</strong>
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3.5 rounded bg-body-tertiary border border-secondary border-opacity-15">
                  <div className="text-secondary small fw-bold text-uppercase mb-2">Jami AI Xabarlari</div>
                  <div className="fs-1 fw-bold text-white font-monospace mb-1">
                    {metrics?.total_ai_messages_this_month?.toLocaleString() || "0"} ta
                  </div>
                  <p className="text-secondary small mb-0">
                    O'rtacha bitta xabar narxi: <strong className="text-info font-monospace">~$0.0003</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: SYSTEM (Tizim Holati) */}
      {subTab === "system" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4">
            <h3 className="card-title fw-bold mb-0">Tizim va Xizmatlar Holati</h3>
            <span className="text-secondary small">Infratuzilma va ulanishlar monitoringi</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-15">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold">PostgreSQL & pgvector</span>
                    <span className="badge bg-green-lt text-green">Connected</span>
                  </div>
                  <div className="small text-secondary font-monospace">
                    Holat: {systemHealth?.database || "healthy"}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-15">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold">Google Gemini API</span>
                    {systemHealth?.gemini_configured ? (
                      <span className="badge bg-green-lt text-green">Sozlangan</span>
                    ) : (
                      <span className="badge bg-danger-lt text-danger">Sozlanmagan</span>
                    )}
                  </div>
                  <div className="small text-secondary">
                    Asosiy AI provayder
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-15">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold">Telegram Bot Service</span>
                    {systemHealth?.telegram_configured ? (
                      <span className="badge bg-green-lt text-green">Faol</span>
                    ) : (
                      <span className="badge bg-yellow-lt text-warning">Kutilmoqda</span>
                    )}
                  </div>
                  <div className="small text-secondary">
                    Muhit: {systemHealth?.app_env || "development"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: AUDIT LOGS */}
      {subTab === "audit" && (
        <div className="card shadow-sm border border-secondary border-opacity-15">
          <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between">
            <div>
              <h3 className="card-title fw-bold mb-0">Xavfsizlik va Ma'muriy Audit Loglari</h3>
              <span className="text-secondary small">Do'konlarga kirishlar, tarif o'zgarishlari va muhim harakatlar jurnali</span>
            </div>
            <span className="badge bg-secondary-lt font-monospace">{auditLogs.length} ta yozuv</span>
          </div>

          <div className="table-responsive">
            <table className="table table-vcenter card-table table-hover">
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Harakat</th>
                  <th>Resurs</th>
                  <th>Tafsilotlar</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-secondary small font-monospace" style={{ whiteSpace: "nowrap" }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <span className="badge bg-blue-lt font-monospace fw-bold">{log.action}</span>
                    </td>
                    <td className="text-white small">
                      {log.resource} {log.resource_id ? `#${log.resource_id}` : ""}
                    </td>
                    <td className="font-monospace small text-secondary">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-secondary">
                      Audit yozuvlari topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
