#!/usr/bin/env bash
# Push to GitHub after creating an empty public repo at:
# https://github.com/new?name=nv-term-hacking&visibility=public
set -euo pipefail
cd "$(dirname "$0")/.."
git remote set-url origin git@github.com:doomL/nv-term-hacking.git
git push -u origin main
echo "https://github.com/doomL/nv-term-hacking"
