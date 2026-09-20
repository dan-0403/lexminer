import re


class PasswordPolicyService:
    """
    Validate passwords used by registered users.
    """

    MINIMUM_LENGTH = 8

    @classmethod
    def validate(
        cls,
        password: str,
    ) -> None:

        normalized_password = str(
            password or ""
        )

        if (
            len(
                normalized_password
            )
            < cls.MINIMUM_LENGTH
        ):
            raise ValueError(
                "Password must contain at least "
                f"{cls.MINIMUM_LENGTH} characters."
            )

        if not re.search(
            r"[A-Z]",
            normalized_password,
        ):
            raise ValueError(
                "Password must contain at least "
                "one uppercase letter."
            )

        if not re.search(
            r"[a-z]",
            normalized_password,
        ):
            raise ValueError(
                "Password must contain at least "
                "one lowercase letter."
            )

        if not re.search(
            r"\d",
            normalized_password,
        ):
            raise ValueError(
                "Password must contain at least "
                "one number."
            )

        if not re.search(
            r"[^A-Za-z0-9]",
            normalized_password,
        ):
            raise ValueError(
                "Password must contain at least "
                "one special character."
            )