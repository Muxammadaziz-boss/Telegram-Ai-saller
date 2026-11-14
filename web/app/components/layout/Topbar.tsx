"use client";

import React, { useState } from "react";
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconRefresh,
  IconBuildingStore,
  IconPlus,
  IconChevronDown,
  IconLogout,
  IconCheck,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";

export interface OrganizationItem {
  id: number;
  name: string;
  slug?: string;
  plan?: string;
  is_owner?: boolean;
}

export interface TopbarProps {
  breadcrumb: string;
  tabTitle: string;
  organizations: OrganizationItem[];
  activeOrgId: number;
  onSelectOrg: (orgId: number) => void;
  onOpenNewStoreModal: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  loading: boolean;
  onRefresh: () => void;
  adminName?: string;
  adminRole?: string;
  adminAvatarUrl?: string;
  aiModel?: string;
  onLogout: () => void;
  onOpenProfile: () => void;
  isPlatformOwner?: boolean;
}

export function Topbar({
  breadcrumb,
  tabTitle,
  organizations,
  activeOrgId,
  onSelectOrg,
  onOpenNewStoreModal,
  theme,
  onToggleTheme,
  loading,
  onRefresh,
  adminName = "Admin",
  adminRole = "admin",
  adminAvatarUrl,
  aiModel = "gemini-3.1-flash-lite",
  onLogout,
  onOpenProfile,
  isPlatformOwner = false,
}: TopbarProps) {
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentOrg = organizations.find((o) => o.id === activeOrgId) || {
    id: activeOrgId,
    name: "Asosiy Do'kon",
    plan: "pro",
  };

  return (
    <header
      className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom flex-shrink-0"
      style={{
        height: "56px",
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 1010,
      }}
    >
      {/* Left: Store Selector & Breadcrumb */}
      <div className="d-flex align-items-center gap-3">
        {/* Tenant Store Dropdown */}
        <div className="position-relative">
          <button
            type="button"
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            className="d-flex align-items-center gap-2 px-2.5 py-1.5 rounded-2 border text-start transition-all"
            style={{
              backgroundColor: "var(--bg-surface-elevated)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            <IconBuildingStore size={15} style={{ color: "var(--accent)" }} />
            <span className="fw-medium text-truncate" style={{ maxWidth: "140px" }}>
              {currentOrg.name}
            </span>
            <span
              className="badge rounded-pill text-uppercase"
              style={{
                fontSize: "0.62rem",
                padding: "2px 6px",
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent-text)",
              }}
            >
              {currentOrg.plan || "PRO"}
            </span>
            <IconChevronDown size={13} style={{ color: "var(--text-secondary)" }} />
          </button>

          {/* Org Dropdown Menu */}
          {showOrgMenu && (
            <>
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 1025 }}
                onClick={() => setShowOrgMenu(false)}
              />
              <div
                className="position-absolute start-0 mt-1 py-1 rounded-2 border shadow-lg"
                style={{
                  top: "100%",
                  minWidth: "220px",
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderColor: "var(--border-default)",
                  zIndex: 1030,
                }}
              >
                <div
                  className="px-3 py-1.5 text-uppercase fw-semibold"
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Do'konlar ro'yxati ({organizations.length})
                </div>

                <div className="py-1" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {organizations.map((org) => {
                    const isSelected = org.id === activeOrgId;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          onSelectOrg(org.id);
                          setShowOrgMenu(false);
                        }}
                        className="d-flex align-items-center justify-content-between w-100 px-3 py-1.5 text-start border-0 transition-fast"
                        style={{
                          backgroundColor: isSelected ? "var(--bg-surface-hover)" : "transparent",
                          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2 text-truncate">
                          <IconBuildingStore size={14} style={{ color: isSelected ? "var(--accent)" : "inherit" }} />
                          <span className="text-truncate">{org.name}</span>
                        </div>
                        {isSelected && <IconCheck size={14} style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-top my-1" style={{ borderColor: "var(--border-subtle)" }} />
                <button
                  type="button"
                  onClick={() => {
                    setShowOrgMenu(false);
                    onOpenNewStoreModal();
                  }}
                  className="d-flex align-items-center gap-2 w-100 px-3 py-1.5 text-start border-0 fw-medium"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--accent)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <IconPlus size={14} />
                  <span>Yangi Do'kon Ochish</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Breadcrumb Info */}
        <div className="d-none d-md-flex align-items-center gap-1.5 text-secondary small">
          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>/</span>
          <span
            className="font-monospace text-uppercase"
            style={{ fontSize: "0.72rem", letterSpacing: "0.05em", color: "var(--text-secondary)" }}
          >
            {breadcrumb}
          </span>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <div className="d-none d-lg-flex align-items-center position-relative" style={{ width: "240px" }}>
        <IconSearch
          size={14}
          className="position-absolute start-0 ms-2.5"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Qidiruv... (Ctrl+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-100 ps-5 pe-2 py-1 rounded-2 border"
          style={{
            backgroundColor: "var(--bg-canvas)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "0.78rem",
            outline: "none",
          }}
        />
      </div>

      {/* Right Controls: AI status, Refresh, Theme Toggle, Profile */}
      <div className="d-flex align-items-center gap-2">
        {/* AI Engine Status Indicator */}
        <div
          className="d-none d-sm-flex align-items-center gap-1.5 px-2 py-1 rounded-pill border"
          style={{
            backgroundColor: "var(--success-subtle)",
            borderColor: "var(--success-border)",
            fontSize: "0.72rem",
            color: "var(--success-text)",
          }}
          title="AI savdo yordamchisi faol"
        >
          <span
            className="rounded-circle"
            style={{
              width: "6px",
              height: "6px",
              backgroundColor: "var(--success)",
              display: "inline-block",
            }}
          />
          <span className="fw-medium">AI Online</span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn btn-sm p-1.5 d-flex align-items-center justify-content-center rounded"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            width: "30px",
            height: "30px",
          }}
          title="Yangilash"
        >
          <IconRefresh size={15} className={loading ? "spin" : ""} />
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn btn-sm p-1.5 d-flex align-items-center justify-content-center rounded"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            width: "30px",
            height: "30px",
          }}
          title={theme === "dark" ? "Yorug' mavzuga o'tish" : "Qorong'i mavzuga o'tish"}
        >
          {theme === "dark" ? (
            <IconSun size={15} style={{ color: "#f59e0b" }} />
          ) : (
            <IconMoon size={15} style={{ color: "#5e6ad2" }} />
          )}
        </button>

        {/* Admin Profile Dropdown */}
        <div className="position-relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="d-flex align-items-center gap-2 p-1 rounded-pill border transition-fast"
            style={{
              backgroundColor: "var(--bg-surface-elevated)",
              borderColor: "var(--border-default)",
              cursor: "pointer",
            }}
          >
            <div
              className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center"
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent-text)",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={adminName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                adminName.charAt(0).toUpperCase()
              )}
            </div>
            <span
              className="d-none d-md-inline-block text-primary small fw-medium text-truncate me-1"
              style={{ maxWidth: "100px", fontSize: "0.8rem" }}
            >
              {adminName}
            </span>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 1025 }}
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className="position-absolute end-0 mt-1 py-1 rounded-2 border shadow-lg"
                style={{
                  top: "100%",
                  minWidth: "180px",
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderColor: "var(--border-default)",
                  zIndex: 1030,
                }}
              >
                <div className="px-3 py-2 border-bottom" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="fw-semibold text-primary small text-truncate">{adminName}</div>
                  <div className="text-secondary" style={{ fontSize: "0.7rem" }}>
                    Roli: <span className="text-uppercase fw-medium">{adminRole}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenProfile();
                  }}
                  className="d-flex align-items-center gap-2 w-100 px-3 py-2 text-start border-0"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <IconUser size={14} style={{ color: "var(--text-secondary)" }} />
                  <span>Profil & Shriftlar</span>
                </button>

                <div className="border-top my-1" style={{ borderColor: "var(--border-subtle)" }} />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="d-flex align-items-center gap-2 w-100 px-3 py-2 text-start border-0"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--danger-text)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <IconLogout size={14} />
                  <span>Chiqish</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
