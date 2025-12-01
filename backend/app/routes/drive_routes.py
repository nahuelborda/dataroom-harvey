import traceback
from flask import Blueprint, request, jsonify, current_app
from app.auth import require_auth, get_current_user, get_user_oauth_account
from app.google_client import (
    ensure_valid_access_token,
    list_drive_files,
    GoogleClientError,
)

drive_bp = Blueprint("drive", __name__)


# Configure which folder to show files from (set to None to show all files)
# To find a folder ID: open the folder in Google Drive, the ID is in the URL
# Example: https://drive.google.com/drive/folders/FOLDER_ID_HERE
ALLOWED_FOLDER_ID = "1Fcc9kd_Wca3CGXT6v2t99BS0JObh0bYl"


@drive_bp.route("/files")
@require_auth
def list_files():
    """List files from the user's Google Drive."""
    user = get_current_user()
    oauth_account = get_user_oauth_account(user, "google")

    if not oauth_account:
        return jsonify({
            "error": "GOOGLE_NOT_CONNECTED",
            "message": "Please connect your Google account first",
        }), 400

    try:
        # Ensure we have a valid access token
        print(f"[DEBUG] Getting access token for user {user.id}")
        access_token = ensure_valid_access_token(oauth_account)
        print(f"[DEBUG] Got access token: {access_token[:20]}...")

        # Get query parameters
        page_size = request.args.get("page_size", 20, type=int)
        page_token = request.args.get("page_token")
        query = request.args.get("q")
        folder_id = request.args.get("folder_id", ALLOWED_FOLDER_ID)

        # Limit page size
        page_size = min(page_size, 100)

        # List files from Drive
        print(f"[DEBUG] Calling list_drive_files with page_size={page_size}, folder_id={folder_id}")
        result = list_drive_files(
            access_token=access_token,
            page_size=page_size,
            page_token=page_token,
            query=query,
            folder_id=folder_id,
        )
        print(f"[DEBUG] Got {len(result.get('files', []))} files")

        # Normalize the response
        files = []
        for file in result.get("files", []):
            files.append({
                "id": file["id"],
                "name": file["name"],
                "mime_type": file.get("mimeType"),
                "size": file.get("size"),
                "modified_time": file.get("modifiedTime"),
                "web_view_link": file.get("webViewLink"),
                "icon_link": file.get("iconLink"),
            })

        return jsonify({
            "files": files,
            "next_page_token": result.get("nextPageToken"),
        })

    except GoogleClientError as e:
        print(f"[ERROR] GoogleClientError: {e.error_code} - {e.message}")
        status_code = 401 if e.error_code == "OAUTH_REVOKED" else 500
        return jsonify({
            "error": e.error_code,
            "message": e.message,
        }), status_code
    except Exception as e:
        print(f"[ERROR] Exception in list_files: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "DRIVE_ERROR",
            "message": str(e),
        }), 500

