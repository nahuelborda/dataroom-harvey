#!/bin/bash
# Run this ONCE to set up the backend

cd /Users/megasx/dataroom-app/backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set Flask app
export FLASK_APP=app.main:app

# Initialize database (only if migrations folder doesn't exist)
if [ ! -d "migrations/versions" ]; then
    rm -rf migrations
    flask db init
    flask db migrate -m "Initial"
    flask db upgrade
fi

echo "✅ Setup complete! Run 'bash backend.sh' to start the server."

