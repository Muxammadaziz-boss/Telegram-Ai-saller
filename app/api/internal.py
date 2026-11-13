import base64
import hmac
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.db import get_db
from app.schemas import IngestPost
from app.services.knowledge import knowledge

router = APIRouter(prefix="/internal", tags=["internal"])


def require_ingest_token(x_ingest_token: str | None = Header(default=None)) -> None:
    if not settings.internal_ingest_token or not x_ingest_token or not hmac.compare_digest(
        settings.internal_ingest_token, x_ingest_token
    ):
        raise HTTPException(status_code=401, detail="Import token noto'g'ri")


@router.post("/knowledge/ingest", dependencies=[Depends(require_ingest_token)])
async def ingest_post(payload: IngestPost, db: AsyncSession = Depends(get_db)):
    image_bytes = None
    if payload.photo_base64:
        try:
            image_bytes = base64.b64decode(payload.photo_base64, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="photo_base64 yaroqsiz")
        if len(image_bytes) > 8 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Rasm 8 MB dan katta")
    posted_at = None
    if payload.posted_at:
        try:
            posted_at = datetime.fromisoformat(payload.posted_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="posted_at ISO formatda bo'lishi kerak")
    from sqlalchemy import select
    from app.models import ConnectedChannel

    org_id = payload.organization_id
    if not org_id:
        chan_row = (await db.execute(
            select(ConnectedChannel).where(ConnectedChannel.channel_username == payload.channel_username.lower().lstrip("@"))
        )).scalar_one_or_none()
        if chan_row:
            org_id = chan_row.organization_id

    post = await knowledge.upsert_post(
        db,
        channel_username=payload.channel_username,
        telegram_message_id=payload.telegram_message_id,
        text=payload.text,
        posted_at=posted_at,
        source_url=payload.source_url,
        photo_file_id=payload.photo_file_id,
        photo_bytes=image_bytes,
        photo_mime_type=payload.photo_mime_type,
        organization_id=org_id,
    )
    await db.commit()
    return {"ok": True, "post_id": post.id, "has_image": bool(post.image_path), "has_embedding": bool(post.embedding)}
