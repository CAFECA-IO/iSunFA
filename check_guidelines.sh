#!/bin/bash
DIFF_FILES=$(git diff --name-only develop)

echo "--- Checking for 'any' ---"
git diff develop | grep -n "^+" | grep -v "^+++" | grep -E '\bany\b'

echo "--- Checking for relative imports (\.\./) ---"
git diff develop | grep -n "^+" | grep -v "^+++" | grep "from ['\"]\.\./"

echo "--- Checking for Zod schemas in route.ts ---"
git diff develop -- '*route.ts' | grep -n "^+" | grep -v "^+++" | grep "z.object"

echo "--- Checking for Number() or parseFloat() ---"
git diff develop | grep -n "^+" | grep -v "^+++" | grep -E '\b(Number|parseFloat)\('

echo "--- Checking for code.startsWith ---"
git diff develop | grep -n "^+" | grep -v "^+++" | grep "\.startsWith"

echo "--- Checking for non-standard annotations ---"
# Check comments starting with // but not // Info:, // ToDo:, // Deprecated:, or // eslint, // @ts
git diff develop | grep -n "^+" | grep -v "^+++" | grep "//" | grep -v -E "//\s*(Info|ToDo|Deprecated|eslint|@ts-|\s*tip:)"

