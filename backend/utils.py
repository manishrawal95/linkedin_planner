"""
Shared utility functions for the LinkedIn Post Planner backend.
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def parse_llm_json(raw: str) -> dict | list:
    """Parse JSON from LLM output, stripping markdown code fences if present.

    Handles common LLM response formats:
    - Pure JSON
    - JSON wrapped in ```json ... ``` code fences
    - JSON wrapped in ``` ... ``` code fences
    """
    cleaned = raw.strip()

    # Strip markdown code fences
    if cleaned.startswith("```"):
        # Remove opening fence (with optional language tag)
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        # Remove closing fence
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        elif "```" in cleaned:
            cleaned = cleaned.rsplit("```", 1)[0]

    cleaned = cleaned.strip()
    return json.loads(cleaned)
