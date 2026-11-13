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
  IconPlus,
  IconRefresh,
  IconSearch,
  IconServer,
  IconShieldCheck,
  IconTrash,
  IconTrendingUp,
  IconUserCheck,
  IconUsers,
  IconX,
  IconPlayerPause,
  IconPlayerPlay,
  IconExternalLink,
  IconKey,
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
  onCreateStore?: (payload: any) => Promise<any>;
  onUpdateStoreStatus?: (storeId: number, status: string) => Promise<void>;
  onDeleteStore?: (storeId: number) => Promise<void>;
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
  onCreateStore,
  onUpdateStoreStatus,
  onDeleteStore,
}: PlatformOwnerTabProps) {
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [newMonthlyPrice, setNewMonthlyPrice] = useState<number>(59);
  const [newYearlyPrice, setNewYearlyPrice] = useState<number>(590);
  const [saveBusy, setSaveBusy] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Create store modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStoreName, setCreateStoreName] = useState("");
  const [createStoreSlug, setCreateStoreSlug] = useState("");
  const [createStoreCategory, setCreateStoreCategory] = useState("Elektronika va Texnika");
  const [createStoreEmail, setCreateStoreEmail] = useState("");
  const [createStorePassword, setCreateStorePassword] = useState("");
  const [createStoreBotToken, setCreateStoreBotToken] = useState("");
  const [createStoreCurrency, setCreateStoreCurrency] = useState<"UZS" | "USD">("UZS");
  const [createStorePlan, setCreateStorePlan] = useState("pro");
  const [createStoreBusy, setCreateStoreBusy] = useState(false);
  const [createStoreError, setCreateStoreError] = useState("");
  const [createStoreSuccess, setCreateStoreSuccess] = useState<any>(null);

  const resetCreateForm = () => {
    setCreateStoreName("");
    setCreateStoreSlug("");
    setCreateStoreEmail("");
    setCreateStorePassword("");
    setCreateStoreBotToken("");
    setCreateStoreCurrency("UZS");
    setCreateStorePlan("pro");
    setCreateStoreError("");
    setCreateStoreSuccess(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStoreName.trim()) {
      setCreateStoreError("Do'kon nomi kiritilishi shart");
      return;
    }
    if (!createStoreSlug.trim()) {
      setCreateStoreError("Do'kon qisqa nomi (slug) kiritilishi shart");
      return;
    }
    if (!createStoreEmail.trim()) {
      setCreateStoreError("Do'kon egasi pochtasi kiritilishi shart");
      return;
    }
    setCreateStoreBusy(true);
    setCreateStoreError("");
    try {
      if (onCreateStore) {
        const res = await onCreateStore({
          name: createStoreName.trim(),
          slug: createStoreSlug.trim().toLowerCase(),
          category: createStoreCategory,
          owner_email: createStoreEmail.trim().toLowerCase(),
          owner_password: createStorePassword || undefined,
          telegram_bot_token: createStoreBotToken.trim() || undefined,
          currency: createStoreCurrency,
          plan_code: createStorePlan,
        });
        setCreateStoreSuccess(res);
      }
    } catch (err: any) {
      setCreateStoreError(err.message || "Do'kon ochishda xatolik yuz berdi");
    } finally {
      setCreateStoreBusy(false);
    }
  };

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
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 shadow-sm fw-semibold"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          >
            <IconPlus size={16} />
            <span>+ Yangi Do'kon Ochish</span>
          </button>

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
              <button
                type="button"
                className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 shadow-sm fw-semibold"
                onClick={() => {
                  resetCreateForm();
                  setShowCreateModal(true);
                }}
              >
                <IconPlus size={16} />
                <span>+ Yangi Do'kon Ochish</span>
              </button>
              <div className="input-icon" style={{ minWidth: 200 }}>
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
                      <div className="d-flex align-items-center justify-content-end gap-1.5">
                        {onEnterStore && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5 shadow-sm"
                            onClick={() => onEnterStore(org)}
                            title="Ushbu do'kon ichiga kirish (Owner ko'rinishi)"
                          >
                            <span>Ichiga kirish</span>
                            <IconArrowRight size={14} />
                          </button>
                        )}
                        {onUpdateStoreStatus && (
                          <button
                            type="button"
                            className={`btn btn-sm btn-icon ${
                              org.subscription_status === "active"
                                ? "btn-outline-warning"
                                : "btn-outline-success"
                            }`}
                            onClick={() =>
                              onUpdateStoreStatus(
                                org.id,
                                org.subscription_status === "active" ? "suspended" : "active"
                              )
                            }
                            title={
                              org.subscription_status === "active"
                                ? "Do'konni vaqtincha to'xtatish"
                                : "Do'konni faollashtirish"
                            }
                          >
                            {org.subscription_status === "active" ? (
                              <IconPlayerPause size={14} />
                            ) : (
                              <IconPlayerPlay size={14} />
                            )}
                          </button>
                        )}
                        {onDeleteStore && org.id !== 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-icon btn-outline-danger"
                            onClick={() => onDeleteStore(org.id)}
                            title="Do'konni butunlay o'chirish"
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </div>
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

      {/* MODAL: CREATE NEW STORE (TENANT ONBOARDING) */}
      {showCreateModal && (
        <div
          className="modal modal-blur show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1055 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border border-secondary border-opacity-25">
              <div className="modal-header">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 bg-primary-lt rounded-2">
                    <IconBuildingSkyscraper size={20} className="text-primary" />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Yangi Do'kon Ochish</h5>
                    <p className="text-secondary small mb-0">
                      Platforma doirasida yangi mustaqil savdo do'koni va botini ishga tushirish
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                />
              </div>

              {createStoreSuccess ? (
                <div className="modal-body p-4 text-center">
                  <div className="mb-3">
                    <span className="avatar avatar-xl bg-success-lt text-success rounded-circle">
                      <IconCheck size={36} />
                    </span>
                  </div>
                  <h3 className="text-white fw-bold mb-2">Do'kon Muvaffaqiyatli Ochildi!</h3>
                  <p className="text-secondary mb-4">
                    <strong>{createStoreSuccess.organization?.name}</strong> do'koni tizimda yaratildi va barcha sozlamalar ulandi.
                  </p>

                  <div className="card bg-dark border-secondary border-opacity-25 text-start p-3 mb-4">
                    <div className="row g-2 small">
                      <div className="col-sm-4 text-secondary">Do'kon ID & Slug:</div>
                      <div className="col-sm-8 text-white font-monospace">
                        #{createStoreSuccess.organization?.id} • {createStoreSuccess.organization?.slug}
                      </div>
                      <div className="col-sm-4 text-secondary">Egasi Pochtasi:</div>
                      <div className="col-sm-8 text-white font-monospace">
                        {createStoreSuccess.organization?.owner_email}
                      </div>
                      {createStoreSuccess.organization?.temporary_password && (
                        <>
                          <div className="col-sm-4 text-secondary">Vaqtincha Parol:</div>
                          <div className="col-sm-8 text-warning font-monospace fw-bold">
                            {createStoreSuccess.organization?.temporary_password}
                          </div>
                        </>
                      )}
                      <div className="col-sm-4 text-secondary">Tarif & Valyuta:</div>
                      <div className="col-sm-8 text-info font-monospace">
                        {createStoreSuccess.organization?.plan} ({createStoreSuccess.organization?.currency})
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Yopish
                    </button>
                    {onEnterStore && createStoreSuccess.organization && (
                      <button
                        type="button"
                        className="btn btn-primary d-flex align-items-center gap-1.5"
                        onClick={() => {
                          setShowCreateModal(false);
                          onEnterStore(createStoreSuccess.organization);
                        }}
                      >
                        <span>Do'kon ichiga kirish</span>
                        <IconArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit}>
                  <div className="modal-body p-4 space-y-3">
                    {createStoreError && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
                        <IconAlertCircle size={18} />
                        <span>{createStoreError}</span>
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label required">Do'kon Nomi</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Masalan: Artel Elektronika"
                          value={createStoreName}
                          onChange={(e) => {
                            setCreateStoreName(e.target.value);
                            if (!createStoreSlug) {
                              setCreateStoreSlug(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")
                                  .replace(/^-|-$/g, "")
                              );
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label required">Qisqa Identifikator (Slug)</label>
                        <div className="input-group">
                          <span className="input-group-text text-secondary small">/t/</span>
                          <input
                            type="text"
                            className="form-control font-monospace"
                            placeholder="artel"
                            value={createStoreSlug}
                            onChange={(e) => setCreateStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Soha / Kategoriya</label>
                        <select
                          className="form-select"
                          value={createStoreCategory}
                          onChange={(e) => setCreateStoreCategory(e.target.value)}
                        >
                          <option value="Elektronika va Texnika">Elektronika va Texnika</option>
                          <option value="Kiyim-kechak va Moda">Kiyim-kechak va Moda</option>
                          <option value="Go'zallik va Parfyumeriya">Go'zallik va Parfyumeriya</option>
                          <option value="Avto ehtiyot qismlar">Avto ehtiyot qismlar</option>
                          <option value="Uy-ro'zg'or mollari">Uy-ro'zg'or mollari</option>
                          <option value="Restoran va Kafelar">Restoran va Kafelar</option>
                          <option value="Xizmat ko'rsatish">Xizmat ko'rsatish</option>
                          <option value="Boshqa">Boshqa</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label required">Tarif Rejasi</label>
                        <select
                          className="form-select"
                          value={createStorePlan}
                          onChange={(e) => setCreateStorePlan(e.target.value)}
                        >
                          <option value="start">START</option>
                          <option value="pro">PRO (Tavsiya)</option>
                          <option value="ultra">ULTRA</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label required">Asosiy Valyuta</label>
                        <select
                          className="form-select"
                          value={createStoreCurrency}
                          onChange={(e) => setCreateStoreCurrency(e.target.value as "UZS" | "USD")}
                        >
                          <option value="UZS">UZS (so'm)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                    </div>

                    <hr className="my-3 border-secondary border-opacity-15" />

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label required">Do'kon Egasi Pochtasi (Email)</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="owner@artel.uz"
                          value={createStoreEmail}
                          onChange={(e) => setCreateStoreEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Egasi Paroli (ixtiyoriy)</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Bo'sh qolsa avtomatik generatsiya qilinadi"
                          value={createStorePassword}
                          onChange={(e) => setCreateStorePassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label d-flex align-items-center justify-content-between">
                        <span>Telegram Bot Token (ixtiyoriy, keyin ham ulash mumkin)</span>
                        <span className="badge bg-secondary-lt text-secondary">BotFather</span>
                      </label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                        value={createStoreBotToken}
                        onChange={(e) => setCreateStoreBotToken(e.target.value)}
                      />
                      <small className="form-hint">
                        Telegram'da @BotFather orqali olingan token. Kiritilsa, webhook avtomatik ulanadi.
                      </small>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCreateModal(false)}
                      disabled={createStoreBusy}
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center gap-1.5"
                      disabled={createStoreBusy}
                    >
                      {createStoreBusy ? (
                        <>
                          <IconRefresh size={16} className="spin" />
                          <span>Do'kon ochilmoqda...</span>
                        </>
                      ) : (
                        <>
                          <IconPlus size={16} />
                          <span>Do'konni Ochish</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
