"use client";

import React from "react";
import {
  IconUser,
  IconShieldCheck,
  IconSun,
  IconMoon,
  IconCheck,
  IconLogout,
  IconTypography,
  IconSparkles,
  IconLock,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PageHeader } from "../layout/PageHeader";

export const FONT_OPTIONS = [
  {
    id: "olline",
    name: "Olline",
    subtitle: "Heavy Display Sans",
    fontFamily: "'Olline', 'Outfit', 'Syne', sans-serif",
    styleTag: "Modern Headline",
    isNew: true,
  },
  {
    id: "pogonia",
    name: "Pogonia",
    subtitle: "Clean Geometric Sans",
    fontFamily: "'Pogonia', 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif",
    styleTag: "Fresh & Tech",
    isNew: true,
  },
  {
    id: "inter",
    name: "Inter",
    subtitle: "Linear Enterprise UI",
    fontFamily: "'Inter', sans-serif",
    styleTag: "Linear Style",
    isNew: false,
  },
  {
    id: "sf-pro",
    name: "SF Pro",
    subtitle: "Apple Native System",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    styleTag: "Apple Clean",
    isNew: false,
  },
  {
    id: "jakarta",
    name: "Plus Jakarta",
    subtitle: "Modern Geometric",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    styleTag: "Geometric",
    isNew: false,
  },
];

export interface ProfileTabProps {
  currentAdmin: any;
  activeAdminTelegramId: number;
  profileAvatarError: boolean;
  setProfileAvatarError: (b: boolean) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  appFont: string;
  onSelectFont: (fontId: string) => void;
  onLogout: () => void;
  permissionLabels: Record<string, string>;
}

export function ProfileTab({
  currentAdmin,
  activeAdminTelegramId,
  profileAvatarError,
  setProfileAvatarError,
  theme,
  setTheme,
  appFont,
  onSelectFont,
  onLogout,
  permissionLabels,
}: ProfileTabProps) {
  const isOwner = currentAdmin?.role === "owner";

  return (
    <div>
      <PageHeader
        breadcrumbs="SYSTEM / ADMIN PROFILE & APPEARANCE"
        title="Admin Profili va Dizayn Sozlamalari"
        description="Foydalanuvchi hisobi ma'lumotlari, rangli mavzular va interfeys tipografiyasi (Olline & Pogonia)"
        badge={{ text: "Shaxsiy kabinet", variant: "accent" }}
      />

      <div className="row g-4">
        {/* Left Column: Admin Profile Card */}
        <div className="col-12 col-lg-5">
          <Card className="h-100">
            <CardHeader>
              <CardTitle>Admin Hisobi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column align-items-center text-center gap-3 py-2">
                {/* Avatar */}
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold"
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "var(--accent-subtle)",
                    fontSize: "2rem",
                    border: "2px solid var(--accent-border)",
                  }}
                >
                  {!profileAvatarError && Boolean(activeAdminTelegramId) && activeAdminTelegramId > 0 ? (
                    <img
                      src={`/api/proxy?path=/admin/users/${activeAdminTelegramId}/avatar`}
                      alt={currentAdmin?.name || "Admin"}
                      className="rounded-circle w-100 h-100 object-fit-cover"
                      onError={() => setProfileAvatarError(true)}
                    />
                  ) : (
                    currentAdmin?.name?.charAt(0).toUpperCase() || "A"
                  )}
                </div>

                <div>
                  <h3 className="fw-bold text-primary m-0" style={{ fontSize: "1.2rem" }}>
                    {currentAdmin?.name || "Muxammadaziz"}
                  </h3>
                  <div className="text-secondary small font-monospace mt-0.5">
                    {currentAdmin?.username ? `@${currentAdmin.username}` : `Telegram ID: ${activeAdminTelegramId}`}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Badge variant={isOwner ? "warning" : "accent"}>
                    {isOwner ? "Owner (Tizim Egasi)" : (currentAdmin?.role || "Admin")}
                  </Badge>
                  <Badge variant="success" dot>Online</Badge>
                </div>

                {/* Account Details Box */}
                <div className="w-100 p-3 rounded-2 text-start small d-flex flex-column gap-2" style={{ backgroundColor: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Telegram ID:</span>
                    <span className="font-monospace text-primary fw-medium">{activeAdminTelegramId}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Tizim roli:</span>
                    <span className="text-capitalize text-primary fw-medium">{currentAdmin?.role || "Owner"}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Vakolatlar:</span>
                    <span className="text-success fw-medium">
                      {isOwner ? "Barcha ruxsatlar faol" : "Cheklangan"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  className="w-100 mt-2"
                  onClick={onLogout}
                  icon={<IconLogout size={15} />}
                >
                  Tizimdan chiqish (Logout)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Theme & Custom Fonts */}
        <div className="col-12 col-lg-7 d-flex flex-column gap-4">
          {/* Theme Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Rangli Mavzu (Theme Mode)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="row g-3">
                <div className="col-6">
                  <div
                    onClick={() => setTheme("dark")}
                    className={`p-3 rounded-2 border cursor-pointer transition-fast d-flex align-items-center justify-content-between ${
                      theme === "dark" ? "border-accent" : "border-subtle"
                    }`}
                    style={{
                      backgroundColor: theme === "dark" ? "var(--bg-surface-hover)" : "var(--bg-surface-elevated)",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <IconMoon size={18} style={{ color: "#8e98ec" }} />
                      <span className="fw-medium text-primary small">Qorong'i (Dark)</span>
                    </div>
                    {theme === "dark" && <IconCheck size={16} style={{ color: "var(--accent)" }} />}
                  </div>
                </div>

                <div className="col-6">
                  <div
                    onClick={() => setTheme("light")}
                    className={`p-3 rounded-2 border cursor-pointer transition-fast d-flex align-items-center justify-content-between ${
                      theme === "light" ? "border-accent" : "border-subtle"
                    }`}
                    style={{
                      backgroundColor: theme === "light" ? "var(--bg-surface-hover)" : "var(--bg-surface-elevated)",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <IconSun size={18} style={{ color: "#f59e0b" }} />
                      <span className="fw-medium text-primary small">Yorug' (Light)</span>
                    </div>
                    {theme === "light" && <IconCheck size={16} style={{ color: "var(--accent)" }} />}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography Selector (Olline, Pogonia, Inter, SF Pro, Jakarta) */}
          <Card>
            <CardHeader
              actions={
                <Badge variant="accent">
                  {FONT_OPTIONS.find((f) => f.id === appFont)?.name || "Olline"} faol
                </Badge>
              }
            >
              <CardTitle>Interfeys Shrifti (Typography)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary small mb-3">
                Yangi <strong>Olline</strong> va <strong>Pogonia</strong> yoki boshqa zamonaviy shriftlarni tanlang:
              </p>

              <div className="row g-3">
                {FONT_OPTIONS.map((font) => {
                  const isSelected = appFont === font.id;
                  return (
                    <div key={font.id} className="col-12 col-sm-6">
                      <div
                        onClick={() => onSelectFont(font.id)}
                        className={`p-3 rounded-2 border cursor-pointer transition-fast position-relative h-100 d-flex flex-column justify-content-between ${
                          isSelected ? "border-accent" : "border-subtle"
                        }`}
                        style={{
                          backgroundColor: isSelected ? "var(--bg-surface-hover)" : "var(--bg-surface-elevated)",
                        }}
                      >
                        {font.isNew && (
                          <span
                            className="position-absolute badge rounded-pill"
                            style={{
                              top: 8,
                              right: 8,
                              backgroundColor: "var(--warning)",
                              color: "#fff",
                              fontSize: "8px",
                              padding: "2px 5px",
                            }}
                          >
                            YANGI FONT
                          </span>
                        )}

                        {/* Typography Visual Preview Box matching user images */}
                        <div
                          className="text-center py-2 px-2 rounded mb-2"
                          style={{
                            backgroundColor: "var(--bg-canvas)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div
                            className="text-primary text-truncate"
                            style={{
                              fontFamily: font.fontFamily,
                              fontSize: font.id === "olline" || font.id === "pogonia" ? "1.6rem" : "1.35rem",
                              fontWeight: font.id === "olline" ? 900 : font.id === "pogonia" ? 800 : 700,
                              lineHeight: 1.15,
                              letterSpacing: font.id === "olline" ? "-0.03em" : font.id === "pogonia" ? "-0.02em" : "-0.01em",
                            }}
                          >
                            {font.name}
                          </div>
                          <div
                            className="text-secondary small mt-0.5"
                            style={{
                              fontFamily: font.fontFamily,
                              fontSize: "0.72rem",
                            }}
                          >
                            {font.name}
                          </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between mt-auto pt-1">
                          <div>
                            <div className="fw-semibold text-primary small">{font.name}</div>
                            <div className="text-secondary" style={{ fontSize: "0.7rem" }}>{font.subtitle}</div>
                          </div>
                          {isSelected && <IconCheck size={16} style={{ color: "var(--accent)" }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
