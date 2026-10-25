#!/usr/bin/env bash
set -euo pipefail

test -n "$CLOUDFLARE_API_TOKEN" || { echo 'Missing preview environment secret CLOUDFLARE_PREVIEW_API_TOKEN' >&2; exit 1; }
# Recheck after downloading: a new commit, removed label, or closed PR cancels eligibility.
gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" > "$RUNNER_TEMP/preview-pr.json"
jq -e --arg sha "$PR_SHA" --arg repo "$GITHUB_REPOSITORY" '
  .state == "open" and .head.sha == $sha and .head.repo.full_name == $repo and
  any(.labels[]; .name == "preview")
' "$RUNNER_TEMP/preview-pr.json" > /dev/null || exit 0
# Keep trusted config outside the artifact. PR files are served only as static assets.
mkdir -p "$RUNNER_TEMP/preview-tools"
jq -n --arg directory "$RUNNER_TEMP/preview-assets" '{
  name: "medium-zoom-preview",
  compatibility_date: "2026-10-25",
  workers_dev: true,
  preview_urls: true,
  assets: {directory: $directory, not_found_handling: "404-page"}
}' > "$RUNNER_TEMP/preview-tools/wrangler.json"
cd "$RUNNER_TEMP/preview-tools"
node "$GITHUB_WORKSPACE/trusted/node_modules/wrangler/bin/wrangler.js" versions upload --config wrangler.json --preview-alias "pr-$PR_NUMBER"
printf '### Preview\n\n[Open preview](https://pr-%s-medium-zoom-preview.fran-ois-b41.workers.dev)\n\nCommit: %s\n' "$PR_NUMBER" "$PR_SHA" >> "$GITHUB_STEP_SUMMARY"
