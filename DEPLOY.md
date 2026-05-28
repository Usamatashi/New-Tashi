# Deploying Tashi API to Google Cloud

Only the **API server** (`artifacts/api-server`) is deployed to Google Cloud.
The mobile app (Tashi) is distributed via Expo / app stores.

---

## Google App Engine — Step-by-Step

### 1. Install the gcloud CLI

Download and install from: https://cloud.google.com/sdk/docs/install

Then authenticate:
```bash
gcloud auth login
```

### 2. Create a Google Cloud project (if you haven't already)

Go to https://console.cloud.google.com and create a new project, or use an existing one.

Then set it as active:
```bash
gcloud config set project YOUR_PROJECT_ID
```

### 3. Enable App Engine and create the app

```bash
gcloud services enable appengine.googleapis.com
gcloud app create --region=us-central1
```

> **Note:** App Engine region cannot be changed after creation. `us-central1` is recommended.

### 4. Deploy

From the project root, run:
```bash
bash scripts/deploy-app-engine.sh
```

That script will automatically:
- Install dependencies
- Build the API server
- Package it with only production `node_modules`
- Deploy to App Engine

When prompted, confirm the deployment by typing `Y`.

### 5. Set your secrets

After deployment, go to:
**Cloud Console → App Engine → Versions → select your version → Edit**

Add these environment variables:

| Variable | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The full Firebase service account JSON string |
| `JWT_SECRET` | A long random secret string |
| `SUPER_ADMIN_PHONE` | (optional) defaults to `03055198651` |
| `SUPER_ADMIN_PASSWORD` | (optional) **change this in production!** |

Then redeploy (re-run the script) so the new env vars take effect. Alternatively, set them in `app.yaml` before deploying (not recommended for secrets).

### 6. Open your app

```bash
gcloud app browse
```

Or find the URL in Cloud Console — it will be:
`https://YOUR_PROJECT_ID.uc.r.appspot.com`

---

## Updating the mobile app's API URL

After deployment, update the Tashi mobile app to point to your App Engine URL.
Edit `artifacts/tashi`, and in your EAS `eas.json` production config:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_DOMAIN": "YOUR_PROJECT_ID.uc.r.appspot.com"
      }
    }
  }
}
```

---

## Redeploying after code changes

Just run the deploy script again:
```bash
bash scripts/deploy-app-engine.sh
```

App Engine keeps all previous versions and lets you roll back at any time via the Cloud Console.

---

## Alternative: Cloud Run (Docker-based)

If you prefer containers, a `Dockerfile` and `cloudbuild.yaml` are also included.
See the `scripts/deploy-cloud-run.sh` script and `cloudbuild.yaml` for details.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Auto-set | App Engine sets this to `8080` automatically |
| `NODE_ENV` | Yes | Set to `production` in `app.yaml` |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase Admin SDK service account JSON string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `SUPER_ADMIN_PHONE` | Optional | Defaults to `03055198651` |
| `SUPER_ADMIN_PASSWORD` | Optional | Defaults to `khan0112` — **change in production** |
