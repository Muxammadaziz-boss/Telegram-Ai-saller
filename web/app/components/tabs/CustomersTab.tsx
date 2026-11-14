"use client";

import React, { useState } from "react";
import {
  IconUsers,
  IconSearch,
  IconMessageDots,
  IconClock,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PageHeader } from "../layout/PageHeader";

export interface CustomerConversationItem {
  id: number;
  customer_name: string;
  username?: string | null;
  chat_id: number;
  status: string;
  last_message_at?: string | null;
}

export interface CustomersTabProps {
  conversations: CustomerConversationItem[];
  onSelectConversation: (id: number) => void;
  onNavigateInbox: () => void;
}

export function CustomersTab({
  conversations,
  onSelectConversation,
  onNavigateInbox,
}: CustomersTabProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      String(c.chat_id).includes(q)
    );
  });

  const formatTime = (ts?: string | null) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs="SALES / CUSTOMERS DIRECTORY"
        title="Mijozlar Katalogi"
        description="Telegram bot bilan muloqot qilgan barcha mijozlar va ularning faollik tarixi"
        badge={{ text: `${conversations.length} ta mijoz`, variant: "accent" }}
      />

      <Card>
        <CardHeader
          actions={
            <div className="position-relative" style={{ width: "220px" }}>
              <IconSearch
                size={14}
                className="position-absolute start-0 ms-2.5 top-50 translate-middle-y text-secondary"
              />
              <input
                type="text"
                placeholder="Mijoz yoki username izlash..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="linear-input ps-5 py-1"
                style={{ fontSize: "0.78rem" }}
              />
            </div>
          }
        >
          <CardTitle>Mijozlar Ro'yxati ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th>Mijoz Nomi</th>
                  <th>Username</th>
                  <th>Chat ID</th>
                  <th>Holati</th>
                  <th>Oxirgi Muloqot</th>
                  <th style={{ textAlign: "right" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-5 small">
                      Mijozlar ma'lumotlari topilmadi
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold"
                            style={{
                              width: "30px",
                              height: "30px",
                              backgroundColor: "var(--accent-subtle)",
                              fontSize: "0.8rem",
                            }}
                          >
                            {c.customer_name ? c.customer_name.charAt(0).toUpperCase() : "M"}
                          </div>
                          <span className="fw-medium text-primary small">{c.customer_name}</span>
                        </div>
                      </td>
                      <td className="text-secondary small">
                        {c.username ? `@${c.username}` : "—"}
                      </td>
                      <td className="font-monospace text-secondary small">
                        {c.chat_id}
                      </td>
                      <td>
                        {c.status === "ai_active" ? (
                          <Badge variant="success" dot>AI Boshqaruvida</Badge>
                        ) : (
                          <Badge variant="warning" dot>Operator Qabulida</Badge>
                        )}
                      </td>
                      <td className="text-secondary small">
                        <span className="d-flex align-items-center gap-1">
                          <IconClock size={12} />
                          {formatTime(c.last_message_at)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            onSelectConversation(c.id);
                            onNavigateInbox();
                          }}
                          icon={<IconMessageDots size={13} />}
                        >
                          Chatga o'tish
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
