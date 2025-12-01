#!/bin/bash
cd /Users/megasx/dataroom-app/backend

# Activate virtual environment
source .venv/bin/activate

# Set Flask app
export FLASK_APP=app.main:app
export FLASK_DEBUG=1

# Run the server on all interfaces with debug mode
flask run --host=0.0.0.0 --port 5000 --debug
