#!/bin/bash

API_URL="http://localhost:3001/api"
SESSION_ID=""
ADMIN_SESSION_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Phase 2 API Testing ==="
echo ""

# Step 1: Check if setup is required
echo "1. Checking if setup is required..."
SETUP_REQUIRED=$(curl -s $API_URL/auth/setup-required | grep -o '"setupRequired":[^,}]*' | cut -d':' -f2)
if [ "$SETUP_REQUIRED" = "true" ]; then
  echo -e "${YELLOW}No users exist. Creating initial admin...${NC}"
  RESPONSE=$(curl -s -X POST $API_URL/auth/setup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password123","name":"Admin User"}')
  ADMIN_SESSION_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Admin created. Session ID: $ADMIN_SESSION_ID${NC}"
else
  echo -e "${GREEN}✓ Users exist${NC}"
  
  # Try to login as admin
  echo ""
  echo "2. Logging in as admin..."
  RESPONSE=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password123"}')
  
  # Check if login was successful
  if echo "$RESPONSE" | grep -q '"id"'; then
    ADMIN_SESSION_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    USER_ROLE=$(echo "$RESPONSE" | grep -o '"role":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Login successful. Session ID: $ADMIN_SESSION_ID${NC}"
    echo -e "  User role: $USER_ROLE"
    
    if [ "$USER_ROLE" != "admin" ]; then
      echo -e "${YELLOW}⚠ Warning: User is not an admin. Some endpoints will fail.${NC}"
      echo ""
      echo "To make this user an admin, run:"
      echo "  sqlite3 backend/data/joga.db \"UPDATE users SET role='admin' WHERE email='test@test.com';\""
      echo ""
    fi
  else
    echo -e "${RED}✗ Admin login failed${NC}"
    echo ""
    echo "Options to create admin:"
    echo "  1. Update existing user via SQLite:"
    echo "     sqlite3 backend/data/joga.db \"UPDATE users SET role='admin' WHERE email='your@email.com';\""
    echo ""
    echo "  2. Or login with a different account that is admin"
    exit 1
  fi
fi

SESSION_ID=$ADMIN_SESSION_ID
echo ""

# Test Authentication endpoints (no admin required)
echo "3. Testing Authentication endpoints..."
echo "   GET /api/auth/me..."
RESPONSE=$(curl -s $API_URL/auth/me -H "X-Session-ID: $SESSION_ID")
if echo "$RESPONSE" | grep -q '"id"'; then
  echo -e "   ${GREEN}✓ Success${NC}"
else
  echo -e "   ${RED}✗ Failed: $RESPONSE${NC}"
fi
echo ""

# Test Preferences (no admin required)
echo "4. Testing Preferences endpoints..."
echo "   GET /api/preferences..."
RESPONSE=$(curl -s $API_URL/preferences -H "X-Session-ID: $SESSION_ID")
if echo "$RESPONSE" | grep -q '{'; then
  echo -e "   ${GREEN}✓ Success${NC}"
else
  echo -e "   ${RED}✗ Failed: $RESPONSE${NC}"
fi
echo ""

# Test Matches (no admin required, but needs auth)
echo "5. Testing Matches endpoints..."
echo "   GET /api/matches..."
RESPONSE=$(curl -s $API_URL/matches -H "X-Session-ID: $SESSION_ID")
if echo "$RESPONSE" | grep -q '\['; then
  echo -e "   ${GREEN}✓ Success (returns array)${NC}"
else
  echo -e "   ${RED}✗ Failed: $RESPONSE${NC}"
fi
echo ""

# Test Admin-only endpoints
echo "6. Testing Admin-only endpoints..."
echo "   GET /api/users..."
RESPONSE=$(curl -s -w "\n%{http_code}" $API_URL/users -H "X-Session-ID: $SESSION_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "   ${GREEN}✓ Success${NC}"
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "   ${YELLOW}⚠ Admin access required (expected if not admin)${NC}"
else
  echo -e "   ${RED}✗ Failed (HTTP $HTTP_CODE): $BODY${NC}"
fi
echo ""

echo "   GET /api/teams..."
RESPONSE=$(curl -s -w "\n%{http_code}" $API_URL/teams -H "X-Session-ID: $SESSION_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "   ${GREEN}✓ Success${NC}"
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "   ${YELLOW}⚠ Admin access required (expected if not admin)${NC}"
else
  echo -e "   ${RED}✗ Failed (HTTP $HTTP_CODE): $BODY${NC}"
fi
echo ""

echo "=== Test Summary ==="
echo "Session ID: $SESSION_ID"
echo ""
echo "To test individual endpoints, use:"
echo "  curl http://localhost:3001/api/ENDPOINT -H 'X-Session-ID: $SESSION_ID'"
echo ""
echo "To make a user an admin, run:"
echo "  sqlite3 backend/data/joga.db \"UPDATE users SET role='admin' WHERE email='your@email.com';\""
echo ""
