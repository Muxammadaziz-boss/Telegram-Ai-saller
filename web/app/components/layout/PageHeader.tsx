"use client";

import React from "react";
import { Badge } from "../ui/Badge";

export interface PageHeaderProps {
  breadcrumbs?: string;
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant?: "accent" | "success" | "warning" | "danger" | "info";
  };
  actions?: React.ReactNode;
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom border-subtle">
      <div>
        {breadcrumbs && (
          <div className="text-secondary small font-monospace text-uppercase mb-1" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
            {breadcrumbs}
          </div>
        )}
        <div className="d-flex align-items-center gap-2.5 flex-wrap">
          <h1 className="h2 m-0 text-primary fw-bold" style={{ letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          {badge && (
            <Badge variant={badge.variant || "accent"} dot>
              {badge.text}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-secondary small mt-1 mb-0" style={{ maxWidth: "680px" }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
