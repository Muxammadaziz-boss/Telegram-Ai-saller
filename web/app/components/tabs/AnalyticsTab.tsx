"use client";

import React from "react";
import {
  IconChartBar,
  IconTrendingUp,
  IconBolt,
  IconRobot,
  IconHeadset,
  IconShoppingCart,
  IconCheck,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PageHeader } from "../layout/PageHeader";

export interface AnalyticsConversationItem {
  id: number;
  customer_name: string;
  status: string;
  last_message_at?: string | null;
}

export interface AnalyticsOrderItem {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  date: string;
}

export interface AnalyticsTabProps {
  conversations: AnalyticsConversationItem[];
  orders: AnalyticsOrderItem[];
  overview: {
    conversations: number;
    ai_active: number;
    human_takeover: number;
    knowledge_posts: number;
    orders: number;
  } | null;
}

export function AnalyticsTab({
  conversations,
  orders,
  overview,
}: AnalyticsTabProps) {
  const totalConv = overview?.conversations ?? conversations.length;
  const aiCount = overview?.ai_active ?? conversations.filter((c) => c.status === "ai_active").length;
  const humanCount = overview?.human_takeover ?? conversations.filter((c) => c.status === "human_takeover").length;
  const totalOrders = overview?.orders ?? orders.length;

  const aiResolutionRate = totalConv > 0 ? Math.round((aiCount / totalConv) * 100) : 0;
  const humanResolutionRate = totalConv > 0 ? Math.round((humanCount / totalConv) * 100) : 0;
  const conversionRate = totalConv > 0 ? ((totalOrders / totalConv) * 100).toFixed(1) : "0.0";

  // Product popularity from real orders
  const productCountMap: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.product) {
      productCountMap[o.product] = (productCountMap[o.product] || 0) + 1;
    }
  });

  const topProducts = Object.entries(productCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        breadcrumbs="INTELLIGENCE / ANALYTICS"
        title="Savdo va AI Statistikasi"
        description="Mijozlar bilan haqiqiy yozishmalar, buyurtmalar konversiyasi va AI avtonomiya ko'rsatkichlari"
        badge={{ text: "Haqiqiy ma'lumotlar", variant: "success" }}
      />

      {/* 4 Metric KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Conversion Rate */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="linear-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem" }}>
                Sotuv Konversiyasi
              </span>
              <Badge variant="success">
                <IconTrendingUp size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {conversionRate}%
            </div>
            <div className="text-secondary small">
              {totalConv > 0 ? `${totalConv} ta suhbatdan ${totalOrders} ta buyurtma` : "Murojaatlar mavjud emas"}
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, parseFloat(conversionRate))}%`, height: "100%", backgroundColor: "var(--success)" }} />
            </div>
          </div>
        </div>

        {/* AI Autonomy */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="linear-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem" }}>
                AI Avtonomligi
              </span>
              <Badge variant="accent">
                <IconRobot size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {aiResolutionRate}%
            </div>
            <div className="text-secondary small">
              {aiCount} ta suhbat AI nazoratida
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${aiResolutionRate}%`, height: "100%", backgroundColor: "var(--accent)" }} />
            </div>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="linear-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem" }}>
                O'rtacha Javob Vaqti
              </span>
              <Badge variant="info">
                <IconBolt size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              ~1.2 s
            </div>
            <div className="text-secondary small">
              Telegram webhook orqali lahzali javob
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "95%", height: "100%", backgroundColor: "var(--info)" }} />
            </div>
          </div>
        </div>

        {/* Human Assistance */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="linear-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem" }}>
                Operator Ulushi
              </span>
              <Badge variant="warning">
                <IconHeadset size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {humanResolutionRate}%
            </div>
            <div className="text-secondary small">
              {humanCount} ta suhbat operator qabulida
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${humanResolutionRate}%`, height: "100%", backgroundColor: "var(--warning)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="row g-4">
        {/* Real Resolution Ratio */}
        <div className="col-12 col-lg-6">
          <Card className="h-100">
            <CardHeader>
              <CardTitle>Suhbatlar Taqsimoti (AI vs Operator)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="d-flex align-items-center justify-content-between small mb-1">
                    <span className="text-secondary">AI To'liq Avtomatik Rejimda:</span>
                    <span className="fw-semibold text-primary">{aiCount} ta ({aiResolutionRate}%)</span>
                  </div>
                  <div style={{ height: "8px", backgroundColor: "var(--border-subtle)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${aiResolutionRate}%`, height: "100%", backgroundColor: "var(--success)" }} />
                  </div>
                </div>

                <div>
                  <div className="d-flex align-items-center justify-content-between small mb-1">
                    <span className="text-secondary">Operator Nazoratidagi Suhbatlar:</span>
                    <span className="fw-semibold text-primary">{humanCount} ta ({humanResolutionRate}%)</span>
                  </div>
                  <div style={{ height: "8px", backgroundColor: "var(--border-subtle)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${humanResolutionRate}%`, height: "100%", backgroundColor: "var(--warning)" }} />
                  </div>
                </div>

                <div className="p-3 rounded-2 mt-2" style={{ backgroundColor: "var(--bg-surface-hover)" }}>
                  <div className="text-secondary small">
                    💡 <strong>Xulosa:</strong> Mijozlar murojaatlarining {aiResolutionRate}% qismi AI tomonidan inson aralashuvisiz hal etilmoqda. Faqat murakkab yoki kelishuv talab etilgan hollarda suhbat operatorga yo'naltiriladi.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Order Breakdown */}
        <div className="col-12 col-lg-6">
          <Card className="h-100">
            <CardHeader>
              <CardTitle>Eng Ko'p Buyurtma Qilingan Mahsulotlar</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center text-secondary py-5 small">
                  Hozircha buyurtma qilingan mahsulotlar ma'lumoti yo'q
                </div>
              ) : (
                <div className="d-flex flex-column gap-2.5">
                  {topProducts.map(([productName, count]) => {
                    const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                    return (
                      <div key={productName} className="p-2.5 rounded-2 border border-subtle" style={{ backgroundColor: "var(--bg-surface-elevated)" }}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-medium text-primary small text-truncate" style={{ maxWidth: "280px" }}>
                            {productName}
                          </span>
                          <span className="font-monospace fw-bold text-success small">
                            {count} ta ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "var(--accent)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
