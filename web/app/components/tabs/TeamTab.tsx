"use client";

import React from "react";
import { IconKey, IconUserCheck, IconShield, IconHeadset } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PageHeader } from "../layout/PageHeader";

export interface TeamTabProps {
  permissionLabels: Record<string, string>;
}

export function TeamTab({ permissionLabels }: TeamTabProps) {
  const roles = [
    {
      name: "Owner",
      title: "Bosh Ega",
      badge: "Owner",
      badgeVariant: "accent" as const,
      icon: IconShield,
      desc: "Barcha huquqlar to'liq berilgan. Adminlarni qo'shish, o'chirish va tizim sozlamalarini boshqarish huquqiga ega.",
    },
    {
      name: "Admin",
      title: "Tizim Menejeri",
      badge: "Admin",
      badgeVariant: "info" as const,
      icon: IconUserCheck,
      desc: "Suhbatlar, kataloglar, buyurtmalar va bilim bazalarini to'liq boshqarishi mumkin.",
    },
    {
      name: "Moderator",
      title: "Sotuvchi Operator",
      badge: "Moderator",
      badgeVariant: "success" as const,
      icon: IconHeadset,
      desc: "Faqat jonli suhbatlarga javob berish va mijozlar bilan muloqot qilish vakolatiga ega.",
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs="SYSTEM / TEAM & ACCESS ROLES"
        title="Jamoa va Ruxsatlar Tizimi"
        description="Har bir rol uchun belgilangan huquqlar, mas'uliyat doirasi va ruxsatlar matritsasi"
        badge={{ text: "Rollar Matritsasi", variant: "accent" }}
      />

      {/* Role Cards */}
      <div className="row g-3 mb-4">
        {roles.map((r) => {
          const IconC = r.icon;
          return (
            <div key={r.name} className="col-12 col-md-4">
              <div className="linear-card p-3.5 h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <Badge variant={r.badgeVariant}>{r.badge}</Badge>
                  <IconC size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div className="fw-bold text-primary mb-1" style={{ fontSize: "1rem" }}>
                  {r.title}
                </div>
                <div className="text-secondary small" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
                  {r.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Granulyar Ruxsatlar Matritsasi (Permissions)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th style={{ width: "240px" }}>Ruxsat Kaliti</th>
                  <th>Tavsifi</th>
                  <th style={{ textAlign: "center", width: "110px" }}>Owner</th>
                  <th style={{ textAlign: "center", width: "110px" }}>Admin</th>
                  <th style={{ textAlign: "center", width: "110px" }}>Moderator</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(permissionLabels).map(([k, label]) => {
                  const adminHas = !["can_manage_admins"].includes(k);
                  const modHas = [
                    "can_view_conversations",
                    "can_reply_customers",
                    "can_takeover",
                    "can_resume_ai",
                    "can_view_knowledge",
                    "can_view_orders",
                  ].includes(k);

                  return (
                    <tr key={k}>
                      <td className="font-monospace text-secondary small">
                        {k}
                      </td>
                      <td className="text-primary small fw-medium">
                        {label}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Badge variant="success">Ha</Badge>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {adminHas ? (
                          <Badge variant="success">Ha</Badge>
                        ) : (
                          <Badge variant="danger">Yo'q</Badge>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {modHas ? (
                          <Badge variant="success">Ha</Badge>
                        ) : (
                          <Badge variant="danger">Yo'q</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
