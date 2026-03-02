#!/bin/bash

# Production Build and Test Script for API Explorer II
# This script builds both frontend and backend, then tests as if on a production server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API Explorer II - Production Build Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the API-Explorer-II directory."
    exit 1
fi

print_info "Starting production build and test process..."
echo ""

# Step 1: Clean previous builds
echo -e "${BLUE}Step 1: Cleaning previous builds${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    print_status "Removed old frontend build (dist/)"
fi

if [ -d "dist-server" ]; then
    rm -rf dist-server
    print_status "Removed old backend build (dist-server/)"
fi
echo ""

# Step 2: Check environment variables
echo -e "${BLUE}Step 2: Checking environment configuration${NC}"
if [ -f ".env" ]; then
    print_status "Found .env file"
else
    print_error ".env file not found"
    print_info "Copy .env.example to .env and configure it"
    exit 1
fi

# Check critical environment variables
if grep -q "VITE_OBP_API_HOST" .env; then
    print_status "VITE_OBP_API_HOST is configured"
else
    print_error "VITE_OBP_API_HOST not found in .env"
    exit 1
fi
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing dependencies${NC}"
print_info "Running npm ci (clean install)..."
npm ci --quiet
print_status "Dependencies installed"
echo ""

# Step 4: Build frontend
echo -e "${BLUE}Step 4: Building frontend (Vite)${NC}"
print_info "Running: npm run build-only"
npm run build-only
if [ -d "dist" ]; then
    DIST_SIZE=$(du -sh dist | cut -f1)
    print_status "Frontend built successfully (size: $DIST_SIZE)"
else
    print_error "Frontend build failed - dist/ directory not created"
    exit 1
fi
echo ""

# Step 5: Build backend
echo -e "${BLUE}Step 5: Building backend (TypeScript ES Modules)${NC}"
print_info "Running: npm run build-server"
npm run build-server
if [ -d "dist-server" ]; then
    print_status "Backend built successfully"
else
    print_error "Backend build failed - dist-server/ directory not created"
    exit 1
fi

# Check if main app file exists
if [ -f "dist-server/server/app.js" ]; then
    print_status "Server entry point found: dist-server/server/app.js"
else
    print_error "Server entry point not found: dist-server/server/app.js"
    exit 1
fi
echo ""

# Step 6: Verify ES Module format
echo -e "${BLUE}Step 6: Verifying ES Module format${NC}"
if head -50 dist-server/server/app.js | grep -E "^import " | head -1 > /dev/null; then
    print_status "Backend is using ES modules (import statements found)"
else
    print_error "Backend is not using ES modules - CommonJS detected"
    exit 1
fi

if grep -q '"type": "module"' package.json; then
    print_status "package.json has type: module"
else
    print_error 'package.json missing "type": "module"'
    exit 1
fi
echo ""

# Step 7: Check for Redis
echo -e "${BLUE}Step 7: Checking dependencies${NC}"
print_info "Checking if Redis is running..."
if redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is running"
else
    print_error "Redis is not running"
    print_info "Start Redis with: redis-server"
    print_info "Or using Docker: docker run -d -p 6379:6379 redis"
fi
echo ""

# Step 8: Test server startup
echo -e "${BLUE}Step 8: Testing server startup${NC}"
print_info "Starting server for 5 seconds to test..."

# Start server in background
timeout 5 node dist-server/server/app.js > /tmp/api-explorer-test.log 2>&1 || true

# Check the log
if grep -q "Backend is running" /tmp/api-explorer-test.log; then
    print_status "Server started successfully"

    # Show key startup info
    if grep -q "OAuth2Service: Initialization successful" /tmp/api-explorer-test.log; then
        print_status "OAuth2 service initialized"
    fi

    if grep -q "Connected to Redis" /tmp/api-explorer-test.log; then
        print_status "Redis connection established"
    fi
else
    print_error "Server failed to start"
    print_info "Check logs at /tmp/api-explorer-test.log"
    cat /tmp/api-explorer-test.log
    exit 1
fi
echo ""

# Step 9: Show build summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Build Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Frontend build:"
echo "  Location: $(pwd)/dist"
echo "  Size: $DIST_SIZE"
echo "  Files: $(find dist -type f | wc -l)"
echo ""
echo "Backend build:"
echo "  Location: $(pwd)/dist-server"
echo "  Entry: dist-server/server/app.js"
echo "  Module type: ES Modules"
echo ""
echo "To run in production:"
echo -e "  ${YELLOW}node dist-server/server/app.js${NC}"
echo ""
echo "Frontend files can be served by the backend or a web server:"
echo -e "  ${YELLOW}The backend serves frontend from dist/ automatically${NC}"
echo ""

# Step 10: Production readiness checklist
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Production Readiness Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "✓ Frontend built and optimized"
echo "✓ Backend compiled to ES modules"
echo "✓ Server starts without errors"
echo "✓ Dependencies installed"
echo ""
echo "Before deploying to production:"
echo "  1. Configure production .env file"
echo "  2. Ensure Redis is running and accessible"
echo "  3. Set NODE_ENV=production"
echo "  4. Configure OBP API host and credentials"
echo "  5. Set up OAuth2/OIDC client credentials"
echo "  6. Configure process manager (PM2, systemd, etc.)"
echo "  7. Set up reverse proxy (nginx, Apache, etc.)"
echo ""

print_status "Production build test completed successfully!"
echo ""

# Cleanup
rm -f /tmp/api-explorer-test.log
