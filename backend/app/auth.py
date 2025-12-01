import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Optional
from flask import request, g, current_app, jsonify
from app.models import User, OAuthAccount
from app import db


def create_jwt_token(user_id: str) -> str:
    """Create a JWT token for the user."""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=current_app.config["JWT_EXPIRY_HOURS"]),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user() -> Optional[User]:
    """Get the current user from the request context."""
    return getattr(g, "current_user", None)


def require_auth(f):
    """Decorator to require authentication for a route."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "UNAUTHORIZED", "message": "Missing or invalid authorization header"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_jwt_token(token)

        if not payload:
            return jsonify({"error": "UNAUTHORIZED", "message": "Invalid or expired token"}), 401

        user = db.session.get(User, payload["user_id"])
        if not user:
            return jsonify({"error": "UNAUTHORIZED", "message": "User not found"}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def get_user_oauth_account(user: User, provider: str = "google") -> Optional[OAuthAccount]:
    """Get the OAuth account for a user and provider."""
    return OAuthAccount.query.filter_by(user_id=user.id, provider=provider).first()

