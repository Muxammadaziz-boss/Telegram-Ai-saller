"use client";

import React, { useRef, useEffect } from "react";
import {
  IconSearch,
  IconRobot,
  IconHeadset,
  IconSend,
  IconCheck,
  IconPackage,
  IconSparkles,
  IconPencil,
  IconMessages,
  IconClock,
  IconUser,
} from "@tabler/icons-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PageHeader } from "../layout/PageHeader";

export interface ConversationItem {
  id: number;
  customer_name: string;
  username?: string | null;
  chat_id: number;
  status: string;
  handoff_reason?: string | null;
  last_message_at?: string | null;
}

export interface MessageItem {
  id: number;
  direction: string;
  text: string;
  created_at: string;
}

export interface InboxTabProps {
  conversations: ConversationItem[];
  selectedId: number | null;
  onSelectConversation: (id: number) => void;
  messages: MessageItem[];
  inboxFilter: "all" | "ai" | "human";
  setInboxFilter: (filter: "all" | "ai" | "human") => void;
  inboxSearch: string;
  setInboxSearch: (query: string) => void;
  draft: string;
  setDraft: (val: string) => void;
  onSendMessage: () => void;
  onTakeover: (id: number) => void;
  onResumeAi: (id: number) => void;
  busy: boolean;
  customerNotes: Record<number, string>;
  onSaveCustomerNote: (id: number, note: string) => void;
  onSendCatalogProposal: () => void;
  onSendDiscountProposal: () => void;
}

export function InboxTab({
  conversations,
  selectedId,
  onSelectConversation,
  messages,
  inboxFilter,
  setInboxFilter,
  inboxSearch,
  setInboxSearch,
  draft,
  setDraft,
  onSendMessage,
  onTakeover,
  onResumeAi,
  busy,
  customerNotes,
  onSaveCustomerNote,
  onSendCatalogProposal,
  onSendDiscountProposal,
}: InboxTabProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === selectedId) || conversations[0] || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    if (inboxFilter === "ai" && c.status !== "ai_active") return false;
    if (inboxFilter === "human" && c.status !== "human_takeover") return false;
    if (!inboxSearch.trim()) return true;
    const query = inboxSearch.toLowerCase();
    const nameMatch = c.customer_name?.toLowerCase().includes(query);
    const userMatch = c.username?.toLowerCase().includes(query);
    const idMatch = String(c.chat_id).includes(query);
    return nameMatch || userMatch || idMatch;
  });

  const formatChatTime = (ts?: string | null) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  const [currentNote, setCurrentNote] = React.useState(
    activeConversation ? customerNotes[activeConversation.id] || "" : ""
  );

  useEffect(() => {
    if (activeConversation) {
      setCurrentNote(customerNotes[activeConversation.id] || "");
    }
  }, [activeConversation?.id, customerNotes]);

  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        breadcrumbs="WORKSPACE / LIVE INBOX"
        title="Jonli Suhbatlar"
        description="Mijozlar bilan real vaqtda muloqot, AI assistent va operator boshqaruvi"
        badge={{
          text: `${conversations.filter((c) => c.status === "human_takeover").length} ta operator kutmoqda`,
          variant: conversations.some((c) => c.status === "human_takeover") ? "warning" : "success",
        }}
      />

      {/* 3-Panel Responsive Layout */}
      <div className="row g-3 flex-grow-1 align-items-stretch" style={{ minHeight: "640px" }}>
        {/* PANEL 1: Conversations List */}
        <div className="col-12 col-md-4 col-lg-3 d-flex flex-column">
          <div className="linear-card d-flex flex-column h-100 overflow-hidden">
            {/* Header / Search & Filter */}
            <div className="p-3 border-bottom border-subtle">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold text-primary small">
                  Suhbatlar ({filteredConversations.length})
                </span>
                <Badge variant="accent" dot>Jonli</Badge>
              </div>

              {/* Search */}
              <div className="position-relative mb-2">
                <IconSearch
                  size={14}
                  className="position-absolute start-0 ms-2.5 top-50 translate-middle-y text-secondary"
                />
                <input
                  type="text"
                  placeholder="Mijoz yoki @username..."
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  className="linear-input ps-5 py-1"
                  style={{ fontSize: "0.78rem" }}
                />
              </div>

              {/* Status Tabs */}
              <div className="d-flex gap-1 p-0.5 rounded-2" style={{ backgroundColor: "var(--bg-canvas)" }}>
                <button
                  type="button"
                  onClick={() => setInboxFilter("all")}
                  className={`btn btn-sm flex-fill border-0 py-1 transition-fast ${
                    inboxFilter === "all" ? "fw-medium" : "text-secondary"
                  }`}
                  style={{
                    backgroundColor: inboxFilter === "all" ? "var(--bg-surface-elevated)" : "transparent",
                    color: inboxFilter === "all" ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                  }}
                >
                  Barchasi ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxFilter("ai")}
                  className={`btn btn-sm flex-fill border-0 py-1 transition-fast ${
                    inboxFilter === "ai" ? "fw-medium" : "text-secondary"
                  }`}
                  style={{
                    backgroundColor: inboxFilter === "ai" ? "var(--bg-surface-elevated)" : "transparent",
                    color: inboxFilter === "ai" ? "var(--success-text)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                  }}
                >
                  AI ({conversations.filter((c) => c.status === "ai_active").length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxFilter("human")}
                  className={`btn btn-sm flex-fill border-0 py-1 transition-fast ${
                    inboxFilter === "human" ? "fw-medium" : "text-secondary"
                  }`}
                  style={{
                    backgroundColor: inboxFilter === "human" ? "var(--bg-surface-elevated)" : "transparent",
                    color: inboxFilter === "human" ? "var(--warning-text)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                  }}
                >
                  Operator ({conversations.filter((c) => c.status === "human_takeover").length})
                </button>
              </div>
            </div>

            {/* Conversation List Scroll Area */}
            <div className="flex-grow-1 overflow-y-auto custom-scrollbar p-1">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-secondary small">
                  Suhbat topilmadi
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = activeConversation?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`p-2.5 mb-1 rounded-2 cursor-pointer transition-fast border ${
                        isSelected ? "border-accent" : "border-transparent"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "var(--bg-surface-hover)" : "transparent",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-medium text-primary text-truncate small" style={{ maxWidth: "120px" }}>
                          {c.customer_name}
                        </span>
                        <span className="text-secondary" style={{ fontSize: "0.68rem" }}>
                          {formatChatTime(c.last_message_at)}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-secondary small text-truncate" style={{ maxWidth: "110px", fontSize: "0.7rem" }}>
                          {c.username ? `@${c.username}` : `ID: ${c.chat_id}`}
                        </span>
                        {c.status === "ai_active" ? (
                          <Badge variant="success">AI</Badge>
                        ) : (
                          <Badge variant="warning">Operator</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2: Active Chat Interface */}
        <div className="col-12 col-md-8 col-lg-6 d-flex flex-column">
          {activeConversation ? (
            <div className="linear-card d-flex flex-column h-100 overflow-hidden">
              {/* Chat Header */}
              <div className="d-flex align-items-center justify-content-between px-3 py-2.5 border-bottom border-subtle">
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold"
                    style={{
                      width: "34px",
                      height: "34px",
                      backgroundColor: "var(--accent-subtle)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {activeConversation.customer_name ? activeConversation.customer_name.charAt(0).toUpperCase() : "M"}
                  </div>
                  <div>
                    <div className="fw-semibold text-primary small lh-1">
                      {activeConversation.customer_name}
                    </div>
                    <div className="text-secondary mt-1" style={{ fontSize: "0.7rem" }}>
                      {activeConversation.username ? `@${activeConversation.username}` : `Chat ID: ${activeConversation.chat_id}`}
                    </div>
                  </div>
                </div>

                {/* Takeover / Resume Controls */}
                <div>
                  {activeConversation.status === "ai_active" ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onTakeover(activeConversation.id)}
                      disabled={busy}
                      icon={<IconHeadset size={14} style={{ color: "var(--warning)" }} />}
                    >
                      Takeover (O'zim javob beraman)
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onResumeAi(activeConversation.id)}
                      disabled={busy}
                      icon={<IconRobot size={14} style={{ color: "var(--success)" }} />}
                    >
                      Resume AI (AI ga qaytarish)
                    </Button>
                  )}
                </div>
              </div>

              {/* Message Thread Scroll View */}
              <div
                ref={chatScrollRef}
                className="flex-grow-1 p-3 overflow-y-auto custom-scrollbar d-flex flex-column gap-2.5"
                style={{ backgroundColor: "var(--bg-canvas)", maxHeight: "460px" }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-secondary py-5 my-auto">
                    <IconMessages size={32} className="mb-2 opacity-50" />
                    <div className="small">Ushbu suhbatda hali xabarlar yo'q</div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOutgoing = m.direction === "assistant" || m.direction === "admin" || m.direction === "outgoing";
                    const isAdmin = m.direction === "admin";

                    return (
                      <div
                        key={m.id}
                        className={`d-flex ${isOutgoing ? "justify-content-end" : "justify-content-start"}`}
                      >
                        <div
                          className="p-2.5 rounded-3 position-relative"
                          style={{
                            maxWidth: "78%",
                            backgroundColor: isOutgoing
                              ? isAdmin
                                ? "var(--bg-surface-elevated)"
                                : "var(--accent)"
                              : "var(--bg-surface-elevated)",
                            border: `1px solid ${isOutgoing && !isAdmin ? "var(--accent-hover)" : "var(--border-default)"}`,
                            color: isOutgoing && !isAdmin ? "#ffffff" : "var(--text-primary)",
                          }}
                        >
                          {/* Sender Label */}
                          {isOutgoing && (
                            <div
                              className="d-flex align-items-center gap-1 mb-1 font-monospace"
                              style={{
                                fontSize: "0.65rem",
                                color: isAdmin ? "var(--warning-text)" : "rgba(255, 255, 255, 0.8)",
                              }}
                            >
                              {isAdmin ? <IconHeadset size={11} /> : <IconRobot size={11} />}
                              <span>{isAdmin ? "Operator" : "AI Assistent"}</span>
                            </div>
                          )}

                          {/* Message Text */}
                          <div style={{ fontSize: "0.86rem", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                            {m.text}
                          </div>

                          {/* Timestamp */}
                          <div
                            className="text-end mt-1 font-monospace"
                            style={{
                              fontSize: "0.65rem",
                              color: isOutgoing && !isAdmin ? "rgba(255, 255, 255, 0.7)" : "var(--text-tertiary)",
                            }}
                          >
                            {formatChatTime(m.created_at)}
                            {isOutgoing && <span className="ms-1">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-2.5 border-top border-subtle" style={{ backgroundColor: "var(--bg-surface)" }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim() && !busy) {
                      onSendMessage();
                    }
                  }}
                  className="d-flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Mijozga operator sifatida javob yozing..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={busy}
                    className="linear-input flex-grow-1"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={busy || !draft.trim()}
                    icon={<IconSend size={15} />}
                  >
                    Yuborish
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="linear-card d-flex align-items-center justify-content-center h-100 p-5 text-secondary">
              Chap tarafdan birorta suhbatni tanlang
            </div>
          )}
        </div>

        {/* PANEL 3: Customer Details, Internal Notes & Fast Proposals */}
        <div className="col-12 col-lg-3 d-flex flex-column">
          {activeConversation ? (
            <div className="linear-card d-flex flex-column h-100 p-3 overflow-y-auto custom-scrollbar">
              {/* Customer Avatar & Bio */}
              <div className="text-center pb-3 border-bottom border-subtle mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold mx-auto mb-2"
                  style={{
                    width: "52px",
                    height: "52px",
                    backgroundColor: "var(--accent-subtle)",
                    fontSize: "1.2rem",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  {activeConversation.customer_name ? activeConversation.customer_name.charAt(0).toUpperCase() : "M"}
                </div>
                <div className="fw-bold text-primary" style={{ fontSize: "0.95rem" }}>
                  {activeConversation.customer_name}
                </div>
                <div className="text-secondary small">
                  {activeConversation.username ? `@${activeConversation.username}` : `Chat ID: ${activeConversation.chat_id}`}
                </div>
              </div>

              {/* Quick Info Items */}
              <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom border-subtle">
                <div className="d-flex align-items-center justify-content-between small">
                  <span className="text-secondary">Telegram Chat ID:</span>
                  <span className="text-primary font-monospace">{activeConversation.chat_id}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between small">
                  <span className="text-secondary">Holati:</span>
                  <Badge variant={activeConversation.status === "ai_active" ? "success" : "warning"}>
                    {activeConversation.status === "ai_active" ? "AI Boshqaruvida" : "Operator Nazorati"}
                  </Badge>
                </div>
                <div className="d-flex align-items-center justify-content-between small">
                  <span className="text-secondary">Xabarlar soni:</span>
                  <span className="text-primary fw-medium">{messages.length}</span>
                </div>
              </div>

              {/* 1. Internal Notes */}
              <div className="mb-3 pb-3 border-bottom border-subtle">
                <div className="d-flex align-items-center justify-content-between mb-1.5">
                  <span className="text-uppercase fw-semibold text-secondary" style={{ fontSize: "0.68rem" }}>
                    Operator Eslatmasi
                  </span>
                  {customerNotes[activeConversation.id] && (
                    <Badge variant="success">Saqlangan</Badge>
                  )}
                </div>
                <textarea
                  className="linear-input mb-2"
                  rows={3}
                  placeholder="Mijoz haqida ichki qayd (qidirayotgan model, kelishuv)..."
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  style={{ fontSize: "0.78rem" }}
                />
                <Button
                  variant="secondary"
                  size="xs"
                  className="w-100"
                  onClick={() => onSaveCustomerNote(activeConversation.id, currentNote)}
                  icon={<IconPencil size={13} />}
                >
                  Eslatmani saqlash
                </Button>
              </div>

              {/* 2. Fast Proposals */}
              <div>
                <span className="text-uppercase fw-semibold text-secondary d-block mb-2" style={{ fontSize: "0.68rem" }}>
                  Tezkor Takliflar (Chatga)
                </span>
                <div className="d-flex flex-column gap-2">
                  <button
                    type="button"
                    onClick={onSendCatalogProposal}
                    className="p-2 rounded-2 text-start border transition-fast d-flex align-items-center gap-2 cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <IconPackage size={16} style={{ color: "var(--accent)" }} />
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="text-primary small fw-medium text-truncate">Katalog yuborish</div>
                      <div className="text-secondary" style={{ fontSize: "0.68rem" }}>Ommabop mahsulotlar ro'yxati</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onSendDiscountProposal}
                    className="p-2 rounded-2 text-start border transition-fast d-flex align-items-center gap-2 cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <IconSparkles size={16} style={{ color: "var(--success)" }} />
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="text-primary small fw-medium text-truncate">5% chegirma taklifi</div>
                      <div className="text-secondary" style={{ fontSize: "0.68rem" }}>Maxsus chegirma xabari</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
