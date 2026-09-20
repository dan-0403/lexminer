from enum import Enum


class Role(str, Enum):
    REGISTERED = "registered"
    ADMIN = "admin"