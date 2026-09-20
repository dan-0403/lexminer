from pydantic import BaseModel


class CaseRequest(BaseModel):

    case_id: int