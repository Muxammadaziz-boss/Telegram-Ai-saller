"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Bot, Check, CheckCircle2, CircleAlert, Database, Headset,
  LayoutDashboard, MessageCircle, RefreshCw, Send, Shield, ShoppingBag,
  Sparkles, Trash2, UserPlus, Users, X, Zap,
} from "lucide-react";

type Overview = { conversations: number; ai_active: number; human_takeover: number; knowledge_posts: number; orders: number };
type Conversation = {
  id: number; customer_name: string; username?: string | null; chat_id: number;
  status: string; handoff_reason?: string | null; last_message_at?: string | null;
};
type Message = { id: number; direction: string; text: string; created_at: string };
type KnowledgePost = { id: number; channel_username: string; telegram_message_id: number; text: string; image_description: string; source_url?: string | null };
type AdminUser = {
  id: number;
  telegram_user_id: number;
  name: string;
  username?: string | null;
  role: "owner" | "admin" | "moderator";
  permissions: Record<string, boolean>;
  is_active: boolean;
  added_by?: number | null;
  created_at?: string | null;
};

const PERMISSION_LABELS: Record<string, string> = {
  can_view_conversations: "💬 Suhbatlarni ko'rish",
  can_reply_customers: "✍️ Mijozlarga javob berish",
  can_takeover: "🤝 Suhbatni qabul qilish",
  can_resume_ai: "🤖 AI ni qayta yoqish",
  can_view_knowledge: "📚 Bilim bazasini ko'rish",
  can_manage_knowledge: "📝 Bilim bazasini boshqarish",
  can_manage_admins: "👥 Adminlarni boshqarish",
  can_view_orders: "📦 Buyurtmalarni ko'rish",
  can_manage_orders: "🛒 Buyurtmalarni boshqarish",
  can_view_analytics: "📊 Statistikani ko'rish",
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
  return data as T;
}

function timeLabel(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"inbox" | "knowledge" | "admins">("inbox");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [mounted, setMounted] = useState(false);

  // New admin form state
  const [newAdminId, setNewAdminId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "moderator">("moderator");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, c, p, a] = await Promise.all([
        api<Overview>("/admin/overview"),
        api<Conversation[]>("/admin/conversations"),
        api<KnowledgePost[]>("/admin/knowledge"),
        api<AdminUser[]>("/admin/admins").catch(() => []),
      ]);
      setOverview(o); setConversations(c); setPosts(p); setAdmins(a);
      setSelected((current) => current ?? c[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumotlarni olib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    try { setMessages(await api<Message[]>(`/admin/conversations/${id}/messages`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Xabarlar yuklanmadi"); }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingAuth(false));
  }, []);
  useEffect(() => { if (authenticated) void load(); }, [authenticated, load]);
  useEffect(() => { if (authenticated && selected !== null) void loadMessages(selected); }, [authenticated, selected, loadMessages]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Kirish amalga oshmadi");
      setAuthenticated(true); setPassword("");
    } catch (e) { setLoginError(e instanceof Error ? e.message : "Kirish amalga oshmadi"); }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setAuthenticated(false); setOverview(null); setConversations([]); setMessages([]); setAdmins([]);
  }

  const activeConversation = useMemo(() => conversations.find((item) => item.id === selected) ?? null, [conversations, selected]);

  async function perform(path: string, body?: unknown) {
    setBusy(true); setError(""); setSuccess("");
    try {
      await api(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
      await load();
      if (selected !== null) await loadMessages(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Amal bajarilmadi");
    } finally { setBusy(false); }
  }

  async function sendReply() {
    if (!selected || !draft.trim()) return;
    const text = draft.trim(); setDraft("");
    await perform(`/admin/conversations/${selected}/reply`, { text });
  }

  async function handleSyncKnowledge() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await api<{ ok: boolean; channel: string; synced_posts: number }>("/admin/knowledge/sync", { method: "POST" });
      setSuccess(`✅ ${res.synced_posts} ta post muvaffaqiyatli sinxronlandi! (@${res.channel})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kanal postlarini sinxronlashda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminId.trim()) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await api("/admin/admins", {
        method: "POST",
        body: JSON.stringify({
          telegram_user_id: parseInt(newAdminId.trim(), 10),
          name: newAdminName.trim(),
          username: newAdminUsername.trim().replace(/^@/, "") || null,
          role: newAdminRole,
        }),
      });
      setSuccess("✅ Yangi admin muvaffaqiyatli qo'shildi!");
      setNewAdminId(""); setNewAdminName(""); setNewAdminUsername("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin qo'shishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAdmin(telegram_user_id: number, name: string) {
    if (!confirm(`${name || telegram_user_id} adminlikdan o'chirilsinmi?`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await api(`/admin/admins/${telegram_user_id}`, { method: "DELETE" });
      setSuccess("✅ Admin o'chirildi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin o'chirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePermission(telegram_user_id: number, permission: string, currentVal: boolean) {
    setBusy(true); setError("");
    try {
      await api(`/admin/admins/${telegram_user_id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permission, value: !currentVal }),
      });
      setAdmins((prev) => prev.map((a) => {
        if (a.telegram_user_id === telegram_user_id) {
          return { ...a, permissions: { ...a.permissions, [permission]: !currentVal } };
        }
        return a;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ruxsatni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(telegram_user_id: number, role: string) {
    setBusy(true); setError("");
    try {
      const res = await api<{ ok: boolean; role: "owner" | "admin" | "moderator"; permissions: Record<string, boolean> }>(
        `/admin/admins/${telegram_user_id}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) }
      );
      setAdmins((prev) => prev.map((a) => {
        if (a.telegram_user_id === telegram_user_id) {
          return { ...a, role: res.role, permissions: res.permissions };
        }
        return a;
      }));
      setSuccess("✅ Rol muvaffaqiyatli yangilandi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rolni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || checkingAuth) return <main className="login-screen" suppressHydrationWarning><div className="login-card" suppressHydrationWarning><div className="brand-mark"><Sparkles size={20}/></div><h1>AI Sales Control</h1><p>Tekshirilmoqda...</p></div></main>;
  if (!authenticated) return (
    <main className="login-screen" suppressHydrationWarning>
      <form className="login-card" onSubmit={login} suppressHydrationWarning>
        <div className="brand-mark"><Sparkles size={20}/></div>
        <div className="eyebrow">PRIVATE WORKSPACE</div>
        <h1>Admin panelga kirish</h1>
        <p>AI Sales Control Center boshqaruv paneli.</p>
        <label htmlFor="dashboard-password">Admin paroli</label>
        <input id="dashboard-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parolni kiriting" autoComplete="current-password" required />
        {loginError && <div className="error-banner">{loginError}</div>}
        <button className="login-submit" type="submit">Kirish <Send size={15}/></button>
      </form>
    </main>
  );

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><b>AI Sales</b><span>CONTROL CENTER</span></div></div>
        <div className="workspace"><span className="online-dot" /> Sales workspace <span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <button className="nav-item selected"><LayoutDashboard size={17} /> Overview</button>
        <button className={`nav-item ${tab === "inbox" ? "active" : ""}`} onClick={() => setTab("inbox")}><MessageCircle size={17} /> Live Inbox <span className="nav-count">{overview?.human_takeover ?? 0}</span></button>
        <button className={`nav-item ${tab === "knowledge" ? "active" : ""}`} onClick={() => setTab("knowledge")}><Database size={17} /> Knowledge Base</button>
        <button className={`nav-item ${tab === "admins" ? "active" : ""}`} onClick={() => setTab("admins")}><Shield size={17} /> Admin boshqaruvi</button>
        <button className="nav-item" onClick={() => setError("Orders bo'limi keyingi iteratsiyada ulanadi.")}><ShoppingBag size={17} /> Orders</button>
        <button className="nav-item" onClick={() => setError("Analytics bo'limi keyingi iteratsiyada ulanadi.")}><Activity size={17} /> Analytics</button>
        <div className="sidebar-bottom"><div className="profile"><div className="avatar">AD</div><div><b>Administrator</b><span>Owner access</span></div><span className="dots">•••</span></div><div className="version">MVP · v0.1.0</div></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <b>{tab === "inbox" ? "Live Inbox" : tab === "knowledge" ? "Knowledge Base" : "Admin boshqaruvi"}</b>
          </div>
          <div className="top-actions">
            <span className="status-pill"><i /> System online</span>
            <button className="icon-btn" onClick={() => void load()} title="Yangilash"><RefreshCw size={16} /></button>
            <button className="logout-btn" onClick={() => void logout()}>Chiqish</button>
            <div className="avatar small">AD</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SALES INTELLIGENCE</div>
              <h1>{tab === "inbox" ? "Sales overview" : tab === "knowledge" ? "Knowledge base" : "Adminlar va ruxsatlar boshqaruvi"}</h1>
              <p>{tab === "inbox" ? "Telegram Business suhbatlari va AI sotuv faoliyati." : tab === "knowledge" ? "Public Telegram kanalidan yig'ilgan katalog ma'lumotlari." : "Telegram bot va admin panel sub-adminlarini sozlash."}</p>
            </div>
            <button className="secondary-btn" onClick={() => void load()}><RefreshCw size={15} /> Refresh data</button>
          </div>
          {error && <div className="error-banner"><CircleAlert size={16} /> {error}</div>}
          {success && <div className="success-banner"><CheckCircle2 size={16} /> {success}</div>}

          <div className="stats-grid">
            <Stat icon={<MessageCircle size={18}/>} label="Total conversations" value={overview?.conversations ?? "—"} hint="Jami chatlar" tone="purple" />
            <Stat icon={<Bot size={18}/>} label="AI handling" value={overview?.ai_active ?? "—"} hint="AI faol chatlar" tone="blue" />
            <Stat icon={<Headset size={18}/>} label="Human takeover" value={overview?.human_takeover ?? "—"} hint="Operator kutayotganlar" tone="orange" />
            <Stat icon={<Shield size={18}/>} label="Admins & Staff" value={admins.length || "—"} hint="Jami adminlar" tone="green" />
          </div>

          {tab === "inbox" && (
            <div className="inbox-layout">
              <section className="panel conversation-panel">
                <div className="panel-head"><div><h2>Customer conversations</h2><p>So'nggi faollik bo'yicha saralangan</p></div><span className="subtle-count">{conversations.length} chats</span></div>
                <div className="search-strip"><span>⌕</span><input placeholder="Mijozlarni qidirish..." onChange={(e) => { const q = e.target.value.toLowerCase(); document.querySelectorAll<HTMLElement>("[data-customer]").forEach((el) => { el.style.display = el.dataset.customer?.includes(q) ? "flex" : "none"; }); }} /></div>
                <div className="conversation-list">
                  {loading && <div className="empty">Yuklanmoqda...</div>}
                  {!loading && conversations.length === 0 && <div className="empty">Hozircha suhbatlar yo'q.</div>}
                  {conversations.map((item) => <button key={item.id} data-customer={`${item.customer_name} ${item.username || ""}`.toLowerCase()} className={`conversation-row ${selected === item.id ? "chosen" : ""}`} onClick={() => setSelected(item.id)}>
                    <div className="avatar customer">{(item.customer_name || "M").slice(0, 1).toUpperCase()}</div><div className="conversation-info"><div className="conversation-title"><b>{item.customer_name}</b><time>{timeLabel(item.last_message_at)}</time></div><span>{item.username ? `@${item.username}` : `ID: ${item.chat_id}`}</span><div className="row-status"><i className={item.status === "ai_active" ? "green-dot" : "orange-dot"} />{item.status === "ai_active" ? "AI active" : "Human takeover"}</div></div>
                  </button>)}
                </div>
              </section>

              <section className="panel chat-panel">
                {activeConversation ? <>
                  <div className="chat-header"><div className="avatar customer">{(activeConversation.customer_name || "M").slice(0, 1).toUpperCase()}</div><div className="chat-person"><b>{activeConversation.customer_name}</b><span>{activeConversation.username ? `@${activeConversation.username}` : `Telegram ID: ${activeConversation.chat_id}`}</span></div><span className={`state-tag ${activeConversation.status === "ai_active" ? "ai" : "human"}`}>{activeConversation.status === "ai_active" ? "AI ACTIVE" : "OPERATOR"}</span></div>
                  {activeConversation.handoff_reason && <div className="handoff-note"><Headset size={15}/><span>{activeConversation.handoff_reason}</span></div>}
                  <div className="messages">
                    {messages.map((message) => <div key={message.id} className={`message-line ${message.direction === "customer" ? "incoming" : "outgoing"}`}><div className="bubble"><p>{message.text}</p><time>{timeLabel(message.created_at)}</time></div></div>)}
                    {messages.length === 0 && <div className="empty">Ushbu suhbatda xabarlar yo'q.</div>}
                  </div>
                  <div className="chat-controls"><div className="control-actions">{activeConversation.status === "ai_active" ? <button className="takeover-btn" disabled={busy} onClick={() => void perform(`/admin/conversations/${selected}/takeover`, { reason: "Admin panel orqali operator qabul qildi" })}><Headset size={15}/> Take over</button> : <button className="resume-btn" disabled={busy} onClick={() => void perform(`/admin/conversations/${selected}/resume`)}><Bot size={15}/> Resume AI</button>}<span className="control-hint">Operator boshqaruvi</span></div><div className="reply-box"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void sendReply(); }} placeholder="Mijozga javob yozing..." /><button onClick={() => void sendReply()} disabled={busy || !draft.trim()}><Send size={16}/></button></div></div>
                </> : <div className="empty large"><Users size={28}/><b>Suhbat tanlanmagan</b><span>Chap tomondan mijoz suhbatini tanlang.</span></div>}
              </section>
            </div>
          )}

          {tab === "knowledge" && (
            <section className="panel knowledge-panel">
              <div className="panel-head">
                <div>
                  <h2>Synced channel posts</h2>
                  <p>Matn va rasm tavsiflari bo'yicha bilim bazasi</p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button className="secondary-btn" disabled={busy} onClick={() => void handleSyncKnowledge()}>
                    <RefreshCw size={14} className={busy ? "spin" : ""} /> {busy ? "Sinxronlanmoqda..." : "Kanal postlarini sinxronlash"}
                  </button>
                  <span className="subtle-count">{posts.length} latest records</span>
                </div>
              </div>
              {posts.length === 0 ? <div className="empty">Hali kanal postlari import qilinmagan.</div> : <div className="post-grid">{posts.map((post) => <article className="post-card" key={post.id}><div className="post-meta"><span>#{post.telegram_message_id}</span><span>@{post.channel_username}</span></div><p>{post.text || "Matn mavjud emas"}</p>{post.image_description && <div className="image-description">Image: {post.image_description}</div>}{post.source_url && <a href={post.source_url} target="_blank" rel="noreferrer">Telegram postini ko'rish ↗</a>}</article>)}</div>}
            </section>
          )}

          {tab === "admins" && (
            <section className="panel admin-panel">
              <div className="admin-top-bar">
                <div className="bot-tip">
                  <Bot size={16} />
                  <span><b>Telegram bot orqali boshqarish:</b> Botga <code>/admin</code>, <code>/addadmin</code>, <code>/removeadmin</code>, <code>/admins</code> yuboring.</span>
                </div>
              </div>

              {/* Add admin form */}
              <div className="admin-form-card">
                <h3><UserPlus size={16} /> Yangi admin qo'shish</h3>
                <form onSubmit={handleAddAdmin} className="form-row">
                  <div className="form-group">
                    <label>Telegram User ID *</label>
                    <input
                      type="number"
                      required
                      placeholder="Masalan: 123456789"
                      value={newAdminId}
                      onChange={(e) => setNewAdminId(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ismi</label>
                    <input
                      type="text"
                      placeholder="Admin ismi"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      placeholder="@username"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rol</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as "admin" | "moderator")}
                    >
                      <option value="moderator">Moderator (cheklangan)</option>
                      <option value="admin">Admin (to'liq ruxsat)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" disabled={busy || !newAdminId.trim()}>
                    <UserPlus size={14} /> Qo'shish
                  </button>
                </form>
              </div>

              {/* Admins grid */}
              <div className="admin-grid">
                {admins.map((a) => (
                  <div key={a.id} className={`admin-card ${!a.is_active ? "inactive" : ""}`}>
                    <div className="admin-card-head">
                      <div className="admin-user-info">
                        <div className="avatar">{a.role === "owner" ? "👑" : a.role === "admin" ? "🛡" : "👤"}</div>
                        <div>
                          <b>{a.name || "Nomsiz"}</b>
                          <span>ID: {a.telegram_user_id} {a.username ? `· @${a.username}` : ""}</span>
                        </div>
                      </div>
                      <span className={`role-badge ${a.role}`}>{a.role}</span>
                    </div>

                    <div className="perms-container">
                      <h4>Ruxsatlar ({a.role === "owner" ? "To'liq" : "Sozlanadigan"})</h4>
                      <div className="perms-grid">
                        {Object.entries(PERMISSION_LABELS).map(([permKey, label]) => {
                          const isChecked = a.role === "owner" ? true : Boolean(a.permissions[permKey]);
                          return (
                            <button
                              key={permKey}
                              type="button"
                              disabled={a.role === "owner" || busy}
                              onClick={() => void handleTogglePermission(a.telegram_user_id, permKey, isChecked)}
                              className={`perm-toggle ${isChecked ? "on" : "off"}`}
                              title={a.role === "owner" ? "Owner ruxsatlarini o'zgartirib bo'lmaydi" : "O'zgartirish uchun bosing"}
                            >
                              {isChecked ? <Check size={13} color="#4ade80" /> : <X size={13} color="#64748b" />}
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {a.role !== "owner" && (
                      <div className="admin-card-actions">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>Rol:</span>
                          <select
                            className="role-select"
                            value={a.role}
                            disabled={busy}
                            onChange={(e) => void handleRoleChange(a.telegram_user_id, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                          </select>
                        </div>
                        {a.is_active && (
                          <button
                            type="button"
                            className="btn-danger"
                            disabled={busy}
                            onClick={() => void handleDeleteAdmin(a.telegram_user_id, a.name)}
                          >
                            <Trash2 size={13} /> O'chirish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="footer">
            <span>AI Sales Control Center</span>
            <span><CheckCircle2 size={13}/> Telegram Business & Sub-admin management active</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string | number; hint: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-hint"><Zap size={12}/>{hint}</div></div>;
}
