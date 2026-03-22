"""Text helpers for user-facing and model-facing strings."""

import re

# Broad emoji / pictograph ranges (no extra deps; covers most emoji in prompts).
_EMOJI_RE = re.compile(
    "["
    "\U0001F1E6-\U0001F1FF"  # regional indicator (flags)
    "\U0001F300-\U0001F5FF"  # misc symbols and pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport and map
    "\U0001F700-\U0001F77F"  # alchemical
    "\U0001F780-\U0001F7FF"  # geometric extended
    "\U0001F800-\U0001F8FF"  # supplemental arrows-C
    "\U0001F900-\U0001F9FF"  # supplemental symbols and pictographs
    "\U0001FA00-\U0001FA6F"  # chess, etc.
    "\U0001FA70-\U0001FAFF"  # symbols extended-A
    "\U00002600-\U000026FF"  # misc symbols
    "\U00002700-\U000027BF"  # dingbats
    "\U00002300-\U000023FF"  # misc technical
    "\U0000FE00-\U0000FE0F"  # variation selectors
    "\U0000200D"  # ZWJ (emoji sequences)
    "\U0001F3FB-\U0001F3FF"  # skin tones
    "]+",
    flags=re.UNICODE,
)


def strip_emojis(text: str) -> str:
    """Remove emoji and most pictograph characters; collapse extra whitespace."""
    if not text:
        return text
    cleaned = _EMOJI_RE.sub("", text)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()
