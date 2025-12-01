from flask import Blueprint, request, redirect, current_app, jsonify
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone
from app import db
from app.models import User, OAuthAccount, Dataroom
from app.auth import create_jwt_token, require_auth, get_current_user
from app.google_client import (
    exchange_code_for_tokens,
    get_user_info,
    GoogleClientError,
)

auth_bp = Blueprint("auth", __name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_SCOPES = "openid email profile https://www.googleapis.com/auth/drive.readonly"


@auth_bp.route("/debug")
def debug_config():
    """Debug endpoint to check OAuth config."""
    return jsonify({
        "client_id": current_app.config.get("GOOGLE_CLIENT_ID"),
        "redirect_uri": current_app.config.get("GOOGLE_REDIRECT_URI"),
        "has_secret": bool(current_app.config.get("GOOGLE_CLIENT_SECRET")),
    })


@auth_bp.route("/google/start")
def google_auth_start():
    """Start the Google OAuth flow."""
    client_id = current_app.config["GOOGLE_CLIENT_ID"]
    
    # Check if client_id is configured
    if not client_id:
        return jsonify({
            "error": "CONFIG_ERROR",
            "message": "GOOGLE_CLIENT_ID not configured. Check your .env file."
        }), 500
    
    # Use configured redirect URI or build from request
    redirect_uri = current_app.config.get("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        # Auto-detect based on request
        redirect_uri = f"{request.host_url.rstrip('/')}/auth/google/callback"
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return redirect(url)


@auth_bp.route("/google/callback")
def google_auth_callback():
    """Handle the Google OAuth callback."""
    code = request.args.get("code")
    error = request.args.get("error")

    frontend_origin = current_app.config["FRONTEND_ORIGIN"]

    if error:
        return redirect(f"{frontend_origin}/auth/callback?error={error}")

    if not code:
        return redirect(f"{frontend_origin}/auth/callback?error=no_code")

    try:
        # Build redirect_uri (must match what was used in /google/start)
        redirect_uri = current_app.config.get("GOOGLE_REDIRECT_URI")
        if not redirect_uri:
            redirect_uri = f"{request.host_url.rstrip('/')}/auth/google/callback"
        
        # Exchange code for tokens
        token_data = exchange_code_for_tokens(code, redirect_uri)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        # Get user info from Google
        user_info = get_user_info(access_token)
        google_id = user_info["sub"]
        email = user_info["email"]
        name = user_info.get("name", "")

        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email, name=name)
            db.session.add(user)
            db.session.flush()

            # Create default dataroom for new user
            default_dataroom = Dataroom(
                user_id=user.id,
                name="My Dataroom",
                description="Default dataroom for imported files",
            )
            db.session.add(default_dataroom)

        # Find or create OAuth account
        oauth_account = OAuthAccount.query.filter_by(
            provider="google", provider_account_id=google_id
        ).first()

        if oauth_account:
            # Update existing OAuth account
            oauth_account.access_token = access_token
            if refresh_token:
                oauth_account.refresh_token = refresh_token
            oauth_account.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=expires_in
            )
            oauth_account.scope = GOOGLE_SCOPES
        else:
            # Create new OAuth account
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider="google",
                provider_account_id=google_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                scope=GOOGLE_SCOPES,
            )
            db.session.add(oauth_account)

        db.session.commit()

        # Create JWT token
        jwt_token = create_jwt_token(user.id)

        # Redirect to frontend with token
        return redirect(f"{frontend_origin}/auth/callback?token={jwt_token}")

    except GoogleClientError as e:
        return redirect(f"{frontend_origin}/auth/callback?error={e.error_code}")
    except Exception as e:
        current_app.logger.error(f"OAuth callback error: {str(e)}")
        return redirect(f"{frontend_origin}/auth/callback?error=server_error")


@auth_bp.route("/me")
@require_auth
def get_me():
    """Get the current authenticated user."""
    user = get_current_user()
    
    # Check if user has Google connected
    oauth_account = OAuthAccount.query.filter_by(
        user_id=user.id, provider="google"
    ).first()
    
    return jsonify({
        "user": user.to_dict(),
        "google_connected": oauth_account is not None,
    })


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Logout the current user (client-side token removal)."""
    # In a stateless JWT setup, the client just removes the token
    # Here we could implement token blacklisting if needed
    return jsonify({"message": "Logged out successfully"})

