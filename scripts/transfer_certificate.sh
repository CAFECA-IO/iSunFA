#!/bin/bash

# Source the .env file to load environment variables
export NEXTAUTH_URL=$(grep -E '^NEXTAUTH_URL\s*=' ../.env | sed 's/.*=\s*//')

# Define the endpoint
endpoint=${NEXTAUTH_URL}

# Query the first API
response=$(curl -s -X GET "${endpoint}api/v2/cron_job?job=listCertificateWithoutInvoice")

# Extract the payload from the response
payload=$(echo "${response}" | jq '.payload')

echo "The payload is: ${payload}"

if [[ $payload =~ ^\[[0-9,[:space:]]*\]$ && $payload != "[]" ]]; then
echo "Valid payload received: ${payload}"
curl -s -X POST "${endpoint}api/v2/ask_ai?reason=certificate" -H "Content-Type: application/json" -d "{\"targetIdList\": ${payload}}"
else
    echo "The query returned an empty array or did not return an array of numbers."
fi
