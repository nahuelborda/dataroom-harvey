#!/usr/bin/env bash
# Build script for Render

set -e

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Creating data directory..."
mkdir -p data

echo "Initializing database..."
python render_start.py

echo "Build complete!"

