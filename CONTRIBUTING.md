# Contributing to Medium Zoom

Medium Zoom is a small, composable image zoom with no runtime dependencies.

## Development

Use the Node version in `.node-version` and Bun version in `.bun-version`.

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
bun run check
```

Run commands from the repository root:

- `bun run dev`: watch the library build.
- `bun run dev:example vanilla`: serve an example against the local library build.
- `bun run dev:website`: serve the website.
- `bun run stories`: build the library and serve the API stories at
  <http://127.0.0.1:9001/storybook/>.
- `bun run examples`: build and preview the website, stories, and examples at
  <http://127.0.0.1:4173>. Examples live under `/examples/<name>/`.

## Verification

`bun run check` checks formatting, lint, types, package contents, bundle sizes,
website/example builds, and browser behavior.

- `bun run format` / `bun run format:check`: format maintained files or check formatting.
- `bun run lint`: check source, tests, and tooling with Oxlint.
- `bun run typecheck`: check tooling and framework examples.
- `bun run test:package`: verify the npm tarball's exports, declarations, CSS, and ES5 syntax.
- `bun run test:examples`: copy each example outside the workspace, install with npm,
  check types, and build against the published package.
- `bun run test:size`: check the existing gzip budgets.
- `bun run test:browser`: exercise the packed library, website, examples, and stories
  in Chromium, Firefox, and WebKit. Package rendering is compared with the published package.

Before running individual package checks, run `bun run build`. Before browser
checks, run `bun run build:website && bun run test:examples`. Browser fixtures use port 4175.
To select browsers, append `--project=chromium --project=webkit`.

### Automated accessibility scans

The existing `test:browser` run includes axe scans of the built public website in
Chromium desktop and Pixel 7 emulation. The scans check the whole document before
opening a zoom and with default, dark-background, and keyboard-triggered zooms
open. They wait for the real opening transition and verify Escape dismissal.
Run only these scans with `bun run test:browser accessibility.spec.ts` after the
browser build prerequisites above; CI runs them once within `bun run check`.

Checks use WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA rule tags without exclusions or rule
suppressions. Each state attaches the complete axe result (including incomplete
checks needing manual review) to the Playwright report. Violations include affected
selectors, markup, and remediation links; violations also attach a screenshot. CI
uploads these reports and traces in the `browser-evidence` artifact.

Clean scans do not establish WCAG conformance. In v1, directly attached images are
not keyboard-activatable; the website's separate “Trigger zoom” button demonstrates
keyboard opening. The viewer has no dialog semantics, focus management, or explicit
accessible close control, and Escape dismissal alone does not resolve those gaps.
These existing interaction limitations require separate runtime design work. Review
keyboard and screen-reader behavior manually, along with contrast over gradients
and any other incomplete axe checks; the scans do not cover every option, template,
example, browser, or assistive technology.

## Compatibility

Preserve the documented browser support and package entry paths, including
CommonJS, AMD, and the `mediumZoom` browser global. The default entry injects CSS;
the pure entry does not. Both declaration paths must match `src/medium-zoom.d.ts`.

The build uses Babel and Terser to retain ES5 syntax after bundling with tsdown.
Keep the older-browser CSS fallbacks and existing bundle-size budgets.

## Releases

Use Conventional Commits. Release Please maintains the version and changelog in
a release PR against `main`. Merging that PR creates an unprefixed tag and GitHub
release, then verifies and publishes that commit to npm through trusted publishing.

If publication fails, fix the cause and rerun the failed publish job. Do not move
the tag or repeat a completed publication.
