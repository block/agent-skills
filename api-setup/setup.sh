#!/bin/bash
# API Setup Script
# Usage: ./setup.sh <api-name>

API_NAME=$1

if [ -z "$API_NAME" ]; then
    echo "Usage: ./setup.sh <api-name>"
    exit 1
fi

# Create integration directory
mkdir -p "integrations/$API_NAME"

# Copy config template
cp templates/config.template.json "integrations/$API_NAME/config.json"

echo "Created integration directory for $API_NAME"
echo "Edit integrations/$API_NAME/config.json with your credentials"
