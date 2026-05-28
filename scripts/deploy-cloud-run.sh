#!/bin/bash
set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-tashi-api}"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "Deploying $SERVICE_NAME to Cloud Run in $REGION..."
echo "Project: $PROJECT_ID"
echo "Image:   $IMAGE"
echo ""

# ─── Build & push Docker image ─────────────────────────────────────────────────
echo "→ Building Docker image..."
docker build -t "$IMAGE" .

echo "→ Pushing image to Container Registry..."
docker push "$IMAGE"

# ─── Deploy to Cloud Run ───────────────────────────────────────────────────────
echo "→ Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="NODE_ENV=production" \
  --project="$PROJECT_ID"

echo ""
echo "✓ Deployment complete!"
echo "  Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)')"
