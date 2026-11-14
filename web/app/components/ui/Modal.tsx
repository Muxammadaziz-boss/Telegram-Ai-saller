"use client";

import React, { useEffect } from "react";
import { IconX } from "@tabler/icons-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth,
  size = "md",
  footer,
}: ModalProps) {
  const effectiveSize = maxWidth || size;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthPx = {
    sm: 420,
    md: 540,
    lg: 720,
    xl: 900,
  }[effectiveSize];

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        zIndex: 1050,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="linear-card-elevated w-100 p-0 overflow-hidden shadow-lg"
        style={{
          maxWidth: maxWidthPx,
          animation: "linearModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div
            className="p-3.5 d-flex align-items-start justify-content-between border-bottom"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div>
              {title && <h3 className="m-0 fw-semibold fs-5 text-primary">{title}</h3>}
              {description && <p className="m-0 text-secondary small mt-1">{description}</p>}
            </div>
            <button
              type="button"
              className="linear-btn linear-btn-ghost p-1 ms-2"
              onClick={onClose}
              aria-label="Close"
            >
              <IconX size={18} />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && (
          <div
            className="p-3 border-top d-flex align-items-center justify-content-end gap-2"
            style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
