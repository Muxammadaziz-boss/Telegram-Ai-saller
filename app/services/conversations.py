from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import BusinessConnection, Conversation, Message


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_or_create_conversation(
    db: AsyncSession,
    *,
    business_connection_id: str,
    chat_id: int,
    customer_name: str,
    username: str | None,
    organization_id: int | None = None,
) -> Conversation:
    result = await db.execute(select(Conversation).where(
        Conversation.business_connection_id == business_connection_id,
        Conversation.chat_id == chat_id,
    ))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        connection = await db.get(BusinessConnection, business_connection_id)
        if connection is None or not connection.is_enabled:
            raise ValueError("Business connection topilmadi yoki faol emas")
        
        org_id = organization_id or (connection.organization_id if connection else None) or 1
        conversation = Conversation(
            organization_id=org_id,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            customer_name=customer_name or "Mijoz",
            username=username,
        )
        db.add(conversation)
        try:
            await db.flush()
        except IntegrityError:
            # Handle concurrent creation by another task
            await db.rollback()
            result = await db.execute(select(Conversation).where(
                Conversation.business_connection_id == business_connection_id,
                Conversation.chat_id == chat_id,
            ))
            conversation = result.scalar_one_or_none()
            if conversation is None:
                raise
    else:
        conversation.customer_name = customer_name or conversation.customer_name
        conversation.username = username or conversation.username
        conversation.last_message_at = _now()
        if organization_id and not conversation.organization_id:
            conversation.organization_id = organization_id
    return conversation


async def save_message(
    db: AsyncSession,
    *,
    conversation_id: int,
    telegram_message_id: int,
    direction: str,
    text: str,
    reply_to_telegram_message_id: int | None = None,
    organization_id: int | None = None,
) -> Message | None:
    exists = await db.execute(select(Message.id).where(
        Message.conversation_id == conversation_id,
        Message.telegram_message_id == telegram_message_id,
    ))
    if exists.scalar_one_or_none() is not None:
        return None

    org_id = organization_id
    if org_id is None:
        conv_res = await db.execute(select(Conversation.organization_id).where(Conversation.id == conversation_id))
        org_id = conv_res.scalar_one_or_none() or 1

    message = Message(
        organization_id=org_id,
        conversation_id=conversation_id,
        telegram_message_id=telegram_message_id,
        reply_to_telegram_message_id=reply_to_telegram_message_id,
        direction=direction,
        text=text,
    )
    db.add(message)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return None
    return message
