from enum import Enum


class ImportStatus(str, Enum):

    PENDING = "PENDING"

    EXTRACTING = "EXTRACTING"

    CLEANING = "CLEANING"

    CHUNKING = "CHUNKING"

    INDEXING = "INDEXING"

    COMPLETED = "COMPLETED"

    FAILED = "FAILED"