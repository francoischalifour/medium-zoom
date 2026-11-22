# Contributing to Medium Zoom

## Principles

- **v1 never changes by accident.** The published package keeps its files, entries, and [browser support](https://medium-zoom.francoischalifour.com/docs/javascript/#browser-support). A change meant for v1 says so in its pull request.
- **The modern library stays private until its API is ready.** Candidate entries and the `modern` preset stay out of the release manifest and the user documentation.
- **Every change reports its cost.** Size and runtime are measured against recorded baselines. Raising a budget is a decision, not a fix.
- **Tests wait on behavior, not time.** Pause the page clock with `page.clock` instead of waiting a fixed time.

## Set up

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
```

Use the versions in `.node-version` and `.bun-version`. Run every command from the repository root.

## Develop

- `bun run dev`: watch the library build.
- `bun run dev:gallery`: serve the gallery playground on the candidate entries.
- `bun run dev:example <name>`: serve a Vite example against the local build.
- `bun run dev:website`: serve the website against the library source.
- `bun run stories`: serve the API stories.
- `bun run examples`: preview the built website, stories, and every example.

## Check

```sh
bun run check
```

It runs every step CI runs, in parallel where it can. `scripts/check.ts` lists the steps. Name some to run only those and the steps they need, as in `bun run check lint typecheck`, or add `--changed` to run what your branch's changes can affect.

To pass arguments, run a step's own command:

- `bun run format`: format files.
- `bun run test:browser <file> --project=<browser>`: run some browser suites.
- `bun run test:stress`: run long random gallery sequences; replay one with its seed.

Browser suites need `bun run build:website && bun run test:examples` first.

## Measure

| Command                 | Compares with                                      |
| ----------------------- | -------------------------------------------------- |
| `bun run size`          | `baselines/size.json` and `config/size.config.mts` |
| `bun run bench`         | `baselines/bench.json`                             |
| `bun run check:release` | `baselines/release.json`                           |

Add `--update` to record an intended change. Add `--markdown` to `size` or `bench` for tables to paste in a pull request, and `--diff origin/main` to `check:release` to see what changed in the released files.

## Document

User guides and API references live in `website/src/docs/`, and the root README covers installation and a first image. Change the public API, its page, and its examples together. To add a page, follow [Add a page](website/README.md#add-a-page).

## Submit

Use Conventional Commits and follow `.github/pull_request_template.md`. Include the change's cost, and name any check you could not run.

## Release

Release Please opens a release pull request against `main`. Merging it tags the commit, creates the GitHub release, and publishes to npm through trusted publishing. A follow-up pull request updates the examples to the new version. If publication fails, fix the cause and rerun the failed job without moving the tag.
