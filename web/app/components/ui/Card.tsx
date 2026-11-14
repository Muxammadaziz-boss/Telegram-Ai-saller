"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false, ...props }: CardProps) {
  return (
    <div className={`${elevated ? "linear-card-elevated" : "linear-card"} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

export function CardHeader({
  children,
  actions,
  className = "",
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`d-flex align-items-center justify-content-between p-3.5 border-bottom border-subtle ${className}`}
      style={{ borderColor: "var(--border-subtle)" }}
      {...props}
    >
      <div>{children}</div>
      {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`m-0 fw-semibold fs-5 text-primary ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`m-0 text-secondary small ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`d-flex align-items-center justify-content-end gap-2 p-3.5 border-top border-subtle ${className}`}
      style={{ borderColor: "var(--border-subtle)" }}
      {...props}
    >
      {children}
    </div>
  );
}
