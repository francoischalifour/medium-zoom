# Contributing to Medium Zoom

Thank you for getting involved in Medium Zoom!

## Concept

This module is meant to reproduce the zoom from [Medium](http://medium.com). We want to provide a great UX (User Experience) with a lightweight vanilla JavaScript solution. Thus, this package must remain focused on this core principle, yet be extended with a composable API.

## Folder structure

```
▸ cypress           The end-to-end tests written for Cypress
▸ examples          The Medium Zoom featured examples available on CodeSandbox
▸ src               The source code of the module
  ▸ __tests__       The tests for the module API
▸ stories           The stories for the Medium Zoom Storybook
▸ website           The Medium Zoom website source code
```

## Requirements

- [Node](https://nodejs.org)
- [Yarn](https://yarnpkg.com)

## Conventions

### Commits

This project follows the [conventional changelog](https://conventionalcommits.org/) guidelines. All commit messages should be formatted using the following scheme:

```
type(scope): description
```

## Workflow

### Filing issues

Reporting a bug or requesting a feature is always welcome. Feel free to [open an issue](https://github.com/francoischalifour/medium-zoom/issues/new/choose) with the according template which helps you create an effective report.

### Submit code

After discussing in an issue about the need to change the code, you will need to follow these steps:

- [Fork the repository](https://help.github.com/articles/fork-a-repo/)
- Clone your fork
- Install the dependencies: `yarn`
- For a **documentation** change:
  - Create a branch `docs/what-you-change`
  - Make the changes
  - Run `yarn run format`
- For a **bug fix**:
  - Create a branch `fix/issue-number`
  - [Write a test](src/__tests__/medium-zoom.test.js) to reproduce the bug (run `yarn run test`)
  - Fix the bug in the [source code](src/medium-zoom.js)
  - Make your test pass the previous bug
  - Run `yarn run format` and fix problems if any
- For a **feature**:
  - Create a branch `feat/name-of-the-feature`
  - Add the feature to the [source code](src/medium-zoom.js)
  - Create a story in the [storybook](stories) showcasing the feature
  - [Write a test](src/__tests__/medium-zoom.test.js) to ensure it's working as expected (run `yarn run test`)
  - Run `yarn run format` and fix problems if any
- [Create a pull request](https://help.github.com/articles/creating-a-pull-request/)

We will then review your pull request!

### Testing

#### Unit and integration tests

[Unit and integration tests](src/__tests__) with [Jest](https://jestjs.io) ensure that the API works as documented.

###### Commands

- Run the tests: `yarn run test`
- Watch the tests: `yarn run test --watch`
- Run the tests with coverage: `yarn run test --coverage`

#### End-to-end tests

[End-to-end tests](cypress/integration) with [Cypress](https://cypress.io) take screenshots of the stories to ensure that the zoom looks as expected.

###### Commands

- Open the Cypress UI: `yarn run test:cypress:open`
- Run the Cypress tests: `yarn run test:cypress:run`

### Releasing

We rely on [release-it](https://github.com/webpro/release-it) to release new versions of this package.

#### Release flow

The release flow goes through these steps:

1. Run acceptance tests
1. Bump the project version in [`package.json`](package.json) based on [the commits](#conventions)
1. Commit the release version
1. Create the new Git tag for this release
1. Push to GitHub
1. Publish to npm

#### Release steps

##### Unstable version

1. Make sure you're on the `next` branch
1. Run `npm run release:next` (_do not_ use `yarn` for releasing)
1. Follow the command-line instructions

##### Stable version

1. Make sure you're on the `master` branch
1. Run `npm run release` (_do not_ use `yarn` for releasing)
1. Follow the command-line instructions

---

Thank you for contributing!
