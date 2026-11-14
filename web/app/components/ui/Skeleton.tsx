"use client";

import React from "react";

export function Skeleton({
  className = "",
  width,
  height,
  borderRadius,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}) {
  return (
    <div
      className={`position-relative overflow-hidden ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: borderRadius ?? "var(--radius-sm)",
        backgroundColor: "var(--bg-surface-hover)",
        opacity: 0.65,
      }}
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-100 p-3 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="d-flex align-items-center gap-3 py-2 border-bottom border-subtle">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={18} width={c === 0 ? "35%" : "20%"} />
          ))}
        </div>
      ))}
    </div>
  );
}
