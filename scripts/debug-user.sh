#!/bin/bash

API_URL="http://localhost:3001/api"
DB_PATH="backend/data/joga.db"

echo "=== User Debugging ==="
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo "❌ Database not found at: $DB_PATH"
  echo "   Make sure the backend has been started at least once."
  exit 1
fi

echo "1. Checking users in database..."
echo ""
sqlite3 "$DB_PATH" <<EOF
.mode column
.headers on
SELECT id, email, name, role, email_verified, is_active FROM users;
EOF

echo ""
echo "2. Testing login endpoint directly..."
echo ""
echo "Attempting login with admin@test.com..."
RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check for specific error messages
if echo "$RESPONSE" | grep -q "Invalid email or password"; then
  echo "❌ Login failed: Invalid email or password"
  echo ""
  echo "Possible issues:"
  echo "  1. Email doesn't exist in database"
  echo "  2. Password is incorrect"
  echo "  3. Email is not verified (check email_verified column)"
  echo "  4. User is not active (check is_active column)"
  echo ""
  echo "To check a specific user's details:"
  echo "  sqlite3 $DB_PATH \"SELECT * FROM users WHERE email='admin@test.com';\""
  echo ""
  echo "To reset password (if you know the user ID):"
  echo "  # First, hash a new password using Node.js:"
  echo "  node -e \"const bcrypt=require('bcryptjs');bcrypt.hash('newpassword123',12).then(h=>console.log(h));\""
  echo "  # Then update in database:"
  echo "  sqlite3 $DB_PATH \"UPDATE users SET password_hash='HASH_HERE' WHERE email='admin@test.com';\""
elif echo "$RESPONSE" | grep -q "Email not verified"; then
  echo "❌ Login failed: Email not verified"
  echo ""
  echo "To verify the email:"
  echo "  sqlite3 $DB_PATH \"UPDATE users SET email_verified=1 WHERE email='admin@test.com';\""
elif echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Login successful!"
  SESSION_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "Session ID: $SESSION_ID"
else
  echo "❓ Unexpected response. Check the response above."
fi

echo ""
echo "3. Checking if setup is required..."
SETUP_RESPONSE=$(curl -s $API_URL/auth/setup-required)
echo "$SETUP_RESPONSE"
echo ""

echo "=== Quick Fixes ==="
echo ""
echo "Option 1: Create a new admin user (if no users exist)"
echo "  curl -X POST $API_URL/auth/setup \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@test.com\",\"password\":\"test1234\",\"name\":\"Admin\"}'"
echo ""
echo "Option 2: Make existing user an admin"
echo "  sqlite3 $DB_PATH \"UPDATE users SET role='admin' WHERE email='your@email.com';\""
echo ""
echo "Option 3: Verify email for existing user"
echo "  sqlite3 $DB_PATH \"UPDATE users SET email_verified=1 WHERE email='admin@test.com';\""
echo ""
echo "Option 4: Reset password (requires Node.js)"
echo "  # Generate hash:"
echo "  cd backend && node -e \"require('bcryptjs').hash('newpassword123', 12).then(h => console.log(h))\""
echo "  # Then update:"
echo "  sqlite3 $DB_PATH \"UPDATE users SET password_hash='PASTE_HASH_HERE' WHERE email='admin@test.com';\""
echo ""
