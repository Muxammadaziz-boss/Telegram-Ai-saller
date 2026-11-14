"use client";

import React from "react";
import {
  IconMessageDots,
  IconRobot,
  IconHeadset,
  IconBooks,
  IconShoppingCart,
  IconArrowUpRight,
  IconRefresh,
  IconCircleCheck,
  IconCpu,
  IconBrandTelegram,
  IconActivity,
  IconClock,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../layout/PageHeader";

export interface OverviewTabProps {
  overview: {
    conversations: number;
    ai_active: number;
    human_takeover: number;
    knowledge_posts: number;
    orders: number;
  } | null;
  conversations: Array<{
    id: number;
    customer_name: string;
    username?: string | null;
    chat_id: number;
    status: string;
    handoff_reason?: string | null;
    last_message_at?: string | null;
  }>;
  orders: Array<{
    id: string;
    customer: string;
    username: string;
    product: string;
    amount: string;
    status: string;
    date: string;
    channel: string;
  }>;
  channels: Array<{
    id: number;
    channel_username: string;
    title?: string | null;
    is_active: boolean;
    posts_count: number;
  }>;
  aiModel?: string;
  onSelectConversation: (id: number) => void;
  onNavigateTab: (tabId: any, filter?: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function OverviewTab({
  overview,
  conversations,
  orders,
  channels,
  aiModel = "gemini-3.1-flash-lite",
  onSelectConversation,
  onNavigateTab,
  onRefresh,
  loading,
}: OverviewTabProps) {
  const totalConversations = overview?.conversations ?? conversations.length;
  const aiActiveCount = overview?.ai_active ?? conversations.filter((c) => c.status === "ai_active").length;
  const takeoverCount = overview?.human_takeover ?? conversations.filter((c) => c.status === "human_takeover").length;
  const totalPosts = overview?.knowledge_posts ?? (channels.reduce((acc, ch) => acc + (ch.posts_count || 0), 0));
  const totalOrders = overview?.orders ?? orders.length;

  const aiPercentage = totalConversations > 0 ? Math.round((aiActiveCount / totalConversations) * 100) : 0;
  const humanPercentage = totalConversations > 0 ? Math.round((takeoverCount / totalConversations) * 100) : 0;

  const formatTime = (ts?: string | null) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs="WORKSPACE / OVERVIEW"
        title="Boshqaruv Paneli"
        description="Jonli AI savdo assistenti, Telegram xabarlar oqimi va mijozlar holati"
        badge={{ text: "Real-time sync (6s)", variant: "success" }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            loading={loading}
            icon={<IconRefresh size={14} />}
          >
            Yangilash
          </Button>
        }
      />

      {/* 4 Linear KPI Metrics */}
      <div className="row g-3 mb-4">
        {/* Total Conversations */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="linear-card p-3 cursor-pointer transition-all h-100"
            onClick={() => onNavigateTab("inbox", "all")}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                Jami Suhbatlar
              </span>
              <Badge variant="accent">
                <IconMessageDots size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {totalConversations}
            </div>
            <div className="text-secondary small d-flex align-items-center justify-content-between">
              <span>Mijozlar bilan aloqa</span>
              <span className="text-primary fw-medium">100%</span>
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", backgroundColor: "var(--accent)" }} />
            </div>
          </div>
        </div>

        {/* AI Active */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="linear-card p-3 cursor-pointer transition-all h-100"
            onClick={() => onNavigateTab("inbox", "ai")}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                AI Boshqaruvida
              </span>
              <Badge variant="success">
                <IconRobot size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {aiActiveCount}
            </div>
            <div className="text-secondary small d-flex align-items-center justify-content-between">
              <span>Avtomatik javob</span>
              <span className="text-success fw-medium">{aiPercentage}%</span>
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${aiPercentage}%`, height: "100%", backgroundColor: "var(--success)" }} />
            </div>
          </div>
        </div>

        {/* Human Takeover */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="linear-card p-3 cursor-pointer transition-all h-100"
            onClick={() => onNavigateTab("inbox", "human")}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                Operator Qabulida
              </span>
              <Badge variant="warning">
                <IconHeadset size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {takeoverCount}
            </div>
            <div className="text-secondary small d-flex align-items-center justify-content-between">
              <span>Inson nazorati</span>
              <span className="text-warning fw-medium">{humanPercentage}%</span>
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${humanPercentage}%`, height: "100%", backgroundColor: "var(--warning)" }} />
            </div>
          </div>
        </div>

        {/* Knowledge Base Posts */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="linear-card p-3 cursor-pointer transition-all h-100"
            onClick={() => onNavigateTab("knowledge")}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                Telegram Postlar
              </span>
              <Badge variant="info">
                <IconBooks size={12} />
              </Badge>
            </div>
            <div className="display-6 fw-bold text-primary mb-1" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              {totalPosts}
            </div>
            <div className="text-secondary small d-flex align-items-center justify-content-between">
              <span>Faol kanallar</span>
              <span className="text-primary fw-medium">{channels.length} ta</span>
            </div>
            <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", backgroundColor: "var(--info)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Conversations & Sidebar Details */}
      <div className="row g-4">
        {/* Recent Conversations Stream */}
        <div className="col-12 col-lg-8">
          <Card>
            <CardHeader
              actions={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onNavigateTab("inbox")}
                  icon={<IconArrowUpRight size={13} />}
                >
                  Hammasini ko'rish
                </Button>
              }
            >
              <CardTitle>So'nggi Mijoz Yozishmalari</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversations.length === 0 ? (
                <EmptyState
                  icon={<IconMessageDots size={32} />}
                  title="Hozircha suhbatlar yo'q"
                  description="Telegram bot orqali mijozlar yozganda jonli xabarlar shu yerda aks etadi."
                />
              ) : (
                <div className="table-responsive">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th>Mijoz</th>
                        <th>Holati</th>
                        <th>Sabab / Izoh</th>
                        <th>Vaqti</th>
                        <th style={{ textAlign: "right" }}>Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.slice(0, 6).map((conv) => (
                        <tr key={conv.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  backgroundColor: "var(--accent-subtle)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {conv.customer_name ? conv.customer_name.charAt(0).toUpperCase() : "M"}
                              </div>
                              <div>
                                <div className="fw-medium text-primary" style={{ fontSize: "0.82rem" }}>
                                  {conv.customer_name}
                                </div>
                                <div className="text-secondary" style={{ fontSize: "0.7rem" }}>
                                  {conv.username ? `@${conv.username}` : `Chat ID: ${conv.chat_id}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {conv.status === "ai_active" ? (
                              <Badge variant="success" dot>
                                AI Faol
                              </Badge>
                            ) : (
                              <Badge variant="warning" dot>
                                Operator
                              </Badge>
                            )}
                          </td>
                          <td className="text-secondary small text-truncate" style={{ maxWidth: "200px" }}>
                            {conv.handoff_reason || "Mijoz maslahat so'radi"}
                          </td>
                          <td className="text-secondary small">
                            <span className="d-flex align-items-center gap-1">
                              <IconClock size={12} />
                              {formatTime(conv.last_message_at)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                onSelectConversation(conv.id);
                                onNavigateTab("inbox");
                              }}
                            >
                              Ochish
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Info: System Status & Recent Orders */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-3">
          {/* AI Engine Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>AI Dvigateli & Telegram</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex align-items-center justify-content-between p-2 rounded-2" style={{ backgroundColor: "var(--bg-surface-hover)" }}>
                  <div className="d-flex align-items-center gap-2">
                    <IconCpu size={16} style={{ color: "var(--accent)" }} />
                    <span className="small text-secondary">AI Model:</span>
                  </div>
                  <span className="small fw-medium text-primary font-monospace">{aiModel}</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2 rounded-2" style={{ backgroundColor: "var(--bg-surface-hover)" }}>
                  <div className="d-flex align-items-center gap-2">
                    <IconBrandTelegram size={16} style={{ color: "#229ed9" }} />
                    <span className="small text-secondary">Telegram Bot:</span>
                  </div>
                  <Badge variant="success" dot>Ulangan</Badge>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2 rounded-2" style={{ backgroundColor: "var(--bg-surface-hover)" }}>
                  <div className="d-flex align-items-center gap-2">
                    <IconActivity size={16} style={{ color: "var(--success)" }} />
                    <span className="small text-secondary">O'rtacha javob:</span>
                  </div>
                  <span className="small fw-medium text-primary">~1.2 soniya</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Overview */}
          <Card>
            <CardHeader
              actions={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onNavigateTab("orders")}
                  icon={<IconArrowUpRight size={13} />}
                >
                  Katalog
                </Button>
              }
            >
              <CardTitle>So'nggi Buyurtmalar ({totalOrders})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <div className="p-3 text-center text-secondary small">
                  Hozircha buyurtmalar mavjud emas
                </div>
              ) : (
                <div className="d-flex flex-column">
                  {orders.slice(0, 3).map((ord) => (
                    <div
                      key={ord.id}
                      className="d-flex align-items-center justify-content-between p-2.5 border-bottom border-subtle"
                    >
                      <div className="text-truncate me-2">
                        <div className="fw-medium text-primary small text-truncate">{ord.customer}</div>
                        <div className="text-secondary small text-truncate" style={{ fontSize: "0.72rem" }}>
                          {ord.product}
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="fw-bold text-success small">{ord.amount}</div>
                        <Badge
                          variant={
                            ord.status === "Confirmed" || ord.status === "Completed"
                              ? "success"
                              : ord.status === "Processing"
                              ? "info"
                              : "warning"
                          }
                        >
                          {ord.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
