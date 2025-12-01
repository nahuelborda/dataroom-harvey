"""
Render startup script - initializes database on first run
"""
import os
import sys

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("Database tables created!")

