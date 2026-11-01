"use client";

import React from "react";
import {
  IconArrowRight,
  IconCheck,
  IconCrown,
  IconLock,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPlan?: string;
  message?: string;
  onUpgradeToPlan: (planCode: string) => Promise<void>;
}

export function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  requiredPlan = "pro",
  message,
  onUpgradeToPlan,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const targetPlan = (requiredPlan || "pro").toUpperCase();

  return (
    <div
      className="modal modal-blur fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1070 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border border-secondary border-opacity-25" style={{ borderRadius: 18 }}>
          <div className="modal-header py-3 px-4 d-flex align-items-center justify-content-between border-0 pb-0">
            <span className="badge bg-primary-lt text-primary fw-bold text-uppercase px-2.5 py-1">
              Tarif Cheklovi
            </span>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body p-4 text-center">
            <div className="p-3 bg-primary-lt text-primary rounded-circle d-inline-flex mb-3">
              <IconSparkles size={32} />
            </div>

            <h3 className="fw-bold text-white mb-2 fs-2">
              {featureName ? `${featureName} Imkoniyatini Faollashtiring` : "Tarifni Oshirish Tavsiya Etiladi"}
            </h3>

            <p className="text-secondary small mb-4" style={{ lineHeight: 1.5 }}>
              {message || (
                <>
                  Ushbu funksiya yoki oshirilgan limitdan foydalanish uchun{" "}
                  <strong className="text-white">{targetPlan}</strong> tarif rejasiga o'tishingiz lozim.
                </>
              )}
            </p>

            {/* Quick Benefits List */}
            <div className="p-3 bg-dark rounded-3 border border-secondary border-opacity-20 text-start small space-y-2 mb-4">
              <div className="fw-bold text-primary mb-1">
                {targetPlan} Tarifiga O'tsangiz:
              </div>
              <div className="d-flex align-items-center gap-2">
                <IconCheck size={16} className="text-success flex-shrink-0" />
                <span className="text-white">7,500 ta AI oylik xabarlar va 2,500 suhbatlar</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <IconCheck size={16} className="text-success flex-shrink-0" />
                <span className="text-white">Telegram fotosuratlari va skrinshotlarni AI orqali tahlil qilish</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <IconCheck size={16} className="text-success flex-shrink-0" />
                <span className="text-white">Kengaytirilgan RAG va 10 tagacha jamoa a'zolari</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
              onClick={async () => {
                await onUpgradeToPlan(requiredPlan.toLowerCase());
                onClose();
              }}
            >
              <span>{targetPlan} Tarifiga O'tish ($59/oy)</span>
              <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-link text-secondary btn-sm mt-2 text-decoration-none"
              onClick={onClose}
            >
              Keyinroq ko'rib chiqish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

