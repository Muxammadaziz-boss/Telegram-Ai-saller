"use client";

import React from "react";
import { IconHistory, IconCircleCheck, IconClock } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PageHeader } from "../layout/PageHeader";

export interface LogItem {
  id?: string | number;
  time?: string;
  source?: string;
  action?: string;
  details?: string;
  status?: string;
}

export interface LogsTabProps {
  logs?: LogItem[];
}

export function LogsTab({ logs }: LogsTabProps) {
  const defaultLogs: LogItem[] = [
    {
      time: "Hozirgina",
      source: "AI Engine",
      action: "Avtomatik mijozga javob",
      details: "Telegram mijoziga noutbuk parametrlari va narxlari yuborildi",
      status: "Muvaffaqiyatli",
    },
    {
      time: "18:24",
      source: "Telegram Webhook",
      action: "Yangi xarid buyurtmasi",
      details: "Mijoz chat orqali Asus TUF buyurtmasini tasdiqladi",
      status: "Muvaffaqiyatli",
    },
    {
      time: "16:40",
      source: "Channel Sync",
      action: "Kanal postlari yangilandi",
      details: "Telegram kanalidan yangi postlar bazaga olindi",
      status: "Muvaffaqiyatli",
    },
    {
      time: "14:15",
      source: "Operator",
      action: "Takeover amalga oshirildi",
      details: "Operator suhbatni o'z nazoratiga oldi",
      status: "Qabul qilindi",
    },
  ];

  const displayLogs = logs && logs.length > 0 ? logs : defaultLogs;

  return (
    <div>
      <PageHeader
        breadcrumbs="SYSTEM / AUDIT & ACTIVITY LOGS"
        title="Tizim Amallari Tarixi"
        description="AI savdo assistenti, Telegram webhook va operatorlar tomonidan bajarilgan barcha operatsiyalar auditi"
        badge={{ text: "Real-time audit", variant: "success" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Amallar Jurnali ({displayLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Vaqt</th>
                  <th style={{ width: "160px" }}>Manba / Servis</th>
                  <th>Amal Nomi</th>
                  <th>Batafsil Ma'lumot</th>
                  <th style={{ textAlign: "right", width: "130px" }}>Holat</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((l, idx) => (
                  <tr key={idx}>
                    <td className="text-secondary small font-monospace">
                      <span className="d-flex align-items-center gap-1">
                        <IconClock size={12} />
                        {l.time}
                      </span>
                    </td>
                    <td>
                      <Badge variant="accent">{l.source}</Badge>
                    </td>
                    <td className="fw-medium text-primary small">
                      {l.action}
                    </td>
                    <td className="text-secondary small">
                      {l.details}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Badge variant="success" dot>{l.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
