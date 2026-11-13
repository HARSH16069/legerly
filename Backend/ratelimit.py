"""Small in-memory rate limiter for sign-in and registration.
It is per process: with several workers, each has its own counters (use Redis or a proxy limit then)."""
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException

_hits: dict = defaultdict(deque)
_window: dict = {}
_lock = threading.Lock()


def _prune(key: str, now: float):
    q = _hits[key]
    w = _window.get(key, 0)
    while q and now - q[0] > w:
        q.popleft()
    if not q:
        _hits.pop(key, None)
        _window.pop(key, None)


def check(key: str, max_hits: int, window_seconds: int):
    """Raises 429 if this key already used up its allowance within the window."""
    now = time.monotonic()
    with _lock:
        _window[key] = window_seconds
        if key in _hits:
            _prune(key, now)
        if len(_hits.get(key, ())) >= max_hits:
            raise HTTPException(429, "Too many attempts. Please wait a few minutes and try again.")


def hit(key: str, window_seconds: int):
    with _lock:
        _window[key] = window_seconds
        _hits[key].append(time.monotonic())


def clear(key: str):
    with _lock:
        _hits.pop(key, None)
        _window.pop(key, None)