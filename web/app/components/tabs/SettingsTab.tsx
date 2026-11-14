"use client";

import React from "react";
import {
  IconCpu,
  IconBrandTelegram,
  IconCheck,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconActivity,
  IconPhoto,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { Select } from "../ui/Select";
import { PageHeader } from "../layout/PageHeader";

export interface SettingsTabProps {
  aiModel: string;
  setAiModel: (m: string) => void;
  aiTemperature: number;
  setAiTemperature: (t: number) => void;
  autoHandoff: boolean;
  setAutoHandoff: (b: boolean) => void;
  doubleConfirmation: boolean;
  setDoubleConfirmation: (b: boolean) => void;
  businessHoursOnly: boolean;
  setBusinessHoursOnly: (b: boolean) => void;
  onSaveAiSettings: () => void;
  currentOrgDetails: any;
  botTokenInput: string;
  setBotTokenInput: (t: string) => void;
  showBotToken: boolean;
  setShowBotToken: (b: boolean) => void;
  botTokenVerifying: boolean;
  onVerifyBotToken: () => void;
  botTokenResult: any;
  activeOrgId: number;
  webhookSetting: boolean;
  onSetWebhook: () => void;
  webhookStatusChecking: boolean;
  onCheckWebhookStatus: () => void;
  webhookInfo: any;
  customPromptInput: string;
  setCustomPromptInput: (p: string) => void;
  onSaveBotSettings: () => void;
  savingOrgSettings: boolean;
  logoUrl: string;
  customLogoInput: string;
  setCustomLogoInput: (url: string) => void;
  onSaveLogoUrl: (url: string) => void;
  onLogoUpload: (file: File) => void;
  channels: Array<{ id: number; channel_username: string }>;
}

export function SettingsTab({
  aiModel,
  setAiModel,
  aiTemperature,
  setAiTemperature,
  autoHandoff,
  setAutoHandoff,
  doubleConfirmation,
  setDoubleConfirmation,
  businessHoursOnly,
  setBusinessHoursOnly,
  onSaveAiSettings,
  currentOrgDetails,
  botTokenInput,
  setBotTokenInput,
  showBotToken,
  setShowBotToken,
  botTokenVerifying,
  onVerifyBotToken,
  botTokenResult,
  activeOrgId,
  webhookSetting,
  onSetWebhook,
  webhookStatusChecking,
  onCheckWebhookStatus,
  webhookInfo,
  customPromptInput,
  setCustomPromptInput,
  onSaveBotSettings,
  savingOrgSettings,
  logoUrl,
  customLogoInput,
  setCustomLogoInput,
  onSaveLogoUrl,
  onLogoUpload,
  channels,
}: SettingsTabProps) {
  return (
    <div>
      <PageHeader
        breadcrumbs="INTELLIGENCE / AI CONFIGURATION"
        title="AI va Tizim Sozlamalari"
        description="Gemini modeli parametrlari, Telegram bot integratsiyasi va maxsus tizim ko'rsatmalari"
        badge={{ text: "Tizim sozlamalari", variant: "accent" }}
      />

      <div className="row g-4">
        {/* Left Column: AI Parameters & Telegram Webhook */}
        <div className="col-12 col-lg-8 d-flex flex-column gap-4">
          {/* AI Model & Temperature Card */}
          <Card>
            <CardHeader>
              <CardTitle>AI Dvigateli Parametrlari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column gap-3">
                <Select
                  label="Asosiy AI Modeli"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  options={[
                    { value: "gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite (Tavsiya etiladi - tez 0.7s)" },
                    { value: "gemini-3.5-flash", label: "gemini-3.5-flash (Yuqori aniqlik va muvozanat)" },
                    { value: "gemini-flash-latest", label: "gemini-flash-latest (Avtomatik yangi versiya)" },
                  ]}
                  hint="Telegram xabarlariga 1-2 soniyada javob berish uchun optimallashtirilgan model."
                />

                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <label className="fw-medium text-primary small">
                      Kreativlik darajasi (Temperature): <strong className="text-accent">{aiTemperature}</strong>
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                    className="w-100"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div className="d-flex justify-content-between text-secondary mt-1 font-monospace" style={{ fontSize: "0.72rem" }}>
                    <span>Aniq & Faktik (0.0)</span>
                    <span>Muvozanatli (0.2)</span>
                    <span>Ijodiy (1.0)</span>
                  </div>
                </div>

                <div className="border-top border-subtle my-2" />

                {/* Switches */}
                <div className="d-flex flex-column gap-2.5">
                  <label className="d-flex align-items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoHandoff}
                      onChange={(e) => setAutoHandoff(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="small text-primary">
                      Avtomatik Takeover (Mijoz operator talab qilsa darhol insonga o'tkazish)
                    </span>
                  </label>

                  <label className="d-flex align-items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doubleConfirmation}
                      onChange={(e) => setDoubleConfirmation(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="small text-primary">
                      Dublyor tasdiqlash va typing... statusini ko'rsatish
                    </span>
                  </label>

                  <label className="d-flex align-items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessHoursOnly}
                      onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="small text-primary">
                      Faqat ish vaqtida faol bo'lish (09:00 - 20:00)
                    </span>
                  </label>
                </div>

                <div className="text-end pt-2">
                  <Button variant="primary" size="sm" onClick={onSaveAiSettings}>
                    AI parametrlarini saqlash
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telegram Bot & Webhook Card */}
          <Card>
            <CardHeader
              actions={
                currentOrgDetails?.telegram_bot_token_set ? (
                  <Badge variant="success" dot>Bot Ulangan</Badge>
                ) : (
                  <Badge variant="warning" dot>Bot Ulanmagan</Badge>
                )
              }
            >
              <CardTitle>Telegram Bot va Webhook Integratsiyasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column gap-3">
                {/* Bot Token Input */}
                <div>
                  <label className="fw-medium text-primary small d-block mb-1">
                    Telegram Bot Token (BotFather'dan olingan)
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type={showBotToken ? "text" : "password"}
                      placeholder={currentOrgDetails?.telegram_bot_token_set ? "••••••••••••••••••••••••••••••••" : "Masalan: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"}
                      value={botTokenInput}
                      onChange={(e) => setBotTokenInput(e.target.value)}
                      className="linear-input font-monospace flex-grow-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBotToken(!showBotToken)}
                      icon={showBotToken ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onVerifyBotToken}
                      disabled={botTokenVerifying || !botTokenInput.trim()}
                      loading={botTokenVerifying}
                      icon={<IconCheck size={14} />}
                    >
                      Tekshirish
                    </Button>
                  </div>
                  <div className="text-secondary small mt-1" style={{ fontSize: "0.72rem" }}>
                    Token shifrlangan holda (AES-128 Fernet) saqlanadi va xavfsiz Telegram Webhook orqali ishlaydi.
                  </div>
                </div>

                {/* Verification Result */}
                {botTokenResult && (
                  <div
                    className={`p-2.5 rounded-2 d-flex align-items-center gap-2 border ${
                      botTokenResult.valid ? "border-success text-success" : "border-danger text-danger"
                    }`}
                    style={{ backgroundColor: "var(--bg-surface-elevated)" }}
                  >
                    {botTokenResult.valid ? <IconCheck size={18} /> : <IconAlertCircle size={18} />}
                    <div className="small">
                      {botTokenResult.valid ? (
                        <>
                          <strong>Bot tasdiqlandi:</strong> @{botTokenResult.bot_username} ({botTokenResult.bot_name})
                        </>
                      ) : (
                        <>
                          <strong>Xatolik:</strong> {botTokenResult.error}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Webhook Endpoint */}
                <div>
                  <label className="fw-medium text-primary small d-block mb-1">
                    Webhook Havolasi
                  </label>
                  <div className="p-2 rounded-2 border d-flex align-items-center justify-content-between font-monospace small" style={{ backgroundColor: "var(--bg-surface-elevated)", borderColor: "var(--border-default)" }}>
                    <span className="text-accent text-truncate">
                      {currentOrgDetails?.webhook_url || `/telegram/webhook/${currentOrgDetails?.slug || activeOrgId}`}
                    </span>
                    <Badge variant="accent">POST</Badge>
                  </div>
                </div>

                {/* Webhook Action Buttons */}
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSetWebhook}
                    disabled={webhookSetting || !currentOrgDetails?.telegram_bot_token_set}
                    loading={webhookSetting}
                    icon={<IconRefresh size={14} />}
                  >
                    setWebhook Yangilash
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCheckWebhookStatus}
                    disabled={webhookStatusChecking || !currentOrgDetails?.telegram_bot_token_set}
                    loading={webhookStatusChecking}
                    icon={<IconActivity size={14} />}
                  >
                    Webhook Holatini Tekshirish
                  </Button>
                </div>

                {/* Webhook Info Display */}
                {webhookInfo && (
                  <div className="p-3 rounded-2 border border-subtle small" style={{ backgroundColor: "var(--bg-surface-elevated)" }}>
                    <div className="d-flex align-items-center justify-content-between fw-medium mb-2">
                      <span className="text-primary">Telegram Webhook Statusi:</span>
                      <Badge variant={webhookInfo.webhook_info?.url ? "success" : "warning"}>
                        {webhookInfo.webhook_info?.url ? "Faol (O'rnatilgan)" : "O'rnatilmagan"}
                      </Badge>
                    </div>
                    <div className="text-secondary d-flex flex-column gap-1">
                      <div><strong>URL:</strong> <span className="font-monospace text-primary">{webhookInfo.webhook_info?.url || "Mavjud emas"}</span></div>
                      <div><strong>Kutilayotgan xabarlar:</strong> {webhookInfo.webhook_info?.pending_update_count ?? 0}</div>
                    </div>
                  </div>
                )}

                {/* System Prompt Textarea */}
                <div>
                  <label className="fw-medium text-primary small d-block mb-1">
                    Do'kon AI Sotuvchisi Uchun Maxsus Tizim Ko'rsatmasi (System Prompt)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Do'konning o'ziga xos xususiyatlari, yetkazib berish qoidalari yoki mijozlar bilan muloqot ohangi bo'yicha maxsus ko'rsatma..."
                    value={customPromptInput}
                    onChange={(e) => setCustomPromptInput(e.target.value)}
                    className="linear-input font-monospace"
                    style={{ fontSize: "0.82rem" }}
                  />
                  <div className="text-secondary small mt-1" style={{ fontSize: "0.72rem" }}>
                    Ushbu ko'rsatma har bir mijoz bilan muloqotda asosiy AI modeliga qo'shimcha kontekst sifatida kiritiladi.
                  </div>
                </div>

                <div className="text-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onSaveBotSettings}
                    loading={savingOrgSettings}
                    icon={<IconCheck size={14} />}
                  >
                    Bot va AI Sozlamalarini Saqlash
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Logo & System Meta */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-4">
          {/* Logo Card */}
          <Card>
            <CardHeader>
              <CardTitle>Do'kon Logotipi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column align-items-center text-center gap-3">
                <div
                  className="p-3 rounded-2 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    width: "80px",
                    height: "80px",
                  }}
                >
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.svg";
                    }}
                  />
                </div>

                <div className="w-100 text-start">
                  <label className="text-secondary small d-block mb-1">Fayl yuklash (PNG, SVG, JPG):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onLogoUpload(file);
                    }}
                    className="linear-input py-1"
                    style={{ fontSize: "0.78rem" }}
                  />
                </div>

                <div className="w-100 text-start">
                  <label className="text-secondary small d-block mb-1">Yoki logotip URL manzili:</label>
                  <div className="d-flex gap-1.5">
                    <input
                      type="text"
                      placeholder="/logo.svg"
                      value={customLogoInput}
                      onChange={(e) => setCustomLogoInput(e.target.value)}
                      className="linear-input flex-grow-1"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSaveLogoUrl(customLogoInput)}
                    >
                      Qo'llash
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="xs"
                  className="w-100"
                  onClick={() => {
                    onSaveLogoUrl("/logo.svg");
                    setCustomLogoInput("/logo.svg");
                  }}
                >
                  Standart logotipga qaytarish
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Tech Stack Card */}
          <Card>
            <CardHeader>
              <CardTitle>Tizim Arxitekturasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="d-flex flex-column gap-2.5 small">
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Frontend:</span>
                  <span className="fw-medium text-primary">Next.js 15 (App Router)</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Backend API:</span>
                  <span className="fw-medium text-primary">FastAPI + SQLAlchemy</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Database:</span>
                  <span className="fw-medium text-primary">PostgreSQL (Multi-tenant)</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Telegram API:</span>
                  <span className="fw-medium text-primary">Business Connection Webhook</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Ulangan Kanallar:</span>
                  <span className="fw-medium text-primary">{channels.length} ta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
