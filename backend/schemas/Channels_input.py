from pydantic import BaseModel, Field, field_validator
from typing import Optional
from utils.validators import validate_channel_name


CHANNEL_MODES = {"announcement", "orgbased", "teambased"}


class Channels_input(BaseModel):
    channel_name: str = Field(..., min_length=3, max_length=50)
    channel_mode: str
    channel_category: str
    description: Optional[str] = None

    @field_validator("channel_name")
    @classmethod
    def _check_channel_name(cls, value: str) -> str:
        return validate_channel_name(value)

    @field_validator("channel_mode")
    @classmethod
    def _check_channel_mode(cls, value: str) -> str:
        if value not in CHANNEL_MODES:
            raise ValueError(f"Invalid channel type. Must be one of: {', '.join(sorted(CHANNEL_MODES))}")
        return value
