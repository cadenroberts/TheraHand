#!/usr/bin/env bash
set -euo pipefail

echo "=== TheraHand Demo Verification ==="
echo

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Error: node not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: docker not found"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "Error: curl not found"; exit 1; }
echo "✓ Prerequisites satisfied"
echo

# Check if .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Run: cp .env.example .env and configure variables"
  exit 1
fi
echo "✓ Environment file exists"
echo

# Check if docker compose is running
if ! docker compose ps | grep -q "thera-hand-backend"; then
  echo "Error: PostgreSQL container not running"
  echo "Run: docker compose up -d"
  exit 1
fi
echo "✓ Database container running"
echo

# Check if backend is responding
if ! curl -sf http://localhost:3010/v0/runner >/dev/null 2>&1; then
  echo "Error: Backend not responding on port 3010"
  echo "Run: npm run back"
  exit 1
fi
echo "✓ Backend server responding"
echo

# Test 1: Login with valid doctor credentials
echo "Test 1: Doctor authentication..."
DOCTOR_RESPONSE=$(curl -sf -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.harrison@therahand.com", "password": "doctor"}' || echo "FAIL")

if echo "$DOCTOR_RESPONSE" | grep -q "accessToken"; then
  DOCTOR_TOKEN=$(echo "$DOCTOR_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  DOCTOR_ID=$(echo "$DOCTOR_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✓ Doctor login successful (token acquired)"
else
  echo "✗ Doctor login failed"
  exit 1
fi
echo

# Test 2: Doctor accesses protected endpoint
echo "Test 2: Protected endpoint access..."
HOME_RESPONSE=$(curl -sf http://localhost:3010/v0/home \
  -H "Authorization: Bearer $DOCTOR_TOKEN" || echo "FAIL")

if [ "$HOME_RESPONSE" != "FAIL" ]; then
  echo "✓ Doctor accessed protected endpoint"
else
  echo "✗ Protected endpoint access failed"
  exit 1
fi
echo

# Test 3: Doctor views assigned patients
echo "Test 3: Doctor views assigned patients..."
PATIENTS_RESPONSE=$(curl -sf http://localhost:3010/v0/home/$DOCTOR_ID \
  -H "Authorization: Bearer $DOCTOR_TOKEN" || echo "FAIL")

if echo "$PATIENTS_RESPONSE" | grep -q "aliyaa@therahand.com"; then
  PATIENT_COUNT=$(echo "$PATIENTS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ Doctor sees assigned patients (count: $PATIENT_COUNT)"
else
  echo "✗ Doctor cannot view patients"
  exit 1
fi
echo

# Test 4: Patient authentication
echo "Test 4: Patient authentication..."
PATIENT_RESPONSE=$(curl -sf -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "aliyaa@therahand.com", "password": "patient"}' || echo "FAIL")

if echo "$PATIENT_RESPONSE" | grep -q "accessToken"; then
  PATIENT_TOKEN=$(echo "$PATIENT_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  PATIENT_ID=$(echo "$PATIENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✓ Patient login successful"
else
  echo "✗ Patient login failed"
  exit 1
fi
echo

# Test 5: Patient accesses own data
echo "Test 5: Patient accesses own data..."
PATIENT_HOME=$(curl -sf http://localhost:3010/v0/home \
  -H "Authorization: Bearer $PATIENT_TOKEN" || echo "FAIL")

if [ "$PATIENT_HOME" != "FAIL" ]; then
  echo "✓ Patient accessed own data"
else
  echo "✗ Patient cannot access own data"
  exit 1
fi
echo

# Test 6: Unauthorized access rejected
echo "Test 6: Unauthorized access rejection..."
UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/v0/home)

if [ "$UNAUTH_RESPONSE" = "401" ]; then
  echo "✓ Unauthorized request rejected (401)"
else
  echo "✗ Unauthorized request not properly rejected (got $UNAUTH_RESPONSE)"
  exit 1
fi
echo

# Test 7: Invalid credentials rejected
echo "Test 7: Invalid credentials rejection..."
INVALID_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.harrison@therahand.com", "password": "wrongpassword"}')

if [ "$INVALID_RESPONSE" = "401" ]; then
  echo "✓ Invalid credentials rejected (401)"
else
  echo "✗ Invalid credentials not properly rejected (got $INVALID_RESPONSE)"
  exit 1
fi
echo

# Test 8: Admin authentication
echo "Test 8: Admin authentication..."
ADMIN_RESPONSE=$(curl -sf -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "a@admin.com", "password": "admin"}' || echo "FAIL")

if echo "$ADMIN_RESPONSE" | grep -q "accessToken"; then
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  echo "✓ Admin login successful"
else
  echo "✗ Admin login failed"
  exit 1
fi
echo

# Test 9: Admin views all doctors
echo "Test 9: Admin views all doctors..."
DOCTORS_RESPONSE=$(curl -sf http://localhost:3010/v0/doctors \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "FAIL")

if echo "$DOCTORS_RESPONSE" | grep -q "dr.harrison@therahand.com"; then
  DOCTOR_COUNT=$(echo "$DOCTORS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ Admin sees all doctors (count: $DOCTOR_COUNT)"
else
  echo "✗ Admin cannot view doctors"
  exit 1
fi
echo

# Summary
echo "==================================="
echo "All tests passed!"
echo "==================================="
echo
echo "SMOKE_OK"
