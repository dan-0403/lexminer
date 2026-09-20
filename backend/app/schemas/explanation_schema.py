from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class CaseExplanationRequest(
    BaseModel
):

    case_id: int = Field(
        ...,
        ge=1,
    )

    model_config = ConfigDict(
        extra="ignore",
    )