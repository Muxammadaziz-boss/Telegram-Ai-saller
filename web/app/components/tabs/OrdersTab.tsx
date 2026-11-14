"use client";

import React, { useState } from "react";
import {
  IconShoppingCart,
  IconSearch,
  IconCheck,
  IconTrash,
  IconFilter,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PageHeader } from "../layout/PageHeader";

export interface OrderItem {
  id: string;
  customer: string;
  username: string;
  product: string;
  amount: string;
  status: "New" | "Processing" | "Confirmed" | "Completed" | "Cancelled" | string;
  date: string;
  channel: string;
}

export interface OrdersTabProps {
  orders: OrderItem[];
  orderSearch: string;
  setOrderSearch: (val: string) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onDeleteOrder: (orderId: string) => void;
  busy: boolean;
}

export function OrdersTab({
  orders,
  orderSearch,
  setOrderSearch,
  onUpdateOrderStatus,
  onDeleteOrder,
  busy,
}: OrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = orders.filter((ord) => {
    if (statusFilter !== "all" && ord.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      ord.id.toLowerCase().includes(q) ||
      ord.customer.toLowerCase().includes(q) ||
      ord.username.toLowerCase().includes(q) ||
      ord.product.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        breadcrumbs="SALES / ORDERS MANAGEMENT"
        title="Buyurtmalar Jurnali"
        description="Mijozlar bilan suhbat orqali AI yoki operator tomonidan shakllantirilgan barcha xaridlar"
        badge={{ text: `${orders.length} ta jami buyurtma`, variant: "success" }}
      />

      <Card>
        <CardHeader
          actions={
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center gap-1.5">
                <IconFilter size={14} className="text-secondary" />
                <select
                  aria-label="Holat bo'yicha saralash"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="linear-input py-1"
                  style={{ width: "auto", fontSize: "0.78rem" }}
                >
                  <option value="all">Barcha statuslar</option>
                  <option value="New">Yangi (New)</option>
                  <option value="Processing">Jarayonda (Processing)</option>
                  <option value="Confirmed">Tasdiqlangan (Confirmed)</option>
                  <option value="Completed">Bajarilgan (Completed)</option>
                </select>
              </div>

              <div className="position-relative" style={{ width: "200px" }}>
                <IconSearch
                  size={14}
                  className="position-absolute start-0 ms-2.5 top-50 translate-middle-y text-secondary"
                />
                <input
                  type="text"
                  placeholder="Mijoz yoki ID izlash..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="linear-input ps-5 py-1"
                  style={{ fontSize: "0.78rem" }}
                />
              </div>
            </div>
          }
        >
          <CardTitle>Buyurtmalar Ro'yxati ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Buyurtma ID</th>
                  <th>Mijoz</th>
                  <th>Mahsulot</th>
                  <th>Summa</th>
                  <th>Holati</th>
                  <th>Sana</th>
                  <th>Kanal / Manba</th>
                  <th style={{ textAlign: "right" }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-5 small">
                      Buyurtmalar mavjud emas
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="font-monospace text-primary fw-semibold small">
                        {ord.id}
                      </td>
                      <td>
                        <div className="fw-medium text-primary small">{ord.customer}</div>
                        <div className="text-secondary" style={{ fontSize: "0.7rem" }}>{ord.username}</div>
                      </td>
                      <td className="text-primary small">{ord.product}</td>
                      <td className="fw-bold text-success font-monospace small">{ord.amount}</td>
                      <td>
                        {ord.status === "Confirmed" ? (
                          <Badge variant="success">Tasdiqlangan</Badge>
                        ) : ord.status === "Processing" ? (
                          <Badge variant="info">Jarayonda</Badge>
                        ) : ord.status === "Completed" ? (
                          <Badge variant="accent">Bajarilgan</Badge>
                        ) : (
                          <Badge variant="warning">Yangi</Badge>
                        )}
                      </td>
                      <td className="text-secondary small">{ord.date}</td>
                      <td>
                        <Badge variant="accent">{ord.channel}</Badge>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          {ord.status?.toLowerCase() !== "confirmed" && ord.status?.toLowerCase() !== "completed" && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => onUpdateOrderStatus(ord.id, "Confirmed")}
                              title="Tasdiqlash"
                              icon={<IconCheck size={13} style={{ color: "var(--success)" }} />}
                            >
                              Tasdiqlash
                            </Button>
                          )}
                          {ord.status?.toLowerCase() !== "completed" && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => onUpdateOrderStatus(ord.id, "Completed")}
                              title="Bajarildi"
                            >
                              Bajarildi
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => onDeleteOrder(ord.id)}
                            title="Buyurtmani o'chirish"
                            aria-label={`Buyurtma #${ord.id} ni o'chirish`}
                            icon={<IconTrash size={13} />}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
