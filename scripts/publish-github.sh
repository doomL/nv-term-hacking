#!/usr/bin/env bash
# Publish NV Terminal Hacking to a public GitHub repository.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH="${GH:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  echo "GitHub CLI (gh) not found. Install from https://cli.github.com/"
  exit 1
fi

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Sign in to GitHub (device code or browser):"
  "$GH" auth login --hostname github.com --git-protocol ssh --skip-ssh-key
fi

REPO_NAME="${1:-nv-term-hacking}"

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already configured."
else
  "$GH" repo create "$REPO_NAME" \
    --public \
    --description "Fallout: New Vegas-style terminal hacking — CRT UI, PWA, 1v1, EN/IT" \
    --source=. \
    --remote=origin
fi

git push -u origin main

echo ""
echo "Done: https://github.com/$("$GH" api user -q .login)/$REPO_NAME"
