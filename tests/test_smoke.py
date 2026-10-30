def test_project_package_exists():
    from app.core.config import Settings
    settings = Settings(_env_file=None)
    assert settings.openai_model
    assert settings.app_name == "AI Sales Assistant"
