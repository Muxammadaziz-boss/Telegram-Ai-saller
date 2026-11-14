"use client";

import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  dot?: boolean;
}

export function Badge({
  children,
  className = "",
  variant = "default",
  dot = false,
  ...props
}: BadgeProps) {
  const variantClass = {
    default: "",
    accent: "linear-badge-accent",
    success: "linear-badge-success",
    warning: "linear-badge-warning",
    danger: "linear-badge-danger",
    info: "linear-badge-info",
  }[variant];

  return (
    <span className={`linear-badge ${variantClass} ${className}`} {...props}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "currentColor",
            display: "inline-block",
          }}
        />
      )}
      {children}
    </span>
  );
}
