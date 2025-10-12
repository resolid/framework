# Contributing Guide

Thank you for considering contributing to **Resolid Framework**!  
Before you submit your contribution, please take a moment to read the following guidelines.

## How to contribute

Follow these steps to contribute to **Resolid Framework**:

#### Fork the repository

Create your own copy of the project to work on.

#### Clone your fork locally

```shell
  git clone https://github.com/<your-username>/resolid-framework.git
  cd resolid-framework
```

#### Install dependencies

```shell
pnpm install
```

#### Create a new branch

Use a descriptive branch name related to your change:

```shell
git checkout -b feat/awesome-feature
```

#### Make your changes

- Follow the **Clean Code Rules**.
- Write **tests** for new features or bug fixes.

#### Run tests

```shell
pnpm run test
```

#### Commit your changes

- Use the **Conventional Commit** format.

#### Push to your branch

```shell
git push origin feat/awesome-feature
```

#### Open a Pull Request (PR)

- Target the main branch of the original repository.
- Provide a clear description of your changes, why they are needed, and reference any relevant issues.

#### Address review comments

- Make changes if requested.
- Update tests or documentation as needed.

### Tips

- Keep PRs small and focused — one logical change per PR.
- Ensure your code passes linting and type checks before submitting.
- Use meaningful commit messages to make reviewing easier.

## Clean Code Rules

The **Resolid Framework** follows the principles of Clean Code to ensure that code remains simple, readable, and maintainable.
Following these guidelines makes your code easier to read, test, and maintain.

- Use **intention-revealing names** — make the purpose obvious.
- Each function should **do one thing** and do it well.
- Keep **side effects at the boundary** (I/O, state, network).
- Prefer **guard clauses first** to reduce nesting.
- **Symbolize constants** — avoid hardcoded literals.
- Structure logic as **Input → Process → Output**.
- Report failures with **clear, specific errors**.
- Let **tests act as usage examples**, covering both normal and edge cases.

## Commit Convention Rules

Follow the Conventional Commits specification via [@commitlint/config-conventional](https://www.conventionalcommits.org/), the commit message should be structured as follows:

```

<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

```

### Rules

- **Allowed types**: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.
- **Type** must be lowercase and non-empty.
- **Subject** must:
  - not be empty.
  - not end with period (`.`).
  - Avoid sentence case, start case, PascalCase, or UPPER_CASE.
- **Header** max length: 100 characters.
- **Body** and **footer**
  - Must start with a blank line after the header.
  - Maximum line length: 100 characters.
- **Breaking changes**:
  - Indicate using `BREAKING CHANGE`: in the footer.
  - Precede it with a blank line.

### Commit Examples

#### Valid commits:

```

feat(di): add LazyResolve support for async factory
fix(core): handle null input gracefully
perf(di): optimize dependency resolution
chore: update dependencies

```

#### Breaking change example:

```

refactor(core): remove old container API

BREAKING CHANGE: the previous `createContainer` method is replaced with a new interface

```

#### Invalid commits (for illustration):

```

Feat: Add new feature # Type must be lowercase
fix(core). # Subject should not end with a period
docs: # Subject must not be empty
perf(core): Improve speed # Avoid sentence-case / start-case

```

```

```
