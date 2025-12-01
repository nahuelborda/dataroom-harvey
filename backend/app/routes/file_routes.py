import uuid
from flask import Blueprint, request, jsonify, send_file, current_app
from app import db
from app.models import Dataroom, File
from app.auth import require_auth, get_current_user, get_user_oauth_account
from app.google_client import (
    ensure_valid_access_token,
    get_drive_file_metadata,
    download_drive_file,
    GoogleClientError,
)
from app.storage import get_storage_path, save_file, delete_file as delete_file_from_disk
import io

file_bp = Blueprint("file", __name__)


@file_bp.route("/import", methods=["POST"])
@require_auth
def import_file():
    """Import a file from Google Drive into a dataroom."""
    user = get_current_user()
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "VALIDATION_ERROR",
            "message": "Request body is required",
        }), 400

    dataroom_id = data.get("dataroom_id")
    google_file_id = data.get("google_file_id")

    if not dataroom_id or not google_file_id:
        return jsonify({
            "error": "VALIDATION_ERROR",
            "message": "dataroom_id and google_file_id are required",
        }), 400

    # Verify dataroom belongs to user
    dataroom = Dataroom.query.filter_by(id=dataroom_id, user_id=user.id).first()
    if not dataroom:
        return jsonify({
            "error": "NOT_FOUND",
            "message": "Dataroom not found",
        }), 404

    # Check if file already imported
    existing_file = File.query.filter_by(
        dataroom_id=dataroom_id,
        google_file_id=google_file_id,
        status="imported"
    ).first()
    if existing_file:
        return jsonify({
            "error": "ALREADY_EXISTS",
            "message": "This file has already been imported to this dataroom",
        }), 409

    # Get OAuth account
    oauth_account = get_user_oauth_account(user, "google")
    if not oauth_account:
        return jsonify({
            "error": "GOOGLE_NOT_CONNECTED",
            "message": "Please connect your Google account first",
        }), 400

    try:
        # Ensure valid access token
        access_token = ensure_valid_access_token(oauth_account)

        # Get file metadata from Drive
        metadata = get_drive_file_metadata(access_token, google_file_id)
        file_name = metadata["name"]
        mime_type = metadata.get("mimeType", "application/octet-stream")
        original_url = metadata.get("webViewLink")

        # Download file content
        content = download_drive_file(access_token, google_file_id, mime_type)

        # Generate storage path with file extension
        file_uuid = str(uuid.uuid4())
        extension = _get_extension_for_mime_type(mime_type)
        filename = f"{file_uuid}{extension}"
        storage_path = get_storage_path(user.id, dataroom_id, filename)

        # Save to disk
        size_bytes = save_file(storage_path, content)

        # Create file record
        file_record = File(
            dataroom_id=dataroom_id,
            user_id=user.id,
            google_file_id=google_file_id,
            name=file_name,
            mime_type=mime_type,
            size_bytes=size_bytes,
            storage_path=storage_path,
            original_url=original_url,
            status="imported",
        )
        db.session.add(file_record)
        db.session.commit()

        return jsonify(file_record.to_dict()), 201

    except GoogleClientError as e:
        status_code = 401 if e.error_code == "OAUTH_REVOKED" else 500
        return jsonify({
            "error": e.error_code,
            "message": e.message,
        }), status_code
    except Exception as e:
        current_app.logger.error(f"Import error: {str(e)}")
        return jsonify({
            "error": "IMPORT_FAILED",
            "message": f"Failed to import file: {str(e)}",
        }), 500


@file_bp.route("/<file_id>", methods=["GET"])
@require_auth
def get_file(file_id):
    """Get file metadata."""
    user = get_current_user()
    file = File.query.filter_by(id=file_id, user_id=user.id).first()

    if not file or file.status == "deleted":
        return jsonify({
            "error": "NOT_FOUND",
            "message": "File not found",
        }), 404

    return jsonify(file.to_dict())


@file_bp.route("/<file_id>/download", methods=["GET"])
@require_auth
def download_file(file_id):
    """Download a file."""
    user = get_current_user()
    file = File.query.filter_by(id=file_id, user_id=user.id).first()

    if not file or file.status == "deleted":
        return jsonify({
            "error": "NOT_FOUND",
            "message": "File not found",
        }), 404

    if not file.storage_path:
        return jsonify({
            "error": "FILE_NOT_STORED",
            "message": "File content not available",
        }), 404

    try:
        from app.storage import read_file
        content = read_file(file.storage_path)
        
        return send_file(
            io.BytesIO(content),
            mimetype=file.mime_type or "application/octet-stream",
            as_attachment=True,
            download_name=file.name,
        )
    except FileNotFoundError:
        return jsonify({
            "error": "FILE_NOT_FOUND",
            "message": "File not found on disk",
        }), 404


@file_bp.route("/<file_id>", methods=["DELETE"])
@require_auth
def delete_file(file_id):
    """Delete a file (logical delete + disk removal)."""
    user = get_current_user()
    file = File.query.filter_by(id=file_id, user_id=user.id).first()

    if not file or file.status == "deleted":
        return jsonify({
            "error": "NOT_FOUND",
            "message": "File not found",
        }), 404

    # Delete from disk
    if file.storage_path:
        delete_file_from_disk(file.storage_path)

    # Mark as deleted in DB
    file.status = "deleted"
    db.session.commit()

    return jsonify({"message": "File deleted successfully"})


def _get_extension_for_mime_type(mime_type: str) -> str:
    """Get file extension for a MIME type."""
    mime_to_ext = {
        "application/pdf": ".pdf",
        "application/vnd.google-apps.document": ".pdf",
        "application/vnd.google-apps.spreadsheet": ".xlsx",
        "application/vnd.google-apps.presentation": ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "text/plain": ".txt",
        "text/html": ".html",
        "text/csv": ".csv",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "application/json": ".json",
        "application/xml": ".xml",
    }
    return mime_to_ext.get(mime_type, "")

