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

It runs everything CI runs. To check one thing, run `bun run build` first, then:

| Command          | Checks                                                       |
| ---------------- | ------------------------------------------------------------ |
| `format:check`   | Formatting; `format` fixes it                                |
| `lint`           | Source, tests, and tooling                                   |
| `typecheck`      | Tooling, documentation snippets, and examples                |
| `check:isolated` | Format and lint agree outside this checkout                  |
| `test:package`   | Both packages' entries, declarations, CSS, and legacy syntax |
| `test:examples`  | Each example builds against the published package            |
| `test:browser`   | Chromium, Firefox, and WebKit; filter with `--project`       |
| `test:stress`    | Long random gallery sequences; replay one with its seed      |

Browser checks need `bun run build:website && bun run test:examples` first.

## Measure

| Command                 | Compares with                                            | Record a change                  |
| ----------------------- | -------------------------------------------------------- | -------------------------------- |
| `bun run size`          | `config/size-baseline.json` and `config/size.config.mts` | `bun run size:baseline`          |
| `bun run bench`         | `config/bench-baseline.json`                             | `bun run bench:baseline`         |
| `bun run check:release` | `config/release-digests.json`                            | `bun run check:release --update` |

Add `--markdown` to `size` or `bench` for tables to paste in a pull request. `bun run check:release --diff origin/main` shows what changed in the released files.

## Document

User guides and API references live in `website/src/docs/`, and the root README covers installation and a first image. Change the public API, its page, and its examples together. To add a page, follow [Add a page](website/README.md#add-a-page).

## Submit

Use Conventional Commits and follow `.github/pull_request_template.md`. Include the change's cost, and name any check you could not run.

## Release

Release Please opens a release pull request against `main`. Merging it tags the commit, creates the GitHub release, and publishes to npm through trusted publishing. A follow-up pull request updates the examples to the new version. If publication fails, fix the cause and rerun the failed job without moving the tag.
