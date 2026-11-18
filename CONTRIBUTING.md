# Contributing

Thanks for helping improve this repo! PRs and issues are welcome.

## Prerequisites

Global tools: k6 CLI, Node.js ≥ 20 + pnpm 10, Docker, git, Make. Run
**`make setup`** ([scripts/setup.sh](scripts/setup.sh)) — it's OS-aware:
macOS auto-installs missing k6/node via brew and pnpm via corepack; Linux
prints exact install commands for anything missing; Windows should use WSL2
(Git Bash works for the checks). Manual install commands are in the
[README](README.md#prerequisites).

The k6 CLI runs **directly** (no Docker wrapper). Only the
[QuickPizza](https://github.com/grafana/quickpizza) target is containerized:
`make up` starts it at http://localhost:3333.

## Setup

```bash
git clone https://github.com/shahadathhs/k6-performance-testing.git
cd k6-performance-testing
make setup
k6 run intro/first-script.ts
```

## Making changes

1. Create a branch from `main`.
2. Make your change — see the conventions below.
3. Run the quality gates and one real scenario run:

   ```bash
   pnpm lint && pnpm typecheck
   k6 run intro/first-script.ts
   ```

4. Open a PR against `main` (the template guides the description). CI must pass.

## Conventions

- **TypeScript only** — new scenarios are `.ts` files with `options` typed as
  `Options` from `k6/options`. k6 runs them natively; no build step.
  Relative imports need the explicit `.ts` extension (`./config.ts`).
- Shared code lives in `lib/` and is imported relatively
  (`../lib/config.ts`) — never inside a course folder like `intro/`.
- Scenarios live in folders by topic (`intro/` today). Name files after the
  technique they demonstrate (`smoke-test.ts`, `thresholds.ts`).
- Get the target URL from the shared `lib/config.ts` (`BASE_URL`), never
  hard-code hosts in scenario files.
- Tests run against the **self-hosted QuickPizza** service (`make up` or
  auto-started by `make run`). Only point `BASE_URL` at the public
  `quickpizza.grafana.com` instance for small-scale checks.
- Declare `thresholds` in every non-trivial scenario — pass/fail criteria are
  what make a load test useful.
- Only target the self-hosted QuickPizza instance (or systems you own). The
  public `quickpizza.grafana.com` is small-scale only. Never commit results
  from private systems.
- Formatting/lint: prettier (double quotes, width 100) + oxlint — just run
  `pnpm format` before committing.
- Commits: conventional style (`feat:`, `fix:`, `chore:`, `docs:`) — enforced
  by commitlint via the husky `commit-msg` hook. The `pre-commit` hook runs
  lint-staged (oxlint + prettier) on staged files automatically.

## Reporting bugs / requesting scenarios

Open an issue — templates are provided for both. Include the scenario name,
the full k6 summary output, and your `make version` / Docker version.
