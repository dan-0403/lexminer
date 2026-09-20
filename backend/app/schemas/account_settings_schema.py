from pydantic import BaseModel
from pydantic import Field
from pydantic import model_validator


class ChangePasswordRequest(
    BaseModel
):

    current_password: str = Field(
        min_length=1,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        min_length=8,
        max_length=128,
    )

    @model_validator(
        mode="after",
    )
    def validate_passwords(
        self,
    ) -> "ChangePasswordRequest":

        if (
            self.new_password
            != self.confirm_password
        ):
            raise ValueError(
                "New password and confirmation "
                "password do not match."
            )

        if (
            self.current_password
            == self.new_password
        ):
            raise ValueError(
                "The new password must be different "
                "from the current password."
            )

        return self


class ChangePasswordResponse(
    BaseModel
):

    message: str