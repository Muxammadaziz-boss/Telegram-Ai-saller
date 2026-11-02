import pytest
from app.services.telegram import TelegramAPIError, TelegramService, get_telegram_service


def test_telegram_service_custom_token():
    custom_token = "123456:ABC-DEF-GHI-TEST-TOKEN"
    svc = TelegramService(bot_token=custom_token)
    assert svc.bot_token == custom_token
    assert svc.base_url == f"https://api.telegram.org/bot{custom_token}"


def test_telegram_service_no_token_raises_error(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "telegram_bot_token", "")
    with pytest.raises(TelegramAPIError) as exc_info:
        TelegramService(bot_token="")
    assert "TELEGRAM_BOT_TOKEN sozlanmagan" in str(exc_info.value)


def test_get_telegram_service_factory_caching():
    token_1 = "11111:TOKEN_ONE"
    token_2 = "22222:TOKEN_TWO"

    svc_1 = get_telegram_service(token_1)
    svc_1_again = get_telegram_service(token_1)
    svc_2 = get_telegram_service(token_2)

    assert svc_1 is svc_1_again
    assert svc_1 is not svc_2
    assert svc_1.bot_token == token_1
    assert svc_2.bot_token == token_2
