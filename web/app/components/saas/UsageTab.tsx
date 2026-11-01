"use client";

import React from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowUpRight,
  IconBolt,
  IconChartBar,
  IconCheck,
  IconCoin,
  IconCpu,
  IconGauge,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";

interface UsageMetricItem {
  metric: string;
  name: string;
  description: string;
  unit: string;
  is_monthly: boolean;
  used: number;
  limit: number;
  percentage: number;
  raw_percentage: number;
  status: "normal" | "warning" | "critical" | "exceeded";
}

interface UsageDashboardData {
  organization_id: number;
  period: string;
  plan_code: string;
  items: UsageMetricItem[];
  tokens?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

interface UsageTabProps {
  usageData: UsageDashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  onUpgradeClick: () => void;
}

export function UsageTab({ usageData, loading, onRefresh, onUpgradeClick }: UsageTabProps) {
  if (!usageData && loading) {
    return (
      <div className="card p-5 text-center">
        <div className="spinner-border text-primary mx-auto mb-3" role="status" />
        <p className="text-secondary mb-0">Foydalanish ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const items = usageData?.items || [];
  const planName = (usageData?.plan_code || "start").toUpperCase();

  // Color mapping based on limit status
  const getProgressColor = (status: string) => {
    switch (status) {
      case "exceeded":
        return "bg-danger";
      case "critical":
        return "bg-danger";
      case "warning":
        return "bg-warning";
      default:
        return "bg-success";
    }
  };

  const getStatusBadge = (status: string, rawPct: number) => {
    switch (status) {
      case "exceeded":
        return (
          <span className="badge bg-danger-lt text-danger fw-bold d-inline-flex align-items-center gap-1">
            <IconAlertCircle size={13} /> Cheklovga yetdi ({rawPct}%)
          </span>
        );
      case "critical":
        return (
          <span className="badge bg-danger-lt text-danger fw-bold d-inline-flex align-items-center gap-1">
            <IconAlertTriangle size={13} /> Kritik ({rawPct}%)
          </span>
        );
      case "warning":
        return (
          <span className="badge bg-warning-lt text-warning fw-bold d-inline-flex align-items-center gap-1">
            <IconAlertTriangle size={13} /> Ogohlantirish ({rawPct}%)
          </span>
        );
      default:
        return (
          <span className="badge bg-green-lt text-green fw-bold d-inline-flex align-items-center gap-1">
            <IconCheck size={13} /> Normal ({rawPct}%)
          </span>
        );
    }
  };

  const hasExceededOrCritical = items.some(
    (item) => item.status === "exceeded" || item.status === "critical"
  );

  return (
    <div className="space-y-4">
      {/* Top Warning Alert Banner if any limit >= 90% */}
      {hasExceededOrCritical && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm"
          role="alert"
          style={{ background: "rgba(220, 38, 38, 0.12)", border: "1px solid rgba(220, 38, 38, 0.35)" }}
        >
          <div className="d-flex align-items-center gap-3">
            <IconAlertCircle size={26} className="text-danger flex-shrink-0" />
            <div>
              <h4 className="alert-title text-danger mb-0.5 fw-bold">Oylik Limitga Yetildi yoki Tugash Arafasida!</h4>
              <div className="text-white small">
                Ba'zi resurslaringiz belgilangan tarif rejasining 90% yoki 100% ga yetdi. Xizmat to'xtab qolmasligi uchun tarifni oshiring.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-2 flex-shrink-0"
            onClick={onUpgradeClick}
          >
            <IconSparkles size={15} />
            <span>Tarifni Oshirish (Upgrade)</span>
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 bg-body-tertiary p-3 rounded-3 border border-secondary border-opacity-10">
        <div className="d-flex align-items-center gap-2.5">
          <div className="p-2 bg-primary-lt rounded-2">
            <IconGauge size={22} className="text-primary" />
          </div>
          <div>
            <h3 className="card-title mb-0 fw-bold">Resurslardan Foydalanish va Oylik Limitlar</h3>
            <p className="text-secondary small mb-0">
              Faol tarif: <span className="badge bg-primary text-white fw-bold">{planName}</span> • Hisob davri: {usageData?.period || "Joriy oy"}
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
            <span>Yangilash</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5"
            onClick={onUpgradeClick}
          >
            <IconArrowUpRight size={15} />
            <span>Tarifni Kengaytirish</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="row g-3">
        {items.map((item) => (
          <div key={item.metric} className="col-md-6 col-lg-4">
            <div
              className={`card h-100 shadow-sm border ${
                item.status === "exceeded"
                  ? "border-danger"
                  : item.status === "critical"
                  ? "border-danger"
                  : item.status === "warning"
                  ? "border-warning"
                  : "border-secondary border-opacity-15"
              }`}
              style={{
                background:
                  item.status === "exceeded"
                    ? "rgba(220, 38, 38, 0.05)"
                    : item.status === "warning"
                    ? "rgba(245, 159, 0, 0.04)"
                    : "inherit",
              }}
            >
              <div className="card-body p-3.5 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold text-white fs-4">{item.name}</span>
                    {getStatusBadge(item.status, item.raw_percentage)}
                  </div>
                  <p className="text-secondary small mb-3" style={{ minHeight: "36px", fontSize: "0.78rem" }}>
                    {item.description}
                  </p>
                </div>

                <div>
                  <div className="d-flex align-items-baseline justify-content-between mb-1.5">
                    <div className="fs-2 fw-bold text-white">
                      {item.used.toLocaleString()}{" "}
                      <span className="text-secondary small fs-5 fw-normal">
                        / {item.limit.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <span className="small text-secondary fw-medium">{item.raw_percentage}%</span>
                  </div>

                  <div className="progress progress-sm rounded-pill mb-2 bg-dark">
                    <div
                      className={`progress-bar ${getProgressColor(item.status)} rounded-pill`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>

                  {item.status === "exceeded" ? (
                    <div className="d-flex align-items-center justify-content-between pt-1">
                      <span className="text-danger small fw-medium" style={{ fontSize: "0.75rem" }}>
                        Limit tugagan
                      </span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0 text-decoration-none fw-bold"
                        onClick={onUpgradeClick}
                      >
                        Oshirish →
                      </button>
                    </div>
                  ) : item.status === "warning" || item.status === "critical" ? (
                    <span className="text-warning small" style={{ fontSize: "0.75rem" }}>
                      Limit yaqinlashmoqda
                    </span>
                  ) : (
                    <span className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                      Qolgan: {(Math.max(0, item.limit - item.used)).toLocaleString()} {item.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Token and Cost Consumption Panel */}
      {usageData?.tokens && (
        <div className="card shadow-sm border border-secondary border-opacity-15 mt-3">
          <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between">
            <h3 className="card-title d-flex align-items-center gap-2 mb-0">
              <IconCpu size={18} className="text-info" />
              <span>AI Token Sarfi va Hisoblangan Xarajatlar (LLM Compute)</span>
            </h3>
            <span className="badge bg-blue-lt text-blue font-monospace">Gemini AI Models</span>
          </div>
          <div className="card-body p-3">
            <div className="row g-3 text-center">
              <div className="col-6 col-md-3">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                  <div className="text-secondary small mb-1">Kirish Tokenlari (Prompt)</div>
                  <div className="fs-3 fw-bold text-white font-monospace">
                    {usageData.tokens.input_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                  <div className="text-secondary small mb-1">Chiqish Tokenlari (Reply)</div>
                  <div className="fs-3 fw-bold text-white font-monospace">
                    {usageData.tokens.output_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                  <div className="text-secondary small mb-1">Jami Tokenlar</div>
                  <div className="fs-3 fw-bold text-info font-monospace">
                    {usageData.tokens.total_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded bg-body-tertiary border border-secondary border-opacity-10">
                  <div className="text-secondary small mb-1">Hisoblangan AI Xarajati</div>
                  <div className="fs-3 fw-bold text-success font-monospace">
                    ${usageData.tokens.estimated_cost_usd.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-secondary small mt-3 mb-0" style={{ fontSize: "0.78rem" }}>
              💡 Tokenlar avtomatik ravishda mijozlarning Telegram savollariga javob berish va katalog qidiruvida (RAG) hisoblanadi. Sizning tarifingizga qarab ushbu xarajatlar obuna summasi ichiga to'liq kiritilgan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
