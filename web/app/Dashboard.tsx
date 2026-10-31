"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowUpRight,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconDatabase,
  IconExternalLink,
  IconEye,
  IconFilter,
  IconHeadset,
  IconHelpCircle,
  IconHistory,
  IconKey,
  IconLayoutDashboard,
  IconLogout,
  IconMessageDots,
  IconMessages,
  IconMoon,
  IconPackage,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconSend,
  IconSettings,
  IconShieldLock,
  IconShoppingCart,
  IconSparkles,
  IconSun,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUserCheck,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";

type Overview = {
  conversations: number;
  ai_active: number;
  human_takeover: number;
  knowledge_posts: number;
  orders: number;
};

type Conversation = {
  id: number;
  customer_name: string;
  username?: string | null;
  chat_id: number;
  status: string;
  handoff_reason?: string | null;
  last_message_at?: string | null;
};

type Message = {
  id: number;
  direction: string;
  text: string;
  created_at: string;
};

type KnowledgePost = {
  id: number;
  channel_username: string;
  telegram_message_id: number;
  text: string;
  image_description: string;
  source_url?: string | null;
};

type ConnectedChannel = {
  id: number;
  channel_username: string;
  title?: string | null;
  is_active: boolean;
  posts_count: number;
  last_synced_at?: string | null;
  created_at?: string | null;
};

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

type OrderItem = {
  id: string;
  customer: string;
  username: string;
  product: string;
  amount: string;
  status: "New" | "Processing" | "Confirmed" | "Completed" | "Cancelled";
  date: string;
  channel: string;
};

type ProductItem = {
  id: string;
  name: string;
  category: string;
  specs: string;
  price: string;
  stock: "In Stock" | "Low Stock" | "Pre-order";
  warranty: string;
};

const PERMISSION_LABELS: Record<string, string> = {
  can_view_conversations: "Suhbatlarni ko'rish",
  can_reply_customers: "Mijozlarga javob berish",
  can_takeover: "Suhbatni qabul qilish",
  can_resume_ai: "AI ni qayta yoqish",
  can_view_knowledge: "Bilim bazasini ko'rish",
  can_manage_knowledge: "Bilim bazasini boshqarish",
  can_manage_admins: "Adminlarni boshqarish",
  can_view_orders: "Buyurtmalarni ko'rish",
  can_manage_orders: "Buyurtmalarni boshqarish",
  can_view_analytics: "Statistikani ko'rish",
};

const INITIAL_PRODUCTS: ProductItem[] = [
  { id: "LAP-01", name: "Asus TUF Gaming FX505GE", category: "Gaming", specs: "i7-8750H / 16GB RAM / 512GB SSD / GTX1050ti 4GB", price: "$340", stock: "In Stock", warranty: "2 oy kafolat" },
  { id: "LAP-02", name: "Lenovo ThinkPad E14 Gen 4", category: "Business", specs: "Ryzen 5 5625U / 16GB RAM / 512GB NVMe / 14' IPS FHD", price: "$430", stock: "In Stock", warranty: "3 oy kafolat" },
  { id: "LAP-03", name: "HP Victus 15-fb0028nr", category: "Gaming", specs: "Ryzen 5 5600H / 16GB RAM / 512GB SSD / GTX1650 4GB", price: "$490", stock: "In Stock", warranty: "2 oy kafolat" },
  { id: "LAP-04", name: "Dell Latitude 5420 Business", category: "Ultrabook", specs: "i5-1145G7 / 16GB RAM / 256GB SSD / Iris Xe", price: "$320", stock: "Low Stock", warranty: "1 oy kafolat" },
  { id: "LAP-05", name: "Apple MacBook Air M1 (2020)", category: "Premium", specs: "Apple M1 8-Core / 8GB Unified / 256GB SSD / Space Gray", price: "$610", stock: "In Stock", warranty: "3 oy kafolat" },
  { id: "LAP-06", name: "Acer Nitro 5 AN515-57", category: "Gaming", specs: "i5-11400H / 16GB RAM / 512GB SSD / RTX3050 4GB", price: "$560", stock: "In Stock", warranty: "2 oy kafolat" },
];

const INITIAL_ORDERS: OrderItem[] = [
  { id: "ORD-9421", customer: "Azizbek Rahimov", username: "@aziz_tech", product: "Asus TUF Gaming FX505GE", amount: "$340", status: "Confirmed", date: "Bugun, 18:24", channel: "Telegram Business" },
  { id: "ORD-9420", customer: "Bobur Mirzayev", username: "@bobur_m", product: "Lenovo ThinkPad E14", amount: "$430", status: "Processing", date: "Bugun, 16:15", channel: "Telegram Business" },
  { id: "ORD-9419", customer: "Sardor Aliyev", username: "@sardor_a", product: "Apple MacBook Air M1", amount: "$610", status: "New", date: "Kecha, 21:04", channel: "Telegram Bot" },
  { id: "ORD-9418", customer: "Jasur Komilov", username: "@j_komil", product: "HP Victus 15", amount: "$490", status: "Completed", date: "30-okt, 14:10", channel: "Telegram Business" },
  { id: "ORD-9417", customer: "Dilshod Karimov", username: "@dilshod_k", product: "Dell Latitude 5420", amount: "$320", status: "Completed", date: "29-okt, 19:40", channel: "Telegram Business" },
];

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

export default function Dashboard({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  const [tab, setTab] = useState<
    "overview" | "inbox" | "knowledge" | "products" | "orders" | "customers" | "analytics" | "settings" | "admins" | "team" | "logs"
  >("overview");

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [channel, setChannel] = useState<string>("");
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [newChannelInput, setNewChannelInput] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);

  const [inboxFilter, setInboxFilter] = useState<"all" | "ai" | "human">("all");
  const [inboxSearch, setInboxSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerNotes, setCustomerNotes] = useState<Record<number, string>>({
    4: "Mijoz o'yin uchun hamyonbop Asus TUF qidiryapti. 2 oy kafolat so'radi.",
  });

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // New admin form state
  const [newAdminId, setNewAdminId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "moderator">("moderator");

  // AI settings state
  const [aiModel, setAiModel] = useState("gemini-3.5-flash-lite");
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [doubleConfirmation, setDoubleConfirmation] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, c, p, a, s, chList] = await Promise.all([
        api<Overview>("/admin/overview"),
        api<Conversation[]>("/admin/conversations"),
        api<KnowledgePost[]>("/admin/knowledge"),
        api<AdminUser[]>("/admin/admins").catch(() => []),
        api<{ public_channel?: string }>("/admin/settings").catch(() => ({ public_channel: "" })),
        api<ConnectedChannel[]>("/admin/channels").catch(() => []),
      ]);
      setOverview(o);
      setConversations(c);
      setPosts(p);
      setAdmins(a);
      setChannels(chList);
      if (chList.length > 0) {
        setChannel(chList[0].channel_username);
      } else if (s?.public_channel) {
        setChannel(s.public_channel);
      } else if (p.length > 0 && p[0].channel_username) {
        setChannel(p[0].channel_username);
      }
      setSelected((curr) => curr ?? c[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    try {
      setMessages(await api<Message[]>(`/admin/conversations/${id}/messages`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xabarlar yuklanmadi");
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      fetch("/api/auth/status", { cache: "no-store", signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.authenticated) setAuthenticated(true);
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) void load();
  }, [authenticated, load]);

  useEffect(() => {
    if (authenticated && selected !== null) void loadMessages(selected);
  }, [authenticated, selected, loadMessages]);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Kirish amalga oshmadi");
      setAuthenticated(true);
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Parol noto'g'ri");
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setAuthenticated(false);
    setOverview(null);
    setConversations([]);
    setMessages([]);
    setAdmins([]);
  }

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selected) ?? null,
    [conversations, selected]
  );

  const currentChannelName = useMemo(() => {
    const raw = channel || (posts.length > 0 ? posts[0].channel_username : "");
    if (!raw) return "";
    return raw.startsWith("@") ? raw : `@${raw}`;
  }, [channel, posts]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        inboxSearch.trim() === "" ||
        c.customer_name.toLowerCase().includes(inboxSearch.toLowerCase()) ||
        (c.username && c.username.toLowerCase().includes(inboxSearch.toLowerCase())) ||
        String(c.chat_id).includes(inboxSearch);

      if (!matchesSearch) return false;
      if (inboxFilter === "ai") return c.status === "ai_active";
      if (inboxFilter === "human") return c.status !== "ai_active";
      return true;
    });
  }, [conversations, inboxSearch, inboxFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!productSearch.trim()) return true;
      const s = productSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.specs.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s) ||
        p.price.toLowerCase().includes(s)
      );
    });
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!orderSearch.trim()) return true;
      const s = orderSearch.toLowerCase();
      return (
        o.customer.toLowerCase().includes(s) ||
        o.product.toLowerCase().includes(s) ||
        o.id.toLowerCase().includes(s) ||
        o.username.toLowerCase().includes(s)
      );
    });
  }, [orders, orderSearch]);

  async function perform(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
      await load();
      if (selected !== null) await loadMessages(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Amal bajarilmadi");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    await perform(`/admin/conversations/${selected}/reply`, { text });
  }

  async function handleSyncKnowledge() {
    await handleSyncChannel();
  }

  async function handleConnectChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelInput.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api<{ ok: boolean; channel: ConnectedChannel; imported_posts: number }>(
        "/admin/channels",
        {
          method: "POST",
          body: JSON.stringify({ channel: newChannelInput.trim() }),
        }
      );
      setSuccess(`@${res.channel.channel_username} kanali muvaffaqiyatli ulandi va ${res.imported_posts} ta post sinxronlandi!`);
      setNewChannelInput("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kanal ulashda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncChannel(targetChannel?: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api<{ ok: boolean; synced: Record<string, number>; total_synced: number }>(
        "/admin/channels/sync",
        {
          method: "POST",
          body: targetChannel ? JSON.stringify({ channel: targetChannel }) : undefined,
        }
      );
      if (targetChannel) {
        setSuccess(`@${targetChannel} muvaffaqiyatli sinxronlandi (${res.total_synced} ta post)!`);
      } else {
        setSuccess(`Barcha kanallar muvaffaqiyatli sinxronlandi (Jami ${res.total_synced} ta post)!`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kanal postlarini sinxronlashda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteChannel(channelUsername: string) {
    if (!confirm(`@${channelUsername} kanali ro'yxatdan o'chirilsinmi?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`/admin/channels/${encodeURIComponent(channelUsername)}`, { method: "DELETE" });
      setSuccess(`@${channelUsername} kanali muvaffaqiyatli o'chirildi.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kanalni o'chirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminId.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
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
      setSuccess("Yangi admin muvaffaqiyatli qo'shildi!");
      setNewAdminId("");
      setNewAdminName("");
      setNewAdminUsername("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin qo'shishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAdmin(telegram_user_id: number, name: string) {
    if (!confirm(`${name || telegram_user_id} adminlikdan o'chirilsinmi?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`/admin/admins/${telegram_user_id}`, { method: "DELETE" });
      setSuccess("Admin o'chirildi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin o'chirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePermission(telegram_user_id: number, permission: string, currentVal: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/admins/${telegram_user_id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permission, value: !currentVal }),
      });
      setAdmins((prev) =>
        prev.map((a) => {
          if (a.telegram_user_id === telegram_user_id) {
            return { ...a, permissions: { ...a.permissions, [permission]: !currentVal } };
          }
          return a;
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ruxsatni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(telegram_user_id: number, role: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; role: "owner" | "admin" | "moderator"; permissions: Record<string, boolean> }>(
        `/admin/admins/${telegram_user_id}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) }
      );
      setAdmins((prev) =>
        prev.map((a) => {
          if (a.telegram_user_id === telegram_user_id) {
            return { ...a, role: res.role, permissions: res.permissions };
          }
          return a;
        })
      );
      setSuccess("Rol muvaffaqiyatli yangilandi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rolni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  // Login view using native Tabler authentication markup
  if (!authenticated) {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <div className="text-center mb-4">
            <span className="avatar avatar-md bg-primary text-white rounded">
              <IconSparkles size={24} />
            </span>
            <h1 className="navbar-brand navbar-brand-autodark mt-2">AI Sales Control Center</h1>
          </div>
          <div className="card card-md">
            <div className="card-body">
              <h2 className="h2 text-center mb-4">Tizimga kirish</h2>
              <form onSubmit={login} autoComplete="off">
                <div className="mb-3">
                  <label className="form-label" htmlFor="admin-pwd">
                    Admin paroli
                  </label>
                  <div className="input-group input-group-flat">
                    <input
                      id="admin-pwd"
                      type="password"
                      className="form-control"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                    <IconAlertCircle className="me-2" size={18} />
                    <div>{loginError}</div>
                  </div>
                )}

                <div className="form-footer">
                  <button type="submit" className="btn btn-primary w-100">
                    Kirish
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="text-center text-secondary mt-3">
            Telegram Business AI Sales Engine v2.4
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ========================================================
          5. SIDEBAR: NATIVE TABLER VERTICAL NAVBAR
          ======================================================== */}
      <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
        <div className="container-fluid">
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebar-menu"
            aria-controls="sidebar-menu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <h1 className="navbar-brand navbar-brand-autodark my-2">
            <a href="#" onClick={(e) => { e.preventDefault(); setTab("overview"); }} className="d-flex align-items-center gap-2 text-decoration-none">
              <span className="avatar avatar-sm bg-primary text-white rounded">
                <IconRobot size={20} />
              </span>
              <span>AI Sales Control</span>
            </a>
          </h1>

          <div className="navbar-nav flex-row d-lg-none">
            <button
              className="nav-link px-0 text-reset"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>
          </div>

          <div className="collapse navbar-collapse show" id="sidebar-menu">
            <ul className="navbar-nav pt-lg-3">
              {/* WORKSPACE SECTION */}
              <div className="nav-section-title">WORKSPACE</div>

              <li className={`nav-item ${tab === "overview" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#overview"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("overview");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconLayoutDashboard size={18} />
                  </span>
                  <span className="nav-link-title">Overview</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "inbox" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#inbox"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("inbox");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconMessages size={18} />
                  </span>
                  <span className="nav-link-title">Live Inbox</span>
                  {overview && overview.human_takeover > 0 && (
                    <span className="badge badge-sm bg-yellow text-yellow-fg ms-auto">
                      {overview.human_takeover}
                    </span>
                  )}
                </a>
              </li>

              <li className={`nav-item ${tab === "knowledge" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#knowledge"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("knowledge");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconDatabase size={18} />
                  </span>
                  <span className="nav-link-title">Knowledge Base</span>
                  <span className="badge badge-sm bg-blue-lt ms-auto">
                    {posts.length}
                  </span>
                </a>
              </li>

              {/* SALES SECTION */}
              <div className="nav-section-title">SALES</div>

              <li className={`nav-item ${tab === "products" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#products"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("products");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconPackage size={18} />
                  </span>
                  <span className="nav-link-title">Products</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "orders" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#orders"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("orders");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconShoppingCart size={18} />
                  </span>
                  <span className="nav-link-title">Orders</span>
                  <span className="badge badge-sm bg-green-lt ms-auto">{orders.length}</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "customers" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#customers"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("customers");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconUsers size={18} />
                  </span>
                  <span className="nav-link-title">Customers</span>
                </a>
              </li>

              {/* INTELLIGENCE SECTION */}
              <div className="nav-section-title">INTELLIGENCE</div>

              <li className={`nav-item ${tab === "analytics" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#analytics"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("analytics");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconTrendingUp size={18} />
                  </span>
                  <span className="nav-link-title">Analytics</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "settings" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("settings");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconSettings size={18} />
                  </span>
                  <span className="nav-link-title">AI Settings</span>
                </a>
              </li>

              {/* SYSTEM SECTION */}
              <div className="nav-section-title">SYSTEM</div>

              <li className={`nav-item ${tab === "admins" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#admins"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("admins");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconShieldLock size={18} />
                  </span>
                  <span className="nav-link-title">Administration</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "team" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#team"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("team");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconUsersGroup size={18} />
                  </span>
                  <span className="nav-link-title">Team & Access</span>
                </a>
              </li>

              <li className={`nav-item ${tab === "logs" ? "active" : ""}`}>
                <a
                  className="nav-link"
                  href="#logs"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("logs");
                  }}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconActivity size={18} />
                  </span>
                  <span className="nav-link-title">Activity Logs</span>
                </a>
              </li>
            </ul>

            <div className="mt-auto pt-3 border-top border-secondary-subtle">
              <div className="d-flex align-items-center px-3 py-2">
                <span className="avatar avatar-sm me-2 rounded bg-primary-lt">
                  AD
                </span>
                <div className="d-flex flex-column text-truncate">
                  <span className="fw-medium text-reset fs-5">Super Admin</span>
                  <small className="text-secondary">sales_bot@admin</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          PAGE WRAPPER
          ======================================================== */}
      <div className="page-wrapper">
        {/* ========================================================
            4. FLOATING TOP NAVBAR (STRICT USER SPECIFICATION)
            ======================================================== */}
        <header className="navbar navbar-expand-md d-print-none navbar-floating">
          <div className="container-xl">
            {/* Search Input */}
            <div className="my-2 my-md-0 flex-grow-1 flex-md-grow-0 order-first order-md-last">
              <div className="input-icon">
                <span className="input-icon-addon">
                  <IconSearch size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Qidiruv (Ctrl + K)..."
                  aria-label="Search"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Navbar Items Right */}
            <div className="navbar-nav flex-row order-md-last ms-auto align-items-center gap-2">
              {/* AI Engine Status Pill */}
              <div className="nav-item d-none d-sm-flex">
                <span className="badge bg-green-lt text-green d-flex align-items-center gap-1 py-2 px-2">
                  <span className="status-dot status-dot-animated bg-green"></span>
                  AI Online ({aiModel.replace("gemini-", "")})
                </span>
              </div>

              {/* Theme Toggle Button */}
              <div className="nav-item">
                <button
                  type="button"
                  className="btn btn-icon btn-outline-secondary"
                  title="Mavzuni almashtirish"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
                </button>
              </div>

              {/* Refresh Button */}
              <div className="nav-item">
                <button
                  type="button"
                  className="btn btn-icon btn-outline-secondary"
                  title="Yangilash"
                  onClick={load}
                  disabled={loading}
                >
                  <IconRefresh size={18} className={loading ? "spin" : ""} />
                </button>
              </div>

              {/* Logout Button */}
              <div className="nav-item ms-2">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={logout}
                >
                  <IconLogout size={16} />
                  <span>Chiqish</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Global Notifications */}
        <div className="container-xl mt-3">
          {error && (
            <div className="alert alert-danger alert-dismissible" role="alert">
              <div className="d-flex">
                <div>
                  <IconAlertCircle className="me-2" size={20} />
                </div>
                <div>{error}</div>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setError("")}
              ></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible" role="alert">
              <div className="d-flex">
                <div>
                  <IconCheck className="me-2" size={20} />
                </div>
                <div>{success}</div>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setSuccess("")}
              ></button>
            </div>
          )}
        </div>

        {/* ========================================================
            PAGE HEADER
            ======================================================== */}
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <div className="page-pretitle">
                  {tab === "overview" && "WORKSPACE / OVERVIEW"}
                  {tab === "inbox" && "WORKSPACE / LIVE INBOX"}
                  {tab === "knowledge" && "WORKSPACE / KNOWLEDGE BASE"}
                  {tab === "products" && "SALES / PRODUCTS CATALOG"}
                  {tab === "orders" && "SALES / ORDERS MANAGEMENT"}
                  {tab === "customers" && "SALES / CUSTOMERS DIRECTORY"}
                  {tab === "analytics" && "INTELLIGENCE / ANALYTICS"}
                  {tab === "settings" && "INTELLIGENCE / AI CONFIGURATION"}
                  {tab === "admins" && "SYSTEM / ADMINISTRATION"}
                  {tab === "team" && "SYSTEM / TEAM & ACCESS ROLES"}
                  {tab === "logs" && "SYSTEM / AUDIT & ACTIVITY LOGS"}
                </div>
                <h2 className="page-title">
                  {tab === "overview" && "Boshqaruv Paneli"}
                  {tab === "inbox" && "Jonli Suhbatlar (Live Inbox)"}
                  {tab === "knowledge" && "Telegram Mahsulotlar Bazasi"}
                  {tab === "products" && "Mahsulotlar Katalogi"}
                  {tab === "orders" && "Buyurtmalar Jurnali"}
                  {tab === "customers" && "Mijozlar Ro'yxati"}
                  {tab === "analytics" && "Savdo va AI Statistikasi"}
                  {tab === "settings" && "AI va Tizim Sozlamalari"}
                  {tab === "admins" && "Administratorlar Boshqaruvi"}
                  {tab === "team" && "Jamoa va Ruxsatlar Tizimi"}
                  {tab === "logs" && "Tizim Amallari Tarixi"}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            PAGE BODY (TAB CONTENTS)
            ======================================================== */}
        <div className="page-body">
          <div className="container-xl">
            {/* 1. OVERVIEW TAB */}
            {tab === "overview" && (
              <div className="row row-deck row-cards">
                {/* KPI STAT CARDS */}
                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center">
                        <div className="subheader">Jami Suhbatlar</div>
                        <div className="ms-auto lh-1">
                          <span className="badge bg-blue-lt">+12% bugun</span>
                        </div>
                      </div>
                      <div className="h1 mb-3">{overview?.conversations ?? 0}</div>
                      <div className="d-flex mb-2">
                        <div>Mijozlar bilan faol aloqa</div>
                        <div className="ms-auto text-secondary">100%</div>
                      </div>
                      <div className="progress progress-sm">
                        <div className="progress-bar bg-primary" style={{ width: "100%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center">
                        <div className="subheader">AI Boshqaruvida</div>
                        <div className="ms-auto lh-1">
                          <span className="badge bg-green-lt text-green">Avtomat</span>
                        </div>
                      </div>
                      <div className="h1 mb-3 text-green">{overview?.ai_active ?? 0}</div>
                      <div className="d-flex mb-2">
                        <div>
                          {overview && overview.conversations > 0
                            ? Math.round((overview.ai_active / overview.conversations) * 100)
                            : 0}
                          % avtomatik yechim
                        </div>
                      </div>
                      <div className="progress progress-sm">
                        <div
                          className="progress-bar bg-green"
                          style={{
                            width: `${
                              overview && overview.conversations > 0
                                ? (overview.ai_active / overview.conversations) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center">
                        <div className="subheader">Operator Qabulida</div>
                        <div className="ms-auto lh-1">
                          <span className="badge bg-yellow-lt">Inson nazorati</span>
                        </div>
                      </div>
                      <div className="h1 mb-3 text-warning">{overview?.human_takeover ?? 0}</div>
                      <div className="d-flex mb-2">
                        <div>Tezkor javob talab</div>
                      </div>
                      <div className="progress progress-sm">
                        <div
                          className="progress-bar bg-warning"
                          style={{
                            width: `${
                              overview && overview.conversations > 0
                                ? (overview.human_takeover / overview.conversations) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center">
                        <div className="subheader">Sinxron Postlar</div>
                        <div className="ms-auto lh-1">
                          <span className="badge bg-purple-lt">Katalog</span>
                        </div>
                      </div>
                      <div className="h1 mb-3">{overview?.knowledge_posts ?? posts.length}</div>
                      <div className="d-flex mb-2">
                        <div>
                          {channels.length > 0
                            ? `${channels.length} ta kanal (${channels.map((c) => '@' + c.channel_username).join(', ')})`
                            : "Kanal ulanmagan"}
                        </div>
                      </div>
                      <div className="progress progress-sm">
                        <div className="progress-bar bg-info" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI ENGINE & SYSTEM STATUS */}
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">So'nggi Mijoz Murojaatlari</h3>
                      <div className="card-actions">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setTab("inbox")}
                        >
                          Barchasini ko'rish
                        </button>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-striped">
                        <thead>
                          <tr>
                            <th>Mijoz</th>
                            <th>Status</th>
                            <th>Sabab</th>
                            <th>So'nggi xabar</th>
                            <th className="w-1">Amal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversations.slice(0, 5).map((conv) => (
                            <tr key={conv.id}>
                              <td>
                                <div className="d-flex py-1 align-items-center">
                                  <span className="avatar me-2 rounded bg-primary-lt">
                                    {conv.customer_name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="flex-fill">
                                    <div className="font-weight-medium">{conv.customer_name}</div>
                                    <div className="text-secondary">
                                      {conv.username ? `@${conv.username}` : `ID: ${conv.chat_id}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {conv.status === "ai_active" ? (
                                  <span className="badge bg-green-lt text-green">
                                    <span className="status-dot status-dot-animated bg-green me-1"></span>
                                    AI Faol
                                  </span>
                                ) : (
                                  <span className="badge bg-warning-lt text-warning">
                                    <IconHeadset size={14} className="me-1" />
                                    Operator
                                  </span>
                                )}
                              </td>
                              <td className="text-secondary">
                                {conv.handoff_reason || "Mijoz maslahat so'radi"}
                              </td>
                              <td className="text-secondary">{timeLabel(conv.last_message_at)}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setSelected(conv.id);
                                    setTab("inbox");
                                  }}
                                >
                                  Ochish
                                </button>
                              </td>
                            </tr>
                          ))}
                          {conversations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center text-secondary py-4">
                                Hozircha suhbatlar mavjud emas
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">AI Sales Engine Holati</h3>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled space-y-3 mb-0">
                        <li className="d-flex align-items-center justify-content-between mb-3">
                          <span className="text-secondary">AI Model:</span>
                          <span className="badge bg-blue-lt fw-bold">{aiModel}</span>
                        </li>
                        <li className="d-flex align-items-center justify-content-between mb-3">
                          <span className="text-secondary">Telegram Webhook:</span>
                          <span className="badge bg-green-lt text-green">Faol va Ulangan</span>
                        </li>
                        <li className="d-flex align-items-center justify-content-between mb-3">
                          <span className="text-secondary">O'rtacha javob tezligi:</span>
                          <span className="fw-bold">1.8 soniya</span>
                        </li>
                        <li className="d-flex align-items-center justify-content-between mb-3">
                          <span className="text-secondary">Dublyor tasdiqlash:</span>
                          <span className="badge bg-blue-lt">Yoqilgan</span>
                        </li>
                        <li className="d-flex align-items-center justify-content-between mb-3">
                          <span className="text-secondary">Kanal sinxronizatsiyasi:</span>
                          <span className="text-green fw-bold">Avtomatik</span>
                        </li>
                      </ul>
                      <hr className="my-3" />
                      <button
                        className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-1"
                        onClick={handleSyncKnowledge}
                        disabled={busy}
                      >
                        <IconRefresh size={18} className={busy ? "spin" : ""} />
                        Kanalni hozir tekshirish
                      </button>
                    </div>
                  </div>

                  <div className="card mt-3">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <div className="subheader">Bugungi Buyurtmalar</div>
                        <div className="ms-auto text-green fw-bold">$2,190</div>
                      </div>
                      <div className="h2 mb-0">5 ta yangi shartnoma</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LIVE INBOX TAB */}
            {tab === "inbox" && (
              <div className="row g-3">
                {/* Left: Conversations list */}
                <div className="col-md-4 col-lg-3">
                  <div className="card">
                    <div className="card-header d-flex flex-column gap-2">
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <h3 className="card-title mb-0">Suhbatlar ({filteredConversations.length})</h3>
                        <span className="badge bg-primary-lt">Jonli</span>
                      </div>
                      <div className="input-icon w-100">
                        <span className="input-icon-addon">
                          <IconSearch size={16} />
                        </span>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Mijoz nomi yoki username..."
                          value={inboxSearch}
                          onChange={(e) => setInboxSearch(e.target.value)}
                        />
                      </div>
                      <div className="btn-group w-100" role="group">
                        <button
                          type="button"
                          className={`btn btn-sm ${inboxFilter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setInboxFilter("all")}
                        >
                          Barchasi
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${inboxFilter === "ai" ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setInboxFilter("ai")}
                        >
                          AI
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${inboxFilter === "human" ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setInboxFilter("human")}
                        >
                          Operator
                        </button>
                      </div>
                    </div>

                    <div className="list-group list-group-flush conversations-scroll-container">
                      {filteredConversations.map((c) => {
                        const isSelected = c.id === selected;
                        return (
                          <a
                            key={c.id}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelected(c.id);
                            }}
                            className={`list-group-item list-group-item-action ${isSelected ? "active" : ""}`}
                          >
                            <div className="d-flex align-items-center">
                              <span
                                className={`avatar avatar-sm me-2 rounded ${
                                  isSelected ? "bg-white text-primary" : "bg-primary-lt"
                                }`}
                              >
                                {c.customer_name.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="text-truncate flex-fill">
                                <div className="d-flex align-items-center justify-content-between">
                                  <strong className="text-truncate">{c.customer_name}</strong>
                                  <small className={isSelected ? "text-white-50" : "text-secondary"}>
                                    {timeLabel(c.last_message_at)}
                                  </small>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mt-1">
                                  <small className={isSelected ? "text-white-50" : "text-secondary"}>
                                    {c.username ? `@${c.username}` : `ID: ${c.chat_id}`}
                                  </small>
                                  {c.status === "ai_active" ? (
                                    <span className={`badge badge-sm ${isSelected ? "bg-white text-green" : "bg-green-lt text-green"}`}>
                                      AI
                                    </span>
                                  ) : (
                                    <span className={`badge badge-sm ${isSelected ? "bg-white text-yellow" : "bg-yellow-lt text-yellow"}`}>
                                      Operator
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}

                      {filteredConversations.length === 0 && (
                        <div className="p-4 text-center text-secondary">
                          Suhbat topilmadi
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Active Chat Window */}
                <div className="col-md-5 col-lg-6">
                  {activeConversation ? (
                    <div className="card">
                      <div className="card-header d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md me-2 rounded bg-primary-lt">
                            {activeConversation.customer_name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <h3 className="card-title mb-0">{activeConversation.customer_name}</h3>
                            <div className="text-secondary fs-5">
                              {activeConversation.username ? `@${activeConversation.username}` : `Chat ID: ${activeConversation.chat_id}`}
                            </div>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          {activeConversation.status === "ai_active" ? (
                            <button
                              className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                              onClick={() => perform(`/admin/conversations/${activeConversation.id}/takeover`)}
                              disabled={busy}
                            >
                              <IconHeadset size={16} /> Takeover
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                              onClick={() => perform(`/admin/conversations/${activeConversation.id}/resume`)}
                              disabled={busy}
                            >
                              <IconRobot size={16} /> Resume AI
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Native Tabler Chat Component */}
                      <div className="card-body p-0">
                        <div className="chat chat-history-container">
                          <div className="chat-bubbles">
                            {messages.map((m) => {
                              const isMe = m.direction === "outgoing";
                              return (
                                <div
                                  key={m.id}
                                  className={`chat-item d-flex ${isMe ? "justify-content-end" : "justify-content-start"}`}
                                >
                                  <div
                                    className={`chat-bubble ${isMe ? "chat-bubble-me" : ""}`}
                                    style={{ maxWidth: "78%" }}
                                  >
                                    <div className="chat-bubble-title d-flex align-items-center justify-content-between gap-3">
                                      <div className="chat-bubble-author text-truncate">
                                        {isMe ? "AI Assistant / Operator" : activeConversation.customer_name}
                                      </div>
                                      <div className="chat-bubble-date fs-6">
                                        {timeLabel(m.created_at)}
                                      </div>
                                    </div>
                                    <div className="chat-bubble-body" style={{ whiteSpace: "pre-wrap" }}>
                                      {m.text}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {messages.length === 0 && (
                              <div className="text-center text-secondary py-5">
                                Ushbu suhbatda hali xabarlar yo'q
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chat message composer */}
                      <div className="card-footer">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void sendReply();
                          }}
                        >
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Mijozga operator sifatida javob yozing..."
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              disabled={busy}
                            />
                            <button
                              type="submit"
                              className="btn btn-primary d-flex align-items-center gap-1"
                              disabled={busy || !draft.trim()}
                            >
                              <IconSend size={16} />
                              Yuborish
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="card-body text-center text-secondary py-5">
                        <IconMessages size={48} className="mb-3 text-muted" />
                        <p>Chap tarafdagi ro'yxatdan birorta suhbatni tanlang</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Customer Profile & Details Panel */}
                <div className="col-md-3 col-lg-3">
                  {activeConversation ? (
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Mijoz Profili</h3>
                      </div>
                      <div className="card-body">
                        <div className="text-center mb-3">
                          <span className="avatar avatar-xl rounded bg-primary-lt">
                            {activeConversation.customer_name.slice(0, 2).toUpperCase()}
                          </span>
                          <h3 className="m-0 mb-1 mt-2">{activeConversation.customer_name}</h3>
                          <div className="text-secondary">
                            {activeConversation.username ? `@${activeConversation.username}` : "Username ko'rsatilmagan"}
                          </div>
                        </div>

                        <div className="list-group list-group-flush mb-3">
                          <div className="list-group-item px-0 d-flex justify-content-between">
                            <span className="text-secondary">Telegram Chat ID:</span>
                            <span className="font-monospace">{activeConversation.chat_id}</span>
                          </div>
                          <div className="list-group-item px-0 d-flex justify-content-between">
                            <span className="text-secondary">Status:</span>
                            {activeConversation.status === "ai_active" ? (
                              <span className="badge bg-green-lt">AI Boshqaruvida</span>
                            ) : (
                              <span className="badge bg-warning-lt">Operator Nazorati</span>
                            )}
                          </div>
                          <div className="list-group-item px-0 d-flex justify-content-between">
                            <span className="text-secondary">Xabarlar soni:</span>
                            <span className="fw-bold">{messages.length}</span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Operator eslatmasi (Notes):</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Mijoz haqida qisqacha eslatma yozing..."
                            value={customerNotes[activeConversation.id] || ""}
                            onChange={(e) =>
                              setCustomerNotes({
                                ...customerNotes,
                                [activeConversation.id]: e.target.value,
                              })
                            }
                          ></textarea>
                        </div>

                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              alert("Mijozga test xabarnomasi yuborildi");
                            }}
                          >
                            Katalog taklifini yuborish
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* 3. KNOWLEDGE BASE TAB */}
            {tab === "knowledge" && (
              <div className="row row-deck row-cards">
                {/* CONNECTED CHANNELS CARD */}
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Ulangan Telegram Kanallar ({channels.length})</h3>
                        <p className="card-subtitle">
                          Bir nechta kanallarni ulashingiz mumkin. Barcha kanallardagi postlar birlashtirilib AI bilim bazasiga olinadi.
                        </p>
                      </div>
                      <div className="card-actions">
                        <button
                          className="btn btn-outline-primary d-flex align-items-center gap-1"
                          onClick={() => handleSyncChannel()}
                          disabled={busy || channels.length === 0}
                        >
                          <IconRefresh size={18} className={busy ? "spin" : ""} />
                          Barcha kanallarni sinxronlash
                        </button>
                      </div>
                    </div>

                    <div className="card-body border-bottom py-3">
                      <form onSubmit={handleConnectChannel} className="d-flex gap-2">
                        <div className="input-icon flex-grow-1">
                          <span className="input-icon-addon">
                            <IconPlus size={18} />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Telegram kanal username yoki havolasi (masalan: @kanal_nomi yoki https://t.me/kanal_nomi)"
                            value={newChannelInput}
                            onChange={(e) => setNewChannelInput(e.target.value)}
                            disabled={busy}
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary d-flex align-items-center gap-1 text-nowrap"
                          disabled={busy || !newChannelInput.trim()}
                        >
                          <IconPlus size={18} /> Kanal ulash
                        </button>
                      </form>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-vcenter card-table">
                        <thead>
                          <tr>
                            <th>Kanal</th>
                            <th>Status</th>
                            <th>Postlar</th>
                            <th>So'nggi Sinxron</th>
                            <th className="text-end">Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {channels.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-secondary py-3">
                                Hozircha hech qanday kanal ulanmagan. Yuqoridagi maydondan kanal havolasini kiriting.
                              </td>
                            </tr>
                          ) : (
                            channels.map((ch) => (
                              <tr key={ch.id}>
                                <td>
                                  <span className="badge bg-blue-lt me-2 font-monospace fs-6">@{ch.channel_username}</span>
                                  <a
                                    href={`https://t.me/${ch.channel_username}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-secondary small d-inline-flex align-items-center gap-1"
                                  >
                                    <IconExternalLink size={13} /> ochish
                                  </a>
                                </td>
                                <td>
                                  <span className="badge bg-success-lt">Faol</span>
                                </td>
                                <td>
                                  <strong>{ch.posts_count}</strong> ta post
                                </td>
                                <td className="text-secondary small">
                                  {timeLabel(ch.last_synced_at)}
                                </td>
                                <td className="text-end">
                                  <div className="btn-list justify-content-end">
                                    <button
                                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                      onClick={() => handleSyncChannel(ch.channel_username)}
                                      disabled={busy}
                                      title="Kanalni sinxronlash"
                                    >
                                      <IconRefresh size={14} className={busy ? "spin" : ""} />
                                      Sinxronlash
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                                      onClick={() => handleDeleteChannel(ch.channel_username)}
                                      disabled={busy}
                                      title="Kanalni o'chirish"
                                    >
                                      <IconTrash size={14} />
                                      O'chirish
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* POSTS LIST CARD */}
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Telegram Mahsulotlar Bazasi</h3>
                        <p className="card-subtitle">
                          {channelFilter === "all"
                            ? `Jami ${posts.length} ta post saqlangan`
                            : `@${channelFilter} kanalidagi postlar (${posts.filter((p) => p.channel_username === channelFilter).length} ta)`}
                        </p>
                      </div>
                      <div className="card-actions d-flex align-items-center gap-2">
                        {channels.length > 1 && (
                          <div className="d-flex align-items-center gap-1">
                            <span className="text-secondary small">Kanal:</span>
                            <select
                              className="form-select form-select-sm w-auto"
                              value={channelFilter}
                              onChange={(e) => setChannelFilter(e.target.value)}
                            >
                              <option value="all">Barcha kanallar ({posts.length})</option>
                              {channels.map((ch) => (
                                <option key={ch.id} value={ch.channel_username}>
                                  @{ch.channel_username} ({posts.filter((p) => p.channel_username === ch.channel_username).length})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-hover">
                        <thead>
                          <tr>
                            <th className="w-1">ID</th>
                            <th>Telegram Post</th>
                            <th>Kanal</th>
                            <th>AI Rasm Tahlili (Vision)</th>
                            <th>Manba</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posts
                            .filter((p) => channelFilter === "all" || p.channel_username === channelFilter)
                            .map((p) => (
                              <tr key={p.id}>
                                <td className="text-secondary font-monospace">#{p.telegram_message_id}</td>
                                <td style={{ maxWidth: "420px" }}>
                                  <div className="text-truncate fw-medium">{p.text.slice(0, 100)}...</div>
                                </td>
                                <td>
                                  <span className="badge bg-azure-lt font-monospace">@{p.channel_username}</span>
                                </td>
                                <td className="text-secondary" style={{ maxWidth: "340px" }}>
                                  {p.image_description || "Rasm mavjud emas"}
                                </td>
                                <td>
                                  {p.source_url ? (
                                    <a
                                      href={p.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                    >
                                      <IconExternalLink size={14} /> Post
                                    </a>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          {posts.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center text-secondary py-4">
                                Postlar mavjud emas. Yuqoridan kanal qo'shing va sinxronlash tugmasini bosing.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRODUCTS TAB */}
            {tab === "products" && (
              <div className="row row-deck row-cards">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Mahsulotlar Katalogi ({filteredProducts.length})</h3>
                      <div className="card-actions d-flex gap-2">
                        <div className="input-icon">
                          <span className="input-icon-addon">
                            <IconSearch size={16} />
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Noutbuk nomini izlash..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>
                        <button
                          className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                          onClick={() => alert("Kanal postlaridan avtomatik yangi mahsulotlar qo'shiladi")}
                        >
                          <IconPlus size={16} /> Yangi noutbuk
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-striped">
                        <thead>
                          <tr>
                            <th className="w-1">Model Kodi</th>
                            <th>Noutbuk Nomi</th>
                            <th>Kategoriya</th>
                            <th>Xarakteristikasi (Specs)</th>
                            <th>Narxi</th>
                            <th>Status</th>
                            <th>Kafolat</th>
                            <th className="w-1">Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map((prod) => (
                            <tr key={prod.id}>
                              <td className="font-monospace text-secondary">{prod.id}</td>
                              <td className="fw-bold">{prod.name}</td>
                              <td>
                                <span className="badge bg-blue-lt">{prod.category}</span>
                              </td>
                              <td className="text-secondary">{prod.specs}</td>
                              <td className="fw-bold text-success">{prod.price}</td>
                              <td>
                                {prod.stock === "In Stock" && (
                                  <span className="badge bg-green-lt text-green">Mavjud</span>
                                )}
                                {prod.stock === "Low Stock" && (
                                  <span className="badge bg-warning-lt text-warning">Kam qoldi</span>
                                )}
                                {prod.stock === "Pre-order" && (
                                  <span className="badge bg-secondary-lt">Buyurtmaga</span>
                                )}
                              </td>
                              <td className="text-secondary">{prod.warranty}</td>
                              <td>
                                <div className="btn-list flex-nowrap">
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => alert(`${prod.name} tahrirlash ochildi`)}
                                  >
                                    <IconPencil size={14} />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => {
                                      if (confirm(`${prod.name} o'chirilsinmi?`)) {
                                        setProducts((prev) => prev.filter((p) => p.id !== prod.id));
                                      }
                                    }}
                                  >
                                    <IconTrash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ORDERS TAB */}
            {tab === "orders" && (
              <div className="row row-deck row-cards">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Buyurtmalar Ro'yxati ({filteredOrders.length})</h3>
                      <div className="card-actions">
                        <div className="input-icon">
                          <span className="input-icon-addon">
                            <IconSearch size={16} />
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Mijoz yoki buyurtma ID..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-hover">
                        <thead>
                          <tr>
                            <th>Buyurtma ID</th>
                            <th>Mijoz</th>
                            <th>Mahsulot</th>
                            <th>Summa</th>
                            <th>Status</th>
                            <th>Sana</th>
                            <th>Kanal</th>
                            <th className="w-1">Amal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((ord) => (
                            <tr key={ord.id}>
                              <td className="font-monospace fw-bold">{ord.id}</td>
                              <td>
                                <div className="fw-medium">{ord.customer}</div>
                                <small className="text-secondary">{ord.username}</small>
                              </td>
                              <td>{ord.product}</td>
                              <td className="fw-bold">{ord.amount}</td>
                              <td>
                                {ord.status === "Confirmed" && (
                                  <span className="badge bg-green-lt text-green">Tasdiqlangan</span>
                                )}
                                {ord.status === "Processing" && (
                                  <span className="badge bg-blue-lt text-blue">Jarayonda</span>
                                )}
                                {ord.status === "New" && (
                                  <span className="badge bg-yellow-lt text-yellow">Yangi</span>
                                )}
                                {ord.status === "Completed" && (
                                  <span className="badge bg-secondary-lt">Bajarilgan</span>
                                )}
                              </td>
                              <td className="text-secondary">{ord.date}</td>
                              <td>
                                <span className="badge bg-azure-lt">{ord.channel}</span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => alert(`${ord.id} buyurtma tafsilotlari`)}
                                >
                                  Ko'rish
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CUSTOMERS TAB */}
            {tab === "customers" && (
              <div className="row row-deck row-cards">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Mijozlar Katalogi</h3>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-striped">
                        <thead>
                          <tr>
                            <th>Mijoz Nomi</th>
                            <th>Username</th>
                            <th>Chat ID</th>
                            <th>Holati</th>
                            <th>Oxirgi Muloqot</th>
                            <th className="w-1">Amal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversations.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span className="avatar avatar-sm me-2 rounded bg-primary-lt">
                                    {c.customer_name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="fw-medium">{c.customer_name}</span>
                                </div>
                              </td>
                              <td className="text-secondary">{c.username ? `@${c.username}` : "—"}</td>
                              <td className="font-monospace text-secondary">{c.chat_id}</td>
                              <td>
                                {c.status === "ai_active" ? (
                                  <span className="badge bg-green-lt">AI Boshqaruvida</span>
                                ) : (
                                  <span className="badge bg-yellow-lt">Operator Qabulida</span>
                                )}
                              </td>
                              <td className="text-secondary">{timeLabel(c.last_message_at)}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setSelected(c.id);
                                    setTab("inbox");
                                  }}
                                >
                                  Chatni ochish
                                </button>
                              </td>
                            </tr>
                          ))}
                          {conversations.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center text-secondary py-4">
                                Mijozlar ma'lumotlari topilmadi
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. ANALYTICS TAB */}
            {tab === "analytics" && (
              <div className="row row-deck row-cards">
                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="subheader">Konversiya darajasi</div>
                      <div className="h1 mb-2">34.8%</div>
                      <div className="text-success d-flex align-items-center">
                        <IconTrendingUp size={16} className="me-1" /> +4.2% o'tgan haftaga nisbatan
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="subheader">O'rtacha javob vaqti</div>
                      <div className="h1 mb-2">1.8 soniya</div>
                      <div className="text-success d-flex align-items-center">
                        <IconBolt size={16} className="me-1" /> Yuqori tezlikda
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="subheader">AI Avtonomiya koeffitsienti</div>
                      <div className="h1 mb-2">91.4%</div>
                      <div className="text-secondary">Operator yordamisiz to'liq javob</div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="subheader">Mijozlar roziligi (CSAT)</div>
                      <div className="h1 mb-2">4.9 / 5.0</div>
                      <div className="text-success">A'lo darajada</div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Murojaatlar Taqsimoti (Kunlik)</h3>
                    </div>
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary">Ertalabki soatlar (08:00 - 12:00)</span>
                        <span className="fw-bold">28% (64 ta murojaat)</span>
                      </div>
                      <div className="progress mb-4" style={{ height: "8px" }}>
                        <div className="progress-bar bg-primary" style={{ width: "28%" }}></div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary">Tushdan keyin (12:00 - 18:00)</span>
                        <span className="fw-bold">52% (120 ta murojaat)</span>
                      </div>
                      <div className="progress mb-4" style={{ height: "8px" }}>
                        <div className="progress-bar bg-success" style={{ width: "52%" }}></div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary">Kechki soatlar (18:00 - 23:00)</span>
                        <span className="fw-bold">20% (46 ta murojaat)</span>
                      </div>
                      <div className="progress" style={{ height: "8px" }}>
                        <div className="progress-bar bg-info" style={{ width: "20%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Eng ko'p so'ralgan modellar</h3>
                    </div>
                    <div className="card-body">
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>Asus TUF Gaming FX505GE</span>
                          <span className="badge bg-primary">48 so'rov</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>Apple MacBook Air M1</span>
                          <span className="badge bg-primary">36 so'rov</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>Lenovo ThinkPad E14</span>
                          <span className="badge bg-primary">29 so'rov</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>HP Victus 15</span>
                          <span className="badge bg-primary">22 so'rov</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. AI SETTINGS TAB */}
            {tab === "settings" && (
              <div className="row row-deck row-cards">
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">AI Konfiguratsiyasi va Modellari</h3>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label">Asosiy AI Modeli</label>
                        <select
                          className="form-select"
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                        >
                          <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Tavsiya etiladi - ultra tez)</option>
                          <option value="gemini-3.8-flash">gemini-3.8-flash (Yuqori aniqlik)</option>
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Zaxira modeli)</option>
                        </select>
                        <small className="form-hint">
                          Telegram xabarlariga 1-2 soniyada javob qaytarish uchun yengil va optimallashgan model.
                        </small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Kreativlik darajasi (Temperature): <strong>{aiTemperature}</strong>
                        </label>
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={aiTemperature}
                          onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                        />
                        <div className="d-flex justify-content-between text-secondary fs-6">
                          <span>Aniq va faktik (0.0)</span>
                          <span>Muvozanatli (0.2)</span>
                          <span>Ijodiy (1.0)</span>
                        </div>
                      </div>

                      <hr className="my-4" />

                      <div className="mb-3">
                        <label className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={autoHandoff}
                            onChange={(e) => setAutoHandoff(e.target.checked)}
                          />
                          <span className="form-check-label">
                            Avtomatik Takeover (Mijoz operator talab qilsa darhol insonga o'tkazish)
                          </span>
                        </label>
                      </div>

                      <div className="mb-3">
                        <label className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={doubleConfirmation}
                            onChange={(e) => setDoubleConfirmation(e.target.checked)}
                          />
                          <span className="form-check-label">
                            Dublyor tasdiqlash va "typing..." statusini ko'rsatish
                          </span>
                        </label>
                      </div>

                      <div className="mb-3">
                        <label className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={businessHoursOnly}
                            onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                          />
                          <span className="form-check-label">
                            Faqat ish vaqtida faol bo'lish (09:00 - 20:00)
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="card-footer text-end">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSuccess("AI sozlamalari muvaffaqiyatli saqlandi!");
                        }}
                      >
                        Sozlamalarni saqlash
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Tizim Ma'lumotlari</h3>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <div className="text-secondary fs-6">Frontend Framework:</div>
                        <div className="fw-bold">Next.js 15 + Native Tabler UI</div>
                      </div>
                      <div className="mb-3">
                        <div className="text-secondary fs-6">Backend API:</div>
                        <div className="fw-bold">FastAPI + SQLAlchemy + Asyncpg</div>
                      </div>
                      <div className="mb-3">
                        <div className="text-secondary fs-6">Telegram Integratsiyasi:</div>
                        <div className="fw-bold">Telegram Business Connection API</div>
                      </div>
                      <div className="mb-3">
                        <div className="text-secondary fs-6">Ulangan Kanallar:</div>
                        <div className="fw-bold">
                          {channels.length > 0
                            ? channels.map((c) => `@${c.channel_username}`).join(", ")
                            : "Kanal ulanmagan"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. ADMINISTRATION TAB */}
            {tab === "admins" && (
              <div className="row row-deck row-cards">
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Administratorlar Ro'yxati ({admins.length})</h3>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-hover">
                        <thead>
                          <tr>
                            <th>Admin</th>
                            <th>Telegram ID</th>
                            <th>Roli</th>
                            <th>Ruxsatlar</th>
                            <th className="w-1">O'chirish</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((adm) => (
                            <tr key={adm.id}>
                              <td>
                                <div className="fw-medium">{adm.name || "Noma'lum"}</div>
                                <div className="text-secondary">
                                  {adm.username ? `@${adm.username}` : "—"}
                                </div>
                              </td>
                              <td className="font-monospace text-secondary">{adm.telegram_user_id}</td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={adm.role}
                                  onChange={(e) => handleRoleChange(adm.telegram_user_id, e.target.value)}
                                  disabled={busy}
                                >
                                  <option value="owner">Owner</option>
                                  <option value="admin">Admin</option>
                                  <option value="moderator">Moderator</option>
                                </select>
                              </td>
                              <td>
                                <div className="d-flex flex-wrap gap-1">
                                  {Object.entries(adm.permissions || {}).map(([key, val]) => (
                                    <button
                                      key={key}
                                      type="button"
                                      className={`badge btn ${val ? "bg-green-lt text-green" : "bg-secondary-lt text-secondary"}`}
                                      onClick={() => handleTogglePermission(adm.telegram_user_id, key, val)}
                                      disabled={busy}
                                      title={PERMISSION_LABELS[key] || key}
                                    >
                                      {key.replace("can_", "")}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteAdmin(adm.telegram_user_id, adm.name)}
                                  disabled={busy}
                                >
                                  <IconTrash size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {admins.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center text-secondary py-4">
                                Administratorlar topilmadi
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Yangi Admin Qo'shish</h3>
                    </div>
                    <form onSubmit={handleAddAdmin}>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="new-admin-id">
                            Telegram User ID <span className="text-danger">*</span>
                          </label>
                          <input
                            id="new-admin-id"
                            type="number"
                            className="form-control"
                            placeholder="Masalan: 12345678"
                            value={newAdminId}
                            onChange={(e) => setNewAdminId(e.target.value)}
                            required
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label" htmlFor="new-admin-name">
                            Admin Ismi
                          </label>
                          <input
                            id="new-admin-name"
                            type="text"
                            className="form-control"
                            placeholder="Alisher Zokirov"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label" htmlFor="new-admin-user">
                            Telegram Username
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">@</span>
                            <input
                              id="new-admin-user"
                              type="text"
                              className="form-control"
                              placeholder="username"
                              value={newAdminUsername}
                              onChange={(e) => setNewAdminUsername(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label" htmlFor="new-admin-role">
                            Dastlabki Roli
                          </label>
                          <select
                            id="new-admin-role"
                            className="form-select"
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value as "admin" | "moderator")}
                          >
                            <option value="moderator">Moderator (Suhbatlarga javob berish)</option>
                            <option value="admin">Admin (To'liq boshqaruv)</option>
                          </select>
                        </div>
                      </div>
                      <div className="card-footer text-end">
                        <button type="submit" className="btn btn-primary" disabled={busy || !newAdminId.trim()}>
                          Adminni saqlash
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* 10. TEAM & ACCESS TAB */}
            {tab === "team" && (
              <div className="row row-deck row-cards">
                <div className="col-12">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h3 className="card-title">Rollar va Ruxsatlar Matritsasi</h3>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="card border">
                            <div className="card-body">
                              <span className="badge bg-purple-lt mb-2">Owner</span>
                              <h4>Bosh Ega</h4>
                              <p className="text-secondary fs-5">
                                Barcha huquqlar to'liq berilgan. Adminlarni qo'shish, o'chirish va tizim sozlamalarini o'zgartirish huquqiga ega.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border">
                            <div className="card-body">
                              <span className="badge bg-blue-lt mb-2">Admin</span>
                              <h4>Tizim Menejeri</h4>
                              <p className="text-secondary fs-5">
                                Suhbatlar, kataloglar, buyurtmalar va bilimlarni to'liq boshqarishi mumkin.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border">
                            <div className="card-body">
                              <span className="badge bg-green-lt mb-2">Moderator</span>
                              <h4>Sotuvchi Operator</h4>
                              <p className="text-secondary fs-5">
                                Faqat jonli suhbatlarga javob berish va mijozlar bilan muloqot qilish vakolatiga ega.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 11. ACTIVITY LOGS TAB */}
            {tab === "logs" && (
              <div className="row row-deck row-cards">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Tizim Amallari Jurnali (Audit Logs)</h3>
                      <div className="card-actions">
                        <span className="badge bg-green-lt">Real-time Logging</span>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-hover">
                        <thead>
                          <tr>
                            <th>Vaqt</th>
                            <th>Foydalanuvchi / Servis</th>
                            <th>Amal</th>
                            <th>Tafsilotlar</th>
                            <th>Holat</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-secondary font-monospace">Hozirgina</td>
                            <td>
                              <span className="badge bg-blue-lt">AI Engine</span>
                            </td>
                            <td>Avtomatik mijozga javob</td>
                            <td>Mijozga noutbuk parametrlari yuborildi</td>
                            <td>
                              <span className="badge bg-green-lt text-green">Muvaffaqiyatli</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary font-monospace">18:24</td>
                            <td>
                              <span className="badge bg-purple-lt">Telegram Webhook</span>
                            </td>
                            <td>Yangi buyurtma yaratildi</td>
                            <td>ORD-9421 - Asus TUF Gaming</td>
                            <td>
                              <span className="badge bg-green-lt text-green">Muvaffaqiyatli</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary font-monospace">16:40</td>
                            <td>
                              <span className="badge bg-secondary-lt">Sync Cron</span>
                            </td>
                            <td>Kanal postlari tekshirildi</td>
                            <td>12 ta yangi post sinxronlandi</td>
                            <td>
                              <span className="badge bg-green-lt text-green">OK</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary font-monospace">14:15</td>
                            <td>
                              <span className="badge bg-warning-lt text-warning">Operator</span>
                            </td>
                            <td>Takeover amalga oshirildi</td>
                            <td>Chat #4 inson nazoratiga olindi</td>
                            <td>
                              <span className="badge bg-blue-lt">Qabul qilindi</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            PAGE FOOTER
            ======================================================== */}
        <footer className="footer footer-transparent d-print-none mt-auto py-3">
          <div className="container-xl">
            <div className="row text-center align-items-center flex-row-reverse">
              <div className="col-lg-auto ms-lg-auto">
                <ul className="list-inline list-inline-dots mb-0">
                  <li className="list-inline-item">
                    <a href="https://github.com/tabler/tabler" target="_blank" rel="noreferrer" className="link-secondary">
                      Tabler Framework
                    </a>
                  </li>
                  <li className="list-inline-item">
                    <span className="link-secondary">Telegram AI Sales Assistant</span>
                  </li>
                </ul>
              </div>
              <div className="col-12 col-lg-auto mt-3 mt-lg-0">
                <ul className="list-inline list-inline-dots mb-0">
                  <li className="list-inline-item">
                    © 2026 AI Sales Control Center. Barcha huquqlar himoyalangan.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
