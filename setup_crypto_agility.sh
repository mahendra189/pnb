#!/bin/bash
# setup_crypto_agility.sh — Quick setup for crypto-agility gateway demo

set -e

PROJECT_DIR="/Users/mahendrakumar/Developer/pnb"
cd "$PROJECT_DIR"

echo "🔐 Crypto-Agility Gateway Setup"
echo "================================"
echo ""

# 1. Generate test certificates
echo "1️⃣  Generating test HTTPS certificates..."
mkdir -p /tmp/envoy-certs /tmp/test-https-certs

openssl req -x509 -newkey rsa:2048 \
  -keyout /tmp/envoy-certs/server.key \
  -out /tmp/envoy-certs/server.crt \
  -days 365 -nodes \
  -subj "/CN=envoy-crypto-gateway/O=QShieldX/C=US" \
  2>/dev/null

openssl req -x509 -newkey rsa:2048 \
  -keyout /tmp/test-https-certs/server.key \
  -out /tmp/test-https-certs/server.crt \
  -days 365 -nodes \
  -subj "/CN=test-https-server/O=QShieldX/C=US" \
  2>/dev/null

echo "   ✅ Certificates created"
echo ""

# 2. Start Docker services
echo "2️⃣  Starting Docker services..."
docker-compose up -d opa-policy-engine envoy-crypto-gateway test-https-server

# Wait for services
echo "   ⏳ Waiting for services (30s)..."
sleep 30

# Check service health
echo "   Checking service health:"
if curl -s http://localhost:8181/health >/dev/null 2>&1; then
  echo "   ✅ OPA Policy Engine"
else
  echo "   ❌ OPA Policy Engine (failed)"
fi

if curl -s http://localhost:9901/stats >/dev/null 2>&1; then
  echo "   ✅ Envoy Gateway"
else
  echo "   ❌ Envoy Gateway (failed)"
fi

if curl -sk https://localhost:8443/health >/dev/null 2>&1; then
  echo "   ✅ Test HTTPS Server"
else
  echo "   ❌ Test HTTPS Server (failed)"
fi

echo ""
echo "3️⃣  Running interactive demo..."
echo ""

# Run demo
python infra/demo_crypto_agility.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  • Open dashboard: http://localhost:80"
echo "  • View current policy: curl http://localhost:8000/api/v1/crypto-gateway/policies/active"
echo "  • Test TLS: curl -k https://localhost:9443/tls-info"
echo "  • Stop services: docker-compose down"
