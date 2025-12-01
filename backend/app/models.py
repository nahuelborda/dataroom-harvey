import uuid
from datetime import datetime, timezone
from app import db


def generate_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    oauth_accounts = db.relationship(
        "OAuthAccount", back_populates="user", cascade="all, delete-orphan"
    )
    datarooms = db.relationship(
        "Dataroom", back_populates="user", cascade="all, delete-orphan"
    )
    files = db.relationship("File", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OAuthAccount(db.Model):
    __tablename__ = "oauth_accounts"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # e.g., 'google'
    provider_account_id = db.Column(db.String(255), nullable=False)
    access_token = db.Column(db.Text, nullable=True)
    refresh_token = db.Column(db.Text, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    scope = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = db.relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        db.UniqueConstraint("provider", "provider_account_id", name="uq_provider_account"),
    )


class Dataroom(db.Model):
    __tablename__ = "datarooms"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = db.relationship("User", back_populates="datarooms")
    files = db.relationship(
        "File", back_populates="dataroom", cascade="all, delete-orphan"
    )

    def to_dict(self, include_files=False):
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "file_count": len([f for f in self.files if f.status == "imported"]),
        }
        if include_files:
            result["files"] = [
                f.to_dict() for f in self.files if f.status == "imported"
            ]
        return result


class File(db.Model):
    __tablename__ = "files"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    dataroom_id = db.Column(db.String(36), db.ForeignKey("datarooms.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    google_file_id = db.Column(db.String(255), nullable=True)
    name = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(255), nullable=True)
    size_bytes = db.Column(db.BigInteger, nullable=True)
    storage_path = db.Column(db.String(1000), nullable=True)
    original_url = db.Column(db.Text, nullable=True)
    status = db.Column(
        db.String(50), default="imported"
    )  # 'imported', 'deleted', 'failed'
    imported_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    dataroom = db.relationship("Dataroom", back_populates="files")
    user = db.relationship("User", back_populates="files")

    def to_dict(self):
        return {
            "id": self.id,
            "dataroom_id": self.dataroom_id,
            "google_file_id": self.google_file_id,
            "name": self.name,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "original_url": self.original_url,
            "status": self.status,
            "imported_at": self.imported_at.isoformat() if self.imported_at else None,
        }

