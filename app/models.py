from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.core.config import settings


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ============================================================================
# 1. SAAS MULTI-TENANT ENTITIES
# ============================================================================

class User(Base):
    """Platform user who can belong to one or more organizations."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), default="")
    full_name: Mapped[str] = mapped_column(String(255), default="")
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, index=True, nullable=True)
    is_platform_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    memberships: Mapped[list["OrganizationMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Organization(Base):
    """Independent tenant representing a business or team."""
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="Retail")
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)  # active, suspended, archived
    retention_days: Mapped[int] = mapped_column(Integer, default=90)
    ai_language: Mapped[str] = mapped_column(String(16), default="uz")
    ai_personality: Mapped[str] = mapped_column(String(64), default="Professional & Courteous")
    custom_system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    members: Mapped[list["OrganizationMember"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    subscription: Mapped["Subscription | None"] = relationship(back_populates="organization", uselist=False, cascade="all, delete-orphan")


class OrganizationMember(Base):
    """Association between User and Organization with specific RBAC role."""
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="operator", index=True)  # owner, admin, manager, operator, viewer
    permissions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization: Mapped[Organization] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")


class Plan(Base):
    """Commercial pricing tiers: START, PRO, ULTRA."""
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)  # start, pro, ultra
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")
    price_monthly: Mapped[int] = mapped_column(Integer, default=19)  # USD
    price_yearly: Mapped[int] = mapped_column(Integer, default=190)  # USD (~17% discount)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    limits: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Subscription(Base):
    """Organization's active subscription status, billing cycle, and trial."""
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="trialing", index=True)  # trialing, active, past_due, cancelled, expired, paused
    billing_cycle: Mapped[str] = mapped_column(String(16), default="monthly")  # monthly, yearly
    provider: Mapped[str] = mapped_column(String(32), default="stripe")  # stripe, mock, payme, click, lemon_squeezy
    provider_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization: Mapped[Organization] = relationship(back_populates="subscription")
    plan: Mapped[Plan] = relationship()


class UsageRecord(Base):
    """Centralized metrics tracking for monthly and lifetime tenant usage."""
    __tablename__ = "usage_records"
    __table_args__ = (UniqueConstraint("organization_id", "metric", "period", name="uq_usage_org_metric_period"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    metric: Mapped[str] = mapped_column(String(64), index=True)
    period: Mapped[str] = mapped_column(String(16), index=True)  # YYYY-MM or 'lifetime'
    used: Mapped[int] = mapped_column(BigInteger, default=0)
    limit: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class WebhookEvent(Base):
    """Idempotent store for payment and external platform webhook receipts."""
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    event_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(128), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, processed, failed, ignored
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    """Immutable audit trail for security and regulatory compliance."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    resource: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class AIModelConfiguration(Base):
    """Dynamic plan-based model routing configured by platform owner."""
    __tablename__ = "ai_model_configurations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="gemini")
    model: Mapped[str] = mapped_column(String(64), default="gemini-3.1-flash-lite")
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    temperature: Mapped[float] = mapped_column(Float, default=0.2)
    vision_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ============================================================================
# 2. BUSINESS ENTITIES (SCOPED BY ORGANIZATION_ID)
# ============================================================================

class BusinessConnection(Base):
    __tablename__ = "business_connections"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rights: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("business_connection_id", "chat_id", name="uq_conversation_business_chat"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    business_connection_id: Mapped[str] = mapped_column(ForeignKey("business_connections.id", ondelete="CASCADE"), index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), default="Mijoz")
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ai_active", index=True)
    handoff_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (UniqueConstraint("conversation_id", "telegram_message_id", name="uq_message_telegram_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    telegram_message_id: Mapped[int] = mapped_column(BigInteger)
    reply_to_telegram_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    direction: Mapped[str] = mapped_column(String(20))  # customer, assistant, admin
    text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class ChannelPost(Base):
    __tablename__ = "channel_posts"
    __table_args__ = (UniqueConstraint("channel_username", "telegram_message_id", name="uq_channel_post_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    channel_username: Mapped[str] = mapped_column(String(255), index=True)
    telegram_message_id: Mapped[int] = mapped_column(BigInteger)
    text: Mapped[str] = mapped_column(Text, default="")
    image_description: Mapped[str] = mapped_column(Text, default="")
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_file_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.openai_embedding_dim), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(64), default="")
    product_summary: Mapped[str] = mapped_column(Text, default="")
    delivery_address: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[str] = mapped_column(String(64), default="$0")
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Product(Base):
    """Tenant product catalog items."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(64), index=True)  # LAP-01, etc.
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="Gaming")
    specs: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[str] = mapped_column(String(64), default="$0")
    stock: Mapped[str] = mapped_column(String(32), default="In Stock")  # In Stock, Low Stock, Pre-order
    warranty: Mapped[str] = mapped_column(String(64), default="2 oy kafolat")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Customer(Base):
    """Tenant customer directory."""
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("organization_id", "telegram_user_id", name="uq_org_customer_telegram"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="Mijoz")
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[str] = mapped_column(String(64), default="$0")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ConnectedChannel(Base):
    __tablename__ = "connected_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    channel_username: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    added_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    value: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Admin(Base):
    """Legacy admin table preserved for backward-compatibility with Telegram bot commands."""
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    telegram_user_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="moderator", index=True)  # owner, admin, moderator
    permissions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    added_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
