#!/usr/bin/env bash
# Build script for Render

set -e

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing dependencies globally..."
pip install -r requirements.txt

echo "Creating data directory..."
mkdir -p data

echo "Build complete!"
echo "Database will be initialized on first request."

