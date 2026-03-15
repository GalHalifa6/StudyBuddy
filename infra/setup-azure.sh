#!/usr/bin/env bash
# =============================================================================
# StudyBuddy — One-time Azure Infrastructure Setup
# =============================================================================
# Run this ONCE to provision all Azure resources.
# Prerequisites:
#   1. Azure CLI installed  (az --version)
#   2. Logged in            (az login)
#   3. Docker installed     (docker --version)
#
# Usage:
#   chmod +x infra/setup-azure.sh
#   ./infra/setup-azure.sh
#
# After this script completes it prints all the GitHub Secrets you need to set.
# =============================================================================

set -e  # Exit on any error

# ─── CONFIGURATION ───────────────────────────────────────────────────────────
# Change these to match your preferences
RESOURCE_GROUP="studybuddy-rg"
LOCATION="eastus"                        # az account list-locations -o table
ACR_NAME="studybuddyacr"                 # Must be globally unique, 5-50 lowercase alphanumeric
ENVIRONMENT_NAME="studybuddy-env"
BACKEND_APP="studybuddy-backend"
FRONTEND_APP="studybuddy-frontend"
DB_SERVER_NAME="studybuddy-db-server"    # Must be globally unique
DB_NAME="studybuddy"
DB_USER="studybuddy"
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"  # Auto-generated

# Pull JWT secret from your .env if it exists, otherwise generate one
if [ -f "../.env" ]; then
  JWT_SECRET=$(grep '^JWT_SECRET=' ../.env | cut -d'=' -f2)
fi
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

# ─── STEP 1: Resource Group ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1/7 — Resource Group"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output table
echo "✅ Resource group: $RESOURCE_GROUP"

# ─── STEP 2: Azure Container Registry ────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2/7 — Container Registry (ACR)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output table

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)
echo "✅ ACR: $ACR_LOGIN_SERVER"

# ─── STEP 3: PostgreSQL Flexible Server ──────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3/7 — PostgreSQL Database (~2 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$DB_USER" \
  --admin-password "$DB_PASSWORD" \
  --sku-name "Standard_B1ms" \
  --tier "Burstable" \
  --storage-size 32 \
  --version 15 \
  --public-access "0.0.0.0" \
  --output table

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER_NAME" \
  --database-name "$DB_NAME" \
  --output table

# Allow all Azure services to reach the DB
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --rule-name "AllowAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0" \
  --output table

DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"
DB_URL="jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}?sslmode=require"
echo "✅ PostgreSQL: $DB_HOST"

# ─── STEP 4: Container Apps Environment ──────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4/7 — Container Apps Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
az containerapp env create \
  --name "$ENVIRONMENT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output table
echo "✅ Container Apps environment: $ENVIRONMENT_NAME"

# ─── STEP 5: Backend Container App ───────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5/7 — Backend Container App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use a placeholder image first; deploy.yml will push the real one
az containerapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "SPRING_PROFILES_ACTIVE=prod" \
    "SERVER_PORT=8080" \
    "SPRING_DATASOURCE_URL=${DB_URL}" \
    "SPRING_DATASOURCE_USERNAME=${DB_USER}" \
    "SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}" \
    "SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver" \
    "SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect" \
    "SPRING_JPA_HIBERNATE_DDL_AUTO=update" \
    "JWT_SECRET=${JWT_SECRET}" \
    "JWT_EXPIRATION=86400000" \
    "FILE_UPLOAD_DIR=/app/uploads" \
    "LOGGING_LEVEL_COM_STUDYBUDDY=INFO" \
  --output table

BACKEND_URL=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)
BACKEND_URL="https://${BACKEND_URL}"
echo "✅ Backend: $BACKEND_URL"

# ─── STEP 6: Frontend Container App ──────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 6/7 — Frontend Container App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
az containerapp create \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --output table

FRONTEND_URL=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)
FRONTEND_URL="https://${FRONTEND_URL}"
echo "✅ Frontend: $FRONTEND_URL"

# Update backend's FRONTEND_URL env var now that we know it
az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars "FRONTEND_URL=${FRONTEND_URL}" \
  --output none

# ─── STEP 7: Service Principal for GitHub Actions ────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 7/7 — Service Principal (GitHub Actions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

AZURE_CREDENTIALS=$(az ad sp create-for-rbac \
  --name "studybuddy-github-actions" \
  --role contributor \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}" \
  --sdk-auth \
  --output json)

echo "✅ Service principal created"

# ─── OUTPUT: GitHub Secrets ───────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  DONE! Set these secrets in your GitHub repo:"
echo "  Repository → Settings → Secrets → Actions → New secret"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Secret Name              Value"
echo "─────────────────────────────────────────────────────────────────"
echo "AZURE_CREDENTIALS        (paste the JSON block below)"
echo ""
echo "$AZURE_CREDENTIALS"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "ACR_LOGIN_SERVER         $ACR_LOGIN_SERVER"
echo "ACR_USERNAME             $ACR_USERNAME"
echo "ACR_PASSWORD             $ACR_PASSWORD"
echo "AZURE_RESOURCE_GROUP     $RESOURCE_GROUP"
echo "CONTAINER_APP_BACKEND    $BACKEND_APP"
echo "CONTAINER_APP_FRONTEND   $FRONTEND_APP"
echo "VITE_API_BASE_URL        $BACKEND_URL"
echo "VITE_WS_BASE_URL         ${BACKEND_URL/https:/ws:}"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Your live URLs (available after first deploy):"
echo "  Frontend:  $FRONTEND_URL"
echo "  Backend:   $BACKEND_URL"
echo ""
echo "Optional secrets (add later to enable those features):"
echo "  SENDGRID_API_KEY        your-sendgrid-key"
echo "  GOOGLE_CLIENT_ID        your-google-client-id"
echo "  GOOGLE_CLIENT_SECRET    your-google-client-secret"
echo "  JITSI_KID               vpaas-magic-cookie-xxx/yyy"
echo "  JITSI_PRIVATE_KEY       -----BEGIN PRIVATE KEY-----..."
echo "════════════════════════════════════════════════════════════════"
