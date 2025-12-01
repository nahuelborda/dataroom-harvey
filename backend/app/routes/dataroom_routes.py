from flask import Blueprint, request, jsonify
from app import db
from app.models import Dataroom, File
from app.auth import require_auth, get_current_user

dataroom_bp = Blueprint("dataroom", __name__)


@dataroom_bp.route("", methods=["GET"])
@require_auth
def list_datarooms():
    """List all datarooms for the current user."""
    user = get_current_user()
    datarooms = Dataroom.query.filter_by(user_id=user.id).order_by(
        Dataroom.created_at.desc()
    ).all()
    
    return jsonify({
        "datarooms": [d.to_dict() for d in datarooms]
    })


@dataroom_bp.route("", methods=["POST"])
@require_auth
def create_dataroom():
    """Create a new dataroom."""
    user = get_current_user()
    data = request.get_json()

    if not data or not data.get("name"):
        return jsonify({
            "error": "VALIDATION_ERROR",
            "message": "Name is required",
        }), 400

    dataroom = Dataroom(
        user_id=user.id,
        name=data["name"],
        description=data.get("description", ""),
    )
    db.session.add(dataroom)
    db.session.commit()

    return jsonify(dataroom.to_dict()), 201


@dataroom_bp.route("/<dataroom_id>", methods=["GET"])
@require_auth
def get_dataroom(dataroom_id):
    """Get a specific dataroom with its files."""
    user = get_current_user()
    dataroom = Dataroom.query.filter_by(id=dataroom_id, user_id=user.id).first()

    if not dataroom:
        return jsonify({
            "error": "NOT_FOUND",
            "message": "Dataroom not found",
        }), 404

    return jsonify(dataroom.to_dict(include_files=True))


@dataroom_bp.route("/<dataroom_id>", methods=["PUT"])
@require_auth
def update_dataroom(dataroom_id):
    """Update a dataroom."""
    user = get_current_user()
    dataroom = Dataroom.query.filter_by(id=dataroom_id, user_id=user.id).first()

    if not dataroom:
        return jsonify({
            "error": "NOT_FOUND",
            "message": "Dataroom not found",
        }), 404

    data = request.get_json()
    if data.get("name"):
        dataroom.name = data["name"]
    if "description" in data:
        dataroom.description = data["description"]

    db.session.commit()
    return jsonify(dataroom.to_dict())


@dataroom_bp.route("/<dataroom_id>", methods=["DELETE"])
@require_auth
def delete_dataroom(dataroom_id):
    """Delete a dataroom and all its files."""
    user = get_current_user()
    dataroom = Dataroom.query.filter_by(id=dataroom_id, user_id=user.id).first()

    if not dataroom:
        return jsonify({
            "error": "NOT_FOUND",
            "message": "Dataroom not found",
        }), 404

    # Delete all files from disk
    from app.storage import delete_file as delete_file_from_disk
    for file in dataroom.files:
        if file.storage_path:
            delete_file_from_disk(file.storage_path)

    db.session.delete(dataroom)
    db.session.commit()

    return jsonify({"message": "Dataroom deleted successfully"})


@dataroom_bp.route("/<dataroom_id>/files", methods=["GET"])
@require_auth
def list_dataroom_files(dataroom_id):
    """List all files in a dataroom."""
    user = get_current_user()
    dataroom = Dataroom.query.filter_by(id=dataroom_id, user_id=user.id).first()

    if not dataroom:
        return jsonify({
            "error": "NOT_FOUND",
            "message": "Dataroom not found",
        }), 404

    files = File.query.filter_by(
        dataroom_id=dataroom_id,
        status="imported"
    ).order_by(File.imported_at.desc()).all()

    return jsonify({
        "files": [f.to_dict() for f in files]
    })

