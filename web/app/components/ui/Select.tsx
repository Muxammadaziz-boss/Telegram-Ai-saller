"use client";

import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id, ...props }, ref) => {
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
        <select
          ref={ref}
          id={inputId}
          className={`linear-input ${error ? "border-danger" : ""} ${className}`}
          style={{ cursor: "pointer" }}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
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

Select.displayName = "Select";
