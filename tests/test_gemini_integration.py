import pytest
from app.core.config import Settings
from app.services.ai import SalesAI
from app.services.knowledge import KnowledgeService


def test_gemini_provider_selection():
    custom_settings = Settings(
        _env_file=None,
        gemini_api_key="AQ.Ab8RN6JN9MfTFrGnAB0sQuE3F0vsPTjFx8xl03NU3t7xMyDCrw",
        gemini_model="gemini-3.1-flash-lite",
        gemini_embedding_model="gemini-embedding-001",
        ai_provider="gemini",
    )
    ai = SalesAI()
    ai.gemini_key = custom_settings.gemini_api_key
    ai.gemini_model = custom_settings.gemini_model
    assert ai.provider == "gemini"

    ks = KnowledgeService()
    ks.gemini_key = custom_settings.gemini_api_key
    ks.gemini_model = custom_settings.gemini_model
    ks.gemini_embedding_model = custom_settings.gemini_embedding_model
    assert ks.gemini_key.startswith("AQ.")
