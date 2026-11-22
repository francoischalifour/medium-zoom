# Maintainer triage: open issues and pull requests

Snapshot: **November 22, 2026 (Europe/Paris)**. Audited main: [`9edda3b`](https://github.com/francoischalifour/medium-zoom/commit/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547); local HEAD equaled fetched origin/main at the start. **Final audit inventory: 35 issues + 8 PRs = 43 open items**, plus one merged-during-audit record. PR #309 appeared and then merged at 18:45:25 Europe/Paris (17:45:25 UTC); audit-final origin/main was [`9e46bf6`](https://github.com/francoischalifour/medium-zoom/commit/9e46bf6bc3ea1f52421677b09768d5e4ecf55c4b). The preview work was subsequently ported onto merged PR #310 at `310bda1`, preserving its independent engines, optimized v1 artifacts and tighter stable budgets. Per-item evidence remains pinned to the original audit commit; the 44-record inventory is not a refreshed GitHub inventory. This is a point-in-time decision aid, not an automatic closure script.

Machine-readable companion: [maintainer-triage.json](./maintainer-triage.json). All 44 tracked items have a stable number, disposition, closure gate, confidence, evidence, remaining check and a tailored reply.

## Start here

- **Already released; closure candidates:** #196 (1.1.2), #177 (1.0.7), #171 (1.0.8), PR #226 (superseded by 1.1.2 implementation; explicit edge-case regression on main). Review their caveats and replies; no need to wait for 1.2.0.
- **Preview testing, not closure:** plan deliberate `2.0.0-next.N` milestones for #210, #188, #60 and PR #213. No preview has been published. Invite testing only after verified publication; closure still needs supported stable APIs/CSS/docs and original-case verification. #224 and #145 also need requirement confirmation.
- **Decide scope, not “fixed”:** #152 / PR #153 (class option), #74 (max width), #150 (complete theme), PR #225 (Used by badge), PR #214 (video recipe rather than video targets).
- **Keep useful contributions:** PR #212 and #211 still need a verified Divi docs port. #190 / PR #191 still need a general SVG sizing/detection decision.
- **Keep normal workflow:** PR #247 is the active release PR. PR #309 merged during this audit; no closure action remains, and its website deployment is independent of npm.
- **Do not mass-close positioning, cropping, retina or Safari reports:** related implementation/tests are not proof the original bugs are fixed.

## Release boundaries — read before replying

1. npm `latest` is **1.1.2**, published October 25, 2026. npm `next` is **1.0.0-next.0**, not the current candidate engine. Do not recommend `medium-zoom@next` for these new features. Registry was read directly during the audit and reverified on November 22, 2026; the historical next version was published August 27, 2018. This setup publishes nothing.
2. [PR #247](https://github.com/francoischalifour/medium-zoom/pull/247) proposes **1.2.0**; it is not yet published. Its generated changelog mentions gallery/core work, but a commit appearing in a changelog does not expose its API.
3. [package configuration](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts) explicitly keeps `core`, `renderers`, `gallery`, `content`, `loaders`, `viewport`, `triggers`, `transitions` and alternate profile subpaths private. [package.json](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/package.json) ships only the compatibility preset / existing pure distribution and CSS. These are candidate subpaths in **one package**, not evidence of planned separate npm packages. The planned public milestone format is `2.0.0-next.N` on `next`, with no version yet selected or published and no release date committed. `latest` stays v1.
4. [CONTRIBUTING.md](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CONTRIBUTING.md) requires protecting v1; this setup documents a separate explicit approval path for v2 previews without changing the stable manifest. v1 still has no native video targets, gallery navigation, automatic modal renderer, async template option, class option or browser-history adapter.
5. Documentation/event recipes can ship independently of npm. Verify the relevant live page/example before saying it is available; this audit inspected repository docs, not deployment availability.

## Preview plan — setup only

See [the manual preview runbook](./preview-release.md) for local tarball verification, browser/API expectations, protected environment and npm trusted-publishing prerequisites. The dispatch-only workflow accepts validated increasing `2.0.0-next.N` versions and explicit confirmation; it packs candidate exports in isolation, checks the built tarball, and only an authorized protected job can publish with `--tag next`. It never runs Release Please or syncs examples. The agreed preview root is modern: slim state-based controller, native modal rendering, HD loading and structural CSS without gallery themes. Root JavaScript, types, `/pure` and `/style.css` select the same preset; `/compat` retains the v1 contract. Normal v1 releases remain unchanged. Browser/API verification and migration documentation remain stable-release prerequisites.

**No preview has been published.** Keep the historical `next` untouched until explicit publication authorization. Per-item preview drafts below are conditional feedback invitations, not messages ready to post or evidence of published fixes. `{PREVIEW_VERSION}` means an exact actually published milestone and `{PREVIEW_DOCS_URL}` means verified milestone docs. Existing candidate closure gates now explicitly mean supported stable availability plus original-case verification, not merely publishing a preview. Existing evidence, dispositions, fix versions and per-item remaining checks are retained.

Local setup verification is separate from the original audit: packed modern/compat consumer checks and Chromium/WebKit desktop/mobile regression tests pass against the PR #310 base, including HD fallback, reduced motion, keyboard focus and teardown. Gallery benchmarks remain within that base's layout/style tolerances, retaining 24 layouts for five open/close cycles. Firefox could not launch its installed profile; historical minimum browsers, physical devices and original external reproductions remain unverified. These checks change no per-item fix version, published availability or closure gate. For dialog records, the modern default includes modal rendering; custom content and gallery/gestures still require explicit composition and matching CSS. See [the modern contract](./modern-preset.md) before choosing a test recipe.

## Evidence and confidence

Read GitHub bodies/discussions and PR diffs, compared current source to the 1.1.2 tag and changelog, and checked npm/GitHub release metadata. Long #60/#151/#33 discussions and #191 inline review were fetched separately. GitHub source links below are pinned to the audited commit, except #309, which is pinned to its final merge commit. **Tests cited are existing regression coverage inspected, not newly executed results.** Dependencies are not installed in this checkout. External reproductions, user-uploaded videos and physical Safari/IE/EdgeHTML environments were not replayed. High confidence can mean “definitely not implemented”; it does not mean a browser bug was reproduced. No comments, closures, merges or releases were posted.

## Closure gates

| Gate                      | Count | Meaning                                                                                                                    |
| ------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------- |
| `candidate_and_decision`  |     1 | Supported stable candidate API, then confirm different API satisfies requirement; preview testing is not closure.          |
| `candidate_and_reproduce` |     1 | Supported stable candidate API, then confirm original use case; preview testing is not closure.                            |
| `candidate_release`       |     4 | Wait for supported stable candidate entries, CSS and docs plus original-case verification; preview testing is not closure. |
| `decision`                |     7 | Keep open; requirement or API contract remains unresolved.                                                                 |
| `device`                  |     2 | Real Safari/device verification remains.                                                                                   |
| `docs_and_decision`       |     1 | Verify the published recipe, then explicitly choose the alternative design rather than direct feature support.             |
| `docs_and_reproduce`      |     2 | Port/publish docs and verify integration first.                                                                            |
| `keep`                    |     1 | Active PR: normal review/release, never close as obsolete.                                                                 |
| `done`                    |     1 | PR merged during the audit; no closure action remains.                                                                     |
| `legacy_browser`          |     1 | Actual legacy-engine verification remains.                                                                                 |
| `maintainer_decision`     |     5 | Only close if choosing the stated scope/alternative decision; not a shipped fix.                                           |
| `now`                     |     4 | Already released; review then close/reply.                                                                                 |
| `reproduce`               |    14 | Keep open; reproduce or obtain current confirmation.                                                                       |

## Issue matrix

| Item                                                                                                                                                                                               | Disposition                            | Close gate                | Confidence | Assessment                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#224](https://github.com/francoischalifour/medium-zoom/issues/224) Template function                                                                                                              | `partially_addressed_private`          | `candidate_and_decision`  | high       | Candidate dialog content is a synchronous mount/cleanup callback with zoom/signal access. It is not a template(src,target) => HTMLElement \| Promise<HTMLElement> overload; v1 template remains a selector/template element.  |
| [#222](https://github.com/francoischalifour/medium-zoom/issues/222) Image shrink a little on zoom out                                                                                              | `needs_reproduction`                   | `reproduce`               | low        | Reverse-transition handling was improved in #304, but there is no matching visual regression proving the reported small shrink is gone.                                                                                       |
| [#221](https://github.com/francoischalifour/medium-zoom/issues/221) Position of image in overlay is dependent on viewport size. It renders below the fold for long pages.                          | `not_fixed`                            | `reproduce`               | high       | The preset still measures document.documentElement.clientHeight. Body placement uses scroll coordinates; that does not resolve every document-height/quirks-mode or containing-block problem.                                 |
| [#219](https://github.com/francoischalifour/medium-zoom/issues/219) MacBook safari-After multiple zoom in/out actions, the image disappears, but the overlay remains, making the page unclickable. | `needs_reproduction`                   | `reproduce`               | medium     | Cancellation, transition fallback, reopening and listener cleanup changed substantially, but no test reproduces this exact Safari 17.5 disappearing-image sequence.                                                           |
| [#218](https://github.com/francoischalifour/medium-zoom/issues/218) Image zoom does not render on viewport                                                                                         | `needs_reproduction`                   | `reproduce`               | low        | A production-only positioning failure cannot be inferred fixed from the engine rewrite. Stylesheet side effects were fixed in 1.1.2, but the reported cause has not been established.                                         |
| [#216](https://github.com/francoischalifour/medium-zoom/issues/216) Configuration option to keep the zoomed image from growing to larger than its largest size                                     | `existing_behavior_needs_verification` | `reproduce`               | medium     | fitBox caps raster enlargement by naturalWidth/naturalHeight; this is not a new max-size option and not necessarily the requested HTML width/height cap.                                                                      |
| [#211](https://github.com/francoischalifour/medium-zoom/issues/211) mediumZoom and Wordpress/Divi builder issue                                                                                    | `documentation_gap`                    | `docs_and_reproduce`      | high       | PR #212 supplies a concrete Divi selector and stacking-order workaround. No Divi integration guide exists on main; the current generic styling guide is not a verified Divi fix.                                              |
| [#210](https://github.com/francoischalifour/medium-zoom/issues/210) Use the dialog element to display images                                                                                       | `implemented_private`                  | `candidate_release`       | high       | dialog() implements native showModal, focus containment and cleanup, but renderers/core subpaths are candidate-only and absent from the release manifest.                                                                     |
| [#209](https://github.com/francoischalifour/medium-zoom/issues/209) Tab doesn't close image if focused element is already visible on the screen                                                    | `partially_addressed`                  | `decision`                | high       | v1 only reacts to Escape on keyup, not Tab. Candidate dialog contains focus instead of closing on Tab: safer navigation, but a different behavior from the request.                                                           |
| [#208](https://github.com/francoischalifour/medium-zoom/issues/208) If the image uses the srcset attribute, the pop-up layer will be displayed misaligned.                                         | `needs_reproduction`                   | `reproduce`               | medium     | HD source loading and frame placement are covered separately, but no test reproduces this blog layout, misalignment and flicker together.                                                                                     |
| [#205](https://github.com/francoischalifour/medium-zoom/issues/205) There may be problems in some magnification situations.                                                                        | `not_fixed`                            | `decision`                | high       | Cloning preserves authored classes and object-fit/cropping styles. The geometry still scales the rendered rectangle rather than replacing its aspect ratio with the full image.                                               |
| [#202](https://github.com/francoischalifour/medium-zoom/issues/202) The image is not centered and scale in iframe                                                                                  | `needs_reproduction`                   | `reproduce`               | low        | The issue has no functioning reproduction or environment. Existing scrolled-frame tests are not iframe coverage.                                                                                                              |
| [#200](https://github.com/francoischalifour/medium-zoom/issues/200) Zoomed image size exceed intrinsic image size                                                                                  | `needs_reproduction`                   | `reproduce`               | medium     | HD loader removes sizes/loading and gives data-zoom-src precedence; natural dimensions cap raster geometry. Exact Firefox density-srcset and Safari lazy-loading variants remain unverified.                                  |
| [#196](https://github.com/francoischalifour/medium-zoom/issues/196) Cannot close overlay before `opened` event has fired.                                                                          | `fixed_released`                       | `now`                     | high       | 1.1.2 shipped dismissal during loading/opening in #233. Current loading tests cover cancellation and stale callbacks.                                                                                                         |
| [#190](https://github.com/francoischalifour/medium-zoom/issues/190) SVG images sometimes don't have a '.svg' extension                                                                             | `not_fixed`                            | `decision`                | high       | isSvgSource still requires a .svg suffix. Candidate loaders can pass fill, but this is not automatic SVG detection and is unavailable to the released preset. The generated-SVG guide explicitly documents the limitation.    |
| [#189](https://github.com/francoischalifour/medium-zoom/issues/189) Nuxt with medium-zoom, weridly on the directly load in.                                                                        | `needs_reproduction`                   | `reproduce`               | low        | Modern framework and SSR guides cover mount/cleanup patterns, not the reported Nuxt direct-load and source-switch bug.                                                                                                        |
| [#188](https://github.com/francoischalifour/medium-zoom/issues/188) Pinching zoom option                                                                                                           | `implemented_private`                  | `candidate_release`       | high       | Candidate gallery bindings implement pinch, pan, double tap and controls. v1 1.1.2 only prevents browser pinch from spuriously dismissing; it does not add in-view image gestures.                                            |
| [#181](https://github.com/francoischalifour/medium-zoom/issues/181) Auto closed on iOS safari browser                                                                                              | `needs_reproduction`                   | `reproduce`               | medium     | 1.1.2 guards pinch-induced scroll, but this report uses scrollOffset:0 and mentions Safari viewport adjustment without pinch. Resize still closes the preset.                                                                 |
| [#180](https://github.com/francoischalifour/medium-zoom/issues/180) Zoomed image not closing in browsers not supporting srcset (IE11 and Edge 13-15)                                               | `needs_legacy_browser_verification`    | `legacy_browser`          | low        | A compat build and shared HD error path exist, but the loader still assigns srcset when present. Playwright modern engines do not establish behavior in IE11 or Edge 13–15.                                                   |
| [#177](https://github.com/francoischalifour/medium-zoom/issues/177) Pressing image zooms it out                                                                                                    | `fixed_released`                       | `now`                     | high       | The reported unwanted zoom-out is explicitly covered by the 1.0.7 changelog fix #176. Current fitBox still caps scaling to the viewport and intrinsic size.                                                                   |
| [#171](https://github.com/francoischalifour/medium-zoom/issues/171) zoomed image ignores prefers-color-scheme in <source>                                                                          | `fixed_released`                       | `now`                     | high       | 1.0.8 shipped currentSrc selection for picture (#194); cloneImage preserves the source selected by the browser. A picture regression exists, but it does not explicitly switch color schemes.                                 |
| [#170](https://github.com/francoischalifour/medium-zoom/issues/170) Images often flash on Safari, especially on iOS Safari                                                                         | `needs_device_verification`            | `device`                  | low        | Transition and HD loading improvements do not prove compositor flicker fixed on Safari; the source still scales an image with transforms and will-change.                                                                     |
| [#169](https://github.com/francoischalifour/medium-zoom/issues/169) Configuration option to use natural height of image for zoomed image                                                           | `not_fixed`                            | `decision`                | high       | Current geometry scales the source rectangle uniformly; it does not uncrop a fixed-ratio thumbnail into a differently proportioned natural image. Same requirement family as #205/#143/#33.                                   |
| [#166](https://github.com/francoischalifour/medium-zoom/issues/166) Zooms aren't removed from dom on close event                                                                                   | `needs_reproduction`                   | `reproduce`               | medium     | Repeated open/close, detach and listener cleanup have coverage, but the reported multi-instance custom-button sequence has no actual reproduction.                                                                            |
| [#163](https://github.com/francoischalifour/medium-zoom/issues/163) Image being centered to the height of page height and not viewport height                                                      | `not_fixed`                            | `reproduce`               | high       | The current preset still uses document.documentElement.clientHeight; it has not adopted the requested innerHeight behavior. Related to #221 but not proven the same cause.                                                    |
| [#152](https://github.com/francoischalifour/medium-zoom/issues/152) Add an option to use custom class for zoomed image                                                                             | `alternative_available`                | `maintainer_decision`     | high       | No class option was added. Cloned source classes, the opened class and open-event customization can provide scene-specific styling; PR #153 was explicitly held to avoid API growth.                                          |
| [#151](https://github.com/francoischalifour/medium-zoom/issues/151) Safari for iOS: Scaled up image is blurry regardless of original image size                                                    | `needs_device_verification`            | `device`                  | high       | The discussion proposes animating from a larger rest-size layer. Current code still starts at thumbnail dimensions and applies scale/translate3d with will-change; that proposed WebKit rasterization fix is not implemented. |
| [#150](https://github.com/francoischalifour/medium-zoom/issues/150) Creating a NYT-Style Theme for Medium Zoom                                                                                     | `partially_addressed`                  | `maintainer_decision`     | medium     | Caption/template recipes exist; candidate gallery adds controls. No complete NYT-style side-caption theme is supplied, and the original discussion explicitly asks for a reusable theme rather than just primitives.          |
| [#145](https://github.com/francoischalifour/medium-zoom/issues/145) Large image never zoom to native size                                                                                          | `partially_addressed_private`          | `candidate_and_reproduce` | medium     | Candidate gallery gestures allow further zoom and panning, including wheel/keyboard paths and double-tap detail sizing. This is opt-in and is not a new default natural-size mode in v1.                                      |
| [#143](https://github.com/francoischalifour/medium-zoom/issues/143) Images with modified sizes are zoomed in with wrong proportions                                                                | `not_fixed`                            | `decision`                | high       | HD media inherit frame width/height and the same uniform transform. A different-aspect-ratio HD source is not automatically re-laid out to its own proportions.                                                               |
| [#92](https://github.com/francoischalifour/medium-zoom/issues/92) Wrong dimension on retina display                                                                                                | `needs_reproduction`                   | `reproduce`               | medium     | The HD path gives data-zoom-src precedence and omits srcset on that replacement. This removes a plausible conflict, but there is no explicit DPR=2 regression for the original case.                                          |
| [#74](https://github.com/francoischalifour/medium-zoom/issues/74) Feature request: max-width option                                                                                                | `alternative_available`                | `maintainer_decision`     | high       | No max-width option exists. The existing container bounds option can cap the available viewport; it is a workaround requiring positioning, not the requested dedicated option.                                                |
| [#60](https://github.com/francoischalifour/medium-zoom/issues/60) Next/Prev image feature?                                                                                                         | `implemented_private`                  | `candidate_release`       | high       | createGallery, navigation methods, keyboard, gestures and stock controls exist on private candidate subpaths; current npm/default preset does not expose them.                                                                |
| [#50](https://github.com/francoischalifour/medium-zoom/issues/50) Add support for browser back button                                                                                              | `not_fixed`                            | `decision`                | high       | No zoom history/popstate integration exists in src. Website command-palette history handling is unrelated and must not be counted as a library fix.                                                                           |
| [#33](https://github.com/francoischalifour/medium-zoom/issues/33) Wrong dimensions: take picture elements into account?                                                                            | `partially_fixed_released`             | `reproduce`               | high       | Picture source selection shipped in 1.0.8 (#194), but different thumbnail/HD aspect ratios remain unhandled. The original thread explicitly says srcset-only support is insufficient.                                         |

## Pull request matrix (8 open; 1 merged during audit)

| Item                                                                                                                   | Disposition              | Close gate            | Confidence | Assessment                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#309](https://github.com/francoischalifour/medium-zoom/pull/309) fix(website): preserve external referral attribution | `merged_during_audit`    | `done`                | high       | Merged as 9e46bf6 at 2026-11-22T17:45:25Z. The final refreshed origin/main contains the website referral fix. This PR is no longer open and requires no closure or npm release.                                         |
| [#247](https://github.com/francoischalifour/medium-zoom/pull/247) chore(main): release 1.2.0                           | `release_infrastructure` | `keep`                | high       | Open Release Please PR proposes 1.2.0. Its changelog lists core/gallery commits, but package.json and package.config.mts still exclude candidate subpaths. A changelog entry is not proof an API will ship.             |
| [#226](https://github.com/francoischalifour/medium-zoom/pull/226) fix: handle broken srcset images #215                | `superseded_released`    | `now`                 | high       | The 1.1.2 tag already handles HD load/error through the same finish path and guards missing HD cleanup. Main adds an explicit broken-srcset-only regression naming #226. Do not merge the obsolete dependency override. |
| [#225](https://github.com/francoischalifour/medium-zoom/pull/225) docs(readme): introduce Used by section              | `documentation_decision` | `maintainer_decision` | high       | The Used by badge/third-party service is not in the current README. The README redesign does not implement this proposal; accepting external badge/dependency policy remains a maintainer choice.                       |
| [#214](https://github.com/francoischalifour/medium-zoom/pull/214) add support for videos                               | `alternative_available`  | `docs_and_decision`   | high       | PR only admits VIDEO through the image target predicate. Current frame/loader contract remains image-specific. Video is supported as an authored player over a zoomed poster via events, with docs and browser tests.   |
| [#213](https://github.com/francoischalifour/medium-zoom/pull/213) feat: New function to change the current image       | `superseded_private`     | `candidate_release`   | high       | The requested image switching is owned by the candidate gallery controller and scene replacement, rather than a change() method duplicated into the v1 instance.                                                        |
| [#212](https://github.com/francoischalifour/medium-zoom/pull/212) [docs-only] Add Divi as framework example            | `documentation_gap`      | `docs_and_reproduce`  | high       | Divi instructions have not been incorporated into the new docs layout. The old README patch is outdated, but the selector and stacking-order contribution remains useful for #211.                                      |
| [#191](https://github.com/francoischalifour/medium-zoom/pull/191) SVG images sometimes don't have a '.svg' extension   | `not_fixed`              | `decision`            | high       | Current isSvgSource still matches only .svg. Review already objects that /svg/ is not a standard URL convention; the rewrite does not supersede the underlying extensionless-SVG problem.                               |
| [#153](https://github.com/francoischalifour/medium-zoom/pull/153) feat(api): Add custom class option                   | `alternative_available`  | `maintainer_decision` | high       | No class option exists. The original maintainer review put this on hold to avoid extending v1; current source classes, event hooks and styling guide support alternatives.                                              |

## Shared verification batches

Use these to reduce repeated maintainer work, but retain each issue’s acceptance criteria:

| Batch                        | Items                                                      | What would justify closure                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Viewport and stacking        | #221, #218, #208, #202, #163; #211/#212 separately in Divi | Correct center and visible overlay in long/scrolled pages, production CSS, iframe-local bounds, quirks/standards modes and stacking contexts. Main still uses clientHeight.                            |
| Cropped/aspect-ratio images  | #205, #169, #143, #33                                      | Fixed-size cover thumbnail expands to uncropped natural/HD aspect ratio. Correct source selection alone does not pass.                                                                                 |
| Raster sizing and resolution | #216, #200, #92                                            | Large viewport + small raster, 1x/2x DPR, HD URL + density/width srcset, explicit dimensions and lazy loading in Chromium/Firefox/WebKit. A natural-size cap is not a configurable max-width.          |
| Safari lifecycle             | #219, #222, #181, #166                                     | Rapid interrupted transitions, two custom-trigger instances, scrollOffset 0/default and browser chrome changes; no hidden originals or surviving overlays. #166 also needs multi-browser verification. |
| Safari visual rendering      | #170, #151                                                 | Physical iOS/macOS recordings show no flash/blur with large and cached sources. Cleanup tests cannot prove compositor sharpness.                                                                       |
| Candidate release            | #210, #188, #60, #145, #224; PR #213                       | Install the released package, resolve public subpaths and required styles, test dialogs/controls/gestures, then confirm exact feature expectations.                                                    |

## Posting workflow

1. Recheck each item is still open and the audited implementation has not changed. Do not turn a related fix into a closure without the listed verification.
2. For v1 release replies, confirm npm’s actual latest tag/version and tarball files. Do not infer publication from a merged PR, tag or GitHub release alone.
3. For candidate replies, confirm the final public exports/files and CSS with a consumer install. A proposed 1.2.0 changelog is not enough.
4. Replace every placeholder: `{V1_VERSION}` = actual published v1 version; `{CANDIDATE_RELEASE}` = actual release exposing candidate APIs; `{CANDIDATE_DOCS_URL}` = working setup guide. Candidate closure drafts are intentionally written for **after** release; they are not statements about today.
5. Read the per-item draft-use note. Decision drafts express a policy choice for you to approve. PR #247 is a release-review note; PR #309 is an optional merged-PR acknowledgement, not a closure notice.
6. Post manually and close issues as completed only when fixed; use not planned for a declined option. Close superseded PRs with credit, never imply they were merged. No automatic posting/closure command is included.

Read-only refresh commands (Fish-compatible):

```fish
gh issue list --repo francoischalifour/medium-zoom --state open --limit 1000 --json number,title,url,updatedAt
```

```fish
gh pr list --repo francoischalifour/medium-zoom --state open --limit 1000 --json number,title,url,updatedAt
```

```fish
npm view medium-zoom dist-tags --json
```

```fish
npm view medium-zoom@1.2.0 version dist.tarball --json
```

The last command should fail until that exact version exists; replace it if the final release version changes. These commands refresh inventory/publication facts, not the source-backed decisions below.

## Item notes and draft replies

### Issue #224 — Template function

- **GitHub:** [#224](https://github.com/francoischalifour/medium-zoom/issues/224)
- **Disposition / gate:** `partially_addressed_private` / `candidate_and_decision`; confidence: high.
- **Assessment:** Candidate dialog content is a synchronous mount/cleanup callback with zoom/signal access. It is not a template(src,target) => HTMLElement | Promise<HTMLElement> overload; v1 template remains a selector/template element.
- **Evidence:** [`src/zoom/index.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/index.ts), [`src/zoom/content-template.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/content-template.ts), [`src/zoom/dialog.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/dialog.ts), [`tests/browser/strategies.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/strategies.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** Confirm callback-based content satisfies metadata rendering; document how async work uses signal and cleanup. Do not claim native Promise-returning templates.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> The new composition API in {CANDIDATE_RELEASE} supports application-owned dialog content through a mount/cleanup callback, so captions and metadata can be built per image. See {CANDIDATE_DOCS_URL}. This is not an async template-option overload: asynchronous work remains application-owned and must respect cleanup. Does that cover your Wikipedia-style use case? I’d like to confirm before closing.

- **Preview status:** planned, not published. Stable gate remains `candidate_and_decision`; a prerelease alone does not meet it.
- **Preview test:** Use core + renderer/content callback; mount per-image metadata, cancel async work and verify cleanup. Native Promise-returning template options remain unimplemented.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> An opt-in preview {PREVIEW_VERSION} is available for feedback after registry verification. Install that exact version and try the application-owned content callback in {PREVIEW_DOCS_URL} with your Wikipedia-style metadata. Please check async cancellation and cleanup; this does not add a Promise-returning template option. Does the different API satisfy your use case? I’m leaving this open pending confirmation and supported stable availability.

### Issue #222 — Image shrink a little on zoom out

- **GitHub:** [#222](https://github.com/francoischalifour/medium-zoom/issues/222)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: low.
- **Assessment:** Reverse-transition handling was improved in #304, but there is no matching visual regression proving the reported small shrink is gone.
- **Evidence:** [`src/zoom/transition.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/transition.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`tests/browser/motion.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/motion.spec.ts).
- **Remaining check:** Recreate the recording with explicit width/height, responsive CSS and DPR; compare final bounds and intermediate closing frames in Chrome and Safari.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the video. {V1_VERSION} includes updated reverse-transition handling, but I haven’t confirmed that it addresses the small shrink in your recording. Could you share the image markup/CSS or a small reproduction and retry the new release? I’ll keep this open until we can check that exact animation.

### Issue #221 — Position of image in overlay is dependent on viewport size. It renders below the fold for long pages.

- **GitHub:** [#221](https://github.com/francoischalifour/medium-zoom/issues/221)
- **Disposition / gate:** `not_fixed` / `reproduce`; confidence: high.
- **Assessment:** The preset still measures document.documentElement.clientHeight. Body placement uses scroll coordinates; that does not resolve every document-height/quirks-mode or containing-block problem.
- **Evidence:** [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`tests/browser/frames.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/frames.spec.ts).
- **Remaining check:** Reproduce the long page; check standards-mode doctype, root height, transforms and computed positioning. Do not substitute candidate dialog behavior for v1.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for reporting this. The current release still derives its viewport bounds from document.documentElement, so I can’t call the long-page positioning problem fixed. Could you share a minimal copy of the page with its doctype and root/container CSS? I’m keeping this open so we can verify the correct viewport geometry.

### Issue #219 — MacBook safari-After multiple zoom in/out actions, the image disappears, but the overlay remains, making the page unclickable.

- **GitHub:** [#219](https://github.com/francoischalifour/medium-zoom/issues/219)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** Cancellation, transition fallback, reopening and listener cleanup changed substantially, but no test reproduces this exact Safari 17.5 disappearing-image sequence.
- **Evidence:** [`src/zoom/transition.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/transition.ts), [`tests/browser/motion.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/motion.spec.ts), [`tests/browser/leaks.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/leaks.spec.ts), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts).
- **Remaining check:** Repeat rapid open/close in real macOS Safari on the reported page and a minimal fixture; assert image visibility, overlay removal and page interaction.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the recordings. The latest release includes loading/opening cancellation fixes, and the new release adds further transition and cleanup improvements. Could you retry on {V1_VERSION} in Safari and share the Safari version if it still happens? I’m keeping this open until we verify the original repeated-click failure, rather than assuming the lifecycle changes fix it.

### Issue #218 — Image zoom does not render on viewport

- **GitHub:** [#218](https://github.com/francoischalifour/medium-zoom/issues/218)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: low.
- **Assessment:** A production-only positioning failure cannot be inferred fixed from the engine rewrite. Stylesheet side effects were fixed in 1.1.2, but the reported cause has not been established.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`tests/browser/package.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/package.spec.ts).
- **Remaining check:** Build the linked reproduction with the released package; inspect emitted CSS, inherited styles, containing blocks and viewport bounds.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the production reproduction. Please try {V1_VERSION}; stylesheet bundling and zoom lifecycle handling have improved since 1.1.0. I haven’t verified your production-only positioning case, so I’m keeping it open. If it persists, please share an updated reproduction and the production build command.

### Issue #216 — Configuration option to keep the zoomed image from growing to larger than its largest size

- **GitHub:** [#216](https://github.com/francoischalifour/medium-zoom/issues/216)
- **Disposition / gate:** `existing_behavior_needs_verification` / `reproduce`; confidence: medium.
- **Assessment:** fitBox caps raster enlargement by naturalWidth/naturalHeight; this is not a new max-size option and not necessarily the requested HTML width/height cap.
- **Evidence:** [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`website/src/docs/hd-images.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/hd-images.mdx).
- **Remaining check:** Test a small raster, density srcset, explicit attributes and data-zoom-src on a large viewport; distinguish natural size from authored dimensions and device pixels.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Raster images are already limited by their natural dimensions when zoomed; the width/height attributes describe layout and are not a separate maximum-size setting. Could you share a small image that still grows beyond the size you expect on {V1_VERSION}, including any srcset or data-zoom-src? I’d like to separate a sizing bug from a request for a configurable cap.

### Issue #211 — mediumZoom and Wordpress/Divi builder issue

- **GitHub:** [#211](https://github.com/francoischalifour/medium-zoom/issues/211)
- **Disposition / gate:** `documentation_gap` / `docs_and_reproduce`; confidence: high.
- **Assessment:** PR #212 supplies a concrete Divi selector and stacking-order workaround. No Divi integration guide exists on main; the current generic styling guide is not a verified Divi fix.
- **Evidence:** [`website/src/docs/styling.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/styling.mdx), [`src/zoom/medium-zoom.css`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/medium-zoom.css).
- **Remaining check:** Port and verify #212 in the current docs: select .data-zoomable img, resolve Divi stacking contexts, and check builder and frontend views.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for tracking down the Divi integration, and for contributing #212. The selector and stacking order need Divi-specific setup; the generic package release alone does not fix that. I’m keeping this linked to #212 until the updated integration recipe is published and checked in Divi.

### Issue #210 — Use the dialog element to display images

- **GitHub:** [#210](https://github.com/francoischalifour/medium-zoom/issues/210)
- **Disposition / gate:** `implemented_private` / `candidate_release`; confidence: high.
- **Assessment:** dialog() implements native showModal, focus containment and cleanup, but renderers/core subpaths are candidate-only and absent from the release manifest.
- **Evidence:** [`src/zoom/dialog.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/dialog.ts), [`tests/browser/dialog.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/dialog.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** Publish supported core/renderers subpaths and CSS, verify installation from npm, and document browser support. No version/date is committed.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> Thanks for the suggestion. {CANDIDATE_RELEASE} now provides an opt-in native dialog renderer with keyboard focus containment and focus return. See {CANDIDATE_DOCS_URL} for the supported setup and browser requirements. I’m closing this as implemented. The compatibility preset remains available; this is not a silent change to the v1 default.

- **Preview status:** planned, not published. Stable gate remains `candidate_release`; a prerelease alone does not meet it.
- **Preview test:** Use core + renderers/dialog with required CSS; check top-layer placement, Escape/backdrop, focus containment/restoration and nested dialogs on supported browsers.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> Could you test the opt-in dialog renderer in the published preview {PREVIEW_VERSION}? Install that exact version and follow {PREVIEW_DOCS_URL}, including CSS and the modern browser floor. Please check top-layer placement, Escape/backdrop closing and focus restoration in your application. The v1 default does not automatically become a dialog. This remains open for feedback until supported stable availability and verification.

### Issue #209 — Tab doesn't close image if focused element is already visible on the screen

- **GitHub:** [#209](https://github.com/francoischalifour/medium-zoom/issues/209)
- **Disposition / gate:** `partially_addressed` / `decision`; confidence: high.
- **Assessment:** v1 only reacts to Escape on keyup, not Tab. Candidate dialog contains focus instead of closing on Tab: safer navigation, but a different behavior from the request.
- **Evidence:** [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`src/zoom/dialog.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/dialog.ts), [`tests/browser/dialog.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/dialog.spec.ts).
- **Remaining check:** Decide whether close-on-Tab is part of the v1 contract. Do not close as fixed merely because a modal focus trap exists.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the detailed focus example. The native-dialog work keeps keyboard focus inside the open zoom, rather than closing on Tab. That addresses background focus leakage, but it is different from the close-on-Tab behavior requested here, and v1 has not gained that behavior. I’m keeping this open while we settle the intended keyboard contract.

- **Preview status:** planned, not published. Stable gate remains `decision`; a prerelease alone does not meet it.
- **Preview test:** Optionally compare explicit dialog focus behavior with the original Tab policy requirement. A focus trap is not evidence that the requested v1 Tab-close behavior exists.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> If helpful, published preview {PREVIEW_VERSION} lets you compare an explicit native-dialog focus model using {PREVIEW_DOCS_URL}. Please test the original Tab sequence and tell us whether that different policy meets the requirement. This does not implement Tab-to-close in the v1 preset; the behavior/scope decision remains open.

### Issue #208 — If the image uses the srcset attribute, the pop-up layer will be displayed misaligned.

- **GitHub:** [#208](https://github.com/francoischalifour/medium-zoom/issues/208)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** HD source loading and frame placement are covered separately, but no test reproduces this blog layout, misalignment and flicker together.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts), [`tests/browser/frames.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/frames.spec.ts).
- **Remaining check:** Reproduce with width-descriptor srcset and the blog CSS at multiple scroll positions; verify both HD and base frame centers and flicker.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the example and workaround. {V1_VERSION} includes updated HD loading and positioning handling, but I haven’t verified the misalignment and flicker in your page layout. Could you retry it and share a minimal example with the relevant image/container styles? I’m keeping this open pending that check.

### Issue #205 — There may be problems in some magnification situations.

- **GitHub:** [#205](https://github.com/francoischalifour/medium-zoom/issues/205)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** Cloning preserves authored classes and object-fit/cropping styles. The geometry still scales the rendered rectangle rather than replacing its aspect ratio with the full image.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`website/src/docs/styling.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/styling.mdx).
- **Remaining check:** Define cropped-thumbnail-to-full-image behavior and test object-fit:cover, fixed dimensions and global image styles before promising it.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the cropped-thumbnail reproduction. Medium Zoom still preserves image styling when it clones the image, so a package upgrade does not automatically remove cropping. The existing workaround is to separate thumbnail/container styling from zoomed-image styling. I’m keeping the full-image-from-cropped-thumbnail request open; it needs an explicit sizing contract and regression test.

### Issue #202 — The image is not centered and scale in iframe

- **GitHub:** [#202](https://github.com/francoischalifour/medium-zoom/issues/202)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: low.
- **Assessment:** The issue has no functioning reproduction or environment. Existing scrolled-frame tests are not iframe coverage.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`tests/browser/frames.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/frames.spec.ts).
- **Remaining check:** Get a real iframe reproduction, clarify iframe-local vs parent-page overlay expectations, and record frame dimensions and CSS.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Could you share a working iframe reproduction and browser/package version? In particular, should the zoom fit the iframe viewport or the parent page? The original report still contains the placeholder sandbox link, so I can’t verify a fix or safely close it as resolved.

### Issue #200 — Zoomed image size exceed intrinsic image size

- **GitHub:** [#200](https://github.com/francoischalifour/medium-zoom/issues/200)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** HD loader removes sizes/loading and gives data-zoom-src precedence; natural dimensions cap raster geometry. Exact Firefox density-srcset and Safari lazy-loading variants remain unverified.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts).
- **Remaining check:** Port both lazy/non-lazy cases from the linked sandbox, with 2x srcset and HD URL, to Firefox and Safari; assert selected source and natural-size cap.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for isolating the browser differences. The current loader removes lazy-loading/sizes constraints from the HD request and prioritizes data-zoom-src, but I haven’t verified both of your Firefox/Safari cases. Could you retry {V1_VERSION}? I’m leaving this open until the 2x-srcset and lazy-loading examples are checked in both browsers.

### Issue #196 — Cannot close overlay before `opened` event has fired.

- **GitHub:** [#196](https://github.com/francoischalifour/medium-zoom/issues/196)
- **Disposition / gate:** `fixed_released` / `now`; confidence: high.
- **Assessment:** 1.1.2 shipped dismissal during loading/opening in #233. Current loading tests cover cancellation and stale callbacks.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts), [`tests/browser/api.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/api.spec.ts).
- **Remaining check:** Optionally rerun the linked lazysizes reproduction on 1.1.2; do not wait for 1.2.0 to announce this fix.
- **Draft use:** Ready after maintainer review; no future release needed.

> Thanks for the reproduction, and sorry this stayed open. medium-zoom 1.1.2 allows closing while the HD image loads and while opening animates (#233). Please upgrade to 1.1.2 or newer. I’m closing this as fixed; if the lazysizes example still gets stuck, please share an updated reproduction and I’ll reopen it.

### Issue #190 — SVG images sometimes don't have a '.svg' extension

- **GitHub:** [#190](https://github.com/francoischalifour/medium-zoom/issues/190)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** isSvgSource still requires a .svg suffix. Candidate loaders can pass fill, but this is not automatic SVG detection and is unavailable to the released preset. The generated-SVG guide explicitly documents the limitation.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`website/src/docs/generated-svg.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/generated-svg.mdx).
- **Remaining check:** Choose explicit vector sizing or a robust detection strategy; test PlantUML, query-string SVG URLs and raster false positives. Coordinate with #191.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the PlantUML example. Automatic SVG detection still relies on a .svg filename suffix, so the extensionless URL case is not fixed by the new release. The generated-SVG guide explains explicit natural-size workarounds, but those are not automatic detection. I’m keeping this open and linked to #191 until that contract is resolved.

### Issue #189 — Nuxt with medium-zoom, weridly on the directly load in.

- **GitHub:** [#189](https://github.com/francoischalifour/medium-zoom/issues/189)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: low.
- **Assessment:** Modern framework and SSR guides cover mount/cleanup patterns, not the reported Nuxt direct-load and source-switch bug.
- **Evidence:** [`website/src/docs/server-rendering.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/server-rendering.mdx), [`website/src/docs/vue-integration.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/vue-integration.mdx), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts).
- **Remaining check:** Ask for current Nuxt version and executable direct-load/client-navigation comparison; wait for image decode and verify attachment after hydration.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Could you share a current minimal Nuxt reproduction and compare a direct page load with client-side navigation on {V1_VERSION}? The SSR/Vue guides now describe mounting and cleanup, but that does not establish a fix for your image-switching case. I’m keeping it open pending a reproducible example.

### Issue #188 — Pinching zoom option

- **GitHub:** [#188](https://github.com/francoischalifour/medium-zoom/issues/188)
- **Disposition / gate:** `implemented_private` / `candidate_release`; confidence: high.
- **Assessment:** Candidate gallery bindings implement pinch, pan, double tap and controls. v1 1.1.2 only prevents browser pinch from spuriously dismissing; it does not add in-view image gestures.
- **Evidence:** [`src/gallery/gestures.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/gestures.ts), [`src/gallery/controls.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controls.ts), [`tests/browser/gallery-gestures.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/gallery-gestures.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** Publish gallery/core/renderers and required styles together; document opt-in gestures and controls, then verify the released install on touch devices.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> Thanks for the request. {CANDIDATE_RELEASE} adds opt-in gallery gestures for pinch zoom, panning and double tap, plus close/navigation controls. Setup: {CANDIDATE_DOCS_URL}. I’m closing this as implemented in that API. The standard v1 preset does not acquire these controls automatically.

- **Preview status:** planned, not published. Stable gate remains `candidate_release`; a prerelease alone does not meet it.
- **Preview test:** Bind gallery gestures explicitly; verify pinch/pan thresholds, cancellation, touch navigation and cleanup on actual iOS/Android devices. Do not infer success from source or WebKit alone.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> Could you try the explicit gallery gesture bindings in published preview {PREVIEW_VERSION}, following {PREVIEW_DOCS_URL}? Please share your device/browser and check pinch, pan, cancellation and swipe boundaries with your images. Upgrading the v1 preset alone does not enable gestures. I’m leaving this open for real-device feedback and stable verification.

### Issue #181 — Auto closed on iOS safari browser

- **GitHub:** [#181](https://github.com/francoischalifour/medium-zoom/issues/181)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** 1.1.2 guards pinch-induced scroll, but this report uses scrollOffset:0 and mentions Safari viewport adjustment without pinch. Resize still closes the preset.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`tests/browser/mobile.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/mobile.spec.ts).
- **Remaining check:** Test on real iOS Safari with scrollOffset:0 and default 40; observe scroll/visual viewport changes while browser chrome expands/collapses.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the recording. Version 1.1.2 fixes dismissal during pinch gestures, but your example also uses scrollOffset: 0, so ordinary Safari viewport/scroll changes may be a different case. Could you retry {V1_VERSION} with both the default scrollOffset and 0 and report the iOS version? I’m not marking this fixed until that distinction is checked.

### Issue #180 — Zoomed image not closing in browsers not supporting srcset (IE11 and Edge 13-15)

- **GitHub:** [#180](https://github.com/francoischalifour/medium-zoom/issues/180)
- **Disposition / gate:** `needs_legacy_browser_verification` / `legacy_browser`; confidence: low.
- **Assessment:** A compat build and shared HD error path exist, but the loader still assigns srcset when present. Playwright modern engines do not establish behavior in IE11 or Edge 13–15.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`src/platform/compat.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/platform/compat.ts), [`config/tsdown.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/tsdown.config.mts), [`tests/browser/platform.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/platform.spec.ts).
- **Remaining check:** Run the reported srcset-only case in real IE11 and EdgeHTML (including missing fallback src). Modern-browser feature shims alone are insufficient.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for documenting the legacy-browser workaround. The compatibility build remains, but I haven’t verified the srcset-only loading/closing path in real IE11 or EdgeHTML. Modern-browser checks do not prove this fixed. I’m keeping this open until we can test those engines or make an explicit browser-support decision.

### Issue #177 — Pressing image zooms it out

- **GitHub:** [#177](https://github.com/francoischalifour/medium-zoom/issues/177)
- **Disposition / gate:** `fixed_released` / `now`; confidence: high.
- **Assessment:** The reported unwanted zoom-out is explicitly covered by the 1.0.7 changelog fix #176. Current fitBox still caps scaling to the viewport and intrinsic size.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts).
- **Remaining check:** If the reporter used oversized CSS dimensions rather than a small thumbnail, obtain that separate reproduction.
- **Draft use:** Ready after maintainer review; no future release needed.

> Thanks for reporting this. The unwanted zoom-out behavior was fixed in 1.0.7 (#176), and that fix is included in 1.1.2. Please upgrade to the current release. I’m closing this as fixed; if a small image still shrinks unexpectedly, please share its markup and CSS so we can investigate that case.

### Issue #171 — zoomed image ignores prefers-color-scheme in <source>

- **GitHub:** [#171](https://github.com/francoischalifour/medium-zoom/issues/171)
- **Disposition / gate:** `fixed_released` / `now`; confidence: high.
- **Assessment:** 1.0.8 shipped currentSrc selection for picture (#194); cloneImage preserves the source selected by the browser. A picture regression exists, but it does not explicitly switch color schemes.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`tests/browser/frames.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/frames.spec.ts).
- **Remaining check:** A dark/light source-switch regression would strengthen coverage; do not claim different-aspect-ratio picture support.
- **Draft use:** Ready after maintainer review; no future release needed.

> Thanks for reporting this. Since 1.0.8 (#194), the zoom uses the source selected by the browser for a picture element, including a prefers-color-scheme source. This is included in 1.1.2. I’m closing the source-selection issue as fixed; please share a current reproduction if the wrong theme image still appears.

### Issue #170 — Images often flash on Safari, especially on iOS Safari

- **GitHub:** [#170](https://github.com/francoischalifour/medium-zoom/issues/170)
- **Disposition / gate:** `needs_device_verification` / `device`; confidence: low.
- **Assessment:** Transition and HD loading improvements do not prove compositor flicker fixed on Safari; the source still scales an image with transforms and will-change.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/medium-zoom.css`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/medium-zoom.css), [`tests/browser/motion.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/motion.spec.ts).
- **Remaining check:** Check the large-image reproduction on real iPhone and Mac Safari, warm/cold cache and HD swaps; record visual evidence.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the reproduction. {V1_VERSION} improves loading and transition cleanup, but I haven’t established that it fixes Safari’s image flashing. Could you retry the large-image example on your current iPhone/Mac Safari versions? I’m keeping this open until the flicker itself is verified on those devices.

### Issue #169 — Configuration option to use natural height of image for zoomed image

- **GitHub:** [#169](https://github.com/francoischalifour/medium-zoom/issues/169)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** Current geometry scales the source rectangle uniformly; it does not uncrop a fixed-ratio thumbnail into a differently proportioned natural image. Same requirement family as #205/#143/#33.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts).
- **Remaining check:** Define and cover a fixed-width/height cropped thumbnail expanding to natural aspect ratio. Consolidate related reports only after recording their distinct repros.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the example. Using natural dimensions to cap scale is different from changing a cropped thumbnail to the image’s natural aspect ratio. The latter is not implemented by the current preset. I’m keeping this with the related cropping/aspect-ratio reports (#205, #143 and #33), rather than closing it as fixed by the new engine.

### Issue #166 — Zooms aren't removed from dom on close event

- **GitHub:** [#166](https://github.com/francoischalifour/medium-zoom/issues/166)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** Repeated open/close, detach and listener cleanup have coverage, but the reported multi-instance custom-button sequence has no actual reproduction.
- **Evidence:** [`tests/browser/leaks.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/leaks.spec.ts), [`tests/browser/api.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/api.spec.ts), [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts).
- **Remaining check:** Create two instances and alternate external buttons/image triggers; assert all clones, templates and overlays are removed after each close.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for reporting this. Recent releases improve cleanup and repeated open/close handling, but the original report has no working sandbox. Could you share the two-instance button setup on {V1_VERSION}? I’m leaving this open until we verify that alternating custom buttons and image clicks leaves no old zoom nodes behind.

### Issue #163 — Image being centered to the height of page height and not viewport height

- **GitHub:** [#163](https://github.com/francoischalifour/medium-zoom/issues/163)
- **Disposition / gate:** `not_fixed` / `reproduce`; confidence: high.
- **Assessment:** The current preset still uses document.documentElement.clientHeight; it has not adopted the requested innerHeight behavior. Related to #221 but not proven the same cause.
- **Evidence:** [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts).
- **Remaining check:** Reproduce standards vs quirks mode and custom root heights; determine actual viewport coordinate contract before changing the browser metric.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for identifying the height measurement. The current preset still uses document.documentElement.clientHeight, so the proposed innerHeight behavior has not been implemented. Could you share the page’s doctype and root styles in a reproduction? I’m keeping this open alongside #221 until the positioning cause is verified.

### Issue #152 — Add an option to use custom class for zoomed image

- **GitHub:** [#152](https://github.com/francoischalifour/medium-zoom/issues/152)
- **Disposition / gate:** `alternative_available` / `maintainer_decision`; confidence: high.
- **Assessment:** No class option was added. Cloned source classes, the opened class and open-event customization can provide scene-specific styling; PR #153 was explicitly held to avoid API growth.
- **Evidence:** [`src/preset/medium-zoom.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/preset/medium-zoom.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`website/src/docs/styling.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/styling.mdx).
- **Remaining check:** Decide whether existing hooks satisfy the use case; if declining the new option, close as not planned, not fixed. Keep #153 consistent.
- **Draft use:** Conditional on explicitly choosing the scope decision expressed in the draft.

> Thanks for the suggestion. I’d like to keep the v1 options small: source-image classes are preserved on the zoomed clone, and .medium-zoom-image--opened plus the open event allow per-image styling. I’m closing the additional class-option request as not planned, not as a newly shipped feature. Please share a case those hooks cannot handle.

### Issue #151 — Safari for iOS: Scaled up image is blurry regardless of original image size

- **GitHub:** [#151](https://github.com/francoischalifour/medium-zoom/issues/151)
- **Disposition / gate:** `needs_device_verification` / `device`; confidence: high.
- **Assessment:** The discussion proposes animating from a larger rest-size layer. Current code still starts at thumbnail dimensions and applies scale/translate3d with will-change; that proposed WebKit rasterization fix is not implemented.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`src/zoom/medium-zoom.css`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/medium-zoom.css).
- **Remaining check:** Compare sharpness before/after on physical iOS Safari with an adequately sized source; distinguish image resolution from compositor rasterization.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the detailed WebKit investigation. The current animation still scales a thumbnail-sized image layer; it does not implement the larger-rest-size/inverse-scale approach discussed here. I’m keeping this open. We need to verify sharpness on real iOS Safari before claiming that transition or HD-loading changes resolve it.

### Issue #150 — Creating a NYT-Style Theme for Medium Zoom

- **GitHub:** [#150](https://github.com/francoischalifour/medium-zoom/issues/150)
- **Disposition / gate:** `partially_addressed` / `maintainer_decision`; confidence: medium.
- **Assessment:** Caption/template recipes exist; candidate gallery adds controls. No complete NYT-style side-caption theme is supplied, and the original discussion explicitly asks for a reusable theme rather than just primitives.
- **Evidence:** [`website/src/docs/examples/captioned-photo.tsx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/examples/captioned-photo.tsx), [`src/gallery/controls.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controls.ts), [`src/zoom/content-template.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/content-template.ts).
- **Remaining check:** Decide whether to add a maintained theme/example or close as a recipe request satisfied by docs. Do not call primitives the finished theme.
- **Draft use:** Conditional on explicitly choosing the scope decision expressed in the draft.

> Thanks for offering to help with the theme. Caption/template examples are now available, and the upcoming gallery API adds stock controls, but we have not shipped a complete NYT-style side-caption layout. Would you still like a maintained example of that specific theme? I’m keeping the theme request distinct from the underlying caption and close-button support.

### Issue #145 — Large image never zoom to native size

- **GitHub:** [#145](https://github.com/francoischalifour/medium-zoom/issues/145)
- **Disposition / gate:** `partially_addressed_private` / `candidate_and_reproduce`; confidence: medium.
- **Assessment:** Candidate gallery gestures allow further zoom and panning, including wheel/keyboard paths and double-tap detail sizing. This is opt-in and is not a new default natural-size mode in v1.
- **Evidence:** [`src/gallery/gestures.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/gestures.ts), [`tests/browser/gallery-gestures.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/gallery-gestures.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** After candidate publication, verify the reporter’s 3200x2600 case reaches useful native detail and pans without navigating/closing; verify desktop and touch controls.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> The new opt-in gallery gestures in {CANDIDATE_RELEASE} allow zooming beyond the fitted view and panning around the image. See {CANDIDATE_DOCS_URL}. Could you try your large-image example and confirm that it reaches the detail you need? This does not change the standard v1 fit-to-viewport behavior; I’d like to confirm your native-size use case before closing.

- **Preview status:** planned, not published. Stable gate remains `candidate_and_reproduce`; a prerelease alone does not meet it.
- **Preview test:** Test explicit gallery gesture scale/pan against the original native-size requirement and HD source dimensions. Different API and actual rendered pixels need confirmation.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> Published preview {PREVIEW_VERSION} offers opt-in gallery scale/pan; setup and limitations are in {PREVIEW_DOCS_URL}. Could you test your original large image and report source dimensions, rendered size and device/browser? This is not proof of native-size behavior and is not a v1 option change. I’m keeping this open until the original case and supported stable contract are confirmed.

### Issue #143 — Images with modified sizes are zoomed in with wrong proportions

- **GitHub:** [#143](https://github.com/francoischalifour/medium-zoom/issues/143)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** HD media inherit frame width/height and the same uniform transform. A different-aspect-ratio HD source is not automatically re-laid out to its own proportions.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts).
- **Remaining check:** Test the flex-row sandbox with differing HD aspect ratio. A documented object-fit workaround is not a general geometry fix.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the sandbox. The current preset still scales the thumbnail frame, so a differently proportioned data-zoom-src image can inherit the wrong aspect ratio. The object-fit workaround in this thread can help particular layouts, but it is not a general fix. I’m keeping this open with the related cropped-thumbnail reports.

### Issue #92 — Wrong dimension on retina display

- **GitHub:** [#92](https://github.com/francoischalifour/medium-zoom/issues/92)
- **Disposition / gate:** `needs_reproduction` / `reproduce`; confidence: medium.
- **Assessment:** The HD path gives data-zoom-src precedence and omits srcset on that replacement. This removes a plausible conflict, but there is no explicit DPR=2 regression for the original case.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts).
- **Remaining check:** Port the linked sandbox with deviceScaleFactor:2; assert HD currentSrc, displayed dimensions and unchanged original attributes in Chrome/Safari/Firefox.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the retina reproduction. The current loader gives data-zoom-src its own image request without carrying over the thumbnail srcset. Could you retry {V1_VERSION} on a retina display? I’m keeping this open until we verify the original 2x-srcset sizing case, rather than assuming source precedence alone solves it.

### Issue #74 — Feature request: max-width option

- **GitHub:** [#74](https://github.com/francoischalifour/medium-zoom/issues/74)
- **Disposition / gate:** `alternative_available` / `maintainer_decision`; confidence: high.
- **Assessment:** No max-width option exists. The existing container bounds option can cap the available viewport; it is a workaround requiring positioning, not the requested dedicated option.
- **Evidence:** [`src/zoom/viewport-container.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/viewport-container.ts), [`website/src/docs/options.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/options.mdx), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts).
- **Remaining check:** Provide a responsive centered container-bounds recipe and verify resize behavior, or explicitly accept/decline a dedicated max-width API.
- **Draft use:** Conditional on explicitly choosing the scope decision expressed in the draft.

> Thanks for the suggestion. There is still no dedicated max-width option. The existing container bounds can constrain the zoom area on wide screens, but that is a positioning recipe rather than a new size-cap option. I’d like to document a centered responsive example before deciding whether the extra API is necessary.

### Issue #60 — Next/Prev image feature?

- **GitHub:** [#60](https://github.com/francoischalifour/medium-zoom/issues/60)
- **Disposition / gate:** `implemented_private` / `candidate_release`; confidence: high.
- **Assessment:** createGallery, navigation methods, keyboard, gestures and stock controls exist on private candidate subpaths; current npm/default preset does not expose them.
- **Evidence:** [`src/gallery/controller.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controller.ts), [`src/gallery/keyboard.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/keyboard.ts), [`src/gallery/controls.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controls.ts), [`tests/browser/gallery.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/gallery.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** Publish the complete supported gallery entry/CSS and setup guide, verify packed installation and next/previous behavior, and credit related contribution #213.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> Thanks to everyone who contributed ideas and prototypes here. {CANDIDATE_RELEASE} now provides an opt-in gallery controller with next/previous navigation, keyboard support and controls. Setup: {CANDIDATE_DOCS_URL}. I’m closing this as implemented in that API; it is not automatically enabled by upgrading the v1 preset.

- **Preview status:** planned, not published. Stable gate remains `candidate_release`; a prerelease alone does not meet it.
- **Preview test:** Test explicit gallery next/previous, keyboard boundaries, controls, interrupted navigation, reduced motion and teardown; install required gallery CSS.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> Could you test next/previous navigation in published preview {PREVIEW_VERSION}? Install that exact version and use the explicit gallery setup and CSS in {PREVIEW_DOCS_URL}. Please check keyboard boundaries, controls and rapid navigation in your use case. This is an opt-in composition API, not a new v1 preset feature; the issue stays open pending feedback and supported stable availability.

### Issue #50 — Add support for browser back button

- **GitHub:** [#50](https://github.com/francoischalifour/medium-zoom/issues/50)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** No zoom history/popstate integration exists in src. Website command-palette history handling is unrelated and must not be counted as a library fix.
- **Evidence:** [`src/zoom/engine.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/engine.ts), [`src/gallery/controller.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controller.ts).
- **Remaining check:** Choose an opt-in history adapter and define forward/reopen, route transitions, multi-instance ownership and cleanup before adding support.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the suggestion. Browser Back integration is not part of the current release or the gallery controller. It needs an explicit opt-in history contract so it does not interfere with application routing. I’m keeping this open as a feature request; the new close reasons/state APIs are building blocks, not a shipped history adapter.

### Issue #33 — Wrong dimensions: take picture elements into account?

- **GitHub:** [#33](https://github.com/francoischalifour/medium-zoom/issues/33)
- **Disposition / gate:** `partially_fixed_released` / `reproduce`; confidence: high.
- **Assessment:** Picture source selection shipped in 1.0.8 (#194), but different thumbnail/HD aspect ratios remain unhandled. The original thread explicitly says srcset-only support is insufficient.
- **Evidence:** [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`src/zoom/geometry.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/geometry.ts), [`tests/browser/frames.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/frames.spec.ts).
- **Remaining check:** Retain the colored art-direction reproduction; verify multiple aspect ratios and distinct HD source rather than only comparing source URLs.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Picture source selection was fixed in 1.0.8 (#194), but your report also covers different crop/aspect ratios and a differently shaped HD image. That geometry case is not established fixed by currentSrc support. I’m keeping this open with #143/#169 so we do not lose the art-direction requirement.

### PR #309 — fix(website): preserve external referral attribution

- **GitHub:** [#309](https://github.com/francoischalifour/medium-zoom/pull/309); merged at 2026-11-22T17:45:25Z.
- **Disposition / gate:** `merged_during_audit` / `done`; confidence: high.
- **Assessment:** Merged as 9e46bf6 at 2026-11-22T17:45:25Z. The final refreshed origin/main contains the website referral fix. This PR is no longer open and requires no closure or npm release.
- **Evidence:** [`website/src/site-components.tsx`](https://github.com/francoischalifour/medium-zoom/blob/9e46bf6bc3ea1f52421677b09768d5e4ecf55c4b/website/src/site-components.tsx), [`website/src/command-option.tsx`](https://github.com/francoischalifour/medium-zoom/blob/9e46bf6bc3ea1f52421677b09768d5e4ecf55c4b/website/src/command-option.tsx), [`tests/browser/website-docs.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9e46bf6bc3ea1f52421677b09768d5e4ecf55c4b/tests/browser/website-docs.spec.ts).
- **Remaining check:** No closure action. If announcing the change, verify the deployed website preserves referrer behavior and opener isolation; a merge alone does not establish deployment.
- **Draft use:** Optional acknowledgement after verifying deployment; already merged, so no closure action is needed.

> Merged — thank you for the focused website fix. The change preserves referral attribution while retaining noopener and the existing new-tab accessibility behavior. It is independent of the npm release. Website deployment should be verified separately.

### PR #247 — chore(main): release 1.2.0

- **GitHub:** [#247](https://github.com/francoischalifour/medium-zoom/pull/247)
- **Disposition / gate:** `release_infrastructure` / `keep`; confidence: high.
- **Assessment:** Open Release Please PR proposes 1.2.0. Its changelog lists core/gallery commits, but package.json and package.config.mts still exclude candidate subpaths. A changelog entry is not proof an API will ship.
- **Evidence:** [`.github/release-please-config.json`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/.github/release-please-config.json), [`.github/workflows/release.yml`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/.github/workflows/release.yml), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts), [`package.json`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/package.json), [`CONTRIBUTING.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CONTRIBUTING.md).
- **Remaining check:** Keep this PR; review final package files and changelog, then merge through normal release workflow. Verify npm version/tag and tarball before posting release replies.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Release checklist: verify the final 1.2.0 tarball and changelog match the public v1 surface. The gallery, dialog and composition entries are currently private candidates and must not be advertised as available unless the publication contract changes. After npm publication succeeds, post the applicable prepared replies; do not close this PR as obsolete.

### PR #226 — fix: handle broken srcset images #215

- **GitHub:** [#226](https://github.com/francoischalifour/medium-zoom/pull/226)
- **Disposition / gate:** `superseded_released` / `now`; confidence: high.
- **Assessment:** The 1.1.2 tag already handles HD load/error through the same finish path and guards missing HD cleanup. Main adds an explicit broken-srcset-only regression naming #226. Do not merge the obsolete dependency override.
- **Evidence:** [`src/zoom/hd-image.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/hd-image.ts), [`tests/browser/loading.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/loading.spec.ts), [`CHANGELOG.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/CHANGELOG.md).
- **Remaining check:** The explicit #226 regression is on main, not proof it ran here. Confirm the published tarball for any zero-sized-image edge case before claiming every variant.
- **Draft use:** Ready after maintainer review; no future release needed.

> Thank you for the fix and regression case. The HD load-error fallback and guarded cleanup are already implemented in 1.1.2, and the current test suite includes a browser regression for the broken-srcset-only case from this PR. I’m closing this as superseded rather than merging the old implementation and dependency override. Your reproduction was valuable.

### PR #225 — docs(readme): introduce Used by section

- **GitHub:** [#225](https://github.com/francoischalifour/medium-zoom/pull/225)
- **Disposition / gate:** `documentation_decision` / `maintainer_decision`; confidence: high.
- **Assessment:** The Used by badge/third-party service is not in the current README. The README redesign does not implement this proposal; accepting external badge/dependency policy remains a maintainer choice.
- **Evidence:** [`README.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/README.md).
- **Remaining check:** Decide whether to include a third-party dependents badge in the current docs design; old CodeSandbox installation failures do not decide the content request.
- **Draft use:** Conditional on explicitly choosing the scope decision expressed in the draft.

> Thanks for proposing the Used by section. The README has since been reorganized, but that does not implement your badge proposal. I’d prefer to keep the main README focused on installation and usage and avoid another external badge dependency, so I’m closing this as a documentation-scope decision, not as a fix shipped in a package.

### PR #214 — add support for videos

- **GitHub:** [#214](https://github.com/francoischalifour/medium-zoom/pull/214)
- **Disposition / gate:** `alternative_available` / `docs_and_decision`; confidence: high.
- **Assessment:** PR only admits VIDEO through the image target predicate. Current frame/loader contract remains image-specific. Video is supported as an authored player over a zoomed poster via events, with docs and browser tests.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`examples/video/src/index.js`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/examples/video/src/index.js), [`website/src/docs/video.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/video.mdx), [`tests/browser/video.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/video.spec.ts).
- **Remaining check:** Verify the video guide/example is deployed. Close as an alternative design, not native video-target support; no npm release needed for this event-based recipe.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for the contribution. We now document and test video playback as a player mounted over a zoomed image poster, with playback and cleanup owned by the application: https://medium-zoom.francoischalifour.com/docs/guides/video/. Direct video elements are still not image-zoom targets, so adding VIDEO to the predicate would not satisfy the engine contract. I’m closing this in favor of the documented composition approach.

### PR #213 — feat: New function to change the current image

- **GitHub:** [#213](https://github.com/francoischalifour/medium-zoom/pull/213)
- **Disposition / gate:** `superseded_private` / `candidate_release`; confidence: high.
- **Assessment:** The requested image switching is owned by the candidate gallery controller and scene replacement, rather than a change() method duplicated into the v1 instance.
- **Evidence:** [`src/gallery/controller.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/gallery/controller.ts), [`src/zoom/dialog.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/dialog.ts), [`tests/browser/gallery-controller.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/gallery-controller.spec.ts), [`tests/browser/gallery-transitions.spec.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/tests/browser/gallery-transitions.spec.ts), [`config/package.config.mts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/config/package.config.mts).
- **Remaining check:** Publish and document gallery navigation/transition semantics first. Credit the prototype and explicitly explain the API migration; do not promise a new v1 change method.
- **Draft use:** Stable-only closure/decision draft: use only after a supported stable candidate API release and all remaining per-item checks. A prerelease testing invitation does not authorize closure.

> Thank you for prototyping image switching for #60. {CANDIDATE_RELEASE} now handles this through the opt-in gallery controller rather than duplicating open/close logic in a v1 change() method. Setup and transition options: {CANDIDATE_DOCS_URL}. I’m closing this implementation as superseded by that design, with thanks for helping establish the use case.

- **Preview status:** planned, not published. Stable gate remains `candidate_release`; a prerelease alone does not meet it.
- **Preview test:** Use the opt-in gallery controller for scene replacement; verify transitions, interrupted navigation and cleanup. Credit the prototype; do not promise a v1 change() method.
- **Preview draft use:** Do not post now. Use only after actual preview publication, registry verification and milestone docs verification; replace both preview placeholders. Invitation only: no closure authorization.

> Thank you for the image-switching prototype for #60. Published preview {PREVIEW_VERSION} explores that use case through the explicit gallery controller rather than a v1 change() method; setup is in {PREVIEW_DOCS_URL}. Could you compare the behavior, including interrupted transitions, with your prototype? I’m retaining your contribution and keeping this PR open until the replacement contract is stable and verified.

### PR #212 — [docs-only] Add Divi as framework example

- **GitHub:** [#212](https://github.com/francoischalifour/medium-zoom/pull/212)
- **Disposition / gate:** `documentation_gap` / `docs_and_reproduce`; confidence: high.
- **Assessment:** Divi instructions have not been incorporated into the new docs layout. The old README patch is outdated, but the selector and stacking-order contribution remains useful for #211.
- **Evidence:** [`website/src/docs/styling.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/styling.mdx), [`README.md`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/README.md).
- **Remaining check:** Port to website/src/docs, correct script markup/current version and verify Divi; preserve contributor credit. Do not close solely because the README moved.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thank you for the Divi recipe and for diagnosing #211. Documentation has moved to the website, so this README patch needs adapting, but the integration itself has not been replaced. I’m keeping this open until the selector and stacking-order guidance is ported and verified, with credit to your contribution.

### PR #191 — SVG images sometimes don't have a '.svg' extension

- **GitHub:** [#191](https://github.com/francoischalifour/medium-zoom/pull/191)
- **Disposition / gate:** `not_fixed` / `decision`; confidence: high.
- **Assessment:** Current isSvgSource still matches only .svg. Review already objects that /svg/ is not a standard URL convention; the rewrite does not supersede the underlying extensionless-SVG problem.
- **Evidence:** [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`website/src/docs/generated-svg.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/generated-svg.mdx).
- **Remaining check:** Resolve #190 with explicit sizing/metadata or robust detection and regression cases. Preserve the existing review objection; do not silently merge the heuristic.
- **Draft use:** Use after checking prerequisites; replace placeholders; this draft does not authorize closure.

> Thanks for identifying the PlantUML URL pattern. The extensionless-SVG problem in #190 remains, but matching /svg/ would encode a service-specific convention, as noted in the existing review. I’m keeping the requirement open while we choose a general sizing/detection contract rather than merging this heuristic unchanged.

### PR #153 — feat(api): Add custom class option

- **GitHub:** [#153](https://github.com/francoischalifour/medium-zoom/pull/153)
- **Disposition / gate:** `alternative_available` / `maintainer_decision`; confidence: high.
- **Assessment:** No class option exists. The original maintainer review put this on hold to avoid extending v1; current source classes, event hooks and styling guide support alternatives.
- **Evidence:** [`src/preset/medium-zoom.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/preset/medium-zoom.ts), [`src/zoom/frame.ts`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/src/zoom/frame.ts), [`website/src/docs/styling.mdx`](https://github.com/francoischalifour/medium-zoom/blob/9edda3b4985b20a8ebdb8cb2364f0d05d40ca547/website/src/docs/styling.mdx).
- **Remaining check:** If reaffirming the existing API-scope decision, close together with #152 as not planned. Do not call this merged or implemented.
- **Draft use:** Conditional on explicitly choosing the scope decision expressed in the draft.

> Thanks for the implementation and your patience. I’m keeping the earlier decision not to add a class option to v1. Source classes are preserved, and the opened class/open event provide customization hooks described in the styling guide. I’m closing this and #152 as not planned, rather than claiming the option shipped.
