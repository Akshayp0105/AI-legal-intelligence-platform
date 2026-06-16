import logging
import sys
from typing import Optional

def setup_logging(level: Optional[str] = None) -> None:
    """Configure application-wide logging for LexAI API."""
    log_level = getattr(logging, (level or "INFO").upper())
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)