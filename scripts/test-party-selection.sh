#!/bin/bash
#
# Party Selection Feature - Quick Test Script
#
# Usage:
#   ./scripts/test-party-selection.sh [command]
#
# Commands:
#   parties   - List active parties
#   mention   - Simulate a story mention webhook
#   message   - Simulate a message response
#   timeout   - Run timeout worker
#   status    - Check recent mentions
#   payload   - Print sample payloads
#   all       - Run all tests
#

# Configuration - UPDATE THESE VALUES
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-your-service-role-key}"
ORGANIZATION_ID="${TEST_ORGANIZATION_ID:-your-org-id}"
INSTAGRAM_BUSINESS_ACCOUNT_ID="your-instagram-business-account-id"
TEST_USER_ID="test-user-$(date +%s)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# Function to call edge functions
call_function() {
  local func_name=$1
  local body=$2

  curl -s -X POST "${SUPABASE_URL}/functions/v1/${func_name}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "${body}"
}

# Function to query Supabase
query_supabase() {
  local table=$1
  local query=$2

  curl -s "${SUPABASE_URL}/rest/v1/${table}?${query}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
}

# List active parties
cmd_parties() {
  log_section "Active Parties"
  query_supabase "fiestas" "organization_id=eq.${ORGANIZATION_ID}&status=eq.active&select=id,name,status" | jq .
}

# Simulate story mention
cmd_mention() {
  log_section "Simulating Story Mention Webhook"

  local timestamp=$(date +%s)000
  local payload=$(cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "${INSTAGRAM_BUSINESS_ACCOUNT_ID}",
    "time": ${timestamp},
    "messaging": [{
      "sender": {
        "id": "${TEST_USER_ID}",
        "username": "test_user"
      },
      "recipient": {
        "id": "${INSTAGRAM_BUSINESS_ACCOUNT_ID}"
      },
      "timestamp": $(date +%s),
      "referral": {
        "source": "SHORTLINK",
        "type": "STORY",
        "ref": "story_${timestamp}"
      }
    }]
  }]
}
EOF
)

  log_info "Sending payload:"
  echo "$payload" | jq .

  echo ""
  log_info "Response:"
  call_function "instagram-webhook" "$payload" | jq .
}

# Simulate message response
cmd_message() {
  log_section "Simulating Message Response"

  local timestamp=$(date +%s)000
  local message_text="${1:-1}"
  local payload=$(cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "${INSTAGRAM_BUSINESS_ACCOUNT_ID}",
    "time": ${timestamp},
    "messaging": [{
      "sender": {
        "id": "${TEST_USER_ID}",
        "username": "test_user"
      },
      "recipient": {
        "id": "${INSTAGRAM_BUSINESS_ACCOUNT_ID}"
      },
      "timestamp": $(date +%s),
      "mid": "mid_${timestamp}",
      "message": {
        "mid": "mid_${timestamp}",
        "text": "${message_text}"
      }
    }]
  }]
}
EOF
)

  log_info "Sending payload (message: '${message_text}'):"
  echo "$payload" | jq .

  echo ""
  log_info "Response:"
  call_function "instagram-webhook" "$payload" | jq .
}

# Run timeout worker
cmd_timeout() {
  log_section "Running Timeout Worker"
  call_function "party-selection-timeout-worker" '{"source":"test-script"}' | jq .
}

# Check recent mentions
cmd_status() {
  log_section "Recent Mentions Status"
  query_supabase "social_mentions" \
    "organization_id=eq.${ORGANIZATION_ID}&order=created_at.desc&limit=5&select=id,instagram_username,party_selection_status,matched_fiesta_id,created_at" \
    | jq .
}

# Print sample payloads
cmd_payload() {
  log_section "Sample Story Mention Payload"
  cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "time": $(date +%s)000,
    "messaging": [{
      "sender": {
        "id": "SENDER_USER_ID",
        "username": "sender_username"
      },
      "recipient": {
        "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
      },
      "timestamp": $(date +%s),
      "referral": {
        "source": "SHORTLINK",
        "type": "STORY",
        "ref": "STORY_ID"
      }
    }]
  }]
}
EOF

  log_section "Sample Message Response Payload"
  cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "time": $(date +%s)000,
    "messaging": [{
      "sender": {
        "id": "SENDER_USER_ID",
        "username": "sender_username"
      },
      "recipient": {
        "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
      },
      "timestamp": $(date +%s),
      "mid": "MESSAGE_ID",
      "message": {
        "mid": "MESSAGE_ID",
        "text": "1"
      }
    }]
  }]
}
EOF

  log_section "Sample Quick Reply Response Payload"
  cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "time": $(date +%s)000,
    "messaging": [{
      "sender": {
        "id": "SENDER_USER_ID",
        "username": "sender_username"
      },
      "recipient": {
        "id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
      },
      "timestamp": $(date +%s),
      "mid": "MESSAGE_ID",
      "message": {
        "mid": "MESSAGE_ID",
        "text": "Party Name",
        "quick_reply": {
          "payload": "party_1_PARTY_UUID"
        }
      }
    }]
  }]
}
EOF
}

# Run all tests
cmd_all() {
  log_section "Running All Tests"

  log_info "1. Checking active parties..."
  cmd_parties

  log_info "2. Simulating story mention..."
  cmd_mention

  log_info "3. Checking mention status..."
  sleep 1
  cmd_status

  log_info "4. Running timeout worker..."
  cmd_timeout

  log_success "All tests completed!"
}

# Show help
cmd_help() {
  echo "Party Selection Feature - Test Script"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  parties   - List active parties for the organization"
  echo "  mention   - Simulate a story mention webhook"
  echo "  message   - Simulate a message response (default: '1')"
  echo "  timeout   - Run the timeout worker"
  echo "  status    - Check recent mentions status"
  echo "  payload   - Print sample webhook payloads"
  echo "  all       - Run all tests"
  echo "  help      - Show this help"
  echo ""
  echo "Environment variables:"
  echo "  SUPABASE_URL              - Supabase URL (default: http://localhost:54321)"
  echo "  SUPABASE_SERVICE_ROLE_KEY - Service role key"
  echo "  TEST_ORGANIZATION_ID      - Organization ID to test with"
}

# Main
case "${1:-help}" in
  parties) cmd_parties ;;
  mention) cmd_mention ;;
  message) cmd_message "$2" ;;
  timeout) cmd_timeout ;;
  status) cmd_status ;;
  payload) cmd_payload ;;
  all) cmd_all ;;
  help|--help|-h) cmd_help ;;
  *)
    log_error "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
