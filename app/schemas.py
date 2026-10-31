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

