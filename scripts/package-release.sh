#!/usr/bin/env bash
# scripts/package-release.sh
# Cross-Platform Release Packaging Shell Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="$ROOT_DIR/aetheris-release.zip"

echo "====================================================="
echo "  AETHERIS OMNI-SPHERE — CROSS-PLATFORM RELEASE PACKAGER"
echo "====================================================="
echo ""

echo "[1/4] Packing tracked source tree via git archive..."
cd "$ROOT_DIR"
git archive --format=zip HEAD -o "$OUTPUT_FILE"
cp "$OUTPUT_FILE" "$ROOT_DIR/aetheris-clean.zip"

SIZE_KB=$(du -k "$OUTPUT_FILE" | cut -f1)
echo "[2/4] Generated release archive: $OUTPUT_FILE (${SIZE_KB} KB)"

echo ""
echo "[3/4] Running automated release security & hygiene verification..."
node "$SCRIPT_DIR/verify-release.js" "$OUTPUT_FILE"

echo ""
echo "[4/4] Release Package Verified 100% Clean!"
echo "To build on any platform:"
echo "  1. unzip aetheris-release.zip -d aetheris"
echo "  2. cd aetheris"
echo "  3. npm ci"
echo "  4. npm run typecheck"
echo "  5. npm test"
echo "  6. npm run audit:production"
echo "  7. npm run build"
echo ""
