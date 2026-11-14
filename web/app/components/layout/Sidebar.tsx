"use client";

import React from "react";
import {
  IconLayoutDashboard,
  IconMessageDots,
  IconBooks,
  IconPackage,
  IconShoppingCart,
  IconUsers,
  IconChartBar,
  IconCpu,
  IconShieldLock,
  IconUserCheck,
  IconHistory,
  IconUser,
  IconGauge,
  IconCreditCard,
  IconLayersLinked,
  IconBuildingStore,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";

export type NavTabId =
  | "overview"
  | "inbox"
  | "knowledge"
  | "products"
  | "orders"
  | "customers"
  | "analytics"
  | "settings"
  | "admins"
  | "team"
  | "logs"
  | "profile"
  | "usage"
  | "billing"
  | "pricing"
  | "platform";

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  badge?: string | number;
  count?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tabId: NavTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPlatformOwner?: boolean;
  zone: "store" | "platform";
  onSwitchZone: (zone: "store" | "platform") => void;
  storeName?: string;
  unreadCount?: number;
  productsCount?: number;
  ordersCount?: number;
  logoUrl?: string;
  onOpenLogoModal?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  isPlatformOwner = false,
  zone,
  onSwitchZone,
  storeName = "AI Sales Control",
  unreadCount = 0,
  productsCount = 0,
  ordersCount = 0,
  logoUrl = "/logo.svg",
  onOpenLogoModal,
}: SidebarProps) {
  const navGroups: NavGroup[] = [
    {
      title: "WORKSPACE",
      items: [
        { id: "overview", label: "Overview", icon: IconLayoutDashboard },
        { id: "inbox", label: "Live Inbox", icon: IconMessageDots, badge: unreadCount > 0 ? unreadCount : undefined },
        { id: "knowledge", label: "Knowledge Base", icon: IconBooks },
      ],
    },
    {
      title: "SALES",
      items: [
        { id: "products", label: "Products", icon: IconPackage, count: productsCount > 0 ? productsCount : undefined },
        { id: "orders", label: "Orders", icon: IconShoppingCart, count: ordersCount > 0 ? ordersCount : undefined },
        { id: "customers", label: "Customers", icon: IconUsers },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        { id: "analytics", label: "Analytics", icon: IconChartBar },
        { id: "settings", label: "AI Settings", icon: IconCpu },
      ],
    },
    {
      title: "SAAS",
      items: [
        { id: "usage", label: "Usage & Limits", icon: IconGauge },
        { id: "billing", label: "Subscription", icon: IconCreditCard },
        { id: "pricing", label: "Plans & Pricing", icon: IconLayersLinked },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { id: "admins", label: "Administration", icon: IconShieldLock },
        { id: "team", label: "Team & Access", icon: IconUserCheck },
        { id: "logs", label: "Activity Logs", icon: IconHistory },
      ],
    },
  ];

  if (isPlatformOwner) {
    navGroups.push({
      title: "PLATFORM OWNER",
      items: [
        { id: "platform", label: "Platform Owner", icon: IconBuildingStore, badge: "Master" },
      ],
    });
  }

  navGroups.push({
    title: "ACCOUNT",
    items: [
      { id: "profile", label: "Profile & Design", icon: IconUser },
    ],
  });

  return (
    <aside
      className="d-flex flex-column border-end flex-shrink-0"
      style={{
        width: collapsed ? "64px" : "240px",
        minWidth: collapsed ? "64px" : "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        transition: "width var(--transition-base), min-width var(--transition-base)",
        zIndex: 1020,
        userSelect: "none",
      }}
    >
      {/* Brand Header */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom"
        style={{ borderColor: "var(--border-subtle)", height: "60px" }}
      >
        <div
          className="d-flex align-items-center gap-2.5 overflow-hidden cursor-pointer"
          onClick={onOpenLogoModal}
          title="Logotipni o'zgartirish"
        >
          <div
            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(94, 106, 210, 0.12)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.svg";
              }}
            />
          </div>
          {!collapsed && (
            <div className="d-flex flex-column overflow-hidden text-truncate">
              <span
                className="fw-bold text-primary text-truncate lh-1"
                style={{ fontSize: "0.88rem", letterSpacing: "-0.01em" }}
              >
                {zone === "platform" ? "Platform Owner" : storeName}
              </span>
              <span
                className="text-secondary small mt-1"
                style={{ fontSize: "0.68rem", letterSpacing: "0.02em" }}
              >
                {zone === "platform" ? "Super Admin Mode" : "Telegram AI Agent"}
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="btn btn-sm p-1 d-none d-lg-flex align-items-center justify-content-center rounded"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            width: "24px",
            height: "24px",
          }}
          title={collapsed ? "Kengaytirish" : "Yig'ish"}
        >
          {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-grow-1 overflow-y-auto px-2 py-3 custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={group.title} className={groupIdx > 0 ? "mt-3 pt-2" : ""}>
            {!collapsed ? (
              <div
                className="px-2 mb-1.5 text-uppercase fw-semibold"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                }}
              >
                {group.title}
              </div>
            ) : (
              <div
                className="my-2 border-top"
                style={{ borderColor: "var(--border-subtle)" }}
              />
            )}

            <div className="d-flex flex-column gap-0.5">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === "platform" && zone !== "platform") {
                        onSwitchZone("platform");
                      } else if (item.id !== "platform" && zone === "platform") {
                        onSwitchZone("store");
                      }
                      onSelectTab(item.id);
                    }}
                    className={`d-flex align-items-center gap-2.5 px-2.5 py-1.5 rounded text-start w-100 border-0 transition-all ${
                      isActive ? "fw-medium" : "text-secondary"
                    }`}
                    style={{
                      backgroundColor: isActive ? "var(--bg-surface-hover)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      height: "32px",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComponent
                      size={16}
                      style={{
                        color: isActive ? "var(--accent)" : "inherit",
                        flexShrink: 0,
                      }}
                    />
                    {!collapsed && (
                      <span className="flex-grow-1 text-truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge !== undefined && (
                      <span
                        className="badge rounded-pill"
                        style={{
                          fontSize: "0.65rem",
                          padding: "2px 6px",
                          backgroundColor:
                            typeof item.badge === "number"
                              ? "var(--accent)"
                              : "var(--accent-subtle)",
                          color:
                            typeof item.badge === "number"
                              ? "#fff"
                              : "var(--accent-text)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {!collapsed && item.count !== undefined && (
                      <span
                        className="small"
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Platform Owner Indicator / Fast Switch */}
      {isPlatformOwner && !collapsed && (
        <div
          className="p-2.5 m-2 rounded-2 border"
          style={{
            backgroundColor: zone === "platform" ? "var(--accent-subtle)" : "var(--bg-surface-elevated)",
            borderColor: zone === "platform" ? "var(--accent-border)" : "var(--border-subtle)",
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1.5">
            <span
              className="badge rounded-pill fw-medium"
              style={{
                fontSize: "0.65rem",
                padding: "2px 6px",
                backgroundColor: zone === "platform" ? "var(--accent)" : "rgba(255,255,255,0.08)",
                color: zone === "platform" ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              {zone === "platform" ? "Platform Rejimi" : "Do'kon Rejimi"}
            </span>
            <IconSparkles size={13} style={{ color: "var(--accent)" }} />
          </div>
          <button
            type="button"
            onClick={() => onSwitchZone(zone === "platform" ? "store" : "platform")}
            className="btn btn-sm w-100 py-1"
            style={{
              fontSize: "0.72rem",
              background: zone === "platform" ? "var(--accent)" : "transparent",
              color: zone === "platform" ? "#ffffff" : "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {zone === "platform" ? "Do'konga qaytish" : "Platform boshqaruvi"}
          </button>
        </div>
      )}
    </aside>
  );
}
