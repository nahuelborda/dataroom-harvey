import requests
from datetime import datetime, timedelta, timezone
from typing import Optional
from flask import current_app
from app.models import OAuthAccount
from app import db

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3"


class GoogleClientError(Exception):
    """Custom exception for Google API errors."""

    def __init__(self, message: str, error_code: str = "GOOGLE_API_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None) -> dict:
    """Exchange authorization code for access and refresh tokens."""
    # Use provided redirect_uri or get from config
    if not redirect_uri:
        redirect_uri = current_app.config.get("GOOGLE_REDIRECT_URI")
    
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
        timeout=30,
    )

    if response.status_code != 200:
        raise GoogleClientError(
            f"Failed to exchange code for tokens: {response.text}",
            "TOKEN_EXCHANGE_FAILED",
        )

    return response.json()


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh the access token using the refresh token."""
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )

    if response.status_code != 200:
        raise GoogleClientError(
            "Failed to refresh access token. User may need to reconnect Google.",
            "OAUTH_REVOKED",
        )

    return response.json()


def get_user_info(access_token: str) -> dict:
    """Get user information from Google."""
    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )

    if response.status_code != 200:
        raise GoogleClientError(
            f"Failed to get user info: {response.text}", "USERINFO_FAILED"
        )

    return response.json()


def ensure_valid_access_token(oauth_account: OAuthAccount) -> str:
    """Ensure the access token is valid, refreshing if necessary."""
    # Add 5 minute margin
    margin = timedelta(minutes=5)
    now = datetime.now(timezone.utc)

    # Handle timezone-naive datetime from database
    expires_at = oauth_account.expires_at
    if expires_at:
        # If expires_at is naive, assume it's UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at > now + margin:
            return oauth_account.access_token

    # Need to refresh
    if not oauth_account.refresh_token:
        raise GoogleClientError(
            "No refresh token available. User needs to reconnect Google.",
            "OAUTH_REVOKED",
        )

    try:
        token_data = refresh_access_token(oauth_account.refresh_token)

        # Update the OAuth account
        oauth_account.access_token = token_data["access_token"]
        oauth_account.expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=token_data.get("expires_in", 3600)
        )

        # Google may return a new refresh token
        if "refresh_token" in token_data:
            oauth_account.refresh_token = token_data["refresh_token"]

        db.session.commit()
        return oauth_account.access_token
    except GoogleClientError:
        raise
    except Exception as e:
        raise GoogleClientError(f"Failed to refresh token: {str(e)}", "OAUTH_REVOKED")


def list_drive_files(
    access_token: str,
    page_size: int = 20,
    page_token: Optional[str] = None,
    query: Optional[str] = None,
    folder_id: Optional[str] = None,
) -> dict:
    """List files from Google Drive, optionally scoped to a specific folder."""
    params = {
        "pageSize": page_size,
        "fields": "files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink),nextPageToken",
        "orderBy": "modifiedTime desc",
    }

    if page_token:
        params["pageToken"] = page_token

    # Build query - exclude folders by default, add search if provided
    q_parts = ["mimeType != 'application/vnd.google-apps.folder'"]
    
    # Scope to specific folder if provided
    if folder_id:
        q_parts.append(f"'{folder_id}' in parents")
    
    if query:
        q_parts.append(f"name contains '{query}'")
    params["q"] = " and ".join(q_parts)

    response = requests.get(
        f"{GOOGLE_DRIVE_API}/files",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        timeout=30,
    )

    if response.status_code != 200:
        raise GoogleClientError(
            f"Failed to list Drive files: {response.text}", "DRIVE_LIST_FAILED"
        )

    return response.json()


def get_drive_file_metadata(access_token: str, file_id: str) -> dict:
    """Get metadata for a specific Drive file."""
    response = requests.get(
        f"{GOOGLE_DRIVE_API}/files/{file_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"fields": "id,name,mimeType,size,webViewLink"},
        timeout=30,
    )

    if response.status_code != 200:
        raise GoogleClientError(
            f"Failed to get file metadata: {response.text}", "DRIVE_METADATA_FAILED"
        )

    return response.json()


def download_drive_file(access_token: str, file_id: str, mime_type: str) -> bytes:
    """Download a file from Google Drive."""
    # Google Workspace files (Docs, Sheets, etc.) need to be exported
    google_workspace_types = {
        "application/vnd.google-apps.document": "application/pdf",
        "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.google-apps.presentation": "application/pdf",
        "application/vnd.google-apps.drawing": "application/pdf",
    }

    if mime_type in google_workspace_types:
        # Export Google Workspace file
        export_mime = google_workspace_types[mime_type]
        response = requests.get(
            f"{GOOGLE_DRIVE_API}/files/{file_id}/export",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"mimeType": export_mime},
            timeout=120,
        )
    else:
        # Download regular file
        response = requests.get(
            f"{GOOGLE_DRIVE_API}/files/{file_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"alt": "media"},
            timeout=120,
        )

    if response.status_code != 200:
        raise GoogleClientError(
            f"Failed to download file: {response.text}", "DRIVE_DOWNLOAD_FAILED"
        )

    return response.content

