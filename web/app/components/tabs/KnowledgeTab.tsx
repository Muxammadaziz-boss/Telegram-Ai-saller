"use client";

import React from "react";
import {
  IconBooks,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconExternalLink,
  IconSparkles,
  IconBrandTelegram,
  IconFilter,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PageHeader } from "../layout/PageHeader";

export interface ConnectedChannelItem {
  id: number;
  channel_username: string;
  title?: string | null;
  is_active: boolean;
  posts_count: number;
  last_synced_at?: string | null;
}

export interface KnowledgePostItem {
  id: number;
  channel_username: string;
  telegram_message_id: number;
  text: string;
  image_description: string;
  source_url?: string | null;
}

export interface KnowledgeTabProps {
  channels: ConnectedChannelItem[];
  posts: KnowledgePostItem[];
  channelFilter: string;
  setChannelFilter: (val: string) => void;
  newChannelInput: string;
  setNewChannelInput: (val: string) => void;
  onConnectChannel: (e: React.FormEvent) => void;
  onSyncChannel: (username?: string) => void;
  onDeleteChannel: (username: string) => void;
  onDeletePost: (id: number, messageId: number) => void;
  onExtractProducts: () => void;
  busy: boolean;
}

export function KnowledgeTab({
  channels,
  posts,
  channelFilter,
  setChannelFilter,
  newChannelInput,
  setNewChannelInput,
  onConnectChannel,
  onSyncChannel,
  onDeleteChannel,
  onDeletePost,
  onExtractProducts,
  busy,
}: KnowledgeTabProps) {
  const filteredPosts = posts.filter(
    (p) => channelFilter === "all" || p.channel_username === channelFilter
  );

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
        breadcrumbs="WORKSPACE / KNOWLEDGE BASE"
        title="Telegram Mahsulotlar Bazasi"
        description="Telegram kanallardagi postlar, matnlar va rasmlar (Vision) orqali AI bilim bazasini boshqarish"
        badge={{ text: `${channels.length} ta faol kanal`, variant: "accent" }}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExtractProducts}
              disabled={busy || posts.length === 0}
              icon={<IconSparkles size={14} style={{ color: "var(--accent)" }} />}
            >
              Mahsulotlarni aniqlash
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSyncChannel()}
              disabled={busy || channels.length === 0}
              loading={busy}
              icon={<IconRefresh size={14} />}
            >
              Barcha kanallarni sinxronlash
            </Button>
          </div>
        }
      />

      {/* Connected Channels Management Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ulangan Telegram Kanallar ({channels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Channel Form */}
          <form onSubmit={onConnectChannel} className="d-flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Telegram kanal username yoki havolasi (@kanal_nomi yoki https://t.me/kanal_nomi)..."
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              disabled={busy}
              className="linear-input flex-grow-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !newChannelInput.trim()}
              icon={<IconPlus size={15} />}
            >
              Kanal ulash
            </Button>
          </form>

          {/* Channels Table */}
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th>Telegram Kanal</th>
                  <th>Holati</th>
                  <th>Postlar soni</th>
                  <th>Oxirgi sinxron</th>
                  <th style={{ textAlign: "right" }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-4 small">
                      Hozircha hech qanday Telegram kanal ulanmagan. Yuqoridagi maydondan kanal havolasini kiriting.
                    </td>
                  </tr>
                ) : (
                  channels.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <IconBrandTelegram size={16} style={{ color: "#229ed9" }} />
                          <span className="font-monospace fw-semibold text-primary">@{ch.channel_username}</span>
                          <a
                            href={`https://t.me/${ch.channel_username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-secondary small d-flex align-items-center gap-0.5"
                          >
                            <IconExternalLink size={12} /> ochish
                          </a>
                        </div>
                      </td>
                      <td>
                        <Badge variant="success" dot>Faol</Badge>
                      </td>
                      <td className="fw-medium text-primary">
                        {ch.posts_count} ta post
                      </td>
                      <td className="text-secondary small">
                        {formatTime(ch.last_synced_at)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => onSyncChannel(ch.channel_username)}
                            disabled={busy}
                            icon={<IconRefresh size={13} />}
                          >
                            Sinxron
                          </Button>
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => onDeleteChannel(ch.channel_username)}
                            disabled={busy}
                            icon={<IconTrash size={13} />}
                          >
                            O'chirish
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Posts List & Filters */}
      <Card>
        <CardHeader
          actions={
            channels.length > 1 && (
              <div className="d-flex align-items-center gap-1.5">
                <IconFilter size={14} className="text-secondary" />
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="linear-input py-1"
                  style={{ width: "auto", fontSize: "0.78rem" }}
                >
                  <option value="all">Barcha kanallar ({posts.length})</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.channel_username}>
                      @{ch.channel_username} ({posts.filter((p) => p.channel_username === ch.channel_username).length})
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        >
          <CardTitle>
            Sinxronlangan Postlar Bazasi ({filteredPosts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>ID</th>
                  <th>Post Matni</th>
                  <th>Kanal</th>
                  <th>AI Rasm Tahlili (Vision)</th>
                  <th>Havola</th>
                  <th style={{ width: "60px", textAlign: "right" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-5 small">
                      Postlar mavjud emas. Yuqoridagi kanallarni sinxronlang.
                    </td>
                  </tr>
                ) : (
                  filteredPosts.map((p) => (
                    <tr key={p.id}>
                      <td className="text-secondary font-monospace small">
                        #{p.telegram_message_id}
                      </td>
                      <td style={{ maxWidth: "380px" }}>
                        <div className="text-truncate fw-medium text-primary small">
                          {p.text ? p.text.slice(0, 110) + "..." : "Matn mavjud emas"}
                        </div>
                      </td>
                      <td>
                        <Badge variant="accent">@{p.channel_username}</Badge>
                      </td>
                      <td className="text-secondary small text-truncate" style={{ maxWidth: "260px" }}>
                        {p.image_description || "Rasm tavsifi yo'q"}
                      </td>
                      <td>
                        {p.source_url ? (
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-secondary small d-flex align-items-center gap-1"
                          >
                            <IconExternalLink size={12} /> Post
                          </a>
                        ) : (
                          <span className="text-secondary small">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => onDeletePost(p.id, p.telegram_message_id)}
                          disabled={busy}
                          icon={<IconTrash size={13} />}
                        />
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
