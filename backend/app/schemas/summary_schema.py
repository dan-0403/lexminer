from pydantic import BaseModel


class SummaryRequest(BaseModel):

    case_id: int