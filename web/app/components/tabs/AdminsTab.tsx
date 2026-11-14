"use client";

import React from "react";
import {
  IconShieldLock,
  IconPlus,
  IconCrown,
  IconExternalLink,
  IconShieldCheck,
  IconAdjustments,
  IconLock,
  IconTrash,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { PageHeader } from "../layout/PageHeader";

export interface AdminUserItem {
  id: number;
  telegram_user_id: number;
  name: string;
  username?: string | null;
  role: "owner" | "admin" | "moderator";
  permissions: Record<string, boolean>;
  is_active: boolean;
}

export interface AdminsTabProps {
  admins: AdminUserItem[];
  newAdminId: string;
  setNewAdminId: (v: string) => void;
  newAdminName: string;
  setNewAdminName: (v: string) => void;
  newAdminUsername: string;
  setNewAdminUsername: (v: string) => void;
  newAdminRole: "admin" | "moderator";
  setNewAdminRole: (v: "admin" | "moderator") => void;
  onAddAdmin: (e: React.FormEvent) => void;
  onRoleChange: (telegramUserId: number, role: string) => void;
  onDeleteAdmin: (telegramUserId: number, name: string) => void;
  managingPermissionsAdmin: AdminUserItem | null;
  setManagingPermissionsAdmin: (adm: AdminUserItem | null) => void;
  onTogglePermission: (telegramUserId: number, key: string, val: boolean) => void;
  busy: boolean;
  permissionLabels: Record<string, string>;
  permissionCategories: any[];
}

export function AdminsTab({
  admins,
  newAdminId,
  setNewAdminId,
  newAdminName,
  setNewAdminName,
  newAdminUsername,
  setNewAdminUsername,
  newAdminRole,
  setNewAdminRole,
  onAddAdmin,
  onRoleChange,
  onDeleteAdmin,
  managingPermissionsAdmin,
  setManagingPermissionsAdmin,
  onTogglePermission,
  busy,
  permissionLabels,
  permissionCategories,
}: AdminsTabProps) {
  const totalPermissionsCount = Object.keys(permissionLabels).length;

  return (
    <div>
      <PageHeader
        breadcrumbs="SYSTEM / ADMINISTRATION"
        title="Administratorlar Boshqaruvi"
        description="Telegram bot orqali mijozlarga javob beradigan adminlar, ularning roli va aniq ruxsatlarini boshqarish"
        badge={{ text: `${admins.length} ta faol admin`, variant: "accent" }}
      />

      <div className="row g-4">
        {/* Left: Admin List Table */}
        <div className="col-12 col-lg-8">
          <Card>
            <CardHeader>
              <CardTitle>Administratorlar Ro'yxati ({admins.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="table-responsive">
                <table className="linear-table">
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Telegram ID</th>
                      <th>Roli</th>
                      <th>Ruxsatlar</th>
                      <th style={{ textAlign: "right" }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary py-5 small">
                          Administratorlar topilmadi
                        </td>
                      </tr>
                    ) : (
                      admins.map((adm) => {
                        const isOwner = adm.role === "owner";
                        const activePermsCount = Object.entries(adm.permissions || {}).filter(
                          ([k, v]) => Boolean(v) && k !== "can_switch_admins"
                        ).length;

                        return (
                          <tr key={adm.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    backgroundColor: "var(--accent-subtle)",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {adm.name ? adm.name.charAt(0).toUpperCase() : "A"}
                                </div>
                                <div>
                                  <div className="fw-semibold text-primary small d-flex align-items-center gap-1">
                                    <span>{adm.name || "Noma'lum"}</span>
                                    {isOwner && (
                                      <Badge variant="warning">
                                        <IconCrown size={11} /> Owner
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-secondary small font-monospace" style={{ fontSize: "0.7rem" }}>
                                    {adm.username ? `@${adm.username}` : "Username yo'q"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="font-monospace text-secondary small">
                                {adm.telegram_user_id}
                              </span>
                            </td>
                            <td>
                              {isOwner ? (
                                <Badge variant="warning">Bosh Admin</Badge>
                              ) : (
                                <select
                                  value={adm.role}
                                  onChange={(e) => onRoleChange(adm.telegram_user_id, e.target.value)}
                                  disabled={busy}
                                  className="linear-input py-0.5"
                                  style={{ width: "auto", fontSize: "0.78rem" }}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="moderator">Moderator</option>
                                </select>
                              )}
                            </td>
                            <td>
                              {isOwner ? (
                                <Badge variant="success">Barcha huquqlar ({totalPermissionsCount}/{totalPermissionsCount})</Badge>
                              ) : (
                                <div className="d-flex align-items-center gap-2">
                                  <Badge
                                    variant={activePermsCount > 0 ? "accent" : "secondary" as any}
                                  >
                                    {activePermsCount} / {totalPermissionsCount} ta
                                  </Badge>
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    onClick={() => setManagingPermissionsAdmin(adm)}
                                    icon={<IconAdjustments size={12} />}
                                  >
                                    Sozlash
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isOwner ? (
                                <IconLock size={15} className="text-secondary opacity-50" />
                              ) : (
                                <Button
                                  variant="danger"
                                  size="xs"
                                  onClick={() => onDeleteAdmin(adm.telegram_user_id, adm.name)}
                                  disabled={busy}
                                  icon={<IconTrash size={13} />}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Add Admin Card */}
        <div className="col-12 col-lg-4">
          <Card>
            <CardHeader>
              <CardTitle>Yangi Admin Qo'shish</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onAddAdmin} className="d-flex flex-column gap-3">
                <Input
                  label="Telegram User ID"
                  placeholder="Masalan: 12345678"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  hint="Adminning Telegramdagi raqamli ID si (@userinfobot orqali topish mumkin)"
                  required
                />
                <Input
                  label="Admin Ismi"
                  placeholder="Alisher Zokirov"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                />
                <Input
                  label="Telegram Username"
                  placeholder="alisher_admin"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value.replace(/^@+/, ""))}
                />
                <Select
                  label="Tizimdagi Roli"
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  options={[
                    { value: "moderator", label: "Moderator (Mijozlar bilan yozishish)" },
                    { value: "admin", label: "Admin (To'liq boshqaruv huquqi)" },
                  ]}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mt-2"
                  disabled={busy || !newAdminId.trim()}
                  icon={<IconPlus size={15} />}
                >
                  Admin Qo'shish
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Permissions Management Modal */}
      {managingPermissionsAdmin && (
        <Modal
          isOpen={true}
          onClose={() => setManagingPermissionsAdmin(null)}
          title={`${managingPermissionsAdmin.name || "Admin"} — Ruxsatlar Tizimi`}
          size="lg"
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setManagingPermissionsAdmin(null)}
            >
              Tayyor
            </Button>
          }
        >
          <div className="d-flex flex-column gap-3">
            {permissionCategories.map((cat: any) => (
              <div key={cat.category} className="p-3 rounded-2 border border-subtle" style={{ backgroundColor: "var(--bg-surface-elevated)" }}>
                <div className="fw-semibold text-primary small mb-1">
                  {cat.icon} {cat.category}
                </div>
                <div className="text-secondary small mb-2.5" style={{ fontSize: "0.72rem" }}>
                  {cat.description}
                </div>
                <div className="d-flex flex-column gap-2">
                  {cat.permissions.map((p: any) => {
                    const isChecked = Boolean(managingPermissionsAdmin.permissions?.[p.key]);
                    return (
                      <label key={p.key} className="d-flex align-items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => onTogglePermission(managingPermissionsAdmin.telegram_user_id, p.key, e.target.checked)}
                          style={{ accentColor: "var(--accent)", marginTop: "3px" }}
                        />
                        <div>
                          <div className="text-primary small fw-medium">{p.label}</div>
                          <div className="text-secondary" style={{ fontSize: "0.7rem" }}>{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
