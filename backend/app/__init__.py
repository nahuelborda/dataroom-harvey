from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Create tables on startup (for Render deployment)
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created/verified!")
        except Exception as e:
            print(f"Database init skipped: {e}")

    # Configure CORS - allow multiple origins
    allowed_origins = [
        app.config["FRONTEND_ORIGIN"],
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    # Add any Vercel preview URLs
    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        resources={r"/*": {"origins": "*"}},  # Allow all for demo
    )

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.drive_routes import drive_bp
    from app.routes.dataroom_routes import dataroom_bp
    from app.routes.file_routes import file_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(drive_bp, url_prefix="/api/drive")
    app.register_blueprint(dataroom_bp, url_prefix="/api/datarooms")
    app.register_blueprint(file_bp, url_prefix="/api/files")

    # Health check endpoint
    @app.route("/health")
    def health():
        return {"status": "healthy"}

    return app

