#!/usr/bin/env bash
# Clone the repo into an empty folder, the way a reviewer would, and run every
# check on that copy: install, lint, tests, typecheck and build. The copy is
# deleted afterwards. Pass another repo URL to check a different copy.
set -euo pipefail

REPO="${1:-https://github.com/tenilmurat/tldraw-pattern-maker.git}"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

echo "Cloning $REPO"
git clone --quiet --depth 1 "$REPO" "$DIR"
cd "$DIR"
echo "Testing $(git log --oneline -1)"
npm ci --silent
npm run check
echo "Fresh clone OK"
