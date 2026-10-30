"""Centralized logging configuration.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
"""

import logging
import sys
from app.core.config import settings


def setup_logging() -> None:
    """Configure root logger once at application startup."""
    level = logging.DEBUG if settings.app_env == "development" else logging.INFO
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    root = logging.getLogger()
    root.setLevel(level)
    # Prevent duplicate handlers on reload.
    if not root.handlers:
        root.addHandler(handler)
    # Quiet noisy libraries.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
