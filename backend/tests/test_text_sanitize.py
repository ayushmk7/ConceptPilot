"""Tests for text sanitization helpers."""

from app.utils.text_sanitize import strip_emojis


def test_strip_emojis_removes_pictographs():
    assert strip_emojis("Hello 😀 world") == "Hello world"


def test_strip_emojis_preserves_plain_text():
    assert strip_emojis("E = mc^2") == "E = mc^2"


def test_strip_emojis_preserves_em_dash():
    s = "Use tools — do not guess."
    assert strip_emojis(s) == s
