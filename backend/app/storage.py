import os
import uuid
from typing import Optional
from flask import current_app


def get_storage_path(user_id: str, dataroom_id: str, filename: Optional[str] = None) -> str:
    """Generate a storage path for a file."""
    base_path = current_app.config["STORAGE_PATH"]
    
    # Generate unique filename if not provided
    if filename is None:
        filename = str(uuid.uuid4())
    
    return os.path.join(base_path, user_id, dataroom_id, filename)


def ensure_directory_exists(path: str) -> None:
    """Ensure the directory for a file path exists."""
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)


def save_file(path: str, content: bytes) -> int:
    """Save file content to disk and return the size in bytes."""
    ensure_directory_exists(path)
    with open(path, "wb") as f:
        f.write(content)
    return len(content)


def read_file(path: str) -> bytes:
    """Read file content from disk."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    with open(path, "rb") as f:
        return f.read()


def delete_file(path: str) -> bool:
    """Delete a file from disk."""
    try:
        if os.path.exists(path):
            os.remove(path)
            return True
        return False
    except Exception:
        return False


def get_file_size(path: str) -> int:
    """Get the size of a file in bytes."""
    if os.path.exists(path):
        return os.path.getsize(path)
    return 0

