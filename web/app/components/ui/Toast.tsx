"use client";

import React, { useEffect } from "react";
import { IconCheck, IconAlertCircle, IconInfoCircle, IconX } from "@tabler/icons-react";

export interface ToastProps {
  type?: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
  duration?: number;
}

export function Toast({ type = "info", message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!onClose || duration <= 0) return;
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const borderClass = {
    success: "border-success",
    error: "border-danger",
    info: "border-info",
  }[type];

  const IconComponent = {
    success: IconCheck,
    error: IconAlertCircle,
    info: IconInfoCircle,
  }[type];

  const iconColor = {
    success: "var(--success)",
    error: "var(--danger)",
    info: "var(--info)",
  }[type];

  return (
    <div
      className={`linear-card-elevated p-3 d-flex align-items-center gap-2.5 shadow-lg ${borderClass}`}
      style={{
        minWidth: 280,
        maxWidth: 420,
        backgroundColor: "var(--bg-surface-elevated)",
        borderColor: "var(--border-strong)",
      }}
      role="alert"
    >
      <IconComponent size={18} style={{ color: iconColor, flexShrink: 0 }} />
      <span className="flex-fill small text-primary" style={{ fontSize: "var(--font-sm)" }}>
        {message}
      </span>
      {onClose && (
        <button
          type="button"
          className="linear-btn linear-btn-ghost p-0 text-secondary"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={15} />
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="position-fixed top-0 end-0 p-3 d-flex flex-column gap-2"
      style={{ zIndex: 1100 }}
    >
      {children}
    </div>
  );
}
