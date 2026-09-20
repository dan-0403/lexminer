import hashlib
import hmac
import secrets

from app.core.config import settings


def generate_numeric_otp() -> str:
    """
    Generate a cryptographically secure six-digit OTP.
    """

    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(
    otp: str,
) -> str:
    """
    Hash an OTP before saving it to PostgreSQL.
    """

    secret = str(
        settings.SECRET_KEY
    ).encode("utf-8")

    return hmac.new(
        secret,
        otp.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp(
    plain_otp: str,
    stored_hash: str,
) -> bool:
    """
    Compare a submitted OTP against the stored hash.
    """

    submitted_hash = hash_otp(
        plain_otp
    )

    return hmac.compare_digest(
        submitted_hash,
        stored_hash,
    )