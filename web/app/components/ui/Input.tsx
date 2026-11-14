"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-100 mb-2">
        {label && (
          <label
            htmlFor={inputId}
            className="d-block text-secondary small fw-medium mb-1.5"
            style={{ fontSize: "var(--font-xs)" }}
          >
            {label}
          </label>
        )}
        <div className="position-relative d-flex align-items-center">
          {icon && (
            <span
              className="position-absolute ps-2.5 text-secondary pointer-events-none d-flex align-items-center"
              style={{ left: 0 }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`linear-input ${icon ? "ps-5" : ""} ${error ? "border-danger" : ""} ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="m-0 mt-1 text-danger small" style={{ fontSize: "var(--font-xs)" }}>
            {error}
          </p>
        ) : hint ? (
          <p className="m-0 mt-1 text-tertiary small" style={{ fontSize: "var(--font-xs)" }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-100 mb-2">
        {label && (
          <label
            htmlFor={inputId}
            className="d-block text-secondary small fw-medium mb-1.5"
            style={{ fontSize: "var(--font-xs)" }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`linear-input ${error ? "border-danger" : ""} ${className}`}
          style={{ resize: "vertical" }}
          {...props}
        />
        {error ? (
          <p className="m-0 mt-1 text-danger small" style={{ fontSize: "var(--font-xs)" }}>
            {error}
          </p>
        ) : hint ? (
          <p className="m-0 mt-1 text-tertiary small" style={{ fontSize: "var(--font-xs)" }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
