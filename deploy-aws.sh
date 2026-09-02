#!/usr/bin/env bash
# ==============================================================================
# Video Intelligence Platform - AWS Production Deployment Script
# Supports: Amazon Linux 2023, Ubuntu 22.04/24.04, Debian 12
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}🚀 Video Intelligence Platform - AWS Production Deploy${NC}"
echo -e "${GREEN}======================================================${NC}"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[Error] Docker is not installed!${NC}"
    echo "Please install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 2. Check Docker Compose (v2 plugin or standalone)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[Error] Neither 'docker compose' nor 'docker-compose' found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Detected Compose command:${NC} $COMPOSE_CMD"

# 3. Environment Configuration Check
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}[Warning] backend/.env not found! Creating from backend/.env.example...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ Copied backend/.env.example to backend/.env${NC}"
    else
        touch backend/.env
        echo "PORT=8000" >> backend/.env
        echo "DATABASE_PATH=db/video_intelligence.db" >> backend/.env
        echo "JWT_SECRET_KEY=vip_production_super_secret_jwt_key_$(date +%s)" >> backend/.env
        echo -e "${GREEN}✓ Created starter backend/.env${NC}"
    fi
fi

# 4. Building and Launching Containers
echo -e "\n${YELLOW}📦 Building and launching production containers in background...${NC}"
$COMPOSE_CMD down --remove-orphans || true
$COMPOSE_CMD up -d --build

# 5. Waiting for Services to become Healthy
echo -e "\n${YELLOW}⏳ Waiting for health checks to pass (backend & frontend)...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    BACKEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' vip-backend 2>/dev/null || echo "starting")
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' vip-frontend 2>/dev/null || echo "starting")
    
    echo -n "."
    
    if [ "$BACKEND_STATUS" = "healthy" ] && [ "$FRONTEND_STATUS" = "healthy" ]; then
        echo -e "\n${GREEN}✓ All services are healthy and running!${NC}"
        break
    fi
    
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${YELLOW}[Note] Timed out waiting for status, checking current container states:${NC}"
    $COMPOSE_CMD ps
fi

# 6. Summary & Info
PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 2 https://api.ipify.org 2>/dev/null || echo "your-server-ip")

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 Deployment Successfully Completed!${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Web App URL      : ${GREEN}http://${PUBLIC_IP}${NC}"
echo -e "Backend API / Docs: ${GREEN}http://${PUBLIC_IP}/api${NC}"
echo -e "Health Check URL : ${GREEN}http://${PUBLIC_IP}/health${NC}"
echo -e "------------------------------------------------------"
echo -e "Helpful Operations Commands:"
echo -e "  View live logs   : ${YELLOW}$COMPOSE_CMD logs -f${NC}"
echo -e "  Backend logs only: ${YELLOW}$COMPOSE_CMD logs -f backend${NC}"
echo -e "  Stop stack       : ${YELLOW}$COMPOSE_CMD down${NC}"
echo -e "  Restart stack    : ${YELLOW}$COMPOSE_CMD restart${NC}"
echo -e "======================================================\n"
