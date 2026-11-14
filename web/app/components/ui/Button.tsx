"use client";

import React from "react";
import { IconLoader2 } from "@tabler/icons-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      icon,
      iconPosition = "left",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "px-2 py-1 text-xs gap-1",
      sm: "px-2.5 py-1.5 text-xs gap-1.5",
      md: "px-3.5 py-2 text-sm gap-2",
      lg: "px-4 py-2.5 text-base gap-2.5",
    }[size];

    const variantClasses = {
      primary: "linear-btn-primary",
      secondary: "linear-btn-secondary",
      ghost: "linear-btn-ghost",
      danger: "linear-btn-danger",
      outline: "linear-btn-secondary border-dashed",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`linear-btn ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {loading && <IconLoader2 size={size === "xs" ? 12 : 15} className="spin" />}
        {!loading && icon && iconPosition === "left" && icon}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === "right" && icon}
      </button>
    );
  }
);

Button.displayName = "Button";
