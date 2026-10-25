#!/usr/bin/env bash
set -euo pipefail

[[ "$PR_NUMBER" =~ ^[0-9]+$ ]] || exit 0
[[ "$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID" --jq '.path')" == '.github/workflows/preview.yml' ]] || exit 0
gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" > "$RUNNER_TEMP/preview-pr.json"
if jq -e --arg sha "$PR_SHA" --arg repo "$GITHUB_REPOSITORY" '
  .state == "open" and .head.sha == $sha and .head.repo.full_name == $repo and
  any(.labels[]; .name == "preview")
' "$RUNNER_TEMP/preview-pr.json" > /dev/null; then
  echo 'deploy=true' >> "$GITHUB_OUTPUT"
fi
