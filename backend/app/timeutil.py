"""UTC datetimes stored as naive values for TIMESTAMP WITHOUT TIME ZONE columns."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_plus_days_naive(days: int) -> datetime:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(tzinfo=None)


def utc_plus_timedelta_naive(delta: timedelta) -> datetime:
    return (datetime.now(timezone.utc) + delta).replace(tzinfo=None)
