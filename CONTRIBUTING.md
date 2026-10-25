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
- `bun run test:package`: verify the npm tarball's package metadata, consumer compatibility,
  declarations, CSS, and ES5 syntax.
- `bun run test:examples`: copy each example outside the workspace, install with npm,
  check types, and build against the published package.
- `bun run test:size`: check the existing gzip budgets.
- `bun run test:browser`: exercise the packed library, website, examples, and stories
  in Chromium, Firefox, and WebKit. Package rendering is compared with the published package.

Before running individual package checks, run `bun run build`. Before browser
checks, run `bun run build:website && bun run test:examples`. Browser fixtures use port 4175.
To select browsers, append `--project=chromium --project=webkit`.

## Compatibility

Preserve the documented browser support and package entry paths, including
CommonJS, AMD, and the `mediumZoom` browser global. The default entry injects CSS;
the pure entry does not. Both declaration paths must match `src/medium-zoom.d.ts`.

The build uses Babel and Terser to retain ES5 syntax after bundling with tsdown.
Keep the older-browser CSS fallbacks and existing bundle-size budgets.

### Packed-package consumers

`bun run test:package` runs publint and Are the Types Wrong against the same npm
tarball used by the existing artifact checks. Isolated TypeScript fixtures in
`tests/types/` cover bundler resolution with the current TypeScript and Node10
resolution with TypeScript 5.9 (without synthetic-default interop), plus CommonJS interop and
Node16/NodeNext ESM resolution without workspace aliases or `skipLibCheck`.
Vite resolution must select the ESM `module` entry and both pure paths. Node also
loads the packed root and UMD dist paths through `require` and `import`.
These checks run through `check:library`, including CI and release verification.

The analyzers report known v1 limitations, checked by exact finding, path, and
resolution mode in `scripts/check-package-analyzers.ts`. Any new finding fails:

- publint reports ESM syntax in `dist/medium-zoom.esm.js` and `dist/pure/index.js`
  without an ESM package boundary. ATTW also reports unexpected module syntax for
  the pure entry under Node16 resolution. These existing paths are bundler entries;
  native Node ESM does not support the `dist/pure` directory shorthand.
- ATTW reports an incorrect default export at the root. The UMD is callable from
  native Node `require` and `import`, but the default-export declaration makes
  direct callable require and native Node ESM TypeScript consumers fail. The
  fixtures explicitly retain those type errors and verify emitted CommonJS
  default-import interop separately. Replacing the declaration with `export =`
  would break existing default imports without synthetic-default interop and
  misdescribe the shared pure ESM declaration.

Preserve the callable UMD `main`, existing `module` path, handwritten declarations,
and unrestricted dist imports. Do not add an exports map or rename entries just
to silence the analyzers. UMD dist variants have runtime checks; they do not each
promise an adjacent declaration.

## Releases

Use Conventional Commits. Release Please maintains the version and changelog in
a release PR against `main`. Merging that PR creates an unprefixed tag and GitHub
release, then verifies and publishes that commit to npm through trusted publishing.

If publication fails, fix the cause and rerun the failed publish job. Do not move
the tag or repeat a completed publication.
