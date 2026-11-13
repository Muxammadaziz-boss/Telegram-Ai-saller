"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconActivity,
  IconAdjustments,
  IconAlertCircle,
  IconArrowUpRight,
  IconArrowRight,
  IconBolt,
  IconBrandApple,
  IconBrandTelegram,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconCrown,
  IconDatabase,
  IconDeviceMobile,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconHeadset,
  IconHelpCircle,
  IconHistory,
  IconKey,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLock,
  IconLogout,
  IconMessageDots,
  IconMessages,
  IconMoon,
  IconPackage,
  IconPalette,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconSend,
  IconServer,
  IconSettings,
  IconShieldCheck,
  IconShieldLock,
  IconShoppingCart,
  IconSparkles,
  IconSun,
  IconTrash,
  IconTrendingUp,
  IconUpload,
  IconUser,
  IconUserCheck,
  IconUserCircle,
  IconUsers,
  IconUsersGroup,
  IconX,
  IconBuildingSkyscraper,
  IconGauge,
  IconCreditCard,
  IconCoin,
  IconChartBar,
} from "@tabler/icons-react";

import { UsageTab } from "./components/saas/UsageTab";
import { BillingTab } from "./components/saas/BillingTab";
import { PricingTab } from "./components/saas/PricingTab";
import { PlatformOwnerTab } from "./components/saas/PlatformOwnerTab";
import { OnboardingModal } from "./components/saas/OnboardingModal";
import { UpgradeModal } from "./components/saas/UpgradeModal";

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
  status: "New" | "Processing" | "Confirmed" | "Completed" | "Cancelled" | string;
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
  can_manage_settings: "Sozlamalarni boshqarish",
};

function cleanTelegramUsername(val?: string | null): string {
  if (!val) return "";
  return val
    .trim()
    .replace(/^https?:\/\/(www\.)?t\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^@+/, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

const PERMISSION_CATEGORIES = [
  {
    category: "Mijozlar va Jonli Suhbatlar",
    icon: "💬",
    description: "Mijozlar bilan yozishmalar va AI assistent boshqaruvi",
    permissions: [
      { key: "can_view_conversations", label: "Suhbatlarni ko'rish", desc: "Mijozlar bilan barcha jonli yozishmalarni o'qish" },
      { key: "can_reply_customers", label: "Mijozlarga javob berish", desc: "Telegram orqali mijozlarga bevosita xabar yozish" },
      { key: "can_takeover", label: "Suhbatni qabul qilish", desc: "AI ni to'xtatib, suhbatni o'z nazoratiga olish (Takeover)" },
      { key: "can_resume_ai", label: "AI ni qayta yoqish", desc: "Suhbatni qaytadan AI avtomatik rejimiga o'tkazish" },
    ],
  },
  {
    category: "Mahsulotlar va Buyurtmalar",
    icon: "📦",
    description: "Katalog, Telegram kanal bazasi va savdo buyurtmalari",
    permissions: [
      { key: "can_view_knowledge", label: "Bilim bazasini ko'rish", desc: "Telegram kanalidagi postlar va mahsulotlar ro'yxatini ko'rish" },
      { key: "can_manage_knowledge", label: "Bilim bazasini boshqarish", desc: "Yangi postlarni sinxronlash va kanalni tekshirish" },
      { key: "can_view_orders", label: "Buyurtmalarni ko'rish", desc: "Shakllangan barcha buyurtmalar va shartnomalarni ko'rish" },
      { key: "can_manage_orders", label: "Buyurtmalarni boshqarish", desc: "Buyurtma holatini tasdiqlash, rad etish yoki tahrirlash" },
    ],
  },
  {
    category: "Tizim, Tahlil va Adminlar",
    icon: "⚙️",
    description: "Umumiy statistika, tizim parametrlari va jamoa",
    permissions: [
      { key: "can_view_analytics", label: "Statistikani ko'rish", desc: "Savdo va konversiya ko'rsatkichlarini kuzatish" },
      { key: "can_manage_settings", label: "Sozlamalarni boshqarish", desc: "AI modeli, harorati va tizim sozlamalarini o'zgartirish" },
      { key: "can_manage_admins", label: "Adminlarni boshqarish", desc: "Yangi admin qo'shish va huquqlarini belgilash" },
    ],
  },
];

const INITIAL_PRODUCTS: ProductItem[] = [];
const INITIAL_ORDERS: OrderItem[] = [];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const currentOrgId = typeof window !== "undefined" ? localStorage.getItem("active_org_id") || "1" : "1";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Organization-Id": currentOrgId,
    ...(options?.headers as Record<string, string> || {}),
  };
  const response = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    rawText = "";
  }
  let data: any = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    data = {};
  }
  if (!response.ok) {
    if (data.error === "FEATURE_NOT_AVAILABLE" || data.error === "LIMIT_EXCEEDED" || response.status === 402) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("saas-upgrade-needed", { detail: data }));
      }
    }
    const errorDetail =
      data.detail ||
      (typeof data.message === "string" ? data.message : "") ||
      (rawText.length < 200 && rawText ? rawText : `HTTP ${response.status}`);
    throw new Error(errorDetail);
  }
  return data as T;
}

function timeLabel(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return `${d.getDate()}-${months[d.getMonth()]}, ${time}`;
}

function formatChatTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (isToday) return time;

  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return `${d.getDate()}-${months[d.getMonth()]}, ${time}`;
}

function AppLogo({
  src,
  size = "md",
  className = "",
}: {
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const currentSrc = src || "/logo.svg";

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const dims = {
    sm: { size: 28 },
    md: { size: 38 },
    lg: { size: 52 },
    xl: { size: 68 },
  }[size];

  if (imgError) {
    return (
      <span
        className={`avatar bg-primary text-white rounded-3 shadow-sm ${className}`}
        style={{
          width: dims.size,
          height: dims.size,
          minWidth: dims.size,
        }}
      >
        <IconSparkles size={Math.round(dims.size * 0.55)} />
      </span>
    );
  }

  return (
    <div
      className={`app-brand-logo-container ${className}`}
      style={{
        width: dims.size,
        height: dims.size,
        minWidth: dims.size,
      }}
    >
      <img
        src={currentSrc}
        alt="Brand Logo"
        width={dims.size}
        height={dims.size}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

const DEFAULT_TG_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' rx='22' fill='%236366f1'/><text x='50%' y='54%' font-size='14' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='middle'>TG</text></svg>";

function TelegramUserAvatar({
  userId,
  name,
  size = "md",
  className = "",
  isSelected = false,
}: {
  userId?: number | string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isSelected?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [userId]);

  const sizeMap = {
    xs: { className: "avatar-xs", iconSize: 13, px: 24 },
    sm: { className: "avatar-sm", iconSize: 16, px: 32 },
    md: { className: "", iconSize: 20, px: 38 },
    lg: { className: "avatar-lg", iconSize: 26, px: 48 },
    xl: { className: "avatar-xl", iconSize: 34, px: 64 },
  }[size];

  const hasAvatar = Boolean(userId) && !imgError;
  const avatarUrl = userId ? `/api/proxy?path=/admin/users/${userId}/avatar` : "";

  return (
    <span
      className={`avatar ${sizeMap.className} rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden ${className}`}
      style={{
        background: isSelected
          ? "#ffffff"
          : "linear-gradient(135deg, rgba(34, 158, 217, 0.22) 0%, rgba(0, 136, 204, 0.12) 100%)",
        color: isSelected ? "#0088cc" : "#229ed9",
        border: isSelected ? "none" : "1px solid rgba(34, 158, 217, 0.3)",
        boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
        width: sizeMap.px,
        height: sizeMap.px,
        minWidth: sizeMap.px,
      }}
      title={name || "Telegram Foydalanuvchisi"}
    >
      {hasAvatar ? (
        <img
          src={avatarUrl}
          alt={name || "Avatar"}
          width={sizeMap.px}
          height={sizeMap.px}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <IconBrandTelegram size={sizeMap.iconSize} />
      )}
    </span>
  );
}

function MiniSparkline({
  data,
  color = "#206bc4",
  id,
  height = 36,
}: {
  data: number[];
  color?: string;
  id: string;
  height?: number;
}) {
  const width = 140;
  const safeData = data.length >= 2 ? data : [data[0] || 0, data[0] || 0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData) || 1;
  const range = max - min || 1;
  const padding = 3;
  const effectiveHeight = height - padding * 2;

  const points = safeData.map((val, idx) => {
    const x = (idx / (safeData.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * effectiveHeight;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const lastPoint = points[points.length - 1];
  const topPct = (lastPoint.y / height) * 100;

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="sparkline-svg"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <linearGradient id={`sparkGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#sparkGrad-${id})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Standalone HTML circular dot — perfectly round, immune to SVG non-uniform aspect ratio stretch */}
      <div
        className="sparkline-dot"
        style={{
          position: "absolute",
          right: "2px",
          top: `calc(${topPct}% - 4px)`,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 0 3px ${color}33, 0 0 8px ${color}99`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export interface DashboardUser {
  userId: number;
  email?: string;
  role?: string;
  organizationId?: number;
  isPlatformOwner?: boolean;
}

export interface DashboardProps {
  initialAuthenticated?: boolean;
  initialUser?: DashboardUser | null;
  initialZone?: "platform" | "tenant";
  initialTenantSlug?: string;
}

export default function Dashboard({
  initialAuthenticated = false,
  initialUser = null,
  initialZone,
  initialTenantSlug,
}: DashboardProps) {
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(initialUser);
  const isPlatformOwner = Boolean(
    currentUser?.isPlatformOwner || currentUser?.role === "owner"
  );

  const [zone, setZone] = useState<"platform" | "tenant">(() => {
    if (initialZone) return initialZone;
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/platform")) return "platform";
      if (window.location.pathname.startsWith("/t/")) return "tenant";
    }
    return isPlatformOwner ? "platform" : "tenant";
  });

  const [platformSubTab, setPlatformSubTab] = useState<
    "overview" | "stores" | "users" | "plans" | "usage" | "system" | "audit"
  >("overview");

  const [isOwnerImpersonating, setIsOwnerImpersonating] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("owner_impersonating_store"));
    }
    return false;
  });

  const [activeStoreMeta, setActiveStoreMeta] = useState<{ id: number; name: string; slug: string } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("owner_impersonating_store");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [tab, setTab] = useState<
    "overview" | "inbox" | "knowledge" | "products" | "orders" | "customers" | "analytics" | "settings" | "admins" | "team" | "logs" | "profile" | "usage" | "billing" | "pricing" | "platform"
  >(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const h = window.location.hash.replace("#", "");
      const valid = [
        "overview", "inbox", "knowledge", "products", "orders", "customers",
        "analytics", "settings", "admins", "team", "logs", "profile",
        "usage", "billing", "pricing", "platform"
      ];
      if (valid.includes(h)) return h as any;
    }
    return "overview";
  });

  // SaaS Multi-Tenant & Subscription States
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_org_id");
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<any>(null);
  const [platformOrgs, setPlatformOrgs] = useState<any[]>([]);
  const [upgradeModalConfig, setUpgradeModalConfig] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: string;
    message?: string;
  }>({ isOpen: false });

  // Organization Details & Telegram Bot Integration States
  const [currentOrgDetails, setCurrentOrgDetails] = useState<any>(null);
  const [botTokenInput, setBotTokenInput] = useState("");
  const [showBotToken, setShowBotToken] = useState(false);
  const [botTokenVerifying, setBotTokenVerifying] = useState(false);
  const [botTokenResult, setBotTokenResult] = useState<any>(null);
  const [customPromptInput, setCustomPromptInput] = useState("");
  const [webhookSetting, setWebhookSetting] = useState(false);
  const [webhookStatusChecking, setWebhookStatusChecking] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [savingOrgSettings, setSavingOrgSettings] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [uiStyle, setUiStyle] = useState<"tabler" | "ios">("tabler");
  const [logoUrl, setLogoUrl] = useState<string>("/logo.svg");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>("");
  const [activeAdminTelegramId, setActiveAdminTelegramId] = useState<number>(0);
  const [loginTelegramId, setLoginTelegramId] = useState<string>("");
  const [navAvatarError, setNavAvatarError] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customLogoInput, setCustomLogoInput] = useState("");
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
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<ProductItem>>({
    category: "Gaming",
    stock: "In Stock",
    warranty: "2 oy kafolat",
  });

  const [inboxFilter, setInboxFilter] = useState<"all" | "ai" | "human">("all");
  const [inboxSearch, setInboxSearch] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-dismiss notification toasts after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // New admin form state
  const [newAdminId, setNewAdminId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "moderator">("moderator");
  const [managingPermissionsAdmin, setManagingPermissionsAdmin] = useState<AdminUser | null>(null);

  // AI settings state
  const [aiModel, setAiModel] = useState("gemini-3.1-flash-lite");
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [doubleConfirmation, setDoubleConfirmation] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, c, p, a, s, chList, prodsList, ordersList] = await Promise.all([
        api<Overview>("/admin/overview"),
        api<Conversation[]>("/admin/conversations"),
        api<KnowledgePost[]>("/admin/knowledge"),
        api<AdminUser[]>("/admin/admins").catch(() => []),
        api<{ public_channel?: string }>("/admin/settings").catch(() => ({ public_channel: "" })),
        api<ConnectedChannel[]>("/admin/channels").catch(() => []),
        api<ProductItem[]>("/admin/products").catch(() => []),
        api<OrderItem[]>("/admin/orders").catch(() => []),
      ]);
      setOverview(o);
      setConversations(c);
      setPosts(p);
      setAdmins(a);
      setChannels(chList);
      setProducts(prodsList || []);
      setOrders(ordersList || []);
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
          if (data && data.authenticated) {
            setAuthenticated(true);
            if (data.user) {
              setCurrentUser(data.user);
              if (data.user.isPlatformOwner && !initialZone) {
                setZone("platform");
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }
  }, [authenticated, initialZone]);

  // Synchronize tab with URL hash on mount and hashchange
  useEffect(() => {
    const validTabs: Array<typeof tab> = [
      "overview",
      "inbox",
      "knowledge",
      "products",
      "orders",
      "customers",
      "analytics",
      "settings",
      "admins",
      "team",
      "logs",
      "profile",
      "usage",
      "billing",
      "pricing",
      "platform",
    ];

    const syncFromHash = () => {
      if (typeof window === "undefined") return;
      const h = window.location.hash.replace("#", "") as (typeof validTabs)[number];
      if (h && validTabs.includes(h)) {
        setTab(h);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Sync window URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const targetHash = `#${tab}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, "", targetHash);
      }
    }
  }, [tab]);

  // Live real-time polling every 6 seconds for overview and conversations
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      api<Overview>("/admin/overview").then(setOverview).catch(() => {});
      api<Conversation[]>("/admin/conversations").then(setConversations).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && selected !== null) void loadMessages(selected);
  }, [authenticated, selected, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      const savedStyle = localStorage.getItem("ai_sales_ui_style") as "tabler" | "ios" | null;
      if (savedStyle === "ios" || savedStyle === "tabler") {
        setUiStyle(savedStyle);
        document.documentElement.setAttribute("data-ui-style", savedStyle);
      } else {
        document.documentElement.setAttribute("data-ui-style", "tabler");
      }
    } catch {}
  }, []);

  const toggleUiStyle = () => {
    const next = uiStyle === "tabler" ? "ios" : "tabler";
    setUiStyle(next);
    document.documentElement.setAttribute("data-ui-style", next);
    try {
      localStorage.setItem("ai_sales_ui_style", next);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_sales_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ai_sales_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("ai_sales_custom_logo");
      if (savedLogo) {
        setLogoUrl(savedLogo);
        setCustomLogoInput(savedLogo);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("ai_sales_customer_notes");
      if (savedNotes) {
        setCustomerNotes((prev) => ({ ...prev, ...JSON.parse(savedNotes) }));
      }
    } catch {}
  }, []);

  function handleLogoUpload(file: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLogoUrl(result);
        setCustomLogoInput(result);
        try {
          localStorage.setItem("ai_sales_custom_logo", result);
        } catch {}
        setSuccess("Logotip muvaffaqiyatli o'rnatildi!");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSaveLogoUrl(url: string) {
    const trimmed = url.trim() || "/logo.svg";
    setLogoUrl(trimmed);
    try {
      if (trimmed === "/logo.svg") {
        localStorage.removeItem("ai_sales_custom_logo");
      } else {
        localStorage.setItem("ai_sales_custom_logo", trimmed);
      }
    } catch {}
    setSuccess("Logotip yangilandi!");
  }

  useEffect(() => {
    try {
      const savedAdminId = localStorage.getItem("ai_sales_active_admin_id");
      if (savedAdminId && !isNaN(Number(savedAdminId))) {
        setActiveAdminTelegramId(Number(savedAdminId));
        setLoginTelegramId(savedAdminId);
      }
      const savedAvatar = localStorage.getItem("ai_sales_admin_avatar");
      if (savedAvatar) {
        setAdminAvatarUrl(savedAvatar);
      }
    } catch {}
  }, []);



  function handleAdminAvatarUpload(file: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setAdminAvatarUrl(result);
        try {
          localStorage.setItem("ai_sales_admin_avatar", result);
        } catch {}
        setSuccess("Admin avatari muvaffaqiyatli o'rnatildi!");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleResetAdminAvatar() {
    setAdminAvatarUrl("");
    try {
      localStorage.removeItem("ai_sales_admin_avatar");
    } catch {}
    setSuccess("Admin avatari standart holatga qaytarildi!");
  }

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Kirish amalga oshmadi");
      setAuthenticated(true);
      if (loginTelegramId) {
        const num = Number(loginTelegramId);
        if (num && !isNaN(num)) {
          setActiveAdminTelegramId(num);
          setNavAvatarError(false);
          setProfileAvatarError(false);
          try {
            localStorage.setItem("ai_sales_active_admin_id", String(num));
          } catch {}
        }
      }
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Parol noto'g'ri");
    } finally {
      setLoggingIn(false);
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

  const currentAdmin = useMemo(
    () => admins.find((a) => a.telegram_user_id === activeAdminTelegramId) || (admins.length > 0 ? admins[0] : null),
    [admins, activeAdminTelegramId]
  );

  // Load SaaS tenant, subscription, usage, and financial metrics
  const loadSaaSData = useCallback(async (orgId?: number) => {
    try {
      const effectiveOrgId = orgId || activeOrgId;
      try {
        const sub = await api<any>(`/api/subscription?organization_id=${effectiveOrgId}`);
        setSubscriptionData(sub);
      } catch {}

      try {
        const usage = await api<any>(`/api/usage?organization_id=${effectiveOrgId}`);
        setUsageData(usage);
      } catch {}

      try {
        const pl = await api<any>("/api/plans");
        setPlansList(pl.plans || []);
      } catch {}

      try {
        const orgs = await api<any>("/api/organizations");
        setUserOrganizations(orgs.organizations || []);
      } catch {}

      try {
        const currentOrgRes = await api<any>(`/api/organizations/current?organization_id=${effectiveOrgId}`);
        if (currentOrgRes) {
          setCurrentOrgDetails(currentOrgRes);
          if (currentOrgRes.custom_system_prompt) {
            setCustomPromptInput(currentOrgRes.custom_system_prompt);
          }
        }
      } catch {}

      if (isPlatformOwner || currentAdmin?.role === "owner") {
        try {
          const m = await api<any>("/api/platform/metrics");
          setPlatformMetrics(m);
        } catch {}
        try {
          const o = await api<any>("/api/platform/organizations");
          setPlatformOrgs(o.organizations || []);
        } catch {}
      }
    } catch (e) {
      console.error("loadSaaSData error:", e);
    }
  }, [activeOrgId, isPlatformOwner, currentAdmin?.role]);

  const loadPlatformData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, o, u, h, a] = await Promise.all([
        api<any>("/api/platform/metrics").catch(() => null),
        api<any>("/api/platform/organizations").catch(() => ({ organizations: [] })),
        api<any>("/api/platform/users").catch(() => ({ users: [] })),
        api<any>("/api/platform/system-health").catch(() => null),
        api<any>("/api/platform/audit-logs").catch(() => ({ logs: [] })),
      ]);
      if (m) setPlatformMetrics(m);
      if (o?.organizations) setPlatformOrgs(o.organizations);
      if (u?.users) setPlatformUsers(u.users);
      if (h) setSystemHealth(h);
      if (a?.logs) setAuditLogs(a.logs);
    } catch (e) {
      console.error("loadPlatformData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (zone === "platform") {
      void loadPlatformData();
    } else {
      void load();
      void loadSaaSData(activeOrgId);
    }
  }, [authenticated, zone, activeOrgId, loadPlatformData, load, loadSaaSData]);

  // Handle Saas Upgrade event
  useEffect(() => {
    const handleUpgradeNeeded = (evt: any) => {
      const detail = evt.detail || {};
      setUpgradeModalConfig({
        isOpen: true,
        featureName: detail.feature || "Ushbu xususiyat",
        requiredPlan: detail.required_plan || "pro",
        message: detail.detail || "Ushbu imkoniyatdan foydalanish uchun yuqoriroq tarifga o'tish lozim.",
      });
    };
    window.addEventListener("saas-upgrade-needed", handleUpgradeNeeded);
    return () => window.removeEventListener("saas-upgrade-needed", handleUpgradeNeeded);
  }, []);

  const handleUpgradePlan = async (planCode: string, billingCycle: "monthly" | "yearly" = "monthly") => {
    setBusy(true);
    try {
      await api("/api/subscription/upgrade", {
        method: "POST",
        body: JSON.stringify({ new_plan_code: planCode, billing_cycle: billingCycle }),
      });
      setSuccess(`${planCode.toUpperCase()} tarif rejasiga muvaffaqiyatli o'tildi!`);
      await loadSaaSData(activeOrgId);
    } catch (err: any) {
      setError(err.message || "Tarifni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSubscription = async () => {
    setBusy(true);
    try {
      await api("/api/subscription/cancel", { method: "POST" });
      setSuccess("Obunani bekor qilish rejalashtirildi (davr oxirigacha faol).");
      await loadSaaSData(activeOrgId);
    } catch (err: any) {
      setError(err.message || "Obunani bekor qilishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleResumeSubscription = async () => {
    setBusy(true);
    try {
      await api("/api/subscription/resume", { method: "POST" });
      setSuccess("Obunangiz yana to'liq faollashtirildi!");
      await loadSaaSData(activeOrgId);
    } catch (err: any) {
      setError(err.message || "Obunani qayta faollashtirishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateOrganization = async (data: any) => {
    setBusy(true);
    try {
      const res = await api<any>("/api/organizations", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSuccess(`${data.name} muvaffaqiyatli yaratildi! 7 kunlik sinov muddati boshlandi.`);
      if (res.organization?.id) {
        const org = res.organization;
        if (org.slug) {
          const meta = { id: org.id, name: org.name, slug: org.slug };
          if (typeof window !== "undefined") {
            localStorage.setItem("active_org_id", String(org.id));
            localStorage.setItem("owner_impersonating_store", JSON.stringify(meta));
            window.history.pushState(null, "", `/t/${org.slug}`);
          }
          setActiveStoreMeta(meta);
          setIsOwnerImpersonating(true);
          setZone("tenant");
        }
        switchOrganization(org.id);
      }
      setShowOnboardingModal(false);
    } catch (err: any) {
      setError(err.message || "Tashkilot yaratishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyBotToken = async () => {
    if (!botTokenInput.trim()) {
      setError("Iltimos, tekshirish uchun Bot Token kiriting");
      return;
    }
    setBotTokenVerifying(true);
    setBotTokenResult(null);
    try {
      const res = await api<any>("/api/organizations/verify-token", {
        method: "POST",
        body: JSON.stringify({ token: botTokenInput.trim() }),
      });
      setBotTokenResult(res);
      if (res.valid) {
        setSuccess(`Bot tasdiqlandi: @${res.bot_username} (${res.bot_name})`);
      } else {
        setError(`Bot token xato: ${res.error || "Noto'g'ri token"}`);
      }
    } catch (err: any) {
      setError(err.message || "Bot tokenni tekshirishda xatolik yuz berdi");
    } finally {
      setBotTokenVerifying(false);
    }
  };

  const handleSaveBotSettings = async () => {
    setSavingOrgSettings(true);
    try {
      const payload: any = {
        custom_system_prompt: customPromptInput,
      };
      if (botTokenInput.trim()) {
        payload.telegram_bot_token = botTokenInput.trim();
      }
      const res = await api<any>(`/api/organizations/current?organization_id=${activeOrgId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.organization) {
        setCurrentOrgDetails(res.organization);
        setSuccess("Bot va AI sozlamalari muvaffaqiyatli saqlandi!");
        setBotTokenInput("");
        setBotTokenResult(null);
      }
    } catch (err: any) {
      setError(err.message || "Sozlamalarni saqlashda xatolik");
    } finally {
      setSavingOrgSettings(false);
    }
  };

  const handleSetWebhook = async () => {
    setWebhookSetting(true);
    try {
      const res = await api<any>(`/api/organizations/${activeOrgId}/set-webhook`, {
        method: "POST",
      });
      setSuccess(`Telegram Webhook muvaffaqiyatli o'rnatildi: ${res.webhook_url}`);
      await handleCheckWebhookStatus();
    } catch (err: any) {
      setError(err.message || "Telegram Webhook o'rnatishda xatolik yuz berdi");
    } finally {
      setWebhookSetting(false);
    }
  };

  const handleCheckWebhookStatus = async () => {
    setWebhookStatusChecking(true);
    try {
      const res = await api<any>(`/api/organizations/${activeOrgId}/webhook-status`);
      setWebhookInfo(res);
      if (res.configured && res.webhook_info) {
        setSuccess(`Webhook holati: ${res.webhook_info.url || "O'rnatilmagan"} (Kutilayotgan: ${res.webhook_info.pending_update_count || 0})`);
      } else if (!res.configured) {
        setError(res.reason || "Bot token sozlanmagan");
      }
    } catch (err: any) {
      setError(err.message || "Webhook holatini tekshirishda xatolik");
    } finally {
      setWebhookStatusChecking(false);
    }
  };

  const switchOrganization = (orgId: number) => {
    setActiveOrgId(orgId);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_org_id", String(orgId));
    }
    setSuccess(`Faol tashkilot almashtirildi: #${orgId}`);
    load();
    loadSaaSData(orgId);
  };

  const handleUpdatePlanConfig = async (planCode: string, payload: any) => {
    setBusy(true);
    try {
      await api(`/api/platform/plans/${planCode}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSuccess(`${planCode.toUpperCase()} tarifi parametrlari yangilandi!`);
      if (zone === "platform") {
        await loadPlatformData();
      } else {
        await loadSaaSData(activeOrgId);
      }
    } catch (err: any) {
      setError(err.message || "Tarifni tahrirlashda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleEnterStore = async (store: any) => {
    setBusy(true);
    try {
      await api(`/api/platform/organizations/${store.slug}/impersonate`, { method: "POST" });
      const meta = { id: store.id, name: store.name, slug: store.slug };
      if (typeof window !== "undefined") {
        localStorage.setItem("active_org_id", String(store.id));
        localStorage.setItem("owner_impersonating_store", JSON.stringify(meta));
        window.history.pushState(null, "", `/t/${store.slug}`);
      }
      setActiveOrgId(store.id);
      setActiveStoreMeta(meta);
      setIsOwnerImpersonating(true);
      setZone("tenant");
      setTab("overview");
      setSuccess(`"${store.name}" do'koniga muvaffaqiyatli kirildi!`);
      await load();
      await loadSaaSData(store.id);
    } catch (err: any) {
      setError(err.message || "Do'konga kirishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  const handleExitStore = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("owner_impersonating_store");
      window.history.pushState(null, "", "/platform");
    }
    setIsOwnerImpersonating(false);
    setActiveStoreMeta(null);
    setZone("platform");
    setPlatformSubTab("stores");
    setSuccess("Platforma boshqaruviga qaytildi.");
    loadPlatformData();
  };

  const handleCreateStore = async (payload: any) => {
    setBusy(true);
    try {
      const res = await api<any>("/api/platform/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(`"${payload.name}" do'koni muvaffaqiyatli ochildi!`);
      await loadPlatformData();
      return res;
    } catch (err: any) {
      setError(err.message || "Do'kon ochishda xatolik yuz berdi");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStoreStatus = async (storeId: number, newStatus: string) => {
    setBusy(true);
    try {
      await api<any>(`/api/platform/organizations/${storeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccess(`Do'kon holati "${newStatus}" ga o'zgartirildi`);
      await loadPlatformData();
    } catch (err: any) {
      setError(err.message || "Holatni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStore = async (storeId: number) => {
    if (typeof window !== "undefined" && !window.confirm("Haqiqatan ham ushbu do'konni o'chirmoqchimisiz?")) return;
    setBusy(true);
    try {
      await api<any>(`/api/platform/organizations/${storeId}`, {
        method: "DELETE",
      });
      setSuccess("Do'kon muvaffaqiyatli o'chirildi");
      await loadPlatformData();
    } catch (err: any) {
      setError(err.message || "Do'konni o'chirishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialTenantSlug && platformOrgs.length > 0) {
      const matched = platformOrgs.find((o) => o.slug === initialTenantSlug);
      if (matched && matched.id !== activeOrgId) {
        setActiveOrgId(matched.id);
        const meta = { id: matched.id, name: matched.name, slug: matched.slug };
        setActiveStoreMeta(meta);
        if (typeof window !== "undefined") {
          localStorage.setItem("active_org_id", String(matched.id));
          localStorage.setItem("owner_impersonating_store", JSON.stringify(meta));
        }
        setIsOwnerImpersonating(true);
        load();
        loadSaaSData(matched.id);
      }
    }
  }, [initialTenantSlug, platformOrgs, activeOrgId, load, loadSaaSData]);



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

  async function perform(path: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
      await load();
      if (selected !== null) await loadMessages(selected);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Amal bajarilmadi");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    const ok = await perform(`/admin/conversations/${selected}/reply`, { text });
    if (ok) {
      setDraft("");
    }
  }

  const handleSaveCustomerNote = (id: number) => {
    try {
      localStorage.setItem("ai_sales_customer_notes", JSON.stringify(customerNotes));
      setSuccess("Operator eslatmasi muvaffaqiyatli saqlandi!");
    } catch {
      setError("Eslatmani saqlashda xatolik yuz berdi");
    }
  };

  const handleSendCatalogProposal = () => {
    setDraft(
      "Assalomu alaykum! Bizdagi eng ommabop va sifatli noutbuklar katalogi bilan tanishing:\n\n" +
      "1. Asus TUF Gaming FX505GE - $340 (i7-8750H, 16GB RAM, GTX1050ti 4GB)\n" +
      "2. Lenovo ThinkPad E14 Gen 4 - $430 (Ryzen 5 5625U, 16GB RAM, IPS FHD)\n" +
      "3. HP Victus 15 - $490 (Ryzen 5 5600H, 16GB RAM, GTX1650 4GB)\n" +
      "4. Apple MacBook Air M1 - $610 (Apple M1 8-Core, 8GB Unified, 256GB SSD)\n\n" +
      "Qaysi model bo'yicha batafsil ma'lumot beraylik?"
    );
    setSuccess("Katalog taklifi xabar maydoniga tayyorlandi!");
  };

  const handleSendDiscountProposal = () => {
    setDraft(
      "Hurmatli mijoz, agar siz bugun buyurtmani tasdiqlasangiz, siz uchun maxsus 5% chegirma va bepul yetkazib berish xizmatini taqdim etamiz!"
    );
    setSuccess("Chegirma taklifi xabar maydoniga tayyorlandi!");
  };

  async function handleDeletePost(postId: number, msgId?: number) {
    if (!confirm(`#${msgId || postId} postni bazadan o'chirmoqchimisiz?`)) return;
    try {
      setBusy(true);
      await api(`/admin/knowledge/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSuccess(`#${msgId || postId} post bazadan muvaffaqiyatli o'chirildi!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Postni o'chirishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    try {
      const res = await api<any>(`/admin/products/${encodeURIComponent(editingProduct.id)}`, {
        method: "PUT",
        body: JSON.stringify(editingProduct),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...res } : p))
      );
      setSuccess(`${editingProduct.name} muvaffaqiyatli yangilandi!`);
      setEditingProduct(null);
    } catch (e: any) {
      setError(e.message || "Mahsulotni yangilashda xatolik");
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      setError("Iltimos, mahsulot nomi va narxini kiriting");
      return;
    }
    const newId = `PRD-${String(products.length + 1).padStart(2, "0")}`;
    const item: ProductItem = {
      id: newId,
      name: newProduct.name,
      category: newProduct.category || "General",
      specs: newProduct.specs || "Standart parametrlar",
      price: newProduct.price.startsWith("$") ? newProduct.price : `$${newProduct.price}`,
      stock: (newProduct.stock as any) || "In Stock",
      warranty: newProduct.warranty || "Mavjud",
    };
    try {
      const res = await api<any>("/admin/products", {
        method: "POST",
        body: JSON.stringify(item),
      });
      setProducts((prev) => [res || item, ...prev]);
      setSuccess(`${item.name} katalogga qo'shildi!`);
      setIsAddingProduct(false);
      setNewProduct({ category: "General", stock: "In Stock", warranty: "Mavjud" });
    } catch (e: any) {
      setError(e.message || "Mahsulotni qo'shishda xatolik");
    }
  };

  const handleExtractProductsFromPosts = async () => {
    setBusy(true);
    try {
      const res = await api<any>("/admin/products/extract-from-posts", { method: "POST" });
      if (res.extracted_count > 0) {
        setSuccess(`${res.extracted_count} ta yangi mahsulot kanal postlaridan aniqlandi va katalogga qo'shildi!`);
        const updated = await api<ProductItem[]>("/admin/products");
        setProducts(updated || []);
      } else {
        setSuccess("Kanal postlaridan yangi mahsulot topilmadi yoki barchasi avval qo'shilgan.");
      }
    } catch (e: any) {
      setError(e.message || "Mahsulotlarni aniqlashda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateOrderStatus = async (orderIdStr: string, status: string) => {
    const rawId = parseInt(orderIdStr.replace("ORD-", ""), 10);
    try {
      await api(`/admin/orders/${rawId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderIdStr ? { ...o, status } : o))
      );
      setSuccess(`Buyurtma #${orderIdStr} statusi yangilandi: ${status}`);
    } catch (e: any) {
      setError(e.message || "Buyurtma statusini o'zgartirishda xatolik");
    }
  };

  const handleDeleteOrder = async (orderIdStr: string) => {
    if (!confirm(`${orderIdStr} buyurtmasi o'chirilsinmi?`)) return;
    const rawId = parseInt(orderIdStr.replace("ORD-", ""), 10);
    try {
      await api(`/admin/orders/${rawId}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((o) => o.id !== orderIdStr));
      setSuccess(`${orderIdStr} o'chirildi!`);
    } catch (e: any) {
      setError(e.message || "Buyurtmani o'chirishda xatolik");
    }
  };

  const handleDeleteProduct = async (prod: ProductItem) => {
    if (!confirm(`${prod.name} o'chirilsinmi?`)) return;
    try {
      await api(`/admin/products/${encodeURIComponent(prod.id)}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      setSuccess(`${prod.name} katalogdan o'chirildi!`);
    } catch (e: any) {
      setError(e.message || "Mahsulotni o'chirishda xatolik");
    }
  };

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
          username: cleanTelegramUsername(newAdminUsername) || null,
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
    const target = admins.find((a) => a.telegram_user_id === telegram_user_id);
    if (target?.role === "owner") {
      setError("Owner (Bosh admin)ni o'chirib bo'lmaydi");
      return;
    }
    if (!confirm(`${name || telegram_user_id} adminlikdan o'chirilsinmi?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`/admin/admins/${telegram_user_id}`, { method: "DELETE" });
      setSuccess(`${name || "Admin"} tizimdan muvaffaqiyatli o'chirildi.`);
      if (managingPermissionsAdmin?.telegram_user_id === telegram_user_id) {
        setManagingPermissionsAdmin(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin o'chirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePermission(telegram_user_id: number, permission: string, currentVal: boolean) {
    const target = admins.find((a) => a.telegram_user_id === telegram_user_id);
    if (target?.role === "owner") {
      setError("Owner ruxsatlarini o'zgartirib bo'lmaydi");
      return;
    }
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
      setManagingPermissionsAdmin((prev) => {
        if (prev && prev.telegram_user_id === telegram_user_id) {
          return { ...prev, permissions: { ...prev.permissions, [permission]: !currentVal } };
        }
        return prev;
      });
      setSuccess("Ruxsat holati muvaffaqiyatli yangilandi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ruxsatni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchPermissions(telegram_user_id: number, targetValue: boolean) {
    const target = admins.find((a) => a.telegram_user_id === telegram_user_id);
    if (!target || target.role === "owner") return;
    setBusy(true);
    setError("");
    try {
      const keys = Object.keys(PERMISSION_LABELS);
      for (const k of keys) {
        if (Boolean(target.permissions?.[k]) !== targetValue) {
          await api(`/admin/admins/${telegram_user_id}/permissions`, {
            method: "PATCH",
            body: JSON.stringify({ permission: k, value: targetValue }),
          });
        }
      }
      setAdmins((prev) =>
        prev.map((a) => {
          if (a.telegram_user_id === telegram_user_id) {
            const newPerms: Record<string, boolean> = { ...(a.permissions || {}) };
            keys.forEach((k) => {
              newPerms[k] = targetValue;
            });
            return { ...a, permissions: newPerms };
          }
          return a;
        })
      );
      setManagingPermissionsAdmin((prev) => {
        if (prev && prev.telegram_user_id === telegram_user_id) {
          const newPerms: Record<string, boolean> = { ...(prev.permissions || {}) };
          keys.forEach((k) => {
            newPerms[k] = targetValue;
          });
          return { ...prev, permissions: newPerms };
        }
        return prev;
      });
      setSuccess(targetValue ? "Barcha ruxsatlar faollashtirildi!" : "Barcha ruxsatlar o'chirildi!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ruxsatlarni yangilashda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(telegram_user_id: number, role: string) {
    const target = admins.find((a) => a.telegram_user_id === telegram_user_id);
    if (target?.role === "owner") {
      setError("Owner rolini o'zgartirib bo'lmaydi");
      return;
    }
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
      setManagingPermissionsAdmin((prev) => {
        if (prev && prev.telegram_user_id === telegram_user_id) {
          return { ...prev, role: res.role, permissions: res.permissions };
        }
        return prev;
      });
      setSuccess("Admin roli muvaffaqiyatli yangilandi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rolni o'zgartirishda xatolik");
    } finally {
      setBusy(false);
    }
  }

  // Login view using native Tabler authentication markup
  if (!authenticated) {
    return (
      <div className="page page-center auth-page-wrapper">
        {/* Atmospheric Ambient Lighting & Grid */}
        <div className="auth-ambient-orb-1" />
        <div className="auth-ambient-orb-2" />
        <div className="auth-mesh-grid" />

        <div className="auth-content-container py-4">
          {/* Brand header */}
          <div className="text-center mb-4">
            <div className="auth-logo-halo">
              <AppLogo src={logoUrl} size="xl" />
            </div>
            <h1 className="auth-brand-title mb-2">
              AI Sales Control Center
            </h1>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <div className="auth-version-pill shadow-sm">
                <span className="status-dot status-dot-animated bg-indigo" />
                <span>Enterprise v2.4</span>
                <span className="opacity-40">•</span>
                <span style={{ color: "rgba(255,255,255,0.75)" }}>Telegram AI Assistenti</span>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="card auth-card-modern shadow-lg">
            <div className="card-body p-4 p-sm-4.5">
              <div className="mb-4 text-center text-sm-start">
                <h2 className="h2 text-white fw-bold mb-1 d-flex align-items-center gap-2">
                  <span>Tizimga kirish</span>
                  <span className="badge bg-indigo-lt text-indigo small fw-normal d-none d-sm-inline-flex" style={{ fontSize: "11px" }}>Secure Auth</span>
                </h2>
                <p className="text-secondary small mb-0">Boshqaruv paneliga kirish uchun parolingizni kiriting</p>
              </div>

              <form onSubmit={login} autoComplete="off">
                {/* Admin Telegram ID with live Telegram Avatar */}
                <div className="mb-3.5">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label text-secondary small fw-medium mb-0 d-flex align-items-center gap-1.5" htmlFor="admin-tg-id">
                      <IconUser size={14} className="text-indigo" />
                      <span>Admin Telegram ID</span>
                    </label>
                    {loginTelegramId ? (
                      <span className="badge bg-warning-lt text-warning d-inline-flex align-items-center gap-1 py-0.5 px-2 rounded-pill" style={{ fontSize: "11px" }}>
                        <IconCrown size={12} /> ID orqali profil
                      </span>
                    ) : (
                      <span className="badge bg-secondary-lt text-secondary py-0.5 px-2 rounded-pill" style={{ fontSize: "11px" }}>
                        Ixtiyoriy
                      </span>
                    )}
                  </div>
                  <div className="auth-tg-profile-box">
                    <div className="auth-tg-avatar-wrap">
                      <img
                        key={loginTelegramId}
                        src={loginTelegramId ? `/api/proxy?path=/admin/users/${loginTelegramId}/avatar` : DEFAULT_TG_AVATAR}
                        alt="Telegram Avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" rx="22" fill="%236366f1"/><text x="50%" y="54%" font-size="14" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TG</text></svg>`;
                        }}
                      />
                      <span className="auth-tg-status-dot" title="Online" />
                    </div>
                    <div className="flex-fill">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-secondary" style={{ fontSize: "0.68rem", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                          Telegram ID Raqami
                        </span>
                      </div>
                      <input
                        id="admin-tg-id"
                        type="text"
                        className="w-100 bg-transparent border-0 p-0 text-white fw-semibold"
                        style={{ outline: "none", fontSize: "0.95rem" }}
                        placeholder="Telegram ID (ixtiyoriy, masalan: 12345678)"
                        value={loginTelegramId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setLoginTelegramId(val);
                        }}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3.5">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label text-secondary small fw-medium mb-0 d-flex align-items-center gap-1.5" htmlFor="admin-pwd">
                      <IconKey size={14} className="text-indigo" />
                      <span>Admin paroli</span>
                    </label>
                    <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                      Xavfsiz kalit
                    </span>
                  </div>
                  <div className="auth-input-modern">
                    <IconLock size={18} className="text-secondary flex-shrink-0 me-1" />
                    <input
                      id="admin-pwd"
                      type={showPassword ? "text" : "password"}
                      placeholder="Parolingizni kiriting"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost-secondary btn-sm flex-shrink-0"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      tabIndex={-1}
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="alert alert-danger d-flex align-items-center mb-3 py-2 px-3 rounded-2" role="alert">
                    <IconAlertCircle className="me-2 flex-shrink-0" size={18} />
                    <div className="small">{loginError}</div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="submit"
                    className="btn btn-auth-gradient w-100"
                    disabled={loggingIn || !password}
                  >
                    {loggingIn ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Tekshirilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <span>Boshqaruv Paneliga Kirish</span>
                        <IconArrowUpRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Status and logo configure footer */}
              <div className="d-flex align-items-center justify-content-between pt-3 mt-4 border-top border-white border-opacity-10 small">
                <div className="d-flex align-items-center gap-1.5 text-success">
                  <span className="status-dot status-dot-animated bg-success" />
                  <span className="small fw-semibold" style={{ color: "#34d399" }}>Tizim holati: Online</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost-secondary text-secondary text-decoration-none d-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill"
                  onClick={() => {
                    setCustomLogoInput(logoUrl);
                    setShowLogoModal(true);
                  }}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <IconPalette size={13} className="text-primary" />
                  <span className="text-secondary small">Logotipni sozlash</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-3.5">
            <div className="auth-security-badge d-inline-flex align-items-center gap-1.5">
              <IconShieldLock size={13} style={{ color: "#10b981" }} />
              <span>256-bit AES shifrlangan xavfsiz ulanish</span>
            </div>
          </div>
        </div>

        {/* Modal for logo settings */}
        {showLogoModal && (
          <div className="modal modal-blur fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 shadow-lg" style={{ background: "#171d29", borderRadius: 16 }}>
                <div className="modal-header border-bottom border-white-10">
                  <h5 className="modal-title text-white d-flex align-items-center gap-2">
                    <IconPhoto size={20} className="text-primary" />
                    <span>Kompaniya Logotipini Sozlash</span>
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowLogoModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4 p-3 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-secondary small mb-2">Joriy logotip ko'rinishi:</div>
                    <AppLogo src={customLogoInput || logoUrl} size="xl" />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small">Fayl yuklash (PNG, SVG, JPG, WebP):</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                    <div className="form-text text-secondary small">
                      O'zingizning kompyuteringizdan istalgan logotip rasmini yuklang.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small">Yoki Logotip URL manzili:</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="https://example.com/logo.png yoki /logo.svg"
                        value={customLogoInput}
                        onChange={(e) => setCustomLogoInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => handleSaveLogoUrl(customLogoInput)}
                      >
                        Qo'llash
                      </button>
                    </div>
                    <div className="form-text text-secondary small">
                      Masalan: <code>/logo.svg</code>, <code>/logo.png</code> yoki veb rasm havolasi.
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top border-white-10 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-ghost-secondary btn-sm"
                    onClick={() => {
                      handleSaveLogoUrl("/logo.svg");
                      setCustomLogoInput("/logo.svg");
                    }}
                  >
                    Standart logotipga qaytarish
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      handleSaveLogoUrl(customLogoInput);
                      setShowLogoModal(false);
                    }}
                  >
                    Tayyor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      {/* ========================================================
          5. SIDEBAR: NATIVE TABLER VERTICAL NAVBAR
          ======================================================== */}
      <aside
        className={`navbar navbar-vertical navbar-expand-lg ${
          sidebarCollapsed ? "navbar-vertical-collapsed" : ""
        }`}
        data-bs-theme="dark"
      >
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

          <div
            className={`d-flex align-items-center ${
              sidebarCollapsed ? "flex-column gap-2" : "justify-content-between"
            } w-100 my-2`}
          >
            <h1 className="navbar-brand navbar-brand-autodark m-0 p-0">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (zone === "platform") {
                    setPlatformSubTab("overview");
                  } else {
                    setTab("overview");
                  }
                }}
                className="d-flex align-items-center gap-2 text-decoration-none"
                title="AI Sales Control Enterprise"
              >
                <AppLogo src={logoUrl} size="sm" />
                <div className="d-flex flex-column text-start app-brand-text">
                  <span className="fw-bold fs-3 text-white lh-1">
                    {zone === "platform"
                      ? "Platform Owner"
                      : activeStoreMeta?.name || "AI Sales Control"}
                  </span>
                  <span className="text-secondary small" style={{ fontSize: "0.68rem" }}>
                    {zone === "platform" ? "Super Admin Control" : "Enterprise v2.4"}
                  </span>
                </div>
              </a>
            </h1>

            {/* Desktop Sidebar Collapse Toggle Button */}
            <button
              type="button"
              className="btn btn-sm btn-icon btn-ghost-secondary d-none d-lg-inline-flex"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Sidebarni kengaytirish" : "Sidebarni kichraytirish"}
              style={{ minWidth: 28, height: 28, padding: 0 }}
            >
              {sidebarCollapsed ? (
                <IconLayoutSidebarLeftExpand size={17} />
              ) : (
                <IconLayoutSidebarLeftCollapse size={17} />
              )}
            </button>
          </div>

          <div className="navbar-nav flex-row d-lg-none align-items-center gap-2">
            <button
              className="btn btn-sm btn-icon btn-ghost-secondary text-reset"
              onClick={() => setTab("profile")}
              title="Profil & Dizayn"
            >
              <IconPalette size={18} className={tab === "profile" ? "text-primary" : ""} />
            </button>
          </div>

          <div className="collapse navbar-collapse show" id="sidebar-menu">
            {zone === "platform" ? (
              <ul className="navbar-nav pt-lg-3">
                <div className="nav-section-title">PLATFORMA BOSHQARUVI</div>

                <li className={`nav-item ${platformSubTab === "overview" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#overview"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("overview");
                    }}
                    title="Platforma Umumiy Ko'rinishi (MRR, Tushum)"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconLayoutDashboard size={18} />
                    </span>
                    <span className="nav-link-title">Umumiy Ko'rinish</span>
                  </a>
                </li>

                <li className={`nav-item ${platformSubTab === "stores" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#stores"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("stores");
                    }}
                    title="Do'konlar Portfeli (Tenants)"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconBuildingSkyscraper size={18} className="text-warning" />
                    </span>
                    <span className="nav-link-title">Do'konlar</span>
                    {((platformMetrics?.total_organizations ?? platformOrgs.length) > 0) && (
                      <span className="badge badge-sm bg-warning-lt text-warning ms-auto font-monospace fw-bold">
                        {platformMetrics?.total_organizations ?? platformOrgs.length}
                      </span>
                    )}
                  </a>
                </li>

                <li className={`nav-item ${platformSubTab === "users" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#users"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("users");
                    }}
                    title="Foydalanuvchilar Ro'yxati"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconUsers size={18} />
                    </span>
                    <span className="nav-link-title">Foydalanuvchilar</span>
                    {platformUsers.length > 0 && (
                      <span className="badge badge-sm bg-blue-lt ms-auto">
                        {platformUsers.length}
                      </span>
                    )}
                  </a>
                </li>

                <li className={`nav-item ${platformSubTab === "plans" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#plans"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("plans");
                    }}
                    title="Tariflar va Narxlar"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconCrown size={18} />
                    </span>
                    <span className="nav-link-title">Tariflar & Narxlar</span>
                  </a>
                </li>

                <li className={`nav-item ${platformSubTab === "usage" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#usage"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("usage");
                    }}
                    title="Global AI Xarajatlari va Foydalanish"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconGauge size={18} />
                    </span>
                    <span className="nav-link-title">AI Xarajati & Usage</span>
                  </a>
                </li>

                <div className="nav-section-title">XAVFSIZLIK VA TIZIM</div>

                <li className={`nav-item ${platformSubTab === "system" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#system"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("system");
                    }}
                    title="Tizim Holati"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconServer size={18} />
                    </span>
                    <span className="nav-link-title">Tizim Holati</span>
                    <span className="badge badge-sm bg-green-lt text-green ms-auto">OK</span>
                  </a>
                </li>

                <li className={`nav-item ${platformSubTab === "audit" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#audit"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlatformSubTab("audit");
                    }}
                    title="Xavfsizlik va Audit Tarixi"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconActivity size={18} />
                    </span>
                    <span className="nav-link-title">Audit Tarixi</span>
                  </a>
                </li>
              </ul>
            ) : (
              <ul className="navbar-nav pt-lg-3">
                {isPlatformOwner && (
                  <div className="px-3 pb-2">
                    <button
                      type="button"
                      className="btn btn-warning w-100 btn-sm d-flex align-items-center justify-content-center gap-2 fw-semibold shadow-sm"
                      onClick={handleExitStore}
                      title="Platforma boshqaruviga qaytish"
                    >
                      <IconBuildingSkyscraper size={16} />
                      <span>Platformaga qaytish</span>
                    </button>
                  </div>
                )}
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
                    title="Overview (Umumiy ko'rinish)"
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
                    title="Live Inbox (Jonli muloqot)"
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
                    title="Knowledge Base (Ma'lumotlar bazasi)"
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
                    title="Products (Mahsulotlar katalogi)"
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
                    title="Orders (Buyurtmalar)"
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
                    title="Customers (Mijozlar bazasi)"
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
                    title="Analytics (Tahlil va Statistika)"
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
                    title="AI Settings (AI sozlamalari)"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconSettings size={18} />
                    </span>
                    <span className="nav-link-title">AI Settings</span>
                  </a>
                </li>

                {/* SAAS & SUBSCRIPTION SECTION */}
                <div className="nav-section-title">SAAS & BILLING</div>

                <li className={`nav-item ${tab === "usage" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#usage"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("usage");
                    }}
                    title="Foydalanish va Limitlar"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconGauge size={18} />
                    </span>
                    <span className="nav-link-title">Usage & Limits</span>
                  </a>
                </li>

                <li className={`nav-item ${tab === "billing" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#billing"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("billing");
                    }}
                    title="Obuna va To'lovlar"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconCreditCard size={18} />
                    </span>
                    <span className="nav-link-title">Subscription</span>
                    {subscriptionData?.is_trial && (
                      <span className="badge badge-sm bg-blue-lt ms-auto">Trial</span>
                    )}
                  </a>
                </li>

                <li className={`nav-item ${tab === "pricing" ? "active" : ""}`}>
                  <a
                    className="nav-link"
                    href="#pricing"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("pricing");
                    }}
                    title="Tariflar va Rejalar"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconCrown size={18} />
                    </span>
                    <span className="nav-link-title">Plans & Pricing</span>
                  </a>
                </li>

                {isPlatformOwner && (
                  <>
                    <div className="nav-section-title">PLATFORM OWNER</div>
                    <li className="nav-item">
                      <a
                        className="nav-link"
                        href="/platform"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExitStore();
                        }}
                        title="Platform Owner Dashboard (MRR, Tenants, AI Costs)"
                      >
                        <span className="nav-link-icon d-md-none d-lg-inline-block">
                          <IconBuildingSkyscraper size={18} className="text-warning" />
                        </span>
                        <span className="nav-link-title text-warning fw-semibold">Platformaga qaytish</span>
                      </a>
                    </li>
                  </>
                )}

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
                    title="Administration (Adminlar boshqaruvi)"
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
                    title="Team & Access (Jamoa va Ruxsatlar)"
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
                    title="Activity Logs"
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconActivity size={18} />
                    </span>
                    <span className="nav-link-title">Activity Logs</span>
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          PAGE WRAPPER
          ======================================================== */}
      <div className="page-wrapper">
        {/* STICKY IMPERSONATION BANNER (Platform Owner Inside Tenant View) */}
        {zone === "tenant" && (isOwnerImpersonating || isPlatformOwner) && (
          <div
            className="sticky-top bg-warning text-dark px-3 py-2 d-flex align-items-center justify-content-between shadow-sm"
            style={{ zIndex: 1045, borderBottom: "2px solid #b45309" }}
          >
            <div className="d-flex align-items-center gap-2">
              <IconAlertCircle size={20} className="text-dark flex-shrink-0" />
              <span className="fw-semibold">
                ⚠️ Siz <strong>{activeStoreMeta?.name || userOrganizations.find(o => o.id === activeOrgId)?.name || "Do'kon"}</strong> ichidasiz (Platform Owner ko'rinishi)
              </span>
              <span className="badge bg-dark text-white text-uppercase ms-2" style={{ fontSize: "10px" }}>
                Impersonation Faol
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-dark text-white d-inline-flex align-items-center gap-1.5 rounded-pill px-3 shadow-sm"
              onClick={handleExitStore}
            >
              <span>Platformaga qaytish</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        )}

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

            {/* Organization Switcher Dropdown OR Platform Mode Badge */}
            {zone === "platform" ? (
              <div className="d-flex align-items-center gap-2 ms-2">
                <span className="badge bg-warning-lt text-warning fw-semibold px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1">
                  <IconCrown size={14} />
                  <span>Platform Owner Rejimi</span>
                </span>
                <span className="badge bg-body-secondary text-secondary small d-none d-md-inline">
                  {(platformMetrics?.total_organizations ?? platformOrgs.length) || 0} ta do'kon
                </span>
              </div>
            ) : (
              <div className="nav-item dropdown ms-2 position-relative">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-3"
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  style={{ height: 38, borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)" }}
                >
                  <IconBuildingSkyscraper size={16} className="text-primary flex-shrink-0" />
                  <span className="fw-semibold text-white small text-truncate" style={{ maxWidth: 140 }}>
                    {userOrganizations.find((o) => o.id === activeOrgId)?.name || "AI Sales Central"}
                  </span>
                  <span className="badge bg-primary text-white text-uppercase" style={{ fontSize: "10px" }}>
                    {subscriptionData?.plan?.name || "PRO"}
                  </span>
                  <IconChevronDown size={14} className="text-secondary flex-shrink-0" />
                </button>
                {showOrgDropdown && (
                  <div
                    className="dropdown-menu dropdown-menu-start show shadow-lg border-secondary border-opacity-25 p-2"
                    style={{ minWidth: 260, position: "absolute", top: "100%", left: 0, zIndex: 1050 }}
                  >
                    <div className="dropdown-header small text-secondary text-uppercase fw-bold px-2 py-1">
                      Tashkilotlar (Tenants)
                    </div>
                    {userOrganizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        className={`dropdown-item d-flex align-items-center justify-content-between rounded py-2 px-2.5 mb-1 ${
                          activeOrgId === org.id ? "active bg-primary text-white" : ""
                        }`}
                        onClick={() => {
                          switchOrganization(org.id);
                          setShowOrgDropdown(false);
                        }}
                      >
                        <div className="d-flex align-items-center gap-2 text-truncate">
                          <IconBuildingSkyscraper size={16} />
                          <span className="text-truncate fw-medium">{org.name}</span>
                        </div>
                        <span className={`badge ${activeOrgId === org.id ? "bg-white text-primary" : "bg-body-secondary text-secondary"} small`}>
                          {org.subscription?.plan_name || "START"}
                        </span>
                      </button>
                    ))}
                    <div className="dropdown-divider my-1" />
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2 rounded py-2 text-primary fw-medium"
                      onClick={() => {
                        setShowOrgDropdown(false);
                        setShowOnboardingModal(true);
                      }}
                    >
                      <IconPlus size={16} />
                      <span>Yangi Biznes Qo'shish (7 kun bepul)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Navbar Items Right */}
            <div className="navbar-nav flex-row order-md-last ms-auto align-items-center gap-2">
              {/* AI Engine Status Pill */}
              <div className="nav-item d-none d-sm-flex">
                <span className="badge bg-green-lt text-green d-flex align-items-center gap-1.5 py-1.5 px-2.5 rounded-pill">
                  <span className="status-dot status-dot-animated bg-green"></span>
                  AI Online (Faol)
                </span>
              </div>

              {/* Refresh Button */}
              <div className="nav-item">
                <button
                  type="button"
                  className="btn btn-icon btn-outline-secondary rounded-circle"
                  style={{ width: 36, height: 36 }}
                  title="Yangilash"
                  onClick={load}
                  disabled={loading}
                >
                  <IconRefresh size={17} className={loading ? "spin" : ""} />
                </button>
              </div>

              {/* Logout Button */}
              <div className="nav-item">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 rounded-pill px-2.5"
                  style={{ height: 36 }}
                  onClick={logout}
                  title="Tizimdan chiqish"
                >
                  <IconLogout size={16} />
                  <span className="d-none d-lg-inline small">Chiqish</span>
                </button>
              </div>

              {/* Admin Avatar Round Button (Placed at the far right edge of Navbar) */}
              <div className="nav-item ms-1">
                <button
                  type="button"
                  className={`admin-navbar-avatar-btn ${tab === "profile" ? "active" : ""}`}
                  title={`${currentAdmin?.name || "Super Admin"} (@${currentAdmin?.username || "Dr4x1l"}) • Telegram ID: ${activeAdminTelegramId}`}
                  onClick={() => setTab("profile")}
                >
                  {!navAvatarError && Boolean(activeAdminTelegramId) && Number(activeAdminTelegramId) > 0 ? (
                    <img
                      key={activeAdminTelegramId}
                      src={`/api/proxy?path=/admin/users/${activeAdminTelegramId}/avatar`}
                      alt={currentAdmin?.name || "Admin"}
                      className="admin-navbar-avatar-img"
                      onError={() => setNavAvatarError(true)}
                    />
                  ) : (
                    <div className="admin-navbar-avatar-fallback">
                      {currentAdmin?.name
                        ? currentAdmin.name.substring(0, 2).toUpperCase()
                        : <IconShieldCheck size={18} />}
                    </div>
                  )}
                  <span className="admin-navbar-avatar-status" title="Online" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Global Floating Toast Notifications (Top-Right Glassmorphism with Auto-Dismiss) */}
        <div className="toast-container-fixed">
          {error && (
            <div
              className="toast show align-items-center text-white border-0 shadow-lg mb-2 toast-floating toast-slide-in"
              role="alert"
              style={{
                background: "rgba(220, 38, 38, 0.92)",
                boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.5), 0 8px 10px -6px rgba(220, 38, 38, 0.3)",
              }}
            >
              <div className="d-flex align-items-center p-3">
                <IconAlertCircle className="me-2.5 flex-shrink-0 text-white" size={22} />
                <div className="toast-body p-0 flex-grow-1" style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4 }}>
                  {error}
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  aria-label="Close"
                  onClick={() => setError("")}
                />
              </div>
            </div>
          )}

          {success && (
            <div
              className="toast show align-items-center text-white border-0 shadow-lg mb-2 toast-floating toast-slide-in"
              role="alert"
              style={{
                background: "rgba(16, 185, 129, 0.92)",
                boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5), 0 8px 10px -6px rgba(16, 185, 129, 0.3)",
              }}
            >
              <div className="d-flex align-items-center p-3">
                <IconCheck className="me-2.5 flex-shrink-0 text-white" size={22} />
                <div className="toast-body p-0 flex-grow-1" style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4 }}>
                  {success}
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  aria-label="Close"
                  onClick={() => setSuccess("")}
                />
              </div>
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
                  {zone === "platform" ? "SAAS / PLATFORM OWNER CONTROL" : (
                    <>
                      {tab === "overview" && "WORKSPACE / OVERVIEW"}
                      {tab === "inbox" && "WORKSPACE / LIVE INBOX"}
                      {tab === "knowledge" && "WORKSPACE / KNOWLEDGE BASE"}
                      {tab === "products" && "SALES / PRODUCTS CATALOG"}
                      {tab === "orders" && "SALES / ORDERS MANAGEMENT"}
                      {tab === "customers" && "SALES / CUSTOMERS DIRECTORY"}
                      {tab === "usage" && "SAAS / USAGE & LIMITS METERING"}
                      {tab === "billing" && "SAAS / SUBSCRIPTION & INVOICES"}
                      {tab === "pricing" && "SAAS / COMMERCIAL PLANS MATRIX"}
                      {tab === "platform" && "SAAS / PLATFORM OWNER CONTROL"}
                      {tab === "analytics" && "INTELLIGENCE / ANALYTICS"}
                      {tab === "settings" && "INTELLIGENCE / AI CONFIGURATION"}
                      {tab === "admins" && "SYSTEM / ADMINISTRATION"}
                      {tab === "team" && "SYSTEM / TEAM & ACCESS ROLES"}
                      {tab === "logs" && "SYSTEM / AUDIT & ACTIVITY LOGS"}
                      {tab === "profile" && "SYSTEM / ADMIN PROFILE & APPEARANCE"}
                    </>
                  )}
                </div>
                <h2 className="page-title">
                  {zone === "platform" ? (
                    platformSubTab === "overview" ? "Platforma Umumiy Ko'rinishi (MRR & AI Xarajatlari)" :
                    platformSubTab === "stores" ? "Do'konlar Portfeli (Tenants)" :
                    platformSubTab === "users" ? "Platforma Foydalanuvchilari" :
                    platformSubTab === "plans" ? "Tarif Rejalari va Narxlar" :
                    platformSubTab === "usage" ? "AI Xarajatlari va Resurslar Sarfi" :
                    platformSubTab === "system" ? "Tizim va Integratsiyalar Holati" :
                    "Audit va Xavfsizlik Tarixi"
                  ) : (
                    <>
                      {tab === "overview" && "Boshqaruv Paneli"}
                      {tab === "inbox" && "Jonli Suhbatlar (Live Inbox)"}
                      {tab === "knowledge" && "Telegram Mahsulotlar Bazasi"}
                      {tab === "products" && "Mahsulotlar Katalogi"}
                      {tab === "orders" && "Buyurtmalar Jurnali"}
                      {tab === "customers" && "Mijozlar Ro'yxati"}
                      {tab === "usage" && "Foydalanish va Resurs Limitlari"}
                      {tab === "billing" && "Obuna va Hisob-Kitoblar"}
                      {tab === "pricing" && "Tariflar va Imkoniyatlar"}
                      {tab === "platform" && "Platforma Egasi Boshqaruv Markazi"}
                      {tab === "analytics" && "Savdo va AI Statistikasi"}
                      {tab === "settings" && "AI va Tizim Sozlamalari"}
                      {tab === "admins" && "Administratorlar Boshqaruvi"}
                      {tab === "team" && "Jamoa va Ruxsatlar Tizimi"}
                      {tab === "logs" && "Tizim Amallari Tarixi"}
                      {tab === "profile" && "Admin Profili va Dizayn Sozlamalari"}
                    </>
                  )}
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
            {zone === "platform" ? (
              <PlatformOwnerTab
                subTab={platformSubTab}
                metrics={platformMetrics}
                organizations={platformOrgs}
                usersList={platformUsers}
                systemHealth={systemHealth}
                auditLogs={auditLogs}
                loading={loading}
                onRefresh={loadPlatformData}
                onUpdatePlan={handleUpdatePlanConfig}
                onEnterStore={handleEnterStore}
                onSwitchSubTab={setPlatformSubTab}
                onCreateStore={handleCreateStore}
                onUpdateStoreStatus={handleUpdateStoreStatus}
                onDeleteStore={handleDeleteStore}
              />
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
            {tab === "overview" && (
              <div>
                {/* LIVE METRICS HEADER BAR */}
                <div className="d-flex align-items-center justify-content-between px-1 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="status-dot status-dot-animated bg-success"></span>
                    <span className="text-secondary small fw-medium">
                      Jonli Kuzatuv Paneli • Haqiqiy vaqtdagi AI savdo ko'rsatkichlari
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-secondary small">
                    <span className="badge bg-green-lt text-green d-none d-sm-inline-flex align-items-center gap-1">
                      <span className="status-dot status-dot-animated bg-success"></span>
                      Auto-Sync: Har 6s
                    </span>
                    <span>Oxirgi yangilanish: hozir</span>
                  </div>
                </div>

                {/* 4 TOP STAT CARDS */}
                <div className="row row-deck row-cards g-3 mb-3">

                {/* 1. JAMI SUHBATLAR */}
                <div className="col-sm-6 col-lg-3">
                  <div
                    className="card stat-card-interactive stat-card-blue shadow-sm"
                    onClick={() => {
                      setTab("inbox");
                      setInboxFilter("all");
                    }}
                    title="Barcha suhbatlar ro'yxatini ochish"
                  >
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="subheader text-uppercase fw-bold text-secondary mb-0">Jami Suhbatlar</span>
                        <span className="badge bg-blue-lt text-blue d-inline-flex align-items-center gap-1">
                          <IconTrendingUp size={12} /> +12% bugun
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between my-2">
                        <div>
                          <div className="display-6 fw-bold text-white lh-1">
                            {overview?.conversations ?? 0}
                          </div>
                          <div className="text-secondary small mt-1">Mijozlar bilan faol aloqa</div>
                        </div>
                        <div className="stat-icon-badge bg-blue-lt text-blue shadow-sm">
                          <IconMessages size={22} />
                        </div>
                      </div>

                      <div className="my-2">
                        <MiniSparkline
                          data={[2, 3, 4, 3, 5, 5, overview?.conversations ?? 6]}
                          color="#206bc4"
                          id="conv"
                        />
                      </div>

                      <div className="d-flex justify-content-between align-items-center text-secondary small mb-1">
                        <span>Qamrov darajasi</span>
                        <span className="fw-bold text-blue">100%</span>
                      </div>
                      <div className="progress progress-xs">
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AI BOSHQARUVIDA */}
                <div className="col-sm-6 col-lg-3">
                  <div
                    className="card stat-card-interactive stat-card-green shadow-sm"
                    onClick={() => {
                      setTab("inbox");
                      setInboxFilter("ai");
                    }}
                    title="AI javob berayotgan suhbatlarni ochish"
                  >
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="subheader text-uppercase fw-bold text-secondary mb-0">AI Boshqaruvida</span>
                        <span className="badge bg-green-lt text-green d-inline-flex align-items-center gap-1">
                          <span className="status-dot status-dot-animated bg-success"></span>
                          Avtomat • Tezkor
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between my-2">
                        <div>
                          <div className="display-6 fw-bold text-green lh-1">
                            {overview?.ai_active ?? 0}
                          </div>
                          <div className="text-secondary small mt-1">
                            {overview && overview.conversations > 0
                              ? Math.round((overview.ai_active / overview.conversations) * 100)
                              : 0}% avtomatik yechim
                          </div>
                        </div>
                        <div className="stat-icon-badge bg-green-lt text-green shadow-sm">
                          <IconRobot size={22} />
                        </div>
                      </div>

                      <div className="my-2">
                        <MiniSparkline
                          data={[1, 1, 2, 2, 3, 2, overview?.ai_active ?? 2]}
                          color="#2fb344"
                          id="ai"
                        />
                      </div>

                      <div className="d-flex justify-content-between align-items-center text-secondary small mb-1">
                        <span>O'rtacha javob: ~1.2s</span>
                        <span className="fw-bold text-green">
                          {overview && overview.conversations > 0
                            ? Math.round((overview.ai_active / overview.conversations) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="progress progress-xs">
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-green"
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

                {/* 3. OPERATOR QABULIDA */}
                <div className="col-sm-6 col-lg-3">
                  <div
                    className="card stat-card-interactive stat-card-amber shadow-sm"
                    onClick={() => {
                      setTab("inbox");
                      setInboxFilter("human");
                    }}
                    title="Operator javobini kutayotgan suhbatlarni ochish"
                  >
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="subheader text-uppercase fw-bold text-secondary mb-0">Operator Qabulida</span>
                        <span className="badge bg-yellow-lt text-yellow d-inline-flex align-items-center gap-1">
                          <span className="status-dot status-dot-animated bg-warning"></span>
                          Inson nazorati
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between my-2">
                        <div>
                          <div className="display-6 fw-bold text-yellow lh-1">
                            {overview?.human_takeover ?? 0}
                          </div>
                          <div className="text-secondary small mt-1">
                            Tezkor javob talab etiladi
                          </div>
                        </div>
                        <div className="stat-icon-badge bg-yellow-lt text-yellow shadow-sm">
                          <IconHeadset size={22} />
                        </div>
                      </div>

                      <div className="my-2">
                        <MiniSparkline
                          data={[1, 2, 3, 2, 4, 3, overview?.human_takeover ?? 4]}
                          color="#f59f00"
                          id="operator"
                        />
                      </div>

                      <div className="d-flex justify-content-between align-items-center text-secondary small mb-1">
                        <span>Navbatdagi mijozlar</span>
                        <span className="fw-bold text-yellow">
                          {overview && overview.conversations > 0
                            ? Math.round((overview.human_takeover / overview.conversations) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="progress progress-xs">
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
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

                {/* 4. SINXRON POSTLAR */}
                <div className="col-sm-6 col-lg-3">
                  <div
                    className="card stat-card-interactive stat-card-purple shadow-sm"
                    onClick={() => setTab("knowledge")}
                    title="Telegram postlar bazasini ochish"
                  >
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="subheader text-uppercase fw-bold text-secondary mb-0">Sinxron Postlar</span>
                        <span className="badge bg-purple-lt text-purple d-inline-flex align-items-center gap-1">
                          <IconDatabase size={12} /> AI Katalog
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between my-2">
                        <div>
                          <div className="display-6 fw-bold text-purple lh-1">
                            {overview?.knowledge_posts ?? posts.length}
                          </div>
                          <div className="text-secondary small mt-1">
                            {channels.length > 0
                              ? `${channels.length} ta faol kanal`
                              : "Kanal ulanmagan"}
                          </div>
                        </div>
                        <div className="stat-icon-badge bg-purple-lt text-purple shadow-sm">
                          <IconDatabase size={22} />
                        </div>
                      </div>

                      <div className="my-2">
                        <MiniSparkline
                          data={[3, 5, 6, 7, 8, 8, overview?.knowledge_posts ?? 9]}
                          color="#ae3ec9"
                          id="posts"
                        />
                      </div>

                      <div className="d-flex justify-content-between align-items-center text-secondary small mb-1">
                        <span className="text-truncate me-2" style={{ maxWidth: 160 }}>
                          {channels[0]?.channel_username ? `@${channels[0].channel_username}` : "Bazaga ulangan"}
                        </span>
                        <span className="fw-bold text-purple">100%</span>
                      </div>
                      <div className="progress progress-xs">
                        <div
                          className="progress-bar bg-purple"
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {/* MAIN DASHBOARD CONTENT */}
                <div className="row row-cards g-3">
                  {/* Left Column: So'nggi Mijoz Murojaatlari */}
                  <div className="col-lg-7 col-xl-8">
                    <div className="card shadow-sm h-100">
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
                                    <TelegramUserAvatar userId={conv.chat_id} name={conv.customer_name} size="md" className="me-2" />
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

                  {/* Right Column: Today's Orders & AI Engine Status (Stacked Vertically, Full Width) */}
                  <div className="col-lg-5 col-xl-4 d-flex flex-column gap-3">
                    {/* Card 1: Bugungi Savdo va Buyurtmalar */}
                    <div className="card shadow-sm w-100">
                      <div className="card-header d-flex align-items-center justify-content-between py-2.5">
                        <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                          <IconShoppingCart size={18} className="text-primary" />
                          <span>Bugungi Savdo va Buyurtmalar</span>
                        </h3>
                        <span className="badge bg-green-lt text-green fw-bold fs-5">$2,190</span>
                      </div>
                      <div className="card-body p-3">
                        {/* Mini KPI metrics */}
                        <div className="row g-2 text-center mb-3">
                          <div className="col-4">
                            <div className="p-2 rounded bg-body-tertiary border border-secondary border-opacity-10 h-100 d-flex flex-column justify-content-center">
                              <div className="text-secondary small text-nowrap" style={{ fontSize: "0.72rem" }}>Jami bitim</div>
                              <div className="fw-bold text-white fs-4 mt-1">{orders.length} ta</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 rounded bg-body-tertiary border border-secondary border-opacity-10 h-100 d-flex flex-column justify-content-center">
                              <div className="text-secondary small text-nowrap" style={{ fontSize: "0.72rem" }}>O'rtacha chek</div>
                              <div className="fw-bold text-info fs-4 mt-1">$438</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 rounded bg-body-tertiary border border-secondary border-opacity-10 h-100 d-flex flex-column justify-content-center">
                              <div className="text-secondary small text-nowrap" style={{ fontSize: "0.72rem" }}>Konversiya</div>
                              <div className="fw-bold text-green fs-4 mt-1">83%</div>
                            </div>
                          </div>
                        </div>

                        {/* Status distribution progress bar */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center justify-content-between text-secondary small mb-1" style={{ fontSize: "0.75rem" }}>
                            <span>Buyurtmalar taqsimoti:</span>
                            <span className="fw-medium text-white">3 tasdiqlangan • 2 jarayonda</span>
                          </div>
                          <div className="progress progress-xs">
                            <div className="progress-bar bg-success" style={{ width: "60%" }} title="Tasdiqlangan / Bajarilgan: 60%" />
                            <div className="progress-bar bg-primary" style={{ width: "40%" }} title="Jarayonda / Yangi: 40%" />
                          </div>
                        </div>

                        {/* Recent Orders Compact List */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="subheader text-uppercase fw-bold text-secondary mb-0" style={{ fontSize: "0.7rem" }}>
                            So'nggi buyurtmalar
                          </span>
                          <span className="text-secondary small" style={{ fontSize: "0.7rem" }}>
                            Oxirgi 3 tasi
                          </span>
                        </div>

                        <div className="list-group list-group-flush mb-3">
                          {orders.slice(0, 3).map((ord) => (
                            <div
                              key={ord.id}
                              className="list-group-item px-2.5 py-2 d-flex align-items-center justify-content-between bg-transparent border border-secondary border-opacity-10 rounded mb-1.5"
                              style={{ background: "rgba(255,255,255,0.02)" }}
                            >
                              <div className="text-truncate me-2">
                                <div className="d-flex align-items-center gap-1.5">
                                  <span className="fw-semibold text-white small text-truncate">{ord.customer}</span>
                                  <span className="text-secondary small text-truncate" style={{ fontSize: "0.7rem" }}>{ord.username}</span>
                                </div>
                                <div className="text-secondary text-truncate" style={{ fontSize: "0.75rem" }}>
                                  {ord.product}
                                </div>
                              </div>
                              <div className="text-end flex-shrink-0">
                                <div className="fw-bold text-green small">{ord.amount}</div>
                                <span
                                  className={`badge ${
                                    ord.status === "Confirmed"
                                      ? "bg-green-lt text-green"
                                      : ord.status === "Processing"
                                      ? "bg-blue-lt text-blue"
                                      : ord.status === "Completed"
                                      ? "bg-cyan-lt text-cyan"
                                      : "bg-warning-lt text-warning"
                                  } py-0 px-1.5`}
                                  style={{ fontSize: "0.68rem" }}
                                >
                                  {ord.status === "Confirmed"
                                    ? "Tasdiqlandi"
                                    : ord.status === "Processing"
                                    ? "Jarayonda"
                                    : ord.status === "Completed"
                                    ? "Bajarildi"
                                    : "Yangi"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer action */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-1.5"
                          onClick={() => setTab("orders")}
                        >
                          <IconArrowUpRight size={15} />
                          <span>Barcha buyurtmalarni ko'rish ({orders.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Card 2: AI Sales Engine Holati */}
                    <div className="card shadow-sm w-100">
                      <div className="card-header py-2.5 d-flex align-items-center justify-content-between">
                        <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                          <IconBolt size={18} className="text-warning" />
                          <span>AI Sales Engine Holati</span>
                        </h3>
                        <span className="badge bg-green-lt text-green d-flex align-items-center gap-1">
                          <span className="status-dot status-dot-animated bg-success" />
                          Online
                        </span>
                      </div>
                      <div className="card-body p-3">
                        <ul className="list-unstyled mb-0 space-y-2">
                          <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                            <span className="text-secondary small text-nowrap">AI Model:</span>
                            <span className="badge bg-blue-lt fw-bold text-truncate" style={{ maxWidth: 140 }}>{aiModel}</span>
                          </li>
                          <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                            <span className="text-secondary small text-nowrap">Telegram Webhook:</span>
                            <span className="badge bg-green-lt text-green text-nowrap">Faol va Ulangan</span>
                          </li>
                          <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                            <span className="text-secondary small text-nowrap">O'rtacha javob tezligi:</span>
                            <span className="fw-bold text-white small text-nowrap">~1.8 soniya</span>
                          </li>
                          <li className="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10">
                            <span className="text-secondary small text-nowrap">Dublyor tasdiqlash:</span>
                            <span className="badge bg-blue-lt text-nowrap">Yoqilgan</span>
                          </li>
                          <li className="d-flex align-items-center justify-content-between py-1">
                            <span className="text-secondary small text-nowrap">Kanal sinxronlash:</span>
                            <span className="text-green fw-bold small text-nowrap">Avtomatik</span>
                          </li>
                        </ul>
                        <hr className="my-2.5" />
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-2 px-3 text-nowrap"
                          onClick={handleSyncKnowledge}
                          disabled={busy}
                        >
                          <IconRefresh size={16} className={`flex-shrink-0 ${busy ? "spin" : ""}`} />
                          <span className="text-nowrap fw-medium">Kanalni hozir tekshirish</span>
                        </button>
                      </div>
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
                        <h3 className="card-title mb-0">
                          Suhbatlar ({filteredConversations.length}
                          {filteredConversations.length !== conversations.length ? ` / ${conversations.length}` : ""})
                        </h3>
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
                          Barchasi ({conversations.length})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${inboxFilter === "ai" ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setInboxFilter("ai")}
                        >
                          AI ({conversations.filter((c) => c.status === "ai_active").length})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${inboxFilter === "human" ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setInboxFilter("human")}
                        >
                          Operator ({conversations.filter((c) => c.status === "human_takeover").length})
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
                              <TelegramUserAvatar userId={c.chat_id} name={c.customer_name} size="sm" className="me-2" isSelected={isSelected} />
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
                          <TelegramUserAvatar userId={activeConversation.chat_id} name={activeConversation.customer_name} size="md" className="me-2" />
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
                        <div className="chat chat-history-container" ref={chatContainerRef}>
                          <div className="chat-bubbles d-flex flex-column gap-2">
                            {messages.map((m) => {
                              const isMe =
                                m.direction === "assistant" ||
                                m.direction === "admin" ||
                                m.direction === "outgoing";
                              const isAdmin = m.direction === "admin";

                              return (
                                <div
                                  key={m.id}
                                  className={`chat-item d-flex ${isMe ? "justify-content-end" : "justify-content-start"}`}
                                >
                                  <div
                                    className={`chat-bubble-custom ${isMe ? "bubble-outgoing" : "bubble-incoming"}`}
                                    style={{ maxWidth: "76%" }}
                                  >
                                    {/* Sender Label (ONLY for AI or Operator, subtle & clean) */}
                                    {isMe && (
                                      <div
                                        className="chat-sender-tag"
                                        style={{ color: isAdmin ? "#fcd34d" : "#93c5fd" }}
                                      >
                                        {isAdmin ? (
                                          <>
                                            <IconHeadset size={12} />
                                            <span>Operator</span>
                                          </>
                                        ) : (
                                          <>
                                            <IconRobot size={12} />
                                            <span>AI Assistent</span>
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {/* Message Text */}
                                    <div
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        fontSize: "0.93rem",
                                        lineHeight: 1.44,
                                        color: isMe ? "#ffffff" : "#f1f5f9",
                                      }}
                                    >
                                      {m.text}
                                    </div>

                                    {/* Timestamp at bottom right */}
                                    <div
                                      className="chat-time-tag text-end mt-1"
                                      style={{
                                        color: isMe ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 255, 255, 0.45)",
                                      }}
                                    >
                                      {formatChatTime(m.created_at)}
                                      {isMe && <span className="ms-1" style={{ fontSize: "0.72rem" }}>✓✓</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            <div ref={messagesEndRef} />

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
                          <TelegramUserAvatar userId={activeConversation.chat_id} name={activeConversation.customer_name} size="xl" className="mx-auto mb-2" />
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

                        <hr className="my-3 border-secondary border-opacity-15" />

                        {/* 1. OPERATOR NOTES (INTERNAL ONLY) */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="subheader text-uppercase fw-bold text-secondary mb-0">
                              Operator Eslatmasi
                            </span>
                            {customerNotes[activeConversation.id] ? (
                              <span className="badge bg-green-lt text-green d-inline-flex align-items-center gap-1" style={{ fontSize: "10px" }}>
                                <IconCheck size={11} /> Saqlangan
                              </span>
                            ) : (
                              <span className="text-secondary small" style={{ fontSize: "11px" }}>Ichki qayd</span>
                            )}
                          </div>
                          <textarea
                            className="form-control form-control-sm mb-2"
                            rows={3}
                            placeholder="Mijoz haqida ichki qayd yozing (qidirayotgan model, byudjet, kelishuv)..."
                            value={customerNotes[activeConversation.id] || ""}
                            onChange={(e) =>
                              setCustomerNotes({
                                ...customerNotes,
                                [activeConversation.id]: e.target.value,
                              })
                            }
                            style={{ resize: "none", fontSize: "0.82rem", lineHeight: 1.4 }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1.5"
                            onClick={() => handleSaveCustomerNote(activeConversation.id)}
                          >
                            <IconPencil size={14} className="text-warning" />
                            <span>Eslatmani saqlash</span>
                          </button>
                        </div>

                        <hr className="my-3 border-secondary border-opacity-15" />

                        {/* 2. CLIENT-FACING QUICK OFFERS & ACTIONS */}
                        <div>
                          <div className="subheader text-uppercase fw-bold text-secondary mb-2">
                            Mijozga Tezkor Takliflar
                          </div>
                          <div className="d-flex flex-column gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary w-100 d-flex align-items-center justify-content-start px-2.5 py-2 gap-2 text-start"
                              onClick={handleSendCatalogProposal}
                              title="Eng ommabop noutbuklar katalogini chatga tayyorlash"
                              style={{ background: "rgba(32, 107, 196, 0.05)" }}
                            >
                              <span className="badge bg-primary-lt text-primary p-1 rounded flex-shrink-0">
                                <IconPackage size={15} />
                              </span>
                              <div className="flex-fill text-truncate">
                                <div className="fw-medium text-white small text-truncate">Noutbuklar katalogi</div>
                                <div className="text-secondary small text-truncate" style={{ fontSize: "0.7rem" }}>Asus, ThinkPad, Victus, Mac</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-start px-2.5 py-2 gap-2 text-start"
                              onClick={handleSendDiscountProposal}
                              title="Maxsus 5% chegirma va bepul yetkazish taklifini kiritish"
                              style={{ background: "rgba(47, 179, 68, 0.05)" }}
                            >
                              <span className="badge bg-success-lt text-success p-1 rounded flex-shrink-0">
                                <IconSparkles size={15} />
                              </span>
                              <div className="flex-fill text-truncate">
                                <div className="fw-medium text-white small text-truncate">5% chegirma + Bepul yetkazish</div>
                                <div className="text-secondary small text-truncate" style={{ fontSize: "0.7rem" }}>Bugun buyurtma uchun bonus</div>
                              </div>
                            </button>
                          </div>
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
                      <div className="card-actions d-flex gap-2">
                        <button
                          className="btn btn-outline-info d-flex align-items-center gap-1"
                          onClick={handleExtractProductsFromPosts}
                          disabled={busy || posts.length === 0}
                          title="Telegram kanal postlaridan mahsulotlar va narxlarni aniqlash"
                        >
                          <IconSparkles size={18} />
                          Mahsulotlarni aniqlash
                        </button>
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
                            <th className="w-1 text-center">Amal</th>
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
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center p-1.5"
                                    onClick={() => handleDeletePost(p.id, p.telegram_message_id)}
                                    title="Ushbu postni bilimlar bazasidan o'chirish"
                                    disabled={busy}
                                  >
                                    <IconTrash size={14} />
                                  </button>
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
                          className="btn btn-outline-info btn-sm d-flex align-items-center gap-1"
                          onClick={handleExtractProductsFromPosts}
                          disabled={busy}
                          title="Telegram kanal postlaridan mahsulotlar va narxlarni avtomatik aniqlash"
                        >
                          <IconSparkles size={16} /> Kanal postlaridan aniqlash
                        </button>
                        <button
                          className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                          onClick={() => setIsAddingProduct(true)}
                        >
                          <IconPlus size={16} /> Yangi mahsulot
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-striped">
                        <thead>
                          <tr>
                            <th className="w-1">Mahsulot Kodi</th>
                            <th>Mahsulot Nomi</th>
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
                                    onClick={() => setEditingProduct(prod)}
                                    title="Tahrirlash"
                                  >
                                    <IconPencil size={14} />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteProduct(prod)}
                                    title="O'chirish"
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

                {/* PRODUCT EDIT / CREATE MODAL */}
                {(editingProduct || isAddingProduct) && (
                  <div className="modal modal-blur fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                      <div className="modal-content shadow-lg border-secondary border-opacity-25">
                        <div className="modal-header">
                          <h5 className="modal-title d-flex align-items-center gap-2">
                            <IconPackage size={18} className="text-primary" />
                            <span>{editingProduct ? `${editingProduct.name} — Tahrirlash` : "Yangi Noutbuk Qo'shish"}</span>
                          </h5>
                          <button
                            type="button"
                            className="btn-close"
                            onClick={() => {
                              setEditingProduct(null);
                              setIsAddingProduct(false);
                            }}
                          />
                        </div>
                        <div className="modal-body">
                          {editingProduct ? (
                            <div className="space-y-3">
                              <div className="mb-3">
                                <label className="form-label required">Noutbuk Nomi</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editingProduct.name}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                />
                              </div>
                              <div className="row g-2 mb-3">
                                <div className="col-6">
                                  <label className="form-label">Kategoriya</label>
                                  <select
                                    className="form-select"
                                    value={editingProduct.category}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                  >
                                    <option value="Gaming">Gaming</option>
                                    <option value="Business">Business</option>
                                    <option value="Ultrabook">Ultrabook</option>
                                    <option value="Premium">Premium</option>
                                  </select>
                                </div>
                                <div className="col-6">
                                  <label className="form-label required">Narxi</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                    placeholder="$450"
                                  />
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label">Xarakteristikasi (Specs)</label>
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  value={editingProduct.specs}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, specs: e.target.value })}
                                />
                              </div>
                              <div className="row g-2">
                                <div className="col-6">
                                  <label className="form-label">Status</label>
                                  <select
                                    className="form-select"
                                    value={editingProduct.stock}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value as any })}
                                  >
                                    <option value="In Stock">Mavjud (In Stock)</option>
                                    <option value="Low Stock">Kam qoldi (Low Stock)</option>
                                    <option value="Pre-order">Buyurtmaga (Pre-order)</option>
                                  </select>
                                </div>
                                <div className="col-6">
                                  <label className="form-label">Kafolat</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={editingProduct.warranty}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, warranty: e.target.value })}
                                    placeholder="3 oy kafolat"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="mb-3">
                                <label className="form-label required">Noutbuk Nomi</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={newProduct.name || ""}
                                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                  placeholder="Masalan: Lenovo Legion 5 Pro"
                                />
                              </div>
                              <div className="row g-2 mb-3">
                                <div className="col-6">
                                  <label className="form-label">Kategoriya</label>
                                  <select
                                    className="form-select"
                                    value={newProduct.category || "Gaming"}
                                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                  >
                                    <option value="Gaming">Gaming</option>
                                    <option value="Business">Business</option>
                                    <option value="Ultrabook">Ultrabook</option>
                                    <option value="Premium">Premium</option>
                                  </select>
                                </div>
                                <div className="col-6">
                                  <label className="form-label required">Narxi</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={newProduct.price || ""}
                                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                    placeholder="$580"
                                  />
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label">Xarakteristikasi (Specs)</label>
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  value={newProduct.specs || ""}
                                  onChange={(e) => setNewProduct({ ...newProduct, specs: e.target.value })}
                                  placeholder="Ryzen 7 5800H / 16GB RAM / 512GB SSD / RTX3060 6GB"
                                />
                              </div>
                              <div className="row g-2">
                                <div className="col-6">
                                  <label className="form-label">Status</label>
                                  <select
                                    className="form-select"
                                    value={newProduct.stock || "In Stock"}
                                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value as any })}
                                  >
                                    <option value="In Stock">Mavjud (In Stock)</option>
                                    <option value="Low Stock">Kam qoldi (Low Stock)</option>
                                    <option value="Pre-order">Buyurtmaga (Pre-order)</option>
                                  </select>
                                </div>
                                <div className="col-6">
                                  <label className="form-label">Kafolat</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={newProduct.warranty || "2 oy kafolat"}
                                    onChange={(e) => setNewProduct({ ...newProduct, warranty: e.target.value })}
                                    placeholder="2 oy kafolat"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="modal-footer">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setEditingProduct(null);
                              setIsAddingProduct(false);
                            }}
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={editingProduct ? handleSaveProductEdit : handleCreateProduct}
                          >
                            <IconCheck size={16} /> Saqlash
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                                <div className="btn-group btn-group-sm">
                                  {ord.status?.toLowerCase() !== "confirmed" && ord.status?.toLowerCase() !== "completed" && (
                                    <button
                                      className="btn btn-outline-success"
                                      onClick={() => handleUpdateOrderStatus(ord.id, "Confirmed")}
                                      title="Tasdiqlash"
                                    >
                                      <IconCheck size={14} />
                                    </button>
                                  )}
                                  {ord.status?.toLowerCase() !== "completed" && (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => handleUpdateOrderStatus(ord.id, "Completed")}
                                      title="Bajarildi"
                                    >
                                      Bajarildi
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDeleteOrder(ord.id)}
                                    title="O'chirish"
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
                                  <TelegramUserAvatar userId={c.chat_id} name={c.customer_name} size="sm" className="me-2" />
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
                          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Tavsiya etiladi - ultra tez 0.7s)</option>
                          <option value="gemini-3.5-flash">gemini-3.5-flash (Yuqori aniqlik va muvozanat)</option>
                          <option value="gemini-flash-latest">gemini-flash-latest (Avtomatik eng so'nggi versiya)</option>
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

                  {/* Telegram Bot & Webhook Card */}
                  <div className="card mt-3">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                        <IconBrandTelegram size={20} className="text-primary" />
                        <span>Telegram Bot va Webhook Integratsiyasi</span>
                      </h3>
                      <div>
                        {currentOrgDetails?.telegram_bot_token_set ? (
                          <span className="badge bg-success-lt text-success d-inline-flex align-items-center gap-1">
                            <IconCheck size={14} /> Bot Ulangan
                          </span>
                        ) : (
                          <span className="badge bg-warning-lt text-warning d-inline-flex align-items-center gap-1">
                            <IconAlertCircle size={14} /> Bot Ulanmagan
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      {/* Bot Token Section */}
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Telegram Bot Token (BotFather'dan olingan)
                        </label>
                        <div className="input-group">
                          <input
                            type={showBotToken ? "text" : "password"}
                            className="form-control font-monospace"
                            placeholder={currentOrgDetails?.telegram_bot_token_set ? "••••••••••••••••••••••••••••••••" : "Masalan: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"}
                            value={botTokenInput}
                            onChange={(e) => setBotTokenInput(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowBotToken(!showBotToken)}
                            title={showBotToken ? "Yashirish" : "Ko'rsatish"}
                          >
                            {showBotToken ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-primary d-inline-flex align-items-center gap-1"
                            onClick={handleVerifyBotToken}
                            disabled={botTokenVerifying || !botTokenInput.trim()}
                          >
                            {botTokenVerifying ? (
                              <span className="spinner-border spinner-border-sm" role="status" />
                            ) : (
                              <IconCheck size={16} />
                            )}
                            Tekshirish
                          </button>
                        </div>
                        <small className="form-hint">
                          Token shifrlangan holda (AES-128 Fernet) saqlanadi va xavfsiz Telegram Webhook orqali ishlaydi.
                        </small>
                      </div>

                      {/* Bot Verification Alert */}
                      {botTokenResult && (
                        <div className={`alert ${botTokenResult.valid ? "alert-success" : "alert-danger"} d-flex align-items-center gap-2 py-2 mb-3`}>
                          {botTokenResult.valid ? <IconCheck size={18} /> : <IconAlertCircle size={18} />}
                          <div>
                            {botTokenResult.valid ? (
                              <>
                                <strong>Bot tasdiqlandi:</strong> @{botTokenResult.bot_username} ({botTokenResult.bot_name}) • ID: {botTokenResult.bot_id}
                              </>
                            ) : (
                              <>
                                <strong>Xatolik:</strong> {botTokenResult.error}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Webhook Endpoint Info */}
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Webhook Havolasi</label>
                        <div className="p-2 rounded bg-dark border border-secondary border-opacity-25 d-flex align-items-center justify-content-between font-monospace small">
                          <span className="text-info text-truncate">
                            {currentOrgDetails?.webhook_url || `/telegram/webhook/${currentOrgDetails?.slug || activeOrgId}`}
                          </span>
                          <span className="badge bg-secondary-lt text-secondary">POST</span>
                        </div>
                        <small className="form-hint">
                          Telegram har bir yangi xabarni ushbu xavfsiz tenant endpointiga maxsus secret token bilan yuboradi.
                        </small>
                      </div>

                      {/* Webhook Actions */}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                          onClick={handleSetWebhook}
                          disabled={webhookSetting || !currentOrgDetails?.telegram_bot_token_set}
                        >
                          {webhookSetting ? (
                            <span className="spinner-border spinner-border-sm" role="status" />
                          ) : (
                            <IconRefresh size={14} />
                          )}
                          Telegram setWebhook Yangilash
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-info btn-sm d-inline-flex align-items-center gap-1"
                          onClick={handleCheckWebhookStatus}
                          disabled={webhookStatusChecking || !currentOrgDetails?.telegram_bot_token_set}
                        >
                          {webhookStatusChecking ? (
                            <span className="spinner-border spinner-border-sm" role="status" />
                          ) : (
                            <IconActivity size={14} />
                          )}
                          Webhook Holatini Tekshirish
                        </button>
                      </div>

                      {/* Webhook Info Display */}
                      {webhookInfo && (
                        <div className="card bg-dark border border-secondary border-opacity-25 mb-3">
                          <div className="card-body p-3">
                            <div className="fw-semibold text-white small mb-2 d-flex align-items-center justify-content-between">
                              <span>Telegram Webhook Statusi</span>
                              <span className={`badge ${webhookInfo.webhook_info?.url ? "bg-success-lt text-success" : "bg-warning-lt text-warning"}`}>
                                {webhookInfo.webhook_info?.url ? "Faol (O'rnatilgan)" : "O'rnatilmagan"}
                              </span>
                            </div>
                            <div className="small text-secondary">
                              <div><strong>URL:</strong> <span className="font-monospace text-info">{webhookInfo.webhook_info?.url || "Mavjud emas"}</span></div>
                              <div><strong>Kutilayotgan yangilanishlar:</strong> {webhookInfo.webhook_info?.pending_update_count ?? 0}</div>
                              <div><strong>Secret Token:</strong> {webhookInfo.has_webhook_secret ? "Himoyalangan" : "Yo'q"}</div>
                              {webhookInfo.webhook_info?.last_error_message && (
                                <div className="text-danger mt-1">
                                  <strong>So'nggi xatolik:</strong> {webhookInfo.webhook_info.last_error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom System Prompt */}
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Do'kon AI Sotuvchisi Uchun Maxsus Tizim Ko'rsatmasi (System Prompt)
                        </label>
                        <textarea
                          className="form-control font-monospace"
                          rows={4}
                          placeholder="Do'konning o'ziga xos xususiyatlari, yetkazib berish qoidalari yoki mijozlar bilan muloqot ohangi bo'yicha maxsus ko'rsatma..."
                          value={customPromptInput}
                          onChange={(e) => setCustomPromptInput(e.target.value)}
                        />
                        <small className="form-hint">
                          Ushbu ko'rsatma har bir mijoz bilan muloqotda asosiy AI modeliga qo'shimcha kontekst sifatida kiritiladi.
                        </small>
                      </div>
                    </div>
                    <div className="card-footer text-end">
                      <button
                        type="button"
                        className="btn btn-primary d-inline-flex align-items-center gap-1"
                        onClick={handleSaveBotSettings}
                        disabled={savingOrgSettings}
                      >
                        {savingOrgSettings ? (
                          <span className="spinner-border spinner-border-sm" role="status" />
                        ) : (
                          <IconCheck size={16} />
                        )}
                        Bot va AI Sozlamalarini Saqlash
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h3 className="card-title d-flex align-items-center gap-2">
                        <IconPhoto size={18} className="text-primary" />
                        <span>Kompaniya Logotipi</span>
                      </h3>
                    </div>
                    <div className="card-body text-center">
                      <div className="mb-3 p-3 rounded d-inline-flex flex-column align-items-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <div className="text-secondary small mb-2">Faol logotip ko'rinishi:</div>
                        <AppLogo src={logoUrl} size="xl" />
                      </div>

                      <div className="mb-3 text-start">
                        <label className="form-label text-secondary small">Yangi logotip yuklash (PNG, SVG, JPG):</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="form-control"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                        />
                      </div>

                      <div className="mb-3 text-start">
                        <label className="form-label text-secondary small">Yoki logotip URL manzili:</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="/logo.svg yoki https://..."
                            value={customLogoInput}
                            onChange={(e) => setCustomLogoInput(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSaveLogoUrl(customLogoInput)}
                          >
                            Saqlash
                          </button>
                        </div>
                        <small className="form-hint">
                          Faylni <code>web/public/logo.png</code> yoki <code>web/public/logo.svg</code> papkasiga joylashtirib ham ishlatishingiz mumkin.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm w-100"
                        onClick={() => {
                          handleSaveLogoUrl("/logo.svg");
                          setCustomLogoInput("/logo.svg");
                        }}
                      >
                        Standart logotipga qaytarish
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Tizim Ma'lumotlari</h3>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <div className="text-secondary fs-6">Frontend Framework:</div>
                        <div className="fw-bold">Next.js 15 Enterprise UI</div>
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
                  <div className="card shadow-sm">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                        <IconShieldLock size={20} className="text-primary" />
                        <span>Administratorlar Ro'yxati</span>
                        <span className="badge bg-primary-lt ms-1">{admins.length}</span>
                      </h3>
                      <span className="text-secondary small">Rol va ruxsatlarni boshqarish</span>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-vcenter card-table table-hover">
                        <thead>
                          <tr>
                            <th style={{ width: "30%" }}>Admin</th>
                            <th style={{ width: "16%" }}>Telegram ID</th>
                            <th style={{ width: "18%" }}>Roli</th>
                            <th style={{ width: "26%" }}>Ruxsatlar</th>
                            <th style={{ width: "10%" }} className="text-center">Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((adm) => {
                            const cleanUser = cleanTelegramUsername(adm.username);
                            const activeCount = Object.entries(adm.permissions || {}).filter(
                              ([k, v]) => Boolean(v) && k !== "can_switch_admins" && k !== "switch_admins"
                            ).length;
                            const totalCount = Object.keys(PERMISSION_LABELS).length;
                            const isOwner = adm.role === "owner";

                            return (
                              <tr key={adm.id} style={{ height: "62px" }}>
                                <td>
                                  <div className="d-flex align-items-center gap-2.5">
                                    <TelegramUserAvatar userId={adm.telegram_user_id} name={adm.name} size="md" />
                                    <div className="text-truncate" style={{ maxWidth: 210 }}>
                                      <div className="fw-semibold text-white d-flex align-items-center gap-1.5">
                                        <span className="text-truncate">{adm.name || "Noma'lum"}</span>
                                        {isOwner && (
                                          <span className="badge bg-warning-lt text-warning p-1" title="Bosh Admin (Owner)">
                                            <IconCrown size={12} />
                                          </span>
                                        )}
                                      </div>
                                      <div className="small font-monospace">
                                        {cleanUser ? (
                                          <a
                                            href={`https://t.me/${cleanUser}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-info text-decoration-none hover-underline d-inline-flex align-items-center gap-1"
                                            title="Telegram profili ochish"
                                          >
                                            <span>@{cleanUser}</span>
                                            <IconExternalLink size={11} className="opacity-70" />
                                          </a>
                                        ) : (
                                          <span className="text-secondary opacity-60">—</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge bg-dark text-cyan border border-secondary border-opacity-25 font-monospace px-2.5 py-1">
                                    {adm.telegram_user_id}
                                  </span>
                                </td>
                                <td>
                                  {isOwner ? (
                                    <span className="badge bg-warning-lt text-warning d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-bold shadow-xs">
                                      <IconCrown size={14} /> Owner
                                    </span>
                                  ) : (
                                    <select
                                      className="form-select form-select-sm bg-dark text-white border-secondary border-opacity-40"
                                      style={{ width: "135px", fontSize: "12px", height: "30px", borderRadius: "6px" }}
                                      value={adm.role}
                                      onChange={(e) => handleRoleChange(adm.telegram_user_id, e.target.value)}
                                      disabled={busy}
                                    >
                                      <option value="admin">🛡️ Admin</option>
                                      <option value="moderator">👤 Moderator</option>
                                    </select>
                                  )}
                                </td>
                                <td>
                                  {isOwner ? (
                                    <span className="badge bg-green-lt text-green d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-medium">
                                      <IconShieldCheck size={14} /> Barcha ruxsatlar faol ({totalCount}/{totalCount})
                                    </span>
                                  ) : (
                                    <div className="d-flex align-items-center gap-2">
                                      <span
                                        className={`badge ${
                                          activeCount === totalCount
                                            ? "bg-green-lt text-green"
                                            : activeCount > 0
                                            ? "bg-blue-lt text-blue"
                                            : "bg-secondary-lt text-secondary"
                                        } d-inline-flex align-items-center gap-1.5 px-2.5 py-1 fw-semibold`}
                                        style={{ fontSize: "12px", cursor: "pointer" }}
                                        onClick={() => setManagingPermissionsAdmin(adm)}
                                        title="Ruxsatlarni ko'rish va sozlash"
                                      >
                                        <IconShieldCheck size={14} />
                                        <span>{activeCount} / {totalCount} ta faol</span>
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-0.5"
                                        style={{ height: "28px", fontSize: "11px", borderRadius: "6px" }}
                                        onClick={() => setManagingPermissionsAdmin(adm)}
                                        title="Ruxsatlarni boshqarish"
                                      >
                                        <IconAdjustments size={13} />
                                        <span>Sozlash</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="text-center">
                                  {isOwner ? (
                                    <span
                                      className="text-secondary opacity-30 d-inline-flex align-items-center justify-content-center"
                                      style={{ width: 28, height: 28 }}
                                      title="Bosh adminni o'chirib bo'lmaydi"
                                    >
                                      <IconLock size={15} />
                                    </span>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-outline-danger p-1"
                                      style={{ width: 30, height: 30 }}
                                      onClick={() => handleDeleteAdmin(adm.telegram_user_id, adm.name)}
                                      disabled={busy}
                                      title="Adminni o'chirish"
                                    >
                                      <IconTrash size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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
                  <div className="card shadow-sm">
                    <div className="card-header">
                      <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                        <IconPlus size={18} className="text-primary" />
                        <span>Yangi Admin Qo'shish</span>
                      </h3>
                    </div>
                    <form onSubmit={handleAddAdmin}>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label required" htmlFor="new-admin-id">
                            Telegram User ID
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
                          <small className="form-hint">Adminning Telegram hisob raqami (ID)</small>
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
                              onChange={(e) => setNewAdminUsername(cleanTelegramUsername(e.target.value))}
                            />
                          </div>
                          <small className="form-hint">Masalan: <code>Saida4881</code> yoki t.me havolasi</small>
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
                      <div className="card-footer bg-transparent text-end">
                        <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-1.5" disabled={busy || !newAdminId.trim()}>
                          <IconPlus size={16} /> Adminni saqlash
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* PERMISSION MANAGEMENT MODAL */}
                {managingPermissionsAdmin && (
                  <div
                    className="modal modal-blur fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: "rgba(0,0,0,0.72)", zIndex: 1060 }}
                  >
                    <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                      <div className="modal-content shadow-lg border-secondary border-opacity-25" style={{ background: "#171d29", borderRadius: 16 }}>
                        <div className="modal-header border-bottom border-white-10 py-3 px-4">
                          <div className="d-flex align-items-center gap-3">
                            <TelegramUserAvatar
                              userId={managingPermissionsAdmin.telegram_user_id}
                              name={managingPermissionsAdmin.name}
                              size="md"
                            />
                            <div>
                              <h5 className="modal-title text-white d-flex align-items-center gap-2 mb-0">
                                <IconShieldLock size={20} className="text-primary" />
                                <span>{managingPermissionsAdmin.name || "Admin"} — Ruxsatlar Boshqaruvi</span>
                              </h5>
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="badge bg-dark text-cyan font-monospace px-2 py-0.5" style={{ fontSize: "11px" }}>
                                  ID: {managingPermissionsAdmin.telegram_user_id}
                                </span>
                                {cleanTelegramUsername(managingPermissionsAdmin.username) && (
                                  <span className="text-secondary small font-monospace">
                                    @{cleanTelegramUsername(managingPermissionsAdmin.username)}
                                  </span>
                                )}
                                <span className="badge bg-blue-lt text-blue px-2 py-0.5 text-uppercase" style={{ fontSize: "10px" }}>
                                  {managingPermissionsAdmin.role}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            aria-label="Close"
                            onClick={() => setManagingPermissionsAdmin(null)}
                          />
                        </div>

                        <div className="modal-body p-4" style={{ maxHeight: "68vh", overflowY: "auto" }}>
                          {/* Quick Preset Action Bar */}
                          <div
                            className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-3 mb-4"
                            style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                          >
                            <div>
                              <div className="text-white fw-bold small">Tezkor amallar:</div>
                              <div className="text-secondary small" style={{ fontSize: "11px" }}>
                                Bir bosishda barcha huquqlarni to'liq faollashtiring yoki tozalang
                              </div>
                            </div>
                            <div className="d-flex gap-2 mt-2 mt-sm-0">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5"
                                onClick={() => handleBatchPermissions(managingPermissionsAdmin.telegram_user_id, true)}
                                disabled={busy}
                              >
                                <IconCheck size={14} /> Barchasini yoqish
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1.5"
                                onClick={() => handleBatchPermissions(managingPermissionsAdmin.telegram_user_id, false)}
                                disabled={busy}
                              >
                                <IconX size={14} /> Barchasini o'chirish
                              </button>
                            </div>
                          </div>

                          {/* Grouped Permission Categories */}
                          <div className="space-y-4">
                            {PERMISSION_CATEGORIES.map((cat, idx) => (
                              <div
                                key={idx}
                                className="rounded-3 p-3.5 mb-3"
                                style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
                              >
                                <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-white-5">
                                  <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                                  <div>
                                    <div className="text-white fw-bold small mb-0">{cat.category}</div>
                                    <div className="text-secondary small" style={{ fontSize: "11px" }}>{cat.description}</div>
                                  </div>
                                </div>

                                <div className="row g-2.5 pt-1">
                                  {cat.permissions.map((p) => {
                                    const isEnabled = Boolean(managingPermissionsAdmin.permissions?.[p.key]);
                                    return (
                                      <div className="col-12 col-md-6" key={p.key}>
                                        <div
                                          className={`p-2.5 rounded-2 d-flex align-items-center justify-content-between transition-all ${
                                            isEnabled ? "border border-success border-opacity-30" : "border border-white-5"
                                          }`}
                                          style={{
                                            background: isEnabled ? "rgba(47, 179, 68, 0.08)" : "rgba(0, 0, 0, 0.2)",
                                            cursor: "pointer",
                                          }}
                                          onClick={() =>
                                            handleTogglePermission(
                                              managingPermissionsAdmin.telegram_user_id,
                                              p.key,
                                              isEnabled
                                            )
                                          }
                                        >
                                          <div className="pe-2 flex-grow-1">
                                            <div className={`fw-semibold small ${isEnabled ? "text-success" : "text-secondary"}`}>
                                              {p.label}
                                            </div>
                                            <div className="text-secondary small" style={{ fontSize: "10.5px", lineHeight: 1.3 }}>
                                              {p.desc}
                                            </div>
                                          </div>
                                          <div className="form-check form-switch m-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              className="form-check-input"
                                              type="checkbox"
                                              role="switch"
                                              checked={isEnabled}
                                              onChange={() =>
                                                handleTogglePermission(
                                                  managingPermissionsAdmin.telegram_user_id,
                                                  p.key,
                                                  isEnabled
                                                )
                                              }
                                              disabled={busy}
                                              style={{ cursor: "pointer" }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="modal-footer border-top border-white-10 py-2.5 px-4 d-flex align-items-center justify-content-between">
                          <div className="text-secondary small">
                            Faol ruxsatlar soni:{" "}
                            <span className="fw-bold text-white">
                              {Object.entries(managingPermissionsAdmin.permissions || {}).filter(
                                ([k, v]) => Boolean(v) && k !== "can_switch_admins" && k !== "switch_admins"
                              ).length}
                            </span>{" "}
                            / {Object.keys(PERMISSION_LABELS).length}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary px-3"
                            onClick={() => setManagingPermissionsAdmin(null)}
                          >
                            <IconCheck size={16} className="me-1" /> Saqlash va Yopish
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

                      <div className="mt-4 pt-3 border-top border-secondary-subtle">
                        <h4 className="card-title mb-3 d-flex align-items-center gap-2">
                          <IconKey size={18} className="text-primary" />
                          <span>Granulyar Ruxsatlar Turlari (Permissions):</span>
                        </h4>
                        <div className="table-responsive">
                          <table className="table table-vcenter card-table table-sm">
                            <thead>
                              <tr>
                                <th>Ruxsat Kaliti</th>
                                <th>Tavsifi</th>
                                <th className="text-center">Owner</th>
                                <th className="text-center">Admin</th>
                                <th className="text-center">Moderator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(PERMISSION_LABELS).map(([k, label]) => (
                                <tr key={k}>
                                  <td>
                                    <span className="badge bg-secondary-lt font-monospace">{k}</span>
                                  </td>
                                  <td className="small">{label}</td>
                                  <td className="text-center"><span className="badge bg-success-lt text-success">Ha</span></td>
                                  <td className="text-center">
                                    {["can_manage_admins"].includes(k) ? (
                                      <span className="badge bg-danger-lt text-danger">Yo'q</span>
                                    ) : (
                                      <span className="badge bg-success-lt text-success">Ha</span>
                                    )}
                                  </td>
                                  <td className="text-center">
                                    {["can_view_conversations", "can_reply_customers", "can_takeover", "can_resume_ai", "can_view_knowledge", "can_view_orders"].includes(k) ? (
                                      <span className="badge bg-success-lt text-success">Ha</span>
                                    ) : (
                                      <span className="badge bg-danger-lt text-danger">Yo'q</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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

            {/* 12. ADMIN PROFILE & UNIFIED DESIGN SETTINGS TAB */}
            {tab === "profile" && (
              <div className="row row-cards">
                {/* Left Column: Admin Profile Card */}
                <div className="col-12 col-lg-5">
                  <div className="card shadow-sm h-100">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                        <IconShieldCheck size={20} className="text-primary" />
                        <span>Admin Profili</span>
                      </h3>
                      <span className="badge bg-green-lt text-green d-flex align-items-center gap-1">
                        <span className="status-dot status-dot-animated bg-green"></span>
                        Online
                      </span>
                    </div>
                    <div className="card-body text-center py-4">
                      {/* Telegram Avatar Display */}
                      <div className="position-relative d-inline-block mb-3">
                        {!profileAvatarError && Boolean(activeAdminTelegramId) && Number(activeAdminTelegramId) > 0 ? (
                          <img
                            key={activeAdminTelegramId}
                            src={`/api/proxy?path=/admin/users/${activeAdminTelegramId}/avatar`}
                            alt={currentAdmin?.name || "Admin"}
                            className="avatar avatar-xl rounded-circle shadow-lg"
                            style={{
                              width: 86,
                              height: 86,
                              objectFit: "cover",
                              border: "3px solid #007aff",
                              boxShadow: "0 0 16px rgba(0, 122, 255, 0.4)",
                            }}
                            onError={() => setProfileAvatarError(true)}
                          />
                        ) : (
                          <span
                            className="avatar avatar-xl rounded-circle text-white shadow-sm"
                            style={{
                              width: 86,
                              height: 86,
                              fontSize: "2.2rem",
                              background: "linear-gradient(135deg, #007aff 0%, #0051a8 100%)",
                            }}
                          >
                            <IconShieldCheck size={42} />
                          </span>
                        )}
                        <span
                          className="position-absolute bg-success rounded-circle border border-2 border-dark"
                          style={{ width: 16, height: 16, bottom: 4, right: 4 }}
                          title="Online"
                        />
                      </div>

                      <h3 className="m-0 mb-1 fw-bold">
                        {currentAdmin?.name || "Muxammadaziz"}
                      </h3>
                      {currentAdmin?.username && (
                        <div className="mb-2">
                          <a
                            href={`https://t.me/${currentAdmin.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge bg-blue-lt text-decoration-none px-2 py-1"
                          >
                            @{currentAdmin.username}
                          </a>
                        </div>
                      )}
                      <div className="d-flex justify-content-center gap-2 mb-3">
                        <span className="badge bg-purple-lt fw-semibold">
                          {currentAdmin?.role === "owner" ? "Owner (Tizim Egasi)" : (currentAdmin?.role || "Admin")}
                        </span>
                        <span className="badge bg-dark text-cyan border border-secondary border-opacity-25 font-monospace px-2.5 py-1">
                          ID: {activeAdminTelegramId}
                        </span>
                      </div>

                      {/* Admin Ruxsatlari va Vakolatlari */}
                      <div
                        className="card text-start mb-3"
                        style={{
                          borderRadius: 14,
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                        }}
                      >
                        <div
                          className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between bg-transparent"
                          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <IconShieldLock size={18} className="text-primary" />
                            <span className="fw-bold small" style={{ fontSize: "0.88rem", letterSpacing: "0.2px", color: "#ffffff" }}>
                              Biriktirilgan Ruxsatlar
                            </span>
                          </div>
                          <span className="badge bg-primary text-white small px-2 py-1 fw-semibold" style={{ fontSize: "0.72rem" }}>
                            {currentAdmin?.role === "owner" ? "To'liq Huquq" : "Cheklangan"}
                          </span>
                        </div>
                        <div className="card-body p-3">
                          {currentAdmin?.role === "owner" ? (
                            <div
                              className="d-flex align-items-center mb-0 py-2.5 px-3 rounded-3"
                              style={{
                                background: "rgba(47, 179, 68, 0.15)",
                                border: "1px solid rgba(47, 179, 68, 0.35)",
                                color: "#ffffff",
                              }}
                            >
                              <IconShieldCheck size={20} className="me-2.5 flex-shrink-0 text-success" />
                              <div className="small text-white" style={{ lineHeight: 1.45 }}>
                                <strong className="text-success fw-bold">Bosh Administrator (Owner):</strong> Tizimdagi barcha modullar, sozlamalar va adminlarni boshqarish huquqiga ega.
                              </div>
                            </div>
                          ) : (
                            <div className="d-flex flex-wrap gap-1.5">
                              {Object.entries(currentAdmin?.permissions || {})
                                .filter(([k, v]) => Boolean(v) && k !== "can_switch_admins" && k !== "switch_admins")
                                .map(([key]) => (
                                  <span key={key} className="badge bg-green-lt text-green d-inline-flex align-items-center gap-1 py-1 px-2 fw-medium">
                                    <IconCheck size={12} />
                                    {PERMISSION_LABELS[key] || key.replace("can_", "")}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="list-group list-group-flush text-start my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <div className="list-group-item d-flex justify-content-between px-2 py-2.5 bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-secondary fw-medium">Admin:</span>
                          <span className="fw-semibold text-white">{currentAdmin?.name || "Muxammadaziz"}</span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-2 py-2.5 bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-secondary fw-medium">Telegram ID:</span>
                          <span className="font-monospace text-cyan fw-bold">{activeAdminTelegramId}</span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-2 py-2.5 bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-secondary fw-medium">Rol:</span>
                          <span className="fw-semibold text-capitalize text-white">{currentAdmin?.role || "Owner"}</span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-2 py-2.5 bg-transparent">
                          <span className="text-secondary fw-medium">Tizim holati:</span>
                          <span className="text-success fw-semibold d-inline-flex align-items-center gap-1.5">
                            <span className="status-dot status-dot-animated bg-success" style={{ width: 7, height: 7 }} /> Himoyalangan (SSL)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1.5 mt-2"
                        onClick={logout}
                      >
                        <IconLogout size={16} /> Tizimdan chiqish (Logout)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Unified Design Tools & Appearance */}
                <div className="col-12 col-lg-7">
                  <div className="card shadow-sm">
                    <div className="card-header">
                      <h3 className="card-title d-flex align-items-center gap-2 mb-0">
                        <IconPalette size={20} className="text-primary" />
                        <span>Dizayn & Tashqi Ko'rinish Anjomlari</span>
                      </h3>
                    </div>
                    <div className="card-body">
                      {/* 1. Design System Switcher */}
                      <div className="mb-4">
                        <label className="form-label fw-bold d-flex align-items-center gap-1.5 mb-2">
                          <IconDeviceMobile size={18} className="text-primary" />
                          <span>Sayt Dizayn Uslubi:</span>
                        </label>
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <div
                              className={`p-3 rounded-3 border transition-all ${
                                uiStyle === "ios"
                                  ? "border-primary bg-primary-lt shadow-sm"
                                  : "border-secondary-subtle"
                              }`}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (uiStyle !== "ios") toggleUiStyle();
                              }}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="avatar avatar-sm bg-primary text-white rounded-circle">
                                    <IconBrandApple size={18} />
                                  </span>
                                  <span className="fw-bold text-white">Apple iOS Uslubi</span>
                                </div>
                                {uiStyle === "ios" && (
                                  <span className="badge bg-primary text-white rounded-pill px-2">Faol</span>
                                )}
                              </div>
                              <p className="small mb-0" style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                                OLED Deep Black fon, Frosted Glass (oynasimon xiralashuv), Dynamic Island va yumaloq iMessage pufakchalari.
                              </p>
                            </div>
                          </div>

                          <div className="col-sm-6">
                            <div
                              className={`p-3 rounded-3 border transition-all ${
                                uiStyle === "tabler"
                                  ? "border-primary bg-primary-lt shadow-sm"
                                  : "border-secondary-subtle"
                              }`}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (uiStyle !== "tabler") toggleUiStyle();
                              }}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="avatar avatar-sm bg-secondary text-white rounded-3">
                                    <IconLayoutDashboard size={18} />
                                  </span>
                                  <span className="fw-bold text-white">Klassik Uslub</span>
                                </div>
                                {uiStyle === "tabler" && (
                                  <span className="badge bg-primary text-white rounded-pill px-2">Faol</span>
                                )}
                              </div>
                              <p className="small mb-0" style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                                Standart boshqaruv paneli, qat'iy panjara (grid), to'q kulrang bloklar va klassik korporativ interfeys.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <hr className="my-4 border-secondary-subtle" />

                      {/* 2. Theme Mode Switcher */}
                      <div className="mb-4">
                        <label className="form-label fw-bold d-flex align-items-center gap-1.5 mb-2">
                          <IconSun size={18} className="text-orange" />
                          <span>Rangli Mavzu (Theme Mode):</span>
                        </label>
                        <div className="row g-3">
                          <div className="col-6">
                            <div
                              className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                                theme === "dark" ? "border-primary bg-primary-lt shadow-sm" : "border-secondary-subtle"
                              }`}
                              style={{ cursor: "pointer" }}
                              onClick={() => setTheme("dark")}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <IconMoon size={20} className="text-yellow" />
                                <span className="fw-medium">Qorong'i (Dark)</span>
                              </div>
                              {theme === "dark" && <IconCheck size={18} className="text-primary" />}
                            </div>
                          </div>

                          <div className="col-6">
                            <div
                              className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                                theme === "light" ? "border-primary bg-primary-lt shadow-sm" : "border-secondary-subtle"
                              }`}
                              style={{ cursor: "pointer" }}
                              onClick={() => setTheme("light")}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <IconSun size={20} className="text-orange" />
                                <span className="fw-medium">Yorug' (Light)</span>
                              </div>
                              {theme === "light" && <IconCheck size={18} className="text-primary" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      <hr className="my-4 border-secondary-subtle" />

                      {/* 3. Company Brand Logo Customization */}
                      <div>
                        <label className="form-label fw-bold d-flex align-items-center gap-1.5 mb-2">
                          <IconPhoto size={18} className="text-primary" />
                          <span>Kompaniya Logotipi:</span>
                        </label>

                        <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <AppLogo src={logoUrl} size="lg" />
                          <div className="flex-fill">
                            <div className="fw-bold mb-1">Faol logotip ko'rinishi</div>
                            <div className="text-secondary small">Sayt burchagida va login oynasida shu logotip aks etadi</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label text-secondary small">Kompyuterdan logotip yuklash (PNG, SVG, JPG, WebP):</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label text-secondary small">Yoki logotip URL havolasi:</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="/logo.svg yoki https://..."
                              value={customLogoInput}
                              onChange={(e) => setCustomLogoInput(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleSaveLogoUrl(customLogoInput)}
                            >
                              Saqlash
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            handleSaveLogoUrl("/logo.svg");
                            setCustomLogoInput("/logo.svg");
                          }}
                        >
                          Standart logotipga qaytarish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 13. SAAS USAGE & LIMITS TAB */}
            {tab === "usage" && (
              <UsageTab
                usageData={usageData}
                loading={loading}
                onRefresh={() => loadSaaSData(activeOrgId)}
                onUpgradeClick={() => setTab("pricing")}
              />
            )}

            {/* 14. SAAS BILLING & SUBSCRIPTION TAB */}
            {tab === "billing" && (
              <BillingTab
                subscription={subscriptionData}
                loading={loading}
                onRefresh={() => loadSaaSData(activeOrgId)}
                onUpgradeClick={() => setTab("pricing")}
                onCancelSubscription={handleCancelSubscription}
                onResumeSubscription={handleResumeSubscription}
              />
            )}

            {/* 15. SAAS PRICING & PLANS TAB */}
            {tab === "pricing" && (
              <PricingTab
                plans={plansList}
                currentPlanCode={subscriptionData?.plan?.code || "pro"}
                onSelectPlan={handleUpgradePlan}
                loading={busy}
              />
            )}

            {/* 16. PLATFORM OWNER TAB */}
            {tab === "platform" && (
              <PlatformOwnerTab
                subTab={platformSubTab}
                metrics={platformMetrics}
                organizations={platformOrgs}
                usersList={platformUsers}
                systemHealth={systemHealth}
                auditLogs={auditLogs}
                loading={loading}
                onRefresh={loadPlatformData}
                onUpdatePlan={handleUpdatePlanConfig}
                onEnterStore={handleEnterStore}
                onSwitchSubTab={setPlatformSubTab}
                onCreateStore={handleCreateStore}
                onUpdateStoreStatus={handleUpdateStoreStatus}
                onDeleteStore={handleDeleteStore}
              />
            )}
              </>
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
                  <li className="list-inline-item text-secondary">
                    Telegram AI Sales Engine v2.4
                  </li>
                </ul>
              </div>
              <div className="col-12 col-lg-auto mt-3 mt-lg-0">
                <ul className="list-inline list-inline-dots mb-0">
                  <li className="list-inline-item text-secondary">
                    © 2026 AI Sales Control Center. Barcha huquqlar himoyalangan.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={handleCreateOrganization}
      />

      {/* Feature / Limit Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalConfig.isOpen}
        onClose={() => setUpgradeModalConfig({ isOpen: false })}
        featureName={upgradeModalConfig.featureName}
        requiredPlan={upgradeModalConfig.requiredPlan}
        message={upgradeModalConfig.message}
        onUpgradeToPlan={(planCode) => handleUpgradePlan(planCode, "monthly")}
      />
    </div>
  );
}
