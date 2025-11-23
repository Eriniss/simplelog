#!/bin/bash

# SimpleLog Docker Deployment Script
# This script builds and deploys the SimpleLog application

set -e  # Exit on any error

echo "🚀 SimpleLog Docker Deployment"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create .env file first."
    echo "   You can copy .env.example to .env and update the values."
    exit 1
fi

echo "📋 Configuration:"
echo "   - .env file: ✓ Found"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down 2>/dev/null || true
echo ""

# Build the image
echo "🔨 Building Docker image..."
echo "   Using latest Go version"
docker compose build --no-cache
echo ""

# Show Go version used
echo "📋 Checking Go version in image..."
docker compose run --rm simplelog ./simplelog --version 2>/dev/null || echo "   (Version info not available)"
echo ""

# Start the containers
echo "🚀 Starting containers..."
docker compose up -d
echo ""

# Wait for the service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 5

# Check if the service is running
if docker compose ps | grep -q "simplelog.*Up"; then
    echo "✅ SimpleLog is now running!"
    echo ""
    echo "📊 Service status:"
    docker compose ps
    echo ""
    echo "🌐 Access the application at: http://localhost:3000"
    echo ""
    echo "📝 Useful commands:"
    echo "   - View logs:        docker compose logs -f"
    echo "   - Stop service:     docker compose down"
    echo "   - Restart service:  docker compose restart"
    echo "   - View status:      docker compose ps"
else
    echo "❌ Failed to start SimpleLog"
    echo ""
    echo "📋 Checking logs..."
    docker compose logs --tail=50
    exit 1
fi
