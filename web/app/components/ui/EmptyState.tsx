"use client";

import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-5 px-3 my-3 ${className}`}>
      {icon && (
        <div
          className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 text-secondary"
          style={{
            backgroundColor: "var(--bg-surface-hover)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {icon}
        </div>
      )}
      <h4 className="fw-semibold text-primary mb-1">{title}</h4>
      {description && (
        <p className="text-secondary small mb-3 mx-auto" style={{ maxWidth: 420 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
