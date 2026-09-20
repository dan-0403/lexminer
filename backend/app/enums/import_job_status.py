from enum import Enum


class ImportJobStatus(str, Enum):

    QUEUED = "QUEUED"

    RUNNING = "RUNNING"

    COMPLETED = "COMPLETED"

    COMPLETED_WITH_ERRORS = (
        "COMPLETED_WITH_ERRORS"
    )

    FAILED = "FAILED"

    CANCELLED = "CANCELLED"