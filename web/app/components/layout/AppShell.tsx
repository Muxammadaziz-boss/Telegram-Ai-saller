"use client";

import React, { useState } from "react";
import { Sidebar, NavTabId, PlatformSubTabId } from "./Sidebar";
import { Topbar, OrganizationItem } from "./Topbar";

export interface AppShellProps {
  children: React.ReactNode;
  activeTab: NavTabId;
  onSelectTab: (tabId: NavTabId) => void;
  organizations: OrganizationItem[];
  activeOrgId: number;
  onSelectOrg: (orgId: number) => void;
  onOpenNewStoreModal: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  loading: boolean;
  onRefresh: () => void;
  isPlatformOwner?: boolean;
  zone: "store" | "platform";
  onSwitchZone: (zone: "store" | "platform") => void;
  platformSubTab?: PlatformSubTabId;
  onSelectPlatformSubTab?: (subTab: PlatformSubTabId) => void;
  storesCount?: number;
  storeName?: string;
  adminName?: string;
  adminRole?: string;
  adminAvatarUrl?: string;
  aiModel?: string;
  unreadCount?: number;
  productsCount?: number;
  ordersCount?: number;
  logoUrl?: string;
  onOpenLogoModal?: () => void;
  onLogout: () => void;
  breadcrumb: string;
  tabTitle: string;
}

export function AppShell({
  children,
  activeTab,
  onSelectTab,
  organizations,
  activeOrgId,
  onSelectOrg,
  onOpenNewStoreModal,
  theme,
  onToggleTheme,
  loading,
  onRefresh,
  isPlatformOwner = false,
  zone,
  onSwitchZone,
  platformSubTab,
  onSelectPlatformSubTab,
  storesCount,
  storeName = "AI Sales Control",
  adminName = "Admin",
  adminRole = "admin",
  adminAvatarUrl,
  aiModel,
  unreadCount = 0,
  productsCount = 0,
  ordersCount = 0,
  logoUrl = "/logo.svg",
  onOpenLogoModal,
  onLogout,
  breadcrumb,
  tabTitle,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex w-100" style={{ minHeight: "100vh", backgroundColor: "var(--bg-canvas)" }}>
      {/* Desktop / Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isPlatformOwner={isPlatformOwner}
        zone={zone}
        onSwitchZone={onSwitchZone}
        platformSubTab={platformSubTab}
        onSelectPlatformSubTab={onSelectPlatformSubTab}
        storesCount={storesCount}
        storeName={storeName}
        unreadCount={unreadCount}
        productsCount={productsCount}
        ordersCount={ordersCount}
        logoUrl={logoUrl}
        onOpenLogoModal={onOpenLogoModal}
      />

      {/* Main Content View with Topbar */}
      <div className="d-flex flex-column flex-grow-1 overflow-x-hidden" style={{ minWidth: 0 }}>
        <Topbar
          breadcrumb={breadcrumb}
          tabTitle={tabTitle}
          organizations={organizations}
          activeOrgId={activeOrgId}
          onSelectOrg={onSelectOrg}
          onOpenNewStoreModal={onOpenNewStoreModal}
          theme={theme}
          onToggleTheme={onToggleTheme}
          loading={loading}
          onRefresh={onRefresh}
          adminName={adminName}
          adminRole={adminRole}
          adminAvatarUrl={adminAvatarUrl}
          aiModel={aiModel}
          onLogout={onLogout}
          onOpenProfile={() => onSelectTab("profile")}
          isPlatformOwner={isPlatformOwner}
        />

        {/* Tab Page Workspace */}
        <main
          className="flex-grow-1 p-3 p-md-4 custom-scrollbar"
          style={{
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
