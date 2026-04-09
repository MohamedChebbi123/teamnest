FREE_MAX_CHANNELS = 5
FREE_MAX_FILE_SIZE_MB = 10
FREE_MAX_FILE_SIZE_BYTES = FREE_MAX_FILE_SIZE_MB * 1024 * 1024

FREE_MAX_MEMBERS = 10

PRO_MAX_CHANNELS = None  # unlimited
PRO_MAX_FILE_SIZE_BYTES = None  # unlimited
PRO_MAX_MEMBERS = None  # unlimited


def get_member_limit(plan: str | None) -> int | None:
    if plan and plan.upper() == "PRO":
        return PRO_MAX_MEMBERS
    return FREE_MAX_MEMBERS


def get_channel_limit(plan: str | None) -> int | None:
    if plan and plan.upper() == "PRO":
        return PRO_MAX_CHANNELS
    return FREE_MAX_CHANNELS


def get_file_size_limit(plan: str | None) -> int | None:
    if plan and plan.upper() == "PRO":
        return PRO_MAX_FILE_SIZE_BYTES
    return FREE_MAX_FILE_SIZE_BYTES
