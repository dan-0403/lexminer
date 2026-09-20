from datetime import datetime
from datetime import timezone
from pathlib import Path
from typing import Any

from fastapi_mail import ConnectionConfig
from fastapi_mail import FastMail
from fastapi_mail import MessageSchema
from fastapi_mail import MessageType
from jinja2 import Environment
from jinja2 import FileSystemLoader
from jinja2 import select_autoescape

from app.core.config import settings


class EmailService:

    TEMPLATE_DIRECTORY = (
        Path(__file__)
        .resolve()
        .parent
        .parent
        / "templates"
        / "emails"
    )

    def __init__(
        self,
    ) -> None:

        self.configuration = (
            ConnectionConfig(
                MAIL_USERNAME=(
                    settings.MAIL_USERNAME
                ),
                MAIL_PASSWORD=(
                    settings.MAIL_PASSWORD
                ),
                MAIL_FROM=(
                    settings.MAIL_FROM
                ),
                MAIL_FROM_NAME=(
                    settings.MAIL_FROM_NAME
                ),
                MAIL_PORT=(
                    settings.MAIL_PORT
                ),
                MAIL_SERVER=(
                    settings.MAIL_SERVER
                ),
                MAIL_STARTTLS=(
                    settings.MAIL_STARTTLS
                ),
                MAIL_SSL_TLS=(
                    settings.MAIL_SSL_TLS
                ),
                USE_CREDENTIALS=(
                    settings.MAIL_USE_CREDENTIALS
                ),
                VALIDATE_CERTS=(
                    settings.MAIL_VALIDATE_CERTS
                ),
            )
        )

        self.mailer = FastMail(
            self.configuration
        )

        self.template_environment = (
            Environment(
                loader=FileSystemLoader(
                    str(
                        self.TEMPLATE_DIRECTORY
                    )
                ),
                autoescape=select_autoescape(
                    [
                        "html",
                        "xml",
                    ]
                ),
            )
        )

    # =========================================================
    # TEMPLATE RENDERING
    # =========================================================

    def _render_template(
        self,
        template_name: str,
        subject: str,
        context: dict[str, Any],
    ) -> str:

        template = (
            self.template_environment
            .get_template(
                template_name
            )
        )

        complete_context = {
            **context,
            "subject": subject,
            "current_year": (
                datetime.now(
                    timezone.utc
                ).year
            ),
        }

        return template.render(
            **complete_context
        )

    # =========================================================
    # GENERIC EMAIL SENDER
    # =========================================================

    async def _send_html_email(
        self,
        recipient: str,
        subject: str,
        template_name: str,
        context: dict[str, Any],
    ) -> None:

        normalized_recipient = (
            recipient.strip().lower()
        )

        if not normalized_recipient:
            raise ValueError(
                "Email recipient is required."
            )

        html_content = (
            self._render_template(
                template_name=(
                    template_name
                ),
                subject=subject,
                context=context,
            )
        )

        message = MessageSchema(
            subject=subject,
            recipients=[
                normalized_recipient
            ],
            body=html_content,
            subtype=MessageType.html,
        )

        await self.mailer.send_message(
            message
        )

    # =========================================================
    # REGISTRATION OTP
    # =========================================================

    async def send_registration_otp(
        self,
        recipient: str,
        otp: str,
        expiration_minutes: int = 5,
    ) -> None:

        await self._send_html_email(
            recipient=recipient,
            subject=(
                "Verify Your LexMiner Email"
            ),
            template_name=(
                "registration_otp.html"
            ),
            context={
                "otp": otp,
                "expiration_minutes": (
                    expiration_minutes
                ),
            },
        )

    # =========================================================
    # PASSWORD RESET OTP
    # =========================================================

    async def send_password_reset_otp(
        self,
        recipient: str,
        otp: str,
        expiration_minutes: int = 5,
    ) -> None:

        await self._send_html_email(
            recipient=recipient,
            subject=(
                "Reset Your LexMiner Password"
            ),
            template_name=(
                "password_reset_otp.html"
            ),
            context={
                "otp": otp,
                "expiration_minutes": (
                    expiration_minutes
                ),
            },
        )

    # =========================================================
    # WELCOME EMAIL
    # =========================================================

    async def send_welcome_email(
        self,
        recipient: str,
        first_name: str,
    ) -> None:

        await self._send_html_email(
            recipient=recipient,
            subject=(
                "Welcome to LexMiner"
            ),
            template_name=(
                "welcome.html"
            ),
            context={
                "first_name": (
                    first_name.strip()
                ),
                "email": (
                    recipient.strip().lower()
                ),
                "login_url": (
                    settings.FRONTEND_URL
                ),
            },
        )

    # =========================================================
    # ACCOUNT LOCKED EMAIL
    # =========================================================

    async def send_account_locked_email(
        self,
        recipient: str,
        failed_attempts: int,
        locked_until: datetime,
    ) -> None:

        normalized_locked_until = (
            locked_until
        )

        if (
            normalized_locked_until
            .tzinfo is None
        ):
            normalized_locked_until = (
                normalized_locked_until
                .replace(
                    tzinfo=timezone.utc
                )
            )

        formatted_locked_until = (
            normalized_locked_until
            .astimezone(
                timezone.utc
            )
            .strftime(
                "%B %d, %Y at %I:%M %p UTC"
            )
        )

        await self._send_html_email(
            recipient=recipient,
            subject=(
                "LexMiner Account Temporarily Locked"
            ),
            template_name=(
                "account_locked.html"
            ),
            context={
                "email": (
                    recipient.strip().lower()
                ),
                "failed_attempts": (
                    failed_attempts
                ),
                "locked_until": (
                    formatted_locked_until
                ),
                "reset_password_url": (
                    f"{settings.FRONTEND_URL}"
                    "/forgot-password"
                ),
            },
        )

    # =========================================================
    # ACCOUNT UNLOCKED EMAIL
    # =========================================================

    async def send_account_unlocked_email(
        self,
        recipient: str,
    ) -> None:

        await self._send_html_email(
            recipient=recipient,
            subject=(
                "Your LexMiner Account Is Unlocked"
            ),
            template_name=(
                "account_unlocked.html"
            ),
            context={
                "login_url": (
                    settings.FRONTEND_URL
                ),
            },
        )