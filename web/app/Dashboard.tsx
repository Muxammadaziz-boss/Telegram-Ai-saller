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
  IconTypography,
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
import { AppShell } from "./components/layout/AppShell";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { InboxTab } from "./components/tabs/InboxTab";
import { KnowledgeTab } from "./components/tabs/KnowledgeTab";
import { ProductsTab } from "./components/tabs/ProductsTab";
import { OrdersTab } from "./components/tabs/OrdersTab";
import { CustomersTab } from "./components/tabs/CustomersTab";
import { AnalyticsTab } from "./components/tabs/AnalyticsTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { AdminsTab } from "./components/tabs/AdminsTab";
import { TeamTab } from "./components/tabs/TeamTab";
import { LogsTab } from "./components/tabs/LogsTab";
import { ProfileTab } from "./components/tabs/ProfileTab";

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

const FONT_OPTIONS = [
  {
    id: "olline",
    name: "Olline",
    styleTag: "Geometric Bold",
    isNew: true,
    fontFamily: "'Olline', 'Outfit', 'Syne', sans-serif",
    description: "Zamonaviy geometrik qalin va kuchli vizual dizayn shrifti",
  },
  {
    id: "pogonia",
    name: "Pogonia",
    styleTag: "Aesthetic Rounded",
    isNew: true,
    fontFamily: "'Pogonia', 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif",
    description: "Estetik yumaloq neo-grotesk va zamonaviy iliq shrift",
  },
  {
    id: "inter",
    name: "Inter",
    styleTag: "Standard Default",
    isNew: false,
    fontFamily: "'Inter', sans-serif",
    description: "Standart neytral va professional tizimli interfeys shrifti",
  },
  {
    id: "sf-pro",
    name: "SF Pro",
    styleTag: "Apple iOS",
    isNew: false,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    description: "Apple iOS ekotizimining toza va silliq tizim shrifti",
  },
  {
    id: "jakarta",
    name: "Plus Jakarta",
    styleTag: "SaaS Modern",
    isNew: false,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    description: "Zamonaviy texnologik startaplar va panellar shrifti",
  },
];

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
  const [appFont, setAppFont] = useState<string>("olline");
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

    const syncFromUrl = () => {
      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/platform")) {
        setZone("platform");
      } else if (window.location.pathname.startsWith("/t/")) {
        setZone("tenant");
      }
      const h = window.location.hash.replace("#", "") as (typeof validTabs)[number];
      if (h && validTabs.includes(h)) {
        setTab(h);
      }
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  // Sync window URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const targetHash = `#${tab}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, "", targetHash);
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

  // Modal Escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLogoModal) setShowLogoModal(false);
        if (showOnboardingModal) setShowOnboardingModal(false);
        if (upgradeModalConfig.isOpen) setUpgradeModalConfig({ isOpen: false });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoModal, showOnboardingModal, upgradeModalConfig.isOpen]);

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
      const savedFont = localStorage.getItem("ai_sales_app_font") || "olline";
      setAppFont(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    } catch {}
  }, []);

  const handleSelectFont = (fontId: string) => {
    setAppFont(fontId);
    document.documentElement.setAttribute("data-font", fontId);
    try {
      localStorage.setItem("ai_sales_app_font", fontId);
    } catch {}
  };

  const toggleUiStyle = () => {
    const next = uiStyle === "tabler" ? "ios" : "tabler";
    setUiStyle(next);
    document.documentElement.setAttribute("data-ui-style", next);
    try {
      localStorage.setItem("ai_sales_ui_style", next);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.setAttribute("data-bs-theme", next);
    if (next === "light") {
      document.documentElement.classList.remove("theme-dark");
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("theme-dark");
    }
    try {
      localStorage.setItem("ai_sales_theme", next);
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
          <div className="modal modal-blur fade show d-block" role="dialog" aria-modal="true" aria-label="Kompaniya Logotipini Sozlash" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
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

  const breadcrumb = tab === "profile" ? "SYSTEM / ADMIN PROFILE & APPEARANCE" : (
    zone === "platform" ? "SAAS / PLATFORM OWNER CONTROL" : (
      tab === "overview" ? "WORKSPACE / OVERVIEW" :
      tab === "inbox" ? "WORKSPACE / LIVE INBOX" :
      tab === "knowledge" ? "WORKSPACE / KNOWLEDGE BASE" :
      tab === "products" ? "SALES / PRODUCTS CATALOG" :
      tab === "orders" ? "SALES / ORDERS MANAGEMENT" :
      tab === "customers" ? "SALES / CUSTOMERS DIRECTORY" :
      tab === "usage" ? "SAAS / USAGE & LIMITS METERING" :
      tab === "billing" ? "SAAS / SUBSCRIPTION & INVOICES" :
      tab === "pricing" ? "SAAS / COMMERCIAL PLANS MATRIX" :
      tab === "platform" ? "SAAS / PLATFORM OWNER CONTROL" :
      tab === "analytics" ? "INTELLIGENCE / ANALYTICS" :
      tab === "settings" ? "INTELLIGENCE / AI CONFIGURATION" :
      tab === "admins" ? "SYSTEM / ADMINISTRATION" :
      tab === "team" ? "SYSTEM / TEAM & ACCESS ROLES" :
      tab === "logs" ? "SYSTEM / AUDIT & ACTIVITY LOGS" :
      "SYSTEM / ADMIN PROFILE & APPEARANCE"
    )
  );

  const tabTitle = tab === "profile" ? "Admin Profili va Dizayn Sozlamalari" : (
    zone === "platform" ? (
      platformSubTab === "overview" ? "Platforma Umumiy Ko'rinishi (MRR & AI Xarajatlari)" :
      platformSubTab === "stores" ? "Do'konlar Portfeli (Tenants)" :
      platformSubTab === "users" ? "Platforma Foydalanuvchilari" :
      platformSubTab === "plans" ? "Tarif Rejalari va Narxlar" :
      platformSubTab === "usage" ? "AI Xarajatlari va Resurslar Sarfi" :
      platformSubTab === "system" ? "Tizim va Integratsiyalar Holati" :
      "Audit va Xavfsizlik Tarixi"
    ) : (
      tab === "overview" ? "Boshqaruv Paneli" :
      tab === "inbox" ? "Jonli Suhbatlar (Live Inbox)" :
      tab === "knowledge" ? "Telegram Mahsulotlar Bazasi" :
      tab === "products" ? "Mahsulotlar Katalogi" :
      tab === "orders" ? "Buyurtmalar Jurnali" :
      tab === "customers" ? "Mijozlar Ro'yxati" :
      tab === "usage" ? "Foydalanish va Resurs Limitlari" :
      tab === "billing" ? "Obuna va Hisob-Kitoblar" :
      tab === "pricing" ? "Tariflar va Imkoniyatlar" :
      tab === "platform" ? "Platforma Egasi Boshqaruv Markazi" :
      tab === "analytics" ? "Savdo va AI Statistikasi" :
      tab === "settings" ? "AI va Tizim Sozlamalari" :
      tab === "admins" ? "Administratorlar Boshqaruvi" :
      tab === "team" ? "Jamoa va Ruxsatlar Tizimi" :
      tab === "logs" ? "Tizim Amallari Tarixi" :
      "Admin Profili va Dizayn Sozlamalari"
    )
  );

  return (
    <div className="linear-app">
      <AppShell
        activeTab={tab}
        onSelectTab={(newTab) => {
          setTab(newTab);
          if (newTab === "platform") {
            setZone("platform");
          } else if (newTab !== "profile" && zone === "platform") {
            setZone("tenant");
          }
          if (typeof window !== "undefined") {
            const targetHash = `#${newTab}`;
            if (window.location.hash !== targetHash) {
              window.history.pushState(null, "", targetHash);
            }
          }
        }}
        platformSubTab={platformSubTab}
        onSelectPlatformSubTab={setPlatformSubTab}
        storesCount={platformOrgs.length}
        organizations={userOrganizations}
        activeOrgId={activeOrgId}
        onSelectOrg={switchOrganization}
        onOpenNewStoreModal={() => setShowOnboardingModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        loading={loading}
        onRefresh={load}
        isPlatformOwner={isPlatformOwner}
        zone={zone === "platform" ? "platform" : "store"}
        onSwitchZone={(z) => {
          if (z === "platform") {
            setZone("platform");
            setTab("platform");
          } else {
            setZone("tenant");
            setTab("overview");
          }
        }}
        storeName={activeStoreMeta?.name || userOrganizations.find((o) => o.id === activeOrgId)?.name || "AI Sales Central"}
        adminName={currentAdmin?.name || "Admin"}
        adminRole={currentAdmin?.role || "admin"}
        adminAvatarUrl={Boolean(activeAdminTelegramId) && activeAdminTelegramId > 0 && !navAvatarError ? `/api/proxy?path=/admin/users/${activeAdminTelegramId}/avatar` : ""}
        aiModel={aiModel}
        unreadCount={conversations.filter((c) => c.status === "human_takeover").length}
        productsCount={products.length}
        ordersCount={orders.length}
        logoUrl={logoUrl}
        onOpenLogoModal={() => setShowLogoModal(true)}
        onLogout={logout}
        breadcrumb={breadcrumb}
        tabTitle={tabTitle}
      >
        {/* Sticky Impersonation Banner if Platform Owner is exploring a store */}
        {zone === "tenant" && (isOwnerImpersonating || isPlatformOwner) && (
          <div
            className="p-3 mb-3 rounded-2 d-flex align-items-center justify-content-between border"
            style={{
              backgroundColor: "var(--warning-subtle)",
              borderColor: "var(--warning-border)",
              color: "var(--warning-text)",
            }}
          >
            <div className="d-flex align-items-center gap-2 small">
              <IconAlertCircle size={18} />
              <span>
                Siz <strong>{activeStoreMeta?.name || userOrganizations.find((o) => o.id === activeOrgId)?.name || "Do'kon"}</strong> ichidasiz (Platform Owner ko'rinishi)
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={handleExitStore}
            >
              Platformaga qaytish
            </button>
          </div>
        )}

        {/* Global Toast Alerts */}
        {error && (
          <div
            className="p-3 mb-3 rounded-2 d-flex align-items-center justify-content-between border"
            style={{
              backgroundColor: "var(--danger-subtle)",
              borderColor: "var(--danger-border)",
              color: "var(--danger-text)",
            }}
          >
            <div className="d-flex align-items-center gap-2 small">
              <IconAlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            />
          </div>
        )}

        {success && (
          <div
            className="p-3 mb-3 rounded-2 d-flex align-items-center justify-content-between border"
            style={{
              backgroundColor: "var(--success-subtle)",
              borderColor: "var(--success-border)",
              color: "var(--success-text)",
            }}
          >
            <div className="d-flex align-items-center gap-2 small">
              <IconCheck size={18} />
              <span>{success}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess("")}
            />
          </div>
        )}

        {/* Tab Modules */}
        {(zone === "platform" || tab === "platform") && tab !== "profile" ? (
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
            {tab === "overview" && (
              <OverviewTab
                overview={overview}
                conversations={conversations}
                orders={orders}
                channels={channels}
                aiModel={aiModel}
                onSelectConversation={(id) => setSelected(id)}
                onNavigateTab={(targetTab, filter) => {
                  setTab(targetTab);
                  if (filter) setInboxFilter(filter as any);
                }}
                onRefresh={load}
                loading={loading}
              />
            )}

            {tab === "inbox" && (
              <InboxTab
                conversations={conversations}
                selectedId={selected}
                onSelectConversation={(id) => setSelected(id)}
                messages={messages}
                inboxFilter={inboxFilter}
                setInboxFilter={setInboxFilter}
                inboxSearch={inboxSearch}
                setInboxSearch={setInboxSearch}
                draft={draft}
                setDraft={setDraft}
                onSendMessage={sendReply}
                onTakeover={(convId) => perform(`/admin/conversations/${convId}/takeover`)}
                onResumeAi={(convId) => perform(`/admin/conversations/${convId}/resume`)}
                busy={busy}
                customerNotes={customerNotes}
                onSaveCustomerNote={handleSaveCustomerNote}
                onSendCatalogProposal={handleSendCatalogProposal}
                onSendDiscountProposal={handleSendDiscountProposal}
              />
            )}

            {tab === "knowledge" && (
              <KnowledgeTab
                channels={channels}
                posts={posts}
                channelFilter={channelFilter}
                setChannelFilter={setChannelFilter}
                newChannelInput={newChannelInput}
                setNewChannelInput={setNewChannelInput}
                onConnectChannel={handleConnectChannel}
                onSyncChannel={handleSyncChannel}
                onDeleteChannel={handleDeleteChannel}
                onDeletePost={handleDeletePost}
                onExtractProducts={handleExtractProductsFromPosts}
                busy={busy}
              />
            )}

            {tab === "products" && (
              <ProductsTab
                products={products}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                isAddingProduct={isAddingProduct}
                setIsAddingProduct={setIsAddingProduct}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                newProduct={newProduct}
                setNewProduct={setNewProduct}
                onSaveProduct={() => {
                  if (editingProduct) void handleSaveProductEdit();
                  else void handleCreateProduct();
                }}
                onDeleteProduct={handleDeleteProduct}
                onExtractProducts={handleExtractProductsFromPosts}
                busy={busy}
              />
            )}

            {tab === "orders" && (
              <OrdersTab
                orders={orders}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onDeleteOrder={handleDeleteOrder}
                busy={busy}
              />
            )}

            {tab === "customers" && (
              <CustomersTab
                conversations={conversations}
                onSelectConversation={(id) => setSelected(id)}
                onNavigateInbox={() => setTab("inbox")}
              />
            )}

            {tab === "analytics" && (
              <AnalyticsTab
                conversations={conversations}
                orders={orders}
                overview={overview}
              />
            )}

            {tab === "settings" && (
              <SettingsTab
                aiModel={aiModel}
                setAiModel={setAiModel}
                aiTemperature={aiTemperature}
                setAiTemperature={setAiTemperature}
                autoHandoff={autoHandoff}
                setAutoHandoff={setAutoHandoff}
                doubleConfirmation={doubleConfirmation}
                setDoubleConfirmation={setDoubleConfirmation}
                businessHoursOnly={businessHoursOnly}
                setBusinessHoursOnly={setBusinessHoursOnly}
                onSaveAiSettings={() => setSuccess("AI sozlamalari muvaffaqiyatli saqlandi!")}
                currentOrgDetails={currentOrgDetails}
                botTokenInput={botTokenInput}
                setBotTokenInput={setBotTokenInput}
                showBotToken={showBotToken}
                setShowBotToken={setShowBotToken}
                botTokenVerifying={botTokenVerifying}
                onVerifyBotToken={handleVerifyBotToken}
                botTokenResult={botTokenResult}
                activeOrgId={activeOrgId}
                webhookSetting={webhookSetting}
                onSetWebhook={handleSetWebhook}
                webhookStatusChecking={webhookStatusChecking}
                onCheckWebhookStatus={handleCheckWebhookStatus}
                webhookInfo={webhookInfo}
                customPromptInput={customPromptInput}
                setCustomPromptInput={setCustomPromptInput}
                onSaveBotSettings={handleSaveBotSettings}
                savingOrgSettings={savingOrgSettings}
                logoUrl={logoUrl}
                customLogoInput={customLogoInput}
                setCustomLogoInput={setCustomLogoInput}
                onSaveLogoUrl={handleSaveLogoUrl}
                onLogoUpload={handleLogoUpload}
                channels={channels}
              />
            )}

            {tab === "admins" && (
              <AdminsTab
                admins={admins}
                newAdminId={newAdminId}
                setNewAdminId={setNewAdminId}
                newAdminName={newAdminName}
                setNewAdminName={setNewAdminName}
                newAdminUsername={newAdminUsername}
                setNewAdminUsername={setNewAdminUsername}
                newAdminRole={newAdminRole}
                setNewAdminRole={setNewAdminRole}
                onAddAdmin={handleAddAdmin}
                onRoleChange={handleRoleChange}
                onDeleteAdmin={handleDeleteAdmin}
                managingPermissionsAdmin={managingPermissionsAdmin}
                setManagingPermissionsAdmin={setManagingPermissionsAdmin}
                onTogglePermission={handleTogglePermission}
                busy={busy}
                permissionLabels={PERMISSION_LABELS}
                permissionCategories={PERMISSION_CATEGORIES}
              />
            )}

            {tab === "team" && (
              <TeamTab permissionLabels={PERMISSION_LABELS} />
            )}

            {tab === "logs" && (
              <LogsTab logs={auditLogs} />
            )}

            {tab === "profile" && (
              <ProfileTab
                currentAdmin={currentAdmin}
                activeAdminTelegramId={activeAdminTelegramId}
                profileAvatarError={profileAvatarError}
                setProfileAvatarError={setProfileAvatarError}
                theme={theme}
                setTheme={setTheme}
                appFont={appFont}
                onSelectFont={handleSelectFont}
                onLogout={logout}
                permissionLabels={PERMISSION_LABELS}
              />
            )}

            {tab === "usage" && (
              <UsageTab
                usageData={usageData}
                loading={loading}
                onRefresh={() => loadSaaSData(activeOrgId)}
                onUpgradeClick={() => setTab("pricing")}
              />
            )}

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

            {tab === "pricing" && (
              <PricingTab
                plans={plansList}
                currentPlanCode={subscriptionData?.plan?.code || "pro"}
                onSelectPlan={handleUpgradePlan}
                loading={busy}
              />
            )}
          </>
        )}
      </AppShell>

      {/* Modal for logo settings */}
      {showLogoModal && (
        <div className="modal modal-blur fade show d-block" role="dialog" aria-modal="true" aria-label="Kompaniya Logotipini Sozlash" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ background: "var(--bg-surface-elevated)", borderRadius: 16 }}>
              <div className="modal-header border-bottom border-subtle">
                <h5 className="modal-title text-primary d-flex align-items-center gap-2">
                  <span>Kompaniya Logotipini Sozlash</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowLogoModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4 p-3 rounded" style={{ background: "var(--bg-canvas)" }}>
                  <div className="text-secondary small mb-2">Joriy logotip ko'rinishi:</div>
                  <AppLogo src={customLogoInput || logoUrl} size="xl" />
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary small">Fayl yuklash (PNG, SVG, JPG, WebP):</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="linear-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary small">Yoki Logotip URL manzili:</label>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="linear-input"
                      placeholder="/logo.svg yoki https://..."
                      value={customLogoInput}
                      onChange={(e) => setCustomLogoInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleSaveLogoUrl(customLogoInput)}
                    >
                      Qo'llash
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top border-subtle d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-ghost-secondary btn-sm"
                  onClick={() => {
                    handleSaveLogoUrl("/logo.svg");
                    setCustomLogoInput("/logo.svg");
                  }}
                >
                  Standart logotip
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
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
