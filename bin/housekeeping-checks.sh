#!/bin/bash
set -e

echo "Running Housekeeping Checks..."
echo "=============================="

echo "Phase 1: Format & Lint (Skipped, n/a)"
echo "Phase 2: Tests"
.venv/bin/pytest adk_harness/

echo "Phase 3: Repository Health (Skipped, n/a)"

echo "=============================="
echo "Housekeeping completed successfully!"
