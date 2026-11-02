from pydantic import BaseModel, Field


class IngestPost(BaseModel):
    channel_username: str = Field(min_length=1, max_length=255)
    telegram_message_id: int
    text: str = ""
    posted_at: str | None = None
    source_url: str | None = None
    photo_file_id: str | None = None
    photo_base64: str | None = None
    photo_mime_type: str = "image/jpeg"


class AdminReply(BaseModel):
    text: str = Field(min_length=1, max_length=4096)


class StatusUpdate(BaseModel):
    reason: str | None = None


class AdminCreate(BaseModel):
    telegram_user_id: int
    name: str = ""
    username: str | None = None
    role: str = "moderator"


class AdminUpdatePermission(BaseModel):
    permission: str
    value: bool


class AdminUpdateRole(BaseModel):
    role: str


class AdminOut(BaseModel):
    id: int
    telegram_user_id: int
    name: str
    username: str | None = None
    role: str
    permissions: dict[str, bool]
    is_active: bool
    added_by: int | None = None
    created_at: str | None = None


class SettingUpdate(BaseModel):
    value: str
    description: str | None = None


class ChannelCreate(BaseModel):
    channel: str = Field(min_length=1, max_length=255)
    title: str | None = None


class ChannelSyncRequest(BaseModel):
    channel: str | None = None


class ChannelOut(BaseModel):
    id: int
    channel_username: str
    title: str | None = None
    is_active: bool
    posts_count: int
    last_synced_at: str | None = None
    created_at: str | None = None


# ============================================================================
# Organization Onboarding & Auth Schemas
# ============================================================================

class OrganizationCreate(BaseModel):
    """Schema for creating a new organization during onboarding."""
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    category: str = "Retail"
    ai_language: str = "uz"
    ai_personality: str = "Professional & Courteous"
    custom_system_prompt: str | None = None
    telegram_bot_token: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None


class OrganizationOut(BaseModel):
    id: int
    name: str
    slug: str
    category: str
    status: str
    ai_language: str
    ai_personality: str
    custom_system_prompt: str | None = None
    telegram_bot_token_set: bool = False  # Mask real token for safety
    openai_api_key_set: bool = False
    gemini_api_key_set: bool = False
    created_at: str | None = None


class OrganizationUpdate(BaseModel):
    """Schema for updating organization settings."""
    name: str | None = None
    category: str | None = None
    ai_language: str | None = None
    ai_personality: str | None = None
    custom_system_prompt: str | None = None
    telegram_bot_token: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None


class TokenRequest(BaseModel):
    """Schema for login / token generation."""
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str


class RegisterRequest(BaseModel):
    """Schema for user registration."""
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6, max_length=255)
    full_name: str = ""


