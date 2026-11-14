"use client";

import React, { useState } from "react";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowRight,
  IconBuildingSkyscraper,
  IconCheck,
  IconCpu,
  IconCreditCard,
  IconCrown,
  IconHistory,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconUsers,
  IconPlayerPause,
  IconPlayerPlay,
  IconLayersLinked,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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
        monthly_price_usd: newMonthlyPrice,
        yearly_price_usd: newYearlyPrice,
      });
      setEditingPlanCode(null);
    } finally {
      setSaveBusy(false);
    }
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const subTabButtons: { id: typeof subTab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: IconLayoutDashboard },
    { id: "stores", label: "Do'konlar", icon: IconBuildingSkyscraper, count: organizations.length },
    { id: "users", label: "Foydalanuvchilar", icon: IconUsers, count: usersList.length },
    { id: "plans", label: "Tariflar & Narxlar", icon: IconLayersLinked },
    { id: "usage", label: "AI Xarajati", icon: IconCpu },
    { id: "system", label: "Tizim Holati", icon: IconShieldLock },
    { id: "audit", label: "Audit Tarixi", icon: IconHistory },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      {/* Platform Owner Header & Navigation Banner */}
      <div className="linear-card p-3.5 d-flex flex-column gap-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
              style={{
                width: "44px",
                height: "44px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid var(--warning-border)",
              }}
            >
              <IconCrown size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h2 className="fw-bold mb-0 text-primary" style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>
                  Platforma Egasi Boshqaruv Markazi
                </h2>
                <Badge variant="warning">Platform Owner</Badge>
                <Badge variant="accent">
                  {(metrics?.total_organizations ?? organizations.length) || 0} ta do'kon
                </Badge>
              </div>
              <p className="text-secondary small mb-0 mt-0.5">
                Barcha mustaqil do'konlar portfeli, umumiy MRR, AI sarflari va har bir tashkilot ichiga kirish (impersonation).
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={<IconPlus size={15} />}
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
            >
              + Yangi Do'kon Ochish
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<IconRefresh size={14} className={loading ? "spin" : ""} />}
              onClick={onRefresh}
              disabled={loading}
              title="Ma'lumotlarni yangilash"
            >
              Yangilash
            </Button>
          </div>
        </div>

        {/* Sub-tab Pill Navigation */}
        <div
          className="d-flex align-items-center gap-1 overflow-x-auto pt-2 border-top custom-scrollbar"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {subTabButtons.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSwitchSubTab && onSwitchSubTab(tab.id)}
                className={`d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-1 border-0 small fw-medium transition-fast text-nowrap ${
                  active ? "text-white" : "text-secondary"
                }`}
                style={{
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  backgroundColor: active ? "var(--accent)" : "transparent",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                <Icon size={15} style={{ color: active ? "#ffffff" : "inherit" }} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className="badge rounded-pill"
                    style={{
                      fontSize: "0.65rem",
                      padding: "1px 6px",
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : "var(--bg-surface-hover)",
                      color: active ? "#ffffff" : "var(--text-secondary)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB: OVERVIEW */}
      {subTab === "overview" && (
        <div className="d-flex flex-column gap-4">
          {/* Top 4 Financial KPI Cards */}
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="linear-card p-3.5 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small fw-bold text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                      Oylik Takroriy Daromad (MRR)
                    </span>
                    <Badge variant="success">Real-time</Badge>
                  </div>
                  <div className="fs-2 fw-bold font-monospace mb-1" style={{ color: "var(--success)" }}>
                    ${metrics?.mrr_usd?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="text-secondary small mt-2 pt-2 border-top" style={{ borderColor: "var(--border-subtle)", fontSize: "0.78rem" }}>
                  Yillik prognoz (ARR): <strong className="text-primary font-monospace">${metrics?.arr_usd?.toFixed(2) || "0.00"}</strong>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="linear-card p-3.5 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small fw-bold text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                      Yalpi Foyda Marjasi
                    </span>
                    <Badge variant="accent">Margin</Badge>
                  </div>
                  <div className="fs-2 fw-bold font-monospace mb-1 text-primary">
                    {metrics?.gross_margin_percent?.toFixed(1) || "100"}%
                  </div>
                </div>
                <div className="text-secondary small mt-2 pt-2 border-top" style={{ borderColor: "var(--border-subtle)", fontSize: "0.78rem" }}>
                  ARPU: <strong className="font-monospace" style={{ color: "var(--info)" }}>${metrics?.arpu_usd?.toFixed(2) || "0.00"}</strong> / mijoz
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="linear-card p-3.5 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small fw-bold text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                      Jami AI Xarajati
                    </span>
                    <Badge variant="warning">Compute Cost</Badge>
                  </div>
                  <div className="fs-2 fw-bold font-monospace mb-1" style={{ color: "var(--warning)" }}>
                    ${metrics?.total_ai_cost_usd?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="text-secondary small mt-2 pt-2 border-top" style={{ borderColor: "var(--border-subtle)", fontSize: "0.78rem" }}>
                  Bu oy: <strong className="text-primary font-monospace">{metrics?.total_ai_messages_this_month?.toLocaleString() || "0"}</strong> ta xabar
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="linear-card p-3.5 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small fw-bold text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                      Do'konlar Soni
                    </span>
                    <Badge variant="info">Tenants</Badge>
                  </div>
                  <div className="fs-2 fw-bold font-monospace mb-1 text-primary">
                    {(metrics?.total_organizations ?? organizations.length) || 0}{" "}
                    <span className="text-secondary small fs-5 fw-normal">ta</span>
                  </div>
                </div>
                <div className="text-secondary small mt-2 pt-2 border-top" style={{ borderColor: "var(--border-subtle)", fontSize: "0.78rem" }}>
                  Faol: <strong style={{ color: "var(--success)" }}>{(metrics?.active_subscriptions ?? organizations.filter(o => o.subscription_status === "active").length) || 0} ta</strong> • Sinov: {metrics?.trial_organizations || 0} ta
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stores Overview & Plan Distribution */}
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <Card>
                <CardHeader
                  actions={
                    onSwitchSubTab && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSwitchSubTab("stores")}
                      >
                        Barcha do'konlar ➜
                      </Button>
                    )
                  }
                >
                  <CardTitle>Eng Faol Do'konlar</CardTitle>
                </CardHeader>
                <div className="table-responsive">
                  <table className="linear-table">
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
                      {organizations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-secondary">
                            Hozircha faol do'konlar mavjud emas.
                          </td>
                        </tr>
                      ) : (
                        organizations.slice(0, 5).map((org) => (
                          <tr key={org.id}>
                            <td>
                              <div className="fw-semibold text-primary">{org.name}</div>
                              <div className="text-secondary small font-monospace" style={{ fontSize: "0.75rem" }}>
                                {org.slug}
                              </div>
                            </td>
                            <td>
                              <Badge variant="accent">{org.plan.toUpperCase()}</Badge>
                            </td>
                            <td className="font-monospace fw-bold" style={{ color: "var(--success)" }}>
                              ${org.monthly_revenue_usd}
                            </td>
                            <td className="font-monospace" style={{ color: "var(--warning)" }}>
                              ${org.monthly_ai_cost_usd}
                            </td>
                            <td>
                              <span className="font-monospace fw-semibold text-primary">
                                {org.gross_margin_percent}%
                              </span>
                            </td>
                            <td className="text-end">
                              {onEnterStore && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<IconArrowRight size={14} />}
                                  onClick={() => onEnterStore(org)}
                                >
                                  Kirish
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="col-12 col-lg-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tariflar Taqsimoti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="d-flex flex-column gap-3">
                    {(() => {
                      const dist = metrics?.plan_distribution || {};
                      const plans = ["start", "pro", "ultra"];
                      const total = Object.values(dist).reduce((a, b) => a + (b as number), 0) || 1;
                      return plans.map((plan) => {
                        const count = dist[plan] || (organizations.filter(o => o.plan.toLowerCase() === plan).length) || 0;
                        const pct = Math.round(((count as number) / total) * 100);
                        return (
                          <div key={plan}>
                            <div className="d-flex align-items-center justify-content-between small mb-1">
                              <span className="fw-semibold text-uppercase font-monospace text-primary">{plan}</span>
                              <span className="text-secondary font-monospace">{count} ta ({pct}%)</span>
                            </div>
                            <div
                              className="rounded-full overflow-hidden"
                              style={{ height: "6px", backgroundColor: "var(--border-subtle)" }}
                            >
                              <div
                                style={{
                                  width: `${Math.max(count > 0 ? 8 : 0, pct)}%`,
                                  height: "100%",
                                  backgroundColor: plan === "ultra" ? "#a855f7" : plan === "pro" ? "var(--accent)" : "var(--info)",
                                  borderRadius: "9999px",
                                }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: STORES */}
      {subTab === "stores" && (
        <Card>
          <CardHeader
            actions={
              <div className="d-flex align-items-center gap-2">
                <div style={{ minWidth: "220px" }}>
                  <input
                    type="text"
                    className="linear-input"
                    placeholder="Do'kon nomi yoki slug..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                  />
                </div>
                <Badge variant="accent">{filteredOrgs.length} ta do'kon</Badge>
              </div>
            }
          >
            <CardTitle>Barcha Do'konlar (Tenants Portfolio)</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th>Do'kon Nomi</th>
                  <th>Sohasi</th>
                  <th>Tarif</th>
                  <th>Obuna</th>
                  <th>Suhbatlar</th>
                  <th>Oylik Daromad</th>
                  <th>AI Xarajati</th>
                  <th>Marja</th>
                  <th className="text-end">Harakatlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                          style={{
                            width: "28px",
                            height: "28px",
                            backgroundColor: "var(--accent-subtle)",
                            color: "var(--accent-text)",
                          }}
                        >
                          <IconBuildingSkyscraper size={16} />
                        </div>
                        <div>
                          <div className="fw-semibold text-primary">{org.name}</div>
                          <div className="text-secondary small font-monospace" style={{ fontSize: "0.72rem" }}>
                            #{org.id} • {org.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-secondary small">{org.category || "Retail"}</td>
                    <td>
                      <Badge variant="accent">{org.plan.toUpperCase()}</Badge>
                    </td>
                    <td>
                      <Badge
                        variant={
                          org.subscription_status === "active"
                            ? "success"
                            : org.subscription_status === "trialing"
                            ? "info"
                            : "danger"
                        }
                      >
                        {org.subscription_status}
                      </Badge>
                    </td>
                    <td className="font-monospace text-secondary small">
                      {org.conversations_count ?? "—"} ta
                    </td>
                    <td className="font-monospace fw-bold" style={{ color: "var(--success)" }}>
                      ${org.monthly_revenue_usd}
                    </td>
                    <td className="font-monospace" style={{ color: "var(--warning)" }}>
                      ${org.monthly_ai_cost_usd}
                    </td>
                    <td className="font-monospace fw-semibold text-primary small">
                      {org.gross_margin_percent}%
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1.5">
                        {onEnterStore && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<IconArrowRight size={14} />}
                            onClick={() => onEnterStore(org)}
                            title="Do'kon ichiga kirish"
                          >
                            Kirish
                          </Button>
                        )}
                        {onUpdateStoreStatus && (
                          <button
                            type="button"
                            className="linear-btn linear-btn-secondary py-1 px-2"
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
                              <IconPlayerPause size={14} style={{ color: "var(--warning)" }} />
                            ) : (
                              <IconPlayerPlay size={14} style={{ color: "var(--success)" }} />
                            )}
                          </button>
                        )}
                        {onDeleteStore && org.id !== 1 && (
                          <button
                            type="button"
                            className="linear-btn linear-btn-danger py-1 px-2"
                            onClick={() => onDeleteStore(org.id)}
                            title="Do'konni o'chirish"
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
        </Card>
      )}

      {/* SUBTAB: USERS */}
      {subTab === "users" && (
        <Card>
          <CardHeader
            actions={
              <div style={{ minWidth: "220px" }}>
                <input
                  type="text"
                  className="linear-input"
                  placeholder="Email yoki ism bo'yicha qidirish..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            }
          >
            <CardTitle>Platforma Foydalanuvchilari</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="linear-table">
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
                      <div className="fw-semibold text-primary">{u.full_name || u.email}</div>
                      <div className="text-secondary small font-monospace" style={{ fontSize: "0.75rem" }}>
                        {u.email}
                      </div>
                    </td>
                    <td className="font-monospace text-secondary small">
                      {u.telegram_user_id ? String(u.telegram_user_id) : "—"}
                    </td>
                    <td>
                      {u.is_platform_owner ? (
                        <Badge variant="warning">Platform Owner</Badge>
                      ) : (
                        <Badge variant="default">User</Badge>
                      )}
                    </td>
                    <td>
                      <Badge variant={u.is_active ? "success" : "danger"}>
                        {u.is_active ? "Faol" : "Nofaol"}
                      </Badge>
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
        </Card>
      )}

      {/* SUBTAB: PLANS */}
      {subTab === "plans" && (
        <Card>
          <CardHeader actions={<Badge variant="warning">Dynamic Config</Badge>}>
            <CardTitle>Tariflar Narxi va Limitlarini Sozlash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="row g-3">
              {[
                { code: "start", name: "START", defaultM: 19, defaultY: 190, desc: "Kichik biznes uchun boshlang'ich tarif" },
                { code: "pro", name: "PRO", defaultM: 59, defaultY: 590, desc: "Eng ommabop tarif — jamoa va to'liq AI funksiyalari" },
                { code: "ultra", name: "ULTRA", defaultM: 149, defaultY: 1490, desc: "Katta korxonalar uchun cheksiz imkoniyatlar" },
              ].map((p) => (
                <div key={p.code} className="col-12 col-md-4">
                  <div className="linear-card p-3.5 h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fs-4 fw-bold font-monospace text-primary">{p.name}</span>
                        <Badge variant="accent">{p.code.toUpperCase()}</Badge>
                      </div>
                      <p className="text-secondary small mb-3">{p.desc}</p>
                      <div className="small text-secondary mb-3">
                        Oylik: <strong className="text-primary">${p.defaultM}/oy</strong> • Yillik: <strong className="text-primary">${p.defaultY}/yil</strong>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconPencil size={14} />}
                      onClick={() => {
                        setEditingPlanCode(p.code);
                        setNewMonthlyPrice(p.defaultM);
                        setNewYearlyPrice(p.defaultY);
                      }}
                    >
                      Narxni Tahrirlash
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB: USAGE */}
      {subTab === "usage" && (
        <Card>
          <CardHeader>
            <CardTitle>Platforma AI LLM Xarajatlari va Tokenlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="linear-card p-3.5">
                  <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "0.72rem" }}>
                    Jami Hisoblangan Xarajat
                  </div>
                  <div className="fs-1 fw-bold font-monospace mb-1" style={{ color: "var(--warning)" }}>
                    ${metrics?.total_ai_cost_usd?.toFixed(3) || "0.000"}
                  </div>
                  <p className="text-secondary small mb-0">
                    Oylik marja: <strong style={{ color: "var(--success)" }}>{metrics?.gross_margin_percent?.toFixed(1) || "100"}%</strong>
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="linear-card p-3.5">
                  <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "0.72rem" }}>
                    Jami AI Xabarlari
                  </div>
                  <div className="fs-1 fw-bold font-monospace mb-1 text-primary">
                    {metrics?.total_ai_messages_this_month?.toLocaleString() || "0"} ta
                  </div>
                  <p className="text-secondary small mb-0">
                    O'rtacha bitta xabar narxi: <strong className="font-monospace" style={{ color: "var(--info)" }}>~$0.0003</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB: SYSTEM */}
      {subTab === "system" && (
        <Card>
          <CardHeader>
            <CardTitle>Tizim va Xizmatlar Holati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="linear-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold text-primary">PostgreSQL & pgvector</span>
                    <Badge variant="success">Connected</Badge>
                  </div>
                  <div className="small text-secondary font-monospace" style={{ fontSize: "0.75rem" }}>
                    Holat: {systemHealth?.database || "healthy"}
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="linear-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold text-primary">Google Gemini API</span>
                    <Badge variant={systemHealth?.gemini_configured ? "success" : "danger"}>
                      {systemHealth?.gemini_configured ? "Sozlangan" : "Sozlanmagan"}
                    </Badge>
                  </div>
                  <div className="small text-secondary" style={{ fontSize: "0.75rem" }}>
                    Asosiy AI provayder (2.5 & 3.1)
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="linear-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold text-primary">Telegram Bot Service</span>
                    <Badge variant={systemHealth?.telegram_configured ? "success" : "warning"}>
                      {systemHealth?.telegram_configured ? "Faol" : "Kutilmoqda"}
                    </Badge>
                  </div>
                  <div className="small text-secondary" style={{ fontSize: "0.75rem" }}>
                    Muhit: {systemHealth?.app_env || "development"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB: AUDIT */}
      {subTab === "audit" && (
        <Card>
          <CardHeader actions={<Badge variant="default">{auditLogs.length} ta yozuv</Badge>}>
            <CardTitle>Xavfsizlik va Ma'muriy Audit Loglari</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="linear-table">
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
                      <Badge variant="accent">{log.action}</Badge>
                    </td>
                    <td className="text-primary small">
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
        </Card>
      )}

      {/* MODAL: EDIT PLAN */}
      {editingPlanCode && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1055 }}
        >
          <div className="linear-card p-4" style={{ width: "420px", maxWidth: "90vw" }}>
            <h5 className="fw-bold mb-3 text-primary">
              {editingPlanCode.toUpperCase()} Tarifi Narxlarini O'zgartirish
            </h5>
            <div className="d-flex flex-column gap-3 mb-4">
              <div>
                <label className="text-secondary small fw-medium mb-1 d-block">Oylik Narx ($USD)</label>
                <input
                  type="number"
                  className="linear-input"
                  value={newMonthlyPrice}
                  onChange={(e) => setNewMonthlyPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-secondary small fw-medium mb-1 d-block">Yillik Narx ($USD)</label>
                <input
                  type="number"
                  className="linear-input"
                  value={newYearlyPrice}
                  onChange={(e) => setNewYearlyPrice(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setEditingPlanCode(null)}>
                Bekor qilish
              </Button>
              <Button variant="primary" onClick={handleSavePlan} disabled={saveBusy}>
                {saveBusy ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW STORE */}
      {showCreateModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1055 }}
        >
          <div className="linear-card p-4" style={{ width: "640px", maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: "32px", height: "32px", backgroundColor: "var(--accent-subtle)", color: "var(--accent-text)" }}
                >
                  <IconBuildingSkyscraper size={18} />
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-primary">Yangi Do'kon Ochish</h5>
                  <span className="text-secondary small">Platforma doirasida yangi mustaqil savdo do'koni ochish</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              />
            </div>

            {createStoreSuccess ? (
              <div className="text-center py-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: "56px", height: "56px", backgroundColor: "var(--success-subtle)", color: "var(--success-text)" }}
                >
                  <IconCheck size={32} />
                </div>
                <h4 className="fw-bold mb-2 text-primary">Do'kon Muvaffaqiyatli Ochildi!</h4>
                <p className="text-secondary small mb-4">
                  <strong>{createStoreSuccess.organization?.name}</strong> do'koni tizimda yaratildi.
                </p>

                <div className="linear-card p-3 mb-4 text-start small">
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: "var(--border-subtle)" }}>
                    <span className="text-secondary">Do'kon ID & Slug:</span>
                    <span className="font-monospace text-primary fw-semibold">
                      #{createStoreSuccess.organization?.id} • {createStoreSuccess.organization?.slug}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: "var(--border-subtle)" }}>
                    <span className="text-secondary">Egasi Pochtasi:</span>
                    <span className="font-monospace text-primary">
                      {createStoreSuccess.organization?.owner_email}
                    </span>
                  </div>
                  {createStoreSuccess.organization?.temporary_password && (
                    <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: "var(--border-subtle)" }}>
                      <span className="text-secondary">Vaqtincha Parol:</span>
                      <span className="font-monospace fw-bold" style={{ color: "var(--warning)" }}>
                        {createStoreSuccess.organization?.temporary_password}
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-secondary">Tarif & Valyuta:</span>
                    <span className="font-monospace" style={{ color: "var(--info)" }}>
                      {createStoreSuccess.organization?.plan} ({createStoreSuccess.organization?.currency})
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-center gap-2">
                  <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Yopish
                  </Button>
                  {onEnterStore && createStoreSuccess.organization && (
                    <Button
                      variant="primary"
                      icon={<IconArrowRight size={14} />}
                      onClick={() => {
                        setShowCreateModal(false);
                        onEnterStore(createStoreSuccess.organization);
                      }}
                    >
                      Do'kon ichiga kirish
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="d-flex flex-column gap-3">
                {createStoreError && (
                  <div
                    className="p-2.5 rounded-2 d-flex align-items-center gap-2 small"
                    style={{ backgroundColor: "var(--danger-subtle)", color: "var(--danger-text)", border: "1px solid var(--danger-border)" }}
                  >
                    <IconAlertCircle size={16} />
                    <span>{createStoreError}</span>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="text-secondary small fw-medium mb-1 d-block">Do'kon Nomi *</label>
                    <input
                      type="text"
                      className="linear-input"
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
                  <div className="col-12 col-md-6">
                    <label className="text-secondary small fw-medium mb-1 d-block">Identifikator (Slug) *</label>
                    <input
                      type="text"
                      className="linear-input font-monospace"
                      placeholder="artel-store"
                      value={createStoreSlug}
                      onChange={(e) => setCreateStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      required
                    />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="text-secondary small fw-medium mb-1 d-block">Soha / Kategoriya</label>
                    <select
                      className="linear-input"
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
                  <div className="col-6 col-md-3">
                    <label className="text-secondary small fw-medium mb-1 d-block">Tarif</label>
                    <select
                      className="linear-input"
                      value={createStorePlan}
                      onChange={(e) => setCreateStorePlan(e.target.value)}
                    >
                      <option value="start">START</option>
                      <option value="pro">PRO (Tavsiya)</option>
                      <option value="ultra">ULTRA</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="text-secondary small fw-medium mb-1 d-block">Valyuta</label>
                    <select
                      className="linear-input"
                      value={createStoreCurrency}
                      onChange={(e) => setCreateStoreCurrency(e.target.value as "UZS" | "USD")}
                    >
                      <option value="UZS">UZS (so'm)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="text-secondary small fw-medium mb-1 d-block">Egasi Pochtasi (Email) *</label>
                    <input
                      type="email"
                      className="linear-input"
                      placeholder="owner@store.uz"
                      value={createStoreEmail}
                      onChange={(e) => setCreateStoreEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="text-secondary small fw-medium mb-1 d-block">Parol (ixtiyoriy)</label>
                    <input
                      type="password"
                      className="linear-input"
                      placeholder="Bo'sh qolsa avtomatik yaratiladi"
                      value={createStorePassword}
                      onChange={(e) => setCreateStorePassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-secondary small fw-medium mb-1 d-block">Telegram Bot Token (ixtiyoriy)</label>
                  <input
                    type="text"
                    className="linear-input font-monospace"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    value={createStoreBotToken}
                    onChange={(e) => setCreateStoreBotToken(e.target.value)}
                  />
                  <span className="text-tertiary small mt-1 d-block" style={{ fontSize: "0.72rem" }}>
                    @BotFather orqali olingan token. Keyinroq ham sozlamalardan ulash mumkin.
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-end gap-2 pt-3 border-top" style={{ borderColor: "var(--border-subtle)" }}>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createStoreBusy}
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={createStoreBusy}
                    icon={<IconPlus size={15} />}
                  >
                    {createStoreBusy ? "Do'kon ochilmoqda..." : "Do'konni Ochish"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
