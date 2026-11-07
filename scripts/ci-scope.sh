#!/usr/bin/env bash
# Reads changed file paths from stdin and prints the narrowest CI scope covering them:
# format (files no build reads), website, or library (every check).
set -euo pipefail

scope=format
while IFS= read -r file; do
  case "$file" in
    # The package checks assert the homepage from the site URL.
    website/src/site-url.ts) echo library && exit ;;
    *.md | .claude/* | .codex/*) ;;
    # Specs named website* test the site's pages: see test:browser:website.
    website/* | tests/analytics/* | tests/browser/website* | \
    config/playwright.analytics.config.mts | config/vite.website.config.mts | config/wrangler.jsonc)
      scope=website ;;
    # Anything else, including bun.lock, can affect the library.
    *) echo library && exit ;;
  esac
done
echo "$scope"
