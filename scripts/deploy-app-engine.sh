#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Deploy Tashi API to Google App Engine
#
# Usage:
#   bash scripts/deploy-app-engine.sh
#
# Requirements:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - An App Engine app created for your project (gcloud app create)
#   - pnpm installed (npm i -g pnpm, or corepack enable)
#
# The script:
#   1. Installs all dependencies
#   2. Builds the API server (compiles TypeScript → dist/)
#   3. Creates a self-contained deploy package via pnpm deploy
#      (only production node_modules + compiled dist/)
#   4. Copies app.yaml into the package
#   5. Deploys to App Engine
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_DIR="$(pwd)/.deploy-tmp"

echo "════════════════════════════════════════"
echo "  Tashi API → Google App Engine"
echo "════════════════════════════════════════"
echo ""

# ── Step 1: Install dependencies ─────────────────────────────────────────────
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# ── Step 2: Build the API server ─────────────────────────────────────────────
echo "→ Building API server..."
pnpm --filter @workspace/api-server run build

# ── Step 3: Create self-contained deploy package ─────────────────────────────
echo "→ Packaging for deployment (production deps only)..."
rm -rf "$DEPLOY_DIR"
pnpm --filter @workspace/api-server deploy "$DEPLOY_DIR"

# ── Step 4: Copy app.yaml into the deploy folder ─────────────────────────────
echo "→ Copying App Engine configuration..."
cp artifacts/api-server/app.yaml "$DEPLOY_DIR/app.yaml"

# Create a .gcloudignore so gcloud doesn't re-upload node_modules to the
# build server — we want the pre-built node_modules included in the upload
cat > "$DEPLOY_DIR/.gcloudignore" << 'EOF'
.git
.gitignore
*.log
EOF

# ── Step 5: Deploy to App Engine ─────────────────────────────────────────────
echo "→ Deploying to App Engine..."
echo "   (You will be prompted to confirm the deployment)"
echo ""
gcloud app deploy "$DEPLOY_DIR/app.yaml"

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -rf "$DEPLOY_DIR"

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Set FIREBASE_SERVICE_ACCOUNT and JWT_SECRET in:"
echo "     https://console.cloud.google.com/appengine/versions"
echo "     → Select your version → Edit → Environment Variables"
echo ""
echo "  2. View your app:"
echo "     gcloud app browse"
